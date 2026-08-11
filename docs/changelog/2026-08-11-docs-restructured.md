# 2026-08-11 — docs 目录首次重构

> **Commits:** `1a973ad`
> **Tags:** `docs-restructured-v1` (本地里程碑 tag,未 push)
> **Push time:** 23:51 (本地时间)
> **Author:** Mavis (单 session,未用 subagent)
> **Type:** docs

## 改了什么

docs 目录从「只有 handover/ + superpowers/」扩成完整文档中心,共 12 个新文档 + 1 个重写 (+3115 行)。

### ✨ 新增结构

```
docs/
├── README.md                       ← 新 — 文档中心索引(30秒/2分钟/5分钟分层)
├── CHANGELOG.md                    ← 新 — 统一变更记录(单文件,后被本次 refactor 改为主索引)
│
├── handover/                       ← 已有,新增 2 个文档
│   ├── HANDOFF-QUICKSTART-2026-08-11.md       ← 新 — 30秒接手卡(agent 必看)
│   ├── PROJECT-HANDOVER-2026-08-11.md         ← 已有
│   ├── SESSION-CHECKLIST-2026-08-11.md        ← 新 — 每次开新窗口 5 步检查
│   └── release-v1.0.0-2026-08-11.md           ← 已有
│
├── backup/                         ← 新目录 — 本地备份
│   └── BACKUP.md                   ← 新 — L0-L4 分层备份策略
│
├── guides/                         ← 新目录 — 使用指南
│   ├── USER-GUIDE.md               ← 新 — 工具用途/功能/怎么用(用户视角)
│   ├── DEVELOPER-GUIDE.md          ← 新 — 改代码/调试/部署 SOP(开发者视角)
│   └── AGENT-START-HERE.md         ← 新 — AI Agent 接手标准动作
│
├── reference/                      ← 新目录 — 参考资料
│   ├── ARCHITECTURE.md             ← 新 — SerialCube.html 内部结构行号速查
│   ├── CRC-REFERENCE.md            ← 新 — 5 种 CRC 算法速查 + 测试向量
│   └── PROTOCOL-TEMPLATES.md       ← 新 — 内置协议模板/字段/命令速查
│
└── superpowers/                    ← 已有 + 加索引
    ├── README.md                   ← 新 — plans 索引
    └── plans/                      ← 已有 2 个 plan
```

### ✨ 根 README.md 重写

同时服务 3 种角色:
- **GitHub 访客:** 30秒快速上手 + 功能列表
- **本地 dev:** 快速开始 + 文档导航
- **AI Agent:** 硬性规则 + 触发链

## 为什么

用户需求:
- docs 文件夹需要重新规划
- 存在交接文档
- 变更记录
- 用于本地做备份
- 每次开新的窗口,agent 能快速接手
- 主目录的 README 文档重新编写
- 浏览整个工程保持工作流
- SerialCube.html 了解用途、功能、用法

按"角色 + 时间预算"双维度设计文档结构,避免 5 分钟指南塞进 30 秒卡里。

## 影响范围

- **行为变化:** 无（纯文档改动）
- **SerialCube.html:** 不变
- **部署影响:** 无（GitHub Pages 部署的 SerialCube.html 内容不变;docs 本身在仓库根,GitHub Pages 不渲染 docs/）
- **链接完整性:** ✅ 50+ 处内部链接全部验证通过

## 关联 commit

- `1a973ad` docs(root): 重构 docs 目录(新增 12 文档 + 重写 README,服务接手/备份/用法)

## 后续

本次 refactor 自身成为下条 changelog 的主题（`2026-08-12-docs-naming-and-changelog-refactor.md`）—— 用户在本次基础上提出新要求:
- 交接文档加时间命名
- changelog 拆主从结构
- 每次 push 必写 changelog 子文件
