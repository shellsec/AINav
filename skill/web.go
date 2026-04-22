package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

const pageSize = 30

// WebServer Web dashboard
type WebServer struct {
	store    *Store
	config   *Config
	port     int
	trending *TrendingCrawler
}

// NewWebServer create web server
func NewWebServer(store *Store, config *Config, port int, tc *TrendingCrawler) *WebServer {
	return &WebServer{
		store:    store,
		config:   config,
		port:     port,
		trending: tc,
	}
}

// Start web server
func (w *WebServer) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/", w.handleIndex)
	mux.HandleFunc("/label/", w.handleLabel)
	mux.HandleFunc("/trending", w.handleTrending)
	mux.HandleFunc("/api/records", w.handleAPIRecords)
	mux.HandleFunc("/api/stats", w.handleAPIStats)
	mux.HandleFunc("/api/labels", w.handleAPILabels)
	mux.HandleFunc("/api/trending", w.handleAPITrending)

	addr := fmt.Sprintf(":%d", w.port)
	fmt.Printf("[Web] Dashboard started at http://localhost%s\n", addr)
	return http.ListenAndServe(addr, mux)
}

// TemplateData template data
type TemplateData struct {
	Title       string
	Page        string
	ActiveLabel string
	Labels      []LabelInfo
	Records     []SearchResult
	Stats       StatsData
	Groups      map[string][]SearchResult
	Pagination  *PaginationData
	Trending    []TrendingRepo
	TrendingSet map[string]bool // quick lookup: is this repo trending?
	BasePath    string          // base path for sub-directory deployment
	SortBy      string          // current sort field
}

// PaginationData pagination data
type PaginationData struct {
	Current    int
	TotalPages int
	HasPrev    bool
	HasNext    bool
	PrevURL    string
	NextURL    string
	Pages      []PageItem
}

// PageItem page number item
type PageItem struct {
	Num        int
	URL        string
	IsCurrent  bool
	IsEllipsis bool
}

// buildPagination builds pagination data
func buildPagination(current, total int, baseURL string) *PaginationData {
	if total <= 1 {
		return nil
	}

	pag := &PaginationData{
		Current:    current,
		TotalPages: total,
		HasPrev:    current > 1,
		HasNext:    current < total,
	}

	pag.PrevURL = fmt.Sprintf("%s?page=%d", baseURL, current-1)
	pag.NextURL = fmt.Sprintf("%s?page=%d", baseURL, current+1)

	// Build page numbers with ellipsis
	var pages []PageItem

	if total <= 7 {
		for i := 1; i <= total; i++ {
			pages = append(pages, PageItem{Num: i, URL: fmt.Sprintf("%s?page=%d", baseURL, i), IsCurrent: i == current})
		}
	} else {
		pages = append(pages, PageItem{Num: 1, URL: fmt.Sprintf("%s?page=1", baseURL), IsCurrent: current == 1})

		if current > 3 {
			pages = append(pages, PageItem{IsEllipsis: true})
		}

		start := current - 1
		if start < 2 {
			start = 2
		}
		end := current + 1
		if end > total-1 {
			end = total - 1
		}

		if current <= 3 {
			end = 4
		}
		if current >= total-2 {
			start = total - 3
		}

		for i := start; i <= end; i++ {
			pages = append(pages, PageItem{Num: i, URL: fmt.Sprintf("%s?page=%d", baseURL, i), IsCurrent: i == current})
		}

		if current < total-2 {
			pages = append(pages, PageItem{IsEllipsis: true})
		}

		pages = append(pages, PageItem{Num: total, URL: fmt.Sprintf("%s?page=%d", baseURL, total), IsCurrent: current == total})
	}

	pag.Pages = pages
	return pag
}

