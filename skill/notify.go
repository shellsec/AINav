package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"text/template"
	"time"
)

// Notifier 推送管理器
type Notifier struct {
	configs []NotifyConfig
	client  *http.Client
}

// NewNotifier 创建推送管理器
func NewNotifier(configs []NotifyConfig) *Notifier {
	return &Notifier{
		configs: configs,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

// NotifyMessage 推送消息
type NotifyMessage struct {
	Title   string // 消息标题
	Content string // 消息内容
	Label   string // 来源标签
	URL     string // 相关链接
}

// Notify 发送推送（并行发送所有已启用的渠道）
func (n *Notifier) Notify(msg NotifyMessage) {
	for _, cfg := range n.configs {
		if !cfg.Enabled {
			continue
		}

		// 如果配置了标签过滤，检查是否匹配
		if len(cfg.Labels) > 0 {
			matched := false
			for _, l := range cfg.Labels {
				if l == msg.Label {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		go func(c NotifyConfig) {
			var err error
			switch c.Type {
			case "bark":
				err = n.sendBark(c.Bark, msg)
			case "telegram":
				err = n.sendTelegram(c.Telegram, msg)
			case "feishu":
				err = n.sendFeishu(c.Feishu, msg)
			case "dingtalk":
				err = n.sendDingtalk(c.Dingtalk, msg)
			case "discord":
				err = n.sendDiscord(c.Discord, msg)
			case "webhook":
				err = n.sendWebhook(c.Webhook, msg)
			default:
				log.Printf("[推送] 未知推送类型: %s", c.Type)
				return
			}
			if err != nil {
				log.Printf("[推送] %s 发送失败: %v", c.Type, err)
			} else {
				log.Printf("[推送] %s 发送成功", c.Type)
			}
		}(cfg)
	}
}

// NotifyBatch 批量推送
func (n *Notifier) NotifyBatch(results []SearchResult) {
	for _, r := range results {
		msg := NotifyMessage{
			Title:   formatTitle(r),
			Content: formatContent(r),
			Label:   r.Label,
			URL:     r.Repo.HTMLURL,
		}
		n.Notify(msg)
	}
}

func formatTitle(r SearchResult) string {
	switch r.Type {
	case "skill":
		return fmt.Sprintf("[Skill] %s - %s", r.MatchedInfo, r.Repo.FullName)
	case "related":
		return fmt.Sprintf("[关联] %s - %s", r.MatchedInfo, r.Repo.FullName)
	default:
		if r.MatchedInfo != "" {
			return fmt.Sprintf("[%s] %s - %s", r.Label, r.MatchedInfo, r.Repo.FullName)
		}
		return fmt.Sprintf("[%s] %s", r.Label, r.Repo.FullName)
	}
}

func formatContent(r SearchResult) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("📦 %s\n", r.Repo.FullName))
	if r.Repo.Description != "" {
		desc := r.Repo.Description
		if len(desc) > 200 {
			desc = desc[:200] + "..."
		}
		sb.WriteString(fmt.Sprintf("📝 %s\n", desc))
	}
	sb.WriteString(fmt.Sprintf("⭐ %d | 🍴 %d | 💻 %s\n", r.Repo.Stargazers, r.Repo.Forks, r.Repo.Language))
	sb.WriteString(fmt.Sprintf("🔗 %s\n", r.Repo.HTMLURL))
	if r.MatchedInfo != "" {
		sb.WriteString(fmt.Sprintf("🏷️ %s\n", r.MatchedInfo))
	}
	return sb.String()
}

// ============== Bark ==============
func (n *Notifier) sendBark(cfg BarkConfig, msg NotifyMessage) error {
	if cfg.ServerURL == "" {
		cfg.ServerURL = "https://api.day.app"
	}
	title := url.QueryEscape(msg.Title)
	body := url.QueryEscape(msg.Content)
	pushURL := fmt.Sprintf("%s/%s/%s/%s", cfg.ServerURL, cfg.Token, title, body)

	if msg.URL != "" {
		pushURL += fmt.Sprintf("?url=%s", url.QueryEscape(msg.URL))
	}

	resp, err := n.client.Get(pushURL)
	if err != nil {
		return fmt.Errorf("Bark 请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Bark 返回错误: %s", string(body))
	}
	return nil
}

// ============== Telegram ==============
func (n *Notifier) sendTelegram(cfg TelegramConfig, msg NotifyMessage) error {
	text := fmt.Sprintf("*%s*\n\n%s", escapeMarkdown(msg.Title), msg.Content)
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", cfg.BotToken)

	payload := map[string]interface{}{
		"chat_id":    cfg.ChatID,
		"text":       text,
		"parse_mode": "MarkdownV2",
	}

	return n.postJSON(apiURL, payload)
}

func escapeMarkdown(text string) string {
	replacer := strings.NewReplacer(
		"_", "\\_", "*", "\\*", "[", "\\[", "]", "\\]",
		"(", "\\(", ")", "\\)", "~", "\\~", "`", "\\`",
		">", "\\>", "#", "\\#", "+", "\\+", "-", "\\-",
		"=", "\\=", "|", "\\|", ".", "\\.", "!", "\\!",
	)
	return replacer.Replace(text)
}

// ============== 飞书 ==============
func (n *Notifier) sendFeishu(cfg FeishuConfig, msg NotifyMessage) error {
	payload := map[string]interface{}{
		"msg_type": "interactive",
		"card": map[string]interface{}{
			"header": map[string]interface{}{
				"title": map[string]string{
					"tag":     "plain_text",
					"content": msg.Title,
				},
				"template": "blue",
			},
			"elements": []interface{}{
				map[string]interface{}{
					"tag": "div",
					"text": map[string]string{
						"tag":     "lark_md",
						"content": msg.Content,
					},
				},
				map[string]interface{}{
					"tag": "action",
					"actions": []interface{}{
						map[string]interface{}{
							"tag": "button",
							"text": map[string]string{
								"tag":     "plain_text",
								"content": "查看仓库",
							},
							"url":  msg.URL,
							"type": "primary",
						},
					},
				},
			},
		},
	}

	if cfg.Secret != "" {
		timestamp := time.Now().Unix()
		sign := n.generateFeishuSign(timestamp, cfg.Secret)
		payload["timestamp"] = fmt.Sprintf("%d", timestamp)
		payload["sign"] = sign
	}

	return n.postJSON(cfg.WebhookURL, payload)
}

func (n *Notifier) generateFeishuSign(timestamp int64, secret string) string {
	stringToSign := fmt.Sprintf("%d\n%s", timestamp, secret)
	h := hmac.New(sha256.New, []byte(stringToSign))
	h.Write(nil)
	return hex.EncodeToString(h.Sum(nil))
}

// ============== 钉钉 ==============
func (n *Notifier) sendDingtalk(cfg DingtalkConfig, msg NotifyMessage) error {
	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"title": msg.Title,
			"text":  fmt.Sprintf("### %s\n\n%s\n\n[查看仓库](%s)", msg.Title, msg.Content, msg.URL),
		},
	}

	if cfg.Secret != "" {
		timestamp := time.Now().UnixMilli()
		sign := n.generateDingtalkSign(timestamp, cfg.Secret)
		cfg.WebhookURL = fmt.Sprintf("%s&timestamp=%d&sign=%s", cfg.WebhookURL, timestamp, url.QueryEscape(sign))
	}

	return n.postJSON(cfg.WebhookURL, payload)
}

func (n *Notifier) generateDingtalkSign(timestamp int64, secret string) string {
	stringToSign := fmt.Sprintf("%d\n%s", timestamp, secret)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(stringToSign))
	return url.QueryEscape(hex.EncodeToString(h.Sum(nil)))
}

