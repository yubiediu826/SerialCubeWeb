# v4.8 TLV 协议重构 — Sub-1: 数据模型 + buildFrame 内核

**日期**: 2026-08-04
**作者**: yubiediu826 + Mavis
**状态**: 待 review
**范围**: v4.8 sub-1 (数据模型 + buildFrame 内核,不含 UI 重构和 cmd 字段映射)
**前置 commit**: v4.7 commit message 里勾画的 7 种 TLV 协议类型
**后续 sub**: sub-2 (协议编辑器 UI 重构 + parseFrame),sub-3 (cmd 字段映射 + import/export 兼容)

---

## 1. Overview

### 1.1 背景

SerialCubeWeb dashboard 模式 (v4.1+) 引入协议编辑器,允许用户在 UI 里配 TLV 帧布局 (fields 列表) 并预览生成的字节。现状数据模型 (`NS.PROTOCOLS`) 把每个协议表示为"1 个固定 fields 列表",无法表达真实工业协议里"1 协议多 cmd 共享 frame + 方向动态"的需求。

v4.7 commit message 提了 7 种 TLV 协议类型作为 v4.8 重构目标。本 spec 描述 sub-1 范围 (数据模型 + buildFrame 内核),sub-2 (UI 重构) 和 sub-3 (cmd 字段映射 + import/export 兼容) 留后续 spec。

### 1.2 目标

1. 把"1 协议 1 frame layout" 模型升级为"1 协议 1 kind + 8 种 kind 模板"
2. buildFrame 拆为 8 个子函数,每种 kind 一个,加 dispatcher
3. 严格错误处理: 缺 kind / 缺字段 → 错误返回 + UI 红框
4. 旧 user config 100% 兼容 (无 kind 字段 → kind 0)
5. 现状 mock 数据 (c1-c10 卡片值) 不变

### 1.3 非目标 (留后续)

- parseFrame (留 sub-2 UI 增强)
- 协议编辑器 UI 重构 (留 sub-2)
- cmd 字段映射重构 (留 sub-3)
- pair trigger 真实发送 (留 sub-3)
- 端到端真串口 (留 v4.8.x+)
- 测试基础设施 (留未来,跟现状一致手动 smoke test)

---

## 2. 数据模型

### 2.1 NS._KIND_TEMPLATES (新增,8 个 kind metadata)

```js
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

### 2.2 NS.PROTOCOLS (改:加 kind 字段)

```js
// 改前 (SerialCube.html line 9268)
NS.PROTOCOLS = [
  { id: 'proto_bms', name: 'BMS TLV v1', byteOrder, crcRange, crcType, crcInit, crcEndian, fields: [...] },
  { id: 'proto_modbus', name: 'Modbus RTU', byteOrder, crcRange, ... }
];

// 改后
NS.PROTOCOLS = [
  { id: 'proto_bms', kind: 'fixed-header', name: 'BMS TLV v1 (Legacy)', byteOrder, crcRange, ... },
  { id: 'proto_modbus', kind: 'fixed-header', name: 'Modbus RTU (Legacy)', ... }
];
```

**关键约束**:`kind` 字段默认 'fixed-header' (向后兼容,旧 user config 无 kind 走兼容函数归为 fixed-header)。

### 2.3 8 kind 详细字段表

| kind | name | fields 顺序 | 方向编码 | 现状用例 |
|---|---|---|---|---|
| 0 | fixed-header | header(1B) + cmd(1B) + length(1B) + data(NB) + crc(2B) + tail(1B) | header 写死, **不参与**方向 | 现状 BMS / Modbus |
| 1 | raw | header(1B) + cmd(1B) + length(1B) + data(NB) + crc(2B) + tail(1B) | MB→0x5A, CB→0x55 | 工业协议 |
| 2 | cmd-split | header(1B) + cmd(1B) + length(1B) + data(NB) + crc(2B) + tail(1B) | cmd bit7: MB=0, CB=1 | 工业控制总线 |
| 3 | addr-split | header(1B) + srcAddr(1B) + dstAddr(1B) + cmd(1B) + length(1B) + data(NB) + crc(2B) + tail(1B) | MB→src=hostId, CB→互换 | 多设备总线 |
| 4 | ctrl-bit7 | header(1B) + ctrl(1B) + cmd(1B) + length(1B) + data(NB) + crc(2B) + tail(1B) | ctrl bit7: MB=0, CB=1 | Modbus 变体 |
| 5 | type-high-bit | header(1B) + type(1B) + cmd(1B) + length(1B) + data(NB) + crc(2B) + tail(1B) | type bit7: MB=0, CB=1 | 工业协议变体 |
| 6 | msgid-mixed | msgID(2B) + length(1B) + data(NB) + crc(2B) + tail(1B) | msgID bit15: MB=0, CB=1, bit14-8=func(7), bit7-0=addr(8) | CAN-like |
| 7 | tlv | header(1B) + tlv[](type(1B)+length(1B)+value(NB)) + crc(2B) + tail(1B) | tlv type bit7: MB=0, CB=1 | BLE GATT-like |

### 2.4 方向定义

- `cmd.direction = 'tx'` = 主机发送 (MB, master to slave)
- `cmd.direction = 'rx'` = 主机接收 (CB, slave to master)

NS 命名空间下 `cmd.direction` 跟协议"方向编码"映射见 2.3 表。

### 2.5 UI 标签

- kind 0 'fixed-header' → UI label "Fixed Header (Legacy)" + 灰色 "legacy" 徽章
- kind 1-7 → UI label = `NS._KIND_TEMPLATES[kind].name`

具体徽章样式 (color + 位置) 留 v4.8a 实现时跟 DESIGN.md 对齐。

---

## 3. buildFrame 拆法

### 3.1 dispatcher (NS.buildFrame)

```js
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

