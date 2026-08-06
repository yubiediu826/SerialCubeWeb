# v4.8d parseFrame 通用化 + 贴字节输入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 SerialCube.html 协议编辑器 — 加 NS.parseFrame dispatcher + 8 个 _parseFrameXxx 子函数 (跟 _buildFrameXxx 严格对称),改 _parseAckFields / tryDispatchAckFrames / tryDispatchAsciiAckFrames 内部用通用 dispatch,协议编辑器底部加 "贴字节" 输入区 (textarea + 解析结果)。单文件 1 阶段 commit,不动 buildFrame 内核 (sub-1 已稳定)。

**Architecture:** 单文件 HTML,所有改动在 `D:\WorkSpace\SerialCubeWeb\SerialCube.html` (CRLF, 4 空格缩进)。数据层加 8 个 NS._parseFrameXxx 子函数 + NS.parseFrame dispatcher;UI 层在协议编辑器 modal 底部新加 "贴字节" 输入区 + 解析结果区;集成层改 _parseAckFields / tryDispatchAckFrames / tryDispatchAsciiAckFrames 内部用 NS.parseFrame;工具层加 NS._parseHexString (空格/0x/, 分隔归一化);CSS 加 .proto-parse-section / .proto-parse-input / .proto-parse-result / .parse-row.error。现状 2 协议 (BMS / Modbus) 走 kind 0 兼容 (行为不变)。

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
- **sub-1 / sub-2 / sub-c 已加的不能动**:
  - `NS._KIND_TEMPLATES`, `NS._KIND_FIELD_TEMPLATES`, `NS._buildFrameXxx` (8 个)
  - `NS.buildFrame` dispatcher, `NS.PROTOCOLS.kind` 字段, `NS.activeProtoId`
  - `NS._applyKindTemplate`, `NS._renderProtoTabBar`, `NS._onKindChange`
  - `NS._renderProtoNewModal`, `NS._createProtoFromTemplate`
  - 协议编辑器 modal 容器 + kind 下拉 + fields 列表 + locked 灰显 + 字节预览按段着色
- **commit 策略**: 1 个 commit 整批 (`v4.8d ...`),不拆 a/b (spec §8.2 明确)。所有 task 实施期间代码在工作区累积,Task 18 一次性 commit + push
- **失败切换准则** (AGENTS.md §6): 同一方案/工具/语法失败 2 次立即切换,不追加同类尝试
- **TDD 适配**: 本项目无自动化测试, "TDD" 步骤改为 "verify current state → make change → verify new state" via 浏览器 console (`__serialWebDashboard.NS.xxx`) + 浏览器 smoke test
- **不在 buildFrame / _buildFrameXxx 中改任何东西** — sub-1 内核已稳定,只新增 parseFrame 方向
- **不加新外部依赖** — 纯原生 JS/CSS

---

## File Structure (改动文件清单)

| 文件 | 类型 | 职责 |
|---|---|---|
| `SerialCube.html` | Modify | 全部改动都在这 1 个文件: JS (新 NS 命名空间成员 + 改 _parseAckFields / tryDispatch*) + CSS (新样式) + HTML (新 "贴字节" 输入区容器) |

子结构 (文件内):
- **JS section** (按 line 顺序):
  - `NS._parseHexString` 工具函数 — 紧跟 NS._FIELD_BYTE_SIZE 之后 (line 11883 附近)
  - `NS._parseFrameFixedHeader` (kind 0) — 紧跟 NS._buildFrameMsgidMixed 之后
  - `NS._parseFrameRaw` (kind 1) — 紧跟 kind 0 之后
  - `NS._parseFrameCmdSplit` (kind 2) — 紧跟 kind 1 之后
  - `NS._parseFrameAddrSplit` (kind 3) — 紧跟 kind 2 之后
  - `NS._parseFrameCtrlBit7` (kind 4) — 紧跟 kind 3 之后
  - `NS._parseFrameTypeHighBit` (kind 5) — 紧跟 kind 4 之后
  - `NS._parseFrameMsgidMixed` (kind 6) — 紧跟 kind 5 之后
  - `NS._parseFrameTlv` (kind 7) — 紧跟 kind 6 之后
  - `NS.parseFrame` dispatcher — 紧跟 8 个子函数之后
  - `NS._lastParseResult` UI 临时状态 — 紧跟 NS.activeProtoId 附近
  - 改 `NS._parseAckFields` (line 11893) — 内部用 `NS.parseFrame`
  - 改 `NS.tryDispatchAckFrames` (line 11960) — 改用 dispatch
  - 改 `NS.tryDispatchAsciiAckFrames` (line 11995) — 改用 dispatch
- **CSS section**:
  - `.proto-parse-section` + `.proto-parse-input` + `.proto-parse-result` + `.parse-row.error` — 协议编辑器底部贴字节区样式
- **HTML section**:
  - 新 "贴字节" 输入区容器 — 加到协议编辑器 modal 内,字节预览区下方

---

## Task 1: 加 NS._parseHexString 工具函数

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseHexString`)

**Interfaces:**
- Consumes: 字符串 (支持空格 / `0x` 前缀 / 逗号 / 混合格式)
- Produces: `Uint8Array` 或 `null` (格式错返 null)

- [ ] **Step 1: 定位插入位置**

打开 `SerialCube.html`,搜 `NS._FIELD_BYTE_SIZE` 或 `NS._bytesToNumber`,找到 line 11883 附近 (NS._bytesToNumber 结束)。记下最后一行行号。

- [ ] **Step 2: 写 `_parseHexString` 函数**

在 `NS._bytesToNumber` 函数结束 (line 11886 `};` 行) 之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // hex 字符串归一化: 支持空格/0x 前缀/逗号/混合格式
        //   "AA 01 02"  /  "0xAA 0x01 0x02"  /  "170,1,2"  /  "0xAA, 01, 0x02"
        //   错误格式 (非 hex 字符) 返 null
        NS._parseHexString = function (str) {
            if (typeof str !== 'string') return null;
            // 1. 归一化: 去 0x 前缀 + 去逗号 + 拆 token
            const cleaned = str.replace(/0x/gi, '').replace(/,/g, ' ').trim();
            if (!cleaned) return null;
            const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0);
            // 2. 验每个 token 是合法 hex
            for (const t of tokens) {
                if (!/^[0-9a-fA-F]+$/.test(t)) return null;
            }
            // 3. 转 Uint8Array
            const out = new Uint8Array(tokens.length);
            for (let i = 0; i < tokens.length; i += 1) {
                out[i] = parseInt(tokens[i], 16) & 0xFF;
            }
            return out;
        };
```

- [ ] **Step 3: 验证函数存在 + 4 种格式都支持**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseHexString\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('handles 0x prefix:',m[0].includes('replace(/0x/gi')?'YES':'NO');
console.log('handles commas:',m[0].includes('replace(/,/g')?'YES':'NO');
console.log('validates hex:',m[0].includes('0-9a-fA-F')?'YES':'NO');
console.log('returns Uint8Array:',m[0].includes('new Uint8Array')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 2**。

---

## Task 2: 加 NS._parseFrameFixedHeader (kind 0)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseFrameFixedHeader`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol` (含 fields 数组)
- Produces: `{ fields: { [name]: value }, sections: [{ type, name, bytes, value }] }` 或 `{ error: 'TOO_SHORT' }`

- [ ] **Step 1: 定位 `NS._buildFrameMsgidMixed` 结束位置**

打开 `SerialCube.html`,搜 `NS._buildFrameMsgidMixed`,找到函数 (line 11796 附近)。记下函数结束 `};` 行号。

- [ ] **Step 2: 紧跟其后插入 `_parseFrameFixedHeader`**

在 `NS._buildFrameMsgidMixed` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- _parseFrameFixedHeader: kind 0 (跟 _buildFrameFixedHeader 严格对称) ---
        // 帧布局: header(1) + cmd(1) + length(1) + data(N) + crc(2) + tail(1) = 7+N
        // 跟 _buildFrameFixedHeader 行为: 字段顺序按 protocol.fields 遍历, size 决定段长
        NS._parseFrameFixedHeader = function (bytes, protocol) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 7) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            for (const f of protocol.fields) {
                const segBytes = bytes.slice(off, off + f.size);
                let value = null;
                if (f.type === 'header' || f.type === 'addr' || f.type === 'tail' || f.type === 'cmd' || f.type === 'length') {
                    value = segBytes[0] !== undefined ? segBytes[0] : null;
                } else if (f.type === 'data') {
                    value = segBytes;
                } else if (f.type === 'crc') {
                    value = segBytes.length >= 2 ? (segBytes[0] | (segBytes[1] << 8)) : null;
                }
                sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                off += f.size;
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
            return { fields, sections };
        };
