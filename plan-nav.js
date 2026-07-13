/**
 * Unified navigation for *-plan.html and opc pages.
 * Usage: <script src="plan-nav.js" data-active="coding-plan.html"></script>
 */
(function () {
  var script = document.currentScript;
  if (!script || script.getAttribute("data-plan-nav-done") === "1") return;
  script.setAttribute("data-plan-nav-done", "1");

  var LINKS = [
    { href: "index.html", zh: "← AINav 首页", en: "← AINav Home", match: ["index.html",""] },
    { href: "free-tier.html", zh: "🆓 免费额度", en: "🆓 Free Tier", match: ["free-tier.html"] },
    { href: "token-optimization.html", zh: "Token优化", en: "Token Opt", match: ["token-optimization.html"] },
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
    { href: "ai-roi/", zh: "AI技能落地", en: "AI Skills Audit", match: ["ai-roi/","ai-roi/index.html"] },
    { href: "opc.html", zh: "一人公司", en: "OPC", match: ["opc.html","opc-global.html","opc-resources.html"] },
    { href: "skill-plan.html", zh: "Skill", en: "Skill", match: ["skill-plan.html"] },
    { href: "thinking-framework.html", zh: "AI第一思考", en: "Thinking", match: ["thinking-framework.html","ask.html","plan.html","debug.html","agent.html","prompt-guide.html"] },
    { href: "ai-encyclopedia-2026.html", zh: "AI百科", en: "Encyclopedia", match: ["ai-encyclopedia-2026.html"] }
  ];

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
    mount.innerHTML = LINKS.map(function (item) {
      var label = useEn ? item.en : item.zh;
      if (isActive(item)) {
        return '<a href="' + item.href + '" style="color:var(--accent2);font-weight:700">' + label + "</a>";
      }
      return '<a href="' + item.href + '">' + label + "</a>";
    }).join("\n      ");
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
      st.textContent = ".lang-btn{margin-left:.35rem}.cp-nav a{font-weight:600;margin-right:.65rem;font-size:.88rem;line-height:1.6;display:inline-block}";
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
