// Batch patch *-plan.html: nav placeholders, dates, coding-plan corruption, stale model names.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const PLAN_FILES = [
  "coding-plan.html",
  "agent-plan.html",
  "model-plan.html",
  "video-plan.html",
  "image-plan.html",
  "voice-plan.html",
  "music-plan.html",
  "learning-plan.html",
  "search-plan.html",
  "hardware-plan.html",
  "ai-factory-plan.html",
];

function clearPlanNav(html) {
  return html.replace(
    /<(div|nav) class="cp-nav" data-plan-nav>[\s\S]*?<\/\1>/g,
    '<div class="cp-nav" data-plan-nav></div>'
  );
}

function patchCodingPlan(s) {
  const reps = [
    [/首月¥7\.9 . Lite尝鲜价/g, "首月¥7.9 · Lite尝鲜价"],
    [/秒杀¥39\.9/g, "秒杀¥39.9 ·"],
    [
      /\?\?¥39\.9 . <span class="cp-rush-time">⏰ 每日9:30开抢\?<\/span>/g,
      '秒杀¥39.9 · <span class="cp-rush-time">⏰ 每日9:30开抢</span>',
    ],
    [/<!-- 9\. \?\? -->/g, "<!-- 9. 小米 MiMo -->"],
    [/\/cp-platforms \(\?\?\)/g, "/cp-platforms (国内)"],
    [/<span class="cp-badge badge-rec" style="font-size:0\.6rem">\?\?<\/span>/g,
      '<span class="cp-badge badge-new" style="font-size:0.6rem">开源</span>'],
    [
      /<thead><tr><th>\?\?<\/th><th>\?\? \/ \?\? \(\?\?按Token\)<\/th><th>\?\?<\/th><\/tr><\/thead>/g,
      "<thead><tr><th>模型</th><th>输入 / 输出 (百万Token)</th><th>降幅</th></tr></thead>",
    ],
    [/Claude Haiku \?\? \(2025\)/g, "Claude Haiku 4 (2025)"],
    [/3 年降 1000 倍./g, "3 年降 1000 倍"],
    [
      /无限补全 \+ 500次快速请求 \+ Agent模式/g,
      "无限 Tab 补全 + Agent 用量池（含 Claude/GPT 等旗舰）",
    ],
    [
      /~500次\+慢速队列/g,
      "Agent 用量池（$20 档）",
    ],
    [
      /<a href="https:\/\/openai\.com\/codex" target="_blank" rel="noopener noreferrer">OpenAI Codex<\/a>/g,
      '<a href="https://developers.openai.com/codex/cli" target="_blank" rel="noopener noreferrer">OpenAI Codex CLI</a>',
    ],
    [
      /<a href="https:\/\/openai\.com\/" target="_blank" rel="noopener noreferrer">GPT-4\.1<\/a>, <a href="https:\/\/openai\.com\/" target="_blank" rel="noopener noreferrer">o3<\/a>/g,
      '<a href="https://openai.com/" target="_blank" rel="noopener noreferrer">GPT-5</a>, <a href="https://openai.com/" target="_blank" rel="noopener noreferrer">o4-mini</a>',
    ],
    [
      /<a href="https:\/\/openai\.com\/" target="_blank" rel="noopener noreferrer">GPT-4\.1<\/a>, <a href="https:\/\/openai\.com\/" target="_blank" rel="noopener noreferrer">o3-pro<\/a>/g,
      '<a href="https://openai.com/" target="_blank" rel="noopener noreferrer">GPT-5</a>, <a href="https://openai.com/" target="_blank" rel="noopener noreferrer">o3-pro</a>',
    ],
    [
      /GPT-4\.1 ~\$2\/\$8 \(输入\/输出百万Token\)/g,
      "GPT-5 ~$2/$8 (输入/输出百万Token)",
    ],
    [
      /el\.innerHTML = '<span class="cp-flag">\?\?<\/span> ' \+ dict\.sectionOverseas;/g,
      "el.innerHTML = '<span class=\"cp-flag\">🌍</span> ' + dict.sectionOverseas;",
    ],
  ];
  for (const [from, to] of reps) s = s.replace(from, to);
  if (!s.includes("最后更新：2026-06-26")) {
    s = s.replace(
      /<p class="cp-subtitle" data-i18n="subtitle">/,
      '<p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26</span> · <a href="token-optimization.html">Token 优化指南</a></p>\n    <p class="cp-subtitle" data-i18n="subtitle">'
    );
  }
  if (!s.includes("cp-updated-line") && s.includes("cp-footer")) {
    // already added above
  }
  s = s.replace(
    /<div class="cp-footer">\s*<p>数据来源各平台官网/,
    '<div class="cp-footer">\n    <p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26</span></p>\n    <p>数据来源各平台官网'
  );
  return s;
}

