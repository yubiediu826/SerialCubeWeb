# v4.8c 协议编辑器 UI 重构 — 实施 Plan

**日期**: 2026-08-05
**作者**: Mavis
**对应 spec**: `docs/superpowers/specs/2026-08-05-v48-sub2-ui-redesign-design.md` (commit `8f27151`)
**状态**: 待 review
**范围**: v4.8c 实施 (1 commit, 18 tasks)
**前置 commit**:
- `8f27151 spec: v4.8 sub-2 D6 strict v2 + 默认 kind 7` (D6 v2 + D7)
- `7ffc49f spec: v4.8 sub-2 协议编辑器 UI 重构设计文档` (D1-D6 v1)
- `0f2ae6f spec: v4.8 sub-2 第一版`
- `1db0e66 v6.5 仪表盘 UI 大改`
- `3981f29 v4.8b kind 1-7 真实实现` (sub-1)
- `1d2b1a2 plan: v4.8 sub-1 TLV 协议重构实现 plan` (参考格式)
- `6743873 spec: v4.8 sub-1 TLV 协议重构设计文档`

**后续 sub**:
- sub-3: parseFrame (贴字节反解析) + 协议编辑器"贴字节"输入框
- sub-4: cmd 字段映射重构 (dataSize 自动算) + pair trigger 真实发送

---

## 1. 路线总览

### 1.1 跟 sub-1 plan 的区别

| 项 | sub-1 (a/b 两阶段) | sub-2 (1 阶段) |
|---|---|---|
| 阶段数 | a (架构+kind 0) + b (kind 1-7) | 单阶段 c |
| commit 数 | 2 | 1 |
| 中间态 | v4.8a 后 dashboard 仍跑旧路径 | 无中间态,直接覆盖 |
| 原因 | 防止 buildFrame 改一半坏掉 | UI 改造一气呵成,不会破坏 buildFrame 内部 |

### 1.2 v4.8c 整体实施步骤

1. **加数据层** (Task 1-2): `_KIND_FIELD_TEMPLATES` + 8 kind 默认 fields; `_applyKindTemplate` 工具函数
2. **加 UI 状态** (Task 3-4): `_protoNewModal` 状态; `_renderProtoNewModal` 渲染函数
3. **改协议编辑器** (Task 5-12):
   - 抽 `_renderProtoTabBar` (Task 5)
   - 加 kind 下拉 (Task 6-7)
   - fields 动态化 + locked 灰显 + "+ 加字段" 规则 (Task 8-10)
   - 字节预览按段着色 (Task 11)
   - "+ 新建" 按钮触发 modal (Task 12)
4. **加 CSS** (Task 13-16):
   - kind 下拉样式
   - fields locked 灰显 + "+ 加字段" 按钮样式
   - 字节预览按段着色 (7 种颜色)
   - "+ 新建" modal 样式
5. **现状 2 协议兼容** (Task 17): BMS / Modbus 走 kind 0 渲染
6. **smoke test + commit** (Task 18): 浏览器验证 + 1 commit + push

### 1.3 任务清单 (18 tasks)

