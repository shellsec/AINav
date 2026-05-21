# AI 全面接入与 ROI 自查 · ai-roi v5

> **主入口：[`index.html`](index.html)** — 离线可用，数据存浏览器本地。

## 核心原则

**你决策，AI 执行。** 详见 [00-decision-execution-model.md](00-decision-execution-model.md)。

```
你定目标/方案/标准 → AI 执行 → 你终审 → 发布
```

## 功能一览

| 功能 | 说明 |
|------|------|
| **134+ 场景** | 生活/办公/研发/业务/复杂长任务/流程改造/行业扩展 |
| **25 人工必须项** | 与 AI 池绿黄对比条 |
| **时间权重占比** | 按 `耗时×频次` 算 AI vs 人工 |
| **真实 baseline 校准** | 每项可填 base/now/实际周节省 |
| **角色筛选** | 偏办公 / 研发 / 业务 |
| **工具订阅自动加总** | 勾选 Cursor/ChatGPT 等自动算月费 |
| **风险成本** | 返工/误用从 ROI 扣除 |
| **月度快照 + Markdown 报告** | 导出存档 |
| **Prompt 模板** | 纪要/周报/需求等链到 `prompts/` |

## 目录结构

| 路径 | 用途 |
|------|------|
| `index.html` + `app.js` / `data.js` / `i18n.js` / `items-en.js` | 交互式自查站 |
| [00-decision-execution-model.md](00-decision-execution-model.md) | 决策-执行分工 |
| [prompts/](prompts/) | 站点内 📎 链接的 Prompt 模板 |
| [engineering/code-review-prompt.md](engineering/code-review-prompt.md) | 代码审查 Prompt |

## 快速开始

1. 打开 [`index.html`](index.html)（或 AINav 首页 → **AI 接入自查** → `/ai-roi/`）
2. 完成新手引导（时薪 → 扫人工池 → 勾 5 个场景）
3. 月末：**保存快照** + **导出 Markdown 报告**

## ROI 公式

```
月 ROI = (周节省 h × 4.33 × 时薪) − 月订阅 − 月风险成本

周节省 = Σ (基准−现在 或 实际填写) × 频次 × 状态系数
```
