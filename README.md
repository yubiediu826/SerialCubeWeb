# SerialCube

> 浏览器内运行的串口协议调试工具 —— 单文件、零安装、专为嵌入式工程师打造。

[![Online](https://img.shields.io/badge/在线版-立即使用-5672cd)](https://yubiediu826.github.io/SerialCubeWeb/)
[![GitHub](https://img.shields.io/badge/GitHub-yubiediu826/SerialCubeWeb-3451b2)](https://github.com/yubiediu826/SerialCubeWeb)
![Version](https://img.shields.io/badge/version-v1.5-67676c)
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
- 📈 **三种图表** —— 时域图 / 频域图 / 柱状图,Canvas 2D 自绘
- 🎬 **时间线系统** —— 实时录制 / 冻结 / 回放,导入导出 `.timeline` `.csv` `.txt`
- ✉️ **四种发送模式** —— 手动 / 定时 / 触发 / 预设,ASCII 与 HEX 双格式
- 🌓 **浅深双主题** —— 自动跟随系统,也可手动切换
- 🗜️ **紧凑模式** —— ≤720px 自动折叠为单列
- 🌏 **中英双语** —— 同步维护

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
| 图表          | 时域图 / 频域图 / 柱状图                                           |
| 时间线        | 实时录制 / 冻结 / 回放 / 导入导出                                  |
| 配置          | JSON 复制粘贴(SerialWebUserConfig v1)                            |
| 主题          | 浅色 / 深色 / 跟随系统                                            |
| 响应式        | 三档断点(≥1180 / 1080-1179 / ≤720)                              |

### 路线图

按 `PRODUCT.md` §Capabilities 优先级:

1. **多串口并发** —— 同一会话同时连接多路串口,多设备协同调试
2. **现有功能打磨** —— 解析器 / 时间线 / 图表 / 预设发送深度优化
3. **Modbus RTU/TCP 协议 SDK** —— 把 TLV 模板扩展为标准工业协议库

### 文档

- [`PRODUCT.md`](./PRODUCT.md) —— 产品上下文(用户、定位、能力、约束)
- [`DESIGN.md`](./DESIGN.md) —— 视觉设计系统("The Engineer's Workbench")
- [`docs/architecture.md`](./docs/architecture.md) —— 技术架构分析(单文件结构 / 状态 / 数据契约)
- [`AGENTS.md`](./AGENTS.md) —— AI agent 强制 skill 链 + 兼容性约束
- [`.impeccable/design.json`](./.impeccable/design.json) —— 设计 tokens 机器可读层

### 重要提示(兼容性契约)

升级版本前请确认以下字段**未被动过**,它们关系到你的历史数据:

- `localStorage` keys: `serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`
- 配置 JSON type 字符串: `SerialWebUserConfig` (v1)
- `.timeline` 二进制 magic: `WSLBIN1` (`0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00`)

详见 [`AGENTS.md` §2](./AGENTS.md) 与 [`docs/architecture.md` §6](./docs/architecture.md)。

### 贡献

本项目是**团队内部工具**,欢迎团队成员提交 Issue 与 PR。
提交前请阅读 [`AGENTS.md`](./AGENTS.md) 了解开发规范与强制 skill 链。

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
