# SerialCube 仪表盘 - 方案文档 v2

> 状态: v2 重新设计中 · 2026-08-03
> 路径: `docs/dashboard-design.md`
> 关联: [需求文档 v2](./dashboard-requirements.md) · [PRODUCT.md](../PRODUCT.md) · [DESIGN.md](../DESIGN.md)
> 上一版: v1 — 缺协议命令模型,被推翻,见需求文档 §11

## 1. 概述

v1 设计漏掉工业协议的核心特征——**多命令 + 主从方向 + 设定-实际配对**。v2 重构以**协议命令 (Command) 为第一公民**,把 dashboard 从"裸字段展示"升级为"命令感知的业务视图"。

### v2 关键变化

| 维度         | v1                              | v2                                       |
| ------------ | ------------------------------- | ---------------------------------------- |
| 字段绑定     | `field: 'cell_1_voltage'`        | `(cmd: 0x01, direction: 'rx', field: 'cell_1_v')` |
| 命令模型     | 无                              | Command / CmdGroup / Pair 完整建模        |
| 方向感知     | 无                              | tx (控制) / rx (数据) 配色 + 徽章区分     |
| 设定-实际对比 | 无                              | Pair Card / Pair KPI / 双线 sparkline    |
| 命令错配检测 | 无                              | 期望 cmd vs 实际 cmd 错配告警             |
| KPI 过滤     | 无                              | 按 cmd / cmd group 过滤                  |
| 卡片类型     | 4 种 (值/趋/态/复合)             | **5 种** (新增 Pair 对比卡)               |
| 告警上下文   | 字段名                          | cmd_id + direction + 字段名              |

### 选型回顾 (B 方案保留)

UI 形态仍是 **B 方案: 时间线 + KPI + 卡片**——timeline ribbon 复用 + KPI strip + 卡片网格 + 告警栏。v2 在此基础上叠加**命令面板 (Command Panel)** 和**对比卡 (Pair Card)**。

## 2. 协议模型 (v2 第一公民)

### 2.1 Command 数据形状

```ts
Command = {
  cmdId: 0x01,                    // 1 字节命令 ID (0-255)
  name: 'Read Voltage',            // 显示名 (zh-CN + en)
  direction: 'rx',                 // 'tx' | 'rx' | 'event'
  frameType: 'query',              // 'query' (轮询) | 'control' (手动) | 'event' (设备主动)
  cadence: 200,                    // 轮询周期 (ms), 0 = 手动/事件触发
  fields: [
    { name: 'cell_1_v', type: 'float32', unit: 'V', precision: 3 },
    { name: 'cell_2_v', type: 'float32', unit: 'V', precision: 3 },
    ...
    { name: 'cell_16_v', type: 'float32', unit: 'V', precision: 3 }
  ],
  expectResponse: 0x80,            // 期望响应 cmd_id (rx 命令必填, 用于错配检测)
  enabled: true                    // 是否在仪表盘启用
}
```

### 2.2 Command Group

```ts
CmdGroup = {
  id: 'realtime',
  name: '实时数据',
  cmdIds: [0x01, 0x02, 0x03, 0x04],   // 跨多条命令
  color: 'signal'                       // 配色 token
}
```

### 2.3 Field Pair (设定-实际配对)

```ts
Pair = {
  id: 'charge_v',
  name: '充电电压',
  unit: 'V',
  setpoint: {
    cmd: 0x10,
    direction: 'tx',
    field: 'charge_v_set'
  },
  telemetry: {
    cmd: 0x80,
    direction: 'rx',
    field: 'pack_v'
  },
  alert: {
    tolerance: 0.5,             // 差值 > 0.5V 告警
    level: 'warning'            // 'warning' | 'danger'
  }
}
```

### 2.4 数据来源

- **Source of truth**: parser 配置 (v2 升级后)
- parser 配 command 表;dashboard 引用之, 不重复定义
- v1 旧 parser config: command 字段缺失 → dashboard 降级为"无命令感知"模式(只用裸 field)

## 3. 总体架构

### 3.1 三层结构 (调整后)

