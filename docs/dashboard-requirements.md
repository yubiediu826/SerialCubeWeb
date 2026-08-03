# SerialCube 仪表盘 - 需求文档 v2

> 状态: v2 重新设计中 · 2026-08-03
> 路径: `docs/dashboard-requirements.md`
> 关联: [PRODUCT.md](../PRODUCT.md) · [DESIGN.md](../DESIGN.md) · [方案文档](./dashboard-design.md) · [架构](./architecture.md)
> 上一版: v1 (2026-08-03) — 因"多命令 + 主从方向"模型缺失被推翻, 见 §11 重构说明

## 1. 概述

SerialCube 当前支持两种工作模式:

1. **裸监视模式 (Monitor)**: 原始字节流 / 文本监视
2. **字节解析模式 (Parser)**: 通过 token 模板把字节流解析成结构化字段

第三种模式 **仪表盘 (Dashboard)** 面向 **业务语义层**。v1 设计漏掉了工业协议的核心特征——**多命令 + 主从方向 + 设定-实际配对**——v2 重构。

**v2 核心变化**: 把**协议命令 (Command)** 作为第一公民建模。每张卡片、KPI、告警、趋势都绑定**具体的命令 ID + 方向 (tx/rx)**,而不是裸字段名。

## 2. 协议模型 (v2 新增)

### 2.1 三层结构

```
Protocol
├── Command 0x01: Read Voltage (rx - 主机查询, 从机响应)
│   ├── frame_type: query
│   ├── fields: [cell_1_v, cell_2_v, ..., cell_16_v]
│   └── cadence: 200ms (轮询)
│
├── Command 0x02: Read Current (rx)
│   ├── frame_type: query
│   ├── fields: [pack_i, cell_avg_i]
│   └── cadence: 500ms
│
├── Command 0x10: Control Charge (tx - 主机发送)
│   ├── frame_type: control
│   ├── fields: [charge_v_set, charge_i_set, charge_enable]
│   └── trigger: manual / on_event
│
└── Command 0x11: Control Discharge (tx)
    ├── frame_type: control
    ├── fields: [discharge_v_set, discharge_i_set, discharge_enable]
    └── trigger: manual / on_event
```

### 2.2 关键概念

| 概念            | 含义                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| **Command**     | 协议中一条指令,有 `cmd_id` (0-255)、`name`、`direction` (tx/rx)、`cadence` |
| **Direction**   | `tx` = 主机→设备 (控制) / `rx` = 设备→主机 (数据响应)                     |
| **Field**       | 帧内字段,隶属于某个 Command,有 `name`、`type`、`unit`                       |
| **Setpoint**    | 控制字段(tx 方向),表示"我打算让设备做啥"                                    |
| **Telemetry**   | 数据字段(rx 方向),表示"设备实际做了啥"                                      |
| **Pair**        | 一对 Setpoint + Telemetry,同一物理量(如 charge_v_set ↔ pack_v)             |
| **Command Group** | 多条 Command 归类(如"电压组"含 0x01+0x02)                                |

### 2.3 v1 → v2 字段表达对比

```diff
-  { id: 'k1', field: 'cell_1_voltage', unit: 'V' }
+  { id: 'k1', cmd: 0x01, direction: 'rx', field: 'cell_1_v', unit: 'V' }
+
+  { id: 'k1-set', cmd: 0x10, direction: 'tx', field: 'charge_v_set', unit: 'V',
+    label: '充电设定' }
+  { id: 'k1-act', cmd: 0x01, direction: 'rx', field: 'cell_avg_v', unit: 'V',
+    label: '实际电压' }
```

## 3. 用户与场景

### 主用户

嵌入式 / 硬件方向工程师(3-10 人团队), 工作在 BMS / EMS / PCS 等多命令协议调试一线。详见 [PRODUCT.md §Users](../PRODUCT.md)。

### 典型场景 (v2 重写)

#### 场景 1: 充电控制调试
- 主机发命令 `0x10 Control Charge`, payload: `{charge_v_set: 56.0, charge_i_set: 10.0, charge_enable: 1}`
- 设备响应命令 `0x80 Charge Ack`, payload: `{status: 0x00, error_code: 0}`
- 工程师在 dashboard 看:
  - KPI: **设定 56.0V / 实际 55.8V / 误差 0.2V** (设定-实际对比一目了然)
  - 卡片: 充电功率趋势(10min), 设定线 560W + 实际线 558W 双线
  - 告警: 实际电流 > 10.5A → 红色

#### 场景 2: 多命令并发监控
- 设备同时跑 6 条命令:
  - `0x01 Read Voltage` 每 200ms
  - `0x02 Read Current` 每 500ms
  - `0x03 Read Temp` 每 1s
  - `0x04 Read SOC/SOH` 每 5s
  - `0x10 Control Charge` 手动
  - `0x11 Control Discharge` 手动
