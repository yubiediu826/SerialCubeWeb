# SerialCube v1.1.1 修复交接 — 4 个用户反馈问题

> **用途:** 用户实测 v1.1.0 后反馈 4 个问题,本会话已制定完整方案(v3),新会话/新窗口按本文件 + v3 预览实施。
> **最后更新:** 2026-08-12
> **目标版本:** v1.1.1 (patch bump)
> **方案预览:** [`docs/design/v1.1.1-fixes-preview-v3.html`](../design/v1.1.1-fixes-preview-v3.html) (52KB,**必读**)
> **前置文档:** [`HANDOFF-POST-V1.1.0-2026-08-12.md`](HANDOFF-POST-V1.1.0-2026-08-12.md) (v1.1.0 发版后状态)
> **当前版本:** v1.1.0 (`SerialCube.html const VERSION = '1.1.0'`)

---

## 🚀 TL;DR — 60 秒看完

**4 个用户反馈问题:**
1. 主题配置入口消失 → 在主 system-menu 加 segmented(浅/深/跟随)
2. "配置中心"名字过宽 → 改名为"**协议配置**"
3. 编辑模式按钮 active 态无视觉 + 卡片右上角图标缺失 → 修 CSS specificity + 修 card-action 渲染
4. 协议配置弹窗关闭回到仪表盘 → **Modal stack** 嵌套修复

**核心决策(用户已确认):**
- 主题放进**主系统菜单**(topbar 右上角 3 横线,截图红框那个),**不动主体结构**
- 复用已有主题 JS `handleThemeChange()`,业务逻辑 0 行新增
- 协议配置 modal id `dh-config-center` 保留(只改显示文字,改 id 影响范围大)

**改动量:** ~100 行 / 4 个修复点 / 0 个新 modal / 0 个新文件

---

## 📋 4 个修复点(逐项 + 位置 + 代码)

### 修复 1:主题 → 主系统菜单加 segmented ⭐

**位置:** `SerialCube.html` 行 7031-7032(主 system-menu HTML,在 `version-info-btn` 之后,`config-menu-row` 之前)

**当前状态(v1.1.0):**
- ✅ 主题 JS 全在:`state.theme` / `applyTheme()` (行 9273) / `handleThemeChange()` (行 9305) / `refs.themeGroup` / `refs.themeOpts.is-active` (行 9281-9290)
- ❌ **主 system-menu 完全没主题入口**(只有关于/配置/GitHub/反馈/下载 5 行)
- ❌ 仪表盘内部 `dh-menu-theme` 按钮(行 7508)TODO 注释明示 "click handler 未接",形同虚设

**修复方案 — HTML 插入(行 7031 后,config-menu-row 之前):**

```html
<div class="menu-config-line">
  <span class="menu-config-label">主题:</span>
  <div class="theme-seg" id="sys-theme-seg">
    <button data-theme="light" title="浅色主题">
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6">
        <circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M3 3l1.5 1.5M11.5 11.5L13 13M1 8h2M13 8h2M3 13l1.5-1.5M11.5 4.5L13 3"/>
      </svg>
      浅色
    </button>
    <button data-theme="dark" title="深色主题">
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6">
        <path d="M14 9.5A6.5 6.5 0 0 1 6.5 2 6.5 6.5 0 1 0 14 9.5z"/>
      </svg>
      深色
    </button>
    <button data-theme="system" title="跟随系统">
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6">
        <rect x="2" y="3" width="12" height="9" rx="1"/><path d="M5 13h6M8 12v1"/>
      </svg>
      跟随
    </button>
  </div>
</div>
```

**修复方案 — CSS 新增(行 6700 附近,.menu-config-line 样式后面):**

```css
.dashboard-host .system-menu .theme-seg {
  display: inline-flex;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 2px;
  background: var(--bg-elev);
  gap: 2px;
}
.dashboard-host .system-menu .theme-seg button {
  padding: 3px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-soft);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dashboard-host .system-menu .theme-seg button.active {
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
.dashboard-host .system-menu .theme-seg button:hover:not(.active) {
  background: var(--accent-soft);
  color: var(--accent);
}
.dashboard-host .system-menu .theme-seg button svg { stroke-width: 1.6; }
```

**修复方案 — JS handler(system-menu 初始化时绑定,在 `attachModalHandlers` 或 system-menu 初始化区域):**

