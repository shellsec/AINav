/**
 * Minimal page title/subtitle i18n for plan pages without full EN dict.
 * Load after plan-nav.js
 */
(function () {
  var META = {
    "model-plan.html": {
      zh: { h1: "🧠 AI 模型选型横评", sub: "2026-09 旗舰：Opus 5.5、GPT-6 Sol/Luna、Grok 4.7、Kimi K3、MiMo-V2.6。决策模型另见专题页。" },
      en: { h1: "🧠 AI Model Selection Guide", sub: "Sept 2026: Opus 5.5, GPT-6 Sol/Luna, Grok 4.7, Kimi K3, MiMo-V2.6. Decision models have their own page." },
    },
    "local-model-plan.html": {
      zh: { h1: "本地模型横评", sub: "按显存选能跑的开源权重：排行榜 × GGUF 量化 × 国内 GPU 街货价。云端旗舰请看模型选型；本地 Agent 配模看 Agent 横评。" },
      en: { h1: "Local Model Guide", sub: "Pick open weights by VRAM: leaderboards, GGUF quants, and GPU street prices. Cloud flagships live on the model page." },
    },
    "decision-model-plan.html": {
      zh: { h1: "决策模型", sub: "System One / 结构化决策：闭源云 API（Jev）与开源权重（Laya 等），不是聊天机器人。" },
      en: { h1: "Decision Models", sub: "System One — hosted Jev and open-weight Laya for software gates, not chatbots." },
    },
    "low-filter-api-plan.html": {
      zh: { h1: "低过滤云 API", sub: "Abliterated / Uncensored 推理 API · 云端调用 · OpenAI 兼容 · 按量计费。" },
      en: { h1: "Low-filter Cloud APIs", sub: "Abliterated / uncensored inference APIs — cloud, OpenAI-compatible, pay-as-you-go." },
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
