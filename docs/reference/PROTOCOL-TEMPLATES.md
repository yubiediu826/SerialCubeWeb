# 协议模板速查

> **内置协议模板字段含义 / 怎么用 / 怎么自定义** — 真理之源: `SerialCube.html:9923-9978` (`NS._defaultProtocols`)。

---

## 1. 2 个内置协议模板

| ID | 名称 | byteOrder | crcType | crcInit | crcEndian | crcRange |
|----|------|-----------|---------|---------|-----------|----------|
| `proto_bms` | BMS TLV v1 (Legacy) | BE | crc16-modbus | 0xFFFF | LE | all |
| `proto_modbus` | Modbus RTU (Legacy) | LE | crc16-modbus | 0xFFFF | LE | no_header |

### 1.1 proto_bms（BMS TLV v1 Legacy）

**帧结构:**

```
[header(1)] [addr(1)] [cmd(1)] [length(1)] [data(N)] [crc(2 LE)] [tail(1)]
   0xAA        addr     cmd        N         data      CRC16      0x55
```

| 字段 | id | type | size | byteOrder | default | 说明 |
|------|-----|------|------|-----------|---------|------|
| header | f1 | header | 1 | — | 0xAA | 固定帧头 |
| addr | f2 | addr | 1 | — | 0x01 | 设备地址 |
| cmd | f3 | cmd | 1 | BE | 0x00 | 命令码 |
| length | f4 | length | 1 | BE | auto | data 段字节数（自动算） |
| data | f4d | data | 0 | BE | 0x00 | 动态长度（由 length 决定） |
| crc | f5 | crc | 2 | LE | auto | CRC-16 MODBUS（LE 输出） |
| tail | f6 | tail | 1 | — | 0x55 | 固定帧尾 |

**完整帧示例（cmd=0x01, data=10 字节, addr=0x01）:**

```
AA 01 01 0A [10 字节 data] [CRC16 LE] 55
```

### 1.2 proto_modbus（Modbus RTU Legacy）

**帧结构:**

```
[addr(1)] [func(1)] [reg_hi(1)] [reg_lo(1)] [qty_hi(1)] [qty_lo(1)] [crc(2 LE)]
  addr      func     reg 高位     reg 低位      qty 高位     qty 低位      CRC16
```

| 字段 | id | type | size | byteOrder | default | 说明 |
|------|-----|------|------|-----------|---------|------|
| addr | m1 | addr | 1 | — | 0x01 | 设备地址（不参与 CRC） |
| func | m2 | cmd | 1 | — | 0x03 | 功能码 |
| reg_hi | m3 | data | 1 | BE | 0x00 | 寄存器地址高字节 |
| reg_lo | m4 | data | 1 | BE | 0x00 | 寄存器地址低字节 |
| qty_hi | m5 | data | 1 | BE | 0x00 | 数量高字节 |
| qty_lo | m6 | data | 1 | BE | 0x00 | 数量低字节 |
| crc | m7 | crc | 2 | LE | auto | CRC-16 MODBUS（LE 输出） |

**完整帧示例（读 0x0000 寄存器 10 个）:**

```
01 03 00 00 00 0A C5 CD
```

**CRC 范围:** `no_header` — 跳过 addr 字段（Modbus 规范）

---

## 2. 字段类型 (field.type)

| type | 含义 | 用途 |
|------|------|------|
| `header` | 固定帧头 | 通常 size=1, default 写死 (e.g. 0xAA) |
| `addr` | 设备地址 | 通常 size=1 |
| `cmd` | 命令码 | 通常 size=1 |
| `length` | 长度字段 | 自动算（auto）,指 data 段字节数 |
| `data` | 数据段 | size=0 表示动态（由 length 决定） |
| `crc` | 校验字段 | 自动算（auto） |
| `tail` | 固定帧尾 | 通常 size=1, default 写死 (e.g. 0x55) |

### 2.1 default 字段值

| 值 | 含义 |
|----|------|
| `'auto'` | 运行时自动算（length / crc 用） |
| `'0xAA'` / `'0x55'` | 固定 hex 值（header / tail 用） |
| `'0x0000'` | 初始 0（u16 字段） |
| `''` | 空（用户填） |

---

## 3. 字段大小 (field.size) 与类型 (DATA_FIELDS.type)

### 3.1 协议字段 size

