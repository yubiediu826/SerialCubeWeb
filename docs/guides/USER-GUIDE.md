# SerialCube 使用指南

> **面向用户**（调试串口的工程师）— 这个工具是什么、有什么用、怎么用。
> 如果你想改代码,看 [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md)。

---

## 1. 工具是什么

**SerialCube** 是一个**单文件 Web 串口调试工具**,面向 BMS（电池管理系统）/ EMS（能源管理系统）/ PCS（储能变流器）协议调试。

- **零安装:** 双击 HTML 文件,浏览器打开即用
- **零后端:** 纯前端,数据不离开你的电脑
- **零依赖:** 942KB 单文件,内嵌所有代码
- **真实串口:** Web Serial API 直连设备
- **Mock 模式:** 没有硬件也能模拟收发

---

## 2. 核心能力一览

| 模块 | 你能用它做什么 |
|------|----------------|
| 🔌 **串口监视** | 连接真实串口设备、查看原始字节流、配置波特率 / 数据位 / 停止位 / 校验位 |
| 📊 **图形解析** | 把字节流解析成电压 / 电流 / 温度等数值,仪表盘 widget 实时显示,弹窗看历史曲线 |
| ⏱ **时间线** | 卡片式数据展示 + 全局时间范围 + 缩放工具栏 |
| 📤 **预设发送** | 自动按周期发 / 收到特定响应触发回发 / 预设组按序发 |
| 🧩 **协议编辑器** | 自定义协议模板,支持 TLV 帧结构 + 5 种 CRC 校验 |
| 🔍 **解析协议** | 文本 / 十六进制 双模式,实时解析 |
| 🎨 **主题** | 浅色 / 深色 / 跟随系统,所有 modal/panel 统一实色 |
| 🔔 **告警** | 关键事件 toast 浮层 + 通知历史 |

---

## 3. 5 分钟上手

### 3.1 打开工具

| 方式 | 步骤 |
|------|------|
| **在线版（推荐）** | 浏览器打开 <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html> |
| **本地双击** | 下载 `SerialCube.html`,双击用 Chrome 打开 |
| **本地 server** | `python -m http.server 8000`,访问 `http://localhost:8000/SerialCube.html` |

### 3.2 浏览器要求

✅ **Chrome / Edge / Opera**（Chromium 内核,支持 Web Serial API）
❌ Safari / Firefox / 移动浏览器（不支持 Web Serial）

### 3.3 第一次打开你会看到

```
┌────────────────────────────────────────────────────────┐
│ [SC]  监视  解析  仪表盘    主题切换    帮助             │  ← 顶部
├──────────────┬─────────────────────────────────────────┤
│              │                                         │
│  设备连接管理  │        主操作区（监视 / 解析 / 仪表盘）   │
│  - 端口选择   │                                         │
│  - 波特率     │                                         │
│  - 连接按钮   │                                         │
│  - Mock 开关  │                                         │
│              │                                         │
├──────────────┴─────────────────────────────────────────┤
│  字节预览 + 发送输入 + 自动/条件/预设发送扩展           │  ← 底部
└────────────────────────────────────────────────────────┘
```

---

## 4. 核心功能详解

### 4.1 🔌 串口连接

#### 用真实串口

1. 把 USB-串口适配器插上电脑
2. Chrome 装好串口驱动（CH340 / CP2102 / FT232 等）
3. 点「连接」按钮 → Chrome 弹原生端口选择器
4. 选你的串口设备 → 连接成功

#### 用 Mock 模式（无硬件）

1. 打开「Mock 模式」开关
2. 工具会用内置虚拟数据模拟设备响应
3. 可以收发、解析、看图表,完全无硬件依赖

**Mock 数据特征（参考 `NS.initMockData`）:**
- 4 节电池电压（cell_1_v ~ cell_4_v）
- Pack 电压 / 电流
- 温度 / SOC
- 充电 / 放电设定值

### 4.2 📊 图形解析（仪表盘模式）

点顶部「**仪表盘**」切到 dashboard 模式:

- **卡片 widget** — 大数字 + 范围条 + sparkline + 状态角标
- **点卡片** — 弹窗看详细图表（折线 / 柱状 / 面积 / 散点）
- **拖拽** — 调卡片位置
- **编辑模式** — 加 / 删 / 改卡片

默认 10 张卡片:
- c1-c4: 4 节电池电压
- c5-c8: Pack 电压 / 电流 / 温度 / SOC
- c9: 充电设定 vs 实际（pair 卡,set vs act 对比）
- c10: 充电设定值趋势

### 4.3 ⏱ 时间线系统

