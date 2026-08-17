# SerialCube

> 单文件 Web 串口调试工具 — 面向 BMS / EMS / PCS 协议调试

**在线访问**: <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html>
**当前版本**: v1.3.13 (2026-08-17) · [更新日志](docs/CHANGELOG.md) · [GitHub](https://github.com/yubiediu826/SerialCubeWeb)

单 HTML 文件, 零安装、零后端、零依赖。Web Serial API 直连真实串口, 内置 mock 模式。**协议编辑器**支持 9 种帧 kind（含 Custom）+ 5 种 CRC 校验, 图形仪表盘 + 时间线系统 + 主题切换 + 告警面板一应俱全。

---

## 30 秒快速上手

| 我是 | 去看 |
|------|------|
| **只想用工具调试串口** | [在线版](https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html) → 开 mock 模式直接玩 |
| **GitHub 访客 / 评估项目** | [§ 能做什么](#能做什么) → [§ 快速开始](#快速开始) |
| **本机开发者 / 改代码** | [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md) |
| **AI Agent 接手** | [docs/handover/HANDOFF-QUICKSTART-2026-08-11.md](docs/handover/HANDOFF-QUICKSTART-2026-08-11.md) |
| **完整文档地图** | [docs/README.md](docs/README.md) |

---

## 能做什么

- 🔌 **串口监视** — Web Serial API 直连设备, mock 模式无硬件也能调试
- 📊 **图形解析** — 仪表盘 widget（大数字 + sparkline）+ 折线/柱状/面积/散点弹窗
- ⏱ **时间线系统** — 卡片式 + 全局范围选择 + 缩放工具栏
- 📤 **预设发送** — 3 种扩展: 自动触发 / 条件触发 / 预设组
- 🧩 **协议编辑器** — 9 种帧 kind（含 Custom）, 2 个内置协议模板, 5 种 CRC 校验
- 🔍 **解析协议** — 文本 / 十六进制双模式
- 🎨 **主题切换** — 浅色 / 深色 / 跟随系统
- 🔔 **告警** — toast 浮层 + 通知历史

---

## 快速开始

### 在线版（推荐）

直接打开: <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html>

> 浏览器必须是 **Chrome / Edge / Opera**（支持 Web Serial API 的 Chromium 内核）。
> 没有真串口？打开「Mock 模式」开关, 无硬件也能收发数据。

### 本地开发

```bash
git clone https://github.com/yubiediu826/SerialCubeWeb.git
cd SerialCubeWeb
# 直接双击 SerialCube.html 用浏览器打开
# 或: python -m http.server 8000  然后访问 http://localhost:8000
```

> 本地 `file://` 协议下 Web Serial API 仍可用（Chrome 允许）, 但用 HTTP 服务器跑更稳。

### 改代码 / 调试 / 部署

见 [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md)（含 6 问决策树、硬性规则、preflight / e2e / bump-version 工具用法）。

---

## 技术栈

- **前端**: 原生 HTML + CSS + JavaScript（无框架, 零依赖）
- **串口**: Web Serial API（Chromium only）
- **图表**: ECharts（CDN, 按需加载）
- **部署**: GitHub Pages + Actions

## 浏览器兼容

| 浏览器 | 支持 | 备注 |
|--------|------|------|
| Chrome / Edge / Opera | ✅ | Web Serial API 完整支持 |
| Safari / Firefox / 移动浏览器 | ❌ | 不支持 Web Serial |

---

## 文档

完整文档见 **[docs/README.md](docs/README.md)**（按角色 / 时间预算分层）。

| 你想了解 | 去看 |
|----------|------|
| 工具用途 / 功能 / 怎么用 | [docs/guides/USER-GUIDE.md](docs/guides/USER-GUIDE.md) |
| 改代码 / 调试 / 部署 SOP | [docs/guides/DEVELOPER-GUIDE.md](docs/guides/DEVELOPER-GUIDE.md) |
| AI Agent 接手标准动作 | [docs/guides/AGENT-START-HERE.md](docs/guides/AGENT-START-HERE.md) |
| 变更记录 | [docs/CHANGELOG.md](docs/CHANGELOG.md) |
| 项目状态 / 关键决策 | [docs/handover/PROJECT-HANDOVER-2026-08-11.md](docs/handover/PROJECT-HANDOVER-2026-08-11.md) |
| SerialCube.html 内部结构 | [docs/reference/ARCHITECTURE.md](docs/reference/ARCHITECTURE.md) |
| CRC / 协议模板速查 | [docs/reference/CRC-REFERENCE.md](docs/reference/CRC-REFERENCE.md) / [PROTOCOL-TEMPLATES.md](docs/reference/PROTOCOL-TEMPLATES.md) |
| 本地备份策略 | [docs/backup/BACKUP.md](docs/backup/BACKUP.md) |

---

## 贡献

1. Fork → 创建特性分支
2. commit message 用中文
3. 跑 `serialcube-e2e` 自动验证
4. 提 PR

## License

暂未指定（私有项目）。如需开源请提 Issue 讨论。
