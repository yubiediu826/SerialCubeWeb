# HANDOFF-V1.3.18-2026-08-17 — 设备连接管理 3 项改进

> **版本**: v1.3.18 (基于 v1.3.17, patch bump)
> **日期**: 2026-08-17
> **作者**: Mavis (M3) + 用户 M.*
> **关联 spec**: `docs/superpowers/specs/2026-08-17-v1.3.18-frame-timeout-hex-heights.md`
> **关联 plan**: `docs/superpowers/plans/2026-08-17-v1.3.18-frame-timeout-hex-heights.md`
> **子 changelog**: `docs/changelog/2026-08-17-v1.3.18-frame-timeout-hex-heights.md`

---

## 1. TL;DR (30 秒看完)

3 项设备连接管理面板改进一波落地:
1. **组帧超时 (新功能)** — 默认 50ms / 0-2000ms, 解决从机无换行帧 log 挤一块的问题
2. **默认 16 进制 RX/TX** — 改 state 默认值, 复用现有 checkbox UI
3. **下拉框高度统一** — 1 行 CSS padding 7→9px, 跟 baud-rate-combo 同高

| 改动 | 描述 | 关键行 |
|------|------|--------|
| **HTML** | 设备连接管理 .config-grid 加第 5 字段 "组帧超时" | line 7884-7887 |
| **CSS** | `.config-panel .field input/select` padding 7px → 9px | line 2285-2293 |
| **State** | `state.settings.frameTimeout = 50` (默认) | line 9321 |
| **State** | `state.serial._frameTimeoutId = null` | line 9287 |
| **State** | `state.settings.rxDisplayMode` 默认 'text' → 'hex' | line 9306 |
| **State** | `state.settings.sendMode` 默认 'ascii' → 'hex' | line 9309 |
| **JS** | `queueRxBytes` 末尾调 `scheduleFrameTimeout` | line 24257 |
| **JS** | `scheduleFrameTimeout` + `flushFrameByTimeout` helper | line 24261-24271 |
| **JS** | `disconnectSerial` 集成: clearTimeout + finalize | line 25321-25326 |
| **JS** | `normalizePersistedSettings` 加 frameTimeout 0-2000 验证 | line 30124-30127 |
| **JS** | input `change` 事件 handler | line 31439-31453 |

## 2. 实施过程 (5 task, Inline)

| Task | 内容 | Commit |
|------|------|--------|
| 1 | 高度统一 CSS (1 行) | 跟 Task 2 一起 (8603f7d) |
| 2 | 默认 hex (state 2 处) | 8603f7d `feat(config): 设备连接管理 5 字段同高 + 默认 hex RX/TX` |
| 3 | 组帧超时 HTML + state + 持久化 | 跟 Task 4 一起 (5fb0239) |
| 4 | 组帧超时 JS timer + disconnect + change 事件 | 5fb0239 `feat(serial): 设备连接管理加组帧超时 (默认 50ms / 0-2000ms)` |
| 5 | VERSION bump + 文档同步 | 待 commit |

每 task 走 "改 → 自验 (大括号/协议守门/grep) → commit" 流程, 中间报 [REPORT-CHANGED]/[REPORT-VERIFIED]/[REPORT-NEXT] 三段。

## 3. 设计决策 (跟用户的 4 轮问答 + 1 拍板)

### 3.1 Q1: 组帧超时默认值 + 范围

- 用户选: 默认 50ms / 范围 0-2000ms (推荐)
- 理由: 50ms > 字节传输 + 帧间隔 (几个 ms), 0 频误断; 2000ms 上限覆盖慢协议 (Modbus RTU 等)
- 0 = 关 (保持旧行为)

### 3.2 Q2: 组帧超时字段位置

- 用户选: 跟现有 4 字段同区, 5 col 一行 (推荐)
- 实际: `.config-grid` 实际是 2 col, 加第 5 字段变 3 行 (跟用户 "5 col" 假设不同, 但视觉接受)

### 3.3 Q3: 默认 hex 实现方式

- 用户选: 仅初始默认值 (用户能切) + text-encoding 加 'hex' 选项, 默认 = hex (推荐)
- 实际: 简化方案 — 复用现有 `state.settings.rxDisplayMode` + `sendMode` (有完整 hex 支持 + checkbox UI), 改默认即生效, 不需要给 text-encoding 加 hex 选项 (hex 跟字符编码正交)
- 这点是 v1.3.18 跟 spec 的偏差: 发现现有 rx-display-mode 字段后, 简化了 hex 实现