```
┌─────────────────────────────────────────────────────────┐
│  视图层 (View)                                            │
│  - dashboard view (新模块)                              │
│  - command panel (新增)                                  │
│  - 5 种卡片 + KPI strip                                  │
└─────────────────────────────────────────────────────────┘
                          ↑ 读
┌─────────────────────────────────────────────────────────┐
│  状态层 (State)                                           │
│  - state.dashboard (新增 sub-state)                      │
│    - commands / cmdGroups / pairs (从 parser 引用)      │
│    - kpiStrip / cards / alerts / trendData              │
└─────────────────────────────────────────────────────────┘
                          ↑ 订阅
┌─────────────────────────────────────────────────────────┐
│  数据层 (Data)                                            │
│  - parser event bus (扩展)                              │
│    - on('frame', {cmd, direction, fields, timestamp})   │
│    - on('cmd-mismatch', {sent, expected, got})          │
│  - 趋势数据: ring buffer per (cmd, field)               │
└─────────────────────────────────────────────────────────┘
```

### 3.2 关键变化

- **Event bus payload** 从 `{name, value}` 改为 `{cmd, direction, name, value, timestamp}`
- **趋势数据 key** 从 `field_name` 改为 `cmd.field` (避免跨命令冲突)
- **State 引用 parser config**: commands / cmdGroups / pairs 不存本地,从 parser 配读取,单一真相

### 3.3 模块边界

| 模块                  | 责任                                       | v2 变化                                |
| --------------------- | ------------------------------------------ | -------------------------------------- |
| `parser.commands`     | 解析 command 表(新)                        | 新增                                    |
| `parser.eventBus`     | 推送 frame + cmd-mismatch 事件             | payload 加 cmd/direction                |
| `dashboard.view`      | 渲染 KPI / 卡片 / 告警栏 / 命令面板         | 新增 command panel                     |
| `dashboard.cards`     | 卡片 CRUD                                  | 字段绑定改三元组,加 Pair Card          |
| `dashboard.alerts`    | 阈值检测 + 告警生成                        | 加 cmd/direction 上下文,加错配告警    |
| `dashboard.trend`     | 滚动窗口 + sparkline                       | key 改 cmd.field,加双线渲染            |
| `dashboard.pairs`     | Pair 数据源 + 设定-实际差值计算(新)        | 新增                                    |
| `dashboard.config`    | 导入导出 + 持久化                          | JSON 加 commands/cmdGroups/pairs 字段   |

## 4. UI 布局

### 4.1 区域划分 (v2)

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar (复用)                                                │
│  [logo+status] [timeline ribbon]              [menu+version] │
├──────────────────────────────────────────────────────────────┤
│  Mode Switch Bar                                              │
│  [监视] [解析] [仪表盘]                                       │
├──────────────────────────────────────────────────────────────┤
│  Command Panel (新增) ⭐                                       │
│  [▾ 全部命令] [0x01 读电压] [0x02 读电流] [0x10 控制充电] ... │
├──────────────────────────────────────────────────────────────┤
│  KPI Stat Strip (高度 ≈ 96px)                                 │
│  含 Pair KPI: 设定/实际/差值                                   │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                         │
│  │V │ │I │ │T │ │SOC│ │P │ │E │ │⚖ │ (⚖ = 差值对比)         │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                         │
├──────────────────────────────────────────────────────────────┤
│                                          │  Alert Drawer      │
│  Card Grid (主区)  ⭐ 含 Pair Card         │  ┌─────────────┐  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │ cmd 0x01 rx │  │
│  │ Pair ⚖  │ │ Cell 1  │ │ Cell 2  │    │  │ V > 4.2V    │  │
│  │ 设定 56 │ │ v3.71V  │ │ v3.72V  │    │  │ DANGER      │  │
│  │ 实际 55 │ │ ▁▃▅▆▇  │ │ ▁▃▅▆▇  │    │  ├─────────────┤  │
│  │ Δ 0.5V  │ │ 0x01 rx │ │ 0x01 rx │    │  │ cmd 错配     │  │
│  │ ━━━━     │ └─────────┘ └─────────┘    │  │ 0x10 → 0x81 │  │
│  │ ┄┄┄┄┄   │                            │  │ DANGER      │  │
│  └─────────┘                            │  └─────────────┘  │
│                                          │                   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Command Panel (新增)

