/** Inject site-mobile.css once (for pages without plan-nav.js). */
(function () {
  if (document.querySelector('link[href*="site-mobile.css"]')) return;
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "site-mobile.css";
  document.head.appendChild(link);
})();
