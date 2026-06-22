#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, '..', 'coding-plan.html');
let s = fs.readFileSync(fp, 'utf8');

function rep(a, b) {
  if (a instanceof RegExp) { s = s.replace(a, b); return; }
  if (!s.includes(a)) return;
  s = s.split(a).join(b);
}

rep('?? AI Coding Plan ????', '💰 AI Coding Plan 横评');
rep('? ????', '⏰ 抢购中');
rep('???? Pro', '阿里云 Pro');
rep('?? 9:30', '每日 9:30');
rep('>???</a>', '>去抢</a>');
rep('? ??????', '⏭ 下一场');
rep('<span class="cd-name" id="cdNext">?</span>', '<span class="cd-name" id="cdNext">—</span>');

rep(/含ArkClaw等[\s\S]*?<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\n\n      <!-- 5\./, '含ArkClaw等 · 长程任务+优先队列</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n      <!-- 5.');

rep('??¥7.9', '首月¥7.9');
rep('Lite???', 'Lite尝鲜价');

rep(/V4-Pro<\/a>[\s\S]*?\(均百万Token\)/, 'V4-Pro</a> 输入¥1(缓存命中)/¥12 · 输出¥24 · 1M上下文<br>\n                  <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">V4-Flash</a> 输入¥0.2(缓存命中)/¥1 · 输出¥2<br>\n                  <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">V3.2</a> 输入¥0.5 · 输出¥2 · <a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer">R1</a> 输入¥1 · 输出¥4 (均百万Token)');

rep('<p>??????????', '<p>数据来源各平台官网 · 价格以官网为准');

rep('???????? ?? = ??????????????????????????????????????????????', '按估算 Token 总量与月价计算 · ★ = 估算性价比指数（仅供参考，各平台计量口径不同）');

rep('GPT-4 ????', 'GPT-4 输入价 · 每百万');

