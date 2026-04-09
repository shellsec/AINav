/**
 * 解析 Full_AI_Encyclopedia_Final_Verified_2026.md（管道表格），生成 ai-encyclopedia-2026.html。
 * 网页不展示「官方链接」「更新」列；产品名仍可按官方链接跳转。
 */
const fs = require("fs");
const path = require("path");

const ENCYCLOPEDIA_MD_PRIMARY = "Full_AI_Encyclopedia_Final_Verified_2026.md";

function stripMdNoise(s) {
  return String(s || "")
    .replace(/\*\*/g, "")
    .trim();
}

function splitTableRow(line) {
  const t = line.trim();
  if (!t.startsWith("|")) return null;
  const cells = t.split("|").map((c) => c.trim());
  if (cells.length < 2) return null;
  return cells.slice(1, -1);
}

function loadEncyclopediaFullTable(rootDir) {
  const filePath = path.join(rootDir, ENCYCLOPEDIA_MD_PRIMARY);
  if (!fs.existsSync(filePath)) {
    return { filePath, missing: true, title: "", headers: [], rows: [] };
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const title = (lines[0] || "").replace(/^#\s*/, "").trim() || "2026 全球 AI 工具百科全书";
  const headerCells = splitTableRow(lines[1]);
  if (!headerCells || headerCells.length < 2) {
    return { filePath, missing: true, title, headers: [], rows: [] };
  }
  const nCol = headerCells.length;
  const headers = headerCells.map(stripMdNoise);
  const rows = [];
  for (let i = 3; i < lines.length; i++) {
    const cells = splitTableRow(lines[i]);
    if (!cells || cells.length < 3) continue;
    const padded = [];
    for (let j = 0; j < nCol; j++) {
      padded.push(stripMdNoise(cells[j] !== undefined ? cells[j] : ""));
    }
    rows.push(padded);
  }
  return { filePath, missing: false, title, headers, rows, nCol };
}

module.exports = { loadEncyclopediaFullTable, ENCYCLOPEDIA_MD_PRIMARY };
