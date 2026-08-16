# SerialCube v1.2.1 → 实施接力交接 — 未完成 + 进行中

> **用途:** v1.2.1 spec 已完成 (commit 386f189), 还没进 plan + 实施。这份文档专门记**还没做的事**和**实施 checklist**。
> **最后更新:** 2026-08-13
> **当前版本:** v1.2.0 (已发布到 remote main)
> **下一步版本:** v1.2.1 (小版本 hotfix, UI 一致性)
> **关联文档:** [`HANDOFF-V1.2.1-2026-08-13.md`](HANDOFF-V1.2.1-2026-08-13.md) (v1.2.1 完整交接 + 实施记录, 实施完成后回填)

---

## 🚀 TL;DR — 30 秒看完

**v1.2.1 spec 已完成（看 spec）:** 4 类 UI/UX 问题 6 个决策, A1/A2/B2/C3+/D1/D6, commit 386f189, preview HTML 自带主题切换可看

**还需要你做的事（5 步）:**
1. 📋 **写 plan** — 用 writing-plans skill 产出 `2026-08-13-v1.2.1-ui-consistency-plan.md`
2. 🔖 **bump version** — 1.2.0 → 1.2.1, 走 `bump-version.ps1`
3. 🔨 **改 SerialCube.html** — 4 modal 改 header / 协议编辑 4 段 / 合并 modal / 应用列 / 抽 renderFramePreview
4. 🧪 **e2e 测试 6 场景 (10-15)** + 主题适配测试
5. 📚 **文档同步 + push** — CHANGELOG / handoff / README, 走 R1/R4 硬性规则

**环境已就绪（无需再装）:**
- ✅ agent-browser (npm 全局, AGENT_BROWSER_EXECUTABLE_PATH 持久化到 user env, 跳过 install 用现成 Chrome)
- ✅ Chrome (C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe)
- ✅ pwsh 7.6.4 (msiexec 装好, gh-proxy.com 镜像, 非必需但已就绪)
- ✅ git config = Mavis @local (用户拍板保持)

**v1.3 backlog（不在 v1.2.1 范围）:** 真实模拟调试面板 / 三选项级联 modal / checkAlert 性能优化 / 自定义域名, 见 [`HANDOFF-PENDING-V1.3-2026-08-12.md`](HANDOFF-PENDING-V1.3-2026-08-12.md)

---

## ⏳ 进行中 (In-Flight) — 新会话开起来就要做的

### 1. 写实施 plan

| 状态 | 说明 |
|------|------|
| ⏳ 待开始 | 用 `skill({ name: "writing-plans" })` 进入 plan 模式, 模板套 v1.2 plan `2026-08-12-v1.2-config-center-refactor-plan.md` |
| 产出 | `docs/superpowers/plans/2026-08-13-v1.2.1-ui-consistency-plan.md` |
| 任务 | 把 spec 第 6 段"UI 改动清单" + 第 7 段"文件改动清单"展开成可执行 step-by-step |
| 时间 | 0.5-1 天 |

### 2. bump version

| 状态 | 说明 |
|------|------|
| ⏳ 待开始 | 改 SerialCube.html 之前必跑, R1 硬性规则 |
| 命令 | `powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/bump-version.ps1 -Level patch -Note 'v1.2.1 UI 一致性修复' -Type 修改` |
| 同步 | VERSION 常量 (SerialCube.html ~7900) + CHANGELOG.md 加 v1.2.1 段 + docs/CHANGELOG.md 子文件 |

### 3. 改 SerialCube.html（核心实施）

按 spec 第 7 段"文件改动清单"的 6 块顺序：

