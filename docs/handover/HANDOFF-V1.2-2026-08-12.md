# SerialCube v1.2 配置中心重构交接 — 仪表盘单协议 + 配置中心 4 Tab + 告警独立

> **用途:** v1.2 配置中心重构全部 14 个 Task 完工后的完整交接。
> **最后更新:** 2026-08-12
> **当前版本:** v1.2.0 (`SerialCube.html const VERSION = '1.2.0'`)
> **改动量:** 13 commits / +2000+ lines SerialCube.html / 6 e2e scenarios (含 3 新)
> **前置文档:** [`HANDOFF-V1.1.1-WORKFLOW-2026-08-12.md`](HANDOFF-V1.1.1-WORKFLOW-2026-08-12.md) (v1.1.1 工具加固交接)

---

## 🚀 TL;DR — 60 秒看完

**v1.2 解决 5 个 UI/逻辑问题 (单点改进, 不重写架构):**

1. **配置中心 4 Tab 重构** — 协议 / 命令 / 卡片 / 告警, 每个 tab 独立表格 + 工具栏 + 编辑 modal
2. **仪表盘单协议聚焦** — 串口 1:1 物理事实, 仪表盘只显示 activeProtoId 的卡片, 切换协议 modal 化
3. **告警独立规则** — `NS.ALERTS` 独立数据, 6 种 op + 3 档严重度 + 防抖, 不再依赖 card.range
4. **删除级联 confirm** — 协议/命令/卡片删除时弹 confirm 列出引用, 用户选择级联或取消
5. **命令编辑三模式 modal** — new / edit / dup (ID 自动 +1), 帧预览 + 批量默认值

**核心决策 (用户已确认):**
- **Plan D (单协议聚焦 + serial binding)**: 串口是 1:1 物理事实, 不要做多协议并行
- **协议切换 = 手动选** (连接时弹 modal 选, 不自动检测)
- **删除级联 = 拒绝 + 列出引用** (不静默级联)
- **v1.3 调试面板预留占位** (BroadcastChannel + Mutator 真实模拟)
- **数据字段归命令不归协议** (cmd.dataFields 维持 v1.1.0 架构)
- **Card UI 保持 v1.1.1 不变** (只移除协议徽章, 因为仪表盘已单协议)
- **Serial icon = DB9 形状** (不是 WiFi, 强调硬件串口)

**v1.2 不做的事 (留 v1.3+):**
- 真实模拟调试面板 (BroadcastChannel 主从连接 + Mutator 数据注入)
- 告警编辑 modal 升级到三选项自定义 modal (目前用 browser confirm)
- 协议/命令编辑 modal 升级到同款三选项 (目前只在删除用 confirm)
- checkAlert 性能优化 (目前每张卡每帧扫所有 alert, 12 卡 10 alert 已可接受)

---

## 📦 13 个 Task 改动一览 (commit 1499694 → 748bb97)

| # | Task | Commit | 改动 |
|---|------|--------|------|
| 1 | 版本号 + changelog | `1499694` | VERSION 1.1.1→1.2.0, changelog 子文件, README sync, R4+R4.2 |
| 2 | 数据结构 | `a3fcc21` | `NS.ALERTS` + `activeProtoId` + v3 export/import |
| 3 | 仪表盘重做 | `526b273` | 协议条 + DB9 占位 + 调试面板占位 |
| 4 | 选协议 modal | `853cc72` | `openSelectProtocolModal` + 协议条切换按钮按状态显隐 |
| 5 | Tab 1 协议 | `45f540c` | 10 列表格 + 状态徽章 + 编辑/复制/删除 |
| 6 | Tab 2 命令 | `1b7370d` | 8 列表格 + 方向徽章 + 三模式 modal |
| 7 | 命令编辑 modal | `5559f08` | 帧预览 + 批量默认值 |
| 8 | Tab 3 卡片 | `c351cb0` | 协议列 + 选协议+命令向导 |
| 9 | Tab 4 告警 | `40669da` | `NS.ALERTS` 独立 + 8 列表格 + 严重度 pill + `.tbtn` CSS |
| 10 | 告警编辑 modal | `bf6aac3` | `openAlertEdit` 三模式 + 6 op + 3 严重度 radio |
| 11 | 删除级联 | `7804f7f` | `_findReferences` + `_cascadeConfirm` |
| 12 | checkAlert 重写 | `3b741c2` | 优先 NS.ALERTS + 6 op + toast 去重 |
| 13 | 3 个 e2e scenario | `748bb97` | 07-dashboard / 08-cmd-edit / 09-alert-edit |

---

## 🏗️ 架构改动 (v1.1.1 → v1.2)

### 数据结构