// ============== Discord ==============
func (n *Notifier) sendDiscord(cfg DiscordConfig, msg NotifyMessage) error {
	embed := map[string]interface{}{
		"title":       msg.Title,
		"description": msg.Content,
		"url":         msg.URL,
		"color":       3447003, // 蓝色
		"timestamp":   time.Now().Format(time.RFC3339),
	}

	payload := map[string]interface{}{
		"embeds": []interface{}{embed},
	}

	return n.postJSON(cfg.WebhookURL, payload)
}

// ============== 通用 Webhook ==============
func (n *Notifier) sendWebhook(cfg WebhookConfig, msg NotifyMessage) error {
	method := cfg.Method
	if method == "" {
		method = "POST"
	}

	var bodyBytes []byte
	var err error

	if cfg.BodyTemplate != "" {
		tmpl, err := template.New("webhook").Parse(cfg.BodyTemplate)
		if err != nil {
			return fmt.Errorf("Webhook 模板解析失败: %w", err)
		}
		var buf bytes.Buffer
		data := map[string]string{
			"title":   msg.Title,
			"content": msg.Content,
			"label":   msg.Label,
			"url":     msg.URL,
		}
		if err := tmpl.Execute(&buf, data); err != nil {
			return fmt.Errorf("Webhook 模板执行失败: %w", err)
		}
		bodyBytes = buf.Bytes()
	} else {
		payload := map[string]string{
			"title":   msg.Title,
			"content": msg.Content,
			"label":   msg.Label,
			"url":     msg.URL,
		}
		bodyBytes, err = json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("Webhook JSON 编码失败: %w", err)
		}
	}

	req, err := http.NewRequest(method, cfg.URL, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("Webhook 创建请求失败: %w", err)
	}

	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}
	if req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := n.client.Do(req)
	if err != nil {
		return fmt.Errorf("Webhook 请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Webhook 返回错误 (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// postJSON 通用 JSON POST 请求
func (n *Notifier) postJSON(url string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("JSON 编码失败: %w", err)
	}

	resp, err := n.client.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("返回错误 (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
