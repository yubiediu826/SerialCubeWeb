# SerialCube

> 单文件 Web 串口调试工具 — 面向 BMS / EMS / PCS 协议调试

**在线访问：** <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html>

单 HTML 文件，零安装、零后端、零依赖。Web Serial API 直连真实串口，内置 mock 模式，**协议编辑器**支持 9 种帧 kind（含 Custom）+ 5 种 CRC 校验，图形仪表盘 + 时间线系统 + 主题切换 + 告警面板一应俱全。

---

## 🚀 最新版本 v1.2.2 (2026-08-13)

**v1.2.1 后续 hotfix** — 修复 v1.2.1 部署后用户实测的 6 个 UI bug：① `dh-pair-trigger-modal` HTML 结构错位（v1.2.1 删 `openSelectProtocolModal()` 时漏 `</div>`）；② 协议条 5→3 元素（删未连接端口 + 默认隐藏"设置值"）；③ 系统菜单 主题/配置 风格统一；④ 主题 segmented active 强化（修 `--bg-elev` 未定义 + accent 蓝紫背景）；⑤ 选择协议按钮修复 + 占位区填满 + 引导入口挪到 modal；⑥ **本次 3 bug** — 新建卡片弹窗样式错乱（append 到 body 拿不到 `.dashboard-host .modal` 样式 + label/select 错位改 label-above-input 模式）/ 配置中心 tab bar 断层（`.cc-tab-pane` padding 20px→14px）/ **消息提示弹窗被虚化挡住**（`toast-layer` z-index 200 < modal backdrop 1000+，backdrop-filter 把 toast 虚化 → 200→2000）。配套 B+C 工作流改造（serialcube-workflow + ui-ux-pro-max）+ A 新建 serialcube-modal-review 6 步 guard。

详细：[`docs/changelog/2026-08-13-v1.2.2-ui-cleanup.md`](docs/changelog/2026-08-13-v1.2.2-ui-cleanup.md)

---

## 📌 v1.2.1 (2026-08-13)

**UI 一致性修复** — 一次性解决 v1.2.0 部署后用户实测反馈的 8 个 UI/UX 问题。4 个 modal header 统一用 `.modal-header-standard`（X 右上 + title 左上 + 副标题/面包屑）；协议编辑 modal 重构为 1 步长表单 4 段（基础 / 帧预览 / 帧字段 / 命令列表）；"选择协议 modal"合并到协议配置 modal（行内"应用"列切换 active）；仪表盘协议条"引导"按钮删除 + 底部"设置值/字节预览"挪到 modal；抽 `renderFramePreview()` 共享函数复用帧预览实现。

| 改动 | 说明 |
|------|------|
| 4 modal header 统一 | `.modal-header-standard` 组件，X 右上 + title 左上 + 副标题/面包屑（协议配置/协议编辑/命令编辑/告警编辑） |
| 协议编辑 4 段重构 | ① 基础 / ② 帧预览（dropdown 切换命令实时刷新）/ ③ 帧字段 / ④ 命令列表 |
| 选协议 modal 合并 | 协议列表行内"应用"列（●/○ 切换 active），删 `openSelectProtocolModal()` |
| 仪表盘改 | 删"引导"按钮 + 加"⚙ 设置值"按钮（已连接 + 已选协议时可用）+ 底部预览区挪到 modal |
| 新建协议按钮去重 | 协议配置 modal 只剩 1 个"新建协议"按钮（内容区右上） |
| 抽共享函数 | `NS.renderFramePreview(containerId, commandId)` 命令编辑 + 协议编辑 + 仪表盘设置值 3 处复用 |
| 帧预览主题适配 | `.byte.data` 用 `var(--bg)` 而非 `var(--bg-terminal)`，浅色 + 深色都保持微差"切开"感 |

