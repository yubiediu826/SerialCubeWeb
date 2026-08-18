# HANDOFF V1.3.21 — 2026-08-18

> **v1.3.21** — 卡片系统 & 详情弹窗 (11 卡片 + 8 弹窗模式 + 1×1/2×1 尺寸体系 + chart-logs 复用) — 待 push
> 关联 spec: `docs/superpowers/specs/2026-08-18-card-system-and-detail-modal-design.md`
> 关联 plan: `docs/superpowers/plans/2026-08-18-v1.3.21-card-system-and-detail-modal-implementation.md`
> 关联预览: `docs/design/v1.3.21-card-system-and-detail-modal-overview.html` (1618 行, 17 节)
> 关联 changelog: `docs/changelog/2026-08-18-v1.3.21-card-system.md`

## 一句话总结

11 卡片类型 (TREND/PAIR/CTRL/SET/BIT/BIT_SET/BIG/ARRAY/STRING/LOG/WIZARD) + 8 弹窗模式 (chart-logs/bit-history/bit-editor/big-metric/array-matrix/text-detail/log-table/wizard-flow) + 1×1/2×1 尺寸体系 + chart-logs 弹窗复用 trend 4 卡片共享 — 累计 14 commit 待 push (v1.3.20 + v1.3.21)。

## 核心改动清单（按 plan 10 task 顺序）

| # | commit | 内容 | 行数 |
|---|--------|------|------|
| 0 | `4d4b7c3` | chore: VERSION 1.3.20 → 1.3.21 (bump 准备) | — |
| 1 | `085526b` | feat: CSS 1×1/2×1 尺寸体系 + 5 新 type 颜色变量 (BIG/ARRAY/STRING/LOG/WIZARD) | +~80 |
| 2 | `fd1d602` | feat: TREND 卡片支持 2×1 变体 (card.span 字段) | +~120 |
| 3 | `23f52a7` | feat: CTRL 多 bit 卡片自动 2×1 (bitsCount > 8 触发) | +~38 |
| 4 | `bfc0c9a` | feat: BIT_SET 卡片强制 2×1 (16 bits 完整 8×2 网格) | +~92 |
| 5 | `f241290` | feat: ARRAY 卡片类型 + 强制 2×1 (4 区块 × 5 串 = 20 串完整) | +~84 |
| 6 | `2f71542` | feat: __openDetail 弹窗改 chart-logs 复用 (4 卡片共享 1 弹窗) | +87 / -53 |
| 7 | `9ff0279` | feat: BIG 卡片类型 + big-metric 弹窗 (3 tab: 仪表/趋势/极值) | +202 |
| 8 | `49f23fe` | feat: STRING 卡片类型 + text-detail 弹窗 (SN 码 / 固件版本) | +186 |
| 9 | (本次) | feat: LOG 卡片 + log-table 弹窗 (单 tab 当前实现) | +~250 |
| 10 | (本次) | feat: WIZARD 卡片 + wizard-flow 弹窗 (单 tab 当前实现) | +~270 |

**累计**: 14 commit (含 v1.3.20 + v1.3.21 collateral + plan + design + 5 文档), ~2500 行代码改动

## 11 卡片 / 8 弹窗模式映射

| 卡片 | 缩写 | 颜色 | 尺寸 | 弹窗模式 | 字段示例 |
|------|------|------|------|---------|---------|
| 趋势 | TREND | 蓝 #3a5ccc | 1×1 / 2×1 | chart-logs | Vcell_max / Vpack / Ipack / Tpack |
| 配对 | PAIR | 紫 #7c3aed | 1×1 | chart-logs (复用) | ChgDsgState / 充放电功率 |
| 控制 | CTRL | 橙 #d97706 | 1×1 / 2×1 (多 bit) | chart-logs (复用) | 负载在位 / 加热使能 |
| 参数 | SET | 蓝 #3a5ccc | 1×1 | chart-logs (复用) | RSOC 校准 / 电压限值 |
| 单 bit | BIT | 紫 #7c3aed | 1×1 | bit-history | ProtectCode.bit 0 |
| 多 bit 设置 | BIT_SET | 深紫 #6d28d9 | 强制 2×1 | bit-editor | ProtectCode (16 bit) / CellBalance (20 bit) |
| 大数字 | BIG | 绿 #16a34a | 1×1 | big-metric | SOC / SOH / CycleCount |
| 数组 | ARRAY | 蓝紫 #5b21b6 | 强制 2×1 | array-matrix | Vcell[20] / Cell_Temp[8] / OCV 表 |
| 文本 | STRING | 灰 #67676c | 1×1 | text-detail | SN 码 / 固件版本 |
| 日志 | LOG | 棕 #92400e | 1×1 | log-table | 0x0A 事件日志 (12 条) |
| 流程 | WIZARD | 青 #0891b2 | 1×1 | wizard-flow | 0x10-0x15 升级 6 步 |

## 守门清单（已通过）

