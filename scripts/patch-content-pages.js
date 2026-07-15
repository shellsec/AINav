/**
 * Batch: site-mobile.css + page TOC + OPC sibling polish.
 * Run: node scripts/patch-content-pages.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const TOC_CSS = `/* Shared page TOC (all viewports) */
.page-toc{margin:0 0 1.25rem;padding:.75rem 1rem;border-radius:10px;border:1px solid var(--border, #2d3848);background:var(--card, #1c2430)}
.page-toc-hd{font-weight:700;font-size:.88rem;margin-bottom:.5rem;color:var(--accent, #58a6ff)}
.page-toc-list{display:flex;flex-wrap:wrap;gap:.35rem .5rem;margin:0;padding:0;list-style:none}
.page-toc-list a{display:inline-block;padding:.2rem .55rem;border-radius:5px;border:1px solid var(--border, #2d3848);background:var(--panel, #151b23);font-size:.76rem;color:var(--muted, #8b9cb3);text-decoration:none}
.page-toc-list a:hover{border-color:var(--accent, #58a6ff);color:var(--accent, #58a6ff);text-decoration:none}
.cp-section-hd[id],.page-toc-target{scroll-margin-top:3.5rem}

`;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function write(rel, s) {
  fs.writeFileSync(path.join(root, rel), s, "utf8");
}

function ensureMobile(html) {
  if (html.includes("site-mobile.css")) return html;
  let out = html;
  out = out.replace(
    /<meta name="viewport" content="width=device-width, initial-scale=1">/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  );
  out = out.replace(
    /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/,
    (m) => `${m}\n  <link rel="stylesheet" href="site-mobile.css">`
  );
  if (!out.includes("site-mobile.css")) {
    out = out.replace(/<\/title>/, '</title>\n  <link rel="stylesheet" href="site-mobile.css">');
  }
  return out;
}

function ensureThinkingJs(html) {
  if (html.includes("thinking-framework.js")) return html;
  return html.replace(/<\/body>/i, '<script src="thinking-framework.js"></script>\n</body>');
}

function tocHtml(items) {
  const lis = items
    .map(([href, label]) => `<li><a href="${href}">${label}</a></li>`)
    .join("\n        ");
  return `<nav class="page-toc" aria-label="本页目录">
      <div class="page-toc-hd">📑 本页目录</div>
      <ul class="page-toc-list">
        ${lis}
      </ul>
    </nav>`;
}

function insertBefore(html, marker, insert) {
  if (html.includes("page-toc") || html.includes("aria-label=\"本页目录\"")) return html;
  const i = html.indexOf(marker);
  if (i < 0) return html;
  return html.slice(0, i) + insert + "\n\n    " + html.slice(i);
}

function addIdToSection(html, flagSnippet, id) {
  // Avoid double-id
  if (html.includes(`id="${id}"`)) return html;
  const re = new RegExp(
    `(<div class="cp-section-hd[^"]*"[^>]*)(>\\s*<span class="cp-flag">[^<]*</span>\\s*[^<]*${flagSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "i"
  );
  if (re.test(html)) {
    return html.replace(re, `$1 id="${id}"$2`);
  }
  // broader: first matching section text
  const re2 = new RegExp(
    `(<div class="cp-section-hd[^>]*)(>[^\\n]*${flagSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "i"
  );
  return html.replace(re2, `$1 id="${id}"$2`);
}

// --- site-mobile.css: prepend TOC styles ---
{
  let css = read("site-mobile.css");
  if (!css.includes(".page-toc{")) {
    write("site-mobile.css", TOC_CSS + css);
    console.log("OK site-mobile.css + page-toc");
  }
}

const planFiles = [
  "coding-plan.html",
  "agent-plan.html",
  "ai-factory-plan.html",
  "video-plan.html",
  "image-plan.html",
  "search-plan.html",
  "music-plan.html",
  "learning-plan.html",
  "voice-plan.html",
  "skill-plan.html",
  "hardware-plan.html",
  "model-plan.html",
  "opc-global.html",
  "opc-resources.html",
];

for (const f of planFiles) {
  let html = read(f);
  const before = html;
  html = ensureMobile(html);
  if (html !== before) console.log("mobile", f);
  write(f, html);
}

// --- opc-global ---
{
  let html = read("opc-global.html");
  html = ensureMobile(html);
  html = ensureThinkingJs(html);

  // TOC CSS already in site-mobile; still fine
  html = html.replace(
    /更新于 2026年6月/,
    "更新于 2026年7月 · <a href=\"thinking-framework.html\">AI第一思考</a> · <a href=\"opc.html\">一人公司全景</a>"
  );

  html = insertBefore(
    html,
    '<div class="cp-section-hd global-hd"><span class="cp-flag">📊</span> 为什么出海？',
    tocHtml([
      ["#why", "为什么出海"],
      ["#pipeline", "全链路总览"],
      ["#step1", "选品"],
      ["#step2", "建站"],
      ["#step3", "内容"],
      ["#step4", "营销"],
      ["#step5", "客服"],
      ["#step6", "收款"],
      ["#step7", "合规"],
      ["#cost", "成本"],
      ["#pitfalls", "避坑"],
      ["#roadmap", "路线图"],
    ])
  );

  html = html
    .replace(
      '<div class="cp-section-hd global-hd"><span class="cp-flag">📊</span> 为什么出海？— 数据说话</div>',
      '<div class="cp-section-hd global-hd" id="why"><span class="cp-flag">📊</span> 为什么出海？— 数据说话</div>'
    )
    .replace(
      '<div class="cp-section-hd global-hd"><span class="cp-flag">🔗</span> 全链路总览</div>',
      '<div class="cp-section-hd global-hd" id="pipeline"><span class="cp-flag">🔗</span> 全链路总览</div>'
    )
    .replace(
      '<div class="cp-section-hd global-hd"><span class="cp-flag">💰</span> 出海月度成本估算</div>',
      '<div class="cp-section-hd global-hd" id="cost"><span class="cp-flag">💰</span> 出海月度成本估算</div>'
    )
    .replace(
      '<div class="cp-section-hd global-hd"><span class="cp-flag">⚠️</span> 出海避坑指南</div>',
      '<div class="cp-section-hd global-hd" id="pitfalls"><span class="cp-flag">⚠️</span> 出海避坑指南</div>'
    )
    .replace(
      '<div class="cp-section-hd global-hd"><span class="cp-flag">🛤️</span> 出海路线图</div>',
      '<div class="cp-section-hd global-hd" id="roadmap"><span class="cp-flag">🛤️</span> 出海路线图</div>'
    );

  const steps = [
    ["step1", "Step 1: 选品"],
    ["step2", "Step 2: 建站"],
    ["step3", "Step 3: 内容"],
    ["step4", "Step 4: 营销"],
    ["step5", "Step 5: 客服"],
    ["step6", "Step 6: 收款"],
    ["step7", "Step 7: 合规"],
  ];
  for (const [id, label] of steps) {
    if (html.includes(`id="${id}"`)) continue;
    html = html.replace(
      new RegExp(`(<div class="step-card">\\s*<div class="step-card-head">)([^\\n]*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`),
      `$1<span id="${id}" class="page-toc-target"></span>$2`
    );
    // simpler: add id on step-card wrapping
    html = html.replace(
      new RegExp(`(<div class="step-card">)(\\s*<div class="step-card-head">[^\\n]*${label.split(":")[0]})`),
      `$1<!-- ${id} -->$2`
    );
  }
  // Add ids properly on step-card
  html = html
    .replace('<div class="step-card">\n      <div class="step-card-head"><span style="font-size:1.2rem;">🔍</span> Step 1:', '<div class="step-card" id="step1">\n      <div class="step-card-head"><span style="font-size:1.2rem;">🔍</span> Step 1:')
    .replace('<div class="step-card">\n      <div class="step-card-head"><span style="font-size:1.2rem;">🏪</span> Step 2:', '<div class="step-card" id="step2">\n      <div class="step-card-head"><span style="font-size:1.2rem;">🏪</span> Step 2:')
    .replace('<div class="step-card">\n      <div class="step-card-head"><span style="font-size:1.2rem;">🎬</span> Step 3:', '<div class="step-card" id="step3">\n      <div class="step-card-head"><span style="font-size:1.2rem;">🎬</span> Step 3:')
    .replace('<div class="step-card">\n      <div class="step-card-head"><span style="font-size:1.2rem;">📣</span> Step 4:', '<div class="step-card" id="step4">\n      <div class="step-card-head"><span style="font-size:1.2rem;">📣</span> Step 4:')
    .replace('<div class="step-card">\n      <div class="step-card-head"><span style="font-size:1.2rem;">💬</span> Step 5:', '<div class="step-card" id="step5">\n      <div class="step-card-head"><span style="font-size:1.2rem;">💬</span> Step 5:')
    .replace('<div class="step-card">\n      <div class="step-card-head"><span style="font-size:1.2rem;">💳</span> Step 6:', '<div class="step-card" id="step6">\n      <div class="step-card-head"><span style="font-size:1.2rem;">💳</span> Step 6:')
    .replace('<div class="step-card">\n      <div class="step-card-head"><span style="font-size:1.2rem;">⚖️</span> Step 7:', '<div class="step-card" id="step7">\n      <div class="step-card-head"><span style="font-size:1.2rem;">⚖️</span> Step 7:');

  // Expand cross links
  if (!html.includes("thinking-framework.html")) {
    html = html.replace(
      `    <div class="opc-cross">
      <a class="opc-cross-card" href="opc.html">
        <h4 style="color:var(--opc);">🏠 一人公司全景与落地 →</h4>
        <p>概念、变现模式、痛点突破、AI员工、工具栈、路线图</p>
      </a>
      <a class="opc-cross-card" href="opc-resources.html">
        <h4 style="color:var(--overseas);">🗺️ 一人公司资源导航 →</h4>
        <p>社区、案例、想法站、课程、博客，精选外链资源</p>
      </a>
    </div>`,
      `    <div class="opc-cross">
      <a class="opc-cross-card" href="thinking-framework.html">
        <h4>💡 AI第一思考 →</h4>
        <p>Ideate·Ask·Plan·Debug·Agent：出海选题与执行底层链路</p>
      </a>
      <a class="opc-cross-card" href="coding-plan.html">
        <h4>💻 编程套餐横评 →</h4>
        <p>建站与产品开发侧 Coding Plan / Agent 选型</p>
      </a>
      <a class="opc-cross-card" href="opc.html">
        <h4 style="color:var(--opc);">🏠 一人公司全景与落地 →</h4>
        <p>概念、变现模式、痛点突破、AI员工、工具栈、路线图</p>
      </a>
      <a class="opc-cross-card" href="opc-resources.html">
        <h4 style="color:var(--overseas);">🗺️ 一人公司资源导航 →</h4>
        <p>社区、案例、想法站、课程、博客，精选外链资源</p>
      </a>
    </div>`
    );
  }

  html = html.replace(
    /<div class="cp-footer">\s*<p>AINav · 一人公司出海全链路[\s\S]*?<\/div>\s*(?=<script>)/,
    `<div class="cp-footer">
    <p>AINav · 一人公司出海全链路 · 数据仅供参考，价格以官网为准</p>
    <p><a href="index.html">返回首页</a> · <a href="thinking-framework.html">AI第一思考</a> · <a href="opc.html">一人公司</a> · <a href="opc-resources.html">资源导航</a> · <a href="free-tier.html">🆓 免费额度</a> · <a href="coding-plan.html">编程套餐</a> · <a href="privacy.html">隐私政策</a> · <a href="disclaimer.html">免责声明</a></p>
  </div>

  `
  );

  // clean botched step id comments if any
  html = html.replace(/<!-- step\d -->/g, "");

  write("opc-global.html", html);
  console.log("OK opc-global.html");
}

// --- opc-resources ---
{
  let html = read("opc-resources.html");
  html = ensureMobile(html);
  html = ensureThinkingJs(html);

  html = html.replace(
    `<p class="cp-subtitle">一个人也能撬动一家公司的精选资源 — 社区、案例、想法站、课程、博客、变现工具</p>`,
    `<p class="cp-subtitle">一个人也能撬动一家公司的精选资源 — 社区、案例、想法站、课程、博客、变现工具</p>
    <p class="cp-updated-line"><span class="cp-updated">最后更新：2026-07-15</span> · <a href="opc.html">一人公司全景</a> · <a href="thinking-framework.html">AI第一思考</a></p>`
  );

  html = insertBefore(
    html,
    '<div class="cp-section-hd"><span style="font-size:1.15rem;">🌐</span> 社区</div>',
    tocHtml([
      ["#community", "社区"],
      ["#cases", "案例"],
      ["#ideas", "想法站"],
      ["#courses", "课程"],
      ["#blogs", "博客"],
      ["#monetize", "变现工具"],
    ])
  );

  html = html
    .replace(
      '<div class="cp-section-hd"><span style="font-size:1.15rem;">🌐</span> 社区</div>',
      '<div class="cp-section-hd" id="community"><span style="font-size:1.15rem;">🌐</span> 社区</div>'
    )
    .replace(
      '<div class="cp-section-hd"><span style="font-size:1.15rem;">🏆</span> 案例 / 故事</div>',
      '<div class="cp-section-hd" id="cases"><span style="font-size:1.15rem;">🏆</span> 案例 / 故事</div>'
    )
    .replace(
      '<div class="cp-section-hd"><span style="font-size:1.15rem;">🚀</span> 想法站 / 产品展示</div>',
      '<div class="cp-section-hd" id="ideas"><span style="font-size:1.15rem;">🚀</span> 想法站 / 产品展示</div>'
    )
    .replace(
      '<div class="cp-section-hd"><span style="font-size:1.15rem;">📚</span> 课程 / 方法论</div>',
      '<div class="cp-section-hd" id="courses"><span style="font-size:1.15rem;">📚</span> 课程 / 方法论</div>'
    )
    .replace(
      '<div class="cp-section-hd"><span style="font-size:1.15rem;">✍️</span> 博客 / 媒体</div>',
      '<div class="cp-section-hd" id="blogs"><span style="font-size:1.15rem;">✍️</span> 博客 / 媒体</div>'
    )
    .replace(
      '<div class="cp-section-hd"><span style="font-size:1.15rem;">💡</span> 变现 / 收款工具</div>',
      '<div class="cp-section-hd" id="monetize"><span style="font-size:1.15rem;">💡</span> 变现 / 收款工具</div>'
    );

  if (!html.includes('href="thinking-framework.html"')) {
    html = html.replace(
      `    <div class="opc-cross">
      <a class="opc-cross-card" href="opc.html">
        <h4 style="color:var(--opc);">🏠 一人公司全景与落地 →</h4>
        <p>概念、变现模式、痛点突破、AI员工、工具栈、路线图</p>
      </a>
      <a class="opc-cross-card" href="opc-global.html">
        <h4 style="color:var(--overseas);">🌍 一人公司出海全链路 →</h4>
        <p>选品→建站→内容→营销→客服→收款→合规</p>
      </a>
    </div>`,
      `    <div class="opc-cross">
      <a class="opc-cross-card" href="thinking-framework.html">
        <h4 style="color:var(--accent);">💡 AI第一思考 →</h4>
        <p>Ideate·Ask·Plan·Debug·Agent：用资源前先对齐工作流</p>
      </a>
      <a class="opc-cross-card" href="opc.html">
        <h4 style="color:var(--opc);">🏠 一人公司全景与落地 →</h4>
        <p>概念、变现模式、痛点突破、AI员工、工具栈、路线图</p>
      </a>
      <a class="opc-cross-card" href="opc-global.html">
        <h4 style="color:var(--overseas);">🌍 一人公司出海全链路 →</h4>
        <p>选品→建站→内容→营销→客服→收款→合规</p>
      </a>
      <a class="opc-cross-card" href="coding-plan.html">
        <h4 style="color:var(--accent2);">💻 编程套餐横评 →</h4>
        <p>产品开发侧套餐与用量对照</p>
      </a>
    </div>`
    );
  }

  html = html.replace(
    /最后更新：2026-06-22/,
    "最后更新：2026-07-15"
  );
  html = html.replace(
    /(<p><a href="index\.html">返回首页<\/a>) · <a href="free-tier\.html">🆓 免费额度<\/a> · <a href="token-optimization\.html">Token优化<\/a> · <a href="ai-roi\/">AI 接入自查<\/a> · <a href="skill-plan\.html">Skill 最佳实践<\/a> · <a href="opc\.html">一人公司<\/a> · <a href="opc-global\.html">出海全链路<\/a> · <a href="coding-plan\.html">编程套餐<\/a><\/p>/,
    `$1 · <a href="thinking-framework.html">AI第一思考</a> · <a href="opc.html">一人公司</a> · <a href="opc-global.html">出海全链路</a> · <a href="free-tier.html">🆓 免费额度</a> · <a href="coding-plan.html">编程套餐</a> · <a href="privacy.html">隐私政策</a> · <a href="disclaimer.html">免责声明</a></p>`
  );

  write("opc-resources.html", html);
  console.log("OK opc-resources.html");
}

// --- Long plan pages: domestic/overseas TOC ---
function patchDomesticOverseas(file, domesticLabel, overseasLabel, extra = []) {
  let html = read(file);
  html = ensureMobile(html);

  const domesticId = "domestic";
  const overseasId = "overseas";

  // Find first domestic section and add id
  if (!html.includes(`id="${domesticId}"`)) {
    html = html.replace(
      /(<div class="cp-section-hd(?:[^"]*)?"(?![^>]*\bid=))(>\s*<span class="cp-flag">🇨🇳<\/span>)/,
      `$1 id="${domesticId}"$2`
    );
  }
  if (!html.includes(`id="${overseasId}"`)) {
    html = html.replace(
      /(<div class="cp-section-hd overseas-hd(?:[^"]*)?"(?![^>]*\bid=))(>\s*<span class="cp-flag">🌍<\/span>)/,
      `$1 id="${overseasId}"$2`
    );
  }

  const items = [
    [`#${domesticId}`, domesticLabel],
    [`#${overseasId}`, overseasLabel],
    ...extra,
  ];

  const marker =
    html.match(/<!-- =+ 国内/) ||
    html.match(/<div class="cp-section-hd"[^>]*id="domestic"/) ||
    html.match(/<div class="cp-section-hd"[^>]*>\s*<span class="cp-flag">🇨🇳/);

  if (!html.includes("page-toc") && !html.includes('aria-label="本页目录"')) {
    const m = html.match(/\n\s*<!-- =+ 国内[^\n]*\n\s*<div class="cp-section-hd/);
    if (m) {
      html = html.replace(m[0], `\n\n    ${tocHtml(items)}\n\n    ${m[0].trimStart()}`);
    } else {
      html = html.replace(
        /(<div class="cp-section-hd[^>]*id="domestic"[^>]*>)/,
        `${tocHtml(items)}\n\n    $1`
      );
    }
  }

  write(file, html);
  console.log("OK TOC", file);
}

patchDomesticOverseas("coding-plan.html", "国内 Coding Plan", "海外 Coding Plan", [
  ["#thinking-bar", "AI第一思考"],
]);
// coding: also link thinking in updated line
{
  let html = read("coding-plan.html");
  if (!html.includes("thinking-framework.html")) {
    html = html.replace(
      /(<p class="cp-updated-line"><span class="cp-updated">最后更新：2026-07-15<\/span>) · <a href="token-optimization\.html">Token 优化指南<\/a><\/p>/,
      `$1 · <a href="token-optimization.html">Token 优化指南</a> · <a href="thinking-framework.html">AI第一思考</a></p>`
    );
  }
  // remove bogus #thinking-bar if we added it
  html = html.replace(/<li><a href="#thinking-bar">AI第一思考<\/a><\/li>\s*/g, "");
  write("coding-plan.html", html);
}

patchDomesticOverseas("agent-plan.html", "国内 Agent", "海外 Agent", [
  ["#oss", "开源 / 自托管"],
]);
{
  let html = read("agent-plan.html");
  if (!html.includes('id="oss"')) {
    html = html.replace(
      /(<div class="cp-section-hd oss-hd")(>\s*<span class="cp-flag">🔓<\/span>)/,
      `$1 id="oss"$2`
    );
  }
  if (!html.includes("thinking-framework.html")) {
    html = html.replace(
      /( · <a href="coding-plan\.html">编程套餐横评<\/a><\/p>)/,
      ` · <a href="coding-plan.html">编程套餐横评</a> · <a href="thinking-framework.html">AI第一思考</a></p>`
    );
  }
  write("agent-plan.html", html);
  console.log("OK agent-plan extras");
}

patchDomesticOverseas("video-plan.html", "国内视频", "海外视频");
patchDomesticOverseas("image-plan.html", "国内图像", "海外图像");

// --- ai-factory: richer TOC ---
{
  let html = read("ai-factory-plan.html");
  html = ensureMobile(html);
  html = html.replace(
    /更新于 2026-06-26/,
    '更新于 2026-07-15 · <a href="thinking-framework.html">AI第一思考</a>'
  );

  const ids = [
    ["overview", "完整链路全景"],
    ["detail", "逐环详解"],
    ["cases", "真实案例"],
    ["leverage", "提效倍率"],
    ["roi", "高ROI场景"],
    ["profit", "利润模型"],
    ["ai-share", "AI参与度"],
    ["pitfalls", "避坑"],
    ["roadmap", "路线图"],
    ["cost", "启动成本"],
    ["roles", "角色定位"],
    ["levels", "10级成长"],
    ["trends", "趋势"],
  ];

  const replacements = [
    ["完整链路全景", "overview"],
    ["逐环详解", "detail"],
    ["真实案例", "cases"],
    ["AI提效倍率", "leverage"],
    ["高ROI场景", "roi"],
    ["利润模型对比", "profit"],
    ["AI参与度", "ai-share"],
    ["避坑指南", "pitfalls"],
    ["从零开始路线图", "roadmap"],
    ["总启动成本", "cost"],
    ["角色定位", "roles"],
    ["AI全能升级路线", "levels"],
    ["AI造物趋势", "trends"],
  ];

  for (const [text, id] of replacements) {
    if (html.includes(`id="${id}"`)) continue;
    html = html.replace(
      new RegExp(`(<div class="cp-section-hd af-hd"[^>]*)(>[^\\n]*${text})`),
      `$1 id="${id}"$2`
    );
  }

  if (!html.includes("page-toc") && !html.includes('aria-label="本页目录"')) {
    html = html.replace(
      /(<div class="cp-section-hd af-hd"[^>]*id="overview"[^>]*>)/,
      `${tocHtml(ids.map(([id, label]) => [`#${id}`, label]))}\n\n$1`
    );
  }

  write("ai-factory-plan.html", html);
  console.log("OK ai-factory-plan.html");
}

// skill-plan + hardware + model: mobile already; light thinking link if missing
for (const f of ["skill-plan.html", "hardware-plan.html", "model-plan.html", "search-plan.html", "music-plan.html", "learning-plan.html", "voice-plan.html", "token-optimization.html"]) {
  if (!fs.existsSync(path.join(root, f))) continue;
  let html = read(f);
  const before = html;
  html = ensureMobile(html);
  if (f !== "token-optimization.html") html = ensureThinkingJs(html);
  if (html !== before) {
    write(f, html);
    console.log("OK light", f);
  } else {
    write(f, html);
  }
}

console.log("Done.");
