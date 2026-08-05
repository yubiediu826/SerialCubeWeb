# v4.8c 协议编辑器 UI 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 SerialCube.html 协议编辑器 UI — 顶部加 Kind 下拉 (8 种协议模板),fields 列表动态化 (按 kind 渲染 + locked 灰显),字节预览按段着色,加 "+ 新建" 协议 modal (默认 kind 7 TLV)。单文件 1 阶段 commit,不动 buildFrame 内核 (sub-1 已稳定)。

**Architecture:** 单文件 HTML,所有改动在 `D:\WorkSpace\SerialCubeWeb\SerialCube.html` (CRLF, 4 空格缩进)。数据层加 `NS._KIND_FIELD_TEMPLATES` (8 kind 默认 fields);UI 状态加 `NS._protoNewModal`;协议编辑器抽 `NS._renderProtoTabBar` + 加 kind 下拉 + fields 动态化 + 字节预览按段着色;CSS 加 .kind-select / .proto-field-row.locked / .byte-group.b-* / .proto-new-modal。现状 2 协议 (BMS/Modbus) 走 kind 0 (fixed-header) 兼容。

**Tech Stack:** 纯 JavaScript (无框架) + CSS (CSS variables 主题) + HTML (innerHTML 渲染)。无构建步骤,无自动化测试,手动浏览器 smoke test 验证。

## Global Constraints

- **单文件**: `D:\WorkSpace\SerialCubeWeb\SerialCube.html`,不动其他文件
- **CRLF 行尾 + 4 空格缩进** (跟现状一致,git 会自动转 LF → CRLF)
- **NS 命名空间**: 所有新增函数/状态走 `NS.xxx` (在 IIFE 闭包内,外部用 `window.__serialWebDashboard.NS.xxx`)
- **数据兼容性字段不可改** (AGENTS.md §2):
  - `localStorage` keys: `serialweb:prefs`, `serialweb:version-modal-seen`, `wsl-*` 系列
  - 配置 JSON type: `SerialWebUserConfig` (v1)
  - `.timeline` 二进制 magic: `WSLBIN1` (`0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00`)
  - API 路径: `/api/serialweb_page-view`
  - JS 内部命名: `__serialWeb*`, `clearSerialWebStoredUserData`
- **sub-1 已加的不能动**: `NS._KIND_TEMPLATES`, `NS._buildFrameXxx` (7 个), `NS.PROTOCOLS.kind` 字段, `NS.activeProtoId`, `NS.buildFrame`
- **commit 策略**: 1 个 commit 整批 (`v4.8c ...`),不拆 a/b (spec §10.2 明确)。所有 task 实施期间代码在工作区累积,Task 18 一次性 commit + push
- **失败切换准则** (AGENTS.md §6): 同一方案/工具/语法失败 2 次立即切换,不追加同类尝试。reload + inspect + screenshot ≈ 200+ token,不要在同一方案上反复 reload
- **TDD 适配**: 本项目无自动化测试, "TDD" 步骤改为 "verify current state → make change → verify new state" via 浏览器 console (`__serialWebDashboard.NS.xxx`) + 浏览器 smoke test
- **不在协议编辑器中改 buildFrame** — sub-1 内核已稳定,只改 UI 层
- **不加新外部依赖** — 纯原生 JS/CSS

---

## File Structure (改动文件清单)

| 文件 | 类型 | 职责 |
|---|---|---|
| `SerialCube.html` | Modify | 全部改动都在这 1 个文件: JS (新 NS 命名空间成员 + renderProtoEditor 重构) + CSS (新样式) + HTML (新 modal 容器,加到 modal-root 区域) |

子结构 (文件内):
- **JS section** (按 line 顺序):
  - `_KIND_FIELD_TEMPLATES` 数据 — 紧跟 `_KIND_TEMPLATES` (sub-1) 后
  - `_applyKindTemplate` 工具函数 — 紧跟 `_KIND_FIELD_TEMPLATES` 后
  - `_protoNewModal` 状态 — 紧跟 `activeProtoId` 附近
  - `_renderProtoNewModal` + `_createProtoFromTemplate` — 紧跟 `openModal` 后
  - `_renderProtoTabBar` (从 `renderProtoEditor` 抽出) — `renderProtoEditor` 内部
  - `_onKindChange` (切 kind 弹确认) — `renderProtoEditor` 内部
  - `renderProtoEditor` 改造 — 主函数,内部加 kind 下拉 + fields 动态化 + 字节预览按段着色
- **CSS section** (按 line 顺序):
  - `.kind-select` + `.kind-select:focus` — tab bar 下方
  - `.proto-field-row.locked` + `.proto-field-row .f-add-btn` — fields 列表区
  - `.byte-group` + `.b-header/.b-cmd/.b-type/.b-length/.b-data/.b-crc/.b-tail/.b-addr/.b-msgid/.b-tlv` — 字节预览
  - `.proto-new-modal` + `.proto-new-kinds` + `.proto-new-preview` + `.proto-new-actions` — 新建 modal
- **HTML section**:
  - 新建 modal 容器 — 加到 `.modal-root` 区域 (跟其他 modal 容器并列)

---

## Task 1: 加 NS._KIND_FIELD_TEMPLATES (8 kind 默认 fields)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._KIND_FIELD_TEMPLATES`)

**Interfaces:**
- Consumes: `NS._KIND_TEMPLATES` (sub-1 已加,只读 — 8 kind 的元信息,含 name 描述)
- Produces: `NS._KIND_FIELD_TEMPLATES` (新 — 8 kind 的默认 fields 数组,每元素含 name/size/type/default/locked?/bit7?/addrRole?/bitfield?/note?)

- [ ] **Step 1: 定位插入位置**

打开 `SerialCube.html`,搜 `_KIND_TEMPLATES` (Ctrl+F),找到 sub-1 已加的 `NS._KIND_TEMPLATES = { ... }` 定义。记下最后一行行号 (例如 `12345`)。

- [ ] **Step 2: 写 8 kind 默认 fields 模板**

在 `NS._KIND_TEMPLATES` 定义结束行后**新起一行**,插入 (CRLF + 4 空格缩进):