| # | 任务 | 文件 | 类型 |
|---|---|---|---|
| 1 | 加 `NS._KIND_FIELD_TEMPLATES` (8 kind 默认 fields) | SerialCube.html | Modify |
| 2 | 加 `NS._applyKindTemplate` 深拷贝函数 | SerialCube.html | Modify |
| 3 | 加 `NS._protoNewModal` UI 状态 | SerialCube.html | Modify |
| 4 | 加 `NS._renderProtoNewModal` 渲染函数 | SerialCube.html | Modify |
| 5 | 抽 `NS._renderProtoTabBar` (从 renderProtoEditor 抽出) | SerialCube.html | Modify |
| 6 | 加 kind 下拉 (8 种 + 描述) | SerialCube.html | Modify |
| 7 | 切 kind 弹确认 modal (D3) | SerialCube.html | Modify |
| 8 | fields 列表动态化 (按 kind 渲染 rows) | SerialCube.html | Modify |
| 9 | locked 字段灰显 (D6 v2: 4 类 disabled 状态) | SerialCube.html + CSS | Modify |
| 10 | "+ 加字段" 按钮 (D6 v2 激活规则) | SerialCube.html | Modify |
| 11 | 字节预览按段着色 (7 种颜色) | SerialCube.html + CSS | Modify |
| 12 | "+ 新建" 按钮触发 modal | SerialCube.html | Modify |
| 13 | CSS: kind 下拉样式 | SerialCube.html | Modify |
| 14 | CSS: fields locked 灰显 + "+ 加字段" 按钮样式 | SerialCube.html | Modify |
| 15 | CSS: 字节预览按段着色 (7 色) | SerialCube.html | Modify |
| 16 | CSS: "+ 新建" modal 样式 | SerialCube.html | Modify |
| 17 | 现状 2 协议 (BMS / Modbus) 走 kind 0 兼容渲染 | SerialCube.html | Modify |
| 18 | smoke test + v4.8c commit + push | - | Verify |

---

## 2. Task 详细说明

### Task 1: 加 `NS._KIND_FIELD_TEMPLATES` (8 kind 默认 fields)

**Files**: `SerialCube.html` (Modify)

**位置**: 紧跟 `NS._KIND_TEMPLATES` (sub-1 已加, line ~10430 附近) 后插入

**Interfaces**:
- Consumes: `NS._KIND_TEMPLATES` (sub-1,只读)
- Produces: `NS._KIND_FIELD_TEMPLATES` (新)

**Steps**:
1. 在 SerialCube.html 搜 `NS._KIND_TEMPLATES = {` 找到 sub-1 定义
2. 紧跟其后插入 `NS._KIND_FIELD_TEMPLATES` (spec §3.2 的 8 kind 完整定义)
3. 每个 kind 字段含 `name/size/type/default/locked?/bit7?/addrRole?/bitfield?/note?` 元数据
4. 字段值跟 spec §3.2 8 个数组完全一致 (CRLF 行尾, 4 空格缩进, 跟 sub-1 风格一致)
5. 保存,不 commit

**关键内容**:
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
  // ... 7 other kinds
};
```

**Smoke test**: 不直接可见,Task 8 后才用到

---

### Task 2: 加 `NS._applyKindTemplate` 深拷贝函数

**Files**: `SerialCube.html` (Modify)

**位置**: 紧跟 Task 1 插入

**Interfaces**:
- Consumes: `kind` 字符串
- Produces: 深拷贝的 fields 数组 (新对象数组, 不引用原数组)

**Steps**:
1. 在 `NS._KIND_FIELD_TEMPLATES` 定义后插入
2. 函数: 取 `_KIND_FIELD_TEMPLATES[kind]` → fallback `fixed-header` → JSON.parse(JSON.stringify(...)) 深拷贝
3. 保存,不 commit

**关键内容**:
```js
NS._applyKindTemplate = function (kind) {
  const tpl = NS._KIND_FIELD_TEMPLATES[kind] || NS._KIND_FIELD_TEMPLATES['fixed-header'];
  return JSON.parse(JSON.stringify(tpl));
};
```

**Smoke test**: 浏览器 console 调 `__serialWebDashboard.NS._applyKindTemplate('tlv')` 返回 4 元素数组,每元素都是新对象 (`{}` 检查)

---

### Task 3: 加 `NS._protoNewModal` UI 状态

**Files**: `SerialCube.html` (Modify)

**位置**: 紧跟 `NS._protoDraftKind` (spec §5.2, 若未实现则跳过) 附近

**Interfaces**:
- Consumes: 无
- Produces: `NS._protoNewModal = { open, name, kind, source }` 状态

**Steps**:
1. 找 `NS._protoDraftKind` (spec §5.2, 可能未实现, 跳过)
2. 直接在 `NS.activeProtoId` 附近加 `NS._protoNewModal` 初始状态
3. kind 默认 `'tlv'` (D7)
4. 保存,不 commit

**关键内容**:
```js
NS._protoNewModal = {
  open: false,
  name: '',
  kind: 'tlv',  // D7: 默认 kind 7
  source: null  // null = 用 kind 默认模板;非 null = 复制现有 protocol id
};
```

**Smoke test**: 不直接可见

---

### Task 4: 加 `NS._renderProtoNewModal` 渲染函数

**Files**: `SerialCube.html` (Modify)

**位置**: 紧跟 `NS.openModal` 之后

**Interfaces**:
- Consumes: `NS._protoNewModal` 状态
- Produces: 弹窗 HTML 注入到 `.modal` 容器 (复用 `NS.openModal` 框架)

**Steps**:
1. 在 `NS.openModal` 定义附近 (line ~7487 协议编辑器 modal 入口) 加 `NS._renderProtoNewModal`
2. 函数: 拼 HTML 字符串 (协议名输入 + kind 单选 8 种 + 默认 fields 预览) → `innerHTML` 到 modal
3. 加 event listener: name input, kind radio change → 更新 `_protoNewModal` + 重渲染预览
4. 加 "创建" 按钮: 调 `NS._createProtoFromTemplate` (Task 12 加)
5. 加 "取消" 按钮: `NS.closeModal()`
6. 保存,不 commit

**HTML 模板** (跟 spec §2.6 一致):
```html
<div class="proto-new-modal">
  <h3>新建协议</h3>
  <div class="proto-new-row">
    <label>协议名</label>
    <input class="proto-new-name" placeholder="新协议 1" />
  </div>
  <div class="proto-new-row">
    <label>Kind</label>
    <div class="proto-new-kinds">
      <!-- 8 radio, default tlv (D7) -->
    </div>
  </div>
  <div class="proto-new-preview">
    <!-- 默认 fields 预览 (实时更新) -->
  </div>
  <div class="proto-new-actions">
    <button class="btn-cancel">取消</button>
    <button class="btn-create">创建</button>
  </div>
