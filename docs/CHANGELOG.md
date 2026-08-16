# SerialCube 变更记录

> **本文件是变更日志的「主索引」**。**完整详情见 `docs/changelog/` 子目录**。
>
> **维护规则:**
> - **每次 push commit 到 main 前** 必在 [`docs/changelog/`](changelog/) 写一个 `YYYY-MM-DD-<topic>.md` 子文件
> - 本主文件**只放路径指针**,不重复内容
> - 倒序排列（最新在最上）

---

## 📑 子文件索引

### 2026-08-16

- [`changelog/2026-08-16-v1.3.7-host-device-sim-and-control-cards.md`](changelog/2026-08-16-v1.3.7-host-device-sim-and-control-cards.md) — **v1.3.7**: 协议导入自动生成卡片 + host/slave 各成独立双向协议(角色标记+独立 id, 双页面各导各的) + 主机控制卡(编辑 ctrl 位表+发送 MB 控制帧+显示遥测响应) + 卡片级从机数据源(固定/随机/正弦/斜坡) + 仿真角色持久化
- [`changelog/2026-08-16-v1.3.6-bms-dual-direction-and-config-split.md`](changelog/2026-08-16-v1.3.6-bms-dual-direction-and-config-split.md) — **v1.3.6**: 0x01 双向 MB/CB 解析 (主机 ctrl 位表 / 从机 159B 遥测, 帧头判向 + len 归一) + 新建卡片编辑命令/字段下拉空白修复 (custom-select 浮动菜单重建) + BMS 主机/从机配置拆分 (bms_v113_host.json / bms_v113_slave.json) + 0x16 MB 4 字节 + 0x14 变长 PAC 补全 + 卡片字段按方向标注
- [`changelog/2026-08-16-v1.3.5-p0-hotfixes.md`](changelog/2026-08-16-v1.3.5-p0-hotfixes.md) — **v1.3.5**: P0 止血 — mock tick 加串口连接守卫 (真实数据不再被抖动覆盖) / 告警对象比较 bug / checkAlert 无参调用 / float·double IEEE754 编码对称 / 类型表单一数据源 / **CRC16-Modbus 修正为标准算法 (真机互操作)** / Mutator·预设 XSS 转义 / link-check 脚本 2 处 bug; 补 v1.3.3·v1.3.4 tag; 确认 v1.3.2·v1.3.2.1 为文档级发布无独立代码版本
- [`changelog/2026-08-16-protocol-schema-and-sim-tools.md`](changelog/2026-08-16-protocol-schema-and-sim-tools.md) — **P1-P3 (main 未发布)**: 协议位级解析 (BMS V1.13 + EMS V1.4.3 schema/解码/编码/轮询/黄金向量 L1 6/6) + 模拟主机/从机 (L2 8/8 + socket 集成) + CI 7 项门禁 + 坏链 47→0 + 9 个未定义 CSS token 修复; 待推送
- [`changelog/2026-08-16-p4-governance.md`](changelog/2026-08-16-p4-governance.md) — **P4 持续治理**: 备份分支资产收编 (从机计划/集成交接/v1.2.1 plan) + EMS 长尾转写 (461 字段/14 命令, 解析脚本可复现) + Playwright L3 e2e + CI l3 job; 待推送

### 2026-08-14

