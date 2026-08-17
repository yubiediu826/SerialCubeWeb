# 卡片右上 type 缩写 + 右下 direction + control 状态突出 — v1.3.12 设计

> **作者**: Mavis (M3) + 用户 M.*
> **日期**: 2026-08-17
> **版本**: v1.3.12 (基于 v1.3.11)
> **状态**: 实施中
> **预览 HTML**: `D:\WorkSpace\SerialCubeWeb\.tmp\mockups\preview-card-0x01.html` (v7)
> **预览截图**: `v7-host.png` + `v7-device.png`

---

## 1. 背景

SerialCube 现有卡片 (220×198px) 在 host/device 模式下展示信息:

- **现状问题**:
  1. **list 编辑器 (line 20336) bug**: type 标签硬编码成 'TREND', control/set/pair 都被显示为 TREND
  2. **缺少 type badge 视觉提示**: 卡片类型只能从状态条颜色推断, 不够直观
  3. **缺少 direction 提示**: footer 只显示范围, 不显示命令方向 (TX/RX/both)
  4. **control 卡状态不突出**: 大字显示字段值 0x0001, 单 bit 状态 (ON/OFF) 反而小字显示
  5. **set 卡 set-src-badge 占用右上角**: 数据源 type (FIXED/SINE) 占用右上角, 卡片 type 反而没有位置

## 2. 设计目标

- **右上角**: 显示**卡片类型英文缩写** (CTRL / SET / TREND / PAIR)
- **右下角**: 显示**命令方向** (TX / RX / TX+RX), 替代现有的"响应查询/手动/active"等发送模式
- **control 卡**: 大字突出**单 bit 状态** (ON/OFF), 字段值 (0xXXXX) + 位编号 (bit N) 改为小字辅助
- **趋势卡 / set 卡**: 保持现状, value 区显示当前值大字

## 3. 设计方案

### 3.1 卡片类型 badge (右上角, 替换 set-src-badge)

