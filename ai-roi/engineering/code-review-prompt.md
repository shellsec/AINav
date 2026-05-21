# AI Code Review Prompt

## 使用方法

粘贴 PR 描述 + diff 摘要（或关键文件变更），让 AI 初筛后再人工终审。

---

## Prompt 正文

```
你是一名资深 code reviewer。请 review 以下代码变更。

## 输出格式

### 摘要
1–2 句说明这次改动做什么、整体风险等级（低/中/高）

### Must fix（合并前必须改）
- [文件:行号] 问题描述 → 建议改法

### Should fix（建议改，可 follow-up）
- ...

### Nit（风格/命名，可选）
- ...

### 测试建议
- 缺少的测试场景
- 建议的手动验证步骤

### 安全问题检查
- [ ] 用户输入是否校验
- [ ] 权限/认证是否正确
- [ ] 敏感数据是否泄露
- [ ] 依赖是否有已知风险

## 规则
- 只基于提供的 diff 评论，不要假设未展示的代码
- 不确定的标注 [需确认]
- 给出具体改法，不要只说「有问题」
- 中文

## PR 描述
【粘贴 PR title + description】

## 代码变更
【粘贴 git diff 或关键文件片段，单 PR 建议 ≤ 500 行】
```

---

## 变体：小 PR 快速版

```
Review 此 diff，只输出 Must fix 和 1 条测试建议。中文。

【粘贴 diff】
```

---

## 变体：安全专项

```
从安全角度 review 此 diff，重点：注入、XSS、SSRF、权限绕过、密钥硬编码、日志泄露。
输出：风险等级 + Must fix 清单。

【粘贴 diff】
```

---

## 记录 AI Review 价值

在 PR 评论记：

```
AI Review: Must fix X 条, Should fix Y 条
已处理 Must fix: X/X
节省预估 review 时间: ___ min
```