```js
(function bindSystemThemeSeg() {
  const seg = document.getElementById('sys-theme-seg');
  if (!seg) return;
  // 初始化 active 态(state.theme 已有,值为 'light'/'dark'/'system')
  const refresh = () => {
    seg.querySelectorAll('button[data-theme]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === state.theme);
    });
  };
  refresh();
  // 绑定 click
  seg.querySelectorAll('button[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleThemeChange(btn.dataset.theme);  // 复用已有(行 9305),自动调 applyTheme + save localStorage
      refresh();
    });
  });
})();
```

**修复方案 — 清理死按钮(行 7507-7508):**

```html
<!-- 删除这两行(TODO 注释 + 失效按钮) -->
<div class="menu-row" id="dh-menu-theme">切换深色 / 浅色</div>
```

**验证场景:**
- [ ] 点开系统菜单,看到"主题"行 + 3 选 1 segmented
- [ ] 当前主题对应按钮高亮(active class)
- [ ] 点"深色"立即切换,body.theme-dark 生效,favicon 切换
- [ ] 刷新页面后选择保留(localStorage)
- [ ] 选"跟随系统",OS 主题切换时自动跟随
- [ ] 切换主题不影响协议配置 modal 内部

---

### 修复 2:配置中心 → 协议配置 (改名)

**位置:** `SerialCube.html` 行 7669-7672(modal-header 标题 + 副标题 + 引导按钮)

**修复方案 — modal 标题改 3 处:**

| 行号 | 当前 | 改为 |
|------|------|------|
| 7669 | `配置中心` | **`协议配置`** |
| 7670 | `协议 / 命令 / 卡片 / 告警 / 导入导出` | `协议 / 命令 / 字段 / 导入导出` |
| 7672 | `<span>开始引导</span>` | `<span>新建协议</span>`(按钮 icon 改 + 号) |

**关键决策:**
- ✅ modal id `dh-config-center` **保留**(只改显示文字,id 改影响范围大,JS 引用 ~30 处)
- ✅ 5 个 tab 文字不动:协议 / 命令 / 卡片 / 告警 / 导入导出
- ✅ 头部右侧"开始引导"按钮 → "新建协议"(用户已决定删引导按钮,见修复 3)

**附加:tab 加 Lucide 图标(可选,提升视觉):**

```html
<button class="editor-tab active" data-tab="protocols" data-svg="network" data-svg-size="14">
  <svg ...>协议</svg>
</button>
<button class="editor-tab" data-tab="commands" data-svg="zap" data-svg-size="14">
  <svg ...>命令</svg>
</button>
<button class="editor-tab" data-tab="cards" data-svg="layout-grid" data-svg-size="14">
  <svg ...>卡片</svg>
</button>
<button class="editor-tab" data-tab="alerts" data-svg="bell" data-svg-size="14">
  <svg ...>告警</svg>
</button>
<button class="editor-tab" data-tab="ie" data-svg="arrow-left-right" data-svg-size="14">
  <svg ...>导入/导出</svg>
</button>
```

实际 v1.1.0 已经有 data-svg 属性 + `NS_renderIcons()` 自动渲染,所以这步可能**无需新加 SVG**。

**验证场景:**
- [ ] modal 标题显示"协议配置"
- [ ] 副标题显示"协议 / 命令 / 字段 / 导入导出"
- [ ] 头部按钮显示"新建协议",点击调 `NS.openNewProtocolWizard()`
- [ ] modal id `dh-config-center` 没变,所有 JS 引用照常工作

---

### 修复 3:编辑模式 + 卡片角标(2 子问题)

**3a. 编辑模式按钮 active 态无视觉**

**位置:** `SerialCube.html`
- CSS:行 5700 `.dashboard-host .toolbar-btn.active { ... }`
- JS:行 13649 `btn.classList.toggle('active', NS.editMode)`
- HTML:行 7481-7487 按钮

**Bug 根因:** CSS specificity 不够,被 :hover 或默认 button style 覆盖

**修复方案 — CSS 加 `!important` 锁住:**

```css
.dashboard-host .toolbar-btn.active {
  background: var(--accent) !important;
  color: white !important;
  border-color: var(--accent) !important;
  position: relative;
}
.dashboard-host .toolbar-btn.active::before {
  content: '';
  position: absolute;
  top: -2px; left: -2px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 2px var(--bg-elev);
}
```

**修复方案 — 文字态变化(行 7486 改):**

