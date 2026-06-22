#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, '..', 'coding-plan.html');
let s = fs.readFileSync(fp, 'utf8');
function rep(a, b) {
  if (typeof a === 'string') { if (!s.includes(a)) return; s = s.split(a).join(b); return; }
  s = s.replace(a, b);
}

// head
rep('<title>AI Coding Plan ???????+???? AINav</title>', '<title>AI Coding Plan 横评对比 — 国内+海外 — AINav</title>');
rep(/<meta name="description" content="[^"]*">/, '<meta name="description" content="国内 AI 厂商 Coding Plan 套餐横评：智谱 GLM、MiniMax、火山引擎、月之暗面 Kimi、腾讯混元、DeepSeek、小米等 vs Cursor、Claude Code、GitHub Copilot、Windsurf；含兼容性矩阵、Token 降价趋势与选购建议。">');
rep(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="AI Coding Plan 横评对比 — 国内+海外">');
rep(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="国内 AI 厂商 Coding Plan 套餐横评与海外 IDE Agent 对比，含兼容性矩阵与 Token 降价趋势。">');

// 兼容排名：修正误替换
rep('<tr><td class="plan-name">火山方舟</td><td style="color:var(--accent2);font-weight:700">6</td>', '<tr><td class="plan-name">阿里云百炼</td><td style="color:var(--accent2);font-weight:700">6</td>');
rep('font-weight:700;font-size:0.88rem;">📊 套餐兼容性排名</div>\n          <div style="padding:0.75rem 1rem;">\n            <table class="cp-table" style="font-size:0.78rem;">\n              <thead><tr><th>??</th><th>?????</th><th>???</th></tr></thead>\n              <tbody>\n                <tr><td class="plan-name">Hermes Agent', 'font-weight:700;font-size:0.88rem;">📊 工具兼容性排名</div>\n          <div style="padding:0.75rem 1rem;">\n            <table class="cp-table" style="font-size:0.78rem;">\n              <thead><tr><th>工具</th><th>兼容套餐数</th><th>覆盖率</th></tr></thead>\n              <tbody>\n                <tr><td class="plan-name">Hermes Agent');
rep('<thead><tr><th>??</th><th>?????</th><th>???</th></tr></thead>\n              <tbody>\n                <tr><td class="plan-name">智谱GLM</td>', '<thead><tr><th>平台</th><th>兼容工具数</th><th>覆盖率</th></tr></thead>\n              <tbody>\n                <tr><td class="plan-name">智谱GLM</td>');

// 表头
rep('<thead><tr><th>??</th><th>??</th><th>????</th><th>??</th><th>??</th></tr></thead>', '<thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>用量</th><th>备注</th></tr></thead>');
rep('<thead><tr><th>??</th><th>??</th><th>????</th><th>Credits / ?</th><th>??</th></tr></thead>', '<thead><tr><th>套餐</th><th>月价</th><th>核心模型</th><th>Credits / 月</th><th>备注</th></tr></thead>');
rep('<thead><tr><th>??</th><th>??</th><th>??</th><th>??</th><th>?????(?)</th><th>?????</th><th>???</th></tr></thead>', '<thead><tr><th>排名</th><th>平台</th><th>套餐</th><th>月价</th><th>估算Token(万)</th><th>性价比指数</th><th>相对值</th></tr></thead>');

// 平台细节
rep('???(??/??/??)', '全模型(补全/对话/Agent)');
rep('同Lite + Doubao-Seed-2.0-pro + ?????', '同Lite + Doubao-Seed-2.0-pro + 旗舰模型');
rep('含ArkClaw等 ?????????', '含ArkClaw等 · 长程任务+优先队列');
rep('??¥7.9 Lite???', '首月¥7.9 · Lite尝鲜价');
rep('V4-Pro??????????950??????????', 'V4-Pro 长程旗舰；Think Max 约 950 万 Token 等效');
rep('????????TTS????', '含 Omni/TTS 多模态');
rep('??????$100/月', '约合海外 $100/月');
rep('0.6? (~120??)', '0.6亿 (~120万次)');
rep('2? (~400??)', '2亿 (~400万次)');
rep('7? (~1,400??)', '7亿 (~1,400万次)');
rep('16? (~3,200??)', '16亿 (~3,200万次)');
rep('Pro 256k??2x?1M??4x', 'Pro 256k为2x，1M为4x');

// DeepSeek 价格行
rep('V4-Pro</a> ??¥1(????)/¥12 ??¥24 1M???<br>', 'V4-Pro</a> 输入¥1(缓存命中)/¥12 · 输出¥24 · 1M上下文<br>');
rep('V4-Flash</a> ??¥0.2(????)/¥1 ??¥2<br>', 'V4-Flash</a> 输入¥0.2(缓存命中)/¥1 · 输出¥2<br>');
rep('V3.2</a> ??¥0.5 ??¥2 <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">R1</a> ??¥1 ??¥4 (??按Token)', 'V3.2</a> 输入¥0.5 · 输出¥2 · <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">R1</a> 输入¥1 · 输出¥4 (均百万Token)');

// 性价比
rep('???????? ?? = ??????????????????????????????????????????????', '按估算 Token 总量与月价计算 · ★ = 估算性价比指数（仅供参考，各平台计量口径不同）');
rep('~500??+????', '~500次+慢速队列');
rep('* ????????????????????????¥30?????????1$?¥7.2???DeepSeek Free??????????????????????????????????????????????', '* 估算仅供参考：各平台「次」与 Token 计量口径不同；按 ¥30/百万 Token、1$≈¥7.2 折算。DeepSeek Free 因免费额度极高排名第一，但 Agent 重度用户仍需 Coding Plan 优先队列。');

// Token 趋势
rep('<!-- ==================== Token ???? ==================== -->', '<!-- ==================== Token 价格趋势 ==================== -->');
rep('GPT-4 ???? ????按Token?? (USD)', 'GPT-4 输入价 · 每百万 Token 价 (USD)');
rep('<tr><td>Claude 4 Sonnet (2025)</td><td class="price-new">$3 / $15</td><td>????</td></tr>', '<tr><td>Claude 4 Sonnet (2025)</td><td class="price-new">$3 / $15</td><td>持平</td></tr>');
rep('<tr><td>Claude 4 Opus (2025)</td><td class="price-new">$15 / $75</td><td>????</td></tr>', '<tr><td>Claude 4 Opus (2025)</td><td class="price-new">$15 / $75</td><td>持平</td></tr>');
rep('<tr><td>GLM-5 (2026)</td><td class="price-new">¥4 / ¥16</td><td>???</td></tr>', '<tr><td>GLM-5.2 (2026)</td><td class="price-new">¥4 / ¥16</td><td>开源标杆</td></tr>');
rep('<tr><td>DeepSeek-V3 (2025)</td><td class="price-new">¥1 / ¥2</td><td class="price-drop">?????</td></tr>', '<tr><td>DeepSeek-V3 (2025)</td><td class="price-new">¥1 / ¥2</td><td class="price-drop">极致低价</td></tr>');
rep('<tr><td>DeepSeek-V4-Pro (2026)</td><td class="price-new">¥1~12 / ¥24</td><td class="price-drop">????¥1?1M???</td></tr>', '<tr><td>DeepSeek-V4-Pro (2026)</td><td class="price-new">¥1~12 / ¥24</td><td class="price-drop">低至¥1/1M输入</td></tr>');
rep('<tr><td>DeepSeek-V4-Flash (2026)</td><td class="price-new">¥0.2~1 / ¥2</td><td class="price-drop">?????</td></tr>', '<tr><td>DeepSeek-V4-Flash (2026)</td><td class="price-new">¥0.2~1 / ¥2</td><td class="price-drop">轻量极速</td></tr>');
rep('<tr><td>Kimi-K2.5 (2026)</td><td class="price-new">¥4 / ¥16</td><td>????</td></tr>', '<tr><td>Kimi-K2.6 (2026)</td><td class="price-new">¥4 / ¥16</td><td>长程旗舰</td></tr>');
rep('<thead><tr><th>????</th><th>?? (???)</th><th>?? (???)</th></tr></thead>', '<thead><tr><th>能力档位</th><th>输入 (百万)</th><th>输出 (百万)</th></tr></thead>');
rep('<tr><td>?? ???? (GPT-5, Opus 4)</td>', '<tr><td>海外 旗舰档 (GPT-5, Opus 4.8)</td>');
rep('<tr><td>?? ???? (GPT-4.1, Sonnet 4)</td>', '<tr><td>海外 均衡档 (GPT-4.1, Sonnet 4.6)</td>');
rep('<tr><td>? ???? (GPT-4.1 Nano, Haiku)</td>', '<tr><td>海外 轻量档 (GPT-4.1 Nano, Haiku)</td>');
rep('<tr><td>?? ???? (Llama, DeepSeek)</td>', '<tr><td>开源 旗舰档 (Llama, DeepSeek)</td>');
rep('<tr><td>?? ??/????</td>', '<tr><td>开源 轻量/蒸馏</td>');
rep('$2 ? $15', '$2 – $15');
rep('$8 ? $75', '$8 – $75');
rep('$0.50 ? $3', '$0.50 – $3');
rep('$1 ? $15', '$1 – $15');
rep('$0.10 ? $0.25', '$0.10 – $0.25');
rep('$0.30 ? $1', '$0.30 – $1');
rep('$0.05 ? $0.30', '$0.05 – $0.30');
rep('$0.10 ? $0.60', '$0.10 – $0.60');
rep('$0.01 ? $0.10', '$0.01 – $0.10');
rep('$0.03 ? $0.20', '$0.03 – $0.20');

// 场景推荐整块
rep(
  /<!-- ==================== \?\?\?\? ==================== -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\n\n  <!-- Footer -->/,
  `<!-- ==================== 场景推荐 ==================== -->
    <div class="cp-tips" style="padding:0;">
      <div style="padding:0.75rem 1rem;border-bottom:1px solid var(--border);">
        <h2 style="margin:0;">🎯 场景推荐 · 按需求选 Coding Plan</h2>
      </div>
      <div style="padding:0.75rem 1rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div style="padding:0.75rem;border-radius:8px;border:1px solid rgba(63,185,80,0.25);background:rgba(63,185,80,0.04);">
            <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.5rem;">💚 个人开发 / 学生</div>
            <div style="font-size:0.8rem;line-height:1.7;">
              <div>🏆 <strong>首选</strong> <a href="https://www.bigmodel.cn/glm-coding?ic=H2G5GCAOFT" target="_blank" rel="noopener noreferrer">智谱GLM Pro</a> ¥149/月 · MCP深度集成</div>
              <div>💰 <strong>省钱</strong> <a href="https://www.volcengine.com/activity/codingplan" target="_blank" rel="noopener noreferrer">火山方舟Lite</a> ¥40/月 + <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek</a> ¥0 白嫖组合</div>
              <div>⏰ <strong>抢购</strong> <a href="https://www.aliyun.com/benefit/scene/codingplan" target="_blank" rel="noopener noreferrer">阿里云百炼Pro</a> 首月¥39.9 每日9:30秒杀</div>
            </div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;border:1px solid rgba(255,107,107,0.25);background:rgba(255,107,107,0.04);">
            <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.5rem;">🔥 重度 AI 编程（6h+）</div>
            <div style="font-size:0.8rem;line-height:1.7;">
              <div>🏆 <strong>国内</strong> <a href="https://www.bigmodel.cn/glm-coding?ic=H2G5GCAOFT" target="_blank" rel="noopener noreferrer">智谱GLM Max</a> ¥469/月 · 长程任务+优先队列</div>
              <div>🌍 <strong>海外</strong> <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer">Claude Max 2×</a> $200/月 + <a href="https://cursor.sh/" target="_blank" rel="noopener noreferrer">Cursor Ultra</a> $200/月</div>
              <div>💡 <strong>提示</strong> 5小时滑动窗口 · 峰值用量请选 Max 档</div>
            </div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;border:1px solid rgba(88,166,255,0.25);background:rgba(88,166,255,0.04);">
            <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.5rem;">🏢 团队 / 企业</div>
            <div style="font-size:0.8rem;line-height:1.7;">
              <div>🇨🇳 <strong>国内</strong> <a href="https://www.volcengine.com/activity/codingplan" target="_blank" rel="noopener noreferrer">火山方舟Pro</a> ¥200/月 · 含ArkClaw等Agent</div>
              <div>🌍 <strong>海外</strong> <a href="https://github.com/features/copilot" target="_blank" rel="noopener noreferrer">Copilot Business</a> $19/人/月 · 团队管理+审计</div>
            </div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;border:1px solid rgba(210,153,34,0.25);background:rgba(210,153,34,0.04);">
            <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.5rem;">🆓 白嫖 / 试水</div>
            <div style="font-size:0.8rem;line-height:1.7;">
              <div>🥇 <strong>零成本</strong> <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek Free</a> ¥0 · 开源模型全家桶</div>
              <div>🆓 <strong>组合</strong> DeepSeek + <a href="https://codeium.com/windsurf" target="_blank" rel="noopener noreferrer">Windsurf Free</a> = ¥0 完整AI编程</div>
            </div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;border:1px solid rgba(167,139,250,0.25);background:rgba(167,139,250,0.04);">
            <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.5rem;">🌐 多模型聚合 / 中转</div>
            <div style="font-size:0.8rem;line-height:1.7;">
              <div>🔌 <strong>国内</strong> 火山方舟 / 阿里云百炼 / 腾讯云 · 多模型一账号</div>
              <div>🌍 <strong>海外</strong> <a href="https://ofox.io/x/aiv123" target="_blank" rel="noopener noreferrer">OfoxAI</a> · 一个API Key 100+模型</div>
            </div>
          </div>
          <div style="padding:0.75rem;border-radius:8px;border:1px solid rgba(167,139,250,0.25);background:rgba(167,139,250,0.04);">
            <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.5rem;">💰 海外对比 / 替代方案</div>
            <div style="font-size:0.8rem;line-height:1.7;">
              <div>📊 Cursor Pro $20 + Claude Pro $20 = $40/月</div>
              <div>🇨🇳 替代 <a href="https://z.ai/subscribe" target="_blank" rel="noopener noreferrer">Z.AI</a> 国际版智谱GLM 约省 60%</div>
            </div>
          </div>
        </div>
        <div style="margin-top:1rem;padding:0.6rem 0.8rem;border-radius:6px;background:var(--panel);font-size:0.78rem;line-height:1.7;">
          <strong style="color:var(--warn)">💡 选购提示</strong>
          抢购阿里云 Pro 9:30 秒杀 · 5小时滑动窗口注意峰值 · Token 三年降 1000 倍 · 续费关注 6-12 月调价
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->`
);

// badges in ranking
rep('badge-hot" style="font-size:0.58rem">??</span>', 'badge-hot" style="font-size:0.58rem">🔥</span>');
rep('badge-rec" style="font-size:0.58rem">?</span>', 'badge-rec" style="font-size:0.58rem">热</span>');

fs.writeFileSync(fp, s, 'utf8');
console.log('pass2 done. Remaining ???', (s.match(/\?\?\?/g) || []).length);