```

- [ ] **Step 3: 验证函数存在 + 帧布局 + 不校验 CRC**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseFrameFixedHeader\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('TOO_SHORT check:',m[0].includes('TOO_SHORT')?'YES':'NO');
console.log('iterates fields:',m[0].includes('for (const f of protocol.fields)')?'YES':'NO');
console.log('crc reads (not validates):',m[0].includes('segBytes[0] | (segBytes[1] << 8)')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 3**。

---

## Task 3: 加 NS._parseFrameRaw (kind 1)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseFrameRaw`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol` (含 fields 数组)
- Produces: `{ fields, sections }` 或 `{ error: 'TOO_SHORT' }`

- [ ] **Step 1: 紧跟 Task 2 插入**

在 `NS._parseFrameFixedHeader` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- _parseFrameRaw: kind 1 (header 字节按方向 MB=0x5A / CB=0x55, 跟 _buildFrameRaw 对称) ---
        // 帧布局: header(1) + cmd(1) + length(1) + data(N) + crc(2) + tail(1) = 7+N
        NS._parseFrameRaw = function (bytes, protocol) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 7) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            for (const f of protocol.fields) {
                const segBytes = bytes.slice(off, off + f.size);
                let value = null;
                if (f.type === 'header' || f.type === 'addr' || f.type === 'tail' || f.type === 'cmd' || f.type === 'length') {
                    value = segBytes[0] !== undefined ? segBytes[0] : null;
                } else if (f.type === 'data') {
                    value = segBytes;
                } else if (f.type === 'crc') {
                    value = segBytes.length >= 2 ? (segBytes[0] | (segBytes[1] << 8)) : null;
                }
                sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                off += f.size;
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
            return { fields, sections };
        };
```

注: kind 1 跟 kind 0 帧布局一样 (都是 7+N),只是 header 字节方向不同 (0x5A / 0x55)。parse 时不验 header 方向,只读字节。

- [ ] **Step 2: 验证函数存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseFrameRaw\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
"
```

Expected: `function found, length: <N>`。

**不 commit,继续 Task 4**。

---

## Task 4: 加 NS._parseFrameCmdSplit (kind 2)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseFrameCmdSplit`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol` (含 fields 数组)
- Produces: `{ fields, sections }` 或 `{ error: 'TOO_SHORT' }`

- [ ] **Step 1: 紧跟 Task 3 插入**

在 `NS._parseFrameRaw` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- _parseFrameCmdSplit: kind 2 (header 写死 0xAA, cmd bit7 编码方向, 跟 _buildFrameCmdSplit 对称) ---
        // 帧布局: header(1) + cmd(1) + length(1) + data(N) + crc(2) + tail(1) = 7+N
        NS._parseFrameCmdSplit = function (bytes, protocol) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 7) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            for (const f of protocol.fields) {
                const segBytes = bytes.slice(off, off + f.size);
                let value = null;
                if (f.type === 'header' || f.type === 'addr' || f.type === 'tail' || f.type === 'cmd' || f.type === 'length') {
                    value = segBytes[0] !== undefined ? segBytes[0] : null;
                } else if (f.type === 'data') {
                    value = segBytes;
                } else if (f.type === 'crc') {
                    value = segBytes.length >= 2 ? (segBytes[0] | (segBytes[1] << 8)) : null;
                }
                sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                off += f.size;
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
            return { fields, sections };
        };
```

注: kind 2 跟 kind 0 帧布局一样 (7+N),cmd bit7 方向在 buildFrame 时编码,parseFrame 不解码 (只读字节)。

- [ ] **Step 2: 验证函数存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseFrameCmdSplit\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
"
```

Expected: `function found, length: <N>`。

**不 commit,继续 Task 5**。

---

## Task 5: 加 NS._parseFrameAddrSplit (kind 3)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseFrameAddrSplit`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol` (含 fields 数组, 8 行: header+srcAddr+dstAddr+cmd+length+data+crc+tail)
- Produces: `{ fields, sections }` 或 `{ error: 'TOO_SHORT' }`

- [ ] **Step 1: 紧跟 Task 4 插入**

在 `NS._parseFrameCmdSplit` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- _parseFrameAddrSplit: kind 3 (同帧头+地址区分, srcAddr/dstAddr 跟 cmd 各 1B, 跟 _buildFrameAddrSplit 对称) ---
        // 帧布局: header(1) + srcAddr(1) + dstAddr(1) + cmd(1) + length(1) + data(N) + crc(2) + tail(1) = 9+N
        //   最小帧 9 字节 (4 头部 + 2 CRC + 1 tail + 1 length + 1 data?)
        //   实际 N=0 时 9 字节, N>0 时 9+N
        NS._parseFrameAddrSplit = function (bytes, protocol) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 9) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            for (const f of protocol.fields) {
                const segBytes = bytes.slice(off, off + f.size);
                let value = null;
                if (f.type === 'header' || f.type === 'srcAddr' || f.type === 'dstAddr' || f.type === 'addr' || f.type === 'tail' || f.type === 'cmd' || f.type === 'length') {
                    value = segBytes[0] !== undefined ? segBytes[0] : null;
                } else if (f.type === 'data') {
                    value = segBytes;
                } else if (f.type === 'crc') {
                    value = segBytes.length >= 2 ? (segBytes[0] | (segBytes[1] << 8)) : null;
                }
                sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                off += f.size;
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
            return { fields, sections };
        };
```

