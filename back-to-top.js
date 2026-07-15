/**
 * AINav — 右下角「回到顶部」
 * 用法：<script src="back-to-top.js"></script>
 * 若页面已有 .back-to-top / .btn-back-top 等按钮则跳过，不重复创建。
 */
(function () {
  if (window.__ainavBackToTop) return;
  window.__ainavBackToTop = true;

  var EXISTING =
    ".back-to-top, .btn-back-top, #backToTop, #ftBackToTop, #ecBackToTop, #btn-top, #back-to-top";
  if (document.querySelector(EXISTING)) return;

  var css =
    "#ainav-btt{position:fixed;right:1.25rem;bottom:1.25rem;z-index:100;" +
    "width:44px;height:44px;padding:0;border-radius:50%;" +
    "border:1px solid var(--border,#2d3848);background:var(--card,#1c2430);" +
    "color:var(--accent,#58a6ff);font-size:1.15rem;line-height:1;cursor:pointer;" +
    "display:flex;align-items:center;justify-content:center;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.35);opacity:0;visibility:hidden;" +
    "transition:opacity .2s,visibility .2s,background .15s,transform .15s;" +
    "font-family:inherit;-webkit-tap-highlight-color:transparent}" +
    "#ainav-btt:hover{background:var(--panel,#151b23);color:var(--text,#e6edf3);transform:translateY(-2px)}" +
    "#ainav-btt:focus-visible{outline:2px solid var(--accent,#58a6ff);outline-offset:2px}" +
    "#ainav-btt.is-visible{opacity:1;visibility:visible}" +
    "@media(max-width:768px){#ainav-btt{right:1rem;bottom:calc(1rem + env(safe-area-inset-bottom,0px));width:40px;height:40px;font-size:1.05rem}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function mount() {
    if (document.getElementById("ainav-btt") || document.querySelector(EXISTING)) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "ainav-btt";
    btn.className = "back-to-top";
    btn.setAttribute("aria-label", "回到顶部");
    btn.title = "回到顶部";
    btn.textContent = "↑";
    document.body.appendChild(btn);

    var threshold = 400;
    function sync() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle("is-visible", y > threshold);
    }
    btn.addEventListener("click", function () {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    });
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