**位置**: topbar 之下, KPI strip 之上, 高度 ~36px

**内容**: 一行 horizontal scroll, 显示所有 enabled Command

```
[▾ 全部] [0x01 读电压 ✓] [0x02 读电流 ✓] [0x10 控制充电 ✓] [0x11 控制放电 ✓] [0x03 读温度 ✓]
```

- 默认选中 "全部"
- 点击 cmd 选中, 触发 KPI strip 过滤(只显示该 cmd 内的字段)
- 多选: Shift+Click 多选 cmd, 触发按 cmd group 过滤
- cmd 徽章颜色: rx = `--signal`, tx = `--accent`
- 错配过的 cmd 出现红色角标

### 4.3 响应式 (调整)

| 断点           | KPI 数量  | 卡片列数 | 告警栏         | 命令面板         |
| -------------- | --------- | -------- | -------------- | ---------------- |
| ≥ 1600px       | 7         | 4        | 完整 (320px)   | 完整 (1 行)      |
| 1280-1599px    | 5-7       | 3        | 完整 (280px)   | 完整             |
| 1024-1279px    | 5         | 2        | 折叠 (60px)    | 滚动             |
| 720-1023px     | 3         | 1        | 折叠 (60px)    | 折叠成下拉       |
| < 720px        | 2         | 1        | 隐藏 / tab     | 折叠成下拉       |

### 4.4 空状态 (无仪表盘配置或 parser 无 command)