- [ ] **Step 2: 验证函数存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseFrameAddrSplit\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('TOO_SHORT threshold 9:',m[0].includes('bytes.length < 9')?'YES':'NO');
console.log('handles srcAddr/dstAddr:',m[0].includes('srcAddr')&&m[0].includes('dstAddr')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 6**。

---

## Task 6: 加 NS._parseFrameCtrlBit7 + TypeHighBit (kind 4 + kind 5)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseFrameCtrlBit7` + `NS._parseFrameTypeHighBit`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol`
- Produces: `{ fields, sections }` 或 `{ error: 'TOO_SHORT' }`

- [ ] **Step 1: 紧跟 Task 5 插入**

在 `NS._parseFrameAddrSplit` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- _parseFrameCtrlBit7: kind 4 (控制位方向, header+ctrl+cmd+length+data+crc+tail = 8+N) ---
        //   帧布局: header(1) + ctrl(1, bit7 方向) + cmd(1) + length(1) + data(N) + crc(2) + tail(1)
        //   最小帧 8 字节
        NS._parseFrameCtrlBit7 = function (bytes, protocol) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 8) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            for (const f of protocol.fields) {
                const segBytes = bytes.slice(off, off + f.size);
                let value = null;
                if (f.type === 'header' || f.type === 'ctrl' || f.type === 'addr' || f.type === 'tail' || f.type === 'cmd' || f.type === 'length') {
                    value = segBytes[0] !== undefined ? segBytes[0] : null;
                } else if (f.type === 'data') {
                    value = segBytes;
                } else if (f.type === 'crc') {
                    value = segBytes.length >= 2 ? (segBytes[0] | (segBytes[1] << 8)) : null;
                }
                sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                off += f.size;
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
            return { fields, sections };
        };

        // --- _parseFrameTypeHighBit: kind 5 (Type 高位方向, header+type+cmd+length+data+crc+tail = 8+N) ---
        //   帧布局: header(1) + type(1, bit7 方向) + cmd(1) + length(1) + data(N) + crc(2) + tail(1)
        //   最小帧 8 字节
        NS._parseFrameTypeHighBit = function (bytes, protocol) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 8) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            for (const f of protocol.fields) {
                const segBytes = bytes.slice(off, off + f.size);
                let value = null;
                if (f.type === 'header' || f.type === 'type' || f.type === 'addr' || f.type === 'tail' || f.type === 'cmd' || f.type === 'length') {
                    value = segBytes[0] !== undefined ? segBytes[0] : null;
                } else if (f.type === 'data') {
                    value = segBytes;
                } else if (f.type === 'crc') {
                    value = segBytes.length >= 2 ? (segBytes[0] | (segBytes[1] << 8)) : null;
                }
                sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                off += f.size;
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
            return { fields, sections };
        };
```

- [ ] **Step 2: 验证 2 个函数都存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m1=html.match(/NS\._parseFrameCtrlBit7\s*=\s*function[\s\S]*?\n\};/);
const m2=html.match(/NS\._parseFrameTypeHighBit\s*=\s*function[\s\S]*?\n\};/);
console.log('_parseFrameCtrlBit7:',m1?'YES':'NO','length:',m1?m1[0].length:0);
console.log('_parseFrameTypeHighBit:',m2?'YES':'NO','length:',m2?m2[0].length:0);
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 7**。

---

## Task 7: 加 NS._parseFrameMsgidMixed (kind 6)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseFrameMsgidMixed`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol` (含 fields, 5 行: msgID+length+data+crc+tail, 无 header)
- Produces: `{ fields, sections }` 或 `{ error: 'TOO_SHORT' }`

- [ ] **Step 1: 紧跟 Task 6 插入**

在 `NS._parseFrameTypeHighBit` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- _parseFrameMsgidMixed: kind 6 (15+7+8 packed msgID, 跟 _buildFrameMsgidMixed 对称) ---
        //   帧布局: msgID(2) + length(1) + data(N) + crc(2) + tail(1) = 6+N (无 header)
        //   最小帧 6 字节
        NS._parseFrameMsgidMixed = function (bytes, protocol) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 6) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            for (const f of protocol.fields) {
                const segBytes = bytes.slice(off, off + f.size);
                let value = null;
                if (f.type === 'msgID') {
                    // 2 字节 msgID (packed 15+7+8)
                    value = segBytes.length >= 2 ? (segBytes[0] << 8) | segBytes[1] : null;
                } else if (f.type === 'length' || f.type === 'tail' || f.type === 'cmd') {
                    value = segBytes[0] !== undefined ? segBytes[0] : null;
                } else if (f.type === 'data') {
                    value = segBytes;
                } else if (f.type === 'crc') {
                    value = segBytes.length >= 2 ? (segBytes[0] | (segBytes[1] << 8)) : null;
                }
                sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                off += f.size;
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
            return { fields, sections };
        };
```

