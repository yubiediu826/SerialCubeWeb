# SerialCube 仪表盘 - 方案文档 v3

> 状态: v3 重新设计中 · 2026-08-03
> 路径: `docs/dashboard-design.md`
> 关联: [需求文档 v3](./dashboard-requirements.md) · [PRODUCT.md](../PRODUCT.md) · [DESIGN.md](../DESIGN.md)
> 上一版: v2 — UI 规范被推翻, 见需求文档 §12

## 1. 概述

v2 在协议模型 (Command / Direction / Pair) 上对了, 但 UI 层没落地: 卡片高度不统一, 缺 Detail 模式, 没图表类型切换, RX-only 字段没保护。

v3 全面重构 UI 规范:
- **等高卡片** (200px 普通 / 96px KPI)
- **普通 + Detail 双模式**
- **Detail 4 sub-tab** (实时/Modbus 通用/设备/查询状态)
- **5 种图表切换** (折线/柱状/面积/散点/直方)
- **RX-only 永久只读** (fromOtherCmd=true)
- **状态环 5 色** (绿/橙/红/灰/蓝)

设计语言完全延用 [DESIGN.md](../DESIGN.md) ("The Engineer's Workbench")。

### v2 → v3 关键变化

| 维度            | v2                           | v3                                              |
| --------------- | ---------------------------- | ----------------------------------------------- |
| 卡片高度        | 异形                          | **统一 200px** (普通) / 96px (KPI)              |
| 卡片布局        | 自由                          | **5 区域强约束** (状态环/字段/主值/趋势/底部)   |
| Action          | 不固定                        | **固定 4 个** (min/max/close/状态相关)         |
| 详细分析        | 仅 60px sparkline            | **Detail 模式** (200px 大图 + 4 sub-tab)         |
| 图表类型        | 仅折线                        | **5 种切换**                                    |
| RX-only         | 未明确                        | **fromOtherCmd=true 永久只读**                 |
| 状态环          | 无                            | **新增 5 色**                                  |
| 状态环 vs 边框  | 不分离                        | **分离**: 环=数据源, 边框=告警 level            |
| 新增 token      | —                             | **`--success: #22c55e`** (状态环正常色)         |

## 2. 协议模型 (沿用 v2)

v2 协议模型保留:

- **Command** (cmdId, direction, frameType, cadence, fields, expectResponse)
- **CmdGroup** (跨多 cmd 归类)
- **Field Pair** (setpoint ↔ telemetry)

