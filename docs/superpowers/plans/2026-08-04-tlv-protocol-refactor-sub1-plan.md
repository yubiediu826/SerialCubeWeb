# v4.8 Sub-1: TLV 协议重构 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v4.8 sub-1 — 把 dashboard 数据模型升级为 8 kind (kind 0 legacy + kind 1-7 新),把 buildFrame 拆为 8 个子函数 + dispatcher,加严格错误处理,旧 user config 100% 兼容,现状 mock 数据 (c1-c10) 不变。

**Architecture:**
- `NS._KIND_TEMPLATES` — 8 个 kind metadata (name/desc)
- `NS.PROTOCOLS` — 加 `kind` 字段,默认 'fixed-header'
- `NS.buildFrame` — dispatcher,按 `protocol.kind` switch 调 8 个 `_buildFrameXxx`
- `NS._computeCrcInput` + `NS._encodeCrcBytes` — 公共抽函数
- 错误返回 `{ error: 'CODE' }`,协议编辑器加 "验证" 按钮 + UI 红框 + toast
- 两阶段 commit:v4.8a (架构 + kind 0) + v4.8b (kind 1-7 实现)

**Tech Stack:** 纯 HTML + JS,无 build,无 npm,修改 SerialCube.html 单文件。

**Test 模式:** SerialCubeWeb 现状无自动化测试基础设施(PRODUCT.md 列为未决问题)。本 plan 用**手动 smoke test 步骤**作为每个 task 的 verification,跟现状一致。每个 task 末尾有"浏览器验证清单"。

## Global Constraints

- **数据兼容性 (AGENTS.md 强制,逐字保留)**:
  - `localStorage` keys (`serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`) 不动
  - 配置 JSON type (`SerialWebUserConfig` v1) 不动
  - `.timeline` 二进制 magic (`WSLBIN1`) 不动
  - API 路径 (`/api/serialweb_page-view`) 不动
  - JS 内部命名 (`__serialWeb*` / `clearSerialWebStoredUserData`) 不动
- **单文件优先 (AGENTS.md 强制)**: 不拆分 SerialCube.html, 不引入 build 步骤
- **中文 commit message** (AGENTS.md 强制): 标题一行,正文分段(背景 / 范围 / 验证)
- **设计系统 (DESIGN.md)**: kind 0 UI 标签 "Fixed Header (Legacy)" + 灰色 "legacy" 徽章,跟 design system 抗住

## File Structure

**Modify only**: `SerialCube.html` (单文件 15841 行, 580.5 KB)

| Line Range | 当前内容 | 改动 |
|---|---|---|
| 9268-9342 | `NS.PROTOCOLS` + DATA_FIELDS + COMMANDS + CARDS | 加 kind 字段 (line 9268) + 现状 2 协议改 kind 0 + name 加 "(Legacy)" |
| 10400-10527 | `NS.encodeDataFields` + `NS.buildFrame` | 拆 buildFrame 为 dispatcher + 8 子函数,加公共函数 |
| 10530-10710 | `NS.renderProtoEditor` + 协议编辑器 UI | 加 "验证" 按钮 + 红徽章 + 红框 + toast |
| 10883-10910 | user config 加载 | 兼容函数 `kind: p.kind \|\| 'fixed-header'` (line 10894) |
| 10997-11040 | 默认 PROTOCOLS | 加 kind 字段 (line 10997) |

**Create**: 协议编辑器 "验证" 按钮 (HTML + handler), Toast 通知层(handler)

## v4.8a: 架构 + kind 0 (Tasks 1-8)

### Task 1: 加 NS._KIND_TEMPLATES (8 个 kind metadata)

**Files:**
- Modify: `SerialCube.html:9268` (在 `NS.PROTOCOLS = [...]` 之前插入)

**Interfaces:**
- Consumes: 无
- Produces: `NS._KIND_TEMPLATES` 全局对象,8 个 key 各自带 `name` + `desc` 字符串

- [ ] **Step 1: 在 NS.PROTOCOLS 之前插入 _KIND_TEMPLATES**

打开 `SerialCube.html`,定位到 line 9268 之前的 `// === 状态层: 三层数据模型 (协议帧 → 字段类型 → 命令 → 卡片) ===` 注释行(line 9267)。

在 line 9267 注释之后、line 9268 `NS.PROTOCOLS = [` 之前,插入以下代码:

```js
// === v4.8a: 8 kind 协议模板 metadata ===
// 8 种 TLV 协议类型: kind 0 = fixed-header (legacy, 现状协议), kind 1-7 = 新协议类型
// 方向定义: cmd.direction='tx' 主机发送 (MB), cmd.direction='rx' 主机接收 (CB)
NS._KIND_TEMPLATES = {
  'fixed-header':  { name: 'Fixed Header (Legacy)',  desc: 'header 写死, 方向不参与 frame 编码' },
  'raw':           { name: 'Raw (MB/CB 不同帧头)',   desc: 'MB=0x5A, CB=0x55, 主机从机不同单字节帧头' },
  'cmd-split':     { name: 'Cmd Split (同帧头 + 命令分区)', desc: 'cmd bit7 编码方向: 0=MB, 1=CB' },
  'addr-split':    { name: 'Addr Split (同帧头 + 地址区分)', desc: 'srcAddr / dstAddr 互换编码方向' },
  'ctrl-bit7':     { name: 'Ctrl Bit7 (控制位方向)', desc: 'ctrl 字节 bit7 编码方向' },
  'type-high-bit': { name: 'Type High Bit (Type 高位方向)', desc: 'type 字节 bit7 编码方向' },
  'msgid-mixed':   { name: 'MsgID Mixed (消息 ID 15+7+8 packed)', desc: 'msgID bit15 方向, bit14-8=func(7), bit7-0=addr(8)' },
  'tlv':           { name: 'Pure TLV (Type+Length+Value 循环)', desc: 'tlv type bit7 编码方向' }
};
```

- [ ] **Step 2: 浏览器验证 _KIND_TEMPLATES 加载**

打开 `SerialCube.html` (浏览器加载,打开 dashboard 模式),在 DevTools Console 跑:

```js
window.__serialWebDashboard._KIND_TEMPLATES
```