- ✅ 协议守门 3 道: docs/protocol/ + docs/reference/ 0 行（git status / git diff --cached / git ls-files）
- ✅ VERSION 三处同步: SerialCube.html:9192 const VERSION = '1.3.21' + README.md + PROJECT-HANDOVER
- ✅ check-readme-sync R4: 4 项全过（README / docs/README / CHANGELOG / changelog 子文件）
- ✅ 5 颜色变量 computed style: --big / --array / --string / --log / --wizard 浅色套全命中
- ✅ 1×1/2×1 尺寸体系: 1×1 = 220×198 (CSS 实测 220px), 2×1 = 440×198 (CSS 实测 438px = 440 - 2px border)
- ✅ 弹窗复用 4 卡片 (trend/pair/ctrl/set) 共用 chart-logs 渲染: 5 弹窗模式 dispatch 工作 (chart-logs/bit-history/bit-editor/big-metric/text-detail)
- ✅ console 错: 0（SerialCube.html 加载 + 5 弹窗模式测试）
- ✅ 协议守门 0 行（v1.3.20 + v1.3.21 累计 14 commit）
- ✅ 视觉验证截图 9 张 (`.tmp/v1.3.21-*.png`):
  - v1.3.21-trend-2x1-isolated.png (1×1 vs 2×1 对比)
  - v1.3.21-task3-4-5-cards-2x1.png (CTRL 多 bit / BIT_SET / ARRAY)
  - v1.3.21-task-6-7-8-cards-overview.png (chart-logs 4 卡片 + BIG 5 变体)
  - v1.3.21-task-6-7-8-full.png (含 STRING 弹窗)
  - v1.3.21-big-modal-warn.png (BIG 弹窗大圆环)
  - v1.3.21-string-modal.png (STRING 弹窗 HEX 字节)

## 风险点 / 已知 TODO（v1.3.22+ 收尾）

- ⚠️ **LOG 弹窗 4 tab 留 1 tab**: 仅「全部」tab 实现，保护/告警/详情 3 tab 留 TODO（Subagent 4 因 token 限制未完成）
- ⚠️ **WIZARD 弹窗 3 tab 留 1 tab**: 仅「当前步骤」tab 实现，流程图/详细日志 2 tab 留 TODO（同上）
- ⚠️ **ARRAY 弹窗 array-matrix 3 tab 留 1 tab**（Subagent 2 报告: 仅矩阵 tab，排序/单点详情留 TODO）
- ⚠️ **BIG 弹窗 3 tab 留 1 tab**（Subagent 3 报告: 仅仪表 tab，趋势/极值留 TODO）
- ⚠️ **STRING 弹窗 2 tab 留 1 tab**（Subagent 3 报告: 仅详情 tab，发送历史留 TODO）
- ⚠️ **bit-history 弹窗 .detail-page-tabs 静态 HTML 仍显示 2 tab**（v1.3.20 已知问题: chart tab 隐藏但 label 仍在）
- ⚠️ **bit_set 字段是 per-bit 生成**: 当前 schema 是每个 bit 一张 1×1 卡，16 bit = 16 张 1×1 卡。Subagent 2 实现"两种模式" — c.bits[] 数组走 2×1 8×2，旧 per-bit 仍 1×1 渲染（避免 5 bitsets × 16 bits = 80 张 2×1 占满屏）

## 实施入口（新会话 1 句话）

读 `docs/handover/HANDOFF-V1.3.21-2026-08-18.md` → 跑协议守门 3 道 → 8 弹窗模式实测 → 5 处 TODO 补完（v1.3.22+）→ push (硬性: 等用户明确"push"再推)。

## Skill 调用清单（实施 v1.3.21 完整链）

| Skill | 用途 | 何时用 |
|-------|------|--------|
| `terminal-utf8` | PowerShell 5.1 中文乱码守门 | 跑任何中文命令前 |
| `version-management` | bump-version 脚本 + VERSION 三处同步 | 改 SerialCube.html 前 |
| `serialcube-modal-review` | 大改 modal 布局 6 步守门 | 新建/大改 modal 时 |
| `serialcube-e2e` | 6 场景端到端验证 | 改完跑一遍 |
| `agent-browser` | 浏览器自动化 + 截图 | 视觉验证 |
| `brainstorming` | 9 步设计清单 | 重大新功能（已用于 v1.3.21 设计） |
| `writing-plans` | 实施 plan (2-5 分钟粒度) | brainstorming 后 |

## 文件位置

- **本 handoff**: `docs/handover/HANDOFF-V1.3.21-2026-08-18.md`
- **Spec**: `docs/superpowers/specs/2026-08-18-card-system-and-detail-modal-design.md`
- **Plan**: `docs/superpowers/plans/2026-08-18-v1.3.21-card-system-and-detail-modal-implementation.md`
- **预览 HTML**: `docs/design/v1.3.21-card-system-and-detail-modal-overview.html` (1618 行, 17 节)
- **Changelog 子文件**: `docs/changelog/2026-08-18-v1.3.21-card-system.md` (累积 v1.3.21 全部 task)
- **前 handoff (v1.3.20)**: `docs/handover/HANDOFF-V1.3.20-2026-08-18.md`
- **改前必读**: `SerialCube.html` 32K 行 (重点段: renderCard line 17796-18600 + __openDetail line 18877 + 新增 renderBigMetricBody/renderTextDetailBody/renderLogTableBody/renderWizardFlowBody)