| size | 字节数 |
|------|--------|
| 0 | 动态（由 length 字段决定） |
| 1 | 1 字节 (u8 / i8) |
| 2 | 2 字节 (u16 / i16) |
| 4 | 4 字节 (u32 / i32 / float) |
| 8 | 8 字节 (double) |

### 3.2 数据字段 type (DATA_FIELDS[].type)

| type | 字节数 | 范围 |
|------|--------|------|
| `u8` | 1 | 0..255 |
| `i8` | 1 | -128..127 |
| `u16` | 2 | 0..65535 |
| `i16` | 2 | -32768..32767 |
| `u32` | 4 | 0..2^32-1 |
| `i32` | 4 | -2^31..2^31-1 |
| `float` | 4 | IEEE 754 |
| `double` | 8 | IEEE 754 |

映射在 `NS._FIELD_BYTE_SIZE`（约 9980）:

```js
NS._FIELD_BYTE_SIZE = { u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, float: 4, double: 8 };
```

---

## 4. 字节序 (byteOrder)

| 值 | 含义 |
|----|------|
| `'BE'` | Big Endian（高位在前） |
| `'LE'` | Little Endian（低位在前） |
| `null` | 不适用（单字节字段） |

### 4.1 proto 级别 vs field 级别

- `protocol.byteOrder` — 默认字节序
- `field.byteOrder` — 单字段字节序（覆盖协议默认）

---

## 5. 怎么用协议编辑器

### 5.1 进入

- 点「协议编辑器」按钮（一般在设置区 / 解析模式右侧）

### 5.2 界面

```
┌─────────────────────────────────────────────────────┐
│ 协议编辑器                                      [X]  │
├─────────────────────────────────────────────────────┤
│ 协议名: [BMS TLV v1]  字节序: [BE ▼]                │
│ CRC: [CRC-16 MODBUS ▼]  初值: [0xFFFF]  字节序: [LE]│
│ CRC 范围: [整帧 ▼]                                  │
├─────────────────────────────────────────────────────┤
│ 字段列表:                                           │
│ ┌──┬──────────┬──────┬──────┬──────────┬────────┐  │
│ │ #│ name     │ type │ size │ byteOrder│ default│  │
│ ├──┼──────────┼──────┼──────┼──────────┼────────┤  │
│ │ 1│ header   │ hdr  │ 1    │ —        │ 0xAA   │  │
│ │ 2│ addr     │ addr │ 1    │ —        │ 0x01   │  │
│ │ 3│ cmd      │ cmd  │ 1    │ BE       │ 0x00   │  │
│ │ 4│ length   │ len  │ 1    │ BE       │ auto   │  │
│ │ 5│ data     │ data │ 0    │ BE       │ 0x00   │  │
│ │ 6│ crc      │ crc  │ 2    │ LE       │ auto   │  │
│ │ 7│ tail     │ tail │ 1    │ —        │ 0x55   │  │
│ └──┴──────────┴──────┴──────┴──────────┴────────┘  │
│ [+ 加字段]                                          │
├─────────────────────────────────────────────────────┤
│ 字节预览: AA 01 00 00 ... (实时)                     │
│ [导出 JSON] [导入 JSON] [保存] [取消]                │
└─────────────────────────────────────────────────────┘
```

### 5.3 关键操作

- **加字段:** 点「+ 加字段」,改 name / type / size / byteOrder / default
- **改 CRC:** 顶部下拉换算法,改初值 / 字节序 / 范围
- **实时预览:** 字节预览区域实时显示 `NS.buildFrame(protocol, cmd)` 输出
- **导出 JSON:** 保存协议到 JSON 文件
- **导入 JSON:** 从 JSON 文件恢复协议
- **保存:** 应用到当前会话（存 localStorage）

---

## 6. buildFrame kind（8 种）

`protocol.kind` 决定用哪种 buildFrame 实现:

| kind | 函数 | 行号 | 用途 |
|------|------|------|------|
| `'fixed-header'` | `_buildFrameFixedHeader` | 11474 | **默认**，固定 header/tail 帧结构 |
| `'raw'` | `_buildFrameRaw` | 11542 | 无结构，纯字节 |
| `'cmd-split'` | `_buildFrameCmdSplit` | 11563 | cmd 分高低字节 |
| `'addr-split'` | `_buildFrameAddrSplit` | 11586 | addr 分高低字节 |
| `'ctrl-bit7'` | `_buildFrameCtrlBit7` | 11613 | 高位 bit 7 作控制位 |
| `'type-high-bit'` | `_buildFrameTypeHighBit` | 11638 | 类型用高位表示 |
| `'msgid-mixed'` | `_buildFrameMsgidMixed` | 11663 | msgid 混合 |
| `'tlv'` | `_buildFrameTlv` | 11690 | TLV 结构 |

### 6.1 dispatcher

```js
// SerialCube.html:11518-11532
NS.buildFrame = function (protocol, cmd) {
  switch (protocol.kind) {
    case 'fixed-header':  return NS._buildFrameFixedHeader(protocol, cmd);
    case 'raw':           return NS._buildFrameRaw(protocol, cmd);
    case 'cmd-split':     return NS._buildFrameCmdSplit(protocol, cmd);
    case 'addr-split':    return NS._buildFrameAddrSplit(protocol, cmd);
    case 'ctrl-bit7':     return NS._buildFrameCtrlBit7(protocol, cmd);
    case 'type-high-bit': return NS._buildFrameTypeHighBit(protocol, cmd);
    case 'msgid-mixed':   return NS._buildFrameMsgidMixed(protocol, cmd);
    case 'tlv':           return NS._buildFrameTlv(protocol, cmd);
    default:              return NS._buildFrameFixedHeader(protocol, cmd);
  }
};
```

---

## 7. 8 个内置命令

`NS.COMMANDS` (10020 行附近):

| id (hex) | 名称 | 方向 | frameType | cadence (ms) | 协议 | dataFields | dataSize | expectResponse |
|----------|------|------|-----------|--------------|------|------------|----------|----------------|
| 0x01 | Read Voltage | rx | query | 200 | proto_bms | cell_1_v, cell_2_v, cell_3_v, cell_4_v, pack_v_avg | 10 | 0x80 |
| 0x02 | Read Current | rx | query | 500 | proto_bms | pack_i | 2 | 0x80 |
| 0x03 | Read Temp | rx | query | 1000 | proto_bms | temperature | 2 | 0x80 |
| 0x04 | Read SOC | rx | query | 2000 | proto_bms | soc | 2 | 0x80 |
| 0x10 | Control Charge | tx | control | 0 | proto_bms | charge_v_set, charge_i_set | 4 | 0x90 |
| 0x11 | Control Disch | tx | control | 0 | proto_bms | discharge_v_set | 2 | 0x91 |
| 0x90 | Charge Ack | rx | response | 0 | proto_bms | charge_v_set, charge_i_set | 4 | — |
| 0x91 | Disch Ack | rx | response | 0 | proto_bms | discharge_v_set | 2 | — |

### 7.1 命令方向

| direction | 含义 |
|-----------|------|
| `rx` | 接收（设备 → 主机） |
| `tx` | 发送（主机 → 设备） |

### 7.2 命令 frameType

| frameType | 含义 |
|-----------|------|
| `query` | 查询（周期性自动 query） |
| `control` | 控制（用户触发） |
| `response` | 响应（设备响应,不主动发） |

### 7.3 cadence

- `> 0` — 自动 query 间隔（ms）
- `= 0` — 不主动 query,用户触发（trigger 按钮）

---

## 8. 11 个数据字段

`NS.DATA_FIELDS` (9989 行附近):

| name | type | default | 用途 |
|------|------|---------|------|
| `cell_1_v` | u16 | 0x0000 | Cell 1 电压 (V) |
| `cell_2_v` | u16 | 0x0000 | Cell 2 电压 (V) |
| `cell_3_v` | u16 | 0x0000 | Cell 3 电压 (V) |
| `cell_4_v` | u16 | 0x0000 | Cell 4 电压 (V) |
| `pack_v_avg` | u16 | 0x0000 | Pack 均压 (V) |
| `pack_i` | u16 | 0x0000 | Pack 电流 (A) |
| `temperature` | u16 | 0x0000 | 温度 (°C) |
| `soc` | u16 | 0x0000 | SOC (%) |
| `charge_v_set` | u16 | 0x0000 | 充电电压设定 (V) |
| `charge_i_set` | u16 | 0x0000 | 充电电流设定 (A) |
| `discharge_v_set` | u16 | 0x0000 | 放电电压设定 (V) |