```
┌──────────────────────────────────────────────────────────────┐
│                       ⚙  仪表盘                              │
│                                                              │
│     仪表盘是 SerialCube 的第三种工作模式                      │
│     把 parser 解析的命令结果按业务卡片组织                     │
│                                                              │
│            ┌─────────────────────────┐                       │
│            │  + 创建我的第一个仪表盘 │                       │
│            └─────────────────────────┘                       │
│                                                              │
│  提示: 仪表盘需在 [解析] 模式配置 command 表                 │
│       (cmd_id / direction / 字段 / 期望响应)                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 5. 组件清单

### 5.1 复用 (从 v1 / SerialCube.html / DESIGN.md)

- `topbar` (logo, status-pill, mode-switch, timeline-block, system-menu)
- `panel` / `panel-head` / `panel-body`
- 5 种 button + chip
- DESIGN.md 全部 token

### 5.2 v1 → v2 调整

| v1 组件           | v2 变化                                                     |
| ----------------- | ----------------------------------------------------------- |
| `DashboardRoot`   | 不变                                                        |
| `KpiStrip`        | 增加 cmd 过滤逻辑                                            |
| `KpiCard`         | 增加 `PairKpiCard` 子类型(显示设定/实际/差值)                 |
| `CardGrid`        | 增加 `PairCard` 渲染                                          |
| `CardValue`       | 字段绑定改 (cmd, field),增加 cmd_id 徽章渲染               |
| `CardTrend`       | 同上 + 双线渲染逻辑                                          |
| `CardState`       | 同上                                                        |
| `CardComposite`   | 同上                                                        |
| `Sparkline`       | 增加 dual-line 模式(虚线 + 实线)                            |
| `AlertDrawer`     | 告警 item 增加 cmd_id + direction 徽章                       |
| `CardEditor`      | 字段选择前增加 cmd 选择步骤,加 Pair 编辑                    |
| `FieldPicker`     | 改为两层: CmdPicker → FieldPicker                            |
| `ThresholdEditor` | 增加 Pair 差值阈值编辑                                       |

### 5.3 v2 新增组件

| 组件              | 类型     | 责任                                         |
| ----------------- | -------- | -------------------------------------------- |
| `CommandPanel`    | layout   | 命令列表水平条,支持单选/多选过滤              |
| `CmdChip`         | chip     | 单个 cmd 徽章(rx/tx 配色 + cmd_id hex)       |
| `PairKpiCard`     | value    | Pair 类型 KPI,显示设定/实际/差值              |
| `PairCard`        | composite| Pair 类型卡片,大字号差值 + 双线 sparkline    |
| `CmdPicker`       | editor   | 命令选择器(在 FieldPicker 之前)              |
| `PairEditor`      | editor   | Pair 配置(setpoint + telemetry 配对)        |
| `CmdMismatchAlert`| alert    | 命令错配告警项(独立于阈值告警)                |

### 5.4 组件层级 (v2)

```
DashboardRoot
├── ModeSwitchBar
├── CommandPanel ⭐ NEW
│   └── CmdChip × N
├── KpiStrip
│   ├── KpiCard (单值)
│   └── PairKpiCard ⭐ NEW
├── CardGrid
│   ├── CardValue / CardTrend / CardState / CardComposite (cmd-aware)
│   ├── PairCard ⭐ NEW
│   └── "+" 槽位
├── AlertDrawer
│   ├── AlertItem (cmd_id + direction 徽章)
│   └── CmdMismatchAlert ⭐ NEW
├── CardEditor
│   ├── CmdPicker ⭐ NEW (先选 cmd)
│   ├── FieldPicker (再选 field)
│   ├── PairEditor ⭐ NEW (Pair 类型时显示)
│   └── ThresholdEditor
├── EditToolbar
└── EmptyState
```

## 6. 状态管理 (v2)

### 6.1 sub-state 结构

```javascript
state.dashboard = {
  // 模式开关
  active: false,
  editMode: false,

  // 命令过滤 (UI 临时态)
  cmdFilter: {
    mode: 'all',                  // 'all' | 'single' | 'group'
    selectedCmdIds: [],           // 单选/多选的 cmd_id 列表
    selectedGroupId: null
  },

  // 引用 parser (单一真相) ⭐ v2
  commands: null,                // 从 state.parser.commands 引用
  cmdGroups: null,               // 从 state.parser.cmdGroups 引用
  pairs: null,                   // 从 state.parser.pairs 引用(也支持 dashboard 单独定义)

  // KPI 配置 (v2: 字段绑定三元组)
  kpiStrip: [
    { id: 'k1',
      kind: 'single',             // 'single' | 'pair'
      cmd: 0x01,                  // ⭐
      direction: 'rx',            // ⭐
      field: 'cell_1_v',          // ⭐
      title: 'Cell 1 电压', unit: 'V', format: 'decimal', precision: 3,
      alert: { upper: 4.2, lower: 2.8, level: 'danger' } },
    { id: 'k2',
      kind: 'pair',               // ⭐
      pairId: 'charge_v',         // ⭐
      title: '充电电压' },
    ...
  ],

  // 卡片配置 (v2: 字段绑定三元组)
  cards: [
    { id: 'c1',
      type: 'value',
      cmd: 0x01, direction: 'rx', field: 'cell_1_v',       // ⭐
      title: 'Cell 1 电压', unit: 'V', format: 'decimal', precision: 3,
      alert: { upper: 4.2, lower: 2.8, level: 'danger' } },
    { id: 'c2',
      type: 'pair',                 // ⭐
      pairId: 'charge_v',
      title: '充电电压',
      trendWindow: '10min',
      alert: { tolerance: 0.5, level: 'warning' } },
    ...
  ],

  // 告警 (v2: 加 cmd 上下文)
  alerts: [
    { id: 'a1', timestamp: 1722657735,
      cmd: 0x01, direction: 'rx', field: 'cell_1_v',       // ⭐
      value: 4.21, threshold: 4.2, side: 'upper',
      level: 'danger', cardId: 'c1', acked: false, state: 'active' }
  ],

  // 错配告警 (v2 新增) ⭐
  cmdMismatchAlerts: [
    { id: 'm1', timestamp: 1722657740,
      sentCmd: 0x10, expected: 0x80, got: 0x81,
      level: 'danger', acked: false }
  ],

  // 趋势数据 (v2: key 改 cmd.field) ⭐
  trendData: {
    '0x01.cell_1_v': [{ t, v }, ...],
    '0x10.charge_v_set': [{ t, v }, ...],   // tx 字段也保留趋势(看设定历史)
    '0x80.pack_v': [{ t, v }, ...]
  },

  // UI 临时态
  editingCardId: null,
  alertDrawerCollapsed: false,
  configDirty: false
}
```

### 6.2 持久化 (调整)

- 路径: `localStorage['serialweb:prefs'].dashboard` (复用)
- 内容: 上述 state (除 trendData / cmdMismatchAlerts 临时态)
- **commands / cmdGroups / pairs 不在 dashboard 配置里**,它们从 parser 配读取
- 旧 userConfig 兼容: dashboard 字段缺失 → 用空配置

### 6.3 导入导出 (调整)

复用 SerialWebUserConfig 体系, version bump 到 v2:

```json
{
  "type": "SerialWebUserConfig",
  "version": 2,                    // ⭐ bump
  "userConfig": {
    "settings": { ... },
    "parser": {
      "commands": [ ... ],         // ⭐ v2 新增(可选)
      "cmdGroups": [ ... ],        // ⭐ v2 新增(可选)
      "pairs": [ ... ]             // ⭐ v2 新增(可选)
    },
    "dashboard": {
      "kpiStrip": [ ... ],
      "cards": [ ... ]
    }
  }
}
```

**v1 兼容**: version=1 的 userConfig 仍可解析, parser.commands 字段缺失时 dashboard 降级到"无命令感知"模式。

## 7. 数据流 (v2)

### 7.1 parser event bus (扩展)

```
parser 解析一帧
  │
  ▼
{frame: { cmd, direction, fields: [{name, value, type}], timestamp }}
  │
  ▼
