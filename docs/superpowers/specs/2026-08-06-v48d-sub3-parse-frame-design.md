# v4.8d 协议编辑器 — Sub-3: parseFrame 通用化 + 贴字节输入

**日期**: 2026-08-06
**作者**: yubiediu826 + Mavis
**状态**: 待 review
**范围**: v4.8 sub-3 (parseFrame 通用化 + 协议编辑器"贴字节"输入)
**前置 commit**:
- `6743873 spec: v4.8 sub-1 TLV 协议重构设计文档` (数据模型 + buildFrame 内核)
- `7ffc49f spec: v4.8 sub-2 协议编辑器 UI 重构设计文档` (UI 重构 + kind 下拉)
- `2d36003 v4.8c 协议编辑器 UI 重构: kind 下拉 + locked 灰显 + + 新建 modal`
- `3981f29 v4.8b kind 1-7 真实实现` (7 个 buildFrame 子函数)

**后续 sub**:
- sub-4: cmd 字段映射重构 (dataSize 自动算) + 字段类型扩展 (int8/int16/float32/string,大小端,位域)
- (注: sub-4 部分内容已通过 v4.9.1 + v4.9.6 实现,见 §1.3 重新对齐)

---

## 1. Overview

### 1.1 背景

v4.8 sub-1/sub-2/sub-c 已经把 **buildFrame 方向**做齐了:
- 8 kind 模板 (`NS._KIND_TEMPLATES`)
- 8 个 `_buildFrameXxx` 子函数 (line 11609-11883)
- dispatcher `NS.buildFrame(protocol, cmd)` (line 11651)
- 协议编辑器 "验证" 按钮 (sub-1) 调 buildFrame,字节预览按段着色 (sub-2)

但 **parseFrame 方向** 还停在 1 个 kind:
- `NS._parseAckFields` (line 11893) **只识别 proto_bms kind=0 fixed-header**
- 注释自承: "完整 parseFrame 留后续 sub-2 重构" (实际路线改成 sub-3)
- `NS.tryDispatchAckFrames` (line 11960) 只扫 `0xAA` 起始,proto_bms 帧布局 `header+addr+cmd+length+data+crc+tail`
- `NS.tryDispatchAsciiAckFrames` (line 11995) 同上,只 kind 0

### 1.2 当前痛点

1. **协议编辑器切到非 fixed-header kind** → 字节预览**只有"生成方向"** (build 验证 OK),**没有"验证方向"** (parse 验证)
2. **真串口 RX** → 设备发非 kind 0 帧 (比如 kind 4 ctrl-bit7) **完全被 tryDispatchAckFrames 忽略**,waiter 永远 pending,直到 30s 超时
3. **协议编辑器** 没有任何 "贴字节反解析" 入口,用户想验一段抓到的字节**只能靠肉眼对** buildFrame 生成的 hex

### 1.3 目标

1. **parseFrame 通用化** — 8 kind 都有 `_parseFrameXxx` 子函数 + dispatcher `NS.parseFrame(bytes, protocol, [cmd])`,跟 buildFrame 完全对称
2. **`tryDispatchAckFrames` / `tryDispatchAsciiAckFrames` 通用化** — 按 `protocol.kind` 决定 frame layout,8 kind 都能识别
3. **协议编辑器"贴字节"输入框** — modal 底部加 textarea,接受 hex 字符串 (空格/`0x`/`,` 分隔皆可),实时 parse 回显每个 field name + value + bytes 段
4. **`_parseAckFields` 改用通用 parseFrame** — 删掉 hardcoded `bytes.slice(4, 4+dataLen)` 那种 kind 0 专属逻辑,统一走 dispatcher

### 1.4 非目标 (留后续 sub / 后续版本)