```html
<button class="toolbar-btn" id="dh-toggle-edit">
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M11 2l3 3-8 8H3v-3zM10 3l3 3"/>
  </svg>
  <span id="dh-toggle-edit-label">编辑模式</span>  <!-- 改:加 id 包装 -->
</button>
```

**JS 同步文字(行 13649 附近,在 toggle 逻辑里):**

```js
const labelEl = document.getElementById('dh-toggle-edit-label');
if (labelEl) labelEl.textContent = NS.editMode ? '编辑中' : '编辑模式';
```

**3b. 卡片右上角图标缺失**

**位置:** `SerialCube.html`
- CSS:行 6059-6064 `.dashboard-host .card-default .card-actions` + 行 6065 `.card-action` 样式
- HTML:行 10179-10182(trend card) / 行 10224-10227(list card) — `NS.editMode` 时渲染
- JS:行 10230-10232(非 pair 卡片 append delete button)

**Bug 根因:**
- v1.1.0 升级 inline SVG 时,部分卡片类型(pair/trend/list)的 `.card-actions` 渲染分支漏了
- 按钮尺寸 16px × 16px,transparent 背景,无 hover 区域提示

**修复方案 — CSS 强化(行 6065 后追加):**

```css
.dashboard-host .card-default .card-action {
  /* 原样式保留 */
  width: 20px;  /* 16 → 20 */
  height: 20px;
  background: var(--bg-panel);  /* transparent → 浅底 */
  border: 1px solid var(--border);
  border-radius: 4px;
  /* 新增 hover */
  transition: all 0.12s;
}
.dashboard-host .card-default .card-action:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}
.dashboard-host .card-default .card-action.del:hover {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(224, 87, 94, 0.1);
}
.dashboard-host .card-default .card-action svg { width: 11px; height: 11px; stroke-width: 1.6; }
```

**修复方案 — JS 验证三类卡片都渲染(行 10179 / 10224 / 10296):**

行 10179-10182(trend card):
```js
+ (NS.editMode ? '<div class="card-actions">'
  + '<button aria-label="编辑" class="card-action" title="编辑" data-action="edit">...</button>'
  + '<button aria-label="删除" class="card-action del" title="删除" data-action="del">...</button>'  // 改:加 delete
  + '</div>' : '')
```

**关键:** v1.1.0 现有代码是"trend card 只渲染 edit,非 pair 才 append delete" — 简化:**edit 模式下所有 trend/list card 一次性渲染 edit + del 两个按钮**(避免 appendChild 漏渲染)。

行 10230-10232(appendChild 逻辑)**可删除**,或保留但确保 SVG path 正确。

**验证场景:**
- [ ] 编辑模式关闭时,卡片无右上角图标(HTML 不渲染)
- [ ] 编辑模式开启时,所有 trend 卡片右上角显示 [✏️] [🗑️] 两个图标
- [ ] 编辑模式开启时,所有 list 卡片右上角显示 [✏️] [🗑️]
- [ ] hover 图标时变 accent 色 + 浅蓝底
- [ ] 编辑模式按钮 active 态明显(蓝色背景 + 绿点)
- [ ] 工具栏按钮文字从"编辑模式" → "编辑中"

---

### 修复 4:Modal Stack ⭐ 核心

**位置:** `SerialCube.html`
- openModal/closeModal:行 12480-12498
- 协议配置 4 处 closeModal:行 12824 / 12863 / 12934 / 13612

**Bug 根因(行 12824/12863/12934):**
```js
// 协议配置里点"新建协议"
if (newBtn) newBtn.onclick = () => {
  NS.closeModal('dh-config-center');  // ❌ 关闭外层
  NS.openNewProtocolWizard();          // 然后开新 modal
};
// 结果:新 modal 关闭 → 配置中心已不在 → 回到仪表盘
```

**修复方案 — openModal/closeModal 重构(行 12480):**

```js
// 全局 modal 栈(放到 openModal 前面)
NS._modalStack = [];

NS.openModal = function (name) {
  const baseZ = 1000;
  const z = baseZ + NS._modalStack.length * 20;
  const bd = document.getElementById(name + '-backdrop');
  const md = document.getElementById(name + '-modal');
  if (bd) { bd.style.zIndex = z; bd.classList.add('open'); }
  if (md) { md.style.zIndex = z + 1; md.classList.add('open'); }
  NS._modalStack.push(name);
  if (name === 'dh-proto') NS.renderProtoEditor();
};

NS.closeModal = function (name) {
  const bd = document.getElementById(name + '-backdrop');
  const md = document.getElementById(name + '-modal');
  if (bd) bd.classList.remove('open');
  if (md) md.classList.remove('open');
  const idx = NS._modalStack.lastIndexOf(name);
  if (idx >= 0) NS._modalStack.splice(idx, 1);
};
```

