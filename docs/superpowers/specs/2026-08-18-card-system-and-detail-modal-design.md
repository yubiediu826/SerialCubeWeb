# SerialCube 卡片系统 & 详情弹窗设计稿 — Spec

> **状态**: 设计中，待评审
> **日期**: 2026-08-18
> **作者**: Mavis (M3) + 用户 M.*
> **范围**: BMS V1.13 全协议字段（19 命令 / 48 字段），未来扩展 EMS/PCS/Modbus
> **deliverable**: `docs/design/v1.3.21-card-system-and-detail-modal-overview.html`
> **关联**:
> - 现状预览: `docs/design/v1.3.20-bit-card-and-detail-modal-preview.html` (1994 行, bit 卡 + 3 弹窗模式基础)
> - 上游 spec: `2026-08-17-card-type-and-direction-badges-design.md` (v1.3.12 卡片 type 缩写)
> - 协议: `docs/protocol/BMS通信协议V1.13.md` §4 (0x01 控制+常规, 48 字段)
> - 上游 handoff: `docs/handover/HANDOFF-V1.3.20-2026-08-18.md` (6 处改动, 待落地)

---

## 1. 背景

v1.3.20 预览只覆盖"bit 卡 + 3 弹窗模式"，是单点改动。但 **BMS V1.13 §4 共 48 字段**，现有 4 种卡片（trend/set/control/pair）+ v1.3.20 新 2 种（bit/bit_set）= 6 种类型**不能覆盖所有字段**：

- 数组字段（Vcell[20] / Cell_Temp[8]）— 6.6 段有 mock 但**没系统化**
- 文本字段（SN 码 / 固件版本）— 6.7.1 段 mock
- 事件日志（0x0A 12 条保护计数）— 6.7.2 段 mock
- 状态机（0x10-0x15 升级流程 6 步）— 6.7.3 段 mock
- 大数字仪表（SOC 0-100%）— 6.7.4 段 mock

→ 5 个新卡片类型待定义 + 弹窗模式待系统化。**用户需要一份"全协议卡片 + 弹窗预览"设计稿**，内部走查后再分批实施。

---

## 2. 目标 / 非目标

### 2.1 目标

1. **11 种卡片类型系统化** — 6 现有 + 5 新，每种明确定义：缩写/颜色/字段类型/弹窗模式/适用场景
2. **8 种弹窗模式** — 11 种卡片点开后对应的弹窗（chart-logs / bit-history / bit-editor / big-metric / array-matrix / text-detail / log-table / wizard-flow）
3. **全协议字段映射表** — BMS V1.13 §4 48 字段 → 推荐卡片类型（含可选/必选标注）
4. **HTML 预览** — `docs/design/v1.3.21-card-system-and-detail-modal-overview.html`（内部设计评审稿）
5. **未来扩展预留** — EMS V1.4.3 / PCS / Modbus 复用位

### 2.2 非目标（本设计稿范围外）

- ❌ 实际改 `SerialCube.html` — 仅做预览 HTML，不动产品代码
- ❌ push 到 main — 改完等用户明确同意
- ❌ 5 个新弹窗模式的实际实现 — 仅设计稿，实施留 v1.3.21+
- ❌ EMS/PCS 完整字段映射 — 只标"未来扩展"位
- ❌ 卡片类型自动选型逻辑 — 仍由用户在配置中心手动选

---

## 3. 11 种卡片类型

