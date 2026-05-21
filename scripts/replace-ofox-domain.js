#!/usr/bin/env node
/** Replace ofox.io → ofox.io across source files (UTF-8 safe). */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP = new Set(["node_modules", ".git", "icons", ".playwright-cli"]);
const EXTS = new Set([".html", ".js", ".json", ".md", ".cjs", ".mjs", ".bat"]);

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fp);
    else if (EXTS.has(path.extname(ent.name))) {
      const text = fs.readFileSync(fp, "utf8");
      if (!text.includes("ofox.io")) continue;
      fs.writeFileSync(fp, text.replace(/ofox\.ai/g, "ofox.io"), "utf8");
      console.log("updated", path.relative(ROOT, fp));
    }
  }
}

walk(ROOT);
