# 协议多命令方案 · 5 步实施 checklist

> **用途：** 新会话按这个清单一步一步走完,每个步骤有产物,完成打勾。
> **配对文档：** [`HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md`](HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md) (总体交接,先读那个)

---

## 阶段 0️⃣: 启动 (5 分钟)

### 0.1 走完通用 session-start
打开 [`SESSION-CHECKLIST-2026-08-11.md`](SESSION-CHECKLIST-2026-08-11.md),跑完 0-5 步:
- [ ] `Set-Location 'D:\WorkSpace\SerialCubeWeb'`
- [ ] `git status` 干净 / `git log` 顶部是预期 commit
- [ ] 读 `HANDOFF-QUICKSTART-2026-08-11.md` (30 秒)
- [ ] 读 `PROJECT-HANDOVER-2026-08-11.md` § 2-5 (2 分钟)
- [ ] 激活 `using-superpowers` + `serialcube-workflow` + `version-management` skill

### 0.2 激活本任务专属 skill
- [ ] `writing-plans` (出 2-5 分钟粒度 plan)
- [ ] `brainstorming` (回顾设计阶段产物)

### 0.3 读本任务 3 个核心文件
- [ ] **正式 spec** `docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md` (10 分钟,源真值)
- [ ] **v4 预览** `docs/design/protocol-multi-command-v4-preview.html` (浏览器打开,5 分钟)
- [ ] **既有架构** `docs/reference/ARCHITECTURE.md` (10 分钟,定位大结构)

### 0.4 跑 `bump-version.ps1`
- [ ] `.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level minor`
- [ ] 确认 `SerialCube.html` 的 `const VERSION` 变成 `1.1.0`
- [ ] 确认 HTML 头部 changelog 段有新增条目
- [ ] **不要 commit 这一步**(后面所有改动一起 commit)

### 0.5 创建分支
- [ ] `git checkout -b feature/protocol-multi-command`

**完成打勾: ☐ Phase 0 启动完毕**

---

## 阶段 1️⃣: Plan (30 分钟,出 2-5 分钟粒度 plan)

### 1.1 激活 `writing-plans` skill
- [ ] 调 skill 读 SKILL.md

### 1.2 写实现 plan
- [ ] 7 阶段拆分 (数据模型 / 向导 / 命令 modal / 配置中心 / 引导 / 迁移 / e2e),每阶段 2-5 分钟步骤
- [ ] plan 文件存 `docs/superpowers/plans/2026-08-12-protocol-multi-command-impl.md`
- [ ] **plan 不写代码,只写步骤、产物、检查点**

### 1.3 用户 review
- [ ] 把 plan 路径贴给用户,等 review
- [ ] 改 / 通过后进阶段 2

**完成打勾: ☐ Phase 1 Plan 完毕**

---

## 阶段 2️⃣: 实施 (按 plan 走,~7 小时)

按 plan 步骤走,Phase 1-6 串行:

### Phase A: 数据模型 + Lucide icon 工具 (~1h)
- [ ] 加 `NS.DATA_TYPES` (6 项)
- [ ] 改 `_defaultProtocols()` 把命令嵌进协议 + dataFields 改 `{name, type, default}` 形式
- [ ] 删 `NS.DATA_FIELDS` 顶层数组
- [ ] 加 `NS.allCommands()` 兼容垫片
- [ ] 加 `ICONS` map (~30 个 Lucide 图标) + `icon(name, size)` helper
- [ ] 替换 toolbar + 各 modal 30+ 处 emoji/文字图标为 `data-svg` + `icon()` 调用

**检查点:** `console.log(NS.allCommands().length) === 8` (2 协议 × ~4 命令)

### Phase B: 新建协议 3 步向导 + Custom (~1.5h)
- [ ] 写 `NS.openNewProtocolWizard()`
- [ ] Wizard step 1: 9 种 kind 卡片网格 (8 + Custom)
- [ ] Wizard step 2: id/name/byteOrder/CRC 表单
- [ ] Wizard step 3: 帧模板表 (kind 预填,Custom 空白)
- [ ] 字段拖拽 / 增删 / 编辑 / 实时帧预览
- [ ] 完成回调:append `NS.PROTOCOLS` + 切到协议 tab

