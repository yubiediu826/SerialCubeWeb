# SerialCube 6 步工作流触发链

## 主链: 加新功能

```
需求描述
  ↓
[决策树] 走 brainstorming / grill-me / 直接开写 / TDD / UI design guard
  ↓
[设计] ① 视觉: taste → ui-ux-pro-max → design-system
     ② 协议/算法: TDD（写失败测试 → 实现 → 重构）
     ③ UI 大改: 强制 brainstorming + mockup + 用户确认 + serialcube-modal-review
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
[决策树 Q6=Yes] 直接开写
  ↓
**【UI 改动】** 跑 serialcube-modal-review 6 步自查（即便 < 30 行）
  ↓
改 SerialCube.html
  ↓
agent-browser 单次验证（open + snapshot -i + 截图）
  ↓
verification-before-completion
```

跳过: brainstorming / writing-plans / code-review
**不**跳过: modal-review（UI 改动）/ e2e 验证 / 截图比对

## 变体 2: Bug 修复

```
用户报 bug
  ↓
systematic-debugging（根因调查 → 模式分析 → 假设测试）
  ↓
TDD（写复现测试，e2e 形式）
  ↓
**【UI bug】** 判定: hotfix（孤立 1 个）vs design bug（同类 ≥ 3）
  ↓
  ├─ hotfix: 直接改 → agent-browser 验证
  └─ design bug: 强制走 Q3 完整 design review
  ↓
改 SerialCube.html
  ↓
agent-browser 验证修复
  ↓
requesting-code-review
```

**为什么有 design bug 分支**: v1.2.2 教训——连续 6 个 hotfix 修 10 个 UI bug，本质是 design guard 缺失。继续 hotfix 是治标不治本。

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

## 变体 4: UI 大改（modal/页面级）

```
需求：新建 modal / 大改 header / 加新组件 / 改页内段
  ↓
[决策树 Q2=大改] 强制走
  ↓
brainstorming（9 步，明确 spec）
  ↓
ui-ux-pro-max：跑 --design-system 做风格基线（不只查数据）
  ↓
画 mockup（HTML 静态页 + 主题切换 + 嵌套场景）
  ↓
**用户确认**（mockup 通过后才能进编码）
  ↓
writing-plans（2-5 分钟粒度）
  ↓
改 SerialCube.html
  ↓
serialcube-modal-review 6 步自查
  ↓
agent-browser 6 场景 e2e + 主题切换验证
  ↓
requesting-code-review
  ↓
verification-before-completion
```

**禁用场景**:
- ❌ "我先做着试试" → 不允许
- ❌ "小改动没事" → UI 改动即使是 < 30 行也要走 modal-review
- ❌ "用户没明确反对就继续" → mockup 没确认不进编码

## 与现有 skill 的接口

| Step | 主用 skill | 辅助 skill |
|------|-----------|-----------|
| 需求决策 | serialcube-workflow（本） | brainstorming / grill-me |
| 视觉设计（数据查询）| ui-ux-pro-max | design-system |
| 视觉设计（基线比对）| serialcube-modal-review | ui-ux-pro-max / design-taste-frontend |
| 协议/算法 | test-driven-development | serial-protocol-copilot（建好之后）|
| 计划 | writing-plans | brainstorming（前置） |
| 编码 | （直接 edit） | — |
| 验证 | agent-browser | serialcube-e2e |
| 审查 | requesting-code-review | — |
| 验收 | verification-before-completion | — |
| 部署 | deploy-checklist | agent-browser（部署后烟雾测试）|