**修复方案 — Esc 键只关栈顶(挂在 document 一次性):**

```js
// 在 init 区域一次性绑定
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && NS._modalStack && NS._modalStack.length > 0) {
    const top = NS._modalStack[NS._modalStack.length - 1];
    NS.closeModal(top);
  }
});
```

**修复方案 — 协议配置 4 处 closeModal 删除:**

| 行号 | 位置 | 删除内容 |
|------|------|----------|
| 12824 | 协议 tab 新建按钮 | `NS.closeModal('dh-config-center');` |
| 12863 | 协议 tab 编辑按钮 | `NS.closeModal('dh-config-center');` |
| 12934 | 命令 tab 新建命令 | `NS.closeModal('dh-config-center');` |
| 13612 | 协议配置内引导 | `NS.closeModal('dh-config-center');` |

```js
// 改后示例(行 12822-12825)
if (newBtn) newBtn.onclick = () => {
  // NS.closeModal('dh-config-center');  ← 删
  NS.openNewProtocolWizard();  // 直接开,栈自动处理
};
```

**验证场景:**
- [ ] 协议配置 → 点新建协议 → 弹窗叠加在协议配置上(z 更高)
- [ ] 关闭新建协议 → 自动回到协议配置(配置中心还在栈底)
- [ ] 协议配置 → 点编辑协议 → 协议编辑器叠加 → 关闭 → 回到协议配置
- [ ] 协议配置 → 点新建命令 → 命令 modal 叠加 → 关闭 → 回到协议配置
- [ ] Esc 键只关栈顶 modal(不一次关所有)
- [ ] backdrop 点击只关栈顶
- [ ] 5 个现有 modal 单独打开/关闭正常(无嵌套时栈长度 = 1)
- [ ] dh-pair-trigger / dh-detail / dh-card-edit 等其他 modal 不受影响

---

## 🛠 实施顺序(推荐)

| 顺序 | 修复 | 理由 | 预计改动 |
|------|------|------|----------|
| **1** | 修复 4 Modal stack | 核心,先理顺所有 modal 行为 | ~40 行(openModal/closeModal + 4 处删除) |
| **2** | 修复 2 协议配置改名 | 显示文字改,影响小,独立 | 3 行文字 + 1 行图标 |
| **3** | 修复 1 主题 segmented | 复用已有 JS,新增 HTML+CSS+handler | ~30 行 HTML+CSS+handler |
| **4** | 修复 3 编辑模式 + 卡片角标 | 纯 CSS + 2 处 JS,最后做 | ~20 行 CSS + 5 行 JS |

**总预计:** ~100 行 / 0 个新文件 / 1 个文件改(SerialCube.html)

---

## 📊 风险评估

### 🟢 低风险
- 协议配置 modal 改名只改显示文字,id 保留
- 编辑模式 CSS 改动加 `!important`,只强化不退化
- 主题 segmented 复用已有 `handleThemeChange()`,新写 0 行业务逻辑
- 主体结构不动,只补 system-menu 缺的主题行

### 🟡 中风险
- openModal/closeModal 是全局函数,改 z-index 逻辑需要 5 个 modal 全验证
- system-menu HTML 插入新行要确认不影响 3 横线按钮的 click 关闭逻辑
- 主题切换时 `refs.themeOpts.is-active` 同步逻辑需跟 system-menu 的 segmented 同步(避免双 segmented active 不一致)
- Esc 键全局监听可能与未来其他快捷键冲突

### 🔴 高风险
- 无

---

## 🎯 验证流程

### 1. 实施前(读这份文档 + v3 预览)
- [ ] 读 `docs/design/v1.1.1-fixes-preview-v3.html` 完整预览(必读)
- [ ] 读 `SerialCube.html` 行 7025-7050(system-menu HTML)、行 9268-9310(主题 JS)、行 12480-12510(modal 控制)

