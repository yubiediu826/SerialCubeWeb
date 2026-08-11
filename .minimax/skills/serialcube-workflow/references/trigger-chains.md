# SerialCube 6 步工作流触发链

## 主链: 加新功能

```
需求描述
  ↓
[决策树] 走 brainstorming / grill-me / 直接开写
  ↓
[设计] ① 视觉: taste → ui-ux-pro-max → design-system
     ② 协议/算法: TDD（写失败测试 → 实现 → 重构）
  ↓
writing-plans（2-5 分钟粒度）
  ↓
改 SerialCube.html（用 edit/grep 精修）
  ↓
验证: agent-browser 跑 serialcube-e2e 的相关场景
  ↓
requesting-code-review（5 个 agent 并行审查）
  ↓
verification-before-completion
  ↓
部署: deploy-checklist（GitHub Pages 5 件事）
```

## 变体 1: 小改动 (< 30 行)

```
需求
  ↓
[决策树 Q5=Yes] 直接开写
  ↓
改 SerialCube.html
  ↓
agent-browser 单次验证（open + snapshot -i）
  ↓
verification-before-completion
```
跳过: brainstorming / writing-plans / code-review

## 变体 2: Bug 修复

```
用户报 bug
  ↓
systematic-debugging（根因调查 → 模式分析 → 假设测试）
  ↓
TDD（写复现测试，e2e 形式）
  ↓
修 SerialCube.html
  ↓
agent-browser 验证修复
  ↓
requesting-code-review
```

## 变体 3: 部署

```
改完要发版
  ↓
verification-before-completion
  ↓
deploy-checklist（5 件事全过）
  ↓
git push → GitHub Pages 自动部署
  ↓
部署后烟雾测试: agent-browser 打开生产 URL → snapshot 关键路径
```

## 与现有 skill 的接口

| Step | 主用 skill | 辅助 skill |
|------|-----------|-----------|
| 需求决策 | serialcube-workflow（本） | brainstorming / grill-me |
| 视觉设计 | taste | ui-ux-pro-max / design-system |
| 协议/算法 | test-driven-development | serial-protocol-copilot（建好之后）|
| 计划 | writing-plans | brainstorming（前置） |
| 编码 | （直接 edit） | — |
| 验证 | agent-browser | serialcube-e2e |
| 审查 | requesting-code-review | — |
| 验收 | verification-before-completion | — |
| 部署 | deploy-checklist | agent-browser（部署后烟雾测试）|