详细：[`docs/changelog/2026-08-13-v1.2.1-ui-consistency.md`](docs/changelog/2026-08-13-v1.2.1-ui-consistency.md) · [`docs/handover/HANDOFF-V1.2.1-2026-08-13.md`](docs/handover/HANDOFF-V1.2.1-2026-08-13.md) · [`docs/design/v1.2.1-ui-consistency-preview.html`](docs/design/v1.2.1-ui-consistency-preview.html)

---

## 📌 v1.2.0 (2026-08-12)

**配置中心重构** — 一次性解决 5 个 UI/逻辑自洽性问题。仪表盘改为单协议聚焦（串口 1 对 1 物理事实），连接时弹选择协议 modal；命令编辑支持新建/编辑/复制三模式；告警从派生改为独立规则（NS.ALERTS）；调试面板占位为 v1.3 真实模拟预留。

| 改动 | 说明 |
|------|------|
| 仪表盘单协议聚焦 | 未连接显示占位 + DB9 串口图标；已连接只显示当前协议卡片 |
| 4 tab 表格化 | 协议/命令/卡片/告警全部改为表格 + 行内操作（编辑/复制/删除） |
| 命令三模式 | `openNewCommandModal(protocolId, editCmd?)` 复用 modal，加帧预览 + 批量默认值 |
| 告警独立规则 | NS.ALERTS 数组，严重度 info/warn/danger 三档，通知方式 toast/sound(v1.3)/list |
| 调试面板占位 | 仪表盘右下角 ⚙ 折叠按钮，v1.3 真实模拟（BroadcastChannel + Mutator）入口 |

详细：[`docs/changelog/2026-08-12-v1.2.0-config-center-refactor.md`](docs/changelog/2026-08-12-v1.2.0-config-center-refactor.md) · [`docs/handover/HANDOFF-V1.2-2026-08-12.md`](docs/handover/HANDOFF-V1.2-2026-08-12.md)

---

## 📌 v1.1.1 (2026-08-12)

4 个用户反馈修复 — 主题切换入口迁到主系统菜单、配置中心改名为协议配置、编辑模式视觉强化、Modal stack 嵌套修复。

| 修复 | 说明 |
|------|------|
| 主题 segmented 进 system-menu | topbar 右上角 3 横线菜单加浅/深/跟随 3 档切换，0 行业务逻辑新增 |
| "配置中心" → "协议配置" | 用户指定改名，副标题简化，头部"开始引导"按钮改"新建协议" |
| 编辑模式 + 卡片角标 | active 态加 `!important` + 绿点，文字态切换；卡片 action 16→20px + hover 强化 |
| Modal stack 嵌套 | `NS._modalStack` 栈式叠加，协议配置 4 处 closeModal 删除，Esc 键只关栈顶 |

详细：[`docs/changelog/2026-08-12-v1.1.1-fixes.md`](docs/changelog/2026-08-12-v1.1.1-fixes.md) · [`docs/handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md`](docs/handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md)

---

## 30 秒快速上手

