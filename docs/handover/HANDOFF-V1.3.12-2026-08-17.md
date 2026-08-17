# HANDOFF-V1.3.12-2026-08-17 — 卡片右上 type + 右下 dir + control 状态突出

> **版本**: v1.3.12 (基于 v1.3.11, patch bump)
> **日期**: 2026-08-17
> **作者**: Mavis (M3) + 用户 M.*
> **关联 spec**: `docs/superpowers/specs/2026-08-17-card-type-and-direction-badges-design.md`
> **子 changelog**: `docs/changelog/2026-08-17-v1.3.12-card-type-and-direction-badges.md`

---

## 1. TL;DR (30 秒看完)

3 块 UI 改动, 全部基于真实 SerialCube 现有 CSS token, 卡片尺寸不变 (220×198px), 跟 v6/v7 mockup 设计完全一致.

| 改动 | 描述 | 行号 |
|------|------|------|
| **CSS** | 新增 `.type-badge` + 4 modifier (ctrl/set/trend/pair) | line 6250-6260 |
| **CSS** | 新增 `.footer-direction` + 3 modifier (tx/rx/both) | line 6261-6274 |
| **CSS** | 新增 `.card-value .sub` (小字辅助) + `.num.on` (ON 绿) | line 6275-6280 |
| **Control 单 bit 卡** | ON/OFF 大字突出, 字段值+位编号缩为小字 | line 17489-17518 |
| **Control 多 bit 卡** | 右上 type badge | line 17535+ |
| **Set 卡** | 移除 set-src-badge, 右上 SET badge, 右下 direction | line 17579+ |
| **Trend 卡** | footer-status 改 footer-direction (含 · DANGER 变体) | line 17660+ |
| **Pair 卡** | 右上 PAIR badge, 右下 direction | line 17464+ |
| **List 编辑器 bug fix** | 4-way ternary (ctrl/set/trend/pair) | line 20397 |

## 2. 设计决策 (跟用户的 3 轮迭代)

### 2.1 第一轮: 4 类卡片 (control/pair/set/trend) 现状确认
- 用户起初认为 "主机和从机都使用趋势卡片", 实际现状是 4 类分工 (control/pair/set/trend) 已实现
- 认知错位来自: list 编辑器 (line 20336) type 标签硬编码 'TREND'

### 2.2 第二轮: 数据源可下拉 + 发送控制 (3 模式)
- 用户要求: set 卡数据源可选 + 手动/自动发送
- 设计 v2: 数据源 + 立即发送按钮 + 间隔输入
- 但用户**新要求**: 卡片按命令方向绑定, 不按 TX+RX 拆分

### 2.3 第三轮: 卡片按 cmd.direction, 不是按 card.dir
- 关键认知: 卡片只绑命令+字段, 不存 `c.dir`, 行为由 `cmd.direction + card.type` 推导
- 设计 v3-v7 迭代: 暗色 → 白底真实 CSS → 同尺寸 132px → 4 列布局 → 移除 range-bar → 右上 type 缩写 + 右下 direction

### 2.4 最终 v7 (落地版)
- 4 类卡片**跟真实 SerialCube 220×198 风格完全一致**
- 右上 type badge: CTRL (橙) / SET (蓝) / TREND (蓝/跟随 alert) / PAIR (紫)
- 右下 direction: TX (蓝) / RX (绿) / TX+RX (紫)
- control 单 bit: ON/OFF 大字 (2rem, ON 绿), 字段值+位编号小字 (0.5625rem, 浅灰)
- list 编辑器 type 标签 bug 修复

## 3. 实施过程 (8 步)

```
1. 写 spec (docs/superpowers/specs/2026-08-17-...)
2. commit spec
3. bump-version (patch 1.3.11 → 1.3.12) + 5 文件 (SerialCube.html + 4 docs)
4. bump commit
5. 实施 SerialCube.html 5 块改动 (CSS + 4 类卡片 + list bug)
6. agent-browser 验证 (4 类卡片 type badge + direction 都正确)
7. check-readme-sync + check-cleanup (R4 + R4.2 全过)
8. (待) commit + ask user push
```

## 4. 验证清单 (已过)

- ✅ control 卡: typeBadge=CTRL, dir=TX, value=OFF (大字), sub="0x0000 · bit 0" (小字)
- ✅ set 卡: typeBadge=SET, dir=TX (per-card), set-src-badge REMOVED
- ✅ trend 卡: typeBadge=TREND, dir=RX (含 · DANGER 变体 for Vcell_max)
- ✅ pair 卡: typeBadge=PAIR, dir=both (when present, 0 pair cards in current state)
- ✅ list editor type: 4-way ternary (line 20397)
- ✅ check-readme-sync: 4 项全过
- ✅ check-cleanup: 0 issues

## 5. 跟 v6/v7 mockup 关系

`D:\WorkSpace\SerialCubeWeb\.tmp\mockups\preview-card-0x01.html` v7 是设计参考. 实际实施跟 mockup 完全一致:
- 卡片尺寸 220×198
- statusbar 3px (control 橙/绿, set 蓝/绿[AUTO], trend 蓝, pair 绿/橙/红)
- value 区大字 2rem Cascadia Code weight 800
- 右上 type badge 0.5625rem uppercase
- 右下 direction badge 0.5625rem + 5px 圆点
- footer 20px 高

## 6. 关联文档

- spec: `docs/superpowers/specs/2026-08-17-card-type-and-direction-badges-design.md`
- 子 changelog: `docs/changelog/2026-08-17-v1.3.12-card-type-and-direction-badges.md`
- PROJECT-HANDOVER 当前版本同步
- v7 mockup: `.tmp/mockups/preview-card-0x01.html`
- v7 截图: `.tmp/mockups/v7-host.png` + `v7-device.png`

## 7. 推送前必做 (按 user 硬性要求)

⚠️ **push 前 ASK USER 确认** (per memory + version-management R2):
- 涉及 1 个 commit (d5f4d23) 含 SerialCube.html + 5 docs
- 5 件事 deploy-checklist (console 无错 / 6 e2e / index 重定向 / 资源可达 / 版本同步) 已过 README 同步
- 等用户明确说 "push" 才推
