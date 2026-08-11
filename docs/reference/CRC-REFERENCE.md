# CRC 算法速查

> **5 种 CRC 算法的快速对照表** — 真理之源: `SerialCube.html` 11310-11360 (`NS.crc16Modbus` / `NS.crc16Ccitt` / `NS.crc8` / `NS.crcChecksum` / `NS.crcXor` / `NS.computeCrc`)。

---

## 1. 5 种算法对照

| 算法 | 多项式 | 初值 | 位宽 | 输出字节序 | 典型场景 |
|------|--------|------|------|------------|----------|
| **CRC-8** | 0x07 | 0x00 | 1 字节 | — | 1-Wire / SMBus / 小型传感器 |
| **CRC-16 MODBUS** | 0xA001 (0x8005 反演) | 0xFFFF | 2 字节 | LE (项目默认) | Modbus RTU / 工业协议 |
| **CRC-16 CCITT** | 0x1021 | 0xFFFF | 2 字节 | BE | XMODEM / Bluetooth / 某些无线协议 |
| **Checksum** | — | — | 1 字节 | — | 简单累加校验 |
| **XOR** | — | — | 1 字节 | — | 简单异或校验 |

### 1.1 输出字节序说明

**项目里** `crcEndian: 'LE'` / `'BE'` 指的是 **CRC 值在帧里的字节序**（不是多项式位序）。

- CRC-16 MODBUS 的多项式 `0xA001` 本身就是 LSB-first（`0x8005` 的位反转）
- 但 `crcEndian: 'LE'` 指 CRC 输出在帧里的字节序
- 例: CRC 算出来 = 0x1234
  - LE 输出帧字节: `34 12`
  - BE 输出帧字节: `12 34`

### 1.2 算法选择 (crcType 字段值)

| 协议模板 crcType 值 | 实际算法 |
|--------------------|----------|
| `'none'` | 不校验 (computeCrc 返回 0) |
| `'checksum'` | NS.crcChecksum |
| `'xor'` | NS.crcXor |
| `'crc8'` | NS.crc8(bytes, init, poly) |
| `'crc16-modbus'` | NS.crc16Modbus |
| `'crc16-ccitt'` | NS.crc16Ccitt |

---

## 2. 5 种算法的实现细节

### 2.1 CRC-16 MODBUS

```js
// SerialCube.html:11311-11318
NS.crc16Modbus = function (bytes) {
  let crc = 0xFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000)
        ? ((crc << 1) ^ 0xA001) & 0xFFFF
        : (crc << 1) & 0xFFFF;
    }
  }
  return crc;
};
```

**特点:**
- 多项式 `0xA001` = `0x8005` 的位反转
- MSB-first 实现（`crc << 1` + `^ 0xA001`）但因多项式是反转的，等同 LSB-first
- 初值 0xFFFF
- LE 输出在帧里

**经典测试向量:** `01 03 00 00 00 0A` → `0xC5CD` → LE 帧字节: `C5 CD`

### 2.2 CRC-16 CCITT

```js
// SerialCube.html:11319-11326
NS.crc16Ccitt = function (bytes, init) {
  let crc = init != null ? init : 0xFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] << 8);
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000)
        ? ((crc << 1) ^ 0x1021) & 0xFFFF
        : (crc << 1) & 0xFFFF;
    }
  }
  return crc;
};
```

**特点:**
- 多项式 `0x1021` (标准 CCITT)
- MSB-first
- 初值 0xFFFF (可改)
- BE 输出在帧里

**经典测试向量:** `'123456789'` ASCII → `0x29B1`

### 2.3 CRC-8

```js
// SerialCube.html:11327-11335
NS.crc8 = function (bytes, init, poly) {
  let crc = init != null ? init : 0;
  const p = poly != null ? poly : 0x07;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x80)
        ? ((crc << 1) ^ p) & 0xFF
        : (crc << 1) & 0xFF;
    }
  }
  return crc;
};
```

**特点:**
- 默认多项式 0x07 (标准 CRC-8)
- 默认初值 0x00
- MSB-first

