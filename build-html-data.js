/**
 * 从 site-data.json 读取分类与工具数据，生成 index.html 与 ai-encyclopedia-2026.html（源自 Full_AI_Encyclopedia_Final_Verified_2026.md）。
 * 数据源 site-data.json 可由社区协作维护，不再依赖上游 bundle。
 * 可选 category-order.json：顶层与子分组分类顺序。
 * 可选 daily-tools.json：替换「热门工具」为日常自用清单。
 * 可选 nav-extensions.json：合并扩展大类（API 聚合、MCP、RAG 等）。
 * 可选 append-leaf-tools.json：向某分组下的叶子分类追加条目。
 * 图标本地化: node download-icons.mjs 后再运行本脚本。
 */
const fs = require("fs");
const path = require("path");
const { loadEncyclopediaFullTable, ENCYCLOPEDIA_MD_PRIMARY } = require("./full-ai-encyclopedia.js");
const ROOT = __dirname;
const siteDataPath = path.join(ROOT, "site-data.json");
if (!fs.existsSync(siteDataPath)) {
  console.error("缺少 site-data.json，请先准备工具数据文件");
  process.exit(1);
}
const siteDataRaw = JSON.parse(fs.readFileSync(siteDataPath, "utf8"));

let tools = siteDataRaw.tools || {};
let tree = siteDataRaw.menus || [];

function slugify(str) {
  return str
    .replace(/\s+/g, "-")
    .replace(/[（）()]/g, "")
    .replace(/[^\w\u4e00-\u9fff-]/g, "")
    .slice(0, 48) || "sec";
}

// Build titleToTool lookup from tools
const titleToTool = {};
for (const [key, t] of Object.entries(tools)) {
  titleToTool[t.title] = { key, ...t };
  titleToTool[key] = { key, ...t };
}

/** 可选 daily-tools.json：将「热门工具」等分类替换为自用日常清单（删文件即恢复包内默认） */
const dailyPath = path.join(ROOT, "daily-tools.json");
if (fs.existsSync(dailyPath)) {
  try {
    const daily = JSON.parse(fs.readFileSync(dailyPath, "utf8"));
    const mode = daily.mode && String(daily.mode);
    const matchName =
      (daily.matchName && String(daily.matchName).trim()) || "热门工具";
    if (mode === "replace-hot" && Array.isArray(daily.items) && daily.items.length) {
      const normalized = daily.items
        .filter((t) => t && t.title && t.link)
        .map((t, i) => ({
          key: `daily-${i}`,
          title: String(t.title).trim(),
          subtitle: t.subtitle != null ? String(t.subtitle) : "",
          avatar: t.avatar != null ? String(t.avatar) : "",
          link: String(t.link).trim(),
          path: t.path != null ? String(t.path) : "",
          added: t.added != null ? String(t.added) : "",
        }));
      const hot = tree.find((n) => n.type === "leaf" && n.name === matchName);
      if (hot) {
        hot.tools = normalized;
        console.log(`daily-tools.json: 已替换「${matchName}」`, normalized.length, "条");
      } else {
        console.warn(`daily-tools.json: 未找到「${matchName}」分类，跳过替换`);
      }
    }
  } catch (e) {
    console.error("daily-tools.json:", e.message);
  }
}

const extFile = path.join(ROOT, "nav-extensions.json");
if (fs.existsSync(extFile)) {
  try {
    const ext = JSON.parse(fs.readFileSync(extFile, "utf8"));
    let added = 0;
    for (const cat of ext.categories || []) {
      const name = cat.name && String(cat.name).trim();
      if (!name) continue;
      const list = (cat.tools || []).filter((t) => t && t.title && t.link);
      if (!list.length) continue;
      const toolsNorm = list.map((t, i) => ({
        key: `ext-${slugify(name)}-${i}`,
        title: String(t.title).trim(),
        subtitle: t.subtitle != null ? String(t.subtitle) : "",
        avatar: t.avatar != null ? String(t.avatar) : "",
        link: String(t.link).trim(),
        path: t.path != null ? String(t.path) : "",
        added: t.added != null ? String(t.added) : "",
      }));
      const idRaw = cat.id && String(cat.id).trim();
      tree.push({
        type: "leaf",
        name,
        id: idRaw ? slugify(idRaw) : slugify(name + "-扩展"),
        tools: toolsNorm,
      });
      added++;
    }
    if (added) console.log("nav-extensions.json:", added, "个扩展分类");
  } catch (e) {
    console.error("nav-extensions.json 解析失败:", e.message);
  }
}

/** 可选 category-order.json：调整顶层分类顺序；可选 childrenOrder 调整分组内子类顺序 */
function reorderTopLevel(nodes, seq) {
  if (!Array.isArray(seq) || !seq.length) return nodes;
  const list = seq.map((x) => String(x).trim()).filter(Boolean);
  const used = new Set();
  const byKey = new Map();
  for (const n of nodes) {
    if (n.id) byKey.set(n.id, n);
    if (n.name) byKey.set(n.name, n);
  }
  const next = [];
  for (const key of list) {
    const n = byKey.get(key);
    if (n && !used.has(n)) {
      next.push(n);
      used.add(n);
    }
  }
  for (const n of nodes) {
    if (!used.has(n)) next.push(n);
  }
  return next;
}

/** 向 bundle 里已有「分组 → 叶子分类」追加工具（用于上游无独立子类时并入如「常用工具」） */
function appendToolsToLeaf(tree, groupName, leafName, extraTools) {
  const g = tree.find((n) => n.type === "group" && n.name === groupName);
  if (!g || !Array.isArray(g.children)) return false;
  const leaf = g.children.find((c) => c.type === "leaf" && c.name === leafName);
  if (!leaf || !Array.isArray(leaf.tools)) return false;
  const seen = new Set(leaf.tools.map((t) => t && t.link).filter(Boolean));
  let n = 0;
  for (const t of extraTools) {
    if (!t || !t.title || !t.link) continue;
    const link = String(t.link).trim();
    if (seen.has(link)) continue;
    seen.add(link);
    leaf.tools.push({
      key: `extra-${slugify(String(t.title).trim())}-${leaf.tools.length}`,
      title: String(t.title).trim(),
      subtitle: t.subtitle != null ? String(t.subtitle) : "",
      avatar: t.avatar != null ? String(t.avatar) : "",
      link,
      path: t.path != null ? String(t.path) : "",
      added: t.added != null ? String(t.added) : "",
    });
    n++;
  }
  return n > 0;
}

function reorderChildren(parent, seq) {
  if (!parent || parent.type !== "group" || !Array.isArray(parent.children)) return;
  if (!Array.isArray(seq) || !seq.length) return;
  const list = seq.map((x) => String(x).trim()).filter(Boolean);
  const used = new Set();
  const byKey = new Map();
  for (const c of parent.children) {
    if (c.id) byKey.set(c.id, c);
    if (c.name) byKey.set(c.name, c);
  }
  const next = [];
  for (const key of list) {
    const c = byKey.get(key);
    if (c && !used.has(c)) {
      next.push(c);
      used.add(c);
    }
  }
  for (const c of parent.children) {
    if (!used.has(c)) next.push(c);
  }
  parent.children = next;
}

const orderPath = path.join(ROOT, "category-order.json");
if (fs.existsSync(orderPath)) {
  try {
    const ord = JSON.parse(fs.readFileSync(orderPath, "utf8"));
    const seq = ord.topLevel || ord.order;
    if (Array.isArray(seq) && seq.length) {
      tree = reorderTopLevel(tree, seq);
      console.log("category-order.json: 已重排顶层分类");
    }
    const nested = ord.childrenOrder || ord.nested;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      let n = 0;
      for (const [parentName, childSeq] of Object.entries(nested)) {
        const p = tree.find(
          (node) => node.type === "group" && node.name === parentName
        );
        if (p && Array.isArray(childSeq)) {
          reorderChildren(p, childSeq);
          n++;
        }
      }
      if (n) console.log("category-order.json: 已调整", n, "个分组内顺序");
    }
  } catch (e) {
    console.error("category-order.json:", e.message);
  }
}

const appendLeafPath = path.join(ROOT, "append-leaf-tools.json");
if (fs.existsSync(appendLeafPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(appendLeafPath, "utf8"));
    const blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
    for (const b of blocks) {
      const groupName = b.group && String(b.group).trim();
      const leafName = b.leaf && String(b.leaf).trim();
      const list = Array.isArray(b.tools) ? b.tools : [];
      if (!groupName || !leafName || !list.length) continue;
      if (!appendToolsToLeaf(tree, groupName, leafName, list)) {
        console.warn(
          `append-leaf-tools.json: 未找到「${groupName}」/「${leafName}」，跳过该块`
        );
      }
    }
  } catch (e) {
    console.error("append-leaf-tools.json:", e.message);
  }
}

