# SerialCube 项目 Mavis 会话交接文档

**日期**: 2026-08-04
**来源 session**: mvs_624d8a7c80df49169cf53699a6d5b900 (root) → v4.9 sub-3 branch
**会话时长**: ~3 小时 (8:32 → ~12:00)
**目的**: 新 session (root 或 branch) 开场快速恢复工作

---

## 1. 当前项目状态

**仓库**: `D:\WorkSpace\SerialCubeWeb` (SerialCube.html 单文件, GitHub Pages 部署)
**最新 commit**: `e32cc64` (v4.9.5 pair trigger 真实发送 + Mock ack 模拟) + v4.9.6 即将提交
**v4.9-sub3 分支**: 5 commits ahead of v4.8 base, 全部 push
**worktree**: `D:\WorkSpace\SerialCubeWeb\.worktrees\v4.9-sub3\` (本任务在此路径完成)

**v4.8 + v4.9 sub-3 全部完成** ✅:
- v4.8: 11 个实施 commit + 2 个 spec/plan commit
- v4.9 sub-3: 5 个 commit (dataSize 自动算 / 0x90 0x91 ACK / ack 解析抽象 / modal UI / 真实发送) + v4.9.6 收尾 (c11 c12 + settings + RX 接入 + HANDOFF)
- AGENTS.md 数据兼容性 5 条全部不动

---

## 2. v4.8 + v4.9 sub-3 实施清单 (16 commits)

### v4.8 (11 commits)
| Commit | 内容 | 大小 |
|---|---|---|
| `c213460` | v4.8a.1 `NS._KIND_TEMPLATES` 8 kind metadata | +13 行 |
| `4e7bca7` | v4.8a.2 `NS.PROTOCOLS` 加 `kind` 字段, 现状 2 协议改 kind 0 | ±2 行 |
| `65170b0` | v4.8a.3 默认 PROTOCOLS 同步 (line 11010) | ±2 行 |
| `c877e4f` | v4.8a.4 user config 兼容 (无 kind → kind 0) | +7/-1 行 |
| `556fc96` | v4.8a.5 公共抽 `_computeCrcInput` + `_encodeCrcBytes` | +58 行 |
| `ddcfe6e` | v4.8a.6 `_buildFrameFixedHeader` 实现 (kind 0, 100% 兼容现状) | +12/-69 行 |
| `9850aeb` | v4.8a.7 kind 1-7 stub (NOT_IMPLEMENTED 中间状态) | +25 行 |
| `edb2dfb` | v4.8a.8 `NS.buildFrame` 改 dispatcher (switch on kind) | +25/-8 行 |
| `94a09fc` | v4.8a.9 协议编辑器 验证 按钮 + 错误 UI (红徽章 + 红框 + toast) | +120 行 |
| `3981f29` | v4.8b kind 1-7 真实实现 (raw / cmd-split / addr-split / ctrl-bit7 / type-high-bit / msgid-mixed / tlv) | +164/-7 行 |

### v4.9 sub-3 (5 commits, 收尾 +1 = 6)
| Commit | 内容 | 大小 |
|---|---|---|
| `dfb13cc` | v4.9.1 cmd.dataSize 改为自动算 (NS.computeDataSize) | 实施 |
| `97c33e2` | v4.9.2 加 0x90/0x91 ACK 命令 + charge_i_set/discharge_v_set 初始值 | 实施 |
| `93f352f` | v4.9.3 ack 解析抽象 + TX trigger 状态空间 | 实施 |
| `4b60682` | v4.9.4 弹 modal 输 SET + 实时字节预览 + ↗ 按钮改造 | 实施 |
| `e32cc64` | v4.9.5 pair trigger 真实发送 + Mock ack 模拟 + 状态机 | 实施 |
| `即将` | v4.9.6 c11/c12 + settings + RX 接入 + HANDOFF | +89 行 |

**v4.9 sub-3 Plan 修正 0 处** (5 个 task 全部按 plan 实施, Task 6 收尾中)。

---

## 3. 待办事项

### 立即待办 (v4.9 sub-3 浏览器 smoke test)
- [ ] 加载 SerialCube.html → 打开 dashboard 模式 → c1-c12 卡片显示
  - c1-c8: 跟 v4.8 一致 (Cell 1 ~4.2V, Pack 均压 ~3.7V)
  - c9/c10: 充电电压 pair / 设定, 初始 SET 56.0 / ACT ~55.7
  - **c11/c12 (新)**: 放电电压 pair / 设定, 初始 0 / 0
- [ ] 触发 0x10 → c9/c10 显示新值 (mock 模式 30ms 内)
- [ ] 触发 0x11 → c11/c12 显示新值 (mock 模式 30ms 内)
- [ ] 跨 cmd 互斥: 触发 0x10 时, 点 c11 ↗ 弹 "请等待上次响应" warn toast
- [ ] timeout 路径: 改 state.settings.pairTriggerTimeout=1000 + NS._mockAckDisabled=true → 触发 0x10 → 1s 后错误 toast
- [ ] 系统菜单 "Pair Trigger → 触发超时 (ms)" 输入: 改 1000/5000/10000 → toast "已保存" → 刷新页面后保留
- [ ] 范围错误: 输入 500 → toast "范围错误" → input 还原
- [ ] RX 接入 (真串口):  连 com50 → 触发 0x10 → com51 回 0xAA 01 90 04 ... 55 → dashboard c9/c10 更新
- [ ] 旧 user config 兼容: 刷新页面, NS.CARDS 仍有 12 张 + state.settings.pairTriggerTimeout 有值
- [ ] 协议编辑器 验证 按钮 (v4.8a 行为): "BMS TLV v1 (Legacy)" tab → 验证 → "协议验证 OK" toast

### 后续 sub (留 spec/plan/session)
- **🔥 v5 历史回放**: `.timeline` 录制/回放打磨, 1-2 小时, 独立大块 ← 提升到最高优先级 (sub-3 完成)
- **sub-2**: parseFrame (贴字节反解析) + 协议编辑器 UI 重构 (kind 下拉 + 动态 fields) + RX 接入通用化
- **v4.9.x+ 增强**: RX 接入扩展到其他 kind (kind 1-7 协议); 0x90/0x91 ack 触发 ack command card 独立显示

---

## 4. 关键文件位置

| 路径 | 用途 |
|---|---|
| `SerialCube.html` | 主单文件, 20042 行 (v4.9.6 实施后) |
| `HANDOFF.md` | **本交接文档 (新 session 开场必读)** |
| `docs/superpowers/specs/2026-08-04-tx-trigger-sub3-design.md` | v4.9 sub-3 spec |
| `docs/superpowers/plans/2026-08-04-tx-trigger-sub3-plan.md` | v4.9 sub-3 plan |
| `.superpowers/sdd/2026-08-04-tx-trigger-sub3-plan/progress.md` | v4.9 sub-3 ledger |
| `AGENTS.md` | 强制 skill 链 + 数据兼容性 (必读) |
| `PRODUCT.md` | 项目背景 + 路线图 |
| `DESIGN.md` | 设计系统 |
| `docs/architecture.md` | 架构总览 |

---

## 5. 关键设计决策 (避免新 session 重新 brainstorm)

### Pair Trigger 状态机 (v4.9.5)
- `NS.txPendingCmds` (Set) + `NS.txAckWaiters` (Map<ackCmdId, {resolve, reject, timeoutId, triggerCmdId, ts}>)
- 8 步主流程: NaN 校验 → buildFrame 校验 → 关闭 modal → 推 waiter → 锁按钮 + 顶部 toast → sendPayload → Mock 30ms 后模拟 ack → 等 ack/timeout
- 同 cmd 互斥 (Q8 决策): `txPendingCmds.has(cmdId)` → 弹 warn toast 拒绝
- Mock 模式 ack 模拟: `!state.serial.connected && !NS._mockAckDisabled` → 30ms 后 `setTimeout` 调 `_triggerAckHandler`

### Pair Trigger RX 接入 (v4.9.6)
- `NS.tryDispatchAckFrames(bytes)`: 滑动窗口扫描 0xAA 起始 → 验证 cmd(0x90/0x91) → length 推导 totalLen → tail 0x55 验证 → 整帧提取 → 调 `_triggerAckHandler`
- 帧布局 (proto_bms kind=0): `header(0xAA) + addr(0x01) + cmd(0x90/0x91) + length(N) + data(N) + crc(2) + tail(0x55)` = 7+N bytes
- CRC 暂不校验 (sub-3 不动; 留 sub-2 parseFrame 通用化时一起做)
- 挂载点: `readLoop` 内 `queueRxBytes` 之前, 出错 `console.error` 但不阻断 RX 行处理

### Settings 持久化
- `state.settings.pairTriggerTimeout`: 默认 3000, 范围 1000-10000
- `normalizePersistedSettings`: 旧 user config 无此字段 → 兜底用 `state.settings` 当前值
- 系统菜单 "Pair Trigger → 触发超时 (ms)" 数字输入 (stepper), 改后 `scheduleLocalPrefsSave()` 防抖保存

### 数据模型
- `NS._KIND_TEMPLATES` 8 个 kind metadata (固定, 不可加新 kind)
- `NS.PROTOCOLS` 加 `kind` 字段, 默认 'fixed-header' 兼容旧 user config
- 8 kind: `fixed-header` (legacy) / `raw` / `cmd-split` / `addr-split` / `ctrl-bit7` / `type-high-bit` / `msgid-mixed` / `tlv`
- 7 kind 都是"方向参与 frame 编码", kind 0 单独是"header 写死"
- **加 kind 0 原因**: commit message 7 kind 设计跟现状 BMS 协议(0xAA 写死 header, 方向不参与)不兼容, 加 kind 0 兼容 + 标 Legacy

### buildFrame 拆法
- `NS.buildFrame` 是 dispatcher, switch on `protocol.kind`
- 8 个 `_buildFrameXxx` 子函数
- 公共抽 `_computeCrcInput` + `_encodeCrcBytes`
- 错误处理: 返 `{ error: 'CODE', bytes: [], sections: [] }` (跟现状 UI 调用方兼容, .bytes 不崩)
- 错误码: `NO_PROTOCOL` / `UNKNOWN_KIND` / `MISSING_FIELD` / `INVALID_TYPE` / `CRC_ERROR` / `NOT_IMPLEMENTED`

### 错误处理
- 严格模式 + UI 错误提示 (不静默 fallback)
- 协议编辑器 验证 按钮 (modal-header toolbar) 触发 buildFrame 验证
- 错误时: 协议 tab 红徽章 ⚠ + 字节预览区红框 + 顶部 toast (3s 自动消失, var(--danger) 红框 / var(--accent) OK 绿框)
- AGENTS.md 严格模式 = "bug 早暴露, 不要静默失败"

### 用户偏好 (从对话总结,避免重复问)
- 中文 commit message, 标题一行, 正文分段 (背景 / 范围 / 验证)
- 多个相关文件一次 commit, 不拆碎片
- 改 UI 后用户自己浏览器验证 (AGENTS.md "看截图找问题, 不查 console")
- 重视 UI 整洁度 (v6.3 移除告警 ? 图标就是例子)
- 喜欢 antd 风格: tab 用 antd 卡片式
- 不喜欢被防御性提问打断, 偏好直接动手
- 工作领域: 户外电源 (portable power station) BMS/EMS/PCS 通信协议, 工业级 TLV/Modbus

---

## 6. 数据兼容性约束 (AGENTS.md 强制)

| 字段 | 处理 |
|---|---|
| `localStorage` keys (`serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`) | **不动** |
| 配置 JSON type (`SerialWebUserConfig` v1) | **不动** |
| `.timeline` 二进制 magic (`WSLBIN1`) | **不动** |
| API 路径 (`/api/serialweb_page-view`) | **不动** |
| JS 内部命名 (`__serialWeb*` / `clearSerialWebStoredUserData`) | **不动** |

v4.9.6 新增字段: `state.settings.pairTriggerTimeout` (默认 3000, 范围 1000-10000)
- 序列化: `buildLocalPrefsSnapshot` 通过 `{ ...state.settings }` 自动包含
- 加载: `normalizePersistedSettings` 验证范围, 越界兜底用 `state.settings` 当前值
- 旧 user config 100% 兼容 (无此字段 → 兜底 3000)

---

## 7. 下次会话建议

### 开场 (新 session 必走)
1. **先读本 HANDOFF.md** 恢复 context (5 分钟)
2. 跑浏览器 smoke test 验证 v4.9 sub-3 (上面 "立即待办" 清单, 10-15 分钟)
3. 报告 v4.9 状态 (OK / 有问题), 选下一项

### 下一项候选 (按优先级)
- **🔥 v5 历史回放** (`.timeline` 录制/回放打磨, 1-2 小时, 独立大块)
- **sub-2 parseFrame 通用化** (贴字节反解析 + 协议编辑器 UI 重构, 中等, 包含 RX 接入扩展到 kind 1-7)
- **暂停** (v4.8 + v4.9 sub-3 全部完成, 等用户新需求)

### 新 session 工作流
- 直接说"按 HANDOFF.md 继续 [具体任务]"
- 跟之前一样走 `using-superpowers` / `brainstorming` (新任务需要 design 时)
- AGENTS.md 强制 skill 链不能跳过

---

## 8. 进度追踪

`.superpowers/sdd/2026-08-04-tx-trigger-sub3-plan/progress.md` 保留 v4.9 sub-3 完整 ledger (Setup + Tasks 1-6 + Plan 修正 + 后续清单), 新 session 可读。

---

**最后更新**: 2026-08-04 (v4.9.6 收尾)
**下次会话提示**: 浏览器 smoke test → 报 v4.9 状态 → 选下一项 (v5 历史回放 / sub-2 / 暂停)
