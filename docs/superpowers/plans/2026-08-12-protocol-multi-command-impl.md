# 协议多命令方案 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SerialCube v1.0.0 基础上,把"协议 ↔ 命令"从松散字符串引用改成一级嵌套,合并 4 个散落 config modal 为统一配置中心(5 tab),加 Custom kind + 漫游引导,全部图标改 Lucide inline SVG,导出 v1.1.0。

**Architecture:**
- **数据模型重构**: 命令从全局 `NS.COMMANDS` 数组并入 `proto.commands[]`,每条命令自带 `dataFields: [{name, type, default}]`。全局 `NS.DATA_FIELDS` 数组退役,新增 `NS.DATA_TYPES` 类型库(6 项) + `NS.allCommands()` 兼容垫片
- **配置中心**: 1 个 modal `dh-config-center`,5 tab(协议/命令/卡片/告警/导入导出),统一从 toolbar 单按钮 `dh-open-config-center` 触发;3 个子 modal(wizard / command / card edit)从 tab 内 `[+ 新建]` 触发
- **新建协议 3 步向导**: step1 选 kind(8 + Custom 9 张卡)→ step2 基础信息(id/name/byteOrder/CRC)→ step3 帧模板(kind 预填或 Custom 空白)
- **图标库**: 单一 `ICONS` map(~30 个 Lucide path)+ `icon(name, size)` helper,所有 emoji/文字图标 → `data-svg="name"` 属性
- **漫游引导**: 手动 🎓 按钮触发,4 步 overlay(协议→命令→卡片→告警),`box-shadow: 0 0 0 9999px` 蒙层 + 2px 边框高亮

**Tech Stack:**
- 单 HTML 文件(`SerialCube.html` 21K 行),所有改动内嵌,无新增依赖
- 全部用原生 `NS` 命名空间 + function declarations,跟现有风格一致
- 不引第三方库(emoji → inline SVG 不需要 Lucide CDN)
- 走 `agent-browser` 跑 e2e 验证(避免 Chrome 启动慢,可拆 scenario 单独跑)

## Global Constraints

- **不拆 SerialCube.html** — 单文件维护,改一处不拆文件
- **不破坏现有 8 种协议 kind 行为** — `NS.buildFrame` dispatcher 不能回归
- **commit 中文 + 中文 subject**(version-management R1)
- **改前必跑 bump-version** — 已在 Phase 0.4 手动改 VERSION 1.0.0 → 1.1.0 + changelog 段
- **不要 commit 中间状态** — Phase 2 全部改完,Phase 5 一起 commit
- **图标 stroke-width="1.5"** — 跟现有 SerialCube 图标风格一致(checklist 异常处理 + 用户偏好)
- **图标 viewBox="0 0 24 24"** — Lucide 标准
- **不强制 TDD** — 单 HTML 项目无测试框架,e2e 是"测试"替代品
- **Custom kind 必须 ≥ 1 字段** — 空帧模板 buildFrame 会崩
- **v1 配置导入兼容** — 旧 NS.COMMANDS 顶层数组自动归并到 proto.commands
- **不要碰 `_defaultProtocols` 之外的注释** — 不做无关 refactor

---

## Task 1: 数据模型重构(Phase A,~1h)

**Files:**
- Modify: `SerialCube.html` L9923-10050 段(`_defaultProtocols` / `DATA_FIELDS` / `COMMANDS` / `CARDS`)

**Interfaces:**
- Consumes: 现有 `_defaultProtocols()` 返回值,8 个 `NS.COMMANDS` 全局对象
- Produces:
  - `NS.DATA_TYPES` (新,6 项类型库)
  - `NS.PROTOCOLS[i].commands[]` (新嵌套结构)
  - `NS.allCommands()` (新兼容垫片,`flatMap(p => p.commands || [])`)
  - `NS.CARDS[i].protocol` (新字段,可选,模糊查找时优先用)

### Steps

- [ ] **Step 1.1: 读现状定位数据模型行号**
  读 `SerialCube.html` L9923-10050,记录 `_defaultProtocols` / `_defaultCommands` / `_defaultCards` / `NS.DATA_FIELDS` / `NS.COMMANDS` / `NS.CARDS` 的精确行号与初始值

- [ ] **Step 1.2: 加 `NS.DATA_TYPES`**
  在 `NS` 命名空间顶部(`_defaultProtocols` 之前)插入 6 项类型库:`u8/u16/u32/i16/i32/float`,每项含 `{name, size, byteOrder}`

- [ ] **Step 1.3: 改 `_defaultProtocols()` 嵌套 commands**
  把现有 2 个协议对象的命令信息移到 `proto.commands[]`,每条命令含 `{id, name, direction, frameType, cadence, expectResponse, dataFields: [{name, type, default}]}`。dataFields 字段名跟原 `NS.DATA_FIELDS` 数组一一对应