- [`changelog/2026-08-14-v1.3.4-cascade-modal-unify.md`](changelog/2026-08-14-v1.3.4-cascade-modal-unify.md) — **v1.3.4**: 3 个删除 modal 统一 (协议/命令/卡片 全部用同一 modal) — 修 title 重复 + 死"删除方式" section + 双重选择机制矛盾 + 协议从 window.confirm 迁到 modal; 持久化 bug 修 7 处 (命令/卡片删除 + 4 处卡片修改路径漏 `_saveUserConfig`); 编辑模式按钮 2x 触发 bug 修 (NS.attachModalHandlers 加 `_modalHandlersBound` 守卫); 编辑模式前置条件 (需已连串口 + 已激活协议); mockup [`design/v1.3.4-cascade-modal-redesign-mockup.html`](../design/v1.3.4-cascade-modal-redesign-mockup.html); handoff [`HANDOFF-V1.3.4-2026-08-14.md`](../handover/HANDOFF-V1.3.4-2026-08-14.md)
- [`changelog/2026-08-14-v1.3.3-config-center-proto-filter.md`](changelog/2026-08-14-v1.3.3-config-center-proto-filter.md) — **v1.3.3 hotfix**: 协议配置中心 3 tab (命令/卡片/告警) 按 activeProtoId 过滤 — 顶部 badge 抽公共函数 `_refreshConfigCenterBadges` 9 处统一; commands tab 协议下拉默认值改用 activeProtoId; cards / alerts 表格内容按 activeProtoId 过滤 + 修复行 idx 错位 (filtered 局部下标 → NS.CARDS.indexOf 全局下标) + UI 一致性 (删顶部"导入" + 底部"导出" + 顶"新建协议"挪到 tab 内) + 命令 tab 删下拉 + 协议删除改简单 confirm + 自动持久化 (localStorage `serialcube.userConfig.v1`) + handoff [`HANDOFF-V1.3.3-CONFIG-CENTER-FILTER-2026-08-14.md`](../handover/HANDOFF-V1.3.3-CONFIG-CENTER-FILTER-2026-08-14.md)
- [`changelog/2026-08-14-v1.3.2.1-dashboard-state-3way.md`](changelog/2026-08-14-v1.3.2.1-dashboard-state-3way.md) — **v1.3.2.1 hotfix**: 仪表盘占位区按 3 状态分支文案 (disconnected-no-proto / connected-no-proto / disconnected-with-proto) + 卡片区串口未连时也隐藏 + toggleActiveProtocol rAF 防御性重渲染 + NS.serialConnected 拼写错误修复 (line 14371/14379 之前用 NS.serialConnected 永远 undefined)
- [`changelog/2026-08-14-v1.3.2-dashboard-bug-fixes.md`](changelog/2026-08-14-v1.3.2-dashboard-bug-fixes.md) — **v1.3.2 hotfix**: 仪表盘 3 个阻断 bug 修复 — 命令 panel 跨协议 flatMap 不过滤 (BMS 8 条默认显示) + 选择串口按钮无 binding (点了没反应) + 应用协议不刷新渲染; 同步 `NS._serialConnected` (之前从未被赋值, 导致 updateDashboardSettingsBtn 永远 disabled); 改 `updateDashboardProtoBar` 双条件看 activeProtoId + serialConnected
- [`changelog/2026-08-14-readme-and-handoff-followup.md`](changelog/2026-08-14-readme-and-handoff-followup.md) — **v1.4.0 回滚 followup**: 根 README 精简 (15.8KB → 4.3KB, 砍 5 段版本历史 + 开发工具表 + 文档导航表) + 新建 [HANDOFF-2026-08-14-V1.4-ROLLBACK-AND-MAINTENANCE.md](../handover/HANDOFF-2026-08-14-V1.4-ROLLBACK-AND-MAINTENANCE.md) (12.5KB, 完整 session 交接含 6 个关键决策 why + 5 个文档 backlog 清单)
- [`changelog/2026-08-14-rollback-v1.4.0.md`](changelog/2026-08-14-rollback-v1.4.0.md) — **v1.4.0 回滚**: force-push main `4e7249b` → `c4d8b08`,移除 13 commit (V1.13 协议集成 + slave 工具 + chrome-cdp skill + agent-browser 弃用); backup 分支 `backup-pre-rollback-2026-08-14` 保留 37 文件 / 6075 行

### 2026-08-13

- [`changelog/2026-08-13-v1.3.1-cascade-delete-modal.md`](changelog/2026-08-13-v1.3.1-cascade-delete-modal.md) — v1.3.1 三选项级联 modal: 协议/命令/卡片删除升级 (替换 v1.2 browser confirm) + 引用预览 chip + "仅删自己" hint
- [`changelog/2026-08-13-v1.3.0-debug-panel.md`](changelog/2026-08-13-v1.3.0-debug-panel.md) — v1.3.0 真实模拟调试面板: BroadcastChannel 主从 + Mutator 单条 + 预设场景 chip + Stats 实时计数 (Lucide SVG ⚙, 4 段布局)
- [`changelog/2026-08-13-v1.2.2-ui-cleanup.md`](changelog/2026-08-13-v1.2.2-ui-cleanup.md) — v1.2.2 hotfix: dh-pair-trigger-modal 结构错位修复 (v1.2.1 遗留) + 协议条 5→3 元素精简 + 补 bump VERSION 1.2.1→1.2.2
- 🔧 工作流改造: B+C — `serialcube-workflow` 加 "新建/大改 UI" 强制 brainstorming/mockup 流程 + `ui-ux-pro-max` 加 "风格基线比对" 必跑步骤
- 🆕 新 skill: A — `serialcube-modal-review` (6 步 guard: 必要性/位置/嵌套/标题/字段对齐/主题适配) — 第一次实战验证 (协议编辑器 UI 清理)
- 📐 基线报告: [`design/modal-review-2026-08-13-protocol-editor-ui-cleanup.md`](design/modal-review-2026-08-13-protocol-editor-ui-cleanup.md)
- [`changelog/2026-08-13-v1.2.1-ui-consistency.md`](changelog/2026-08-13-v1.2.1-ui-consistency.md) — v1.2.1 UI 一致性修复: 4 modal header 统一 + 协议编辑 4 段重构 + 选协议 modal 合并 + 仪表盘底部挪到 modal
- 📘 完整交接: [`handover/HANDOFF-V1.2.1-2026-08-13.md`](handover/HANDOFF-V1.2.1-2026-08-13.md) (待实施后回填, 12 tasks / +200 -150)
- 📋 Plan: [`superpowers/plans/2026-08-13-v1.2.1-ui-consistency-plan.md`](superpowers/plans/2026-08-13-v1.2.1-ui-consistency-plan.md) (12 tasks / 1546 lines; 2026-08-16 从备份分支收编)
- 📐 Spec: [`superpowers/specs/2026-08-13-v1.2.1-ui-consistency-design.md`](superpowers/specs/2026-08-13-v1.2.1-ui-consistency-design.md) (4 决策 A1/A2/B2/C3+/D1/D6)

