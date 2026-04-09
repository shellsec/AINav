# AINav

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/shellsec/AINav/blob/main/LICENSE)

**[English](./README.md)** | 中文

本地 **AI 工具导航页**：从 `site-data.json`（本地维护的分类与工具数据）生成 `index.html` 与百科页；可通过 `nav-extensions.json` 追加扩展分类（API 聚合、MCP、RAG、本地推理等）。

## 环境要求

- **Node.js** 18+（需支持 `fetch`，用于 `download-icons.mjs`；`build-html-data.js` 使用 CommonJS）

## 快速开始

```bash
# 1. 生成 index.html 与百科页
node build-html-data.js

# 2.（可选）下载图标到 ./icons/，再生成一次以使用本地图标
node download-icons.mjs
node build-html-data.js
```

用浏览器打开 **`index.html`** 即可使用；页脚有 **「各工具免费额度 · 计费参考表」** 链到百科页。

## 页面功能（纯前端）

- **常用收藏**：每张工具卡右上角可点亮星标；收藏区在正文最上方「常用收藏」，侧栏有 **★ 常用收藏** 锚点跳转。列表保存在浏览器 **`localStorage`**（键名 `ainav-favorites-v1`），支持导入/导出。
- **浅色 / 深色 / 跟随系统**：页眉有主题按钮，写入 **`localStorage`**（`ainav-theme`：`light` | `dark` | `system`）。`system` 与系统 `prefers-color-scheme` 联动；打印样式会尽量压暗侧栏与装饰，便于投影与纸质阅读。
- **中英文切换**：工具栏点击 `中` / `EN` 按钮即可切换 UI 文案与分类名；工具卡描述保持原语言。偏好保存在 `localStorage`（`ainav-lang`）。
- **搜索快捷键**：按 `/` 或 `Ctrl+K`（Mac ⌘K）可直接聚焦搜索框。
- **GitHub 链接**：工具栏右侧 GitHub 图标跳转到仓库。
- **回到顶部**：滚动后右下角出现浮动按钮，一键回到页首。
- **构建时间**：每次执行 `node build-html-data.js` 会在页脚展示构建时间。
- **免费额度参考页**：**`free-tiers.html`** 列出当前菜单树中**去重后的全部产品链接**，正文说明来自 **`free-tier-hints.json`**（手工维护）；未维护的条目显示「未标注」，**务必以各产品官网计费为准**。

## 仓库内主要文件

| 文件 | 说明 |
|------|------|
| `index.html` | 导航页面（构建产物，可直接打开） |
| `ai-encyclopedia-2026.html` | **AI 工具百科全书**（构建产物） |
| `site-data.json` | 本地维护的菜单树与工具数据（JSON，项目核心数据源） |
| `build-html-data.js` | 读取 `site-data.json`、合并扩展、写出 `index.html` 与百科页 |
| `download-icons.mjs` | 根据 `site-data.json` 中的 `avatar` 下载图标，生成 `icons/manifest.json` |
| `nav-extensions.json` | **本地扩展分类**：在基础数据后追加多个大类及工具条目 |
| `category-order.json` | **可选**：一级分类与子分组顺序（见下文） |
| `daily-tools.json` | **可选**：替换「热门工具」条目为日常清单 |
| `free-tier-hints.json` | **可选**：按产品 `link` 填写免费档、额度、周期、新用户赠送等 |
| `icons/` | 本地化图标目录（可选） |

## 热门工具 · 日常向调整

默认「热门工具」来自上游包里的排序。若希望改成 **自用日常高频** 清单：

1. 编辑项目根目录 **`daily-tools.json`**（已提供示例：`mode: "replace-hot"` 会替换名为「热门工具」的分类）。
2. 执行 `node build-html-data.js`。
3. **恢复包内默认**：删除 `daily-tools.json` 或把 `mode` 改成非 `replace-hot`，再构建。

`items` 中可写 `title`、`subtitle`、`link`；可选 `avatar`（如 `icon/ChatGPT.png`）以便与已有 `icons/manifest.json` 对齐显示本地图标。

### 「热门」排序怎么定？

当前仓库内的「热门」**不是**实时排行榜：`daily-tools.json` 里 **`items` 数组顺序就是页面展示顺序**，完全由你本地维护。

建议的分层思路（**当前 `daily-tools.json` 已按此精简为 12 条**，可按团队习惯再改）：

1. **国内通用对话**：DeepSeek、豆包、Kimi、通义、文心（BAT+新锐，覆盖多数中文日常）。
2. **国际旗舰对话**：ChatGPT、Claude、Gemini、Grok。
3. **搜索 / 研究向**：Perplexity、秘塔（与纯聊天区分）。
4. **高频效率**：沉浸式翻译（读外网/论文极常用）。

已从热门里拿掉、避免首屏臃肿的：**Copilot**（与 ChatGPT/Edge 场景重叠）、**跃问 / MiMo / MiniMax 海螺**（垂类或账号门槛）、**Manus**（Agent 代表可留在下方「AI 聊天」等分类找）、**Notion AI**（笔记向，非通用对话）。需要时把对应条目从备份或上游分类抄回 `items` 即可。

若要 **数据驱动的真·热门**，需要自建统计（例如托管页用短链/分析、或仅团队内投票表），再把结果**手工写回** `items` 顺序；本仓库构建脚本不会自动拉取第三方 MAU。

## 分类顺序（侧边栏）

编辑 **`category-order.json`**（可选）：

- **`topLevel`**：字符串数组，按你想要的顺序列出**一级分类**。每一项填侧边栏上的**显示名称**（`name`），或扩展分类的 **`id`**（如 `ext-api-router`）。未出现在列表里的分类会**自动排在后面**，并保持它们之间的原有相对顺序。
- **`childrenOrder`**：对象，键为**一级分组名**（如 `"AI 办公工具"`），值为该组下**子分类**名称数组，用于调整「办公工具 → 幻灯片 / 思维导图 …」等顺序。

修改后执行 `node build-html-data.js`。删除 `category-order.json` 即恢复默认顺序（包内 + 扩展追加顺序）。

## 自定义扩展分类

编辑 **`nav-extensions.json`**，在 `categories` 数组中增加或修改对象：

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

- **`id`**：可选，用作页面锚点（会经脚本规范化），便于侧栏跳转。
- **`avatar`**：可选，指定本地图标路径（如 `icon/ChatGPT.png`）。

保存后执行：

```bash
node build-html-data.js
```

## 数据维护

所有工具数据存储在 **`site-data.json`** 中，可直接编辑：

- **新增工具**：在对应分类的 `tools` 数组中添加条目（需含 `title`、`link`，可选 `subtitle`、`avatar`）。
- **新增分类**：在 `menus` 数组中添加 `{ type: "leaf", name: "分类名", id: "slug", tools: [...] }`，或使用 `nav-extensions.json` 追加。
- **修改后**：执行 `node build-html-data.js` 重新生成页面。

也可以通过 `nav-extensions.json` 扩展（见上文），避免直接修改 `site-data.json`。

扩展区条目为人工维护链接，不保证第三方站点长期可用；请按需自行增删。

## 许可

[MIT License](https://github.com/shellsec/AINav/blob/main/LICENSE) — 仅覆盖本仓库中的脚本、配置与自建数据。所收录工具的名称、图标与链接归各自服务商所有，使用时请遵守目标网站服务条款。