- [ ] **Step 1.4: 删 `NS.DATA_FIELDS` 顶层数组**
  把 `NS.DATA_FIELDS` 整段删掉(11 项 cell_*/pack_*/\*_set),引用全改成内联在 cmd.dataFields

- [ ] **Step 1.5: 删 `NS.COMMANDS` 顶层数组**
  把 `NS.COMMANDS` 整段删掉(8 项),引用全改成 `NS.allCommands()`

- [ ] **Step 1.6: 加 `NS.allCommands()` 兼容垫片**
  在 `NS.PROTOCOLS` 之后加:`NS.allCommands = () => NS.PROTOCOLS.flatMap(p => p.commands || []);`

- [ ] **Step 1.7: 给 CARDS 加可选 `protocol` 字段**
  把 `_defaultCards()` 生成的 10 张卡片每张加 `protocol: 'proto_bms'`(默认协议),用于多协议下模糊查找的优先路径

- [ ] **Step 1.8: 替换全局 `NS.COMMANDS` 引用**
  `Select-String -Path 'SerialCube.html' -Pattern 'NS\.COMMANDS'`,把所有 `NS.COMMANDS` 替换成 `NS.allCommands()`,但不替换声明/赋值那 2 行

- [ ] **Step 1.9: 检查点验证**
  在 console 执行:
  ```js
  console.log(NS.allCommands().length);  // 期望 8(2 协议 × ~4 命令)
  console.log(NS.PROTOCOLS[0].commands.length);  // 期望 ≥ 3
  console.log(NS.PROTOCOLS[0].commands[0].dataFields.length);  // 期望 ≥ 1
  console.log(NS.DATA_FIELDS);  // 期望 undefined
  console.log(NS.COMMANDS);  // 期望 undefined
  ```

**检查点:** `NS.allCommands().length === 8` + 现有 buildFrame / 解析 / mock 数据全部不报错

---

## Task 2: 图标库 helper(Phase A,~30min)

**Files:**
- Modify: `SerialCube.html` `NS` 命名空间顶部(DATA_TYPES 之后)
- Modify: `SerialCube.html` toolbar HTML + 各 modal 触发按钮(~30 处)

**Interfaces:**
- Consumes: 30+ 处现有 emoji/文字图标
- Produces:
  - `ICONS` map(~30 个 Lucide path,只存内层 path 字符串)
  - `icon(name, size = 14)` helper,返回 `<svg viewBox="0 0 24 24" stroke-width="1.5" ...>${path}</svg>`
  - 替换后所有图标用 `data-svg="<icon-name>" data-svg-size="<n>"` 标记,由启动脚本扫描替换

### Steps

- [ ] **Step 2.1: 收集 30+ 个 icon 名字**
  按 spec §3 列出的 30 个名字:`settings, network, zap, layout-grid, bell, arrow-left-right, plus, plus-circle, x, pencil, trash, copy, search, filter, check, check-circle, chevron-left, chevron-right, grip-vertical, download, upload, file-up, folder-open, alert-triangle, rotate-ccw, refresh-cw, help-circle, moon, graduation-cap, info`

- [ ] **Step 2.2: 加 `ICONS` map**
  30 个名字 → Lucide 官方 path 字符串,只存内层,不要 `<svg>` 包裹。来源 lucide.dev,16x16 viewBox 标准

- [ ] **Step 2.3: 加 `icon(name, size)` helper**
  ```js
  function icon(name, size = 14) {
    const path = ICONS[name];
    if (!path) return '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }
  ```

- [ ] **Step 2.4: 加启动扫描脚本**
  在 init 时跑 `document.querySelectorAll('[data-svg]').forEach(el => el.innerHTML = icon(el.dataset.svg, +el.dataset.svgSize || 14))`

- [ ] **Step 2.5: 替换 toolbar 4-6 处图标**
  主题按钮(moon) / 配置中心(settings) / 引导(graduation-cap) / 编辑模式(pencil) / 通知(bell) / 帮助(info) → 改成 `<button data-svg="..." data-svg-size="14">`

- [ ] **Step 2.6: 替换 modal 触发按钮 ~10 处**
  协议编辑器 / 命令管理 / 卡片配置 / 告警 / 导入导出 5 个 modal 的打开按钮 + modal 内部 [+ 新建] [× 删除] [✏️ 编辑] 等动作按钮

- [ ] **Step 2.7: 替换 inline emoji 10+ 处**
  各 modal 标题前的 emoji(⚙⚡▤🔔↔🎓✏️✓✗+ 等)→ `<span data-svg="..." data-svg-size="14"></span>`