详见 [v2 需求文档 §2](./dashboard-requirements.md#2-协议模型-v2-新增)。

### v3 新增字段

```ts
Field = {
  name: 'cell_1_v',
  type: 'float32',
  unit: 'V',
  precision: 3,
  fromOtherCmd: true,    // ⭐ v3 新增:RX-only 标志
  // ... 沿用 v2
}
```

**fromOtherCmd 规则**:
- 默认 `false`
- 设为 `true`: 该字段是"对方帧"的字段, 仪表盘中**永远只读**
- 由用户/parser 配置显式标记
- v2 配置无此字段 → 默认 `false` (兼容)

## 3. 设计 Token (沿用 + v3 新增)

### 3.1 沿用 DESIGN.md

全部 token 沿用, 不破坏:
- 颜色: `accent` / `signal` / `warning` / `danger` / `bg` / `text` / `border`
- 字体: `display` / `title` / `body` / `label` / `micro` / `mono`
- 圆角: `sm 10px` / `md 14px` / `pill 999px`
- 间距: `gap 10px` / `pad-sm 6px` / `pad-md 12px` / `pad-lg 16px`
- 阴影: `ambient-soft` / `hover-soft` / `no-shadow-rest`

### 3.2 v3 新增

```yaml
colors:
  success: "#22c55e"       # 状态环: 正常 (绿)
  signal: "#3a5ccc"        # 状态环: RX-only 永久色 (蓝, 沿用)
  warning: "#d97706"       # 状态环: 警告 (橙, 沿用)
  danger: "#e0575e"        # 状态环: 异常 (红, 沿用)
  text-soft: "#67676c"     # 状态环: 离线 (灰, 沿用)
```

**8 条 Named Rules 全部继承**。v3 新规则:

**The Status Ring Rule.** 状态环颜色表达**数据来源 / 状态** (绿/橙/红/灰/蓝), 不跟随告警边框。告警用卡片边框颜色表达(level: warning/danger)。两者分离: 环=瞬时, 边=持续。

**The Equal Height Rule.** 普通卡高度固定 200px, KPI 96px, 严格等高。Pair 卡即使要显示设定-实际对比, 也在 200px 内紧凑布局, 不允许异形。

**The 4-Action Rule.** 每张普通卡固定 4 个 action (min/max/close/状态相关), 位置固定在头部右侧, 大小 24×24px。

## 4. 总体架构 (沿用 v2)

v2 架构保留:
- 数据层: parser event bus (含 cmd / direction)
- 状态层: state.dashboard (新增 sub-state)
- 视图层: dashboard view (新模块)

v3 新增:
- **Detail 模式**: dashboard.view.detail (新增, 切换 dashboardMode)
- **图表类型**: dashboard.chart.renderByType() (新增 5 种 render 函数)
- **RX-only 保护**: dashboard.writeGuard.check(field) (新增)

## 5. UI 布局 (v3 重构)

### 5.1 区域划分

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar (复用)                                                │
│  [logo+status] [timeline ribbon]              [menu+version] │
├──────────────────────────────────────────────────────────────┤
│  Mode Switch Bar                                              │
│  [监视] [解析] [仪表盘]                                       │
├──────────────────────────────────────────────────────────────┤
│  Command Panel (v2)                                           │
│  [▾ 全部] [0x01] [0x02] [0x10] [0x11] ...                    │
├──────────────────────────────────────────────────────────────┤
│  KPI Stat Strip (高度 96px, 严格等高)                         │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                         │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                         │
├──────────────────────────────────────────────────────────────┤
│  Card Grid (主区)                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │普通卡 1 │ │普通卡 2 │ │普通卡 3 │   ← 高度严格 200px     │
│  │ 200px   │ │ 200px   │ │ 200px   │                        │
│  └─────────┘ └─────────┘ └─────────┘                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │普通卡 4 │ │普通卡 5 │ │ RX 卡 6 │   ← RX-only 永久只读   │
│  └─────────┘ └─────────┘ └─────────┘                        │
│                                          │  Alert Drawer      │
│                                          │  ...               │
└──────────────────────────────────────────────────────────────┘
```

**Detail 模式** (覆盖在 dashboard 之上):

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar (不可见, modal 覆盖)                                  │
│  ...                                                            │
├──────────────────────────────────────────────────────────────┤
│  Detail Modal (全屏覆盖, 1440 × 90vh, 14px 圆角)             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [×] Cell 1 电压      0x01 rx  ·  ✓ 正常               │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ [实时][通用 Modbus][设备][查询状态]  [实时|历史][▾图表] │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │              完整大图 (200px 高)                       │  │
│  │              折线 / 柱状 / 面积 / 散点 / 直方           │  │
│  │                                                        │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ Min: 3.21V    Max: 3.78V    Avg: 3.62V    N: 60       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 响应式 (v2, 调整卡片数)

| 断点           | KPI 数量 | 卡片列数 | 普通卡高度 | Detail modal 宽     |
| -------------- | -------- | -------- | ---------- | ------------------- |
| ≥ 1600px       | 7        | 4        | 200px      | 1440px              |
| 1280-1599px    | 5-7      | 3        | 200px      | 1200px              |
| 1024-1279px    | 5        | 2        | 200px      | 1000px              |
| 720-1023px     | 3        | 1        | 200px      | 720px (全屏)        |
| < 720px        | 2        | 1        | 200px      | 全屏                |

**等高约束跨所有断点**: 普通卡始终 200px。

### 5.3 普通卡详细布局 (200px 强约束)

```
┌────────────────────────────────────────────────────┐ ← 200px
│  ● Cell 1 电压                  [↓][↑][×][⚙]      │ ← 头部 40px
│                                                    │
│              3.71V                                 │ ← 主值 60px
│                                                    │
│  ▁▂▃▅▆▇█▇▆▅▃▂▁▂▃▅▆▇                             │ ← 趋势 40px
│                                                    │
│  范围 2.8 - 4.2V  ·  ✓ 正常                       │ ← 底部 40px
└────────────────────────────────────────────────────┘
                          ↕ 12px padding
```

**Grid layout** (CSS Grid):

```css
.card-default {
  display: grid;
  grid-template-rows: 40px 60px 40px 40px;
  grid-template-areas:
    "header"
    "value"
    "trend"
    "footer";
  height: 200px;          /* 严格等高 */
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-panel);
}
```

### 5.4 RX-only 卡片差异

普通卡布局一样, 差异:
- 状态环: 蓝色 (`--signal`), 8px 圆点
- 卡片右上角小徽章: "RX" (9px mono, 蓝底白字)
- 4 个 action 中"状态相关"按钮:
  - 默认 `cursor: not-allowed`
  - opacity 0.4
  - 点击无效 (handler 早 return)
  - tooltip "RX-only 字段, 不可写入"

```css
.card-rx-only .action-status {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}
.card-rx-only::after {
  content: 'RX';
  position: absolute;
  top: 8px; right: 8px;
  font-size: 9px; font-family: var(--font-mono); font-weight: 700;
  padding: 2px 5px;
  background: var(--signal);
  color: white;
  border-radius: 4px;
}
```

### 5.5 Pair 卡 (在 200px 内紧凑布局)

等高 200px 不破, 紧凑布局:

```
┌────────────────────────────────────────────────────┐ ← 200px
│  ● 充电电压 (Pair) 0x10→0x80   [↓][↑][×][⇄]     │ ← 头部 40px
│                                                    │
│  实际 55.8V  ·  设定 56.0V  ·  Δ -0.2V          │ ← 主值 60px (3 列)
│                                                    │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ (虚线 设定)                    │ ← 趋势 40px (双线)
│  ━━━━━━━━━━━━━━━━ (实线 实际)                    │
│                                                    │
│  容差 ±0.5V  ·  ✓ 在范围内                       │ ← 底部 40px
└────────────────────────────────────────────────────┘
```

主值区域用 CSS Grid 3 列 (实际 / 设定 / 差值), 趋势区双线 sparkline。

## 6. 组件清单 (v3 重构)

### 6.1 复用 (从 v2 / DESIGN.md)

- `topbar` / `panel` / `button` / `chip` / `KpiCard`(调整)/ `CommandPanel` / `CmdChip`

### 6.2 v2 → v3 调整

| v2 组件               | v3 变化                                                        |
| --------------------- | -------------------------------------------------------------- |
| `KpiCard`             | 高度固定 96px                                                  |
| `CardValue`           | **5 区域布局, 高度 200px**; 4 action 固定                     |
| `CardTrend`           | 同上 + 双线 sparkline (Pair 时)                                |
| `CardState`           | 同上                                                          |
| `CardComposite`       | 同上                                                          |
| `CardPair`            | 同上, 紧凑 3 列布局                                           |
| `CardEditor`          | 加 `fromOtherCmd` 开关(RX-only 标记)                          |

### 6.3 v3 新增组件

| 组件              | 类型     | 责任                                                          |
| ----------------- | -------- | ------------------------------------------------------------- |
| **StatusRing** ⭐ | atomic   | 8px 状态环 (5 色: 绿/橙/红/灰/蓝)                            |
| **CardActionBar** ⭐ | atomic | 4 个固定 action (min/max/close/状态相关), 24×24 icon buttons   |
| **CardFooter** ⭐ | atomic   | 范围 + 告警文字 + 状态徽章 (底部 40px)                        |
| **DetailModal** ⭐ | layout   | 全屏 modal, 1440×90vh, 覆盖 dashboard                          |
| **DetailSubTabs** ⭐ | nav   | 4 sub-tab (实时/Modbus 通用/设备/查询状态)                     |
| **DetailToolbar** ⭐ | layout | 实时/历史 toggle + 图表类型 dropdown                          |
| **DetailChart** ⭐ | chart    | 200px 大图, 5 种 render 函数                                  |
| **DetailStats** ⭐ | layout   | Min/Max/Avg/N 4 列 stats 栏                                   |
| **ChartLine**      | chart    | 折线 render                                                    |
| **ChartBar**       | chart    | 柱状 render                                                    |
| **ChartArea**      | chart    | 面积 render                                                    |
| **ChartScatter**   | chart    | 散点 render                                                    |
| **ChartHistogram** ⭐ | chart  | 直方 render                                                    |
| **RxOnlyBadge** ⭐ | atomic   | "RX" 永久只读徽章 (右上角)                                    |

### 6.4 组件层级 (v3)

```
DashboardRoot
├── ModeSwitchBar
├── CommandPanel
│   └── CmdChip × N
├── KpiStrip
│   ├── KpiCard (96px 等高)
│   └── PairKpiCard
├── CardGrid
│   ├── CardDefault (200px 等高) × N
│   │   ├── StatusRing ⭐
│   │   ├── CardActionBar ⭐ (4 actions)
│   │   ├── Sparkline (60 点)
│   │   ├── CardFooter ⭐
│   │   └── RxOnlyBadge ⭐ (RX-only 时显示)
│   └── "+" 槽位
├── AlertDrawer
├── EditToolbar
├── EmptyState
└── DetailModal ⭐ (打开时覆盖)
    ├── DetailHeader
    ├── DetailSubTabs ⭐ (4 sub-tab)
    ├── DetailToolbar ⭐ (实时/历史 + 图表类型)
    ├── DetailChart ⭐ (200px, 5 种 render)
    └── DetailStats ⭐ (Min/Max/Avg/N)
