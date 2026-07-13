# AINav

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

English | **[中文](./README.zh-CN.md)**

## ☕ Buy Me a Coke

Open source takes effort — sponsorship is welcome:  
👉 [爱发电 / Afdian](https://ifdian.net/a/shellsec)

A local **AI tool navigator**: builds `index.html`, a free-tier dashboard, and an encyclopedia page from `site-data.json`. Extend categories via `nav-extensions.json` (API routers, MCP, RAG, local inference, etc.). Also includes comparison (`*-plan.html`) pages and an `ai-roi/` skills/ROI audit app.

## Requirements

- **Node.js** 18+ (`fetch` for `download-icons.mjs` / dead-link checks; `build-html-data.js` is CommonJS)

## Quick Start

```bash
# 1. Generate index.html, free-tier.html, encyclopedia, sitemap (+ sync plan-nav)
npm run build
# or: node build-html-data.js

# 2. (Optional) Download icons, then rebuild
npm run icons
npm run build
```

Open **`index.html`** in a browser. Header/footer link to free-tier, plan pages, and the encyclopedia.

## Commands

```bash
npm run build            # regenerate pages; sync plan-nav.js from nav-links.json
npm run icons            # download icons from avatar fields
npm run check            # link consistency + priority free-tier hints gate
npm run check:hints      # require free-tier-priority.json links to be in hints
npm run check:hints:all  # full hints coverage (exit 1 if any missing)
npm run check:links      # static audit: site vs extensions, placeholder URLs
npm run check:dead       # HTTP probe hot + priority links (add --ext for extensions)
```

CI (`.github/workflows/ci.yml`) on push/PR runs: `build` → `audit-links` → `check:hints` → `check:dead` (`check:dead` is `continue-on-error` to avoid flaky network failures).

## Page Features (Pure Frontend)

### Home — `index.html`

- **Favorites**: star on each card; top “常用收藏” block + sidebar anchor. Stored in `localStorage` (`ainav-favorites-v1`); import/export supported.
- **Compare basket**: “⇄” on cards (max **4**, key `ainav-compare-v1`); bottom dock opens a small compare table and links to Coding / Agent / Model plan pages.
- **Scenario filters**: Chat / Coding / Search / Image / Video / China / Intl / Agent·RAG (combinable with search).
- **Pricing / region badges**: if a tool `link` matches `free-tier-hints.json`, the card shows free-tier level and a China/Intl tag; links to `free-tier.html?q=…`.
- **Hot tools freshness**: `daily-tools.json` `asOf` renders as “model info as of YYYY-MM-DD”.
- **Theme**: light / dark / system (`ainav-theme`).
- **ZH / EN UI**: toolbar toggle (`ainav-lang`); tool copy may use `i18n-en.json`.
- **Search shortcuts**: `/` or `Ctrl+K` (⌘K on Mac).
- **Top plan bar**: generated from `nav-links.json` (same source as subpage nav).
- **Build timestamp**: footer shows last `npm run build` time.

### Free tier — `free-tier.html`

- Deduped products from the menu tree; search + filters by level / category / **verified vs inferred**.
- **Verified** rows come from hand-maintained `free-tier-hints.json`; others are rule-inferred (trust banner on page).
- List prefers verified entries first. Always defer to official pricing.

### Other surfaces (selected)

| Page | Role |
|------|------|
| `ai-encyclopedia-2026.html` | Long encyclopedia table (from Markdown source) |
| `*-plan.html` / `token-optimization.html` | Model / coding / agent / media comparisons (`plan-nav.js`) |
| `opc.html` etc. | One-person company guides |
| `thinking-framework.html` + ask/plan/debug/agent | “AI-first thinking” framework |
| `ai-roi/` | Skills landing checklist & ROI (standalone) |

## Key Files

| File | Description |
|------|-------------|
| `index.html` / `free-tier.html` / `ai-encyclopedia-2026.html` | Build outputs (open directly) |
| `site-data.json` | Core menu tree & tools |
| `build-html-data.js` | Merge configs → HTML + `sitemap.xml` |
| `nav-links.json` | **Single source** for subpage nav, home plan bar, plan-nav, sitemap |
| `plan-nav.js` | Plan-page top nav (LINKS synced from `nav-links.json` on build) |
| `subpage-nav-html.js` | Build-time nav HTML / sitemap / plan-nav sync |
| `nav-extensions.json` | Extra categories (may merge into existing leaves) |
| `category-order.json` | Optional top-level & child order |
| `daily-tools.json` | Optional “热门工具” replacement; optional `asOf` |
| `append-leaf-tools.json` | Optional append tools under group/leaf |
| `free-tier-hints.json` | Manual free-tier notes keyed by product `link` |
| `free-tier-priority.json` | Priority links that `check:hints` / CI must cover |
| `free-tier-infer.js` | Inference when no manual hint |
| `i18n-en.json` | English titles/descriptions |
| `download-icons.mjs` / `icons/` | Icon download & local assets |
| `docs/DATA-SOURCES.md` | Dual data sources & merge notes |
| `docs/update-cadence.md` | Suggested content update cadence |
| `ai-roi/` | Skills / ROI audit app |
| `.github/workflows/ci.yml` | Build & check pipeline |

## Navigation (edit once)

Cross-page nav lives in **`nav-links.json`**:

1. Edit `links` (and optional `sitemap`).
2. Run `npm run build`.
3. Build updates subpage nav, home plan bar, `plan-nav.js` `LINKS`, and `sitemap.xml`.

Useful fields: `href` / `zh` / `en` / `match`; `nav` includes `sub` | `plan` | `home`; home groups use `homeGroup` (`highlight` | `compare` | `landing` | `method`).

## Custom “Hot Tools”

1. Edit **`daily-tools.json`** (`mode: "replace-hot"` replaces the “热门工具” section).
2. Set **`asOf": "YYYY-MM-DD"`** so the home section shows freshness.
3. `npm run build`. Restore defaults by deleting the file or changing `mode`.

Item fields: `title`, `subtitle`, `link`, optional `avatar`. Order of `items` is display order (not a live ranking).

## Free-tier maintenance

1. Add entries to **`free-tier-hints.json`** keyed by product `link` (`freeLevel`, `quota`, `dailyCycle`, `firstBonus`, `note`, `updated`).
2. Keep must-verify products in **`free-tier-priority.json`** (usually hot tools + flagships).
3. Pass `npm run check:hints`, then `npm run build`.

Missing hints are inferred and labeled “inferred”. Full coverage: `npm run check:hints:all` (not required by default CI gate).

## Category Order (Sidebar)

Edit **`category-order.json`**:

- **`topLevel`**: preferred order of category `name`s or extension `id`s; unlisted keep relative order at the end.
- **`childrenOrder`**: map parent group name → child name array.

Then `npm run build`.

## Extension Categories

Edit **`nav-extensions.json`** `categories`:

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

- **`id`**: optional anchor (normalized).
- **`avatar`**: optional local icon path.

If `name`/`id` matches an existing leaf, tools are **merged** into it. Then `npm run build`.

## Data Maintenance

- **Add a tool**: `site-data.json` `tools` (`title` + `link`; optional `subtitle`, `avatar`), or use `nav-extensions.json` / `append-leaf-tools.json`.
- **Add a category**: leaf/group under `menus`, or extensions JSON.
- **After edits**: always `npm run build`.
- Periodically run `npm run check:dead` on hot/priority links.

See [`docs/update-cadence.md`](./docs/update-cadence.md) and [`docs/DATA-SOURCES.md`](./docs/DATA-SOURCES.md).

## License

[GPLv3](https://www.gnu.org/licenses/gpl-3.0) — covers scripts, configs, and self-built data in this repository only. Derivative works must also be open-sourced under GPLv3. Product names, icons, and links belong to their respective owners.
