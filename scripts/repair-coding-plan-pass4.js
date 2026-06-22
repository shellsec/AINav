#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, '..', 'coding-plan.html');
let s = fs.readFileSync(fp, 'utf8');

const ds = `                  <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">V4-Pro</a> 输入¥1(缓存命中)/¥12 · 输出¥24 · 1M上下文<br>
                  <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">V4-Flash</a> 输入¥0.2(缓存命中)/¥1 · 输出¥2<br>
                  <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">V3.2</a> 输入¥0.5 · 输出¥2 · <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">R1</a> 输入¥1 · 输出¥4 (均百万Token)`;

s = s.replace(
  /<td class="plan-models" style="font-size:\.74rem;line-height:1\.6">\s*<a href="https:\/\/www\.deepseek\.com\/"[\s\S]*?<\/td>\s*<td class="plan-limit">按量计费<\/td>/,
  `<td class="plan-models" style="font-size:.74rem;line-height:1.6">\n${ds}\n                </td>\n                <td class="plan-limit">按量计费</td>`
);

s = s.replace(
  /<div style="font-size:0\.78rem;color:var\(--muted\);margin-bottom:0\.6rem;">[^<]*<\/div>\s*<table class="cp-table" style="font-size:0\.8rem;">\s*<thead><tr><th>排名<\/th>/,
  '<div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.6rem;">按估算 Token 总量与月价计算 · ★ = 估算性价比指数（仅供参考，各平台计量口径不同）</div>\n        <table class="cp-table" style="font-size:0.8rem;">\n          <thead><tr><th>排名</th>'
);

s = s.replace(
  /<div style="font-size:0\.72rem;color:var\(--muted\);margin-top:0\.5rem;">\*[^<]*<\/div>\s*<\/div>\s*<\/div>\s*\n\n    <!-- ==================== Token/,
  `<div style="font-size:0.72rem;color:var(--muted);margin-top:0.5rem;">* 估算仅供参考：各平台「次」与 Token 计量口径不同；按 ¥30/百万 Token、1$≈¥7.2 折算。DeepSeek Free 因免费额度极高排名第一，Agent 重度用户仍需 Coding Plan 优先队列。</div>\n      </div>\n    </div>\n\n    <!-- ==================== Token`
);

s = s.replace(/GPT-4 输入价 · 每百万[\s\S]*?\(USD\)<\/div>/, 'GPT-4 输入价 · 每百万 Token 价 (USD)</div>');
s = s.replace(/<p>数据来源各平台官网 · 价格以官网为准[^<]*<\/p>/, '<p>数据来源各平台官网 · 价格以官网为准</p>');

[
  ['<!-- ==================== ???????? ==================== -->', '<!-- ==================== 兼容矩阵 ==================== -->'],
  ['<!-- 2. ?? GLM ??? (Z.AI) -->', '<!-- 2. 智谱 GLM 国际版 (Z.AI) -->'],
  ['<!-- 4. ?????? -->', '<!-- 4. 火山方舟 -->'],
  ['<!-- 5. ????? -->', '<!-- 5. 阿里云百炼 -->'],
  ['<!-- 7. ??? -->', '<!-- 7. 腾讯云 -->'],
  ['<!-- ????? -->', '<!-- 排名表 -->'],
  ['~500??+????', '~500次+慢速队列'],
].forEach(([a, b]) => { s = s.split(a).join(b); });

fs.writeFileSync(fp, s, 'utf8');
console.log('pass4 done, ??? count:', (s.match(/\?\?\?/g) || []).length);
