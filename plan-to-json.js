#!/usr/bin/env node
/**
 * plan-to-json.js — Plan 页面数据 JSON 化提取工具
 * 
 * 将各 plan 页面的结构化数据提取为 JSON 文件，
 * 便于后续自动化渲染和 i18n。
 * 
 * 用法：node plan-to-json.js [plan-file.html ...]
 * 不传参数则处理所有 *-plan.html
 */
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const planFiles = process.argv.length > 2
  ? process.argv.slice(2)
  : fs.readdirSync(DIR).filter(f => f.endsWith("-plan.html"));

const outDir = path.join(DIR, "plan-data");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const file of planFiles) {
  const fp = path.join(DIR, file);
  if (!fs.existsSync(fp)) { console.warn(`跳过: ${file} 不存在`); continue; }
  
  const html = fs.readFileSync(fp, "utf8");
  const baseName = file.replace(".html", "");
  
  // 提取页面基本信息
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  const updatedMatch = html.match(/data-updated="([^"]+)"/);
  
  // 提取所有卡片数据 (cp-platform 或 cp-item)
  const items = [];
  const cardRegex = /<div\s+class="cp-(?:platform|item)(?:\s+overseas)?"/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const startPos = match.index;
    // 找到卡片的结束标签
    let depth = 1;
    let pos = startPos + match[0].length;
    while (depth > 0 && pos < html.length) {
      if (html.substr(pos, 4) === "<div") depth++;
      else if (html.substr(pos, 6) === "</div>") depth--;
      if (depth > 0) pos++;
    }
    const cardHtml = html.substring(startPos, pos + 6);
    
    // 提取卡片中的链接和标题
    const nameMatch = cardHtml.match(/cp-platform-name[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/);
    const titleM = cardHtml.match(/cp-item-title[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/);
    
    items.push({
      name: nameMatch ? nameMatch[2].trim() : (titleM ? titleM[2].trim() : ""),
      link: nameMatch ? nameMatch[1].trim() : (titleM ? titleM[1].trim() : ""),
      overseas: match[0].includes("overseas"),
    });
  }
  
  // 提取章节标题
  const sections = [];
  const sectionRegex = /<h2\s+class="cp-section-hd[^"]*"[^>]*>([\s\S]*?)<\/h2>/g;
  while ((match = sectionRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    sections.push(text);
  }
  
  const planData = {
    id: baseName,
    title: titleMatch ? titleMatch[1].replace(" — AINav", "").trim() : baseName,
    description: descMatch ? descMatch[1].trim() : "",
    updated: updatedMatch ? updatedMatch[1] : null,
    sections,
    items,
    sourceFile: file,
  };
  
  const outPath = path.join(outDir, `${baseName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(planData, null, 2), "utf8");
  console.log(`${file} → plan-data/${baseName}.json (${items.length} items, ${sections.length} sections)`);
}

console.log(`\n完成！共处理 ${planFiles.length} 个 Plan 页面`);