| # | 块 | 关键代码位置 | 工作量 |
|---|----|-------------|--------|
| 1 | 仪表盘协议条 + 删引导 + 加 ⚙ 设置值按钮 | SerialCube.html ~5300-5500 | 0.5h |
| 2 | 抽 `renderFramePreview(containerId, commandId)` 共享函数 | line 7848-7856 抽出来 | 1h |
| 3 | 改 4 个 modal 用 `.modal-header-standard`（X 右上 + title 左上 + 副标题/面包屑） | `openNewCommandModal` / `openAlertEdit` / 协议配置 modal / 协议编辑 modal | 2h |
| 4 | 重写 `dh-proto` modal 为 4 段（① 基础 / ② 帧预览 / ③ 帧字段 / ④ 命令列表） | dh-proto 渲染器 | 3h |
| 5 | 合并"选择协议 modal" → 协议配置 modal：删 `openSelectProtocolModal()` + 加"应用"列 + 删重复"新建协议"按钮 | line ~12800 + 配置中心 Tab 1 | 2h |
| 6 | 协议编辑 modal 加 ② 帧预览段（dropdown + 实时 buildFrame 调用） | dh-proto 内部 | 1h |

**总工作量**: 约 1-1.5 天（不熟悉 SerialCube.html 的人需要 +50% 时间）

**复用不改动**:
- `.frame-bytes .byte.{type}` CSS（line 6707-6722）
- `.frame-preview` CSS（line 6701-6729）
- `#dh-new-cmd-frame-preview` 渲染（line 7848-7856）— 仅抽函数调用

### 4. e2e 测试（agent-browser 6 场景）

| 场景 | 验证点 |
|------|--------|
| 10 仪表盘修复后 | ⚙ 设置值按钮 + 选择协议按钮 + 无引导按钮 + 未连接时底部无预览区 |
| 11 协议配置合并 + 应用列 | 顶部"选择协议"按钮 → 打开协议配置 modal；点 ○ 切 ●；仪表盘协议条同步 |
| 12 协议编辑 4 段 | 协议列表点"编辑" → 弹 4 段 modal；② 帧预览 dropdown 切换命令 → byte 实时变 |
| 13 modal header 一致性 | 4 个 modal X 在右上 + title 副标题位置一致 |
| 14 主题切换 | 浅色 + 深色 帧预览 .byte.data 微差"切开"感正确 |
| 15 "新建协议"按钮去重 | 协议配置 modal 内只有 1 个"新建协议"按钮（内容区右上） |

**环境已就绪**：agent-browser + 你的 Chrome 都装好, 不用再装

**测试命令模板**：
```bash
$env:AGENT_BROWSER_EXECUTABLE_PATH = 'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe'
agent-browser open 'file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html'
agent-browser snapshot 2>&1 | Select-Object -First 30
agent-browser click @eXX
agent-browser screenshot 'screenshots/v1.2.1-XX.png'
```

### 5. 文档同步 + push

| 文档 | 改动 |
|------|------|
| `docs/CHANGELOG.md` | 加 v1.2.1 段（bump-version.ps1 自动加） |
| `docs/changelog/2026-08-13-v1.2.1-ui-consistency.md` | 新建 changelog 子文件 |
| `docs/handover/HANDOFF-V1.2.1-2026-08-13.md` | 新建完整交接（实施时回填） |
| `docs/README.md` + `README.md` | 索引同步（如有新文档） |
| `docs/superpowers/plans/2026-08-13-v1.2.1-ui-consistency-plan.md` | plan 实施完成标 done |

**push 前必跑**（R4 + R4.2 硬性规则）：
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/check-readme-sync.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/check-cleanup.ps1
```

**commit author**: 保持 Mavis @local（用户拍板"继续使用 Mavis"），不重写历史

---

## 🎯 启动 Checklist（新会话开起来第一步）

```powershell
# 1. 拉最新
cd D:\WorkSpace\SerialCubeWeb
git pull origin main

# 2. 跑健康检查（验证 agent-browser + pwsh 都好）
agent-browser --version
& 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -Command '$PSVersionTable.PSVersion'

# 3. 跑文档同步检查
powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/check-readme-sync.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/check-cleanup.ps1

# 4. 看本次 spec + preview 状态
git log --oneline -3
# 应该看到: 386f189 docs(v1.2.1): UI 一致性修复 spec + 4-mockup preview
#          57ba22c docs(v1.3): 未完成 + 进行中接力交接
#          9ccf560 docs(v1.2): handoff 交接 + README/docs/CHANGELOG 索引同步

# 5. 看 spec 内容
notepad docs/superpowers/specs/2026-08-13-v1.2.1-ui-consistency-design.md