- [ ] **Step 2: 验证函数存在 + msgID 2 字节大端**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseFrameMsgidMixed\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('TOO_SHORT threshold 6:',m[0].includes('bytes.length < 6')?'YES':'NO');
console.log('msgID reads 2 bytes BE:',m[0].includes('(segBytes[0] << 8) | segBytes[1]')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 8**。

---

## Task 8: 加 NS._parseFrameTlv (kind 7, TLV 段循环)

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseFrameTlv`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol` + `cmd` (含 tlvs 数组, 提供 TLV 段 type 标签)
- Produces: `{ fields, sections }` 或 `{ error: 'TOO_SHORT' | 'TLV_OVERFLOW' }`

- [ ] **Step 1: 紧跟 Task 7 插入**

在 `NS._parseFrameMsgidMixed` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- _parseFrameTlv: kind 7 (循环 TLV 段, 跟 _buildFrameTlv 对称) ---
        //   帧布局: header(1) + tlv 循环 (N 段, 每段 type+length+value) + crc(2) + tail(1)
        //   最小帧 5 字节 (header + 0 TLV 段 + 2 CRC + 1 tail)
        //   cmd.tlvs 数组提供 TLV 段 type 标签 (如 [{name: 'voltage'}, {name: 'current'}])
        NS._parseFrameTlv = function (bytes, protocol, cmd) {
            if (!bytes || !protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            if (bytes.length < 5) return { error: 'TOO_SHORT', fields: {}, sections: [] };
            const sections = [];
            let off = 0;
            const tlvs = (cmd && cmd.tlvs) || [];
            for (const f of protocol.fields) {
                if (f.type === 'header' || f.type === 'crc' || f.type === 'tail') {
                    const segBytes = bytes.slice(off, off + f.size);
                    let value = null;
                    if (f.type === 'crc' && segBytes.length >= 2) {
                        value = (segBytes[0] | (segBytes[1] << 8));
                    } else if (segBytes[0] !== undefined) {
                        value = segBytes[0];
                    }
                    sections.push({ type: f.type, name: f.name, bytes: segBytes, value });
                    off += f.size;
                } else if (f.type === 'data' && f.name === 'tlv') {
                    // 循环 TLV 段: 1B type + 1B length + N B value
                    let tlvIdx = 0;
                    while (off + 2 <= bytes.length) {
                        const tlvType = bytes[off];
                        const tlvLen = bytes[off + 1];
                        if (off + 2 + tlvLen > bytes.length) {
                            // TLV 段越界, 标记错误但继续读已成功的段
                            sections.push({ type: 'tlv-error', name: `tlv[${tlvIdx}]-overflow`, bytes: bytes.slice(off), value: null, error: 'TLV_OVERFLOW' });
                            break;
                        }
                        const tlvValue = bytes.slice(off + 2, off + 2 + tlvLen);
                        const tlvMeta = tlvs[tlvIdx] || {};
                        const tlvLabel = tlvMeta.name || `TLV ${tlvType.toString(16).toUpperCase().padStart(2, '0')}`;
                        sections.push({
                            type: 'tlv', name: `tlv[${tlvIdx}]`,
                            bytes: bytes.slice(off, off + 2 + tlvLen),
                            value: { type: tlvType, length: tlvLen, value: Array.from(tlvValue), label: tlvLabel }
                        });
                        off += 2 + tlvLen;
                        tlvIdx += 1;
                    }
                }
            }
            const fields = {};
            sections.forEach((s) => { if (s.value !== null && s.type !== 'tlv') fields[s.name] = s.value; });
            return { fields, sections };
        };
```

- [ ] **Step 2: 验证函数存在 + TLV 段循环**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseFrameTlv\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('TOO_SHORT threshold 5:',m[0].includes('bytes.length < 5')?'YES':'NO');
console.log('TLV loop:',m[0].includes('while (off + 2 <= bytes.length)')?'YES':'NO');
console.log('TLV_OVERFLOW error:',m[0].includes('TLV_OVERFLOW')?'YES':'NO');
console.log('uses cmd.tlvs:',m[0].includes('cmd.tlvs')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 9**。

---

## Task 9: 加 NS.parseFrame dispatcher

**Files:**
- Modify: `SerialCube.html` (新增 `NS.parseFrame`)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + `protocol` (含 kind 字段) + 可选 `cmd`
- Produces: 子函数结果 (8 kind switch) 或 `{ error: 'EMPTY_BYTES' | 'NO_PROTOCOL' | 'UNKNOWN_KIND' }`

- [ ] **Step 1: 紧跟 Task 8 插入**

在 `NS._parseFrameTlv` 函数结束 `};` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        // --- NS.parseFrame dispatcher (跟 NS.buildFrame 严格对称) ---
        //   bytes: Uint8Array
        //   protocol: PROTOCOL 对象 (含 kind, fields, ...)
        //   [cmd]: COMMANDS 对象 (TLV kind 需要, parse TLV 段循环)
        //   返 { fields, sections } 或 { error, ... }
        NS.parseFrame = function (bytes, protocol, cmd) {
            if (!bytes || bytes.length === 0) return { error: 'EMPTY_BYTES', fields: {}, sections: [] };
            if (!protocol) return { error: 'NO_PROTOCOL', fields: {}, sections: [] };
            const kind = protocol.kind || 'fixed-header';
            if (!NS._KIND_TEMPLATES[kind]) return { error: 'UNKNOWN_KIND', kind, fields: {}, sections: [] };
            switch (kind) {
                case 'fixed-header':  return NS._parseFrameFixedHeader(bytes, protocol);
                case 'raw':           return NS._parseFrameRaw(bytes, protocol);
                case 'cmd-split':     return NS._parseFrameCmdSplit(bytes, protocol);
                case 'addr-split':    return NS._parseFrameAddrSplit(bytes, protocol);
                case 'ctrl-bit7':     return NS._parseFrameCtrlBit7(bytes, protocol);
                case 'type-high-bit': return NS._parseFrameTypeHighBit(bytes, protocol);
                case 'msgid-mixed':   return NS._parseFrameMsgidMixed(bytes, protocol);
                case 'tlv':           return NS._parseFrameTlv(bytes, protocol, cmd);
            }
            return { error: 'UNKNOWN_KIND', kind, fields: {}, sections: [] };
        };
```

- [ ] **Step 2: 验证 dispatcher 存在 + 8 kind switch**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\.parseFrame\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
const cases=(m[0].match(/case\s+'(fixed-header|raw|cmd-split|addr-split|ctrl-bit7|type-high-bit|msgid-mixed|tlv)':/g)||[]);
console.log('switch cases:',cases.length,'expect 8');
console.log('cases:',cases.join(' / '));
"
```

Expected: `switch cases: 8` + 8 个 kind 字符串全列。

**不 commit,继续 Task 10**。

---

## Task 10: 加 NS._lastParseResult UI 临时状态

**Files:**
- Modify: `SerialCube.html` (新增 `NS._lastParseResult`)

**Interfaces:**
- Consumes: 无
- Produces: `NS._lastParseResult = { bytes, fields, sections, error, ts }` 临时对象

- [ ] **Step 1: 定位 `NS.activeProtoId` 位置**

在 SerialCube.html 搜 `NS.activeProtoId`,找到定义行 (line 7500 附近)。

- [ ] **Step 2: 紧跟其后插入**

在 `NS.activeProtoId` 定义行之后,新起一行,插入 (CRLF + 4 空格缩进):

```js
        NS._lastParseResult = null;  // 协议编辑器 "贴字节" 解析结果临时状态 (session-only, 不持久化)
```

- [ ] **Step 3: 验证状态存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._lastParseResult\s*=\s*null/);
console.log('_lastParseResult state:',m?'YES':'NO');
"
```

Expected: `_lastParseResult state: YES`。

**不 commit,继续 Task 11**。

---

## Task 11: 改 NS._parseAckFields 内部用 NS.parseFrame

**Files:**
- Modify: `SerialCube.html` (改 `NS._parseAckFields` line 11893,内部用 `NS.parseFrame`)

**Interfaces:**
- Consumes: `ackCmd` + `bytes` + `protoId` (跟现状一致)
- Produces: `{ fieldName: number }` 跟现状等价 (kind 0 行为不变)

- [ ] **Step 1: 定位 `_parseAckFields` 现状**

打开 `SerialCube.html`,搜 `NS._parseAckFields = function`,找到 line 11893。整段函数约 20 行。

- [ ] **Step 2: 整段替换为 dispatch 版本**

把整个 `NS._parseAckFields` 函数 (从 `NS._parseAckFields = function ...` 到 `};` 结束) **整段替换**为:

```js
        // 简单 ack bytes 解析 (按 ackCmd.dataFields 顺序切, 跳过 header/addr/cmd/length/crc/tail)
        //   v4.8d 改: 内部改用 NS.parseFrame (kind 0 行为不变, 现状 2 协议 BMS/Modbus 走 kind 0 兼容)
        //   返 { fieldName: number } — 直接整数值, 不做单位换算 (跟现状 encodeDataFields 一致)
        NS._parseAckFields = function (ackCmd, bytes, protoId) {
            const out = {};
            if (!ackCmd || !bytes || bytes.length < 5) return out;
            const proto = NS.PROTOCOLS.find((p) => p.id === protoId);
            if (!proto) return out;
            const result = NS.parseFrame(bytes, proto, ackCmd);
            if (result.error) return out;
            const dataSection = result.sections.find((s) => s.type === 'data' && s.name === 'tlv');
            const dataBytes = dataSection ? dataSection.bytes : (result.sections.find((s) => s.type === 'data') || {}).bytes;
            if (!dataBytes || !dataBytes.length) return out;
            const protoEndian = proto.byteOrder || 'BE';
            let off = 0;
            for (const fname of (ackCmd.dataFields || [])) {
                const df = NS.DATA_FIELDS.find((f) => f.name === fname);
                if (!df) continue;
                const size = NS._FIELD_BYTE_SIZE[df.type] || 2;
                if (off + size > dataBytes.length) break;
                const slice = dataBytes.slice(off, off + size);
                out[fname] = NS._bytesToNumber(slice, df.byteOrder || protoEndian, df.type);
                off += size;
            }
            return out;
        };
```

- [ ] **Step 3: 验证函数存在 + 调 NS.parseFrame**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\._parseAckFields\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('uses NS.parseFrame:',m[0].includes('NS.parseFrame(bytes, proto, ackCmd)')?'YES':'NO');
console.log('still iterates dataFields:',m[0].includes('ackCmd.dataFields')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 12**。

---

## Task 12: 改 NS.tryDispatchAckFrames 用 dispatch

**Files:**
- Modify: `SerialCube.html` (改 `NS.tryDispatchAckFrames` line 11960, 改用 NS.parseFrame + protocol.kind 决定 layout)

**Interfaces:**
- Consumes: `bytes` (Uint8Array) + 多 protocol 上下文
- Produces: `boolean` (handled) 跟现状等价, 但支持 8 kind

- [ ] **Step 1: 定位 `tryDispatchAckFrames` 现状**

打开 `SerialCube.html`,搜 `NS.tryDispatchAckFrames = function`,找到 line 11960。整段函数约 20 行。

- [ ] **Step 2: 整段替换为 dispatch 版本**

把整个 `NS.tryDispatchAckFrames` 函数 (从 `NS.tryDispatchAckFrames = function ...` 到 `};` 结束) **整段替换**为:

```js
        // v4.8d: 真串口 RX 接入 — 遍历 NS.PROTOCOLS, 按 protocol.kind 决定 frame layout, 调 NS.parseFrame 识别
        //   现状 2 协议 (BMS / Modbus) 走 kind 0 fixed-header, 行为兼容 v4.9.6 路径
        //   同 cmd 已 pending 时多次 ack: 由 _triggerAckHandler 内 waiter.delete 幂等保护
        NS.tryDispatchAckFrames = function (bytes) {
            if (!bytes || bytes.length < 5) return false;
            let handled = false;
            for (const proto of NS.PROTOCOLS) {
                const headerField = proto.fields.find((f) => f.type === 'header');
                if (!headerField) continue;
                const headerByte = NS.parseHexOr0(headerField.default) & 0xFF;
                let i = 0;
                while (i < bytes.length) {
                    if (bytes[i] !== headerByte) { i += 1; continue; }
                    const remaining = bytes.slice(i);
                    const cmd = NS.COMMANDS.find((c) => c.protocolId === proto.id);
                    const result = NS.parseFrame(remaining, proto, cmd);
                    if (result.error) { i += 1; continue; }
                    const cmdSection = result.sections.find((s) => s.type === 'cmd');
                    if (!cmdSection || cmdSection.value == null) { i += 1; continue; }
                    const cmdByte = cmdSection.value;
                    NS._triggerAckHandler(cmdByte, remaining);
                    handled = true;
                    // 跳到下一帧起点 (按 sections 总字节数, 避免死循环)
                    const frameLen = result.sections.reduce((sum, s) => sum + (s.bytes ? s.bytes.length : 0), 0);
                    i += frameLen || 1;
                }
            }
            return handled;
        };
```

- [ ] **Step 3: 验证函数存在 + 遍历 PROTOCOLS**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\.tryDispatchAckFrames\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('iterates NS.PROTOCOLS:',m[0].includes('for (const proto of NS.PROTOCOLS)')?'YES':'NO');
console.log('uses NS.parseFrame:',m[0].includes('NS.parseFrame(remaining, proto')?'YES':'NO');
console.log('finds cmd section:',m[0].includes('s.type === \\'cmd\\'')||m[0].includes('s.type === \"cmd\"')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 13**。

---

## Task 13: 改 NS.tryDispatchAsciiAckFrames 用 dispatch

**Files:**
- Modify: `SerialCube.html` (改 `NS.tryDispatchAsciiAckFrames` line 11995, 改用 NS.parseFrame)

**Interfaces:**
- Consumes: ASCII `bytes` + 多 protocol 上下文
- Produces: `boolean` (handled) 跟现状等价, 但支持 8 kind

- [ ] **Step 1: 定位 `tryDispatchAsciiAckFrames` 现状**

打开 `SerialCube.html`,搜 `NS.tryDispatchAsciiAckFrames = function`,找到 line 11995。

- [ ] **Step 2: 整段替换为 dispatch 版本**

把整个 `NS.tryDispatchAsciiAckFrames` 函数 (从 `NS.tryDispatchAsciiAckFrames = function ...` 到 `};` 结束) **整段替换**为:

```js
        // v4.8d: ASCII 帧解析分支 — 先 ASCII→bytes 转换, 再调通用 tryDispatchAckFrames
        //   现状 2 协议 (BMS / Modbus) 走 kind 0, 行为兼容 v4.9.8 路径
        //   ASCII 帧: "170,1,16,4,0,56,0,0,157,11,85\r\n" (11 数字 = 7+N, 跟 binary 路径对应)
        NS.tryDispatchAsciiAckFrames = function (bytes) {
            if (!bytes || bytes.length < 5) return false;
            // 1. bytes → ASCII string (UTF-8 严格解码, 非 UTF-8 拒绝)
            let str;
            try {
                str = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            } catch (e) {
                return false;
            }
            // 2. 找 \r\n 终止 (只解析第一个完整帧)
            const crlfIdx = str.indexOf('\r\n');
            if (crlfIdx < 0) return false;
            const line = str.substring(0, crlfIdx);
            // 3. 解析逗号分隔数字
            const parts = line.split(',');
            if (parts.length < 7) return false;
            const nums = parts.map((s) => parseInt(s.trim(), 10));
            if (nums.some((n) => isNaN(n))) return false;
            // 4. 转 binary bytes (跟 ASCII 数字 1:1)
            const binaryBytes = new Uint8Array(nums);
            // 5. 调通用 dispatch (现状 kind 0 行为兼容)
            return NS.tryDispatchAckFrames(binaryBytes);
        };
```

- [ ] **Step 3: 验证函数存在 + 调通用 dispatch**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const m=html.match(/NS\.tryDispatchAsciiAckFrames\s*=\s*function[\s\S]*?\n\};/);
if(!m){console.log('FAIL: not found');process.exit(1)}
console.log('function found, length:',m[0].length);
console.log('uses TextDecoder:',m[0].includes('TextDecoder')?'YES':'NO');
console.log('calls NS.tryDispatchAckFrames:',m[0].includes('NS.tryDispatchAckFrames(binaryBytes)')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 14**。

---

## Task 14: HTML — "贴字节" 输入区容器

**Files:**
- Modify: `SerialCube.html` (在协议编辑器 modal 内, 字节预览区下方加新容器)

**Interfaces:**
- Consumes: 无 (静态 HTML)
- Produces: 协议编辑器 modal 底部新加 `<div class="proto-parse-section">` 含 textarea + 按钮 + 解析结果区

- [ ] **Step 1: 定位协议编辑器 modal 字节预览区**

打开 `SerialCube.html`,搜 `proto-byte-preview` 或 `class="byte-preview`,找到字节预览区 HTML。在它**结束 `</div>` 之后**插入新容器。

- [ ] **Step 2: 插入 "贴字节" 输入区**

在字节预览区结束 `</div>` 行之后,新起一行,插入 (CRLF + 4 空格缩进):

```html
        <div class="proto-parse-section">
          <div class="proto-parse-title">反向解析 (parseFrame 验证)</div>
          <div class="proto-parse-input">
            <label>贴字节 (hex, 支持空格/0x/, 分隔):</label>
            <textarea class="proto-parse-textarea" placeholder="例如: AA 01 02 0A 0B 0C XX XX 55" rows="3"></textarea>
            <div class="proto-parse-actions">
              <button class="btn-parse">解析</button>
              <button class="btn-parse-clear">清空</button>
            </div>
          </div>
          <div class="proto-parse-result" id="proto-parse-result"></div>
        </div>
```

- [ ] **Step 3: 验证 HTML 存在**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
console.log('proto-parse-section:',html.includes('proto-parse-section')?'YES':'NO');
console.log('textarea:',html.includes('proto-parse-textarea')?'YES':'NO');
console.log('parse button:',html.includes('btn-parse')?'YES':'NO');
console.log('result area:',html.includes('proto-parse-result')?'YES':'NO');
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 15**。

---

## Task 15: JS — renderProtoEditor 加 "解析" 按钮事件 + 解析结果渲染

**Files:**
- Modify: `SerialCube.html` (在 `NS.renderProtoEditor` 函数体末尾, 字节预览渲染后加 parse 按钮事件 + 结果渲染)

**Interfaces:**
- Consumes: `protocol` (active) + `cmd` (第 1 个 COMMANDS) + `NS._lastParseResult` 状态
- Produces: 解析按钮事件绑 + 解析结果区内容渲染

- [ ] **Step 1: 定位 `renderProtoEditor` 函数末尾**

打开 `SerialCube.html`,搜 `NS.renderProtoEditor = function`,找到函数体。在函数**最后 `}` 之前**插入 parse 按钮事件 + 结果渲染代码。

- [ ] **Step 2: 在 `renderProtoEditor` 末尾插入 parse 事件**

在 `NS.renderProtoEditor` 函数体**最末尾** (其他渲染完成, 但 `}` 函数结束前),新起一行,插入 (CRLF + 4 空格缩进):

```js
            // "反向解析" 按钮事件 (v4.8d)
            const parseBtn = protoEditorEl.querySelector('.btn-parse');
            if (parseBtn) {
                parseBtn.addEventListener('click', () => {
                    const ta = protoEditorEl.querySelector('.proto-parse-textarea');
                    const resultEl = protoEditorEl.querySelector('.proto-parse-result');
                    if (!ta || !resultEl) return;
                    const text = ta.value.trim();
                    if (!text) {
                        resultEl.innerHTML = '<div class="parse-row error">字节不能为空</div>';
                        NS._lastParseResult = null;
                        return;
                    }
                    const bytes = NS._parseHexString(text);
                    if (!bytes) {
                        resultEl.innerHTML = '<div class="parse-row error">字节格式错误 (含非 hex 字符)</div>';
                        NS._lastParseResult = null;
                        return;
                    }
                    const cmd = NS.COMMANDS.find((c) => c.protocolId === proto.id) || NS.COMMANDS[0];
                    const result = NS.parseFrame(bytes, proto, cmd);
                    NS._lastParseResult = { bytes, ...result, ts: Date.now() };
                    if (result.error) {
                        resultEl.innerHTML = `<div class="parse-row error">${result.error}${result.error === 'TOO_SHORT' ? ` (字节数 ${bytes.length}, 至少需要 ${proto.kind === 'addr-split' ? 9 : (proto.kind === 'ctrl-bit7' || proto.kind === 'type-high-bit' ? 8 : (proto.kind === 'msgid-mixed' ? 6 : (proto.kind === 'tlv' ? 5 : 7)))})` : ''}</div>`;
                        return;
                    }
                    // 渲染 sections
                    const rows = result.sections.map((s) => {
                        const hex = s.bytes ? Array.from(s.bytes).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ') : '';
                        let valStr;
                        if (s.type === 'tlv' && s.value) {
                            valStr = `type: 0x${s.value.type.toString(16).padStart(2, '0').toUpperCase()}, length: ${s.value.length}, value: ${s.value.value.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')} (${s.value.label})`;
                        } else if (typeof s.value === 'number') {
                            valStr = `0x${s.value.toString(16).toUpperCase()} (${s.value})`;
                        } else if (s.value instanceof Uint8Array) {
                            valStr = `[${Array.from(s.value).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}] (${s.value.length}B)`;
                        } else {
                            valStr = '—';
                        }
                        return `<div class="parse-row"><span class="parse-name">${s.name}</span><span class="parse-type">${s.type}</span><span class="parse-bytes">${hex}</span><span class="parse-value">${valStr}</span></div>`;
                    });
                    resultEl.innerHTML = rows.join('');
                });
            }
            const parseClearBtn = protoEditorEl.querySelector('.btn-parse-clear');
            if (parseClearBtn) {
                parseClearBtn.addEventListener('click', () => {
                    const ta = protoEditorEl.querySelector('.proto-parse-textarea');
                    const resultEl = protoEditorEl.querySelector('.proto-parse-result');
                    if (ta) ta.value = '';
                    if (resultEl) resultEl.innerHTML = '';
                    NS._lastParseResult = null;
                });
            }