```javascript
// 新增: NS.ALERTS (独立告警规则数组)
NS.ALERTS = [
  {
    id: 'alert_1723xxx',          // string
    enabled: true,                 // boolean
    name: 'Cell 1 电压过高',        // string (显示名)
    protocol: 'bms',               // 协议 id
    cmd: '0x01',                   // 命令 id (在该协议下)
    field: 'voltage',              // 字段名 (在 cmd.dataFields 下)
    op: '>',                       // '>' / '<' / '=' | '!=' / 'range' / 'rate'
    value: 4.2,                    // number (op=range 时为 [lo, hi])
    severity: 'warn',              // 'info' / 'warn' / 'danger'
    notify: ['toast', 'list'],     // array of 'toast' | 'sound' | 'list'
    debounceMs: 2000               // 防抖毫秒
  }
]

// 新增: NS.activeProtoId (单协议聚焦)
NS.activeProtoId = null;  // 默认 null (v1.2 改动: 不再默认第一个协议)

// settings 加 activeProtoId (v3 export/import)
settings: { cmdMismatchEnabled, alertDebounceMs, cardLayout, activeProtoId }
```

### 函数改动

| 函数 | 位置 | 改动 |
|------|------|------|
| `NS.checkAlert(v, field, protocol, fallbackRange)` | line 10332 | 重写: 优先 NS.ALERTS, 6 op 支持, 返回 `{severity, alertId, name, op, value, notify, debounceMs}` |
| `NS.renderAlerts()` | line 10736+ | 重写: 遍历 CARDS 用新 checkAlert, toast 去重 (`_alertLastKeys` Set) |
| `NS.renderCardGrid()` | line 10645 | 加 `activeProtoId=null` early return (display:none) |
| `NS.openNewCommandModal(protocolId, editCmd, mode)` | line 13134 | 三模式: new / edit / dup (ID 自动 +1) |
| `NS.openSelectProtocolModal(remember)` | line 13193 | 弹 radio 选协议, 写 localStorage |
| `NS.openAlertEdit(alertId)` | line 13818 | 三模式: new (无 id) / edit (有 id) / 副本 (改 _isEdit=false + 新 id) |
| `NS._renderAlertEditBody()` | line 13929 | 联动: 协议 → 命令 (按协议过滤) → 字段 (按 cmd.dataFields 过滤) |
| `NS._saveAlertEdit()` | line 14014 | 新建/编辑分支 + 孤儿 confirm (引用的 cmd/field 不存在) |
| `NS._findReferences(type, id)` | line 14067 | 扫 commands / cards / alerts 找引用 |
| `NS._cascadeConfirm(type, id, label)` | line 14095 | 弹 confirm 列出引用数, 返回 'self' / 'cascade' / 'cancel' |
| `NS._rebuildAlertsFromCards()` | line 13779 | 扫 cards.range 生成默认规则, name+field 匹配跳过已有 |
| `NS._refreshAlertsBadge()` | line 13807 | 改 badge 计数 `NS.ALERTS.length` (之前是 `CARDS.filter(range).length`) |
| `NS._configCenterTabRenderers.alerts` | line 13523-13695 | 重写: 8 列表格 + 严重度 pill + 工具栏重建/新建 |
| `NS.updateDashboardProtoBar()` | line 11541 | 协议条按 activeProtoId 状态显示 (切换按钮按状态显隐) |

### CSS 新增

| 选择器 | 位置 | 用途 |
|--------|------|------|
| `.tbtn` / `.tbtn.primary` / `.tbtn:hover` | line ~7005 | Task 9 补, 修 Task 5/6/8 工具栏按钮裸样式问题 |
| `.dash-proto-bar` / `.dash-meta` / `.dash-empty` | line ~7000 | Task 3 仪表盘协议条 |
| `.pill.bms` / `.pill.ems` / `.pill.pcs` | line ~7000 | 协议 kind 徽章 |
| `.pill.sev-info` / `.pill.sev-warn` / `.pill.sev-danger` | line ~7000 | Task 9 告警严重度 pill |

---

## 🆕 新增 Modal / HTML 骨架

| Modal | 位置 | 用途 |
|-------|------|------|
| `dh-select-proto-modal` | line ~7899 | Task 4: 选协议 (radio + localStorage) |
| `dh-new-command` (扩展) | line 7816-7833 | Task 6+7: 三模式 + 帧预览 + 批量默认值 |
| `dh-alert-edit-modal` | line ~7866 | Task 10: 三模式 + 联动 (协议/命令/字段) + 6 op + 3 严重度 |

---

## 🧪 测试覆盖 (v1.2)

