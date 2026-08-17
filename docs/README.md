# SerialCube 文档中心

> 这是 SerialCube 项目的**完整文档入口**。所有文档都按角色和时间预算分层。

---

## 🚀 当前状态

**最新版本**: v1.3.11 (2026-08-17) — hotfix: trackSerialWebView 跳过 localhost (本地/测试环境不再产生 `/api/serialweb_page-view` 404 console 噪音)
**当前分支**: `main`
**最近 release**: v1.3.10 ([changelog](changelog/2026-08-16-v1.3.10-ux-and-role-fixes.md)) | v1.3.9 ([changelog](changelog/2026-08-16-v1.3.9-single-protocol-and-bidirectional-commands.md)) | v1.3.8 ([changelog](changelog/2026-08-16-v1.3.8-host-device-mode-and-cards.md)) | v1.3.7 ([changelog](changelog/2026-08-16-v1.3.7-host-device-sim-and-control-cards.md)) | v1.3.6 ([changelog](changelog/2026-08-16-v1.3.6-bms-dual-direction-and-config-split.md)) | v1.3.5 ([changelog](changelog/2026-08-16-v1.3.5-p0-hotfixes.md)) | v1.3.4 ([changelog](changelog/2026-08-14-v1.3.4-cascade-modal-unify.md)) | v1.3.3 ([changelog](changelog/2026-08-14-v1.3.3-config-center-proto-filter.md)) | v1.3.2.1 ([changelog](changelog/2026-08-14-v1.3.2.1-dashboard-state-3way.md)) | v1.3.2 ([changelog](changelog/2026-08-14-v1.3.2-dashboard-bug-fixes.md)) | v1.3.1 ([changelog](changelog/2026-08-13-v1.3.1-cascade-delete-modal.md)) | v1.3.0 ([changelog](changelog/2026-08-13-v1.3.0-debug-panel.md)) | v1.2.2 ([changelog](changelog/2026-08-13-v1.2.2-ui-cleanup.md)) | v1.2.1 ([changelog](changelog/2026-08-13-v1.2.1-ui-consistency.md)) | v1.2.0 ([changelog](changelog/2026-08-12-v1.2.0-config-center-refactor.md)) | v1.1.1 ([changelog](changelog/2026-08-12-v1.1.1-fixes.md)) | v1.1.0 ([release notes](handover/release-v1.1.0-2026-08-12.md))

---

## 30 秒 / 2 分钟 / 5 分钟 分层引导

### 🚀 30 秒（agent 进窗口必看）

1. 读完 [`handover/HANDOFF-QUICKSTART-2026-08-11.md`](handover/HANDOFF-QUICKSTART-2026-08-11.md) — 30 秒快速接手卡
2. 跑一次 **preflight**：`pwsh -File .minimax/skills/serialcube-workflow/preflight.ps1`（9 项健康检查）
3. 知道项目是单 HTML 串口调试工具，主文件 `SerialCube.html`，当前版本 `v1.3.10`

### ⏱ 2 分钟（开始干活前）

1. 看完 [`handover/PROJECT-HANDOVER-2026-08-11.md`](handover/PROJECT-HANDOVER-2026-08-11.md) — 完整项目交接（架构 / 关键决策 / 硬性规则）
2. 知道 6 条硬性规则：commit 中文 / push 前 ask / VERSION 三处同步 / 改前跑 bump / 每次 push 写 changelog / **版本变更后更新 README**（防断档）
3. 知道 `bump-version.ps1` 在 `.minimax/skills/version-management/scripts/`，怎么用

### 🎯 5 分钟（动手改代码前）

1. 看完 [`guides/USER-GUIDE.md`](guides/USER-GUIDE.md) — 工具的用途 / 功能 / 怎么用
2. 看完 [`guides/DEVELOPER-GUIDE.md`](guides/DEVELOPER-GUIDE.md) — 改代码 / 调试 / 部署 SOP
3. 看 [`reference/ARCHITECTURE.md`](reference/ARCHITECTURE.md) — SerialCube.html 内部结构（关键章节行号速查）
4. 跑 `preflight.ps1` 确认工具健康（agent-browser / git / PS 5.1 陷阱）
5. 跑 `select-scenarios.ps1 -ChangedFiles $(git diff --name-only)` 自动选 e2e 场景

