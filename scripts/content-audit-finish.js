/**
 * Final content audit completion — 2026-06-26
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const MEDIA = ["video-plan.html", "image-plan.html", "voice-plan.html", "music-plan.html", "learning-plan.html", "search-plan.html"];

function stripFooterDuplicateUpdated(html) {
  return html.replace(
    /(<div class="cp-footer">\s*)<p class="cp-updated-line"><span class="cp-updated">最后更新：2026-06-26<\/span><\/p>\s*(<p>数据来源)/,
    "$1$2"
  );
}

function patchVideo(s) {
  if (!s.includes("Google Veo 3")) {
    const veoCard = `
      <!-- 2b. Google Veo 3 -->
      <div class="cp-platform overseas">
        <div class="cp-platform-head">
          <span class="cp-platform-name"><a href="https://deepmind.google/models/veo/" target="_blank" rel="noopener noreferrer">Google Veo 3</a></span>
          <span class="cp-badge badge-overseas">🌍</span>
          <span class="cp-badge badge-hot">🔥 热门</span>
        </div>
        <div class="cp-platform-body">
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>说明</th><th>备注</th></tr></thead>
            <tbody>
              <tr><td class="plan-name">Gemini Free</td><td class="plan-price">$0</td><td>有限 Veo 3 Fast 预览</td><td class="plan-limit">需 Google 账号</td></tr>
              <tr><td class="plan-name">Google AI Pro</td><td class="plan-price">$19.99/月</td><td>含 Flow / Veo 3 创作额度</td><td class="plan-limit">消费级</td></tr>
              <tr><td class="plan-name">Google AI Ultra</td><td class="plan-price">$249.99/月</td><td>更高 Veo 3 额度</td><td class="plan-limit">含 Gemini 3.1 Pro</td></tr>
              <tr><td class="plan-name">Vertex API</td><td class="plan-price">按秒</td><td>Veo 3 / Veo 3 Fast</td><td class="plan-limit">约 $0.40–0.75/秒（以官网为准）</td></tr>
            </tbody>
          </table>
          <div class="feat-tags">
            <span class="feat-tag yes">文生视频</span><span class="feat-tag yes">图生视频</span><span class="feat-tag yes">音频同步</span>
            <span class="feat-tag yes">4K</span><span class="feat-tag yes">API</span><span class="feat-tag no">数字人</span>
          </div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:.4rem">Google DeepMind 旗舰视频模型，2026 年通过 Gemini / Flow / Vertex 提供；API 按秒计费偏贵但画质顶级</div>
        </div>
      </div>

`;
    s = s.replace("      <!-- 3. Sora (OpenAI) -->", veoCard + "      <!-- 3. Sora (OpenAI) -->");
  }
  s = s.replace(
    /<tr><td>Pika<\/td><td class="yes">✓<\/td><td class="yes">✓<\/td><td class="yes">✓<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td class="yes">✓<\/td><td class="yes">✓<\/td><td class="yes">✓<\/td><\/tr>\s*<tr><td>Sora/,
  '<tr><td>Pika</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td></tr>\n            <tr><td>Veo 3</td><td class="yes">✓</td><td class="yes">✓</td><td>—</td><td>—</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td></tr>\n            <tr><td>Sora'
  );
  s = s.replace(/约300张图\/天/g, "约30–60个5s视频/日");
  s = s.replace(/追平Runway Gen-3/g, "追平 Runway Gen-4");
  s = s.replace(
    /<span class="cp-badge badge-hot">🔥 热门<\/span>\s*<span class="cp-badge badge-new">✨ 新品<\/span>\s*<\/div>\s*<div class="cp-platform-body">\s*<table class="cp-table">\s*<thead><tr><th>套餐<\/th><th>月价<\/th><th>积分\/月<\/th><th>视频时长<\/th><th>备注<\/th><\/tr><\/thead>/,
    (m) => m.replace('<span class="cp-badge badge-new">✨ 新品</span>\n        ', "")
  );
  s = s.replace(
    /<span class="cp-badge badge-new">✨ 新品<\/span>\s*<\/div>\s*<div class="cp-platform-body">\s*<table class="cp-table">\s*<thead><tr><th>套餐<\/th><th>月价<\/th><th>说明<\/th><th>备注<\/th><\/tr><\/thead>\s*<tbody>\s*<tr><td class="plan-name">免费版<\/td><td class="plan-price">¥0<\/td><td>有限额度，带水印<\/td>/g,
    '<span class="cp-badge badge-hot">🔥</span>\n        </div>\n        <div class="cp-platform-body">\n          <table class="cp-table">\n            <thead><tr><th>套餐</th><th>月价</th><th>说明</th><th>备注</th></tr></thead>\n            <tbody>\n              <tr><td class="plan-name">免费版</td><td class="plan-price">¥0</td><td>有限额度，带水印</td>'
  );
  s = s.replace(
    /<div>⚠️ <strong>注意：<\/strong>Google Veo API \$0\.75\/秒为最贵，Sora 无独立 API<\/div>/,
    '<div>🌍 <strong>海外旗舰：</strong><a href="https://deepmind.google/models/veo/" target="_blank" rel="noopener noreferrer">Google Veo 3</a> — Gemini Ultra / Vertex API</div>\n              <div>⚠️ <strong>注意：</strong>Veo API 约 $0.40–0.75/秒；Sora 已停服无独立 API</div>'
  );
  s = s.replace(/<meta name="description" content="[^"]*Sora[^"]*">/, '<meta name="description" content="AI视频生成套餐横向对比：可灵AI、即梦Seedance、海螺AI、Vidu、Runway、Pika、Google Veo 3、Luma、HeyGen价格功能积分对比。">');
  return s;
}

function patchImage(s) {
  s = s.replace(/<!-- 2\. DALL-E 3 \/ ChatGPT -->/g, "<!-- 2. GPT Image / ChatGPT -->");
  s = s.replace(/<tr><td>DALL-E 3<\/td>/g, "<tr><td>GPT Image</td>");
  s = s.replace(/DALL-E 3（ChatGPT Plus）/g, "GPT Image（ChatGPT Plus）");
  s = s.replace(/DALL-E 3 和 Midjourney/g, "GPT Image 和 Midjourney");
  s = s.replace(
    /<span class="feat-tag no">API<\/span>\s*<\/div>\s*<div style="font-size:.76rem;color:var(--muted);margin-top:.4rem">AI绘画画质天花板/,
    '<span class="feat-tag yes">API</span>\n          </div>\n          <div style="font-size:.76rem;color:var(--muted);margin-top:.4rem">AI绘画画质天花板'
  );
  s = s.replace(/V7模型<\/span><span class="feat-tag no">模型训练<\/span><span class="feat-tag no">API<\/span>/, "V7模型</span><span class=\"feat-tag no\">模型训练</span><span class=\"feat-tag yes\">API</span>");
  s = s.replace(
    /<meta name="description" content="AI图像生成套餐横向对比：Midjourney、DALL-E、Leonardo/,
    '<meta name="description" content="AI图像生成套餐横向对比：Midjourney、GPT Image、Leonardo'
  );
  return s;
}

function patchSearch(s) {
  s = s.replace(/Kimi免费版支持无限对话/g, "Kimi 免费版支持高额额度");
  s = s.replace(/Kimi无限对话 vs Perplexity/g, "Kimi 高额免费额度 vs Perplexity");
  s = s.replace(
    /<tr><td>Kimi<\/td><td class="yes">✓<\/td><td>—<\/td>/,
    '<tr><td>Kimi</td><td class="yes">✓</td><td class="yes">✓</td>'
  );
  if (!s.includes("<td>夸克AI</td>")) {
    s = s.replace(
      /<tr><td>天工AI<\/td><td class="yes">✓<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td class="yes">✓<\/td><td>—<\/td><td>—<\/td><\/tr>/,
      '<tr><td>天工AI</td><td class="yes">✓</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="yes">✓</td><td>—</td><td>—</td></tr>\n            <tr><td>夸克AI</td><td class="yes">✓</td><td class="yes">✓</td><td>—</td><td>—</td><td>—</td><td class="yes">✓</td><td class="yes">✓</td><td>—</td></tr>'
    );
  }
  return s;
}

function patchMusic(s) {
  s = s.replace(
    /<tr><td class="plan-name">Pro<\/td><td class="plan-price">\$30\/月<\/td><td>1500首<\/td>/,
    '<tr><td class="plan-name">Pro</td><td class="plan-price">$30/月</td><td>~1,500 credits</td>'
  );
  s = s.replace(/500首\+商用权/g, "~500 credits + 商用权");
  s = s.replace(/商用权\+500首/g, "商用权 + ~500 credits");
  s = s.replace(/500首\/月、商用权/g, "~500 credits/月、商用权");
  return s;
}

function patchVoice(s) {
  s = s.replace(/speech-to-text/g, "text-to-speech");
  return s;
}

function patchLearning(s) {
  s = s.replace(
    /<span class="cp-platform-name"><a href="https:\/\/www\.coursera\.org\/"[^>]*>Coursera<\/a><\/span>\s*<span class="cp-badge badge-overseas">🌍<\/span>\s*<span class="cp-badge badge-new">✨ 新品<\/span>/,
    '<span class="cp-platform-name"><a href="https://www.coursera.org/" target="_blank" rel="noopener noreferrer">Coursera</a></span>\n          <span class="cp-badge badge-overseas">🌍</span>'
  );
  return s;
}

function patchCoding(s) {
  s = s.replace(/无限用量/g, "高额度 Cascade（以官网 credits 为准）");
  s = s.replace(
    /<td class="plan-models"><a href="https:\/\/z\.ai\/"[^>]*>GLM-5\.1<\/a>, <a href="https:\/\/z\.ai\/"[^>]*>GLM-5-Turbo<\/a><\/td>/g,
    '<td class="plan-models"><a href="https://z.ai/" target="_blank" rel="noopener noreferrer">GLM-5.2</a>, <a href="https://z.ai/" target="_blank" rel="noopener noreferrer">GLM-5-Turbo</a></td>'
  );
  s = s.replace(/GLM-5\.1<\/a>, <a href="https:\/\/z\.ai\/"[^>]*>GLM-5-Turbo<\/a>, <a href="https:\/\/z\.ai\/"[^>]*>GLM-5<\/a>/g, 'GLM-5.2</a>, <a href="https://z.ai/" target="_blank" rel="noopener noreferrer">GLM-5-Turbo</a>, <a href="https://z.ai/" target="_blank" rel="noopener noreferrer">GLM-5</a>');
  s = s.replace(
    /<tr><td>GPT-4\.1 Nano \(2026\)<\/td>/,
    '<tr><td>GPT-5 (2026)</td><td class="price-new">$2 / $8</td><td class="price-drop">旗舰档</td></tr>\n                <tr><td>GPT-4.1 Nano (2026)</td>'
  );
  return s;
}

function patchAgent(s) {
  s = s.replace(/GPT-4\.1 \/ o3 系列模型/g, "GPT-5 / Codex 系列模型");
  return s;
}

function patchHardware(s) {
  if (!s.includes("INMO GO3")) {
    const inmo = `
  <div class="hw-card"><div class="hw-card-head"><div class="hw-card-name"><a href="https://www.inmoxr.com/" target="_blank" rel="noopener noreferrer">INMO GO3</a> <span class="cp-badge badge-hot">🔥</span> <span class="cp-badge badge-cn">🇨🇳</span></div><div class="hw-card-price">¥2,699起</div></div>
  <div class="hw-card-body"><ul><li><strong>AI：</strong>通义千问 + INMO AI 助手，轻量 AR 信息提示</li><li><strong>显示：</strong>单色/全彩光波导，日常信息叠加</li><li><strong>拍摄：</strong>第一视角拍照，AI 识物问答</li><li><strong>续航：</strong>约 4–5 小时</li></ul>
  <div class="hw-specs"><span class="hw-spec s-good">轻薄</span><span class="hw-spec s-good">中文AI</span><span class="hw-spec s-good">性价比</span><span class="hw-spec s-warn">生态较新</span></div></div>
  <div class="hw-card-foot">2026 国产 AI 眼镜热门款，适合日常佩戴尝鲜</div></div>
`;
    s = s.replace(
      '<div class="hw-card-foot">✅ 国内最推荐的AI眼镜，中文体验领先</div></div>',
      '<div class="hw-card-foot">✅ 国内最推荐的AI眼镜，中文体验领先</div></div>' + inmo
    );
    s = s.replace(
      "<tr><td>Rokid</td>",
      '<tr><td>INMO GO3</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td></tr>\n<tr><td>Rokid</td>'
    );
  }
  if (!s.includes("Pixel 10 Pro")) {
    const pixel = `
  <div class="hw-card"><div class="hw-card-head"><div class="hw-card-name"><a href="https://store.google.com/" target="_blank" rel="noopener noreferrer">Google Pixel 10 Pro</a> <span class="cp-badge badge-new">✨</span> <span class="cp-badge badge-overseas">🌍</span></div><div class="hw-card-price">¥7,999起（参考）</div></div>
  <div class="hw-card-body"><ul><li><strong>AI：</strong>Gemini Nano 端侧 + 云端 Gemini 3.1，Call Screen / 圈选搜索</li><li><strong>拍照：</strong>AI 最佳取景、魔术橡皮擦、视频增强</li><li><strong>优势：</strong>原生 Android AI 体验最完整</li><li>⚠️国行：需海淘/港版，国内服务受限</li></ul>
  <div class="hw-specs"><span class="hw-spec s-good">Gemini原生</span><span class="hw-spec s-good">端侧AI</span><span class="hw-spec s-good">拍照AI</span><span class="hw-spec s-warn">国内难买</span></div></div>
  <div class="hw-card-foot">海外 Android AI 标杆，与矩阵「Pixel」行对应</div></div>
`;
    s = s.replace(
      '<div class="hw-card-foot">商务/出国场景首选</div></div>',
      '<div class="hw-card-foot">商务/出国场景首选</div></div>' + pixel
    );
    s = s.replace(
      "<tr><td>谷歌</td><td class=\"partial\">⭐3</td><td class=\"yes\">⭐4.5</td>",
      '<tr><td>Pixel</td><td class="partial">⭐3.5</td><td class="yes">⭐4.5</td>'
    );
  }
  s = s.replace(/¥2,199起/g, "¥2,299起");
  s = s.replace(/Recall隐私争议/g, "隐私功能视地区");
  s = s.replace(/\$349 \+ ¥72\/月订阅/g, "$349 + $5.99/月订阅");
  return s;
}

function patchAiFactory(s) {
  s = s.replace(
    /<div class="af-tool-price">\$20\/月<\/div><\/div>\s*<div class="af-tool-body"><ul><li><strong>能力：<\/strong>写ESP32/,
    '<div class="af-tool-price">$20/月 Pro</div></div>\n  <div class="af-tool-body"><ul><li><strong>能力：</strong>写ESP32'
  );
  s = s.replace(
    /编程环节核心工具<\/div><\/div>/,
    '编程环节核心工具（Agent 用量池另计）</div></div>'
  );
  if (!s.includes("video-plan.html")) {
    s = s.replace(
      /<div class="cp-section-hd af-hd" style="font-size:.95rem;margin-top:1rem"><span class="cp-flag">6<\/span> 视频剪辑/,
      '<div class="cp-section-hd af-hd" style="font-size:.95rem;margin-top:1rem"><span class="cp-flag">6</span> 视频剪辑 — <a href="video-plan.html" style="font-size:.76rem;font-weight:400;margin-left:.4rem">视频套餐横评</a>'
    );
  }
  s = s.replace(/ChatGPT ¥140\/月/g, "ChatGPT Plus ~$20/月（约 ¥145）");
  s = s.replace(
    /<li><strong>工具：<\/strong>ChatGPT \/ GLM<\/li>/,
    "<li><strong>工具：</strong>Cursor / Claude Code / Codex CLI + GLM</li>"
  );
  s = s.replace(
    /<div class="af-tool-price">¥1,599<\/div>/,
    '<div class="af-tool-price">¥1,299起</div>'
  );
  return s;
}

for (const f of MEDIA) {
  let s = fs.readFileSync(path.join(ROOT, f), "utf8");
  s = stripFooterDuplicateUpdated(s);
  if (f === "video-plan.html") s = patchVideo(s);
  if (f === "image-plan.html") s = patchImage(s);
  if (f === "search-plan.html") s = patchSearch(s);
  if (f === "music-plan.html") s = patchMusic(s);
  if (f === "voice-plan.html") s = patchVoice(s);
  if (f === "learning-plan.html") s = patchLearning(s);
  fs.writeFileSync(path.join(ROOT, f), s);
  console.log("finished", f);
}

let coding = patchCoding(fs.readFileSync(path.join(ROOT, "coding-plan.html"), "utf8"));
coding = stripFooterDuplicateUpdated(coding);
fs.writeFileSync(path.join(ROOT, "coding-plan.html"), coding);

let agent = patchAgent(fs.readFileSync(path.join(ROOT, "agent-plan.html"), "utf8"));
agent = stripFooterDuplicateUpdated(agent);
fs.writeFileSync(path.join(ROOT, "agent-plan.html"), agent);

let model = stripFooterDuplicateUpdated(fs.readFileSync(path.join(ROOT, "model-plan.html"), "utf8"));
fs.writeFileSync(path.join(ROOT, "model-plan.html"), model);

let hw = patchHardware(fs.readFileSync(path.join(ROOT, "hardware-plan.html"), "utf8"));
fs.writeFileSync(path.join(ROOT, "hardware-plan.html"), hw);

let af = patchAiFactory(fs.readFileSync(path.join(ROOT, "ai-factory-plan.html"), "utf8"));
fs.writeFileSync(path.join(ROOT, "ai-factory-plan.html"), af);

console.log("finished core plans");