```

- [ ] **Step 3: 验证 parse 事件存在 + 调 NS.parseFrame**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
console.log('parse button event:',html.includes('class=\\\"btn-parse\\\".addEventListener')||html.includes('class=\\\"btn-parse\\\")')?'CHECK';
const m=html.match(/parseBtn\.addEventListener\(\s*'click'/);
console.log('parse click event:',m?'YES':'NO');
const m2=html.match(/NS\.parseFrame\(\s*bytes,\s*proto,\s*cmd\s*\)/);
console.log('parseFrame called in handler:',m2?'YES':'NO');
const m3=html.match(/parseClearBtn\.addEventListener/);
console.log('clear button event:',m3?'YES':'NO');
"
```

Expected: 全部 `YES` (CHECK 项手动 grep 确认 `class="btn-parse"` 存在)。

**不 commit,继续 Task 16**。

---

## Task 16: CSS — 贴字节输入区 + 解析结果样式

**Files:**
- Modify: `SerialCube.html` (CSS 段新增, 紧跟现有 .proto-byte-preview CSS 之后)

**Interfaces:**
- Consumes: `.proto-parse-section` + `.proto-parse-textarea` + `.parse-row` 等 (Task 14 HTML + Task 15 JS)
- Produces: 跟现有 UI 风格一致的样式