预期: 输出包含 8 个 key ('fixed-header', 'raw', 'cmd-split', 'addr-split', 'ctrl-bit7', 'type-high-bit', 'msgid-mixed', 'tlv') 的对象,每个 value 有 name + desc。

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.1 加 NS._KIND_TEMPLATES 8 kind metadata"
```

---

### Task 2: NS.PROTOCOLS 加 kind 字段 (line 9268) + 现状 2 协议改 kind 0

**Files:**
- Modify: `SerialCube.html:9268-9295`

**Interfaces:**
- Consumes: `NS._KIND_TEMPLATES` (from Task 1)
- Produces: `NS.PROTOCOLS` 数组,每个 protocol 有 `kind` 字段,默认 'fixed-header'

- [ ] **Step 1: proto_bms 加 kind 字段 + (Legacy) 命名**

打开 `SerialCube.html`,定位到 line 9268-9281 的 `proto_bms` 对象。

修改 line 9269 `{ id: 'proto_bms', name: 'BMS TLV v1', byteOrder: 'BE', crcRange: 'all',` 为:

```js
          {
            id: 'proto_bms', kind: 'fixed-header', name: 'BMS TLV v1 (Legacy)', byteOrder: 'BE', crcRange: 'all',
```

(注意: 在 `id: 'proto_bms',` 之后加 `kind: 'fixed-header',`,`name: 'BMS TLV v1'` 改为 `name: 'BMS TLV v1 (Legacy)'`)

- [ ] **Step 2: proto_modbus 加 kind 字段 + (Legacy) 命名**

定位到 line 9282-9294 的 `proto_modbus` 对象。

修改 line 9282 `{ id: 'proto_modbus', name: 'Modbus RTU', byteOrder: 'LE', crcRange: 'no_header',` 为:

```js
          {
            id: 'proto_modbus', kind: 'fixed-header', name: 'Modbus RTU (Legacy)', byteOrder: 'LE', crcRange: 'no_header',
```

- [ ] **Step 3: 浏览器验证 PROTOCOLS 含 kind 字段**

在 DevTools Console 跑:

```js
window.__serialWebDashboard.PROTOCOLS.map(p => ({ id: p.id, kind: p.kind, name: p.name }))
```

预期输出: 2 个对象,每个都有 `kind: 'fixed-header'`,name 含 "(Legacy)"。

- [ ] **Step 4: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.2 NS.PROTOCOLS 加 kind 字段, 现状 2 协议改 kind 0"
```

---

### Task 3: 默认 PROTOCOLS 同步改 (line 10997)

**Files:**
- Modify: `SerialCube.html:10997-11019`

**Interfaces:**
- Consumes: 同 Task 2
- Produces: line 10997 默认 PROTOCOLS 也加 kind 字段(与 line 9268 保持一致)

- [ ] **Step 1: 默认 proto_bms 加 kind 字段**

打开 `SerialCube.html`,定位到 line 10997-11019 的默认 `NS.PROTOCOLS = [...]` 数组(在 import/export 流程里,作为回退默认)。

修改 line 10997-10998 的 proto_bms 部分,加 `kind: 'fixed-header'`,name 加 "(Legacy)"。

具体来说,在 line 10997 `NS.PROTOCOLS = [` 之后的第一个对象(应该是 `proto_bms` 默认),`{ id: 'proto_bms', name: 'BMS TLV v1', ...` 改为:

```js
          { id: 'proto_bms', kind: 'fixed-header', name: 'BMS TLV v1 (Legacy)', ... },
```

`...` 保持原 fields/byteOrder/crcRange 等不动。

- [ ] **Step 2: 默认 proto_modbus 加 kind 字段**

修改 line 10997 数组里的第二个对象(应该是 `proto_modbus` 默认),`{ id: 'proto_modbus', name: 'Modbus RTU', ...` 改为:

```js
          { id: 'proto_modbus', kind: 'fixed-header', name: 'Modbus RTU (Legacy)', ... },
```

- [ ] **Step 3: 浏览器验证**

DevTools Console:

```js
// 1. 验证 _KIND_TEMPLATES + PROTOCOLS 都在
Object.keys(window.__serialWebDashboard._KIND_TEMPLATES).length
// 预期: 8

window.__serialWebDashboard.PROTOCOLS.every(p => p.kind === 'fixed-header')
// 预期: true (现状 2 协议都迁移到 kind 0)

// 2. 验证 line 10997 默认 PROTOCOLS 也含 kind 字段
// (这一步浏览器验证不到 line 10997, 因为 line 9268 PROTOCOLS 已加载覆盖)
// 只验证 line 9268 PROTOCOLS 即可
```

- [ ] **Step 4: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.3 默认 PROTOCOLS 同步加 kind 字段 (line 10997)"
```

---

### Task 4: user config 兼容函数 (line 10894)

**Files:**
- Modify: `SerialCube.html:10883-10910` (定位到 line 10894 的 `if (uc.protocols) NS.PROTOCOLS = uc.protocols;`)

**Interfaces:**
- Consumes: `uc.protocols` (用户导入的配置),`NS._KIND_TEMPLATES` (Task 1)
- Produces: `NS.PROTOCOLS` 带 kind 字段(无 kind 字段 → kind 0 'fixed-header')

- [ ] **Step 1: 修改 line 10894 兼容函数**

打开 `SerialCube.html`,定位到 line 10894 (在 import/export 流程中,加载 user config 的位置)。

把 `if (uc.protocols) NS.PROTOCOLS = uc.protocols;` 改为:

```js
            if (uc.protocols) {
              // v4.8a: 兼容旧 user config (无 kind 字段 → kind 0 'fixed-header')
              NS.PROTOCOLS = uc.protocols.map((p) => ({
                ...p,
                kind: p.kind || 'fixed-header'
              }));
            }
```

- [ ] **Step 2: 浏览器验证 user config 兼容**

DevTools Console 模拟旧 user config (无 kind 字段):

```js
// 模拟旧 user config (line 10894 调用方式)
const oldConfig = {
  type: 'SerialWebUserConfig',
  version: 1,
  protocols: [
    { id: 'old_proto', name: 'Old Protocol', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
      { id: 'f1', name: 'header', type: 'header', size: 1, default: '0xAA' },
      { id: 'f2', name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
      { id: 'f3', name: 'data', type: 'data', size: 0, default: '0x00' },
      { id: 'f4', name: 'crc', type: 'crc', size: 2, default: 'auto' }
    ] }
  ]
};

// 找到 import 函数 (或直接走 NS.PROTOCOLS 替换)
const NS = window.__serialWebDashboard;
NS.PROTOCOLS = oldConfig.protocols.map((p) => ({ ...p, kind: p.kind || 'fixed-header' }));

// 验证
NS.PROTOCOLS[0].kind
// 预期: 'fixed-header'
```

预期: `NS.PROTOCOLS[0].kind === 'fixed-header'`。

- [ ] **Step 3: 浏览器验证新 user config (有 kind 字段) 保留 kind**

DevTools Console:

```js
const NS = window.__serialWebDashboard;
const newConfig = {
  protocols: [
    { id: 'new_proto', kind: 'raw', name: 'New Raw Protocol', ... }
  ]
};
NS.PROTOCOLS = newConfig.protocols.map((p) => ({ ...p, kind: p.kind || 'fixed-header' }));
NS.PROTOCOLS[0].kind
// 预期: 'raw' (新 config 的 kind 字段被保留)
```

预期: `NS.PROTOCOLS[0].kind === 'raw'`。

- [ ] **Step 4: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.4 user config 兼容函数 (无 kind → kind 0 fixed-header)"
```

---

### Task 5: 公共抽函数 `_computeCrcInput` + `_encodeCrcBytes`

**Files:**
- Modify: `SerialCube.html:10400-10425` (在 `NS.encodeDataFields` 之后, `NS.buildFrame` 之前, 插入公共函数)

**Interfaces:**
- Consumes: `protocol.crcRange` / `protocol.crcEndian` / `protocol.crcType` / `protocol.crcInit` / `protocol.fields`
- Produces:
  - `NS._computeCrcInput(protocol, allBytes, sections)` → byte[]
  - `NS._encodeCrcBytes(crcValue, endian)` → byte[]

- [ ] **Step 1: 抽出现状 buildFrame 的 CRC 范围逻辑**

打开 `SerialCube.html`,定位到 line 10427 (`// --- buildFrame: 按 protocol.fields 切分字节, 并按 crcRange 算 CRC ---` 注释)。

现状 buildFrame 内部 line 10452-10510 处理 crcRange 四种情况 ('all' / 'no_header' / 'no_tail' / 'no_header_tail' / 'data_only')。

把这些逻辑从 buildFrame 内部抽出成 `NS._computeCrcInput`:

```js
        // --- 公共抽函数: CRC 输入字节范围 (v4.8a) ---
        NS._computeCrcInput = function (protocol, allBytes, sections) {
          const crcRange = protocol.crcRange || 'all';
          const crcFieldIdx = protocol.fields.findIndex((f) => f.type === 'crc');
          const crcFieldSize = crcFieldIdx >= 0 ? (protocol.fields[crcFieldIdx].size || 2) : 2;
          if (crcRange === 'all') {
            const offsetBeforeCrc = protocol.fields.slice(0, crcFieldIdx).reduce((sum, f, k) => {
              return sum + (f.size || sections[k].bytes.length);
            }, 0);
            return allBytes.filter((_, i) => i < offsetBeforeCrc || i >= offsetBeforeCrc + crcFieldSize);
          }
          // 其他 crcRange ('no_header' / 'no_tail' / 'no_header_tail' / 'data_only') 按段排除
          const excluded = new Set();
          if (crcRange === 'no_header' || crcRange === 'no_header_tail') {
            const headerIdx = protocol.fields.findIndex((f) => f.type === 'header');
            if (headerIdx >= 0) excluded.add(headerIdx);
          }
          if (crcRange === 'no_tail' || crcRange === 'no_header_tail') excluded.add(protocol.fields.length - 1);  // tail 总在最后
          if (crcRange === 'data_only') {
            const dataSection = sections.find((s) => s.type === 'data');
            return dataSection ? [...dataSection.bytes] : [];
          }
          excluded.add(crcFieldIdx);
          const out = [];
          let off = 0;
          for (let k = 0; k < protocol.fields.length; k++) {
            const size = protocol.fields[k].size || sections[k].bytes.length;
            if (!excluded.has(k)) {
              for (let b = 0; b < size; b++) out.push(allBytes[off + b]);
            }
            off += size;
          }
          return out;
        };
```

- [ ] **Step 2: 抽出 CRC 字节编码逻辑**

紧接上一步,继续插入:

```js
        // --- 公共抽函数: CRC 字节编码 (v4.8a) ---
        NS._encodeCrcBytes = function (crcValue, endian) {
          const be = (endian || 'LE') === 'BE';
          if (crcValue > 0xFFFF) {
            // CRC-32 (4 字节)
            if (be) return [(crcValue >> 24) & 0xFF, (crcValue >> 16) & 0xFF, (crcValue >> 8) & 0xFF, crcValue & 0xFF];
            return [crcValue & 0xFF, (crcValue >> 8) & 0xFF, (crcValue >> 16) & 0xFF, (crcValue >> 24) & 0xFF];
          }
          // CRC-16 / CRC-8 (1-2 字节)
          if (be) return [(crcValue >> 8) & 0xFF, crcValue & 0xFF];
          return [crcValue & 0xFF, (crcValue >> 8) & 0xFF];
        };
```

- [ ] **Step 3: 浏览器验证公共函数**

DevTools Console:

```js
const NS = window.__serialWebDashboard;

// _encodeCrcBytes 测试
NS._encodeCrcBytes(0xABCD, 'LE')
// 预期: [0xCD, 0xAB] (LE 切低字节先)
NS._encodeCrcBytes(0xABCD, 'BE')
// 预期: [0xAB, 0xCD] (BE 切高字节先)

// _computeCrcInput 测试 (用现状 BMS 协议)
const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms');
const cmd = NS.COMMANDS[0];
const frame = NS.buildFrame(proto, cmd);  // 这一步还走旧 buildFrame, 没问题
// (旧 buildFrame 还没拆, _computeCrcInput 是新增函数, 不会影响 buildFrame)
```

预期: `_encodeCrcBytes` 两种 endianness 输出正确。`_computeCrcInput` 在这一步不直接调用(因为旧 buildFrame 还在),但函数已注册。

- [ ] **Step 4: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.5 抽公共函数 _computeCrcInput + _encodeCrcBytes"
```

---

### Task 6: NS._buildFrameFixedHeader 实现 (kind 0, 跟现状 100% 一致)

**Files:**
- Modify: `SerialCube.html:10427-10527` (把现状 buildFrame 函数体搬到 `_buildFrameFixedHeader`)

**Interfaces:**
- Consumes: `protocol` (kind=fixed-header) / `cmd` / `NS.encodeDataFields` / `NS.crcByteSize` / `NS.parseHexOr0` / `NS.computeCrc` / `NS._computeCrcInput` (from Task 5) / `NS._encodeCrcBytes` (from Task 5)
- Produces: `NS._buildFrameFixedHeader(protocol, cmd)` → `{ bytes, sections } | { error: 'CRC_ERROR' }`

- [ ] **Step 1: 备份现状 buildFrame 函数体**

打开 `SerialCube.html`,定位到 line 10427 `// --- buildFrame: 按 protocol.fields 切分字节, 并按 crcRange 算 CRC ---` 到 line 10527 `};`。

把 line 10428-10527 (整个 `NS.buildFrame = function ...` 函数) 复制到剪贴板(line 10428 是 `NS.buildFrame = function (protocol, cmd) {`,line 10527 是 `};`)。

- [ ] **Step 2: 把现状函数体重命名 + 抽公共函数**

把 line 10428-10527 整段替换为:

```js
        // --- _buildFrameFixedHeader: kind 0 (legacy, 现状 100% 行为) ---
        // 跟现状 buildFrame 行为 100% 一致: header/tail 写死, 方向不参与
        NS._buildFrameFixedHeader = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          const data = NS.encodeDataFields(cmd, protocol);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcSize = NS.crcByteSize(crcType);
          for (const f of protocol.fields) {
            let bytes = [];
            if (f.type === 'header' || f.type === 'addr' || f.type === 'tail') {
              bytes = [NS.parseHexOr0(f.default) & 0xFF];
            } else if (f.type === 'cmd') {
              bytes = [cmd.id & 0xFF];
            } else if (f.type === 'length') {
              bytes = [data.length & 0xFF];
            } else if (f.type === 'data') {
              bytes = [...data];
            } else if (f.type === 'crc') {
              bytes = new Array(crcSize).fill(0);
            }
            sections.push({ type: f.type, name: f.name, bytes });
          }
          const allBytes = [];
          sections.forEach((s) => allBytes.push(...s.bytes));
          // 算 CRC (用抽出的公共函数)
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          // 写回 crc section
          const crcSection = sections.find((s) => s.type === 'crc');
          if (crcSection) {
            crcSection.bytes = NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE');
            const merged = [];
            sections.forEach((s) => merged.push(...s.bytes));
            return { bytes: merged, sections };
          }
          return { bytes: allBytes, sections };
        };
```

- [ ] **Step 3: 浏览器验证 _buildFrameFixedHeader 输出字节**

DevTools Console:

```js
const NS = window.__serialWebDashboard;
const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms');
const cmd = NS.COMMANDS.find((c) => c.id === 0x01);  // Read Voltage

// 1. _buildFrameFixedHeader 调用
const result = NS._buildFrameFixedHeader(proto, cmd);
result.sections.map((s) => s.name + ':' + s.bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')).join(' | ')
// 预期: header:aa | cmd:01 | length:0a | data:... | crc:... | tail:55 (现状 BMS 格式)

// 2. 跟现状 buildFrame 行为对比 (如果还保留 NS.buildFrame, 否则用旧版验证)
```

预期: `_buildFrameFixedHeader` 输出字节跟现状 buildFrame 100% 一致(header=0xAA, tail=0x55, cmd=0x01, data 5 个 cell 字段 10 字节, CRC 2 字节)。

- [ ] **Step 4: 验证现状 mock 数据 c1-c8 卡片值不变**

浏览器加载 dashboard, 滚动到底部, 查看 c1-c8 卡片 (Cell 1 电压 / Pack 电流 / 温度 / SOC / Cell 2-4 电压 / Pack 均压)。

预期: 卡片值跟 v4.7 一样 (Cell 1 ~4.2-4.6V, Cell 2/3/4 ~3.7-4.0V, Pack 均压 ~3.7V)。

- [ ] **Step 5: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.6 NS._buildFrameFixedHeader 实现 (kind 0, 跟现状 100% 一致)"
```

---

### Task 7: kind 1-7 stub 实现 (返回 NOT_IMPLEMENTED)

**Files:**
- Modify: `SerialCube.html:10427-10527` (在 `_buildFrameFixedHeader` 之后插入 7 个 stub)

**Interfaces:**
- Consumes: `protocol` / `cmd`
- Produces: 7 个 `_buildFrameXxx` 函数,各自返回 `{ error: 'NOT_IMPLEMENTED', kind: '...' }`

- [ ] **Step 1: 插入 7 个 stub**

打开 `SerialCube.html`,定位到 Task 6 插入的 `_buildFrameFixedHeader` 函数(line 10527 之后)。

在 `_buildFrameFixedHeader` 之后,插入以下代码:

```js
        // --- kind 1-7 stub (v4.8a 中间状态, v4.8b 实现) ---
        NS._buildFrameRaw = function (protocol, cmd) {
          return { error: 'NOT_IMPLEMENTED', kind: 'raw', note: 'v4.8b 实现' };
        };
        NS._buildFrameCmdSplit = function (protocol, cmd) {
          return { error: 'NOT_IMPLEMENTED', kind: 'cmd-split', note: 'v4.8b 实现' };
        };
        NS._buildFrameAddrSplit = function (protocol, cmd) {
          return { error: 'NOT_IMPLEMENTED', kind: 'addr-split', note: 'v4.8b 实现' };
        };
        NS._buildFrameCtrlBit7 = function (protocol, cmd) {
          return { error: 'NOT_IMPLEMENTED', kind: 'ctrl-bit7', note: 'v4.8b 实现' };
        };
        NS._buildFrameTypeHighBit = function (protocol, cmd) {
          return { error: 'NOT_IMPLEMENTED', kind: 'type-high-bit', note: 'v4.8b 实现' };
        };
        NS._buildFrameMsgidMixed = function (protocol, cmd) {
          return { error: 'NOT_IMPLEMENTED', kind: 'msgid-mixed', note: 'v4.8b 实现' };
        };
        NS._buildFrameTlv = function (protocol, cmd) {
          return { error: 'NOT_IMPLEMENTED', kind: 'tlv', note: 'v4.8b 实现' };
        };
```

- [ ] **Step 2: 浏览器验证 7 个 stub**

DevTools Console:

```js
const NS = window.__serialWebDashboard;

// 验证 7 个 stub 函数都存在
['Raw', 'CmdSplit', 'AddrSplit', 'CtrlBit7', 'TypeHighBit', 'MsgidMixed', 'Tlv'].every((name) => typeof NS['_buildFrame' + name] === 'function')
// 预期: true

// 验证 stub 返回 NOT_IMPLEMENTED
NS._buildFrameRaw({}, {}).error
// 预期: 'NOT_IMPLEMENTED'
```

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.7 kind 1-7 stub 实现 (返回 NOT_IMPLEMENTED)"
```

---

### Task 8: NS.buildFrame 改 dispatcher (switch on kind)

**Files:**
- Modify: `SerialCube.html:10527` 之后(在 7 个 stub 之后)

**Interfaces:**
- Consumes: `protocol` / `cmd` / 8 个 `_buildFrameXxx` 函数 (from Task 6-7)
- Produces: `NS.buildFrame(protocol, cmd)` → `{ bytes, sections } | { error: 'NO_PROTOCOL' | 'UNKNOWN_KIND' }`

- [ ] **Step 1: 加 dispatcher**

打开 `SerialCube.html`,定位到 Task 7 插入的 7 个 stub 函数之后。

在 7 个 stub 之后,插入:

```js
        // --- NS.buildFrame dispatcher (v4.8a: switch on protocol.kind) ---
        NS.buildFrame = function (protocol, cmd) {
          if (!protocol) return { error: 'NO_PROTOCOL' };
          const kind = protocol.kind || 'fixed-header';
          if (!NS._KIND_TEMPLATES[kind]) return { error: 'UNKNOWN_KIND', kind };
          switch (kind) {
            case 'fixed-header':  return NS._buildFrameFixedHeader(protocol, cmd);
            case 'raw':           return NS._buildFrameRaw(protocol, cmd);
            case 'cmd-split':     return NS._buildFrameCmdSplit(protocol, cmd);
            case 'addr-split':    return NS._buildFrameAddrSplit(protocol, cmd);
            case 'ctrl-bit7':     return NS._buildFrameCtrlBit7(protocol, cmd);
            case 'type-high-bit': return NS._buildFrameTypeHighBit(protocol, cmd);
            case 'msgid-mixed':   return NS._buildFrameMsgidMixed(protocol, cmd);
            case 'tlv':           return NS._buildFrameTlv(protocol, cmd);
          }
          return { error: 'UNKNOWN_KIND', kind };
        };
```

- [ ] **Step 2: 浏览器验证 dispatcher**

DevTools Console:

```js
const NS = window.__serialWebDashboard;
const protoBms = NS.PROTOCOLS.find((p) => p.id === 'proto_bms');
const cmd01 = NS.COMMANDS.find((c) => c.id === 0x01);

// 1. kind 0 (fixed-header) 走 _buildFrameFixedHeader
const r0 = NS.buildFrame(protoBms, cmd01);
r0.bytes.length
// 预期: 18 字节 (header 1 + cmd 1 + length 1 + data 10 + crc 2 + tail 1 + length 字段 1 + ...)
// 实际数字取决于 protocol.fields size 总和, 用 r0.sections.length 验证
r0.sections.length
// 预期: 6 (header / cmd / length / data / crc / tail) - 跟现状 fields 数组对应

// 2. 测试 error: NO_PROTOCOL
NS.buildFrame(null, cmd01).error
// 预期: 'NO_PROTOCOL'

// 3. 测试 error: UNKNOWN_KIND
NS.buildFrame({ kind: 'foo' }, cmd01).error
// 预期: 'UNKNOWN_KIND'

// 4. 测试 kind 1 (raw) 走 stub
NS.buildFrame({ kind: 'raw' }, cmd01).error
// 预期: 'NOT_IMPLEMENTED'

// 5. 测试无 kind 字段 → default kind 0
NS.buildFrame({ id: 'no_kind', name: 'Test', byteOrder: 'BE', crcRange: 'all', fields: [
  { type: 'header', size: 1, default: '0xAA' },
  { type: 'cmd', size: 1, default: '0x00' },
  { type: 'data', size: 0, default: '0x00' },
  { type: 'crc', size: 2, default: 'auto' }
] }, cmd01).sections.length
// 预期: 4 (header / cmd / data / crc) - 跟 fields 数组对应, kind 默认 'fixed-header'
```

- [ ] **Step 3: 浏览器验证 dashboard 仍跑**

浏览器加载 dashboard, 滚动到底部, 查看 c1-c8 卡片值。

预期: 卡片值跟 v4.7 一样 (dispatcher 走 kind 0 → _buildFrameFixedHeader → 现状行为)。

- [ ] **Step 4: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.8 NS.buildFrame 改 dispatcher (switch on kind)"
```

---

### Task 9: 协议编辑器 "验证" 按钮 + 错误 UI (红徽章 + 红框 + toast)

**Files:**
- Modify: `SerialCube.html:10530-10710` (协议编辑器 UI 部分,具体行号实现时定位)

**Interfaces:**
- Consumes: `NS.buildFrame` (from Task 8) / `NS.PROTOCOLS` / `NS.activeProtoId`
- Produces:
  - 协议编辑器顶部 "验证" 按钮 (HTML)
  - 错误时 tab 红徽章
  - 字节预览区红框 + 错误消息
  - 顶部 toast 通知

- [ ] **Step 1: 定位协议编辑器 UI**

打开 `SerialCube.html`,定位到协议编辑器 (proto editor) modal 的 HTML + 渲染函数。

具体位置 (grep `protocolEditor` 或 `renderProtoEditor`):
- `NS.renderProtoEditor` 函数 (line 10530 附近)
- 协议编辑器 modal HTML (line 7267-7295 附近, 在 dashboard mode-switch 后)

- [ ] **Step 2: 加 "验证" 按钮 HTML**

在协议编辑器 modal 顶部 (在 tabsEl `<div id="dh-proto-tabs"></div>` 之后),加一个按钮:

```html
<button id="dh-proto-validate-btn" class="secondary-btn" type="button">验证</button>
```

(具体样式跟其他 secondary-btn 一致, 颜色用 DESIGN.md 系统)

- [ ] **Step 3: 加 "验证" 按钮 handler**

在 `NS.renderProtoEditor` 函数末尾(在 tabs / body 渲染之后),加 handler:

```js
        // --- 协议编辑器 "验证" 按钮 (v4.8a) ---
        const validateBtn = document.getElementById('dh-proto-validate-btn');
        if (validateBtn && !validateBtn._v48Bound) {
          validateBtn._v48Bound = true;
          validateBtn.onclick = () => {
            const proto = NS.PROTOCOLS.find((p) => p.id === NS.activeProtoId);
            const cmd = NS.COMMANDS[0] || { id: 0x00, dataFields: [] };  // 选第一个 cmd 验证
            const result = NS.buildFrame(proto, cmd);
            if (result.error) {
              // 红框 + toast
              const tab = document.querySelector('.proto-tab.active');
              if (tab) tab.classList.add('has-error');
              NS._showProtoError(result);
            } else {
              // 清除错误状态
              document.querySelectorAll('.proto-tab.has-error').forEach((t) => t.classList.remove('has-error'));
              NS._clearProtoError();
              // 弹 "OK" toast
              NS._showProtoOk();
            }
          };
        }
```

- [ ] **Step 4: 加 _showProtoError / _clearProtoError / _showProtoOk 函数**

接上一步,继续插入:

```js
        // --- 错误 UI 函数 (v4.8a) ---
        NS._showProtoError = function (result) {
          // 1. 字节预览区替换红框
          const previewEl = document.getElementById('dh-proto-frame-preview');
          if (previewEl) {
            previewEl.classList.add('has-error');
            previewEl.innerHTML = `<div class="proto-error-box">协议错误: <strong>${result.error}</strong>${
              result.kind ? ` (kind: ${result.kind})` : ''
            }${result.note ? `<br><small>${result.note}</small>` : ''}</div>`;
          }
          // 2. 顶部 toast
          NS._toast(`协议错误: ${result.error}${result.kind ? ` (kind: ${result.kind})` : ''}`, 'error');
          // 3. console.error
          console.error('[v4.8a buildFrame]', result);
        };

        NS._clearProtoError = function () {
          const previewEl = document.getElementById('dh-proto-frame-preview');
          if (previewEl) {
            previewEl.classList.remove('has-error');
            // 重新渲染字节预览 (调用现有 _renderFramePreview)
            const proto = NS.PROTOCOLS.find((p) => p.id === NS.activeProtoId);
            if (proto && typeof NS._renderFramePreview === 'function') {
              NS._renderFramePreview(NS.buildFrame(proto, NS.COMMANDS[0] || { id: 0x00, dataFields: [] }), proto);
            }
          }
        };

        NS._showProtoOk = function () {
          NS._toast('协议验证 OK', 'ok');
        };
```

- [ ] **Step 5: 加 _toast 函数 (如果还没)**

检查 SerialCube.html 现有代码,看是否已有 toast 函数 (主应用应该有 toast layer)。如果没有,在 NS 命名空间下加一个简单实现:

```js
        // --- 简单 toast (v4.8a, 协议编辑器用) ---
        NS._toast = function (message, type) {
          let toastEl = document.getElementById('dh-proto-toast');
          if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'dh-proto-toast';
            toastEl.className = 'dh-proto-toast';
            document.body.appendChild(toastEl);
          }
          toastEl.className = 'dh-proto-toast ' + (type || 'info') + ' show';
          toastEl.textContent = message;
          setTimeout(() => { toastEl.classList.remove('show'); }, 3000);
        };
```

- [ ] **Step 6: 加 CSS (红徽章 + 红框 + toast)**

在 SerialCube.html 现有 CSS 区域 (DESIGN.md 风格的 panel / button 之后),加:

```css
        /* v4.8a: 协议编辑器错误 UI */
        .proto-tab.has-error {
          color: var(--danger, #e0575e);
          border-color: var(--danger, #e0575e);
        }
        .proto-tab.has-error::after {
          content: ' ⚠';
        }
        .has-error#dh-proto-frame-preview,
        #dh-proto-frame-preview.has-error {
          background: rgba(224, 87, 94, 0.08);
          border: 1px solid var(--danger, #e0575e);
          padding: 12px;
          border-radius: var(--radius-small, 10px);
        }
        .proto-error-box {
          color: var(--danger, #e0575e);
          font-family: var(--font-mono, monospace);
          font-size: 12px;
        }
        .dh-proto-toast {
          position: fixed;
          top: 70px;
          right: 20px;
          padding: 10px 16px;
          border-radius: var(--radius-small, 10px);
          background: var(--bg-elevated, rgba(255,255,255,0.92));
          border: 1px solid var(--border, rgba(60,60,67,0.16));
          font-size: 13px;
          z-index: 9999;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.18s ease, transform 0.18s ease;
          pointer-events: none;
        }
        .dh-proto-toast.show {
          opacity: 1;
          transform: translateY(0);
        }
        .dh-proto-toast.error {
          border-color: var(--danger, #e0575e);
          color: var(--danger, #e0575e);
        }
        .dh-proto-toast.ok {
          border-color: var(--brand-green, rgba(34,197,94,0.5));
        }
```

(颜色变量从 DESIGN.md 调, 跟设计系统抗住)

- [ ] **Step 7: 浏览器验证**

1. 浏览器加载 dashboard
2. 打开协议编辑器 (顶栏 mode-switch → 仪表盘 → 协议编辑器入口)
3. 切到 "BMS TLV v1 (Legacy)" tab → 字节预览区显示原字节
4. 点 "验证" 按钮 → 弹 "协议验证 OK" toast, 字节预览区无变化
5. 把 `NS.PROTOCOLS` 第一个协议的 kind 临时改为 'raw' (DevTools): `NS.PROTOCOLS[0].kind = 'raw'`
6. 点 "验证" → 弹 "协议错误: NOT_IMPLEMENTED (kind: raw)" toast, 字节预览区红框, tab 红徽章
7. 还原 kind: `NS.PROTOCOLS[0].kind = 'fixed-header'`
8. 点 "验证" → 红框消失, 弹 "协议验证 OK"

预期: 错误 UI 全部按设计反应。

- [ ] **Step 8: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8a.9 协议编辑器 验证 按钮 + 错误 UI (红徽章 + 红框 + toast)"
```

---

### Task 10: v4.8a 整体验证 + commit

**Files:**
- 无代码改动,只做整体 smoke test + 总结 commit

- [ ] **Step 1: 整体 smoke test 清单**

按以下清单逐项验证:

1. **浏览器加载 dashboard**:
   - 打开 SerialCube.html (浏览器加载,进入 dashboard 模式)
   - 预期: dashboard 渲染正常, c1-c10 卡片值跟 v4.7 一致

2. **协议编辑器 "BMS TLV v1 (Legacy)"**:
   - 打开协议编辑器 → 切到 BMS TLV v1 (Legacy) tab
   - 预期: 字节预览区显示原字节 (header=0xAA, tail=0x55)
   - 点 "验证" 按钮 → 弹 "协议验证 OK" toast

3. **协议编辑器 "Modbus RTU (Legacy)"**:
   - 切到 Modbus RTU (Legacy) tab
   - 预期: 字节预览区显示原字节 (无 header, 末尾 CRC)
   - 点 "验证" → "协议验证 OK" toast

4. **旧 user config 兼容**:
   - DevTools 模拟旧 user config (无 kind 字段, line 10894 调用):
     ```js
     const oldConfig = { type: 'SerialWebUserConfig', version: 1, protocols: [
       { id: 'old', name: 'Old', byteOrder: 'BE', crcRange: 'all', fields: [] }
     ] };
     window.__serialWebDashboard.PROTOCOLS = oldConfig.protocols.map((p) => ({ ...p, kind: p.kind || 'fixed-header' }));
     ```
   - 预期: `NS.PROTOCOLS[0].kind === 'fixed-header'`

5. **新 user config (有 kind 字段) 保留 kind**:
   - DevTools 模拟新 config:
     ```js
     NS.PROTOCOLS = [{ id: 'new', kind: 'raw', name: 'New', ... }];
     ```
   - 预期: `NS.PROTOCOLS[0].kind === 'raw'`

6. **未知 kind 报错**:
   - DevTools: `NS.PROTOCOLS[0].kind = 'foo'`
   - 协议编辑器点 "验证" → 弹 "协议错误: UNKNOWN_KIND (kind: foo)" toast + 红框
   - 还原: `NS.PROTOCOLS[0].kind = 'fixed-header'`

7. **kind 1-7 stub 报 NOT_IMPLEMENTED**:
   - DevTools: `NS.PROTOCOLS[0].kind = 'raw'`
   - 协议编辑器点 "验证" → 弹 "协议错误: NOT_IMPLEMENTED (kind: raw)" toast + 红框
   - 还原

8. **buildFrame dispatcher 验证**:
   - DevTools:
     ```js
     const NS = window.__serialWebDashboard;
     NS.buildFrame(null, {}).error          // 'NO_PROTOCOL'
     NS.buildFrame({kind:'foo'}, {}).error  // 'UNKNOWN_KIND'
     NS.buildFrame({kind:'raw'}, {}).error  // 'NOT_IMPLEMENTED'
     NS.buildFrame(NS.PROTOCOLS[0], NS.COMMANDS[0]).sections.length  // 6 (BMS fields)
     ```

- [ ] **Step 2: 验证 dashboard mock 数据 c1-c10 卡片值**

浏览器加载 dashboard, 滚动到底部, 对照 v4.7 截图(如果还在)或预期值:
- c1 Cell 1 电压: ~4.2-4.6V (jitter)
- c2 Pack 电流: 0A (mock 不模拟)
- c3 温度: ~25°C
- c4 SOC: 80%
- c5-c7 Cell 2-4 电压: ~3.7-4.0V
- c8 Pack 均压: ~3.7V (v4.5.1 修过的 range)
- c9 pair 充电电压: SET 56.0 / ACT ~55.7 / Δ -0.3
- c10 充电设定: 56.0V

预期: 全部跟 v4.7 一致 (kind 0 走 _buildFrameFixedHeader 行为 100% 兼容)。

- [ ] **Step 3: 验证 v4.6 5 个 modal 未破坏**

打开 5 个 modal: 协议编辑器 / 命令管理 / 卡片配置 / 卡片编辑 / 告警配置。

预期: 全部 modal 仍能打开,排版未破坏。

- [ ] **Step 4: v4.8a 总结 commit**

如果上面 8 项验证全部通过,做 v4.8a 总结 commit (不修改代码,只更新 CHANGELOG / About 弹窗):

打开 `SerialCube.html`,找到 CHANGELOG / About 弹窗 (grep `v4.7` 找),在 v4.7 条目后加 v4.8a 条目。

或者 (如果 CHANGELOG 是自动生成),跳过这步,在 v4.8b 一起加。

- [ ] **Step 5: v4.8a commit + 推 origin**

```bash
git status
git log origin/main..HEAD --oneline
git push origin main
```

(推 origin 后 v4.8a 落地, 接下来 v4.8b 在新基础上加 kind 1-7 实现)

---

## v4.8b: kind 1-7 实现 (Tasks 11-17)

### Task 11: NS._buildFrameRaw 实现 (kind 1, header 方向编码 0x5A/0x55)

**Files:**
- Modify: `SerialCube.html` (替换 Task 7 插入的 `_buildFrameRaw` stub)

**Interfaces:**
- Consumes: `protocol` (kind=raw) / `cmd` / `NS.encodeDataFields` / `NS._computeCrcInput` / `NS._encodeCrcBytes` / `NS.computeCrc` / `NS.crcByteSize` / `NS.parseHexOr0`
- Produces: `NS._buildFrameRaw(protocol, cmd)` → `{ bytes, sections }`

- [ ] **Step 1: 替换 stub**

打开 `SerialCube.html`,定位到 Task 7 插入的 `NS._buildFrameRaw = function (protocol, cmd) { return { error: 'NOT_IMPLEMENTED', kind: 'raw', note: 'v4.8b 实现' }; };` 函数体。

替换为:

```js
        NS._buildFrameRaw = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          const data = NS.encodeDataFields(cmd, protocol);
          // header: 方向决定字节 (MB=0x5A 主机发送, CB=0x55 主机接收)
          const headerByte = (cmd.direction === 'rx') ? 0x55 : 0x5A;
          sections.push({ type: 'header', name: 'header', bytes: [headerByte] });
          // cmd
          sections.push({ type: 'cmd', name: 'cmd', bytes: [cmd.id & 0xFF] });
          // length
          sections.push({ type: 'length', name: 'length', bytes: [data.length & 0xFF] });
          // data
          sections.push({ type: 'data', name: 'data', bytes: [...data] });
          // CRC
          const allBytes = sections.flatMap((s) => s.bytes);
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          sections.push({ type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') });
          // tail
          const tailByte = (protocol.tail != null) ? NS.parseHexOr0(protocol.tail) : 0x55;
          sections.push({ type: 'tail', name: 'tail', bytes: [tailByte & 0xFF] });
          return { bytes: sections.flatMap((s) => s.bytes), sections };
        };
```

- [ ] **Step 2: 浏览器验证 _buildFrameRaw**

DevTools Console:

```js
const NS = window.__serialWebDashboard;
// 模拟 kind=raw 协议 + tx cmd (MB)
const protoRaw = { kind: 'raw', name: 'Test Raw', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', tail: '0x55', fields: [
  { name: 'header', type: 'header', size: 1, default: '0x00' },
  { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
  { name: 'length', type: 'length', size: 1, default: 'auto' },
  { name: 'data', type: 'data', size: 0, default: '0x00' },
  { name: 'crc', type: 'crc', size: 2, default: 'auto' },
  { name: 'tail', type: 'tail', size: 1, default: '0x55' }
] };
const cmdTx = { id: 0x10, direction: 'tx', dataFields: ['charge_v_set', 'charge_i_set'] };
const cmdRx = { id: 0x01, direction: 'rx', dataFields: ['cell_1_v'] };

// 1. tx cmd → header=0x5A
NS._buildFrameRaw(protoRaw, cmdTx).sections[0].bytes[0]
// 预期: 0x5A

// 2. rx cmd → header=0x55
NS._buildFrameRaw(protoRaw, cmdRx).sections[0].bytes[0]
// 预期: 0x55
```

预期: tx 方向 header=0x5A, rx 方向 header=0x55。

- [ ] **Step 3: 协议编辑器验证 kind=raw**

DevTools:
```js
const NS = window.__serialWebDashboard;
NS.PROTOCOLS[0].kind = 'raw';
NS.PROTOCOLS[0].name = 'Test Raw (Legacy)';
// 打开协议编辑器 → 切到 "Test Raw (Legacy)" tab
// 点 验证 → 应该弹 协议验证 OK (不再 NOT_IMPLEMENTED)
// 字节预览区: tx cmd → 5A 10 ... 55, rx cmd → 55 01 ... 55
```

- [ ] **Step 4: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8b.1 NS._buildFrameRaw 实现 (kind 1, header 方向编码 0x5A/0x55)"
```

---

### Task 12: NS._buildFrameCmdSplit 实现 (kind 2, cmd bit7 编码)

**Files:**
- Modify: `SerialCube.html` (替换 `_buildFrameCmdSplit` stub)

**Interfaces:**
- Consumes: `protocol` (kind=cmd-split) / `cmd` / 同 Task 11
- Produces: `NS._buildFrameCmdSplit(protocol, cmd)` → `{ bytes, sections }`

- [ ] **Step 1: 替换 stub**

定位到 `NS._buildFrameCmdSplit` stub,替换为:

```js
        NS._buildFrameCmdSplit = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          const data = NS.encodeDataFields(cmd, protocol);
          // header: 写死 (跟 kind 0 fixed-header 一样)
          const headerField = protocol.fields.find((f) => f.type === 'header');
          const headerByte = headerField ? (NS.parseHexOr0(headerField.default) & 0xFF) : 0xAA;
          sections.push({ type: 'header', name: 'header', bytes: [headerByte] });
          // cmd: bit7 编码方向 (MB=0, CB=1)
          const cmdByte = (cmd.id & 0x7F) | ((cmd.direction === 'rx') ? 0x80 : 0);
          sections.push({ type: 'cmd', name: 'cmd', bytes: [cmdByte & 0xFF] });
          // length
          sections.push({ type: 'length', name: 'length', bytes: [data.length & 0xFF] });
          // data
          sections.push({ type: 'data', name: 'data', bytes: [...data] });
          // CRC
          const allBytes = sections.flatMap((s) => s.bytes);
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          sections.push({ type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') });
          // tail
          const tailField = protocol.fields.find((f) => f.type === 'tail');
          const tailByte = tailField ? (NS.parseHexOr0(tailField.default) & 0xFF) : 0x55;
          sections.push({ type: 'tail', name: 'tail', bytes: [tailByte] });
          return { bytes: sections.flatMap((s) => s.bytes), sections };
        };
```

- [ ] **Step 2: 浏览器验证 _buildFrameCmdSplit**

DevTools Console:

```js
const NS = window.__serialWebDashboard;
const protoCmdSplit = { kind: 'cmd-split', name: 'Test Cmd Split', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
  { name: 'header', type: 'header', size: 1, default: '0xAA' },
  { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
  { name: 'length', type: 'length', size: 1, default: 'auto' },
  { name: 'data', type: 'data', size: 0, default: '0x00' },
  { name: 'crc', type: 'crc', size: 2, default: 'auto' },
  { name: 'tail', type: 'tail', size: 1, default: '0x55' }
] };
const cmdTx = { id: 0x01, direction: 'tx', dataFields: [] };
const cmdRx = { id: 0x01, direction: 'rx', dataFields: [] };

// tx cmd → cmd byte bit7=0 → 0x01
NS._buildFrameCmdSplit(protoCmdSplit, cmdTx).sections[1].bytes[0]
// 预期: 0x01

// rx cmd → cmd byte bit7=1 → 0x81
NS._buildFrameCmdSplit(protoCmdSplit, cmdRx).sections[1].bytes[0]
// 预期: 0x81
```

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8b.2 NS._buildFrameCmdSplit 实现 (kind 2, cmd bit7 编码)"
```

---

### Task 13: NS._buildFrameAddrSplit 实现 (kind 3, srcAddr/dstAddr 互换)

**Files:**
- Modify: `SerialCube.html` (替换 `_buildFrameAddrSplit` stub)

**Interfaces:**
- Consumes: `protocol` (kind=addr-split) / `cmd` / `protocol.hostId` / `protocol.devId` / 同 Task 11
- Produces: `NS._buildFrameAddrSplit(protocol, cmd)` → `{ bytes, sections }`

- [ ] **Step 1: 替换 stub**

定位到 `NS._buildFrameAddrSplit` stub,替换为:

```js
        NS._buildFrameAddrSplit = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          const data = NS.encodeDataFields(cmd, protocol);
          // header
          const headerField = protocol.fields.find((f) => f.type === 'header');
          const headerByte = headerField ? (NS.parseHexOr0(headerField.default) & 0xFF) : 0xAA;
          sections.push({ type: 'header', name: 'header', bytes: [headerByte] });
          // srcAddr / dstAddr: 方向决定谁是谁
          const hostId = NS.parseHexOr0(protocol.hostId || '0x01') & 0xFF;
          const devId = NS.parseHexOr0(protocol.devId || '0x02') & 0xFF;
          const isMb = (cmd.direction !== 'rx');
          sections.push({ type: 'srcAddr', name: 'srcAddr', bytes: [isMb ? hostId : devId] });
          sections.push({ type: 'dstAddr', name: 'dstAddr', bytes: [isMb ? devId : hostId] });
          // cmd
          sections.push({ type: 'cmd', name: 'cmd', bytes: [cmd.id & 0xFF] });
          // length
          sections.push({ type: 'length', name: 'length', bytes: [data.length & 0xFF] });
          // data
          sections.push({ type: 'data', name: 'data', bytes: [...data] });
          // CRC
          const allBytes = sections.flatMap((s) => s.bytes);
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          sections.push({ type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') });
          // tail
          const tailField = protocol.fields.find((f) => f.type === 'tail');
          const tailByte = tailField ? (NS.parseHexOr0(tailField.default) & 0xFF) : 0x55;
          sections.push({ type: 'tail', name: 'tail', bytes: [tailByte] });
          return { bytes: sections.flatMap((s) => s.bytes), sections };
        };
```

- [ ] **Step 2: 浏览器验证 _buildFrameAddrSplit**

DevTools Console:

```js
const NS = window.__serialWebDashboard;
const protoAddr = { kind: 'addr-split', name: 'Test Addr', hostId: '0x01', devId: '0x02', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
  { name: 'header', type: 'header', size: 1, default: '0xAA' },
  { name: 'srcAddr', type: 'data', size: 1, default: '0x00' },
  { name: 'dstAddr', type: 'data', size: 1, default: '0x00' },
  { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
  { name: 'length', type: 'length', size: 1, default: 'auto' },
  { name: 'data', type: 'data', size: 0, default: '0x00' },
  { name: 'crc', type: 'crc', size: 2, default: 'auto' },
  { name: 'tail', type: 'tail', size: 1, default: '0x55' }
] };
const cmdTx = { id: 0x01, direction: 'tx', dataFields: [] };
const cmdRx = { id: 0x01, direction: 'rx', dataFields: [] };

// tx → srcAddr=0x01 (host), dstAddr=0x02 (dev)
const txResult = NS._buildFrameAddrSplit(protoAddr, cmdTx);
[txResult.sections[1].bytes[0], txResult.sections[2].bytes[0]]
// 预期: [0x01, 0x02]

// rx → srcAddr=0x02 (dev), dstAddr=0x01 (host)
const rxResult = NS._buildFrameAddrSplit(protoAddr, cmdRx);
[rxResult.sections[1].bytes[0], rxResult.sections[2].bytes[0]]
// 预期: [0x02, 0x01]
```

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8b.3 NS._buildFrameAddrSplit 实现 (kind 3, srcAddr/dstAddr 互换)"
```

---

### Task 14: NS._buildFrameCtrlBit7 实现 (kind 4, ctrl bit7 编码)

**Files:**
- Modify: `SerialCube.html` (替换 `_buildFrameCtrlBit7` stub)

**Interfaces:**
- Consumes: `protocol` (kind=ctrl-bit7) / `cmd` / `protocol.ctrlDefault` / 同 Task 11
- Produces: `NS._buildFrameCtrlBit7(protocol, cmd)` → `{ bytes, sections }`

- [ ] **Step 1: 替换 stub**

定位到 `NS._buildFrameCtrlBit7` stub,替换为:

```js
        NS._buildFrameCtrlBit7 = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          const data = NS.encodeDataFields(cmd, protocol);
          // header
          const headerField = protocol.fields.find((f) => f.type === 'header');
          const headerByte = headerField ? (NS.parseHexOr0(headerField.default) & 0xFF) : 0xAA;
          sections.push({ type: 'header', name: 'header', bytes: [headerByte] });
          // ctrl: bit7 编码方向 (default 来自 protocol.ctrlDefault, 默认 0x00)
          const ctrlDefault = NS.parseHexOr0(protocol.ctrlDefault || '0x00') & 0x7F;
          const ctrlByte = ctrlDefault | ((cmd.direction === 'rx') ? 0x80 : 0);
          sections.push({ type: 'ctrl', name: 'ctrl', bytes: [ctrlByte] });
          // cmd
          sections.push({ type: 'cmd', name: 'cmd', bytes: [cmd.id & 0xFF] });
          // length
          sections.push({ type: 'length', name: 'length', bytes: [data.length & 0xFF] });
          // data
          sections.push({ type: 'data', name: 'data', bytes: [...data] });
          // CRC
          const allBytes = sections.flatMap((s) => s.bytes);
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          sections.push({ type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') });
          // tail
          const tailField = protocol.fields.find((f) => f.type === 'tail');
          const tailByte = tailField ? (NS.parseHexOr0(tailField.default) & 0xFF) : 0x55;
          sections.push({ type: 'tail', name: 'tail', bytes: [tailByte] });
          return { bytes: sections.flatMap((s) => s.bytes), sections };
        };
```

- [ ] **Step 2: 浏览器验证 _buildFrameCtrlBit7**

DevTools:

```js
const NS = window.__serialWebDashboard;
const protoCtrl = { kind: 'ctrl-bit7', name: 'Test Ctrl', ctrlDefault: '0x10', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
  { name: 'header', type: 'header', size: 1, default: '0xAA' },
  { name: 'ctrl', type: 'data', size: 1, default: '0x00' },
  { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
  { name: 'length', type: 'length', size: 1, default: 'auto' },
  { name: 'data', type: 'data', size: 0, default: '0x00' },
  { name: 'crc', type: 'crc', size: 2, default: 'auto' },
  { name: 'tail', type: 'tail', size: 1, default: '0x55' }
] };
const cmdTx = { id: 0x01, direction: 'tx', dataFields: [] };
const cmdRx = { id: 0x01, direction: 'rx', dataFields: [] };

// tx → ctrl bit7=0 → 0x10 (default 不变)
NS._buildFrameCtrlBit7(protoCtrl, cmdTx).sections[1].bytes[0]
// 预期: 0x10

// rx → ctrl bit7=1 → 0x90
NS._buildFrameCtrlBit7(protoCtrl, cmdRx).sections[1].bytes[0]
// 预期: 0x90
```

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8b.4 NS._buildFrameCtrlBit7 实现 (kind 4, ctrl bit7 编码)"
```

---

### Task 15: NS._buildFrameTypeHighBit 实现 (kind 5, type bit7 编码)

**Files:**
- Modify: `SerialCube.html` (替换 `_buildFrameTypeHighBit` stub)

**Interfaces:**
- Consumes: `protocol` (kind=type-high-bit) / `cmd` / `protocol.typeDefault` / 同 Task 11
- Produces: `NS._buildFrameTypeHighBit(protocol, cmd)` → `{ bytes, sections }`

- [ ] **Step 1: 替换 stub**

定位到 `NS._buildFrameTypeHighBit` stub,替换为:

```js
        NS._buildFrameTypeHighBit = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          const data = NS.encodeDataFields(cmd, protocol);
          // header
          const headerField = protocol.fields.find((f) => f.type === 'header');
          const headerByte = headerField ? (NS.parseHexOr0(headerField.default) & 0xFF) : 0xAA;
          sections.push({ type: 'header', name: 'header', bytes: [headerByte] });
          // type: bit7 编码方向
          const typeDefault = NS.parseHexOr0(protocol.typeDefault || '0x00') & 0x7F;
          const typeByte = typeDefault | ((cmd.direction === 'rx') ? 0x80 : 0);
          sections.push({ type: 'type', name: 'type', bytes: [typeByte] });
          // cmd
          sections.push({ type: 'cmd', name: 'cmd', bytes: [cmd.id & 0xFF] });
          // length
          sections.push({ type: 'length', name: 'length', bytes: [data.length & 0xFF] });
          // data
          sections.push({ type: 'data', name: 'data', bytes: [...data] });
          // CRC
          const allBytes = sections.flatMap((s) => s.bytes);
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          sections.push({ type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') });
          // tail
          const tailField = protocol.fields.find((f) => f.type === 'tail');
          const tailByte = tailField ? (NS.parseHexOr0(tailField.default) & 0xFF) : 0x55;
          sections.push({ type: 'tail', name: 'tail', bytes: [tailByte] });
          return { bytes: sections.flatMap((s) => s.bytes), sections };
        };
```

- [ ] **Step 2: 浏览器验证 _buildFrameTypeHighBit**

DevTools:

```js
const NS = window.__serialWebDashboard;
const protoType = { kind: 'type-high-bit', name: 'Test Type', typeDefault: '0x20', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
  { name: 'header', type: 'header', size: 1, default: '0xAA' },
  { name: 'type', type: 'data', size: 1, default: '0x00' },
  { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
  { name: 'length', type: 'length', size: 1, default: 'auto' },
  { name: 'data', type: 'data', size: 0, default: '0x00' },
  { name: 'crc', type: 'crc', size: 2, default: 'auto' },
  { name: 'tail', type: 'tail', size: 1, default: '0x55' }
] };
const cmdTx = { id: 0x01, direction: 'tx', dataFields: [] };
const cmdRx = { id: 0x01, direction: 'rx', dataFields: [] };

NS._buildFrameTypeHighBit(protoType, cmdTx).sections[1].bytes[0]
// 预期: 0x20 (tx, bit7=0)
NS._buildFrameTypeHighBit(protoType, cmdRx).sections[1].bytes[0]
// 预期: 0xA0 (rx, bit7=1)
```

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8b.5 NS._buildFrameTypeHighBit 实现 (kind 5, type bit7 编码)"
```

---

### Task 16: NS._buildFrameMsgidMixed 实现 (kind 6, msgID bit15+7+8 packed)

**Files:**
- Modify: `SerialCube.html` (替换 `_buildFrameMsgidMixed` stub)

**Interfaces:**
- Consumes: `protocol` (kind=msgid-mixed) / `cmd` / `cmd.func` / `cmd.addr` / 同 Task 11
- Produces: `NS._buildFrameMsgidMixed(protocol, cmd)` → `{ bytes, sections }`

- [ ] **Step 1: 替换 stub**

定位到 `NS._buildFrameMsgidMixed` stub,替换为:

```js
        NS._buildFrameMsgidMixed = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          const data = NS.encodeDataFields(cmd, protocol);
          // msgID: 2 字节, bit15=方向, bit14-8=func(7bit), bit7-0=addr(8bit)
          const directionBit = (cmd.direction === 'rx') ? 1 : 0;
          const func = (cmd.func != null ? cmd.func : ((cmd.id >> 8) & 0x7F)) & 0x7F;  // 优先用 cmd.func, 否则从 cmd.id 高字节取
          const addr = (cmd.addr != null ? cmd.addr : (cmd.id & 0xFF)) & 0xFF;
          const msgIdValue = (directionBit << 15) | (func << 8) | addr;
          // 默认 BE 编码 (高字节先), 如果 protocol.crcEndian === 'LE' 则 LE
          const be = (protocol.msgIdEndian || 'BE') === 'BE';
          const msgIdBytes = be
            ? [(msgIdValue >> 8) & 0xFF, msgIdValue & 0xFF]
            : [msgIdValue & 0xFF, (msgIdValue >> 8) & 0xFF];
          sections.push({ type: 'msgID', name: 'msgID', bytes: msgIdBytes });
          // length
          sections.push({ type: 'length', name: 'length', bytes: [data.length & 0xFF] });
          // data
          sections.push({ type: 'data', name: 'data', bytes: [...data] });
          // CRC
          const allBytes = sections.flatMap((s) => s.bytes);
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          sections.push({ type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') });
          // tail
          const tailField = protocol.fields.find((f) => f.type === 'tail');
          const tailByte = tailField ? (NS.parseHexOr0(tailField.default) & 0xFF) : 0x55;
          sections.push({ type: 'tail', name: 'tail', bytes: [tailByte] });
          return { bytes: sections.flatMap((s) => s.bytes), sections };
        };
```

- [ ] **Step 2: 浏览器验证 _buildFrameMsgidMixed**

DevTools:

```js
const NS = window.__serialWebDashboard;
const protoMsg = { kind: 'msgid-mixed', name: 'Test MsgID', msgIdEndian: 'BE', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
  { name: 'msgID', type: 'data', size: 2, default: '0x0000' },
  { name: 'length', type: 'length', size: 1, default: 'auto' },
  { name: 'data', type: 'data', size: 0, default: '0x00' },
  { name: 'crc', type: 'crc', size: 2, default: 'auto' },
  { name: 'tail', type: 'tail', size: 1, default: '0x55' }
] };
const cmdTx = { id: 0x01, direction: 'tx', func: 0x10, addr: 0x20, dataFields: [] };
const cmdRx = { id: 0x01, direction: 'rx', func: 0x10, addr: 0x20, dataFields: [] };

// tx → msgIdValue = 0x0000 | (0x10 << 8) | 0x20 = 0x1020 → BE bytes = [0x10, 0x20]
NS._buildFrameMsgidMixed(protoMsg, cmdTx).sections[0].bytes
// 预期: [0x10, 0x20]

// rx → msgIdValue = (1 << 15) | (0x10 << 8) | 0x20 = 0x9020 → BE bytes = [0x90, 0x20]
NS._buildFrameMsgidMixed(protoMsg, cmdRx).sections[0].bytes
// 预期: [0x90, 0x20]
```

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8b.6 NS._buildFrameMsgidMixed 实现 (kind 6, msgID bit15+7+8 packed)"
```

---

### Task 17: NS._buildFrameTlv 实现 (kind 7, 循环 TLV 段)

**Files:**
- Modify: `SerialCube.html` (替换 `_buildFrameTlv` stub)

**Interfaces:**
- Consumes: `protocol` (kind=tlv) / `cmd` / `cmd.tlvs` (TLV 列表, 每个 TLV = `{ type, value }`, 走 cmd.tlvs 数组) / 同 Task 11
- Produces: `NS._buildFrameTlv(protocol, cmd)` → `{ bytes, sections }`

- [ ] **Step 1: 替换 stub**

定位到 `NS._buildFrameTlv` stub,替换为:

```js
        NS._buildFrameTlv = function (protocol, cmd) {
          if (!protocol || !cmd) return { error: 'NO_PROTOCOL' };
          const sections = [];
          // header
          const headerField = protocol.fields.find((f) => f.type === 'header');
          const headerByte = headerField ? (NS.parseHexOr0(headerField.default) & 0xFF) : 0xAA;
          sections.push({ type: 'header', name: 'header', bytes: [headerByte] });
          // TLV 段循环 (cmd.tlvs = [{ type: 0x01, value: [0xAB, 0xCD] }, ...])
          const tlvs = cmd.tlvs || [];
          const tlvSection = { type: 'tlv', name: 'tlv', bytes: [] };
          for (const tlv of tlvs) {
            const typeByte = (NS.parseHexOr0(tlv.type) & 0x7F) | ((cmd.direction === 'rx') ? 0x80 : 0);
            const valueBytes = tlv.value || [];
            tlvSection.bytes.push(typeByte & 0xFF);
            tlvSection.bytes.push(valueBytes.length & 0xFF);  // length 1B
            for (const b of valueBytes) tlvSection.bytes.push(b & 0xFF);
          }
          sections.push(tlvSection);
          // CRC (TLV 段整体参与, 跟在 data 段一样)
          const allBytes = sections.flatMap((s) => s.bytes);
          const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
          const crcType = protocol.crcType || 'crc16-modbus';
          const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
          sections.push({ type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') });
          // tail
          const tailField = protocol.fields.find((f) => f.type === 'tail');
          const tailByte = tailField ? (NS.parseHexOr0(tailField.default) & 0xFF) : 0x55;
          sections.push({ type: 'tail', name: 'tail', bytes: [tailByte] });
          return { bytes: sections.flatMap((s) => s.bytes), sections };
        };
```

- [ ] **Step 2: 浏览器验证 _buildFrameTlv**

DevTools:

```js
const NS = window.__serialWebDashboard;
const protoTlv = { kind: 'tlv', name: 'Test TLV', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
  { name: 'header', type: 'header', size: 1, default: '0xAA' },
  { name: 'tlv', type: 'data', size: 0, default: '0x00' },
  { name: 'crc', type: 'crc', size: 2, default: 'auto' },
  { name: 'tail', type: 'tail', size: 1, default: '0x55' }
] };
const cmdTx = { id: 0x00, direction: 'tx', dataFields: [], tlvs: [
  { type: '0x01', value: [0xAB, 0xCD] },
  { type: '0x02', value: [0x12, 0x34, 0x56] }
] };
const cmdRx = { id: 0x00, direction: 'rx', dataFields: [], tlvs: [
  { type: '0x01', value: [0xFF] }
] };

// tx TLVs: [01 02 AB CD, 02 03 12 34 56] → type bit7=0
NS._buildFrameTlv(protoTlv, cmdTx).sections[1].bytes
// 预期: [0x01, 0x02, 0xAB, 0xCD, 0x02, 0x03, 0x12, 0x34, 0x56]

// rx TLV: [01 01 FF] → type bit7=1
NS._buildFrameTlv(protoTlv, cmdRx).sections[1].bytes
// 预期: [0x81, 0x01, 0xFF]
```

- [ ] **Step 3: Commit**

```bash
git add SerialCube.html
git commit -m "v4.8b.7 NS._buildFrameTlv 实现 (kind 7, 循环 TLV 段)"
```

---

### Task 18: 7 种新 kind 测试协议 + v4.8b commit

**Files:**
- 无代码改动,只做整体 smoke test

- [ ] **Step 1: 7 种新 kind 各建 1 个测试协议**

DevTools Console (一次性建 7 个测试协议):

```js
const NS = window.__serialWebDashboard;
const testProtocols = [
  { id: 't_raw', kind: 'raw', name: 'Test Raw', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', tail: '0x55', fields: [
    { name: 'header', type: 'header', size: 1, default: '0x00' },
    { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
    { name: 'length', type: 'length', size: 1, default: 'auto' },
    { name: 'data', type: 'data', size: 0, default: '0x00' },
    { name: 'crc', type: 'crc', size: 2, default: 'auto' },
    { name: 'tail', type: 'tail', size: 1, default: '0x55' }
  ] },
  { id: 't_cmdsplit', kind: 'cmd-split', name: 'Test Cmd Split', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
    { name: 'header', type: 'header', size: 1, default: '0xAA' },
    { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
    { name: 'length', type: 'length', size: 1, default: 'auto' },
    { name: 'data', type: 'data', size: 0, default: '0x00' },
    { name: 'crc', type: 'crc', size: 2, default: 'auto' },
    { name: 'tail', type: 'tail', size: 1, default: '0x55' }
  ] },
  { id: 't_addrsplit', kind: 'addr-split', name: 'Test Addr Split', hostId: '0x01', devId: '0x02', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
    { name: 'header', type: 'header', size: 1, default: '0xAA' },
    { name: 'srcAddr', type: 'data', size: 1, default: '0x00' },
    { name: 'dstAddr', type: 'data', size: 1, default: '0x00' },
    { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
    { name: 'length', type: 'length', size: 1, default: 'auto' },
    { name: 'data', type: 'data', size: 0, default: '0x00' },
    { name: 'crc', type: 'crc', size: 2, default: 'auto' },
    { name: 'tail', type: 'tail', size: 1, default: '0x55' }
  ] },
  { id: 't_ctrl', kind: 'ctrl-bit7', name: 'Test Ctrl', ctrlDefault: '0x10', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
    { name: 'header', type: 'header', size: 1, default: '0xAA' },
    { name: 'ctrl', type: 'data', size: 1, default: '0x00' },
    { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
    { name: 'length', type: 'length', size: 1, default: 'auto' },
    { name: 'data', type: 'data', size: 0, default: '0x00' },
    { name: 'crc', type: 'crc', size: 2, default: 'auto' },
    { name: 'tail', type: 'tail', size: 1, default: '0x55' }
  ] },
  { id: 't_type', kind: 'type-high-bit', name: 'Test Type', typeDefault: '0x20', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
    { name: 'header', type: 'header', size: 1, default: '0xAA' },
    { name: 'type', type: 'data', size: 1, default: '0x00' },
    { name: 'cmd', type: 'cmd', size: 1, default: '0x00' },
    { name: 'length', type: 'length', size: 1, default: 'auto' },
    { name: 'data', type: 'data', size: 0, default: '0x00' },
    { name: 'crc', type: 'crc', size: 2, default: 'auto' },
    { name: 'tail', type: 'tail', size: 1, default: '0x55' }
  ] },
  { id: 't_msgid', kind: 'msgid-mixed', name: 'Test MsgID', msgIdEndian: 'BE', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
    { name: 'msgID', type: 'data', size: 2, default: '0x0000' },
    { name: 'length', type: 'length', size: 1, default: 'auto' },
    { name: 'data', type: 'data', size: 0, default: '0x00' },
    { name: 'crc', type: 'crc', size: 2, default: 'auto' },
    { name: 'tail', type: 'tail', size: 1, default: '0x55' }
  ] },
  { id: 't_tlv', kind: 'tlv', name: 'Test TLV', byteOrder: 'BE', crcRange: 'all', crcType: 'crc16-modbus', crcInit: '0xFFFF', crcEndian: 'LE', fields: [
    { name: 'header', type: 'header', size: 1, default: '0xAA' },
    { name: 'tlv', type: 'data', size: 0, default: '0x00' },
    { name: 'crc', type: 'crc', size: 2, default: 'auto' },
    { name: 'tail', type: 'tail', size: 1, default: '0x55' }
  ] }
];

// 测试加载 + 字节生成
testProtocols.forEach((p) => {
  const cmd = NS.COMMANDS[0];  // 用 Read Voltage 测试
  const result = NS.buildFrame(p, cmd);
  console.log(p.kind, '→', result.bytes.length, 'bytes:', result.bytes.map((b) => b.toString(16).padStart(2, '0')).join(' '));
});
```

预期: 7 个 kind 各输出字节长度 + 字节序列。

- [ ] **Step 2: 验证协议编辑器 7 种新 kind tab**

浏览器打开协议编辑器,临时加 7 个测试协议到 NS.PROTOCOLS (DevTools):

```js
const NS = window.__serialWebDashboard;
NS.PROTOCOLS = [...NS.PROTOCOLS, ...testProtocols];
// 重新打开协议编辑器, 应该看到 9 个 tab (2 legacy + 7 test)
```

预期: 7 个新 tab 出现,每个点 "验证" 不再 NOT_IMPLEMENTED,弹 "协议验证 OK"。

- [ ] **Step 3: 验证 dashboard 仍跑 (kind 0 协议未被影响)**

浏览器加载 dashboard, 查看 c1-c10 卡片值。

预期: 跟 v4.7 一致, kind 0 协议不受 kind 1-7 实现影响。

- [ ] **Step 4: v4.8b 总结 commit**

```bash
git status
git log origin/main..HEAD --oneline
git push origin main
```

- [ ] **Step 5: v4.8b 完成 (留 sub-2/3 TODO)**

汇报 v4.8b 完成, 接下来:
- **sub-2**: parseFrame + 协议编辑器 UI 重构 (kind 下拉 + 动态 fields) — 留后续 spec
- **sub-3**: cmd 字段映射重构 (dataSize 自动算) + pair trigger 真实发送 — 留后续 spec
- **v4.8.x+**: 端到端真串口验证 (需要你接真设备)

---

## Self-Review (writing-plans)

1. **Spec coverage** (spec 11 节, 18 tasks 覆盖检查):
   - 1. Overview: 不需要 task, design 文档本身
   - 2. 数据模型 (NS._KIND_TEMPLATES + NS.PROTOCOLS + 8 kind 字段表 + 方向 + UI 标签): Task 1, 2, 3 ✅
   - 3. buildFrame 拆法 (dispatcher + 公共函数 + 8 子函数): Task 5 (公共函数), 6 (kind 0), 7 (stub), 8 (dispatcher), 11-17 (kind 1-7) ✅
   - 4. 错误处理 (6 错误码 + UI 反应): Task 8 (dispatcher 返回 error), 9 (UI 红框 + toast) ✅
   - 5. 兼容性 (user config + 现状协议 + 默认 PROTOCOLS + activeProtoId): Task 2, 3, 4 ✅
   - 6. cmd 字段映射 (sub-1 不动): 0 task (明确不动) ✅
   - 7. 拆 commit (v4.8a / v4.8b): Task 10 (v4.8a commit), Task 18 (v4.8b commit) ✅
   - 8. 范围外: 不需要 task, 明确说留后续 ✅
   - 9. 数据兼容性约束: Global Constraints 节覆盖 ✅
   - 10. Open Questions: 2 个小项留 v4.8a 实施时定 (不阻塞) ✅
   - 11. References: 不需要 task, 设计文档本身 ✅

2. **Placeholder scan**:
   - 无 "TBD" / "TODO" / "fill in details" / "implement later"
   - 所有代码块都是完整实现
   - "具体行号实现时定位" 出现在 Task 9 step 1, 是因为协议编辑器 modal HTML 位置依赖 dashboard mode-switch 布局, 实施时定位是合理的(类似 git grep)

3. **Type consistency**:
   - `NS.buildFrame` 在 Task 8 定义, Task 11-17 都用 `NS._buildFrameXxx`, 接口一致
   - `NS._KIND_TEMPLATES` 在 Task 1 定义, 8 个 key ('fixed-header' / 'raw' / 'cmd-split' / 'addr-split' / 'ctrl-bit7' / 'type-high-bit' / 'msgid-mixed' / 'tlv') 在 Task 8 dispatcher + 11-17 子函数一致
   - `NS._computeCrcInput` + `NS._encodeCrcBytes` 在 Task 5 定义, Task 6, 11-17 都用
   - 错误返回格式 `{ error: 'CODE' } | { bytes, sections }` 在 Task 8 dispatcher + 9 UI 一致

4. **Scope check**:
   - 18 tasks 都在 sub-1 范围 (数据模型 + buildFrame 内核)
   - parseFrame / 协议编辑器 UI 重构 / cmd 字段映射 / pair trigger 留 sub-2/3
   - 端到端真串口留 v4.8.x+

5. **Ambiguity check**:
   - 方向定义 (tx/rx) 明确
   - 8 kind 字段顺序明确
   - CRC 算法抽到 _computeCrcInput 公共函数, 跟 buildFrame 现状行为一致
   - 7 个子函数返回 NOT_IMPLEMENTED 中间状态明确 (v4.8a)

Self-review 通过, 无需修改。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-04-tlv-protocol-refactor-sub1-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
