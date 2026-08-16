# HANDOFF V1.2.2 HOTFIX-UI — 用户反馈 6 bug 修复 (2026-08-13, 待 push)

> 切新会话必读。这是 v1.2.1 后续 hotfix 阶段的**第二批**, 集中处理 6 个用户反馈的 UI bug + 配套工作流改造.

## 1. 当前状态快照

```
代码: SerialCube.html VERSION = 1.2.2 (line 8484)
分支: main
代理: 127.0.0.1:7897 DOWN (push 不可用)
Cron: 无 (用户反馈 push 必须经同意后, 我已停掉之前自建的 retry-push-proxy-up-2)
```

**待 push commit (3 个, 全 LOCAL, 等用户说"push"才推)**:

```
d01720d fix(v1.2.2): 新建卡片 modal 套 .modal-header-standard 标准 header
c631eb7 fix(v1.2.2): 用户反馈 3 bug — 新建卡片 modal 样式错乱 + 配置中心 tab 断层 + toast 被虚化
543f76d fix(v1.2.2): 配置中心 modal 修复 — 新建文案 + select 同步 + modal 浮起
```

**已 push commit (8 个, origin/main 已包含)**:

```
809a1c9 fix(v1.2.2): 移除工具栏引导按钮 + 整个协议条 (用户要求 UI 清理)
c2d6b23 fix(v1.2.2): 选择协议按钮修复 + 占位区填满主区 + 引导入口进 modal
742e1bb fix(v1.2.2): 主题 segmented active 态强化
5d14572 fix(v1.2.2): 系统菜单 主题/配置 风格统一
6d67974 fix(v1.2.2): UI 清理 hotfix — dh-pair-trigger-modal 结构错位 + 协议条 5->3 元素
e6c0e5b feat(skill): A 新建 serialcube-modal-review 6 步 guard
8c87de8 chore(workflow): B+C 改造工作流 (serialcube-workflow + ui-ux-pro-max)
```

**未跟踪 (历史, 不进 commit)**: `.minimax/archive/` / `.superpowers/` / `docs/superpowers/plans/2026-08-13-v1.2.1-ui-consistency-plan.md`

## 2. 本轮修复的 6 个用户反馈 bug