**检查点:** 能从 0 协议开始走完向导,创建 BMS TLV v1 + Modbus RTU + 1 个 Custom

### Phase C: 新建命令 modal (~1h)
- [ ] 写 `NS.openNewCommandModal(protocolId)`
- [ ] 表单: id/name/dir/frameType/cadence/expectResponse
- [ ] 内联 dataFields 编辑器: add/remove/reorder,自动算总字节
- [ ] 完成回调:append `proto.commands[]`

**检查点:** 给 BMS 加 1 条 0x20 Read Pack Info,字段 4 个,字节数自动显示 8B

### Phase D: 配置中心 modal + 5 tab (~2.5h)
- [ ] 写 `NS.openConfigCenter()`
- [ ] 5 tab 切换逻辑 (协议/命令/卡片/告警/导入导出)
- [ ] Tab 1 协议: 协议 picker + 帧模板表 (read-only-ish)
- [ ] Tab 2 命令: 命令表 (从 allCommands 拉数据,按协议 group)
- [ ] Tab 3 卡片: 卡片表 (复用 `dh-card-edit` 渲染)
- [ ] Tab 4 告警: 从卡片 range 派生规则 (复用 `renderAlertRules`)
- [ ] Tab 5 导入/导出: 复用 `exportConfig` / `importConfig`,加单协议导入

**检查点:** 打开配置中心,5 tab 都能切换,数据正确显示

### Phase E: 漫游引导 (~1h)
- [ ] 写 `NS.startGuidedTour()`
- [ ] 4 步 overlay: 协议 → 命令 → 卡片 → 完成
- [ ] 高亮用 `box-shadow: 0 0 0 9999px` 蒙层 + 2px 边框
- [ ] 进度点 + 上一步/下一步/跳过
- [ ] **仅手动触发**,无 first-time 自动弹,无 localStorage

**检查点:** 点 🎓 按钮启动引导,4 步走完能"完成引导"

### Phase F: 迁移 + 清理 (~0.5h)
- [ ] 改 `NS.importConfig` 加 v1 检测 + 自动归并 (spec § 5.2)
- [ ] 删 `dh-cmd-config` / `dh-card-config` / `dh-alerts` / `dh-ie` modal HTML
- [ ] 删 toolbar 4 个按钮 (`dh-open-cmd-config` 等)
- [ ] 全局搜 `NS.COMMANDS` 替换为 `NS.allCommands()`
- [ ] 改 `NS.buildFrame` 不依赖 `protocol.fields` 里的 cmd 字段

**检查点:** 用一个真 v1 导出 JSON 导入,toast 提示"已从 v1 自动迁移"

**完成打勾: ☐ Phase 2 实施完毕**

---

## 阶段 3️⃣: 验证 (1 小时)

### 3.1 激活 `serialcube-e2e` skill
- [ ] 跑 6 baseline 场景 (应用加载 / 串口连接 / 发送接收 mock / 协议编辑器 / 解析模式切换 / 主题切换)
- [ ] **期望:** 全绿 (主题切换这个场景可能要 update,因为我们删了主题按钮)

### 3.2 新加 7 个场景
- [ ] 配置中心 modal 打开 (从 toolbar 单按钮)
- [ ] 5 tab 切换
- [ ] 新建协议 3 步向导 (BMS kind)
- [ ] 新建命令 modal (加 dataFields)
- [ ] Custom kind (空白帧模板)
- [ ] 漫游引导 (4 步)
- [ ] v1 配置导入自动迁移

### 3.3 激活 `verification-before-completion` skill
- [ ] console 无 error
- [ ] 6 baseline + 7 新 = 13 场景全绿
- [ ] 截图保存到 `.tmp/`

**完成打勾: ☐ Phase 3 验证完毕**

---

## 阶段 4️⃣: 审查 + 验收 (15 分钟)

### 4.1 激活 `requesting-code-review` skill
- [ ] 跑 code review,关注:数据模型改动的边界条件 / buildFrame 改动的兼容性 / 删除的 modal 没残留引用