| 项 | 留到 |
|---|---|
| 字段类型扩展 (int8/int16/float32/string,大小端,位域) | sub-4 |
| pair trigger 真实发送扩展 (多 cmd 链) | sub-4 |
| `parseFrame` CRC 严格校验 (v4.9.6 注释说"暂不校验,影响业务") | v4.8.x+ |
| parse 结果直接喂给 `cmd.currentVals` (自动 ack → dashboard 联动) | v4.8.x+ |
| 解析失败帧的统计 / 错误日志 (parse error rate) | v4.8.x+ |
| 多协议并行 (同设备多协议) | v5+ |

### 1.5 关键设计决策

- **D1**: parseFrame dispatcher 跟 buildFrame 严格对称,同样的 8 kind switch case,签名 `parseFrame(bytes, protocol, [cmd])` 返 `{ fields: { [name]: value }, sections: [{type, name, bytes}], error?: string }`
- **D2**: 协议编辑器"贴字节"输入框 = **底部新加一行**,**不改** kind 下拉 / fields 列表 / 字节预览现有 UI;独立"反向解析"按钮触发
- **D3**: parseFrame 不重算 CRC — buildFrame 算 CRC 写出去,parseFrame 读 CRC bytes 但**不校验**(跟 v4.9.6 一致,避免误杀),CRC 字段只读取原值
- **D4**: TLV kind parse 时,**循环解析 TLV 段** (cmd.tlvs 数组,每段 {type, length, value: bytes[]}) — 跟 buildFrame 对称
- **D5**: `tryDispatchAckFrames` 改用 dispatch 后,**不删 0xAA 起始扫描**(绝大多数 kind header 是固定字节),但**新增按 protocol.kind 决定 frame layout** 的统一入口
- **D6**: 协议编辑器"贴字节"输入**不写入**任何持久化 (不放 localStorage,不进 user config),纯 session-only 工具

---

## 2. 现状分析

### 2.1 NS._parseAckFields (line 11893,kind 0 only)

```js
// 现状: hardcoded kind 0 帧布局 header(1) + addr(1) + cmd(1) + length(1) + data(N) + crc(2) + tail(1)
NS._parseAckFields = function (ackCmd, bytes, protoId) {
  const out = {};
  if (!ackCmd || !bytes || bytes.length < 7) return out;
  const proto = NS.PROTOCOLS.find((p) => p.id === protoId);
  const protoEndian = (proto && proto.byteOrder) || 'BE';
  const dataLen = bytes.length - 7;  // ❌ hardcoded 7
  const data = bytes.slice(4, 4 + dataLen);  // ❌ hardcoded offset 4
  let off = 0;
  for (const fname of (ackCmd.dataFields || [])) {
    const df = NS.DATA_FIELDS.find((f) => f.name === fname);
    if (!df) continue;
    const size = NS._FIELD_BYTE_SIZE[df.type] || 2;
    if (off + size > data.length) break;
    const slice = data.slice(off, off + size);
    out[fname] = NS._bytesToNumber(slice, df.byteOrder || protoEndian, df.type);
    off += size;
  }
  return out;
};
```

**问题**:
- `bytes.length - 7` ❌ kind 0 专属,其他 kind 帧长度不一样 (kind 4 ctrl-bit7 多 ctrl 字节,kind 3 addr-split 多 srcAddr+dstAddr 字节)
- `bytes.slice(4, 4 + dataLen)` ❌ 假设 data 段在 offset 4,kind 1 raw 的 data 在 offset 3,kind 7 tlv 更复杂 (data 在 header+tlv 之间)
- 切 fields 时只按 `ackCmd.dataFields`,**不解析 header/addr/cmd/length/crc/tail** 字段,parse 结果没 sections 信息,UI 无法按段着色

### 2.2 NS.tryDispatchAckFrames (line 11960,kind 0 only)