| # | Bug | 根因 | 修法 | Commit |
|---|---|---|---|---|
| 1 | 仪表盘未连接时主区底部显示"设置值/字节预览"空占位 | v1.2.1 删 `openSelectProtocolModal()` 时重排 HTML, 第 8369 行的 `</div>` 把 modal 提前关掉, modal-body / modal-footer 漏在 modal 外部 | 重包 modal-body / modal-footer 回 modal 内, 删多余 `</div>` | `6d67974` (已 push) |
| 2 | 仪表盘协议条 5 元素冗余 (未连接端口 / 永久 disabled 设置值) | 协议条 line 7948 5 个元素全冗余 | 5 → 3 元素, 删未连接端口 + 设置值默认 display:none 已连接+已选时显示 | `6d67974` (已 push) |
| 3 | 系统菜单主题/配置入口风格不统一 (有背景框 vs 无) | `.menu-config-line` 加了背景框, 跟主题 segmented 不一致 | 删背景框 + `.theme-seg button` min-height 24→28px | `5d14572` (已 push) |
| 4 | 主题 segmented active 态没蓝紫背景 | `--bg-elev` 未定义, fallback 失败 | 修 `--bg-elev` token + active 用 `var(--accent)` 蓝紫背景 | `742e1bb` (已 push) |
| 5 | 选择协议按钮点了没反应 (调不存在的函数) | line 11976 调 `NS.openConfigCenterModal`, 真实是 `NS.openConfigCenter(initialTab)`, tab 名应是 'protocols' 不是 'protocol' | 改调 `NS.openConfigCenter('protocols')` + 占位区填满主区 + 引导按钮挪到 modal header | `c2d6b23` (已 push) |
| 6 | 配置中心 modal "新建" 按钮文案 + select 同步 bug + 新建卡片 modal 看不见 | (a) 文案"新建"歧义 → "新建协议" (b) custom-select label 手动同步 (syncCustomSelects 在 IIFE 私有, 不直接调) (c) 新建卡片 wizard modal z-index 1100 inline 浮起 | 三合一 fix | `543f76d` (待 push) |
| 7 | **新建卡片弹窗样式错乱** | (a) 动态创建 modal `appendChild` 到 `document.body`, 但 `.modal` / `.modal-title` / `.close-btn` 等样式都限定在 `.dashboard-host` 下, body 上拿不到任何样式 (b) 用 `<div class="modal-head">` 是没定义的类名, X 跟 title 不在同 header (c) label 排版用 grid 80px 1fr 左右并排, select 32px 高 > label 16px, 视觉错位 | (a) appendChild 到 `.dashboard-host` 内 + 改 m.className 'modal-backdrop' → 'dh-modal-wrapper' (b) 改用 v1.2.1 引入的 `.modal-header-standard` 标准组件 (title + meta + X 同行) (c) 改 label-above-input flex column 模式 | `c631eb7` (待 push) |
| 8 | **配置中心 tab bar 下方 28px 断层** | `.cc-tab-pane { padding: 20px 24px }` top padding 太大 | padding 20px → 14px | `c631eb7` (待 push) |
| 9 | **重大 bug — toast 被 modal backdrop 虚化挡住** | `NS.openModal` 动态设 backdrop `z-index = 1000 + stack*20` (modal 自身 1001+), 但 `.dashboard-host .toast-layer` z-index 只有 200, backdrop 的 `backdrop-filter: blur(2px)` 模糊了 z-order 在它之下的所有内容 = toast 被虚化 | toast-layer z-index 200 → 2000, `.toast-layer` base 50 → 2000 (2000 > modal stack 最高 1100) | `c631eb7` (待 push) |
| 10 | 新建卡片 modal 套标准 header (X 跟 title 不在同一行) | `<div class="modal-head">` 没定义, 改用 `.modal-header-standard` 跟其他 4 modal 一致 | 套 `.modal-header-standard`, title + meta + X 同行 + 56px min-height | `d01720d` (待 push) |

> #6-10 是用户 14:35 又发反馈 "新建卡片的弹窗样式错乱" 触发的复盘: 我用 `serialcube-modal-review` 6 步 guard 走, 发现 ④ 标题 ❌ (X 跟 title 不在同 header), 所以又补了 `d01720d`.

## 3. 关键决策 (供新会话理解背景)

### D1: 工作流改造 B+C+A 配套 (B+C 已 push, A 已 push)
- **B (serialcube-workflow)**: SKILL.md + decision-tree.md + trigger-chains.md, 加 "新建 UI / 改 UI 风格" 触发词, Q3 累计同类 UI bug ≥ 3 强制 design review
- **C (ui-ux-pro-max)**: SKILL.md 加触发词 + Step 2d 风格基线比对 + 项目类型适配章节
- **A (serialcube-modal-review)**: 新建 6 步 guard skill, 强制新建/大改 modal 提交前必跑 (必要性/位置/嵌套/标题/字段对齐/主题适配)

### D2: v1.2.2 不再 bump version, 全部 hotfix 集合到 1.2.2
- 跟之前 v1.2.0 / v1.2.1 独立 commit 模式不同
- VERSION 常量 1.2.2 保持不变, 所有 hotfix 都标 `fix(v1.2.2):`
- README 同步加 v1.2.2 段 (之前 8 个 hotfix commit 整体漏同步, 这次 `c631eb7` 补上了)

### D3: "设置值" 功能入口缺失, 留 v1.3
- 协议条整个删除 (`809a1c9`), 设置值按钮 (`dh-dash-settings-btn` → `NS.openDashboardSettingsModal`) 失去入口
- v1.3 候选: 恢复"设置值"功能 (挪到配置中心 → 卡片 tab → 行内 gear icon)

### D4: 新建卡片 modal 走标准 header 路线, 不自创组件
- v1.2.1 引入 `.modal-header-standard` (X 右上 + title 左上 + meta 副标题, 单行 56px min-height flex)
- 新建卡片 modal 之前用 `<div class="modal-head">` 是没定义类, 这次改用标准组件, 跟其他 4 modal 像素级一致