</div>
```

**Smoke test**: 暂不验证,Task 12 一起测

---

### Task 5: 抽 `NS._renderProtoTabBar` (从 renderProtoEditor 抽出)

**Files**: `SerialCube.html` (Modify)

**位置**: `NS.renderProtoEditor` 内部 (line ~12055, spec §11 引用)

**Interfaces**:
- Consumes: `NS.PROTOCOLS` + `NS.activeProtoId`
- Produces: tab bar HTML (注入到 `.proto-tabs` 容器)

**Steps**:
1. 找到 `NS.renderProtoEditor` 函数体
2. 抽出 tab bar 渲染逻辑到 `NS._renderProtoTabBar` (独立函数)
3. `NS.renderProtoEditor` 调用 `NS._renderProtoTabBar` 替代原 inline 渲染
4. 行为不变 (跟 v6.5 一致: 2 legacy tab + close × + "+ 新建" 占位)
5. 保存,不 commit

**Smoke test**: 浏览器打开协议编辑器,tab bar 仍正常显示 2 个 legacy tab,无视觉变化

---

### Task 6: 加 kind 下拉 (8 种 + 描述)

**Files**: `SerialCube.html` (Modify)

**位置**: tab bar 下方, 验证按钮左边 (spec §2.3)

**Interfaces**:
- Consumes: `protocol.kind` + `NS._KIND_TEMPLATES` (sub-1 已有,含 name 描述)
- Produces: `<select class="kind-select">` + 8 `<option>` 元素

**Steps**:
1. 在 `NS.renderProtoEditor` 内部, tab bar 渲染后插入 kind 下拉 HTML
2. HTML: `<select class="kind-select">` 含 8 个 `<option>`, value=kind 字符串, text=`${idx} · ${name}`
3. event listener: change → 调 `NS._onKindChange` (Task 7 加)
4. 保存,不 commit

**关键内容**:
```js
const sel = document.createElement('select');
sel.className = 'kind-select';
NS._KIND_TEMPLATES_ORDER.forEach((kind, idx) => {
  const opt = document.createElement('option');
  opt.value = kind;
  opt.text = `${idx} · ${NS._KIND_TEMPLATES[kind].name}`;
  if (kind === protocol.kind) opt.selected = true;
  sel.appendChild(opt);
});
sel.addEventListener('change', NS._onKindChange);
```

**注意**: `_KIND_TEMPLATES_ORDER` 不存在, 需用 Object.keys(...) 替代

**Smoke test**: 浏览器打开协议编辑器,看到 kind 下拉,默认显示当前 protocol 的 kind (legacy 显示 "fixed-header")

---

### Task 7: 切 kind 弹确认 modal (D3)

**Files**: `SerialCube.html` (Modify)

**位置**: `NS._onKindChange` 新函数

**Interfaces**:
- Consumes: 用户选的 kind + 当前 protocol
- Produces: 确认 modal (复用 `NS.openModal`)

**Steps**:
1. 加 `NS._onKindChange = function(e) { ... }`
2. 取 `e.target.value` (用户选的 kind)
3. 弹确认 modal: "切到 kind X 会重置 fields, 确认?"
4. 确认 → `protocol.kind = newKind` + `protocol.fields = NS._applyKindTemplate(newKind)` + `NS.renderProtoEditor()`
5. 取消 → `e.target.value = oldKind` (kind 下拉回滚)
6. 保存,不 commit

**关键内容**:
```js
NS._onKindChange = function(e) {
  const newKind = e.target.value;
  const proto = NS.PROTOCOLS.find(p => p.id === NS.activeProtoId);
  if (!proto || newKind === proto.kind) return;
  const oldKind = proto.kind;
  // 弹确认 modal
  NS.openModal(`<div class="confirm-modal">
    <h3>切换 Kind</h3>
    <p>切到 kind "${newKind}" 会重置 fields, 确认?</p>
    <button class="btn-cancel">取消</button>
    <button class="btn-confirm">确认</button>
  </div>`);
  // 绑定按钮
  document.querySelector('.btn-cancel').onclick = () => {
    e.target.value = oldKind;  // 回滚
    NS.closeModal();
  };
  document.querySelector('.btn-confirm').onclick = () => {
    proto.kind = newKind;
    proto.fields = NS._applyKindTemplate(newKind);
    NS.renderProtoEditor();
    NS.closeModal();
  };
};
```

**Smoke test**: 浏览器打开协议编辑器,切 kind,弹确认 modal,确认后 fields 重置,取消后 kind 下拉回滚

---

### Task 8: fields 列表动态化 (按 kind 渲染 rows)

**Files**: `SerialCube.html` (Modify)

**位置**: `NS.renderProtoEditor` 内部, 替换原固定 fields 列表

**Interfaces**:
- Consumes: `protocol.fields` (数组)
- Produces: 动态 rows (按 `protocol.fields` 渲染)

**Steps**:
1. 在 `NS.renderProtoEditor` 内部, 找到 fields 列表渲染代码
2. 替换为循环 `protocol.fields.forEach((field, idx) => renderRow(field, idx))`
3. 每行: # / name input / size input / type select / default input / 备注 / 删除按钮
4. input event listener: 改 `protocol.fields[idx].xxx` + 重新渲染
5. 保存,不 commit

**关键内容** (row 模板):
```js
protocol.fields.forEach((field, idx) => {
  const tr = document.createElement('tr');
  tr.className = 'proto-field-row';
  if (field.locked) tr.classList.add('locked');
  tr.innerHTML = `
    <td>${idx + 1}</td>
    <td><input class="f-name" value="${field.name}" /></td>
    <td><input class="f-size" value="${field.size}" /></td>
    <td><select class="f-type">${typeOptionsHtml(field.type)}</select></td>
    <td><input class="f-default" value="${field.default}" /></td>
    <td class="f-note">${field.note || ''}</td>
    <td><button class="f-del">×</button></td>
  `;
  // ... event listener
});
```

**Smoke test**: 浏览器打开协议编辑器,fields 列表跟现状一致 (6 行 BMS / Modbus),但结构是动态生成

---

### Task 9: locked 字段灰显 (D6 v2: 4 类 disabled 状态)

**Files**: `SerialCube.html` (Modify) + CSS (Task 14)

**位置**: Task 8 的 row 渲染 + CSS `.proto-field-row.locked`

**Interfaces**:
- Consumes: `field.locked === true`
- Produces: row 添加 `.locked` class, 所有 input/select/button disabled

**Steps**:
1. Task 8 的 row 渲染: 当 `field.locked` 为 true 时,加 `.locked` class
2. 所有 input 加 `disabled` 属性
3. select 加 `disabled` 属性
4. 删除按钮加 `disabled` 属性
5. CSS: `.proto-field-row.locked { opacity: 0.5; background: rgba(0,0,0,0.02); }` (Task 14)
6. CSS: `.proto-field-row.locked input, .locked select, .locked button { cursor: not-allowed; }` (Task 14)
7. 保存,不 commit

**关键内容** (row 渲染中):
```js
if (field.locked) {
  tr.classList.add('locked');
  tr.querySelectorAll('input,select,button').forEach(el => el.disabled = true);
}
```

**Smoke test**: 浏览器打开 BMS / Modbus 协议,length / crc 行灰显 + input 不可编辑;切到 kind 7 (TLV),header / tlv / tail 行灰显,crc 行可编辑

---

### Task 10: "+ 加字段" 按钮 (D6 v2 激活规则)

**Files**: `SerialCube.html` (Modify) + CSS (Task 14)

**位置**: 每行 row 下方 + 表格底部

**Interfaces**:
- Consumes: `field.type` + `field.locked` + 下一行 field
- Produces: 按钮 enabled / disabled 状态

**Steps**:
1. Task 8 的 row 渲染: 在每行后插入 "+ 加字段" 按钮
2. 按钮 enabled 规则 (D6 v2):
   - ✅ 当前行 `type === 'data'` **且** 下一行也是 `data` 或无下一行
   - ❌ 其他情况全 disabled (locked / 非 data / data 后跟 locked)
3. 点击 enabled 按钮: `protocol.fields.splice(idx + 1, 0, { name: '', size: 0, type: 'data', default: '0x00' })` + 重新渲染
4. 表格底部加总 "+ 加字段" 按钮: 在尾部追加 (当最后一行是 data 或表格空)
5. CSS: `.f-add-btn` 样式 + `.f-add-btn:disabled` 灰显 (Task 14)
6. 保存,不 commit

**关键内容** (按钮 enabled 逻辑):
```js
const nextField = protocol.fields[idx + 1];
const canAdd = field.type === 'data' &&
  (!nextField || nextField.type === 'data');