| # | 卡片 | 缩写 | 颜色 | hex | dir | 弹窗模式 | 状态 |
|---|------|------|------|-----|-----|---------|------|
| 1 | 趋势 | `TREND` | 蓝 | `#3a5ccc` | rx | chart-logs | 现有 |
| 2 | 配对 | `PAIR` | 紫 | `#7c3aed` | rx | chart-logs | 现有 |
| 3 | 控制 | `CTRL` | 橙 | `#d97706` | tx | chart-logs | 现有 |
| 4 | 参数 | `SET` | 蓝 | `#3a5ccc` | both | chart-logs | 现有 |
| 5 | 单 bit | `BIT` | 紫 | `#7c3aed` | rx | bit-history | v1.3.20 新 |
| 6 | 多 bit 设置 | `BIT_SET` | 深紫 | `#6d28d9` | both | bit-editor | v1.3.20 新 |
| 7 | 大数字仪表 | `BIG` | 绿 | `#16a34a` | rx | big-metric | 🆕 6.7.4 |
| 8 | 数组聚合 | `ARRAY` | 蓝紫渐变 | `#5b21b6` | rx | array-matrix | 🆕 6.6 + 6.7.5 |
| 9 | 文本/SN 码 | `STRING` | 灰 | `#67676c` | both | text-detail | 🆕 6.7.1 |
| 10 | 事件日志 | `LOG` | 棕 | `#92400e` | rx | log-table | 🆕 6.7.2 |
| 11 | 状态机/升级 | `WIZARD` | 青 | `#0891b2` | tx | wizard-flow | 🆕 6.7.3 |

**缩写规范**（沿用 v1.3.12 spec）：
- 字号 0.5625rem (9px)，font-weight 700，letter-spacing 0.05em
- text-transform: uppercase
- 4 元 modifier：`.ctrl` / `.set` / `.trend` / `.pair` / `.bit` / `.bit_set` / `.big` / `.array` / `.string` / `.log` / `.wizard`

---

## 4. 8 种弹窗模式

| 弹窗模式 | 适用卡片 | tab 结构 | 内容核心 | 状态 |
|---------|---------|---------|---------|------|
| **chart-logs** | TREND / PAIR / CTRL / SET | 图表 / 数据日志 | 实时图表 + 历史日志表 | 现有 v1.3.20 |
| **bit-history** | BIT | 单 tab「数据历史」 | 时间戳 + 状态 + 原始字节 | 现有 v1.3.20 |
| **bit-editor** | BIT_SET | 操作 / 数据历史 | 位开关组 + 原始字节预览 + 发送历史 | 现有 v1.3.20 |
| **big-metric** 🆕 | BIG | 仪表 / 趋势 / 极值 | 大数字圆环 + 趋势叠加 + 极值表 | 6.7.4 |
| **array-matrix** 🆕 | ARRAY | 矩阵 / 排序 / 单点 | 数组热力矩阵 + 排序表 + 单串详细 | 6.6 + 6.7.5 |
| **text-detail** 🆕 | STRING | 详情 / 发送历史 | 完整文本 + HEX + ASCII + 历史记录 | 6.7.1 |
| **log-table** 🆕 | LOG | 全部 / 筛选 / 详情 | 完整日志表 + 类型筛选 + 单条详情 | 6.7.2 |
| **wizard-flow** 🆕 | WIZARD | 当前步骤 / 流程图 / 详细日志 | 状态机进度条 + 步骤说明 + 错误重试 | 6.7.3 |

**弹窗尺寸**：800×600px（与 v1.3.20 chart-logs 弹窗一致，mock 用此规格）

---

## 5. BMS V1.13 字段映射表（48 字段抽样）

### 5.1 0x01 控制（MB 16 bit 控制 / 0 字节响应）

| 位 | 字段 | 类型 | 推荐卡片 | 弹窗 | 备注 |
|----|------|------|---------|------|------|
| bit 0 | 负载在位 | bit | **BIT** | bit-history | 单 bit 显示 |
| bit 1 | 加热使能 | bit | BIT | bit-history | |
| bit 2-15 | 其他控制 | bit | BIT | bit-history | |

### 5.2 0x02 常规数据响应（CB 143 字节 / 48 字段）