### 2026-08-12

- [`changelog/2026-08-12-v1.2.0-config-center-refactor.md`](changelog/2026-08-12-v1.2.0-config-center-refactor.md) — v1.2.0 配置中心重构: 仪表盘单协议聚焦 + 4 tab 表格化 + 命令三模式 + 告警独立规则 + 调试面板占位
- 📘 完整交接: [`handover/HANDOFF-V1.2-2026-08-12.md`](handover/HANDOFF-V1.2-2026-08-12.md) (12 commits / +2000+ lines / 5 UI 问题)
- [`changelog/2026-08-12-v1.1.1-fixes.md`](changelog/2026-08-12-v1.1.1-fixes.md) — v1.1.1 4 修复: 主题 segmented 进系统菜单 + 配置中心改协议配置 + 编辑模式视觉强化 + Modal stack 嵌套
- [`changelog/2026-08-12-protocol-multi-command.md`](changelog/2026-08-12-protocol-multi-command.md) — v1.1.0 协议多命令 + 统一配置中心 5 tab + 漫游引导 + 9 kind (含 Custom) + Lucide 图标统一
- [`changelog/2026-08-12-readme-sync-fix.md`](changelog/2026-08-12-readme-sync-fix.md) — README.md 同步修复（R5/R6 自检发现 4 处遗漏：3 个文档导航 + 2 条硬性规则）
- [`changelog/2026-08-12-docs-naming-and-changelog-refactor.md`](changelog/2026-08-12-docs-naming-and-changelog-refactor.md) — 交接文档加时间命名 + CHANGELOG 主从结构 + 每次 push 必写 changelog

### 2026-08-11

- [`changelog/2026-08-11-v1.0.0-release.md`](changelog/2026-08-11-v1.0.0-release.md) — v1.0.0 首次正式发布（11 核心能力 + 5 CRC + 15 skill + GitHub Pages 部署）
- [`changelog/2026-08-11-docs-restructured.md`](changelog/2026-08-11-docs-restructured.md) — docs 目录首次重构（12 新文档 + 1 重写）

---

## 🔧 工作流集成

### 每次 push commit 前必做

1. 写 `docs/changelog/<YYYY-MM-DD>-<topic-slug>.md` 子文件
2. 在本主文件加一行索引
3. 同步更新引用本内容的其他文档
4. 跑 link check 验证
5. `git add` + 中文 commit
6. `ask_user` 确认 push
7. `git push origin main --tags`

### 发版额外做

- 写 `docs/handover/release-vX.Y.Z-YYYY-MM-DD.md` 详细 release notes
- 跑 `bump-version.ps1 -Level <patch|minor|major>`
- VERSION 三处同步（SerialCube.html const VERSION / HTML changelog 段 / Git tag）
- 更新 `docs/handover/PROJECT-HANDOVER-YYYY-MM-DD.md`（反映最新状态）

### 关联文档同步自检

每次更新完跑:
- [ ] 所有引用本文件的文档已更新链接
- [ ] 所有被本文件引用的文档存在
- [ ] `CHANGELOG.md` 主索引列出所有子文件
- [ ] 旧的失效链接全部修掉

---

## 🗂 历史 release notes

| 版本 | 发布日期 | 详细 notes | 会话交接 |
|------|----------|------------|----------|
| v1.1.1 | 2026-08-12 | [`changelog/2026-08-12-v1.1.1-fixes.md`](changelog/2026-08-12-v1.1.1-fixes.md) | [`handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md`](handover/HANDOFF-V1.1.1-FIXES-2026-08-12.md) |
| v1.1.0 | 2026-08-12 | [`handover/release-v1.1.0-2026-08-12.md`](handover/release-v1.1.0-2026-08-12.md) | [`handover/HANDOFF-POST-V1.1.0-2026-08-12.md`](handover/HANDOFF-POST-V1.1.0-2026-08-12.md) |
| v1.0.0 | 2026-08-11 | [`handover/release-v1.0.0-2026-08-11.md`](handover/release-v1.0.0-2026-08-11.md) | — |

---

## 🔗 链接

- [`docs/changelog/README.md`](changelog/README.md) — 子目录说明 + 命名规范 + 模板
- [`docs/handover/PROJECT-HANDOVER-2026-08-11.md`](handover/PROJECT-HANDOVER-2026-08-11.md) — 项目主交接
- [`docs/handover/HANDOFF-QUICKSTART-2026-08-11.md`](handover/HANDOFF-QUICKSTART-2026-08-11.md) — 30 秒接手卡
- [`docs/README.md`](README.md) — 文档中心
- [`../README.md`](../README.md) — 根 README
