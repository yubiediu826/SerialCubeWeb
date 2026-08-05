# SerialCube

> 浏览器内运行的串口协议调试工具 —— 单文件、零安装、专为嵌入式工程师打造。

[![Online](https://img.shields.io/badge/在线版-立即使用-5672cd)](https://yubiediu826.github.io/SerialCubeWeb/)
[![GitHub](https://img.shields.io/badge/GitHub-yubiediu826/SerialCubeWeb-3451b2)](https://github.com/yubiediu826/SerialCubeWeb)
![Version](https://img.shields.io/badge/version-v5.1.6-67676c)
![Browser](https://img.shields.io/badge/browser-Chromium-5672cd)
![License](https://img.shields.io/badge/license-MIT-3a5ccc)

[English](#english) · [中文](#中文)

---

## 中文

### 它是什么

SerialCube 是一个**单文件 HTML 串口调试工具**,直接跑在浏览器里,无需安装、无需驱动、无需后端。
打开 GitHub Pages 链接 → 接上串口设备 → 5 分钟内看到 TLV 字段值、波形、时序。

适用于 BMS / EMS / PCS 等嵌入式设备的串口协议调试,支持自定义 TLV 帧解析与
Modbus RTU/TCP 协议(SDK 路线中)。

### 核心特性

- 🌐 **Web Serial API** —— 免驱动,跨平台,任何 Chromium 浏览器
- 📦 **单文件可分发** —— `SerialCube.html` 双击即用,可下载离线版
- 🧩 **协议解析器** —— 自定义 token 模板,实时把字节流解析成结构化字段
- 📊 **仪表盘 widget** (v5.0+) —— Datadog/Grafana 风格,大数字 + 范围指示条
  + sparkline + 状态角标,响应式 4/6/8 列 (220×198 / 200×188 / 180×178)
- 🔍 **详情弹窗** (v5.1+) —— 图表(折线/柱状/面积/散点,滚轮缩放 + [−][+][↺]
  工具栏)+ 7 列日志表(#/时间/命令/字段/数值/单位/状态),全局时间范围
  (实时/1h/6h/24h) 联动图表/状态/日志
- 🎬 **时间线系统** —— 实时录制 / 冻结 / 回放,导入导出 `.timeline` `.csv` `.txt`
- ✉️ **四种发送模式** —— 手动 / 定时 / 触发 / 预设,ASCII 与 HEX 双格式
- 🌓 **浅深双主题** —— 自动跟随系统,也可手动切换 (v5.1.6 改实色背景)
- 🗜️ **紧凑模式** —— ≤720px 自动折叠为单列
- 🌏 **中英双语** —— 同步维护
- 🎨 **所有图标 SVG** —— 无字符图标(× − + ↺ ↻ ✓ 等),stroke 跟父元素颜色

### 快速开始

#### 方式 1: 在线使用 (推荐)

直接打开 → https://yubiediu826.github.io/SerialCubeWeb/

#### 方式 2: 离线使用

1. 打开在线版,点击右上角菜单 → **下载离线版到本地**
2. 双击 `SerialCube串口调试.html` 在浏览器中打开
3. 文件即可作为便携式工具随身携带,无网络依赖

#### 方式 3: Clone 仓库本地开发

```bash
git clone https://github.com/yubiediu826/SerialCubeWeb.git
cd SerialCubeWeb
# 直接用浏览器打开 SerialCube.html,无需 build
```

### 浏览器要求

- **支持**: Edge / Chrome / Brave / 任何 Chromium 内核浏览器 ≥ 90
- **不支持**: Firefox / Safari (Web Serial API 暂未提供)
- **HTTPS 要求**: 首次使用需 HTTPS 协议或 `localhost` / `file://`

### 功能模块

| 模块          | 说明                                                        |
| ------------- | ----------------------------------------------------------- |
| 设备连接      | Web Serial API,支持重连、失焦自动释放、信号脚 (CTS/DSR/DCD/RI) 监视 |
| 串口参数      | 波特率 / 数据位 / 停止位 / 校验 / 流控 / RTS / DTR / Break         |
| 接收监视      | 文本/HEX 双模式,时间戳,实时事件流                                 |
| 发送          | 手动 / 定时 / 条件触发 / 预设快捷键,ASCII/HEX 切换                  |
| 协议解析      | Token 模板 + 字段映射 + 实时结果                                  |
| 仪表盘 widget | 大数字 + 范围条 + sparkline + 状态角标 (v5.0+)              |
| 详情弹窗      | 图表(缩放/类型切换) + 7 列日志表,全局时间范围 (v5.1+)         |
| 时间线        | 实时录制 / 冻结 / 回放 / 导入导出                                  |
| 配置          | JSON 复制粘贴(SerialWebUserConfig v1)                            |
| 主题          | 浅色 / 深色 / 跟随系统 (v5.1.6 实色背景)                            |
| 响应式        | 三档断点(≥1180 / 1080-1179 / ≤720)                              |

### 路线图

按 `PRODUCT.md` §Capabilities 优先级:

1. **多串口并发** —— 同一会话同时连接多路串口,多设备协同调试
2. **现有功能打磨** —— 解析器 / 时间线 / 图表 / 预设发送深度优化
3. **Modbus RTU/TCP 协议 SDK** —— 把 TLV 模板扩展为标准工业协议库

### 文档

- [`PRODUCT.md`](./PRODUCT.md) —— 产品上下文(用户、定位、能力、约束)
- [`DESIGN.md`](./DESIGN.md) —— 视觉设计系统("The Engineer's Workbench"),
  含 YAML frontmatter 可机器读取
- [`docs/design-tokens.json`](./docs/design-tokens.json) —— 设计 tokens 完整
  机器可读层(色板 tonalRamp / 字号 / 阴影 / 动效 / 组件 CSS)
- [`docs/architecture.md`](./docs/architecture.md) —— 技术架构分析
  (单文件结构 / 状态 / 数据契约)
- [`AGENTS.md`](./AGENTS.md) —— AI agent 开发规范 + 兼容性约束

### 重要提示(兼容性契约)

升级版本前请确认以下字段**未被动过**,它们关系到你的历史数据:

- `localStorage` keys: `serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`
- 配置 JSON type 字符串: `SerialWebUserConfig` (v1)
- `.timeline` 二进制 magic: `WSLBIN1` (`0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00`)

详见 [`AGENTS.md` §2](./AGENTS.md) 与 [`docs/architecture.md` §6](./docs/architecture.md)。

### GitHub Pages 部署

仓库根目录已配好入口文件, 但 **Pages 需在 GitHub Settings 手动启用一次**,
启用后 `https://yubiediu826.github.io/SerialCubeWeb/` 才可访问。

**启用步骤** (Settings → Pages):
```
Source:    Deploy from a branch
Branch:    main
Folder:    / (root)
```

**根目录已就绪的入口文件**:
- `index.html` — meta refresh + JS redirect 到 `./SerialCube.html`
- `404.html` — 同上, 兜底旧链接 / 拼错路径
- `.nojekyll` — 跳过 Jekyll, 纯静态服务

**首次部署**: 保存后 1-2 分钟 (偶尔 5 分钟) 首次构建。
**离线使用不受影响**: 上述 3 个文件只服务在线入口, 离线版 `SerialCube串口调试.html` 仍单文件运行。

### 贡献

本项目是**团队内部工具**,欢迎团队成员提交 Issue 与 PR。
提交前请阅读 [`AGENTS.md`](./AGENTS.md) 了解开发规范。

### 许可证

[MIT](./LICENSE) © 2026 yubiediu826

---

## English

### What is it

**SerialCube** is a single-file HTML serial protocol debugger that runs in the
browser. No install, no driver, no backend. Open the GitHub Pages link → plug
in your device → see decoded TLV fields, waveforms, and timing within 5 minutes.

Designed for embedded engineers working on BMS / EMS / PCS and similar devices,
with first-class support for custom TLV frames and (in-progress) Modbus
RTU/TCP protocol SDK.

### Quick Start

**Online (recommended):** https://yubiediu826.github.io/SerialCubeWeb/

**Offline:** open the online version → top-right menu → "Download offline copy" → double-click the saved file.

**Local development:**
```bash
git clone https://github.com/yubiediu826/SerialCubeWeb.git
cd SerialCubeWeb
# Open SerialCube.html in your Chromium browser, no build step needed
```

### Browser Requirements

- **Supported:** Edge / Chrome / Brave / any Chromium-based browser ≥ 90
- **Not supported:** Firefox / Safari (Web Serial API not available)
- **HTTPS required** for first use, or `localhost` / `file://`

### GitHub Pages Deployment

The repo root has entry files ready, but **Pages needs to be enabled once in GitHub Settings**.

**Setup** (Settings → Pages):
```
Source:    Deploy from a branch
Branch:    main
Folder:    / (root)
```

**Files in root**: `index.html` (meta refresh + JS redirect to `./SerialCube.html`),
`404.html` (fallback for stale links), `.nojekyll` (skip Jekyll).

**First deploy**: 1-2 min after save (occasionally up to 5 min). Offline usage unaffected.

### Roadmap

1. Multi-port concurrent connection
2. Polish existing modules (parser / timeline / charts / preset send)
3. Modbus RTU/TCP protocol SDK

### Links

- [GitHub Repository](https://github.com/yubiediu826/SerialCubeWeb)
- [GitHub Pages (online)](https://yubiediu826.github.io/SerialCubeWeb/)
- [Issues](https://github.com/yubiediu826/SerialCubeWeb/issues)

### License

[MIT](./LICENSE) © 2026 yubiediu826