function patchAgentPlan(s) {
  s = s.replace(
    /Agent Mode \+ 500次快速请求/g,
    "Agent Mode + 含 Agent 用量池（$20 档，Tab 无限）"
  );
  s = s.replace(
    /<a href="https:\/\/openai\.com\/codex" target="_blank" rel="noopener noreferrer">OpenAI Codex CLI<\/a>/g,
    '<a href="https://developers.openai.com/codex/cli" target="_blank" rel="noopener noreferrer">OpenAI Codex CLI</a>'
  );
  s = s.replace(
    /<a href="https:\/\/openai\.com\/" target="_blank" rel="noopener noreferrer">GPT-4\.1<\/a>, o3/g,
    '<a href="https://openai.com/" target="_blank" rel="noopener noreferrer">GPT-5</a>, o4-mini'
  );
  s = s.replace(/GPT-4\.1, o3-pro/g, "GPT-5, o3-pro");
  s = s.replace(/<td>~500<\/td>/g, "<td>Agent 池</td>");
  s = s.replace(/<td>~1,500<\/td>\s*<\/tr>\s*<tr>\s*<td[^>]*>[\s\S]*?Cursor Pro/g, (m) =>
    m.replace("~1,500", "~2,000+")
  );
  return s;
}

for (const f of PLAN_FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p, "utf8");
  s = clearPlanNav(s);
  s = s.replace(/最后更新：2026-06-22/g, "最后更新：2026-06-26");
  s = s.replace(/更新于 2026年6月 ·/g, "更新于 2026-06-26 ·");
  if (f === "coding-plan.html") s = patchCodingPlan(s);
  if (f === "agent-plan.html") s = patchAgentPlan(s);
  if (f === "image-plan.html") {
    s = s.replace(/含GPT-4o\+DALL-E/g, "含 GPT Image / DALL·E 等");
  }
  if (f === "search-plan.html") {
    s = s.replace(/<td>GPT-4o-mini<\/td>/g, "<td>GPT-4.1 mini / Sonar</td>");
  }
  if (f === "learning-plan.html") {
    s = s.replace(/GPT-4讲错解释/g, "AI 讲错解释");
  }
  if (f === "hardware-plan.html") {
    s = s.replace(
      /<p class="cp-updated">更新于 2026-06-26 · 价格以官网\/电商实时为准<\/p>/,
      '<p class="cp-updated">最后更新：2026-06-26 · 价格以官网/电商实时为准</p>'
    );
    s = s.replace(
      /<div class="cp-footer">数据来源：各品牌官网、电商实时价格、行业报告 · 价格以官网为准 · <a href="index\.html">← 返回 AINav 首页<\/a><\/div>/,
      '<div class="cp-footer">\n    <p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26</span></p>\n    <p>数据来源：各品牌官网、电商实时价格、行业报告 · 价格以官网为准</p>\n    <p><a href="index.html">← 返回 AINav 首页</a> · <a href="free-tier.html">🆓 免费额度</a> · <a href="token-optimization.html">Token优化</a> · <a href="coding-plan.html">编程套餐横评</a> · <a href="agent-plan.html">Agent横评</a> · <a href="model-plan.html">模型选型</a></p>\n  </div>'
    );
    // top nav strip
    s = s.replace(
      /<a href="index\.html">← AINav 首页<\/a><a href="coding-plan\.html">编程套餐<\/a>/,
      '<a href="index.html">← AINav 首页</a> · <a href="free-tier.html">🆓 免费额度</a> · <a href="token-optimization.html">Token优化</a> · <a href="coding-plan.html">编程套餐</a>'
    );
    if (!s.includes('data-plan-nav></div>') && s.includes("hw-nav")) {
      s = s.replace(/<div class="hw-nav[^"]*">[\s\S]*?<\/div>\s*<div class="cp-toolbar">/, (m) => {
        return m.replace(/<div class="hw-nav[^"]*">[\s\S]*?<\/div>\s*/, '<div class="cp-nav" data-plan-nav></div>\n  ');
      });
    }
  }
  fs.writeFileSync(p, s);
  console.log("patched", f);
}

// plan-meta-i18n.js
const metaPath = path.join(ROOT, "plan-meta-i18n.js");
if (fs.existsSync(metaPath)) {
  let m = fs.readFileSync(metaPath, "utf8");
  m = m.replace(/9 款 AI 旗舰模型/g, "10 款 AI 旗舰模型");
  fs.writeFileSync(metaPath, m);
  console.log("patched plan-meta-i18n.js");
}
