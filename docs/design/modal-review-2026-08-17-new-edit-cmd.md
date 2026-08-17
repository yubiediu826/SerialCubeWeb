# Modal Review — 新建命令 / 编辑命令 弹窗优化 @ 2026-08-17

## 触发

用户反馈: "当前优化方案不接受，先优化新建命令和编辑命令的弹窗界面"

**大改触发**: 改 modal 布局 (dataField 折叠) + 改 UI 风格 (模板按钮) + 改 UI 一致性 (df-dir 颜色)

## 6 步结果

| # | 步骤 | 结果 | 备注 |
|---|---|---|---|
| 1 | 必要性 | ✅ | 49 行无折叠、位定义对所有类型显示、df-dir tx 误用警告色 — 3 个明确问题, 必须修 |
| 2 | 位置 | ✅ | 编辑/新建 modal 在 dh-new-command-modal / dh-edit-cmd-modal 内, dashboard-host 内, 位置对 |
| 3 | 嵌套 | ✅ | modal-stack 已实装 (v1.2.1), 编辑命令从配置中心打开嵌套 OK, z-index 1000+len*20 |
| 4 | 标题 | ✅ | 已用 .modal-header-standard, title "新建命令" / "编辑命令" + meta "协议：xxx" 单行, X 右上, 跟其他 modal 一致 |
| 5 | 字段 | ⚠️ | input 高度 28px 偏小, wiz-field-del 24px click target 偏小, wiz-field-table padding 6/8 偏紧, df-dir tx 颜色错 (警告色 #d97706 应 = signal) |
| 6 | 主题 | ✅ | 暗色+浅色都用 --text/--border/--accent token, 主题切换会跟随 |

## 风格基线表

| 元素 | SerialCube 既有规范 | v1.3.15 实装 (新建/编辑命令) | 一致? |
|---|---|---|---|
| Modal header 高度 | 56px | 56px (.modal-header-standard) | ✅ |
| Modal title 字号 | 16px / 600 | 16px / 600 | ✅ |
| Modal meta 字号 | 12px mono ellipsis | 12px mono ellipsis | ✅ |
| 按钮高度 | 32px (6/12 padding) | .wiz-field-del 24px ❌ / +添加字段 28px ❌ / 删除位 24px ❌ | ❌ 偏小 |
| Input 高度 | 32-36px (6-8/10-12 padding) | .wiz-field-table input padding 3/6 → ~24px ❌ | ❌ 偏小 |
| Select 高度 | 32-36px | .wiz-field-table select padding 3/6 → ~24px ❌ | ❌ 偏小 |
| Table row 高度 | 36px | .wiz-field-table td padding 6/8 + 12px 字号 → ~30px ❌ | ❌ 偏小 |
| Section 间距 | 16px (8-12-16-24 scale) | 段间 8-12px ❌ | ❌ 偏小 |
| Pill 高度 | 20-22px | .df-dir 14-18px ❌ | ❌ 偏小 |
| df-dir 颜色 | --signal TX / --success RX / --dir-both-fg 双 | .df-dir.tx = #d97706 (警告色) ❌ | ❌ 错配 |
| 颜色对比度 | WCAG AA 4.5:1 | --text 在 --bg 4.0-4.5:1 | ⚠️ 临界 |
| 关闭按钮 32px | 32px+ | 24px ❌ | ❌ 偏小 |

## v1.3.15 实装截图

- `tmp/mockups/v1315-new-cmd-modal.png` — 新建空态
- `tmp/mockups/v1315-new-cmd-modal-add.png` — 新建 2 字段示例
- `tmp/mockups/v1315-edit-cmd-real.png` — 编辑 0x01 顶部 + 数据字段表
- `tmp/mockups/v1315-edit-cmd-df-area.png` — 编辑 0x01 中间 + 多组 bitset 位定义
- `tmp/mockups/v1315-edit-cmd-scrolled.png` — 编辑 0x01 底部 + 帧预览

## 8 个核心问题

| # | 优先级 | 问题 | 根因 | 修复 |
|---|---|---|---|---|
| 1 | **P0** | 位定义列对非 bitset 字段无意义 | `bitsEditorHtml(df)` 无条件渲染, 不区分类型 | 按 df.type 判断, 只有 bitset 显示位编辑; u8/u16 等显示"—"灰字 |
| 2 | **P0** | 数据字段 49 行无折叠/分组 | 全展开, scroll 频繁 | 按"TX 发送" / "RX 接收"分组, 组可折叠; sticky 表头 |
| 3 | **P0** | df-dir.tx 用警告色 #d97706 (orange) | L7391 hardcoded #d97706, 跟 footer-direction.both 重用 | 全部用 v1.3.12 新 token `--dir-tx-fg` (蓝) / `--dir-rx-fg` (绿) / `--dir-both-fg` (紫) |
| 4 | P1 | 字段行高 30px 偏小 | `.wiz-field-table td` padding 6/8 | padding 8/12 → 行高 36px |
| 5 | P1 | input/select 宽 80px 偏窄 | `.wiz-field-table input` width 80 | 名字 160 / 默认值 120 / 类型 100 |
| 6 | P1 | "+ 添加字段" 模板化缺失 | 一律添加空字段, 用户得手动改类型 | 拆 3 按钮: "+ u8 字段" / "+ u16 字段" / "+ bitset 字段" |
| 7 | P1 | 字段方向 默认"— 无" 应跟 cmd 方向 | df.dir 默认 undefined → 渲染 "— 无" | 跟随 cmd.direction, 用户改顶层时, 已加字段自动 follow |
| 8 | P1 | 批量默认值 按钮 用途不明 | 按钮代码无对应 handler, 实际不工作 | 改名"重置默认值为 0" + 真实实现 (setAllDefault) |

## 截图（必填）

- 浅色: 待 agent-browser 截 (暂略, 走 token 验证)
- 深色: `tmp/mockups/v1315-edit-cmd-real.png` + `v1315-edit-cmd-df-area.png`
- 嵌套场景: `tmp/mockups/v1315-edit-cmd-modal-real.png` (从配置中心打开编辑命令)

## 决策

- [ ] ✅ 6 步全过, 4 项基线待修 (input 高度/select 高度/table 行高/df-dir 颜色)
- [ ] ❌ 任一步失败 → 回到对应步骤重做
- 8 项核心问题, 1-3 是 P0 (真问题+误导), 4-8 是 P1 (改进)

## 实施计划 (v1.3.16)

1. bump v1.3.15 → v1.3.16
2. P0-1: `_renderNewCmdDataFields` bitsEditorHtml 加 type 判断
3. P0-2: 字段按方向分组 + 折叠 + sticky 表头 (CSS + JS)
4. P0-3: `.df-dir` 3 颜色用 token, 加 `--dir-both-fg` 到根
5. P1-1~5: 行高/宽/模板按钮/方向联动/重置默认值 一次性
6. 截图验证 (浅+深)
7. README/CHANGELOG 同步
8. ASK push

## 决策点 (需用户确认)

1. **P0-2 分组方式**: 按方向 (TX/RX) / 按类型 (u8/u16/bitset) / 都不分组只加 sticky header
2. **P1-6 模板按钮**: 3 按钮 (u8/u16/bitset) / 1 个下拉 (10 类型) / 维持原样 (空字段)
3. **P1-7 方向联动**: 顶层改方向时, 已加字段自动 follow (推荐) / 顶层不影响字段