### 3.2 公共抽函数

**`NS._computeCrcInput(protocol, allBytes, sections)`**:按 `protocol.crcRange` 决定 CRC 输入字节范围。返回字节数组。

`crcRange` 可选:
- `'all'`:全部字段参与 CRC
- `'no_header'`:不含 header 段
- `'no_tail'`:不含 tail 段
- `'no_header_tail'`:不含 header 和 tail 段
- `'data_only'`:只 data 段参与 CRC

**`NS._encodeCrcBytes(crcValue, endian)`**:按 endianness 切 CRC 为字节数组。`endian='LE'` 切低字节先,`endian='BE'` 切高字节先。

### 3.3 子函数: NS._buildFrameFixedHeader (kind 0, 跟现状 100% 一致)

直接复用现状 buildFrame 逻辑 (SerialCube.html line 10428-10527)。具体实现:把现状 100 行 buildFrame 函数体搬到 `_buildFrameFixedHeader` 里,加 `cmd.direction` 参数(虽然 kind 0 不参与编码,但保留参数对齐接口)。

### 3.4 子函数模板: NS._buildFrameRaw (kind 1, v4.8b 实现示例)

```js
NS._buildFrameRaw = function (protocol, cmd) {
  const sections = [];
  const data = NS.encodeDataFields(cmd, protocol);

  // header: 方向决定字节
  const headerByte = (cmd.direction === 'rx') ? 0x55 : 0x5A;  // CB=0x55, MB=0x5A
  sections.push({ type: 'header', name: 'header', bytes: [headerByte] });
  // cmd
  sections.push({ type: 'cmd', name: 'cmd', bytes: [cmd.id & 0xFF] });
  // length
  sections.push({ type: 'length', name: 'length', bytes: [data.length & 0xFF] });
  // data
  sections.push({ type: 'data', name: 'data', bytes: [...data] });
  // CRC
  const allBytes = sections.flatMap(s => s.bytes);
  const crcInput = NS._computeCrcInput(protocol, allBytes, sections);
  const crcType = protocol.crcType || 'crc16-modbus';
  const crcValue = NS.computeCrc(crcType, crcInput, NS.parseHexOr0(protocol.crcInit));
  const crcSection = { type: 'crc', name: 'crc', bytes: NS._encodeCrcBytes(crcValue, protocol.crcEndian || 'LE') };
  sections.push(crcSection);
  // tail
  sections.push({ type: 'tail', name: 'tail', bytes: [NS.parseHexOr0(protocol.tail || '0x55') & 0xFF] });
  // 合并
  const bytes = sections.flatMap(s => s.bytes);
  return { bytes, sections };
};
```

### 3.5 子函数: kind 2-7 (v4.8b 实现,各 30-50 行)

跟 3.4 模板类似,差异:
- **kind 2 (cmd-split)**: header 写死(跟 kind 0 一样),cmd 字节 = `cmd.id & 0x7F | (cmd.direction === 'rx' ? 0x80 : 0)`
- **kind 3 (addr-split)**: 2 个 addr 段,srcAddr = (MB ? hostId : devId),dstAddr = (MB ? devId : hostId)
- **kind 4 (ctrl-bit7)**: ctrl 字节 = `(protocol.ctrlDefault & 0x7F) | (cmd.direction === 'rx' ? 0x80 : 0)`
- **kind 5 (type-high-bit)**: type 字节 = `(protocol.typeDefault & 0x7F) | (cmd.direction === 'rx' ? 0x80 : 0)`
- **kind 6 (msgid-mixed)**: 1 个 msgID 段,2 字节 = `((direction?1:0) << 15) | ((func & 0x7F) << 8) | (addr & 0xFF)`,func/addr 从 cmd 或 protocol 取
- **kind 7 (tlv)**: header 写死,tlv 段循环(需要 cmd.dataSpec 或 cmd.dataFields 解析成多个 TLV,每个 TLV 包含 type(1B) + length(1B) + value(NB))

