package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// TrendingCrawler GitHub Trending crawler
type TrendingCrawler struct {
	store    *Store
	client   *http.Client
	dataDir  string
	cacheMu  sync.RWMutex
	cached   []TrendingRepo
	cachedAt time.Time
}

// TrendingRepo a repo from GitHub Trending page
type TrendingRepo struct {
	FullName    string `json:"fullName"`
	Description string `json:"description"`
	Language    string `json:"language"`
	Stars       int    `json:"stars"`
	TodayStars  string `json:"todayStars"` // e.g. "1,234 stars today"
	URL         string `json:"url"`
	CrawledAt   string `json:"crawledAt"`
}

// NewTrendingCrawler create crawler
func NewTrendingCrawler(store *Store, dataDir string) *TrendingCrawler {
	return &TrendingCrawler{
		store:   store,
		client:  &http.Client{Timeout: 30 * time.Second},
		dataDir: dataDir,
	}
}

// Crawl fetches GitHub Trending page and parses repos
func (tc *TrendingCrawler) Crawl() ([]TrendingRepo, error) {
	// Check cache (valid for 6 hours)
	tc.cacheMu.RLock()
	if tc.cached != nil && time.Since(tc.cachedAt) < 6*time.Hour {
		cached := tc.cached
		tc.cacheMu.RUnlock()
		log.Printf("[Trending] Using cached data (%d repos, cached at %s)", len(cached), tc.cachedAt.Format("2006-01-02 15:04"))
		return cached, nil
	}
	tc.cacheMu.RUnlock()

	// Fetch GitHub Trending (daily, spoken_language_code=empty for all)
	url := "https://github.com/trending?since=daily"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := tc.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch trending failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub Trending returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body failed: %w", err)
	}

	// Parse repos from HTML
	repos := parseTrendingHTML(string(body))

	// Filter for AI-related repos
	var aiRepos []TrendingRepo
	for _, repo := range repos {
		if isAIRelated(repo) {
			aiRepos = append(aiRepos, repo)
		}
	}

	log.Printf("[Trending] Found %d AI-related repos out of %d total trending repos", len(aiRepos), len(repos))

	// Update cache
	tc.cacheMu.Lock()
	tc.cached = aiRepos
	tc.cachedAt = time.Now()
	tc.cacheMu.Unlock()

	// Save to disk
	tc.saveToDisk(aiRepos)

	return aiRepos, nil
}

// parseTrendingHTML parses GitHub Trending HTML to extract repos
func parseTrendingHTML(html string) []TrendingRepo {
	var repos []TrendingRepo

	// Match each repo article block
	articleRe := regexp.MustCompile(`<article class="Box-row">(.*?)</article>`)
	articles := articleRe.FindAllStringSubmatch(html, -1)

	for _, match := range articles {
		block := match[1]
		repo := TrendingRepo{}

		// Extract repo path (owner/repo)
		pathRe := regexp.MustCompile(`href="/([^"]+)"`)
		pathMatch := pathRe.FindStringSubmatch(block)
		if len(pathMatch) > 1 {
			repo.FullName = pathMatch[1]
			repo.URL = "https://github.com/" + pathMatch[1]
		} else {
			continue
		}

		// Extract description
		descRe := regexp.MustCompile(`<p class="col-9 color-fg-muted my-1 pr-4">\s*(.*?)\s*</p>`)
		descMatch := descRe.FindStringSubmatch(block)
		if len(descMatch) > 1 {
			repo.Description = strings.TrimSpace(descMatch[1])
		}

		// Extract language
		langRe := regexp.MustCompile(`<span itemprop="programmingLanguage">(.*?)</span>`)
		langMatch := langRe.FindStringSubmatch(block)
		if len(langMatch) > 1 {
			repo.Language = strings.TrimSpace(langMatch[1])
		}

		// Extract total stars
		starsRe := regexp.MustCompile(`href="/[^"]+/stargazers"[^>]*>\s*([\d,]+)\s*</a>`)
		starsMatch := starsRe.FindStringSubmatch(block)
		if len(starsMatch) > 1 {
			repo.Stars = parseStars(starsMatch[1])
		}

		// Extract today's stars
		todayRe := regexp.MustCompile(`(\d[\d,]*\s+stars?\s+today)`)
		todayMatch := todayRe.FindStringSubmatch(block)
		if len(todayMatch) > 1 {
			repo.TodayStars = todayMatch[1]
		}

		repo.CrawledAt = time.Now().Format("2006-01-02 15:04:05")
		repos = append(repos, repo)
	}

	return repos
}

