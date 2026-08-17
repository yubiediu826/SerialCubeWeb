# SerialCube — 项目交接文档

> **本项目：** 单 HTML 串口调试工具
> **当前版本：** v1.3.14（卡片 tab 类型列漏判 control/set 修复，2026-08-17）
> **最近更新：** 2026-08-17(v1.3.14 同步 PROJECT-HANDOVER 当前版本)
> **原最后更新：** 2026-08-11(v1.0.0 时内容)
> **作者：** Mavis (M3) + 用户 M.*

> **⚠️ v1.1.0 状态:** 协议多命令 + 5 tab 一站式配置中心 + 4 步漫游引导 + Lucide 全图标。详见 [`HANDOFF-POST-V1.1.0-2026-08-12.md`](HANDOFF-POST-V1.1.0-2026-08-12.md) 和 [`release-v1.1.0-2026-08-12.md`](release-v1.1.0-2026-08-12.md)。本文件保留 v1.0.0 章节作为历史快照。

---

## TL;DR（接手前 30 秒看完）

- **是什么：** 单 HTML 文件的 Web 串口调试工具，BMS/EMS/PCS 协议调试方向
- **在哪用：** <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html>
- **核心文件：** `SerialCube.html`（~1.3 MB / 31657 行，所有代码 inline）
- **怎么改：** 改 HTML → 跑 `bump-version.ps1` → 中文 commit → ask 后 push → Pages 自动部署
- **当前版本：** v1.3.14（卡片 tab 类型列漏判 control/set 修复）
- **AI 工作流：** `.minimax/skills/` 16 个 skill，完整 SOP 看 [`.minimax/skills/README.md`](../../.minimax/skills/README.md)

---

## 1. 项目是什么 / 不是什么

### 是
- 一个**单文件** Web 应用（HTML + 内嵌 CSS + 内嵌 JS）
- 用 Web Serial API 调试真实串口设备
- 面向**嵌入式 / 硬件**领域（BMS、EMS、PCS 等协议帧调试）
- 配合 TLV 协议编辑器和图形仪表盘，做实时数据可视化
- 配套 15 个 AI skill 工具集，**完整开发 SOP** 写在 `.minimax/skills/`

### 不是
- 不是框架 / 库（不发布到 npm）
- 不是 SaaS（不存数据，纯前端）
- 不是跨浏览器（只支持 Chromium 内核）
- 不是协议解析库（虽然有 TLV 编辑器，但定位是"调试工具"）
- 不是大型项目（单 HTML 文件，约 21K 行，**单文件维护**）

---

## 2. 当前状态（v1.0.0 快照）

### ✅ 已完成

| 项 | 状态 | 详情 |
|----|------|------|
| v1.0.0 代码完成 | ✅ | `SerialCube.html const VERSION = '1.0.0'` |
| Git tag v1.0.0 | ✅ | annotated tag，指向 commit `d286d93`（release commit） |
| 推送到 GitHub | ✅ | `c6f9939` 推送成功，远端 main 与本地一致 |
| GitHub Pages 部署 | ✅ | Actions `ci: 新增 GitHub Pages 部署 workflow` 已运行成功 |
| 在线访问 | ✅ | <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html> 200 OK |
| 17 个 commit 全中文 | ✅ | 用户硬性要求，filter-branch 改过 |
| 4 个自建 skill | ✅ | workflow / e2e / deploy / version-management |
| 11 个上游 skill | ✅ | using-superpowers / brainstorming / grill-me / writing-plans / TDD / taste / ui-ux-pro-max / design-system / agent-browser / requesting-code-review / verification-before-completion |
| taste SKILL.md 拆分 | ✅ | 88KB → 6KB + references/core.md 82KB（按需加载） |
| skill description 差异化 | ✅ | 15 个 description 撞词高危区已拆分 |

### 🔄 可选 / 未做