// handleIndex home page
func (w *WebServer) handleIndex(wr http.ResponseWriter, req *http.Request) {
	allRecords := w.store.GetRecords()
	stats := w.store.GetStats()
	labels := w.buildLabelInfos(allRecords)

	sortBy := req.URL.Query().Get("sort")
	allRecords = sortRecords(allRecords, sortBy)

	page := getPage(req)
	totalPages := int(math.Ceil(float64(len(allRecords)) / float64(pageSize)))

	// Paginate records
	pagedRecords := paginateRecords(allRecords, page, pageSize)

	groups := groupByDate(pagedRecords)

	// Trending data
	var trendingSet map[string]bool
	if w.trending != nil {
		trendingRepos := w.trending.GetTrending()
		trendingSet = make(map[string]bool)
		for _, tr := range trendingRepos {
			trendingSet[strings.ToLower(tr.FullName)] = true
		}
	}

	data := TemplateData{
		Title:       w.config.Site.Title,
		Page:        "index",
		ActiveLabel: "",
		Labels:      labels,
		Records:     pagedRecords,
		Stats:       stats,
		Groups:      groups,
		Pagination:  buildPagination(page, totalPages, w.config.Site.BaseURL+"/"),
		TrendingSet: trendingSet,
		BasePath:    w.config.Site.BaseURL,
		SortBy:      sortBy,
	}

	wr.Header().Set("Content-Type", "text/html; charset=utf-8")
	renderTemplate(wr, data)
}

// handleLabel filter by label
func (w *WebServer) handleLabel(wr http.ResponseWriter, req *http.Request) {
	label := strings.TrimPrefix(req.URL.Path, "/label/")
	label = strings.TrimSuffix(label, ".html")
	allRecords := w.store.GetRecords()
	stats := w.store.GetStats()
	labels := w.buildLabelInfos(allRecords)

	var filtered []SearchResult
	for _, r := range allRecords {
		if strings.EqualFold(r.Label, label) {
			filtered = append(filtered, r)
		}
	}

	sortBy := req.URL.Query().Get("sort")
	filtered = sortRecords(filtered, sortBy)

	page := getPage(req)
	totalPages := int(math.Ceil(float64(len(filtered)) / float64(pageSize)))

	pagedRecords := paginateRecords(filtered, page, pageSize)

	groups := groupByDate(pagedRecords)

	baseURL := w.config.Site.BaseURL + "/label/" + label

	// Trending data
	var trendingSet map[string]bool
	if w.trending != nil {
		trendingRepos := w.trending.GetTrending()
		trendingSet = make(map[string]bool)
		for _, tr := range trendingRepos {
			trendingSet[strings.ToLower(tr.FullName)] = true
		}
	}

	data := TemplateData{
		Title:       label + " - " + w.config.Site.Title,
		Page:        "label",
		ActiveLabel: label,
		Labels:      labels,
		Records:     pagedRecords,
		Stats:       stats,
		Groups:      groups,
		Pagination:  buildPagination(page, totalPages, baseURL),
		TrendingSet: trendingSet,
		BasePath:    w.config.Site.BaseURL,
		SortBy:      sortBy,
	}

	wr.Header().Set("Content-Type", "text/html; charset=utf-8")
	renderTemplate(wr, data)
}

func (w *WebServer) handleAPIRecords(wr http.ResponseWriter, req *http.Request) {
	label := req.URL.Query().Get("label")
	rType := req.URL.Query().Get("type")
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))

	var records []SearchResult
	for _, rec := range w.store.GetRecords() {
		if label != "" && !strings.EqualFold(rec.Label, label) {
			continue
		}
		if rType != "" && !strings.EqualFold(rec.Type, rType) {
			continue
		}
		records = append(records, rec)
	}

	if limit > 0 && len(records) > limit {
		records = records[:limit]
	}

	wr.Header().Set("Content-Type", "application/json")
	json.NewEncoder(wr).Encode(records)
}

func (w *WebServer) handleAPIStats(wr http.ResponseWriter, req *http.Request) {
	wr.Header().Set("Content-Type", "application/json")
	json.NewEncoder(wr).Encode(w.store.GetStats())
}