event bus
  │
  ├──► dashboard subscriber
  │     │
  │     ├── 匹配 cmd_filter
  │     ├── 路由到 cards / kpiStrip (按 cmd + field)
  │     ├── 触发 alert 检测
  │     └── 写入 trendData[cmd.field]
  │
  └──► alert subsystem
        ├── 阈值检测
        └── 错配检测(若 cmd !== expectResponse)
```

### 7.2 错配检测

```
parser 收到响应
  │
  ▼
查 state.parser.commands[sentCmd].expectResponse
  │
  ├── 匹配 → 正常
  └── 不匹配 → emit cmd-mismatch
                 │
                 ▼
              dashboard 接收
                 │
                 ▼
              生成 cmdMismatchAlerts 项
                 │
                 ▼
              AlertDrawer 顶部红条 + 告警栏新增
```

### 7.3 设定-实际同步 (Pair Card)

```
tx 帧 0x10 发送
  │
  ▼
parser 解析 → emit {cmd: 0x10, direction: 'tx', fields: [{name: 'charge_v_set', value: 56.0}]}
  │
  ▼
dashboard: 找所有引用 charge_v.setpoint 的 Pair
  │
  ▼
更新 pairData[pairId].setpoint = { t, v }
  │
  ▼
PairCard 重新计算 Δ = setpoint - telemetry
  │
  ▼
渲染: 设定大字号 / 实际大字号 / Δ 小字号 + 颜色 (正常/警告/异常)
```

### 7.4 渲染管线

```
state 变化
  │
  ▼
标记 dirty(粒度: card / kpi / alert item)
  │
  ▼
requestAnimationFrame 批量更新
  │
  ├── DOM: classList.toggle / textContent
  ├── Canvas: sparkline 重绘
  └── (avoid 强制 layout)