| 类型 | 缩写 | 颜色 | 适用卡片 | 字号 |
|------|------|------|---------|------|
| 控制位 | `CTRL` | 橙 (#d97706, `var(--ctrl-soft)`) | 10 张 control | 0.5625rem (9px) |
| 参数 | `SET` | 蓝 (#3a5ccc, `var(--signal-soft)`) | 12 张 set | 0.5625rem |
| 趋势 | `TREND` | 蓝 (跟随 alert 变橙/红) | 6 张 trend | 0.5625rem |
| 配对 | `PAIR` | 紫 (#8b5cf6) | (本预览无, 真实用 charge_v_pair) | 0.5625rem |

实现: 复用真实 SerialCube 的 `.card-status-badge` 样式 (line 6046-6054) + 新增 4 种 type modifier 类.

```css
.type-badge {
  display: inline-flex; align-items: center;
  font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  font-family: var(--font-ui);
}
.type-badge.ctrl { background: var(--ctrl-soft); color: var(--ctrl); }
.type-badge.set { background: var(--signal-soft); color: var(--signal); }
.type-badge.trend { background: var(--signal-soft); color: var(--signal); }
.type-badge.trend.warn { background: var(--warn-soft); color: var(--warn); }
.type-badge.trend.danger { background: var(--bad-soft); color: var(--bad); }
.type-badge.pair { background: var(--pair-soft); color: var(--pair); }
```

### 3.2 命令方向 badge (右下角, 替换 footer-status)

| 命令方向 | 显示 | 颜色 | 5px 圆点 | 适用卡片 |
|---------|------|------|---------|---------|
| TX | `● TX` | 蓝 (#3a5ccc) | 同色 | 10 张 control |
| RX | `● RX` | 绿 (#22c55e) | 同色 | 6 张 trend |
| TX+RX | `● TX+RX` | 紫 (#6b21a8) | 同色 | 12 张 set (双向命令) |
| RX + 告警 | `● RX · DANGER` | 红 (#e0575e) | 同色 | Vcell_max (alert-danger) |

实现: 复用 `.footer-status` 风格 (line 6211-6221) + 新增 `.footer-direction` 类.

```css
.footer-direction {
  font-weight: 700; display: inline-flex; align-items: center; gap: 3px;
  letter-spacing: 0.05em;
}
.footer-direction::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; flex-shrink: 0;
}
.footer-direction.tx { color: var(--accent); }
.footer-direction.rx { color: var(--ok); }
.footer-direction.both { color: var(--both); }
```

### 3.3 control 卡 ON/OFF 状态突出

**v6 现状**:
```
[Load] [ON]
0x0001           ← 大字: 字段值 (16-bit)
ON      [关闭]   ← 小字: 单 bit 状态
bit 0   [发送]
```

**v7 设计**:
```
[Load] [CTRL]
ON                ← 大字: 单 bit 状态 (ON 绿 / OFF 黑)
       0x0201    ← 小字: 字段值 + 位编号 (位于 value 区内右下角)
            bit 0
[关闭]    [发送] ← 按钮: 状态切换 + 发送 (ctrl-row)
位 0 (负载在位) ● TX  ← footer: 位说明 + direction
```

实现细节:
- `card-value` 内 `<span class="num on">ON</span>` (大字 2rem, ON 用 `var(--ok)` 绿)
- `card-value` 内 `<span class="sub">0x0201 · bit 0</span>` (小字 0.5625rem, 浅灰, 绝对定位右下角)
- 移除 `ctrl-single-row` (旧的 ON + 关闭按钮同行)
- `ctrl-row` 保留, 改为 "切换按钮" + "发送按钮" 并排

### 3.4 set 卡 set-src-badge 移除 (右上角空出给 SET badge)

**v6 现状**:
```
[RSOC] [FIXED]    ← set-src-badge 显示数据源 type
26 %
[fixed ▾] [⚙]    ← 数据源 select 也在
[▓▓ 发送 ▓▓]
0-100% ● 响应查询
```

**v7 设计**:
```
[RSOC] [SET]     ← 右上角: 卡片 type (SET)
26 %             ← value: 当前值 (大字)
[fixed ▾] [⚙]   ← 数据源 select (类型显示在这里)
[▓▓ 发送 ▓▓]    ← 发送按钮
0-100% ● TX+RX  ← footer: 范围 + direction
```

数据源 type (fixed/random/sine/ramp/bitset) 已经在 set-row-top 的 select 里, 右上角 badge 改为卡片 type (SET), 不再重复.

## 4. 视觉对比 (v6 vs v7)

### 4.1 control 卡

| 元素 | v6 | v7 |
|------|----|----|
| 右上角 | `[ON]` / `[OFF]` (状态 badge) | `[CTRL]` (类型 badge, 橙) |
| value 大字 | `0x0001` (字段值) | `ON` / `OFF` (状态, ON 绿) |
| value 小字 | (无) | `0x0201 · bit 0` (字段值+位号) |
| ctrl-row | `ON [关闭]` + `bit 0 [发送]` | `[关闭]` + `[发送]` (合并) |
| 右下角 | (无) | `● TX` (蓝) |

### 4.2 trend 卡

| 元素 | v6 | v7 |
|------|----|----|
| 右上角 | `[RX]` (状态 badge, 蓝) | `[TREND]` (类型 badge, 蓝, alert 变橙/红) |
| value | 大字 + range-bar (不变) | (不变) |
| card-trend | sparkline (不变) | (不变) |
| 右下角 | `● RX-ONLY` (蓝) | `● RX` / `● RX · DANGER` (绿/红) |

### 4.3 set 卡

| 元素 | v6 | v7 |
|------|----|----|
| 右上角 | `[FIXED]` / `[SINE]` (数据源 type) | `[SET]` (卡片 type, 蓝) |
| value | 大字 (不变) | (不变) |
| send-row | 数据源 select + ⚙ + 发送/暂停 (不变) | (不变) |
| 右下角 | `● 响应查询` / `● 手动` / `● active` | `● TX+RX` (紫) |

## 5. 实施步骤

### 5.1 改 `SerialCube.html`

1. **CSS 增补** (line 6240 后追加):
   - `.type-badge` + 4 个 modifier (ctrl/set/trend/pair)
   - `.footer-direction` + 3 个 modifier (tx/rx/both) + danger 变体
   - `.card-value .sub` (小字辅助)
   - `.card-value .num.on` (ON 绿)

2. **`NS.renderCard` 改 set 分支** (line 17527-17572):
   - 移除 set-src-badge
   - value 区不再有 range-bar (v6 已移除, v7 保持)

3. **`NS.renderCard` 改 control 分支** (line 17447-17526):
   - value 区: 大字 `num.on` 显示 ON/OFF, 副标题 `sub` 显示 0xXXXX · bit N
   - 移除 `ctrl-single-row` + `ctrl-single-state` + `ctrl-single-toggle` 块, 合并到 `ctrl-row` 一行 2 按钮 (toggle + send)
   - 保留 ctrl-bits 多 bit 模式 (兼容旧 v1.3.6+ 代码)

4. **`NS.renderCard` 改 trend 分支** (line 17573-17620):
   - 替换 footer-status 为 footer-direction (含 alert-danger 变体)

5. **list type 标签修复** (line 20336):
   - `c.type === 'pair' ? 'PAIR' : 'TREND'` → 4 元: `ctrl/set/trend/pair`

### 5.2 改 docs

- `docs/CHANGELOG.md`: 加 v1.3.12 段
- `docs/changelog/2026-08-17-v1.3.12-card-type-direction.md`: 子文件
- `docs/handover/HANDOFF-V1.3.12-2026-08-17.md`: 实施后写
- `README.md` / `docs/README.md`: 当前版本 v1.3.11 → v1.3.12
- `docs/handover/PROJECT-HANDOVER-2026-08-11.md`: 当前版本同步

### 5.3 验证

- `serialcube-e2e` 6 场景
- `agent-browser` 视觉确认 (host + device mode)
- `version-management` check-readme-sync + check-cleanup

## 6. 守门规则

按 skill 守门 (v1.2.2 教训):
- 改 SerialCube.html 前必跑 `bump-version.ps1`
- push 前 ASK USER
- modal 改动 (本次**不**改 modal, 改 card 基础类) 必走 modal-review 6 步 (本次可跳过)
- 累计同类 UI bug ≥ 3 → 强制 design review (本次为新设计 v1, 不在累计)

## 7. 关联文档

- v6 预览: `.tmp/mockups/preview-card-0x01.html`
- v7 截图: `.tmp/mockups/v7-host.png` + `v7-device.png`
- PROJECT-HANDOVER-2026-08-11.md (项目总览)
- HANDOFF-2026-08-17-EMERGENCY-PROTOCOL-REDACT.md (今日上午事件, 跟本设计无关, 但同日 push 已发生, 注意协议守门)

## 8. 待 user 确认

- [ ] type 缩写命名 (CTRL / SET / TREND / PAIR) — OK?
- [ ] direction 颜色 (TX 蓝 / RX 绿 / TX+RX 紫) — OK?
- [ ] control 卡 ON 颜色 (#22c55e 绿) — OK?
- [ ] 小字位置 (value 区内右下角) — OK?
