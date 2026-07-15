/**
 * AI Thinking Framework — Ideate · Ask · Plan · Debug · Agent
 * 页脚前静态入口条（非 fixed 浮窗）。
 * 首页已有顶栏「AI第一思考」+ 回顶按钮，故不做底部常驻浮窗，避免遮挡导航浏览。
 * 用法：<script src="thinking-framework.js"></script>
 */
(function(){
  if(document.getElementById('tf-root')) return;

  var css = '\
#tf-root{max-width:76rem;margin:2rem auto 0;padding:0 1rem}\
#tf-root *{box-sizing:border-box}\
.tf-bar{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.2rem;border-radius:10px;background:var(--card);border:1px solid var(--border);transition:border-color .2s}\
.tf-bar:hover{border-color:rgba(88,166,255,.3)}\
.tf-bar-title{font-size:.95rem;font-weight:700;color:var(--text);white-space:nowrap}\
.tf-bar-title span{color:var(--muted);font-weight:400;font-size:.82rem;margin-left:.4rem}\
.tf-pill-wrap{display:flex;gap:.4rem;flex:1;justify-content:center;flex-wrap:wrap}\
.tf-pill{padding:.25rem .6rem;border-radius:5px;font-size:.78rem;font-weight:600;white-space:nowrap;text-decoration:none;transition:transform .15s,box-shadow .15s}\
.tf-pill:hover{text-decoration:none;transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.15)}\
.tf-pill-ideate{background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.2);color:#a78bfa}\
.tf-pill-ask{background:rgba(88,166,255,.08);border:1px solid rgba(88,166,255,.18);color:var(--accent)}\
.tf-pill-plan{background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.18);color:var(--af)}\
.tf-pill-debug{background:rgba(210,153,34,.08);border:1px solid rgba(210,153,34,.18);color:var(--warn)}\
.tf-pill-agent{background:rgba(63,185,80,.08);border:1px solid rgba(63,185,80,.18);color:var(--accent2)}\
.tf-pill-prompt{background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.18);color:#a78bfa}\
.tf-link{font-size:.78rem;color:var(--muted);white-space:nowrap}\
.tf-link a{color:var(--accent);font-weight:600}\
';

  var html = '\
<div id="tf-root">\
  <div class="tf-bar">\
    <div class="tf-bar-title">💡 AI第一思考<span>一切提效的底层逻辑</span></div>\
    <div class="tf-pill-wrap">\
      <a href="ideate.html" class="tf-pill tf-pill-ideate">✨ Ideate</a>\
      <a href="ask.html" class="tf-pill tf-pill-ask">💬 Ask</a>\
      <a href="plan.html" class="tf-pill tf-pill-plan">🗺️ Plan</a>\
      <a href="debug.html" class="tf-pill tf-pill-debug">🔧 Debug</a>\
      <a href="agent.html" class="tf-pill tf-pill-agent">🤖 Agent</a>\
      <a href="prompt-guide.html" class="tf-pill tf-pill-prompt">📝 提示词指南</a>\
    </div>\
    <div class="tf-link"><a href="thinking-framework.html">总览 →</a></div>\
  </div>\
</div>';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var footer = document.querySelector('.cp-footer');
  if(!footer){
    document.body.insertAdjacentHTML('beforeend', html);
  } else {
    footer.insertAdjacentHTML('beforebegin', html);
  }
})();
