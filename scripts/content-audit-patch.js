/**
 * Full content audit patches for *-plan.html (2026-06-26)
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const MEDIA_PLANS = [
  "video-plan.html",
  "image-plan.html",
  "voice-plan.html",
  "music-plan.html",
  "learning-plan.html",
  "search-plan.html",
];

function fixI18nFooter(html) {
  return html
    .replace(
      /if\s*\(fp\[0\]\)\s*fp\[0\]\.textContent\s*=\s*dict\.footer/g,
      "if (fp[1]) fp[1].textContent = dict.footer"
    )
    .replace(
      /var fp=document\.querySelectorAll\('\.cp-footer p'\);if\(fp\[0\]\)fp\[0\]\.textContent=dict\.footer/g,
      "var fp=document.querySelectorAll('.cp-footer p');if(fp[1])fp[1].textContent=dict.footer"
    );
}

function addSubtitleUpdated(html, extra) {
  if (html.includes('class="cp-updated-line"') && html.match(/cp-subtitle[\s\S]{0,400}cp-updated-line/)) {
    return html;
  }
  const extraLink = extra ? " · " + extra : "";
  const block =
    '<p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26</span>' +
    extraLink +
    "</p>\n    ";
  return html.replace(
    /(<p class="cp-subtitle"[^>]*>[\s\S]*?<\/p>\s*)/,
    "$1\n    " + block
  );
}

function patchVideo(s) {
  s = addSubtitleUpdated(s, '<a href="image-plan.html">图像套餐横评</a>');
  s = s.replace(/Sora 将于 2026年4月26日停服/g, "Sora 已于 2026年4月26日停服");
  s = s.replace(/⚠️ 4\/26停服/g, "⚠️ 已停服");
  s = s.replace(
    /<tr><td class="plan-name">ChatGPT Plus<\/td><td class="plan-price">\$20\/月<\/td><td>含 Sora 额度<\/td><td class="plan-limit">~50个5s视频<\/td><\/tr>\s*<tr><td class="plan-name">ChatGPT Pro<\/td><td class="plan-price">\$200\/月<\/td><td>更多 Sora 额度<\/td><td class="plan-limit">无限\(排队\)<\/td><\/tr>/,
    '<tr><td class="plan-name" colspan="4" style="color:var(--muted)">已停服（2026-04-26）— 历史曾随 ChatGPT Plus/Pro 提供，勿新购</td></tr>'
  );
  s = s.replace(/Sora 将于 4\/26 停服/g, "Sora 已于 4/26 停服");
  s = s.replace(/数据截至2026年4月/g, "数据截至2026-06-26");
  s = s.replace(/Seedance 2\.0 特色/g, "Seedance 2.0+ 视频模块特色");
  s = s.replace(
    /<tr><td>🥉<\/td><td class="plan-name">即梦Seedance<\/td><td>Pro<\/td><td class="plan-price">¥99<\/td><td>~1,200<\/td>/,
    '<tr><td>🥉</td><td class="plan-name">即梦Seedance</td><td>Pro</td><td class="plan-price">¥239</td><td>~300</td>'
  );
  s = s.replace(
    /<tr><td>4<\/td><td class="plan-name">海螺AI<\/td><td>Pro<\/td><td class="plan-price">¥99<\/td><td>~900<\/td>/,
    '<tr><td>4</td><td class="plan-name">海螺AI</td><td>国际付费</td><td class="plan-price">$9.99起</td><td>~600</td>'
  );
  s = s.replace(
    /<tr><td>5<\/td><td class="plan-name">Vidu<\/td><td>Pro<\/td><td class="plan-price">¥99<\/td><td>~800<\/td>/,
    '<tr><td>5</td><td class="plan-name">Vidu</td><td>专业版</td><td class="plan-price">¥238</td><td>~300</td>'
  );
  s = s.replace(
    /<div class="cp-bar-row"><span class="cp-bar-label">ChatGPT\+<\/span><div class="cp-bar-track"><div class="cp-bar-fill bar-overseas" style="width:27%">\$20\(Sora\)<\/div><\/div><\/div>/,
    '<div class="cp-bar-row"><span class="cp-bar-label">可灵Pro</span><div class="cp-bar-track"><div class="cp-bar-fill bar-domestic" style="width:27%">¥238/月</div></div></div>'
  );
  return s;
}

function patchImage(s) {
  s = addSubtitleUpdated(s, '<a href="video-plan.html">视频套餐横评</a>');
  s = s.replace(
    /DALL-E 3（ChatGPT）/g,
    "GPT Image（ChatGPT）"
  );
  s = s.replace(
    /<a href="https:\/\/openai\.com\/dall-e-3"/g,
    '<a href="https://openai.com/index/image-generation-api/"'
  );
  s = s.replace(/DALL-E 3 基础/g, "GPT Image 基础额度");
  s = s.replace(/更多DALL-E额度/g, "更多 GPT Image 额度");
  s = s.replace(/无限DALL-E/g, "GPT Image 高配额");
  s = s.replace(/数据截至2026年4月/g, "数据截至2026-06-26");
  s = s.replace(
    /<tr><td>5<\/td><td class="plan-name">Ideogram<\/td><td>Plus<\/td><td class="plan-price">\$20<\/td><td>~4,000<\/td>/,
    '<tr><td>5</td><td class="plan-name">Ideogram</td><td>Plus</td><td class="plan-price">$20</td><td>~1,000</td>'
  );
  s = s.replace(
    /DALL-E 3 强在理解力，Midjourney 强在美感。<\/strong>DALL-E 3 通过ChatGPT Plus/g,
    "GPT Image 强在理解力，Midjourney 强在美感。</strong>GPT Image 通过 ChatGPT Plus"
  );
  return s;
}

function patchVoice(s) {
  s = addSubtitleUpdated(s, "");
  s = s.replace(
    /<tr><td>🥉<\/td><td class="plan-name">讯飞<\/td><td>专业版<\/td><td class="plan-price">¥29<\/td><td>~400万<\/td>/,
    '<tr><td>🥉</td><td class="plan-name">讯飞</td><td>专业版</td><td class="plan-price">¥29</td><td>~200万</td>'
  );
  s = s.replace(
    /<tr><td>5<\/td><td class="plan-name">ElevenLabs<\/td><td>Creator<\/td><td class="plan-price">\$22<\/td><td>100万<\/td>/,
    '<tr><td>5</td><td class="plan-name">ElevenLabs</td><td>Creator</td><td class="plan-price">$22</td><td>10万</td>'
  );
  s = s.replace(/138万/g, "69万");
  s = s.replace(/~6\.5万/g, "~0.65万/美元");
  return s;
}

function patchSearch(s) {
  s = addSubtitleUpdated(s, "");
  s = s.replace(
    /<tr><td class="plan-name">PRO <span class="cp-badge badge-rec">👍<\/span><\/td><td class="plan-price">\$20\/月<\/td><td>600次Pro\/日<\/td><td>GPT-5\/Claude\/Gemini<\/td><\/tr>/,
    '<tr><td class="plan-name">PRO <span class="cp-badge badge-rec">👍</span></td><td class="plan-price">$20/月</td><td>约300+ Pro搜索/日</td><td>GPT-5 / Claude Opus 4.8 / Gemini 3.1 Pro</td></tr>'
  );
  s = s.replace(
    /<tr><td class="plan-name">Free<\/td><td class="plan-price">\$0<\/td><td>有限搜索<\/td><td>GPT-4\.1 mini \/ Sonar<\/td><\/tr>/,
    '<tr><td class="plan-name">Free</td><td class="plan-price">$0</td><td>有限搜索</td><td>GPT-4.1 mini</td></tr>'
  );
  s = s.replace(/无限搜索\+Grok3/g, "无限搜索+Grok 4");
  s = s.replace(
    /<tr><td>4<\/td><td class="plan-name">Perplexity<\/td><td>Pro<\/td><td class="plan-price">\$20<\/td><td>~900<\/td>/,
    '<tr><td>4</td><td class="plan-name">Perplexity</td><td>Pro</td><td class="plan-price">$20</td><td>~9,000</td>'
  );
  return s;
}

function patchLearning(s) {
  s = addSubtitleUpdated(s, "");
  s = s.replace(
    /<tr><td>🥇<\/td><td class="plan-name">Khan Academy<\/td><td>免费版<\/td><td class="plan-price">¥0<\/td><td>∞<\/td>/,
    '<tr><td>🥇</td><td class="plan-name">Khan Academy</td><td>免费课</td><td class="plan-price">¥0</td><td>基础课</td>'
  );
  s = s.replace(
    /<tr><td>🥈<\/td><td class="plan-name">Duolingo<\/td><td>免费版<\/td><td class="plan-price">¥0<\/td><td>∞<\/td>/,
    '<tr><td>🥈</td><td class="plan-name">Duolingo</td><td>免费版</td><td class="plan-price">¥0</td><td>无 Max AI</td>'
  );
  return s;
}

function patchMusic(s) {
  return addSubtitleUpdated(s, "");
}

function patchCoding(s) {
  s = s.replace(
    /sectionTrend: '📉 Token 价格趋势：3 年降 1000 倍,/,
    "sectionTrend: '📉 Token 价格趋势：3 年降 1000 倍',"
  );
  s = s.replace(/🆕 新品\?/g, "🆕 新品");
  s = s.replace(/套餐兼容性排名\?/g, "编程工具 × Coding Plan 兼容矩阵");
  s = s.replace(/badge-new" style="font-size:0\.6rem">\?<\/span>/g, 'badge-new" style="font-size:0.6rem">阿里</span>');
  s = s.replace(/约30-45小时\/月/g, "约 30–45 分钟/天");
  s = s.replace(
    /rel="noopener noreferrer">GLM-5<\/a>, <a href="https:\/\/www\.kimi\.com\/"/g,
    'rel="noopener noreferrer">GLM-5.2</a>, <a href="https://www.kimi.com/"'
  );
  s = s.replace(
    /<td class="plan-models"><a href="https:\/\/cloud\.google\.com\/gemini"[^>]*>Gemini 2\.5 Pro<\/a> \+ DeepThink<\/td>/,
    '<td class="plan-models"><a href="https://cloud.google.com/gemini" target="_blank" rel="noopener noreferrer">Gemini 3.1 Pro</a> + DeepThink</td>'
  );
  s = s.replace(
    /<td class="plan-models"><a href="https:\/\/cloud\.google\.com\/gemini"[^>]*>Gemini 2\.5 Pro<\/a> ~\$1\.25\/\$10/,
    '<td class="plan-models"><a href="https://cloud.google.com/gemini" target="_blank" rel="noopener noreferrer">Gemini 3.1 Pro</a> ~$1.25/$10'
  );
  s = s.replace(
    /if \(footerPs\[0\]\) footerPs\[0\]\.textContent = dict\.footer;\s*if \(footerPs\[1\]\) footerPs\[1\]\.innerHTML/,
    "if (footerPs[1]) footerPs[1].textContent = dict.footer;\n        if (footerPs[2]) footerPs[2].innerHTML"
  );
  s = s.replace(
    /<p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26<\/span><\/p>\s*<p>数据来源各平台官网/,
    "<p>数据来源各平台官网"
  );
  return s;
}

function patchAgent(s) {
  s = s.replace(/Kimi K2\.5 模型/g, "Kimi K2.6 模型");
  s = s.replace(/<td>GLM-4<\/td>/g, "<td>GLM-5.2</td>");
  s = s.replace(/<td>~1,500<\/td>/g, "<td>Agent 池</td>");
  s = s.replace(
    /<div class="cp-faq-q">Devin\/Codex 值得 \$500\/月吗？/,
    '<div class="cp-faq-q">Devin 值得 $500/月吗？'
  );
  s = s.replace(
    /Devin\/Codex 定位是"AI软件工程师"，能独立完成整个任务。但 \$500\/月的价格是 Cursor Pro \$20 的 25 倍。/,
    'Devin 定位是全自主 AI 软件工程师，$500/月约为 Cursor Pro $20 的 25 倍。Codex（ChatGPT Pro $200/月）是另一档产品。'
  );
  s = s.replace(
    /subtitle: '国内外 AI Coding Agent 一站式对比：功能、价格、兼容性、场景推荐，帮你找到最适合的 AI 编程智能体。'/,
    "subtitle: '国内外 AI Coding Agent 一站式对比：2026 年开源首选 Hermes，模型底座推荐 GLM-5.2 / DeepSeek-V4-Pro / Claude Opus 4.8。'"
  );
  s = s.replace(
    /<p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26<\/span><\/p>\s*<p>数据来源/,
    "<p>数据来源"
  );
  return s;
}

function patchModel(s) {
  s = s.replace(/Gemini Pro；含技术亮点/g, "Gemini 3.1 Pro；含技术亮点");
  s = s.replace(
    /<p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26<\/span><\/p>\s*<p>数据来源：各模型官方/,
    "<p>数据来源：各模型官方"
  );
  return s;
}

function patchHardware(s) {
  s = s.replace(/盘古大模型\+Celia/g, "盘古大模型+小艺");
  s = s.replace(/<tr><td>XREAL Air 2<\/td>/g, "<tr><td>XREAL Air 2 Ultra</td>");
  s = s.replace(
    /AI：Cocreator文生图、Recall时间回溯、Live Captions实时字幕/,
    "AI：Cocreator 文生图、Live Captions 实时字幕、Click to Do（视地区）"
  );
  s = s.replace(/<span class="hw-spec s-good">Recall<\/span>/g, '<span class="hw-spec s-good">Click to Do</span>');
  s = s.replace(
    /<td class="plan-price">¥9,999起<\/td><\/div>\s*<div class="hw-card-body"><ul><li><strong>AI：<\/strong>Apple Intelligence/,
    '<td class="hw-card-price">¥9,999起（预估）</td></div>\n  <div class="hw-card-body"><ul><li><strong>AI：</strong>Apple Intelligence'
  );
  s = s.replace(
    /<p><a href="index\.html">← 返回 AINav 首页<\/a> · <a href="free-tier\.html">🆓 免费额度<\/a> · <a href="token-optimization\.html">Token优化<\/a> · <a href="coding-plan\.html">编程套餐横评<\/a> · <a href="agent-plan\.html">Agent横评<\/a> · <a href="model-plan\.html">模型选型<\/a><\/p>/,
    '<p><a href="index.html">← 返回 AINav 首页</a> · <a href="free-tier.html">🆓 免费额度</a> · <a href="token-optimization.html">Token优化</a> · <a href="coding-plan.html">编程套餐横评</a> · <a href="agent-plan.html">Agent横评</a> · <a href="model-plan.html">模型选型</a> · <a href="ai-factory-plan.html">AI造物</a> · <a href="image-plan.html">图像套餐横评</a> · <a href="video-plan.html">视频套餐横评</a></p>'
  );
  return s;
}

function patchAiFactory(s) {
  s = s.replace(/localStorage\.setItem\('theme'/g, "localStorage.setItem('ainav-theme'");
  s = s.replace(/localStorage\.getItem\('theme'/g, "localStorage.getItem('ainav-theme'");
  s = s.replace(
    /<a href="https:\/\/flux1\.ai\/" target="_blank" rel="noopener noreferrer">FLUX\.1<\/a>/,
    '<a href="https://blackforestlabs.ai/" target="_blank" rel="noopener noreferrer">FLUX.1（BFL）</a>'
  );
  s = s.replace(
    /每环工具、成本、案例均为实测/,
    "工具与流程经实测；价格以官网为准"
  );
  s = s.replace(
    /<div class="cp-footer">\s*<p>数据来源：各工具官网/,
    '<div class="cp-footer">\n  <p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26</span></p>\n  <p>数据来源：各工具官网'
  );
  s = s.replace(
    /<p><a href="index\.html">← 返回 AINav 首页<\/a> · <a href="free-tier\.html">🆓 免费额度<\/a> · <a href="token-optimization\.html">Token优化<\/a> · <a href="thinking-framework\.html">AI第一思考<\/a><\/p>/,
    '<p><a href="index.html">← 返回 AINav 首页</a> · <a href="free-tier.html">🆓 免费额度</a> · <a href="token-optimization.html">Token优化</a> · <a href="hardware-plan.html">硬件横评</a> · <a href="image-plan.html">图像套餐横评</a> · <a href="video-plan.html">视频套餐横评</a> · <a href="coding-plan.html">编程套餐横评</a> · <a href="thinking-framework.html">AI第一思考</a></p>'
  );
  return s;
}

// Apply media plans
for (const f of MEDIA_PLANS) {
  let s = fs.readFileSync(path.join(ROOT, f), "utf8");
  s = fixI18nFooter(s);
  if (f === "video-plan.html") s = patchVideo(s);
  if (f === "image-plan.html") s = patchImage(s);
  if (f === "voice-plan.html") s = patchVoice(s);
  if (f === "search-plan.html") s = patchSearch(s);
  if (f === "learning-plan.html") s = patchLearning(s);
  if (f === "music-plan.html") s = patchMusic(s);
  fs.writeFileSync(path.join(ROOT, f), s);
  console.log("patched", f);
}

// Core plans
let coding = fs.readFileSync(path.join(ROOT, "coding-plan.html"), "utf8");
coding = patchCoding(coding);
fs.writeFileSync(path.join(ROOT, "coding-plan.html"), coding);
console.log("patched coding-plan.html");

let agent = fs.readFileSync(path.join(ROOT, "agent-plan.html"), "utf8");
agent = fixI18nFooter(agent);
agent = patchAgent(agent);
fs.writeFileSync(path.join(ROOT, "agent-plan.html"), agent);
console.log("patched agent-plan.html");

let model = fs.readFileSync(path.join(ROOT, "model-plan.html"), "utf8");
model = patchModel(model);
fs.writeFileSync(path.join(ROOT, "model-plan.html"), model);
console.log("patched model-plan.html");

let hw = fs.readFileSync(path.join(ROOT, "hardware-plan.html"), "utf8");
hw = patchHardware(hw);
fs.writeFileSync(path.join(ROOT, "hardware-plan.html"), hw);
console.log("patched hardware-plan.html");

let factory = fs.readFileSync(path.join(ROOT, "ai-factory-plan.html"), "utf8");
factory = patchAiFactory(factory);
fs.writeFileSync(path.join(ROOT, "ai-factory-plan.html"), factory);
console.log("patched ai-factory-plan.html");

// plan-meta ai-factory
const metaPath = path.join(ROOT, "plan-meta-i18n.js");
let meta = fs.readFileSync(metaPath, "utf8");
meta = meta.replace(
  /"ai-factory-plan\.html":\s*\{\s*zh:\s*\{[^}]+\},\s*en:\s*\{[^}]+\}/,
  `"ai-factory-plan.html": {
      zh: { h1: "🏭 AI 造物计划", sub: "10x / 100x / 1000x 三档造物路径：设计→打样→上架，工具与成本实测。" },
      en: { h1: "🏭 AI Factory Plan", sub: "10x / 100x / 1000x paths from design to listing — tools and costs verified." },
    }`
);
fs.writeFileSync(metaPath, meta);
console.log("patched plan-meta-i18n.js (ai-factory)");