---

## 文档地图

```
docs/
├── README.md                              ← 你在这里
├── CHANGELOG.md                           ← 变更记录（按版本归档）
│
├── handover/                              ← 交接文档
│   ├── HANDOFF-QUICKSTART-2026-08-11.md              ← 30 秒接手卡（agent 必看）
│   ├── PROJECT-HANDOVER-2026-08-11.md                ← 完整项目交接
│   ├── HANDOFF-V1.2.1-2026-08-13.md                 ← v1.2.1 UI 一致性修复交接（最新）
│   ├── HANDOFF-V1.2-2026-08-12.md                   ← v1.2 配置中心重构交接
│   ├── HANDOFF-V1.1.1-FIXES-2026-08-12.md            ← v1.1.1 4 修复交接
│   ├── HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md  ← v1.1.0 协议多命令交接
│   ├── HANDOFF-POST-V1.1.0-2026-08-12.md             ← v1.1.0 发版后状态
│   ├── release-v1.1.0-2026-08-12.md                  ← v1.1.0 发布说明
│   └── release-v1.0.0-2026-08-11.md                  ← v1.0.0 发布说明
│
├── backup/                                ← 本地备份
│   └── BACKUP.md                          ← 备份策略 + 验证
│
├── guides/                                ← 使用指南
│   ├── USER-GUIDE.md                      ← 工具用途/功能/怎么用
│   ├── DEVELOPER-GUIDE.md                 ← 改代码/调试/部署 SOP
│   └── AGENT-START-HERE.md                ← Agent 接手标准动作
│
├── reference/                             ← 参考资料
│   ├── ARCHITECTURE.md                    ← SerialCube.html 内部结构
│   ├── CRC-REFERENCE.md                   ← 5 种 CRC 速查
│   └── PROTOCOL-TEMPLATES.md              ← 内置协议模板速查
│
├── design/                                ← 设计预览
│   ├── v1.1.1-fixes-preview-v3.html       ← v1.1.1 4 修复最终预览（52KB）
│   └── protocol-multi-command-v4-preview.html  ← v1.1.0 协议多命令最终预览（49KB）
│
├── superpowers/                           ← 实施计划存档
│   ├── README.md                          ← plans 索引
│   ├── plans/                             ← 各版本实施计划
│   └── specs/                             ← 设计 spec
│
└── changelog/                             ← 每次 push 的子 changelog
    ├── README.md                          ← 命名规范 + 模板
    ├── 2026-08-12-v1.1.1-fixes.md
    ├── 2026-08-12-protocol-multi-command.md
    ├── 2026-08-12-readme-sync-fix.md
    ├── 2026-08-12-docs-naming-and-changelog-refactor.md
    ├── 2026-08-11-docs-restructured.md
    └── 2026-08-11-v1.0.0-release.md
```

> 清理记录: v1.1.1 后清掉 20 个无用文件（verify/ 临时脚本 + design preview v1/v2/v3 + handover 中间 checklist + screenshots commit-msg 残留），保留在 `.minimax/archive/docs-cleanup-2026-08-12/` 备查。

---

## 按角色分流的文档入口

