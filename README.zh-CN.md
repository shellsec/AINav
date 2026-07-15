# AINav

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**[English](./README.md)** | 中文

## ☕ 请我喝可乐

开源不易，欢迎赞助支持：  
👉 [爱发电](https://ifdian.net/a/shellsec)

本地 **AI 工具导航站**：从 `site-data.json` 生成 `index.html`、免费额度页与百科页；可用 `nav-extensions.json` 追加扩展分类（API 聚合、MCP、RAG、本地推理等）。另含编程/Agent/模型等横评页、`ai-roi/` 技能落地自查等专题。

## 环境要求

- **Node.js** 18+（`download-icons.mjs` / 死链检测需要 `fetch`；`build-html-data.js` 为 CommonJS）

## 快速开始

```bash
# 1. 生成 index.html、free-tier.html、百科页、sitemap（并同步 plan-nav）
npm run build
# 或：node build-html-data.js

# 2.（可选）下载图标到 ./icons/，再构建一次以使用本地图标
npm run icons
npm run build
```

用浏览器打开 **`index.html`** 即可。页眉/页脚可进入 **免费额度**、各横评页与百科。

## 常用命令

```bash
npm run build            # 生成页面；从 nav-links.json 同步 plan-nav.js
npm run icons            # 按 avatar 下载图标
npm run check            # 链接一致性 + 优先免费额度 hints 门禁
npm run check:hints      # 仅检查 free-tier-priority.json 白名单是否已核实
npm run check:hints:all  # 全量 hints 覆盖率（缺一条也会 exit 1）
npm run check:links      # site / extensions / 百科占位 URL 静态审计
npm run check:dead       # HTTP 探测热门 + 优先白名单外链（加 --ext 含扩展分类）
```

CI（`.github/workflows/ci.yml`）在 push / PR 时会跑：`build` → `audit-links` → `check:hints` → `check:dead`（死链步骤允许失败以免偶发网络误伤）。

## 页面功能（纯前端）

### 首页 `index.html`

- **常用收藏**：卡片右上角 ☆；正文顶部「常用收藏」+ 侧栏锚点。数据在 `localStorage`（`ainav-favorites-v1`），支持导入/导出。
- **轻量对比**：卡片「⇄」加入对比篮（最多 **4** 个，`ainav-compare-v1`）；底部托盘可打开对照表，并链到编程 / Agent / 模型横评。
- **场景筛选**：对话 / 编程 / 搜索 / 图像 / 视频 / 国内 / 国际 / Agent·RAG，可与搜索叠加。
- **免费档 / 地区角标**：若 `link` 命中 `free-tier-hints.json`，卡片显示免费档（如「部分免费」）及国内/国际标签；可跳转 `free-tier.html?q=产品名`。
- **热门时效**：`daily-tools.json` 的 `asOf` 会显示为「模型信息截至 YYYY-MM-DD」。
- **浅色 / 深色 / 跟随系统**：`ainav-theme` = `light` | `dark` | `system`。
- **中 / EN**：UI 与分类名切换；工具描述可走 `i18n-en.json`。偏好键 `ainav-lang`。
- **搜索**：`/` 或 `Ctrl+K`（Mac ⌘K）聚焦搜索框。
- **顶栏横评入口**：由 `nav-links.json` 生成（与子站顶栏同源）。
- **构建时间**：页脚展示每次 `npm run build` 的生成时间。

### 免费额度 `free-tier.html`

- 菜单树去重后的产品列表；支持搜索、免费等级 / 分类 / **已核实·推断** 筛选。
- **已核实**来自手工 `free-tier-hints.json`；其余为规则推断，页顶有可信度说明。
- 列表默认 **已核实优先**；仍以各产品官网计费为准。

### 其它页面（节选）

| 页面 | 说明 |
|------|------|
| `ai-encyclopedia-2026.html` | 百科长表（源：`Full_AI_Encyclopedia_Final_Verified_2026.md`） |
| `*-plan.html` / `token-optimization.html` | 模型、编程、Agent、媒体等横评；顶栏用 `plan-nav.js` |
| `opc.html` 等 | 一人公司专题 |
| `thinking-framework.html` / `ask`·`plan`·`debug`·`agent` | AI 第一思考框架 |
| `ai-roi/` | 技能落地自查 · ROI（独立子应用） |

## 仓库内主要文件

| 文件 | 说明 |
|------|------|
| `index.html` / `free-tier.html` / `ai-encyclopedia-2026.html` | 构建产物，可直接打开 |
| `site-data.json` | 核心：菜单树与工具数据 |
| `build-html-data.js` | 合并配置并写出上述 HTML + `sitemap.xml` |
| `nav-links.json` | **子站顶栏 / 首页横评条 / plan-nav / sitemap 唯一数据源** |
| `plan-nav.js` | 横评页顶栏脚本（构建时由 `nav-links.json` 同步 LINKS） |
| `subpage-nav-html.js` | 构建期子站导航 HTML / sitemap / 同步 plan-nav |
| `nav-extensions.json` | 扩展分类（可 merge 到已有大类） |
| `category-order.json` | 可选：一级与子分组顺序 |
| `daily-tools.json` | 可选：替换「热门工具」；可写 `asOf` |
| `append-leaf-tools.json` | 可选：向「分组/叶子」追加工具 |
| `free-tier-hints.json` | 按产品 `link` 手工填写免费档等 |
| `free-tier-priority.json` | 优先核实白名单（CI / `check:hints` 门禁） |
| `free-tier-infer.js` | 无 hints 时的推断规则 |
| `i18n-en.json` | 工具英文 title/desc |
| `download-icons.mjs` / `icons/` | 图标下载与本地目录 |
| `docs/DATA-SOURCES.md` | 双轨数据源与合并评估 |
| `docs/update-cadence.md` | 内容更新节奏建议 |
| `ai-roi/` | AI 技能落地自查 |
| `.github/workflows/ci.yml` | 构建与检查流水线 |

## 顶栏与导航（改一处即可）

跨页顶栏链接统一维护在 **`nav-links.json`**：

1. 编辑 `links`（及可选 `sitemap`）。
2. 执行 `npm run build`。
3. 构建会：写入子站顶栏、生成首页「横评/落地/方法论」条、同步 `plan-nav.js` 的 `LINKS`、更新 `sitemap.xml`。

条目字段要点：`href` / `zh` / `en` / `match`；`nav` 含 `sub` | `plan` | `home`；首页分组用 `homeGroup`（`highlight` | `compare` | `landing` | `method`）。

## 热门工具 · 日常向调整

1. 编辑 **`daily-tools.json`**（`mode: "replace-hot"` 替换名为「热门工具」的分类）。
2. 建议填写 **`asOf": "YYYY-MM-DD"`**，首页热门区会显示时效。
3. `npm run build`。恢复默认：删文件或改掉 `mode` 后再构建。

`items` 可写 `title`、`subtitle`、`link`；可选 `avatar`。

当前「热门」**不是**实时排行榜，顺序即 `items` 数组顺序。真·热门需自建统计后再手工写回。

## 免费额度维护

1. 在 **`free-tier-hints.json`** 用产品 `link`（建议与导航一致）填写 `freeLevel`、`quota`、`dailyCycle`、`firstBonus`、`note`、`updated`。
2. 把必须长期核实的产品 `link` 放进 **`free-tier-priority.json`**（通常含热门 + 旗舰）。
3. `npm run check:hints` 通过后再 `npm run build`。

未在 hints 中的条目会走推断并标「推断」；全站覆盖率可用 `npm run check:hints:all` 查看（默认门禁不要求 100%）。

## 合规页与工具详情（AdSense / SEO 向）

| 文件 | 说明 |
|------|------|
| `about.html` / `contact.html` / `disclaimer.html` | 关于、联系、免责（可收录） |
| `privacy.html` | 隐私政策（含 AdSense / Analytics 说明） |
| `ads.txt` / `robots.txt` | 广告授权与爬虫入口 |
| `tool-pages.json` | 详情页生成名单（与 `daily-tools.json` 合并） |
| `scripts/build-tool-pages.js` | 从百科表生成 `tools/*.html` |
| `tools/` | 构建产物：工具详情与目录页 |

改名单后执行 `npm run build`（或 `npm run build:tools`）。站点地图会自动并入 `tools/` 与合规页。

## 分类顺序（侧边栏）

编辑 **`category-order.json`**：

- **`topLevel`**：一级分类 `name` 或扩展 `id` 的期望顺序；未列出的排在后面。
- **`childrenOrder`**：键为一级分组名，值为子分类名数组。

改完执行 `npm run build`。

## 自定义扩展分类

编辑 **`nav-extensions.json`** 的 `categories`：

```json
{
  "id": "my-section",
  "name": "我的分类标题",
  "tools": [
    {
      "title": "产品名",
      "subtitle": "一句话说明",
      "link": "https://example.com/"
    }
  ]
}
```

- **`id`**：可选锚点（会规范化）。
- **`avatar`**：可选本地图标路径。

若扩展 `name`/`id` 与已有叶子分类相同，会 **合并** 到该类，而不是新建顶栏项。保存后 `npm run build`。

## 数据维护

- **新增工具**：在 `site-data.json` 对应 `tools` 中加 `title` + `link`（可选 `subtitle`、`avatar`），或走 `nav-extensions.json` / `append-leaf-tools.json`。
- **新增分类**：`menus` 增加 leaf/group，或用扩展 JSON。
- **改后必跑**：`npm run build`。
- 扩展与外链为人工维护，请定期 `npm run check:dead` 抽检。

更细的更新节奏见 [`docs/update-cadence.md`](./docs/update-cadence.md)；数据源双轨说明见 [`docs/DATA-SOURCES.md`](./docs/DATA-SOURCES.md)。

## 许可

[GPLv3](https://www.gnu.org/licenses/gpl-3.0) — 仅覆盖本仓库中的脚本、配置与自建数据；衍生作品须按 GPLv3 开源。所收录工具的名称、图标与链接归各自服务商所有，使用时请遵守目标网站服务条款。