- [ ] **Step 2.8: 检查点验证**
  浏览器打开 SerialCube.html,工具栏应该看到 SVG 图标(不是 emoji 文字),主题切换后图标 stroke 颜色随主题变

**检查点:** 全部图标 SVG 渲染 + 主题切换不影响 + 控制台无 "icon not found" 警告

---

## Task 3: 工具栏改造(Phase A,~10min)

**Files:**
- Modify: `SerialCube.html` toolbar HTML(~7170-7300 段)

**Interfaces:**
- Consumes: 现有 5 个 config 按钮 + 主题按钮
- Produces: 1 个 `dh-open-config-center` 按钮 + 1 个 `dh-open-tour` 引导按钮 + 主题按钮删除

### Steps

- [ ] **Step 3.1: 删 5 个 config 按钮**
  `dh-open-proto` / `dh-open-cmd-config` / `dh-open-card-config` / `dh-open-alerts` / `dh-open-ie` HTML 整段删

- [ ] **Step 3.2: 删主题按钮**
  theme toggle HTML 删(spec 决策:跟随系统,不要手动)

- [ ] **Step 3.3: 加 1 个配置中心按钮**
  `<button id="dh-open-config-center" data-svg="settings" data-svg-size="14"><span>配置中心</span></button>`

- [ ] **Step 3.4: 加 1 个引导按钮**
  `<button id="dh-open-tour" data-svg="graduation-cap" data-svg-size="14"><span>引导</span></button>`

- [ ] **Step 3.5: 检查点验证**
  浏览器打开,工具栏应该只看到 [配置中心] [引导] [编辑模式] 等极少数按钮,主题按钮消失

**检查点:** toolbar 按钮 ≤ 4 个(配置中心 / 引导 / 编辑模式 / 通知),按钮事件挂到 `NS.openConfigCenter` / `NS.startGuidedTour`

---

## Task 4: 删 4 个旧 modal HTML(Phase F,~15min)

**Files:**
- Modify: `SerialCube.html` modal HTML 段(L12094-12673)

**Interfaces:**
- Consumes: `dh-cmd-config` / `dh-card-config` / `dh-alerts` / `dh-ie` 4 个 modal DOM
- Produces: 4 个 modal DOM 整段删除,保留 `dh-proto`(将被新 wizard 取代)/ `dh-card-edit`(复用为子 modal)

### Steps

- [ ] **Step 4.1: 删 `dh-cmd-config` modal HTML**
  L12348 段 `// --- 命令管理 (cmd-config modal) ---` 整块 HTML 删

- [ ] **Step 4.2: 删 `dh-card-config` modal HTML**
  L12425 段 `// --- 卡片配置 (card-config + card-edit modals) ---` 整块 HTML 删(保留 `dh-card-edit`)

- [ ] **Step 4.3: 删 `dh-alerts` modal HTML**
  L12557 段 `// --- 告警配置 (alerts modal) ---` 整块 HTML 删

- [ ] **Step 4.4: 删 `dh-ie` modal HTML**
  L12511 段 `// --- 导入导出 (ie modal) ---` 整块 HTML 删

- [ ] **Step 4.5: 检查点**
  `Select-String -Path 'SerialCube.html' -Pattern 'dh-cmd-config|dh-card-config|dh-alerts|dh-ie'`,期望 0 匹配(但保留 `dh-card-edit` 引用)

**检查点:** 4 个 modal 元素从 DOM 消失,但 `dh-card-edit` 还在

---

## Task 5: 删 4 个旧 modal 渲染函数 + handlers(Phase F,~30min)

**Files:**
- Modify: `SerialCube.html` modal render 函数段(L12094-12673)

**Interfaces:**
- Consumes: `renderCmdConfig()` / `renderCardConfig()` / `renderAlerts()` / `renderIE()` 4 个函数 + 它们在 handlers 段的引用
- Produces: 4 个 render 函数整段删,handler 引用改成空 / 重定向到新配置中心

### Steps

- [ ] **Step 5.1: 删 4 个 render 函数**
  `function renderCmdConfig()` / `renderCardConfig()` / `renderAlerts()` / `renderIE()` 整段删

- [ ] **Step 5.2: 找 4 个 handler 引用**
  `Select-String -Path 'SerialCube.html' -Pattern 'renderCmdConfig|renderCardConfig|renderAlerts|renderIE'`,期望只在它们自己声明 / 引用位置出现

- [ ] **Step 5.3: 删 4 个 handler 绑定**
  `dh-open-cmd-config` 等 4 个 button 的 addEventListener 删;改 dh-open-config-center 的 listener 调 `NS.openConfigCenter()`