btn.disabled = !canAdd;
```

**Smoke test**: 浏览器打开 BMS 协议 (fixed-header),data 行下方 "+ 加字段" 按钮 disabled (data 后面是 locked crc),所有按钮都灰显 — 符合 D6 v2 "CRC 前后不允许添加" 规则

---

### Task 11: 字节预览按段着色 (7 种颜色)

**Files**: `SerialCube.html` (Modify) + CSS (Task 15)

**位置**: fields 列表下方, 现有 byte preview 区域

**Interfaces**:
- Consumes: `NS.buildFrame(protocol, cmd)` 字节数组 (sub-1)
- Produces: 字节组按 type 着色

**Steps**:
1. 找到 byte preview 渲染代码
2. 改为按 `protocol.fields` 切分字节: 每个 field 一段 `<div class="byte-group b-${field.type}">`
3. TLV kind: 循环 TLV 段,每段一个 `.byte-group.b-tlv`
4. CSS: 7 种 `.b-header / .b-cmd / .b-type / .b-length / .b-data / .b-crc / .b-tail / .b-addr / .b-msgid` 背景色 (Task 15)
5. 保存,不 commit

**关键内容** (字节切分):
```js
const bytes = NS.buildFrame(protocol, NS.COMMANDS[0]);
let offset = 0;
protocol.fields.forEach(field => {
  if (field.size === 0 && field.type === 'data') {
    // data 字段变长,这里用占位 "XX XX" 显示
    appendGroup('data', 'XX XX ...', field);
  } else {
    const segBytes = bytes.slice(offset, offset + field.size).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    appendGroup(field.type, segBytes, field);
    offset += field.size;
  }
});
```

**Smoke test**: 浏览器打开 BMS 协议,字节预览按 header/cmd/length/data/crc/tail 段着色;切到 TLV kind,TLV 段循环着色

---

### Task 12: "+ 新建" 按钮触发 modal

**Files**: `SerialCube.html` (Modify)

**位置**: tab bar "+ 新建" 按钮 (Task 5 抽出的 tab bar 内部)

**Interfaces**:
- Consumes: 用户点击 "+ 新建"
- Produces: `NS._protoNewModal.open = true` + `NS._renderProtoNewModal` 渲染

**Steps**:
1. 在 `_renderProtoTabBar` 内部, "+ 新建" 按钮 click handler
2. handler: `NS._protoNewModal = { open: true, name: '', kind: 'tlv', source: null }` + `NS._renderProtoNewModal()`
3. 加 `NS._createProtoFromTemplate` 函数:
   - 验证 name 非空 + 不重复
   - `const fields = NS._applyKindTemplate(NS._protoNewModal.kind)`
   - `const newId = 'proto_user_' + Date.now()`
   - `NS.PROTOCOLS.push({ id: newId, kind, name, fields, ... })`
   - `NS.activeProtoId = newId`
   - `NS.closeModal()` + `NS.renderProtoEditor()`
4. 保存,不 commit

**关键内容**:
```js
NS._createProtoFromTemplate = function() {
  const { name, kind, source } = NS._protoNewModal;
  if (!name || name.trim() === '') {
    NS.toast('协议名不能为空', 'warn');
    return;
  }
  if (NS.PROTOCOLS.some(p => p.name === name)) {
    NS.toast('协议名已存在', 'warn');
    return;
  }
  const fields = source
    ? JSON.parse(JSON.stringify(NS.PROTOCOLS.find(p => p.id === source).fields))
    : NS._applyKindTemplate(kind);
  const newId = 'proto_user_' + Date.now();
  NS.PROTOCOLS.push({
    id: newId,
    kind,
    name,
    fields,
    isUser: true,  // 标记用户新建
    createdAt: Date.now()
  });
  NS.activeProtoId = newId;
  NS._protoNewModal.open = false;
  NS.closeModal();
  NS.renderProtoEditor();
  // 自动验证 (sub-1 行为)
  setTimeout(() => NS._runProtoValidate(), 100);
};
```

**Smoke test**: 浏览器打开协议编辑器,点 "+ 新建",弹模板选择 modal (默认 kind 7 TLV),输名字,创建,新 tab 出现,自动验证

---

### Task 13: CSS — kind 下拉样式

**Files**: `SerialCube.html` (Modify CSS 段)

**位置**: `.proto-tabs` 之后

**关键内容**:
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
}
.kind-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(86, 114, 205, 0.15);
}
```

