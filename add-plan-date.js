#!/usr/bin/env node
/**
 * 为所有 Plan 横评页面的 footer 添加"最后更新"日期标记
 * 如果已有 data-updated 属性则跳过
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// 所有 plan 页面
const planFiles = [
  'model-plan.html',
  'coding-plan.html',
  'agent-plan.html',
  'video-plan.html',
  'image-plan.html',
  'voice-plan.html',
  'music-plan.html',
  'search-plan.html',
  'learning-plan.html',
  'hardware-plan.html',
  'ai-factory-plan.html',
  'plan.html',
  'opc.html',
  'opc-global.html',
  'opc-resources.html',
  'thinking-framework.html',
  'ask.html',
  'debug.html',
  'agent.html',
];

let updated = 0;

for (const file of planFiles) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;

  let html = fs.readFileSync(fp, 'utf8');

  // 已有更新标记则跳过
  if (html.includes('data-updated') || html.includes('cp-updated')) {
    // 更新已有日期
    html = html.replace(
      /data-updated="\d{4}-\d{2}-\d{2}"/,
      `data-updated="${today}"`
    );
    html = html.replace(
      /<span class="cp-updated">[^<]*<\/span>/,
      `<span class="cp-updated">最后更新：${today}</span>`
    );
    fs.writeFileSync(fp, html, 'utf8');
    updated++;
    console.log(`  updated date: ${file}`);
    continue;
  }

  // 在 .cp-footer 的 <p> 最后插入日期行
  if (html.includes('class="cp-footer"')) {
    html = html.replace(
      /(<div class="cp-footer">)/,
      `$1\n      <p class="cp-updated-line"><span class="cp-updated">最后更新：${today}</span></p>`
    );
    // 在 style 中添加 .cp-updated-line 样式
    if (!html.includes('.cp-updated-line')) {
      html = html.replace(
        /\.cp-footer\s*\{/,
        `.cp-updated-line { font-size: 0.76rem; color: var(--muted); margin: 0 0 0.3rem; }\n.cp-footer {`
      );
    }
  } else if (html.includes('class="site-footer"')) {
    // index.html 和百科页用 site-footer
    html = html.replace(
      /(<footer class="site-footer")/,
      `<p class="cp-updated-line" style="text-align:center;font-size:0.76rem;color:var(--muted);margin:0.5rem 0"><span class="cp-updated">最后更新：${today}</span></p>\n$1`
    );
  } else {
    // 其他页面：在 </body> 前插入
    html = html.replace(
      /(<\/body>)/,
      `<p style="text-align:center;font-size:0.76rem;color:#8b9cb3;margin:1rem 0"><span class="cp-updated">最后更新：${today}</span></p>\n$1`
    );
  }

  fs.writeFileSync(fp, html, 'utf8');
  updated++;
  console.log(`  added date: ${file}`);
}

console.log(`\nDone: ${updated} plan pages updated with date ${today}`);
