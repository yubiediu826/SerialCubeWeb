# SerialCube.html 内部结构

> **单文件应用架构速查** — SerialCube.html 21,168 行 / 942KB,按章节划分。
> 所有 JS 都在全局命名空间 `NS = window.NS || {}` 下,所有 CSS 在 `<style>` 里,所有 HTML 在 `<body>` 里。

---

## 1. 文件总览

| 段 | 行号范围 | 内容 |
|----|----------|------|
| HTML head | 1-7083 | meta / favicon / 主题初始化脚本 / 全部 `<style>` CSS |
| `<body>` 起始 | 7084 | |
| 顶部导航 + 模式切换 | ~7100-7300 | logo / 监视·解析·仪表盘 / 主题切换 / 帮助 |
| 侧边栏（设备连接） | ~7300-8000 | 端口选择 / 波特率 / 连接按钮 / Mock 开关 |
| 主工作区（监视/解析/仪表盘） | ~8000-8100 | 模式切换容器 |
| 底部（发送区） | ~8100-8500 | 字节预览 / 发送输入 / 自动·条件·预设发送 |
| JS 启动（state + refs） | ~8200-8800 | `const refs = {...}` / `const state = {...}` |
| 数据模型 | ~9923-10050 | NS._defaultProtocols / DATA_FIELDS / COMMANDS / CARDS |
| 协议层算法 | 11310-11470 | CRC / encodeDataFields / computeDataSize / crcRange / encodeCrcBytes |
| buildFrame 系列 | 11473-11717 | _buildFrameFixedHeader + 7 kind + dispatcher |
| UI 渲染 (modals) | 12094-12673 | 协议编辑器 / 命令管理 / 卡片配置 / 导入导出 / 告警 / Toast / Modal 控制 |
| 串口通信 | 14288-14580 | connectSerial / disconnectSerial / readLoop |
| 状态持久化 | 19202-19400 | readLocalPrefs / saveLocalPrefs / 偏好合并 |
| `</body>` | 21166 | |
| 关闭标签 | 21167-21168 | `</html>` |

---

## 2. 关键章节行号速查

### 2.1 入口 / 配置

| 内容 | 行号 | 说明 |
|------|------|------|
| `<title>` | 4 | 页面标题 |
| `const VERSION` | ~50 | **改这里同步 VERSION 三处之一** |
| `LOCAL_PREFS_KEY` | ~13 | localStorage key,默认 `serialweb:prefs` |
| `<body>` 起始 | 7084 | |
| 主题切换按钮 | ~7170 | 浅 / 深 / 系统 |
| 模式切换 (logo-mode-switch) | ~7180 | 监视 / 解析 / 仪表盘 |
| 版本 changelog 弹窗 HTML | ~8042 | `<div class="version-changelog">` |

### 2.2 DOM refs 收集

| 内容 | 行号 |
|------|------|
| `const refs = {...}` 起始 | ~8220 |
| 自动/条件/预设发送 refs | 8220-8235 |
| 状态 | 8251 `const state = {...}` |
| 完整 refs 收尾 | ~8800 |

### 2.3 数据模型

| 内容 | 行号 | 关键对象 |
|------|------|----------|
| 协议模板 | 9923 | `NS._defaultProtocols` → `NS.PROTOCOLS` |
| 字段类型映射 | ~9980 | `NS._FIELD_BYTE_SIZE = { u8:1, u16:2, ... }` |
| 数据字段 | ~9989 | `NS.DATA_FIELDS` (11 个 cell_*, pack_*, *_set) |
| 命令定义 | ~10020 | `NS._defaultCommands` → `NS.COMMANDS` (8 个) |
| 仪表盘卡片 | ~10043 | `NS.CARDS` (10 张) |
| Mock 数据初始化 | ~10043 | `NS.initMockData` |
| Mock 模式调用 | 11279 | 启动时调 |

### 2.4 协议层算法

