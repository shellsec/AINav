#!/usr/bin/env node
/** One-time helper: inject plan-nav.js into *-plan.html (idempotent). */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const plans = fs.readdirSync(ROOT).filter((f) => f.endsWith("-plan.html"));

for (const file of plans) {
  const fp = path.join(ROOT, file);
  let html = fs.readFileSync(fp, "utf8");
  if (html.includes("plan-nav.js")) continue;

  html = html.replace(/<div class="cp-nav">/g, '<div class="cp-nav" data-plan-nav>');
  html = html.replace(/<nav class="cp-nav">/g, '<nav class="cp-nav" data-plan-nav>');

  const tag = `<script src="plan-nav.js" data-active="${file}"></script>\n`;
  if (html.includes('<script src="thinking-framework.js">')) {
    html = html.replace('<script src="thinking-framework.js">', tag + '<script src="thinking-framework.js">');
  } else {
    html = html.replace("</body>", tag + "</body>");
  }

  if (file === "coding-plan.html") {
    html = html.replace(
      /\n        \/\/ Navigation links[\s\S]*?if \(navLinks\[5\]\) navLinks\[5\]\.textContent = dict\.navEncyclopedia;\n/,
      "\n"
    );
  }

  fs.writeFileSync(fp, html, "utf8");
  console.log("patched", file);
}