- [ ] **Step 5.4: 检查点**
  `Select-String` 再次搜,期望 0 匹配(除了注释引用)

**检查点:** 4 个函数从 JS 全局消失 + 工具栏新按钮事件正确挂上

---

## Task 6: v1 配置导入迁移(Phase F,~20min)

**Files:**
- Modify: `SerialCube.html` `NS.importConfig()` 段

**Interfaces:**
- Consumes: v1 配置 JSON `{ type, version: 1, userConfig: { dashboard: { protocols, dataFields, commands, cards } } }`
- Produces: v2 配置 `{ type, version: 2, userConfig: { dashboard: { protocols (含 commands) } } }`,Toast 提示"已从 v1 自动迁移 (X 条命令归并到协议)"

### Steps

- [ ] **Step 6.1: 读 v1/v2 config 格式差异**
  spec §5.2 已写: v1 顶层有 `commands` + `dataFields`,v2 都内联到 `protocols[i].commands[].dataFields`

- [ ] **Step 6.2: 在 importConfig 头部加 v1 检测**
  ```js
  if (Array.isArray(uc.commands) && !uc.protocols?.some(p => Array.isArray(p.commands))) {
    // v1 → v2 migration
  }
  ```

- [ ] **Step 6.3: 实现归并逻辑**
  遍历 `uc.commands`,按 `cmd.protocol` 找到对应协议,push 到 `proto.commands`,dataFields 用 `uc.dataFields` 里的 `{name, type, default}` 解析

- [ ] **Step 6.4: 删 `uc.dataFields` 和 `uc.commands`**
  迁移后顶层两个数组删

- [ ] **Step 6.5: 标记迁移来源**
  `config._migratedFrom = 'v1'`,`config.version = 2`

- [ ] **Step 6.6: 弹 Toast**
  `showToast('已从 v1 配置自动迁移 (X 条命令归并到协议)', 'success')`

- [ ] **Step 6.7: 检查点**
  准备一个真 v1 export(从 git v1.0.0 tag 导 JSON),导入,Toast 显示 + `NS.PROTOCOLS[0].commands.length` 增加

**检查点:** v1 导入无错 + 协议命令数正确归并

---

## Task 7: 新建协议 3 步向导(Phase B,~1.5h)

**Files:**
- Modify: `SerialCube.html` modal HTML 段(在 `dh-config-center` 之前)+ 新增 `NS.openNewProtocolWizard()` 函数

**Interfaces:**
- Consumes: `KIND_DEFAULTS[kind]`(8 + Custom 各一套默认 fields 数组,先在代码内 hardcode)
- Produces: `dh-new-proto-wizard` modal + 3 步 state machine + 完成时 append 到 `NS.PROTOCOLS` + 切到配置中心协议 tab

### Steps

- [ ] **Step 7.1: 加 wizard modal HTML 骨架**
  3 步内容容器 + 底部 [上一步] [下一步/完成] [取消] 按钮 + 顶部步骤指示器(1/3, 2/3, 3/3)

- [ ] **Step 7.2: 写 `NS.openNewProtocolWizard()`**
  初始化 wizard state `{step: 1, kind: null, id: '', name: '', byteOrder: 'BE', crcType: 'crc16-modbus', fields: []}`,打开 modal

- [ ] **Step 7.3: 实现 step 1 — 9 张 kind 卡片**
  网格布局,8 + Custom 共 9 张,每张含 kind 名字 + 简短描述。点击高亮,只有选了才能下一步

- [ ] **Step 7.4: 实现 step 2 — 基础信息表单**
  字段:id(text)/ name(text)/ byteOrder(BE/LE radio)/ crcType(select)/ crcInit(text)/ crcEndian(LE/BE)/ crcRange(select)。id 唯一性校验

- [ ] **Step 7.5: 实现 step 3 — 帧模板表**
  8 种 kind → `KIND_DEFAULTS[kind]` 预填;Custom → 空白 0 字段。表行:[icon 类型] [name] [size] [byteOrder] [default] [grip] [×]

- [ ] **Step 7.6: 加 [+ 添加字段] 按钮**
  Custom kind 必须用:点击弹小表单(type/name/size/byteOrder/default),append 到 fields

- [ ] **Step 7.7: 字段拖拽 reorder**
  用原生 HTML5 drag-and-drop(不引外部库),grip 图标做 handle

- [ ] **Step 7.8: 实时帧预览**
  底部 `<pre>${bytes.map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ')}</pre>`,字段变动时调 `NS.buildFrame(临时 proto, 临时 cmd)` 重算

- [ ] **Step 7.9: 完成回调**
  `NS.PROTOCOLS.push(newProto)` + 设 `state.parser.protocol = newProto.id` + 关闭 wizard + 重渲染配置中心