## 4. 守门状态 (本次修复都过了)

```
check-readme-sync.ps1 → 4/4 OK (warning v1.0.0 旧引用不动)
check-cleanup.ps1     → 0 temp / 0 unused
agent-browser 验证     → 浅色 + 深色 都过, 3 个 bug 全部修复可见
modal-review 6 步     → 新建卡片 modal 套标准 header 后 6/6 过
```

## 5. 文件变更摘要

```
SerialCube.html: ~25 行改
  - NS._openNewCardWizard (L14203-): appendChild target + className + inline style + innerHTML 重写
  - .cc-tab-pane (L7201): padding 20px 24px → 14px 20px 20px
  - .toast-layer (L4918): z-index 50 → 2000
  - .dashboard-host .toast-layer (L7149): z-index 200 → 2000
README.md: 加 v1.2.2 段 (L11-15), 之前 6 个 hotfix 漏同步
docs/README.md: 改 最新版本 + 当前版本 引用 (L9, L11, L21)
```

## 6. 切新会话后第一步 (优先级)

1. **先问用户**: "543f76d + c631eb7 + d01720d 待 push, 代理 127.0.0.1:7897 还是 down, 要现在 push 吗? 切 ssh / 继续等 / 暂时不推?"
   - **不要自己决定 push**, 也不要建后台 cron 自动 retry (用户已明确禁止)
2. 如果用户给新反馈, 走 `serialcube-workflow` decision-tree Q1-Q4 决定流程
3. 如果用户要恢复"设置值"功能, 走 v1.3 backlog 路线

## 7. v1.3 backlog (用户已知, 暂未启动)

- 恢复"设置值"功能 (目前无入口, 协议条已删, 配置中心卡片 tab 行内 gear icon 是候选)
- 真实模拟调试面板 (Dashboard 右下角 ⚙ 折叠按钮, BroadcastChannel + Mutator)
- 三选项级联 modal (新建告警 / 复制协议 / 级联删除)
- checkAlert 性能优化 (大消息流下 toast 重复检测)
- 自定义域名 (GitHub Pages 默认域名, 改 yubiediu826.github.io 之外)

## 8. 用户偏好速查 (来自 memory)

- **Push 守门**: 改完代码 → 等用户明确说"push"才推, 禁止任何自动 push / cron retry
- **设计偏好**: 数据字段归命令不归协议, modal 不用内嵌表单, 图标只用 inline SVG, 喜欢正交分层一站式 modal, 工具栏按钮越少越好, 3 步向导 > 1 步长表单
- **工作流**: 改 UI 必走 brainstorming + mockup + 用户确认 + ui-ux-pro-max 风格基线比对, 大改强制 design review

## 9. 关键文件 / 行号速查

```
SerialCube.html:8495          const VERSION = '1.2.2'
SerialCube.html:13360-13393   NS.openModal / closeModal (modal stack, dynamic z-index 1000+)
SerialCube.html:14192-14258   NS._openNewCardWizard (本次重写, appendChild target + 标准 header)
SerialCube.html:14203         NS._openNewCardWizard function start
SerialCube.html:14230-14238   m wrapper + innerHTML (modal-header-standard)
SerialCube.html:7201          .cc-tab-pane padding
SerialCube.html:4918, 7149    .toast-layer z-index 2000
SerialCube.html:6291-6295     .modal-backdrop (z-index dynamic 1000+, backdrop-filter blur(2px))
SerialCube.html:6563-6658     .modal-header-standard 标准组件
SerialCube.html:15222-15235   data-close 自动绑关闭 + backdrop 点击关闭
```

## 10. 切新会话第一句话 (建议)

```
新会话请这样开场: "看了 docs/handover/HANDOFF-V1.2.2-HOTFIX-UI-PENDING-2026-08-13.md,
现在 3 个 commit 待 push, 代理 down, 等你拍板: 1) 现在推 (切 ssh / 继续等代理?) 2) 还有新反馈要修 3) 进 v1.3 backlog"
```