**监视模式**下的时间线:
- 卡片式展示接收到的数据
- 全局时间范围选择（拖动选区）
- 缩放工具栏（放大 / 缩小 / 还原 / 适应窗口）
- 点击数据点看详情

### 4.4 📤 预设发送（3 种扩展）

打开「**自动 / 条件 / 预设组**」3 个 tile:

| 扩展 | 用途 | 典型场景 |
|------|------|----------|
| **自动发送** | 按固定周期发 | 周期性 query: 每 200ms 查一次电池电压 |
| **条件触发** | 收到匹配模式自动回发 | 收到 0x90 ACK 后发 0x10 控制命令 |
| **预设组** | 多个 payload 按序发 | 启动序列: 发 A → 等响应 → 发 B → 等响应 → 发 C |

**配置步骤（以自动发送为例）:**
1. 点「自动」tile 打开模块
2. 加 queue item
3. 填 payload（十六进制字符串,空格分隔,例 `AA 01 90`）
4. 设间隔（ms）
5. 打开「启用」开关

### 4.5 🧩 协议编辑器

**进入:** 点「协议编辑器」按钮（一般在设置区）

**2 个内置模板:**
- **proto_bms** — BMS TLV v1 (Legacy)
  - 帧结构: header(0xAA) + addr + cmd + length + data + crc(LE) + tail(0x55)
  - CRC: CRC-16 MODBUS (init=0xFFFF, LE 输出)
  - 范围: 整帧
- **proto_modbus** — Modbus RTU (Legacy)
  - 帧结构: addr + func + reg_hi + reg_lo + qty_hi + qty_lo + crc(LE)
  - CRC: CRC-16 MODBUS (init=0xFFFF, LE 输出)
  - 范围: 不含帧头（跳过 addr）

**自定义协议:**
- 加字段（header / addr / cmd / data / crc / tail）
- 选类型（u8 / u16 / u32 / float 等）
- 选字节序（BE / LE）
- 选 CRC 算法（none / checksum / xor / crc8 / crc16-modbus / crc16-ccitt）
- 选 CRC 范围（all / no_header / no_header_tail / no_tail / data_only）
- 导出 / 导入 JSON

详细字段表见 [`../reference/PROTOCOL-TEMPLATES.md`](../reference/PROTOCOL-TEMPLATES.md)。

### 4.6 🔍 解析协议

**监视模式** → 切到「**解析**」 tab:
- 文本模式 — 人类可读字符串
- 十六进制模式 — `AA 01 90 00 05 ...` 带空格分字节
- 实时解析（不需要点解析按钮）

**协议选择:** 选你刚配置的协议模板,工具会按模板解析字节流

### 4.7 🎨 主题

右上角 → 主题切换:
- **浅色** — 固定浅色
- **深色** — 固定深色
- **跟随系统** — 跟 OS 主题（默认）

切换后实时生效,不需要刷新。

### 4.8 🔔 告警

**触发场景:**
- 串口断开重连
- CRC 校验失败
- 协议解析异常
- 设备超时

**查看方式:**
- **Toast 浮层** — 5 秒自动消失
- **通知按钮** — 右上角铃铛,看历史记录

---

## 5. 实战工作流

### 5.1 场景 1: 调试一个新 BMS 设备

```
1. 打开 SerialCube → 打开 Mock 模式先熟悉界面
2. 拿到设备协议文档 (PDF/Excel)
3. 协议编辑器 → 新建协议 → 按文档配字段 / CRC
4. 关闭 Mock → 接真设备 → 点「连接」
5. 选你刚配的协议 → 切到「解析」模式
6. 看接收区: 字节流按协议解析成字段
7. 切到「仪表盘」看实时数值
8. 配「自动发送」做周期 query
9. 看告警有没有 CRC 错误
```

### 5.2 场景 2: 排查 CRC 校验失败

```
1. 协议编辑器 → 看你配的 CRC 算法
2. 切到「解析」模式 → 找到错误帧
3. 对照真实协议文档:
   - CRC 算法对吗? (crc16-modbus / crc16-ccitt / crc8 / checksum / xor)
   - 字节序对吗? (LE / BE)
   - CRC 范围对吗? (all / no_header / no_header_tail)
4. 修协议模板 → 保存
5. 重新解析看是否通过
```

详细 CRC 对照见 [`../reference/CRC-REFERENCE.md`](../reference/CRC-REFERENCE.md)。

### 5.3 场景 3: 写一个设备控制脚本