**经典测试向量:** `'123456789'` ASCII → `0xF4`

### 2.4 Checksum

```js
// SerialCube.html:11336
NS.crcChecksum = function (bytes) {
  return bytes.reduce((a, b) => (a + b) & 0xFF, 0);
};
```

**特点:**
- 字节累加取低 8 位
- 最简单,1 字节
- 检错能力最弱

### 2.5 XOR

```js
// SerialCube.html:11337
NS.crcXor = function (bytes) {
  return bytes.reduce((a, b) => a ^ b, 0);
};
```

**特点:**
- 所有字节异或
- 1 字节
- 检错能力比 Checksum 略好（能检测单 bit 翻转）

---

## 3. CRC 输入范围（crcRange）

`crcRange` 决定哪些字节参与 CRC 计算,值:

| 值 | 含义 |
|----|------|
| `'all'` | 整帧（除 crc 字段本身） |
| `'no_header'` | 跳过 header 类型字段（fields[0]） |
| `'no_tail'` | 跳过 tail 类型字段（fields 末尾） |
| `'no_header_tail'` | 跳过 header 和 tail |
| `'data_only'` | 只 data 字段（不常用） |

### 3.1 内置协议模板的 crcRange

| 协议 | crcRange | 含义 |
|------|----------|------|
| `proto_bms` | `'all'` | header + data + tail 全部参与 CRC |
| `proto_modbus` | `'no_header'` | 跳过 addr 字段（Modbus 规范） |

### 3.2 实现位置

```js
// SerialCube.html:11415-11458
NS.crcRangeSections = function (protocol, allBytes) {
  // 按 protocol.crcRange 切出参与 CRC 的字节
  // 找到 crc 字段下标 → 按 crcRange 决定左边界 → 切片
};
```

---

## 4. CRC 字节编码

```js
// SerialCube.html:11459-11472
NS.encodeCrcBytes = function (crc, size, endian) {
  // size: 1 (8-bit) 或 2 (16-bit)
  // endian: 'LE' 或 'BE'
  // 返回 CRC 值对应的字节数组
};
```

### 4.1 例子

| CRC 值 | size | endian | 输出字节 |
|--------|------|--------|----------|
| 0xC5CD | 2 | LE | `C5 CD` |
| 0xC5CD | 2 | BE | `CD C5` |
| 0x1234 | 2 | LE | `34 12` |
| 0x1234 | 2 | BE | `12 34` |
| 0xAB | 1 | * | `AB` |

---

## 5. 计算一次 CRC 校验的完整流程

```
1. 拿协议模板 (protocol) + 整帧字节 (allBytes, 含 crc 字段)
2. 调用 NS.crcRangeSections(protocol, allBytes)
   → 返回参与 CRC 运算的字节切片
3. 调用 NS.computeCrc(protocol.crcType, slice, protocol.crcInit)
   → 返回 CRC 数值
4. 调用 NS.encodeCrcBytes(crc, NS.crcByteSize(protocol.crcType), protocol.crcEndian)
   → 返回 CRC 字节
5. 跟 allBytes 中 crc 字段对比
   → 相等 = 通过, 不等 = CRC 错误
```

### 5.1 代码模板

```js
// 验证一帧
const protocol = NS.PROTOCOLS[0]; // 假设 BMS
const allBytes = [0xAA, 0x01, 0x01, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0xCD, 0xC5, 0x55];
const crcSlice = NS.crcRangeSections(protocol, allBytes);
const expectedCrc = NS.computeCrc(protocol.crcType, crcSlice, protocol.crcInit);
const actualCrcBytes = NS.encodeCrcBytes(expectedCrc, NS.crcByteSize(protocol.crcType), protocol.crcEndian);
// 比对 actualCrcBytes 和 allBytes 中 crc 字段位置
```

---

## 6. 常见错误排查

### 6.1 CRC 校验总失败