```js
// 现状: 只扫 0xAA 起始, 只认 proto_bms 帧布局
NS.tryDispatchAckFrames = function (bytes) {
  if (!bytes || bytes.length < 7) return false;
  let i = 0, handled = false;
  while (i < bytes.length - 6) {
    if (bytes[i] !== 0xAA) { i += 1; continue; }  // ❌ hardcoded 0xAA
    const cmd = bytes[i + 2];  // ❌ hardcoded cmd 在 offset 2
    if (cmd !== 0x90 && cmd !== 0x91) { i += 1; continue; }
    const length = bytes[i + 3];  // ❌ hardcoded length 在 offset 3
    const totalLen = 4 + length + 2 + 1;  // ❌ hardcoded
    if (i + totalLen > bytes.length) { i += 1; continue; }
    const tail = bytes[i + totalLen - 1];
    if (tail !== 0x55) { i += 1; continue; }  // ❌ hardcoded 0x55
    const frame = bytes.slice(i, i + totalLen);
    NS._triggerAckHandler(cmd, frame);
    handled = true;
    i += totalLen;
  }
  return handled;
};
```

**问题**:
- 起始字节 0xAA、cmd offset 2、length offset 3、tail 0x55 都 hardcoded
- **kind 4 ctrl-bit7** 起始 0xAA, cmd 在 offset 3 (header+ctrl+cmd),不工作
- **kind 1 raw** 起始 0x5A (tx) / 0x55 (rx),0xAA 扫描**永远不命中**
- **kind 3 addr-split** 起始 0xAA, srcAddr/dstAddr 占了 2 字节,cmd 在 offset 3,不工作

### 2.3 NS.tryDispatchAsciiAckFrames (line 11995,kind 0 only)

跟 tryDispatchAckFrames 类似,只认 11 数字 (7+N) 格式 (header+addr+cmd+len+data+crc+tail)。

### 2.4 NS._buildFrameXxx (line 11609-11883,8 kind 已实现)

8 个子函数 + 1 dispatcher,完整可参考:
- `_buildFrameFixedHeader` (line 11609) — kind 0
- `_buildFrameRaw` (line 11675) — kind 1
- `_buildFrameCmdSplit` (line 11696) — kind 2
- `_buildFrameAddrSplit` (line 11719) — kind 3
- `_buildFrameCtrlBit7` (line 11746) — kind 4
- `_buildFrameTypeHighBit` (line 11771) — kind 5
- `_buildFrameMsgidMixed` (line 11796) — kind 6
- `_buildFrameTlv` (line 11823) — kind 7
- `buildFrame` dispatcher (line 11651) — switch on kind

**parseFrame 直接对称实现即可**。

---

## 3. 8 kind parseFrame 设计

### 3.1 公共接口

