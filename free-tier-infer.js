/**
 * 按 URL / 标题归纳免费与计费说明（非官方承诺，供导航参考）。
 * 与 free-tier-hints.json 合并时：JSON 字段覆盖此处推断。
 */
function inferPricingHint(link, title, category) {
  const cat = String(category || "");
  const tit = String(title || "");
  const base = {
    freeLevel: "部分免费",
    quota:
      "多数产品支持注册后使用基础免费档或领取试用额度；高阶模型、团队/企业能力多为订阅或按量计费。",
    dailyCycle:
      "免费额度是否按自然日重置、是否按月清零，以各产品「定价 / 套餐 / 用量」页与账户后台为准；并非都有「每日赠送」。",
    firstBonus:
      "新用户礼金、试用金、邀请奖励若有，以注册流程、活动页或邮件/控制台公告为准，通常带有效期与适用范围。",
    note: "本条为站内规则归纳，**不替代官网**；下单与合规以服务商当前条款为准。",
    updated: "2026-04（规则推断）",
  };

  let u;
  try {
    u = new URL(link);
  } catch {
    return base;
  }
  const h = u.hostname.toLowerCase();
  const host = h.replace(/^www\./, "");
  const path = u.pathname.toLowerCase();

  const doc = {
    freeLevel: "文档免费",
    quota: "公开文档与开发者指南免费阅读；实际调用 API、托管实例等按产品计费规则另计。",
    dailyCycle: "—",
    firstBonus: "—",
    note: "以该文档对应产品的定价页为准。",
    updated: "2026-04（规则推断）",
  };

  const oss = {
    freeLevel: "开源免费（自托管）",
    quota:
      "开源许可证下可自由获取源码并自行部署；官方云托管、技术支持、企业版或 Registry 增值服务可能收费。",
    dailyCycle: "—",
    firstBonus: "—",
    note: "以仓库 LICENSE 与项目说明为准。",
    updated: "2026-04（规则推断）",
  };

  const cloud = {
    freeLevel: "部分免费",
    quota:
      "云平台普遍提供「免费层 Free Tier」或试用额度（含部分 AI 服务）；超出后按量或订阅计费。",
    dailyCycle:
      "免费层多为「每月固定额度」或「开通后若干月内有效」，**不一定是每日重置**；见各服务 SKU 说明。",
    firstBonus: "新账号试用金/代金券若有，以注册控制台与活动页为准。",
    note: "不同区域、账号类型（个人/企业）权益可能不同。",
    updated: "2026-04（规则推断）",
  };

  const apiRouter = {
    freeLevel: "部分免费",
    quota:
      "聚合 API 类：常见为「注册送试用余额 + 按调用付费」；单价与上游官方价、缓存策略相关。",
    dailyCycle: "余额/赠送额度消耗规则以平台控制台为准。",
    firstBonus: "首充礼、推荐返利若有，以平台活动规则为准。",
    note: "缓存命中可能降价，以服务商说明为准。",
    updated: "2026-04（规则推断）",
  };

  // —— 文档 / 规范 / 学术 ——
  if (
    host === "arxiv.org" ||
    host === "eur-lex.europa.eu" ||
    host.endsWith(".gov") ||
    host.endsWith(".gov.cn") ||
    host === "paperswithcode.com" ||
    host === "semanticscholar.org" ||
    host === "connectedpapers.com" ||
    host === "aclanthology.org" ||
    host === "openreview.net" ||
    path.includes("/docs/") && (host.includes("openai.com") || host.includes("anthropic.com"))
  ) {
    return {
      freeLevel: "免费访问",
      quota: "公开论文、法规文本或技术文档可免费浏览；付费墙或增值功能以站点为准。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  if (
    host === "modelcontextprotocol.io" ||
    host === "docs.anthropic.com" ||
    host === "developers.openai.com" ||
    (host === "platform.openai.com" && path.includes("/docs"))
  ) {
    return doc;
  }

  // —— 开源 / 代码托管 ——
  if (host === "github.com" || host.endsWith(".github.io")) {
    return {
      ...oss,
      quota:
        "公开仓库可克隆与自建；GitHub Copilot、Codespaces、Large File Storage、企业版等另计费。",
    };
  }
  if (host === "gitlab.com" || host === "gitee.com") return oss;
  if (host === "npmjs.com" || host === "pypi.org" || host === "crates.io") {
    return {
      freeLevel: "生态mostly免费",
      quota: "包管理器与公开包索引免费使用；私有 Registry、企业镜像与带宽可能收费。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 本机 / 开源推理 ——
  if (
    host === "ollama.com" ||
    host === "lmstudio.ai" ||
    host === "github.com" && path.includes("/llama.cpp") ||
    host === "github.com" && path.includes("/vllm-project") ||
    host === "github.com" && path.includes("/ggerganov")
  ) {
    return {
      freeLevel: "软件免费",
      quota: "客户端与开源权重下载通常免费；算力与电费由本机或自有服务器承担。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "部分「一键包」镜像站可能单独收费。",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 云大厂 ——
  if (
    host.endsWith(".amazonaws.com") ||
    host === "aws.amazon.com" ||
    host === "cloud.google.com" ||
    host === "azure.microsoft.com" ||
    host.endsWith(".cloud.google.com") ||
    host === "console.cloud.google.com" ||
    host === "portal.azure.com" ||
    host === "volcengine.com" ||
    host.endsWith(".volcengine.com") ||
    host === "console.volcengine.com"
  ) {
    return cloud;
  }

  // —— Hugging Face ——
  if (host === "huggingface.co") {
    return {
      freeLevel: "部分免费",
      quota:
        "Hub 浏览、数据集与模型页免费；Inference API、Spaces 长期托管、PRO 订阅等按官网计费。",
      dailyCycle: "免费推理配额若有，以账户与模型卡说明为准。",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 国际 API / 模型商 ——
  if (
    host === "openai.com" ||
    host === "platform.openai.com" ||
    host === "api.openai.com"
  ) {
    return {
      freeLevel: "部分免费",
      quota:
        "ChatGPT 网页/应用有免费档；API 按 token 计费，需绑卡与用量限额，见 OpenAI Pricing。",
      dailyCycle: "网页免费档策略会调整；API 按账单周期结算，非「每日免费条数」模式为主。",
      firstBonus: "新账号促销以官网为准。",
      note: "Codex / ChatGPT Team 等与消费级账号计费分离。",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "anthropic.com" || host === "console.anthropic.com") {
    return {
      freeLevel: "部分免费",
      quota: "Claude 消费端可能有免费试用层；API 与 Console 按量计费为主。",
      dailyCycle: "以 Anthropic 当前政策与账户用量页为准。",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "cohere.com" || host === "console.cohere.com") {
    return {
      freeLevel: "部分免费",
      quota: "开发者试用额度常见，正式生产按套餐；见 Cohere Pricing。",
      dailyCycle: "试用额度重置规则以控制台为准。",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "mistral.ai" || host === "console.mistral.ai") {
    return {
      freeLevel: "部分免费",
      quota: "控制台常提供试用；生产调用按模型与 token 计费。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "replicate.com") {
    return {
      freeLevel: "按次计费",
      quota: "按运行时长/次计费，新用户可能有试用金；见 Replicate 定价。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 中文大厂对话 / 搜索 ——
  if (host === "deepseek.com" || host.endsWith(".deepseek.com")) {
    return {
      freeLevel: "部分免费",
      quota: "网页对话常见免费模型可用；API 与活动套餐见官网定价。",
      dailyCycle: "高峰策略与限流以官方公告为准。",
      firstBonus: "活动赠额以官网为准。",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "doubao.com" || host.endsWith(".doubao.com")) {
    return {
      freeLevel: "部分免费",
      quota: "豆包多形态（网页/客户端）一般有免费使用层；商业化与 API 另计。",
      dailyCycle: "以字节系产品内公示为准。",
      firstBonus: "活动以站内为准。",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "moonshot.cn" || host === "kimi.moonshot.cn" || host === "kimi.com") {
    return {
      freeLevel: "部分免费",
      quota: "Kimi 免费档可用；长上下文、高峰策略等以月之暗面说明为准。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host.includes("tongyi.aliyun.com") || host === "bailian.console.aliyun.com") {
    return {
      freeLevel: "部分免费",
      quota: "通义/百炼常有体验额度；企业包年与 API 按阿里云账单计费。",
      dailyCycle: "免费体验额度周期见控制台。",
      firstBonus: "新用户促销以阿里云活动为准。",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host.includes("yiyan.baidu.com") || host === "qianfan.cloud.baidu.com") {
    return {
      freeLevel: "部分免费",
      quota: "文心/千帆常见免费试用与按量后付；见百度智能云定价。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host.includes("stepfun.com") || host.includes("stepchat.cn")) {
    return {
      freeLevel: "部分免费",
      quota: "阶跃星辰产品以官网与控制台套餐为准。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host.includes("xfyun.cn") || host.includes("xinghuo.xfyun.cn")) {
    return {
      freeLevel: "部分免费",
      quota: "讯飞开放平台常见试用包与按量计费；见控制台。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "ai.mi.com" || host.includes("xiaomimimo.com")) {
    return {
      freeLevel: "部分免费",
      quota: "小米 AI 能力多与账号绑定；免费档与会员策略以官网为准。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 国际消费级 ——
  if (host === "chatgpt.com") {
    return {
      freeLevel: "部分免费",
      quota: "免费账号可使用基础对话；Plus/Pro 等为订阅制，功能与模型列表以官网为准。",
      dailyCycle: "免费用户可能存在速率与可用模型限制。",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "gemini.google.com" || host === "aistudio.google.com" || host === "notebooklm.google") {
    return {
      freeLevel: "部分免费",
      quota: "Google AI 产品多有免费层；高级模型与 Google AI Pro 等订阅另计。",
      dailyCycle: "与 Google 账户、地区与配额策略相关。",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "grok.com" || host === "x.ai") {
    return {
      freeLevel: "部分免费",
      quota: "xAI 常提供免费试用层；SuperGrok 等为付费。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "perplexity.ai") {
    return {
      freeLevel: "部分免费",
      quota: "免费档可搜索问答；Pro 解锁更强模型与更高限额。",
      dailyCycle: "免费提问次数以账户当前策略为准。",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "copilot.microsoft.com" || host === "bing.com") {
    return {
      freeLevel: "部分免费",
      quota: "Copilot 能力与 Microsoft 365 / Copilot Pro 订阅绑定情况见微软说明。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 设计 / 图像 SaaS ——
  if (
    host === "canva.com" ||
    host === "figma.com" ||
    host === "remove.bg" ||
    host === "clipdrop.co" ||
    host === "photoroom.com" ||
    host === "cutout.pro" ||
    host === "gaoding.com" ||
    host === "magicstudio.com" ||
    host === "recraft.ai" ||
    host === "liblib.art" ||
    host === "d.design" ||
    host === "jimeng.jianying.com" ||
    host === "klingai.com" ||
    host === "hama.app" ||
    host === "icons8.com"
  ) {
    return {
      freeLevel: "部分免费",
      quota: "通常有免费试用次数或带水印导出；高清/商用/批量多为订阅或按张计费。",
      dailyCycle: "免费积分是否每日刷新以各产品「账户-用量」说明为准。",
      firstBonus: "新用户赠送积分常见，有过期时间。",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 音乐 / 语音 ——
  if (
    host === "suno.com" ||
    host === "udio.com" ||
    host === "elevenlabs.io" ||
    host === "deepgram.com" ||
    host === "assemblyai.com" ||
    host === "cartesia.ai" ||
    host === "haimian.com" ||
    host === "moises.ai" ||
    host === "soundraw.io" ||
    host === "mubert.com" ||
    host === "boomy.com" ||
    host.includes("timedomain.cn")
  ) {
    return {
      freeLevel: "部分免费",
      quota: "多数提供有限免费生成或试听；商用导出、长音频多为订阅。",
      dailyCycle: "免费额度重置规则见各站套餐说明。",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 笔记 / 效率 ——
  if (host === "notion.so" || host.endsWith(".notion.so")) {
    return {
      freeLevel: "部分免费",
      quota: "Notion 个人免费版有块数等限制；Notion AI 多为附加订阅。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "immersivetranslate.com") {
    return {
      freeLevel: "部分免费",
      quota: "浏览器扩展基础翻译免费；Pro 模型与更高限额订阅。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 编程 / Agent 工具 ——
  if (
    host === "cursor.com" ||
    host === "warp.dev" ||
    host === "v0.dev" ||
    host === "codeium.com" ||
    host === "windsurf.com" ||
    host === "replit.com" ||
    host === "codesandbox.io"
  ) {
    return {
      freeLevel: "部分免费",
      quota: "IDE/代码助手常见免费档与 Pro 订阅；用量以各产品账户页为准。",
      dailyCycle: "—",
      firstBonus: "教育/团队方案另计。",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "flowith.io" || host === "refly.ai" || host === "dify.ai" || host === "coze.cn") {
    return {
      freeLevel: "部分免费",
      quota: "智能体/工作流平台多有免费试用与按资源计费；见各站定价。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 腾讯 / 钉钉 / 飞书 ——
  if (host.endsWith(".qq.com") || host === "qclaw.qq.com") {
    return {
      freeLevel: "部分免费",
      quota: "腾讯系产品以对应官网与活动页为准；多数含免费体验与增值服务。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "feishu.cn" || host.endsWith(".feishu.cn")) {
    return {
      freeLevel: "部分免费",
      quota: "飞书基础能力随版本；AI 功能多在商业版或加购包内。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (host === "dingtalk.com" || host.endsWith(".dingtalk.com")) {
    return {
      freeLevel: "部分免费",
      quota: "钉钉 AI 能力随版本与组织套餐；见官方说明。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 聚合 API / 国内路由（名称或分类提示） ——
  if (
    cat.includes("API") ||
    cat.includes("路由") ||
    cat.includes("推理云") ||
    host === "siliconflow.cn" ||
    host === "openrouter.ai" ||
    host === "together.ai" ||
    host === "groq.com" ||
    host === "fireworks.ai" ||
    host === "novita.ai" ||
    host === "deepinfra.com"
  ) {
    return apiRouter;
  }

  // —— 目录 / 资讯 / 榜单 ——
  if (
    host === "toolify.ai" ||
    host === "aigcrank.cn" ||
    host === "theresanaiforthat.com" ||
    host === "producthunt.com" ||
    host === "jiqizhixin.com" ||
    host === "qbitai.com" ||
    host === "aibase.com" ||
    host === "ai-bot.cn" ||
    host === "metaso.cn"
  ) {
    if (host === "metaso.cn") {
      return {
        freeLevel: "部分免费",
        quota: "秘塔检索一般有免费档；深度检索与会员能力另计。",
        dailyCycle: "—",
        firstBonus: "—",
        note: "",
        updated: "2026-04（规则推断）",
      };
    }
    return {
      freeLevel: "浏览免费",
      quota: "导航/资讯/榜单类页面免费阅读；跳转至第三方产品后遵循该产品计费。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 魔搭 / Kaggle ——
  if (host === "modelscope.cn" || host === "kaggle.com") {
    return {
      freeLevel: "部分免费",
      quota: "社区与数据集浏览免费；训练、推理算力、竞赛与订阅项另计。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }

  // —— 默认：分类名启发 ——
  if (cat.includes("论文") || cat.includes("资讯")) {
    return {
      freeLevel: "浏览免费",
      quota: "媒体与索引类内容免费阅读；付费专栏或会员若有以站点为准。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "",
      updated: "2026-04（规则推断）",
    };
  }
  if (cat.includes("隧道") || cat.includes("VPN") || cat.includes("临时邮箱") || cat.includes("接码")) {
    return {
      freeLevel: "因站而异",
      quota: "此类工具常见免费档有限制（次数、时长）；付费解锁稳定线路或专属号码。",
      dailyCycle: "—",
      firstBonus: "—",
      note: "请遵守当地法律与服务条款。",
      updated: "2026-04（规则推断）",
    };
  }

  return base;
}

function mergePricingHint(inferred, fileHint) {
  if (!fileHint || typeof fileHint !== "object") return { ...inferred };
  const out = { ...inferred };
  for (const k of ["freeLevel", "quota", "dailyCycle", "firstBonus", "note", "updated"]) {
    if (fileHint[k] != null && String(fileHint[k]).trim() !== "") out[k] = fileHint[k];
  }
  return out;
}

module.exports = { inferPricingHint, mergePricingHint };