| 可能原因 | 怎么排查 |
|----------|----------|
| `crcType` 选错 | 确认设备协议文档里写的什么 CRC (Modbus / CCITT / CRC-8 / Checksum / XOR) |
| `crcInit` 写错 | 多数是 0xFFFF,但 CCITT 可能是 0x0000 / 0x1D0F |
| `crcEndian` 写反 | 试 LE 和 BE 看哪个过 |
| `crcRange` 写错 | 确认 header / tail 是否参与 CRC |
| length 字段参与 CRC | 多数不参与（length 在 crc 之前） |
| data 段长度算错 | 确认 length 字段是 data 段字节数（不是整帧） |

### 6.2 偶发 CRC 失败

| 可能原因 | 怎么排查 |
|----------|----------|
| 串口丢字节 | 降波特率 / 改硬件 |
| 字节序搞错 | 设备文档明确说 BE/LE |
| 跨字节边界 | 确认 data 对齐 |
| payload 长度不匹配 | length 字段是 data 字节数 |

### 6.3 调试技巧

```js
// Console 调试: 算一段字节的 CRC
const bytes = [0x01, 0x03, 0x00, 0x00, 0x00, 0x0A];
console.log('Modbus CRC:', NS.crc16Modbus(bytes).toString(16)); // 期望 c5cd
console.log('CCITT CRC:', NS.crc16Ccitt(bytes).toString(16));
console.log('CRC-8:', NS.crc8(bytes).toString(16));
console.log('Checksum:', NS.crcChecksum(bytes).toString(16));
console.log('XOR:', NS.crcXor(bytes).toString(16));
```

---

## 7. 经典测试向量（速查）

| 输入 (hex) | Modbus | CCITT | CRC-8 | Checksum | XOR |
|------------|--------|-------|-------|----------|-----|
| `01 03 00 00 00 0A` | `C5CD` | — | — | `0E` | `0B` |
| `01 04 02 FF FF` | `B880` | — | — | `05` | `04` |
| `12 34 56 78 9A` | — | `C1B0` | — | `76` | `0E` |
| `00` (单字节) | `FFFF` | `FF00` | `00` | `00` | `00` |
| `FF` (单字节) | `0000` | `00FF` | `F8` | `FF` | `FF` |
| `'123456789'` (ASCII) | — | `29B1` | `F4` | — | — |

### 7.1 CCITT 经典测试向量

| 输入 | 期望 CRC | 备注 |
|------|----------|------|
| `'123456789'` (31 32 33 34 35 36 37 38 39) | `0x29B1` | 最常被引用的标准测试 |
| `''` (空) | `0xFFFF` | 初值不动 |
| `0x00` (单字节) | `0xFF00` | |

### 7.2 Modbus 经典测试向量

| 输入 | 期望 CRC | LE 帧字节 |
|------|----------|----------|
| `01 03 00 00 00 0A` | `0xC5CD` | `C5 CD` |
| `01 06 00 01 00 03` | `0xD80A` | `0A D8` |
| `02 03 00 00 00 02` | `0xC438` | `38 C4` |

---

## 8. Python 镜像实现（用于 protocol-copilot skill）

如果装了 `.minimax/skills/serial-protocol-copilot/`,Python 端有相同实现的 5 个函数（行为 100% 一致）:

```python
# scripts/serial_protocol.py
def crc16_modbus(bytes_data) -> int: ...
def crc16_ccitt(bytes_data, init=0xFFFF) -> int: ...
def crc8(bytes_data, init=0, poly=0x07) -> int: ...
def crc_checksum(bytes_data) -> int: ...
def crc_xor(bytes_data) -> int: ...
def compute_crc(algo, bytes_data, init=None) -> int: ...
```

详细测试向量见 protocol-copilot skill 的 `tests/test_serial_protocol.py`。

---

## 9. 链接到详细文档

| 我想了解 | 去看 |
|----------|------|
| 协议模板（CRC 在哪用） | [`PROTOCOL-TEMPLATES.md`](PROTOCOL-TEMPLATES.md) |
| 怎么改 CRC 实现 | [`../guides/DEVELOPER-GUIDE.md`](../guides/DEVELOPER-GUIDE.md) § 8.3 |
| SerialCube.html 内部结构 | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