### 3.6 子函数 stub (v4.8a 中间状态)

```js
NS._buildFrameRaw = function (protocol, cmd) {
  return { error: 'NOT_IMPLEMENTED', kind: 'raw', note: 'v4.8b 实现' };
};
// kind 2-7 同模式
```

v4.8a 所有 7 个新 kind 都返回 NOT_IMPLEMENTED,v4.8b 替换为真实实现。

---

## 4. 错误处理 (严格模式)

### 4.1 返回格式

`{ bytes, sections }` (成功) 或 `{ error: 'CODE', detail: '...' }` (失败)。

### 4.2 错误码

| code | 含义 | 触发场景 |
|---|---|---|
| NO_PROTOCOL | protocol undefined | `NS.buildFrame(null, cmd)` |
| UNKNOWN_KIND | protocol.kind 不在 8 种里 | kind = 'foo' 或 typo |
| MISSING_FIELD | kind 需要但 protocol.fields 缺 | 字段缺失 |
| INVALID_TYPE | DATA_FIELDS 缺 type 字段 | type 字段缺失 (v4.8a 几乎不触发, 主要 sub-3 用) |
| CRC_ERROR | CRC 算法失败 | 几乎不会, 兜底 |
| NOT_IMPLEMENTED | kind 实现还没写 (v4.8a 中间状态) | kind 1-7 在 v4.8a |

### 4.3 UI 反应

**协议编辑器**:
- 顶部加 "验证" 按钮 → 调 buildFrame 跑验证
- 错误时:协议 tab 红徽章,字节预览区替换红框 + 错误消息
- 顶部 toast:"协议 proto_xxx 错误: UNKNOWN_KIND 'foo'"

**真实发送** (sub-3 才接): 弹 toast,不发。

**console.error**: 总是打, 方便调试。

### 4.4 错误回退行为

严格模式下, buildFrame 不回退。错误就返回 error,UI 红框。**不走"自动 default kind 0" 的 silent fallback**。

但 kind 0 兼容(无 kind 字段 → kind 0)是 **配置加载时的兼容**,不是 buildFrame 运行时的回退。这两件事分开:加载时宽容,运行时严格。

---

## 5. 兼容性

### 5.1 旧 user config 迁移 (SerialCube.html line 10894 改)

```js
// 改前
if (uc.protocols) NS.PROTOCOLS = uc.protocols;

// 改后
if (uc.protocols) {
  NS.PROTOCOLS = uc.protocols.map(p => ({
    ...p,
    kind: p.kind || 'fixed-header'  // 默认 kind 0
  }));
}
```

### 5.2 现状协议迁移

**proto_bms**:
- 加 `kind: 'fixed-header'`
- name: `'BMS TLV v1'` → `'BMS TLV v1 (Legacy)'`
- fields 数组不动

**proto_modbus**:
- 加 `kind: 'fixed-header'`
- name: `'Modbus RTU'` → `'Modbus RTU (Legacy)'`
- fields 数组不动

### 5.3 kind 0 行为 = 现状 100%

因为 fields 数组兼容 + header/tail 写死,`_buildFrameFixedHeader` 跟现状 buildFrame 行为 100% 一致。验证: 跑 mock data, c1-c10 卡片值不变。

### 5.4 默认 PROTOCOLS (SerialCube.html line 10997) 同步改

```js
// 改前
NS.PROTOCOLS = [
  { id: 'proto_bms', name: 'BMS TLV v1', ... },
  { id: 'proto_modbus', name: 'Modbus RTU', ... }
];

// 改后
NS.PROTOCOLS = [
  { id: 'proto_bms', kind: 'fixed-header', name: 'BMS TLV v1 (Legacy)', ... },
  { id: 'proto_modbus', kind: 'fixed-header', name: 'Modbus RTU (Legacy)', ... }
];
```

### 5.5 line 11037-11038 同步改 (active proto id 设置)

`NS.activeProtoId = NS.PROTOCOLS[0] && NS.PROTOCOLS[0].id;` 维持不动 (kind 是新字段, id 不变)。

---

## 6. cmd 字段映射 (sub-1 不动)

维持 `NS.encodeDataFields(cmd, protocol)` 现状:
- 按 `cmd.dataFields` 数组逐个字段
- 每个字段查 `NS.DATA_FIELDS` 找 type
- 按 type 切字节 (u8/u16/u32/i8/i16/i32/float)

`cmd.dataSize` 字段保留 (硬编码),sub-3 顺手清掉(改成按 type 自动算)。

**sub-1 不动** (避免 spec 膨胀,跟 buildFrame 拆法解耦)。

---

## 7. 拆 commit

### 7.1 v4.8a (架构 + kind 0)