- [ ] **Step 7.10: 检查点**
  从 0 协议状态,走完向导创建 BMS kind 协议 → Modbus → 1 个 Custom,3 个协议都出现在 NS.PROTOCOLS

**检查点:** 9 kind 全能选 + Custom 空白起步 + 帧预览实时 + 完成追加到 NS.PROTOCOLS

---

## Task 8: 新建命令 modal(Phase C,~1h)

**Files:**
- Modify: `SerialCube.html` modal HTML 段 + 新增 `NS.openNewCommandModal(protocolId)` 函数

**Interfaces:**
- Consumes: `protocolId` + `NS.DATA_TYPES`(6 项类型)
- Produces: `dh-new-command-modal` + 表单(id/name/dir/frameType/cadence/expectResponse/remark)+ 内联 dataFields 编辑器 + 完成时 append 到 `proto.commands`

### Steps

- [ ] **Step 8.1: 加 modal HTML 骨架**
  左侧表单,右侧 dataFields 列表;底部 [取消] [保存]

- [ ] **Step 8.2: 写 `NS.openNewCommandModal(protocolId)`**
  初始化 state `{protoId, id, name, direction: 'rx', frameType: 'query', cadence: 200, expectResponse: 0, remark: '', dataFields: []}`,打开 modal

- [ ] **Step 8.3: 渲染基础表单**
  7 个字段,id 用 hex input,其余按 spec §4.2

- [ ] **Step 8.4: 内联 dataFields 编辑器**
  每行:[name input] [type select from DATA_TYPES] [default input] [× delete],底部 [+ 添加字段] 按钮 + 实时显示总字节数 `sum(field.type.size)`

- [ ] **Step 8.5: 完成回调**
  校验 id 唯一(在该 proto 内)+ 至少 0 字段允许(纯控制命令无 data 也行),append `proto.commands.push({...})`,关闭 modal,重渲染配置中心命令 tab

- [ ] **Step 8.6: 检查点**
  给 BMS 协议加 1 条 0x20 Read Pack Info,4 个 u16 字段,总字节数显示 8B,保存后出现在 NS.PROTOCOLS[0].commands

**检查点:** dataFields 编辑器实时算字节 + 保存追加到正确协议

---

## Task 9: 配置中心 modal 骨架 + 5 tab 切换(Phase D,~30min)

**Files:**
- Modify: `SerialCube.html` modal HTML 段 + 新增 `NS.openConfigCenter()` + tab 切换函数

**Interfaces:**
- Consumes: `NS.PROTOCOLS` / `NS.allCommands()` / `NS.CARDS`
- Produces: `dh-config-center` modal + 5 tab 切换 state + 每个 tab 一个 `<div data-tab-content="...">` 容器

### Steps

- [ ] **Step 9.1: 加 modal HTML 骨架**
  header(配置中心 + 🎓 引导入口 + × 关闭)+ 5 tab 按钮行 + tab content 容器 + footer(状态条 + 导出 + 完成)

- [ ] **Step 9.2: 写 `NS.openConfigCenter()`**
  初始化 activeTab = 'protocols',渲染 5 tab,打开 modal

- [ ] **Step 9.3: 5 tab 切换函数**
  点击 tab 切 activeTab,只显示对应 content,其他 hidden

- [ ] **Step 9.4: tab 按钮 active 样式**
  当前 tab 加 `editor-tab.active` class,其他去掉

- [ ] **Step 9.5: 5 tab 初始内容占位**
  每个 content 容器先放 `<p>Tab X 内容建设中</p>`,后面 task 10-13 填

- [ ] **Step 9.6: 检查点**
  打开配置中心,5 tab 都能切换,active 样式正确

**检查点:** modal 打开/关闭 + 5 tab 切换无错

---

## Task 10: 配置中心 Tab 1 协议(Phase D,~30min)

**Files:**
- Modify: 配置中心 modal HTML `data-tab-content="protocols"` 段 + 渲染函数

**Interfaces:**
- Consumes: `NS.PROTOCOLS` + `KIND_DEFAULTS` 提示
- Produces: 协议 picker(select)+ 帧模板表(read-only-ish)+ [+ 新建协议] [📥 导入协议 JSON]

### Steps

- [ ] **Step 10.1: 协议 picker**
  `<select>` 列出 `NS.PROTOCOLS` 所有协议 id,选中的显示其 frame template

- [ ] **Step 10.2: 帧模板表**
  复用现有 `renderFieldList` 函数,只读展示选中协议的 fields

- [ ] **Step 10.3: [+ 新建协议] 按钮**
  调 `NS.openNewProtocolWizard()`,完成回调刷新 tab