| 你是谁 | 你想做什么 | 第一站 |
|--------|------------|--------|
| **新接手 agent** | 快速了解项目 | [`handover/HANDOFF-QUICKSTART-2026-08-11.md`](handover/HANDOFF-QUICKSTART-2026-08-11.md) |
| **新接手 agent** | 改代码前必跑 preflight | `.minimax/skills/serialcube-workflow/preflight.ps1` |
| **任何接手者** | 了解项目全貌 | [`handover/PROJECT-HANDOVER-2026-08-11.md`](handover/PROJECT-HANDOVER-2026-08-11.md) |
| **任何接手者** | 看变更记录 | [`CHANGELOG.md`](CHANGELOG.md) |
| **任何接手者** | v1.2.1 UI 一致性修复详情 | [`handover/HANDOFF-V1.2.1-2026-08-13.md`](handover/HANDOFF-V1.2.1-2026-08-13.md) |
| **任何接手者** | v1.2 配置中心重构详情 | [`handover/HANDOFF-V1.2-2026-08-12.md`](handover/HANDOFF-V1.2-2026-08-12.md) |
| **任何接手者** | v1.1.1 修复详情 | [`handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md`](handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md) |
| **使用者** | 工具怎么用 | [`guides/USER-GUIDE.md`](guides/USER-GUIDE.md) |
| **开发者** | 改代码 / 调试 / 部署 | [`guides/DEVELOPER-GUIDE.md`](guides/DEVELOPER-GUIDE.md) |
| **Agent** | 接手标准动作 | [`guides/AGENT-START-HERE.md`](guides/AGENT-START-HERE.md) |
| **备份负责人** | 本地备份策略 | [`backup/BACKUP.md`](backup/BACKUP.md) |
| **协议层开发者** | CRC / 协议模板 | [`reference/CRC-REFERENCE.md`](reference/CRC-REFERENCE.md) / [`reference/PROTOCOL-TEMPLATES.md`](reference/PROTOCOL-TEMPLATES.md) |
| **架构师** | SerialCube.html 内部结构 | [`reference/ARCHITECTURE.md`](reference/ARCHITECTURE.md) |
| **历史追溯** | 看历史实施计划 | [`superpowers/plans/`](superpowers/plans/) |

---

## 按时间预算分流的文档入口

| 时间预算 | 看哪些 |
|----------|--------|
| **30 秒** | [`handover/HANDOFF-QUICKSTART-2026-08-11.md`](handover/HANDOFF-QUICKSTART-2026-08-11.md) |
| **2 分钟** | + [`handover/PROJECT-HANDOVER-2026-08-11.md`](handover/PROJECT-HANDOVER-2026-08-11.md) |
| **5 分钟** | + [`guides/USER-GUIDE.md`](guides/USER-GUIDE.md) + [`guides/DEVELOPER-GUIDE.md`](guides/DEVELOPER-GUIDE.md) + [`reference/ARCHITECTURE.md`](reference/ARCHITECTURE.md) + 跑 preflight |
| **15 分钟** | + 全部 guide + reference + CHANGELOG |
| **完整吃透** | 全部 docs/ + `.minimax/skills/README.md` + SerialCube.html 全文 |

---

## 文档维护原则

1. **每个文档必须有明确的"何时用我"** — 30 秒卡和 5 分钟指南不能混
2. **每个文档必须有"何时不用我"** — 避免重复入口
3. **变更必须同步** — 改 SerialCube.html 的同时更新 CHANGELOG + 必要时更新 USER-GUIDE
4. **版本变更后必更新 README**（根 README + docs/README + CHANGELOG）— 工作流自动 check
5. **AI 文档优先** — 文档服务于 AI agent 接手 > 人类阅读
6. **不写废话** — 写之前先看「是不是已经说过」

---

## 🛠 工具速查

| 工具 | 路径 | 何时用 |
|------|------|--------|
| **preflight** | `.minimax/skills/serialcube-workflow/preflight.ps1` | 改 SerialCube.html 前必跑 |
| **select-scenarios** | `.minimax/skills/serialcube-e2e/scripts/select-scenarios.ps1` | 改完跑 e2e 前 |
| **bump-version** | `.minimax/skills/version-management/scripts/bump-version.ps1` | 发版前必跑 |
| **subagent 模板** | `.minimax/skills/serialcube-workflow/references/subagent-template.md` | 拆 subagent 任务时 |
| **verify 脚本** (本地) | `docs/verify/*.js` (.gitignore) | 跑 jsdom 单元验证（不进 git） |

---

## 链接到外部

- [根 README](../README.md) — GitHub 首页文档
- [AI 工作流总文档](../.minimax/skills/README.md) — 完整 skill 集合
- [GitHub 仓库](https://github.com/yubiediu826/SerialCubeWeb)
- [在线访问](https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html)