- 工程师用 command group "实时数据组" (含 0x01/0x02/0x03), KPI strip 只看这个组
- 切到 command group "控制组" (0x10/0x11), 看设定值历史

#### 场景 3: 命令匹配 / 错配诊断
- 主机发了 `0x10`, 但收到的是 `0x81` (不是预期的 `0x80 Ack`)
- 工程师在告警栏看到: "cmd 0x10 期望响应 0x80, 实际收到 0x81" → 排查协议 bug

### 当前痛点 (v1 没解决的)

- 字段名冲突: 多个命令可能有同名字段(如 `status`), v1 没法区分
- 设定 vs 实际割裂: 工程师要在 tx/rx 两个流之间手动对照
- 多命令轮询时序: v1 KPI 同时显示不同时刻的字段值, 看起来"乱跳"

## 4. 目标与成功指标

| ID  | 目标                                | 衡量                                            |
| --- | ----------------------------------- | ----------------------------------------------- |
| G1  | 5 分钟内配置好仪表盘(多命令场景)   | 多命令配置 task completion time                 |
| G2  | 实时刷新 ≤ 100ms                   | rx 命令响应 → dashboard render                  |
| G3  | 告警 ≤ 500ms                        | 阈值越过 → 卡片变红                             |
| G4  | 设定-实际对比 < 200ms              | tx 发送 → KPI 对比更新                          |
| G5  | 100 张卡片渲染流畅                  | 主线程 ≥ 60fps                                  |
| G6  | 多命令路由错误 < 0.1%              | cmd 路由失败次数 / 总消息数                     |
| G7  | 命令错配检测 ≥ 99%                 | 收到非预期 cmd 时的告警触发率                   |

## 5. 范围

### 5.1 In Scope (v2)

- **协议命令模型** (FR-CMD):
  - Command 列表定义(name, cmd_id, direction, cadence, fields)
  - Command Group(多命令归类)
  - Field Pair(设定-实际配对)
- **模式切换**: topbar mode-switch 加 "仪表盘" 选项
- **4 种基础卡片**: 数值 / 趋势 / 状态 / 复合
- **KPI stat strip**: 5-7 紧凑值,可选 "设定-实际" 双值布局
- **字段绑定**: **绑定 cmd_id + direction + field_name**(不是裸 field)
- **命令感知**: 卡片显示 cmd_id 徽章;KPI strip 可按 cmd / cmd group 过滤
- **设定-实际对比卡 (Pair Card)**: 新增第 5 种卡片,专门用于对比
- **告警**: 阈值规则(上限/下限/范围/状态匹配),告警栏显示 cmd_id
- **趋势**: 1min / 10min / 全程, 60px sparkline,**支持双线(设定+实际)**
- **命令错配告警**: 期望 cmd_id vs 实际 cmd_id 不一致时触发
- **配置导入导出**: 复用 SerialWebUserConfig 体系, **新增 dashboard.commands / dashboard.cmdGroups / dashboard.pairs**
- **浅深双主题 / 中英双语**

### 5.2 Out of Scope (v2)

- 业务语义预置(电池/储能模板)— 仍是 generic
- AI 异常检测
- 远程告警(邮件/钉钉)
- 多仪表盘 profile 切换
- 卡片拖放重排 (v2 后续)
- 命令冲突自动仲裁(命令间互斥逻辑,如"充电时不能放电")
- 复杂复合表达式(`set + actual * 0.95`)

## 6. 功能需求

### 6.1 协议命令模型 (FR-CMD)

- **FR1.1**: Command 定义数据形状
  ```ts
  Command = {
    cmdId: 0x01,                  // 1 字节命令 ID
    name: 'Read Voltage',         // 显示名 (i18n)
    direction: 'rx',              // 'tx' (host→device) | 'rx' (device→host)
    frameType: 'query',           // 'query' (轮询) | 'control' (手动/事件触发) | 'event' (设备主动上报)
    cadence: 200,                 // 轮询周期 (ms); 0 = 手动
    fields: [
      { name: 'cell_1_v', type: 'float32', unit: 'V', precision: 3 },
      ...
    ],
    expectResponse: 0x80,         // 期望响应 cmd_id; 错配告警
    enabled: true                 // 是否在仪表盘中启用
  }
  ```
- **FR1.2**: Command Group 定义
  ```ts
  CmdGroup = { id: 'voltage', name: '电压组', cmdIds: [0x01, 0x02, 0x04] }
  ```