- [ ] **Step 10.4: [📥 导入协议 JSON] 按钮**
  文件选择,调 NS.importProtocol(json),导入后追加 + 切到新协议 tab

- [ ] **Step 10.5: 检查点**
  Tab 1 协议:能选协议看帧模板 + [+ 新建] 走 wizard + 导入 JSON 追加

**检查点:** 协议 picker 切换 + 帧模板表正确

---

## Task 11: 配置中心 Tab 2 命令(Phase D,~20min)

**Files:**
- Modify: 配置中心 modal HTML `data-tab-content="commands"` 段

**Interfaces:**
- Consumes: `NS.allCommands()` + 当前协议 id
- Produces: 命令表(id/name/dir/type/cadence/fields 数/总字节/edit)+ [+ 新建命令]

### Steps

- [ ] **Step 11.1: 命令表渲染**
  按协议 group,表头:ID / Name / Dir / Type / Cadence / Fields / Size / 操作

- [ ] **Step 11.2: [+ 新建命令] 按钮**
  调 `NS.openNewCommandModal(当前协议 id)`,完成回调刷新 tab

- [ ] **Step 11.3: [✏️ 编辑] [× 删除] inline 按钮**
  编辑:复用新建 modal(传 cmd 对象,save 覆盖);删除:二次确认 + splice

- [ ] **Step 11.4: 检查点**
  Tab 2 命令:能看所有协议命令 + 新建/编辑/删除

**检查点:** 命令表完整 + 新建/编辑/删除不报错

---

## Task 12: 配置中心 Tab 3-4 卡片 + 告警(Phase D,~30min)

**Files:**
- Modify: 配置中心 modal HTML `data-tab-content="cards"` / `data-tab-content="alerts"` 段

**Interfaces:**
- Consumes: `NS.CARDS` + 命令列表 + 现有 `dh-card-edit` modal
- Produces: Tab 3 卡片表 + [+ 新建卡片](复用 dh-card-edit)+ Tab 4 告警规则表(从卡片 range 派生)

### Steps

- [ ] **Step 12.1: Tab 3 卡片表**
  表头:ID / Title / Type / Cmd / Field/Pair / Range / Precision / Unit / 操作
  [+ 新建卡片] 按钮 → 复用 `openCardEdit(null)`,传入新对象
  [✏️] 复用 openCardEdit(card)
  [×] 二次确认 + splice

- [ ] **Step 12.2: Tab 4 告警规则表**
  从 `NS.CARDS.filter(c => c.range)` 自动派生:每条规则 `{cardId, lower, upper, severity: 'warn'}`
  表头:Card / 范围 / Severity / 操作
  [↻ 从卡片重建] 按钮:重派生(覆盖当前列表)
  [+ 手动添加] 按钮:小表单,允许不绑卡片的自由规则

- [ ] **Step 12.3: 检查点**
  Tab 3 卡片:看 10 张卡 + 新建/编辑/删除
  Tab 4 告警:从 10 张卡派生告警 + 重建/手动添加

**检查点:** 卡片表 + 告警派生逻辑 + 复用现有 dh-card-edit

---

## Task 13: 配置中心 Tab 5 导入/导出(Phase D,~20min)

**Files:**
- Modify: 配置中心 modal HTML `data-tab-content="ie"` 段

**Interfaces:**
- Consumes: 现有 `NS.exportConfig()` / `NS.importConfig()`
- Produces: Tab 5 两栏:左导出(JSON 预览 + 下载/复制)+ 右导入(文件选择 + 拖拽区)+ 危险区[重置默认]

### Steps

- [ ] **Step 13.1: 导出栏**
  调 `NS.exportConfig()` 拿 JSON,`<pre>` 预览 + [下载 .json] 按钮(Blob)+ [复制] 按钮(Clipboard API)

- [ ] **Step 13.2: 导入栏**
  文件选择 + 拖拽区 → `NS.importConfig(file)`,完成后刷新所有 tab

- [ ] **Step 13.3: 危险区[重置默认]**
  二次确认弹窗 + 清 localStorage + reload 页面

- [ ] **Step 13.4: 检查点**
  Tab 5:导出 JSON 正确 + 导入触发 v1 迁移(如适用)+ 重置清空

**检查点:** 导入/导出可用 + 危险区二次确认

---

## Task 14: 漫游引导(Phase E,~1h)

**Files:**
- Modify: `SerialCube.html` + 新增 `NS.startGuidedTour()`

**Interfaces:**
- Consumes: 配置中心 modal 内的 DOM 元素(4 个 tab + 帧模板表 + 命令表 + 卡片表 + 告警表)
- Produces: 4 步 overlay(蒙层 + 高亮 + tooltip + 进度点 + 上一步/下一步/跳过)

