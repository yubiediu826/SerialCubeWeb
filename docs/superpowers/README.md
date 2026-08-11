# docs/superpowers/ — 实施计划存档

> **本目录是 SerialCube 项目的"历史档案馆"** — 记录重要实施决策的执行计划（含未执行的）。

---

## 目录结构

```
docs/superpowers/
├── README.md                                  ← 你在这里
└── plans/
    ├── 2026-08-11-serialcube-dev-workflow.md  ← ✅ 已执行（v1.0.0 配套）
    └── 2026-08-11-serial-protocol-copilot.md  ← ❌ 未执行（计划存档,等协议层工作量大时再做）
```

---

## plans 索引

| Plan | 日期 | 状态 | 用途 |
|------|------|------|------|
| [serialcube-dev-workflow](plans/2026-08-11-serialcube-dev-workflow.md) | 2026-08-11 | ✅ 已执行 | 跑通 SerialCube 开发工作流,补 3 个断点（决策规则 / 端到端验证 / 部署清单） |
| [serial-protocol-copilot](plans/2026-08-11-serial-protocol-copilot.md) | 2026-08-11 | ❌ 未执行 | 给协议层加 AI 辅助解析的 skill,Python 镜像 + CLI 工具 |

---

## 计划文件命名规范

`<日期>-<简短描述>.md`

- 日期: `YYYY-MM-DD` (ISO 8601)
- 描述: kebab-case,简短

---

## 计划文件结构

每个 plan 都有:

```markdown
# <Title> — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: ...

**Goal:** ...            ← 一句话目标
**Architecture:** ...    ← 架构草图
**Tech Stack:** ...      ← 技术选型

## Global Constraints    ← 全局约束

## Task 1: ...            ← 每个任务独立
  Files: ...             ← 涉及文件
  Interfaces: ...        ← 输入 / 输出
  ### Step 1.1: ...
    - [ ] **Step 1.1.1:** 描述
    - [ ] **Step 1.1.2:** 描述

## Task 2: ...
...
```

---

## 什么时候加新 plan

- **重大新功能** — brainstorming 完成后,产出 plan → 实施
- **架构变更** — 跨多个文件 / 多个模块的改动,先写 plan 再动手
- **建立新 skill** — 跟 SerialCube 项目相关的新工具
- **大型重构** — 拆单 HTML 项目 / 重写协议层等

## 什么时候不加 plan

- **小改** — 文案 / 颜色 / 一行 bug fix
- **单字段加协议** — 直接在协议编辑器里改
- **文档改写** — 直接写

---

## plans 状态机

```
[Idea] → [Planned] → [In Progress] → [Done]      ← 正常流程
                          ↓
                       [Blocked] → [In Progress]  ← 遇到问题
                          ↓
                       [Cancelled]                 ← 不做了
```

每个 plan 在 frontmatter 或开头标状态:

- ✅ **已执行** — `serialcube-dev-workflow`（v1.0.0 完成时一起）
- ❌ **未执行** — `serial-protocol-copilot`（等协议层工作量大时再做）
- 🚧 **进行中** — 当前正在做的（看 todo）
- ⏸ **暂停** — 暂时不做,等条件满足

---

## 相关文档

- [完整文档中心](../README.md)
- [30 秒接手卡](../handover/HANDOFF-QUICKSTART.md)
- [完整项目交接](../handover/PROJECT-HANDOVER.md)
- [v1.0.0 发布说明](../handover/release-v1.0.0.md)
- [变更记录](../CHANGELOG.md)
- [AI 工作流总入口](../../.minimax/skills/README.md)