- **FR1.3**: Field Pair 定义(setpoint-telemetry 配对)
  ```ts
  Pair = {
    id: 'charge_v',
    name: '充电电压',
    setpoint: { cmd: 0x10, field: 'charge_v_set' },
    telemetry: { cmd: 0x80, field: 'pack_v' },
    unit: 'V',
    alert: { tolerance: 0.5 }   // 差值 > 0.5V 告警
  }
  ```
- **FR1.4**: Command / Group / Pair 列表从 parser 配置继承(v2 增强 parser)
  - parser 配置里定义 command 表
  - dashboard 直接引用, 不重复定义
- **FR1.5**: Command 列表可在 dashboard 顶部"命令面板"折叠/展开

### 6.2 模式切换 (FR-MODE)

- **FR2.1**: topbar mode-switch 加第三个按钮 "仪表盘"
- **FR2.2**: 切换时保留 monitor / parser 状态, 不销毁
- **FR2.3**: 切到 dashboard 时, 默认显示空状态(无仪表盘配置)或最后一次的仪表盘
- **FR2.4**: 切回 monitor / parser 时, 状态完整恢复

### 6.3 卡片系统 (FR-CARD)

- **FR3.1**: 5 种卡片类型:
  - **数值卡 (Value)**: 单一字段,大字号
  - **趋势卡 (Trend)**: 单一字段,含 60px sparkline
  - **状态卡 (State)**: 状态码,颜色编码
  - **复合卡 (Composite)**: 多字段(avg/max/min)
  - **对比卡 (Pair)** ⭐v2 新增: 显示设定-实际配对,大字号差值,双线 sparkline
- **FR3.2**: 字段绑定改为 `(cmd, direction, field_name)` 三元组
  ```ts
  Card = {
    id: 'c1',
    type: 'pair',
    pair: 'charge_v',          // 引用 FR1.3 的 Pair
    title: '充电电压',
    trendWindow: '10min',
    alert: { tolerance: 0.5, level: 'warning' }
  }
  ```
- **FR3.3**: 卡片显示 cmd_id 徽章(右下角小标签)
  - 例: `0x01 rx` / `0x10 tx`
  - 配色: rx 用 `--signal`, tx 用 `--accent`
- **FR3.4**: 数值格式化(同 v1): 整数/小数/百分比/十六进制/二进制
- **FR3.5**: 单位显示(同 v1)
- **FR3.6**: 阈值告警(同 v1,但阈值规则附在 Pair / Card 上,字段带 cmd 上下文)
- **FR3.7**: 单仪表盘 ≤ 50 卡片

### 6.4 KPI Stat Strip (FR-KPI)

- **FR4.1**: 5-7 紧凑数值卡, 一行布局
- **FR4.2**: KPI 过滤
  - 顶部"命令面板"下拉: 全部 / 选中 cmd / 选中 cmd group
  - 选中后, KPI strip 只显示该范围内的卡片
- **FR4.3**: 对比型 KPI (Pair KPI) ⭐v2 新增
  - 显示 "设定 56.0V / 实际 55.8V / 误差 0.2V"
  - 误差 > 阈值时高亮 `--warning` 或 `--danger`
- **FR4.4**: 触发告警的 KPI 高亮

### 6.5 趋势可视化 (FR-TREND)

- **FR5.1**: 3 档时间窗: 1min / 10min / 全程
- **FR5.2**: 60px 高度 sparkline
- **FR5.3**: 双线趋势 ⭐v2 新增
  - 对比卡的趋势区显示两条线(设定=虚线,实际=实线)
  - 颜色: 设定用 `--text-soft`,实际用 `--accent`
- **FR5.4**: 阈值线(虚线, 用户配置时显示)
- **FR5.5**: 鼠标悬停显示具体数值
- **FR5.6**: 趋势数据滚动窗口, 每字段 1000 采样点 LRU

### 6.6 告警 (FR-ALERT)

- **FR6.1**: 阈值规则触发后, 卡片 + KPI 立即变红
- **FR6.2**: 告警栏每条告警显示:
  - 时间
  - **cmd_id + direction 徽章** ⭐v2 新增
  - 字段名
  - 当前值
  - 阈值 / 配对差值
  - 严重等级
- **FR6.3**: 告警可点击定位到对应卡片
- **FR6.4**: 告警可确认(acknowledge)
- **FR6.5**: 告警等级: warning(橙) / danger(红)
- **FR6.6**: 1s debounce
- **FR6.7**: 告警栏可折叠
- **FR6.8**: **命令错配告警** ⭐v2 新增
  - 主机发了 cmd 0x10, 期望响应 0x80
  - 收到 0x81 → 告警: "cmd 0x10 响应错配: 期望 0x80, 收到 0x81"
  - 严重等级默认 danger

### 6.7 配置 (FR-CONFIG)