**范围**:
- `NS._KIND_TEMPLATES` 8 个 kind metadata
- `NS.PROTOCOLS` 加 `kind` 字段
- 现状 2 协议改 kind 0 + "(Legacy)" 命名
- user config 兼容函数 (line 10894)
- 默认 PROTOCOLS 同步改 (line 10997)
- `NS.buildFrame` 改 dispatcher (switch on kind)
- `_buildFrameFixedHeader` 实现 (跟现状 100% 一致)
- `_buildFrameXxx` (kind 1-7) stub:返回 `{ error: 'NOT_IMPLEMENTED' }`
- 公共抽函数 `_computeCrcInput` + `_encodeCrcBytes`
- 错误处理 + UI 红框 + 验证按钮

**验证** (手动 smoke test):
- 浏览器加载, dashboard 渲染正常, c1-c10 卡片值不变
- 协议编辑器打开, 切到 "BMS TLV v1 (Legacy)" tab, 字节预览区显示原字节
- user config 导出/导入, 旧 config (无 kind) 加载, 协议走 kind 0
- user config 改 kind 字段为 'raw', 加载, 协议编辑器显示红框 + "NOT_IMPLEMENTED"
- 协议编辑器点 "验证" 按钮, 弹出 "OK" 或 "错误列表"

### 7.2 v4.8b (kind 1-7 实现)

**范围**:
- `_buildFrameRaw` (header 方向编码 0x5A/0x55)
- `_buildFrameCmdSplit` (cmd bit7 编码)
- `_buildFrameAddrSplit` (srcAddr/dstAddr 互换)
- `_buildFrameCtrlBit7` (ctrl bit7 编码)
- `_buildFrameTypeHighBit` (type bit7 编码)
- `_buildFrameMsgidMixed` (msgID bit15+7+8 packed)
- `_buildFrameTlv` (循环 TLV 段)

**验证** (手动 smoke test):
- 7 种新 kind 各建 1 个测试协议 (kind 选对应, fields 默认)
- buildFrame 字节输出 vs 手动算的字节 (用 kind 模板 metadata 算)
- pair 卡 (c9) 配 kind 1 raw 协议, trigger 0x10 命令, buildFrame 字节正确
- 协议编辑器切到 kind 1-7, 字节预览区显示字节 (不再 NOT_IMPLEMENTED)

---

## 8. 范围外 (留后续 sub / 后续版本)

| 项 | 留到 |
|---|---|
| parseFrame (贴字节反解析) | sub-2 (UI 增强) |
| 协议编辑器 UI 重构 (kind 下拉 + 动态 fields) | sub-2 |
| cmd 字段映射重构 (去掉硬编码 dataSize) | sub-3 |
| pair trigger 真实发送 (NS.buildFrame(0x10) + serialWebSend) | sub-3 |
| 端到端真串口验证 | v4.8.x+ |
| 测试基础设施 (Playwright/vitest) | 未来,跟现状一致手动 smoke test |
| 多串口并发 | v5 |
| Modbus RTU/TCP 协议 SDK | v5+ |

---

## 9. 数据兼容性约束 (AGENTS.md 强制)

| 字段 | 处理 |
|---|---|
| `localStorage` keys (`serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`) | 不动 |
| 配置 JSON type (`SerialWebUserConfig` v1) | 不动 |
| `.timeline` 二进制 magic (`WSLBIN1`) | 不动 |
| API 路径 (`/api/serialweb_page-view`) | 不动 |
| JS 内部命名 (`__serialWeb*` / `clearSerialWebStoredUserData`) | 不动 |

---

## 10. Open Questions (剩 2 个小项)

| # | 问题 | 处理 |
|---|---|---|
| 1 | pair trigger 真实发送要不要跟 sub-1 一起做? | 留 sub-3,跟 cmd 字段映射重构一起做 (避免 sub-1 范围膨胀) |
| 2 | kind 0 UI "Legacy" 徽章样式 (color + 位置) | 留 v4.8a 实现时定,跟 DESIGN.md 对齐 (抗住设计师) |

---

## 11. References

- v4.7 commit message: 7 种 TLV 协议类型
- SerialCube.html line 9268-9342: 当前 PROTOCOLS / DATA_FIELDS / COMMANDS / CARDS
- SerialCube.html line 10400-10527: 当前 encodeDataFields + buildFrame
- SerialCube.html line 10883-10910: user config 加载 (兼容点 line 10894)
- SerialCube.html line 10997-11040: 默认 PROTOCOLS + 协议加载 (同步改 line 10997, line 11037-11038)
- AGENTS.md: 强制 skill 链 + 数据兼容性字段
- docs/architecture.md: 架构总览
- docs/dashboard-design.md: 用户反馈的 TLV 类型
- DESIGN.md: 设计系统 (kind 0 徽章样式留 v4.8a 实现时跟这里对齐)