### Steps

- [ ] **Step 14.1: 加 `NS.startGuidedTour()`**
  打开配置中心(如果未开),初始化 tour state `{step: 1}`,渲染 overlay

- [ ] **Step 14.2: 蒙层 + 高亮实现**
  body 加 `tour-overlay` div:`position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000`
  目标元素:`box-shadow: 0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 2px var(--accent)`,position: relative; z-index: 10001

- [ ] **Step 14.3: 4 步目标定位**
  step 1: 协议 tab + 帧模板表 area
  step 2: 命令 tab + 命令表
  step 3: 卡片 tab + 卡片表
  step 4: 告警 tab + 告警规则表

- [ ] **Step 14.4: tooltip 卡片**
  固定位置右下角(不挡目标),含 step 文案 + 进度点(●●●○)+ [上一步] [下一步] [跳过] 按钮

- [ ] **Step 14.5: 4 步文案**
  按 spec §4.4 写 4 段中文引导文案

- [ ] **Step 14.6: 边界处理**
  0 协议时 step 2/3 graceful no-op:显示"先去协议 tab 加一个"

- [ ] **Step 14.7: 检查点**
  点 🎓 按钮 → 4 步走完 → "完成引导"关闭 overlay

**检查点:** 4 步引导完整 + 0 协议状态不崩

---

## Task 15: e2e 验证(Phase 3,~1h)

**Files:**
- Test: 6 baseline + 7 新 = 13 场景,全部用 agent-browser 跑

**Interfaces:**
- 6 baseline: 应用加载 / 串口连接 / 发送接收 mock / 协议编辑器 / 解析模式切换 / 主题切换(主题切换场景可能要 update,因为我们删了主题按钮)
- 7 新: 配置中心 modal 打开 / 5 tab 切换 / 新建协议 3 步向导(BMS kind)/ 新建命令 modal(加 dataFields)/ Custom kind(空白帧模板)/ 漫游引导(4 步)/ v1 配置导入自动迁移

### Steps

- [ ] **Step 15.1: 跑 6 baseline 场景**
  用 agent-browser 跑 `.minimax/skills/serialcube-e2e/scenarios/01-06.md`,期望全绿
  主题切换场景更新:验证主题按钮不存在但系统主题跟随仍工作

- [ ] **Step 15.2: 跑 7 新场景**
  - 配置中心 modal:点 toolbar 配置中心 → 5 tab 显示
  - 5 tab 切换:依次点 5 tab,active 样式正确
  - 新建协议 wizard:点 [+ 新建协议] → 选 BMS → 填表单 → 调帧模板 → 完成,新协议出现在 NS.PROTOCOLS
  - 新建命令 modal:点 [+ 新建命令] → 填表单 + 加 4 字段 → 保存,新命令在 BMS.protocols[0].commands
  - Custom kind:重复 wizard 流程,选 Custom → step 3 空白 → 加 1 字段 → 完成
  - 漫游引导:点 🎓 → 4 步走完
  - v1 导入:导出 v1.0.0 配置(从 git tag 拿)→ 导入,Toast 提示"已从 v1 自动迁移"

- [ ] **Step 15.3: console 无 error**
  跑完所有场景,`agent-browser console --level error` 期望空

