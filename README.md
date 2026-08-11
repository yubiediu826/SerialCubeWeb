# SerialCube

> 单文件 Web 串口调试工具 — 面向 BMS / EMS / PCS 协议调试

**在线访问：** <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html>

单 HTML 文件，零安装、零后端、零依赖。Web Serial API 直连真实串口，内置 mock 模式，**协议编辑器**支持 TLV 帧结构 + 5 种 CRC 校验，图形仪表盘 + 时间线系统 + 双主题 + 告警面板一应俱全。

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
- 🧩 **协议编辑器** — TLV 帧结构，2 个内置协议模板（BMS TLV v1 / Modbus RTU），5 种 CRC 校验
- 🔍 **解析协议** — 文本 / 十六进制 双模式
- 🎨 **双主题** — 浅色 / 深色 / 跟随系统，modal / panel 统一实色
- 🔔 **告警** — toast 浮层 + 通知历史

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
| 每次开新窗口 5 步检查 | [docs/handover/SESSION-CHECKLIST-2026-08-11.md](docs/handover/SESSION-CHECKLIST-2026-08-11.md) |
| 完整文档地图（30s/2min/5min 分层） | [docs/README.md](docs/README.md) |
| 工具用途 / 功能 / 怎么用 | [docs/guides/USER-GUIDE.md](docs/guides/USER-GUIDE.md) |
| 改代码 / 调试 / 部署 SOP | [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md) |
| AI Agent 接手标准动作 | [docs/guides/AGENT-START-HERE.md](docs/guides/AGENT-START-HERE.md) |
| 项目当前状态 / 关键决策 | [docs/handover/PROJECT-HANDOVER-2026-08-11.md](docs/handover/PROJECT-HANDOVER-2026-08-11.md) |
| v1.0.0 发布说明 | [docs/handover/release-v1.0.0-2026-08-11.md](docs/handover/release-v1.0.0-2026-08-11.md) |
| 变更记录（主索引） | [docs/CHANGELOG.md](docs/CHANGELOG.md) |
| 每次 push 的子 changelog | [docs/changelog/](docs/changelog/README.md) |
| 本地备份策略 | [docs/backup/BACKUP.md](docs/backup/BACKUP.md) |
| SerialCube.html 内部结构 | [docs/reference/ARCHITECTURE.md](docs/reference/ARCHITECTURE.md) |
| 5 种 CRC 算法速查 | [docs/reference/CRC-REFERENCE.md](docs/reference/CRC-REFERENCE.md) |
| 协议模板速查 | [docs/reference/PROTOCOL-TEMPLATES.md](docs/reference/PROTOCOL-TEMPLATES.md) |
| 完整开发工作流 / skill 工具集 | [`.minimax/skills/README.md`](.minimax/skills/README.md) |
| 实施计划存档索引 | [docs/superpowers/README.md](docs/superpowers/README.md) |
| 历史实施计划 | [docs/superpowers/plans/](docs/superpowers/plans/) |

---

## 开发流程（5 问决策树）

任何改动前，先问自己：

1. 这是**创造性工作**（新功能 / 新组件 / 改行为）？→ 走 `brainstorming` 9 步清单
2. 改完了要**发版**？→ 走 `version-management` 3 条规则
3. 要**部署**到 GitHub Pages？→ 走 `deploy-checklist` 5 件事
4. 改完想**端到端验证**？→ 走 `serialcube-e2e` 6 场景
5. **其他情况**（小改 / 文档 / 配置）→ 直接动手

完整工作流见 [`.minimax/skills/README.md`](.minimax/skills/README.md)。

### 硬性规则（不可破）

- **Commit message 必须用中文**（项目级约定）
- **push 前必须确认**（`version-management` R2 规则，避免 force push 误操作）
- **VERSION 三处同步**：`SerialCube.html const VERSION` / HTML changelog 段 / Git tag
- **改 `SerialCube.html` 前先跑** `bump-version.ps1 -Level <patch|minor|major>`
- **每次 push 前必写 changelog 子文件**：`docs/changelog/YYYY-MM-DD-<topic>.md` + 更新主索引 [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
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
3. 跑 `serialcube-e2e` 6 场景验证
4. 提 PR

---

## License

暂未指定（私有项目）。如需开源请提 Issue 讨论。
