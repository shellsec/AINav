# AINav 内容更新节奏

模型、套餐、默认可用型号变化很快。**不必每个分类同频更新**，按「会不会写具体模型名 / 价格」分层维护即可。

**默认节奏：每 1～2 周巡检一次「快层」**；有大厂发布时当周改完。

---

## 两层内容

| 层级 | 含义 | 典型位置 | 节奏 |
|------|------|----------|------|
| **快层** | 写了具体模型、套餐、额度、默认可用型号 | 热门工具、`*-plan.html`、`token-optimization.html`、`free-tier-hints.json`、百科「热门工具」与扩展区 | **每周或每两周**；旗舰发布 **当周** |
| **慢层** | 工具名录、泛描述、长尾百科 | 百科 800+ 条其余行、办公类批量模板 | **每月抽样** 或 **每季度** 批量 |

用户觉得「站过不过时」，主要看快层；慢层可以滞后，但死链要及时处理。

---

## 推荐日历

### 每 1～2 周（约 20～40 分钟）

巡检快层，**无新闻也可只做快扫**：

| 检查项 | 文件 / 页面 | 看什么 |
|--------|-------------|--------|
| 热门工具 | `daily-tools.json` | 副标题里的型号（V4、K2.6、Opus、Gemini 等）、链接是否 404 |
| Coding / Agent / Model 横评 | `coding-plan.html`、`agent-plan.html`、`model-plan.html` | 套餐价、默认模型、兼容矩阵、Agent 用量池表述 |
| Token 专题 | `token-optimization.html` | Cursor / Claude Code / Codex 默认模型与计费口径 |
| 免费额度 | `free-tier-hints.json` + 构建出的 `free-tier.html` | 免费层可用哪档模型、新用户赠送 |
| 页脚日期 | 上述 plan 页「最后更新」 | 有实质修改时改为当天 |

改完执行：

```bash
node build-html-data.js
```

可选：`node scripts/check-free-tier-hints.js` 看 hints 覆盖率。

---

### 每月 1 次（约 1～2 小时）

| 检查项 | 文件 / 页面 | 看什么 |
|--------|-------------|--------|
| 扩展导航 | `nav-extensions.json` | 新代表产品、死链、与热门/plan 重复是否必要 |
| 媒体类 plan | `video/image/voice/music/search/learning-plan.html` | 停服归档、性价比表、新模型替换 |
| 顶栏与交叉链 | `nav-extensions.json`、`subpage-nav-html.js`、`plan-nav.js` | 新专题是否进顶栏 |
| 百科（快层相关行） | `Full_AI_Encyclopedia_Final_Verified_2026.md` | 仅「热门工具」+ 近期改过的扩展分类行，**不必全表扫** |
| 英文 | `i18n-en.json` / `build-i18n-en.cjs` | 热门、plan 改完后顺带补 title/desc |

---

### 每季度 1 次（约半天）

| 检查项 | 说明 |
|--------|------|
| 百科长尾 | 抽样或按分类批量改过时型号（如办公区 GPT-4o 模板） |
| P3 硬件 / 工厂 | `hardware-plan.html`、`ai-factory-plan.html` 价格与机型 |
| 死链抽检 | 热门 + 扩展 + plan 外链 |
| 分类顺序 | `category-order.json`（仅大改版时动） |

---

## 模型升级：事件驱动（不等周期）

以下情况 **当天～3 天内** 改快层并 build：

| 事件 | 必改 |
|------|------|
| 旗舰换代（如 GPT-5、Opus 4.8、Gemini 3.1、DeepSeek V4） | 热门（若相关）+ 对应 plan + 免费额度 |
| 国内 Coding Plan 套餐 / 兼容矩阵变化 | `coding-plan.html`、百科相关行 |
| 产品停服 / 改名 / 域名变更 | 对应卡片 + 百科；停服标「归档」 |
| 仅 API 上新、网页默认不变 | plan / API 区即可，热门可不动 |
| 小版本（Flash、Sonnet 点版本） | 2 周内更新 plan 表；热门副标题视曝光决定 |

---

## 按频道一览

| 频道 | 建议节奏 | 备注 |
|------|----------|------|
| 热门工具 | 每 1～2 周 + 发布当周 | `daily-tools.json` |
| P0 plan（coding / agent / model） | 每 1～2 周 + 发布当周 | 横评页为权威源 |
| Token 优化 | 跟 Cursor/Claude/Codex 发布 | 与 P0 同频或更勤 |
| 免费额度 | 每 1～2 周 | `free-tier-hints.json` |
| P2 媒体 plan | 每月 | 停服敏感 |
| nav-extensions | 每月 | 新知识库 / API / Agent 代表 |
| P3 硬件 / ai-factory | 每季度 | 新机、新价 |
| 百科全量 800+ | 每季度抽样 | **不等于**模型名也季度才改 |
| Skill 索引等外链站 | 每季度或按需 | 相对独立 |

**同一产品只挂一个主分类即可**（如 Remio 仅在 `ext-ai-knowledge`），避免多栏重复。

---

## 修改后别忘了

1. 改数据源：`daily-tools.json` / `nav-extensions.json` / 百科 MD / `*-plan.html` / hints 等。
2. 运行 `node build-html-data.js` → 更新 `index.html`、`site-data.json`、`ai-encyclopedia-2026.html`、`free-tier.html`。
3. plan 页若改了实质内容，更新文内 **「最后更新：YYYY-MM-DD」**。
4. 可选：在热门或 plan 顶栏注明 **「模型信息截至 YYYY-MM-DD」**，便于用户判断时效。

---

## 与数据源文档的关系

- 双轨数据源、合并评估见 [`DATA-SOURCES.md`](./DATA-SOURCES.md)。
- 构建与本地预览见根目录 [`README.zh-CN.md`](../README.zh-CN.md)。

---

*文档建立：2026-07-03。默认巡检：**每 1～2 周**；模型大发布：**当周**。*
