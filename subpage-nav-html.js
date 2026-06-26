/**
 * Shared subpage navigation HTML for encyclopedia, free-tier, etc.
 * Also exports sitemap URL list for build-html-data.js
 */
const SUBPAGE_NAV_LINKS = [
  { href: "index.html", zh: "← AINav 首页", en: "← AINav Home", match: ["index.html", ""] },
  { href: "free-tier.html", zh: "🆓 免费额度", en: "🆓 Free Tier", match: ["free-tier.html"] },
  { href: "token-optimization.html", zh: "Token优化", en: "Token Opt", match: ["token-optimization.html"] },
  { type: "sep" },
  { href: "model-plan.html", zh: "模型选型", en: "Models", match: ["model-plan.html"] },
  { href: "coding-plan.html", zh: "编程套餐", en: "Coding", match: ["coding-plan.html"] },
  { href: "agent-plan.html", zh: "Agent", en: "Agent", match: ["agent-plan.html"] },
  { href: "search-plan.html", zh: "搜索", en: "Search", match: ["search-plan.html"] },
  { href: "video-plan.html", zh: "视频", en: "Video", match: ["video-plan.html"] },
  { href: "image-plan.html", zh: "图像", en: "Image", match: ["image-plan.html"] },
  { href: "voice-plan.html", zh: "语音", en: "Voice", match: ["voice-plan.html"] },
  { href: "music-plan.html", zh: "音乐", en: "Music", match: ["music-plan.html"] },
  { href: "learning-plan.html", zh: "学习", en: "Learning", match: ["learning-plan.html"] },
  { href: "hardware-plan.html", zh: "硬件", en: "Hardware", match: ["hardware-plan.html"] },
  { href: "ai-factory-plan.html", zh: "AI造物", en: "AI Factory", match: ["ai-factory-plan.html"] },
  { type: "sep" },
  { href: "ai-roi/", zh: "AI技能落地", en: "AI Skills Audit", match: ["ai-roi/", "ai-roi/index.html"] },
  { href: "opc.html", zh: "一人公司", en: "OPC", match: ["opc.html", "opc-global.html", "opc-resources.html"] },
  { href: "skill-plan.html", zh: "Skill", en: "Skill", match: ["skill-plan.html"] },
  { href: "thinking-framework.html", zh: "AI第一思考", en: "Thinking", match: ["thinking-framework.html", "ask.html", "plan.html", "debug.html", "agent.html", "prompt-guide.html"] },
  { href: "ai-encyclopedia-2026.html", zh: "AI百科", en: "Encyclopedia", match: ["ai-encyclopedia-2026.html"] },
];

const SITEMAP_URLS = [
  { loc: "https://aiv123.com/", changefreq: "weekly", priority: "1.0" },
  { loc: "https://aiv123.com/free-tier.html", changefreq: "weekly", priority: "0.85" },
  { loc: "https://aiv123.com/ai-encyclopedia-2026.html", changefreq: "weekly", priority: "0.8" },
  { loc: "https://aiv123.com/ai-roi/", changefreq: "weekly", priority: "0.8" },
  { loc: "https://aiv123.com/skill-plan.html", changefreq: "monthly", priority: "0.75" },
  { loc: "https://aiv123.com/prompt-guide.html", changefreq: "monthly", priority: "0.65" },
  { loc: "https://aiv123.com/privacy.html", changefreq: "yearly", priority: "0.3" },
  { loc: "https://aiv123.com/model-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/coding-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/agent-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/search-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/video-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/image-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/voice-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/music-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/learning-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/hardware-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/ai-factory-plan.html", changefreq: "monthly", priority: "0.7" },
  { loc: "https://aiv123.com/plan.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/thinking-framework.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/token-optimization.html", changefreq: "monthly", priority: "0.72" },
  { loc: "https://aiv123.com/ask.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/debug.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/agent.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/opc.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/opc-global.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/opc-resources.html", changefreq: "monthly", priority: "0.6" },
  { loc: "https://aiv123.com/chrome/", changefreq: "monthly", priority: "0.7" },
];

function isActive(link, activePage) {
  if (!activePage || !link.match) return false;
  const page = activePage.replace(/^\//, "");
  return link.match.some((m) => page === m || page.endsWith("/" + m) || page.endsWith(m));
}

function buildSubpageNav(activePage, lang) {
  const useEn = lang === "en";
  return SUBPAGE_NAV_LINKS.map((item) => {
    if (item.type === "sep") return '<span class="subnav-sep">·</span>';
    const label = useEn ? item.en : item.zh;
    const active = isActive(item, activePage);
    const style = active ? ' style="color:var(--accent2);font-weight:700"' : "";
    return `<a href="${item.href}"${style}>${label}</a>`;
  }).join("\n        ");
}

function buildSitemapXml() {
  const body = SITEMAP_URLS.map(
    (u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

module.exports = { SUBPAGE_NAV_LINKS, SITEMAP_URLS, buildSubpageNav, buildSitemapXml, isActive };