### 2. 实施中(按顺序)
- [ ] 修复 4 实施完,跑 `node docs/verify/verify-modal-stack.js`(临时验证脚本)
- [ ] 修复 2 实施完,visual check 协议配置 modal 标题
- [ ] 修复 1 实施完,visual check 系统菜单主题 segmented + 切换生效
- [ ] 修复 3 实施完,visual check 编辑模式按钮 + 卡片图标

### 3. 实施后(全套 e2e)
- [ ] 跑 `.minimax/skills/serialcube-e2e/` 6 个场景(`01-app-loads` 到 `06-theme-toggle`)
- [ ] 重点:06-theme-toggle 主题切换 / 04-protocol-editor 协议配置弹窗
- [ ] console.error = 0
- [ ] 手动测:配置中心 → 新建协议 → 关闭 → 回到配置中心(关键)

### 4. 提交前
- [ ] 跑 `bump-version.ps1 -Level patch`(VERSION 1.1.0 → 1.1.1)
- [ ] 写 `docs/changelog/2026-08-12-v1.1.1-fixes.md`
- [ ] 同步 `docs/CHANGELOG.md` 索引
- [ ] 中文 commit(参考 user 硬性规则)
- [ ] **ask_user 确认 push**(不可跳过)

---

## 🔑 关键文件位置速查

| 内容 | 位置 |
|------|------|
| 主 system-menu HTML | `SerialCube.html` 行 7025-7048 |
| 主题 JS(已有) | `SerialCube.html` 行 9268-9310 |
| 仪表盘内部 system-menu(待清理) | `SerialCube.html` 行 7500-7516 |
| 协议配置 modal | `SerialCube.html` 行 7664-7696 |
| openModal/closeModal | `SerialCube.html` 行 12480-12498 |
| 协议配置 4 处 closeModal | `SerialCube.html` 行 12824 / 12863 / 12934 / 13612 |
| 编辑模式 toggle 按钮 | `SerialCube.html` 行 7481-7487 |
| 编辑模式 JS toggle | `SerialCube.html` 行 13643-13654 |
| `.card-actions` CSS | `SerialCube.html` 行 6059-6107 |
| 卡片 action HTML 渲染 | `SerialCube.html` 行 10179-10232 / 10295-10298 |
| 工具栏按钮 CSS | `SerialCube.html` 行 5698-5701 |

---

## 📦 关键资源索引

### 文档
- `docs/design/v1.1.1-fixes-preview-v3.html` — **必读,完整方案预览(52KB)**
- `docs/handover/HANDOFF-POST-V1.1.0-2026-08-12.md` — v1.1.0 发版后状态
- `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` — 30 秒快速接手卡
- `docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md` — v1.1.0 设计 spec

### Skill
- `.minimax/skills/serialcube-workflow/` — SerialCube 总入口(5 问决策树)
- `.minimax/skills/version-management/` — VERSION 同步守门员
- `.minimax/skills/serialcube-e2e/` — 6 个 e2e 验证场景
- `.minimax/skills/deploy-checklist/` — 部署前 5 件事

### 代码
- `SerialCube.html` — 主文件(1003KB,21K+ 行)
- `bump-version.ps1` — 版本号自动同步

---

## ⚠️ 用户硬性规则(不可违反)

1. **commit 中文**
2. **push 前必 ask_user**(避免 force push 误操作)
3. **VERSION 三处同步**(`SerialCube.html const VERSION` / HTML changelog 段 / Git tag)
4. **改前必跑 `bump-version.ps1`**
5. **每次 push 前必写 `docs/changelog/YYYY-MM-DD-<topic>.md`**
6. **更新完必跑 link check + 同步关联文档**

---

## 🎯 用户背景信息(避免重复问)

- **角色:** 嵌入式 / 硬件方向(SerialCube 用于 BMS / EMS / PCS 协议调试)
- **设计偏好:**
  - 数据字段归命令不归协议(cmd 自带 dataFields)
  - 添加用 modal 不用内嵌表单
  - 图标只用 inline SVG(Lucide,16x16 viewBox + stroke 1.5)
  - 喜欢正交分层一站式 modal
  - 工具栏按钮越少越好
- **subagent 约定:** 1 task 1 subagent, ≤ 500 行 / ≤ 3K prompt

---

**文档状态:** v1.1.1 4 修复方案交接(本会话已规划,等新会话按顺序实施)

**Co-Authored-By:** Mavis (M3) <noreply@local>