func (w *WebServer) handleAPILabels(wr http.ResponseWriter, req *http.Request) {
	records := w.store.GetRecords()
	labels := w.buildLabelInfos(records)
	wr.Header().Set("Content-Type", "application/json")
	json.NewEncoder(wr).Encode(labels)
}

// handleTrending trending page
func (w *WebServer) handleTrending(wr http.ResponseWriter, req *http.Request) {
	allRecords := w.store.GetRecords()
	stats := w.store.GetStats()
	labels := w.buildLabelInfos(allRecords)

	var trending []TrendingRepo
	if w.trending != nil {
		trending = w.trending.GetTrending()
	}

	data := TemplateData{
		Title:    "Trending - " + w.config.Site.Title,
		Page:     "trending",
		Labels:   labels,
		Stats:    stats,
		Trending: trending,
		BasePath: w.config.Site.BaseURL,
	}

	wr.Header().Set("Content-Type", "text/html; charset=utf-8")
	renderTemplate(wr, data)
}

// handleAPITrending API endpoint for trending repos
func (w *WebServer) handleAPITrending(wr http.ResponseWriter, req *http.Request) {
	var trending []TrendingRepo
	if w.trending != nil {
		trending = w.trending.GetTrending()
	}
	wr.Header().Set("Content-Type", "application/json")
	json.NewEncoder(wr).Encode(trending)
}

// LabelSource where the label comes from
type LabelSource int

const (
	LabelActive   LabelSource = iota // currently in config
	LabelHistorical                  // has data but no longer in config
)

// LabelInfo label info
type LabelInfo struct {
	Name   string
	Count  int
	Source LabelSource
}

// buildLabelInfos dynamically build label list — includes historical labels with data
func (w *WebServer) buildLabelInfos(records []SearchResult) []LabelInfo {
	countMap := make(map[string]int)
	activeLabels := make(map[string]bool)

	// Active labels from current config
	for _, kw := range w.config.GetEnabledKeywords() {
		countMap[kw.Label] = 0
		activeLabels[kw.Label] = true
	}
	for _, sk := range w.config.GetEnabledSkills() {
		label := sk.Label
		if label == "" {
			label = sk.Name
		}
		countMap[label] = 0
		activeLabels[label] = true
	}

	// Count records per label (also discovers historical labels)
	for _, r := range records {
		countMap[r.Label]++
	}

	var labels []LabelInfo
	for name, count := range countMap {
		source := LabelActive
		if !activeLabels[name] {
			source = LabelHistorical
		}
		labels = append(labels, LabelInfo{Name: name, Count: count, Source: source})
	}

	// Sort: active labels first (by count desc), then historical (by count desc)
	sort.Slice(labels, func(i, j int) bool {
		if labels[i].Source != labels[j].Source {
			return labels[i].Source < labels[j].Source // Active=0 < Historical=1
		}
		return labels[i].Count > labels[j].Count
	})

	return labels
}

// groupByDate group by repo update date, sorted by Repo.UpdatedAt desc within each group
func groupByDate(records []SearchResult) map[string][]SearchResult {
	groups := make(map[string][]SearchResult)
	for _, r := range records {
		dateKey := r.Repo.UpdatedAt.Format("2006-01-02")
		groups[dateKey] = append(groups[dateKey], r)
	}

	// Sort records within each group by Repo.UpdatedAt descending
	for dateKey := range groups {
		sort.Slice(groups[dateKey], func(i, j int) bool {
			return groups[dateKey][i].Repo.UpdatedAt.After(groups[dateKey][j].Repo.UpdatedAt)
		})
	}

	return groups
}

