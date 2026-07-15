/**
 * 从百科表 + site-data 生成 tools/*.html 详情页与 tools/index.html。
 * 由 build-html-data.js 调用，也可单独：node scripts/build-tool-pages.js
 */
const fs = require("fs");
const path = require("path");
const { loadEncyclopediaFullTable } = require("../full-ai-encyclopedia.js");

const COL = {
  cat: 0,
  title: 1,
  free: 2,
  quota: 3,
  cycle: 4,
  bonus: 5,
  rating: 6,
  value: 7,
  link: 8,
  audience: 9,
  models: 10,
  note: 11,
  updated: 12,
};

const CAT_TO_PLANS = [
  { re: /编程|代码|IDE|Agent|开发/, plans: [["coding-plan.html", "编程套餐横评"], ["agent-plan.html", "Agent 横评"], ["token-optimization.html", "Token 优化"]] },
  { re: /模型|对话|聊天|LLM/, plans: [["model-plan.html", "模型选型"], ["free-tier.html", "免费额度"]] },
  { re: /搜索/, plans: [["search-plan.html", "搜索套餐"], ["free-tier.html", "免费额度"]] },
  { re: /视频/, plans: [["video-plan.html", "视频套餐"]] },
  { re: /图像|图片|设计/, plans: [["image-plan.html", "图像套餐"]] },
  { re: /语音|声音/, plans: [["voice-plan.html", "语音套餐"]] },
  { re: /音乐/, plans: [["music-plan.html", "音乐套餐"]] },
  { re: /学习|教育/, plans: [["learning-plan.html", "学习套餐"]] },
];

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 文件名用安全 slug；中文保留 */
function fileSlug(title) {
  return String(title || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\\/:*?"<>|]+/g, "")
    .slice(0, 80) || "tool";
}

function relatedPlans(cat) {
  for (const item of CAT_TO_PLANS) {
    if (item.re.test(cat || "")) return item.plans;
  }
  return [
    ["free-tier.html", "免费额度"],
    ["ai-encyclopedia-2026.html", "AI 工具百科"],
    ["model-plan.html", "模型选型"],
  ];
}

function loadTitleSet(root) {
  const cfgPath = path.join(root, "tool-pages.json");
  const cfg = fs.existsSync(cfgPath)
    ? JSON.parse(fs.readFileSync(cfgPath, "utf8"))
    : { titles: [], includeDailyTools: true };
  const set = new Set();
  for (const t of cfg.titles || []) {
    if (t && String(t).trim()) set.add(String(t).trim());
  }
  if (cfg.includeDailyTools !== false) {
    const dailyPath = path.join(root, "daily-tools.json");
    if (fs.existsSync(dailyPath)) {
      const daily = JSON.parse(fs.readFileSync(dailyPath, "utf8"));
      for (const item of daily.items || []) {
        if (item && item.title) set.add(String(item.title).trim());
      }
    }
  }
  return { cfg, titles: [...set] };
}

function indexSiteTools(root) {
  const sitePath = path.join(root, "site-data.json");
  const byTitle = new Map();
  if (!fs.existsSync(sitePath)) return byTitle;
  const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
  for (const t of Object.values(site.tools || {})) {
    if (t && t.title) byTitle.set(String(t.title).trim(), t);
  }
  return byTitle;
}

function pickEncyclopediaRows(tab) {
  const byTitle = new Map();
  for (const row of tab.rows || []) {
    const title = row[COL.title];
    if (!title) continue;
    if (!byTitle.has(title)) byTitle.set(title, row);
  }
  return byTitle;
}

function proseIntro(row, siteTool) {
  const title = row[COL.title];
  const note = row[COL.note] || (siteTool && siteTool.subtitle) || "";
  const rating = row[COL.rating] || "";
  const cat = row[COL.cat] || "";
  const parts = [];
  parts.push(
    `${title} 属于「${cat || "AI 工具"}」类目。${note ? note.replace(/。$/, "") + "。" : ""}`
  );
  if (rating) parts.push(`编辑侧印象：${rating}`);
  if (siteTool && siteTool.subtitle && siteTool.subtitle !== note) {
    parts.push(`导航摘要：${siteTool.subtitle}`);
  }
  return parts.filter(Boolean).join(" ");
}

function buildToolHtml({ row, siteTool, baseUrl, siblings }) {
  const title = row[COL.title];
  const slug = fileSlug(title);
  const link = row[COL.link] || (siteTool && siteTool.link) || "#";
  const avatar = (siteTool && siteTool.avatar) || "";
  const cat = row[COL.cat] || "";
  const updated = row[COL.updated] || "";
  const desc = `${title}：${row[COL.free] || ""}；${(row[COL.note] || row[COL.quota] || "").slice(0, 80)}`.replace(/\s+/g, " ");
  const plans = relatedPlans(cat);
  const sameCat = siblings
    .filter((s) => s.title !== title && s.cat === cat)
    .slice(0, 6);

  const avatarHtml = avatar
    ? `<img class="tool-avatar" src="../${esc(avatar)}" alt="" width="48" height="48" loading="lazy" onerror="this.style.display='none'">`
    : `<span class="tool-avatar-fallback" aria-hidden="true">${esc(title.slice(0, 1))}</span>`;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${title} 免费吗？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${row[COL.free] || "因产品而异"}。${row[COL.quota] || ""} ${row[COL.cycle] || ""}`.trim(),
        },
      },
      {
        "@type": "Question",
        name: `${title} 适合谁？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: row[COL.audience] || "通用用户与开发者，请结合场景自行评估。",
        },
      },
      {
        "@type": "Question",
        name: `付费是否值得？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: row[COL.value] || "请对照官网套餐与自身用量决定。",
        },
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — 适合谁、免费额度与付费建议 — AINav</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(baseUrl)}/tools/${esc(slug)}.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)} — AINav 工具详情">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(baseUrl)}/tools/${esc(slug)}.html">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='18' width='100' height='100' fill='%230969da'/><text x='50' y='72' font-size='60' text-anchor='middle' fill='white' font-family='system-ui' font-weight='700'>AI</text></svg>">
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-2B8FBWRX4N"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-2B8FBWRX4N');
  </script>
  <script>
  (function () {
    try {
      var t = localStorage.getItem("ainav-theme");
      if (t === "light" || t === "dark" || t === "system") document.documentElement.setAttribute("data-theme", t);
      else document.documentElement.setAttribute("data-theme", "system");
    } catch (e) { document.documentElement.setAttribute("data-theme", "system"); }
  })();
  </script>
  <style>
    :root, html[data-theme="dark"] {
      --bg:#0f1419; --panel:#151b23; --card:#1c2430; --border:#2d3848;
      --text:#e6edf3; --muted:#8b9cb3; --accent:#58a6ff; --accent2:#3fb950;
    }
    html[data-theme="light"] {
      --bg:#f6f8fa; --panel:#fff; --card:#fff; --border:#d0d7de;
      --text:#1f2328; --muted:#59636e; --accent:#0969da; --accent2:#1a7f37;
    }
    @media (prefers-color-scheme: light) {
      html[data-theme="system"] {
        --bg:#f6f8fa; --panel:#fff; --card:#fff; --border:#d0d7de;
        --text:#1f2328; --muted:#59636e; --accent:#0969da; --accent2:#1a7f37;
      }
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI",system-ui,"PingFang SC","Microsoft YaHei",sans-serif; background:var(--bg); color:var(--text); line-height:1.7; }
    a { color: var(--accent); }
    .top { padding:0.75rem 1rem; border-bottom:1px solid var(--border); background:var(--panel); }
    .top-inner { max-width:46rem; margin:0 auto; display:flex; flex-wrap:wrap; gap:0.75rem 1rem; align-items:center; }
    .top a { font-weight:600; font-size:0.88rem; text-decoration:none; }
    .top a:hover { text-decoration:underline; }
    .wrap { max-width:46rem; margin:0 auto; padding:1.5rem 1.15rem 3.5rem; }
    .hero { display:flex; gap:0.9rem; align-items:flex-start; margin-bottom:1rem; }
    .tool-avatar, .tool-avatar-fallback {
      width:48px; height:48px; border-radius:10px; flex:0 0 auto; object-fit:cover;
      background:var(--panel); border:1px solid var(--border);
    }
    .tool-avatar-fallback { display:inline-flex; align-items:center; justify-content:center; font-weight:700; color:var(--accent); }
    h1 { font-size:1.45rem; margin:0 0 0.25rem; }
    .meta { font-size:0.82rem; color:var(--muted); margin:0; }
    .badge { display:inline-block; font-size:0.72rem; padding:0.12rem 0.45rem; border-radius:999px; border:1px solid var(--border); color:var(--muted); margin-right:0.35rem; }
    .cta { display:inline-block; margin:0.85rem 0 0.4rem; padding:0.55rem 1rem; border-radius:8px; background:var(--accent); color:#fff !important; text-decoration:none; font-weight:700; font-size:0.9rem; }
    .cta:hover { filter:brightness(1.05); text-decoration:none; }
    .cta-sec { margin-left:0.5rem; font-size:0.85rem; }
    h2 { font-size:1.05rem; margin:1.75rem 0 0.45rem; color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.25rem; }
    p { margin:0.45rem 0; }
    ul { margin:0.35rem 0; padding-left:1.3rem; }
    li { margin:0.25rem 0; color:var(--muted); }
    li strong { color:var(--text); }
    .panel { border:1px solid var(--border); border-radius:10px; background:var(--card); padding:0.85rem 1rem; margin:0.75rem 0; }
    .chips { display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.5rem; }
    .chips a { font-size:0.8rem; padding:0.25rem 0.55rem; border:1px solid var(--border); border-radius:6px; text-decoration:none; background:var(--panel); }
    .chips a:hover { border-color:var(--accent); }
    .foot { margin-top:2.5rem; padding-top:1rem; border-top:1px solid var(--border); font-size:0.78rem; color:var(--muted); text-align:center; }
    .foot a { color:var(--accent); }
    .note { font-size:0.8rem; color:var(--muted); }
  </style>
</head>
<body>
  <header class="top">
    <div class="top-inner">
      <a href="../index.html">← AINav 首页</a>
      <a href="index.html">工具详情目录</a>
      <a href="../free-tier.html">免费额度</a>
      <a href="../ai-encyclopedia-2026.html">百科</a>
    </div>
  </header>
  <main class="wrap">
    <div class="hero">
      ${avatarHtml}
      <div>
        <h1>${esc(title)}</h1>
        <p class="meta">
          ${cat ? `<span class="badge">${esc(cat)}</span>` : ""}
          ${row[COL.free] ? `<span class="badge">${esc(row[COL.free])}</span>` : ""}
          ${updated ? `百科更新日期：${esc(updated)}` : ""}
        </p>
        <a class="cta" href="${esc(link)}" target="_blank" rel="noopener noreferrer">打开官网</a>
        <a class="cta-sec" href="../free-tier.html?q=${esc(encodeURIComponent(title))}">查免费额度</a>
      </div>
    </div>

    <p>${esc(proseIntro(row, siteTool))}</p>

    <h2>适合谁</h2>
    <div class="panel">
      <p>${esc(row[COL.audience] || "未标注；可结合同类横评与自身场景判断。")}</p>
      ${row[COL.models] ? `<p class="note">常见底层模型 / 能力底座：${esc(row[COL.models])}</p>` : ""}
    </div>

    <h2>免费情况与额度</h2>
    <div class="panel">
      <ul>
        <li><strong>免费档</strong>：${esc(row[COL.free] || "—")}</li>
        <li><strong>额度概要</strong>：${esc(row[COL.quota] || "—")}</li>
        <li><strong>刷新 / 周期</strong>：${esc(row[COL.cycle] || "—")}</li>
        <li><strong>新用户礼</strong>：${esc(row[COL.bonus] || "—")}</li>
      </ul>
      <p class="note">额度与活动会变动，订阅前请以官网计费页为准。也可在 <a href="../free-tier.html?q=${esc(encodeURIComponent(title))}">免费额度页</a> 对照核实状态。</p>
    </div>

    <h2>付费价值与选型提示</h2>
    <div class="panel">
      <p>${esc(row[COL.value] || "暂无单独付费分析；建议对照用量与竞品套餐。")}</p>
      ${row[COL.rating] ? `<p class="note">${esc(row[COL.rating])}</p>` : ""}
    </div>

    <h2>相关横评与站内入口</h2>
    <div class="chips">
      ${plans.map(([href, label]) => `<a href="../${esc(href)}">${esc(label)}</a>`).join("")}
      <a href="../ai-encyclopedia-2026.html">完整百科表</a>
      <a href="../about.html">关于本站</a>
    </div>

    ${
      sameCat.length
        ? `<h2>同分类其它工具</h2>
    <div class="chips">
      ${sameCat.map((s) => `<a href="${esc(s.slug)}.html">${esc(s.title)}</a>`).join("")}
    </div>`
        : ""
    }

    <h2>使用前请注意</h2>
    <ul>
      <li>本页为导航与整理信息，不构成购买建议。</li>
      <li>外链服务由第三方运营，条款、隐私与计费以其官网为准。</li>
      <li>发现错误可到 <a href="../contact.html">联系页</a> 反馈。</li>
    </ul>

    <div class="foot">
      <p>
        <a href="../index.html">首页</a> ·
        <a href="index.html">工具详情</a> ·
        <a href="../about.html">关于</a> ·
        <a href="../contact.html">联系</a> ·
        <a href="../privacy.html">隐私</a> ·
        <a href="../disclaimer.html">免责声明</a>
      </p>
    </div>
  </main>
<script src="../back-to-top.js"></script>
</body>
</html>
`;
}

