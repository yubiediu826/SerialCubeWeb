---
name: serialcube-workflow
description: SerialCube 项目总入口 — 6 问决策树决定走 brainstorming / grill-me / 直接开写 / TDD / **UI design guard**。**当用户说「在 SerialCube 里加 X / 改 Y / 调 Z / 排查 bug / 新建 modal / 改 UI 风格 / UI 一致性问题」时触发**（仅路由，不替代子 skill）。**新建/大改 modal 或页面 → 强制 brainstorming + 画 mockup + 用户确认 → 才能进编码**。
---

# SerialCube Project Workflow

## 我是什么

SerialCube 项目的**入口 SOP**。当用户说要在 SerialCube 里做改动时：
1. 先走 [references/decision-tree.md](./references/decision-tree.md) 的 6 个问题
2. 决定走 brainstorming / grill-me / 直接开写 / TDD / **UI design guard**
3. 按 [references/trigger-chains.md](./references/trigger-chains.md) 的 6 步走
4. 必要时调用 `serialcube-e2e`（验证）和 `deploy-checklist`（部署）
5. **新建/大改 UI 元素必走 `serialcube-modal-review` 6 步自查**（即便不重写整个 modal）

## 7 步主链

1. **决策**（decision-tree.md 6 问）
2. **设计**（brainstorming 9 步 OR grill-me 拷问 OR TDD 失败测试 OR **UI design guard**）
3. **计划**（writing-plans 2-5 分钟粒度）
4. **编码**（直接编辑 SerialCube.html）
5. **验证**（agent-browser 跑 serialcube-e2e）
6. **审查 + 验收**（requesting-code-review → verification-before-completion）
7. **部署**（deploy-checklist → git push → 烟雾测试）

## 何时用我 vs 不用我

- **用我**: SerialCube 项目内任何代码改动 / 新功能 / bug 修复 / UI 改动
- **不用我**: 纯文档 / 知识库改动（直接改即可）；Mavis 元问题（cron / agent 配置等）

## 注意事项

- **不强制 TDD**: 单 HTML 项目没测试框架，TDD 只用于协议/算法层
- **UI 改动强制 design guard**: **不**允许用"UI 探索性"做借口跳过 spec/mockup/review。即使是 < 30 行 hotfix，**累计 ≥ 3 个同类 UI bug 算设计问题**，必须停下来走完整流程
- **新建/大改 UI 必走 modal-review**: 新建 modal / 新增页内段 / 改 modal header / 加新组件 都要跑 `serialcube-modal-review` 6 步自查（位置 / 嵌套 / 标题 / 字段对齐 / 主题适配 / 跟既有 modal 风格基线比对）
- **不跳 verification**: 即使小改动也要跑 agent-browser 验证
- **改完必跑 e2e**: `serialcube-e2e` 6 个核心场景（开/关串口、发/收、协议解析、UI 状态、主题切换、协议编辑器）是「未破其他」的最低保障
- **UI 一致性 bug 累计超 3 个必须停下来 design review**——v1.2.2 教训：6 个 commit 修 10 个 bug，本质是缺 design guard

## 完整文档

- [decision-tree.md](./references/decision-tree.md) — 6 问决策树
- [trigger-chains.md](./references/trigger-chains.md) — 6 步主链 + 3 个变体
- [serialcube-modal-review skill](../serialcube-modal-review/SKILL.md) — 新建/大改 UI 必跑