// sortRecords sorts records by the given field (default: by updated time desc)
func sortRecords(records []SearchResult, sortBy string) []SearchResult {
	sorted := make([]SearchResult, len(records))
	copy(sorted, records)

	switch sortBy {
	case "stars":
		sort.Slice(sorted, func(i, j int) bool {
			return sorted[i].Repo.Stargazers > sorted[j].Repo.Stargazers
		})
	case "created":
		sort.Slice(sorted, func(i, j int) bool {
			return sorted[i].Repo.CreatedAt.After(sorted[j].Repo.CreatedAt)
		})
	default: // "updated" or empty
		sort.Slice(sorted, func(i, j int) bool {
			return sorted[i].Repo.UpdatedAt.After(sorted[j].Repo.UpdatedAt)
		})
	}

	return sorted
}

// getPage get page number from query
func getPage(req *http.Request) int {
	page, err := strconv.Atoi(req.URL.Query().Get("page"))
	if page < 1 || err != nil {
		return 1
	}
	return page
}

// paginateRecords paginate a slice of records
func paginateRecords(records []SearchResult, page, size int) []SearchResult {
	if len(records) == 0 {
		return records
	}
	start := (page - 1) * size
	if start >= len(records) {
		return nil
	}
	end := start + size
	if end > len(records) {
		end = len(records)
	}
	return records[start:end]
}

// renderTemplate render template
func renderTemplate(wr http.ResponseWriter, data TemplateData) {
	tmpl := template.Must(template.New("page").Funcs(template.FuncMap{
		"shortDesc": func(s string) string {
			if len(s) > 120 {
				return s[:120] + "..."
			}
			return s
		},
		"formatDate": func(t time.Time) string {
			return t.Format("2006-01-02")
		},
		"formatTime": func(t time.Time) string {
			return t.Format("15:04")
		},
		"sortedDateKeys": func(m map[string][]SearchResult) []string {
			var keys []string
			for k := range m {
				keys = append(keys, k)
			}
			sort.Sort(sort.Reverse(sort.StringSlice(keys)))
			return keys
		},
		"isTrending": func(fullName string, trendingSet map[string]bool) bool {
			return trendingSet[strings.ToLower(fullName)]
		},
	}).Parse(pageHTML))
	tmpl.Execute(wr, data)
}

const pageHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}}</title>
    <style>
        :root { --bg: #0a0a0f; --card: #12121a; --border: #1e1e2e; --accent: #7c3aed; --accent2: #a78bfa; --text: #e2e8f0; --muted: #64748b; --green: #22c55e; --blue: #3b82f6; --orange: #f59e0b; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace; background: var(--bg); color: var(--text); min-height: 100vh; }

        /* Header */
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-bottom: 1px solid var(--border); padding: 20px 32px; }
        .header h1 { font-size: 22px; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px; }
        .header h1 a { text-decoration: none; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header .subtitle { color: var(--muted); font-size: 13px; }
        .stats-row { display: flex; gap: 24px; margin-top: 16px; }
        .stat { display: flex; flex-direction: column; }
        .stat .num { font-size: 28px; font-weight: 800; color: var(--accent2); }
        .stat .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }

        /* Tabs */
        .tabs { display: flex; gap: 8px; padding: 16px 32px; overflow-x: auto; border-bottom: 1px solid var(--border); background: var(--card); flex-wrap: wrap; }
        .tab { padding: 6px 16px; border-radius: 20px; font-size: 13px; cursor: pointer; text-decoration: none; transition: all 0.2s; white-space: nowrap; border: 1px solid var(--border); color: var(--muted); background: transparent; }
        .tab:hover { color: var(--text); border-color: var(--accent); }
        .tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
        .tab .count { display: inline-block; background: rgba(255,255,255,0.15); border-radius: 10px; padding: 1px 7px; font-size: 11px; margin-left: 6px; }
        .tab.historical { opacity: 0.6; border-style: dashed; }
        .tag-trending { background: rgba(239,68,68,0.15); color: #ef4444; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }

        /* Sort bar */
        .sort-bar { display: flex; gap: 8px; align-items: center; padding: 12px 32px; background: var(--bg); border-bottom: 1px solid var(--border); }
        .sort-bar .sort-label { font-size: 12px; color: var(--muted); margin-right: 4px; }
        .sort-btn { padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; text-decoration: none; transition: all 0.2s; border: 1px solid var(--border); color: var(--muted); background: transparent; font-family: inherit; }
        .sort-btn:hover { color: var(--text); border-color: var(--accent); }
        .sort-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

        /* Main */
        .main { max-width: 960px; margin: 0 auto; padding: 24px 32px; }

        /* Date group */
        .date-group { margin-bottom: 32px; }
        .date-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .date-header .date { font-size: 14px; font-weight: 700; color: var(--accent2); }
        .date-header .line { flex: 1; height: 1px; background: var(--border); }
        .date-header .count { font-size: 12px; color: var(--muted); }

        /* Card */
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px 22px; margin-bottom: 10px; transition: all 0.2s; position: relative; }
        .card:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(124,58,237,0.1); }
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .card-title { font-size: 15px; font-weight: 600; }
        .card-title a { color: var(--text); text-decoration: none; }
        .card-title a:hover { color: var(--accent2); }
        .card-time { font-size: 12px; color: var(--muted); white-space: nowrap; margin-left: 16px; }
        .card-desc { color: var(--muted); font-size: 13px; line-height: 1.6; margin-bottom: 10px; }
        .card-bottom { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .tag { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .tag-keyword { background: rgba(59,130,246,0.12); color: var(--blue); }
        .tag-skill { background: rgba(34,197,94,0.12); color: var(--green); }
        .tag-related { background: rgba(245,158,11,0.12); color: var(--orange); }
        .tag-label { background: rgba(124,58,237,0.12); color: var(--accent2); }
        .card-meta { display: flex; gap: 14px; font-size: 12px; color: var(--muted); }
        .card-meta span { display: flex; align-items: center; gap: 3px; }

        .empty { text-align: center; padding: 80px 20px; }
        .empty h2 { color: var(--muted); font-size: 18px; margin-bottom: 8px; }
        .empty p { color: var(--border); font-size: 14px; }

        /* Pagination */
        .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 32px; padding-bottom: 32px; }
        .pagination a, .pagination span { padding: 8px 14px; border-radius: 8px; font-size: 13px; text-decoration: none; border: 1px solid var(--border); color: var(--muted); transition: all 0.2s; }
        .pagination a:hover { border-color: var(--accent); color: var(--text); }
        .pagination .current { background: var(--accent); color: #fff; border-color: var(--accent); }
        .pagination .disabled { opacity: 0.3; cursor: not-allowed; }
        .pagination .info { border: none; color: var(--muted); font-size: 12px; }

        /* Footer */
        .footer { text-align: center; padding: 24px 32px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); }
        .footer a { color: var(--accent2); text-decoration: none; }
        .footer a:hover { text-decoration: underline; }

        /* Responsive */
        @media (max-width: 640px) {
            .header, .tabs, .sort-bar, .main { padding-left: 16px; padding-right: 16px; }
            .stats-row { gap: 16px; }
            .pagination { flex-wrap: wrap; }
        }
    </style>
    <!-- Google Analytics (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-2B8FBWRX4N"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-2B8FBWRX4N');
    </script>
    <!-- End Google Analytics -->
    <!-- Cloudflare Web Analytics -->
    <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "2d49f38b39c743ac80b6d6b9ff99494d"}'></script>
    <!-- End Cloudflare Web Analytics -->
</head>
<body>
    <div class="header">
        <h1><a href="{{.BasePath}}/">🤖 {{.Title}}</a></h1>
        <div class="subtitle">GitHub AI Project Monitor · Keyword/Skill Auto Tracker</div>
        <div class="stats-row">
            <div class="stat"><span class="num">{{.Stats.Total}}</span><span class="lbl">Projects</span></div>
            <div class="stat"><span class="num">{{.Stats.AvgStars}}</span><span class="lbl">Avg Stars</span></div>
            <div class="stat"><span class="num">{{len .Labels}}</span><span class="lbl">Labels</span></div>
            <div class="stat"><span class="num" style="font-size:14px;margin-top:8px;">{{.Stats.LastUpdated}}</span><span class="lbl">Last Updated</span></div>
        </div>
    </div>

    <div class="tabs">
        <a href="{{.BasePath}}/" class="tab {{if eq .ActiveLabel ""}}active{{end}}">All<span class="count">{{.Stats.Total}}</span></a>
        <a href="{{.BasePath}}/trending.html" class="tab {{if eq .Page "trending"}}active{{end}}">🔥 Trending</a>
        {{range .Labels}}
        <a href="{{$.BasePath}}/label/{{.Name}}.html" class="tab {{if eq $.ActiveLabel .Name}}active{{end}} {{if eq .Source 1}}historical{{end}}">{{if eq .Source 1}}📡 {{end}}{{.Name}}<span class="count">{{.Count}}</span></a>
        {{end}}
    </div>

    {{if ne .Page "trending"}}
    <div class="sort-bar">
        <span class="sort-label">Sort:</span>
        <a href="?sort=updated" class="sort-btn {{if or (eq .SortBy "") (eq .SortBy "updated")}}active{{end}}" data-sort="updated" onclick="return sortCards(this,'updated')">🕐 Updated</a>
        <a href="?sort=stars" class="sort-btn {{if eq .SortBy "stars"}}active{{end}}" data-sort="stars" onclick="return sortCards(this,'stars')">⭐ Stars</a>
        <a href="?sort=created" class="sort-btn {{if eq .SortBy "created"}}active{{end}}" data-sort="created" onclick="return sortCards(this,'created')">🆕 Created</a>
    </div>
    {{end}}

    <div class="main">
        {{if .Groups}}
            {{range $date := sortedDateKeys .Groups}}
            <div class="date-group">
                <div class="date-header">
                    <span class="date">📅 {{$date}}</span>
                    <span class="line"></span>
                    <span class="count">{{len (index $.Groups $date)}} items</span>
                </div>
                {{range index $.Groups $date}}
                <div class="card" data-stars="{{.Repo.Stargazers}}" data-created="{{.Repo.CreatedAt.Unix}}" data-updated="{{.Repo.UpdatedAt.Unix}}">
                    <div class="card-top">
                        <div class="card-title">
                            <a href="{{.Repo.HTMLURL}}" target="_blank">{{.Repo.FullName}}</a>
                        </div>
                        <div class="card-time">🕐 Updated {{.Repo.UpdatedAt.Format "2006-01-02 15:04"}}</div>
                    </div>
                    <div class="card-desc">{{shortDesc .Repo.Description}}</div>
                    <div class="card-bottom">
                        <span class="tag tag-{{.Type}}">{{.Type}}</span>
                        <span class="tag tag-label">{{.Label}}</span>
                        {{if and $.TrendingSet (isTrending .Repo.FullName $.TrendingSet)}}<span class="tag tag-trending">🔥 Trending</span>{{end}}
                        {{if .MatchedInfo}}<span class="tag tag-keyword">{{.MatchedInfo}}</span>{{end}}
                        <div class="card-meta">
                            <span>⭐ {{.Repo.Stargazers}}</span>
                            <span>🍴 {{.Repo.Forks}}</span>
                            <span>💻 {{.Repo.Language}}</span>
                            <span>📅 Updated {{.Repo.UpdatedAt.Format "2006-01-02"}}</span>
                            <span>🆕 Created {{.Repo.CreatedAt.Format "2006-01-02"}}</span>
                        </div>
                    </div>
                </div>
                {{end}}
            </div>
            {{end}}
        {{else}}
            <div class="empty">
                <h2>Awaiting First Search</h2>
                <p>Data will appear here after running skill-monitor</p>
            </div>
        {{end}}

        {{if .Pagination}}
        <div class="pagination">
            {{if .Pagination.HasPrev}}
            <a href="{{.Pagination.PrevURL}}">← Prev</a>
            {{else}}
            <span class="disabled">← Prev</span>
            {{end}}

            {{range .Pagination.Pages}}
            {{if .IsCurrent}}
            <span class="current">{{.Num}}</span>
            {{else if .IsEllipsis}}
            <span class="info">...</span>
            {{else}}
            <a href="{{.URL}}">{{.Num}}</a>
            {{end}}
            {{end}}

            {{if .Pagination.HasNext}}
            <a href="{{.Pagination.NextURL}}">Next →</a>
            {{else}}
            <span class="disabled">Next →</span>
            {{end}}

            <span class="info">Page {{.Pagination.Current}} / {{.Pagination.TotalPages}}</span>
        </div>
        {{end}}

        {{if eq .Page "trending"}}
        {{if .Trending}}
            <div class="date-group">
                <div class="date-header">
                    <span class="date">🔥 GitHub Trending — AI Projects Today</span>
                    <span class="line"></span>
                    <span class="count">{{len .Trending}} items</span>
                </div>
                {{range .Trending}}
                <div class="card">
                    <div class="card-top">
                        <div class="card-title">
                            <a href="{{.URL}}" target="_blank">{{.FullName}}</a>
                        </div>
                        <div class="card-time">⭐ {{.Stars}}</div>
                    </div>
                    <div class="card-desc">{{shortDesc .Description}}</div>
                    <div class="card-bottom">
                        <span class="tag tag-trending">🔥 Trending</span>
                        {{if .TodayStars}}<span class="tag tag-keyword">{{.TodayStars}}</span>{{end}}
                        <div class="card-meta">
                            {{if .Language}}<span>💻 {{.Language}}</span>{{end}}
                        </div>
                    </div>
                </div>
                {{end}}
            </div>
        {{else}}
            <div class="empty">
                <h2>No Trending Data</h2>
                <p>Trending data will appear after the next crawl</p>
            </div>
        {{end}}
        {{end}}
    </div>

    <script>
    function sortCards(el, field) {
        // If it's a dynamic page (has query support), use server-side sort
        var isStatic = !window.location.search && document.querySelectorAll('.pagination a[href*="?page="]').length === 0;
        // For static pages or when JS is available, do client-side sort
        var main = document.querySelector('.main');
        if (!main) return true;
        var cards = Array.from(main.querySelectorAll('.card'));
        if (cards.length === 0) return true;
        cards.sort(function(a, b) {
            var va, vb;
            if (field === 'stars') {
                va = parseInt(a.dataset.stars) || 0;
                vb = parseInt(b.dataset.stars) || 0;
                return vb - va;
            } else if (field === 'created') {
                va = parseInt(a.dataset.created) || 0;
                vb = parseInt(b.dataset.created) || 0;
                return vb - va;
            } else {
                va = parseInt(a.dataset.updated) || 0;
                vb = parseInt(b.dataset.updated) || 0;
                return vb - va;
            }
        });
        // Remove date groups, put all cards into a flat container
        var groups = main.querySelectorAll('.date-group');
        var container = document.createElement('div');
        container.className = 'sorted-cards';
        cards.forEach(function(c) { container.appendChild(c); });
        groups.forEach(function(g) { g.remove(); });
        var empty = main.querySelector('.empty');
        if (empty) empty.style.display = 'none';
        main.insertBefore(container, main.querySelector('.pagination'));
        // Update active state
        document.querySelectorAll('.sort-btn').forEach(function(b) { b.classList.remove('active'); });
        el.classList.add('active');
        return false;
    }
    </script>

    <div class="footer">
        Powered by <a href="https://github.com/shellsec/skill-monitor">Skill Monitor</a> · Auto-updated via GitHub Actions
    </div>
</body>
</html>`