const generatedAt = new Date().toISOString();
const generatedAtLabel = new Date(generatedAt).toLocaleString("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
console.log("menus top", tree.length, "tools", Object.keys(tools).length);

const manifestPath = path.join(ROOT, "icons", "manifest.json");
let iconManifest = {};
if (fs.existsSync(manifestPath)) {
  try {
    iconManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    iconManifest = {};
  }
}

function iconSrc(avatar) {
  if (!avatar) return "";
  if (iconManifest[avatar]) return iconManifest[avatar];
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
  // 本地路径：直接用作相对路径
  return avatar.replace(/^\//, "");
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Map Chinese category name → i18n key for data-i18n attribute */
const catI18nMap = {
  "热门工具": "catHotTools",
  "AI 聊天对话": "catAIChat",
  "AI 搜索工具": "catAISearch",
  "AI 办公工具": "catAIOffice",
  "AI 求职招聘": "catAIJobHunting",
  "简历工具": "catResumeTools",
  "面试助手": "catInterviewAI",
  "效率提升": "catEfficiency",
  "文档工具": "catDocTools",
  "办公会议": "catOfficeMeeting",
  "Excel表格": "catExcel",
  "幻灯片(PPT)": "catPPT",
  "思维导图": "catMindMap",
  "AI 写作工具": "catAIWriting",
  "AI 编程工具": "catAICoding",
  "AI 图像工具": "catAIImage",
  "常用工具": "catCommonTools",
  "背景移除": "catBgRemove",
  "人物抹除": "catPersonRemove",
  "AI 视频工具": "catAIVideo",
  "AI 音频工具": "catAIAudio",
  "AI 音乐 · 唱歌与配乐": "catAIMusic",
  "AI 设计工具": "catAIDesign",
  "前端 UI · AI 3D 与视觉设计": "catUI3D",
  "AI 翻译工具": "catAITranslation",
  "AI 指令提示": "catAIPrompts",
  "AI 内容检测": "catAIDetection",
  "AI 法律助手": "catAILaw",
  "AI 经典书籍": "catAIBooks",
  "AI 开源模型": "catAIModels",
  "AI 学习网站": "catAILearning",
  "AI 开发框架": "catAIFramework",
  "AI 模型 API · 路由聚合 · 推理云": "catAPIRouter",
  "AI 智能体 · 工作流与自动化": "catAgentWorkflow",
  "AI 场景 · 用例与最佳实践": "catAIUsecases",
  "LLM 网关 · 代理 · SDK 与可观测": "catLLMGateway",
  "MCP · 模型上下文协议与工具生态": "catMCP",
  "RAG · 向量库与检索基建": "catRAG",
  "AI 知识库 · 笔记与企业检索": "catAIKnowledge",
  "本地与私有化 · 推理引擎": "catLocalInfer",
  "浏览器自动化 · 电脑操控": "catBrowserAuto",
  "语音 · TTS/ASR 与实时多模态": "catVoiceRealtime",
  "AI 会议与语音纪要": "catAIMeeting",
  "数据 · 微调 · 合成与评测": "catDataTrain",
  "论文 · 资讯 · 榜单与评测": "catPaperRanking",
  "终端与 CLI 上的 AI": "catCLI",
  "Token 优化 · 成本管控与追踪": "catTokenOpt",
  "Agent 记忆 · 长期上下文与状态管理": "catAgentMemory",
  "AI 视频生成 · 动效与数字人": "catAIVideo",
  "AI 科研 · 学术搜索与自动化": "catAIResearch",
  "AI 浏览器与新形态": "catAIBrowser",
  "硬件 · 边缘推理与跑分": "catEdgeHardware",
  "AI 合规与标准": "catCompliance",
  "网络工具 · 隐私与安全": "catNetPrivacy",
  "GEO / AEO · AI 搜索优化": "catGEO",
  "临时邮箱 · 匿名收件": "catTempEmail",
  "接码 · 短信验证与虚拟号": "catSMSVerify",
  "AI 经典书籍与教材": "catAIBooksExt",
  "AI 榜单 · 产品与工具排行": "catAIRankings",
  "AI Skill · 提示技能与工具市场": "catAISkillHub",
};

function catI18nAttr(name) {
  const key = catI18nMap[name];
  return key ? ` data-i18n="${key}"` : "";
}

function siteDetailUrl(detailPath) {
  if (!detailPath) return "";
  // 本地化后不再提供上游站内详情页链接
  return "";
}

function isHttpUrlForEncyclopedia(s) {
  const t = String(s || "").trim();
  return (t.startsWith("http://") || t.startsWith("https://")) && t.length > 10;
}

function isTemplateRow(cells) {
  const joined = cells.join(" ");
  return joined.includes("中规中矩的 AI 工具") || joined.includes("调研效率翻倍，无广告搜索首选") || joined.includes("信息待核实，请以官网实际为准") || joined.includes("具体能力待核实");
}
function hasBadLink(url) {
  if (!url) return false;
  const t = url.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;
  // extract host portion between :// and first /
  const hostMatch = t.match(/^https?:\/\/([^/]+)/);
  if (!hostMatch) return false;
  const host = hostMatch[1];
  // check for non-ASCII characters (IDN domain names like 通义千问.com are invalid as clickable links)
  if (/[^\x00-\x7F]/.test(host)) return true;
  // check for invalid characters like · (middle dot) in host
  if (/[·\s]/.test(host)) return true;
  return false;
}
function buildAiEncyclopediaPage() {
  const tab = loadEncyclopediaFullTable(ROOT);
  const PRODUCT_I = 1;
  if (tab.missing || !tab.rows.length) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>百科 — 缺少源文件</title>
</head>
<body style="font-family:system-ui,sans-serif;padding:1.5rem">
  <p>未找到 <code>${esc(ENCYCLOPEDIA_MD_PRIMARY)}</code>，无法生成本页。</p>
  <p><a href="index.html">返回首页</a></p>
</body>
</html>`;
  }
  const OFFICIAL_I = tab.headers.indexOf("官方链接");
  const UPDATE_I = tab.headers.indexOf("更新");
  const hideOfficial = OFFICIAL_I >= 0;
  const hideUpdate = UPDATE_I >= 0;
  const thead = tab.headers
    .filter((_, i) => !(hideOfficial && i === OFFICIAL_I) && !(hideUpdate && i === UPDATE_I))
    .map((h) => `<th>${esc(h)}</th>`)
    .join("\n");

  // filter out rows with bad links
  const validRows = tab.rows.filter((cells) => {
    const official = hideOfficial ? cells[OFFICIAL_I] || "" : "";
    return !hasBadLink(official.trim());
  });

  // collect categories, stats
  const catSet = new Set();
  let templateCount = 0, totalCount = validRows.length;
  validRows.forEach((cells) => { if (cells[0]) catSet.add(cells[0]); });
  const categories = [...catSet];

  const bodyRows = validRows
    .map((cells) => {
      const official = hideOfficial ? cells[OFFICIAL_I] || "" : "";
      const product = cells[PRODUCT_I] || "";
      const cat = cells[0] || "";
      const isTpl = isTemplateRow(cells);
      if (isTpl) templateCount++;
      const rowClasses = [];
      if (isTpl) rowClasses.push("ec-template");
      // data-search: all visible cell text joined for full-text search
      const searchText = cells
        .filter((_, idx) => !(hideOfficial && idx === OFFICIAL_I) && !(hideUpdate && idx === UPDATE_I))
        .join(" ")
        .toLowerCase();
      const tds = cells
        .map((cell, idx) => {
          if (hideOfficial && idx === OFFICIAL_I) return null;
          if (hideUpdate && idx === UPDATE_I) return null;
          if (idx === PRODUCT_I && isHttpUrlForEncyclopedia(official)) {
            return `<td class="ec-name"><a href="${esc(official.trim())}" target="_blank" rel="noopener noreferrer">${esc(product)}</a></td>`;
          }
          return `<td>${esc(cell)}</td>`;
        })
        .filter(Boolean)
        .join("");
      return `<tr data-cat="${esc(cat)}" data-title="${esc(product)}" data-search="${esc(searchText)}" class="${rowClasses.join(" ")}">${tds}</tr>`;
    })
    .join("\n");

  const catAnchors = categories.map((c) => {
    const id = "cat-" + c.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-").replace(/-+/g, "-");
    return `<a class="ec-cat-chip" href="#${esc(id)}">${esc(c)}</a>`;
  }).join("");

  const catHeadings = categories.map((c) => {
    const id = "cat-" + c.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-").replace(/-+/g, "-");
    const count = validRows.filter(r => r[0] === c).length;
    return `<tr class="ec-cat-heading" id="${esc(id)}"><td colspan="99">${esc(c)} (${count})</td></tr>`;
  }).join("\n");

  // interleave rows with category headings
  const catRowMap = {};
  categories.forEach(c => { catRowMap[c] = []; });
  validRows.forEach((cells) => {
    const cat = cells[0] || "";
    const official = hideOfficial ? cells[OFFICIAL_I] || "" : "";
    const product = cells[PRODUCT_I] || "";
    const isTpl = isTemplateRow(cells);
    const rowClasses = [];
    if (isTpl) rowClasses.push("ec-template");
    const searchText = cells
      .filter((_, idx) => !(hideOfficial && idx === OFFICIAL_I) && !(hideUpdate && idx === UPDATE_I))
      .join(" ")
      .toLowerCase();
    const tds = cells
      .map((cell, idx) => {
        if (hideOfficial && idx === OFFICIAL_I) return null;
        if (hideUpdate && idx === UPDATE_I) return null;
        if (idx === PRODUCT_I && isHttpUrlForEncyclopedia(official)) {
          return `<td class="ec-name"><a href="${esc(official.trim())}" target="_blank" rel="noopener noreferrer">${esc(product)}</a></td>`;
        }
        return `<td>${esc(cell)}</td>`;
      })
      .filter(Boolean)
      .join("");
    if (catRowMap[cat]) {
      catRowMap[cat].push(`<tr data-cat="${esc(cat)}" data-title="${esc(product)}" data-search="${esc(searchText)}" class="${rowClasses.join(" ")}">${tds}</tr>`);
    }
  });
  const groupedRows = categories.map((c) => {
    const id = "cat-" + c.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-").replace(/-+/g, "-");
    const count = (catRowMap[c] || []).length;
    return `<tr class="ec-cat-heading" id="${esc(id)}"><td colspan="99">${esc(c)} (${count})</td></tr>\n${(catRowMap[c] || []).join("\n")}`;
  }).join("\n");

  const freeCount = validRows.filter(r => (r[2] || "").includes("完全免费")).length;
  const dynamicTitle = tab.title.replace(/\d+\s*条/, totalCount + " 条");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(dynamicTitle)} — 网页版</title>
  <meta name="description" content="AINav 百科：590+ AI 工具全量索引，含免费额度、产品分类与官网链接，支持搜索与筛选。">
  <link rel="canonical" href="https://aiv123.com/ai-encyclopedia-2026.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(dynamicTitle)}">
  <meta property="og:description" content="590+ AI 工具全量百科索引，含免费额度、产品分类与官网链接。">
  <meta property="og:url" content="https://aiv123.com/ai-encyclopedia-2026.html">
  <meta property="og:site_name" content="AINav">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='18' width='100' height='100' fill='%230969da'/><text x='50' y='72' font-size='60' text-anchor='middle' fill='white' font-family='system-ui' font-weight='700'>AI</text></svg>">
  <style>
    :root, html[data-theme="dark"] {
      --bg: #0f1419; --panel: #151b23; --card: #1c2430; --border: #2d3848;
      --text: #e6edf3; --muted: #8b9cb3; --accent: #58a6ff; --accent2: #3fb950;
      --warn: #d29922; --danger: #f85149;
    }
    html[data-theme="light"] {
      --bg: #f6f8fa; --panel: #fff; --card: #fff; --border: #d0d7de;
      --text: #1f2328; --muted: #59636e; --accent: #0969da; --accent2: #1a7f37;
      --warn: #9a6700; --danger: #cf222e;
    }
    @media (prefers-color-scheme: light) {
      html[data-theme="system"] {
        --bg: #f6f8fa; --panel: #fff; --card: #fff; --border: #d0d7de;
        --text: #1f2328; --muted: #59636e; --accent: #0969da; --accent2: #1a7f37;
        --warn: #9a6700; --danger: #cf222e;
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5; }
    a { color: var(--accent); }
    .ec-top { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); background: var(--panel); }
    .ec-top-inner { max-width: 96rem; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; justify-content: space-between; }
    .ec-nav a { font-weight: 600; margin-right: 1rem; }
    .ec-toolbar { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .theme-btn { font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 5px; border: 1px solid var(--border);
      background: var(--card); color: var(--muted); cursor: pointer; font-family: inherit; }
    .theme-btn.is-active { color: var(--accent); border-color: var(--accent); font-weight: 600; }
    .ec-wrap { max-width: 96rem; margin: 0 auto; padding: 1rem; }
    .ec-wrap h1 { font-size: 1.2rem; margin: 0 0 0.5rem; }
    .ec-stats { font-size: 0.78rem; color: var(--muted); margin-bottom: 0.65rem; }
    .ec-stats span { margin-right: 0.8rem; }
    .ec-stats .ec-warn { color: var(--warn); }
    .ec-filter-wrap { max-width: 28rem; position: relative; margin-bottom: 0.75rem; }
    .ec-filter { width: 100%; padding: 0.45rem 0.65rem 0.45rem 2rem; border-radius: 6px; border: 1px solid var(--border);
      background: var(--panel); color: var(--text); font-size: 0.9rem; outline: none; transition: border-color 0.15s; }
    .ec-filter:focus { border-color: var(--accent); }
    .ec-filter-icon { position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.9rem; pointer-events: none; }
    .ec-filter-count { position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.72rem; }
    .ec-cats { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.75rem; }
    .ec-cat-chip { font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid var(--border);
      background: var(--card); color: var(--muted); text-decoration: none; white-space: nowrap; }
    .ec-cat-chip:hover { color: var(--accent); border-color: var(--accent); }
    .ec-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--card); max-height: 85vh; }
    table.ec-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .ec-table th, .ec-table td { padding: 0.4rem 0.45rem; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
    .ec-table th { background: var(--panel); color: var(--muted); font-weight: 600; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
    .ec-table tr:hover td { background: rgba(88,166,255,0.06); background: color-mix(in srgb, var(--accent) 6%, transparent); }
    .ec-table tr[hidden] { display: none; }
    .ec-name { white-space: nowrap; }
    .ec-cat-heading td { background: var(--panel); font-weight: 700; font-size: 0.8rem; color: var(--accent); padding: 0.5rem 0.65rem; position: sticky; top: 2.2em; z-index: 1; border-bottom: 2px solid var(--accent); }
    tr.ec-template td { opacity: 0.55; }
    tr.ec-template:hover td { opacity: 0.85; }
    .back-to-top {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 100;
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--accent);
      font-size: 1.15rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s, background 0.15s, transform 0.15s;
    }
    .back-to-top:hover {
      background: var(--panel);
      color: var(--text);
      transform: translateY(-2px);
    }
    .back-to-top:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .back-to-top.is-visible {
      opacity: 1;
      visibility: visible;
    }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    @media (max-width: 768px) {
      .ec-cats { max-height: 6rem; overflow-y: auto; }
      .ec-table { font-size: 0.65rem; }
    }
  </style>
</head>
<body>
  <script>
  (function () {
    try {
      var t = localStorage.getItem("ainav-theme");
      if (t === "light" || t === "dark" || t === "system") document.documentElement.setAttribute("data-theme", t);
      else document.documentElement.setAttribute("data-theme", "system");
    } catch (e) { document.documentElement.setAttribute("data-theme", "system"); }
  })();
  </script>
  <header class="ec-top">
    <div class="ec-top-inner">
      <div class="ec-nav">
        <a href="index.html">← 返回导航首页</a>
        <a href="free-tier.html">🆓 免费额度</a>
        <a href="coding-plan.html">编程套餐横评</a>
        <a href="agent-plan.html">Agent横评</a>
        <a href="video-plan.html">视频套餐横评</a>
      </div>
      <div class="ec-toolbar" role="group" aria-label="外观">
        <button type="button" class="theme-btn" data-theme-set="system">跟随系统</button>
        <button type="button" class="theme-btn" data-theme-set="light">浅色</button>
        <button type="button" class="theme-btn" data-theme-set="dark">深色</button>
      </div>
    </div>
  </header>
  <div class="ec-wrap">
    <h1>${esc(dynamicTitle)}</h1>
    <div class="ec-stats">
      <span>共 ${totalCount} 条</span><span>完全免费 ${freeCount}</span>${templateCount ? `<span class="ec-warn">模板占位 ${templateCount}</span>` : ""}
    </div>
    <div class="ec-filter-wrap">
      <span class="ec-filter-icon">🔍</span>
      <input type="search" id="ecFilter" class="ec-filter" placeholder="搜索分类、产品名、免费额度、备注等…" autocomplete="off" spellcheck="false">
      <span class="ec-filter-count" id="ecFilterCount"></span>
    </div>
    <div class="ec-cats" id="ecCats">${catAnchors}</div>
    <div class="ec-table-wrap">
      <table class="ec-table">
        <thead><tr>${thead}</tr></thead>
        <tbody id="ecTbody">
${groupedRows}
        </tbody>
      </table>
    </div>
  </div>
  <button type="button" class="back-to-top" id="ecBackToTop" aria-label="回到顶部" title="回到顶部">↑</button>
  <script>
(function () {
  var THEME_KEY = "ainav-theme";
  function setTheme(mode) {
    if (mode !== "light" && mode !== "dark" && mode !== "system") mode = "system";
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    document.querySelectorAll(".theme-btn[data-theme-set]").forEach(function (b) {
      var m = b.getAttribute("data-theme-set");
      b.classList.toggle("is-active", m === mode);
      b.setAttribute("aria-pressed", m === mode ? "true" : "false");
    });
  }
  var cur = "system";
  try {
    var s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark" || s === "system") cur = s;
  } catch (e) {}
  setTheme(cur);
  document.querySelectorAll(".theme-btn[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () { setTheme(b.getAttribute("data-theme-set")); });
  });

  var inp = document.getElementById("ecFilter");
  var tbody = document.getElementById("ecTbody");
  var countEl = document.getElementById("ecFilterCount");
  var catChips = document.querySelectorAll(".ec-cat-chip");
  var allDataRows = tbody.querySelectorAll("tr[data-cat]");
  var catHeadings = tbody.querySelectorAll("tr.ec-cat-heading");
  if (inp && tbody) {
    var filterTimer;
    function runEcFilter() {
      var q = (inp.value || "").trim().toLowerCase();
      var visible = 0;
      for (var i = 0; i < allDataRows.length; i++) {
        var tr = allDataRows[i];
        var search = (tr.getAttribute("data-search") || "").toLowerCase();
        var show = !q || search.indexOf(q) >= 0;
        tr.hidden = !show;
        if (show) visible++;
      }
      // show/hide category headings based on visible rows in that category
      for (var j = 0; j < catHeadings.length; j++) {
        var ch = catHeadings[j];
        var catId = ch.id;
        var next = ch.nextElementSibling;
        var hasVisible = false;
        while (next && !next.classList.contains("ec-cat-heading")) {
          if (!next.hidden) { hasVisible = true; break; }
          next = next.nextElementSibling;
        }
        ch.hidden = q ? !hasVisible : false;
      }
      if (countEl) countEl.textContent = q ? (visible + " 项") : "";
    }
    inp.addEventListener("input", function () {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(runEcFilter, 100);
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { inp.value = ""; runEcFilter(); inp.blur(); }
    });
  }
  // category chip: scroll to heading + filter to that category
  catChips.forEach(function (chip) {
    chip.addEventListener("click", function (e) {
      var href = chip.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      var target = document.getElementById(href.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // optionally set filter to category name
        if (inp) { inp.value = ""; runEcFilter(); }
      }
    });
  });

  // back to top button
  var btt = document.getElementById("ecBackToTop");
  if (btt) {
    function syncBtt() {
      btt.classList.toggle("is-visible", window.scrollY > 380);
    }
    window.addEventListener("scroll", syncBtt, { passive: true });
    syncBtt();
    btt.addEventListener("click", function () {
      var reduce = false;
      try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e3) {}
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      var hdr = document.querySelector(".ec-top");
      if (hdr) { try { hdr.focus({ preventScroll: true }); } catch (e2) {} }
    });
  }
})();
  </script>
<script src="thinking-framework.js"></script>
</body>
</html>`;
}

function collectNavEntries(nodes, depth = 0, acc = []) {
  for (const n of nodes) {
    if (n.type === "leaf" && n.tools.length) {
      acc.push({ depth, name: n.name, id: n.id });
    } else if (n.type === "group") {
      acc.push({ depth, name: n.name, id: n.id, isGroup: true });
      collectNavEntries(n.children, depth + 1, acc);
    }
  }
  return acc;
}

/** Load i18n-en.json (tool title/subtitle translations) if present */
const i18nEnPath = path.join(ROOT, "i18n-en.json");
let i18nEn = {};
if (fs.existsSync(i18nEnPath)) {
  try {
    i18nEn = JSON.parse(fs.readFileSync(i18nEnPath, "utf8"));
    console.log("i18n-en.json: loaded", Object.keys(i18nEn).length, "entries");
  } catch (e) {
    console.error("i18n-en.json:", e.message);
  }
}

/** Generate _toolTitles / _toolDescs injection for i18nDict.en */
function buildToolI18nInjection() {
  if (!Object.keys(i18nEn).length) return "";
  const titleEntries = Object.entries(i18nEn)
    .map(([title, tr]) => `${JSON.stringify(title)}:${JSON.stringify(tr.title || title)}`)
    .join(",");
  const descEntries = Object.entries(i18nEn)
    .filter(([, tr]) => tr.desc)
    .map(([title, tr]) => `${JSON.stringify(title)}:${JSON.stringify(tr.desc)}`)
    .join(",");
  let result = `,\n        _toolTitles: {${titleEntries}}`;
  if (descEntries) result += `,\n        _toolDescs: {${descEntries}}`;
  return result;
}
const toolI18nInjection = buildToolI18nInjection();

function renderTools(tools) {
  const now = Date.now();
  const NEW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  return tools
    .map((t) => {
      const detail = t.path ? siteDetailUrl(t.path) : "";
      const img = iconSrc(t.avatar);
      const addedDate = t.added ? String(t.added) : "";
      const isNew = addedDate && (now - new Date(addedDate).getTime()) < NEW_MS;
      const newBadge = isNew ? `<span class="card-new-badge">🆕</span>` : "";
      return `<article class="card${isNew ? " is-new" : ""}" data-link="${esc(t.link)}" data-title="${esc(t.title)}" data-subtitle="${esc(t.subtitle || "")}" data-avatar="${esc(t.avatar || "")}"${addedDate ? ` data-added="${esc(addedDate)}"` : ""}>
<button type="button" class="card-star" aria-label="加入常用收藏" title="常用收藏">☆</button>
<a class="card-main" href="${esc(t.link)}" target="_blank" rel="noopener noreferrer">
${img ? `<img class="card-icon" src="${esc(img)}" alt="" width="40" height="40" loading="lazy" decoding="async" onerror="fallbackIcon(this)">` : `<span class="card-icon-ph"></span>`}
<div class="card-body">
<h3 class="card-title">${esc(t.title)}${newBadge}</h3>
<p class="card-desc">${esc(t.subtitle || "")}</p>
</div>
</a>
${detail ? `<a class="card-meta" href="${esc(detail)}" target="_blank" rel="noopener noreferrer">站内详情</a>` : ""}
</article>`;
    })
    .join("\n");
}

function renderSections(nodes) {
  const parts = [];
  for (const n of nodes) {
    if (n.type === "leaf") {
      parts.push(`<section class="block" id="${esc(n.id)}">
<h2 class="block-title"${catI18nAttr(n.name)}>${esc(n.name)}</h2>
<div class="grid">${renderTools(n.tools)}</div>
</section>`);
    } else if (n.type === "group") {
      parts.push(`<section class="block group" id="${esc(n.id)}">
<h2 class="block-title"${catI18nAttr(n.name)}>${esc(n.name)}</h2>
${renderSections(n.children)}
</section>`);
    }
  }
  return parts.join("\n");
}

const navEntries = collectNavEntries(tree);
const navHtml =
  `<a class="nav-i nav-fav" href="#fav-block" data-i18n="catFav">★ 常用收藏</a>\n` +
  navEntries
    .map((e) => {
      const cls = e.isGroup ? "nav-g" : "nav-i";
      const pad = e.depth ? ` style="--d:${e.depth}"` : "";
      const i18n = catI18nAttr(e.name);
      return `<a class="${cls}" href="#${esc(e.id)}"${pad}${i18n}>${esc(e.name)}</a>`;
    })
    .join("\n");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AINav — AI 工具导航 | 590+ AI工具一网打尽</title>
  <meta name="description" content="AINav 是最全的 AI 工具导航站，收录 590+ AI 工具，涵盖 ChatGPT、Midjourney、智能体、RAG、MCP、本地推理等分类，支持收藏、搜索、深浅主题切换。">
  <meta name="keywords" content="AI工具导航,AI导航,AI工具大全,ChatGPT,Midjourney,AI工具推荐,人工智能工具,AINav">
  <link rel="canonical" href="https://aiv123.com/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="AINav — AI 工具导航 | 590+ AI工具一网打尽">
  <meta property="og:description" content="590+ AI 工具分类导航；含 API 聚合、MCP、RAG、本地推理、智能体等扩展分类，支持收藏、搜索、深浅主题。">
  <meta property="og:url" content="https://aiv123.com/">
  <meta property="og:site_name" content="AINav">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='18' width='100' height='100' fill='%230969da'/><text x='50' y='72' font-size='60' text-anchor='middle' fill='white' font-family='system-ui' font-weight='700'>AI</text></svg>">
  <!-- Google Analytics (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2B8FBWRX4N"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-2B8FBWRX4N');
</script>
<!-- End Google Analytics -->
<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "2d49f38b39c743ac80b6d6b9ff99494d"}'></script><!-- End Cloudflare Web Analytics -->
  <style>
    :root,
    html[data-theme="dark"] {
      --bg: #0f1419;
      --panel: #151b23;
      --card: #1c2430;
      --border: #2d3848;
      --text: #e6edf3;
      --muted: #8b9cb3;
      --accent: #58a6ff;
      --accent2: #3fb950;
      --star-on: #e3b341;
      --promo-cta-bg: rgba(63, 185, 80, 0.1);
      --promo-cta-hover: rgba(63, 185, 80, 0.18);
    }
    html[data-theme="light"] {
      --bg: #f6f8fa;
      --panel: #ffffff;
      --card: #ffffff;
      --border: #d0d7de;
      --text: #1f2328;
      --muted: #59636e;
      --accent: #0969da;
      --accent2: #1a7f37;
      --star-on: #9a6700;
      --promo-cta-bg: rgba(26, 127, 55, 0.12);
      --promo-cta-hover: rgba(26, 127, 55, 0.2);
    }
    @media (prefers-color-scheme: light) {
      html[data-theme="system"] {
        --bg: #f6f8fa;
        --panel: #ffffff;
        --card: #ffffff;
        --border: #d0d7de;
        --text: #1f2328;
        --muted: #59636e;
        --accent: #0969da;
        --accent2: #1a7f37;
        --star-on: #9a6700;
        --promo-cta-bg: rgba(26, 127, 55, 0.12);
        --promo-cta-hover: rgba(26, 127, 55, 0.2);
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .top {
      padding: 0.5rem 1rem 0.55rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
      text-align: center;
      max-width: 1400px;
      margin: 0 auto;
    }
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .top h1 { margin: 0 0 0.35rem; font-size: 1.35rem; font-weight: 600; }
    .top p { margin: 0; color: var(--muted); font-size: 0.9rem; }
    .top a.origin { color: var(--accent2); }
    .top-promo {
      margin-top: 0.35rem;
      margin-left: auto;
      margin-right: auto;
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--card);
      max-width: 52rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .top-promo-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.25rem 0.45rem;
    }
    .top-promo-badge {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--accent2);
      border: 1px solid rgba(63, 185, 80, 0.45);
      padding: 0.12rem 0.4rem;
      border-radius: 4px;
    }
    .top-promo-title {
      font-size: 0.76rem;
      color: var(--muted);
      line-height: 1.35;
    }
    .top-promo-ref {
      font-size: 0.76rem;
      color: var(--muted);
      line-height: 1.35;
    }
    .top-promo-ref .top-promo-code {
      cursor: pointer;
      transition: background 0.2s;
    }
    .top-promo-ref .top-promo-code:hover {
      background: color-mix(in srgb, var(--accent) 22%, transparent);
    }
    .top-promo-title-row {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.35rem 0.5rem;
      max-width: 100%;
    }
    .top-promo-models {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.22rem 0.3rem;
      margin-bottom: 0;
    }
    .top-promo-models span {
      font-size: 0.68rem;
      color: var(--text);
      background: var(--panel);
      border: 1px solid var(--border);
      padding: 0.12rem 0.32rem;
      border-radius: 4px;
      line-height: 1.25;
    }
    header.top a.top-promo-cta {
      display: inline-flex;
      align-items: center;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--accent2);
      text-decoration: none;
      padding: 0.28rem 0.65rem;
      border-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--accent2) 50%, transparent);
      background: var(--promo-cta-bg);
    }
    header.top a.top-promo-cta:hover {
      background: var(--promo-cta-hover);
      text-decoration: none;
      filter: brightness(1.05);
    }
    .top-promo-ref {
      margin: 0.3rem auto 0;
      padding: 0 0.5rem;
      max-width: 52rem;
      font-size: 0.68rem;
      line-height: 1.45;
      color: var(--muted);
      text-align: center;
    }
    .top-promo-ref a {
      color: var(--accent);
      word-break: break-all;
    }
    a.top-promo-link {
      display: inline-flex;
      align-items: center;
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--accent);
      margin-left: 0.35rem;
      text-decoration: none;
      white-space: nowrap;
    }
    a.top-promo-link:hover {
      text-decoration: underline;
    }
    .top-promo-code {
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      font-size: 0.85em;
      padding: 0.08rem 0.28rem;
      border-radius: 4px;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--text);
      border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
    }
    .top-promo-features {
      list-style: none;
      margin: 0.3rem 0 0.25rem;
      padding: 0 0.4rem;
      max-width: 48rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.22rem 0.32rem;
    }
    .top-promo-features li {
      margin: 0;
      font-size: 0.64rem;
      line-height: 1.3;
      color: var(--text);
      background: var(--panel);
      border: 1px solid var(--border);
      padding: 0.14rem 0.38rem;
      border-radius: 5px;
      text-align: left;
    }
    .top-promo-trust {
      margin: 0.15rem 0 0;
      padding: 0 0.6rem;
      max-width: 48rem;
      font-size: 0.64rem;
      line-height: 1.4;
      color: var(--muted);
      text-align: center;
    }
    .top-promo-privacy {
      margin: 0.35rem 0 0.15rem;
      padding: 0.35rem 0.55rem;
      max-width: 46rem;
      font-size: 0.62rem;
      line-height: 1.45;
      color: var(--muted);
      text-align: left;
      border-left: 3px solid color-mix(in srgb, var(--accent) 45%, transparent);
      background: color-mix(in srgb, var(--accent) 6%, transparent);
      border-radius: 0 6px 6px 0;
    }
    .top-promo-privacy strong {
      color: var(--text);
      font-weight: 600;
    }
    .top-plans {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.15rem 0.35rem;
      margin: 0.4rem auto 0;
      padding: 0.35rem 0.65rem;
      max-width: 52rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--card);
    }
    .top-plans-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent);
      margin-right: 0.2rem;
      white-space: nowrap;
    }
    .top-plans a {
      font-size: 0.76rem;
      font-weight: 500;
      color: var(--muted);
      text-decoration: none;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
      white-space: nowrap;
    }
    .top-plans a:hover {
      color: var(--accent2);
      background: var(--promo-cta-bg);
      text-decoration: none;
    }
    .top-plans-break {
      flex-basis: 100%;
      height: 0;
    }
    .top-encyclopedia-line {
      margin: 0 0 0.45rem;
      padding: 0 0.5rem;
      font-size: 0.84rem;
      text-align: center;
      line-height: 1.4;
    }
    .top-encyclopedia-line a {
      font-weight: 600;
      color: var(--accent2);
      text-decoration: none;
    }
    .top-encyclopedia-line a:hover {
      text-decoration: underline;
    }
    .top-encyclopedia-hint {
      display: inline-block;
      margin-left: 0.4rem;
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 400;
    }
    .top-toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: 0.3rem 0.4rem;
      flex-shrink: 0;
    }
    .global-search-wrap {
      flex: 1;
      min-width: 12rem;
      max-width: 32rem;
      position: relative;
    }
    .global-search {
      width: 100%;
      padding: 0.5rem 0.65rem 0.5rem 2rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--text);
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
    }
    .global-search:focus { border-color: var(--accent); }
    .global-search-icon {
      position: absolute;
      left: 0.6rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      font-size: 0.9rem;
      pointer-events: none;
    }
    .global-search-count {
      position: absolute;
      right: 0.65rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      font-size: 0.72rem;
    }
    .block.is-search-hidden { display: none; }
    .card.is-search-hidden { display: none; }
    .theme-btn {
      font-size: 0.72rem;
      padding: 0.2rem 0.5rem;
      border-radius: 5px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--muted);
      cursor: pointer;
      font-family: inherit;
    }
    .theme-btn:hover {
      color: var(--text);
      border-color: var(--accent);
    }
    .theme-btn.is-active {
      color: var(--accent);
      border-color: var(--accent);
      font-weight: 600;
    }
    .lang-btn { margin-left: 0.35rem; }
    .github-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4rem;
      height: 1.4rem;
      margin-left: 0.4rem;
      color: var(--muted);
      transition: color 0.2s;
      vertical-align: middle;
    }
    .github-link:hover { color: var(--text); }
    .github-link svg { width: 100%; height: 100%; fill: currentColor; }
    .layout {
      display: grid;
      grid-template-columns: minmax(200px, 260px) 1fr;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 100px);
    }
    aside {
      position: sticky;
      top: 0;
      align-self: start;
      max-height: 100vh;
      overflow-y: auto;
      padding: 1rem 0.75rem 2rem 1rem;
      border-right: 1px solid var(--border);
      background: var(--panel);
      font-size: 0.85rem;
    }
    aside a {
      display: block;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      color: var(--muted);
      text-decoration: none;
    }
    aside a:hover { background: var(--card); color: var(--text); }
    aside .nav-g { color: var(--text); font-weight: 600; margin-top: 0.65rem; }
    aside .nav-i { padding-left: calc(0.5rem + (var(--d, 0) * 10px)); }
    aside a.nav-fav { color: var(--star-on); font-weight: 600; }
    main { padding: 1.25rem 1.5rem 3rem; }
    .block { margin-bottom: 2.5rem; scroll-margin-top: 1rem; content-visibility: auto; contain-intrinsic-size: auto 500px; }
    .block.group .block { margin-left: 0; }
    .block-title {
      font-size: 1.1rem;
      margin: 0 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }
    .group > .block-title { font-size: 1.2rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.75rem;
    }
    .card {
      position: relative;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card-star {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 3;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      color: var(--muted);
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    }
    .card-star:hover {
      color: var(--accent);
    }
    .card-star.is-on {
      color: var(--star-on);
    }
    .card-main {
      display: flex;
      gap: 0.75rem;
      padding: 0.85rem;
      color: inherit;
      text-decoration: none;
      flex: 1;
      align-items: flex-start;
    }
    .card-main:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      background: var(--panel);
    }
    .card-icon-ph {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--panel);
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .card-body { min-width: 0; }
    .card-title { margin: 0; font-size: 0.95rem; font-weight: 600; }
    .card-desc {
      margin: 0.25rem 0 0;
      font-size: 0.78rem;
      color: var(--muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-new-badge {
      font-size: 0.72em;
      margin-left: 0.2rem;
      vertical-align: super;
      line-height: 1;
    }
    .card-meta {
      font-size: 0.72rem;
      padding: 0 0.85rem 0.65rem;
      color: var(--muted);
    }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .top-header { flex-wrap: wrap; }
      .global-search-wrap { min-width: 10rem; }
      aside {
        position: relative;
        max-height: none;
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
      aside.is-collapsed .nav-g,
      aside.is-collapsed .nav-i,
      aside.is-collapsed .nav-fav { display: none; }
      .sidebar-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.35rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--card);
        color: var(--muted);
        cursor: pointer;
        font-size: 0.82rem;
        font-family: inherit;
        margin-bottom: 0.5rem;
      }
      .sidebar-toggle:hover { color: var(--text); border-color: var(--accent); }
    }
    @media (min-width: 861px) {
      .sidebar-toggle { display: none; }
    }
    .back-to-top {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 100;
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--accent);
      font-size: 1.15rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s, background 0.15s, transform 0.15s;
    }
    .back-to-top:hover {
      background: var(--panel);
      color: var(--text);
      transform: translateY(-2px);
    }
    .back-to-top:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .back-to-top.is-visible {
      opacity: 1;
      visibility: visible;
    }
    .lang-float {
      position: fixed;
      right: 1.25rem;
      bottom: 4.75rem;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .lang-float button {
      width: 40px;
      height: 32px;
      padding: 0;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--accent);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .lang-float button:hover {
      background: var(--panel);
      color: var(--text);
    }
    .lang-float button.is-active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .lang-float .site-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: auto;
      min-width: 36px;
      padding: 0 0.4rem;
      height: 32px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--muted);
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .lang-float .site-link:hover {
      background: var(--panel);
      color: var(--text);
    }
    .site-footer {
      margin-top: 0;
      padding: 1.25rem 1.5rem 2.25rem;
      border-top: 1px solid var(--border);
      background: var(--panel);
      font-size: 0.75rem;
      color: var(--muted);
      line-height: 1.65;
      max-width: 1400px;
      margin-left: auto;
      margin-right: auto;
    }
    .site-footer p {
      margin: 0 0 0.5rem;
      max-width: 52rem;
    }
    .site-footer p:last-child {
      margin-bottom: 0;
    }
    .site-footer .site-tagline {
      color: var(--text);
      font-weight: 500;
    }
    .site-built {
      font-size: 0.7rem;
      opacity: 0.85;
    }
    .fav-hint {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--muted);
    }
    .fav-actions {
      display: inline-flex;
      gap: 0.35rem;
      margin-left: 0.5rem;
    }
    .fav-action-btn {
      font-size: 0.7rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--muted);
      cursor: pointer;
      font-family: inherit;
    }
    .fav-action-btn:hover { color: var(--text); border-color: var(--accent); }
    .fav-empty {
      margin: 0;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .fav-block.is-empty .fav-grid {
      display: none;
    }
    .fav-block:not(.is-empty) .fav-empty {
      display: none;
    }
    @media print {
      aside,
      .back-to-top,
      .lang-float,
      .compare-bar,
      .card-star,
      .top-toolbar,
      .top-promo-badge,
      .top-promo-features,
      .top-promo-trust,
      .top-promo-privacy {
        display: none !important;
      }
      .layout {
        grid-template-columns: 1fr !important;
        max-width: none !important;
      }
      body {
        background: #fff !important;
        color: #000 !important;
      }
      .card,
      .site-footer,
      header.top {
        background: #fff !important;
        border-color: #ccc !important;
      }
      a {
        color: #000 !important;
        text-decoration: underline;
      }
    }
  </style>
</head>
<body>
  <script>
  (function () {
    try {
      var t = localStorage.getItem("ainav-theme");
      if (t === "light" || t === "dark" || t === "system")
        document.documentElement.setAttribute("data-theme", t);
      else document.documentElement.setAttribute("data-theme", "system");
    } catch (e) {
      document.documentElement.setAttribute("data-theme", "system");
    }
  })();
  </script>
  <header class="top" id="page-top" tabindex="-1">
    <div class="top-header">
      <div class="global-search-wrap">
        <span class="global-search-icon">🔍</span>
        <input type="search" id="globalSearch" class="global-search" placeholder="搜索工具名称或描述… ( / 或 Ctrl+K )" data-i18n-placeholder="searchPlaceholder" autocomplete="off" spellcheck="false">
        <span class="global-search-count" id="searchCount"></span>
      </div>
      <div class="top-toolbar" role="group" aria-label="外观" data-i18n-aria="toolbarLabel">
        <a href="free-tier.html" title="AI工具免费额度一览" data-i18n="freeTier" data-i18n-title="freeTierTitle">🆓 免费额度</a>
        <a href="ai-encyclopedia-2026.html" title="AI工具百科全书免费额度与产品说明" data-i18n="encyclopedia" data-i18n-title="encyclopediaTitle">AI工具百科</a>
        <a href="https://aiv123.com/chrome/" title="Chrome 插件" data-i18n="chromeExt" data-i18n-title="chromeExtTitle">Chrome插件</a>
        <button type="button" class="theme-btn" data-theme-set="system" data-i18n="themeSystem">跟随系统</button>
        <button type="button" class="theme-btn" data-theme-set="light" data-i18n="themeLight">浅色</button>
        <button type="button" class="theme-btn" data-theme-set="dark" data-i18n="themeDark">深色</button>
        <button type="button" class="theme-btn lang-btn" data-lang-set="zh">中</button>
        <button type="button" class="theme-btn lang-btn" data-lang-set="en">EN</button>
        <a class="github-link" href="https://github.com/shellsec/AINav" target="_blank" rel="noopener noreferrer" title="GitHub"><svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
        <a class="github-link" href="mailto:info@aiv123.com" title="联系邮箱" data-i18n-title="mailToTitle"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></a>
      </div>
    </div>
    <div class="top-plans">
      <a href="free-tier.html" title="AI工具免费额度、刷新周期与新用户礼一览" data-i18n="freeTier" data-i18n-title="freeTierTitle" style="color:var(--accent2);font-weight:600">🆓 免费额度</a>
      <span class="top-plans-label">📊 横评</span>
      <a href="model-plan.html" title="AI模型选型横评·国内+海外旗舰">模型选型</a>
      <a href="coding-plan.html" title="国内外AI编程套餐价格对比与选购推荐" data-i18n="codingPlan" data-i18n-title="codingPlanTitle">编程套餐</a>
      <a href="agent-plan.html" title="AI Agent横评对比与场景推荐">Agent</a>
      <a href="search-plan.html" title="AI搜索工具横评对比与场景推荐">搜索套餐</a>
      <a href="video-plan.html" title="AI视频生成套餐价格对比与场景推荐">视频套餐</a>
      <a href="image-plan.html" title="AI图像生成套餐价格对比与场景推荐">图像套餐</a>
      <span class="top-plans-break"></span>
      <a href="voice-plan.html" title="AI语音工具横评对比与场景推荐">语音套餐</a>
      <a href="music-plan.html" title="AI音乐工具横评对比与场景推荐">音乐套餐</a>
      <a href="learning-plan.html" title="AI学习平台横评对比与场景推荐">学习套餐</a>
      <a href="hardware-plan.html" title="AI硬件横评对比与选购推荐">硬件横评</a>
      <a href="ai-factory-plan.html" title="AI造物流水线·从创意到商品">AI造物</a>
      <a href="opc.html" title="一人公司·AI赋能个体创业">一人公司</a>
    </div>
    <div class="top-promo" aria-label="合作推广：多模型 API 接入" data-i18n-aria="promoAria">
      <div class="top-promo-head">
        <span class="top-promo-badge" data-i18n="promoBadge">推广</span>
        <span class="top-promo-models">
          <span>OpenAI: GPT</span><span>Anthropic: Claude</span><span>Google: Gemini旗舰模型</span>
        </span>
        <span class="top-promo-title" data-i18n="promoTitle">国内直连免梯</span>
        <span class="top-promo-ref" data-i18n-html="promoRef">$2优惠码 <span class="top-promo-code" translate="no" data-code="AFF_BB0FNC" style="cursor:pointer" title="点击复制优惠码">AFF_BB0FNC</span></span>
        <a class="top-promo-cta" href="https://ofox.ai/x/ShenDao" target="_blank" rel="noopener noreferrer sponsored" data-i18n="promoCta">立即注册</a>
      </div>
    </div>
  </header>
  <div class="layout">
    <aside><button type="button" class="sidebar-toggle" id="sidebarToggle" aria-label="展开/收起导航" data-i18n-aria="sidebarToggleAria" data-i18n="sidebarToggle">☰ 导航</button>${navHtml}</aside>
    <main>
      <section class="block fav-block is-empty" id="fav-block">
        <h2 class="block-title" data-i18n="catFav">常用收藏 <span class="fav-hint" data-i18n="favHint">点击各卡片右上角星标固定到此处</span><span class="fav-actions"><button type="button" class="fav-action-btn" id="favExport" data-i18n="favExport">导出</button><button type="button" class="fav-action-btn" id="favImport" data-i18n="favImport">导入</button></span></h2>
        <p class="fav-empty" id="favEmpty">暂无收藏；在下方分类中点亮 ☆ 即可出现在这里（数据保存在本机浏览器）。</p>
        <div class="grid fav-grid" id="favGrid" aria-live="polite"></div>
      </section>
      ${renderSections(tree)}
    </main>
  </div>
  <footer class="site-footer" role="contentinfo">
    <p class="site-tagline">本站强项：数据在本地、分类与扩展可定制、结构一目了然、覆盖面广（含 API 聚合、智能体与本地推理等）。</p>
    <p>本站为工具导航索引，所收录链接由各服务商自行运营；推广位为合作展示，不代表对其背书。</p>
    <p>使用任意外链服务时，请遵守所在地法律法规，并以各产品官网的条款、隐私政策与计费说明为准。</p>
    <p>本站不保证第三方网站的内容准确性、服务持续性、可用性及收费，亦不承担因访问或使用外链而产生的任何责任。</p>
    <p class="site-built">页面数据生成时间（构建）：${esc(generatedAtLabel)}（UTC 记录：${esc(generatedAt)}）</p>
  </footer>
  <div class="lang-float">
    <a class="lang-btn site-link" href="https://ainews.aiv123.com/" target="_blank" title="AI资讯" style="text-decoration:none;font-size:0.72rem;">资讯</a>
    <a class="lang-btn site-link" href="https://skill.aiv123.com/" target="_blank" title="AI技能" style="text-decoration:none;font-size:0.72rem;">技能</a>
    <a class="lang-btn site-link" href="https://chrome.aiv123.com/" target="_blank" title="Chrome插件" style="text-decoration:none;font-size:0.72rem;">插件</a>
    <button type="button" class="lang-btn" data-lang-set="en">EN</button>
    <button type="button" class="lang-btn" data-lang-set="zh">中</button>
  </div>
  <button type="button" class="back-to-top" id="backToTop" aria-label="返回顶部" title="返回顶部" data-i18n-aria="backTopAria" data-i18n="backTop">↑ Top</button>
  <script>
function fallbackIcon(el){el._fb=el._fb||0;var d='';try{d=new URL(el.closest('article.card').getAttribute('data-link')).hostname}catch(e){}var srcs=['https://icons.duckduckgo.com/ip3/'+d+'.ico','https://www.google.com/s2/favicons?domain='+encodeURIComponent(d)+'&sz=64'];if(d&&el._fb<srcs.length){el.src=srcs[el._fb++]}else{var t=el.closest('article.card');var ch=(t?t.getAttribute('data-title'):'').trim().charAt(0).toUpperCase()||'?';var pl=['#0969da','#1a7f37','#bf3989','#8250df','#cf222e','#953800','#0550ae','#116329'];var sp=document.createElement('span');sp.className='card-icon-ph';sp.style.cssText='display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;border-radius:8px;background:'+pl[ch.charCodeAt(0)%pl.length];sp.textContent=ch;el.replaceWith(sp)}}
(function () {
  var FAV_KEY = "ainav-favorites-v1";
  var THEME_KEY = "ainav-theme";
  var mainCardByLink = new Map();
  document.querySelectorAll("main article.card").forEach(function (c) {
    if (c.closest("#favGrid")) return;
    var lk = c.getAttribute("data-link");
    if (lk) mainCardByLink.set(lk, c);
  });

  function loadFavs() {
    try {
      var raw = localStorage.getItem(FAV_KEY);
      if (!raw) return [];
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function saveFavs(list) {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(list));
    } catch (e) {}
  }
  function favIndex(list, link) {
    for (var i = 0; i < list.length; i++) if (list[i].link === link) return i;
    return -1;
  }
  function setStarBtn(btn, on) {
    var lang = (function(){ try { return localStorage.getItem("ainav-lang")||"zh"; }catch(e){return"zh";} })();
    btn.classList.toggle("is-on", on);
    btn.textContent = on ? "★" : "☆";
    btn.setAttribute("aria-label", on ? (lang==="en"?"Remove from favorites":"取消常用收藏") : (lang==="en"?"Add to favorites":"加入常用收藏"));
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function readCardItem(article) {
    var img = article.querySelector(".card-icon");
    return {
      link: article.getAttribute("data-link") || "",
      title: article.getAttribute("data-title") || "",
      subtitle: article.getAttribute("data-subtitle") || "",
      iconSrc: img ? img.src : "",
    };
  }
  function syncCardStars(favs) {
    var links = {};
    for (var i = 0; i < favs.length; i++) links[favs[i].link] = true;
    document.querySelectorAll("article.card .card-star").forEach(function (btn) {
      var art = btn.closest("article.card");
      if (!art || art.closest("#favGrid")) return;
      var link = art.getAttribute("data-link");
      setStarBtn(btn, !!links[link]);
    });
  }
  function renderFavGrid(favs) {
    var grid = document.getElementById("favGrid");
    var block = document.getElementById("fav-block");
    if (!grid || !block) return;
    grid.innerHTML = "";
    var curLang = (function(){ try { return localStorage.getItem("ainav-lang") || "zh"; } catch(e){ return "zh"; } })();
    var frag = document.createDocumentFragment();
    for (var i = 0; i < favs.length; i++) {
      (function (item) {
        var art = document.createElement("article");
        art.className = "card fav-card";
        art.setAttribute("data-link", item.link);
        art.setAttribute("data-title", item.title);
        art.setAttribute("data-subtitle", item.subtitle || "");
        var star = document.createElement("button");
        star.type = "button";
        star.className = "card-star is-on";
        star.textContent = "★";
        star.setAttribute("aria-label", curLang === "en" ? "Remove from favorites" : "取消常用收藏");
        star.setAttribute("aria-pressed", "true");
        star.setAttribute("title", curLang === "en" ? "Favorites" : "常用收藏");
        var main = document.createElement("a");
        main.className = "card-main";
        main.href = item.link;
        main.target = "_blank";
        main.rel = "noopener noreferrer";
        if (item.iconSrc) {
          var im = document.createElement("img");
          im.className = "card-icon";
          im.src = item.iconSrc;
          im.alt = "";
          im.width = 40;
          im.height = 40;
          im.loading = "lazy";
          im.decoding = "async";
          main.appendChild(im);
        } else {
          var ph = document.createElement("span");
          ph.className = "card-icon-ph";
          main.appendChild(ph);
        }
        var body = document.createElement("div");
        body.className = "card-body";
        var h3 = document.createElement("h3");
        h3.className = "card-title";
        h3.textContent = item.title || item.link;
        var p = document.createElement("p");
        p.className = "card-desc";
        p.textContent = item.subtitle || "";
        body.appendChild(h3);
        body.appendChild(p);
        main.appendChild(body);
        art.appendChild(star);
        art.appendChild(main);
        frag.appendChild(art);
      })(favs[i]);
    }
    grid.appendChild(frag);
    block.classList.toggle("is-empty", favs.length === 0);
  }
  function applyFavs(favs) {
    syncCardStars(favs);
    renderFavGrid(favs);
  }
  function toggleByLink(link) {
    if (!link) return;
    var favs = loadFavs();
    var idx = favIndex(favs, link);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      var art = mainCardByLink.get(link);
      if (!art) return;
      var item = readCardItem(art);
      if (!item.link) return;
      favs.push(item);
    }
    saveFavs(favs);
    applyFavs(favs);
  }

  document.addEventListener(
    "click",
    function (e) {
      var star = e.target.closest(".card-star");
      if (!star) return;
      var art = star.closest("article.card");
      if (!art) return;
      e.preventDefault();
      e.stopPropagation();
      var link = art.getAttribute("data-link");
      if (art.closest("#favGrid")) {
        var favs = loadFavs();
        var idx = favIndex(favs, link);
        if (idx >= 0) {
          favs.splice(idx, 1);
          saveFavs(favs);
          applyFavs(favs);
        }
        return;
      }
      toggleByLink(link);
    },
    true
  );

  applyFavs(loadFavs());

  function setTheme(mode) {
    if (mode !== "light" && mode !== "dark" && mode !== "system") mode = "system";
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) {}
    document.querySelectorAll(".theme-btn[data-theme-set]").forEach(function (b) {
      var m = b.getAttribute("data-theme-set");
      b.classList.toggle("is-active", m === mode);
      b.setAttribute("aria-pressed", m === mode ? "true" : "false");
    });
  }
  var cur = "system";
  try {
    var s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark" || s === "system") cur = s;
  } catch (e) {}
  setTheme(cur);
  document.querySelectorAll(".theme-btn[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () {
      setTheme(b.getAttribute("data-theme-set"));
    });
  });

  /* ---- Promo code click-to-copy ---- */
  document.addEventListener("click", function (e) {
    var codeEl = e.target.closest(".top-promo-code");
    if (!codeEl) return;
    e.preventDefault();
    e.stopPropagation();
    var code = codeEl.getAttribute("data-code") || codeEl.textContent.trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () { showCopyTip(codeEl, code); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = code;
      ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); showCopyTip(codeEl, code); } catch (ex) {}
      document.body.removeChild(ta);
    }
  });
  function showCopyTip(el, code) {
    var lang = "zh";
    try { lang = localStorage.getItem("ainav-lang") || "zh"; } catch (e2) {}
    var tip = lang === "en" ? "Copied!" : "已复制!";
    el.textContent = code + " " + tip;
    setTimeout(function () {
      el.textContent = code;
    }, 1500);
  }

  var btn = document.getElementById("backToTop");
  if (btn) {
    function syncScroll() {
      btn.classList.toggle("is-visible", window.scrollY > 380);
    }
    window.addEventListener("scroll", syncScroll, { passive: true });
    syncScroll();
    btn.addEventListener("click", function () {
      var reduce = false;
      try {
        reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (e3) {}
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      var top = document.getElementById("page-top");
      if (top) {
        try {
          top.focus({ preventScroll: true });
        } catch (e2) {}
      }
    });
  }

  /* ---- Global Search ---- */
  var searchInput = document.getElementById("globalSearch");
  var searchCountEl = document.getElementById("searchCount");
  var allBlocks = document.querySelectorAll("main > .block, main .block.group > .block");
  var allCards = document.querySelectorAll("main article.card:not(.fav-card)");
  var searchTimer;
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runGlobalSearch, 120);
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { searchInput.value = ""; runGlobalSearch(); searchInput.blur(); }
    });
  }
  function runGlobalSearch() {
    var q = (searchInput.value || "").trim().toLowerCase();
    var visible = 0;
    if (!q) {
      allCards.forEach(function (c) { c.classList.remove("is-search-hidden"); });
      allBlocks.forEach(function (b) { b.classList.remove("is-search-hidden"); });
      searchCountEl.textContent = "";
      return;
    }
    allCards.forEach(function (c) {
      if (c.closest("#favGrid")) return;
      var title = (c.getAttribute("data-title") || "").toLowerCase();
      var sub = (c.getAttribute("data-subtitle") || "").toLowerCase();
      var show = title.indexOf(q) >= 0 || sub.indexOf(q) >= 0;
      c.classList.toggle("is-search-hidden", !show);
      if (show) visible++;
    });
    allBlocks.forEach(function (b) {
      var hasCards = b.querySelectorAll("article.card:not(.fav-card):not(.is-search-hidden)");
      b.classList.toggle("is-search-hidden", hasCards.length === 0);
    });
    var curLang = (function(){ try { return localStorage.getItem("ainav-lang") || "zh"; } catch(e){ return "zh"; } })();
    if (curLang === "en") {
      searchCountEl.textContent = visible ? visible + " items" : "No results";
    } else {
      searchCountEl.textContent = visible ? visible + " 项" : "无结果";
    }
  }

  /* ---- Sidebar Toggle (mobile) ---- */
  var sidebarToggle = document.getElementById("sidebarToggle");
  var asideEl = document.querySelector("aside");
  if (sidebarToggle && asideEl) {
    sidebarToggle.addEventListener("click", function () {
      asideEl.classList.toggle("is-collapsed");
      var lang = (function(){ try { return localStorage.getItem("ainav-lang")||"zh"; }catch(e){return"zh";} })();
      this.textContent = asideEl.classList.contains("is-collapsed")
        ? (lang === "en" ? "☰ Menu" : "☰ 导航")
        : (lang === "en" ? "✕ Close" : "✕ 收起");
    });
    asideEl.classList.add("is-collapsed");
  }

  /* ---- Fav Import / Export ---- */
  var favExportBtn = document.getElementById("favExport");
  var favImportBtn = document.getElementById("favImport");
  if (favExportBtn) {
    favExportBtn.addEventListener("click", function () {
      var favs = loadFavs();
      if (!favs.length) { var _l = (function(){ try { return localStorage.getItem("ainav-lang")||"zh"; }catch(e){return"zh";} })(); alert(_l==="en"?"No favorites to export":"暂无收藏可导出"); return; }
      var blob = new Blob([JSON.stringify(favs, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ai-nav-favorites.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  if (favImportBtn) {
    favImportBtn.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.addEventListener("change", function () {
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error("格式错误");
            var favs = loadFavs();
            var seen = {};
            for (var i = 0; i < favs.length; i++) seen[favs[i].link] = true;
            var added = 0;
            for (var j = 0; j < imported.length; j++) {
              var it = imported[j];
              if (it && it.link && it.title && !seen[it.link]) {
                favs.push({ link: it.link, title: it.title, subtitle: it.subtitle || "", iconSrc: it.iconSrc || "" });
                seen[it.link] = true;
                added++;
              }
            }
            saveFavs(favs);
            applyFavs(favs);
            var _l2 = (function(){ try { return localStorage.getItem("ainav-lang")||"zh"; }catch(e){return"zh";} })();
            if (_l2==="en") { alert("Import done, " + added + " added"); } else { alert("导入完成，新增 " + added + " 条收藏"); }
          } catch (e) { var _l3 = (function(){ try { return localStorage.getItem("ainav-lang")||"zh"; }catch(e2){return"zh";} })(); alert(_l3==="en"?"Import failed: "+e.message:"导入失败："+e.message); }
        };
        reader.readAsText(file);
      });
      input.click();
    });
  }
})();

  /* ---- i18n Language Switching ---- */
  (function () {
    var LANG_KEY = "ainav-lang";
    var i18nDict = {
      en: {
        /* -- top bar -- */
        searchPlaceholder: "Search tools… ( / or Ctrl+K )",
        toolbarLabel: "Appearance",
        encyclopedia: "AI Encyclopedia",
        encyclopediaTitle: "AI Tool Encyclopedia – Free Tiers & Descriptions",
        freeTier: "🆓 Free Tier",
        freeTierTitle: "AI Tool Free Tier Dashboard",
        codingPlan: "Coding Plans",
        codingPlanTitle: "AI Coding Plan Comparison & Buying Guide",
        chromeExt: "Chrome Extension",
        chromeExtTitle: "Chrome Extension",
        themeSystem: "System",
        themeLight: "Light",
        themeDark: "Dark",
        promoBadge: "Ad",
        promoTitle: "Direct Access, No VPN Needed",
        promoCta: "Sign Up",
        promoRef: '$2 off code <span class="top-promo-code" translate="no" data-code="AFF_BB0FNC" style="cursor:pointer" title="Click to copy">AFF_BB0FNC</span>',
        mailToTitle: "Contact Email",
        /* -- sidebar & fav -- */
        sidebarToggle: "☰ Menu",
        sidebarToggleAria: "Toggle navigation",
        catFav: "★ Favorites",
        favHint: "Star a card to pin it here",
        favExport: "Export",
        favImport: "Import",
        backTop: "↑ Top",
        backTopAria: "Back to top",
        /* -- categories -- */
        catHotTools: "Hot Tools",
        catAIChat: "AI Chat",
        catAISearch: "AI Search",
        catAIOffice: "AI Office",
        catAIJobHunting: "AI Job Hunting",
        catResumeTools: "Resume Tools",
        catInterviewAI: "Interview AI",
        catEfficiency: "Efficiency",
        catDocTools: "Document Tools",
        catOfficeMeeting: "Meetings",
        catExcel: "Excel / Spreadsheets",
        catPPT: "Slides (PPT)",
        catMindMap: "Mind Maps",
        catAIWriting: "AI Writing",
        catAICoding: "AI Coding",
        catAIImage: "AI Image",
        catCommonTools: "Common Tools",
        catBgRemove: "Background Removal",
        catPersonRemove: "Person Removal",
        catAIVideo: "AI Video",
        catAIAudio: "AI Audio",
        catAIMusic: "AI Music & Singing",
        catAIDesign: "AI Design",
        catUI3D: "UI · AI 3D & Visual Design",
        catAITranslation: "AI Translation",
        catAIPrompts: "AI Prompts",
        catAIDetection: "AI Content Detection",
        catAILaw: "AI Legal",
        catAIBooks: "AI Books",
        catAIModels: "Open-Source Models",
        catAILearning: "AI Learning Sites",
        catAIFramework: "AI Dev Frameworks",
        catAPIRouter: "AI API · Routing · Inference Cloud",
        catAgentWorkflow: "AI Agents · Workflow & Automation",
        catAIUsecases: "AI Use Cases · Scenarios & Best Practices",
        catLLMGateway: "LLM Gateway · Proxy · SDK & Observability",
        catMCP: "MCP · Model Context Protocol",
        catRAG: "RAG · Vector DB & Retrieval",
        catAIKnowledge: "AI Knowledge Base & Notes",
        catLocalInfer: "Local & Private · Inference Engine",
        catBrowserAuto: "Browser Automation",
        catVoiceRealtime: "Voice · TTS/ASR & Realtime",
        catAIMeeting: "AI Meeting & Transcripts",
        catDataTrain: "Data · Fine-tuning & Evaluation",
        catPaperRanking: "Papers · News & Rankings",
        catCLI: "CLI & Terminal AI",
        catTokenOpt: "Token Optimization · Cost Control & Tracking",
        catAgentMemory: "Agent Memory · Long-term Context & State",
        catAIVideo: "AI Video Generation · Motion & Digital Human",
        catAIResearch: "AI Research · Academic Search & Automation",
        catAIBrowser: "AI Browser & New Paradigms",
        catEdgeHardware: "Hardware · Edge Inference",
        catCompliance: "AI Compliance & Standards",
        catNetPrivacy: "Network · Privacy & Security",
        catGEO: "GEO / AEO · AI Search Optimization",
        catTempEmail: "Temp Email · Anonymous Inbox",
        catSMSVerify: "SMS Verify · Virtual Numbers",
        catAIBooksExt: "AI Classic Books & Textbooks",
        catAIRankings: "AI Rankings · Product & Tool Charts",
        catAISkillHub: "AI Skill · Prompt Skills & Tool Market"${toolI18nInjection}
      },
      zh: {
        /* -- top bar -- */
        searchPlaceholder: "搜索工具名称或描述… ( / 或 Ctrl+K )",
        toolbarLabel: "外观",
        encyclopedia: "AI工具百科",
        encyclopediaTitle: "AI工具百科全书免费额度与产品说明",
        freeTier: "🆓 免费额度",
        freeTierTitle: "AI工具免费额度一览",
        codingPlan: "编程套餐横评",
        codingPlanTitle: "国内外AI编程套餐价格对比与选购推荐",
        chromeExt: "Chrome插件",
        chromeExtTitle: "Chrome 插件",
        themeSystem: "跟随系统",
        themeLight: "浅色",
        themeDark: "深色",
        promoBadge: "合作推广",
        promoTitle: "国内直连免梯",
        promoCta: "立即注册",
        promoRef: '$2优惠码 <span class="top-promo-code" translate="no" data-code="AFF_BB0FNC" style="cursor:pointer" title="点击复制优惠码">AFF_BB0FNC</span>',
        mailToTitle: "联系邮箱",        /* -- sidebar & fav -- */
        sidebarToggle: "☰ 导航",
        sidebarToggleAria: "展开/收起导航",
        catFav: "★ 常用收藏",
        favHint: "点击各卡片右上角星标固定到此处",
        favExport: "导出",
        favImport: "导入",
        backTop: "↑ Top",
        backTopAria: "返回顶部",
        /* -- categories -- */
        catHotTools: "热门工具",
        catAIChat: "AI 聊天对话",
        catAISearch: "AI 搜索工具",
        catAIOffice: "AI 办公工具",
        catAIJobHunting: "AI 求职招聘",
        catResumeTools: "简历工具",
        catInterviewAI: "面试助手",
        catEfficiency: "效率提升",
        catDocTools: "文档工具",
        catOfficeMeeting: "办公会议",
        catExcel: "Excel表格",
        catPPT: "幻灯片(PPT)",
        catMindMap: "思维导图",
        catAIWriting: "AI 写作工具",
        catAICoding: "AI 编程工具",
        catAIImage: "AI 图像工具",
        catCommonTools: "常用工具",
        catBgRemove: "背景移除",
        catPersonRemove: "人物抹除",
        catAIVideo: "AI 视频工具",
        catAIAudio: "AI 音频工具",
        catAIMusic: "AI 音乐 · 唱歌与配乐",
        catAIDesign: "AI 设计工具",
        catUI3D: "前端 UI · AI 3D 与视觉设计",
        catAITranslation: "AI 翻译工具",
        catAIPrompts: "AI 指令提示",
        catAIDetection: "AI 内容检测",
        catAILaw: "AI 法律助手",
        catAIBooks: "AI 经典书籍",
        catAIModels: "AI 开源模型",
        catAILearning: "AI 学习网站",
        catAIFramework: "AI 开发框架",
        catAPIRouter: "AI 模型 API · 路由聚合 · 推理云",
        catAgentWorkflow: "AI 智能体 · 工作流与自动化",
        catAIUsecases: "AI 场景 · 用例与最佳实践",
        catLLMGateway: "LLM 网关 · 代理 · SDK 与可观测",
        catMCP: "MCP · 模型上下文协议与工具生态",
        catRAG: "RAG · 向量库与检索基建",
        catAIKnowledge: "AI 知识库 · 笔记与企业检索",
        catLocalInfer: "本地与私有化 · 推理引擎",
        catBrowserAuto: "浏览器自动化 · 电脑操控",
        catVoiceRealtime: "语音 · TTS/ASR 与实时多模态",
        catAIMeeting: "AI 会议与语音纪要",
        catDataTrain: "数据 · 微调 · 合成与评测",
        catPaperRanking: "论文 · 资讯 · 榜单与评测",
        catCLI: "终端与 CLI 上的 AI",
        catTokenOpt: "Token 优化 · 成本管控与追踪",
        catAgentMemory: "Agent 记忆 · 长期上下文与状态管理",
        catAIVideo: "AI 视频生成 · 动效与数字人",
        catAIResearch: "AI 科研 · 学术搜索与自动化",
        catAIBrowser: "AI 浏览器与新形态",
        catEdgeHardware: "硬件 · 边缘推理与跑分",
        catCompliance: "AI 合规与标准",
        catNetPrivacy: "网络工具 · 隐私与安全",
        catGEO: "GEO / AEO · AI 搜索优化",
        catTempEmail: "临时邮箱 · 匿名收件",
        catSMSVerify: "接码 · 短信验证与虚拟号",
        catAIBooksExt: "AI 经典书籍与教材",
        catAIRankings: "AI 榜单 · 产品与工具排行",
        catAISkillHub: "AI Skill · 提示技能与工具市场"
      }
    };

    function applyLang(lang) {
      if (lang !== "zh" && lang !== "en") lang = "zh";
      var dict = i18nDict[lang] || i18nDict.zh;
      document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}

      /* data-i18n: set textContent */
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        if (dict[key] !== undefined) el.textContent = dict[key];
      });
      /* data-i18n-placeholder */
      document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
        var key = el.getAttribute("data-i18n-placeholder");
        if (dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
      });
      /* data-i18n-html: set innerHTML for elements containing child tags */
      document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
        var key = el.getAttribute("data-i18n-html");
        if (dict[key] !== undefined) el.innerHTML = dict[key];
      });
      /* data-i18n-title */
      document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        var key = el.getAttribute("data-i18n-title");
        if (dict[key] !== undefined) el.setAttribute("title", dict[key]);
      });
      /* Translate all card titles and descriptions (including fav cards) */
      var titleMap = dict._toolTitles || {};
      var descMap = dict._toolDescs || {};
      document.querySelectorAll("article.card").forEach(function (card) {
        var origTitle = card.getAttribute("data-title") || "";
        var origDesc = card.getAttribute("data-subtitle") || "";
        var h3 = card.querySelector(".card-title");
        var p = card.querySelector(".card-desc");
        if (lang === "en") {
          if (h3 && titleMap[origTitle]) h3.textContent = titleMap[origTitle];
          if (p && descMap[origTitle]) p.textContent = descMap[origTitle];
        } else {
          /* restore Chinese from data attributes */
          if (h3) h3.textContent = origTitle;
          if (p) p.textContent = origDesc;
        }
      });
      /* data-i18n-aria */
      document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
        var key = el.getAttribute("data-i18n-aria");
        if (dict[key] !== undefined) el.setAttribute("aria-label", dict[key]);
      });

      /* Update search count text language */
      if (typeof searchCountEl !== "undefined" && searchCountEl) {
        var txt = searchCountEl.textContent;
        if (txt.indexOf("项") >= 0 || txt === "无结果") {
          if (lang === "en") {
            var n = parseInt(txt, 10);
            searchCountEl.textContent = isNaN(n) ? "No results" : n + " items";
          }
        } else if (txt.indexOf("items") >= 0 || txt === "No results") {
          if (lang === "zh") {
            var n2 = parseInt(txt, 10);
            searchCountEl.textContent = isNaN(n2) ? "无结果" : n2 + " 项";
          }
        }
      }

      /* Highlight active lang button */
      document.querySelectorAll(".lang-btn[data-lang-set]").forEach(function (b) {
        var active = b.getAttribute("data-lang-set") === lang;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    /* Bind lang buttons */
    document.querySelectorAll(".lang-btn[data-lang-set]").forEach(function (b) {
      b.addEventListener("click", function () {
        applyLang(b.getAttribute("data-lang-set"));
      });
    });

    /* Init */
    var initLang = "zh";
    try {
      var s = localStorage.getItem(LANG_KEY);
      if (s === "en" || s === "zh") initLang = s;
    } catch (e) {}
    applyLang(initLang);
  })();

  /* ---- Auto-favicon for placeholder icons ---- */
  (function () {
    var PH = ".card-icon-ph";
    var FAVICON_SOURCES = [
      function (d) { return "https://icons.duckduckgo.com/ip3/" + d + ".ico"; },
      function (d) { return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(d) + "&sz=64"; },
      function (d) { return "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://" + d + "&size=64"; }
    ];
    var palette = ["#0969da","#1a7f37","#bf3989","#8250df","#cf222e","#953800","#0550ae","#116329","#8b5cf6","#db2777","#0284c7","#15803d"];
    var els = document.querySelectorAll(PH);
    if (!els.length) return;

    function charColor(c) {
      var code = c ? c.charCodeAt(0) : 0;
      return palette[code % palette.length];
    }

    function getDomain(link) {
      try { return new URL(link).hostname; } catch (e) { return ""; }
    }

    function makeFallback(title) {
      var initial = (title || "").trim().charAt(0).toUpperCase() || "?";
      var fb = document.createElement("span");
      fb.className = "card-icon-ph";
      fb.style.cssText = "display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;border-radius:8px;background:" + charColor(initial) + ";";
      fb.textContent = initial;
      return fb;
    }

    function tryLoad(span, domain, title, sourceIdx) {
      if (sourceIdx >= FAVICON_SOURCES.length) {
        span.replaceWith(makeFallback(title));
        return;
      }
      var img = new Image();
      img.width = 40;
      img.height = 40;
      img.decoding = "async";
      img.style.cssText = "width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;background:var(--panel);";
      img.alt = "";
      img.onload = function () { span.replaceWith(img); };
      img.onerror = function () { tryLoad(span, domain, title, sourceIdx + 1); };
      img.src = FAVICON_SOURCES[sourceIdx](domain);
    }

    var schedule = window.requestIdleCallback || function (cb) { setTimeout(cb, 1); };

    schedule(function () {
      for (var i = 0; i < els.length; i++) {
        (function (span) {
          var card = span.closest("article.card");
          if (!card) return;
          var link = card.getAttribute("data-link");
          if (!link) return;
          var domain = getDomain(link);
          if (!domain) { span.replaceWith(makeFallback(card.getAttribute("data-title"))); return; }
          var title = card.getAttribute("data-title") || "";
          tryLoad(span, domain, title, 0);
        })(els[i]);
      }
    });
  })();
  </script>
