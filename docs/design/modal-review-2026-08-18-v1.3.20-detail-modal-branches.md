# Modal Review — v1.3.20 detail modal 3 弹窗模式分支 @ 2026-08-18

## 6 步结果

| # | 步骤 | 结果 | 备注 |
|---|---|---|---|
| 1 | 必要性 | ✅ | bit 卡无图表（不能复用 chart-logs 弹窗）, bit_set 需"操作"tab（位开关 + 发送 + 原始字节预览, 不能复用纯显示弹窗）。3 模式分支必做 |
| 2 | 位置 | ✅ | 同一 `dh-detail-modal` 内做 tabs 分支（不新开 modal）, 复用现有 `.detail-page-tabs` |
| 3 | 嵌套 | ✅ | 保持原 detail modal z-index, 不新嵌套（bit/bit_set 子页是 detail modal 的内容, 不会被外层覆盖） |
| 4 | 标题 | ✅ | 复用现有 `.modal-header-standard` (line 14060+), title = `card.title`, 副标题 = `cmdHex + dir`, 右上 X 关闭 |
| 5 | 字段 | ✅ | 复用 SerialCube.html 既有 token: input 32px / button 28-32px / gap 6-8px, 跟 trend/pair/control 卡详情弹窗字段对齐 |
| 6 | 主题 | ✅ | 复用 var(--text) / var(--bg-subtle) / var(--pair-soft) / var(--pair) 等 token, 浅色 + 深色自动适配 |

## 风格基线表

| 元素 | 既有规范 | 新方案 | 一致? |
|---|---|---|---|
| Modal header | 56px, X 右上, title 左上, 副标题 0.75rem | 复用 dh-detail-header | ✅ |
| 按钮高度 | 32px | 复用 .ctrl-send / .ctrl-single-toggle (32px) | ✅ |
| Input 高度 | 32px | bit_set 操作 tab 用 32px checkbox group | ✅ |
| Section 间距 | 16px | tabs 间 8px, 内容间 12px | ✅ |
| Card 颜色 | trend 蓝 / pair 紫 / control 橙 | bit 紫浅 / bit_set 紫深 | ✅ |
| 表格 (历史) | 12px 表头, 11px 单元格 | bit-history 表格同 12/11 | ✅ |
| Tab 字体 | 0.75rem, weight 600 | 复用 .detail-page-tab | ✅ |

## 截图 (跑完 e2e 后补)

- 浅色: screenshots/v1.3.20-control-chart-logs-light.png
- 浅色: screenshots/v1.3.20-bit-history-light.png
- 浅色: screenshots/v1.3.20-bit-editor-light.png
- 深色: screenshots/v1.3.20-control-chart-logs-dark.png
- 深色: screenshots/v1.3.20-bit-history-dark.png
- 深色: screenshots/v1.3.20-bit-editor-dark.png

## 决策

- [x] ✅ 6 步全过, 基线表一致 → 进编码
- [ ] ⏳ 截图待 e2e 后补

## 预览基线

`docs/design/v1.3.20-bit-card-and-detail-modal-preview.html` (1994 行, 默认浅色 + 右上角 toggle 切深色) — 9 段 + 6.5 + 6.6 + 6.7 子界面预览