| 内容 | 行号 | 关键函数 |
|------|------|----------|
| CRC 算法块 | 11310 | `// --- CRC 算法 ---` |
| `crc16Modbus` | 11311 | poly=0xA001 init=0xFFFF MSB-first |
| `crc16Ccitt` | 11319 | poly=0x1021 init=0xFFFF MSB-first |
| `crc8` | 11327 | poly=0x07 init=0x00 |
| `crcChecksum` | 11336 | 字节累加 & 0xFF |
| `crcXor` | 11336 | 字节异或 |
| `computeCrc` dispatcher | 11338 | switch(type) |
| `crcByteSize` | 11349 | crc16-* → 2, 其他 → 1 |
| `crcTypeLabel` / `crcRangeLabel` | 11352-11357 | UI 标签 |
| `parseHexOr0` | 11358 | hex/decimal 解析 |
| `escapeHtml` | 11366 | XSS 防护 |
| `encodeDataFields` | 11371 | cmd + protocol → bytes |
| `computeDataSize` | ~11410 | 按 cmd.dataFields 算字节数 |
| `crcRangeSections` | 11415-11458 | 按 crcRange 切 CRC 输入 |
| `encodeCrcBytes` | 11459-11472 | CRC 值 → bytes (LE/BE) |

### 2.5 buildFrame 系列

| 内容 | 行号 | 说明 |
|------|------|------|
| `_buildFrameFixedHeader` | 11474 | **kind 0** (legacy,跟旧 buildFrame 100% 行为一致) |
| `buildFrame` dispatcher | 11518 | switch(kind) 路由到 8 种实现 |
| `_buildFrameRaw` | 11542 | kind 1 |
| `_buildFrameCmdSplit` | 11563 | kind 2 |
| `_buildFrameAddrSplit` | 11586 | kind 3 |
| `_buildFrameCtrlBit7` | 11613 | kind 4 |
| `_buildFrameTypeHighBit` | 11638 | kind 5 |
| `_buildFrameMsgidMixed` | 11663 | kind 6 |
| `_buildFrameTlv` | 11690 | kind 7 |

### 2.6 UI 渲染（modals）

| Modal | 行号 | 功能 |
|-------|------|------|
| **协议编辑器** | 12094 | `// --- 协议编辑器 (proto modal) ---` |
| **命令管理** | 12348 | `// --- 命令管理 (cmd-config modal) ---` |
| **卡片配置** | 12425 | `// --- 卡片配置 (card-config + card-edit modals) ---` |
| **导入导出** | 12511 | `// --- 导入导出 (ie modal) ---` |
| **告警配置** | 12557 | `// --- 告警配置 (alerts modal) ---` |
| **Toast 通知** | 12576 | `// --- Toast 通知 ---` |
| **Modal 控制** | 12643 | `// --- Modal 控制 ---` |
| **挂载 handlers** | 12673 | `// --- 挂载 modal toolbar 按钮 + 内部按钮 handlers ---` |

### 2.7 串口通信

| 函数 | 行号 | 用途 |
|------|------|------|
| `connectSerial` | 14288 | 连接串口（Web Serial API / Mock） |
| `disconnectSerial` | 14426 | 断开 |
| `disconnectForBlurRelease` | 14530 | 窗口失焦时断开 |
| `readLoop` | 14538 | 接收循环 |
| `readBinaryValue` | 15810 | 二进制值解析 |

### 2.8 预设发送（自动 / 条件 / 组）

| 模块 | 行号 |
|------|------|
| refs 定义 | 8220-8235 |
| state 定义 | 8386-8405 |
| 渲染函数 | 16656-16750 |
| runtime sync | 17353-17410 |
| 事件 handlers | 20959-21020 |
| 初始默认值 | 21087-21095 |

### 2.9 状态持久化

| 函数 | 行号 |
|------|------|
| `readLocalPrefs` | 19202 |
| `readUserConfigFromPayload` | 19372 |
| `saveLocalPrefs` | ~19420 |

localStorage key: `serialweb:prefs` (主体),`serialweb:version-modal-seen` (版本弹窗)

---

## 3. 全局命名空间 NS

```js
NS = window.NS || {}
```

### 3.1 数据（NS.* 顶层）

| 名称 | 类型 | 用途 |
|------|------|------|
| `NS.VERSION` | string | 版本号 (与 SerialCube.html const VERSION 同步) |
| `NS.PROTOCOLS` | array | 协议模板列表 (默认 = _defaultProtocols()) |
| `NS.DATA_FIELDS` | array | 11 个数据字段定义 |
| `NS.COMMANDS` | array | 8 个命令定义 |
| `NS.CARDS` | array | 10 张仪表盘卡片 |
| `NS.currentVals` | object | 当前数据值 (按字段名) |
| `NS.rxHistory` | array | 接收历史 (时间线) |
| `NS.detailLogs` | object | 卡片详情日志 (按 cmd id) |
| `NS.alertHistory` | array | 告警历史 |

### 3.2 函数（NS.* 函数）

