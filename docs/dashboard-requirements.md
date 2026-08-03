# SerialCube 仪表盘 - 需求文档 v3

> 状态: v3 重新设计中 · 2026-08-03
> 路径: `docs/dashboard-requirements.md`
> 关联: [PRODUCT.md](../PRODUCT.md) · [DESIGN.md](../DESIGN.md) · [方案文档](./dashboard-design.md) · [架构](./architecture.md)
> 上一版: v2 (2026-08-03) — UI 规范被推翻, 见 §12 重构说明

## 1. 概述

v2 在协议模型 (Command / Direction / Pair) 上对了, 但 **UI 形态没落地**:
- 卡片高度不统一, 排版难
- 没有"普通 vs Detail"双模式
- 缺少详细分析视图 (4 sub-tab)
- RX-only 字段没有强制只读保护

v3 重构 UI 规范:
- **等高等宽**卡片(高度统一, 网格整齐)
- **普通 / Detail** 双模式 (普通: 紧凑概览, Detail: 全屏分析)
- **Detail 模式 4 sub-tab**: 实时 / 通用 Modbus / 设备 / 查询状态
- **图表类型可切换**: 折线 / 柱状 / 面积 / 散点 / 直方
- **RX-only 永久只读** (`fromOtherCmd=true`)

协议模型 v2 (Command / Direction / Pair) 全部保留, 延用 [DESIGN.md](../DESIGN.md) 设计语言 ("The Engineer's Workbench")。

## 2. 协议模型 (沿用 v2)

v2 的协议模型是底层 truth, v3 不动它:
- **Command** (cmdId, direction, frameType, cadence, fields, expectResponse)
- **Command Group** (跨多 cmd 归类)
- **Field Pair** (setpoint ↔ telemetry)
- **direction** (tx = 主机控制, rx = 设备数据)
- **expectResponse** (rx 命令的期望响应 cmdId, 错配检测用)

