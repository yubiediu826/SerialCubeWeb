---
name: serialcube-workflow
description: SerialCube 项目总入口 — 5 问决策树决定走 brainstorming / grill-me / 直接开写 / TDD。**当用户说「在 SerialCube 里加 X / 改 Y / 调 Z / 排查 bug」时触发**（仅路由，不替代子 skill）。
---

# SerialCube Project Workflow

## 我是什么

SerialCube 项目的**入口 SOP**。当用户说要在 SerialCube 里做改动时：
1. 先走 [references/decision-tree.md](./references/decision-tree.md) 的 5 个问题
2. 决定走 brainstorming / grill-me / 直接开写 / TDD
3. 按 [references/trigger-chains.md](./references/trigger-chains.md) 的 6 步走
4. 必要时调用 `serialcube-e2e`（验证）和 `deploy-checklist`（部署）

## 7 步主链

1. **决策**（decision-tree.md 5 问）
2. **设计**（brainstorming 9 步 OR grill-me 拷问 OR TDD 失败测试）
3. **计划**（writing-plans 2-5 分钟粒度）
4. **编码**（直接编辑 SerialCube.html）
5. **验证**（agent-browser 跑 serialcube-e2e）
6. **审查 + 验收**（requesting-code-review → verification-before-completion）
7. **部署**（deploy-checklist → git push → 烟雾测试）

## 何时用我 vs 不用我

- **用我**: SerialCube 项目内任何代码改动 / 新功能 / bug 修复
- **不用我**: 纯文档 / 知识库改动（直接改即可）；Mavis 元问题（cron / agent 配置等）

## 注意事项

- **不强制 TDD**: 单 HTML 项目没测试框架，UI 探索性改动直接写；TDD 只用于协议/算法层
- **不跳 verification**: 即使小改动也要跑 agent-browser 验证
- **改完必跑 e2e**: `serialcube-e2e` 6 个核心场景（开/关串口、发/收、协议解析、UI 状态、主题切换、协议编辑器）是「未破其他」的最低保障

## 完整文档

- [decision-tree.md](./references/decision-tree.md) — 5 问决策树
- [trigger-chains.md](./references/trigger-chains.md) — 6 步主链 + 3 个变体
