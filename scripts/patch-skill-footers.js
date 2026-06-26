// Patch skill HTML footers with AINav cross-links (correct relative paths).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "skill");
const MONITOR_LINE =
  'Powered by <a href="https://github.com/shellsec/skill-monitor">Skill Monitor</a> · Auto-updated via GitHub Actions';

function relPrefix(filePath) {
  const dir = path.relative(ROOT, path.dirname(filePath)).replace(/\\/g, "/");
  const depth = !dir || dir === "." ? 1 : dir.split("/").filter(Boolean).length + 1;
  return Array(depth).fill("..").join("/");
}

function footerHtml(prefix) {
  return `    <div class="footer">
        <a href="${prefix}/index.html">← AINav 首页</a> · <a href="${prefix}/skill-plan.html">Skill 最佳实践</a> · <a href="${prefix}/token-optimization.html">Token优化</a> · <a href="${prefix}/free-tier.html">免费额度</a><br>
        ${MONITOR_LINE}
    </div>`;
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "api") continue;
      walk(full, out);
    } else if (name.endsWith(".html")) {
      out.push(full);
    }
  }
}

const files = [];
walk(ROOT, files);
let n = 0;
for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes(MONITOR_LINE)) continue;
  const neu = footerHtml(relPrefix(file));
  s = s.replace(/<div class="footer">[\s\S]*?Auto-updated via GitHub Actions\s*<\/div>/, neu);
  fs.writeFileSync(file, s);
  n++;
}
console.log("patched", n, "skill html files");