```js
// NS.parseFrame — 跟 NS.buildFrame 完全对称
//   bytes: Uint8Array
//   protocol: PROTOCOL 对象 (含 kind, fields, crcType, byteOrder, ...)
//   [cmd]: COMMANDS 对象 (TLV kind 需要,parse TLV 段循环)
//   返 { fields: { [fieldName]: value }, sections: [{type, name, bytes, value?}], error?: string }
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

### 3.2 8 kind 帧布局对照表

| kind | header | 中间字段 | length | data | crc | tail | 最小帧 |
|------|--------|----------|--------|------|-----|------|--------|
| 0 fixed-header | 1B header (固定 0xAA) | cmd (1B) | 1B | N B | 2B | 1B 0x55 | 7+N |
| 1 raw | 1B header (MB 0x5A / CB 0x55) | cmd (1B) | 1B | N B | 2B | 1B 0x55 | 7+N |
| 2 cmd-split | 1B header (0xAA) | cmd (1B, bit7 方向) | 1B | N B | 2B | 1B 0x55 | 7+N |
| 3 addr-split | 1B header (0xAA) | srcAddr + dstAddr + cmd (3B) | 1B | N B | 2B | 1B 0x55 | 9+N |
| 4 ctrl-bit7 | 1B header (0xAA) | ctrl (1B, bit7 方向) + cmd (1B) | 1B | N B | 2B | 1B 0x55 | 8+N |
| 5 type-high-bit | 1B header (0xAA) | type (1B, bit7 方向) + cmd (1B) | 1B | N B | 2B | 1B 0x55 | 8+N |
| 6 msgid-mixed | — | msgID (2B, packed) | 1B | N B | 2B | 1B 0x55 | 7+N (无 header) |
| 7 tlv | 1B header (0xAA, locked) | tlv 循环 (N 段, 每段 type+length+value) | — | 循环 TLV | 2B | 1B 0x55 | 5 + ΣTLV 段 |

### 3.3 通用解析骨架 (以 _parseFrameFixedHeader 为例)

```js
// kind 0: fixed-header (跟 buildFrame 严格对称)
NS._parseFrameFixedHeader = function (bytes, protocol) {
  if (!bytes || bytes.length < 7) return { error: 'TOO_SHORT', fields: {}, sections: [] };
  const sections = [];
  let off = 0;
  for (const f of protocol.fields) {
    const segBytes = bytes.slice(off, off + f.size);
    let value = null;
    if (f.type === 'header' || f.type === 'addr' || f.type === 'tail') {
      // 1 字节 hex 常量
      value = segBytes[0] !== undefined ? segBytes[0] : null;
    } else if (f.type === 'cmd') {
      // 1 字节 cmd id
      value = segBytes[0] !== undefined ? segBytes[0] : null;
    } else if (f.type === 'length') {
      value = segBytes[0] !== undefined ? segBytes[0] : null;
    } else if (f.type === 'data') {
      // N 字节 data, 切给 ackCmd.dataFields
      value = segBytes;  // Uint8Array
    } else if (f.type === 'crc') {
      // 2 字节 CRC, 只读不校验
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

**其他 7 kind 同样骨架**:
- 区别只在 layout (哪些字段在哪个 offset)
- kind 7 tlv 需要在 data 段**循环解析 TLV 段** (4 步: 1B type + 1B length + N B value),每段追加到 sections 数组

### 3.4 TLV 段循环解析 (kind 7)

```js
NS._parseFrameTlv = function (bytes, protocol, cmd) {
  if (!bytes || bytes.length < 5) return { error: 'TOO_SHORT', fields: {}, sections: [] };
  const sections = [];
  let off = 0;
  for (const f of protocol.fields) {
    if (f.type === 'header' || f.type === 'crc' || f.type === 'tail') {
      const segBytes = bytes.slice(off, off + f.size);
      sections.push({ type: f.type, name: f.name, bytes: segBytes, value: segBytes[0] });
      off += f.size;
    } else if (f.type === 'data' && f.name === 'tlv') {
      // 循环 TLV 段, 直到剩余字节不够 (header+type+length+value 最小 3B)
      let tlvIdx = 0;
      const tlvs = (cmd && cmd.tlvs) || [];
      while (off + 3 <= bytes.length) {
        const tlvType = bytes[off];
        const tlvLen = bytes[off + 1];
        if (off + 2 + tlvLen > bytes.length) break;  // 剩余不够
        const tlvValue = bytes.slice(off + 2, off + 2 + tlvLen);
        // 用 cmd.tlvs[tlvIdx] 的 type/length 标签, 缺失则用 raw 数字
        const tlvMeta = tlvs[tlvIdx] || {};
        sections.push({
          type: 'tlv', name: `tlv[${tlvIdx}]`,
          bytes: bytes.slice(off, off + 2 + tlvLen),
          value: { type: tlvType, length: tlvLen, value: tlvValue, label: tlvMeta.name || `TLV ${tlvType}` }
        });
        off += 2 + tlvLen;
        tlvIdx += 1;
      }
    }
  }
  const fields = {};
  sections.forEach((s) => { if (s.value !== null) fields[s.name] = s.value; });
  return { fields, sections };
};
```

### 3.5 跟 buildFrame 对称验证表

| 维度 | buildFrame | parseFrame |
|------|------------|------------|
| 入口 | `NS.buildFrame(protocol, cmd)` | `NS.parseFrame(bytes, protocol, [cmd])` |
| 返值 | `{ bytes, sections }` 或 `{ error, ... }` | `{ fields, sections }` 或 `{ error, ... }` |
| sections[i].type | string (header/cmd/length/data/crc/tail) | string (同 build) |
| sections[i].name | field name | field name |
| sections[i].bytes | Uint8Array 段字节 | Uint8Array 段字节 |
| sections[i].value | undefined (build 不算) | number / Uint8Array / TLV obj |
| CRC 行为 | **算 CRC 写出去** | **读 CRC, 不校验** (D3) |
| TLV 段 | **循环生成** TLV 段 (cmd.tlvs) | **循环解析** TLV 段 |
| 错误处理 | `{ error: 'NO_PROTOCOL' | 'UNKNOWN_KIND' }` | `{ error: 'EMPTY_BYTES' | 'TOO_SHORT' | 'NO_PROTOCOL' | 'UNKNOWN_KIND' }` |

**完美对称**。

---

## 4. UI 集成:协议编辑器"贴字节"输入框

### 4.1 位置

```
┌─ Modal (居中, 1100px 宽) ──────────────────────────────────────┐
│  协议编辑器                                          [关闭 ×]   │
├─────────────────────────────────────────────────────────────────┤
│  [BMS TLV v1 (Legacy) ×] [Modbus RTU (Legacy) ×] [+ 新建]      │  ← tab bar
├─────────────────────────────────────────────────────────────────┤
│  Kind  [▼ 7 · Pure TLV ]   [✓ 验证]                             │  ← kind 下拉 + 验证按钮
├─────────────────────────────────────────────────────────────────┤
│  字段列表 (4 行, TLV 模板):                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ # │ name    │ size │ type   │ default │ 备注        │   │  │
│  ├───┼─────────┼──────┼────────┼─────────┼─────────────┼───┤  │
│  │ 1 │ header  │  1   │ header │ 0xAA    │ 固定         │ × │  │
│  │ 2 │ tlv     │  0   │ data   │ —       │ 循环 TLV     │ × │  │
│  │ 3 │ crc     │  2   │ crc    │ auto    │ crc16-modbus │ × │  │
│  │ 4 │ tail    │  1   │ tail   │ 0x55    │ 固定         │ × │  │
│  └───┴─────────┴──────┴────────┴─────────┴─────────────┴───┘  │
├─────────────────────────────────────────────────────────────────┤
│  字节预览 (buildFrame 验证):                                  │  ← 现有 (sub-1)
│  AA  01 02 0A 0B 0C   02 02 0D 0E   XX XX  55                  │
│  hdr  TLV 1 (01)      TLV 2 (02)        CRC  tail             │
├─────────────────────────────────────────────────────────────────┤
│  反向解析 (parseFrame 验证): [新加]                            │  ← ← ← 这次新加
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 贴字节 (hex, 支持空格/0x/, 分隔):                       │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ AA 01 02 0A 0B 0C 02 02 0D 0E XX XX 55            │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │  [解析]  [清空]                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  解析结果:                                                    │
│   ✓ header = 0xAA (1B)                                        │
│   ✓ tlv[0] = { type: 0x01, length: 0x02, value: 0A 0B }      │
│   ✓ tlv[1] = { type: 0x02, length: 0x02, value: 0D 0E }      │
│   ✓ crc = 0xXXXX (2B, 未校验)                                │
│   ✓ tail = 0x55 (1B)                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 行为

- 粘贴支持格式 (跟 buildFrame hex 格式一致):
  - 空格分隔: `AA 01 02 0A 0B`
  - `0x` 前缀: `0xAA 0x01 0x02`
  - 逗号分隔: `170,1,2,10,11` (跟 ASCII 帧同源)
  - 混合格式自动归一化
- 点 "解析" → 调 `NS.parseFrame(textarea, protocol, COMMANDS[0])` → 渲染结构化结果
- 点 "清空" → textarea 空 + 解析结果区空
- 解析失败 → 红框 + 错误消息 (跟 "验证" 按钮错误风格一致,sub-1 已实现)
- 解析结果按 `sections` 数组顺序逐行显示,每行 `<field name> = <value> (<size>B)`
- TLV 段:每行显示 `{ type: 0xXX, length: 0xXX, value: HEX HEX HEX }`

### 4.3 跟 "验证" 按钮的对比

| 维度 | 验证 (buildFrame) | 反向解析 (parseFrame) |
|------|-------------------|------------------------|
| 方向 | 字段 schema → bytes | bytes → 字段 schema |
| 输入 | protocol.fields + cmd | 贴的 hex bytes |
| 输出 | bytes 预览 (按段着色) | 解析结果 (name + value) |
| 失败反馈 | 字节预览红框 + tab 红徽章 + toast | 解析结果区红框 + 错误消息 |
| 用途 | 设计协议时,验证 schema 能 build 出预期字节 | 抓包/调试时,验证抓到的字节符不符合 schema |

**两个按钮互补,构建设计 + 验证完整闭环**。

### 4.4 状态管理

- 跟 v4.8c 一样,新增 `NS._protoParseModal` 临时状态(但**不开 modal**,而是 inline 在协议编辑器 modal 内,所以不需要 modal 状态)
- textarea 内容不持久化 (D6) — 关 modal 再开就清空
- 解析结果存在 `NS._lastParseResult` 临时变量,renderProtoEditor 时回显

---

## 5. 集成现有 dispatch

### 5.1 tryDispatchAckFrames 改用 parseFrame

**现状** (line 11960): hardcoded 0xAA / cmd offset 2 / length offset 3 / 0x55

**改造**:
1. 遍历 `NS.PROTOCOLS`(只 user-defined 协议,2 个 Legacy 都 kind 0 暂时还行)
2. 对每个 protocol 调 `NS.parseFrame(bytes, protocol)`,如果返 error 跳过
3. 成功 → 识别 cmd 字节 → 调 `_triggerAckHandler(cmdByte, frameBytes)`
4. **多协议并存**: 同一份 RX bytes 可能被多个 protocol 解析,选**第一个**返 success 的 (跟现状"扫 0xAA 起始"逻辑等价,但通用化)

```js
// 改造后 (伪代码)
NS.tryDispatchAckFrames = function (bytes) {
  if (!bytes || bytes.length < 5) return false;
  let handled = false;
  // 滑动窗口扫描起始字节 (header.default 决定, 不再 hardcoded 0xAA)
  for (const proto of NS.PROTOCOLS) {
    const headerField = proto.fields.find((f) => f.type === 'header');
    if (!headerField) continue;
    const headerByte = NS.parseHexOr0(headerField.default) & 0xFF;
    let i = 0;
    while (i < bytes.length) {
      if (bytes[i] !== headerByte) { i += 1; continue; }
      // 试 parse 这一段 (按 protocol.kind 决定 layout)
      const remaining = bytes.slice(i);
      const result = NS.parseFrame(remaining, proto, NS.COMMANDS.find((c) => c.protocolId === proto.id));
      if (result.error) { i += 1; continue; }
      // 提取 cmd byte (sections 里找 type === 'cmd' 的 value)
      const cmdSection = result.sections.find((s) => s.type === 'cmd');
      if (!cmdSection || cmdSection.value == null) { i += 1; continue; }
      const cmdByte = cmdSection.value;
      // 调 handler
      NS._triggerAckHandler(cmdByte, remaining);
      handled = true;
      // 跳到下一帧起点 (按 sections 总字节数)
      const frameLen = result.sections.reduce((sum, s) => sum + s.bytes.length, 0);
      i += frameLen || 1;
    }
  }
  return handled;
};
```

### 5.2 tryDispatchAsciiAckFrames 改用 parseFrame

跟 binary 路径对称,先 ASCII → bytes 转换,然后调通用 dispatch。

### 5.3 兼容点 (跟 v4.8c 一样)

- 现状 2 协议 (BMS / Modbus) 都是 kind 0 fixed-header,**新代码行为不变** — `_parseFrameFixedHeader` 跟 `_parseAckFields` slice(4) 行为等价
- 数据兼容性字段 (`localStorage:serialweb:prefs`, `SerialWebUserConfig v1`, `WSLBIN1` magic, `__serialWeb*` 命名) 全部不动
- sub-1 / sub-2 / sub-c 全部代码**保留**,只**扩展** parseFrame 方向

---

## 6. 错误处理

### 6.1 parseFrame 错误码

| 错误码 | 触发 | UI 反馈 |
|--------|------|---------|
| `EMPTY_BYTES` | bytes 为空 / length 0 | 解析结果区 "字节不能为空" |
| `TOO_SHORT` | bytes 长度 < kind 最小帧 | 解析结果区 "字节太短, 至少需要 N 字节" |
| `NO_PROTOCOL` | protocol null | 解析结果区 "协议未选中" |
| `UNKNOWN_KIND` | kind 字符串无效 | 解析结果区 "未知 kind: <kind>" |
| `INVALID_HEX` | 粘贴内容含非 hex 字符 | 解析结果区 "字节格式错误: <位置>" |
| `TLV_OVERFLOW` | kind 7 TLV 段长度超出剩余 | 解析结果区 "TLV 段越界, 已停止" |

### 6.2 dispatch 错误码

| 错误码 | 触发 | 行为 |
|--------|------|------|
| (跟 parseFrame 一样) | (一样) | 滑动窗口 i += 1, 继续扫 |

### 6.3 解析部分失败

- 比如: header OK, cmd OK, data 解析时 NS._bytesToNumber 报 type 未知 → **降级为 hex 字符串显示** ("0x0A 0x0B"),不阻断整体 parse
- TLV 段: 部分 TLV 解析成功, 部分失败 → 成功的进 sections,失败的显示 "TLV 段 X 解析失败" 在错误区

---

## 7. 兼容性约束 (AGENTS.md 强制)

| 字段 | 处理 |
|------|------|
| `localStorage` keys (`serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`) | **不动** |
| 配置 JSON type (`SerialWebUserConfig` v1) | **不动** |
| `.timeline` 二进制 magic (`WSLBIN1`) | **不动** |
| API 路径 (`/api/serialweb_page-view`) | **不动** |
| JS 内部命名 (`__serialWeb*`) | **不动** |
| sub-1 / sub-2 / sub-c 全部代码 | **保留, 只扩展** parseFrame 方向 |

**sub-3 新增 (合规)**:
- `NS.parseFrame` (新 dispatcher)
- `NS._parseFrameXxx` (8 个新子函数, 跟 _buildFrameXxx 对称)
- `NS._lastParseResult` (新 UI 临时状态)
- `NS.tryDispatchAckFrames` / `NS.tryDispatchAsciiAckFrames` (改用 dispatch, 行为兼容)
- `NS._parseAckFields` (内部改用 `NS.parseFrame`, 行为兼容)
- 协议编辑器 modal 底部新加 "贴字节" 输入区 + 解析结果区
- CSS: `.proto-parse-section` + `.proto-parse-input` + `.proto-parse-result` + `.parse-row.error`

---

## 8. 拆 commit

### 8.1 v4.8d (本 sub, 1 个 commit)

**范围**:
- 加 `NS.parseFrame` dispatcher
- 加 `NS._parseFrameXxx` 8 个子函数 (跟 _buildFrameXxx 对称)
- 加 `NS._lastParseResult` UI 临时状态
- 改 `NS._parseAckFields` 内部用 `NS.parseFrame` (行为兼容)
- 改 `NS.tryDispatchAckFrames` / `NS.tryDispatchAsciiAckFrames` 改用 dispatch
- 协议编辑器 modal 底部加 "贴字节" 输入区 + 解析结果区
- 加 CSS: `.proto-parse-section` 等

**验证** (手动 smoke test):
- 浏览器加载, 打开协议编辑器, kind 切到 "0 · fixed-header" → 贴 `AA 01 02 0A 0B 0C XX XX 55` (12B) → 解析 OK
- 切到 "3 · addr-split" → 贴 `AA 01 02 03 04 0A 0B 0C XX XX 55` → 解析 OK, srcAddr=0x01, dstAddr=0x02
- 切到 "7 · tlv" → 贴 `AA 01 02 0A 0B 0C 02 02 0D 0E XX XX 55` → TLV 段循环解析, 2 段回显
- 字节太短 → 错误提示
- 字节格式错 (含非 hex 字符) → 错误提示
- 现状 2 协议 (BMS / Modbus) 真串口 RX → ack 行为不变 (v4.9.6 路径)
- 数据兼容性字段不动

### 8.2 不拆 commit

v4.8d 整体 1 个 commit, 内部不分 a/b (跟 v4.8c 一致, sub-2 spec §10.2 明确):
- parseFrame dispatcher 跟 8 个子函数必须**同时落地**,否则一半 kind 能 parse 一半不能,UI 体验割裂
- UI 输入区 + 解析结果区跟 dispatcher 强耦合, 不分阶段没有"中间可用状态"

---

## 9. References

- `6743873 spec: v4.8 sub-1 TLV 协议重构设计文档` - 数据模型 + buildFrame 内核
- `3981f29 v4.8b kind 1-7 真实实现` - 7 个 buildFrame 子函数 (parseFrame 对称参考)
- `2d36003 v4.8c 协议编辑器 UI 重构` - 协议编辑器 UI 现状 (贴字节输入区插在这里)
- `e028be3 feat(v4.9.8): RX 接入加 ASCII 帧解析分支` - ASCII 帧解析范式 (sub-3 ASCII 路径参考)
- `1adc15f fix(v4.9.7): NS._parseAckFields 修帧布局 offset` - 现 kind 0 parse 路径 (sub-3 内部调用 _parseFrameFixedHeader 替代)
- `SerialCube.html line 11609-11883` - 现状 8 kind buildFrame 子函数
- `SerialCube.html line 11893-11911` - 现状 _parseAckFields (kind 0 only)
- `SerialCube.html line 11960-11982` - 现状 tryDispatchAckFrames (kind 0 only)
- `SerialCube.html line 11995-12019+` - 现状 tryDispatchAsciiAckFrames (kind 0 only)
- `AGENTS.md` - 强制 skill 链 + 数据兼容性字段
- `docs/architecture.md` - 架构总览

---

## Self-Review (writing-specs)

1. **Placeholder scan**: 无 TBD / TODO / "fill in details" / "实现时定", 所有内容明确
2. **Internal consistency**: 9 节一致, parseFrame 跟 buildFrame 严格对称, UI 集成路径明确, dispatch 改造兼容现状
3. **Scope check**: 聚焦 v4.8d (parseFrame 通用化 + 贴字节输入), sub-4 (字段类型扩展 + pair trigger 扩展) 明确留后续
4. **Ambiguity check**:
   - "parseFrame 跟 buildFrame 对称" - 明确 (§3 + §3.5 验证表)
   - "CRC 不校验" - 明确 (D3 + §3.5)
   - "TLV 段循环解析" - 明确 (D4 + §3.4)
   - "贴字节不持久化" - 明确 (D6)
   - "现状 dispatch 改用 parseFrame, 行为兼容" - 明确 (§5 + §7)
   - "8 kind 帧布局对照表" - 明确 (§3.2)

Self-review 通过, 2026-08-06 起草。