// isAIRelated checks if a repo is AI-related by keywords
func isAIRelated(repo TrendingRepo) bool {
	text := strings.ToLower(repo.FullName + " " + repo.Description + " " + repo.Language)

	aiKeywords := []string{
		"ai", "llm", "gpt", "claude", "gemini", "openai", "anthropic",
		"agent", "rag", "mcp", "model", "inference", "embedding",
		"transformer", "diffusion", "neural", "deep-learning", "machine-learning",
		"nlp", "speech", "tts", "asr", "vision", "multimodal",
		"langchain", "ollama", "vllm", "lora", "fine-tun", "training",
		"chatbot", "copilot", "coding", "workflow", "automation",
		"vector", "database", "retrieval", "hermes", "openclaw",
		"skill", "plugin", "prompt", "tokenizer", "dataset",
		"pytorch", "tensorflow", "mlx", "onnx", "whisper",
		"stable-diffusion", "comfyui", "aigc", "generation",
		"bert", "gemma", "llama", "mistral", "qwen",
	}

	for _, kw := range aiKeywords {
		if strings.Contains(text, kw) {
			return true
		}
	}
	return false
}

// parseStars parses "1,234" to int
func parseStars(s string) int {
	s = strings.ReplaceAll(s, ",", "")
	var n int
	fmt.Sscanf(s, "%d", &n)
	return n
}

// saveToDisk saves trending data to JSON
func (tc *TrendingCrawler) saveToDisk(repos []TrendingRepo) error {
	data, err := json.MarshalIndent(repos, "", "  ")
	if err != nil {
		return err
	}
	filePath := filepath.Join(tc.dataDir, "trending.json")
	return os.WriteFile(filePath, data, 0644)
}

// loadFromDisk loads cached trending data
func (tc *TrendingCrawler) loadFromDisk() []TrendingRepo {
	filePath := filepath.Join(tc.dataDir, "trending.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil
	}
	var repos []TrendingRepo
	if err := json.Unmarshal(data, &repos); err != nil {
		return nil
	}

	// Check if data is from today
	if len(repos) > 0 {
		crawledAt := repos[0].CrawledAt
		t, err := time.Parse("2006-01-02 15:04:05", crawledAt)
		if err == nil && time.Since(t) < 24*time.Hour {
			tc.cacheMu.Lock()
			tc.cached = repos
			tc.cachedAt = t
			tc.cacheMu.Unlock()
			return repos
		}
	}
	return nil
}

// GetTrending returns cached or freshly crawled trending repos
func (tc *TrendingCrawler) GetTrending() []TrendingRepo {
	tc.cacheMu.RLock()
	if tc.cached != nil && time.Since(tc.cachedAt) < 6*time.Hour {
		cached := tc.cached
		tc.cacheMu.RUnlock()
		return cached
	}
	tc.cacheMu.RUnlock()

	// Try disk cache first
	if disk := tc.loadFromDisk(); disk != nil {
		return disk
	}

	// Crawl fresh
	repos, err := tc.Crawl()
	if err != nil {
		log.Printf("[Trending] Crawl failed: %v", err)
		tc.cacheMu.RLock()
		cached := tc.cached
		tc.cacheMu.RUnlock()
		return cached
	}
	return repos
}
