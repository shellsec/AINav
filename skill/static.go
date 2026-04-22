package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// StaticGenerator static site generator
type StaticGenerator struct {
	store    *Store
	config   *Config
	trending *TrendingCrawler
}

// NewStaticGenerator create static generator
func NewStaticGenerator(store *Store, config *Config, tc *TrendingCrawler) *StaticGenerator {
	return &StaticGenerator{
		store:    store,
		config:   config,
		trending: tc,
	}
}

// Generate generates the full static site
func (sg *StaticGenerator) Generate() error {
	outputDir := sg.config.Site.OutputDir
	basePath := sg.config.Site.BaseURL

	// Create output directory
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("create output dir failed: %w", err)
	}

	// Create label subdirectories
	labelDir := filepath.Join(outputDir, "label")
	if err := os.MkdirAll(labelDir, 0755); err != nil {
		return fmt.Errorf("create label dir failed: %w", err)
	}

	// Prepare data
	allRecords := sg.store.GetRecords()
	stats := sg.store.GetStats()
	labels := sg.buildLabelInfos(allRecords)

	// Trending data
	var trendingSet map[string]bool
	var trendingRepos []TrendingRepo
	if sg.trending != nil {
		trendingRepos = sg.trending.GetTrending()
		trendingSet = make(map[string]bool)
		for _, tr := range trendingRepos {
			trendingSet[strings.ToLower(tr.FullName)] = true
		}
	}

	// Parse template
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

	// 1. Generate index pages (with pagination)
	totalPages := int(math.Ceil(float64(len(allRecords)) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	for page := 1; page <= totalPages; page++ {
		pagedRecords := paginateRecords(allRecords, page, pageSize)
		groups := groupByDate(pagedRecords)

		data := TemplateData{
			Title:       sg.config.Site.Title,
			Page:        "index",
			ActiveLabel: "",
			Labels:      labels,
			Records:     pagedRecords,
			Stats:       stats,
			Groups:      groups,
			Pagination:  sg.buildStaticPagination(page, totalPages, basePath+"/"),
			TrendingSet: trendingSet,
			BasePath:    basePath,
			SortBy:      "",
		}

		var filename string
		if page == 1 {
			filename = "index.html"
		} else {
			filename = fmt.Sprintf("index-page-%d.html", page)
		}

		if err := sg.writeHTML(tmpl, filepath.Join(outputDir, filename), data); err != nil {
			log.Printf("[Static] Failed to write %s: %v", filename, err)
		}
	}

	log.Printf("[Static] Generated %d index pages", totalPages)

	// 2. Generate label pages
	for _, label := range labels {
		var filtered []SearchResult
		for _, r := range allRecords {
			if strings.EqualFold(r.Label, label.Name) {
				filtered = append(filtered, r)
			}
		}

		labelTotalPages := int(math.Ceil(float64(len(filtered)) / float64(pageSize)))
		if labelTotalPages < 1 {
			labelTotalPages = 1
		}

		for page := 1; page <= labelTotalPages; page++ {
			pagedRecords := paginateRecords(filtered, page, pageSize)
			groups := groupByDate(pagedRecords)

			data := TemplateData{
				Title:       label.Name + " - " + sg.config.Site.Title,
				Page:        "label",
				ActiveLabel: label.Name,
				Labels:      labels,
				Records:     pagedRecords,
				Stats:       stats,
				Groups:      groups,
				Pagination:  sg.buildStaticPagination(page, labelTotalPages, basePath+"/label/"+label.Name),
				TrendingSet: trendingSet,
				BasePath:    basePath,
				SortBy:      "",
			}

			var filename string
			if page == 1 {
				filename = label.Name + ".html"
			} else {
				filename = fmt.Sprintf("%s-page-%d.html", label.Name, page)
			}

			if err := sg.writeHTML(tmpl, filepath.Join(outputDir, "label", filename), data); err != nil {
				log.Printf("[Static] Failed to write label/%s: %v", filename, err)
			}
		}
	}

	log.Printf("[Static] Generated pages for %d labels", len(labels))

	// 3. Generate trending page
	trendingData := TemplateData{
		Title:    "Trending - " + sg.config.Site.Title,
		Page:     "trending",
		Labels:   labels,
		Stats:    stats,
		Trending: trendingRepos,
		BasePath: basePath,
	}

	if err := sg.writeHTML(tmpl, filepath.Join(outputDir, "trending.html"), trendingData); err != nil {
		log.Printf("[Static] Failed to write trending.html: %v", err)
	}

	// 4. Generate API JSON files
	apiDir := filepath.Join(outputDir, "api")
	if err := os.MkdirAll(apiDir, 0755); err != nil {
		log.Printf("[Static] Failed to create api dir: %v", err)
	}

	sg.writeJSON(filepath.Join(apiDir, "stats.json"), stats)
	sg.writeJSON(filepath.Join(apiDir, "labels.json"), labels)
	sg.writeJSON(filepath.Join(apiDir, "records.json"), allRecords)
	sg.writeJSON(filepath.Join(apiDir, "trending.json"), trendingRepos)

	log.Printf("[Static] Site generated to %s/", outputDir)
	return nil
}

// writeHTML renders template to file
func (sg *StaticGenerator) writeHTML(tmpl *template.Template, path string, data TemplateData) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	return tmpl.Execute(f, data)
}