- [ ] **Step 15.4: 截图保存到 .tmp/**
  关键场景截图存 `.tmp/v1.1.0-e2e-{scenario}.png` 备查

- [ ] **Step 15.5: 检查点**
  13 场景全绿 + console 无 error + 截图齐

**检查点:** 13 e2e 场景全绿,serialcube.html 单文件 0 console error

---

## Task 16: 代码审查(Phase 4,~15min)

**Files:**
- 无文件改动,只读 review

**Interfaces:**
- 关注:数据模型改动的边界条件 / `NS.buildFrame` 改动的兼容性 / 删除的 modal 没残留引用

### Steps

- [ ] **Step 16.1: 走 `requesting-code-review` skill**
  激活 skill,跑 code review

- [ ] **Step 16.2: 数据模型 review**
  检查 `NS.PROTOCOLS` 默认值:8 协议 + 每协议 3-5 命令 + 每命令 1-5 字段,字段 type 都在 NS.DATA_TYPES
  检查 NS.allCommands() 返回 8 条
  检查无 NS.COMMANDS / NS.DATA_FIELDS 残留引用

- [ ] **Step 16.3: buildFrame 兼容性 review**
  跑 8 种 _buildFrame*(每个 kind)看是否还能正常输出
  跑 Custom kind 走 NS.buildFrame(newProto, defaultCmd)看是否报错

- [ ] **Step 16.4: 删除 modal 残留 review**
  `Select-String` 搜 4 个旧 modal id + 4 个旧 render 函数,期望 0 匹配
  搜 toolbar 旧 5 个 config 按钮 id,期望 0 匹配

- [ ] **Step 16.5: 检查点**
  review 报告无 P0/P1 issue

**检查点:** review 报告通过

---

## Task 17: changelog + 文档同步(Phase 4,~10min)

**Files:**
- Create: `docs/changelog/2026-08-12-protocol-multi-command.md`
- Modify: `docs/CHANGELOG.md`(主索引,如有)

**Interfaces:**
- 把 1.1.0 changelog 段同步到主索引

### Steps

- [ ] **Step 17.1: 写 docs/changelog/2026-08-12-protocol-multi-command.md**
  4-8 条要点,跟 HTML changelog 段对齐但更详细

- [ ] **Step 17.2: 更新 docs/CHANGELOG.md 主索引**
  加 1.1.0 条目,链接到上面子文件

- [ ] **Step 17.3: 检查点**
  两个文件都更新,git status 看新文件

**检查点:** changelog 文档齐

---

## Task 18: Commit + Push + 部署(Phase 5,~10min,**先 ask user**)

**Files:**
- git 操作,不改动文件

**Interfaces:**
- `git add` 所有改动
- `git commit -m "feat(protocol): 协议多命令方案 + 配置中心 v2"` 中文
- `git push origin feature/protocol-multi-command` (⚠️ ask user)
- `git push origin --tags`(可选,1.1.0 tag)
- GitHub Pages 自动部署

### Steps

- [ ] **Step 18.1: `git status` 看所有改动**
  期望:SerialCube.html(主要)+ docs/changelog/ + 可能的 docs 改动

- [ ] **Step 18.2: `git add` 相关文件**
  全部 SerialCube.html + 新 changelog

- [ ] **Step 18.3: `git commit -m "feat(protocol): 协议多命令方案 + 配置中心 v2"`**
  中文 subject,符合 `<type>(<scope>): <中文>` 格式

- [ ] **Step 18.4: ⚠️ ASK USER 确认 push**
  `ask_user("准备好推 feature/protocol-multi-command 吗?e2e 13 场景全绿了吗?")`
  用户 y 才能继续

- [ ] **Step 18.5: `git push origin feature/protocol-multi-command`**
  push 后看 GitHub Actions

- [ ] **Step 18.6: 跑 `deploy-checklist` skill 5 件事**
  console 无错 / e2e 绿 / index.html 重定向 / 资源外链可达 / 版本号同步

- [ ] **Step 17.7: 部署后冒烟测试**
  打开 https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html 验证 v1.1.0 changelog 弹窗出现

- [ ] **Step 18.8: 通知用户**
  GitHub Pages 已更新,在线可访问

**检查点:** 远端同步 + Pages 部署 + 冒烟通过

---

## 异常处理速查

| 异常 | 处理 |
|------|------|
| Wizard step 3 保存时 `buildFrame` 报错 | 检查 `proto.fields` 是否为空,Custom 至少 1 字段才能保存 |
| Card 找不到命令 | 加 `card.protocol` 字段做优先路径,fallback 用 `NS.allCommands().find(c => c.id === card.cmd)` |
| 引导高亮元素不存在 | 0 协议状态 step 2/3 graceful no-op,显示"先去协议 tab 加一个" |
| Lucide 图标 stroke 看着粗 | 已在 helper 硬编码 `stroke-width="1.5"` 跟现有对齐 |
| v1 导入后没数据 | 检查 importConfig v1 检测逻辑,确认 uc.protocols 存在且 uc.commands 数组非空 |
| bump-version 脚本非 tty 失败 | 手动改 VERSION + 加 changelog 段(本 Phase 0.4 已用此法) |
| agent-browser 60s timeout | 拆 scenario 单独跑,timeout=120s |

---

## 阶段产物汇总

| Phase | Task | 产物 | 时间 |
|-------|------|------|------|
| A | 1 | 数据模型重构 | 1h |
| A | 2 | ICONS + icon() helper | 30min |
| A | 3 | 工具栏改造 | 10min |
| F | 4-5 | 删 4 旧 modal | 45min |
| F | 6 | v1 导入迁移 | 20min |
| B | 7 | 新建协议 3 步向导 | 1.5h |
| C | 8 | 新建命令 modal | 1h |
| D | 9-13 | 配置中心 + 5 tab | 2.5h |
| E | 14 | 漫游引导 | 1h |
| 3 | 15 | e2e 13 场景 | 1h |
| 4 | 16-17 | 审查 + changelog | 25min |
| 5 | 18 | commit + push + 部署 | 10min |
| **合计** | | | **~10h (1.5 sprint)** |