**Smoke test**: 浏览器,kind 下拉跟现有 UI 风格一致 (跟 antd-like select 接近)

---

### Task 14: CSS — fields locked 灰显 + "+ 加字段" 按钮样式

**Files**: `SerialCube.html` (Modify CSS 段)

**关键内容**:
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
.proto-field-row .f-add-btn:disabled {
  color: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}
.proto-field-row .f-add-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}
```

**Smoke test**: 浏览器,BMS 协议 fields 列表,length/crc 行灰显,"+ 加字段" 按钮全部 disabled 灰显

---

### Task 15: CSS — 字节预览按段着色 (7 色)

**Files**: `SerialCube.html` (Modify CSS 段)

**关键内容**:
```css
.byte-group {
  display: inline-block;
  padding: 2px 4px;
  margin: 0 1px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
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

**Smoke test**: 浏览器,字节预览按段着色,BMS 协议 6 段不同颜色

---

### Task 16: CSS — "+ 新建" modal 样式

**Files**: `SerialCube.html` (Modify CSS 段)

**关键内容**:
```css
.proto-new-modal {
  padding: 8px;
  min-width: 480px;
}
.proto-new-modal h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text);
}
.proto-new-row {
  margin-bottom: 12px;
}
.proto-new-row label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.proto-new-name {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
}
.proto-new-kinds {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.proto-new-kinds label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 3px;
  cursor: pointer;
}
.proto-new-kinds label:has(input:checked) {
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

**Smoke test**: 浏览器,点 "+ 新建",modal 居中 (默认 modal 居中样式),表单可用

---

### Task 17: 现状 2 协议 (BMS / Modbus) 走 kind 0 兼容渲染

**Files**: `SerialCube.html` (Modify)

**位置**: `NS.PROTOCOLS` 默认值 (sub-1 5.4 已加 `kind: 'fixed-header'`)

**Interfaces**:
- Consumes: `NS.PROTOCOLS` 默认值
- Produces: 2 legacy 协议带 `kind: 'fixed-header'` + `(Legacy)` 命名

**Steps**:
1. 找到 `NS.PROTOCOLS = [...]` 默认值
2. 确认 2 协议都有 `kind: 'fixed-header'` (sub-1 已加, 此 task 仅 verify)
3. 确认 2 协议 name 含 `(Legacy)` 后缀 (spec §8.1 要求)
4. 若无, 加 `name: 'BMS TLV v1 (Legacy)'` + `name: 'Modbus RTU (Legacy)'`
5. 加载兼容点 (sub-1 spec 5.1): `if (uc.protocols) { NS.PROTOCOLS = uc.protocols.map(p => ({ ...p, kind: p.kind || 'fixed-header' })); }` 已加
6. 验证渲染: 打开 BMS 协议, kind 下拉显示 "fixed-header", fields 6 行, length/crc 灰显
7. 保存,不 commit

**Smoke test**: 浏览器打开 BMS / Modbus 协议,UI 跟 v6.5 视觉一致 (6 行 fields, length/crc 灰显),kind 下拉显示 "0 · fixed-header (Legacy)"

---

### Task 18: smoke test + v4.8c commit + push

**Files**: 无 (验证 + commit)

**步骤**:
1. **启动浏览器** 加载 `D:\WorkSpace\SerialCubeWeb\SerialCube.html`
2. **基础验证**:
   - [ ] 页面正常加载,无 console 报错
   - [ ] 打开协议编辑器,看到 2 个 legacy tab (BMS / Modbus)
   - [ ] tab bar 下方 kind 下拉显示 "0 · fixed-header"
   - [ ] fields 6 行,length/crc 行灰显
   - [ ] "+ 加字段" 按钮全部 disabled
   - [ ] 字节预览按 6 段着色
3. **切 kind 验证** (D3):
   - [ ] kind 下拉切到 "raw" → 弹确认 modal
   - [ ] 确认 → fields 6 行,header default 变 0x5A
   - [ ] 取消 → kind 下拉回滚,fields 不变
4. **TLV kind 验证** (D7):
   - [ ] 切到 "tlv" → fields 4 行 (header/tlv/crc/tail)
   - [ ] header/tlv/tail 行灰显 (locked)
   - [ ] crc 行可编辑
5. **"+ 新建" 验证** (D2 + D7):
   - [ ] 点 "+ 新建" 按钮 → 弹 modal
   - [ ] 默认 kind = "tlv" (D7)
   - [ ] 输 name = "测试协议 1" → 创建
   - [ ] 新 tab 出现,自动跳到新 tab
   - [ ] 协议编辑器显示 TLV 模板 4 行
6. **现状 2 协议兼容** (Task 17):
   - [ ] BMS 协议, kind = "fixed-header" 显示
   - [ ] Modbus 协议, kind = "fixed-header" 显示
   - [ ] 名字含 "(Legacy)"
7. **截图自检** (用户偏好):
   - [ ] 协议编辑器整体截图
   - [ ] 字节预览截图
   - [ ] "+ 新建" modal 截图
8. **commit**:
   - 标题: `v4.8c 协议编辑器 UI 重构: kind 下拉 + 动态 fields + 字节预览按段着色 + + 新建 modal`
   - 正文: 背景 / 范围 / 验证 3 段, 中文
9. **push**:
   - `git push origin main`
10. **告知用户**: 完成,等反馈

**预期耗时**: 20-30 分钟 (实施 18 tasks 后 smoke test)

---

## 3. 风险 & 回滚

### 3.1 风险点

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| _KIND_FIELD_TEMPLATES 跟 _buildFrameXxx 不一致 | 中 | buildFrame 失败 | Task 1 严格按 spec §3.2 字段值,Task 8-11 验证后跑 buildFrame |
| kind 切换重置 fields 误删用户编辑 | 中 | 用户数据丢失 | D3 确认 modal 兜底,只在用户确认后重置 |
| "+ 加字段" 按钮全 disabled 用户困惑 | 低 | UX 差 | Task 16 modal 加 "添加字段功能暂未启用" 提示 (本期不实现) |
| 字节预览按段着色切错位置 | 中 | 字节错位 | Task 11 切分逻辑跟 sub-1 buildFrame 子函数对齐 |
| 现状 2 协议 (kind 0) 渲染异常 | 低 | 升级失败 | Task 17 单独验证, spec §8.1 已说明兼容点 |

### 3.2 回滚

- v4.8c 是 1 个 commit, 回滚: `git revert 8f27151` (或新 commit hash)
- 协议编辑器 UI 退回到 v6.5 状态 (kind 下拉 + 动态 fields + 字节预览移除)
- 现状 2 协议不受影响 (kind 字段保留)

### 3.3 失败切换准则 (2026-08-05)

任何任务连续失败 2 次, **立即切换**:
- 换工具 / 换语法 / 换思路 / 跳过该步
- 不在原地打转
- 单文件 HTML reload 一次 ≈ 200+ token, 不要在同一方案上反复 reload

---

## 4. Self-Review (writing-plans)

1. **Task 拆解合理性**: 18 tasks 按"数据层 → 状态层 → UI 层 → CSS → 兼容 → 验证"顺序, 依赖关系清晰
2. **每个 task 独立可验证**: Task 1-2 数据层可 console 验证, Task 3-4 状态层可赋值验证, Task 5-12 UI 层可浏览器验证, Task 13-16 CSS 跟随 UI 验证
3. **风险点已识别**: 5 个风险点 + 概率/影响/缓解三列, 跟 sub-1 plan 风险章节格式一致
4. **回滚方案明确**: 1 commit 回滚, 退回到 v6.5 协议编辑器
5. **范围聚焦**: v4.8c (UI 重构) 全部 task 都在 spec 范围内, sub-3 (parseFrame) + sub-4 (cmd 字段映射) 明确不包含
6. **失败切换准则**: §3.3 引用 2026-08-05 准则, 跨项目生效

Self-review 通过, 待 user approve 后开始实施。

---

## 5. References

- spec: `docs/superpowers/specs/2026-08-05-v48-sub2-ui-redesign-design.md` (commit `8f27151`)
- spec 旧版: `7ffc49f` (D6 v1) + `0f2ae6f` (第一版)
- plan 参考: `1d2b1a2 plan: v4.8 sub-1 TLV 协议重构实现 plan` (18 tasks 格式)
- sub-1 spec: `6743873 spec: v4.8 sub-1 TLV 协议重构设计文档`
- sub-1 实现: `3981f29 v4.8b kind 1-7 真实实现`
- v6.5 dashboard: `1db0e66 v6.5 仪表盘 UI 大改`
- UI 预览: `docs/superpowers/previews/v48c-ui-mockup.html`
- 项目主代码: `SerialCube.html` (line 12055 `NS.renderProtoEditor` / line 7487 modal 入口)
- AGENTS.md: 强制 skill 链 + 数据兼容性字段
- 失败切换准则: AGENTS.md §6 (2026-08-05)
