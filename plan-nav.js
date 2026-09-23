/**
 * Unified navigation for *-plan.html and opc pages.
 * Usage: <script src="plan-nav.js" data-active="coding-plan.html"></script>
 * Data synced from nav-links.json via: node build-html-data.js / syncPlanNavJs()
 */
(function () {
  var script = document.currentScript;
  if (!script || script.getAttribute("data-plan-nav-done") === "1") return;
  script.setAttribute("data-plan-nav-done", "1");

  var LINKS = [
    { href: "index.html", zh: "← AINav 首页", en: "← AINav Home", match: ["index.html",""], group: "tools" },
    { href: "free-tier.html", zh: "🆓 免费额度", en: "🆓 Free Tier", match: ["free-tier.html"], group: "tools" },
    { href: "token-optimization.html", zh: "Token优化", en: "Token Opt", match: ["token-optimization.html"], group: "tools" },
    { href: "model-finder.html", zh: "模型推荐器", en: "Model Finder", match: ["model-finder.html"], group: "models" },
    { href: "model-plan.html", zh: "模型选型", en: "Models", match: ["model-plan.html"], group: "models" },
    { href: "local-model-plan.html", zh: "本地模型", en: "Local", match: ["local-model-plan.html"], group: "models" },
    { href: "edge-model-plan.html", zh: "端侧模型", en: "On-device", match: ["edge-model-plan.html"], group: "models" },
    { href: "decision-model-plan.html", zh: "决策模型", en: "Decision", match: ["decision-model-plan.html"], group: "models" },
    { href: "low-filter-api-plan.html", zh: "低过滤API", en: "Low-filter", match: ["low-filter-api-plan.html"], group: "models" },
    { href: "coding-plan.html", zh: "编程套餐", en: "Coding", match: ["coding-plan.html"], group: "plans" },
    { href: "agent-plan.html", zh: "Agent", en: "Agent", match: ["agent-plan.html"], group: "plans" },
    { href: "search-plan.html", zh: "搜索", en: "Search", match: ["search-plan.html"], group: "plans" },
    { href: "video-plan.html", zh: "视频", en: "Video", match: ["video-plan.html"], group: "plans" },
    { href: "image-plan.html", zh: "图像", en: "Image", match: ["image-plan.html"], group: "plans" },
    { href: "voice-plan.html", zh: "语音", en: "Voice", match: ["voice-plan.html"], group: "plans" },
    { href: "music-plan.html", zh: "音乐", en: "Music", match: ["music-plan.html"], group: "plans" },
    { href: "learning-plan.html", zh: "学习", en: "Learning", match: ["learning-plan.html"], group: "plans" },
    { href: "hardware-plan.html", zh: "硬件", en: "Hardware", match: ["hardware-plan.html"], group: "plans" },
    { href: "ai-factory-plan.html", zh: "AI造物", en: "AI Factory", match: ["ai-factory-plan.html"], group: "plans" },
    { href: "ai-roi/", zh: "AI技能落地", en: "AI Skills Audit", match: ["ai-roi/","ai-roi/index.html"], group: "landing" },
    { href: "opc.html", zh: "一人公司", en: "OPC", match: ["opc.html","opc-global.html","opc-resources.html"], group: "landing" },
    { href: "skill-plan.html", zh: "Skill", en: "Skill", match: ["skill-plan.html"], group: "landing" },
    { href: "thinking-framework.html", zh: "AI第一思考", en: "Thinking", match: ["thinking-framework.html","ideate.html","ask.html","plan.html","debug.html","agent.html","prompt-guide.html"], group: "method" },
    { href: "ai-encyclopedia-2026.html", zh: "AI百科", en: "Encyclopedia", match: ["ai-encyclopedia-2026.html"], group: "method" }
  ];

  var GROUP_ORDER = ["tools", "models", "plans", "landing", "method"];

  var activePage = script.getAttribute("data-active") || location.pathname.split("/").pop() || "";

  function getLang() {
    try {
      return localStorage.getItem("ainav-lang") === "en" ? "en" : "zh";
    } catch (e) {
      return "zh";
    }
  }

  function isActive(link) {
    if (!link.match) return false;
    return link.match.indexOf(activePage) !== -1;
  }

  function renderNav(lang) {
    var useEn = lang === "en";
    var mount = document.querySelector("[data-plan-nav]") || document.querySelector(".cp-nav");
    if (!mount) return;

    var byGroup = {};
    LINKS.forEach(function (item) {
      var g = item.group || "plans";
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(item);
    });

    var parts = [];
    GROUP_ORDER.forEach(function (key) {
      var items = byGroup[key];
      if (!items || !items.length) return;
      if (parts.length) parts.push('<span class="cp-nav-sep" aria-hidden="true"></span>');
      items.forEach(function (item) {
        var text = useEn ? item.en : item.zh;
        if (isActive(item)) {
          parts.push('<a href="' + item.href + '" class="is-active">' + text + "</a>");
        } else {
          parts.push('<a href="' + item.href + '">' + text + "</a>");
        }
      });
    });

    mount.innerHTML = parts.join("");
    mount.classList.add("cp-nav--compact");
    mount.classList.remove("cp-nav--grouped");
  }

  function ensureLangButtons() {
    var toolbar = document.querySelector(".cp-toolbar");
    if (!toolbar || toolbar.querySelector(".lang-btn")) return;
    var zhBtn = document.createElement("button");
    zhBtn.type = "button";
    zhBtn.className = "theme-btn lang-btn";
    zhBtn.setAttribute("data-lang-set", "zh");
    zhBtn.textContent = "中";
    var enBtn = document.createElement("button");
    enBtn.type = "button";
    enBtn.className = "theme-btn lang-btn";
    enBtn.setAttribute("data-lang-set", "en");
    enBtn.textContent = "EN";
    toolbar.appendChild(zhBtn);
    toolbar.appendChild(enBtn);
    if (!document.querySelector("style[data-plan-nav-css]")) {
      var st = document.createElement("style");
      st.setAttribute("data-plan-nav-css", "1");
      st.textContent =
        ".lang-btn{margin-left:.35rem}" +
        ".cp-nav--compact{display:flex;flex-wrap:wrap;align-items:center;gap:.12rem .28rem;flex:1;min-width:0}" +
        ".cp-nav-sep{flex:0 0 auto;width:1px;height:.85em;margin:0 .1rem;background:var(--border);opacity:.85}" +
        ".cp-nav a{font-weight:600;margin-right:0;font-size:.82rem;line-height:1.35;display:inline-block;padding:.1rem .38rem;border-radius:5px;border:1px solid transparent}" +
        ".cp-nav a.is-active{color:var(--accent2);font-weight:700}" +
        ".cp-nav a:hover{background:rgba(88,166,255,.08);text-decoration:none}" +
        "@media (max-width:768px){.cp-nav--compact{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}.cp-nav--compact::-webkit-scrollbar{display:none}.cp-nav a{flex:0 0 auto;min-height:40px;display:inline-flex;align-items:center}}";
      document.head.appendChild(st);
    }
    if (!document.querySelector('link[href*="site-mobile.css"]')) {
      var mob = document.createElement("link");
      mob.rel = "stylesheet";
      mob.href = "site-mobile.css";
      document.head.appendChild(mob);
    }
  }

  function syncLangButtons(lang) {
    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-lang-set") === lang);
    });
  }

  function setLang(lang) {
    try {
      localStorage.setItem("ainav-lang", lang);
    } catch (e) {}
    renderNav(lang);
    syncLangButtons(lang);
    document.dispatchEvent(new CustomEvent("ainav-lang-change", { detail: { lang: lang } }));
  }

  renderNav(getLang());
  if (script.getAttribute("data-lang") !== "false") {
    ensureLangButtons();
    syncLangButtons(getLang());
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".lang-btn");
      if (!btn) return;
      setLang(btn.getAttribute("data-lang-set") || "zh");
    });
  }

  document.addEventListener("ainav-lang-change", function (e) {
    if (e.detail && e.detail.lang) renderNav(e.detail.lang);
  });
})();