// writeJSON writes data as JSON file
func (sg *StaticGenerator) writeJSON(path string, data interface{}) {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Printf("[Static] Failed to marshal %s: %v", path, err)
		return
	}
	if err := os.WriteFile(path, jsonData, 0644); err != nil {
		log.Printf("[Static] Failed to write %s: %v", path, err)
	}
}

// buildStaticPagination builds pagination for static pages (page 2+ use -page-N.html)
func (sg *StaticGenerator) buildStaticPagination(current, total int, baseURL string) *PaginationData {
	if total <= 1 {
		return nil
	}

	pag := &PaginationData{
		Current:    current,
		TotalPages: total,
		HasPrev:    current > 1,
		HasNext:    current < total,
	}

	pag.PrevURL = sg.staticPageURL(baseURL, current-1)
	pag.NextURL = sg.staticPageURL(baseURL, current+1)

	var pages []PageItem
	for i := 1; i <= total; i++ {
		pages = append(pages, PageItem{
			Num:       i,
			URL:       sg.staticPageURL(baseURL, i),
			IsCurrent: i == current,
		})
	}

	pag.Pages = pages
	return pag
}

// staticPageURL generates URL for a static page
func (sg *StaticGenerator) staticPageURL(baseURL string, page int) string {
	if page == 1 {
		if strings.Contains(baseURL, "/label/") {
			return baseURL + ".html"
		}
		return baseURL
	}
	if strings.Contains(baseURL, "/label/") {
		return fmt.Sprintf("%s-page-%d.html", baseURL, page)
	}
	return fmt.Sprintf("%sindex-page-%d.html", baseURL, page)
}

// buildLabelInfos builds label info list (same logic as WebServer but standalone)
func (sg *StaticGenerator) buildLabelInfos(records []SearchResult) []LabelInfo {
	countMap := make(map[string]int)
	activeLabels := make(map[string]bool)

	for _, kw := range sg.config.GetEnabledKeywords() {
		countMap[kw.Label] = 0
		activeLabels[kw.Label] = true
	}
	for _, sk := range sg.config.GetEnabledSkills() {
		label := sk.Label
		if label == "" {
			label = sk.Name
		}
		countMap[label] = 0
		activeLabels[label] = true
	}

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

	sort.Slice(labels, func(i, j int) bool {
		if labels[i].Source != labels[j].Source {
			return labels[i].Source < labels[j].Source
		}
		return labels[i].Count > labels[j].Count
	})

	return labels
}