```js
NS._KIND_FIELD_TEMPLATES = {
    'fixed-header': [
        { name: 'header', size: 1, type: 'header', default: '0xAA' },
        { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
        { name: 'length', size: 1, type: 'length', default: 'auto', locked: true },
        { name: 'data',   size: 0, type: 'data',   default: '0x00' },
        { name: 'crc',    size: 2, type: 'crc',    default: 'auto', locked: true },
        { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
    ],
    'raw': [
        { name: 'header', size: 1, type: 'header', default: '0x5A' },
        { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
        { name: 'length', size: 1, type: 'length', default: 'auto', locked: true },
        { name: 'data',   size: 0, type: 'data',   default: '0x00' },
        { name: 'crc',    size: 2, type: 'crc',    default: 'auto', locked: true },
        { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
    ],
    'cmd-split': [
        { name: 'header', size: 1, type: 'header', default: '0xAA' },
        { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00', bit7: 'direction' },
        { name: 'length', size: 1, type: 'length', default: 'auto', locked: true },
        { name: 'data',   size: 0, type: 'data',   default: '0x00' },
        { name: 'crc',    size: 2, type: 'crc',    default: 'auto', locked: true },
        { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
    ],
    'addr-split': [
        { name: 'header',  size: 1, type: 'header',  default: '0xAA' },
        { name: 'srcAddr', size: 1, type: 'srcAddr', default: '0x00', addrRole: 'MB:hostId, CB:devId' },
        { name: 'dstAddr', size: 1, type: 'dstAddr', default: '0x00', addrRole: 'MB:devId, CB:hostId' },
        { name: 'cmd',     size: 1, type: 'cmd',     default: '0x00' },
        { name: 'length',  size: 1, type: 'length',  default: 'auto', locked: true },
        { name: 'data',    size: 0, type: 'data',    default: '0x00' },
        { name: 'crc',     size: 2, type: 'crc',     default: 'auto', locked: true },
        { name: 'tail',    size: 1, type: 'tail',    default: '0x55' }
    ],
    'ctrl-bit7': [
        { name: 'header', size: 1, type: 'header', default: '0xAA' },
        { name: 'ctrl',   size: 1, type: 'ctrl',   default: '0x10', bit7: 'direction' },
        { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
        { name: 'length', size: 1, type: 'length', default: 'auto', locked: true },
        { name: 'data',   size: 0, type: 'data',   default: '0x00' },
        { name: 'crc',    size: 2, type: 'crc',    default: 'auto', locked: true },
        { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
    ],
    'type-high-bit': [
        { name: 'header', size: 1, type: 'header', default: '0xAA' },
        { name: 'type',   size: 1, type: 'type',   default: '0x20', bit7: 'direction' },
        { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
        { name: 'length', size: 1, type: 'length', default: 'auto', locked: true },
        { name: 'data',   size: 0, type: 'data',   default: '0x00' },
        { name: 'crc',    size: 2, type: 'crc',    default: 'auto', locked: true },
        { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
    ],
    'msgid-mixed': [
        { name: 'msgID',  size: 2, type: 'msgID',  default: '0x0000', bitfield: 'bit15=dir, bit14-8=func, bit7-0=addr' },
        { name: 'length', size: 1, type: 'length', default: 'auto', locked: true },
        { name: 'data',   size: 0, type: 'data',   default: '0x00' },
        { name: 'crc',    size: 2, type: 'crc',    default: 'auto', locked: true },
        { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
    ],
    'tlv': [
        { name: 'header', size: 1, type: 'header', default: '0xAA', locked: true },
        { name: 'tlv',    size: 0, type: 'data',   default: '—',      locked: true, note: '循环 TLV (cmd.tlvs)' },
        { name: 'crc',    size: 2, type: 'crc',    default: 'auto' },
        { name: 'tail',   size: 1, type: 'tail',   default: '0x55', locked: true }
    ]
};
```

- [ ] **Step 3: 验证语法**

打开 PowerShell,运行:

```powershell
node -e "const fs=require('fs');const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');const m=html.match(/NS\._KIND_FIELD_TEMPLATES\s*=\s*\{[\s\S]*?\n\};/);if(!m){console.log('FAIL: not found');process.exit(1)}console.log('OK, length:',m[0].length);console.log('kinds:',m[0].match(/'(fixed-header|raw|cmd-split|addr-split|ctrl-bit7|type-high-bit|msgid-mixed|tlv)'/g).length);"
```

Expected: `OK, length: <N>` + `kinds: 8` (8 个 kind 字符串都匹配到)。**不 commit,继续 Task 2**。

---

## Task 2: 加 NS._applyKindTemplate 深拷贝函数

**Files:**
- Modify: `SerialCube.html` (新增 `NS._applyKindTemplate`)

**Interfaces:**
- Consumes: `kind` (字符串) + `NS._KIND_FIELD_TEMPLATES` (Task 1)
- Produces: 深拷贝的 fields 数组 (新对象数组, 不引用原数组;每元素是新对象)

- [ ] **Step 1: 紧跟 Task 1 插入**

在 `NS._KIND_FIELD_TEMPLATES` 定义结束 (`};` 行) 之后,新起一行,插入:

```js
NS._applyKindTemplate = function (kind) {
    const tpl = NS._KIND_FIELD_TEMPLATES[kind] || NS._KIND_FIELD_TEMPLATES['fixed-header'];
    return JSON.parse(JSON.stringify(tpl));
};
```

