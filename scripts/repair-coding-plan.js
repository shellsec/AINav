#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, '..', 'coding-plan.html');
let s = fs.readFileSync(fp, 'utf8');

function rep(from, to) {
  if (typeof from === 'string') {
    if (!s.includes(from)) return false;
    s = s.split(from).join(to);
    return true;
  }
  const before = s;
  s = s.replace(from, to);
  return s !== before;
}

// --- Mechanical ---
rep(/\uFFFD(\d)/g, '¥$1');
rep(/class="yes">\?<\/td>/g, 'class="yes">✓</td>');
rep(/class="no">\?<\/td>/g, 'class="no">—</td>');
rep(/\$(\d+(?:\.\d+)?)\/\?/g, '$$$1/月');
rep(/\$(\d+)\/\?\?\/\?/g, '$$$1/人/月');
rep(/plan-price-orig">\?\?7\?/g, 'plan-price-orig">/首7折');
rep(/plan-price-orig">\?\?8\?/g, 'plan-price-orig">/首8折');
rep(/plan-price-orig">\?\?9\?/g, 'plan-price-orig">/首9折');
rep(/plan-price-orig">\?\?88\?/g, 'plan-price-orig">/首88折');
rep(/plan-price-orig">\?\?88\?/g, 'plan-price-orig">/首88折');
rep(/>\?(\d)\?Claude/g, '>≈$1×Claude');
rep(/>\?(\d)\?Lite/g, '>≈$1×Lite');
rep(/>\?(\d)\?Pro/g, '>≈$1×Pro');
rep(/>\?Lite \+/g, '>同Lite +');
rep(/>\?Lite<\/td>/g, '>同Lite</td>');
rep(/\?Token/g, '按Token');
rep(/(\d{3,5})\?(?=<\/td>)/g, '$1次');
rep(/Max 1\?/g, 'Max 1×');
rep(/Max 2\?/g, 'Max 2×');
rep(/M2\.7 \?\?\?/g, 'M2.7 高速版');
rep(/Plus \?\?\?/g, 'Plus 高速版');
rep(/Max \?\?\?/g, 'Max 高速版');
rep(/Ultra \?\?\?/g, 'Ultra 高速版');
rep(/MCP\?\?\?\?/g, 'MCP深度集成');
rep(/MCP\?\?\?\?\?\?/g, 'MCP深度集成');
rep(/长程任务\+优先队列/g, '长程任务+优先队列');
rep(/price-drop">\?(\d+)/g, 'price-drop">↓$1');
rep(/val-high">\?<\/td>/g, 'val-high">∞</td>');

// --- Nav ---
rep(
  /<div class="cp-nav" data-plan-nav>[\s\S]*?<\/div>\s*<div class="cp-toolbar">/,
  `<div class="cp-nav" data-plan-nav>
      <a href="index.html">← AINav 首页</a>
      <a href="coding-plan.html">编程套餐横评</a>
      <a href="agent-plan.html">Agent横评</a> · <a href="model-plan.html">模型选型</a>
      <a href="video-plan.html">视频套餐横评</a>
      <a href="image-plan.html">图像套餐横评</a>
      <a href="music-plan.html">音乐套餐横评</a>
      <a href="search-plan.html">搜索套餐横评</a>
      <a href="voice-plan.html">语音套餐横评</a>
      <a href="learning-plan.html">学习套餐横评</a>
      <a href="hardware-plan.html">硬件横评</a>
      <a href="ai-factory-plan.html">AI造物</a>
      <a href="skill-plan.html">Skill最佳实践</a> · <a href="ai-encyclopedia-2026.html">AI百科</a>
    </div>
      <div class="cp-toolbar">`
);

// --- Promo ---
rep(
  /<div style="margin-bottom:1rem;padding:\.55rem[\s\S]*?<\/div>\s*<div class="cp-title-row">/,
  `<div style="margin-bottom:1rem;padding:.55rem .85rem;border-radius:8px;border:1px solid var(--border);background:var(--card);display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.35rem .6rem;font-size:.84rem;line-height:1.5;">
      <span style="color:var(--muted)"><strong style="color:var(--text)">OpenAI: GPT-5</strong> <span style="color:var(--muted)">/</span> <strong style="color:var(--text)">Anthropic: Claude Opus</strong> <span style="color:var(--muted)">/</span> <strong style="color:var(--text)">Google: Gemini 旗舰模型</strong> <span style="color:var(--muted)">· 国内直连免梯</span> <span class="plan-promo-code" data-code="AFF_BB0FNC" style="color:var(--accent2);font-weight:600;cursor:pointer" title="点击复制优惠码">$2 试用 AFF_BB0FNC</span> <a href="https://ofox.io/x/aiv123" target="_blank" rel="noopener noreferrer sponsored" style="display:inline-flex;align-items:center;font-size:.78rem;font-weight:600;color:var(--accent2);padding:.2rem .55rem;border-radius:5px;border:1px solid rgba(63,185,80,.4);background:rgba(63,185,80,.1);text-decoration:none;white-space:nowrap;">立即注册</a>
    </div>
        <div class="cp-title-row">`
);

// --- Legend ---
rep(
  /<!-- Legend -->[\s\S]*?<!-- ==================== \?\? Coding Plan/,
  `<!-- Legend -->
    <div class="cp-legend">
      <div class="cp-legend-item"><span class="cp-badge badge-rush">⏰ 抢购</span> 限时/秒杀</div>
      <div class="cp-legend-item"><span class="cp-badge badge-hot">🔥 性价比</span> 高性价比</div>
      <div class="cp-legend-item"><span class="cp-badge badge-new">🆕 新品</span> 首月特惠</div>
      <div class="cp-legend-item"><span class="cp-badge badge-rec">推荐</span> 编辑推荐</div>
      <div class="cp-legend-item"><span class="cp-badge badge-overseas">海外</span> 需科学上网</div>
    </div>

    <!-- ==================== 国内 Coding Plan`
);
rep(/<div class="cp-section-hd"><span class="cp-flag">\?\?\?\?<\/span> \?\? Coding Plan<\/div>/, '<div class="cp-section-hd"><span class="cp-flag">🇨🇳</span> 国内 Coding Plan</div>');
rep(/<div class="cp-section-hd overseas-hd"><span class="cp-flag">\?\?<\/span> \?\? Coding Plan/, '<div class="cp-section-hd overseas-hd"><span class="cp-flag">🌍</span> 海外 Coding Plan');

// --- Table headers ---
const theads = [
  [/<thead><tr><th>\?\?<\/th><th>\?\?<\/th><th>\?\?\?\?<\/th><th>\?\?\?\?<\/th><th>\?\?<\/th><\/tr><\/thead>/g, '<thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>用量参考</th><th>备注</th></tr></thead>'],
  [/<thead><tr><th>\?\?<\/th><th>\?\?<\/th><th>\?\?\?\?<\/th><th>\?\?\/5h<\/th><th>\?\?<\/th><\/tr><\/thead>/g, '<thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>用量/5h</th><th>备注</th></tr></thead>'],
  [/<thead><tr><th>\?\?<\/th><th>\?\?<\/th><th>\?\?<\/th><th>\?\?<\/th><\/tr><\/thead>/g, '<thead><tr><th>套餐</th><th>月价</th><th>说明</th><th>备注</th></tr></thead>'],
  [/<thead><tr><th>\?\?<\/th><th>\?\?<\/th><th>\?\?\?\?<\/th><th>\?\?<\/th><\/tr><\/thead>/g, '<thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>说明</th></tr></thead>'],
  [/<thead><tr><th>\?\?<\/th><th>\?\?\?\?<\/th><th>\?\?\?<\/th><\/tr><\/thead>/g, '<thead><tr><th>工具</th><th>兼容套餐数</th><th>覆盖率</th></tr></thead>'],
  [/<thead><tr><th>\?\?<\/th><th>\?\?<\/th><th>\?\?<\/th><th>\?\?<\/th><th>\?\?\?\?\(\?\)<\/th><th>\?\?\?\?\?<\/th><th>\?\?\?<\/th><\/tr><\/thead>/g, '<thead><tr><th>排名</th><th>平台</th><th>套餐</th><th>月价</th><th>估算Token(万)</th><th>性价比指数</th><th>相对值</th></tr></thead>'],
  [/<thead><tr><th>\?\?<\/th><th>\?\? \/ \?\? \(百万Token\)<\/th><th>\?\?<\/th><\/tr><\/thead>/g, '<thead><tr><th>型号</th><th>输入 / 输出 (百万Token)</th><th>降幅</th></tr></thead>'],
  [/<thead><tr><th>\?\?\?\?<\/th><th>\?\? \(百万\)<\/th><th>\?\? \(百万\)<\/th><\/tr><\/thead>/g, '<thead><tr><th>能力档位</th><th>输入 (百万)</th><th>输出 (百万)</th></tr></thead>'],
];
theads.forEach(([a, b]) => rep(a, b));

// --- Badges ---
[
  [/badge-hot">\?\? \?\?/g, 'badge-hot">🔥 性价比'],
  [/badge-rush">\? \?\?/g, 'badge-rush">⏰ 抢购'],
  [/badge-new">\? \?\?\?\?/g, 'badge-new">🆕 首月特惠'],
  [/badge-new">\? \?\?/g, 'badge-new">🆕 新品'],
  [/badge-rec">\?\?/g, 'badge-rec">推荐'],
  [/badge-overseas">\?\?/g, 'badge-overseas">海外'],
  [/cp-rush-time">\? \?\?10:00\?\?/g, 'cp-rush-time">⏰ 每日10:00开抢'],
  [/cp-rush-time">\? \?\?9:30\?\?/g, 'cp-rush-time">⏰ 每日9:30开抢'],
].forEach(([a, b]) => rep(a, b));

// --- Platform names ---
rep('>?? GLM</a>', '>智谱 GLM</a>');
rep('>?? GLM ??? (Z.AI)</a>', '>智谱 GLM 国际版 (Z.AI)</a>');
rep('class="plan-name">??GLM</td>', 'class="plan-name">智谱GLM</td>');
rep('>?? GLM ??? (Z.AI)</a>', '>智谱 GLM 国际版 (Z.AI)</a>');
rep('title="GLM??????">??????</a>', 'title="GLM Coding Plan 开源工具">开源工具集</a>');
rep('volcengine.com/activity/codingplan" target="_blank" rel="noopener noreferrer">??????</a>', 'volcengine.com/activity/codingplan" target="_blank" rel="noopener noreferrer">火山方舟</a>');
rep('aliyun.com/benefit/scene/codingplan" target="_blank" rel="noopener noreferrer">?????</a>', 'aliyun.com/benefit/scene/codingplan" target="_blank" rel="noopener noreferrer">阿里云百炼</a>');
rep('kimi.com/code" target="_blank" rel="noopener noreferrer">Kimi??????</a>', 'kimi.com/code" target="_blank" rel="noopener noreferrer">Kimi Coding Plan</a>');
rep('cloud.tencent.com/act/pro/codingplan" target="_blank" rel="noopener noreferrer">???</a>', 'cloud.tencent.com/act/pro/codingplan" target="_blank" rel="noopener noreferrer">腾讯云</a>');
rep('deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek??????</a>', 'deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek（API按量）</a>');
rep('xiaomimimo.com/token-plan" target="_blank" rel="noopener noreferrer">???MiMo?</a>', 'xiaomimimo.com/token-plan" target="_blank" rel="noopener noreferrer">小米 MiMo</a>');
rep('class="plan-name">?????</td>', 'class="plan-name">阿里云百炼</td>');
rep('class="plan-name">????</td>', 'class="plan-name">火山方舟</td>');
rep('class="plan-name">???</td>', 'class="plan-name">腾讯云</td>');
rep('class="plan-name">??</td>', 'class="plan-name">小米</td>');

// Z.AI duplicate GLM-5.2 -> GLM-5
rep('GLM-5-Turbo</a>, <a href="https://z.ai/" target="_blank" rel="noopener noreferrer">GLM-5.2</a>', 'GLM-5-Turbo</a>, <a href="https://z.ai/" target="_blank" rel="noopener noreferrer">GLM-5</a>');

// --- Volcengine description ---
rep(
  /<div style="font-size:\.78rem;color:var\(--muted\);margin-bottom:\.5rem;line-height:1\.6">\s*\?\?\?\?\?\?\?\?\?\?\?\?\?\?/,
  `<div style="font-size:.78rem;color:var(--muted);margin-bottom:.5rem;line-height:1.6">
            火山方舟 Coding Plan 聚合多家模型：`
);
rep(/Claude Code\?Cursor \?\?\?\?\?\?\?\?/, 'Claude Code、Cursor 等主流工具。');
rep(
  /<div style="font-size:\.78rem;color:var\(--muted\);margin-bottom:\.5rem;line-height:1\.6">[\s\S]*?<\/div>\s*<table class="cp-table">\s*<thead><tr><th>套餐<\/th><th>月价<\/th><th>核心模型<\/th><th>用量参考<\/th>/,
  `<div style="font-size:.78rem;color:var(--muted);margin-bottom:.5rem;line-height:1.6">
            火山方舟 Coding Plan 聚合多家模型：<strong>Doubao-Seed-2.0-pro/lite/Code</strong>、<strong>Doubao-Seed-Code</strong>、<strong>GLM-5.2</strong>、<strong>MiniMax-M2.7</strong>、<strong>Kimi-K2.6</strong>、<strong>DeepSeek-V4-Pro</strong>、<strong>DeepSeek-V4-Flash</strong> 等；支持多工具接入与 Auto 路由，兼容 Claude Code、Cursor 等主流工具。
          </div>
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>用量参考</th>`
);

// Volcengine cells
rep('??Claude Pro', '≈Claude Pro');
rep('5?Lite / ??Claude Max', '5×Lite / ≈Claude Max');
rep('?ArkClaw???', '含ArkClaw等');
rep('?????? / Auto??', '多模型聚合 / Auto路由');
rep('?Lite + Doubao-Seed-2.0-pro + ?????', '同Lite + Doubao-Seed-2.0-pro + 旗舰模型');

// Aliyun cells
rep('??7.9', '首月¥7.9');
rep('??39.9', '首月¥39.9');
rep('??7.9 Lite???', '首月¥7.9 · Lite尝鲜价');
rep('??39.9 <span class="cp-rush-time">? ??9:30???</span>', '首月¥39.9 · <span class="cp-rush-time">⏰ 每日9:30秒杀</span>');

rep('?????+????', '长程任务+优先队列');
rep('MCP????', 'MCP深度集成');

// Kimi — 按行精确替换
rep('<td class="plan-limit">????</td>\n                <td></td>\n              </tr>\n              <tr>\n                <td class="plan-name">Moderato', '<td class="plan-limit">轻度用量</td>\n                <td></td>\n              </tr>\n              <tr>\n                <td class="plan-name">Moderato');
rep('<td class="plan-limit">??????</td>\n                <td>?????</td>', '<td class="plan-limit">中度用量</td>\n                <td>优先队列</td>');
rep('<td class="plan-limit">?????</td>', '<td class="plan-limit">重度用量</td>');
rep('<td class="plan-limit">????</td>\n                <td></td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n      <!-- 7.', '<td class="plan-limit">无限用量</td>\n                <td></td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n      <!-- 7.');

// Tencent
rep('?9000/?18000', '≈9000/≈18000');
rep('?45000/?90000', '≈45000/≈90000');

// DeepSeek API row — 精确替换
rep('API ?? <span', 'API 按量 <span');
rep('<td class="plan-limit">??????</td>\n                <td>????????</td>\n              </tr>\n              <tr>\n                <td class="plan-name">API', '<td class="plan-limit">免费额度</td>\n                <td>开源模型全家桶</td>\n              </tr>\n              <tr>\n                <td class="plan-name">API');
rep('<td class="plan-limit">????</td>\n                <td>V4-Pro', '<td class="plan-limit">按量计费</td>\n                <td>V4-Pro');

// MiMo — 精确
rep('Credit?????5h??', 'Credit 按量；5h 窗口');
rep('含 Omni/TTS 多模态', '含 Omni/TTS 多模态');
rep('Pro 256k??2x?1M??4x', 'Pro 256k为2x，1M为4x');
rep('??????$100/?', '约合海外 $100/月');

// Overseas sponsor
rep(
  /<a class="cp-sponsor" href="https:\/\/ofox\.io\/x\/aiv123"[^>]*>[\s\S]*?<\/a>/,
  '<a class="cp-sponsor" href="https://ofox.io/x/aiv123" target="_blank" rel="noopener noreferrer"><span class="sp-tag">赞助</span> 想用 GPT-5/Claude Opus/Gemini Pro 但无梯？OfoxAI 一个 API Key 直连 100+ 模型，OpenAI 兼容格式 →</a>'
);

// --- Claude Code ---
rep(
  /<!-- Claude Code -->[\s\S]*?<!-- GitHub Copilot -->/,
  `<!-- Claude Code -->
      <div class="cp-platform overseas">
        <div class="cp-platform-head">
          <span class="cp-platform-name"><a href="https://claude.ai/" target="_blank" rel="noopener noreferrer">Claude Code (Anthropic)</a></span>
          <span class="cp-badge badge-overseas">海外</span>
          <span class="cp-badge badge-hot">🔥 性价比</span>
        </div>
        <div class="cp-platform-body">
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>说明</th></tr></thead>
            <tbody>
              <tr>
                <td class="plan-name">Pro</td>
                <td class="plan-price">$20/月</td>
                <td class="plan-models"><a href="https://www.anthropic.com/" target="_blank" rel="noopener noreferrer">Claude Sonnet 4.6</a></td>
                <td class="plan-limit">日常编码；约30-45小时/月</td>
              </tr>
              <tr>
                <td class="plan-name">Max 1× <span class="cp-badge badge-rec">推荐</span></td>
                <td class="plan-price">$100/月</td>
                <td class="plan-models"><a href="https://www.anthropic.com/" target="_blank" rel="noopener noreferrer">Opus 4.8</a>, <a href="https://www.anthropic.com/claude/fable" target="_blank" rel="noopener noreferrer">Fable 5</a>（暂停）, Sonnet 4.6</td>
                <td class="plan-limit">长程 Agent；Fable 5 于 6/12 起全球暂停，回落 Opus 4.8</td>
              </tr>
              <tr>
                <td class="plan-name">Max 2×</td>
                <td class="plan-price">$200/月</td>
                <td class="plan-models"><a href="https://www.anthropic.com/" target="_blank" rel="noopener noreferrer">Opus 4.8</a>, Sonnet 4.6, Fable 5（恢复后）</td>
                <td class="plan-limit">重度 AI 编程用户首选</td>
              </tr>
              <tr>
                <td class="plan-name">API 按量</td>
                <td class="plan-price">按Token</td>
                <td class="plan-models"><a href="https://www.anthropic.com/" target="_blank" rel="noopener noreferrer">Opus 4.8</a> ~$15/$75 (输入/输出百万Token)</td>
                <td class="plan-limit">15-20倍于 $0.5-2 档套餐</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- GitHub Copilot -->`
);

// --- Cursor overseas block ---
rep(
  /<!-- Cursor -->[\s\S]*?<!-- Claude Code -->/,
  `<!-- Cursor -->
      <div class="cp-platform overseas">
        <div class="cp-platform-head">
          <span class="cp-platform-name"><a href="https://cursor.sh/" target="_blank" rel="noopener noreferrer">Cursor</a></span>
          <span class="cp-badge badge-overseas">海外</span>
          <span class="cp-badge badge-hot">🔥 性价比</span>
        </div>
        <div class="cp-platform-body">
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>说明</th><th>备注</th></tr></thead>
            <tbody>
              <tr>
                <td class="plan-name">Free</td>
                <td class="plan-price">$0</td>
                <td class="plan-models">有限补全</td>
                <td class="plan-limit"></td>
              </tr>
              <tr>
                <td class="plan-name">Pro <span class="cp-badge badge-rec">推荐</span></td>
                <td class="plan-price">$20/月</td>
                <td class="plan-models">无限补全 + 500次快速请求 + Agent模式</td>
                <td class="plan-limit">个人版</td>
              </tr>
              <tr>
                <td class="plan-name">Business</td>
                <td class="plan-price">$40/人/月</td>
                <td class="plan-models">团队管理 + 策略管控</td>
                <td class="plan-limit">团队版</td>
              </tr>
              <tr>
                <td class="plan-name">Ultra</td>
                <td class="plan-price">$200/月</td>
                <td class="plan-models">20倍 Pro 额度</td>
                <td class="plan-limit">重度用户</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- GitHub Copilot -->`
);

// Copilot / Codex / Windsurf / Google — 整块替换
rep(
  /<!-- GitHub Copilot -->[\s\S]*?<\/div>\s*<\/div>\s*\n\n    <\/div><!-- \/cp-platforms/,
  `<!-- GitHub Copilot -->
      <div class="cp-platform overseas">
        <div class="cp-platform-head">
          <span class="cp-platform-name"><a href="https://github.com/features/copilot" target="_blank" rel="noopener noreferrer">GitHub Copilot</a></span>
          <span class="cp-badge badge-overseas">海外</span>
        </div>
        <div class="cp-platform-body">
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>说明</th><th>备注</th></tr></thead>
            <tbody>
              <tr>
                <td class="plan-name">Free</td>
                <td class="plan-price">$0</td>
                <td class="plan-models">有限补全与 Agent试用</td>
                <td class="plan-limit"></td>
              </tr>
              <tr>
                <td class="plan-name">Pro <span class="cp-badge badge-rec">推荐</span></td>
                <td class="plan-price">$10/月</td>
                <td class="plan-models">无限补全 + Chat + 代码Agent</td>
                <td class="plan-limit">个人版</td>
              </tr>
              <tr>
                <td class="plan-name">Pro+</td>
                <td class="plan-price">$39/月</td>
                <td class="plan-models">Copilot Workspace + Agent模式 + 优先队列</td>
                <td class="plan-limit"></td>
              </tr>
              <tr>
                <td class="plan-name">Business</td>
                <td class="plan-price">$19/人/月</td>
                <td class="plan-models">团队管理 + 策略管控</td>
                <td class="plan-limit"></td>
              </tr>
              <tr>
                <td class="plan-name">Enterprise</td>
                <td class="plan-price">$39/人/月</td>
                <td class="plan-models">知识库索引 + 审计合规</td>
                <td class="plan-limit"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- OpenAI Codex -->
      <div class="cp-platform overseas">
        <div class="cp-platform-head">
          <span class="cp-platform-name"><a href="https://openai.com/codex" target="_blank" rel="noopener noreferrer">OpenAI Codex</a></span>
          <span class="cp-badge badge-overseas">海外</span>
        </div>
        <div class="cp-platform-body">
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>说明</th></tr></thead>
            <tbody>
              <tr>
                <td class="plan-name">ChatGPT Plus</td>
                <td class="plan-price">$20/月</td>
                <td class="plan-models"><a href="https://openai.com/" target="_blank" rel="noopener noreferrer">GPT-4.1</a>, <a href="https://openai.com/" target="_blank" rel="noopener noreferrer">o3</a></td>
                <td class="plan-limit">有限 Codex 额度</td>
              </tr>
              <tr>
                <td class="plan-name">ChatGPT Pro</td>
                <td class="plan-price">$200/月</td>
                <td class="plan-models"><a href="https://openai.com/" target="_blank" rel="noopener noreferrer">GPT-4.1</a>, <a href="https://openai.com/" target="_blank" rel="noopener noreferrer">o3-pro</a></td>
                <td class="plan-limit">无限 Codex 额度</td>
              </tr>
              <tr>
                <td class="plan-name">API 按量</td>
                <td class="plan-price">按Token</td>
                <td class="plan-models"><a href="https://openai.com/" target="_blank" rel="noopener noreferrer">GPT-4.1</a> ~$2/$8 (输入/输出百万Token)</td>
                <td class="plan-limit"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Windsurf -->
      <div class="cp-platform overseas">
        <div class="cp-platform-head">
          <span class="cp-platform-name"><a href="https://codeium.com/windsurf" target="_blank" rel="noopener noreferrer">Windsurf (Codeium)</a></span>
          <span class="cp-badge badge-overseas">海外</span>
        </div>
        <div class="cp-platform-body">
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>说明</th><th>备注</th></tr></thead>
            <tbody>
              <tr>
                <td class="plan-name">Free</td>
                <td class="plan-price">$0</td>
                <td class="plan-models">有限 Cascade</td>
                <td class="plan-limit"></td>
              </tr>
              <tr>
                <td class="plan-name">Pro <span class="cp-badge badge-rec">推荐</span></td>
                <td class="plan-price">$15/月</td>
                <td class="plan-models">无限补全 + Cascade Agent</td>
                <td class="plan-limit">无限用量</td>
              </tr>
              <tr>
                <td class="plan-name">Ultimate</td>
                <td class="plan-price">$60/月</td>
                <td class="plan-models">无限快速请求 + 优先</td>
                <td class="plan-limit">重度用户</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Google -->
      <div class="cp-platform overseas">
        <div class="cp-platform-head">
          <span class="cp-platform-name"><a href="https://cloud.google.com/gemini" target="_blank" rel="noopener noreferrer">Google Gemini / Jules</a></span>
          <span class="cp-badge badge-overseas">海外</span>
        </div>
        <div class="cp-platform-body">
          <table class="cp-table">
            <thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>说明</th></tr></thead>
            <tbody>
              <tr>
                <td class="plan-name">Free</td>
                <td class="plan-price">$0</td>
                <td class="plan-models"><a href="https://cloud.google.com/gemini" target="_blank" rel="noopener noreferrer">Gemini 2.5 Flash</a></td>
                <td class="plan-limit">有限额度</td>
              </tr>
              <tr>
                <td class="plan-name">AI Ultra</td>
                <td class="plan-price">$249.99/月</td>
                <td class="plan-models"><a href="https://cloud.google.com/gemini" target="_blank" rel="noopener noreferrer">Gemini 2.5 Pro</a> + DeepThink</td>
                <td class="plan-limit">含 YouTube/Storage 等</td>
              </tr>
              <tr>
                <td class="plan-name">API 按量</td>
                <td class="plan-price">按Token</td>
                <td class="plan-models"><a href="https://cloud.google.com/gemini" target="_blank" rel="noopener noreferrer">Gemini 2.5 Pro</a> ~$1.25/$10 (输入/输出百万Token)</td>
                <td class="plan-limit">200万 Token 免费层</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div><!-- /cp-platforms`
);

// --- Matrix section ---
rep(/<h2>\?\? \?\?\?\?\?\?<\/h2>/, '<h2>🔧 编程工具 × Coding Plan 兼容矩阵</h2>');
rep(/<th>\?\?<\/th>\s*<th>\?\?GLM<\/th>/, '<th>工具</th>\n              <th>智谱GLM</th>');
rep('<th>????</th>\n              <th>????</th>\n              <th>Kimi</th>\n              <th>???</th>', '<th>火山方舟</th>\n              <th>阿里云百炼</th>\n              <th>Kimi</th>\n              <th>腾讯云</th>');
rep('<th>DeepSeek</th>\n              <th>??</th>\n              <th>???</th>', '<th>DeepSeek</th>\n              <th>小米</th>\n              <th>海外</th>');

// Swap Hermes before OpenClaw in matrix tbody
const openclawRow = s.match(/<tr><td>OpenClaw[\s\S]*?<\/tr>/);
const hermesRow = s.match(/<tr><td>Hermes Agent[\s\S]*?<\/tr>/);
if (openclawRow && hermesRow && s.indexOf(openclawRow[0]) < s.indexOf(hermesRow[0])) {
  s = s.replace(openclawRow[0] + '\n            ' + hermesRow[0], hermesRow[0].replace('Hermes Agent', 'Hermes Agent 🔥👍').replace('badge-new', 'badge-hot').replace('?</span>', '新</span>') + '\n            ' + openclawRow[0].replace('badge-hot', 'badge-rec'));
}
s = s.replace(/(<tr><td>Hermes Agent[^<]*[\s\S]*?<td class="yes">)[^<]+(<\/td><\/tr>)/, '$1实战首选$2');
s = s.replace(/(<tr><td>CoPaw \/ WorkBuddy[\s\S]*?<td class="yes">)[^<]+(<\/td><\/tr>)/, '$1国内优选$2');

rep(
  /<div style="font-size:0\.76rem;color:var\(--muted\);margin-top:0\.5rem;">[\s\S]*?ArkClaw[\s\S]*?<\/div>\s*<\/div>\s*\n\n    <!-- ==================== \?\?\?\?\?/,
  `<div style="font-size:0.76rem;color:var(--muted);margin-top:0.5rem;">
        ✓ = 官方支持 &nbsp; — = 不支持 &nbsp; <span class="cp-badge badge-hot" style="font-size:0.6rem">🔥</span> = 热门 &nbsp; <span class="cp-badge badge-new" style="font-size:0.6rem">新</span> = 新工具 &nbsp; · Hermes Agent 为 2026 开源实战首选，兼容 OpenAI 格式 API &nbsp; · CoPaw/WorkBuddy 为国内大厂推出的开源 Agent &nbsp; · ArkClaw 为火山方舟专属 IDE 内 Agent
      </div>
    </div>

    <!-- ==================== 兼容性排名`
);

// Compatibility ranking headers
rep('?? ???????', '📊 套餐兼容性排名');
rep('<!-- ????? -->', '<!-- 工具排名 -->');
rep('font-size:0.88rem;">?? ???????</div>\n          <div style="padding:0.75rem 1rem;">\n            <table class="cp-table" style="font-size:0.78rem;">\n              <thead><tr><th>??</th><th>?????</th><th>???</th></tr></thead>\n              <tbody>\n                <tr><td class="plan-name">Hermes', 'font-size:0.88rem;">📊 工具兼容性排名</div>\n          <div style="padding:0.75rem 1rem;">\n            <table class="cp-table" style="font-size:0.78rem;">\n              <thead><tr><th>工具</th><th>兼容套餐数</th><th>覆盖率</th></tr></thead>\n              <tbody>\n                <tr><td class="plan-name">Hermes');
rep('?? 9 ????????????', '共 9 家国内 Coding Plan');
rep('?? 8 ??????????', '共 8 款主流编程工具');
rep('OpenClaw <span class="cp-badge badge-hot"', 'Hermes Agent <span class="cp-badge badge-hot"');
rep('Hermes Agent <span class="cp-badge badge-new"', 'OpenClaw <span class="cp-badge badge-rec"');
rep('?? (TRAE/Kimi CLI/Qwen Code/Goose/Crush/Grok)', '国产 (TRAE/Kimi CLI/Qwen Code/Goose/Crush/Grok)');

// Notice
rep(
  /<!-- ==================== \?\?\?\? ==================== -->[\s\S]*?<!-- ==================== FAQ ==================== -->/,
  `<!-- ==================== 选购提醒 ==================== -->
    <div class="cp-notice">
      <div class="cp-notice-head">⚠️ 选购提醒 · 必读</div>
      <div class="cp-notice-body">
        <ul>
          <li><strong>1元 ≠ 15-20元 API 等价</strong>：国内 Coding Plan 的"次"多为 Agent 对话轮次或工具调用次数，与 Token 按量计费不同；Agent 重度使用约 15-20 倍于同等 API 费用，请按场景选型。</li>
          <li><strong>5小时滑动窗口</strong>：MiniMax、阿里云等套餐标注"用量/5h"，<strong>滑动计算</strong>：任意连续 5 小时内消耗计入当期额度，耗尽后需等待窗口滑动恢复，非自然日重置。</li>
          <li><strong>API按量 vs 套餐制</strong>：标注"API按量"指 HTTP 按 Token 计费；标注"Agent次"指套餐内固定轮次，1 次对话约等于 10-20 万 Token 等效，请勿直接对比单价。</li>
          <li><strong>首月特惠 ≠ 长期价</strong>：阿里云首月 ¥39.9、智谱首月 7 折等促销到期恢复原价，续费前请确认长期月价。</li>
          <li><strong>抢购时段</strong>：智谱 GLM 每日 10:00、阿里云 9:30 等限时秒杀，热门套餐秒空，建议提前登录并设闹钟。</li>
          <li><strong>续费与涨价</strong>：2026 Q1 多家厂商 Coding Plan 涨价幅度达 463%，新用户首月优惠后 6-12 个月可能调价，关注官方公告。</li>
          <li><strong>小米 Credit 计费</strong>：小米 MiMo Token Plan 用 Credit 计量；MiMo-V2-Pro 256k 为 2x（1 Token = 2 Credits），1M 上下文为 4x；Omni 256k 为 1x。Pro 档性价比最高，注意上下文长度倍率。</li>
        </ul>
      </div>
    </div>

    <!-- ==================== FAQ ==================== -->`
);

// FAQ
rep(
  /<!-- ==================== FAQ ==================== -->[\s\S]*?<!-- ==================== \?\?\?\?\? ==================== -->/,
  `<!-- ==================== FAQ ==================== -->
    <div class="cp-faq">
      <div class="cp-faq-head">❓ 常见问题 FAQ</div>

      <div class="cp-faq-item is-open">
        <div class="cp-faq-q">Coding Plan 和直接买 API 有什么区别？<span class="cp-faq-arrow">▼</span></div>
        <div class="cp-faq-a">Coding Plan 是<strong>面向 AI 编程场景的包月套餐</strong>，通常含 Agent 额度、优先队列与工具集成，价格比裸 API 按 Token 更划算。<strong>适合日常编码</strong>；若需批量推理、自建服务或精确 Token 控制，API 按量更灵活。两者可组合使用。</div>
      </div>

      <div class="cp-faq-item">
        <div class="cp-faq-q">API 按量和 Agent 套餐额度怎么换算？<span class="cp-faq-arrow">▼</span></div>
        <div class="cp-faq-a"><strong>API按量</strong> = 按 HTTP 请求 Token 计费，Agent 一轮对话可能消耗数万 Token。<strong>约 15-20 倍于套餐"次"</strong>的等效成本。 <strong>Agent次</strong> = 套餐内固定轮次，如"1200次/5h"，与 API 不可直接比价；Agent 重度用户建议选 Max 档或 API 按量。轻度用户套餐更省。</div>
      </div>

      <div class="cp-faq-item">
        <div class="cp-faq-q">5 小时滑动窗口是什么意思？<span class="cp-faq-arrow">▼</span></div>
        <div class="cp-faq-a">例如标注"1200次/5h"，指<strong>任意连续 5 小时</strong>内最多 1200 次。若 1 小时内用完 1200 次，需等 2-5 小时窗口滑动后恢复，非每日 0 点重置。<strong>长时间连续编码</strong>请关注峰值用量，必要时升档或搭配 API 按量。</div>
      </div>

      <div class="cp-faq-item">
        <div class="cp-faq-q">国内 Coding Plan 能比 Cursor/Claude 省多少？<span class="cp-faq-arrow">▼</span></div>
        <div class="cp-faq-a"><strong>约省 3-5 倍</strong>：国内 ¥40-200/月 vs 海外 $20-200/月，且<strong>免梯、低延迟</strong>。若需<strong>顶级模型 Claude Opus/GPT-5 长程能力</strong>，海外仍领先；日常编码国内 GLM-5.2 / DeepSeek-V4 已足够。可搭配 <a href="https://z.ai/subscribe" target="_blank" rel="noopener noreferrer">Z.AI</a> 或 <a href="https://ofox.io/x/aiv123" target="_blank" rel="noopener noreferrer">OfoxAI</a> 中转海外模型。</div>
      </div>

      <div class="cp-faq-item">
        <div class="cp-faq-q">Token 降价趋势下还要买套餐吗？<span class="cp-faq-arrow">▼</span></div>
        <div class="cp-faq-a"><strong>看使用模式</strong>：若已是重度用户，套餐含优先队列与工具集成，仍比裸 API 省心。Token 单价持续下降（如 DeepSeek API 输入 ¥1/百万 Token），轻度用户 API 更省。建议先用免费档试算 1-3 个月用量再决定。勿囤积 API Key 余额。</div>
      </div>

      <div class="cp-faq-item">
        <div class="cp-faq-q">现在买还是等降价？<span class="cp-faq-arrow">▼</span></div>
        <div class="cp-faq-a"><strong>刚需就上</strong>：Token 三年降 1000 倍趋势不变，但<strong>早用早提效</strong>。新用户可抢首月优惠（智谱 7 折、阿里云 ¥39.9 等），老用户关注 6-12 月续费价。Fable 5 恢复后 Claude Max 长程能力将再升级。</div>
      </div>
    </div>

    <!-- ==================== 性价比排名 ==================== -->`
);

// Value rank header
rep('?? ????? ? ???????', '💎 性价比排名 · 谁最划算');
rep('???????? ?? = ??????????????????????????????????????????????', '按估算 Token 总量与月价计算 · ★ = 估算性价比指数（仅供参考，各平台计量口径不同）');
rep(/<td>\?\?<\/td>/g, '<td>—</td>');

// Token trend — 仅替换标题与副标题
rep('?? Token ?????3??? 1000', '📉 Token 价格趋势：3 年降 1000 倍');
rep(/<p class="cp-trend-sub">[\s\S]*?<\/p>/, '<p class="cp-trend-sub">自 GPT-4 发布以来，主流模型 Token 单价持续断崖式下降；国内 AI 厂商跟进更快，Coding Plan 性价比逐年提升。</p>');
rep('GPT-4 ???? ?????Token?? (USD)', 'GPT-4 输入价 · 每百万 Token 价 (USD)');
rep('<span class="cp-bar-label">2022 ?</span>', '<span class="cp-bar-label">2022 初</span>');
rep('?????<a href="https://www.gpunex.com', '数据来源：<a href="https://www.gpunex.com');
rep('<div class="cp-trend-card-head">OpenAI ??????</div>', '<div class="cp-trend-card-head">OpenAI 历代定价</div>');
rep('<div class="cp-trend-card-head">Anthropic ??????</div>', '<div class="cp-trend-card-head">Anthropic 历代定价</div>');
rep('<div class="cp-trend-card-head">????????</div>', '<div class="cp-trend-card-head">国内主流模型</div>');
rep('<div class="cp-trend-card-head">2026 ?????????</div>', '<div class="cp-trend-card-head">2026 主流价位区间</div>');

// Footer — 仅页脚段落
rep('<p>?????????? ???????</p>', '<p>数据来源各平台官网 · 价格以官网为准</p>');
rep('<p><a href="index.html">? ?? AINav ??</a></p>', '<p><a href="index.html">← 返回 AINav 首页</a></p>');

// Scenario recommendations - key fixes
rep('?? ???? ? ???????? Coding Plan', '🎯 场景推荐 · 按需求选 Coding Plan');
rep('?? ????? / ??', '💚 个人开发 / 学生');
rep('??GLM Pro', '智谱GLM Pro');
rep('????Lite', '火山方舟Lite');
rep('????Pro', '阿里云百炼Pro');
rep('?? ?? AI ?????6h+?', '🔥 重度 AI 编程（6h+）');
rep('??GLM Max', '智谱GLM Max');
rep('?? ?? / ??', '🏢 团队 / 企业');
rep('?? ???? / ??', '🆓 白嫖 / 试水');
rep('?? ????? / ?????', '🌐 多模型聚合 / 中转');
rep('?? ???? / ?????', '💰 海外对比 / 替代方案');

// 模型名更新
rep('GLM-5</a>, <a href="https://www.bigmodel.cn/" target="_blank" rel="noopener noreferrer">GLM-4.7</a>', 'GLM-5.2</a>, <a href="https://www.bigmodel.cn/" target="_blank" rel="noopener noreferrer">GLM-5.1</a>');
rep('>GLM-5</a>, <a href="https://z.ai/"', '>GLM-5.2</a>, <a href="https://z.ai/"');
rep('Kimi-K2.5</a>', 'Kimi-K2.6</a>');
rep('Kimi K2.5</a>', 'Kimi K2.6</a>');
rep('MiniMax-M2.5</a>', 'MiniMax-M2.7</a>');
rep('DeepSeek-V4</a>, <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek-V3.2</a>, <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek-R1</a>', 'DeepSeek-V4-Pro</a>, <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek-V4-Flash</a>, <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek-V3.2</a>, <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek-R1</a>');
rep('GLM-5.1</strong>?<strong>MiniMax-M2.7</strong>?<strong>Kimi-K2.6</strong>?<strong>DeepSeek-V4</strong>?<strong>DeepSeek-V3.2</strong>', 'GLM-5.2</strong>、<strong>MiniMax-M2.7</strong>、<strong>Kimi-K2.6</strong>、<strong>DeepSeek-V4-Pro</strong>、<strong>DeepSeek-V4-Flash</strong>');

// i18n zh block
const zhBlock = `        zh: {
          pageTitle: 'AI Coding Plan 横评对比 — 国内+海外 — AINav',
          pageDesc: '国内 AI 厂商 Coding Plan 套餐横评：智谱 GLM、MiniMax、火山引擎、月之暗面 Kimi、腾讯混元、DeepSeek、小米等 vs Cursor、Claude Code、GitHub Copilot、Windsurf；含兼容性矩阵、Token 降价趋势与选购建议。',
          title: '💰 AI Coding Plan 横评',
          subtitle: '国内 AI 厂商 Coding Plan 套餐横评：价格、模型、额度、兼容性一站式对比，帮你选对 Coding Plan。',
          navHome: '← AINav 首页', navCoding: '编程套餐横评', navAgent: 'Agent横评',
          navVideo: '视频套餐横评', navImage: '图像套餐横评', navEncyclopedia: 'AI百科',
          themeSystem: '跟随系统', themeLight: '浅色', themeDark: '深色',
          cdLabel: '⏰ 抢购中', cdNext: '⏭ 下一场', cdGo: '去抢',
          legendRush: '⏰ 抢购', legendRushDesc: '限时/秒杀',
          legendHot: '🔥 性价比', legendHotDesc: '高性价比',
          legendNew: '🆕 新品', legendNewDesc: '首月特惠',
          legendRec: '推荐', legendRecDesc: '编辑推荐',
          legendOverseas: '海外', legendOverseasDesc: '需科学上网',
          sectionDomestic: '国内 Coding Plan',
          sectionOverseas: '海外 Coding Plan',
          sectionMatrix: '🔧 编程工具 × Coding Plan 兼容矩阵',
          sectionTrend: '📉 Token 价格趋势：3 年降 1000 倍',
          sectionRec: '🎯 场景推荐 · 按需求选 Coding Plan',
          thPlan: '套餐', thPrice: '月价', thModel: '核心模型', thUsage: '用量参考', thNote: '备注',
          thUsage5h: '用量/5h', thUsage2: '用量', thDesc: '说明',
          footer: '数据来源各平台官网 · 价格以官网为准',
          footerHome: '← 返回 AINav 首页',
          promoText: '想用', promoOr: '/', promoNoNet: '但无梯？',
          promoDesc: '一个 API Key 直连 100+ 模型，OpenAI 兼容格式',
          promoCta: '立即注册 →',
          badgeRush: '⏰ 抢购', badgeHot: '🔥 性价比', badgeNew: '🆕 新品', badgeRec: '推荐',
        },`;

rep(/        zh: \{[\s\S]*?        \},\n        en: \{/, zhBlock + '\n        en: {');

fs.writeFileSync(fp, s, 'utf8');
const remain = (s.match(/\?\?\?/g) || []).length;
console.log('repair-coding-plan.js done. Remaining ??? count:', remain);
