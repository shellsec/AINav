# 🤖 Skill

> GitHub AI 生态动态监控 — 关键词/Skill 自动追踪 · 多推送 · Web 仪表盘 · GitHub Pages 托管

## ✨ 特性

| 特性 | 说明 |
|------|------|
| 🔎 **多关键词监控** | 配置任意关键词，页面自动生成对应分类 Tab |
| 🤖 **Skill 监控** | MCP Server / Claude Code Skill / LangChain Tool 等 |
| 📡 **6 种推送** | Bark / Telegram / 飞书 / 钉钉 / Discord / Webhook |
| 🌐 **Web 仪表盘** | 暗色主题，按日期时间线展示，动态分类 |
| 📄 **GitHub Pages** | 自动生成静态站点，免费托管，子路径直接访问 |
| 📊 **自动分类** | 关键词增减时，页面 Tab 自动增减 |
| ⏰ **定时执行** | 本地定时 或 GitHub Actions |

## 项目结构

```
skill/
├── main.go              # 主程序入口
├── config.go            # 配置管理
├── search.go            # GitHub 搜索
├── notify.go            # 多推送接口
├── store.go             # 数据存储
├── web.go               # Web 仪表盘 + 模板
├── static.go            # 静态站点生成
├── trending.go          # GitHub Trending 爬虫
├── config.example.yaml  # 示例配置
├── docs/                # 静态站点输出（GitHub Pages）
└── .github/workflows/
    └── deploy.yml       # GitHub Actions
```

## 🚀 快速开始

```bash
cp config.example.yaml config.yaml
# 编辑 config.yaml

go mod tidy && go build -o skill .

# 模式一：Web 服务（本地运行）
./skill                     # 默认每15分钟搜索，Web 端口 8080
./skill -once               # 只执行一次

# 模式二：生成静态站点
./skill -once -static                 # 生成到 docs/，使用 config.yaml 中的 baseUrl
./skill -once -static -base-url "/skill"   # 命令行覆盖 baseUrl
```

打开 `http://localhost:8080` 查看 Web 仪表盘。

## 配置说明

关键词和 Skill 可以随意增减，页面会自动生成对应分类：

```yaml
monitor:
  keywords:
    - query: "AI agent framework"
      label: "AI Agent"          # 页面 Tab 名称
      enabled: true
    - query: "RAG framework"
      label: "RAG"
      enabled: true

  skills:
    - name: "MCP Server"
      query: "MCP server model context protocol"
      filterKeywords: ["mcp", "server"]
      enabled: true
      label: "MCP-Server"
```

## 推送配置

每个推送渠道可设置只接收特定标签的通知：

```yaml
notifies:
  - type: telegram
    enabled: true
    labels: ["AI-Agent", "MCP-Server"]  # 只推这些标签
    telegram:
      botToken: "xxx"
      chatId: "xxx"
```

## 站点配置

用于 GitHub Pages 部署：

```yaml
site:
  title: "AI Skill Monitor"
  # 子路径部署（如 https://aiv123.com/skill）
  baseUrl: "/skill"
  outputDir: "docs"
```

## 私有化部署

### 1. 从 AINav 拆出独立私有仓库

```bash
# 在 GitHub 上创建私有仓库（如 yourname/skill），不要初始化 README

# 把 skill/ 目录推到新仓库
cd skill
git init
git add .
git commit -m "init: skill monitor"
git remote add origin git@github.com:yourname/skill.git
git push -u origin main
```

### 2. 配置 Secrets

仓库 Settings → Secrets and variables → Actions，添加：

| Secret | 说明 |
|--------|------|
| `GH_TOKEN` | GitHub Personal Access Token（`public_repo` 权限，用于搜索 API） |
| `AINAV_REPO` | AINav 仓库全名，如 `yourname/AINav` |
| `AINAV_PAT` | 有 AINav 仓库写权限的 Personal Access Token |

### 3. 启用 Actions

Actions 标签页 → Enable workflow → 手动 **Run workflow** 触发首次运行

### 4. 同步到 AINav

Actions 运行后会自动把 `docs/*` 推到 AINav 仓库的 `skill/` 目录，GitHub Pages 自动部署。

如需手动同步：

```bash
# 在 skill 仓库生成静态文件
./skill -once -static -base-url "/skill"

# 复制到 AINav 仓库
cp -r docs/* /path/to/AINav/skill/
cd /path/to/AINav
git add skill/
git commit -m "update: skill static site"
git push
```

## GitHub Actions 自动部署

全自动流程：私有仓库编译 → 生成静态站点 → 推送到 AINav 仓库 → GitHub Pages 自动发布。

```
每4小时（6次/天）/ 手动触发
    │
    ├── go build → 编译出 skill 二进制
    ├── ./skill -once -static -base-url "/skill"
    │     ├── 搜索 GitHub（使用 GH_TOKEN）
    │     ├── 爬取 GitHub Trending
    │     └── 生成 docs/ 静态站点
    ├── 复制 docs/* → AINav 仓库的 skill/ 目录
    └── git push → GitHub Pages 自动部署
          │
          └── aiv123.com/skill ✅
```

### 费用说明

| 项目 | 频率 | 每次约 | 月耗 |
|------|------|--------|------|
| skill | 6次/天 | 3 分钟 | ~540 分钟 |
| ainews | 4次/天 | 10 分钟 | ~1200 分钟 |
| **合计** | | | **~1740 分钟** |

GitHub 私有仓库 Free 额度 2000 分钟/月，余约 260 分钟。**Linux runner 分钟乘数 1x**（默认）。

> ⚠️ **安全提示**：不要将 Token 写入 `config.yaml`，使用 Secrets 注入。程序会自动从环境变量 `GITHUB_TOKEN` 读取。

## License

GPL-3.0
