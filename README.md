# AINav

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

English | **[中文](./README.zh-CN.md)**

## ☕ Buy Me a Coke

Open source takes effort — sponsorship is welcome:  
👉 [爱发电 / Afdian](https://ifdian.net/a/shellsec)

A local **AI Tool Navigator** — generates `index.html` and an encyclopedia page from `site-data.json` (locally maintained categories & tools). Extend with `nav-extensions.json` for additional categories (API aggregators, MCP, RAG, local inference, etc.).

## Requirements

- **Node.js** 18+ (`fetch` support for `download-icons.mjs`; `build-html-data.js` uses CommonJS)

## Quick Start

```bash
# 1. Generate index.html and encyclopedia page
node build-html-data.js

# 2. (Optional) Download icons to ./icons/, then rebuild to use local icons
node download-icons.mjs
node build-html-data.js
```

Open **`index.html`** in your browser. The footer links to the **AI Tools Encyclopedia** page.

## Page Features (Pure Frontend)

- **Favorites**: Star any tool card; favorites appear at the top under "常用收藏" with a sidebar anchor. Saved in `localStorage` (`ainav-favorites-v1`). Import/export supported.
- **Light / Dark / System theme**: Toggle in the header. Stored in `localStorage` (`ainav-theme`: `light` | `dark` | `system`). System mode follows `prefers-color-scheme`.
- **Chinese / English switching**: Click `中` / `EN` buttons in the toolbar to switch UI text and category names. Tool card descriptions remain in their original language. Preference saved in `localStorage` (`ainav-lang`).
- **Search shortcuts**: Press `/` or `Ctrl+K` (⌘K on Mac) to focus the search box.
- **GitHub link**: A GitHub icon in the toolbar links to the repo.
- **Back to top**: A floating button appears on scroll for quick navigation back.
- **Build timestamp**: Shown in the footer after each `node build-html-data.js` run.
- **Free-tier reference**: The encyclopedia page lists all products with free-tier info from `free-tier-hints.json` (manually maintained). Unlisted entries show "未标注" — always refer to official pricing.

## Key Files

| File | Description |
|------|-------------|
| `index.html` | Navigator page (build output, open directly) |
| `ai-encyclopedia-2026.html` | **AI Tools Encyclopedia** (build output) |
| `site-data.json` | Locally maintained menu tree & tool data (core data source) |
| `build-html-data.js` | Reads `site-data.json`, merges extensions, outputs HTML pages |
| `download-icons.mjs` | Downloads icons from `avatar` fields, generates `icons/manifest.json` |
| `nav-extensions.json` | **Extension categories**: append custom sections & tools |
| `category-order.json` | **Optional**: top-level & sub-category ordering |
| `daily-tools.json` | **Optional**: replace "热门工具" with your own picks |
| `free-tier-hints.json` | **Optional**: free-tier info per product |
| `icons/` | Local icon directory (optional) |

## Custom "Hot Tools" (Daily Picks)

Edit **`daily-tools.json`** to replace the default "热门工具" section with your own frequently-used list:

1. Edit `daily-tools.json` (set `mode: "replace-hot"` to replace the default).
2. Run `node build-html-data.js`.
3. **Restore defaults**: Delete `daily-tools.json` or change `mode` to something other than `replace-hot`, then rebuild.

Each item in `items` can include `title`, `subtitle`, `link`, and optionally `avatar` (e.g. `icon/ChatGPT.png`).

## Category Order (Sidebar)

Edit **`category-order.json`** (optional):

- **`topLevel`**: String array of top-level category names or extension `id`s in your preferred order. Unlisted categories appear after, in their original order.
- **`childrenOrder`**: Object mapping a parent group name to an array of child category names for ordering.

Run `node build-html-data.js` after changes. Delete the file to restore default order.

## Extension Categories

Edit **`nav-extensions.json`**, add objects to the `categories` array:

```json
{
  "id": "my-section",
  "name": "My Category",
  "tools": [
    {
      "title": "Product Name",
      "subtitle": "One-line description",
      "link": "https://example.com/"
    }
  ]
}
```

- **`id`**: Optional, used as page anchor (normalized by the script).
- **`avatar`**: Optional, local icon path (e.g. `icon/ChatGPT.png`).

Then run:

```bash
node build-html-data.js
```

## Data Maintenance

All tool data lives in **`site-data.json`** — edit directly:

- **Add a tool**: Append to the `tools` array of the target category (requires `title` and `link`; optional `subtitle`, `avatar`).
- **Add a category**: Append `{ type: "leaf", name: "Category", id: "slug", tools: [...] }` to `menus`, or use `nav-extensions.json`.
- **After changes**: Run `node build-html-data.js` to regenerate pages.

Alternatively, use `nav-extensions.json` to avoid modifying `site-data.json` directly.

Extension entries are manually maintained links; third-party sites may become unavailable over time.

## License

[GPLv3](https://www.gnu.org/licenses/gpl-3.0) — covers scripts, configs, and self-built data in this repository only. Derivative works must also be open-sourced under GPLv3. Product names, icons, and links belong to their respective owners.