| 项 | 状态 | 备注 |
|----|------|------|
| `serialcube-e2e` 6 场景实测 | ⏳ | agent-browser 测试 60s timeout（Chrome 启动慢），留给用户真浏览器手动验证 |
| `using-git-worktrees` skill | ❌ | 单文件项目不需要，多任务并行时再装 |
| `protocol-copilot` skill | ❌ | 计划存档 [`docs/superpowers/plans/2026-08-11-serial-protocol-copilot.md`](../superpowers/plans/2026-08-11-serial-protocol-copilot.md)，等协议层工作量大时再做 |
| `release-management` skill | ❌ | 1.0.1 / 1.1.0 累积时再做 |
| 根 `README.md` | ✅ | 本次完成 |
| `PROJECT-HANDOVER-2026-08-11.md` | ✅ | 本次完成 |

### 🐛 已知问题

| 项 | 影响 | 临时方案 |
|----|------|----------|
| agent-browser e2e 测试 60s timeout | e2e 场景在 CI 跑可能超时 | 改 timeout 到 120s，或留真浏览器手动 |
| SerialCube.html 942KB 单文件 | 单文件维护成本 | 不拆（用户硬性要求单 HTML），靠 skill 工作流保证可维护性 |
| Web Serial 仅 Chromium | 跨浏览器用户无法用 | 文档明说，不做强兼容 |

---

## 3. 架构 / 文件结构

```
D:\WorkSpace\SerialCubeWeb\
├── SerialCube.html              # 主代码（942KB，21K 行，全内嵌）
├── index.html                   # 跳转页（690B，自动跳到 SerialCube.html）
├── README.md                    # 仓库首页文档（GitHub 渲染）
├── .gitignore                   # 排除 .tmp/ 等
│
├── .github/
│   └── workflows/
│       └── pages.yml            # GitHub Pages 部署（actions/deploy-pages@v4）
│
├── .minimax/
│   └── skills/                  # AI 工作流工具集（15 skill）
│       ├── README.md            # 主工作流文档（11 阶段 SOP）
│       ├── using-superpowers/   # ① 入口
│       ├── brainstorming/       # ② 产品定义
│       ├── grill-me/            # ② 产品定义
│       ├── writing-plans/       # ③ 架构
│       ├── test-driven-development/  # ④ 测试
│       ├── taste/               # ⑤ 视觉（含 references/core.md 82KB）
│       ├── ui-ux-pro-max/       # ⑤ 视觉
│       ├── design-system/       # ⑤ 视觉
│       ├── agent-browser/       # ⑥ 浏览器调试
│       ├── requesting-code-review/  # ⑦ 验证
│       ├── verification-before-completion/  # ⑦ 验证
│       ├── serialcube-workflow/  # ⑧ 项目入口（5 问决策树）
│       ├── serialcube-e2e/       # ⑨ 端到端 6 场景
│       ├── deploy-checklist/     # ⑩ GitHub Pages 5 件事
│       └── version-management/   # ⑪ 版本管理 3 条硬性规则
│
├── docs/
│   ├── handover/                # 交接文档（本目录）
│   │   ├── PROJECT-HANDOVER-2026-08-11.md  # 项目总览（本文件）
│   │   └── release-v1.0.0-2026-08-11.md    # v1.0.0 发布说明
│   └── superpowers/
│       └── plans/               # 历史实施计划
│           ├── 2026-08-11-serialcube-dev-workflow.md    # 已执行
│           └── 2026-08-11-serial-protocol-copilot.md    # 未执行
│
└── .tmp/                        # 临时文件（gitignored）
```

### 关键依赖

- **无 Python 依赖**（脚本都是 PowerShell + node 原生）
- **Node.js 24.18.0** + **agent-browser@0.34.0** 全局（用于 e2e 测试）
- **ECharts**（CDN，按需加载，SerialCube.html 内部引用）
- **Web Serial API**（Chromium 原生，无 polyfill）

---

## 4. 关键决策日志

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| **单 HTML 文件** | 用户硬性要求，方便分发 / 部署 / 嵌入 | 多文件项目（否决） |
| **GitHub Pages 部署** | 零成本、免运维、自动 HTTPS | Vercel / Netlify（不需要） |
| **agent-browser 替代 in-app Browser** | token 省 10x、ref 定位强 | Playwright（重）、in-app Browser（贵） |
| **不用 subagent-driven 后阶段** | 小改动 root session 直接做更快 | 全 subagent（没必要） |
| **filter-branch 改 commit message** | 外部 `git-filter-repo` 未装，filter-branch 够用 | 重写历史（否决） |
| **taste SKILL.md 拆分** | 88KB 触发 60K tokens，拆分后 2K | 保留大文件（贵） |
| **不用 `using-git-worktrees`** | 单文件项目单任务，不需要并行分支 | worktree（过度设计） |
| **workflow / e2e / deploy / version-management 自建 4 skill** | 上游无对应覆盖，本项目高频场景 | 手动记忆（不靠谱） |