| # | 字段 | 类型 | 推荐卡片 | 弹窗 | 告警阈值 |
|---|------|------|---------|------|---------|
| 1 | Vcell_max | uint16 | **TREND** | chart-logs | > 3.65V bad |
| 2 | Vcell_min | uint16 | TREND | chart-logs | < 2.5V bad |
| 3 | Vcell_avg | uint16 | TREND | chart-logs | |
| 4 | Vcell[20] | array[20] | **ARRAY** | array-matrix | 单串 vs avg 差 > 50mV warn |
| 5 | Cell_Temp[8] | array[8] | **ARRAY** | array-matrix | 单颗 > 60°C bad |
| 6 | SOC | uint8 | **BIG** | big-metric | < 20% warn |
| 7 | SOH | uint8 | BIG | big-metric | < 80% warn |
| 8 | CycleCount | uint16 | BIG | big-metric | |
| 9 | Vpack | uint16 | TREND | chart-logs | |
| 10 | Ipack | int16 | TREND | chart-logs | > 100A warn |
| 11 | Tpack_max | int16 | TREND | chart-logs | > 55°C warn |
| 12 | ProtectCode | bitset[16] | **BIT_SET** | bit-editor | 任一位置位告警 |
| 13 | ErrCode | bitset[16] | BIT_SET | bit-editor | |
| 14 | AFE_ProtectCode | bitset[16] | BIT_SET | bit-editor | |
| 15 | ChgDsgState | enum | **PAIR** | chart-logs | 充电/放电/空闲 |
| 16 | CellBalance | bitset[20] | BIT_SET | bit-editor | 20 串均衡状态 |
| ... | 其他 | (略) | (略) | (略) | 见协议 §4.2 |

### 5.3 0x03 SN 码

| 字段 | 类型 | 推荐卡片 | 弹窗 |
|------|------|---------|------|
| SN | char[16] | **STRING** | text-detail |

### 5.4 0x0A 事件日志

| 字段 | 类型 | 推荐卡片 | 弹窗 |
|------|------|---------|------|
| Events[12] | log[12] | **LOG** | log-table |

### 5.5 0x10-0x15 升级流程

| 命令 | 字段 | 类型 | 推荐卡片 | 弹窗 |
|------|------|------|---------|------|
| 0x10 | 升级请求 | enum | **WIZARD** | wizard-flow |
| 0x11 | 擦除 | enum | WIZARD | wizard-flow |
| 0x12 | 传输数据 | bytes | WIZARD | wizard-flow |
| 0x13 | 校验 | enum | WIZARD | wizard-flow |
| 0x14 | 结束升级 | enum | WIZARD | wizard-flow |
| 0x15 | 状态查询 | enum | WIZARD | wizard-flow |

**字段映射原则**：
- ✅ = 强烈推荐（v1.3.21 必须支持）
- ○ = 可选（v1.3.22+ 再支持）
- ✗ = 不推荐（用其他类型更合适）

---

## 6. HTML 预览结构

```
docs/design/v1.3.21-card-system-and-detail-modal-overview.html

§0  Hero (11 卡片 mini grid + 当前范围 + 未来扩展)
§1  全协议字段映射表（BMS V1.13 §4 48 字段 → 推荐卡片）
§2  弹窗模式索引（8 种弹窗 1-2 行描述 + 跳转锚点）

§3-§13  11 种卡片分节（每节统一 4 子段）：
    ▸ 卡片本体（220×198 真样式 + 2-3 个状态变体：默认/告警/交互）
    ▸ 弹窗预览（800×600 真弹窗 mock，2-3 个状态）
    ▸ 字段映射（BMS V1.13 哪些字段用此卡，✅/○/✗ 标注）
    ▸ 适用场景 + 何时不用

§14  弹窗模式横向对比（同尺寸 4 列并列：chart-logs vs big-metric vs array-matrix vs wizard-flow）
§15  未来扩展（EMS V1.4.3 / PCS / Modbus 标注 — 哪些协议会复用哪些卡片）
§16  实施路线（v1.3.21 优先实施哪些；v1.3.22+ 排期）
§17  风险 + 待用户决策
```

