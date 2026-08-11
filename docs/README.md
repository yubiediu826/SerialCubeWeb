# SerialCube 文档中心

> 这是 SerialCube 项目的**完整文档入口**。所有文档都按角色和时间预算分层。

---

## 30 秒 / 2 分钟 / 5 分钟 分层引导

### 🚀 30 秒（agent 进窗口必看）

1. 读完 [`handover/HANDOFF-QUICKSTART.md`](handover/HANDOFF-QUICKSTART.md) — 30 秒快速接手卡
2. 激活 `.minimax/skills/using-superpowers/` — 自动发现其他 skill
3. 知道项目是单 HTML 串口调试工具，主文件 `SerialCube.html`，当前版本 `1.0.0`

### ⏱ 2 分钟（开始干活前）

1. 看完 [`handover/PROJECT-HANDOVER.md`](handover/PROJECT-HANDOVER.md) — 完整项目交接（架构 / 关键决策 / 硬性规则）
2. 知道 4 条硬性规则：commit 中文 / push 前 ask / VERSION 三处同步 / 改前跑 bump
3. 知道 `bump-version.ps1` 在 `.minimax/skills/version-management/scripts/`，怎么用

### 🎯 5 分钟（动手改代码前）

1. 看完 [`guides/USER-GUIDE.md`](guides/USER-GUIDE.md) — 工具的用途 / 功能 / 怎么用
2. 看完 [`guides/DEVELOPER-GUIDE.md`](guides/DEVELOPER-GUIDE.md) — 改代码 / 调试 / 部署 SOP
3. 看 [`reference/ARCHITECTURE.md`](reference/ARCHITECTURE.md) — SerialCube.html 内部结构（关键章节行号速查）
4. 跑一次 [`handover/SESSION-CHECKLIST.md`](handover/SESSION-CHECKLIST.md) — 每次开新窗口 5 步检查

---

## 文档地图

```
docs/
├── README.md                              ← 你在这里
├── CHANGELOG.md                           ← 变更记录（按版本归档）
│
├── handover/                              ← 交接文档
│   ├── HANDOFF-QUICKSTART.md              ← 30 秒接手卡（agent 必看）
│   ├── PROJECT-HANDOVER.md                ← 完整项目交接
│   ├── SESSION-CHECKLIST.md               ← 每次开新窗口 5 步检查
│   └── release-v1.0.0.md                  ← v1.0.0 发布说明
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
└── superpowers/                           ← 实施计划存档
    ├── README.md                          ← plans 索引
    └── plans/
        ├── 2026-08-11-serialcube-dev-workflow.md     ← 已执行
        └── 2026-08-11-serial-protocol-copilot.md     ← 未执行（存档）
```

---

## 按角色分流的文档入口

| 你是谁 | 你想做什么 | 第一站 |
|--------|------------|--------|
| **新接手 agent** | 快速了解项目 | [`handover/HANDOFF-QUICKSTART.md`](handover/HANDOFF-QUICKSTART.md) |
| **新接手 agent** | 干活前 5 步检查 | [`handover/SESSION-CHECKLIST.md`](handover/SESSION-CHECKLIST.md) |
| **任何接手者** | 了解项目全貌 | [`handover/PROJECT-HANDOVER.md`](handover/PROJECT-HANDOVER.md) |
| **任何接手者** | 看变更记录 | [`CHANGELOG.md`](CHANGELOG.md) |
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
| **30 秒** | [`handover/HANDOFF-QUICKSTART.md`](handover/HANDOFF-QUICKSTART.md) |
| **2 分钟** | + [`handover/PROJECT-HANDOVER.md`](handover/PROJECT-HANDOVER.md) |
| **5 分钟** | + [`guides/USER-GUIDE.md`](guides/USER-GUIDE.md) + [`guides/DEVELOPER-GUIDE.md`](guides/DEVELOPER-GUIDE.md) + [`reference/ARCHITECTURE.md`](reference/ARCHITECTURE.md) |
| **15 分钟** | + 全部 guide + reference + CHANGELOG |
| **完整吃透** | 全部 docs/ + `.minimax/skills/README.md` + SerialCube.html 全文 |

---

## 文档维护原则

1. **每个文档必须有明确的"何时用我"** — 30 秒卡和 5 分钟指南不能混
2. **每个文档必须有"何时不用我"** — 避免重复入口
3. **变更必须同步** — 改 SerialCube.html 的同时更新 CHANGELOG + 必要时更新 USER-GUIDE
4. **AI 文档优先** — 文档服务于 AI agent 接手 > 人类阅读
5. **不写废话** — 写之前先看「是不是已经说过」

---

## 链接到外部

- [根 README](../README.md) — GitHub 首页文档
- [AI 工作流总文档](../.minimax/skills/README.md) — 11 阶段 SOP
- [GitHub 仓库](https://github.com/yubiediu826/SerialCubeWeb)
- [在线访问](https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html)
