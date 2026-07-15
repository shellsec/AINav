/**
 * Minimal page title/subtitle i18n for plan pages without full EN dict.
 * Load after plan-nav.js
 */
(function () {
  var META = {
    "model-plan.html": {
      zh: { h1: "🧠 AI 模型选型横评", sub: "11 款 AI 旗舰模型技术特性 × 适用场景映射（含 Grok 4.5），架构假设深度解析，帮你精准匹配最优模型。" },
      en: { h1: "🧠 AI Model Selection Guide", sub: "Eleven flagship models including Grok 4.5 — capabilities, architecture, and scenario mapping to pick the best fit." },
    },
    "hardware-plan.html": {
      zh: { h1: "🕶️ AI Hardware Plan 硬件横评", sub: "AI硬件产品一站式对比：价格、功能、特性、场景推荐，帮你选出最值得入手的AI硬件。" },
      en: { h1: "🕶️ AI Hardware Comparison", sub: "Compare AI glasses, phones, PCs, and earbuds — price, features, and use-case picks." },
    },
    "ai-factory-plan.html": {
      zh: { h1: "🏭 AI 造物计划", sub: "10x / 100x / 1000x 三档造物路径：设计→打样→上架，工具与成本实测。" },
      en: { h1: "🏭 AI Factory Plan", sub: "10x / 100x / 1000x paths from design to listing — tools and costs verified." },
    },
    "skill-plan.html": {
      zh: { h1: "⚡ AI Skill 最佳实践", sub: "先用起来 > 再选好 > 最后才写 — 一条命令装完三大必装合集，立刻享受生产级 AI 编程" },
      en: { h1: "⚡ AI Skill Best Practices", sub: "Use first, curate second, author last — one-command installs for production AI coding." },
    },
  };

  var page = location.pathname.split("/").pop() || "";
  var pack = META[page];
  if (!pack) return;

  function apply(lang) {
    var d = pack[lang === "en" ? "en" : "zh"] || pack.zh;
    var h1 = document.querySelector(".cp-wrap > h1");
    var sub = document.querySelector(".cp-wrap > .cp-subtitle, .cp-wrap > p.cp-subtitle");
    if (h1 && d.h1) h1.textContent = d.h1;
    if (sub && d.sub) sub.textContent = d.sub;
  }

  function getLang() {
    try {
      return localStorage.getItem("ainav-lang") === "en" ? "en" : "zh";
    } catch (e) {
      return "zh";
    }
  }

  apply(getLang());
  document.addEventListener("ainav-lang-change", function (e) {
    apply((e.detail && e.detail.lang) || getLang());
  });
})();