rep(
  /<!-- \?\? vs \?\?[\s\S]*?<!-- ==================== 场景推荐 ==================== -->/,
  `<!-- 海外 vs 国内 定价逻辑对比 -->
      <div style="margin-top:1.5rem;border:1px solid var(--border);border-radius:10px;background:var(--card);overflow:hidden;">
        <div style="padding:0.65rem 1rem;border-bottom:1px solid var(--border);font-weight:700;font-size:0.95rem;">🌍 海外 vs 国内：定价逻辑为何不同？</div>
        <div style="padding:1rem;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;">
            <div style="padding:0.8rem;border-radius:8px;border:1px solid rgba(167,139,250,0.2);background:rgba(167,139,250,0.04);">
              <div style="font-weight:700;font-size:0.88rem;color:var(--overseas);margin-bottom:0.5rem;">海外：按能力分档溢价</div>
              <div style="font-size:0.82rem;line-height:1.8;">
                <div><strong style="color:var(--accent2)">✓ 旗舰档</strong> Opus/GPT-5 约 $15-75/M，长程 Agent 溢价明显</div>
                <div><strong style="color:var(--accent2)">✓ 均衡档</strong> Sonnet/GPT-4.1 约 $3-8/M，年降 20-30%</div>
                <div><strong style="color:var(--accent2)">✓ 轻量档</strong> Nano/Haiku $0.1-1/M，适合补全</div>
                <div><strong style="color:var(--warn)">✗ 注意</strong> 需梯子；Claude Fable 5 暂停中，回落 Opus 4.8</div>
              </div>
              <div style="margin-top:0.6rem;">
                <div class="cp-bar-chart">
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2023初</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2022" style="width:100%">$60/M</div></div></div>
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2024中</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2023" style="width:50%">$30/M</div></div></div>
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2025中</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2024" style="width:25%">$15/M</div></div></div>
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2026中</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2025" style="width:25%">$15/M →</div></div></div>
                </div>
              </div>
            </div>
            <div style="padding:0.8rem;border-radius:8px;border:1px solid rgba(63,185,80,0.2);background:rgba(63,185,80,0.04);">
              <div style="font-weight:700;font-size:0.88rem;color:var(--accent2);margin-bottom:0.5rem;">国内：套餐制 + 极致低价</div>
              <div style="font-size:0.82rem;line-height:1.8;">
                <div><strong style="color:var(--accent2)">✓ 旗舰档</strong> GLM-5.2/Kimi-K2.6 ¥4-16/M，约为海外 1/5-1/3</div>
                <div><strong style="color:var(--accent2)">✓ 均衡档</strong> Qwen3-Coder ¥2-6/M，年降 50%+</div>
                <div><strong style="color:var(--accent2)">✓ 开源/轻量</strong> DeepSeek-V4-Flash ¥0.2-2/M，V4-Pro ¥1-24/M</div>
                <div><strong style="color:var(--danger)">✗ 注意</strong> 「次」≠ Token；Agent 重度约 15-20 倍 API 等效成本</div>
              </div>
              <div style="margin-top:0.6rem;">
                <div class="cp-bar-chart">
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2024初</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2022" style="width:100%">¥100/M</div></div></div>
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2025初</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2023" style="width:5%">¥5/M</div></div></div>
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2025末</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2024" style="width:2%">¥1-2/M</div></div></div>
                  <div class="cp-bar-row"><span class="cp-bar-label" style="width:4.5rem">2026中</span><div class="cp-bar-track"><div class="cp-bar-fill bar-2026" style="width:4%">¥4-16/M</div></div></div>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-top:1rem;padding:0.6rem 0.8rem;border-radius:6px;background:var(--panel);font-size:0.8rem;line-height:1.7;">
            <strong style="color:var(--warn)">💡 核心结论</strong>
            海外按「能力溢价」卖 → 旗舰 $15-75 仍贵；国内按「套餐+Agent次」卖 → 同档约 1/3-1/5。
            <strong style="color:var(--accent2)">国内 Token 均价 2026 年已约为海外 1/2 且仍在降</strong>，Coding Plan 性价比持续提升。
          </div>
          <div style="margin-top:1.2rem;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
            <div style="padding:0.55rem 0.8rem;border-bottom:1px solid var(--border);font-weight:700;font-size:0.88rem;background:var(--panel);">📈 行业趋势：为何 Coding Plan 越来越香？</div>
            <div style="padding:0.8rem;font-size:0.8rem;line-height:1.75;">
              <div style="margin-bottom:0.8rem;">
                <div style="font-weight:700;color:var(--hot);margin-bottom:0.3rem;">① 供给侧 · 算力成本持续下降</div>
                <div style="padding-left:0.6rem;">
                  <div>· <strong>推理优化</strong>：蒸馏+投机解码，同等质量 Token 成本年降 40%+</div>
                  <div>· <strong>芯片迭代</strong>：H100 供给增、Blackwell 推理效率再提 10 倍量级</div>
                  <div>· <strong>开源冲击</strong>：DeepSeek/GLM/Qwen 拉低 API 底价至 ¥1-5/M</div>
                </div>
              </div>
              <div style="margin-bottom:0.8rem;">
                <div style="font-weight:700;color:var(--warn);margin-bottom:0.3rem;">② 需求侧 · Agent 化推高用量</div>
                <div style="padding-left:0.6rem;">
                  <div>· <strong>套餐涨价</strong>：2026 Q1 部分厂商调价 463%，但首月优惠仍诱人</div>
                  <div>· <strong>Agent 迁移</strong>：Hermes 等开源 Agent 普及，OpenClaw 用户持续迁移</div>
                  <div>· <strong>商业模式</strong>：从「卖 Token」转向「Coding Plan + Agent 次 + 工具集成」</div>
                </div>
              </div>
              <div>
                <div style="font-weight:700;color:var(--accent2);margin-bottom:0.3rem;">③ 用户侧 · 怎么选最划算？</div>
                <div style="padding-left:0.6rem;">
                  <div>· <strong>轻度用户</strong>：DeepSeek Free + Windsurf Free = ¥0 起步</div>
                  <div>· <strong>日常编码</strong>：智谱 GLM Pro ¥149 或火山 Lite ¥40 性价比最高</div>
                  <div>· <strong>重度 Agent</strong>：GLM Max / Claude Max 2×，关注 5h 滑动窗口峰值</div>
                  <div>· <strong>长期策略</strong>：Token 降价趋势下，<strong style="color:var(--hot)">刚需就上、抢首月优惠</strong>，不必囤积余额</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 场景推荐 ==================== -->`
);

// 修正 GLM 模型名（阿里云表内）
rep('GLM-4.7</a>, <a href="https://www.bigmodel.cn/" target="_blank" rel="noopener noreferrer">GLM-5</a>', 'GLM-5.2</a>, <a href="https://www.bigmodel.cn/" target="_blank" rel="noopener noreferrer">GLM-5.1</a>');

fs.writeFileSync(fp, s, 'utf8');
const m = s.match(/\?\?\?/g);
console.log('pass3 done. Remaining ???', m ? m.length : 0);