```

## 7. 状态管理 (v3)

### 7.1 sub-state 结构

```javascript
state.dashboard = {
  // 模式
  active: false,
  editMode: false,
  detailMode: {                // ⭐ v3
    open: false,
    cardId: null,              // 哪张卡片进入 Detail
    subTab: 'realtime',        // 'realtime' | 'modbus-common' | 'device' | 'query-status'
    timeWindow: 'realtime',    // 'realtime' (60s) | 'history' (all)
    chartType: 'line'          // 'line' | 'bar' | 'area' | 'scatter' | 'histogram' ⭐
  },

  // 命令过滤
  cmdFilter: { mode: 'all', selectedCmdIds: [], selectedGroupId: null },

  // 引用 parser
  commands: null,
  cmdGroups: null,
  pairs: null,

  // KPI 配置
  kpiStrip: [
    { id: 'k1', kind: 'single', cmd, direction, field, title, unit, format, precision, alert },
    { id: 'k2', kind: 'pair', pairId, title }
  ],

  // 卡片配置 (v3 加 fromOtherCmd 标志) ⭐
  cards: [
    { id: 'c1',
      type: 'value',                    // 'value' | 'trend' | 'state' | 'composite' | 'pair'
      cmd, direction, field,
      fromOtherCmd: false,              // ⭐ v3
      title, unit, format, precision,
      alert: { upper, lower, level },
      actions: {
        min: true,                      // ⭐ 4 action 配置
        max: true,
        close: true,                    // 编辑模式生效
        statusAction: 'auto'            // 'auto' | 'send' | 'ack' | 'sync' | 'pause' | 'read-only'
      }
    },
    { id: 'c2', type: 'pair', pairId, ... },
    { id: 'c3',
      type: 'value', cmd, direction, field,
      fromOtherCmd: true,               // ⭐ RX-only
      ...
    }
  ],

  // 告警
  alerts: [...],
  cmdMismatchAlerts: [...],

  // 趋势数据 (key = cmd.field)
  trendData: {
    '0x01.cell_1_v': [{t, v}, ...],
    ...
  },

  // UI 临时态
  editingCardId: null,
  alertDrawerCollapsed: false
}
```

### 7.2 持久化 (沿用 v2)

`localStorage['serialweb:prefs'].dashboard`

新增字段 (v3 全部 optional, 兼容 v2):
- `cards[].fromOtherCmd`
- `cards[].actions.statusAction`
- `detailMode` (临时态, 不持久化)
- 新增 token `--success` 写入 DESIGN sidecar, 不在 dashboard state

### 7.3 导入导出

```json
{
  "type": "SerialWebUserConfig",
  "version": 3,                          // ⭐ bump
  "userConfig": {
    "settings": {...},
    "parser": { "commands": [...], "cmdGroups": [...], "pairs": [...] },
    "dashboard": {
      "kpiStrip": [...],
      "cards": [
        { ..., "fromOtherCmd": true, "actions": {...} }
      ]
    }
  }
}
```

v1/v2 兼容: 缺失 `fromOtherCmd` → 默认 `false`; 缺失 `actions` → 4 action 全部默认 `true` / `auto`。

## 8. 数据流 (v3)

### 8.1 沿用 v2 event bus

parser event bus payload: `{cmd, direction, name, value, type, timestamp}`

### 8.2 v3 新增: RX-only 写入保护

```javascript
// dashboard.writeGuard
function attemptWriteField(cardId, value) {
  const card = state.dashboard.cards.find(c => c.id === cardId);
  if (card.fromOtherCmd) {
    // 拒绝写入, 弹 toast
    showToast('RX-only 字段, 不可写入', 'warning');
    return false;
  }
  // 正常路径: TX 字段触发发送
  parser.sendFrame(card.cmd, { [card.field]: value });
  return true;
}
```

**所有写入入口** (4 个 action 中的"状态相关"按钮 / 编辑器 / 快捷键) 全部走 `attemptWriteField`。

### 8.3 v3 新增: Detail modal 数据流

```
点 action / 卡片主体
  │
  ▼
