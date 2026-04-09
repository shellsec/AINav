/**
 * 根据 site-data.json 中的 avatar 字段下载图标到 ./icons/，
 * 并生成 icons/manifest.json。已完成本地化的图标会自动跳过。
 * 完成后请执行 node build-html-data.js 生成使用本地路径的 index.html。
 * 若需更换图标远程源，修改下方 BASE 变量即可。
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SITE_DATA = path.join(ROOT, "site-data.json");
const ICONS_DIR = path.join(ROOT, "icons");
const MANIFEST = path.join(ICONS_DIR, "manifest.json");
const BASE = "https://shellsec.github.io/AINav";

if (!fs.existsSync(SITE_DATA)) {
  console.error("缺少 site-data.json，请先运行: node build-html-data.js");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(SITE_DATA, "utf8"));

function collectAvatars(menus, set) {
  for (const n of menus || []) {
    if (n.tools) for (const t of n.tools) if (t.avatar) set.add(t.avatar);
    if (n.children) collectAvatars(n.children, set);
  }
}

const unique = new Set();
collectAvatars(data.menus, unique);
for (const t of Object.values(data.tools || {})) if (t.avatar) unique.add(t.avatar);

function webRelFromDisk(absFile) {
  return path.relative(ROOT, absFile).split(path.sep).join("/");
}

function diskPathForAvatar(avatar) {
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    let u;
    try {
      u = new URL(avatar);
    } catch {
      return null;
    }
    const base = path.basename(u.pathname);
    const safe = base && base !== "/" ? base : "asset.bin";
    const h = crypto.createHash("md5").update(avatar).digest("hex").slice(0, 10);
    const ext = path.extname(safe) || ".bin";
    const name = `${h}${ext}`;
    return path.join(ICONS_DIR, "_ext", name);
  }
  const rel = avatar.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!rel || rel.includes("..")) return null;
  return path.join(ICONS_DIR, ...rel.split("/"));
}

function remoteUrlForAvatar(avatar) {
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
  const rel = avatar.replace(/^\/+/, "");
  return `${BASE}/${rel}`;
}

async function downloadOne(url, dest) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "DesktopAINavigator/1.0 (local icon mirror)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 32) throw new Error("too small");
  return buf;
}

fs.mkdirSync(ICONS_DIR, { recursive: true });

const manifest = {};
let ok = 0;
let skip = 0;
const fails = [];

for (const avatar of unique) {
  const dest = diskPathForAvatar(avatar);
  if (!dest) {
    fails.push({ avatar, err: "invalid path" });
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const url = remoteUrlForAvatar(avatar);
  try {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      manifest[avatar] = webRelFromDisk(dest);
      skip++;
      continue;
    }
    const buf = await downloadOne(url, dest);
    fs.writeFileSync(dest, buf);
    manifest[avatar] = webRelFromDisk(dest);
    ok++;
  } catch (e) {
    fails.push({ avatar, url, err: String(e.message || e) });
  }
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
console.log(`图标: 新下载 ${ok}，已存在跳过 ${skip}，失败 ${fails.length}，manifest 条目 ${Object.keys(manifest).length}`);
if (fails.length) {
  console.log("失败示例（最多 8 条）:");
  fails.slice(0, 8).forEach((f) => console.log(" ", f.avatar, "->", f.err));
}
console.log("请执行: node build-html-data.js");
