# AINav 数据源说明

## 当前双轨（有意为之，中期可合并）

| 数据源 | 驱动页面 | 维护方式 |
|--------|----------|----------|
| `site-data.json` | `index.html`、`free-tier.html` | 社区 PR，构建合并 extensions |
| `Full_AI_Encyclopedia_Final_Verified_2026.md` | `ai-encyclopedia-2026.html` | 表格 Markdown，独立更新 |

### 差异

- 百科偏「免费额度 / 计费 / 产品说明」长表；导航偏「分类 + 工具卡片 + 扩展分类」。
- 分类命名可能不一致（例如智能体大类 wording 不同）。
- 同一产品可能在两处各改一次。

### 合并方案（评估，未实施）

**推荐路径（渐进）：**

1. 在 `site-data.json` 工具条目增加可选字段：`freeTier`、`encyclopediaNote`。
2. 百科页改为从 JSON + hints 生成，MD 仅作导入源（`node scripts/import-encyclopedia-md.js`）。
3. 保留 `free-tier-hints.json` 作为 link → 额度 的快速维护层，构建时 merge 进工具对象。

**暂不合并的原因：** 百科 800+ 行表格与导航 600+ 工具迭代节奏不同；先统一导航与 plan 站间链接，再动数据模型。

## 其它数据文件

| 文件 | 用途 |
|------|------|
| `free-tier-hints.json` | 免费额度手工标注（`npm run check:hints` 查优先白名单；`--all` 看全量） |
| `free-tier-priority.json` | 优先核实 link 列表（热门/旗舰） |
| `nav-links.json` | 子站顶栏 / plan-nav / sitemap 唯一源 |
| `daily-tools.json` | 覆盖「热门工具」顺序（可含 `asOf`） |
| `nav-extensions.json` | 扩展大类（MCP、RAG 等） |
| `i18n-en.json` | 工具卡英文 title/desc |

## plan-data/

已移除静态 JSON 快照。横评页以 `*-plan.html` 为唯一源；若需结构化提取，可运行 `node plan-to-json.js`（可选，输出勿提交）。