| 名称 | 用途 |
|------|------|
| `NS.crc16Modbus(bytes)` | CRC-16 MODBUS |
| `NS.crc16Ccitt(bytes, init)` | CRC-16 CCITT |
| `NS.crc8(bytes, init, poly)` | CRC-8 |
| `NS.crcChecksum(bytes)` | Checksum |
| `NS.crcXor(bytes)` | XOR |
| `NS.computeCrc(type, bytes, init)` | CRC dispatcher |
| `NS.crcByteSize(type)` | CRC 输出字节数 |
| `NS.parseHexOr0(s)` | hex/decimal 解析 |
| `NS.escapeHtml(s)` | XSS 防护 |
| `NS.encodeDataFields(cmd, protocol)` | dataFields → bytes |
| `NS.computeDataSize(cmd)` | 算 cmd 总字节数 |
| `NS.crcRangeSections(protocol, allBytes)` | CRC 输入范围 |
| `NS.encodeCrcBytes(crc, size, endian)` | CRC 值 → bytes |
| `NS.buildFrame(protocol, cmd)` | 构造完整帧 (dispatcher) |
| `NS._buildFrameFixedHeader(protocol, cmd)` | kind 0 |
| `NS._buildFrameRaw(protocol, cmd)` | kind 1 |
| `NS._buildFrameCmdSplit(protocol, cmd)` | kind 2 |
| `NS._buildFrameAddrSplit(protocol, cmd)` | kind 3 |
| `NS._buildFrameCtrlBit7(protocol, cmd)` | kind 4 |
| `NS._buildFrameTypeHighBit(protocol, cmd)` | kind 5 |
| `NS._buildFrameMsgidMixed(protocol, cmd)` | kind 6 |
| `NS._buildFrameTlv(protocol, cmd)` | kind 7 |
| `NS.initMockData()` | Mock 模式初始数据 |
| `NS.connectSerial(...)` | 连接串口 |
| `NS.disconnectSerial(...)` | 断开 |
| `NS.readLoop()` | 接收循环 |
| `NS.readBinaryValue(view, offset, type)` | 二进制值解析 |

### 3.3 内部 helpers (function declarations)

非 NS 命名空间,但在全局 scope,可在 console 用:

| 名称 | 用途 |
|------|------|
| `connectSerial` / `disconnectSerial` / `readLoop` | 同 NS.* |
| `renderAutoSendQueue` | 渲染自动发送队列 |
| `renderConditionSendList` | 渲染条件触发规则 |
| `renderPresetSendList` | 渲染预设组 |
| `syncAutoSendRuntime` | 同步自动发送运行时状态 |
| `startAutoSendTimer` / `stopAutoSendTimer` | 启停定时器 |
| `readLocalPrefs` / `saveLocalPrefs` | 持久化 |
| `renderFramePreview` | 字节预览 |
| `renderFieldList` | 字段列表 (协议编辑器) |

---

## 4. state / refs 结构

### 4.1 state (应用状态,行 8251 起)

```js
state = {
  serial: { connected, port, reader, writer, ... },
  parser: { mode: 'text' | 'hex', protocol, ... },
  modules: { autoSendOpen, conditionSendOpen, presetSendOpen },
  autoSend: { enabled, intervalMs, queue: [...] },
  conditionSend: { enabled, rules: [...] },
  presetSend: { enabled, items: [...], pendingExpectations: [...] },
  // ... 仪表盘 / 主题 / UI 状态
}
```

### 4.2 refs (DOM 引用,行 8220 起)

```js
refs = {
  // 设备连接
  serialStatusText, portSelect, baudSelect, connectBtn, mockToggle,
  // 模式切换
  dashboardModeBtn, monitorModeBtn, parseModeBtn,
  // 自动/条件/预设发送
  autoSendTile, autoSendModule, autoSendSwitch, autoSendQueue, autoSendInterval,
  conditionSendTile, conditionSendModule, conditionSendSwitch, conditionSendList,
  presetSendTile, presetSendModule, presetSendSwitch, presetSendList,
  // modals
  protoModal, cmdConfigModal, cardConfigModal, ieModal, alertsModal,
  // 仪表盘
  cardGridArea, dashboardHost,
  // 主题
  themeToggleBtn,
  // 通知
  notificationBtn, notificationList,
  // ... 100+ refs
}
```

---

## 5. 主题 / 模式 class

### 5.1 body 上的 class

