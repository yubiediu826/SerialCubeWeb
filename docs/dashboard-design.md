# SerialCube 仪表盘 - 方案文档

> 状态: v1 设计中 · 2026-08-03
> 路径: `docs/dashboard-design.md`
> 关联: [需求文档](./dashboard-requirements.md) · [PRODUCT.md](../PRODUCT.md) · [DESIGN.md](../DESIGN.md)

## 1. 概述

基于需求文档 [§4 范围](./dashboard-requirements.md#4-范围) 与 brainstorming 阶段选型, 本方案采用 **B 方案: 时间线 + KPI + 卡片**。

### 选型理由

| 选项             | 优势                                                  | 劣势                                | 选否 |
| ---------------- | ----------------------------------------------------- | ----------------------------------- | ---- |
| A. 看板式 Grid   | 灵活, 可拖放                                          | 实现复杂, 学习成本高                | 候选 |
| **B. 时间线 + KPI + 卡片** | 复用现有 timeline ribbon, 集成度高, 工程师熟悉模式 | 布局相对固定                        | **采用** |
| C. 终端风紧凑列表 | 紧凑, 适合多设备并列                                 | 信息密度高, 不适合大屏展示          | 候选 |
| D. A + C 混合   | 灵活 + 紧凑                                           | 实现两套 UI, 工作量 ×2              | 候选 |

B 方案集成度最高, 与现有 topbar timeline ribbon 自然衔接; KPI strip 是工程师熟悉的"监控大屏"模式, 零学习成本; 卡片网格 + 趋势可视化是行业标准(Grafana / Datadog / Node-RED Dashboard)。

## 2. 总体架构

### 三层结构

```
┌─────────────────────────────────────────────────────┐
│  视图层 (View)                                        │
│  - dashboard view (新模块)                          │
│  - 复用现有 panel / chart 渲染管线                  │
└─────────────────────────────────────────────────────┘
                        ↑ 读
┌─────────────────────────────────────────────────────┐
│  状态层 (State)                                       │
│  - state.dashboard (新增 sub-state)                  │
│  - 与 state.serial / state.parser 并列, 互不耦合    │
└─────────────────────────────────────────────────────┘
                        ↑ 订阅
┌─────────────────────────────────────────────────────┐
│  数据层 (Data)                                        │
│  - event bus: parser → dashboard                     │
│  - 复用 parser state.parserResults                   │
│  - 趋势数据: ring buffer per field                   │
└─────────────────────────────────────────────────────┘
```

### 模块边界

| 模块                | 责任                              | 输入                | 输出                |
| ------------------- | --------------------------------- | ------------------- | ------------------- |
| `dashboard.view`    | 渲染 KPI / 卡片 / 告警栏          | state.dashboard     | DOM                 |
| `dashboard.cards`   | 卡片 CRUD + 状态                  | 配置 JSON           | 卡片实例            |
| `dashboard.alerts`  | 阈值检测 + 告警生成               | parser 字段 + 阈值  | 告警事件            |
| `dashboard.trend`   | 滚动窗口 + sparkline 渲染         | 字段采样流          | Canvas              |
| `dashboard.config`  | 导入导出 + 持久化                 | user input          | JSON / localStorage |
| `parser.events`     | 解析结果推送 (新增)               | parser state        | event stream        |

## 3. UI 布局

### 3.1 区域划分

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar (复用)                                                │
│  [logo+status] [timeline ribbon]              [menu+version] │
├──────────────────────────────────────────────────────────────┤
│  Mode Switch Bar (新增第 3 项)                                 │
│  [监视] [解析] [仪表盘]                                       │
├──────────────────────────────────────────────────────────────┤
│  KPI Stat Strip  (高度 ≈ 96px)                                │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                          │
│  │V │ │I │ │T │ │SOC│ │SOH│ │P │ │E │                          │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                          │
├──────────────────────────────────────────────────────────────┤
│                                          │  Alert Drawer      │
│  Card Grid (主区, 3 列 × N 行, 响应式)    │  ┌─────────────┐  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │ 11:42:15    │  │
│  │ Cell 1  │ │ Cell 2  │ │ Cell 3  │    │  │ V > 4.2V   │  │
│  │ v3.71V  │ │ I 1.2A  │ │ T 25°C  │    │  │ DANGER     │  │
│  │ ▁▃▅▆▇  │ │ ▁▁▂▃▂  │ │ ▁▁▁▁▁  │    │  ├─────────────┤  │
│  └─────────┘ └─────────┘ └─────────┘    │  │ 11:40:02    │  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │ SOC < 20%  │  │
│  │ Cell 4  │ │ Cell 5  │ │ Cell 6  │    │  │ WARNING    │  │
│  └─────────┘ └─────────┘ └─────────┘    │  └─────────────┘  │
│                                          │  [折叠 ▼]         │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 响应式

| 断点           | KPI 数量      | 卡片列数 | 告警栏         |
| -------------- | ------------- | -------- | -------------- |
| ≥ 1600px       | 7             | 4        | 完整 (320px)   |
| 1280-1599px    | 5-7 (滚动)    | 3        | 完整 (280px)   |
| 1024-1279px    | 5 (滚动)      | 2        | 折叠 (60px)    |
| 720-1023px     | 3 (滚动)      | 1        | 折叠 (60px)    |
| < 720px        | 2 (滚动)      | 1        | 隐藏 / 底部 tab |

### 3.3 空状态 (无仪表盘配置)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                       ⚙  仪表盘                              │
│                                                              │
│        仪表盘是 SerialCube 的第三种工作模式                  │
│        把 parser 解析结果按业务卡片组织,实时显示             │
│                                                              │
│            ┌─────────────────────────┐                       │
│            │  + 创建我的第一个仪表盘 │                       │
│            └─────────────────────────┘                       │
│                                                              │
│        提示: 先在 [解析] 模式配置好 token 模板,              │
│             才能在仪表盘中选字段                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 4. 组件清单

### 4.1 复用现有 (从 DESIGN.md / SerialCube.html)

- `topbar` (logo, status-pill, mode-switch, timeline-block, system-menu)
- `panel` / `panel-head` / `panel-body`
- `primary-btn` / `secondary-btn` / `ghost-btn` / `icon-btn` / `danger-btn`
- `chip` (status, REC)
- 字体 / 颜色 / 圆角 / 间距全部复用 DESIGN.md token

### 4.2 新增组件 (dashboard 专属)

| 组件                   | 类型     | 责任                                |
| ---------------------- | -------- | ----------------------------------- |
| `DashboardRoot`        | layout   | 整体区域布局, 协调 KPI + Grid + Drawer |
| `KpiStrip`             | layout   | 一行 5-7 个 KPI 卡                  |
| `KpiCard`              | value    | 紧凑数值卡, 大字号当前值 + 标签 + 状态点 |
| `CardGrid`             | layout   | 卡片网格容器, 响应式列数            |
| `CardValue`            | value    | 数值卡                              |
| `CardTrend`            | trend    | 趋势卡 (含 sparkline)               |
| `CardState`            | state    | 状态卡                              |
| `CardComposite`        | composite| 复合卡 (多字段)                     |
| `Sparkline`            | chart    | 60px 高度迷你折线图                 |
| `AlertDrawer`          | layout   | 右侧告警栏, 实时滚动 + 可折叠      |
| `AlertItem`            | alert    | 单条告警                            |
| `CardEditor`           | editor   | 卡片编辑器 (右侧抽屉)               |
| `FieldPicker`          | editor   | 字段选择下拉 (从 parser token 列表) |
| `ThresholdEditor`      | editor   | 阈值编辑 (上限/下限/范围)            |
| `EmptyState`           | state    | 空状态引导                          |
| `EditToolbar`          | editor   | 编辑模式底部工具栏                  |

### 4.3 组件层级

```
DashboardRoot
├── ModeSwitchBar (复用 + 第 3 项)
├── KpiStrip
│   └── KpiCard × 5-7
├── CardGrid
│   ├── CardValue / CardTrend / CardState / CardComposite
│   │   └── Sparkline (CardTrend 用)
│   └── "+" 槽位 (编辑模式)
├── AlertDrawer
│   └── AlertItem × N
├── CardEditor (编辑模式右侧抽屉)
│   ├── FieldPicker
│   ├── ThresholdEditor
│   └── TypePicker
├── EditToolbar (编辑模式底部)
└── EmptyState (无配置时)
```

## 5. 状态管理

### 5.1 sub-state 结构

```javascript
state.dashboard = {
  // 模式开关
  active: false,              // 是否当前在 dashboard 模式
  editMode: false,            // 是否在编辑模式

  // KPI 配置
  kpiStrip: [
    { id: 'k1', title: '总压', field: 'pack_voltage', unit: 'V', format: 'decimal', precision: 2,
      alert: { upper: null, lower: 40.0, level: 'warning' } },
    ...
  ],

  // 卡片配置
  cards: [
    { id: 'c1', type: 'value', title: 'Cell 1 电压', field: 'cell_1_voltage', unit: 'V', format: 'decimal', precision: 3,
      alert: { upper: 4.2, lower: 2.8, level: 'danger' } },
    { id: 'c2', type: 'trend', title: 'Cell 1 电压趋势', field: 'cell_1_voltage', unit: 'V', trendWindow: '10min',
      alert: { upper: 4.2, lower: 2.8, level: 'danger' } },
    ...
  ],

  // 告警
  alerts: [
    { id: 'a1', timestamp: 1722657735, field: 'cell_1_voltage', value: 4.21, threshold: 4.2, side: 'upper', level: 'danger',
      cardId: 'c1', acked: false, state: 'active' }
  ],

  // 趋势数据 (ring buffer per field)
  trendData: {
    'cell_1_voltage': [
      { t: 1722657700, v: 3.71 },
      { t: 1722657701, v: 3.72 },
      ...
    ]
  },

  // UI 临时态
  editingCardId: null,         // 当前正在编辑哪张卡
  alertDrawerCollapsed: false,
  selectedField: null,         // 字段选择器的当前选择

  // 配置 dirty 标记
  configDirty: false
}
```

### 5.2 持久化

- 路径: `localStorage['serialweb:prefs'].dashboard` (复用现有 key)
- 频率: 500ms debounce(沿用 `LOCAL_PREFS_DEBOUNCE_MS`)
- 内容: 整个 `state.dashboard`(除 trendData 外)
- trendData **不持久化**(内存态, 页面刷新后丢失是预期行为)
- alerts 不持久化(同上, 重启后告警历史归零)

### 5.3 导入导出

复用 SerialWebUserConfig 体系:

```json
{
  "type": "SerialWebUserConfig",
  "version": 1,
  "userConfig": {
    "settings": { ... },
    "modules": { ... },
    "parser": { ... },
    "dashboard": {
      "kpiStrip": [...],
      "cards": [...]
    }
  }
}
```

- 导出: 整个 userConfig(沿用现有 `copy-user-config-btn`)
- 导入: 解析后赋给 state, dashboard 字段单独赋给 `state.dashboard`
- 兼容性: dashboard 字段缺失时(旧 config), 自动用空配置

## 6. 数据流

### 6.1 parser → dashboard 单向订阅

```
parser state.parserResults ───► event bus ───► dashboard subscriber
                                                       │
                                                       ▼
                                                alert 检测
                                                       │
                                                       ▼
                                                trend 写入
                                                       │
                                                       ▼
                                                触发重渲染
```

**关键**: dashboard 只读 parser, 不反向通知。parser 不知道 dashboard 存在, 解耦。

### 6.2 渲染管线

```
state 变化 ───► 标记 dirty ───► requestAnimationFrame
                                          │
                                          ▼
                                    批量更新 DOM
                                          │
                                          ▼
                                    Canvas 重绘 sparkline
```

- 不用 React/Vue, 沿用现有命令式 DOM 更新 + classList.toggle 模式
- 50 卡片场景下, 每次更新全部 toggle 仍有性能问题 → 用 dirty flag, 只更新变化的卡片
- sparkline 单独走 requestAnimationFrame, 不阻塞主线程

### 6.3 阈值检测

```
parser 字段值 ───► 遍历卡片阈值规则
                         │
                         ▼
                  触发? + 1s debounce
                         │
                  ┌──────┴──────┐
                  ▼             ▼
              触发新告警     值回正 → 标记 "recovered"
                  │             │
                  ▼             ▼
            alert state      alert state
              'active'        'recovered'
                  │             │
                  └──────┬──────┘
                         ▼
                   写 alert 列表
                         │
                         ▼
                   重渲染告警栏 + 卡片
```

## 7. 与 parser 集成

### 7.1 集成点

- **数据源**: `state.parser.results` (现有)
- **触发点**: parser 解析完成时(每次新 token 流)
- **数据形状**: `[{ name, value, type, ... }]`
- **仪表盘订阅**: 监听 parser state 变化(沿用现有 mutation observer pattern)

### 7.2 字段匹配规则

- 用户在 dashboard 配置字段名, e.g. `cell_1_voltage`
- parser 输出的 `name` 与之精确匹配(大小写敏感)
- 不匹配时, 卡片显示 "—" 灰色文字 + 提示"无数据"
- 多个 token 同名时(罕见), 取最新

### 7.3 集成边界

- **dashboard 不修改 parser 任何 state**
- **parser 不感知 dashboard 存在**
- **两者通过 state bridge 解耦**

## 8. UX 决策

### 8.1 模式切换

- **决策**: 切换时**保留** dashboard state,不销毁
- **理由**: 工程师可能在 monitor / parser / dashboard 三者间频繁切换,销毁会丢失当前工作
- **例外**: 切到 dashboard 但 state.dashboard.active 是 false 时,首次进入显示空状态

### 8.2 卡片编辑器位置

- **决策**: 右侧抽屉(280-320px)
- **理由**: 工程师熟悉"点卡片 → 右侧出详情"的模式(Grafana / VS Code Settings)
- **备选**: inline 编辑(更紧凑但易误操作)

### 8.3 告警交互

- **触发**:
  - 卡片边框变 `var(--danger)`(0.5s 渐入)
  - KPI 背景 tint `rgba(224, 87, 94, 0.14)` (警告) 或 `rgba(224, 87, 94, 0.20)` (严重)
  - 告警栏顶部新增 AlertItem(从顶部滑入 200ms)
- **点击告警**: 滚动到对应卡片, 卡片 1s 闪烁(2 次渐变 0→1→0)
- **确认**:
  - AlertItem 右下角 "✓" 按钮
  - 确认后从 active 移到 history (告警栏底部"已确认"折叠区)
  - 卡片边框颜色回退(但值仍异常, 数字仍红)
- **持续**: 持续显示, 不自动消失, 除非用户确认或值回正
- **值回正**:
  - 卡片边框回退正常
  - 告警标记 "recovered", 在 history 区显示

### 8.4 编辑模式

- **进入**: 右上角齿轮按钮 → 编辑模式
- **视觉**:
  - 所有卡片右上角 "×" 删除按钮(可点)
  - 卡片右上角 "✎" 编辑按钮(打开 CardEditor)
  - 卡片网格空白处显示 "+" 槽位
  - 底部 EditToolbar: [添加 KPI] [添加卡] [完成编辑] [导入] [导出] [清空]
- **退出**: 点 "完成编辑" 或按 Esc
- **自动保存**: 任何编辑立即写入 state + 500ms 后持久化

### 8.5 趋势窗切换

- **决策**: 卡片级别配置, 全局不共享
- **理由**: 不同字段需要不同时间窗(电压看 1min, 温度看 10min)
- **未来扩展**: 全局时间窗选择器(放 v2)

### 8.6 错误处理

| 错误情况               | UX                                           |
| ---------------------- | -------------------------------------------- |
| parser 未配置          | 空状态引导: "请先在 [解析] 模式配置 token 模板" |
| parser 字段不存在      | 卡片显示 "—" 灰色 + tooltip "无数据"          |
| parser 解析失败        | 整仪表盘冻结(不刷新), 顶部 banner "数据源错误" |
| localStorage 写入失败  | 顶部 toast "配置保存失败, 检查浏览器存储"     |
| 卡片配置 JSON 损坏     | 导入时拒绝, 提示"配置不兼容, 已保留旧配置"    |

## 9. 设计 Token 复用

完全沿用 [DESIGN.md](../DESIGN.md), 不新增 token。

### 引用清单

- 颜色: `accent` / `signal` / `warning` / `danger` / `bg` / `text` / `border` (含 dark 变体)
- 字体: `display` / `title` / `body` / `label` / `micro` / `mono`
- 圆角: `sm 10px` / `md 14px` / `pill 999px`
- 间距: `gap 10px` / `pad-sm 6px` / `pad-md 12px` / `pad-lg 16px` / `header 52px`
- 阴影: `ambient-soft` / `hover-soft` / `no-shadow-rest`

### 8 条 Named Rules 继承

1. The Indigo Rarity Rule — 仪表盘只用 1 个 accent, KPI + 卡片编辑按钮 + 选中态各占 1 处
2. The One Status Color Per Moment Rule — 每张卡同时只 1 个状态色
3. The Mono Reservation Rule — 数值 / 字段名一律 mono, KPI 标签 sans
4. The Weight-Over-Size Rule — KPI 大字号 800 weight, 不靠 size 堆视觉
5. The Stable Header Rule — topbar 不变, mode-switch 取代 timeline 在 dashboard 模式的部分
6. The Sidebar Equality Rule — 告警栏是平等 region, 不是 sidebar
7. The Flat-By-Default Rule — 卡片无 shadow, 仅 alert 触发时 border 变红
8. The Tinted Shadow Rule — modal/抽屉用 ambient-soft, 卡片永远 no-shadow

## 10. 实现路径

按 3 阶段, 每阶段独立可演示:

### Phase 1: 骨架 (建议 1-2 天)

- [ ] topbar mode-switch 加第 3 项 "仪表盘"
- [ ] state.dashboard 初始结构
- [ ] DashboardRoot 布局占位
- [ ] KpiStrip + KpiCard 静态渲染
- [ ] CardGrid + 4 种卡类型静态渲染
- [ ] AlertDrawer 占位(空列表)
- [ ] EmptyState
- [ ] 模式切换 transition

**Demo**: 切到 dashboard 看空状态 + 占位卡, 可切回 parser

### Phase 2: 实时数据 (建议 2-3 天)

- [ ] parser → dashboard 订阅管线
- [ ] 数值卡实时刷新
- [ ] 趋势卡 sparkline 渲染(Canvas 2D 复用)
- [ ] 趋势数据 ring buffer
- [ ] 数值格式化(整数/小数/百分比/十六进制/二进制)

**Demo**: 配好 parser, dashboard 数值实时动, 趋势线画出来

### Phase 3: 告警 + 配置 (建议 2-3 天)

- [ ] 阈值检测
- [ ] 告警生成 + 去抖
- [ ] AlertItem 渲染
- [ ] 告警栏折叠
- [ ] 告警确认 + history
- [ ] CardEditor (右侧抽屉)
- [ ] FieldPicker / ThresholdEditor
- [ ] EditToolbar
- [ ] 卡片 CRUD
- [ ] 导入导出 (复用 SerialWebUserConfig)
- [ ] localStorage 持久化

**Demo**: 阈值触发, 卡片变红, 告警栏弹出, 编辑模式加卡, 导出导入 config

## 11. 风险与回滚

- **R1 (状态污染)**: 若 dashboard state 污染 parser, 立即回滚 Phase 1
- **R2 (性能崩塌)**: 若 50 卡 60fps 不达标, 引入 virtualization(virtual scrolling)
- **R3 (数据丢失)**: 若 localStorage 写入冲突, 加 try-catch + 顶部 banner

## 12. 关联

- 上游: [需求文档](./dashboard-requirements.md)
- 复用: [DESIGN.md](../DESIGN.md) / [PRODUCT.md](../PRODUCT.md) / [AGENTS.md](../AGENTS.md)
- 关联模块: [docs/architecture.md §4 功能模块](./architecture.md#4-功能模块) 的 parser / chart / timeline 子系统