- **FR7.1**: JSON 导入/导出(复用 SerialWebUserConfig)
  ```json
  {
    "type": "SerialWebUserConfig",
    "version": 1,
    "userConfig": {
      ...
      "dashboard": {
        "commands": [ ... ],      // ⭐ v2 新增
        "cmdGroups": [ ... ],     // ⭐ v2 新增
        "pairs": [ ... ],         // ⭐ v2 新增
        "kpiStrip": [ ... ],
        "cards": [ ... ]
      }
    }
  }
  ```
- **FR7.2**: localStorage 持久化(`serialweb:prefs.dashboard`)
- **FR7.3**: 卡片编辑器
  - 字段选择前先选 cmd(或选 Pair)
  - 阈值设置同 v1
  - 趋势窗同 v1

## 7. 非功能需求

- **NFR1**: rx 实时刷新 ≤ 100ms
- **NFR2**: 100 张卡片渲染流畅
- **NFR3**: 趋势数据 < 5MB / 字段
- **NFR4**: 模式切换 < 200ms
- **NFR5-NFR7**: 暗色 / 双语 / Chromium(同 v1)
- **NFR8**: 命令路由事件不阻塞主线程(异步 event bus)
- **NFR9**: 单文件 HTML 原则

## 8. 约束

- 复用 DESIGN.md token(8 条 Named Rules 全部继承)
- 复用 PRODUCT.md 约束(单文件 / Chromium / 数据兼容性)
- **parser 配置是 command 表的 source of truth**;dashboard 引用之, 不重新定义
- 复用 SerialWebUserConfig 体系, version bump 到 v2
- 数据兼容性字段不破坏(旧 userConfig 仍可解析,dashboard 字段缺失时为空)

## 9. 风险与缓解

| ID  | 风险                                | 缓解                                                  |
| --- | ----------------------------------- | ----------------------------------------------------- |
| R1  | Command 列表膨胀 → UI 杂乱         | Command Group 分组 + 可折叠;KPI 按 group 过滤        |
| R2  | 多命令并发 → 事件乱序              | Event bus 按 cmd_id + timestamp 排序;主线程单消费者 |
| R3  | 同名字段冲突(多命令)               | 字段全名 = `cmd.field`,不靠裸 name                    |
| R4  | 设定-实际配对错配                  | Pair 定义独立,Card 引用 Pair, 配对关系不重复          |
| R5  | 命令错配漏报                      | 收到非预期 cmd → 立即告警, 不依赖业务字段解析         |
| R6  | Card 数量过多 + Pair 渲染负担      | 软限制 50 卡;Pair 趋势用 2 个 sparkline(不开双倍)   |
| R7  | parser 配置 v1 → v2 升级         | 旧 parser config 兼容,command 字段为空时降级到 v1 模型 |

## 10. 开放问题

- **O1**: v2 是否含"卡片拖放重排"? — 仍建议 v2 后续
- **O2**: 多仪表盘 profile? — 仍建议 v2 后续
- **O3**: 告警声音? — v2 可选,Web Audio API beep
- **O4**: 复合卡表达式范围? — v2 仅 avg/max/min + 设定-实际配对
- **O5**: 编辑器位置 — **已选右侧抽屉**
- **O6**: 趋势数据导出? — v2 导出 CSV
- **O7** ⭐: parser v2 是否同步升级? — Command 表应在 parser 配, dashboard 引用
- **O8** ⭐: UserConfig 是否 bump 到 v2? — 建议, 加新字段为 optional 兼容 v1
- **O9** ⭐: 命令错配告警是否默认开启? — 建议默认开, 用户可关

## 11. 重构说明 (v1 → v2)

v1 设计漏掉了工业协议的核心特征, 关键缺陷:

| 缺陷                                | 影响                                  | v2 修复                          |
| ----------------------------------- | ------------------------------------- | -------------------------------- |
| 字段绑定是裸 `field_name`            | 跨命令同名字段冲突无法区分            | `(cmd, direction, field)` 三元组 |
| 没有命令模型                        | 多命令并发无法路由                    | Command 第一公民                  |
| 没有 tx / rx 方向                   | 控制字段和数据字段混在一起            | direction 标签 + 配色区分        |
| 没有设定-实际配对                    | 工程师看不到"我设了 vs 实际跑"        | Pair Card + Pair KPI + 双线趋势  |
| 没有命令错配检测                    | 协议 bug 排查难                      | FR6.8 期望响应 vs 实际响应       |
| 告警无 cmd 上下文                    | 多个命令同时告警时分不清              | 告警栏加 cmd_id + direction 徽章 |
| KPI 不能按命令过滤                  | 多命令场景下 KPI 跳变                  | FR4.2 命令面板下拉过滤           |

v1 的需求文档和方案文档已被 v2 覆盖。架构分析 (docs/architecture.md) 不变, dashboard 模块尚未实现。