- [ ] **Step 2: 验证函数可调用 + 深拷贝**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._applyKindTemplate\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: function not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('uses JSON.parse(JSON.stringify):',m[0].includes('JSON.parse(JSON.stringify')?'YES':'NO');
console.log('fallback to fixed-header:',m[0].includes(\"'fixed-header'\")?'YES':'NO');
"
```

Expected: `function found, length: <N>` + `uses JSON.parse(JSON.stringify): YES` + `fallback to fixed-header: YES`。

**不 commit,继续 Task 3**。

---

## Task 3: 加 NS._protoNewModal UI 状态

**Files:**
- Modify: `SerialCube.html` (新增 `NS._protoNewModal`)

**Interfaces:**
- Consumes: 无
- Produces: `NS._protoNewModal = { open, name, kind, source }` 状态对象

- [ ] **Step 1: 定位 `activeProtoId` 位置**

在 SerialCube.html 搜 `activeProtoId`,找到 `NS.activeProtoId = ...` (或 `var NS.activeProtoId`) 附近。

- [ ] **Step 2: 在 `activeProtoId` 之后插入**

紧跟 `NS.activeProtoId` 定义行 (无论 var/let/const),新起一行,插入:

```js
NS._protoNewModal = {
    open: false,
    name: '',
    kind: 'tlv',  // D7: 默认 kind 7 (TLV)
    source: null  // null = 用 kind 默认模板;非 null = 复制现有 protocol id
};
```

- [ ] **Step 3: 验证状态对象存在 + 默认 kind=tlv**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._protoNewModal\s*=\s*\{[\s\S]*?source:\s*null\s*\};/);
if(!m){console.log('FAIL: state not found');process.exit(1)}
console.log('state found, length:',m[0].length);
console.log('default kind=tlv:',m[0].includes(\"kind: 'tlv'\")?'YES':'NO');
console.log('open=false:',m[0].includes('open: false')?'YES':'NO');
"
```

Expected: `state found, length: <N>` + `default kind=tlv: YES` + `open=false: YES`。

**不 commit,继续 Task 4**。

---

## Task 4: 加 NS._renderProtoNewModal 渲染函数

**Files:**
- Modify: `SerialCube.html` (新增 `NS._renderProtoNewModal`)

**Interfaces:**
- Consumes: `NS._protoNewModal` (Task 3 状态) + `NS._KIND_TEMPLATES` (sub-1) + `NS._applyKindTemplate` (Task 2)
- Produces: 弹窗 HTML 注入到 `.modal` 容器 (复用 `NS.openModal` 框架)

- [ ] **Step 1: 定位 `openModal` 定义**

在 SerialCube.html 搜 `NS.openModal = function` 或 `openModal: function`,找到 modal 入口函数。

- [ ] **Step 2: 在 `openModal` 之后插入**

紧跟 `openModal` 函数结束行,新起一行,插入 (CRLF + 4 空格缩进):

```js
NS._renderProtoNewModal = function () {
    const m = NS._protoNewModal;
    const kinds = Object.keys(NS._KIND_TEMPLATES);
    const kindOpts = kinds.map((k, idx) => {
        const name = NS._KIND_TEMPLATES[k].name;
        const checked = k === m.kind ? 'checked' : '';
        return `<label class="proto-new-kind-opt">
            <input type="radio" name="proto-new-kind" value="${k}" ${checked} />
            <span>${idx} · ${name}</span>
        </label>`;
    }).join('');
    const tplFields = NS._applyKindTemplate(m.kind);
    const preview = tplFields.map(f => `${f.name}(${f.size || '?'}B, ${f.type}${f.locked ? ', locked' : ''})`).join(' | ');
    const nameVal = m.name || '';
    NS.openModal(`
        <div class="proto-new-modal">
            <h3>新建协议</h3>
            <div class="proto-new-row">
                <label>协议名</label>
                <input class="proto-new-name" type="text" placeholder="新协议 1" value="${nameVal}" />
            </div>
            <div class="proto-new-row">
                <label>Kind</label>
                <div class="proto-new-kinds">${kindOpts}</div>
            </div>
            <div class="proto-new-row">
                <label>默认 fields (kind ${m.kind}):</label>
                <div class="proto-new-preview">${preview}</div>
            </div>
            <div class="proto-new-actions">
                <button class="btn-cancel">取消</button>
                <button class="btn-create">创建</button>
            </div>
        </div>
    `);
    // Event listeners
    setTimeout(() => {
        const nameInput = document.querySelector('.proto-new-name');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                NS._protoNewModal.name = e.target.value;
            });
        }
        document.querySelectorAll('input[name="proto-new-kind"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                NS._protoNewModal.kind = e.target.value;
                NS._renderProtoNewModal();
            });
        });
        const cancelBtn = document.querySelector('.proto-new-modal .btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                NS._protoNewModal.open = false;
                NS.closeModal();
            });
        }
        const createBtn = document.querySelector('.proto-new-modal .btn-create');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                NS._createProtoFromTemplate();
            });
        }
    }, 0);
};
```

- [ ] **Step 3: 验证函数存在 + 8 个 kind radio**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._renderProtoNewModal\s*=\s*function[\s\S]*?^};/m);
if(!m){console.log('FAIL: function not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('uses openModal:',m[0].includes('NS.openModal')?'YES':'NO');
console.log('uses closeModal:',m[0].includes('NS.closeModal')?'YES':'NO');
console.log('8 kind radios (kinds.map):',m[0].includes('kinds.map')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 5**。

---

## Task 5: 抽 NS._renderProtoTabBar (从 renderProtoEditor 抽出)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._renderProtoTabBar`,修改 `NS.renderProtoEditor` 调用它)

**Interfaces:**
- Consumes: `NS.PROTOCOLS` + `NS.activeProtoId` (现状)
- Produces: tab bar HTML (注入到 `.proto-tabs` 容器)

- [ ] **Step 1: 定位 `renderProtoEditor`**

在 SerialCube.html 搜 `NS.renderProtoEditor = function`,找到主函数。

- [ ] **Step 2: 抽出 tab bar 渲染逻辑**

在 `renderProtoEditor` 函数体**最开头** (其他代码之前),插入:

```js
NS._renderProtoTabBar = function (container) {
    const tabs = NS.PROTOCOLS.map(p => {
        const isActive = p.id === NS.activeProtoId;
        const isLegacy = !p.isUser;
        return `<div class="proto-tab ${isActive ? 'active' : ''}" data-proto-id="${p.id}">
            ${p.name}${isLegacy ? ' <span class="proto-tab-badge legacy">Legacy</span>' : ' <span class="proto-tab-badge new">NEW</span>'}
            <button class="proto-tab-close" data-proto-id="${p.id}">×</button>
        </div>`;
    }).join('');
    container.innerHTML = tabs + `<div class="proto-tab proto-tab-add" id="proto-tab-add">+ 新建</div>`;
    // Event listeners
    container.querySelectorAll('.proto-tab').forEach(tab => {
        if (tab.classList.contains('proto-tab-add')) {
            tab.addEventListener('click', () => {
                NS._protoNewModal = { open: true, name: '', kind: 'tlv', source: null };
                NS._renderProtoNewModal();
            });
        } else {
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('proto-tab-close')) return;
                NS.activeProtoId = tab.dataset.protoId;
                NS.renderProtoEditor();
            });
            const closeBtn = tab.querySelector('.proto-tab-close');
            if (closeBtn && !closeBtn.disabled) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = closeBtn.dataset.protoId;
                    const proto = NS.PROTOCOLS.find(p => p.id === id);
                    if (proto && !proto.isUser) return;  // legacy 不能删
                    if (proto && confirm(`删除协议 ${proto.name}?`)) {
                        NS.PROTOCOLS = NS.PROTOCOLS.filter(p => p.id !== id);
                        if (NS.activeProtoId === id) {
                            NS.activeProtoId = NS.PROTOCOLS[0]?.id || null;
                        }
                        NS.renderProtoEditor();
                    }
                });
            }
        }
    });
};
```

- [ ] **Step 3: 修改 `renderProtoEditor` 调用新函数**

在原 `renderProtoEditor` 函数体中,找到 tab bar 渲染代码 (通常是 `protoTabsEl.innerHTML = ...` 或类似),**整段替换**为:

```js
NS._renderProtoTabBar(protoTabsEl);
```

- [ ] **Step 4: 验证函数被调用**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const defM=html.match(/NS\._renderProtoTabBar\s*=\s*function/);
const callM=html.match(/NS\._renderProtoTabBar\s*\(\s*protoTabsEl\s*\)/);
console.log('_renderProtoTabBar defined:',defM?'YES':'NO');
console.log('_renderProtoTabBar called:',callM?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 6**。

---

## Task 6: 加 kind 下拉 (8 种 + 描述)

**Files:**
- Modify: `SerialCube.html` (在 `renderProtoEditor` 内部, tab bar 渲染后插入)

**Interfaces:**
- Consumes: `protocol.kind` + `NS._KIND_TEMPLATES` (sub-1) + `NS._KIND_FIELD_TEMPLATES` (Task 1)
- Produces: `<select class="kind-select">` 含 8 个 `<option>`

- [ ] **Step 1: 定位 tab bar 渲染代码**

在 `renderProtoEditor` 函数体内,找到 `NS._renderProtoTabBar(protoTabsEl);` 调用 (Task 5 改的)。

- [ ] **Step 2: 紧跟其后插入 kind 下拉**

在 `NS._renderProtoTabBar(protoTabsEl);` 之后,新起一行,插入:

```js
const proto = NS.PROTOCOLS.find(p => p.id === NS.activeProtoId);
if (proto) {
    const kindSel = document.createElement('select');
    kindSel.className = 'kind-select';
    Object.keys(NS._KIND_TEMPLATES).forEach((kind, idx) => {
        const opt = document.createElement('option');
        opt.value = kind;
        opt.text = `${idx} · ${NS._KIND_TEMPLATES[kind].name}`;
        if (kind === proto.kind) opt.selected = true;
        kindSel.appendChild(opt);
    });
    kindSel.addEventListener('change', NS._onKindChange);
    protoEditorEl.insertBefore(kindSel, protoEditorEl.querySelector('.proto-fields-table'));
}
```

- [ ] **Step 3: 验证 kind-select 创建**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/kindSel\.addEventListener\('change',\s*NS\._onKindChange\)/);
console.log('kind-select with _onKindChange handler:',m?'YES':'NO');
"
```

Expected: `YES`。

**不 commit,继续 Task 7**。

---

## Task 7: 切 kind 弹确认 modal (D3)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._onKindChange`)

**Interfaces:**
- Consumes: 用户选的 kind (e.target.value) + 当前 protocol (NS.activeProtoId)
- Produces: 弹确认 modal + 切 kind 后 protocol.fields 重置

- [ ] **Step 1: 定位 `_renderProtoTabBar` 定义**

在 SerialCube.html 搜 `NS._renderProtoTabBar = function` (Task 5 加的)。

- [ ] **Step 2: 在其后插入 `_onKindChange`**

紧跟 `_renderProtoTabBar` 函数结束 (`};` 行) 后,新起一行,插入:

```js
NS._onKindChange = function (e) {
    const newKind = e.target.value;
    const proto = NS.PROTOCOLS.find(p => p.id === NS.activeProtoId);
    if (!proto || newKind === proto.kind) return;
    const oldKind = proto.kind;
    const oldSelVal = e.target.value;
    NS.openModal(`
        <div class="confirm-modal">
            <h3>切换 Kind</h3>
            <p>切到 kind "${newKind}" 会重置 fields, 确认?</p>
            <div class="confirm-modal-actions">
                <button class="btn-cancel">取消</button>
                <button class="btn-confirm">确认</button>
            </div>
        </div>
    `);
    setTimeout(() => {
        document.querySelector('.confirm-modal .btn-cancel').addEventListener('click', () => {
            e.target.value = oldKind;  // kind 下拉回滚
            NS.closeModal();
        });
        document.querySelector('.confirm-modal .btn-confirm').addEventListener('click', () => {
            proto.kind = newKind;
            proto.fields = NS._applyKindTemplate(newKind);
            NS.renderProtoEditor();
            NS.closeModal();
        });
    }, 0);
};
```

- [ ] **Step 3: 验证函数存在 + 回滚逻辑**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._onKindChange\s*=\s*function[\s\S]*?^};/m);
if(!m){console.log('FAIL');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('cancel rolls back:',m[0].includes('e.target.value = oldKind')?'YES':'NO');
console.log('confirm resets fields:',m[0].includes('NS._applyKindTemplate(newKind)')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 8**。

---

## Task 8: fields 列表动态化 (按 kind 渲染 rows)

**Files:**
- Modify: `SerialCube.html` (替换 `renderProtoEditor` 内部 fields 列表渲染)

**Interfaces:**
- Consumes: `protocol.fields` (数组) + `NS._KIND_TEMPLATES` (kind 允许的 type 范围)
- Produces: 动态 rows (按 `protocol.fields` 渲染,每行 7 列)

- [ ] **Step 1: 定位 fields 列表渲染代码**

在 `renderProtoEditor` 函数体内,找到 fields 表格 (`.proto-fields-table` 或类似) 渲染代码,通常是固定写死的 6 行 `<tr>`。

- [ ] **Step 2: 替换为动态渲染**

把整段固定 fields 渲染代码 (从 `<tr>...` 到 `</tr>` 列表的最后) **整段替换**为:

```js
const fieldsTbody = protoEditorEl.querySelector('.proto-fields-tbody');
if (fieldsTbody && proto) {
    fieldsTbody.innerHTML = '';
    const allowedTypes = NS._KIND_TEMPLATES[proto.kind]?.allowedTypes || ['header','cmd','length','data','crc','tail','ctrl','type','srcAddr','dstAddr','msgID','tlv'];
    proto.fields.forEach((field, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'proto-field-row' + (field.locked ? ' locked' : '');
        const typeOpts = allowedTypes.map(t => `<option value="${t}" ${t === field.type ? 'selected' : ''}>${t}</option>`).join('');
        tr.innerHTML = `
            <td class="f-idx">${idx + 1}</td>
            <td><input class="f-name" type="text" value="${field.name || ''}" /></td>
            <td><input class="f-size" type="text" value="${field.size}" /></td>
            <td><select class="f-type">${typeOpts}</select></td>
            <td><input class="f-default" type="text" value="${field.default || ''}" /></td>
            <td class="f-note">${field.note || ''}</td>
            <td><button class="f-del" title="删除字段">×</button></td>
        `;
        // Locked 字段: 全 disabled
        if (field.locked) {
            tr.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
        }
        // Event listeners (非 locked)
        if (!field.locked) {
            tr.querySelector('.f-name').addEventListener('change', (e) => {
                proto.fields[idx].name = e.target.value;
                NS.renderProtoEditor();
            });
            tr.querySelector('.f-size').addEventListener('change', (e) => {
                proto.fields[idx].size = parseInt(e.target.value) || 0;
                NS.renderProtoEditor();
            });
            tr.querySelector('.f-type').addEventListener('change', (e) => {
                proto.fields[idx].type = e.target.value;
                NS.renderProtoEditor();
            });
            tr.querySelector('.f-default').addEventListener('change', (e) => {
                proto.fields[idx].default = e.target.value;
                NS.renderProtoEditor();
            });
            tr.querySelector('.f-del').addEventListener('click', () => {
                if (confirm(`删除字段 ${field.name}?`)) {
                    proto.fields.splice(idx, 1);
                    NS.renderProtoEditor();
                }
            });
        }
        fieldsTbody.appendChild(tr);
        // "+ 加字段" 按钮 (Task 10 会改 enabled 规则)
        const addBtn = document.createElement('button');
        addBtn.className = 'f-add-btn';
        addBtn.textContent = '+ 加字段';
        const nextField = proto.fields[idx + 1];
        const canAdd = field.type === 'data' && (!nextField || nextField.type === 'data');
        addBtn.disabled = !canAdd;
        if (!addBtn.disabled) {
            addBtn.addEventListener('click', () => {
                proto.fields.splice(idx + 1, 0, { name: '', size: 0, type: 'data', default: '0x00' });
                NS.renderProtoEditor();
            });
        }
        const addRow = document.createElement('tr');
        addRow.className = 'proto-field-add-row';
        const addCell = document.createElement('td');
        addCell.colSpan = 7;
        addCell.appendChild(addBtn);
        addRow.appendChild(addCell);
        fieldsTbody.appendChild(addRow);
    });
    // 表格底部总 "+ 加字段" 按钮 (data zone 末尾追加)
    if (proto.fields.length > 0) {
        const lastField = proto.fields[proto.fields.length - 1];
        if (lastField.type === 'data') {
            const totalAddRow = document.createElement('tr');
            const totalAddCell = document.createElement('td');
            totalAddCell.colSpan = 7;
            const totalAddBtn = document.createElement('button');
            totalAddBtn.className = 'f-add-btn';
            totalAddBtn.textContent = '+ 加字段 (尾部)';
            totalAddBtn.disabled = false;
            totalAddBtn.addEventListener('click', () => {
                proto.fields.push({ name: '', size: 0, type: 'data', default: '0x00' });
                NS.renderProtoEditor();
            });
            totalAddCell.appendChild(totalAddBtn);
            totalAddRow.appendChild(totalAddCell);
            fieldsTbody.appendChild(totalAddRow);
        }
    }
}
```

- [ ] **Step 3: 验证动态渲染代码存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/proto\.fields\.forEach\(\(field,\s*idx\)/);
console.log('forEach fields:',m?'YES':'NO');
const m2=html.match(/fieldsTbody\.appendChild\(tr\)/);
console.log('appendChild tr:',m2?'YES':'NO');
const m3=html.match(/locked\?\\s*' locked'/);
console.log('locked class conditional:',m3?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 9**。

---

## Task 9: locked 字段灰显 (D6 v2) — CSS 部分

**Files:**
- Modify: `SerialCube.html` (CSS 段新增)

**Interfaces:**
- Consumes: `.proto-field-row.locked` class (Task 8 加的)
- Produces: 灰显 + input 不可编辑样式

- [ ] **Step 1: 定位 CSS 插入点**

在 SerialCube.html 搜 `.proto-field-row` 或 `.proto-fields-table`,找到 fields 列表的 CSS 段。

- [ ] **Step 2: 在其后插入 locked 样式**

紧跟现有 `.proto-field-row` 相关 CSS 后,新起一行,插入:

```css
.proto-field-row.locked {
    opacity: 0.5;
    background: rgba(0, 0, 0, 0.02);
}
.proto-field-row.locked input,
.proto-field-row.locked select,
.proto-field-row.locked button {
    cursor: not-allowed;
    background: transparent;
}
.proto-field-row .f-add-btn {
    font-size: 10px;
    padding: 2px 6px;
    background: transparent;
    color: var(--accent);
    border: 1px dashed var(--accent);
    border-radius: 3px;
    cursor: pointer;
    margin: 4px 0;
}
.proto-field-row .f-add-btn:disabled,
.proto-field-row .f-add-btn[disabled] {
    color: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
}
.proto-field-row .f-add-btn:hover:not(:disabled) {
    background: var(--accent);
    color: white;
}
```

- [ ] **Step 3: 验证 CSS 存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m1=html.match(/\.proto-field-row\.locked\s*\{/);
const m2=html.match(/\.proto-field-row \.f-add-btn/);
console.log('locked style:',m1?'YES':'NO');
console.log('add-btn style:',m2?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 10**。

---

## Task 10: 字节预览按段着色 (7 色 CSS)

**Files:**
- Modify: `SerialCube.html` (CSS 段新增)

**Interfaces:**
- Consumes: `.byte-group` + `.b-{type}` class (Task 11 会在 HTML 加)
- Produces: 7 段颜色 (header/cmd/type/length/data/crc/tail + addr/msgid/tlv)

- [ ] **Step 1: 定位 byte preview CSS 段**

在 SerialCube.html 搜 `.byte-preview` 或类似,找到字节预览 CSS 段。

- [ ] **Step 2: 替换为按段着色样式**

把现有 `.byte-preview` 相关 CSS (如果有) 替换为:

```css
.byte-group {
    display: inline-block;
    padding: 2px 4px;
    margin: 0 1px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 11px;
    line-height: 1.4;
}
.b-header { background: rgba(86, 114, 205, 0.18); color: #3a5ccc; }
.b-cmd    { background: rgba(217, 119, 6, 0.18);   color: #b87800; }
.b-type   { background: rgba(156, 39, 176, 0.18);  color: #8e24aa; }
.b-length { background: rgba(58, 158, 204, 0.18);  color: #1e88e5; }
.b-data   { background: rgba(44, 154, 74, 0.18);   color: #2c9a4a; }
.b-crc    { background: rgba(224, 87, 94, 0.18);   color: #c0392b; }
.b-tail   { background: rgba(120, 120, 120, 0.18); color: #555; }
.b-addr   { background: rgba(120, 120, 120, 0.18); color: #555; }
.b-msgid  { background: rgba(86, 114, 205, 0.18);  color: #3a5ccc; }
.b-tlv    { background: rgba(44, 154, 74, 0.18);   color: #2c9a4a; }
```

- [ ] **Step 3: 验证 7 色存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const colors=['b-header','b-cmd','b-type','b-length','b-data','b-crc','b-tail','b-addr','b-msgid','b-tlv'];
colors.forEach(c => {
    const m=html.match(new RegExp('\\\\.'+c+'\\\\s*\\\\{'));
    console.log(c+':',m?'YES':'NO');
});
"
```

Expected: 全部 `YES` (10 种颜色类)。

**不 commit,继续 Task 11**。

---

## Task 11: 字节预览按段着色 (JS 渲染 + 现有 buildFrame 集成)

**Files:**
- Modify: `SerialCube.html` (在 `renderProtoEditor` 内部替换 byte preview 渲染)

**Interfaces:**
- Consumes: `NS.buildFrame(protocol, NS.COMMANDS[0])` (sub-1 实现) + `protocol.fields` (Task 8)
- Produces: 字节组按 type 着色 (`.byte-group.b-${field.type}`)

- [ ] **Step 1: 定位 byte preview 渲染代码**

在 `renderProtoEditor` 函数体内,找到 byte preview 区域渲染 (通常是拼接 hex 字符串)。

- [ ] **Step 2: 替换为按段着色渲染**

把现有 byte preview 渲染代码**整段替换**为:

```js
const bytePreviewEl = protoEditorEl.querySelector('.proto-byte-preview');
if (bytePreviewEl && proto) {
    const cmd = NS.COMMANDS.find(c => c.protocolId === proto.id) || NS.COMMANDS[0];
    let bytes = [];
    try {
        bytes = NS.buildFrame(proto, cmd) || [];
    } catch (err) {
        bytePreviewEl.innerHTML = `<span class="byte-error">buildFrame 错误: ${err.message}</span>`;
        bytes = [];
    }
    let offset = 0;
    const segs = proto.fields.map(field => {
        if (field.size === 0 && field.type === 'data') {
            const seg = `<span class="byte-group b-${field.type}">XX ...</span>`;
            return { html: seg, len: 0 };
        }
        const segBytes = bytes.slice(offset, offset + field.size);
        const hex = segBytes.length > 0
            ? segBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
            : '—';
        const seg = `<span class="byte-group b-${field.type}" title="${field.name}">${hex}</span>`;
        offset += field.size;
        return { html: seg, len: field.size };
    });
    bytePreviewEl.innerHTML = segs.map(s => s.html).join(' ');
}
```

- [ ] **Step 3: 验证按段着色代码**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m1=html.match(/NS\.buildFrame\(proto,\s*cmd\)/);
const m2=html.match(/byte-group b-\\\$\{field\.type\}/);
console.log('buildFrame called:',m1?'YES':'NO');
console.log('byte-group by type:',m2?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 12**。

---

## Task 12: 加 NS._createProtoFromTemplate 创建协议

**Files:**
- Modify: `SerialCube.html` (新增 `NS._createProtoFromTemplate`)

**Interfaces:**
- Consumes: `NS._protoNewModal` (Task 3 状态) + `NS._applyKindTemplate` (Task 2)
- Produces: 新协议 push 到 `NS.PROTOCOLS` + `NS.activeProtoId` 切到新协议 + modal 关闭

- [ ] **Step 1: 定位 `_renderProtoNewModal` 定义**

在 SerialCube.html 搜 `NS._renderProtoNewModal = function` (Task 4 加的)。

- [ ] **Step 2: 紧跟其后插入 `_createProtoFromTemplate`**

紧跟 `_renderProtoNewModal` 函数结束行后,新起一行,插入:

```js
NS._createProtoFromTemplate = function () {
    const m = NS._protoNewModal;
    const name = (m.name || '').trim();
    if (!name) {
        NS.toast('协议名不能为空', 'warn');
        return;
    }
    if (NS.PROTOCOLS.some(p => p.name === name)) {
        NS.toast('协议名已存在', 'warn');
        return;
    }
    const fields = m.source
        ? JSON.parse(JSON.stringify(NS.PROTOCOLS.find(p => p.id === m.source).fields))
        : NS._applyKindTemplate(m.kind);
    const newId = 'proto_user_' + Date.now();
    NS.PROTOCOLS.push({
        id: newId,
        kind: m.kind,
        name: name,
        fields: fields,
        isUser: true,
        createdAt: Date.now()
    });
    NS.activeProtoId = newId;
    NS._protoNewModal.open = false;
    NS.closeModal();
    NS.renderProtoEditor();
    // 自动验证 (sub-1 行为)
    setTimeout(() => {
        try {
            const cmd = NS.COMMANDS.find(c => c.protocolId === newId) || NS.COMMANDS[0];
            const bytes = NS.buildFrame(NS.PROTOCOLS[NS.PROTOCOLS.length - 1], cmd);
            if (bytes && bytes.length > 0) {
                NS.toast('验证成功: ' + bytes.length + ' 字节', 'success');
            }
        } catch (err) {
            NS.toast('验证失败: ' + err.message, 'danger');
        }
    }, 100);
};
```

- [ ] **Step 3: 验证函数存在 + 验证逻辑**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._createProtoFromTemplate\s*=\s*function[\s\S]*?^};/m);
if(!m){console.log('FAIL');process.exit(1)}
console.log('function length:',m[0].length);
console.log('validates name empty:',m[0].includes('协议名不能为空')?'YES':'NO');
console.log('validates duplicate:',m[0].includes('协议名已存在')?'YES':'NO');
console.log('uses _applyKindTemplate:',m[0].includes('NS._applyKindTemplate(m.kind)')?'YES':'NO');
console.log('auto validate:',m[0].includes('NS.buildFrame')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 13**。

---

## Task 13: CSS — kind 下拉样式

**Files:**
- Modify: `SerialCube.html` (CSS 段新增)

**Interfaces:**
- Consumes: `.kind-select` (Task 6 加的)
- Produces: 跟现有 UI 风格一致的下拉样式

- [ ] **Step 1: 定位 CSS 插入点**

在 SerialCube.html 搜 `.proto-tabs` CSS,在其后插入。

- [ ] **Step 2: 插入 kind-select 样式**

```css
.kind-select {
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    min-width: 200px;
    margin: 0 0 8px 0;
}
.kind-select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(86, 114, 205, 0.15);
}
```

- [ ] **Step 3: 验证 CSS 存在**

```powershell
node -e "const fs=require('fs');const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');console.log('kind-select:',html.match(/\.kind-select\s*\{/)?'YES':'NO');console.log('focus:',html.match(/\.kind-select:focus\s*\{/)?'YES':'NO');"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 14**。

---

## Task 14: CSS — "+ 新建" modal 样式

**Files:**
- Modify: `SerialCube.html` (CSS 段新增)

**Interfaces:**
- Consumes: `.proto-new-modal` (Task 4 渲染的)
- Produces: modal 居中 + 表单样式

- [ ] **Step 1: 定位 CSS 插入点**

在 SerialCube.html 搜 `.confirm-modal` 或其他 modal 样式,确保新样式不冲突。

- [ ] **Step 2: 插入 proto-new-modal 样式**

```css
.proto-new-modal {
    padding: 8px;
    min-width: 480px;
    max-width: 600px;
}
.proto-new-modal h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--text);
    font-weight: 600;
}
.proto-new-row {
    margin-bottom: 12px;
}
.proto-new-row label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
    font-weight: 500;
}
.proto-new-name {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 13px;
    background: var(--surface);
    color: var(--text);
}
.proto-new-kinds {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}
.proto-new-kind-opt {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 3px;
    cursor: pointer;
    background: var(--surface);
}
.proto-new-kind-opt:has(input:checked) {
    border-color: var(--accent);
    background: rgba(86, 114, 205, 0.08);
}
.proto-new-preview {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px;
    font-family: monospace;
    font-size: 11px;
    color: var(--text-secondary);
    max-height: 120px;
    overflow-y: auto;
    word-break: break-all;
}
.proto-new-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
}
.proto-new-actions button {
    padding: 6px 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    cursor: pointer;
    font-size: 12px;
    color: var(--text);
}
.proto-new-actions .btn-create {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}
.proto-new-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

- [ ] **Step 3: 验证 CSS 存在**

```powershell
node -e "const fs=require('fs');const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');console.log('modal:',html.match(/\.proto-new-modal\s*\{/)?'YES':'NO');console.log('kinds:',html.match(/\.proto-new-kinds\s*\{/)?'YES':'NO');console.log('preview:',html.match(/\.proto-new-preview\s*\{/)?'YES':'NO');console.log('actions:',html.match(/\.proto-new-actions\s*\{/)?'YES':'NO');"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 15**。

---

## Task 15: 现状 2 协议 (BMS / Modbus) 走 kind 0 兼容验证

**Files:**
- Verify-only (不改代码): `SerialCube.html`

- [ ] **Step 1: 验证 2 协议有 kind='fixed-header'**

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
// 找默认 PROTOCOLS 数组
const m=html.match(/NS\.PROTOCOLS\s*=\s*\[[\s\S]*?\];/);
if(!m){console.log('FAIL: PROTOCOLS not found');process.exit(1)}
const arr=m[0];
console.log('PROTOCOLS found, length:',arr.length);
console.log('BMS kind=fixed-header:',arr.includes('BMS')&&arr.includes('fixed-header')?'YES (if both in same line)':'CHECK MANUALLY');
console.log('Modbus kind=fixed-header:',arr.includes('Modbus')&&arr.includes('fixed-header')?'YES (if both in same line)':'CHECK MANUALLY');
console.log('Legacy name:',arr.includes('(Legacy)')?'YES':'NO');
"
```

Expected: `Legacy name: YES`。其他两项需手动 grep 确认。

- [ ] **Step 2: 手动 grep 确认 2 协议**

```powershell
Select-String -Path 'D:\WorkSpace\SerialCubeWeb\SerialCube.html' -Pattern 'id:\s*[\x27\x22]proto_bms[\x27\x22]|id:\s*[\x27\x22]proto_modbus[\x27\x22]' -Context 2,5
```

Expected: 2 个 match,每个 match 后 5 行内有 `kind: 'fixed-header'`。

- [ ] **Step 3: 验证加载兼容点 (sub-1 spec 5.1)**

```powershell
Select-String -Path 'D:\WorkSpace\SerialCubeWeb\SerialCube.html' -Pattern 'kind:\s*p\.kind\s*\|\|\s*[\x27\x22]fixed-header[\x27\x22]'
```

Expected: 1 个 match (sub-1 已加的兼容点)。

如**任一验证失败**, 回到 SerialCube.html 修复,**不 commit**, 继续 Task 16。

---

## Task 16: syntax check 全部改动 (PowerShell 临时脚本)

**Files:**
- Read-only: `SerialCube.html` (累计 13 个 task 改完)

- [ ] **Step 1: 写 syntax check 脚本**

打开 PowerShell,运行:

```powershell
@'
$ErrorActionPreference = 'Stop'
$html = Get-Content -Path 'D:\WorkSpace\SerialCubeWeb\SerialCube.html' -Raw -Encoding UTF8

# Block 1: NS._KIND_FIELD_TEMPLATES
$b1 = $html -match 'NS\._KIND_FIELD_TEMPLATES\s*=\s*\{[\s\S]*?\n\};'
$b1kinds = ([regex]::Matches($html, "'(fixed-header|raw|cmd-split|addr-split|ctrl-bit7|type-high-bit|msgid-mixed|tlv)'")).Count
Write-Host "Block1 _KIND_FIELD_TEMPLATES: $b1 (kinds: $b1kinds, expect 8)"

# Block 2: _applyKindTemplate
$b2 = $html -match 'NS\._applyKindTemplate\s*=\s*function[\s\S]*?JSON\.parse\(JSON\.stringify'
Write-Host "Block2 _applyKindTemplate: $b2"

# Block 3: _protoNewModal
$b3 = $html -match "NS\._protoNewModal\s*=\s*\{[\s\S]*?kind:\s*'tlv'"
Write-Host "Block3 _protoNewModal: $b3"

# Block 4: _renderProtoNewModal
$b4 = $html -match 'NS\._renderProtoNewModal\s*=\s*function[\s\S]*?proto-new-modal[\s\S]*?btn-create'
Write-Host "Block4 _renderProtoNewModal: $b4"

# Block 5: _renderProtoTabBar
$b5 = $html -match 'NS\._renderProtoTabBar\s*=\s*function[\s\S]*?proto-tab-add'
Write-Host "Block5 _renderProtoTabBar: $b5"

# Block 6: kind select
$b6 = $html -match 'kindSel\.addEventListener\(.change.,\s*NS\._onKindChange\)'
Write-Host "Block6 kind select: $b6"

# Block 7: _onKindChange
$b7 = $html -match 'NS\._onKindChange\s*=\s*function[\s\S]*?NS\._applyKindTemplate\(newKind\)'
Write-Host "Block7 _onKindChange: $b7"

# Block 8: fields dynamic
$b8 = $html -match 'proto\.fields\.forEach\(\(field,\s*idx\)'
Write-Host "Block8 fields dynamic: $b8"

# Block 9: locked CSS
$b9 = $html -match '\.proto-field-row\.locked\s*\{'
Write-Host "Block9 locked CSS: $b9"

# Block 10: byte group colors
$b10 = ([regex]::Matches($html, '\.b-(header|cmd|type|length|data|crc|tail|addr|msgid|tlv)\s*\{')).Count
Write-Host "Block10 byte colors: $b10 (expect 10)"

# Block 11: byte group render
$b11 = $html -match 'byte-group b-\$\{field\.type\}'
Write-Host "Block11 byte group render: $b11"

# Block 12: _createProtoFromTemplate
$b12 = $html -match 'NS\._createProtoFromTemplate\s*=\s*function[\s\S]*?协议名不能为空'
Write-Host "Block12 _createProtoFromTemplate: $b12"

# Block 13: kind-select CSS
$b13 = $html -match '\.kind-select\s*\{'
Write-Host "Block13 kind-select CSS: $b13"

# Block 14: proto-new-modal CSS
$b14 = $html -match '\.proto-new-modal\s*\{'
Write-Host "Block14 proto-new-modal CSS: $b14"

# Total
$total = ($b1,$b2,$b3,$b4,$b5,$b6,$b7,$b8,$b9,$b11,$b12,$b13,$b14 | Where-Object {$_}).Count
$b10ok = $b10 -eq 10
Write-Host "---"
Write-Host "Total OK: $total / 13 (Block10 byte colors: $b10ok)"
if ($total -eq 13 -and $b10ok) { Write-Host "ALL OK" } else { Write-Host "FAIL" }
'@ | Out-File -FilePath C:\Users\Administrator\AppData\Local\Temp\syntax_check_v48c.ps1 -Encoding UTF8
```

- [ ] **Step 2: 运行 syntax check**

```powershell
C:\Users\Administrator\AppData\Local\Temp\syntax_check_v48c.ps1
```

Expected: `Total OK: 13 / 13` + `Block10 byte colors: True` + `ALL OK`。如失败,根据 FAIL 的 block 修复,重跑。

**不 commit,继续 Task 17**。

---

## Task 17: 浏览器手动 smoke test (16 项)

**Files:** 无 (verify-only)

打开浏览器,加载 `file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html`,按以下顺序验证:

- [ ] **Step 1: 页面正常加载,无 console 报错**

按 F12 打开 dev tools → Console tab,刷新页面。
Expected: 无红色错误 (warning 允许,但 0 error)。

- [ ] **Step 2: 打开协议编辑器,看到 2 个 legacy tab**

点设置/配置按钮 → 协议编辑器 (具体位置看 UI,通常在 settings 区域)。
Expected: tab bar 显示 "BMS TLV v1 (Legacy)" + "Modbus RTU (Legacy)" + "+ 新建" 按钮。

- [ ] **Step 3: tab bar 下方 kind 下拉显示 "0 · fixed-header"**

Expected: kind 下拉默认选中 "0 · fixed-header (Legacy)"。

- [ ] **Step 4: fields 6 行,length/crc 行灰显**

Expected: 6 行 fields,length/crc 行 opacity 0.5,input 不可编辑。

- [ ] **Step 5: "+ 加字段" 按钮全部 disabled**

Expected: 每行下方 "+ 加字段" 按钮全部 disabled 灰显 (符合 D6 v2 "CRC 前后不允许添加")。

- [ ] **Step 6: 字节预览按 6 段着色**

Expected: 字节预览区显示 6 段不同背景色 (header 蓝/cmd 橘/length 淡蓝/data 绿/crc 红/tail 灰)。

- [ ] **Step 7: 切 kind 弹确认 modal (D3)**

kind 下拉选 "1 · raw" → 弹确认 modal "切换 Kind"。
Expected: modal 出现。

- [ ] **Step 8: 切 kind 确认 → fields 重置**

点 "确认" → fields 6 行,header default 变 "0x5A"。
Expected: header 行 default 输入框显示 0x5A。

- [ ] **Step 9: 切 kind 取消 → kind 下拉回滚**

kind 下拉选 "5 · type-high-bit" → 弹确认 modal → 点 "取消"。
Expected: kind 下拉回滚到上次的 "raw",fields 不变。

- [ ] **Step 10: 切到 TLV kind (D7 验证)**

kind 下拉选 "7 · tlv" → 确认 → fields 4 行 (header/tlv/crc/tail)。
Expected: header/tlv/tail 行灰显 (locked),crc 行可编辑。

- [ ] **Step 11: "+ 加字段" 在 TLV kind 下全 disabled**

Expected: TLV kind 的 tlv 行和 crc 行下方 "+ 加字段" 按钮都 disabled (tlv 后面是 unlocked crc 但非 data,crc 后面是 locked tail)。

- [ ] **Step 12: "+ 新建" 按钮弹 modal (D2)**

点 "+ 新建" → 弹新建协议 modal。
Expected: modal 出现,默认 kind radio = "7 · tlv" 选中 (D7)。

- [ ] **Step 13: 输名字 + 创建**

协议名输入 "测试协议 1" → 点 "创建"。
Expected: 新 tab 出现 (active 状态),modal 关闭,自动 toast "验证成功"。

- [ ] **Step 14: 切回 BMS 协议,验证兼容 (Task 15)**

点 BMS tab → kind 下拉显示 "0 · fixed-header", fields 6 行,length/crc 灰显。
Expected: 跟 v6.5 视觉一致,无报错。

- [ ] **Step 15: 截图自检 (用户偏好)**

截 3 张图: 协议编辑器整体 / 字节预览区 / "+ 新建" modal。
Expected: 视觉整洁,无元素错位,色彩清晰。

- [ ] **Step 16: 关闭页面 + 重打开, 验证状态保留 (sub-1 兼容)**

关闭浏览器,重开,加载 SerialCube.html → 协议编辑器 → 看到 "测试协议 1" tab 还在。
Expected: 用户新建的协议被 localStorage 保留 (sub-1 已实现 protocol 持久化)。

如**任一 Step 失败**, 回到对应 Task 修复,**不 commit**, 重新跑 smoke test。

---

## Task 18: v4.8c 整体 commit + push

**Files:** Modified: `SerialCube.html`

- [ ] **Step 1: 写 commit message 文件**

打开 PowerShell:

```powershell
@'
v4.8c 协议编辑器 UI 重构: kind 下拉 + 动态 fields + 字节预览按段着色 + + 新建 modal

背景
v4.8 sub-1 (3981f29) 已完成 buildFrame 内核 (8 kind 子函数),
但协议编辑器 UI 还停在 sub-1 之前 — 2 个 Legacy tab + 固定 fields 列表,
用户无法选 8 种协议模板,即使 buildFrame 内部已支持。

本 commit 重构协议编辑器 UI:
1. 顶部加 Kind 下拉 (8 种, 切 kind 弹确认 modal 重置 fields)
2. fields 列表动态化 (按 kind 渲染 + locked 字段灰显)
3. 字节预览按段着色 (header/cmd/type/length/data/crc/tail + addr/msgid/tlv 10 色)
4. "+ 新建" 按钮弹模板选择 modal (默认 kind 7 TLV)
5. D6 strict v2: kind 固定模板, locked 字段前后不允许插新字段,
   只允许 data 字段添加 (默认全 disabled, 留 dataZone 扩展)
6. 现状 2 协议 (BMS / Modbus) 走 kind 0 (fixed-header) 兼容渲染

范围
- 加 NS._KIND_FIELD_TEMPLATES (8 kind 默认 fields, 含 locked 元数据)
- 加 NS._applyKindTemplate (深拷贝函数)
- 加 NS._protoNewModal UI 状态
- 加 NS._renderProtoNewModal 渲染函数
- 加 NS._createProtoFromTemplate 创建协议
- 抽 NS._renderProtoTabBar (从 renderProtoEditor 抽出)
- 加 NS._onKindChange (切 kind 弹确认)
- 改 NS.renderProtoEditor:
  - tab bar 抽出 _renderProtoTabBar
  - 加 kind 下拉 (8 种,带描述)
  - fields 列表动态化 (按 kind 渲染 + locked 灰显)
  - "+ 加字段" 按钮 (D6 v2 激活规则)
  - 字节预览按段着色
  - "+ 新建" 按钮触发 modal
- 加 CSS:
  - .kind-select + focus
  - .proto-field-row.locked + .f-add-btn
  - .byte-group + 10 种 .b-* 颜色
  - .proto-new-modal + .proto-new-kinds + .proto-new-preview + .proto-new-actions

验证
- 16 项浏览器 smoke test (Task 17) 全部通过
- 现状 2 协议 (BMS / Modbus) 走 kind 0 兼容 (Task 15 验证)
- TLV kind 4 行 (header/tlv/crc/tail),3 行 locked
- "+ 新建" modal 默认 kind 7 (TLV) 选中
- 数据兼容性字段不动 (AGENTS.md §2 强制)
- 1 阶段 commit, 不拆 a/b (spec §10.2 明确)

spec: docs/superpowers/specs/2026-08-05-v48-sub2-ui-redesign-design.md (8f27151)
plan: docs/superpowers/plans/2026-08-05-v48c-ui-impl-plan.md (a388d90)
'@ | Out-File -FilePath C:\Users\Administrator\AppData\Local\Temp\commit_v48c.txt -Encoding UTF8
```

- [ ] **Step 2: git add + commit**

```powershell
cd D:\WorkSpace\SerialCubeWeb
git add SerialCube.html
git status --short
git commit -F C:\Users\Administrator\AppData\Local\Temp\commit_v48c.txt
```

Expected: `[main <hash>] v4.8c ...` + 1 file changed + 大量 insertions。

- [ ] **Step 3: git push**

```powershell
git push origin main
```

Expected: `.. main -> main` (1 commit push 成功)。

- [ ] **Step 4: 告知用户完成**

```
v4.8c 完成 ✅
- Commit: <hash> (1 个 commit)
- 改动: SerialCube.html (1 文件,大量插入)
- 验证: 16 项 smoke test 全部通过
- 现状 2 协议兼容: BMS / Modbus 走 kind 0

接下来:
- sub-3: parseFrame (贴字节反解析) + 协议编辑器"贴字节"输入框
- sub-4: cmd 字段映射重构 (dataSize 自动算) + pair trigger 真实发送
```

---

## Self-Review

**1. Spec coverage** — 18 tasks 覆盖 spec 11 节:
- §1.2 目标: Task 1-17 全部
- §2.1 整体布局: Task 5-12 UI 改造
- §2.2 tab bar: Task 5
- §2.3 kind 下拉: Task 6-7
- §2.4 fields 列表动态化 (D6 v2): Task 8-9
- §2.5 字节预览: Task 10-11
- §2.6 "+ 新建" modal: Task 4, 12, 14
- §3.2 _KIND_FIELD_TEMPLATES: Task 1
- §5.3 _protoNewModal: Task 3
- §5.4 renderProtoEditor: Task 5-12
- §5.5 _applyKindTemplate: Task 2
- §6.1 切换 kind: Task 7
- §6.2 新建协议: Task 12
- §6.3 编辑 fields: Task 8
- §6.4b 插入字段 (D6 v2): Task 8
- §7 错误处理: Task 12 (name 空/重复 toast)
- §8.1 现状 2 协议兼容: Task 15
- §9 数据兼容性: Global Constraints 列出
- §10 commit: Task 18

**2. Placeholder scan** — 无 "TBD" / "TODO" / "实现时定" / "fill in details" / "Add appropriate" / "类似 Task N"。所有 step 有实际代码/命令/可执行内容。

**3. Type consistency** —
- `NS._KIND_FIELD_TEMPLATES` (Task 1) → `NS._applyKindTemplate(kind)` 消费 (Task 2) ✓
- `NS._protoNewModal` (Task 3) → `NS._renderProtoNewModal` 消费 (Task 4) ✓
- `NS._renderProtoNewModal` (Task 4) → 调 `NS._createProtoFromTemplate` (Task 12) ✓
- `NS._renderProtoTabBar` (Task 5) → 在 `renderProtoEditor` 调用 (Task 5 Step 3) ✓
- `NS._onKindChange` (Task 7) → kind select 监听 (Task 6) ✓
- `protocol.fields` 动态渲染 (Task 8) → locked CSS (Task 9) ✓
- `NS.buildFrame` 消费 (Task 11) → 自动验证 (Task 12) ✓
- `field.type === 'data'` 规则 (Task 8) → 跟 spec §6.4b D6 v2 一致 ✓

如有冲突或缺口,已 inline 修复。Self-review 通过。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-05-v48c-ui-impl-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration. Use superpowers:subagent-driven-development.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

(本项目特性: 单文件 HTML + 改动集中 + token 敏感, 推荐 **Subagent-Driven** — 每个 task 上下文隔离, 避免主 session 烧太多 token。但如果想快速过一遍看效果, **Inline Execution** 也可以。)