---

## 9. 10 张仪表盘卡片

`NS.CARDS` (10043 行附近):

| id | type | cmd | dir | field | title | unit | range | precision | fromOtherCmd |
|----|------|-----|-----|-------|-------|------|-------|-----------|--------------|
| c1 | trend | 0x01 | rx | cell_1_v | Cell 1 电压 | V | 2.8-4.2 | 3 | true |
| c2 | trend | 0x02 | rx | pack_i | Pack 电流 | A | -50-50 | 2 | true |
| c3 | trend | 0x03 | rx | temperature | 温度 | °C | -20-60 | 1 | true |
| c4 | trend | 0x04 | rx | soc | SOC | % | 0-100 | 1 | true |
| c5 | trend | 0x01 | rx | cell_2_v | Cell 2 电压 | V | 2.8-4.2 | 3 | true |
| c6 | trend | 0x01 | rx | cell_3_v | Cell 3 电压 | V | 2.8-4.2 | 3 | true |
| c7 | trend | 0x01 | rx | cell_4_v | Cell 4 电压 | V | 2.8-4.2 | 3 | true |
| c8 | trend | 0x01 | rx | pack_v_avg | Pack 均压 | V | 2.8-4.2 | 3 | true |

(实际还有 c9 pair 卡 + c10 trend 卡,见 SerialCube.html:10043+)

---

## 10. 怎么自定义一个协议

### 10.1 通过协议编辑器（推荐）

1. 打开「协议编辑器」
2. 改协议名 / 字节序 / CRC
3. 改字段列表（加 / 删 / 改）
4. 看字节预览确认对
5. 「保存」

### 10.2 通过代码（高级）

```js
// 改 NS._defaultProtocols 添加自定义协议
NS._defaultProtocols = function () {
  return [
    // 现有
    {
      id: 'proto_my_dev',
      kind: 'fixed-header',
      name: 'My Device v1',
      byteOrder: 'BE',
      crcRange: 'all',
      crcType: 'crc16-modbus',
      crcInit: '0xFFFF',
      crcEndian: 'LE',
      fields: [
        { id: 'f1', name: 'header', type: 'header', size: 1, default: '0xAA' },
        { id: 'f2', name: 'addr',   type: 'addr',   size: 1, default: '0x01' },
        { id: 'f3', name: 'cmd',    type: 'cmd',    size: 1, byteOrder: 'BE', default: '0x00' },
        { id: 'f4', name: 'length', type: 'length', size: 1, byteOrder: 'BE', default: 'auto' },
        { id: 'f4d',name: 'data',   type: 'data',   size: 0, byteOrder: 'BE', default: '0x00' },
        { id: 'f5', name: 'crc',    type: 'crc',    size: 2, byteOrder: 'LE', default: 'auto' },
        { id: 'f6', name: 'tail',   type: 'tail',   size: 1, default: '0x55' }
      ]
    }
  ];
};
NS.PROTOCOLS = NS._defaultProtocols();
```

### 10.3 通过导入 JSON

1. 在协议编辑器 → 「导出 JSON」拿到模板
2. 改 JSON
3. 「导入 JSON」

---

## 11. JSON 协议模板格式

```json
{
  "id": "proto_bms",
  "kind": "fixed-header",
  "name": "BMS TLV v1 (Legacy)",
  "byteOrder": "BE",
  "crcRange": "all",
  "crcType": "crc16-modbus",
  "crcInit": "0xFFFF",
  "crcEndian": "LE",
  "fields": [
    { "id": "f1", "name": "header", "type": "header", "size": 1, "byteOrder": null, "default": "0xAA" },
    { "id": "f2", "name": "addr",   "type": "addr",   "size": 1, "byteOrder": null, "default": "0x01" }
  ]
}
```

---

## 12. 链接到详细文档

| 我想了解 | 去看 |
|----------|------|
| CRC 算法细节 | [`CRC-REFERENCE.md`](CRC-REFERENCE.md) |
| 怎么改协议代码 | [`../guides/DEVELOPER-GUIDE.md`](../guides/DEVELOPER-GUIDE.md) § 8.2 |
| SerialCube.html 内部结构 | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| 工具怎么用 | [`../guides/USER-GUIDE.md`](../guides/USER-GUIDE.md) § 4.5 |