<script src="thinking-framework.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
console.log("wrote index.html");

try {
  fs.writeFileSync(path.join(ROOT, "ai-encyclopedia-2026.html"), buildAiEncyclopediaPage(), "utf8");
  console.log("wrote ai-encyclopedia-2026.html");
} catch (e) {
  console.error("ai-encyclopedia-2026.html:", e.message);
}

// ─── Free Tier Dashboard ───
function buildFreeTierDashboard() {
  const hintsPath = path.join(ROOT, "free-tier-hints.json");
  let hints = {};
  try { hints = JSON.parse(fs.readFileSync(hintsPath, "utf8")); } catch (e) { console.error("free-tier-hints.json:", e.message); }

  // Load inferPricingHint from free-tier-infer.js
  const { inferPricingHint, mergePricingHint } = require(path.join(ROOT, "free-tier-infer.js"));

  // Normalize link for matching
  function normalizeLink(link) {
    try {
      const u = new URL(link);
      return u.origin + u.pathname.replace(/\/+$/, "");
    } catch { return link.replace(/\/+$/, ""); }
  }

  // Build lookup: normalized link → hint data
  const hintMap = {};
  for (const [rawLink, data] of Object.entries(hints)) {
    if (rawLink === "_readme") continue;
    hintMap[normalizeLink(rawLink)] = data;
  }

  // Collect all tools with their categories
  const toolEntries = [];
  const seenLinks = new Set();

  function collectFromNodes(nodes, parentCat) {
    for (const n of nodes) {
      const cat = n.name || parentCat;
      if (n.type === "leaf" && n.tools) {
        for (const t of n.tools) {
          if (!t.link || seenLinks.has(normalizeLink(t.link))) continue;
          seenLinks.add(normalizeLink(t.link));
          const nl = normalizeLink(t.link);
          const explicitHint = hintMap[nl] || null;
          // Use inferPricingHint for tools without explicit hints, then merge if any
          const inferred = inferPricingHint(t.link, t.title, cat);
          const hint = explicitHint ? mergePricingHint(inferred, explicitHint) : inferred;
          const source = explicitHint ? "manual" : "inferred";
          toolEntries.push({ ...t, category: cat, hint, source });
        }
      } else if (n.type === "group" && n.children) {
        collectFromNodes(n.children, cat);
      }
    }
  }
  collectFromNodes(tree, "");

  // Also include hint-only entries (tools not in nav but in hints)
  for (const [rawLink, data] of Object.entries(hints)) {
    if (rawLink === "_readme") continue;
    const nl = normalizeLink(rawLink);
    if (!seenLinks.has(nl)) {
      seenLinks.add(nl);
      let title = "";
      try { const u = new URL(rawLink); title = u.hostname.replace(/^www\./, ""); } catch { title = rawLink; }
      toolEntries.push({ key: "hint-" + slugify(nl), title, subtitle: "", avatar: "", link: rawLink, path: "", category: "", hint: data });
    }
  }

  // freeLevel categories for sorting & filtering
  const LEVEL_ORDER = { "完全免费": 0, "软件免费": 1, "开源免费（自托管）": 2, "部分免费": 3, "免费访问": 4, "浏览免费": 5, "文档免费": 6, "按次计费": 7, "因站而异": 8 };
  function levelSort(lv) { return LEVEL_ORDER[lv] != null ? LEVEL_ORDER[lv] : 9; }

  // Sort by level then title
  toolEntries.sort((a, b) => levelSort(a.hint.freeLevel) - levelSort(b.hint.freeLevel) || a.title.localeCompare(b.title, "zh"));

  // Stats
  const levelCounts = {};
  for (const t of toolEntries) {
    const lv = t.hint.freeLevel || "未标注";
    levelCounts[lv] = (levelCounts[lv] || 0) + 1;
  }

  // Render cards
  function levelBadgeClass(lv) {
    if (lv === "完全免费") return "ft-badge-free";
    if (lv === "部分免费") return "ft-badge-partial";
    if (lv === "浏览免费" || lv === "免费访问" || lv === "文档免费") return "ft-badge-browse";
    if (lv === "开源免费（自托管）" || lv === "软件免费") return "ft-badge-oss";
    return "ft-badge-other";
  }

  function renderFtCard(t) {
    const img = iconSrc(t.avatar);
    const h = t.hint;
    const lv = h ? h.freeLevel : "未标注";
    const badgeCls = levelBadgeClass(lv);
    const sourceTag = t.source === "manual" ? `<span class="ft-source ft-source-manual">已核实</span>` : `<span class="ft-source ft-source-inferred">推断</span>`;
    return `<article class="ft-card" data-link="${esc(t.link)}" data-title="${esc(t.title)}" data-level="${esc(lv)}" data-category="${esc(t.category)}" data-source="${esc(t.source)}" data-search="${esc((t.title + " " + (t.subtitle||"") + " " + lv + " " + (h?h.quota:"") + " " + t.category).toLowerCase())}">
<a class="ft-card-main" href="${esc(t.link)}" target="_blank" rel="noopener noreferrer">
${img ? `<img class="ft-card-icon" src="${esc(img)}" alt="" width="36" height="36" loading="lazy" decoding="async" onerror="fallbackIcon(this)">` : `<span class="ft-card-icon-ph">${esc(t.title.charAt(0).toUpperCase())}</span>`}
<div class="ft-card-body">
<div class="ft-card-head"><h3 class="ft-card-title">${esc(t.title)}</h3><span class="ft-badge ${badgeCls}">${esc(lv)}</span>${sourceTag}</div>
${t.category ? `<span class="ft-card-cat">${esc(t.category)}</span>` : ""}
${h && h.quota ? `<p class="ft-card-quota">${esc(h.quota)}</p>` : ""}
${h && h.dailyCycle && h.dailyCycle !== "—" ? `<p class="ft-card-cycle"><span class="ft-card-label">刷新周期</span>${esc(h.dailyCycle)}</p>` : ""}
${h && h.firstBonus && h.firstBonus !== "—" ? `<p class="ft-card-bonus"><span class="ft-card-label">新用户礼</span>${esc(h.firstBonus)}</p>` : ""}
${h && h.note ? `<p class="ft-card-note">${esc(h.note)}</p>` : ""}
</div>
</a>
</article>`;
  }

  const cardsHtml = toolEntries.map(renderFtCard).join("\n");

  // Level filter chips
  const levelChipEntries = Object.entries(levelCounts).sort((a,b) => levelSort(a[0]) - levelSort(b[0]));
  const levelChipsHtml = levelChipEntries.map(([lv, cnt]) =>
    `<button type="button" class="ft-chip${lv === "部分免费" ? " is-active" : ""}" data-filter-level="${esc(lv)}">${esc(lv)} <span class="ft-chip-count">${cnt}</span></button>`
  ).join("");

  // Category filter
  const catSet = new Set(toolEntries.map(t => t.category).filter(Boolean));
  const catChipsHtml = [...catSet].sort((a,b) => a.localeCompare(b, "zh")).map(c =>
    `<button type="button" class="ft-chip" data-filter-cat="${esc(c)}">${esc(c)}</button>`
  ).join("");

  const totalCount = toolEntries.length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI工具免费额度一览 — AINav 免费额度仪表盘</title>
  <meta name="description" content="AI工具免费额度汇总：DeepSeek、ChatGPT、Claude、Gemini、Kimi、豆包、通义千问等590+工具的免费额度、刷新周期、新用户礼一览，支持筛选与搜索。">
  <meta name="keywords" content="AI工具免费额度,哪个AI免费,DeepSeek免费额度,ChatGPT免费,Claude免费,AI免费工具,免费AI对话,AI白嫖指南">
  <link rel="canonical" href="https://aiv123.com/free-tier.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="AI工具免费额度一览 — AINav">
  <meta property="og:description" content="590+ AI 工具免费额度、刷新周期、新用户礼一览表，支持筛选与搜索。">
  <meta property="og:url" content="https://aiv123.com/free-tier.html">
  <meta property="og:site_name" content="AINav">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='18' width='100' height='100' fill='%230969da'/><text x='50' y='72' font-size='60' text-anchor='middle' fill='white' font-family='system-ui' font-weight='700'>AI</text></svg>">
  <!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2B8FBWRX4N"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-2B8FBWRX4N');
</script>
  <style>
    :root, html[data-theme="dark"] {
      --bg: #0f1419; --panel: #151b23; --card: #1c2430; --border: #2d3848;
      --text: #e6edf3; --muted: #8b9cb3; --accent: #58a6ff; --accent2: #3fb950;
      --warn: #d29922; --danger: #f85149;
    }
    html[data-theme="light"] {
      --bg: #f6f8fa; --panel: #fff; --card: #fff; --border: #d0d7de;
      --text: #1f2328; --muted: #59636e; --accent: #0969da; --accent2: #1a7f37;
      --warn: #9a6700; --danger: #cf222e;
    }
    @media (prefers-color-scheme: light) {
      html[data-theme="system"] {
        --bg: #f6f8fa; --panel: #fff; --card: #fff; --border: #d0d7de;
        --text: #1f2328; --muted: #59636e; --accent: #0969da; --accent2: #1a7f37;
        --warn: #9a6700; --danger: #cf222e;
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ---- Top bar ---- */
    .ft-top { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); background: var(--panel); position: sticky; top: 0; z-index: 10; }
    .ft-top-inner { max-width: 80rem; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; justify-content: space-between; }
    .ft-nav a { font-weight: 600; margin-right: 1rem; font-size: 0.88rem; }
    .ft-toolbar { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .theme-btn { font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 5px; border: 1px solid var(--border);
      background: var(--card); color: var(--muted); cursor: pointer; font-family: inherit; }
    .theme-btn.is-active { color: var(--accent); border-color: var(--accent); font-weight: 600; }

    /* ---- Main ---- */
    .ft-wrap { max-width: 80rem; margin: 0 auto; padding: 1rem; }
    .ft-wrap h1 { font-size: 1.4rem; margin: 0 0 0.3rem; }
    .ft-subtitle { font-size: 0.88rem; color: var(--muted); margin-bottom: 0.5rem; }
    .ft-updated { font-size: 0.76rem; color: var(--muted); margin-bottom: 1rem; }
    .ft-stats { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-bottom: 1rem; font-size: 0.85rem; }
    .ft-stats span { color: var(--muted); }
    .ft-stats strong { color: var(--accent2); }

    /* ---- Search ---- */
    .ft-search-wrap { max-width: 32rem; position: relative; margin-bottom: 0.75rem; }
    .ft-search { width: 100%; padding: 0.5rem 0.65rem 0.5rem 2rem; border-radius: 8px; border: 1px solid var(--border);
      background: var(--card); color: var(--text); font-size: 0.9rem; outline: none; transition: border-color 0.15s; }
    .ft-search:focus { border-color: var(--accent); }
    .ft-search-icon { position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.9rem; pointer-events: none; }
    .ft-search-count { position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.72rem; }

    /* ---- Filter chips ---- */
    .ft-filter-section { margin-bottom: 0.6rem; }
    .ft-filter-label { font-size: 0.78rem; font-weight: 600; color: var(--muted); margin-bottom: 0.3rem; }
    .ft-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.5rem; }
    .ft-chip { font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: 5px; border: 1px solid var(--border);
      background: var(--card); color: var(--muted); cursor: pointer; font-family: inherit; white-space: nowrap;
      transition: color 0.15s, border-color 0.15s, background 0.15s; }
    .ft-chip:hover { color: var(--text); border-color: var(--accent); }
    .ft-chip.is-active { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); font-weight: 600; }
    .ft-chip-count { font-size: 0.65rem; opacity: 0.7; margin-left: 0.15rem; }

    /* ---- Card grid ---- */
    .ft-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 0.75rem; }
    .ft-card { border: 1px solid var(--border); border-radius: 10px; background: var(--card); overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s; }
    .ft-card:hover { border-color: color-mix(in srgb, var(--accent) 40%, transparent); box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
    .ft-card[hidden] { display: none; }
    .ft-card-main { display: flex; gap: 0.7rem; padding: 0.8rem; color: inherit; text-decoration: none; align-items: flex-start; }
    .ft-card-main:hover { text-decoration: none; }
    .ft-card-icon { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: var(--panel); }
    .ft-card-icon-ph { width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
      background: var(--accent); color: #fff; font-weight: 700; font-size: 0.9rem; }
    .ft-card-body { min-width: 0; flex: 1; }
    .ft-card-head { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem; flex-wrap: wrap; }
    .ft-card-title { margin: 0; font-size: 0.92rem; font-weight: 600; }
    .ft-badge { font-size: 0.62rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; white-space: nowrap; letter-spacing: 0.02em; }
    .ft-badge-free { background: rgba(63,185,80,0.15); color: var(--accent2); border: 1px solid rgba(63,185,80,0.3); }
    .ft-badge-partial { background: rgba(88,166,255,0.12); color: var(--accent); border: 1px solid rgba(88,166,255,0.25); }
    .ft-badge-browse { background: rgba(210,153,34,0.12); color: var(--warn); border: 1px solid rgba(210,153,34,0.25); }
    .ft-badge-oss { background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.25); }
    .ft-badge-other { background: rgba(139,156,179,0.12); color: var(--muted); border: 1px solid rgba(139,156,179,0.25); }
    .ft-card-cat { font-size: 0.68rem; color: var(--muted); display: inline-block; margin-bottom: 0.2rem; }
    .ft-card-quota { margin: 0.15rem 0 0; font-size: 0.78rem; color: var(--text); line-height: 1.45; }
    .ft-card-cycle, .ft-card-bonus { margin: 0.1rem 0 0; font-size: 0.74rem; color: var(--muted); line-height: 1.4; }
    .ft-card-label { font-weight: 600; margin-right: 0.25rem; color: var(--text); font-size: 0.72rem; }
    .ft-card-note { margin: 0.2rem 0 0; font-size: 0.7rem; color: var(--muted); line-height: 1.35; font-style: italic; }
    .ft-card-updated { font-size: 0.65rem; color: var(--muted); margin-top: 0.15rem; opacity: 0.7; }
    .ft-source { font-size: 0.58rem; padding: 0.05rem 0.32rem; border-radius: 3px; font-weight: 600; white-space: nowrap; margin-left: 0.25rem; vertical-align: middle; }
    .ft-source-manual { background: rgba(63,185,80,0.12); color: var(--accent2); border: 1px solid rgba(63,185,80,0.25); }
    .ft-source-inferred { background: rgba(139,156,179,0.1); color: var(--muted); border: 1px solid rgba(139,156,179,0.2); }

    .ft-no-results { text-align: center; padding: 3rem 1rem; color: var(--muted); font-size: 0.95rem; }

    .ft-footer { margin-top: 2rem; padding: 1rem 0; border-top: 1px solid var(--border); font-size: 0.76rem; color: var(--muted); text-align: center; }
    .ft-footer a { color: var(--accent); }

    .back-to-top {
      position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 100; width: 44px; height: 44px; padding: 0;
      border-radius: 50%; border: 1px solid var(--border); background: var(--card); color: var(--accent);
      font-size: 1.15rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35); opacity: 0; visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s, background 0.15s, transform 0.15s;
    }
    .back-to-top:hover { background: var(--panel); color: var(--text); transform: translateY(-2px); }
    .back-to-top.is-visible { opacity: 1; visibility: visible; }

    @media (max-width: 768px) {
      .ft-grid { grid-template-columns: 1fr; }
      .ft-top-inner { justify-content: center; }
    }
    @media (min-width: 769px) and (max-width: 1100px) {
      .ft-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <script>
  (function () {
    try {
      var t = localStorage.getItem("ainav-theme");
      if (t === "light" || t === "dark" || t === "system") document.documentElement.setAttribute("data-theme", t);
      else document.documentElement.setAttribute("data-theme", "system");
    } catch (e) { document.documentElement.setAttribute("data-theme", "system"); }
  })();
  </script>
  <header class="ft-top">
    <div class="ft-top-inner">
      <div class="ft-nav">
        <a href="index.html">← 返回导航首页</a>
        <a href="free-tier.html" style="color:var(--accent2)">免费额度仪表盘</a>
      </div>
      <div class="ft-toolbar" role="group" aria-label="外观">
        <button type="button" class="theme-btn" data-theme-set="system">跟随系统</button>
        <button type="button" class="theme-btn" data-theme-set="light">浅色</button>
        <button type="button" class="theme-btn" data-theme-set="dark">深色</button>
      </div>
    </div>
  </header>
  <div class="ft-wrap">
    <h1>🆓 AI工具免费额度一览</h1>
    <p class="ft-subtitle">哪个AI免费？DeepSeek、ChatGPT、Claude、Gemini免费额度全收录，一键筛选比价</p>
    <div class="ft-stats">
      <span>已收录 <strong>${totalCount}</strong> 款工具</span>
      ${Object.entries(levelCounts).sort((a,b)=>levelSort(a[0])-levelSort(b[0])).map(([lv,c])=>`<span>${lv} <strong>${c}</strong></span>`).join("")}
    </div>
    <div class="ft-search-wrap">
      <span class="ft-search-icon">🔍</span>
      <input type="search" id="ftSearch" class="ft-search" placeholder="搜索工具名、免费额度、分类…" autocomplete="off" spellcheck="false">
      <span class="ft-search-count" id="ftSearchCount"></span>
    </div>
    <div class="ft-filter-section">
      <div class="ft-filter-label">免费等级</div>
      <div class="ft-chips" id="ftLevelChips">
        <button type="button" class="ft-chip is-active" data-filter-level="">全部</button>
        ${levelChipsHtml}
      </div>
    </div>
    <div class="ft-filter-section">
      <div class="ft-filter-label">分类</div>
      <div class="ft-chips" id="ftCatChips">
        <button type="button" class="ft-chip is-active" data-filter-cat="">全部</button>
        ${catChipsHtml}
      </div>
    </div>
    <div class="ft-filter-section">
      <div class="ft-filter-label">数据来源</div>
      <div class="ft-chips" id="ftSourceChips">
        <button type="button" class="ft-chip is-active" data-filter-source="">全部</button>
        <button type="button" class="ft-chip" data-filter-source="manual">✅ 已核实</button>
        <button type="button" class="ft-chip" data-filter-source="inferred">🤖 推断</button>
      </div>
    </div>
    <div class="ft-grid" id="ftGrid">
${cardsHtml}
    </div>
    <div class="ft-no-results" id="ftNoResults" hidden>没有找到匹配的工具，试试其他关键词？</div>
    <footer class="ft-footer">
      <p>数据来源：各产品官网公开信息，仅供参考，以官网实时定价为准。最后更新：${esc(generatedAtLabel)}</p>
      <p><a href="index.html">返回 AINav 首页</a> · <a href="ai-encyclopedia-2026.html">AI工具百科</a></p>
    </footer>
  </div>
  <button type="button" class="back-to-top" id="ftBackToTop" aria-label="回到顶部" title="回到顶部">↑</button>
  <script>
function fallbackIcon(el){el._fb=el._fb||0;var d='';try{d=new URL(el.closest('article.ft-card').getAttribute('data-link')).hostname}catch(e){}var srcs=['https://icons.duckduckgo.com/ip3/'+d+'.ico','https://www.google.com/s2/favicons?domain='+encodeURIComponent(d)+'&sz=64'];if(d&&el._fb<srcs.length){el.src=srcs[el._fb++]}else{var t=el.closest('article.ft-card');var ch=(t?t.getAttribute('data-title'):'').trim().charAt(0).toUpperCase()||'?';var sp=document.createElement('span');sp.className='ft-card-icon-ph';sp.textContent=ch;el.replaceWith(sp)}}
(function(){
  var THEME_KEY="ainav-theme";
  function setTheme(mode){
    if(mode!=="light"&&mode!=="dark"&&mode!=="system")mode="system";
    document.documentElement.setAttribute("data-theme",mode);
    try{localStorage.setItem(THEME_KEY,mode);}catch(e){}
    document.querySelectorAll(".theme-btn[data-theme-set]").forEach(function(b){
      var m=b.getAttribute("data-theme-set");
      b.classList.toggle("is-active",m===mode);
      b.setAttribute("aria-pressed",m===mode?"true":"false");
    });
  }
  var cur="system";
  try{var s=localStorage.getItem(THEME_KEY);if(s==="light"||s==="dark"||s==="system")cur=s;}catch(e){}
  setTheme(cur);
  document.querySelectorAll(".theme-btn[data-theme-set]").forEach(function(b){
    b.addEventListener("click",function(){setTheme(b.getAttribute("data-theme-set"));});
  });

  // Filter & Search
  var grid=document.getElementById("ftGrid");
  var cards=grid?grid.querySelectorAll(".ft-card"):[];
  var noResults=document.getElementById("ftNoResults");
  var searchInput=document.getElementById("ftSearch");
  var searchCount=document.getElementById("ftSearchCount");
  var activeLevel="";
  var activeCat="";
  var activeSource="";

  function runFilter(){
    var q=(searchInput?searchInput.value:"").trim().toLowerCase();
    var visible=0;
    for(var i=0;i<cards.length;i++){
      var c=cards[i];
      var search=(c.getAttribute("data-search")||"").toLowerCase();
      var level=c.getAttribute("data-level")||"";
      var cat=c.getAttribute("data-category")||"";
      var source=c.getAttribute("data-source")||"";
      var matchSearch=!q||search.indexOf(q)>=0;
      var matchLevel=!activeLevel||level===activeLevel;
      var matchCat=!activeCat||cat===activeCat;
      var matchSource=!activeSource||source===activeSource;
      var show=matchSearch&&matchLevel&&matchCat&&matchSource;
      c.hidden=!show;
      if(show)visible++;
    }
    if(noResults)noResults.hidden=visible>0;
    if(searchCount)searchCount.textContent=q?(visible+" 项"):"";
  }

  if(searchInput){
    var timer;
    searchInput.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(runFilter,100);});
    searchInput.addEventListener("keydown",function(e){if(e.key==="Escape"){searchInput.value="";runFilter();searchInput.blur();}});
  }

  // Level chips
  var levelChips=document.querySelectorAll("#ftLevelChips .ft-chip");
  levelChips.forEach(function(chip){
    chip.addEventListener("click",function(){
      activeLevel=chip.getAttribute("data-filter-level")||"";
      levelChips.forEach(function(c){c.classList.remove("is-active");});
      chip.classList.add("is-active");
      runFilter();
    });
  });

  // Cat chips
  var catChips=document.querySelectorAll("#ftCatChips .ft-chip");
  catChips.forEach(function(chip){
    chip.addEventListener("click",function(){
      activeCat=chip.getAttribute("data-filter-cat")||"";
      catChips.forEach(function(c){c.classList.remove("is-active");});
      chip.classList.add("is-active");
      runFilter();
    });
  });

  // Source chips
  var sourceChips=document.querySelectorAll("#ftSourceChips .ft-chip");
  sourceChips.forEach(function(chip){
    chip.addEventListener("click",function(){
      activeSource=chip.getAttribute("data-filter-source")||"";
      sourceChips.forEach(function(c){c.classList.remove("is-active");});
      chip.classList.add("is-active");
      runFilter();
    });
  });

  // Back to top
  var btt=document.getElementById("ftBackToTop");
  if(btt){
    function syncBtt(){btt.classList.toggle("is-visible",window.scrollY>380);}
    window.addEventListener("scroll",syncBtt,{passive:true});
    syncBtt();
    btt.addEventListener("click",function(){
      var reduce=false;try{reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(e){}
      window.scrollTo({top:0,behavior:reduce?"auto":"smooth"});
    });
  }
})();
  </script>
<script src="thinking-framework.js"></script>
</body>
</html>`;
}

try {
  fs.writeFileSync(path.join(ROOT, "free-tier.html"), buildFreeTierDashboard(), "utf8");
  console.log("wrote free-tier.html");
} catch (e) {
  console.error("free-tier.html:", e.message);
}
