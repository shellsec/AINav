import fs from 'fs';

// 已知有推荐奖励计划的产品（含你保留的4个尾巴对应的产品）
const rewardProducts = new Set([
  // 你已有尾巴的
  '沉浸式翻译', 'Taskade', 'FlowUs AI', 'Flowith',
  // 之前去掉尾巴的（说明它们也有推荐计划）
  'AI小聚', '职徒简历', '蓝字典AI求职', 'ChatDOC', '讯飞会议',
  '听脑AI', '酷表ChatExcel', 'AiPPT', '歌者AI', 'ChatPPT',
  'ProcessOn', '亿图脑图', '晓语台', '厉害猫AI',
  '堆友AI', 'Cutout.Pro', '秒画', '腾讯智影',
  'LALAL.AI', '快转字幕', '135 AI排版',
  // 知名有推荐计划的
  'Notion AI', 'Canva AI', 'Grammarly', 'Writesonic', 'Copy.ai',
  'Jasper', 'Midjourney', 'Runway', 'Descript', 'ElevenLabs',
  'Figma Make', 'Gamma App', 'Beautiful.ai', 'Cursor',
  'V0.dev', 'Bolt', 'Replit', 'Vercel v0',
  'Perplexity', 'Arc', 'Brave（Leo 等）',
  'D-ID', 'HeyGen', 'Synthesia',
  'Civitai', 'Leonardo.Ai', 'Playground AI',
  'Codeium', 'Cody', 'Tabnine',
  'DeepL翻译', 'DeepL Write',
  'Framer AI', 'Dora AI', 'Wegic',
  'Fireflies.ai', 'Otter.ai', 'Airgram',
  'Zapier AI', 'Make (Integromat)', 'n8n',
  'Fliki', 'InVideo AI', 'Pictory',
  'Remove.bg', 'Cleanup.pictures',
  'Whimsical', 'Miro AI', 'FigJam AI',
  'Loom AI', 'Notion', 'Coda AI',
  'Craft AI Assistant', 'Roam Research',
  'Writesonic', 'Sudowrite', 'Jasper',
  'Podcastle', 'Murf AI', 'Play.ht',
  'You.com', 'Phind', 'Devv',
  'Monica', 'Merlin', 'Sider',
  'Suno', 'Udio', 'AIVA', 'Soundraw',
  'Krea AI', 'Ideogram', 'Flux',
  'Luma AI', 'Pika', 'Kling',
  '天工AI助手', '天工AI搜索', '豆包', '智谱清言', '文心一言',
  '通义千问', '通义万相', '讯飞星火大模型', 'Kimi',
  '美图AI文生图', '美图抠图', '稿定AI', '创客贴AI画匠',
  '彩云小译', '火山翻译', '腾讯翻译君',
  '飞书妙记', '腾讯会议AI小助手',
  'WPS AI', '百度文库AI助手',
  'Coze', '扣子 Coze', 'Dify',
  '秘塔AI搜索', '秘塔写作猫',
  '即梦', '可灵 Kling', '一帧秒创',
  '笔灵AI写作', '简单AI', '蛙蛙写作',
  '网易天音', '魔音工坊',
  '博思AI白板', 'GitMind', 'Xmind AI',
  '万兴播爆', '万彩AI',
  '金山快译',
  '印象AI', '语雀',
  '轻竹办公', '熊猫办公',
  '闪剪', '剪映 CapCut',
  '触手AI绘画', '造梦日记',
  '海螺问问', '跃问',
  '硅基流动 SiliconFlow',
  '火龙果写作', '火山写作',
  '元象XChat', '百川大模型',
  'iSlide AI', 'AiPPT',
  '录咖', 'DomoAI',
  '星火内容运营大师', '讯飞智文',
  '酷家乐AI', '模袋云AI',
  '来画', '万彩微影',
]);

const md = fs.readFileSync('Full_AI_Encyclopedia_Final_Verified_2026.md', 'utf8');
const lines = md.split('\n');
let modified = 0;
const result = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith('|') || line.startsWith('| #') || line.startsWith('|分类') || line.includes(':---')) {
    result.push(line);
    continue;
  }
  const cols = line.split('|');
  // cols[0] = '', cols[1] = 分类, cols[2] = 名称, cols[3] = 免费政策, ...
  const name = (cols[2] || '').trim();
  
  if (rewardProducts.has(name)) {
    const policy = (cols[3] || '').trim();
    // 检查是否已有标签
    if (!policy.includes('🎁推荐奖励')) {
      cols[3] = ' ' + policy + '；🎁推荐奖励 ';
      result.push(cols.join('|'));
      modified++;
      continue;
    }
  }
  result.push(line);
}

fs.writeFileSync('Full_AI_Encyclopedia_Final_Verified_2026.md', result.join('\n'));
console.log(`已为 ${modified} 条添加 🎁推荐奖励 标签`);