### 3.4 Q4: 下拉框高度统一范围

- 用户选: 仅设备连接管理面板 (推荐)
- 实际: 1 行 CSS `.config-panel .field input/select` padding 7→9px 覆盖 4 select + 2 input

## 4. 关键代码模式

### 4.1 持久化模式 (跟 pairTriggerTimeout 同)

```javascript
// state init
settings: {
  ...,
  frameTimeout: 50
}

// normalizePersistedSettings (line 30124-30127)
frameTimeout: (() => {
  const v = Number(source.frameTimeout);
  if (Number.isFinite(v) && v >= 0 && v <= 2000) return v;
  return state.settings.frameTimeout;
})()
```

不新增 localStorage key, 走 `applyLocalPrefsSnapshot` 现有路径。

### 4.2 idle 计时器模式

```javascript
function scheduleFrameTimeout() {
  if (state.settings.frameTimeout > 0 && state.serial.rxActiveEvent) {
    clearTimeout(state.serial._frameTimeoutId);
    state.serial._frameTimeoutId = setTimeout(flushFrameByTimeout, state.settings.frameTimeout);
  }
}
```

每次新字节来 reset; 超时调 `flushFrameByTimeout` → `finalizeRxActiveEvent`。

### 4.3 disconnect 集成

```javascript
// disconnectSerial 入口 (line 25321-25326)
clearTimeout(state.serial._frameTimeoutId);
state.serial._frameTimeoutId = null;
if (state.serial.rxActiveEvent) {
  finalizeRxActiveEvent(nowPreciseMs(), { processRules: true, syntheticSplit: true });
}
```

不丢尾巴字节。

## 5. 验证清单 (待用户真机测试)

- [ ] 0ms = 完全保持当前挤压行为
- [ ] 50ms (默认) = 8 字节连续帧正常断帧
- [ ] 200ms = 慢设备不误断
- [ ] 改 input 值 → change 事件 clear 旧 timer
- [ ] disconnect → clearTimeout + finalize (不丢尾巴)
- [ ] 重启页面 → localStorage 保留用户值
- [ ] 新装 → 默认 hex (RX + TX)
- [ ] 设备连接管理 5 字段高度一致
- [ ] text-encoding/换行符 高度一致
- [ ] 其他 modal (卡片编辑器/告警/preset) 不受影响

## 6. 风险 + 边界

| 项 | 风险 | 缓解 |
|----|------|------|
| 0ms 默认 | 无新行为 | 跟之前一样 |
| 50ms 默认误断 | 极慢设备 (>50ms 帧间) 误断 | 用户可调 0-2000ms |
| disconnect 时尾巴字节 | rxActiveEvent 仍可能有未提交 | disconnect handler clearTimeout + finalize |
| hex 默认 + 已存 user config | user config 覆盖默认 | 不强制迁移 |
| input 拖值时旧计时器 | 用户输入到 change 期间被旧 timer finalize | `change` 事件 clear 旧 timer |
| 协议解析器误改 | tryDispatchAckFrames 可能受影响 | 不动协议解析路径, 跟 rxActiveEvent 正交 |

## 7. 跟 v1.3.17 / v1.3.16 关系

- v1.3.17 (1 commit a3779e2): 修复 dashboard render 缺失
- v1.3.18 (3 commits 8603f7d + 5fb0239 + docs): 3 项设备连接管理改进
- 状态: v1.3.18 跟 v1.3.17 主题相关 (都是设备连接管理) 但代码不重叠

## 8. 推送记录

- 本地 3 commit: 8603f7d (config) + 5fb0239 (serial) + 待 docs commit
- 远程: 推前 ASK USER 确认
- 绕开 127.0.0.1:7897 代理: `git -c http.proxy= -c https.proxy= push origin main`
- 部署验证: 推后跑 deploy-checklist 5 件事

## 9. 下次接手提示

- 3 项改进已实装, 后续如再优化, 优先看:
  - 组帧超时 + 协议解析器协同 (现在并行, 后续可让 timer 帮 parser 预切帧)
  - 字段类型 i8/f32 验证 (frameTimeout input 当前只验证 0-2000 数字)
  - hex 显示格式可调 (空格分隔 / 0x 前缀 / 大小写)
- v1.3.18 复用 v1.3.17 的 4-render 同步模式 (renderCommandPanel + renderCardGrid + renderAlerts + updateDashboardProtoBar), 跟仪表盘保持行为一致
- 5 字段 grid 未来如加 6 字段, 改 `.config-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }` 为 3 col 即可
