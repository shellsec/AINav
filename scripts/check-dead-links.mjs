#!/usr/bin/env node
/**
 * Probe links for obvious dead URLs.
 * Default: daily-tools + free-tier-priority (fast gate).
 * Usage:
 *   node scripts/check-dead-links.mjs
 *   node scripts/check-dead-links.mjs --ext          # also nav-extensions
 *   node scripts/check-dead-links.mjs --timeout 12000
 * Exit 1 if any checked URL fails (network errors / hard 404/410).
 * Soft-fail statuses (403/429) count as OK (bot blocking).
 */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const includeExt = process.argv.includes("--ext");
const timeoutMs = (() => {
  const i = process.argv.indexOf("--timeout");
  if (i >= 0 && process.argv[i + 1]) return Number(process.argv[i + 1]) || 10000;
  return 10000;
})();

function normalizeList(items) {
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    const link = String(raw || "").trim();
    if (!/^https?:\/\//i.test(link)) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    out.push(link);
  }
  return out;
}

function collectTargets() {
  const links = [];
  const dailyPath = path.join(root, "daily-tools.json");
  if (fs.existsSync(dailyPath)) {
    const daily = JSON.parse(fs.readFileSync(dailyPath, "utf8"));
    for (const t of daily.items || []) if (t && t.link) links.push(t.link);
  }
  const priorityPath = path.join(root, "free-tier-priority.json");
  if (fs.existsSync(priorityPath)) {
    const pri = JSON.parse(fs.readFileSync(priorityPath, "utf8"));
    for (const l of pri.links || []) links.push(l);
  }
  if (includeExt) {
    const extPath = path.join(root, "nav-extensions.json");
    if (fs.existsSync(extPath)) {
      const ext = JSON.parse(fs.readFileSync(extPath, "utf8"));
      for (const cat of ext.categories || []) {
        for (const t of cat.tools || []) if (t && t.link) links.push(t.link);
      }
    }
  }
  return normalizeList(links);
}

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "AINav-link-check/1.0" },
    });
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "user-agent": "AINav-link-check/1.0" },
      });
    }
    const softOk = res.status === 403 || res.status === 429;
    return { url, ok: res.status < 400 || softOk, status: res.status };
  } catch (e) {
    return {
      url,
      ok: false,
      status: 0,
      error: e.name === "AbortError" ? "timeout" : String(e.message || e),
    };
  } finally {
    clearTimeout(timer);
  }
}

const targets = collectTargets();
console.log(
  `Checking ${targets.length} URLs (timeout ${timeoutMs}ms${includeExt ? ", +extensions" : ", hot+priority"})…`
);

const results = [];
const concurrency = 6;
let idx = 0;
async function worker() {
  while (idx < targets.length) {
    const i = idx++;
    results[i] = await probe(targets[i]);
    const r = results[i];
    const mark = r.ok ? "OK" : "FAIL";
    console.log(`${mark}\t${r.status || "-"}\t${r.url}${r.error ? " (" + r.error + ")" : ""}`);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const failed = results.filter((r) => r && !r.ok);
console.log(`\nDone: ${results.length - failed.length} ok, ${failed.length} failed`);
if (failed.length) {
  console.log("\nFailed:");
  for (const f of failed) console.log(`  - [${f.status || f.error}] ${f.url}`);
  process.exitCode = 1;
}
