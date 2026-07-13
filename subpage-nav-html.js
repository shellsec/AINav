/**
 * Shared subpage navigation HTML for encyclopedia, free-tier, etc.
 * Data source: nav-links.json (single source of truth with plan-nav.js).
 */
const fs = require("fs");
const path = require("path");

const NAV_LINKS_PATH = path.join(__dirname, "nav-links.json");

function loadNavData() {
  const raw = JSON.parse(fs.readFileSync(NAV_LINKS_PATH, "utf8"));
  return {
    links: Array.isArray(raw.links) ? raw.links : [],
    sitemap: Array.isArray(raw.sitemap) ? raw.sitemap : [],
  };
}

function getSubpageNavLinks() {
  return loadNavData().links.filter((item) => {
    if (item.type === "sep") return (item.nav || ["sub"]).includes("sub");
    return (item.nav || ["sub", "plan"]).includes("sub");
  });
}

function getPlanNavLinks() {
  return loadNavData()
    .links.filter((item) => item.type !== "sep" && (item.nav || ["sub", "plan"]).includes("plan"))
    .map((item) => ({
      href: item.href,
      zh: item.zh,
      en: item.en,
      match: item.match || [item.href],
    }));
}

function getHomeTopPlanLinks() {
  return loadNavData().links.filter(
    (item) => item.type !== "sep" && (item.nav || []).includes("home") && item.homeGroup
  );
}

function isActive(link, activePage) {
  if (!activePage || !link.match) return false;
  const page = activePage.replace(/^\//, "");
  return link.match.some((m) => page === m || page.endsWith("/" + m) || page.endsWith(m));
}

function buildSubpageNav(activePage, lang) {
  const useEn = lang === "en";
  return getSubpageNavLinks()
    .map((item) => {
      if (item.type === "sep") return '<span class="subnav-sep">·</span>';
      const label = useEn ? item.en : item.zh;
      const active = isActive(item, activePage);
      const style = active ? ' style="color:var(--accent2);font-weight:700"' : "";
      return `<a href="${item.href}"${style}>${label}</a>`;
    })
    .join("\n        ");
}

function buildHomeTopPlansHtml(esc) {
  const escape =
    typeof esc === "function"
      ? esc
      : (s) =>
          String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

  const items = getHomeTopPlanLinks();
  const byGroup = { highlight: [], compare: [], landing: [], method: [] };
  for (const item of items) {
    if (byGroup[item.homeGroup]) byGroup[item.homeGroup].push(item);
  }

  function renderLink(item, opts) {
    const zh = item.homeZh || item.zh;
    const title = item.homeTitle || zh;
    const highlight = opts && opts.highlight;
    const i18n = item.homeI18n
      ? ` data-i18n="${escape(item.homeI18n)}" data-i18n-title="${escape(item.homeI18n)}Title"`
      : "";
    const style = highlight ? ' style="color:var(--accent2);font-weight:600"' : "";
    const breakAfter = item.homeBreakAfter ? '\n      <span class="top-plans-break"></span>' : "";
    return `<a href="${escape(item.href)}" title="${escape(title)}"${i18n}${style}>${escape(zh)}</a>${breakAfter}`;
  }

  const parts = [];
  for (const item of byGroup.highlight) parts.push(renderLink(item, { highlight: true }));
  if (byGroup.compare.length) {
    parts.push('<span class="top-plans-label">📊 横评</span>');
    for (const item of byGroup.compare) parts.push(renderLink(item));
  }
  if (byGroup.landing.length) {
    parts.push('<span class="top-plans-label">📋 落地</span>');
    for (const item of byGroup.landing) parts.push(renderLink(item));
  }
  if (byGroup.method.length) {
    parts.push('<span class="top-plans-label">🧠 方法论</span>');
    for (const item of byGroup.method) parts.push(renderLink(item));
  }
  return parts.join("\n      ");
}

function buildSitemapXml() {
  const { sitemap } = loadNavData();
  const body = sitemap
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Rewrite plan-nav.js LINKS from nav-links.json so file:// pages stay self-contained. */
function syncPlanNavJs() {
  const planNavPath = path.join(__dirname, "plan-nav.js");
  let src = fs.readFileSync(planNavPath, "utf8");
  const links = getPlanNavLinks();
  const body = links
    .map((item) => {
      const match = JSON.stringify(item.match);
      return `    { href: ${JSON.stringify(item.href)}, zh: ${JSON.stringify(item.zh)}, en: ${JSON.stringify(item.en)}, match: ${match} }`;
    })
    .join(",\n");
  const next = src.replace(/var LINKS = \[[\s\S]*?\];/, `var LINKS = [\n${body}\n  ];`);
  if (!/var LINKS = \[/.test(src)) {
    console.warn("syncPlanNavJs: LINKS block not found in plan-nav.js");
    return false;
  }
  if (next !== src) fs.writeFileSync(planNavPath, next, "utf8");
  console.log("synced plan-nav.js from nav-links.json (", links.length, "links)");
  return true;
}

module.exports = {
  SUBPAGE_NAV_LINKS: null, // lazy; prefer getters
  SITEMAP_URLS: null,
  loadNavData,
  getSubpageNavLinks,
  getPlanNavLinks,
  getHomeTopPlanLinks,
  buildSubpageNav,
  buildHomeTopPlansHtml,
  buildSitemapXml,
  syncPlanNavJs,
  isActive,
};

// Keep backward-compatible enumerable snapshots
Object.defineProperty(module.exports, "SUBPAGE_NAV_LINKS", {
  get: getSubpageNavLinks,
  enumerable: true,
});
Object.defineProperty(module.exports, "SITEMAP_URLS", {
  get() {
    return loadNavData().sitemap;
  },
  enumerable: true,
});