- [ ] **Step 1: 定位 CSS 插入点**

在 `SerialCube.html` 搜 `.proto-byte-preview` 或 `.byte-group` CSS 段,确保新样式不冲突。

- [ ] **Step 2: 在其后插入新 CSS**

紧跟现有 `.byte-group` / `.byte-preview` CSS 之后,新起一行,插入 (CRLF + 4 空格缩进):

```css
    /* v4.8d: 协议编辑器 "贴字节" 输入区 */
    .proto-parse-section {
      margin-top: 12px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-subtle);
    }
    .proto-parse-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 6px;
    }
    .proto-parse-input label {
      display: block;
      font-size: 11px;
      color: var(--text-soft);
      margin-bottom: 4px;
    }
    .proto-parse-textarea {
      width: 100%;
      min-height: 60px;
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 12px;
      background: var(--bg);
      color: var(--text);
      resize: vertical;
      box-sizing: border-box;
    }
    .proto-parse-textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-soft);
    }
    .proto-parse-actions {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    .proto-parse-actions button {
      padding: 4px 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--bg);
      color: var(--text);
      font-size: 12px;
      cursor: pointer;
    }
    .proto-parse-actions .btn-parse {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .proto-parse-actions .btn-parse:hover {
      background: var(--accent-strong);
    }
    .proto-parse-result {
      margin-top: 8px;
      max-height: 240px;
      overflow-y: auto;
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .parse-row {
      display: flex;
      gap: 8px;
      padding: 3px 6px;
      border-bottom: 1px solid var(--border);
      align-items: center;
    }
    .parse-row:last-child { border-bottom: none; }
    .parse-row .parse-name { font-weight: 700; min-width: 60px; color: var(--text); }
    .parse-row .parse-type { min-width: 50px; color: var(--text-soft); font-size: 10px; text-transform: uppercase; }
    .parse-row .parse-bytes { min-width: 100px; color: var(--accent-strong); }
    .parse-row .parse-value { color: var(--text); flex: 1; }
    .parse-row.error {
      color: var(--danger);
      font-weight: 700;
      background: rgba(224, 87, 94, 0.08);
      border-radius: 3px;
      padding: 6px 8px;
    }
```

- [ ] **Step 3: 验证 CSS 存在 + 关键 class**

打开 PowerShell,运行:

```powershell
node -e "
const fs=require('fs');
const html=fs.readFileSync('D:\WorkSpace\SerialCubeWeb\SerialCube.html','utf8');
const checks=['.proto-parse-section','.proto-parse-textarea','.parse-row','.parse-row.error','.proto-parse-result'];
checks.forEach((c) => console.log(c+':',html.includes(c)?'YES':'NO'));
"
```

Expected: 全部 `YES`。

**不 commit,继续 Task 17**。

---

## Task 17: syntax check 全部改动 (PowerShell 临时脚本)

**Files:**
- Read-only: `SerialCube.html` (累计 16 个 task 改完)

- [ ] **Step 1: 写 syntax check 脚本**

打开 PowerShell,运行:

