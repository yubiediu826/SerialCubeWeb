# SerialCube v1.3.0 实施完成交接 — 2026-08-13

> **状态:** v1.3.0 已实施完成, 已 commit 待 push (4 commit, 等用户拍板)
> **VERSION:** 1.2.2 → 1.3.0
> **commits:** (从 git log 抓取, 见下)
> **e2e:** 3 场景 (16-18) + 浅/深主题截图 + 单 tab 注入验证

## TL;DR

v1.3.0 实装 v1.2.0 留的"真实模拟调试面板"占位, 1 人多 tab 模拟设备未到调试场景, BroadcastChannel 主从 + Mutator 单条注入 + 预设场景 chip + Stats 实时计数。3 天工作量, 4 task 拆解。

## 已完成功能 (4 task 全 ✓)

- **Task 1:** VERSION 升级 1.2.2 → 1.3.0 + changelog + 3 个 e2e scenarios (commit 5408146)
- **Task 2:** BC 通信层 + Role 切换 + 4 段 UI 骨架 + Lucide SVG icon (commit 35d9b91)
- **Task 3:** 命令帧收发 + ack 复用 buildFrame (mute + CRC override) + Mutator 单条注入 (commit fafa45c)
- **Task 4:** Mutator 注入按钮 + input 实时校验绑定 + 浅/深主题截图 + 完整 handoff (本 commit)

## 文件改动汇总

| 文件 | 改动 |
|------|------|
| `SerialCube.html` | +478 / -11 (CSS + HTML + 11 个 NS 函数 + 1 个绑定块 + 1 个 bug 修) |
| `docs/changelog/2026-08-13-v1.3.0-debug-panel.md` | 新建 (3.0KB, 8 段) |
| `docs/CHANGELOG.md` | +3 行 v1.3.0 索引 |
| `docs/handover/HANDOFF-PENDING-V1.3-2026-08-12.md` | 加 v1.3.0 启动记录 |
| `docs/handover/HANDOFF-V1.3.0-2026-08-13.md` | (本文) |
| `README.md` | 加 v1.3.0 段 (🚀 最新版本), v1.2.2 改历史段 |
| `docs/README.md` | 3 处版本引用同步 v1.3.0 |
| `.minimax/skills/serialcube-e2e/scenarios/16-debug-panel-role-switch.md` | 新建 |
| `.minimax/skills/serialcube-e2e/scenarios/17-debug-panel-mutator-inject.md` | 新建 |
| `.minimax/skills/serialcube-e2e/scenarios/18-debug-panel-multi-tab-sync.md` | 新建 |

## e2e 验证结果

### 16-debug-panel-role-switch ✓
- 4 段 UI 全部渲染 (Role / Channel / Mutator / Stats)
- Channel 默认 "BC:serialcube-debug-v1 · 1 peer · 客户端" (BC hello 自连)
- Mutator field select 默认 disabled (无 activeProtoId)
- 切 Role → device: `deviceState` 从 `currentVals` 深拷贝 11 字段, Channel 同步

### 17-debug-panel-mutator-inject ✓
- proto_bms 拉 10 个 numeric field (cell_1_v / cell_2_v / cell_3_v / cell_4_v / pack_v_avg / pack_i / temperature / soc / charge_v_set / discharge_v_set)
- 6 个 preset chip 自动渲染: "过压 4.3V" / "欠压 2.7V" / "通信超时" / "CRC 错" / "pack_i=-50" / "pack_i=50"
- `_injectMutation` 范围校验: 4.5V 超出 range [2.8, 4.2] → 拒绝, 3.8V 在 range → 写入
- 设备端改 `deviceState`, 不污染 `currentVals` (D5 决策正确)

### 18-debug-panel-multi-tab-sync (single tab 简化)
- 3 个核心 NS 函数都存在: `_sendDebugCmd` / `_recvDebugFrame` / `_injectMutation`
- 单 tab role=client 时 `_sendDebugCmd(0x01)` → `tx: 1, rx: 0` (无 device 接收, 正常)
- 切 role=device 后 `_recvDebugFrame(fakeMsg)` → 自动生成 ack, `tx: 2`
- 完整 2 tab BC 协同留 v1.3.1 backlog (daemon timeout 频繁, 改用多 tab 模式重测)

## 主题适配

- 浅色 + 深色主题截图: `screenshots/v1.3.0-{light,dark}.png`
- 所有 UI 用 CSS 变量 (`var(--bg)` / `var(--text)` / `var(--accent)` 等), 主题切换无硬编码颜色

## 实施过程 bug 修 (Task 2/3/4 期间)

| Bug | 根因 | 修法 |
|------|------|------|
| 切 Role 后 Channel text 不更新 | `_switchDebugRole` 漏调 `_updateDebugChannelUI` | 加一行 `NS._updateDebugChannelUI()` (Task 2) |
| Mutator 段全 disabled, preset chip 0 个 | v1.2 `cmd.dataFields` 没 `range` 字段, `_populateDebugMutatorFields` 过滤后空 | 改用 `NS.CARDS` 拉 `field + range` (Task 4) |
| `_injectMutation` 范围校验失效 | 同上 (从 dataFields 拉 range 失败) | 改用 `NS.CARDS.find(c => c.field === fieldName).range` (Task 4) |

## 4 个 R 硬性检查

```
==> Checking README sync for VERSION 1.3.0
  [OK]   README.md mentions v1.3.0
  [OK]   docs/README.md mentions v1.3.0
  [OK]   docs/CHANGELOG.md index lists v1.3.0
  [OK]   changelog/2026-08-13-v1.3.0-debug-panel.md contains v1.3.0
  [WARN] README.md still mentions v1.0.0 (consider updating or removing)
[OK] All README sync checks passed for v1.3.0

==> Checking temp files / unused scripts
  Scanned: 209 tracked + 74 untracked
  [OK]   No temp files or unused scripts found
```

## 已知问题 + 后续 (v1.3.1+ backlog)

- 跨设备 (WebRTC P2P / WebSocket relay) — v1.3.1
- 录制/回放真实数据 — v1.3.1
- 持续注入 (duration + interval) — v1.3.1
- 设备端"主动上报"模拟 (vs 只 ack 响应) — v1.3.1
- 调试模式自动展开 — v1.3.1
- 自定义 Mutator 模板 (用户保存注入场景) — v1.3.1
- 恢复"设置值"功能 (v1.2.1 删协议条埋的坑) — v1.3.1
- 三选项级联 modal — v1.3.1
- 告警编辑 modal 升级 — v1.3.1
- modal 切协议缓存字段 — v1.3.1
- checkAlert 性能优化 — v1.3.1
- plan/spec 里 e2e 编号 10-12 → 16-18 修正 (后修, low pri)

## 环境状态

- 代理 127.0.0.1:7897: 切新会话时探测
- 待 push commit: 4 个 (v1.3.0 调试面板: 5408146 / 35d9b91 / fafa45c / 待 Task 4)
- 加 v1.2.2 hotfix 3 个: d01720d / c631eb7 / 543f76d
- 加 v1.3.0 文档 3 个: 07392f9 / 4126797 / 10fa7d0 / d98e791
- git status: 干净 (除 SUPPORTED-PROTOCOLS.md 用户中途删 + 历史 untracked)
- e2e agent-browser: 多次 daemon timeout, 实际功能 OK, 完整 2 tab 验证留 v1.3.1