| Class | 含义 |
|-------|------|
| `theme-dark` | 深色主题 |
| `theme-light` | 浅色主题 |
| `compact-single` | 窗口 ≤ 720px 紧凑模式 |
| `layout-expanded` | 布局已展开 |
| `sidebar-collapsed` | 侧边栏已折叠 |
| `parser-results-expanded` | 解析结果区展开 |
| `send-extension-restoring` | 发送扩展正在恢复 |
| `send-auto-restoring` | 自动发送恢复中 |
| `send-condition-restoring` | 条件触发恢复中 |
| `send-preset-restoring` | 预设组恢复中 |
| `runtime-local` | file:// / localhost / 127.0.0.1 |
| `mode-dashboard` | 仪表盘模式 (vs mode-monitor / mode-parse) |

### 5.2 CSS 变量（`body.theme-dark` / `body.theme-light` / `:root`）

主要 token:

- `--text` / `--text-soft` / `--text-strong` — 文字色阶
- `--bg` / `--bg-elev` / `--bg-overlay` — 背景色阶
- `--border` / `--border-strong` — 边框
- `--accent` / `--accent-soft` — 主色
- `--success` / `--warn` / `--error` — 状态色
- `--shadow` — 阴影

详见 `body.theme-dark` 块（约 L300-500）。

---

## 6. 数据流（一次完整收发）

```
用户输入发送 payload
  ↓
send input → updateAutoSendSettings / manual send
  ↓
NS.buildFrame(protocol, cmd)  ← 走 8 种 _buildFrame* 之一
  ↓
writer.write(frame)  ← Web Serial API / Mock loopback
  ↓
设备响应 → reader.read()  → readLoop
  ↓
NS.parseFrame(bytes)  ← 按 protocol 解析
  ↓
NS.rxHistory.push({ts, bytes, parsed})
  ↓
NS.currentVals[field] = value
  ↓
renderTimeLine / renderCard / renderAutoSendChart 触发
  ↓
ECharts 增量更新
```

---

## 7. 启动顺序（init）

```
1. HTML head 解析 → 主题初始化脚本（IIFE 立即执行,读 localStorage）
2. <body> 渲染
3. <script> 加载:
   a. const state = {...}  ← 默认状态
   b. const refs = {...}  ← 收集所有 DOM 引用
   c. NS._defaultProtocols / _defaultCommands / _defaultCards  ← 数据模型
   d. NS.crc* / NS.buildFrame*  ← 算法
   e. event handlers 挂载
   f. readLocalPrefs()  ← 从 localStorage 恢复用户偏好
   g. NS.initMockData()  ← Mock 模式默认数据
   h. UI 首次渲染
```

---

## 8. 找代码的快速命令

```powershell
# 找 CRC
Select-String -Path 'SerialCube.html' -Pattern 'crc16Modbus|crc16Ccitt|crc8|crcChecksum|crcXor|computeCrc'

# 找 buildFrame
Select-String -Path 'SerialCube.html' -Pattern '_buildFrame\w*'

# 找数据模型
Select-String -Path 'SerialCube.html' -Pattern 'NS\._defaultProtocols|NS\._defaultCommands|NS\.DATA_FIELDS|NS\.CARDS'

# 找连接/收发
Select-String -Path 'SerialCube.html' -Pattern 'connectSerial|disconnectSerial|readLoop'

# 找自动/条件/预设
Select-String -Path 'SerialCube.html' -Pattern 'autoSend|conditionSend|presetSend'

# 找主题
Select-String -Path 'SerialCube.html' -Pattern 'theme-dark|theme-light|setTheme'
```

---

## 9. 已知代码组织问题

| 问题 | 影响 | 临时方案 |
|------|------|----------|
| 21,168 行单文件 | 找代码慢 | 用本文档的章节行号速查 |
| `state` 顶层 mutable | 容易出 bug | 已用 `const`,但 nested object 可改 |
| 渲染函数全在全局 | 测试困难 | 走 e2e (serialcube-e2e) 验证 |
| ECharts 多次初始化 | 性能开销 | 用 `notMerge: false` 增量更新 |
| 国际化不完整 | 文案硬编码 | 目前只中文,未来加 i18n |

---

## 10. 链接到详细文档

| 我想了解 | 去看 |
|----------|------|
| CRC 算法细节 | [`CRC-REFERENCE.md`](CRC-REFERENCE.md) |
| 协议模板细节 | [`PROTOCOL-TEMPLATES.md`](PROTOCOL-TEMPLATES.md) |
| 怎么改代码 | [`../guides/DEVELOPER-GUIDE.md`](../guides/DEVELOPER-GUIDE.md) |
| 工具怎么用 | [`../guides/USER-GUIDE.md`](../guides/USER-GUIDE.md) |
