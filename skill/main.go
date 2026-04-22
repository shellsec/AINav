package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

var (
	version    = "1.0.0"
	configPath string
	webPort    int
	once       bool
	interval   int
	staticMode bool
	baseURL    string
)

func init() {
	flag.StringVar(&configPath, "c", "config.yaml", "配置文件路径")
	flag.IntVar(&webPort, "p", 8080, "Web 仪表盘端口")
	flag.BoolVar(&once, "once", false, "只执行一次搜索")
	flag.IntVar(&interval, "interval", 15, "定时搜索间隔（分钟）")
	flag.BoolVar(&staticMode, "static", false, "生成静态站点（不启动 Web 服务）")
	flag.StringVar(&baseURL, "base-url", "", "站点 Base URL（覆盖配置文件，如 /skill）")
}

func main() {
	flag.Parse()

	fmt.Printf("🤖 Skill Monitor v%s\n", version)
	fmt.Println("========================")

	// 加载配置
	cfg, err := LoadConfig(configPath)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 命令行参数覆盖配置
	if baseURL != "" {
		cfg.Site.BaseURL = baseURL
	}

	// 初始化存储
	store, err := NewStore(cfg.Store.DataDir)
	if err != nil {
		log.Fatalf("初始化存储失败: %v", err)
	}

	// 初始化推送
	notifier := NewNotifier(cfg.GetEnabledNotifies())

	// 初始化搜索器
	searcher := NewSearcher(cfg, store)

	// 初始化 Trending 爬虫
	trendingCrawler := NewTrendingCrawler(store, cfg.Store.DataDir)

	// 执行搜索
	runSearch := func() {
		log.Println("========== 开始搜索 ==========")
		startTime := time.Now()

		results, err := searcher.Run()
		if err != nil {
			log.Printf("搜索执行失败: %v", err)
			return
		}

		log.Printf("搜索完成，共找到 %d 个结果，耗时 %v", len(results), time.Since(startTime))

		// 存储结果并获取新增项
		newResults := store.AddResults(results)
		if len(newResults) > 0 {
			log.Printf("发现 %d 个新项目，开始推送...", len(newResults))

			// 推送通知
			notifier.NotifyBatch(newResults)

			// 保存新增 JSON
			if err := store.SaveNewJSON(newResults); err != nil {
				log.Printf("保存 new.json 失败: %v", err)
			}

			// 保存日期日志
			if err := store.SaveDateLog(newResults); err != nil {
				log.Printf("保存日期日志失败: %v", err)
			}
		}

		// 持久化
		if err := store.Save(); err != nil {
			log.Printf("保存数据失败: %v", err)
		}

		log.Println("========== 搜索结束 ==========")
	}

	// 首次抓取 Trending
	if staticMode {
		// 静态模式：同步等待 Trending 完成，确保页面有数据
		if _, err := trendingCrawler.Crawl(); err != nil {
			log.Printf("[Trending] 抓取失败（不影响主流程）: %v", err)
		}
	} else {
		// 服务模式：后台异步抓取
		go func() {
			if _, err := trendingCrawler.Crawl(); err != nil {
				log.Printf("[Trending] 首次抓取失败（不影响主流程）: %v", err)
			}
		}()
	}

	// 首次立即执行搜索
	runSearch()

	// 生成静态站点
	if staticMode {
		generator := NewStaticGenerator(store, cfg, trendingCrawler)
		if err := generator.Generate(); err != nil {
			log.Fatalf("生成静态站点失败: %v", err)
		}
		fmt.Println("✅ 静态站点生成完成")
		return
	}

	// 启动 Web 仪表盘（后台）
	webSrv := NewWebServer(store, cfg, webPort, trendingCrawler)
	go func() {
		if err := webSrv.Start(); err != nil {
			log.Printf("Web 服务启动失败: %v", err)
		}
	}()

	if once {
		return
	}

	// 定时执行
	ticker := time.NewTicker(time.Duration(interval) * time.Minute)
	defer ticker.Stop()

	// Trending 每天抓一次
	trendingTicker := time.NewTicker(24 * time.Hour)
	defer trendingTicker.Stop()

	// 信号处理
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	fmt.Printf("定时搜索已启动，间隔 %d 分钟\n", interval)
	fmt.Printf("Web 仪表盘: http://localhost:%d\n", webPort)

	for {
		select {
		case <-ticker.C:
			runSearch()
		case <-trendingTicker.C:
			go func() {
				if _, err := trendingCrawler.Crawl(); err != nil {
					log.Printf("[Trending] 定时抓取失败: %v", err)
				}
			}()
		case sig := <-sigCh:
			log.Printf("收到信号 %v，正在退出...", sig)
			// 保存数据
			if err := store.Save(); err != nil {
				log.Printf("保存数据失败: %v", err)
			}
			return
		}
	}
}