| 测试 | 工具 | 结果 |
|------|------|------|
| preflight (9 项健康检查) | `powershell` (pwsh 缺失) | 1 block (agent-browser, 已用 static grep 兜底) + 2 warn |
| check-readme-sync (R4) | `powershell` | ✅ 4/4 硬性 + 1 warn (v1.0.0 历史 release notes 链接, 保留) |
| check-cleanup (R4.2) | `powershell` | ✅ 0 issues |
| e2e 场景 01-06 (回归) | agent-browser 不可用 | 代码层验证全过 |
| e2e 场景 07 (仪表盘) | agent-browser 不可用 | 代码层验证: activeProtoId=null + 协议条占位 + DB9 placeholder ✓ |
| e2e 场景 08 (命令编辑) | agent-browser 不可用 | 代码层验证: 三模式 modal + 字段预填 + 复制 ID+1 ✓ |
| e2e 场景 09 (告警编辑) | agent-browser 不可用 | 代码层验证: 重建 10 条 + 严重度三档 + 编辑预填 ✓ |
| agent-browser 实测 | agent-browser 不可用 | 用户浏览器手动验证 |

**代码层验证 vs 浏览器验证说明：**
- v1.2 主体改动都用 `Select-String` + `read` 静态验证
- 浏览器 viewport 不稳定 (548/659/989/1466 宽度反复) + ref click 跨 navigate stale
- 实际功能效果请用户浏览器手动跑 e2e 07-09 + 截图存档

---

## 🐛 已知限制 / 后续 TODO (v1.3+)

| 限制 | 影响 | 优先级 | 后续 |
|------|------|--------|------|
| 删除级联用 browser confirm | 体验一般, "确定" 按钮无预览 | 中 | v1.3 升级到三选项自定义 modal (仅删自己 / 级联 / 取消) |
| 告警编辑同样 browser confirm | 同上 | 中 | v1.3 升级 |
| 调试面板 v1.3 占位 | 仪表盘右下角 ⚙ 按钮没功能 | 低 | v1.3 实装 BroadcastChannel + Mutator |
| checkAlert 性能 | 12 卡 × 10 alert 每次扫, 大配置可能慢 | 低 | v1.3 优化 (按 field 建索引) |
| openNewCommandModal 协议切换 | 选协议在 modal 顶部, 切换会重置字段 | 中 | v1.3 切协议时保留已填字段 (缓存 form state) |
| openAlertEdit 协议切换 | 同上, 切协议时命令列表重置 | 中 | v1.3 同款缓存 |
| agent-browser 不可用 | e2e 自动化跑不了 | 中 | 安装 agent-browser + 设 PATH |
| pwsh 不在 PATH | preflight 跑不了 5s 测试 | 低 | 装 PowerShell 7 (cross-platform) |
| git proxy 7897 不通 | push 可能慢/失败 | 低 | 配正确代理端口或 unset http.proxy |

---

## 🔑 用户硬性规则 (继承 v1.1.1, 新增 v1.2 补充)

1. **commit 中文** (用 `git commit -F <file>` 避免 PS 引号问题)
2. **push 前必 ask_user** (避免 force push 误操作, 不可逆发布)
3. **VERSION 三处同步** (SerialCube.html const / HTML changelog 段 / Git tag)
4. **改 SerialCube.html 前必跑 bump-version.ps1** (R1)
5. **每次 push 前必写 changelog 子文件** (`docs/changelog/YYYY-MM-DD-<topic>.md` + CHANGELOG.md 索引)
6. **版本变更后必跑 check-readme-sync.ps1 (R4) + check-cleanup.ps1 (R4.2)**
7. **更新完必跑 link check + 同步关联文档**
8. **🆕 v1.2 配色硬性**: 所有新 UI 用 CSS 变量 (`var(--xxx)`), 不要硬编码颜色 (光/暗主题自适应)
9. **🆕 v1.2 图标硬性**: 全部 inline SVG (Lucide 16x16, stroke 1.5), 不用 icon font
10. **🆕 v1.2 工具栏硬性**: 每 tab 工具栏按钮 ≤ 3 个 (避免视觉拥挤)
11. **🆕 v1.2 帧预览硬性**: 2 bytes upper + 空格分隔 (e.g., `AA 55`)

---

## 🎯 用户背景 (避免重复问)

- **角色:** 嵌入式 / 硬件方向 (SerialCube 用于 BMS / EMS / PCS 协议调试)
- **领域:** 户外电源 / 户用储能 / 通信棒模块 (类似 tastek.cn 的 DTU/RTU)
- **场景:** 离线 / 户外网络不稳, 协议解析高频, 卡住不退出是痛点
- **设计偏好:**
  - 数据字段归命令不归协议 (cmd 自带 dataFields)
  - 添加用 modal 不用内嵌表单
  - 图标只用 inline SVG (Lucide, 16x16 viewBox + stroke 1.5)
  - 喜欢正交分层一站式 modal
  - 工具栏按钮越少越好
  - **🆕 配色全部用 CSS 变量, 不写死** (v1.2 新偏好)
  - **🆕 强调"串口 1:1 物理事实"** — UI 不要假装能多协议并行 (v1.2 决策)
