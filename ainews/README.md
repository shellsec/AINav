# AI 资讯监控系统（静态站点版）

自动监控多个 AI 相关网站，抓取最新资讯，AI 分析后生成静态站点，部署到 GitHub Pages。

## 架构

```
私有仓库 (ainews)                公开仓库 (AINav)
┌──────────────────┐            ┌──────────────────┐
│  爬虫脚本         │            │  ainews/          │
│  AI 分析          │  Actions   │  ├── index.html   │
│  build_static.py  │ ────────→ │  ├── api/*.json   │
│  .github/         │  推产物    │  ├── daily_*/     │
│  workflows/       │            │  └── weekly_*/    │
└──────────────────┘            └──────────────────┘
                                       │
                                       ▼
                                 GitHub Pages
                                aiv123.com/ainews
```

## 采集源

| 来源 | 频率 | 状态 |
|------|------|------|
| AI-Bot 每日资讯 | 10 分钟 | ✅ |
| AIBase 新闻 | 5 分钟 | ✅ |
| Anthropic 新闻 | 12 小时 | ✅ |
| OpenAI 新闻 | 12 小时 | ✅ |
| Cursor 更新日志 | 12 小时 | ✅ |
| HuggingFace 更新 | 12 小时 | ✅ |
| Trae AI 更新日志 | 12 小时 | ✅ |
| Ollama 模型库更新 | 12 小时 | ✅ |
| Cognition AI 博客 | 12 小时 | ✅ |
| Kiro 更新日志 | 12 小时 | ✅ |
| Google AI Blog | 12 小时 | 可选 |
| Microsoft AI Blog | 12 小时 | ✅ |
| DeepMind Blog | 12 小时 | ✅ |
| VentureBeat AI | 6 小时 | ✅ |
| arXiv AI 论文 | 6 小时 | ✅ |
| 机器之心 | 6 小时 | ✅ |

## 去重机制

三重去重，确保不重复入库：

1. **Content Hash（MD5）**：内容规范化后取 MD5，完全相同的跳过
2. **URL 去重**：非固定 URL（具体文章）重复则跳过；固定 URL（博客首页）允许不同内容
3. **标题相似度**：同来源 + 标题包含关系 + 内容 70% 相似度 = 判重

## 快速开始

### 本地运行（开发模式）

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 复制配置文件
cp config.ini.example config.ini
# 编辑 config.ini，配置来源开关

# 3. 启动 Flask 服务（动态模式）
python app.py
# 访问 http://localhost:5001
```

### 生成静态站点

```bash
# 运行爬虫 + AI 分析 + 生成静态文件
python build_static.py --base-url "/ainews" --days 7

# 只生成静态文件（跳过爬虫和分析）
python build_static.py --skip-crawl --skip-analysis --base-url "/ainews"

# 输出在 docs/ 目录
```

## 私有化部署

### 1. 从 AINav 拆出独立私有仓库

```bash
# 在 GitHub 上创建私有仓库（如 yourname/ainews），不要初始化 README

# 把 ainews/ 目录推到新仓库
cd ainews
git init
git add .
git commit -m "init: ainews monitor"
git remote add origin git@github.com:yourname/ainews.git
git push -u origin main
```

### 2. 配置 Secrets

仓库 Settings → Secrets and variables → Actions，添加：

| Secret | 说明 |
|--------|------|
| `AI_API_KEY` | AI 分析 API Key（可选，未配置则用关键词降级） |
| `AINAV_REPO` | AINav 仓库名，如 `username/AINav` |
| `AINAV_PAT` | 有 AINav 写权限的 PAT |

### 3. 启用 Actions

Actions 标签页 → Enable workflow → 手动 **Run workflow** 触发首次运行

### 4. 同步到 AINav

Actions 运行后会自动把 `docs/*` 推到 AINav 仓库的 `ainews/` 目录，GitHub Pages 自动部署。

如需手动同步：

```bash
# 在 ainews 仓库生成静态文件
python build_static.py --base-url "/ainews" --days 7

# 复制到 AINav 仓库
cp -r docs/* /path/to/AINav/ainews/
cd /path/to/AINav
git add ainews/
git commit -m "update: ainews static site"
git push
```

## GitHub Actions 自动部署

工作流 `.github/workflows/deploy.yml` 每 6 小时自动运行：

```
每6小时（4次/天）/ 手动触发
    │
    ├── pip install → 安装依赖
    ├── python build_static.py
    │     ├── 爬虫抓取 → 写入 SQLite
    │     ├── AI 分析 → daily_analysis/*.json
    │     │     └── 降级链：AI API → 关键词匹配
    │     └── 导出 JSON + HTML → docs/
    ├── 复制 docs/* → AINav 仓库的 ainews/ 目录
    └── git push → GitHub Pages 自动部署
          │
          └── aiv123.com/ainews ✅
```

### 费用说明

见 skill 仓库 README，两个项目合计约 1740 分钟/月，Free 额度 2000 分钟内。

### AI 分析降级

AI 分析有三级降级链：

| 级别 | 方式 | 质量 |
|------|------|------|
| ✅ AI API | 调用大模型深度分析（默认 mimo-v2-flash） | 高 |
| ⬇️ 关键词匹配 | 正面/负面词频统计 + 分类计数 + 模板摘要 | 中 |
| ❌ 无分析 | `fallback_to_keywords=False` 时直接返回空 | 无 |

关键词匹配具体做法：
- 情绪评分：统计标题中正面词（突破/创新/发布…）和负面词（问题/漏洞/故障…）
- 主要话题：取 `category` 字段 TOP5
- TOP 新闻：按标题长度排序（占位逻辑）
- 高管视角：生成占位数据，标注"需 AI 分析"

## 文件结构

```
ainews/
├── .github/workflows/deploy.yml   # Actions 工作流
├── .gitignore
├── requirements.txt
├── build_static.py                 # 静态站点生成器
├── config.ini.example              # 配置模板
├── ai_news_monitor.py              # 统一爬虫脚本
├── ai_analyzer.py                  # AI 分析器
├── push_logger.py                  # 数据库 + 去重
├── app.py                          # Flask 服务（开发用）
├── index.html                      # 资讯首页
├── daily_analysis_index.html       # AI 分析索引页
├── daily_analysis.html             # AI 分析详情页
├── weekly_analysis_index.html      # 周报索引页
├── weekly_analysis.html            # 周报详情页
└── docs/                           # 生成的静态站点（gitignore）
    ├── index.html
    ├── api/
    │   ├── ainews_2026-04-20.json
    │   ├── ainews_2026-04-19.json
    │   └── latest_date.json
    ├── daily_analysis/
    └── weekly_analysis/
```

## 注意事项

- `config.ini` 包含敏感信息（钉钉/企业微信 Token），已在 `.gitignore` 中排除
- AI 分析需要 API Key，未配置时自动降级为关键词匹配
- 静态页面不自动刷新，数据在 Actions 运行时更新