**样式基线**（复用 v1.3.20 预览模板）：
- 浅色 / 深色主题切换（右上角 toggle 按钮）
- 220×198 卡片尺寸 + 800×600 弹窗尺寸
- 完整 SerialCube 颜色变量（`--accent` / `--signal` / `--pair` / `--ok` / `--warn` / `--bad` / `--pair-deep` 等）
- 字号：`--text` 14px / 卡片内 `0.625rem` / 卡片 value `1.5rem`

---

## 7. 实施路线

### 7.1 本设计稿（v1.3.21 设计稿评审）— 立即做

1. 写 spec（本文件） ✅
2. 写预览 HTML：`docs/design/v1.3.21-card-system-and-detail-modal-overview.html`（~3500-4000 行）
3. commit 到本地（不 push）
4. 等用户评审

### 7.2 v1.3.21 实施（spec 通过后）— 分批

- **第 1 批（基础）**：复用 chart-logs / bit-history / bit-editor 3 弹窗（v1.3.20 已实现）
- **第 2 批（数据）**：新增 big-metric + array-matrix 2 弹窗（数字 + 矩阵）
- **第 3 批（流程）**：新增 text-detail + log-table + wizard-flow 3 弹窗（文本/日志/状态机）

### 7.3 v1.3.22+

- 协议层扩展：EMS V1.4.3 / PCS / Modbus 字段映射
- 卡片选型：协议 schema 标注 `recommendedCard: 'TREND' | 'BIT' | ...` 字段元数据
- 配置中心：选卡片时显示"未来扩展预留位"

---

## 8. 范围 / 边界 / 风险

### 8.1 范围

- ✅ 在：BMS V1.13 §4 48 字段全覆盖 + 弹窗预览设计
- ❌ 不在：实际 SerialCube.html 代码改动 / push / EMS/PCS 实际弹窗实现 / 自动选型

### 8.2 边界条件

- v1.3.20 仍在待落地（6 处文件改动，handoff 在 `HANDOFF-V1.3.20-2026-08-18.md`）
- 本设计稿是**前置**，依赖 v1.3.20 落地后才能用真实弹窗作为参考
- 5 个新弹窗的视觉规范是**新建**，未经验证（仅 6.7 mock）

### 8.3 风险

| 风险 | 对策 |
|------|------|
| 5 个新弹窗设计可能与实际交互不符 | 6.7 mock 已有基础；评审时用真实场景校验 |
| 11 卡片分节预览 HTML 体量 ~3500-4000 行 | subagent 拆分写（4 段并行：总览/前 6 卡片/后 5 卡片/总结） |
| 字段映射不准确（BMS §4 48 字段 vs spec 抽样） | 用户评审时核对全表；不在 spec 中虚构字段 |
| 8 弹窗模式命名跟未来冲突 | 命名跟 v1.3.20 已实现的 3 个保持一致；新 5 个用前缀 `*-metric/matrix/detail/table/flow` 表达模式差异 |

---

## 9. 待用户决策

- [ ] 11 种卡片是否需要增删？
- [ ] 8 种弹窗模式命名是否合适？
- [ ] BMS V1.13 字段映射抽样是否准确？
- [ ] 预览 HTML 章节结构（17 节）是否合理？
- [ ] 实施路线 3 批分批是否接受？

---

## 10. 文件交付清单

| 文件 | 用途 | 状态 |
|------|------|------|
| `docs/superpowers/specs/2026-08-18-card-system-and-detail-modal-design.md` | 本 spec | ✅ 已写 |
| `docs/design/v1.3.21-card-system-and-detail-modal-overview.html` | 预览 HTML | ⏳ subagent 写中 |
| `docs/handover/HANDOFF-V1.3.21-2026-08-18.md` | 实施 handoff | ❌ v1.3.21 实施时再写 |