---

## 5. 日常开发流程

### 5.1 接到任务后（任何 agent 接手）

1. **读本文件** — 了解项目全貌
2. **读 [`.minimax/skills/README.md`](../../.minimax/skills/README.md)** — 了解 11 阶段工作流
3. **读 [`docs/handover/release-v1.0.0-2026-08-11.md`](release-v1.0.0-2026-08-11.md)** — 了解上一个发布点
4. **激活 `using-superpowers` skill** — 自动发现其他 skill

### 5.2 改代码的标准流程

```
1. 需求 / 改需求
   ├─ 创造性工作（新功能 / 改行为）→ brainstorming 9 步
   └─ 小改动（bug 修复 / 文案 / 配置）→ 直接动手

2. 改 SerialCube.html
   └─ 改前必跑: .\bump-version.ps1 -Level <patch|minor|major>
      （version-management R1 硬性规则）

3. 自验证
   └─ 真浏览器打开 SerialCube.html 手动跑

4. 提交
   ├─ git add <files>
   ├─ git commit -m "<type>(<scope>): <中文 subject>"  ← subject 必须中文
   └─ commit 类型 ∈ {feat, fix, docs, chore, perf, refactor, test}

5. 推送
   └─ ⚠️ push 前 ASK USER 确认  （version-management R2 硬性规则）
      git push origin main --tags
      （首次推送要 -u，后续不用）

6. 部署
   └─ GitHub Actions 自动跑 pages.yml，无需手动
   └─ 部署后跑 deploy-checklist 5 件事验证
```

### 5.3 发版流程（patch / minor / major）

```
1. 累积多个 commit 后，准备发版
2. 跑 .\bump-version.ps1 -Level <patch|minor|major>
   ├─ 脚本自动改 SerialCube.html const VERSION
   ├─ 脚本自动加 changelog 段
   └─ 脚本不动 git tag（tag 手动打）

3. 写 docs/handover/release-vX.Y.Z.md（参考 release-v1.0.0-2026-08-11.md）

4. git add + commit
   git commit -m "chore(release): 发布 vX.Y.Z"

5. git tag -a vX.Y.Z -m "vX.Y.Z 发布说明"
   git push origin main --tags  ← ASK USER 确认

6. GitHub Pages 自动部署新版本
```

---

## 6. 常用命令速查

### Git

```bash
# 状态
git status
git log --oneline -20
git tag -l

# 提交（中文）
git add <files>
git commit -m "feat(scope): 中文描述改动"

# 推送（⚠️ ASK USER 确认）
git push origin main
git push origin main --tags    # 含 tag

# 切回历史
git checkout v1.0.0 -- SerialCube.html   # 恢复某版本
```

### 版本管理

```powershell
# 改 SerialCube.html 前必跑
.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level patch   # 1.0.0 → 1.0.1
.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level minor   # 1.0.0 → 1.1.0
.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level major   # 1.0.0 → 2.0.0
```

### E2E 测试（可选）

```bash
# 单个场景
agent-browser open https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html
agent-browser snapshot -i --json
agent-browser click @e3
# ... 详见 .minimax/skills/serialcube-e2e/scenarios/01-06.md

# 跑全部（PowerShell 脚本）
.\.minimax\skills\serialcube-e2e\scripts\run-scenarios.ps1
```

### 文件清理

```powershell
# 不用 Remove-Item（safety policy）
# 用 Microsoft.VisualBasic.FileIO 送回收站
Add-Type -AssemblyName Microsoft.VisualBasic
[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($path, 'OnlyErrorDialogs', 'SendToRecycleBin')
```

---

## 7. 注意事项 / 硬性规则

### 🚨 项目级硬性规则（不可破）