| 我是 | 去看 |
|------|------|
| **只想用工具调试串口** | <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html> → 开 mock 模式直接玩 |
| **GitHub 访客 / 评估项目** | [§ 功能列表](#能做什么) → [§ 快速开始](#快速开始) → [§ 技术栈](#技术栈) |
| **本机开发者 / 改代码** | [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md) |
| **AI Agent 接手** | [docs/handover/HANDOFF-QUICKSTART-2026-08-11.md](docs/handover/HANDOFF-QUICKSTART-2026-08-11.md) |
| **想了解工具的每个功能怎么用** | [docs/guides/USER-GUIDE.md](docs/guides/USER-GUIDE.md) |
| **想看完整文档导航** | [docs/README.md](docs/README.md) |

---

## 能做什么

- 🔌 **串口监视** — Web Serial API 直连设备，mock 模式无硬件也能调试
- 📊 **图形解析** — 仪表盘 widget（大数字 + sparkline + 状态角标）+ 折线/柱状/面积/散点弹窗
- ⏱ **时间线系统** — 卡片式 + 全局范围选择 + 缩放工具栏
- 📤 **预设发送** — 3 种扩展：自动触发 / 条件触发 / 预设组
- 🧩 **协议编辑器** — 9 种帧 kind（含 Custom），2 个内置协议模板（BMS TLV v1 / Modbus RTU），5 种 CRC 校验
- 🔍 **解析协议** — 文本 / 十六进制 双模式
- 🎨 **主题切换** — 浅色 / 深色 / 跟随系统（v1.1.1 入口在系统菜单 segmented）
- 🔔 **告警** — toast 浮层 + 通知历史

---

## 🛠 开发工具（v1.1.1 新增）

| 工具 | 路径 | 作用 |
|------|------|------|
| **preflight.ps1** | `.minimax/skills/serialcube-workflow/preflight.ps1` | 改 SerialCube.html 前必跑 — 9 项健康检查（agent-browser / git / PS 5.1 陷阱 / 代理端口） |
| **select-scenarios.ps1** | `.minimax/skills/serialcube-e2e/scripts/select-scenarios.ps1` | 按改动文件自动选要跑的 e2e 场景（6 场景不每次全跑） |
| **subagent 4 段 report** | `.minimax/skills/serialcube-workflow/references/subagent-template.md` | subagent 必须输出 REPORT-CHANGED/VERIFIED/NEXT/HEARTBEAT 4 段，防 aborted 失联 |
| **bump-version.ps1** | `.minimax/skills/version-management/scripts/bump-version.ps1` | 自动同步 VERSION + changelog 段（修改 SerialCube.html 前必跑） |

跑 preflight：

```powershell
pwsh -File .minimax/skills/serialcube-workflow/preflight.ps1
```

---

## 快速开始

### 用在线版（推荐）

直接打开：<https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html>

> 浏览器必须是 **Chrome / Edge / Opera**（支持 Web Serial API 的 Chromium 内核），HTTPS 环境。
> 没有真串口？打开「Mock 模式」开关，无硬件也能收发数据。

### 本地开发

```bash
git clone https://github.com/yubiediu826/SerialCubeWeb.git
cd SerialCubeWeb
# 直接双击 SerialCube.html 用浏览器打开
# 或: python -m http.server 8000  然后访问 http://localhost:8000
```

> 本地 `file://` 协议下 Web Serial API 仍可用（Chrome 允许），但用 HTTP 服务器跑更稳。

### 改代码 / 调试 / 部署

见 [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md)。

---

## 文档导航

| 你想了解 | 去看哪里 |
|----------|----------|
| 30 秒快速接手（agent 必看） | [docs/handover/HANDOFF-QUICKSTART-2026-08-11.md](docs/handover/HANDOFF-QUICKSTART-2026-08-11.md) |
| 完整文档地图（30s/2min/5min 分层） | [docs/README.md](docs/README.md) |
| 工具用途 / 功能 / 怎么用 | [docs/guides/USER-GUIDE.md](docs/guides/USER-GUIDE.md) |
| 改代码 / 调试 / 部署 SOP | [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md) |
| AI Agent 接手标准动作 | [docs/guides/AGENT-START-HERE.md](docs/guides/AGENT-START-HERE.md) |
| 项目当前状态 / 关键决策 | [docs/handover/PROJECT-HANDOVER-2026-08-11.md](docs/handover/PROJECT-HANDOVER-2026-08-11.md) |
| v1.2.1 UI 一致性修复交接 | [docs/handover/HANDOFF-V1.2.1-2026-08-13.md](docs/handover/HANDOFF-V1.2.1-2026-08-13.md) |
| v1.2 配置中心重构交接 | [docs/handover/HANDOFF-V1.2-2026-08-12.md](docs/handover/HANDOFF-V1.2-2026-08-12.md) |
| v1.1.1 修复交接 | [docs/handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md](docs/handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md) |
| v1.1.0 协议多命令交接 | [docs/handover/HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md](docs/handover/HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md) |
| v1.1.0 release notes | [docs/handover/release-v1.1.0-2026-08-12.md](docs/handover/release-v1.1.0-2026-08-12.md) |
| v1.0.0 release notes | [docs/handover/release-v1.0.0-2026-08-11.md](docs/handover/release-v1.0.0-2026-08-11.md) |
| v1.1.1 changelog | [docs/changelog/2026-08-12-v1.1.1-fixes.md](docs/changelog/2026-08-12-v1.1.1-fixes.md) |
| 变更记录（主索引） | [docs/CHANGELOG.md](docs/CHANGELOG.md) |
| 每次 push 的子 changelog | [docs/changelog/](docs/changelog/README.md) |
| 本地备份策略 | [docs/backup/BACKUP.md](docs/backup/BACKUP.md) |
| SerialCube.html 内部结构 | [docs/reference/ARCHITECTURE.md](docs/reference/ARCHITECTURE.md) |
| 5 种 CRC 算法速查 | [docs/reference/CRC-REFERENCE.md](docs/reference/CRC-REFERENCE.md) |
| 协议模板速查 | [docs/reference/PROTOCOL-TEMPLATES.md](docs/reference/PROTOCOL-TEMPLATES.md) |
| 完整开发工作流 / skill 工具集 | [`.minimax/skills/README.md`](.minimax/skills/README.md) |

---

## 开发流程（6 问决策树）

任何改动前，先问自己：

1. 跑 **preflight**？→ `pwsh -File .minimax/skills/serialcube-workflow/preflight.ps1`（9 项健康检查）
2. 这是**创造性工作**（新功能 / 新组件 / 改行为）？→ 走 `brainstorming` 9 步清单
3. 改完了要**发版**？→ 走 `version-management` 3 条规则（必跑 `bump-version.ps1`）
4. 要**部署**到 GitHub Pages？→ 走 `deploy-checklist` 5 件事
5. 改完想**端到端验证**？→ 走 `serialcube-e2e` + `select-scenarios` 自动选场景
6. **其他情况**（小改 / 文档 / 配置）→ 直接动手

完整工作流见 [`.minimax/skills/README.md`](.minimax/skills/README.md)。

### 硬性规则（不可破）

- **Commit message 必须用中文**（项目级约定，用 `git commit -F <file>` 避免 PS 引号问题）
- **push 前必须 `ask_user` 确认**（避免 force push 误操作）
- **VERSION 三处同步**：`SerialCube.html const VERSION` / HTML changelog 段 / Git tag
- **改 `SerialCube.html` 前先跑** `bump-version.ps1 -Level <patch|minor|major>`
- **每次 push 前必写 changelog 子文件**：`docs/changelog/YYYY-MM-DD-<topic>.md` + 更新主索引 [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- **版本变更后必更新根 README + docs/README**（防止文档断档，工作流自动 check）
- **更新完必跑 link check + 同步关联文档**（见 [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md) § 13 自检脚本）

---

## 技术栈

- **前端**：原生 HTML + CSS + JavaScript（无框架，零依赖）
- **串口**：Web Serial API（Chromium only）
- **图表**：ECharts（CDN，按需加载）
- **部署**：GitHub Pages + Actions (`actions/deploy-pages@v4`)

---

## 浏览器兼容

| 浏览器 | 支持 | 备注 |
|--------|------|------|
| Chrome / Edge / Opera | ✅ | Web Serial API 完整支持 |
| Safari | ❌ | 不支持 Web Serial |
| Firefox | ❌ | 不支持 Web Serial |
| 移动浏览器 | ❌ | Web Serial 不可用 |

---

## 贡献

1. Fork → 创建特性分支（`git checkout -b feat/xxx`）
2. 改代码，**commit message 用中文**
3. 跑 `serialcube-e2e` + `select-scenarios` 自动验证
4. 提 PR

---

## License

暂未指定（私有项目）。如需开源请提 Issue 讨论。