详见 [v2 需求文档 §2](./dashboard-requirements.md#2-协议模型-v2-新增) (但 v2 文件已被 v3 覆盖, 关键定义见 [方案 v3 §2](./dashboard-design.md#2-协议模型-沿用-v2))。

## 3. 用户与场景 (沿用 v2, 略)

详见 [v2 §3](./dashboard-requirements.md#3-用户与场景)。

## 4. 目标与成功指标 (v3 调整)

| ID  | 目标                                 | 衡量                                  |
| --- | ------------------------------------ | ------------------------------------- |
| G1  | 5 分钟内配置好仪表盘                | task completion time                   |
| G2  | 实时刷新 ≤ 100ms                    | rx → dashboard render                  |
| G3  | 告警 ≤ 500ms                        | 阈值越过 → 状态环变红                  |
| G4  | 设定-实际对比 < 200ms               | tx 发送 → KPI 同步                     |
| G5  | 50 张等高卡片网格渲染流畅            | 主线程 ≥ 60fps                          |
| G6  | **Detail 模式 < 200ms 进入**        | 点 action → 大图渲染完成               |
| G7  | **图表类型切换 < 100ms**            | 折线↔柱状↔面积↔散点↔直方               |
| G8  | **RX-only 永远只读**                | fromOtherCmd=true 时写入 API 全部拒绝   |

## 5. 范围 (v3 调整)

### 5.1 In Scope (v3)

- **协议命令模型** (沿用 v2): Command / CmdGroup / Pair / Direction / expectResponse
- **模式切换** (沿用 v2): topbar mode-switch 第 3 项
- **等高等宽卡片网格** ⭐v3 新约束:
  - 所有卡片高度统一(普通模式固定 200px, KPI strip 96px)
  - 网格排版整齐, 不允许异形卡片
- **普通卡 (Default Card)** ⭐v3 重构:
  - 5 个区域: 状态环 + 字段名+单位 / 当前值(大字) / 60 点 sparkline / 范围/告警文字 / 4 个 action
  - 4 个 action: min / max / close / 状态相关
- **Detail 模式 (Detail Card)** ⭐v3 重构:
  - 进入: 点普通卡的 "expand" action 或卡片主体
  - 呈现: 全屏 modal / drawer, 覆盖当前 dashboard
  - 内容: 4 sub-tab + 实时/历史 toggle + 图表类型 dropdown + 大图 (200px) + stats (min/max/avg)
- **Detail 4 sub-tab** ⭐v3 新增:
  - **实时** (Real-time): 当前 cmd 的实时数据
  - **通用 Modbus** (Modbus Common): Modbus 协议通用字段(从 cmd 表的 common 字段)
  - **设备** (Device): 设备元信息(版本号、序列号、固件版本)
  - **查询状态** (Query Status): 当前查询历史(发了几次、收到几次、错配次数)
- **图表类型切换** ⭐v3 新增:
  - 折线 (line) / 柱状 (bar) / 面积 (area) / 散点 (scatter) / 直方 (histogram)
  - Detail 模式顶部 dropdown 切换
- **Detail 时间窗 toggle** ⭐v3 新增:
  - 实时 (60s 滚动窗口) / 历史 (全部)
- **KPI stat strip** (沿用 v2)
- **设定-实际对比** (沿用 v2 Pair, 在普通/Detail 都有体现)
- **告警** (沿用 v2, 加 cmd 上下文 + 错配告警)
- **配置导入导出** (沿用 v2)

### 5.2 Out of Scope (v3, 同 v2)

业务语义预置 / AI 异常检测 / 远程告警 / 多 profile 切换 / 拖放重排 / 命令冲突仲裁 / 复杂复合表达式

## 6. 功能需求 (v3 重构)

### 6.1 卡片布局规范 (v3 强约束) ⭐

**所有普通卡等高 (200px) 等宽 (按列均分)**。

#### 6.1.1 普通卡 (Default Card) 5 区域布局

```
┌────────────────────────────────────────────────────┐
│ ● Cell 1 电压                  [min][max][×][⚙]  │  ← 头部 (40px)
│                                                    │
│              3.71V                                 │  ← 主值 (60px 大字)
│                                                    │
│  ▁▂▃▅▆▇█▇▆▅▃▂▁▂▃▅▆▇ (60 点 sparkline)            │  ← 趋势 (40px)
│                                                    │
│  范围 2.8 - 4.2V  ·  ✓ 正常                       │  ← 底部 (40px)
└────────────────────────────────────────────────────┘
```

| 区域        | 高度  | 内容                                                                 |
| ----------- | ----- | -------------------------------------------------------------------- |
| 头部        | 40px  | ● 状态环 + 字段名 + 单位 + 4 个 action (icon buttons 24×24)        |
| 主值        | 60px  | 当前值 (display font 32px / 800 weight), 单位小字 (label 11px)       |
| 趋势        | 40px  | 60 点 sparkline, 高度占满, 宽度填充                                  |
| 底部        | 40px  | 范围 / 告警文字 / 状态徽章 (左对齐, body 13px)                       |
| 间距 / 内边距 | 12px | 上下左右 12px 内部 padding                                            |
| **总高**    | **200px** | **固定,所有普通卡严格一致**                                    |

#### 6.1.2 4 个 Action 规范 ⭐

固定 4 个 action, 从左到右:

| Action    | icon  | 行为                                    | 何时显示 |
| --------- | ----- | --------------------------------------- | -------- |
| **min**   | `↓`   | 把图表时间窗切到最近 60s                | 始终     |
| **max**   | `↑`   | 把图表时间窗切到全部历史                | 始终     |
| **close** | `×`   | 关闭 / 隐藏该卡片(进入编辑模式才生效)   | 编辑模式 |
| **状态相关** | 动态 | 根据 cmd 上下文动态切换:                  | 始终     |

**"状态相关" action 行为表**:

| 卡片类型                 | icon    | 行为                              |
| ------------------------ | ------- | --------------------------------- |
| **TX (控制字段)**         | `↗`     | 触发一次发送 (send 一次该 cmd)     |
| **RX (数据字段, 告警中)** | `✓`     | 确认告警 (ack)                    |
| **RX (数据字段, 正常)**   | `↻`     | 强制刷新一次 (trigger poll)       |
| **Pair 卡片**             | `⇄`     | 跳转到 Pair 对比详情 (Detail)      |
| **轮询 cmd** (非 manual)  | `⏸` / `▶` | 暂停 / 恢复轮询                  |

#### 6.1.3 状态环规范

**位置**: 头部最左侧, 8px 圆点

| 状态            | 颜色     | token          | 触发条件                          |
| --------------- | -------- | -------------- | --------------------------------- |
| 正常 (Normal)   | 绿       | `--success`    | 值在正常范围, 无告警               |
| 警告 (Warning)  | 橙       | `--warning`    | 值越 warning 阈值, 未越 danger     |
| 异常 (Danger)   | 红       | `--danger`     | 值越 danger 阈值                   |
| 离线 (Offline)  | 灰       | `--text-soft`  | N 秒内无更新 (默认 5s)             |
| RX-only 永久只读 | 蓝       | `--signal`     | fromOtherCmd=true (永久, 不可改)   |

**新 token**: `--success` (#22c55e) — DESIGN.md 暂未定义, v3 引入, 写入 design sidecar

#### 6.1.4 RX-only 字段 (fromOtherCmd) ⭐

**定义**: 该字段是"对方帧"的字段(在主-从通信中, 是 device→host 的字段, 即使 host 角色是 slave 也不能改)

**强制规则**:
- 状态环颜色: 蓝 (`--signal`), 不跟随告警变红 (因为状态环 = "数据来源" 颜色)
- 4 个 action 中的 "状态相关" action 变为"只读" (cursor: not-allowed, 点击无效 + tooltip "RX-only, 不可写入")
- 卡片右上角小徽章: "RX" (蓝色 9px mono)
- 编辑模式不允许切换为"可写" — 任何尝试都被拒绝

**业务例**:
- 主机发 cmd 0x10 Control Charge, payload 含 charge_v_set
- 设备响应 cmd 0x80 Charge Ack, payload 含 pack_v
- 仪表盘中 pack_v 是 fromOtherCmd=true (它是 device→host 字段)
- 即使配置 role=slave, pack_v 仍然只读

### 6.2 Detail 模式 (v3 新增) ⭐

#### 6.2.1 进入方式

- 点普通卡的"expand" action (上面 4 个 action 中的"状态相关", 根据卡片类型动态)
- 或点卡片主体(除 action 外的任何区域)

#### 6.2.2 呈现形式

**全屏 modal** (覆盖整个 dashboard, 1440px 宽, 90vh 高, 14px 圆角, ambient-soft 阴影)

```
┌──────────────────────────────────────────────────────────────────┐
│  [×]  Cell 1 电压    0x01 rx  ·  范围 2.8 - 4.2V  ·  ✓ 正常     │  ← 头部
├──────────────────────────────────────────────────────────────────┤
│  [实时] [通用 Modbus] [设备] [查询状态]      [实时|历史]  [图表 ▾] │  ← 4 sub-tab + toggle + dropdown
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│              完整大图 (200px 高)                                 │
│              折线/柱状/面积/散点/直方                            │
│                                                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Min: 3.21V     Max: 3.78V     Avg: 3.62V     N: 60 采样        │  ← stats 栏
└──────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 4 Sub-tab 内容 (v3 新增) ⭐

| Sub-tab           | 内容                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| **实时**          | 当前 cmd 的实时数据, 大图 200px 高, 实时刷新                        |
| **通用 Modbus**   | Modbus 协议通用字段 (Function code, Register, Quantity, CRC 等)        |
| **设备**          | 设备元信息 (固件版本 / 序列号 / 型号 / 厂商 / 协议版本)              |
| **查询状态**      | 当前 cmd 的查询历史: 发送次数 / 收到次数 / 错配次数 / 最后错误 / 延迟   |

#### 6.2.4 实时/历史 Toggle

- 实时: 60s 滚动窗口, 数据持续刷新, 时间窗标签 "实时 (60s)"
- 历史: 全部历史, 数据静态显示(用户可手动重新查询), 时间窗标签 "历史 (全部)"

#### 6.2.5 图表类型 Dropdown

- 折线 (line): 默认, 适合趋势
- 柱状 (bar): 适合离散采样
- 面积 (area): 折线 + 填充
- 散点 (scatter): 适合稀疏数据
- 直方 (histogram): 适合值分布

切换时 < 100ms (Canvas 2D 复用, 仅改 render 函数)。

#### 6.2.6 Stats 栏

- Min / Max / Avg (3 个大数值, label 11px + body 13px)
- N: 采样数 (label 11px)

#### 6.2.7 退出方式

- 点 [×] 按钮
- 按 Esc
- 点 modal 外部(灰色 backdrop)

### 6.3 KPI Stat Strip (v2, 沿用 + 调整)

- 5-7 个 KPI, 一行, **高度固定 96px** (等高约束)
- 字段: cmd / cmd group / 全局
- 配色: 沿用 DESIGN.md token
- 触发告警的 KPI 高亮

### 6.4 Command Panel (v2, 沿用)

- 顶部命令选择条
- rx (蓝) / tx (紫) 配色
- 错配角标

### 6.5 告警 (v2, 沿用)

- 阈值检测 / 错配检测
- 告警栏 cmd_id + direction 徽章
- 持续 / 确认 / history

### 6.6 配置 (v2, 沿用 + v3 新增)

- JSON 导入导出
- localStorage 持久化
- 卡片编辑器 (v3 调整: 含"卡片类型"细分: value / trend / pair / rx-only, 4 sub-tab 选项在编辑器内可配)

## 7. 非功能需求 (v3 调整)

- **NFR1**: 实时刷新 ≤ 100ms
- **NFR2**: **50 张等高卡片**渲染流畅 (v2 是 100, v3 降低因 Detail modal 占用资源)
- **NFR3**: Detail 模式 < 200ms 进入
- **NFR4**: 图表类型切换 < 100ms
- **NFR5-NFR9**: 沿用 v2

## 8. 约束 (沿用 v2 + v3 新增)

- **延用 DESIGN.md**: 颜色 / 字体 / 圆角 / 间距 / 阴影 token 全部继承
- **v3 新增 token**: `--success` (#22c55e) 状态环正常色, 写入 design sidecar
- **等高约束**: 普通卡 200px / KPI 96px, 严格
- **RX-only 硬约束**: fromOtherCmd=true 字段永远只读, 不允许配置覆盖
- **协议模型不变**: v2 的 Command / Direction / Pair 全部保留
- **数据兼容性**: 旧 userConfig v1/v2 仍可解析

## 9. 风险与缓解 (v3 调整)

| ID  | 风险                                | 缓解                                                            |
| --- | ----------------------------------- | --------------------------------------------------------------- |
| R1  | 卡片等高约束与 Pair 卡内容冲突      | Pair 卡普通模式显示紧凑(实际值主导 + sparkline 双线), 等高不变 |
| R2  | Detail modal 占用资源               | 单 modal 模式 (用户同时只能看一个 Detail), 关闭即销毁         |
| R3  | 4 sub-tab 数据源不一致              | "实时" 走 trendData, "通用 Modbus" 走 parser config, "设备" 走 state.deviceInfo, "查询状态" 走 state.parser.txStats |
| R4  | 图表类型切换性能                    | 复用 Canvas 2D, 仅替换 render 函数, 不重建 canvas              |
| R5  | RX-only 字段被错误编辑              | 编辑器检测 fromOtherCmd=true → 显示"只读"提示, 保存时校验    |
| R6  | Detail 模式回到普通模式状态丢失     | Detail 内的设置 (图表类型, 时间窗) 仅 Detail 内有效, 退出后回到普通模式默认 |

## 10. 开放问题 (v3 精简, 多数已决)

- **O1-O2**: 拖放重排 / 多 profile — v3 后续
- **O3**: 告警声音 — v3 可选
- **O4**: 复合表达式 — v3 仅 avg/max/min + Pair
- **O5**: 编辑器位置 — **右侧抽屉** (沿用 v2)
- **O6**: 趋势数据导出 — v3 CSV
- **O7**: parser v2 升级 — **是, Phase 0 前置**
- **O8**: UserConfig v3 bump? — 建议, 加新字段 optional
- **O9**: 错配告警默认开启? — **是**
- **O10** ⭐: Detail 模式是 modal 还是 page? — **建议 modal (覆盖 dashboard), 不破坏 CommandPanel 上下文**
- **O11** ⭐: 4 sub-tab 默认显示哪个? — **建议 "实时" (最常用)**
- **O12** ⭐: RX-only 状态环是否与告警状态环合并? — **建议分开: 状态环 = 数据来源色 (蓝), 告警边框 = 告警 level (橙/红)**

## 11. v2 → v3 UI 规范对照

| 维度              | v2                              | v3                                                       |
| ----------------- | ------------------------------- | -------------------------------------------------------- |
| 卡片高度          | 异形 (随内容变)                  | **统一 200px** (普通模式) / 96px (KPI)                    |
| 卡片内容          | 自由布局                        | **5 区域强约束布局** (状态环/字段/主值/趋势/底部)         |
| Action 数量       | 不固定                          | **固定 4 个** (min/max/close/状态相关)                   |
| 详细分析          | 仅有趋势卡 (60px sparkline)     | **Detail 模式** (200px 大图 + 4 sub-tab + 图表类型切换)   |
| 图表类型          | 仅折线                          | **5 种** (折线/柱状/面积/散点/直方)                      |
| RX-only           | 未明确                          | **fromOtherCmd=true 永久只读, 状态环蓝, action 禁用**    |
| 状态环            | 无                              | **新增, 5 种颜色** (绿/橙/红/灰/蓝)                     |
| 状态环 + 告警边框 | 不分离                          | **分离**: 状态环=数据源, 边框=告警 level                  |

## 12. 重构说明 (v2 → v3)

v2 在协议模型 (Command / Direction / Pair) 上对了, UI 落地有缺陷:

| 缺陷                                  | 影响                                       | v3 修复                                   |
| ------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| 卡片高度不统一                        | 排版乱, 网格错位                           | **强制等高 200px**                       |
| 缺少"普通 vs Detail"双模式            | 用户要么看概要, 要么看图表, 二选一         | **双模式**: 普通紧凑 + Detail 全屏分析     |
| 缺少 4 sub-tab 详细分析维度          | 仪表盘只能看实时, 不能查 Modbus 通用/设备  | **4 sub-tab** 覆盖完整分析需求            |
| 图表类型单一                          | 离散数据 / 值分布无法展示                  | **5 种图表切换**                          |
| RX-only 字段没保护                    | 可能被误编辑, 引发协议 bug                  | **fromOtherCmd 永久只读** + UI 标记       |
| 状态环与告警边框不分离                | 视觉混乱, 数据源与告警难区分                | **分离**: 状态环=数据源, 边框=告警 level  |

v2 协议模型不变, v3 是 UI 层重构。Phase 0 (parser v2 升级) 仍有效。
