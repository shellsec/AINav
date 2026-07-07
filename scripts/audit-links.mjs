import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

function walkTools(nodes, out = []) {
  for (const n of nodes || []) {
    if (n.tools) {
      for (const t of n.tools) {
        out.push({
          title: String(t.title || "").trim(),
          link: String(t.link || "").trim(),
          cat: n.name || n.id,
        });
      }
    }
    if (n.children) walkTools(n.children, out);
  }
  return out;
}

const site = JSON.parse(fs.readFileSync(path.join(root, "site-data.json"), "utf8"));
const ext = JSON.parse(fs.readFileSync(path.join(root, "nav-extensions.json"), "utf8"));
const siteTools = walkTools(site.tree || []);
const extTools = (ext.categories || []).flatMap((c) =>
  (c.tools || []).map((t) => ({
    title: String(t.title || "").trim(),
    link: String(t.link || "").trim(),
    cat: c.name,
  }))
);

const siteByTitle = new Map();
for (const t of siteTools) {
  if (!siteByTitle.has(t.title)) siteByTitle.set(t.title, []);
  siteByTitle.get(t.title).push(t);
}

console.log("=== nav-extensions vs site-data (same title, different link) ===");
let mismatch = 0;
for (const t of extTools) {
  const rows = siteByTitle.get(t.title) || [];
  if (!rows.length) continue;
  const links = [...new Set(rows.map((r) => r.link))];
  if (!links.includes(t.link)) {
    mismatch++;
    console.log(`${t.title}`);
    console.log(`  ext:  ${t.link}`);
    for (const r of rows) console.log(`  site: ${r.link} | ${r.cat}`);
    console.log("");
  }
}
if (!mismatch) console.log("(none)\n");

console.log("=== duplicate titles, different links in site-data ===");
let dupTitle = 0;
for (const [title, rows] of siteByTitle.entries()) {
  const links = [...new Set(rows.map((r) => r.link))];
  if (links.length > 1) {
    dupTitle++;
    console.log(title);
    for (const r of rows) console.log(`  ${r.link} | ${r.cat}`);
    console.log("");
  }
}
if (!dupTitle) console.log("(none)\n");

console.log("=== duplicate titles, same link (expected for cross-category) ===");
let dupSame = 0;
for (const [title, rows] of siteByTitle.entries()) {
  if (rows.length > 1) {
    const links = [...new Set(rows.map((r) => r.link))];
    if (links.length === 1) dupSame++;
  }
}
console.log(`${dupSame} titles appear in multiple categories with same link\n`);

const md = fs.readFileSync(path.join(root, "Full_AI_Encyclopedia_Final_Verified_2026.md"), "utf8");
const fakeMd = [...md.matchAll(/\|\s*[^|]+\|\s*[^|]+\|[^|]*\|\s*(https?:\/\/[^|\s]+)\s*\|/g)]
  .map((m) => m[1])
  .filter((u) => /[\u4e00-\u9fff（）]/.test(u));
console.log("=== encyclopedia md placeholder URLs ===");
console.log(fakeMd.length ? fakeMd.join("\n") : "(none)");
