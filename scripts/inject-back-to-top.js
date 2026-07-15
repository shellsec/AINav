/**
 * Inject back-to-top.js before </body> on all site HTML pages.
 * Skip if already present. Compute relative src by file depth.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "chrome" && false) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, out);
    } else if (name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

function relScript(fromFile) {
  const dir = path.dirname(fromFile);
  let rel = path.relative(dir, path.join(root, "back-to-top.js")).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

const files = walk(root);
let added = 0;
let skipped = 0;

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");
  if (/back-to-top\.js/.test(html)) {
    skipped++;
    continue;
  }
  if (!/<\/body>/i.test(html)) {
    skipped++;
    continue;
  }
  const src = relScript(file);
  const tag = `<script src="${src}"></script>`;
  html = html.replace(/<\/body>/i, `${tag}\n</body>`);
  fs.writeFileSync(file, html, "utf8");
  added++;
  console.log("+", path.relative(root, file), "→", src);
}

console.log(`Done. added=${added} skipped=${skipped} total=${files.length}`);