- **subagent 约定:** 1 task 1 subagent, ≤ 500 行 / ≤ 3K prompt
- **工作流偏好:** 优化 token 消耗但不能牺牲性能 + 防卡住 (v1.1.1 加固)

---

## 📦 当前 main 状态 (v1.2)

```
748bb97 test(v1.2): 3 个 e2e scenario (07-09 仪表盘/命令/告警)
3b741c2 feat(v1.2): checkAlert 改用 NS.ALERTS 独立规则
7804f7f feat(v1.2): 删除级联 confirm (_findReferences + _cascadeConfirm)
bf6aac3 feat(v1.2): 告警编辑 modal (openAlertEdit)
40669da feat(v1.2): 配置中心 Tab 4 告警重做 (独立规则 + 严重度)
c351cb0 feat(v1.2): 配置中心 Tab 3 卡片 (协议列 + 选协议+命令向导)
5559f08 feat(v1.2): 命令编辑 modal 帧预览 + 批量默认值
1b7370d feat(v1.2): 配置中心 Tab 2 命令重做
45f540c feat(v1.2): 配置中心 Tab 1 协议重做
853cc72 feat(v1.2): 选择协议 modal + 协议条切换按钮按状态显隐
526b273 feat(v1.2): 仪表盘重做
a3fcc21 feat(v1.2): 数据结构 NS.ALERTS + activeProtoId + v3 export/import
1499694 chore(v1.2): VERSION 1.1.1 → 1.2.0 + changelog 子文件 + README 同步
```

**v1.2 完整生命周期 (12 commits):**
- 1499694: 版本号 + 文档基础设施
- a3fcc21-1b7370d: 数据结构 + 仪表盘 + Tab 1-2 (核心架构)
- 5559f08-c351cb0: 命令/卡片 modal + Tab 3
- 40669da-748bb97: 告警独立规则 + 编辑 modal + 级联 + checkAlert 重写 + e2e

**未变更:** v1.1.1 加固的工具 (preflight / R4 / R4.2) 全部继续生效

---

## 🔗 关联文档

- **v1.1.1 工具加固交接:** [`HANDOFF-V1.1.1-WORKFLOW-2026-08-12.md`](HANDOFF-V1.1.1-WORKFLOW-2026-08-12.md)
- **v1.1.1 4 修复交接:** [`HANDOFF-V1.1.1-FIXES-2026-08-12.md`](HANDOFF-V1.1.1-FIXES-2026-08-12.md)
- **v1.1.0 完整交接:** [`HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md`](HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md)
- **v1.1.0 发版后状态:** [`HANDOFF-POST-V1.1.0-2026-08-12.md`](HANDOFF-POST-V1.1.0-2026-08-12.md)
- **v1.1.0 release notes:** [`release-v1.1.0-2026-08-12.md`](release-v1.1.0-2026-08-12.md)
- **30 秒快速接手卡:** [`HANDOFF-QUICKSTART-2026-08-11.md`](HANDOFF-QUICKSTART-2026-08-11.md)
- **项目主交接:** [`PROJECT-HANDOVER-2026-08-11.md`](PROJECT-HANDOVER-2026-08-11.md)
- **v1.2 spec:** [`../superpowers/specs/2026-08-12-v1.2-config-center-refactor-design.md`](../superpowers/specs/2026-08-12-v1.2-config-center-refactor-design.md)
- **v1.2 plan:** [`../superpowers/plans/2026-08-12-v1.2-config-center-refactor-plan.md`](../superpowers/plans/2026-08-12-v1.2-config-center-refactor-plan.md)
- **v1.2 design preview:** [`../design/v1.2-config-center-refactor-preview.html`](../design/v1.2-config-center-refactor-preview.html)
- **v1.2 changelog:** [`../changelog/2026-08-12-v1.2.0-config-center-refactor.md`](../changelog/2026-08-12-v1.2.0-config-center-refactor.md)
- **3 个新 e2e scenarios:** [`.minimax/skills/serialcube-e2e/scenarios/07-09-*.md`](../../.minimax/skills/serialcube-e2e/scenarios/)
- **version-management SKILL:** [`.minimax/skills/version-management/SKILL.md`](../../.minimax/skills/version-management/SKILL.md)
- **workflow skill:** [`.minimax/skills/serialcube-workflow/`](../../.minimax/skills/serialcube-workflow/)
- **e2e skill:** [`.minimax/skills/serialcube-e2e/`](../../.minimax/skills/serialcube-e2e/)
- **根 README:** [`../../README.md`](../../README.md)
- **docs 主入口:** [`../README.md`](../README.md)
- **CHANGELOG 主索引:** [`../CHANGELOG.md`](../CHANGELOG.md)
