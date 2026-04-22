package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Store 数据存储
type Store struct {
	dataDir string
	mu      sync.RWMutex
	records map[int64]SearchResult // repoID -> SearchResult
}

// NewStore 创建存储
func NewStore(dataDir string) (*Store, error) {
	s := &Store{
		dataDir: dataDir,
		records: make(map[int64]SearchResult),
	}

	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("创建数据目录失败: %w", err)
	}

	if err := s.load(); err != nil {
		logPrintf("加载历史数据失败（首次运行可忽略）: %v", err)
	}

	return s, nil
}

func logPrintf(format string, args ...interface{}) {
	fmt.Printf("[Store] "+format+"\n", args...)
}

// load 从磁盘加载历史数据
func (s *Store) load() error {
	filePath := filepath.Join(s.dataDir, "records.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	var records []SearchResult
	if err := json.Unmarshal(data, &records); err != nil {
		return err
	}

	for _, r := range records {
		s.records[r.Repo.ID] = r
	}

	logPrintf("加载了 %d 条历史记录", len(s.records))
	return nil
}

// Save 保存到磁盘
func (s *Store) Save() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var records []SearchResult
	for _, r := range s.records {
		records = append(records, r)
	}

	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化失败: %w", err)
	}

	filePath := filepath.Join(s.dataDir, "records.json")
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("写入文件失败: %w", err)
	}

	return nil
}

// AddResults 添加搜索结果，返回新增的结果
func (s *Store) AddResults(results []SearchResult) []SearchResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	var newResults []SearchResult
	for _, r := range results {
		if _, exists := s.records[r.Repo.ID]; !exists {
			s.records[r.Repo.ID] = r
			newResults = append(newResults, r)
		}
	}

	if len(newResults) > 0 {
		logPrintf("新增 %d 条记录", len(newResults))
	}

	return newResults
}

// GetRecords get all records sorted by repo update time descending
func (s *Store) GetRecords() []SearchResult {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var records []SearchResult
	for _, r := range s.records {
		records = append(records, r)
	}

	sort.Slice(records, func(i, j int) bool {
		return records[i].Repo.UpdatedAt.After(records[j].Repo.UpdatedAt)
	})

	return records
}

// GetRecordsByLabel get records by label sorted by repo update time descending
func (s *Store) GetRecordsByLabel(label string) []SearchResult {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var records []SearchResult
	for _, r := range s.records {
		if strings.EqualFold(r.Label, label) {
			records = append(records, r)
		}
	}

	sort.Slice(records, func(i, j int) bool {
		return records[i].Repo.UpdatedAt.After(records[j].Repo.UpdatedAt)
	})

	return records
}

// StatsData 统计数据
type StatsData struct {
	Total       int            `json:"total"`
	LabelCount  map[string]int `json:"labelCount"`
	TypeCount   map[string]int `json:"typeCount"`
	AvgStars    int            `json:"avgStars"`
	LastUpdated string         `json:"lastUpdated"`
}

// GetStats 获取统计信息
func (s *Store) GetStats() StatsData {
	s.mu.RLock()
	defer s.mu.RUnlock()

	labelCount := make(map[string]int)
	typeCount := make(map[string]int)
	var totalStars int

	for _, r := range s.records {
		labelCount[r.Label]++
		typeCount[r.Type]++
		totalStars += r.Repo.Stargazers
	}

	var avgStars int
	if len(s.records) > 0 {
		avgStars = totalStars / len(s.records)
	}

	return StatsData{
		Total:       len(s.records),
		LabelCount:  labelCount,
		TypeCount:   typeCount,
		AvgStars:    avgStars,
		LastUpdated: time.Now().Format("2006-01-02 15:04:05"),
	}
}

// SaveNewJSON 保存最新新增记录到 new.json
func (s *Store) SaveNewJSON(results []SearchResult) error {
	if len(results) == 0 {
		return nil
	}

	data, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		return err
	}

	filePath := filepath.Join(s.dataDir, "new.json")
	return os.WriteFile(filePath, data, 0644)
}

// SaveDateLog 保存按日期的日志
func (s *Store) SaveDateLog(results []SearchResult) error {
	if len(results) == 0 {
		return nil
	}

	dateDir := filepath.Join(s.dataDir, "dateLog")
	if err := os.MkdirAll(dateDir, 0755); err != nil {
		return err
	}

	filePath := filepath.Join(dateDir, time.Now().Format("2006-01-02")+".json")

	// 读取已有数据
	var existing []SearchResult
	if data, err := os.ReadFile(filePath); err == nil {
		json.Unmarshal(data, &existing)
	}

	existing = append(existing, results...)

	// 去重
	seen := make(map[int64]bool)
	var deduped []SearchResult
	for _, r := range existing {
		if !seen[r.Repo.ID] {
			seen[r.Repo.ID] = true
			deduped = append(deduped, r)
		}
	}

	data, err := json.MarshalIndent(deduped, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, data, 0644)
}