```
1. 协议编辑器 → 配置控制命令 (TX)
2. 「预设组」 → 加 3 个 payload:
   - 发 A (启动)
   - 等响应 X
   - 发 B (设参)
   - 等响应 Y
   - 发 C (启动完成)
3. 启用预设组 → 工具自动按序执行
4. 看通知历史确认每步成功
```

### 5.4 场景 4: 离线分析历史数据

```
1. 监视模式 → 接收到的数据自动存 NS.rxHistory
2. 切到「解析」/「仪表盘」 → 用时间线选时间范围
3. 缩放工具栏 → 聚焦到关键时刻
4. 弹窗 → 导出图表为 PNG
```

---

## 6. 高级技巧

### 6.1 自定义快捷键

目前没有自定义快捷键界面,改源码可以加（在 `SerialCube.html` 搜 `addEventListener('keydown'`）。

### 6.2 导出 / 导入配置

- 协议模板 → 「导出 JSON」 / 「导入 JSON」 按钮
- localStorage 偏好（主题 / 模块状态）— DevTools → Application → Local Storage → `serialweb:prefs`

### 6.3 多协议同时跑

**目前:** 单协议切换。**未来:** 看 ROADMAP（v1.1.0 计划加）。

### 6.4 性能调优

- 大数据量（> 1000 点）→ 切到「仪表盘」看聚合视图
- 时间线卡顿 → 缩小时间范围
- 浏览器内存占用高 → 刷新页面（清 NS.rxHistory）

### 6.5 调试技巧

- **DevTools Console** — 看 JS 错误和 `NS.*` 状态
- **`NS.state`** — 全应用 state 对象,Console 输入看
- **`NS.PROTOCOLS`** — 当前协议模板
- **`NS.rxHistory`** — 接收历史

---

## 7. 常见问题

### Q1: 打开页面是空白 / 报 JS 错误

A: 浏览器不兼容。请用 **Chrome / Edge / Opera 最新版**。

### Q2: 找不到串口设备

A:
- 确认 USB-串口驱动装了（CH340 / CP2102 / FT232）
- Chrome 89+ 才支持 Web Serial
- 第一次连接需要用户手势（点连接按钮）
- `localhost` / `127.0.0.1` / `file://` 协议下可以工作

### Q3: Mock 模式怎么用

A: 设备连接管理区 → 打开「Mock 模式」开关 → 不用真设备,工具用虚拟数据。

### Q4: 协议编辑器保存的协议去哪了

A: 存在浏览器 localStorage。DevTools → Application → Local Storage → 找 `serialweb:protocols` 之类 key。

清浏览器数据 = 清协议。要备份:协议编辑器 → 「导出 JSON」。

### Q5: GitHub Pages 部署的版本和我本地不一样

A: GitHub Pages 自动部署 main 分支最新 commit,可能有几分钟延迟。`git log --oneline -5` 看本地最新 commit 是否已推上去。

### Q6: 单文件怎么改源码

A: 见 [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md)。

---

## 8. 个性化设置

### 主题
- 右上角主题切换
- 跟随系统主题（默认）

### 布局
- 侧边栏折叠 / 展开
- 紧凑模式（窗口 ≤ 720px 自动）
- 编辑模式（仪表盘增删卡片）

### localStorage 备份

DevTools → Console → 跑:
```js
JSON.stringify(JSON.parse(localStorage.getItem('serialweb:prefs')), null, 2)
```
复制输出 = 你的全部偏好。

恢复:
```js
localStorage.setItem('serialweb:prefs', '{"theme":"dark","layout":{"expanded":true}}')
```

---

## 9. 链接到详细文档

| 我想了解 | 去看 |
|----------|------|
| 改源代码 | [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md) |
| 协议模板字段含义 | [`../reference/PROTOCOL-TEMPLATES.md`](../reference/PROTOCOL-TEMPLATES.md) |
| CRC 算法对照 | [`../reference/CRC-REFERENCE.md`](../reference/CRC-REFERENCE.md) |
| SerialCube.html 内部结构 | [`../reference/ARCHITECTURE.md`](../reference/ARCHITECTURE.md) |
| AI Agent 接手流程 | [`AGENT-START-HERE.md`](AGENT-START-HERE.md) |

---

## 10. 反馈 / Bug 报告

1. 提 GitHub Issue（推荐）: <https://github.com/yubiediu826/SerialCubeWeb/issues>
2. 提 PR: <https://github.com/yubiediu826/SerialCubeWeb/pulls>
3. 紧急问题: 邮件联系作者

**写 issue 必带:**
- 复现步骤
- 期望行为 vs 实际行为
- 浏览器版本 / OS
- 截图 / 录屏（用 `agent-browser screenshot` 或 `agent-browser video record`）