# 6. 看 preview（浏览器直接开）
start "" docs/design/v1.2.1-ui-consistency-preview.html

# 7. 写 plan
skill({ name: "writing-plans" })

# 8. bump version（改 SerialCube.html 前必跑）
powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/bump-version.ps1 `
  -Level patch `
  -Note 'v1.2.1 UI 一致性修复' `
  -Type 修改

# 9. 改 SerialCube.html（按 spec 第 7 段 6 块顺序）

# 10. 跑 e2e 测试（agent-browser 6 场景）

# 11. push 前再跑 R4 同步检查 + 问 user 确认 force-push
```

---

## 🛠️ 环境状态（已就绪）

| 工具 | 状态 | 说明 |
|------|------|------|
| agent-browser | ✅ npm 全局装好 | `npm install -g agent-browser` 已跑 |
| Chrome (现成) | ✅ | `C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe` |
| AGENT_BROWSER_EXECUTABLE_PATH | ✅ User env 持久化 | 跳过 `agent-browser install` 用现成 Chrome（Google CDN 国内不稳） |
| pwsh 7.6.4 | ✅ | `C:\Program Files\PowerShell\7\pwsh.exe` (gh-proxy.com 镜像装) |
| git config | ✅ Mavis @local | 用户拍板"继续使用 Mavis"，不重写历史 |
| GitHub remote | ✅ HTTPS | `https://github.com/yubiediu826/SerialCubeWeb.git` (凭证管理器 + 代理) |

---

## 📋 当前 main 状态

```
386f189 docs(v1.2.1): UI 一致性修复 spec + 4-mockup preview  ← 本次
57ba22c docs(v1.3): 未完成 + 进行中接力交接 (HANDOFF-PENDING-V1.3)
9ccf560 docs(v1.2): handoff 交接 + README/docs/CHANGELOG 索引同步
748bb97 test(v1.2): 3 个 e2e scenario (07-09 仪表盘/命令/告警)
... (v1.2 系列 14 commits)
4dcffbf docs: v1.2 配置中心重构 实施计划 (14 tasks)
```

**Remote:** `https://github.com/yubiediu826/SerialCubeWeb.git` (HTTPS, 凭证管理器工作)
**Branch:** `main` (HEAD = 386f189, 已 commit 未 push)
**未 push:** 386f189 (待 plan + 实施 + 测试后一并 push)

---

## 🔗 关联文档

- **v1.2.1 spec (主体):** [`../superpowers/specs/2026-08-13-v1.2.1-ui-consistency-design.md`](../superpowers/specs/2026-08-13-v1.2.1-ui-consistency-design.md)
- **v1.2.1 preview:** [`../design/v1.2.1-ui-consistency-preview.html`](../design/v1.2.1-ui-consistency-preview.html) (4 mockup + 主题切换)
- **v1.2 spec (前置):** [`../superpowers/specs/2026-08-12-v1.2-config-center-refactor-design.md`](../superpowers/specs/2026-08-12-v1.2-config-center-refactor-design.md)
- **v1.2 plan (模板):** [`../superpowers/plans/2026-08-12-v1.2-config-center-refactor-plan.md`](../superpowers/plans/2026-08-12-v1.2-config-center-refactor-plan.md)
- **v1.2 handoff (完整):** [`HANDOFF-V1.2-2026-08-12.md`](HANDOFF-V1.2-2026-08-12.md)
- **v1.3 backlog:** [`HANDOFF-PENDING-V1.3-2026-08-12.md`](HANDOFF-PENDING-V1.3-2026-08-12.md)
- **30 秒接手卡:** [`HANDOFF-QUICKSTART-2026-08-11.md`](HANDOFF-QUICKSTART-2026-08-11.md)
- **workflow skill:** [`.minimax/skills/serialcube-workflow/`](../../.minimax/skills/serialcube-workflow/)
- **e2e skill:** [`.minimax/skills/serialcube-e2e/`](../../.minimax/skills/serialcube-e2e/)
- **version-management skill:** [`.minimax/skills/version-management/`](../../.minimax/skills/version-management/)
- **brainstorming skill:** [`.minimax/skills/brainstorming/`](../../.minimax/skills/brainstorming/) (含 writing-plans 流程)
