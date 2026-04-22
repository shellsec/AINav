package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// GitHub Search API 响应结构
type GitHubSearchResponse struct {
	TotalCount int `json:"total_count"`
	Items      []GitHubRepo `json:"items"`
}

type GitHubRepo struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	FullName    string    `json:"full_name"`
	HTMLURL     string    `json:"html_url"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	PushedAt    time.Time `json:"pushed_at"`
	Stargazers  int       `json:"stargazers_count"`
	Forks       int       `json:"forks_count"`
	Language    string    `json:"language"`
	Owner       struct {
		Login string `json:"login"`
		ID    int64  `json:"id"`
	} `json:"owner"`
	Topics []string `json:"topics"`
}

// SearchResult 统一的搜索结果
type SearchResult struct {
	Label       string     `json:"label"`       // 来源标签
	Keyword     string     `json:"keyword"`     // 匹配的关键词
	Type        string     `json:"type"`        // keyword / skill / related
	Repo        GitHubRepo `json:"repo"`
	MatchedInfo string     `json:"matchedInfo"` // 正则匹配到的信息（如CVE编号）
	FoundAt     time.Time  `json:"foundAt"`     // 发现时间
}

// Searcher 搜索器
type Searcher struct {
	config      *Config
	client      *http.Client
	store       *Store
	apiCalls    int       // 本轮已调用的 API 次数
	maxAPICalls int       // 每轮最大 API 调用次数
	rateLimited bool      // 是否触发限流
}

// NewSearcher 创建搜索器
func NewSearcher(cfg *Config, store *Store) *Searcher {
	// 计算每轮安全上限：
	// 无 Token: 10次/小时, 有 Token: 30次/小时
	// 每轮最多用上限的 60%，留 40% 给其他可能的手动调用
	maxCalls := 6 // 无 Token 默认
	if cfg.GitHub.Token != "" {
		maxCalls = 18
	}
	return &Searcher{
		config:      cfg,
		client:      &http.Client{Timeout: 30 * time.Second},
		store:       store,
		maxAPICalls: maxCalls,
	}
}

// Run 执行搜索
func (s *Searcher) Run() ([]SearchResult, error) {
	var allResults []SearchResult
	s.apiCalls = 0
	s.rateLimited = false

	// 计算本轮需要的 API 调用次数
	totalQueries := len(s.config.GetEnabledKeywords()) + len(s.config.GetEnabledSkills())
	log.Printf("[搜索] 本轮需查询 %d 个关键词/Skill，API 上限 %d 次/轮", totalQueries, s.maxAPICalls)

	if totalQueries > s.maxAPICalls {
		log.Printf("[警告] 查询数(%d)超过安全上限(%d)！建议配置 GitHub Token 或减少关键词", totalQueries, s.maxAPICalls)
	}

	// 1. 关键词搜索
	keywords := s.config.GetEnabledKeywords()
	for _, kw := range keywords {
		if s.checkRateLimit() {
			break
		}
		results, err := s.searchByKeyword(kw)
		if err != nil {
			log.Printf("[关键词搜索] %s 搜索失败: %v", kw.Label, err)
			continue
		}
		log.Printf("[关键词搜索] %s 找到 %d 个结果", kw.Label, len(results))
		allResults = append(allResults, results...)
		time.Sleep(time.Duration(s.config.GitHub.RequestInterval) * time.Second)
	}

	// 2. Skill 监控搜索
	skills := s.config.GetEnabledSkills()
	for _, sk := range skills {
		if s.checkRateLimit() {
			break
		}
		results, err := s.searchBySkill(sk)
		if err != nil {
			log.Printf("[Skill搜索] %s 搜索失败: %v", sk.Name, err)
			continue
		}
		log.Printf("[Skill搜索] %s 找到 %d 个结果", sk.Name, len(results))
		allResults = append(allResults, results...)
		time.Sleep(time.Duration(s.config.GitHub.RequestInterval) * time.Second)
	}

	// 3. 关联查询
	if s.config.Monitor.EnableRelatedQuery {
		related, err := s.searchRelated(allResults)
		if err != nil {
			log.Printf("[关联查询] 失败: %v", err)
		} else {
			log.Printf("[关联查询] 找到 %d 个关联结果", len(related))
			allResults = append(allResults, related...)
		}
	}

	// 4. 过滤和去重
	allResults = s.filterResults(allResults)
	allResults = s.deduplicateResults(allResults)

	return allResults, nil
}

// searchByKeyword 按关键词搜索
func (s *Searcher) searchByKeyword(kw KeywordConfig) ([]SearchResult, error) {
	repos, err := s.searchGitHub(kw.Query)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	var re *regexp.Regexp
	if kw.Regex != "" {
		re, err = regexp.Compile(kw.Regex)
		if err != nil {
			log.Printf("[关键词搜索] 正则编译失败 %s: %v", kw.Regex, err)
		}
	}

	for _, repo := range repos {
		matchedInfo := ""
		if re != nil {
			matches := re.FindStringSubmatch(repo.FullName + " " + repo.Description)
			if len(matches) > 0 {
				matchedInfo = strings.Join(matches[1:], " ")
			}
		}

		results = append(results, SearchResult{
			Label:       kw.Label,
			Keyword:     kw.Query,
			Type:        "keyword",
			Repo:        repo,
			MatchedInfo: matchedInfo,
			FoundAt:     time.Now(),
		})
	}

	return results, nil
}

// searchBySkill 按 Skill 搜索
func (s *Searcher) searchBySkill(sk SkillConfig) ([]SearchResult, error) {
	repos, err := s.searchGitHub(sk.Query)
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	for _, repo := range repos {
		// 额外过滤：仓库描述必须包含 FilterKeywords
		if len(sk.FilterKeywords) > 0 {
			desc := strings.ToLower(repo.Description)
			found := false
			for _, fk := range sk.FilterKeywords {
				if strings.Contains(desc, strings.ToLower(fk)) {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		label := sk.Label
		if label == "" {
			label = sk.Name
		}

		results = append(results, SearchResult{
			Label:       label,
			Keyword:     sk.Query,
			Type:        "skill",
			Repo:        repo,
			MatchedInfo: sk.Name,
			FoundAt:     time.Now(),
		})
	}

	return results, nil
}

// searchRelated 关联查询
func (s *Searcher) searchRelated(results []SearchResult) ([]SearchResult, error) {
	// 收集所有匹配到的CVE编号
	cveRe := regexp.MustCompile(`(?i)CVE-(\d+)-\d+`)
	seen := make(map[string]bool)
	var relatedResults []SearchResult

	for _, r := range results {
		text := r.Repo.FullName + " " + r.Repo.Description + " " + r.MatchedInfo
		matches := cveRe.FindAllString(text, -1)
		for _, cve := range matches {
			if seen[cve] {
				continue
			}
			seen[cve] = true

			time.Sleep(time.Duration(s.config.GitHub.RequestInterval) * time.Second)
			repos, err := s.searchGitHub(cve)
			if err != nil {
				log.Printf("[关联查询] CVE %s 搜索失败: %v", cve, err)
				continue
			}

			for _, repo := range repos {
				relatedResults = append(relatedResults, SearchResult{
					Label:       "related",
					Keyword:     cve,
					Type:        "related",
					Repo:        repo,
					MatchedInfo: cve,
					FoundAt:     time.Now(),
				})
			}
		}
	}

	return relatedResults, nil
}

// searchGitHub 调用 GitHub Search API
func (s *Searcher) searchGitHub(query string) ([]GitHubRepo, error) {
	s.apiCalls++

	searchURL := fmt.Sprintf("https://api.github.com/search/repositories?q=%s&sort=updated&per_page=%d",
		url.QueryEscape(query),
		s.config.GitHub.MaxResults,
	)

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "Skill-Monitor")

	if s.config.GitHub.Token != "" {
		req.Header.Set("Authorization", "Bearer "+s.config.GitHub.Token)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 403 {
		s.rateLimited = true
		resetHeader := resp.Header.Get("X-RateLimit-Reset")
		remaining := resp.Header.Get("X-RateLimit-Remaining")
		limit := resp.Header.Get("X-RateLimit-Limit")
		return nil, fmt.Errorf("GitHub API 限流 (剩余:%s/%s, 重置时间戳:%s)，请配置 Token 或减少关键词", remaining, limit, resetHeader)
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API 返回状态码: %d", resp.StatusCode)
	}

	// 打印剩余配额，配额紧张时主动限流
	remaining := resp.Header.Get("X-RateLimit-Remaining")
	limit := resp.Header.Get("X-RateLimit-Limit")
	if remaining != "" {
		log.Printf("[API] 配额: %s/%s (本轮已用 %d 次)", remaining, limit, s.apiCalls)
		// 剩余 <=2 时主动停止，避免触发 403
		if remaining == "2" || remaining == "1" || remaining == "0" {
			s.rateLimited = true
			log.Printf("[API] 配额即将耗尽 (%s)，主动停止后续查询", remaining)
		}
	}

	var searchResp GitHubSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return searchResp.Items, nil
}

// checkRateLimit 检查是否达到 API 调用上限
func (s *Searcher) checkRateLimit() bool {
	if s.rateLimited {
		log.Printf("[限流] 已触发限流，跳过后续查询")
		return true
	}
	if s.apiCalls >= s.maxAPICalls {
		log.Printf("[限流] 已达本轮上限 %d 次，跳过后续查询", s.maxAPICalls)
		return true
	}
	return false
}

// filterResults 过滤结果
func (s *Searcher) filterResults(results []SearchResult) []SearchResult {
	var filtered []SearchResult

	blacklistUsers := make(map[string]bool)
	for _, u := range s.config.Monitor.BlacklistUsers {
		blacklistUsers[u] = true
	}
	blacklistRepos := make(map[string]bool)
	for _, r := range s.config.Monitor.BlacklistRepos {
		blacklistRepos[strings.ToLower(r)] = true
	}

	now := time.Now()

	for _, r := range results {
		repo := r.Repo

		// 黑名单用户过滤
		if blacklistUsers[repo.Owner.Login] {
			continue
		}

		// 黑名单仓库过滤
		if blacklistRepos[strings.ToLower(repo.FullName)] {
			continue
		}

		// 最小 star 数过滤
		if s.config.Monitor.MinStars > 0 && repo.Stargazers < s.config.Monitor.MinStars {
			continue
		}

		// 最近 N 天更新过滤
		if s.config.Monitor.RecentDays > 0 {
			cutoff := now.AddDate(0, 0, -s.config.Monitor.RecentDays)
			if repo.UpdatedAt.Before(cutoff) {
				continue
			}
		}

		filtered = append(filtered, r)
	}

	return filtered
}

// deduplicateResults 去重
func (s *Searcher) deduplicateResults(results []SearchResult) []SearchResult {
	seen := make(map[int64]bool)
	var deduped []SearchResult

	for _, r := range results {
		if !seen[r.Repo.ID] {
			seen[r.Repo.ID] = true
			deduped = append(deduped, r)
		}
	}

	return deduped
}