state.dashboard.detailMode.open = true
state.dashboard.detailMode.cardId = cardId
  │
  ▼
DetailModal 渲染
  │
  ├── DetailSubTabs 默认 'realtime'
  ├── DetailToolbar 默认 'realtime' / 'line'
  │
  ▼
用户切 sub-tab 'modbus-common'
  │
  ▼
数据源切换:
  - 'realtime' → trendData[cmd.field]
  - 'modbus-common' → parser.commands[cmdId].modbusCommon (parser 配置)
  - 'device' → state.deviceInfo
  - 'query-status' → state.parser.txStats
  │
  ▼
DetailChart 用新数据重渲染
  │
  ▼
用户切 chartType 'bar'
  │
  ▼
chart.renderBar() < 100ms 切换
```

### 8.4 渲染管线 (沿用 v2 + v3 detail 异步)

```
state 变化
  │
  ▼
dirty flags
  │
  ├── 普通卡: 立即同步更新
  ├── KPI strip: 立即同步更新
  ├── Detail modal (打开时): rAF 批量更新
  └── Detail 切换 sub-tab / chartType: 异步重渲染 < 100ms
```

## 9. UX 决策 (v3 重构)

### 9.1 普通卡 Action 行为 (v3 强约束) ⭐

固定 4 个 action, 从左到右:

| Action    | icon  | 行为                                    | 何时显示     |
| --------- | ----- | --------------------------------------- | ------------ |
| **min**   | `↓`   | 切到 60s 实时窗口                       | 始终         |
| **max**   | `↑`   | 切到全部历史                            | 始终         |
| **close** | `×`   | 关闭卡片(编辑模式生效)                  | 编辑模式     |
| **状态相关** | 动态 | 根据 cmd 上下文 + fromOtherCmd 动态     | 始终         |

**"状态相关" action 行为表 (v3 完整版)**:

| 卡片类型                       | icon    | 行为                                       | RX-only 行为 |
| ------------------------------ | ------- | ------------------------------------------ | ------------ |
| **TX (控制字段, 非 pair)**      | `↗`     | 触发一次发送 (parser.sendFrame)            | 禁用 (不该有 TX + RX-only) |
| **RX (数据字段, 有告警)**        | `✓`     | 确认告警 (alert.acked = true)              | 禁用, 改为只读图标 |
| **RX (数据字段, 正常)**         | `↻`     | 强制刷新 (trigger poll)                    | 禁用, 改为只读图标 |
| **Pair 卡**                    | `⇄`     | 进入 Pair Detail (Detail modal 锁字段)     | 不适用        |
| **轮询 cmd (非 manual)**        | `⏸` / `▶` | 暂停 / 恢复轮询                          | 禁用, 改为只读图标 |
| **fromOtherCmd=true (RX-only)** | `🔒`    | 只读, 点击无效 + tooltip "RX-only"          | (就是它本身) |

### 9.2 Detail 模式 (v3 新增) ⭐

#### 9.2.1 进入方式

- 点普通卡的"expand" action (上表中的状态相关 action)
- 或点卡片主体 (除 action 按钮外的任何区域)
- Detail 模式覆盖整个 dashboard, 不影响 CommandPanel 上下文(用户可随时关闭)

#### 9.2.2 4 Sub-tab 内容 (v3 完整定义) ⭐

| Sub-tab            | 数据源                                                | 渲染组件                  |
| ------------------ | ----------------------------------------------------- | ------------------------- |
| **实时**           | `state.dashboard.trendData[cmd.field]`                | DetailChart (60s 窗口)    |
| **通用 Modbus**    | `state.parser.commands[cmdId].modbusCommon`           | KeyValue 列表             |
| **设备**           | `state.deviceInfo` (VID/PID/版本/序列号/固件/协议)     | KeyValue 列表             |
| **查询状态**       | `state.parser.txStats[cmdId]` (发送/收到/错配/延迟)   | KeyValue 列表 + 小柱状    |

#### 9.2.3 实时/历史 Toggle

- 实时: 60s 滚动窗口, 数据持续刷新
- 历史: 全部历史, 静态显示 (用户可手动 "重新查询")

#### 9.2.4 图表类型 Dropdown (5 种) ⭐

| 类型        | render 函数        | 适用场景                  |
| ----------- | ------------------ | ------------------------- |
| 折线 (line)  | `chart.renderLine()`  | 默认, 连续趋势            |
| 柱状 (bar)   | `chart.renderBar()`   | 离散采样, 周期性数据      |
| 面积 (area)  | `chart.renderArea()`  | 折线 + 填充, 强调累计     |
| 散点 (scatter) | `chart.renderScatter()` | 稀疏数据, 异常点检测   |
| 直方 (histogram) | `chart.renderHistogram()` | 值分布, 找出离群值 |

切换 < 100ms, 复用 Canvas 2D, 仅替换 render 函数。

#### 9.2.5 Stats 栏 (4 列等宽)

- Min: 大数值 + 单位
- Max: 大数值 + 单位
- Avg: 大数值 + 单位
- N: 采样数

#### 9.2.6 退出方式

- 点 [×] 按钮
- 按 Esc
- 点 modal 外部 (灰色 backdrop)

### 9.3 状态环 5 色 (v3 新增) ⭐

| 状态            | 颜色     | token      | 触发                                  |
| --------------- | -------- | ---------- | ------------------------------------- |
| 正常 (Normal)   | 绿       | `--success` | 值在正常范围, 无告警                   |
| 警告 (Warning)  | 橙       | `--warning` | 越 warning 阈值                        |
| 异常 (Danger)   | 红       | `--danger`  | 越 danger 阈值                         |
| 离线 (Offline)  | 灰       | `--text-soft` | N 秒内无更新 (默认 5s)                |
| RX-only         | 蓝       | `--signal`  | fromOtherCmd=true (永久)               |

**关键**: 状态环颜色与告警边框**分离**。状态环表达"数据来源 / 实时状态", 告警边框 (card border) 表达"告警 level"。

```css
.card-default { border: 1px solid var(--border); }
.card-default.alert-warning { border-color: var(--warning); }
.card-default.alert-danger  { border-color: var(--danger); }
```

### 9.4 RX-only 实现 (v3 硬约束) ⭐

**视觉差异**:
- 状态环: 蓝 (永久)
- 右上角徽章: "RX" 9px mono 蓝底
- "状态相关" action: opacity 0.4, cursor not-allowed

**行为差异**:
- `attemptWriteField(cardId)` 检测 `fromOtherCmd=true` → 拒绝 + toast
- 编辑器开关: fromOtherCmd 开关在 RX-only 时**灰显, 不可切换**
- 保存配置: 校验 `fromOtherCmd=true` 时不允许配 `actions.statusAction` 为 `send`/`sync`/`pause` 等写入类

### 9.5 错误处理 (沿用 v2 + v3)

| 错误                    | UX                                                  |
| ----------------------- | --------------------------------------------------- |
| fromOtherCmd 写入尝试   | toast "RX-only 字段, 不可写入" + 不发起 sendFrame   |
| chartType 不支持 (e.g. histogram 但数据 < 2) | 顶部红条 "数据不足, 无法绘制直方图"           |
| Detail modal 数据为空   | "暂无数据" 空状态 + "重新查询" 按钮                 |

## 10. 实现路径 (v3 调整)

按 5 阶段, Phase 0 不变:

### Phase 0: parser v2 升级 (1-2 天, v2 已规划)

### Phase 1: 骨架 + 等高卡片 (1-2 天) ⭐ v3 重

- [ ] 普通卡 5 区域布局 (200px 等高)
- [ ] 状态环组件 (5 色)
- [ ] 4 action 组件
- [ ] CardFooter 组件
- [ ] 网格布局 (CSS Grid, 严格等高)

**Demo**: 普通卡 5 区域展示, 4 action 位置固定, 网格整齐

### Phase 2: 实时数据 + 状态环联动 (2 天)

- [ ] parser → dashboard 订阅
- [ ] 状态环颜色根据数据动态切换
- [ ] 告警边框 level 切换
- [ ] 60 点 sparkline 实时滚动

**Demo**: 普通卡随数据变化, 状态环 + 告警边框动态

### Phase 3: Detail 模式 + 4 sub-tab (2-3 天) ⭐ v3 重

- [ ] DetailModal 全屏
- [ ] DetailSubTabs (4 sub-tab)
- [ ] DetailToolbar (实时/历史 + 图表类型)
- [ ] DetailChart (5 种 render)
- [ ] DetailStats
- [ ] 4 sub-tab 数据源切换

**Demo**: 点普通卡 → Detail modal 展开, 切 sub-tab / chartType 都流畅

### Phase 4: RX-only + 写入保护 (1 天) ⭐ v3 重

- [ ] `fromOtherCmd` 字段加到 Field
- [ ] RxOnlyBadge 组件
- [ ] 4 action RX-only 视觉禁用
- [ ] `attemptWriteField()` 写入保护
- [ ] 编辑器 fromOtherCmd 开关
- [ ] 配置导入校验

**Demo**: RX-only 字段永远只读, 写入尝试被拒

### Phase 5: 配置 + 完善 (1-2 天)

- [ ] UserConfig v3 bump
- [ ] 旧版兼容
- [ ] 导入导出
- [ ] localStorage 持久化
- [ ] 错误处理完善

## 11. 风险与回滚

- **R1 (等高约束过强)**: 某些卡片内容太多塞不下 → 200px 是硬约束, 超出的进 Detail 模式
- **R2 (Detail modal 阻塞)**: 单 modal 模式, 关闭即销毁
- **R3 (5 种图表类型维护成本)**: 每种 render 50-100 行, 总共 250-500 行
- **R4 (RX-only 误判)**: 用户配错 fromOtherCmd → 编辑器加 tooltip 说明, 不允许盲改

## 12. 关联

- 上游: [需求文档 v3](./dashboard-requirements.md)
- 复用: [DESIGN.md](../DESIGN.md) / [PRODUCT.md](../PRODUCT.md) / [AGENTS.md](../AGENTS.md)
- 关联模块: [架构 §4 功能模块](./architecture.md#4-功能模块)
- 前置: Phase 0 parser v2 升级 (v2 规划)
