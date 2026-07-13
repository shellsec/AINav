#!/usr/bin/env node
/**
 * Report free-tier-hints.json coverage.
 * By default only fails if free-tier-priority.json links are missing.
 * Usage:
 *   node scripts/check-free-tier-hints.js           # priority gate
 *   node scripts/check-free-tier-hints.js --all      # fail on any missing (legacy)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ALL = process.argv.includes("--all");

const siteData = JSON.parse(fs.readFileSync(path.join(ROOT, "site-data.json"), "utf8"));
const hintsPath = path.join(ROOT, "free-tier-hints.json");
const hints = fs.existsSync(hintsPath) ? JSON.parse(fs.readFileSync(hintsPath, "utf8")) : {};
const priorityPath = path.join(ROOT, "free-tier-priority.json");
const priority = fs.existsSync(priorityPath)
  ? JSON.parse(fs.readFileSync(priorityPath, "utf8"))
  : { links: [] };

function norm(link) {
  return String(link || "")
    .trim()
    .replace(/\/$/, "");
}

const links = new Set();
function walk(nodes) {
  if (!nodes) return;
  for (const n of nodes) {
    if (n.link) links.add(norm(n.link));
    if (n.tools) n.tools.forEach((t) => t.link && links.add(norm(t.link)));
    if (n.children) walk(n.children);
  }
}
walk(siteData.menus);
for (const t of Object.values(siteData.tools || {})) {
  if (t.link) links.add(norm(t.link));
}

const hintKeys = new Set(
  Object.keys(hints)
    .filter((k) => k !== "_readme")
    .map((k) => norm(k))
);

const missing = [...links].filter((l) => !hintKeys.has(l)).sort();
const covered = links.size - missing.length;
const pct = links.size ? ((covered / links.size) * 100).toFixed(1) : "0";

console.log(`Free-tier hints coverage (all tools): ${covered}/${links.size} (${pct}%)`);

const priorityLinks = (priority.links || []).map(norm).filter(Boolean);
const missingPriority = priorityLinks.filter((l) => !hintKeys.has(l));
const priCovered = priorityLinks.length - missingPriority.length;
console.log(
  `Priority whitelist: ${priCovered}/${priorityLinks.length} verified` +
    (priorityLinks.length ? ` (${((priCovered / priorityLinks.length) * 100).toFixed(0)}%)` : "")
);

if (missingPriority.length) {
  console.log("\nMissing PRIORITY hints:");
  missingPriority.forEach((l) => console.log("  -", l));
}

if (missing.length) {
  console.log("\nMissing hints overall (first 20):");
  missing.slice(0, 20).forEach((l) => console.log("  -", l));
  if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`);
}

if (ALL) {
  if (missing.length) process.exitCode = 1;
} else if (missingPriority.length) {
  process.exitCode = 1;
} else {
  console.log("\nOK: all priority free-tier hints present.");
}