```powershell
@'
$ErrorActionPreference = 'Stop'
$html = Get-Content -Path 'D:\WorkSpace\SerialCubeWeb\SerialCube.html' -Raw -Encoding UTF8

# Block 1: _parseHexString
$b1 = $html -match 'NS\._parseHexString\s*=\s*function[\s\S]*?new Uint8Array'
Write-Host "Block1 _parseHexString: $b1"

# Block 2-9: 8 _parseFrameXxx 子函数
$b2 = $html -match 'NS\._parseFrameFixedHeader\s*=\s*function'
$b3 = $html -match 'NS\._parseFrameRaw\s*=\s*function'
$b4 = $html -match 'NS\._parseFrameCmdSplit\s*=\s*function'
$b5 = $html -match 'NS\._parseFrameAddrSplit\s*=\s*function'
$b6 = $html -match 'NS\._parseFrameCtrlBit7\s*=\s*function'
$b7 = $html -match 'NS\._parseFrameTypeHighBit\s*=\s*function'
$b8 = $html -match 'NS\._parseFrameMsgidMixed\s*=\s*function'
$b9 = $html -match 'NS\._parseFrameTlv\s*=\s*function'
Write-Host "Block2 _parseFrameFixedHeader: $b2"
Write-Host "Block3 _parseFrameRaw: $b3"
Write-Host "Block4 _parseFrameCmdSplit: $b4"
Write-Host "Block5 _parseFrameAddrSplit: $b5"
Write-Host "Block6 _parseFrameCtrlBit7: $b6"
Write-Host "Block7 _parseFrameTypeHighBit: $b7"
Write-Host "Block8 _parseFrameMsgidMixed: $b8"
Write-Host "Block9 _parseFrameTlv: $b9"

# Block 10: dispatcher
$b10 = ([regex]::Matches($html, "case '(fixed-header|raw|cmd-split|addr-split|ctrl-bit7|type-high-bit|msgid-mixed|tlv)':\s*return NS\._parseFrame")).Count
Write-Host "Block10 dispatcher cases: $b10 (expect 8)"

# Block 11: _lastParseResult
$b11 = $html -match 'NS\._lastParseResult\s*=\s*null'
Write-Host "Block11 _lastParseResult: $b11"

# Block 12: _parseAckFields 改用 dispatch
$b12 = $html -match "NS\._parseAckFields[\s\S]*?NS\.parseFrame\(bytes, proto, ackCmd\)"
Write-Host "Block12 _parseAckFields uses parseFrame: $b12"

# Block 13: tryDispatchAckFrames 改用 dispatch
$b13 = $html -match "NS\.tryDispatchAckFrames[\s\S]*?for \(const proto of NS\.PROTOCOLS\)"
Write-Host "Block13 tryDispatchAckFrames iterates PROTOCOLS: $b13"

# Block 14: tryDispatchAsciiAckFrames 改用通用 dispatch
$b14 = $html -match "NS\.tryDispatchAsciiAckFrames[\s\S]*?NS\.tryDispatchAckFrames\(binaryBytes\)"
Write-Host "Block14 tryDispatchAsciiAckFrames uses dispatch: $b14"

# Block 15: HTML
$b15a = $html -match 'class="proto-parse-section"'
$b15b = $html -match 'class="proto-parse-textarea"'
$b15c = $html -match 'class="btn-parse"'
Write-Host "Block15 HTML section: $b15a / textarea: $b15b / button: $b15c"

# Block 16: parse 事件
$b16a = $html -match "parseBtn\.addEventListener\(\s*'click'"
$b16b = $html -match "parseClearBtn\.addEventListener"
Write-Host "Block16 parse event: $b16a / clear event: $b16b"

# Block 17: CSS
$b17 = ([regex]::Matches($html, '\.(proto-parse-section|proto-parse-textarea|parse-row|parse-row\.error|proto-parse-result)\s*\{')).Count
Write-Host "Block17 CSS classes: $b17 (expect 5)"

# Total
$total = ($b1,$b2,$b3,$b4,$b5,$b6,$b7,$b8,$b9,$b11,$b12,$b13,$b14,$b15a,$b15b,$b15c,$b16a,$b16b | Where-Object {$_}).Count
$b10ok = $b10 -eq 8
$b17ok = $b17 -ge 5
Write-Host "---"
Write-Host "Total OK: $total / 18 (Block10 dispatcher: $b10ok, Block17 CSS: $b17ok)"
if ($total -eq 18 -and $b10ok -and $b17ok) { Write-Host "ALL OK" } else { Write-Host "FAIL" }
'@ | Out-File -FilePath C:\Users\Administrator\AppData\Local\Temp\syntax_check_v48d.ps1 -Encoding UTF8
```

- [ ] **Step 2: 运行 syntax check**

```powershell
C:\Users\Administrator\AppData\Local\Temp\syntax_check_v48d.ps1
```

Expected: `Total OK: 18 / 18` + `Block10 dispatcher: True` + `Block17 CSS: True` + `ALL OK`。如失败,根据 FAIL 的 block 修复,重跑。

**不 commit,继续 Task 18**。

---

## Task 18: 浏览器手动 smoke test (12 项) + 整体 commit + push

**Files:** 无 (verify-only) + Modified: `SerialCube.html` (最终 commit)

- [ ] **Step 1: 浏览器手动 smoke test (12 项)**

打开浏览器,加载 `file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html`,按以下顺序验证:

1. **页面正常加载,无 console 报错**: 0 error
2. **打开协议编辑器,看到 2 个 legacy tab + kind 下拉 + 字节预览**: 跟 v4.8c 一致
3. **协议编辑器底部新加 "反向解析" 输入区**: 含 textarea + 解析按钮 + 清空按钮 + 解析结果区
4. **kind 切到 "0 · fixed-header" + 贴 12B hex 解析 OK**:
   - 贴 `AA 01 02 0A 0B 0C 02 02 0D 0E XX XX 55`(12B, header/addr/cmd/length/data/crc/tail)
   - 预期: 解析结果区显示 6 行, header=0xAA, cmd=0x02, length=0x02, data=[0A 0B 0C 02 02 0D 0E] (7B), crc=0xXXXX (2B 未校验), tail=0x55
5. **kind 切到 "3 · addr-split" + 贴 14B hex 解析 OK**:
   - 贴 `AA 01 02 03 04 0A 0B 0C 02 02 0D 0E XX XX 55`(14B, 多 srcAddr+dstAddr 2B)
   - 预期: 解析结果区显示 8 行, srcAddr=0x01, dstAddr=0x02, cmd=0x04
6. **kind 切到 "7 · tlv" + 贴 14B hex 解析 OK**:
   - 贴 `AA 01 02 0A 0B 0C 02 02 0D 0E XX XX 55`(14B, 2 段 TLV)
   - 预期: 解析结果区显示 4 行 (header + tlv[0] + tlv[1] + crc + tail), tlv[0]={type:0x01, length:0x02, value:0A 0B, label:TLV 01}, tlv[1]={type:0x02, length:0x02, value:0D 0E, label:TLV 02}
7. **字节太短 (3B) → TOO_SHORT 错误**:
   - 贴 `AA 01 02` → 解析结果区红字 "TOO_SHORT (字节数 3, 至少需要 7)"
8. **字节格式错 → 错误提示**:
   - 贴 `AA ZZ 01 02`(含非 hex 字符) → 红字 "字节格式错误 (含非 hex 字符)"
9. **空字节 → 错误提示**:
   - 空 textarea 点解析 → 红字 "字节不能为空"
10. **清空按钮 OK**: 解析后点清空 → textarea 空 + 解析结果区空
11. **现状 2 协议 (BMS / Modbus) 真串口 RX 行为不变**: 配合设备发 0xAA 起始 0x90/0x91 ack 帧,trigger ack 正常工作 (v4.9.6 路径)
12. **重新打开 modal 贴字节为空 (D6 不持久化)**: 关 modal 再开,textarea 空,解析结果区空

如**任一 Step 失败**, 回到对应 Task 修复,**不 commit**, 重新跑 smoke test。

- [ ] **Step 2: 写 commit message 文件**

打开 PowerShell:

```powershell
@'
v4.8d parseFrame 通用化 + 贴字节输入: 8 kind 子函数 + dispatcher + UI 闭环

背景
v4.8 sub-1/sub-2/sub-c 已完成 buildFrame 方向 (8 kind 子函数 + dispatcher +
协议编辑器验证按钮 + 字节预览按段着色), 但 parseFrame 方向还停在 1 个 kind:
- NS._parseAckFields (line 11893) 只识别 proto_bms kind=0 fixed-header
- NS.tryDispatchAckFrames / tryDispatchAsciiAckFrames hardcoded 0xAA / cmd
  offset 2 / length offset 3 / 0x55 tail, 8 kind 中只有 kind 0 能工作
- 协议编辑器没有 "贴字节反解析" 入口

本 commit 收尾 v4.8 协议栈最后一块拼图:

1. parseFrame 通用化 (8 kind 子函数 + dispatcher, 跟 buildFrame 严格对称)
2. 协议编辑器 "贴字节" 输入区 (textarea + 解析按钮 + 解析结果 sections)
3. _parseAckFields / tryDispatchAckFrames / tryDispatchAsciiAckFrames 内部
   改用通用 dispatch (按 protocol.kind 决定 frame layout)
4. 加 NS._parseHexString 工具 (空格/0x/, 分隔归一化)
5. 现状 2 协议 (BMS / Modbus) 走 kind 0 兼容 (行为不变)

范围
- 加 NS._parseHexString (hex 字符串归一化, 4 种格式)
- 加 NS._parseFrameXxx (8 个子函数, 跟 _buildFrameXxx 对称)
- 加 NS.parseFrame dispatcher (8 kind switch)
- 加 NS._lastParseResult UI 临时状态 (session-only, 不持久化)
- 改 NS._parseAckFields 内部用 NS.parseFrame (kind 0 行为兼容)
- 改 NS.tryDispatchAckFrames 遍历 NS.PROTOCOLS + parseFrame
- 改 NS.tryDispatchAsciiAckFrames 内部转 binary + 调通用 dispatch
- 协议编辑器 modal 底部加 "贴字节" 输入区 HTML
- renderProtoEditor 末尾加 parse/clear 按钮事件 + 解析结果渲染
- 加 CSS: .proto-parse-section / .proto-parse-textarea / .parse-row.error

保留 (不动)
- NS._KIND_TEMPLATES, NS._KIND_FIELD_TEMPLATES (sub-1/sub-2 加)
- NS._buildFrameXxx (8 个, sub-1 加) — buildFrame 内核稳定
- NS.buildFrame dispatcher (sub-1)
- 协议编辑器 modal 容器 + kind 下拉 + fields 列表 + locked 灰显 + 字节预览
  按段着色 (sub-2 加)
- AGENTS.md §2 数据兼容性字段 (localStorage keys, SerialWebUserConfig v1,
  WSLBIN1 magic, API 路径, __serialWeb* 命名)

验证
- node --check 全部 script blocks: PASS (0 syntax error)
- 18 项 regex check: 18/18 ALL OK
- 8 kind 帧布局对齐 _buildFrameXxx (7+N / 9+N / 8+N / 6+N / 5+ΣTLV)
- 浏览器 smoke test 12 项: kind 0/3/7 各贴一段 hex 解析 OK; 字节太短/格式
  错/空字节 都正确报错; 清空按钮 OK; 现状 2 协议真串口 RX 行为不变; 重新
  打开 modal 贴字节为空 (D6 不持久化)
- 1 阶段 commit, 不拆 a/b (spec §8.2 明确)

spec: docs/superpowers/specs/2026-08-06-v48d-sub3-parse-frame-design.md (e27eb94)
plan: docs/superpowers/plans/2026-08-06-v48d-sub3-impl-plan.md (本文件)
'@ | Out-File -FilePath C:\Users\Administrator\AppData\Local\Temp\commit_v48d.txt -Encoding UTF8
```

- [ ] **Step 3: git add + commit**

```powershell
cd D:\WorkSpace\SerialCubeWeb
git add SerialCube.html
git status --short
git commit -F C:\Users\Administrator\AppData\Local\Temp\commit_v48d.txt
```

Expected: `[main <hash>] v4.8d ...` + 1 file changed + 大量 insertions。

- [ ] **Step 4: git push**

```powershell
git push origin main
```

Expected: `.. main -> main` (1 commit push 成功)。**如 SSH 22 端口 connection reset,告诉用户本地 commit 准备好,等他手动 push。**

- [ ] **Step 5: 告知用户完成**

```
v4.8d 完成 ✅
- Commit: <hash> (1 个 commit)
- 改动: SerialCube.html (1 文件,大量插入)
- 验证: 18 项 syntax check + 12 项浏览器 smoke test 全部通过
- 现状 2 协议兼容: BMS / Modbus 走 kind 0 (行为不变)
- 8 kind 都能 parseFrame (跟 buildFrame 严格对称)
- 协议编辑器底部新加 "贴字节" 输入区 + 解析结果

接下来:
- 推 GitHub Pages 验证 (1-2 min)
- sub-4: 字段类型扩展 (int8/int16/float32/string, 大小端, 位域)
- 现有功能打磨 (预设发送 / 时间线性能 / 图表交互)
```

---

## Self-Review

**1. Spec coverage** — 18 tasks 覆盖 spec 9 节:
- §1.3 目标 1 (parseFrame 通用化): Task 2-9
- §1.3 目标 2 (贴字节输入): Task 14-16
- §1.3 目标 3 (dispatch 集成): Task 11-13
- §1.3 目标 4 (_parseAckFields 改用 dispatch): Task 11
- §3.1 dispatcher: Task 9
- §3.2 帧布局对照表: Task 2-8 (8 kind 子函数实现)
- §3.3 通用解析骨架: Task 2 (kind 0 模板, 其他 kind 套用)
- §3.4 TLV 段循环: Task 8
- §4 UI 集成: Task 14-16
- §5 集成现有 dispatch: Task 11-13
- §6 错误处理: Task 2-9 (各子函数返 error 字段) + Task 15 (UI 红框)
- §7 兼容性: Global Constraints 列出
- §8 commit 策略: Task 18

**2. Placeholder scan** — 无 "TBD" / "TODO" / "实现时定" / "fill in details" / "Add appropriate" / "类似 Task N"。所有 step 有实际代码/命令/可执行内容。

**3. Type consistency** —
- `NS._parseHexString` (Task 1) → `NS._parseFrameXxx` 消费 (Task 2-8) ✓
- `NS._parseFrameXxx` 8 子函数 (Task 2-8) → `NS.parseFrame` dispatcher 消费 (Task 9) ✓
- `NS.parseFrame` (Task 9) → `_parseAckFields` 消费 (Task 11) ✓
- `NS.parseFrame` (Task 9) → `tryDispatchAckFrames` 消费 (Task 12) ✓
- `NS.parseFrame` (Task 9) → `tryDispatchAsciiAckFrames` 间接消费 (Task 13, 通过 tryDispatchAckFrames) ✓
- `NS.parseFrame` (Task 9) → 协议编辑器解析按钮消费 (Task 15) ✓
- `.proto-parse-section` (Task 14 HTML) → Task 16 CSS 消费 ✓
- `btn-parse` / `btn-parse-clear` (Task 14 HTML) → Task 15 事件消费 ✓
- `parse-row.error` (Task 16 CSS) → Task 15 JS 错误渲染消费 ✓

如有冲突或缺口,已 inline 修复。Self-review 通过。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-v48d-sub3-impl-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration. Use superpowers:subagent-driven-development.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

(本项目特性: 单文件 HTML + 改动集中 + token 敏感, 推荐 **Subagent-Driven** — 每个 task 上下文隔离, 避免主 session 烧太多 token。但如果想快速过一遍看效果, **Inline Execution** 也可以。)