### 4.2 写 changelog
- [ ] `docs/changelog/2026-08-12-protocol-multi-command.md` 写 4-8 条要点
- [ ] 同步 `docs/CHANGELOG.md` 主索引
- [ ] 例: 4 modal 合并 / 9 kind / Custom 支持 / Lucide icon / 漫游引导

### 4.3 用户验收
- [ ] 把交付物列表 (含 previews / spec / handoff / changelog / 改动 diff) 给用户
- [ ] 等用户 review 反馈

**完成打勾: ☐ Phase 4 审查完毕**

---

## 阶段 5️⃣: Commit + Push (10 分钟,跟用户确认)

### 5.1 Commit
- [ ] `git status` 看改动
- [ ] `git add` 相关文件
- [ ] `git commit -m "feat(protocol): 多命令方案 + 配置中心 v2"`
- [ ] 检查 commit message 中文 + 符合 `<type>(<scope>): <中文>` 格式

### 5.2 Push (⚠️ ask_user)
- [ ] **必须先问用户** "准备好了推到远端吗" (version-management R2 硬性规则)
- [ ] 用户确认后 `git push origin feature/protocol-multi-command`
- [ ] `git push origin --tags` (推 v1.1.0 tag)
- [ ] 创建 PR (如果走 PR 流程) / merge 到 main

### 5.3 部署
- [ ] 激活 `deploy-checklist` skill
- [ ] 跑 5 件事检查 (console 无错 / e2e 绿 / index.html 重定向 / 资源可达 / 版本号同步)
- [ ] 部署后冒烟测试
- [ ] 通知用户:GitHub Pages 已更新,在线可访问

**完成打勾: ☐ Phase 5 发布完毕**

---

## 📋 速查卡 (贴桌面)

```
协议多命令实施 7 阶段
─────────────────────
☐ 0. 启动: session-start + 读 3 文件 + bump version + 建分支
☐ 1. Plan: writing-plans skill → 2-5min 粒度 → 用户 review
☐ 2. 实施: 数据模型 / 向导 / 命令 modal / 配置中心 / 引导 / 迁移 (7h)
☐ 3. 验证: 6 baseline + 7 新 = 13 场景
☐ 4. 审查: code review + changelog + 用户验收
☐ 5. 发布: commit 中文 + ask 后 push + deploy-checklist
─────────────────────
✅ → 协议多命令 v2 上线
```

---

## 🚨 异常处理

### Wizard step 3 保存时 `buildFrame` 报错
- 检查 `proto.fields` 是否为空数组 (Custom kind 0 字段状态)
- 验证:≥1 字段才能保存

### Card 找不到命令
- `card.cmd` 在多协议下模糊
- 临时方案:加 `card.protocol` 字段
- 长期:重构成 `(protoId, cmdId)` 复合键 (写进 spec Open Question)

### 引导高亮元素不存在
- 0 协议状态下,命令 tab 是空的
- Tour 第 2/3 步 graceful no-op:显示"先去协议 tab 加一个"

### Lucide 图标 stroke 看着粗
- 现有 SerialCube 用 stroke 1.4-1.6
- 我们用 2 (Lucide 默认) 可能略粗
- 解决:在 `icon()` helper 里硬编码 `stroke-width="1.6"` 跟现有对齐

### v1 导入后没数据
- 检查 `importConfig` 的 v1 检测逻辑
- v1 config 长这样:`{ type, version: 1, userConfig: { dashboard: { protocols, dataFields, commands, cards } } }`
- v2 config 长这样:`{ type, version: 2, userConfig: { dashboard: { protocols (含 commands) } } }`

---

## 📞 跟用户的协议

- 每完成一个 Phase,贴状态: "Phase 1 完成,产物 X"
- 任何模糊决策,停下来 ask_user
- 改动超过 100 行,贴 diff 摘要
- 发现 spec 漏了,停下来问用户怎么补
- 进度卡住 > 30 分钟,贴问题出来一起想

---

**最后提醒:** 别直接动手改 SerialCube.html,先走完 Phase 0-1。设计阶段的产物已经够完整了,不要"边改边设计"——会乱。