```

## 8. 与 parser 集成 (v2 升级)

### 8.1 parser v2 升级点

| parser 模块          | v2 变化                                                  |
| -------------------- | -------------------------------------------------------- |
| `parser.commands`    | 新增:Command 表(cmd_id / direction / fields / expect)   |
| `parser.cmdGroups`   | 新增                                                    |
| `parser.pairs`       | 新增                                                    |
| `parser.eventBus`    | payload 加 cmd + direction                              |
| `parser.sendFrame()` | 暴露 API 给 dashboard / preset send 触发               |
| `parser.config`      | JSON schema 加 commands / cmdGroups / pairs 字段        |

### 8.2 集成边界 (强化)

- dashboard **只读** parser.commands / cmdGroups / pairs
- dashboard **不发送** 命令(发送是 parser / monitor 的责任)
- 错配检测由 parser event bus 提供, dashboard 只消费
- dashboard 通过 event bus 单向订阅, 不反向通知 parser

### 8.3 v1 兼容降级

如果 parser config 没有 commands 字段:
- CommandPanel 隐藏
- KPI / Card 显示 "无命令感知模式"
- 字段绑定降级为裸 field(同名冲突风险由用户承担)
- 错配检测禁用
- Pair Card 禁用(因为需要 setpoint + telemetry 两个 cmd)

## 9. UX 决策 (v2 新增 + 调整)

### 9.1 Command Panel 交互

- **默认**: "全部命令" 选中, KPI strip 显示所有 cmd 的字段
- **单选**: 点击 CmdChip → 选中该 cmd, KPI strip 只显示该 cmd 字段
- **多选**: Shift+Click → 累加选中, KPI strip 显示所有选中 cmd 字段(去重)
- **Group 过滤**: CommandPanel 右侧 "按组" 按钮(如有 group 配置) → 下拉选 group
- **错配角标**: 出现 cmd 错配时, 对应 CmdChip 右上角小红点 (3s 后消失或持续)

### 9.2 卡片 cmd_id 徽章

- 位置: 卡片右下角,小徽章
- 形态:
  - rx: `0x01` 蓝色底 (`--signal`)
  - tx: `0x10` 紫色底 (`--accent`)
  - Pair 卡: 显示 `0x10→0x80` (setpoint→telemetry 简写)
- 字体: `var(--font-mono)`, 9px / 700
- 点击徽章: 弹 tooltip 显示完整命令名

### 9.3 Pair Card 布局 (v2 新增)

```
┌─────────────────────────────────────────┐
│ 充电电压                ⚖ Pair  0x10→0x80│
│                                         │
│  设定 56.0V                             │
│  实际 55.8V   Δ -0.2V                   │
│                                         │
│  趋势 (10min)                           │
│  ━━━━━━━━━━━━━━━━━━━━ (实线 实际)       │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ (虚线 设定)       │
│                                         │
└─────────────────────────────────────────┘
```

- 设定值: `--text-soft` 灰
- 实际值: `--accent` 蓝紫 (主色)
- 差值: 正常 `--text-soft`, 警告 `--warning`, 异常 `--danger`

### 9.4 命令错配告警

- 触发时机: parser 收到非预期 cmd
- AlertDrawer 顶部新增红条 (3s 高亮后回归普通)
- 告警项格式:
  ```
  [11:42:15]  cmd 错配  DANGER
  期望 0x10 → 0x80, 实际收到 0x81
  [查看 parser 模式] [✓ 确认]
  ```
- 点击 "查看 parser 模式" → 切回 parser 模式(用户排查)
- 持续显示, 1s debounce 后可再次触发

### 9.5 编辑器流程 (v2 调整)

**添加数值卡**:
1. 进入编辑模式
2. 点 "+" 槽位
3. CardEditor 抽屉滑出
4. 选择 cmd (从 CommandPanel 列表)
5. 选择 field (该 cmd 的字段列表)
6. 选择 card type (5 种)
7. 设置阈值 / 趋势窗
8. 实时预览(显示在卡片网格的占位)
9. 完成 → 自动保存

**添加 Pair 卡**:
1. 进入编辑模式
2. 点 "+" 槽位
3. 选择 type: Pair
4. PairEditor 显示:
   - setpoint 字段(下拉)
   - telemetry 字段(下拉)
   - 设定-实际配对预览
   - 容差阈值
5. 完成

### 9.6 错误处理 (调整)

| 错误情况                | UX                                                       |
| ----------------------- | -------------------------------------------------------- |
| parser 未配置           | 空状态引导: "请先在 [解析] 模式配置 command 表"           |
| parser 字段不存在        | 卡片显示 "—" 灰色 + tooltip "无数据"                    |
| parser 命令错配          | 顶部红条 + 告警栏新增                                    |
| Pair 配置不完整          | PairEditor 提示 "需要 setpoint + telemetry 两个字段"     |
| 多 cmd 同名字段          | 自动用 (cmd, field) 区分;UI 显式标注 cmd_id 徽章          |
| localStorage 写入失败    | 顶部 toast "配置保存失败"                                |
| 卡片配置 JSON 损坏       | 导入时拒绝, 保留旧配置                                   |

## 10. 设计 Token 复用

完全沿用 [DESIGN.md](../DESIGN.md), 唯一新增约定:

### tx/rx 配色映射

| 方向 | token          | 用途                                  |
| ---- | -------------- | ------------------------------------- |
| rx   | `--signal`     | rx cmd 徽章底, rx 趋势线              |
| tx   | `--accent`     | tx cmd 徽章底, tx 设定值文字色         |
| setpoint (虚线) | `--text-soft` | 设定值趋势线 (Pair Card)          |
| telemetry (实线) | `--accent`   | 实际值趋势线 (Pair Card)              |
| 差值 Δ 正常 | `--text-soft`  | Δ < tolerance                          |
| 差值 Δ 警告 | `--warning`   | tolerance ≤ Δ < 2*tolerance           |
| 差值 Δ 异常 | `--danger`    | Δ ≥ 2*tolerance                        |

### 8 条 Named Rules 继承

全部继承, 无破坏。Pair Card 体现 #1 (单 accent) #2 (单 status) #4 (weight) #7 (flat)。

## 11. 实现路径 (v2 调整)

按 4 阶段, Phase 0 是 v2 关键:

### Phase 0: parser v2 升级 (建议 1-2 天) ⭐

- [ ] parser config 加 commands / cmdGroups / pairs 字段
- [ ] parser 解析 command 表, 注入到 state.parser
- [ ] parser event bus payload 加 cmd + direction
- [ ] parser 错配检测(sentCmd vs expectResponse)
- [ ] parser 暴露 sendFrame() API(给 preset / dashboard 触发 tx)
- [ ] UserConfig version bump 到 v2, 兼容 v1

**Demo**: parser 模式能配置命令表, 错配时告警(在 parser 模式内可见)

### Phase 1: 骨架 (1-2 天)

- [ ] topbar mode-switch 加 "仪表盘"
- [ ] state.dashboard 初始结构(v2)
- [ ] DashboardRoot 布局
- [ ] CommandPanel (读 parser.commands)
- [ ] KpiStrip + KpiCard 静态
- [ ] CardGrid + 5 种卡类型静态
- [ ] AlertDrawer 占位
- [ ] EmptyState

**Demo**: 切到 dashboard 看 CommandPanel + 占位卡

### Phase 2: 实时数据 + Pair (2-3 天)

- [ ] parser → dashboard 订阅(扩展 payload)
- [ ] 字段绑定三元组
- [ ] 数值卡实时刷新
- [ ] 趋势卡 sparkline (单线)
- [ ] **Pair Card 双线 sparkline** ⭐
- [ ] **PairKpiCard 差值显示** ⭐
- [ ] 趋势数据 ring buffer (key = cmd.field)

**Demo**: 多命令实时刷新, Pair 显示设定-实际差

### Phase 3: 告警 + 配置 (2-3 天)

- [ ] 阈值检测
- [ ] 告警生成 (加 cmd 上下文)
- [ ] **命令错配告警** ⭐
- [ ] AlertItem cmd_id 徽章
- [ ] 告警栏折叠 / 确认 / history
- [ ] CardEditor v2(CmdPicker → FieldPicker)
- [ ] **PairEditor** ⭐
- [ ] EditToolbar
- [ ] 卡片 CRUD
- [ ] 导入导出 (UserConfig v2)
- [ ] localStorage 持久化

**Demo**: 完整功能, 多命令监控 + 设定-实际对比 + 错配告警

## 12. 风险与回滚

- **R1 (Phase 0 失败)**: parser v2 升级不兼容 → 立即回滚, dashboard 走"无命令感知"降级模式
- **R2 (Pair 计算错误)**: Δ 计算 bug → 单元测试覆盖, dashboard 显示原始值供对照
- **R3 (错配告警泛滥)**: 高频错配 → 5s debounce + 同 cmd 折叠
- **R4 (event bus 阻塞)**: 多命令高频 → 异步, 主线程单消费者, dirty flag 批量更新

## 13. 关联

- 上游: [需求文档 v2](./dashboard-requirements.md)
- 复用: [DESIGN.md](../DESIGN.md) / [PRODUCT.md](../PRODUCT.md) / [AGENTS.md](../AGENTS.md)
- 关联模块: [架构 §4 功能模块](./architecture.md#4-功能模块) 的 parser / chart / timeline 子系统
- 依赖 Phase 0: parser v2 升级(本方案的前置条件)