function buildIndexHtml(pages, baseUrl) {
  const items = pages
    .map(
      (p) =>
        `<li><a href="${esc(p.slug)}.html"><strong>${esc(p.title)}</strong></a> <span style="color:var(--muted);font-size:0.85rem;">${esc(p.cat || "")}${p.free ? " · " + esc(p.free) : ""}</span></li>`
    )
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI 工具详情目录 — AINav</title>
  <meta name="description" content="AINav 头部 AI 工具详情页目录：适合谁、免费额度、付费提示与相关横评入口。">
  <link rel="canonical" href="${esc(baseUrl)}/tools/">
  <meta property="og:title" content="AI 工具详情目录 — AINav">
  <meta property="og:url" content="${esc(baseUrl)}/tools/">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='18' width='100' height='100' fill='%230969da'/><text x='50' y='72' font-size='60' text-anchor='middle' fill='white' font-family='system-ui' font-weight='700'>AI</text></svg>">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-2B8FBWRX4N"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-2B8FBWRX4N');
  </script>
  <script>
  (function () {
    try {
      var t = localStorage.getItem("ainav-theme");
      if (t === "light" || t === "dark" || t === "system") document.documentElement.setAttribute("data-theme", t);
      else document.documentElement.setAttribute("data-theme", "system");
    } catch (e) { document.documentElement.setAttribute("data-theme", "system"); }
  })();
  </script>
  <style>
    :root, html[data-theme="dark"] {
      --bg:#0f1419; --panel:#151b23; --card:#1c2430; --border:#2d3848;
      --text:#e6edf3; --muted:#8b9cb3; --accent:#58a6ff;
    }
    html[data-theme="light"] {
      --bg:#f6f8fa; --panel:#fff; --card:#fff; --border:#d0d7de;
      --text:#1f2328; --muted:#59636e; --accent:#0969da;
    }
    @media (prefers-color-scheme: light) {
      html[data-theme="system"] {
        --bg:#f6f8fa; --panel:#fff; --card:#fff; --border:#d0d7de;
        --text:#1f2328; --muted:#59636e; --accent:#0969da;
      }
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI",system-ui,"PingFang SC","Microsoft YaHei",sans-serif; background:var(--bg); color:var(--text); line-height:1.7; }
    a { color: var(--accent); }
    .top { padding:0.75rem 1rem; border-bottom:1px solid var(--border); background:var(--panel); }
    .top-inner { max-width:46rem; margin:0 auto; display:flex; gap:1rem; flex-wrap:wrap; }
    .top a { font-weight:600; font-size:0.88rem; text-decoration:none; }
    .wrap { max-width:46rem; margin:0 auto; padding:1.75rem 1.15rem 3rem; }
    h1 { font-size:1.4rem; margin:0 0 0.4rem; }
    .lead { color:var(--muted); margin:0 0 1.2rem; }
    ul { padding-left:1.2rem; }
    li { margin:0.45rem 0; }
    .foot { margin-top:2rem; padding-top:1rem; border-top:1px solid var(--border); font-size:0.78rem; color:var(--muted); text-align:center; }
  </style>
</head>
<body>
  <header class="top">
    <div class="top-inner">
      <a href="../index.html">← AINav 首页</a>
      <a href="../about.html">关于</a>
      <a href="../free-tier.html">免费额度</a>
    </div>
  </header>
  <main class="wrap">
    <h1>AI 工具详情目录</h1>
    <p class="lead">以下为站内已生成的详情页（适合谁、免费与付费提示、相关横评）。名单由 <code>tool-pages.json</code> 与热门工具合并，构建时自动生成。</p>
    <ul>
      ${items}
    </ul>
    <div class="foot">
      <p>
        <a href="../index.html">首页</a> ·
        <a href="../about.html">关于</a> ·
        <a href="../contact.html">联系</a> ·
        <a href="../privacy.html">隐私</a> ·
        <a href="../disclaimer.html">免责声明</a>
      </p>
    </div>
  </main>
<script src="../back-to-top.js"></script>
</body>
</html>
`;
}

function buildToolPages(root) {
  const ROOT = root || path.join(__dirname, "..");
  const { cfg, titles } = loadTitleSet(ROOT);
  const baseUrl = (cfg.baseUrl || "https://aiv123.com").replace(/\/$/, "");
  const outDir = path.join(ROOT, cfg.outDir || "tools");
  const tab = loadEncyclopediaFullTable(ROOT);
  const encByTitle = pickEncyclopediaRows(tab);
  const siteByTitle = indexSiteTools(ROOT);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 清理旧生成页（保留目录）
  for (const name of fs.readdirSync(outDir)) {
    if (name.endsWith(".html")) fs.unlinkSync(path.join(outDir, name));
  }

  const pages = [];
  const missing = [];

  for (const title of titles) {
    const row = encByTitle.get(title);
    const siteTool = siteByTitle.get(title);
    if (!row && !siteTool) {
      missing.push(title);
      continue;
    }
    const fakeRow = row || [
      "未分类",
      title,
      "",
      "",
      "",
      "",
      "",
      "",
      (siteTool && siteTool.link) || "",
      "",
      "",
      (siteTool && siteTool.subtitle) || "",
      "",
    ];
    const slug = fileSlug(title);
    pages.push({
      title,
      slug,
      cat: fakeRow[COL.cat] || "",
      free: fakeRow[COL.free] || "",
      row: fakeRow,
      siteTool,
    });
  }

  // 稳定排序：分类再标题
  pages.sort((a, b) => (a.cat || "").localeCompare(b.cat || "", "zh") || a.title.localeCompare(b.title, "zh"));

  for (const p of pages) {
    const html = buildToolHtml({
      row: p.row,
      siteTool: p.siteTool,
      baseUrl,
      siblings: pages,
    });
    fs.writeFileSync(path.join(outDir, `${p.slug}.html`), html, "utf8");
  }

  fs.writeFileSync(path.join(outDir, "index.html"), buildIndexHtml(pages, baseUrl), "utf8");

  const sitemapExtras = [
    { loc: `${baseUrl}/tools/index.html`, changefreq: "weekly", priority: "0.75" },
    ...pages.map((p) => ({
      loc: `${baseUrl}/tools/${p.slug}.html`,
      changefreq: "weekly",
      priority: "0.65",
    })),
  ];

  if (missing.length) {
    console.warn("build-tool-pages: 未找到百科/站点数据，已跳过:", missing.join(", "));
  }
  console.log("build-tool-pages: wrote", pages.length, "tool pages + index →", path.relative(ROOT, outDir) || "tools");

  return { pages, sitemapExtras, missing };
}

module.exports = { buildToolPages, fileSlug };

if (require.main === module) {
  buildToolPages(path.join(__dirname, ".."));
}