1. **Commit message 中文** — 用户硬性要求
2. **Push 前 ask user** — version-management R2，避免 force push 误操作
3. **VERSION 三处同步** — `SerialCube.html const VERSION` / HTML changelog 段 / Git tag
4. **改 SerialCube.html 前跑 bump-version** — version-management R1
5. **不用 Remove-Item** — safety policy，用回收站 API

### 🛠 环境约束

- **代理** — git 走 `http://127.0.0.1:7897`（已设 `git config --global http.proxy`）
- **PowerShell 5.1 兼容** — 不用 PowerShell 7 特性
- **单 HTML 文件维护** — 不拆，按文件 > 800KB 时 gzip 后仍 < 200KB 评估

### ⚠️ agent-browser 已知问题

- e2e 60s timeout（Chrome 启动慢）— 跑测试时考虑 timeout=120s
- dashboard 端口 4848（agent-browser 自动启）

---

## 8. 下一步推荐（按优先级）

### P0 - 验证（用户必做）

- [ ] 真浏览器打开 <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html> 跑一遍功能
- [ ] 验证 mock 模式能收发数据
- [ ] 验证深色 / 浅色主题切换
- [ ] 验证协议编辑器能正常打开

### P0 - 实施 (设计已完成,代码未动)

**协议多命令 & 配置中心改造** — 设计阶段产物已就绪,代码层未动。详见:
- 设计交接: [`HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md`](HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md)
- 5 步 checklist: [`HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md`](HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md)
- 正式 spec: [`../superpowers/specs/2026-08-12-protocol-multi-command-design.md`](../superpowers/specs/2026-08-12-protocol-multi-command-design.md)

新会话直接照 5 步 checklist 走 (start → plan → 实施 → 验证 → 发布),预计 1 个 sprint (8h)。

### P1 - 充实（1 周内可选）

- [ ] 跑 `serialcube-e2e` 6 场景实测（agent-browser timeout=120s）
- [ ] 写 `docs/handover/release-v1.0.1.md`（如果验证出问题修了再发）
- [ ] 评估是否需要 `using-git-worktrees` skill

### P2 - 长期（按需）

- [ ] 实现 `protocol-copilot` skill（协议帧 AI 辅助解析）
- [ ] 实现 `release-management` skill（自动化 changelog 聚合）
- [ ] 加 LICENSE 文件
- [ ] 加 GitHub Issue / PR 模板

---

## 9. 链接索引

### 仓库内
- [根 README](../../README.md) — GitHub 首页文档
- [v1.0.0 发布说明](release-v1.0.0-2026-08-11.md) — 版本快照
- [AI 工作流主文档](../../.minimax/skills/README.md) — 11 阶段 SOP
- [实施计划存档](../superpowers/plans/) — 历史决策追溯

### 外部
- [GitHub 仓库](https://github.com/yubiediu826/SerialCubeWeb)
- [在线访问（GitHub Pages）](https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html)
- [agent-browser 项目](https://github.com/vercel-labs/agent-browser)
- [Web Serial API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)

### 相关 skill（项目级）
- ⑧ [serialcube-workflow](../../.minimax/skills/serialcube-workflow/SKILL.md) — 5 问决策树
- ⑨ [serialcube-e2e](../../.minimax/skills/serialcube-e2e/SKILL.md) — 6 场景端到端
- ⑩ [deploy-checklist](../../.minimax/skills/deploy-checklist/SKILL.md) — GitHub Pages 5 件事
- ⑪ [version-management](../../.minimax/skills/version-management/SKILL.md) — 3 条硬性规则

---

## 10. 交接检查清单

接手这个项目的 agent / 人，确认以下：

- [ ] 读完了本文件
- [ ] 读完了 `.minimax/skills/README.md` 主工作流文档
- [ ] 知道 4 条硬性规则（commit 中文 / push ask / VERSION 三处 / bump 前置）
- [ ] 知道 `bump-version.ps1` 在哪、怎么用
- [ ] 知道 `agent-browser` 怎么用（替换 in-app Browser）
- [ ] 知道 v1.0.0 是什么版本（在 release-v1.0.0-2026-08-11.md 看完整 release notes）
- [ ] 知道去哪里看历史计划（`docs/superpowers/plans/`）

**未完成的项目没在你列表里？** → 大概率在 P0/P1/P2 列表里，或者问用户。
