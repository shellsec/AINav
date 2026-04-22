package main

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Config 主配置结构
type Config struct {
	GitHub   GitHubConfig   `yaml:"github"`
	Monitor  MonitorConfig  `yaml:"monitor"`
	Notifies []NotifyConfig `yaml:"notifies"`
	Store    StoreConfig    `yaml:"store"`
	Site     SiteConfig     `yaml:"site"`
}

// GitHubConfig GitHub API 配置
type GitHubConfig struct {
	Token string `yaml:"token"`
	// 每次搜索的最大结果数
	MaxResults int `yaml:"maxResults"`
	// API 请求间隔（秒），避免触发限流
	RequestInterval int `yaml:"requestInterval"`
}

// MonitorConfig 监控配置
type MonitorConfig struct {
	// 监控关键词列表，支持多关键词并行搜索
	Keywords []KeywordConfig `yaml:"keywords"`
	// Skill 监控配置
	Skills []SkillConfig `yaml:"skills"`
	// 是否启用关联查询
	EnableRelatedQuery bool `yaml:"enableRelatedQuery"`
	// 黑名单用户ID列表
	BlacklistUsers []string `yaml:"blacklistUsers"`
	// 黑名单仓库名称列表
	BlacklistRepos []string `yaml:"blacklistRepos"`
	// 最小 star 数过滤（0 表示不过滤）
	MinStars int `yaml:"minStars"`
	// 只监控最近 N 天内更新的项目（0 表示不限）
	RecentDays int `yaml:"recentDays"`
}

// KeywordConfig 关键词配置
type KeywordConfig struct {
	// 搜索关键词
	Query string `yaml:"query"`
	// 关键词标签，用于推送时标识来源
	Label string `yaml:"label"`
	// 是否启用
	Enabled bool `yaml:"enabled"`
	// 自定义正则表达式（可选，用于从仓库名/描述中提取关键信息）
	Regex string `yaml:"regex"`
}

// SkillConfig Skill 监控配置
type SkillConfig struct {
	// Skill 名称
	Name string `yaml:"name"`
	// 搜索关键词
	Query string `yaml:"query"`
	// 额外过滤关键词（仓库描述中必须包含）
	FilterKeywords []string `yaml:"filterKeywords"`
	// 是否启用
	Enabled bool `yaml:"enabled"`
	// 自定义标签
	Label string `yaml:"label"`
}

// NotifyConfig 推送配置
type NotifyConfig struct {
	// 推送类型: bark, telegram, feishu, dingtalk, webhook, discord
	Type string `yaml:"type"`
	// 是否启用
	Enabled bool `yaml:"enabled"`
	// 推送标签（可只推送特定标签的通知）
	Labels []string `yaml:"labels"`
	// Bark 配置
	Bark BarkConfig `yaml:"bark"`
	// Telegram 配置
	Telegram TelegramConfig `yaml:"telegram"`
	// 飞书配置
	Feishu FeishuConfig `yaml:"feishu"`
	// 钉钉配置
	Dingtalk DingtalkConfig `yaml:"dingtalk"`
	// Webhook 通用配置
	Webhook WebhookConfig `yaml:"webhook"`
	// Discord 配置
	Discord DiscordConfig `yaml:"discord"`
}

// BarkConfig Bark 推送配置
type BarkConfig struct {
	ServerURL string `yaml:"serverUrl"`
	Token     string `yaml:"token"`
}

// TelegramConfig Telegram 推送配置
type TelegramConfig struct {
	BotToken string `yaml:"botToken"`
	ChatID   string `yaml:"chatId"`
}

// FeishuConfig 飞书推送配置
type FeishuConfig struct {
	WebhookURL string `yaml:"webhookUrl"`
	Secret     string `yaml:"secret"`
}

// DingtalkConfig 钉钉推送配置
type DingtalkConfig struct {
	WebhookURL string `yaml:"webhookUrl"`
	Secret     string `yaml:"secret"`
}

// WebhookConfig 通用 Webhook 配置
type WebhookConfig struct {
	URL     string            `yaml:"url"`
	Method  string            `yaml:"method"`
	Headers map[string]string `yaml:"headers"`
	// 模板内容，支持占位符: {{title}}, {{content}}, {{label}}, {{url}}
	BodyTemplate string `yaml:"bodyTemplate"`
}

// DiscordConfig Discord 推送配置
type DiscordConfig struct {
	WebhookURL string `yaml:"webhookUrl"`
}

// StoreConfig 存储配置
type StoreConfig struct {
	// 数据目录
	DataDir string `yaml:"dataDir"`
	// 是否启用 Git 自动提交
	GitAutoCommit bool `yaml:"gitAutoCommit"`
}

// SiteConfig 站点配置（GitHub Pages 等）
type SiteConfig struct {
	// 站点标题
	Title string `yaml:"title"`
	// Base URL，用于 GitHub Pages 子路径部署（如 "/skill-monitor"）
	BaseURL string `yaml:"baseUrl"`
	// 静态站点输出目录
	OutputDir string `yaml:"outputDir"`
}

// LoadConfig 从文件加载配置
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("解析配置文件失败: %w", err)
	}

	// 设置默认值
	if cfg.GitHub.MaxResults == 0 {
		cfg.GitHub.MaxResults = 30
	}
	if cfg.GitHub.RequestInterval == 0 {
		cfg.GitHub.RequestInterval = 3
	}
	if cfg.Store.DataDir == "" {
		cfg.Store.DataDir = "data"
	}
	if cfg.Site.Title == "" {
		cfg.Site.Title = "Skill Monitor"
	}
	if cfg.Site.OutputDir == "" {
		cfg.Site.OutputDir = "docs"
	}

	// Override token from environment variable (safer than config file)
	if envToken := os.Getenv("GITHUB_TOKEN"); envToken != "" {
		cfg.GitHub.Token = envToken
	}

	return &cfg, nil
}

// GetEnabledKeywords 获取已启用的关键词
func (c *Config) GetEnabledKeywords() []KeywordConfig {
	var result []KeywordConfig
	for _, kw := range c.Monitor.Keywords {
		if kw.Enabled {
			result = append(result, kw)
		}
	}
	return result
}

// GetEnabledSkills 获取已启用的 Skill
func (c *Config) GetEnabledSkills() []SkillConfig {
	var result []SkillConfig
	for _, sk := range c.Monitor.Skills {
		if sk.Enabled {
			result = append(result, sk)
		}
	}
	return result
}

// GetEnabledNotifies 获取已启用的推送配置
func (c *Config) GetEnabledNotifies() []NotifyConfig {
	var result []NotifyConfig
	for _, n := range c.Notifies {
		if n.Enabled {
			result = append(result, n)
		}
	}
	return result
}
