import { readFileSync, writeFileSync } from 'fs';

const file = 'index.html';
let html = readFileSync(file, 'utf8');

// --- Step 1: Add data-i18n to h2 block-title elements ---
// We need to add data-i18n to each h2 so JS can swap text.
// For the fav block, it's special (has inner spans/buttons).

// Map of Chinese text -> i18n key for h2 titles
const h2Map = {
  '热门工具': 'catHotTools',
  'AI 聊天对话': 'catAIChat',
  'AI 搜索工具': 'catAISearch',
  'AI 办公工具': 'catAIOffice',
  '效率提升': 'catEfficiency',
  '文档工具': 'catDocTools',
  '办公会议': 'catOfficeMeeting',
  'Excel表格': 'catExcel',
  '幻灯片(PPT)': 'catPPT',
  '思维导图': 'catMindMap',
  'AI 写作工具': 'catAIWriting',
  'AI 编程工具': 'catAICoding',
  'AI 图像工具': 'catAIImage',
  '常用工具': 'catCommonTools',
  '背景移除': 'catBgRemove',
  '人物抹除': 'catPersonRemove',
  'AI 视频工具': 'catAIVideo',
  'AI 音频工具': 'catAIAudio',
  'AI 音乐 · 唱歌与配乐': 'catAIMusic',
  'AI 设计工具': 'catAIDesign',
  '前端 UI · AI 3D 与视觉设计': 'catUI3D',
  'AI 翻译工具': 'catAITranslation',
  'AI 指令提示': 'catAIPrompts',
  'AI 内容检测': 'catAIDetection',
  'AI 法律助手': 'catAILaw',
  'AI 经典书籍': 'catAIBooks',
  'AI 开源模型': 'catAIModels',
  'AI 学习网站': 'catAILearning',
  'AI 开发框架': 'catAIFramework',
  'AI 模型 API · 路由聚合 · 推理云': 'catAPIRouter',
  'AI 智能体 · 工作流与自动化': 'catAgentWorkflow',
  'LLM 网关 · 代理 · SDK 与可观测': 'catLLMGateway',
  'MCP · 模型上下文协议与工具生态': 'catMCP',
  'RAG · 向量库与检索基建': 'catRAG',
  'AI 知识库 · 笔记与企业检索': 'catAIKnowledge',
  '本地与私有化 · 推理引擎': 'catLocalInfer',
  '浏览器自动化 · 电脑操控': 'catBrowserAuto',
  '语音 · TTS/ASR 与实时多模态': 'catVoiceRealtime',
  'AI 会议与语音纪要': 'catAIMeeting',
  '数据 · 微调 · 合成与评测': 'catDataTrain',
  '论文 · 资讯 · 榜单与评测': 'catPaperRanking',
  '终端与 CLI 上的 AI': 'catCLI',
  'AI 浏览器与新形态': 'catAIBrowser',
  '硬件 · 边缘推理与跑分': 'catEdgeHardware',
  'AI 合规与标准': 'catCompliance',
  '网络工具 · 隐私与安全': 'catNetPrivacy',
  'GEO / AEO · AI 搜索优化': 'catGEO',
};

// Add data-i18n to simple h2 titles (no inner HTML)
for (const [zh, key] of Object.entries(h2Map)) {
  const pattern = `<h2 class="block-title">${zh}</h2>`;
  const replacement = `<h2 class="block-title" data-i18n="${key}">${zh}</h2>`;
  html = html.replaceAll(pattern, replacement);
}

// Special: fav block h2
html = html.replace(
  '<h2 class="block-title">常用收藏',
  '<h2 class="block-title" data-i18n="catFav">常用收藏'
);

// --- Step 2: Add data-i18n to sidebar nav links ---
// Sidebar has <a class="nav-i" href="...">TEXT</a> and <a class="nav-g" href="...">TEXT</a>
// We add data-i18n to these using the same key map
for (const [zh, key] of Object.entries(h2Map)) {
  // nav-i
  html = html.replaceAll(
    `class="nav-i" href="#">${zh}</a>`,
    `class="nav-i" href="#" data-i18n="${key}">${zh}</a>`
  );
  // nav-g
  html = html.replaceAll(
    `class="nav-g" href="#">${zh}</a>`,
    `class="nav-g" href="#" data-i18n="${key}">${zh}</a>`
  );
}

// Also add data-i18n to sidebar nav links that have real hrefs with matching text
// We need to match by the text content after the closing > of the opening tag
for (const [zh, key] of Object.entries(h2Map)) {
  // Match sidebar links: <a class="nav-i" href="...">TEXT</a> where text matches
  const regex = new RegExp(`(<a class="nav-[ig]" href="[^"]*")>(${zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(</a>)`, 'g');
  html = html.replace(regex, `$1 data-i18n="${key}">$2$3`);
}

// Fav nav link
html = html.replace(
  'class="nav-i nav-fav" href="#fav-block">★ 常用收藏</a>',
  'class="nav-i nav-fav" href="#fav-block" data-i18n="catFav">★ 常用收藏</a>'
);

// sidebar toggle button
html = html.replace(
  'id="sidebarToggle" aria-label="展开/收起导航">☰ 导航</button>',
  'id="sidebarToggle" aria-label="展开/收起导航" data-i18n-aria="sidebarToggleAria" data-i18n="sidebarToggle">☰ 导航</button>'
);

// fav hint and buttons
html = html.replace(
  '<span class="fav-hint">点击各卡片右上角星标固定到此处</span>',
  '<span class="fav-hint" data-i18n="favHint">点击各卡片右上角星标固定到此处</span>'
);
html = html.replace(
  'class="fav-action-btn" id="favExport">导出</button>',
  'class="fav-action-btn" id="favExport" data-i18n="favExport">导出</button>'
);
html = html.replace(
  'class="fav-action-btn" id="favImport">导入</button>',
  'class="fav-action-btn" id="favImport" data-i18n="favImport">导入</button>'
);

// back to top button
html = html.replace(
  'id="backToTop" aria-label="返回顶部">↑ Top</button>',
  'id="backToTop" aria-label="返回顶部" data-i18n-aria="backTopAria" data-i18n="backTop">↑ Top</button>'
);

writeFileSync(file, html, 'utf8');
console.log('Done: added data-i18n attributes to index.html');

// Count how many data-i18n we added
const matches = html.match(/data-i18n="/g);
console.log(`Total data-i18n attributes: ${matches ? matches.length : 0}`);
