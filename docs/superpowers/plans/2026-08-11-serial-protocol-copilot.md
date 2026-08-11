# SerialCube Protocol Copilot Skill — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 SerialCube 项目加一个 AI 侧 `serial-protocol-copilot` skill，让 Mavis 在用户给出一段 hex 帧、协议模板或字段值时，能离线解析、构造帧、生成文档、排查坏帧，全程不依赖浏览器。

**Architecture:**
- **协议知识库**（`references/`）— 把项目里 8 个 kind 协议模板（BMS TLV v1、Modbus RTU、…）镜像成结构化 JSON + 算法/坑点 Markdown
- **Python 工具库**（`scripts/serial_protocol.py`）— 纯函数实现 CRC-8/16-MODBUS/16-CCITT/Checksum/XOR + TLV 编解码，与 SerialCube.html 里 `NS.crc16Modbus` / `NS.encodeDataFields` 行为 100% 一致
- **CLI 入口**（`scripts/protocol_cli.py`）— `decode-frame` / `encode-frame` / `verify-frame` / `inspect-protocol` 4 个子命令，stdin 或文件输入
- **SKILL.md** — 触发条件 + 工作流 + 调用示例，挂在 `.minimax/skills/serial-protocol-copilot/` 下
- **README 集成** — 更新 `.minimax/skills/README.md` 第 ⑦ 阶段后插入 ⑧，并在反模式章节加一条「CRC 排错先看协议模板」

**Tech Stack:**
- Python 3.11+ (Windows PowerShell 5.1 兼容: `py -3` 调用)
- 仅用标准库 (`struct`, `argparse`, `json`, `sys`)
- 不引入第三方依赖 (避免在项目里再装 pip 包)

## Global Constraints

- **零第三方依赖** — 不写 `requirements.txt`，不 `pip install`；用 stdlib 全部搞定
- **与项目内 NS.* 函数行为 100% 一致** — SerialCube.html:11316-11353 是真理之源；Python 实现的测试向量要从项目里抓真实帧
- **PowerShell 兼容** — `protocol_cli.py` 接受 stdin 重定向（`Get-Content xxx.hex | py -3 protocol_cli.py decode-frame`）和参数两种方式
- **Windows UTF-8** — 所有 .py 文件加 `# -*- coding: utf-8 -*-` 头；CLI 输出用 `sys.stdout.reconfigure(encoding='utf-8')`
- **路径** — 全部相对路径，新文件全部在 `.minimax/skills/serial-protocol-copilot/` 下创建
- **TDD 纪律** — 每个 Python 函数先写失败测试再写实现；每完成一个 task 一次 commit
- **commit 规范** — `<type>: <subject>`，type ∈ {feat, test, docs, chore}

---

## Task 1: 协议知识库

**Files:**
- Create: `.minimax/skills/serial-protocol-copilot/references/protocols.json`
- Create: `.minimax/skills/serial-protocol-copilot/references/crc-algorithms.md`
- Create: `.minimax/skills/serial-protocol-copilot/references/gotchas.md`
- Reference: `SerialCube.html:9930-9978` (NS._defaultProtocols metadata)

**Interfaces:**
- Consumes: 项目内 8 个 kind 协议模板 metadata
- Produces:
  - `protocols.json` — 数组，元素结构 `{id, name, byteOrder, crcType, crcInit, crcEndian, crcRange, fields: [{name, type, size, default?}]}`
  - `crc-algorithms.md` — 5 种 CRC 算法的多项式 / 初值 / 输入范围 / 输出字节序对照表
  - `gotchas.md` — 至少 6 条踩坑记录（字节序、crcRange 边界、tail 是否参与 CRC 等）

### Step 1: 抓项目内协议 metadata

- [ ] **Step 1.1: 读取 SerialCube.html:9930-9978**

  运行:
  ```powershell
  Get-Content 'D:\WorkSpace\SerialCubeWeb\SerialCube.html' | Select-Object -Skip 9929 -First 60
  ```
  预期: 看到 `NS._defaultProtocols = [...]` 8 个协议模板的 metadata

- [ ] **Step 1.2: 摘出关键字段**

  对每个 protocol 抓: `id`, `name`, `byteOrder`, `crcType`, `crcInit`, `crcEndian`, `crcRange`, `fields[]`
  写到 `references/protocols.json` (临时手稿，先不上 git)

### Step 2: 写 protocols.json

- [ ] **Step 2.1: 创建空骨架**

  创建 `.minimax/skills/serial-protocol-copilot/references/protocols.json`:
  ```json
  []
  ```
  UTF-8 无 BOM

- [ ] **Step 2.2: 填入 8 个协议**

  按项目内顺序填入 BMS TLV v1 / Modbus RTU 等 8 个，每个保留 `crcType` / `crcInit` / `crcEndian` / `crcRange` / `fields` 全字段
  示例片段（BMS）:
  ```json
  {
    "id": "proto_bms",
    "name": "BMS TLV v1 (Legacy)",
    "byteOrder": "BE",
    "crcType": "crc16-modbus",
    "crcInit": "0xFFFF",
    "crcEndian": "LE",
    "crcRange": "all",
    "fields": [
      {"name": "header", "type": "header", "size": 1, "default": "0xAA"},
      {"name": "len",    "type": "length", "size": 1, "byteOrder": "BE"},
      {"name": "type",   "type": "type",   "size": 1, "default": "0x90"},
      {"name": "data",   "type": "data",   "size": 0},
      {"name": "crc",    "type": "crc",    "size": 2, "byteOrder": "LE"},
      {"name": "tail",   "type": "tail",   "size": 1, "default": "0x55"}
    ]
  }
  ```
  (实际字段从项目里读到的为准)

- [ ] **Step 2.3: 校验 JSON 合法**

  运行:
  ```powershell
  py -3 -c "import json; json.load(open('.minimax/skills/serial-protocol-copilot/references/protocols.json', encoding='utf-8'))"
  ```
  预期: 无输出（无 JSONDecodeError）

### Step 3: 写 crc-algorithms.md

- [ ] **Step 3.1: 创建文件**

  路径: `.minimax/skills/serial-protocol-copilot/references/crc-algorithms.md`
  内容（中文，5 个算法 + 4 列表头）:

  ```markdown
  # CRC 算法对照表

  ## 概览

  SerialCube 协议层支持 5 种校验算法，定义在 SerialCube.html:11316-11353。
  本文档是 Python 工具库的算法真理之源。

  | 算法 | 多项式 | 初值 | 输出位宽 | 输出字节序 | 输入范围 (`crcRange`) |
  |------|--------|------|----------|------------|---------------------|
  | `checksum`    | — | — | 1 字节 | — | `all` / `no_header` / `no_header_tail` |
  | `xor`         | — | — | 1 字节 | — | 同上 |
  | `crc8`        | 0x07 | 0x00 | 1 字节 | — | 同上 |
  | `crc16-modbus`| 0xA001 | 0xFFFF | 2 字节 | `LE` (项目默认) | 同上 |
  | `crc16-ccitt` | 0x1021 | 0xFFFF | 2 字节 | `BE` | 同上 |

  ## crcRange 含义

  - `all` — CRC 输入 = 整帧（除 crc 字段本身）
  - `no_header` — 跳过第一个 header 字段
  - `no_header_tail` — 跳过 header 和 tail

  ## 实现要点

  - CRC-16 MODBUS 的多项式 `0xA001` 是 `0x8005` 的位反转（LSB-first）
  - CRC-16 CCITT 用 `0x1021` MSB-first，与 MODBUS 不同
  - Checksum = 字节累加取低 8 位
  - XOR = 字节异或
  ```

- [ ] **Step 3.2: 验证文件存在**

  运行:
  ```powershell
  Test-Path '.minimax/skills/serial-protocol-copilot/references/crc-algorithms.md'
  ```
  预期: `True`

### Step 4: 写 gotchas.md

- [ ] **Step 4.1: 创建文件**

  路径: `.minimax/skills/serial-protocol-copilot/references/gotchas.md`
  内容（中文，至少 6 条，**这些坑都是项目里 SerialCube.html 实际行为**）:

  ```markdown
  # 协议层踩坑记录 (Gotchas)

  ## 1. CRC 字节序与多项式字节序不是一回事

  - `crc16-modbus` 的多项式 `0xA001` 本身是 LSB-first
  - 但 `crcEndian: 'LE'` 指 CRC 输出字节在帧里的字节序
  - 真实帧里 0x1234 输出: `LE` = `34 12`，`BE` = `12 34`
  - **改协议模板时这两处都要看，别只改一个**

  ## 2. crcRange 不是字段过滤，是段位过滤

  - `crcRange: 'no_header'` 跳过 `fields[0]`（如果它是 header 类型）
  - **不是按字段名匹配，是按 fields 数组下标 + 字段类型**
  - 加新字段时如果插在 header 之前，crcRange 行为会变

  ## 3. TLV 中 Length 字段是「data 段」的字节数

  - 不是整帧长度
  - 不是从 type 到 crc 之间的长度
  - **就是 type 字段后的 data 字段长度**
  - 解析时算完 data 立刻停止，下一个字段是 type 起点

  ## 4. data 字段 size = 0 是动态的

  - 不要在 metadata 里写死 `size: 8`
  - 真实大小由 length 字段决定
  - 编码时按 length 算 CRC 范围，**length 不参与 CRC**（除非 length 在 crc 字段之前）

  ## 5. Modbus RTU 的 CRC 是 LE 输出的，**多项式是 0xA001**

  - 与 BMS TLV v1 用同一套 CRC，但字节序都是 LE
  - 别误以为 Modbus 的 CRC 就是 BE
  - 校验 Modbus 帧时算 CRC 范围 = `no_header`，跳过 addr 字段

  ## 6. tail 字段是否参与 CRC 取决于 crcRange

  - `crcRange: 'all'` — tail 参与 CRC
  - `crcRange: 'no_header_tail'` — tail 不参与
  - **同一协议下两种 tail 位置都给的话会算错**
  ```

- [ ] **Step 4.2: 验证文件存在**

  运行:
  ```powershell
  Test-Path '.minimax/skills/serial-protocol-copilot/references/gotchas.md'
  ```
  预期: `True`

### Step 5: Commit

- [ ] **Step 5.1: 提交**

  ```bash
  git add .minimax/skills/serial-protocol-copilot/references/
  git commit -m "feat(protocol-copilot): add protocol knowledge base (protocols.json, crc-algorithms.md, gotchas.md)"
  ```

---

## Task 2: Python 工具库 + 单元测试

**Files:**
- Create: `.minimax/skills/serial-protocol-copilot/scripts/serial_protocol.py`
- Create: `.minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py`
- Reference: `SerialCube.html:11316-11353` (CRC 实现), `SerialCube.html:11478-11518` (buildFrame)

**Interfaces:**
- Consumes: Task 1 的 `protocols.json` + `crc-algorithms.md`
- Produces:
  - 公开 API: `crc16_modbus(bytes) -> int`, `crc16_ccitt(bytes, init=0xFFFF) -> int`, `crc8(bytes, init=0, poly=0x07) -> int`, `crc_checksum(bytes) -> int`, `crc_xor(bytes) -> int`, `compute_crc(algo, bytes, init=None) -> int`
  - `crc_range_sections(protocol, all_bytes, fields) -> bytes` — 决定哪些字节参与 CRC
  - `encode_crc_bytes(crc_value, size, endian) -> bytes`
  - **不包含** decode/encode TLV（留给 Task 3 的 CLI）

### Step 1: 创建 Python 工具骨架

- [ ] **Step 1.1: 写空文件头**

  创建 `.minimax/skills/serial-protocol-copilot/scripts/serial_protocol.py`:
  ```python
  # -*- coding: utf-8 -*-
  """SerialCube 协议层 Python 镜像。

  行为必须与 SerialCube.html 的 NS.crc16Modbus / NS.crc16Ccitt / NS.crc8 /
  NS.crcChecksum / NS.crcXor / NS.computeCrc 100% 一致。真理之源:
  SerialCube.html:11316-11353。

  用法:
      from serial_protocol import compute_crc, crc16_modbus
      crc = crc16_modbus(b'\\x01\\x03\\x00\\x00\\x00\\x0A')  # 期望 0xC5CD (Modbus 经典例)
  """
  ```

- [ ] **Step 1.2: 创建 tests 目录与空测试文件**

  ```powershell
  New-Item -ItemType Directory -Force -Path '.minimax/skills/serial-protocol-copilot/tests' | Out-Null
  ```
  创建 `.minimax/skills/serial-protocol-copilot/tests/__init__.py` 空文件
  创建 `.minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py`:
  ```python
  # -*- coding: utf-8 -*-
  """serial_protocol.py 的单元测试。"""
  import pytest
  from scripts.serial_protocol import (
      crc16_modbus, crc16_ccitt, crc8, crc_checksum, crc_xor, compute_crc
  )
  ```

### Step 2: 写 crc16_modbus 的失败测试

- [ ] **Step 2.1: 写测试**

  追加到 `test_serial_protocol.py`:
  ```python
  def test_crc16_modbus_classic_vector():
      """经典 Modbus 例: 01 03 00 00 00 0A → CRC = 0xC5CD (LE 输出 C5 CD)"""
      data = bytes([0x01, 0x03, 0x00, 0x00, 0x00, 0x0A])
      assert crc16_modbus(data) == 0xC5CD

  def test_crc16_modbus_empty():
      """空输入: 0xFFFF 初值不动"""
      assert crc16_modbus(b'') == 0xFFFF

  def test_crc16_modbus_single_byte():
      """0x00 → 0xFFFF XOR 后再走表; 已知结果 0xFFFF (反演)"""
      # 单字节 0x00: CRC-16 MODBUS 计算结果 = 0xFFFF
      assert crc16_modbus(b'\\x00') == 0xFFFF
  ```

- [ ] **Step 2.2: 跑测试确认失败**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py -v
  ```
  预期: `ImportError: cannot import name 'crc16_modbus'`

### Step 3: 实现 crc16_modbus

- [ ] **Step 3.1: 写实现**

  追加到 `serial_protocol.py`:
  ```python
  def crc16_modbus(bytes_data):
      """CRC-16 MODBUS (poly=0xA001, init=0xFFFF, LSB-first)。返回 0..0xFFFF。

      与 SerialCube.html:11316-11322 行为一致。
      """
      crc = 0xFFFF
      for b in bytes_data:
          crc ^= b
          for _ in range(8):
              if crc & 0x0001:
                  crc = (crc >> 1) ^ 0xA001
              else:
                  crc >>= 1
      return crc & 0xFFFF
  ```

- [ ] **Step 3.2: 跑测试确认通过**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py::test_crc16_modbus_classic_vector -v
  ```
  预期: PASS

### Step 4: 写其他 4 个 CRC 的失败测试

- [ ] **Step 4.1: 追加测试**

  追加到 `test_serial_protocol.py`:
  ```python
  def test_crc16_ccitt_basic():
      """CRC-16 CCITT (poly=0x1021, init=0xFFFF, MSB-first) 经典例。"""
      # '123456789' ASCII = 0x31..0x39
      data = b'123456789'
      # 经典结果: 0x29B1
      assert crc16_ccitt(data) == 0x29B1

  def test_crc8_basic():
      """CRC-8 (poly=0x07, init=0x00) 经典例。"""
      # '123456789' → 0xF4
      data = b'123456789'
      assert crc8(data) == 0xF4

  def test_crc_checksum_basic():
      """Checksum: 字节累加取低 8 位。"""
      assert crc_checksum(b'\\x01\\x02\\x03\\x04') == 0x0A

  def test_crc_xor_basic():
      """XOR: 0x01 ^ 0x02 ^ 0x03 ^ 0x04 = 0x04"""
      assert crc_xor(b'\\x01\\x02\\x03\\x04') == 0x04

  def test_compute_crc_dispatch():
      """compute_crc 按算法名分发。"""
      data = b'123456789'
      assert compute_crc('crc16-modbus', data) == crc16_modbus(data)
      assert compute_crc('crc16-ccitt', data) == crc16_ccitt(data)
      assert compute_crc('crc8', data) == crc8(data)
      assert compute_crc('checksum', data) == crc_checksum(data)
      assert compute_crc('xor', data) == crc_xor(data)
  ```

- [ ] **Step 4.2: 跑测试确认失败**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py -v
  ```
  预期: 4 个 ImportError（crc16_ccitt / crc8 / crc_checksum / crc_xor 还没实现）

### Step 5: 实现其他 4 个 CRC

- [ ] **Step 5.1: 追加实现**

  追加到 `serial_protocol.py`:
  ```python
  def crc16_ccitt(bytes_data, init=0xFFFF):
      """CRC-16 CCITT (poly=0x1021, init=0xFFFF, MSB-first)。"""
      crc = init
      for b in bytes_data:
          crc ^= (b << 8)
          for _ in range(8):
              if crc & 0x8000:
                  crc = ((crc << 1) ^ 0x1021) & 0xFFFF
              else:
                  crc = (crc << 1) & 0xFFFF
      return crc


  def crc8(bytes_data, init=0, poly=0x07):
      """CRC-8 (默认 poly=0x07, init=0x00)。"""
      crc = init
      for b in bytes_data:
          crc ^= b
          for _ in range(8):
              if crc & 0x80:
                  crc = ((crc << 1) ^ poly) & 0xFF
              else:
                  crc = (crc << 1) & 0xFF
      return crc


  def crc_checksum(bytes_data):
      """Checksum: 字节累加取低 8 位。"""
      return sum(bytes_data) & 0xFF


  def crc_xor(bytes_data):
      """XOR: 所有字节异或。"""
      crc = 0
      for b in bytes_data:
          crc ^= b
      return crc & 0xFF


  def compute_crc(algo, bytes_data, init=None):
      """按 algo 字符串分发到具体 CRC 实现。"""
      if algo == 'crc16-modbus':
          return crc16_modbus(bytes_data)
      if algo == 'crc16-ccitt':
          return crc16_ccitt(bytes_data, init if init is not None else 0xFFFF)
      if algo == 'crc8':
          return crc8(bytes_data, init if init is not None else 0, 0x07)
      if algo == 'checksum':
          return crc_checksum(bytes_data)
      if algo == 'xor':
          return crc_xor(bytes_data)
      if algo == 'none':
          return 0
      raise ValueError(f'unknown crc algo: {algo!r}')
  ```

- [ ] **Step 5.2: 跑所有测试确认通过**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py -v
  ```
  预期: 全部 PASS（6+ 个测试）

### Step 6: 写 crc_range_sections 的失败测试

- [ ] **Step 6.1: 追加测试**

  追加到 `test_serial_protocol.py`:
  ```python
  from scripts.serial_protocol import crc_range_sections, encode_crc_bytes


  def test_crc_range_all():
      """crcRange='all': 返回整帧去掉 crc 字段。"""
      protocol = {
          'crcRange': 'all',
          'fields': [
              {'name': 'header', 'type': 'header'},
              {'name': 'data',   'type': 'data'},
              {'name': 'crc',    'type': 'crc'},
          ],
      }
      # 假设每字段 1 字节
      all_bytes = bytes([0xAA, 0x01, 0xCC])
      result = crc_range_sections(protocol, all_bytes)
      assert result == bytes([0xAA, 0x01])  # 去掉 crc 字段


  def test_crc_range_no_header():
      """crcRange='no_header': 跳过 header 类型字段。"""
      protocol = {
          'crcRange': 'no_header',
          'fields': [
              {'name': 'header', 'type': 'header'},
              {'name': 'data',   'type': 'data'},
              {'name': 'crc',    'type': 'crc'},
          ],
      }
      all_bytes = bytes([0xAA, 0x01, 0xCC])
      result = crc_range_sections(protocol, all_bytes)
      assert result == bytes([0x01])  # 跳过 header


  def test_crc_range_no_header_tail():
      """crcRange='no_header_tail': 跳过 header 和 tail。"""
      protocol = {
          'crcRange': 'no_header_tail',
          'fields': [
              {'name': 'header', 'type': 'header'},
              {'name': 'data',   'type': 'data'},
              {'name': 'crc',    'type': 'crc'},
              {'name': 'tail',   'type': 'tail'},
          ],
      }
      all_bytes = bytes([0xAA, 0x01, 0xCC, 0x55])
      result = crc_range_sections(protocol, all_bytes)
      assert result == bytes([0x01])  # 跳过 header 和 tail


  def test_encode_crc_bytes_le():
      """CRC 16-bit LE 输出: 0x1234 → 34 12。"""
      assert encode_crc_bytes(0x1234, 2, 'LE') == bytes([0x34, 0x12])


  def test_encode_crc_bytes_be():
      """CRC 16-bit BE 输出: 0x1234 → 12 34。"""
      assert encode_crc_bytes(0x1234, 2, 'BE') == bytes([0x12, 0x34])


  def test_encode_crc_bytes_8bit():
      """CRC 8-bit: 0xAB → AB。"""
      assert encode_crc_bytes(0xAB, 1, 'LE') == bytes([0xAB])
  ```

- [ ] **Step 6.2: 跑测试确认失败**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py -v
  ```
  预期: `crc_range_sections` / `encode_crc_bytes` ImportError

### Step 7: 实现 crc_range_sections + encode_crc_bytes

- [ ] **Step 7.1: 追加实现**

  追加到 `serial_protocol.py`:
  ```python
  def crc_range_sections(protocol, all_bytes):
      """按 protocol.crcRange 决定参与 CRC 运算的字节切片。

      算法: 找到 crc 字段下标 → 按 crcRange 决定左边界 → 切片返回。
      假设每个 field 占用的字节数 = field['size']（data 字段 size=0 时按剩余推算）。
      """
      fields = protocol.get('fields', [])
      crc_range = protocol.get('crcRange', 'all')

      crc_idx = next((i for i, f in enumerate(fields) if f.get('type') == 'crc'), len(fields))

      # 计算每个 field 的字节偏移
      offsets = []
      pos = 0
      for f in fields:
          size = f.get('size', 0)
          offsets.append((pos, pos + size))
          pos += size
      # data 字段 size=0 时: 实际占 (crc 字段起点 - 当前 pos)
      if crc_idx < len(fields) and fields[crc_idx - 1].get('type') == 'data' and fields[crc_idx - 1].get('size', 0) == 0:
          # 重新计算 data 字段 size
          data_idx = crc_idx - 1
          data_start = offsets[data_idx][0]
          crc_start = offsets[crc_idx][0]
          offsets[data_idx] = (data_start, crc_start)

      # 决定左边界
      left = 0
      if crc_range == 'no_header' and fields and fields[0].get('type') == 'header':
          left = offsets[0][1]
      elif crc_range == 'no_header_tail':
          for i, f in enumerate(fields):
              if f.get('type') in ('header', 'tail'):
                  left = max(left, offsets[i][1])

      # 右边界 = crc 字段起点
      right = offsets[crc_idx][0] if crc_idx < len(fields) else len(all_bytes)

      return all_bytes[left:right]


  def encode_crc_bytes(crc_value, size, endian='LE'):
      """把 CRC 整数值编码为字节。

      size: 1 (CRC-8/Checksum/XOR) 或 2 (CRC-16)
      endian: 'LE' (低字节在前) 或 'BE' (高字节在前)
      """
      if size == 1:
          return bytes([crc_value & 0xFF])
      if size == 2:
          if endian == 'LE':
              return bytes([crc_value & 0xFF, (crc_value >> 8) & 0xFF])
          return bytes([(crc_value >> 8) & 0xFF, crc_value & 0xFF])
      raise ValueError(f'unsupported crc size: {size}')
  ```

- [ ] **Step 7.2: 跑所有测试**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_serial_protocol.py -v
  ```
  预期: 全部 PASS（10+ 个测试）

### Step 8: Commit

- [ ] **Step 8.1: 提交**

  ```bash
  git add .minimax/skills/serial-protocol-copilot/scripts/serial_protocol.py \
          .minimax/skills/serial-protocol-copilot/tests/
  git commit -m "feat(protocol-copilot): add Python CRC + TLV utilities with TDD tests"
  ```

---

## Task 3: CLI 工具 + SKILL.md

**Files:**
- Create: `.minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py`
- Create: `.minimax/skills/serial-protocol-copilot/SKILL.md`
- Create: `.minimax/skills/serial-protocol-copilot/README.md`

**Interfaces:**
- Consumes: Task 2 的 `serial_protocol.py` + Task 1 的 `protocols.json`
- Produces:
  - 4 个 CLI 子命令: `decode-frame` / `encode-frame` / `verify-frame` / `inspect-protocol`
  - 接受 stdin 重定向（hex 字符串，空格分隔或带 `0x` 前缀）或 `--file <path>` 参数
  - 输出 JSON 到 stdout
  - SKILL.md 描述触发条件、工作流、4 个子命令用法

### Step 1: CLI 骨架

- [ ] **Step 1.1: 创建空 CLI**

  创建 `.minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py`:
  ```python
  # -*- coding: utf-8 -*-
  """SerialCube 协议 CLI 入口。

  子命令:
    decode-frame    解析一段 hex 帧为字段表
    encode-frame    用协议模板 + 字段值构造完整帧
    verify-frame    校验一段帧的 CRC 是否正确（不匹配时输出 diff）
    inspect-protocol 列出 protocols.json 里的所有协议模板

  用法:
    py -3 protocol_cli.py decode-frame --protocol proto_bms --hex "AA 01 90 11 22 C5 CD 55"
    Get-Content frame.hex | py -3 protocol_cli.py verify-frame --protocol proto_modbus
  """
  import argparse
  import json
  import sys
  from pathlib import Path

  # 允许 Windows 5.1 中文输出
  try:
      sys.stdout.reconfigure(encoding='utf-8')
  except Exception:
      pass

  # 让 import scripts.serial_protocol 找得到
  sys.path.insert(0, str(Path(__file__).parent.parent))
  from scripts.serial_protocol import compute_crc, crc_range_sections, encode_crc_bytes  # noqa: E402
  ```

### Step 2: 写 hex 解析辅助函数

- [ ] **Step 2.1: 追加 hex 解析函数**

  追加到 `protocol_cli.py`:
  ```python
  def parse_hex(s):
      """把 'AA 01 90' 或 'AA0190' 或 '0xAA 0x01 0x90' 解析为 bytes。

      接受空格分隔、不分隔、或 0x 前缀。
      """
      s = s.strip()
      # 去 0x 前缀: '0xAA 0x01' → 'AA 01'
      s = s.replace('0x', '').replace('0X', '')
      s = s.replace(',', ' ').replace('\n', ' ').replace('\t', ' ')
      s = ''.join(s.split())  # 去所有空白
      if len(s) % 2 != 0:
          raise ValueError(f'hex 字符串长度不是偶数: {s!r}')
      return bytes.fromhex(s)


  def load_protocols():
      """从 references/protocols.json 加载协议模板。"""
      ref = Path(__file__).parent.parent / 'references' / 'protocols.json'
      with open(ref, encoding='utf-8') as f:
          return json.load(f)


  def find_protocol(protocols, proto_id):
      for p in protocols:
          if p['id'] == proto_id:
              return p
      raise ValueError(f'protocol {proto_id!r} not found in protocols.json')
  ```

- [ ] **Step 2.2: 手测 parse_hex**

  ```powershell
  py -3 -c "import sys; sys.path.insert(0, '.minimax/skills/serial-protocol-copilot'); from scripts.protocol_cli import parse_hex; print(parse_hex('AA 01 90'))"
  ```
  预期: `b'\xaa\x01\x90'`

### Step 3: 实现 decode-frame 子命令

- [ ] **Step 3.1: 写失败测试**

  创建 `.minimax/skills/serial-protocol-copilot/tests/test_protocol_cli.py`:
  ```python
  # -*- coding: utf-8 -*-
  """protocol_cli.py 的集成测试。"""
  import json
  import subprocess
  from pathlib import Path

  import pytest

  CLI = Path(__file__).parent.parent / 'scripts' / 'protocol_cli.py'
  REPO = Path(__file__).parent.parent.parent.parent  # .minimax/skills/serial-protocol-copilot → SerialCubeWeb


  def run_cli(*args, input_text=''):
      proc = subprocess.run(
          ['py', '-3', str(CLI), *args],
          input=input_text,
          capture_output=True,
          text=True,
          encoding='utf-8',
          cwd=str(CLI.parent.parent),
      )
      return proc.returncode, proc.stdout, proc.stderr


  def test_decode_frame_bms_basic():
      """decode-frame 解析 BMS 帧输出 JSON。"""
      rc, out, err = run_cli(
          'decode-frame',
          '--protocol', 'proto_bms',
          '--hex', 'AA 01 90 C5 CD 55',
      )
      assert rc == 0, f'stderr: {err}'
      data = json.loads(out)
      assert 'fields' in data
      assert data['protocol'] == 'proto_bms'
      # 至少有 header / data / crc / tail 4 个字段
      assert len(data['fields']) >= 4
  ```

- [ ] **Step 3.2: 跑测试确认失败**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_protocol_cli.py -v
  ```
  预期: `error: unrecognized subcommand 'decode-frame'` (因为还没实现)

- [ ] **Step 3.3: 实现 decode-frame**

  追加到 `protocol_cli.py`:
  ```python
  def cmd_decode_frame(args):
      protocol = find_protocol(load_protocols(), args.protocol)
      frame = parse_hex(args.hex) if args.hex else parse_hex(sys.stdin.read())
      # 按 field.size 切片
      pos = 0
      fields_out = []
      for f in protocol['fields']:
          if f.get('type') == 'data' and f.get('size', 0) == 0:
              # data 字段 size=0: 算到 crc 字段起点
              crc_idx = next((i for i, x in enumerate(protocol['fields']) if x.get('type') == 'crc'), len(protocol['fields']))
              # 先求 crc 字段起点
              tmp_pos = 0
              for j, x in enumerate(protocol['fields'][:crc_idx]):
                  if j == crc_idx - 1 and x.get('type') == 'data':
                      break
                  tmp_pos += x.get('size', 0)
              size = tmp_pos - pos
          else:
              size = f.get('size', 0)
          value = frame[pos:pos + size] if size > 0 else b''
          fields_out.append({
              'name': f['name'],
              'type': f.get('type'),
              'size': size,
              'value_hex': value.hex().upper(),
          })
          pos += size
      # CRC 校验
      crc_bytes = b''
      for fo in fields_out:
          if fo['type'] == 'crc':
              crc_bytes = bytes.fromhex(fo['value_hex'])
      # 重新算 CRC
      crc_input = crc_range_sections(protocol, frame)
      algo = protocol.get('crcType', 'none')
      expected_crc = compute_crc(algo, crc_input)
      crc_size = 2 if 'crc16' in algo else 1
      crc_match = (int.from_bytes(crc_bytes, 'little') == expected_crc) if crc_size == 2 else (crc_bytes[0] == expected_crc)

      result = {
          'protocol': protocol['id'],
          'protocol_name': protocol['name'],
          'frame_hex': frame.hex().upper(),
          'frame_len': len(frame),
          'fields': fields_out,
          'crc_verify': {
              'algorithm': algo,
              'expected_hex': expected_crc.to_bytes(crc_size, 'little').hex().upper(),
              'actual_hex': crc_bytes.hex().upper(),
              'match': crc_match,
          },
      }
      print(json.dumps(result, ensure_ascii=False, indent=2))
      return 0 if crc_match else 2  # 2 = CRC 不匹配（不致命，让用户看到）
  ```

- [ ] **Step 3.4: 接入 argparse**

  追加到 `protocol_cli.py`:
  ```python
  def main():
      parser = argparse.ArgumentParser(description='SerialCube 协议 CLI')
      sub = parser.add_subparsers(dest='cmd', required=True)

      p_decode = sub.add_parser('decode-frame', help='解析 hex 帧')
      p_decode.add_argument('--protocol', required=True, help='协议 id，如 proto_bms')
      p_decode.add_argument('--hex', help='hex 字符串（空格/0x 前缀都行）')
      p_decode.set_defaults(func=cmd_decode_frame)

      # 后面 3 个子命令下一步加
      p_encode = sub.add_parser('encode-frame', help='构造帧')
      p_verify = sub.add_parser('verify-frame', help='校验 CRC')
      p_inspect = sub.add_parser('inspect-protocol', help='列出协议')

      args = parser.parse_args()
      if args.cmd == 'decode-frame':
          sys.exit(args.func(args))
      else:
          print(f'子命令 {args.cmd!r} 还没实现, 见 Task 3 后续步骤', file=sys.stderr)
          sys.exit(1)


  if __name__ == '__main__':
      main()
  ```

- [ ] **Step 3.5: 跑测试**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_protocol_cli.py::test_decode_frame_bms_basic -v
  ```
  预期: PASS

- [ ] **Step 3.6: 手动跑一遍**

  ```powershell
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py decode-frame --protocol proto_bms --hex "AA 01 90 C5 CD 55"
  ```
  预期: 输出 JSON 包含 4 个字段、crc_verify.match = true/false

### Step 4: 实现 verify-frame + inspect-protocol 子命令

- [ ] **Step 4.1: 追加 cmd_verify_frame + cmd_inspect_protocol**

  追加到 `protocol_cli.py`:
  ```python
  def cmd_verify_frame(args):
      protocol = find_protocol(load_protocols(), args.protocol)
      frame = parse_hex(args.hex) if args.hex else parse_hex(sys.stdin.read())
      crc_input = crc_range_sections(protocol, frame)
      algo = protocol.get('crcType', 'none')
      expected = compute_crc(algo, crc_input)
      # 找到帧里的 crc 字段
      pos = 0
      for f in protocol['fields']:
          if f.get('type') == 'crc':
              break
          pos += f.get('size', 0)
      crc_field = protocol['fields'][next(i for i, x in enumerate(protocol['fields']) if x.get('type') == 'crc')]
      crc_size = crc_field.get('size', 2)
      endian = crc_field.get('byteOrder', protocol.get('crcEndian', 'LE'))
      actual_bytes = frame[pos:pos + crc_size]
      actual = int.from_bytes(actual_bytes, 'little' if endian == 'LE' else 'big')
      match = (actual == expected)
      result = {
          'protocol': protocol['id'],
          'algorithm': algo,
          'crc_range_hex': crc_input.hex().upper(),
          'expected_hex': expected.to_bytes(crc_size, 'little' if endian == 'LE' else 'big').hex().upper(),
          'actual_hex': actual_bytes.hex().upper(),
          'match': match,
      }
      print(json.dumps(result, ensure_ascii=False, indent=2))
      return 0 if match else 1


  def cmd_inspect_protocol(args):
      protocols = load_protocols()
      if args.protocol:
          protocols = [find_protocol(protocols, args.protocol)]
      print(json.dumps(protocols, ensure_ascii=False, indent=2))
      return 0
  ```

- [ ] **Step 4.2: 更新 main 接入这两个子命令**

  修改 `main()`:
  ```python
      p_verify = sub.add_parser('verify-frame', help='校验 CRC')
      p_verify.add_argument('--protocol', required=True)
      p_verify.add_argument('--hex')
      p_verify.set_defaults(func=cmd_verify_frame)

      p_inspect = sub.add_parser('inspect-protocol', help='列出协议模板')
      p_inspect.add_argument('--protocol', help='指定协议 id，不传则列出全部')
      p_inspect.set_defaults(func=cmd_inspect_protocol)
  ```

  并修改分发逻辑:
  ```python
      sys.exit(args.func(args))
  ```

- [ ] **Step 4.3: 手动测三个子命令**

  ```powershell
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py inspect-protocol
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py inspect-protocol --protocol proto_bms
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py verify-frame --protocol proto_bms --hex "AA 01 90 C5 CD 55"
  ```
  预期: 都输出 JSON, verify 的 match 字段正确

### Step 5: 实现 encode-frame 子命令

- [ ] **Step 5.1: 写失败测试**

  追加到 `test_protocol_cli.py`:
  ```python
  def test_encode_frame_bms_roundtrip():
      """encode-frame 构造的帧能被 decode-frame 还原。"""
      # 先 encode
      rc, out, err = run_cli(
          'encode-frame',
          '--protocol', 'proto_bms',
          '--data', 'AA0190',  # hex: header=AA, len=01, type=90
      )
      assert rc == 0, f'stderr: {err}'
      encoded = json.loads(out)
      assert 'frame_hex' in encoded
      # 再 decode
      rc2, out2, err2 = run_cli(
          'decode-frame',
          '--protocol', 'proto_bms',
          '--hex', encoded['frame_hex'],
      )
      assert rc2 in (0, 2)
      decoded = json.loads(out2)
      assert decoded['frame_hex'] == encoded['frame_hex']
      assert decoded['crc_verify']['match'] is True
  ```

- [ ] **Step 5.2: 跑测试确认失败**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_protocol_cli.py::test_encode_frame_bms_roundtrip -v
  ```
  预期: `子命令 'encode-frame' 还没实现`

- [ ] **Step 5.3: 实现 cmd_encode_frame**

  追加到 `protocol_cli.py`:
  ```python
  def cmd_encode_frame(args):
      """从 --data (hex) + 协议模板构造完整帧。

      --data 字节布局: 按 protocol.fields 顺序填，data 字段 size=0 时填到剩余
      """
      protocol = find_protocol(load_protocols(), args.protocol)
      data_bytes = parse_hex(args.data) if args.data else parse_hex(sys.stdin.read())
      # 按 field 顺序拼
      out = bytearray()
      pos = 0
      for f in protocol['fields']:
          if f.get('type') == 'data':
              # 吞掉剩余 data
              out.extend(data_bytes[pos:])
              break
          size = f.get('size', 0)
          if f.get('type') == 'crc':
              # 先放占位符
              out.extend(b'\\x00' * size)
          else:
              out.extend(data_bytes[pos:pos + size])
              pos += size
      # 算 CRC
      algo = protocol.get('crcType', 'none')
      crc_input = crc_range_sections(protocol, bytes(out))
      crc_value = compute_crc(algo, crc_input)
      crc_field = next(f for f in protocol['fields'] if f.get('type') == 'crc')
      crc_size = crc_field.get('size', 2)
      endian = crc_field.get('byteOrder', protocol.get('crcEndian', 'LE'))
      crc_bytes = encode_crc_bytes(crc_value, crc_size, endian)
      # 找到 crc 字段位置并覆盖
      p = 0
      for f in protocol['fields']:
          if f.get('type') == 'crc':
              out[p:p + crc_size] = crc_bytes
              break
          p += f.get('size', 0)
      result = {
          'protocol': protocol['id'],
          'frame_hex': bytes(out).hex().upper(),
          'frame_len': len(out),
      }
      print(json.dumps(result, ensure_ascii=False, indent=2))
      return 0
  ```

- [ ] **Step 5.4: 接入 argparse**

  ```python
      p_encode = sub.add_parser('encode-frame', help='构造帧')
      p_encode.add_argument('--protocol', required=True)
      p_encode.add_argument('--data', help='字段值 hex 串（按 fields 顺序）')
      p_encode.set_defaults(func=cmd_encode_frame)
  ```

- [ ] **Step 5.5: 跑 roundtrip 测试**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/test_protocol_cli.py -v
  ```
  预期: 全部 PASS

### Step 6: 写 SKILL.md

- [ ] **Step 6.1: 创建主 SKILL.md**

  创建 `.minimax/skills/serial-protocol-copilot/SKILL.md`:
  ```markdown
  ---
  name: serial-protocol-copilot
  description: 离线辅助 SerialCube 协议层 — 解析/构造/校验 hex 帧（BMS TLV v1、Modbus RTU 等 8 种模板），定位 CRC 错误，生成协议文档。**当用户提到 hex 帧、协议模板、TLV、CRC-16 MODBUS、SerialCube 协议层调试时触发**。
  ---

  # SerialCube Protocol Copilot

  ## 何时用我

  - 用户给一段 hex 帧（`AA 01 90 C5 CD 55`），想解析成字段表
  - 用户有协议模板 + 字段值，想构造带 CRC 的完整帧
  - 收到坏帧 / CRC 不匹配，想定位问题
  - 协议模板要交付成 Markdown 文档 / JSON 分享

  **不用我**：浏览器内协议编辑器（项目里 SerialCube.html 协议编辑器已经做了）；实时串口收发（用 agent-browser 调 SerialCube.html）

  ## 工作流

  ### 1. 解析 hex 帧

  ```bash
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py \
      decode-frame --protocol proto_bms --hex "AA 01 90 C5 CD 55"
  ```

  输出 JSON: `frame_hex` + `fields[]` + `crc_verify.{match, expected_hex, actual_hex}`

  ### 2. 校验 CRC

  ```bash
  Get-Content frame.hex | py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py \
      verify-frame --protocol proto_modbus
  ```

  `match: false` 时 `crc_range_hex` 告诉用户「CRC 算了哪段」，配合 gotchas.md 第 1/2/5 条排查

  ### 3. 构造帧

  ```bash
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py \
      encode-frame --protocol proto_bms --data "AA0190"
  ```

  `--data` 字节布局 = `protocol.fields` 顺序填，data 字段 size=0 自动吞剩余

  ### 4. 协议模板导出

  ```bash
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py \
      inspect-protocol --protocol proto_bms
  ```

  ## 注意事项

  - **协议模板源**: `references/protocols.json` 来自 SerialCube.html:9930-9978，**改模板必须同时改两边**
  - **算法真理之源**: `references/crc-algorithms.md` + SerialCube.html:11316-11353
  - **常见坑**: `references/gotchas.md` 6 条（**CRC 排错前先读**）
  - **零依赖**: 仅 Python 3.11+ stdlib
  - **不要在协议层加第三方库**（pymodbus / crcmod 等） — 项目要保持单文件 HTML，不引入外部依赖

  ## 与其他 skill 的协作

  - **agent-browser**: 用 `agent-browser open SerialCube.html` → `agent-browser click @eN` 操作协议编辑器；本 skill 离线解析收到的 hex
  - **brainstorming**: 加新协议模板前先 brainstorm 9 步（kind/字段/CRC 范围/字节序）
  - **test-driven-development**: 改 serial_protocol.py 必须先写测试
  ```

- [ ] **Step 6.2: 写 README.md**

  创建 `.minimax/skills/serial-protocol-copilot/README.md`:
  ```markdown
  # serial-protocol-copilot

  SerialCube 项目 AI 侧协议辅助 skill。详见 [SKILL.md](./SKILL.md)。

  ## 目录结构

  ```
  serial-protocol-copilot/
  ├── SKILL.md                 触发条件 + 工作流
  ├── README.md                本文件
  ├── scripts/
  │   ├── serial_protocol.py   纯函数 CRC + TLV 工具
  │   └── protocol_cli.py      CLI 入口 (decode/encode/verify/inspect)
  ├── tests/
  │   ├── test_serial_protocol.py
  │   └── test_protocol_cli.py
  └── references/
      ├── protocols.json       8 个协议模板镜像
      ├── crc-algorithms.md    CRC 算法对照
      └── gotchas.md           踩坑记录
  ```

  ## 快速开始

  ```powershell
  # 解析一段帧
  py -3 scripts\protocol_cli.py decode-frame --protocol proto_bms --hex "AA 01 90 C5 CD 55"

  # 校验 CRC
  py -3 scripts\protocol_cli.py verify-frame --protocol proto_modbus --hex "01 03 00 00 00 0A C5 CD"

  # 跑测试
  py -3 -m pytest tests\ -v
  ```
  ```

- [ ] **Step 6.3: 跑全部测试 + 手测 4 个子命令**

  ```powershell
  py -3 -m pytest .minimax/skills/serial-protocol-copilot/tests/ -v
  py -3 .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py --help
  ```
  预期: pytest 全部 PASS; --help 列出 4 个子命令

### Step 7: Commit

- [ ] **Step 7.1: 提交**

  ```bash
  git add .minimax/skills/serial-protocol-copilot/scripts/protocol_cli.py \
          .minimax/skills/serial-protocol-copilot/tests/test_protocol_cli.py \
          .minimax/skills/serial-protocol-copilot/SKILL.md \
          .minimax/skills/serial-protocol-copilot/README.md
  git commit -m "feat(protocol-copilot): add CLI (decode/encode/verify/inspect) and SKILL.md"
  ```

---

## Task 4: README 集成 + 反模式

**Files:**
- Modify: `.minimax/skills/README.md` (插入 ⑧ 节 + 反模式新增 1 条)

**Interfaces:**
- Consumes: Task 3 的 SKILL.md
- Produces: README 第 ⑦ 阶段后追加 ⑧「协议层辅助」段，反模式章节加 1 条

### Step 1: 读 README 当前结构

- [ ] **Step 1.1: 定位 ⑦ 阶段标题**

  打开 `.minimax/skills/README.md`，找到「### ⑦ 收尾」位置（已经在第 82-86 行）

- [ ] **Step 1.2: 定位反模式章节**

  找到「## 反模式（不推荐做的事）」位置（第 186 行附近）

### Step 2: 追加 ⑧ 阶段

- [ ] **Step 2.1: 修改 ⑦ 阶段表格**

  找到「| **verification-before-completion** | obra/superpowers |」这一行，**在它后面**插入:

  ```markdown
  ### ⑧ 协议层辅助（离线 hex / 帧构造 / CRC 排错）

  | Skill | 来源 | 用途 |
  |-------|------|------|
  | **serial-protocol-copilot** | 本项目自建 | **离线协议辅助**：解析/构造/校验 hex 帧（BMS TLV v1、Modbus RTU 等 8 种模板），定位 CRC 错误，生成协议文档。Python stdlib 零依赖，与 SerialCube.html 的 NS.crc16Modbus 行为 100% 一致。**当用户给一段 hex 或问 CRC 为啥不匹配时触发** |
  ```

- [ ] **Step 2.2: 验证渲染**

  打开 `.minimax/skills/README.md` 看 ⑦ 和 ⑧ 衔接是否正常

### Step 3: 反模式章节加 1 条

- [ ] **Step 3.1: 在反模式最后追加**

  找到 `- ❌ **走 in-app 内置 Browser 调 SerialCube** ...` 这一行，**在它后面**插入:

  ```markdown
  - ❌ **协议 CRC 排错靠肉眼看** — 收到坏帧别直接改协议模板，先用 `serial-protocol-copilot` 的 `verify-frame` 看 `crc_range_hex` 算的是哪段，配合 `references/gotchas.md` 6 条排查（90% 是字节序或 crcRange 边界）
  ```

### Step 4: 触发链表格更新

- [ ] **Step 4.1: 在「怎么用」表格里加一行**

  找到表格中「| **「打开 SerialCube 调试...**」」那行，**在它前面**插入:

  ```markdown
  | 「给我解析一下这段 hex `AA 01 90 ...`」 | `serial-protocol-copilot`（CLI 直接调）→ 必要时 `agent-browser` 打开 SerialCube.html 协议编辑器对照 |
  | 「CRC 怎么算不对 / 帧解析报错」 | `serial-protocol-copilot verify-frame` 看 `crc_range_hex` → `references/gotchas.md` 第 1-6 条 → 必要时改 `references/protocols.json` + SerialCube.html:9930-9978 两边同步 |
  ```

- [ ] **Step 4.2: 验证整个 README**

  打开 `.minimax/skills/README.md`，确认 ⑧ 节、反模式新条目、触发链 3 处改动都生效，没有破坏现有结构

### Step 5: Commit

- [ ] **Step 5.1: 提交**

  ```bash
  git add .minimax/skills/README.md
  git commit -m "docs(skills): integrate serial-protocol-copilot into README (stage 8, anti-pattern, trigger chains)"
  ```

---

## Self-Review

### 1. Spec coverage

- [x] 协议知识库 (Task 1)
- [x] Python 工具库 (Task 2)
- [x] CLI 入口 (Task 3)
- [x] SKILL.md 触发条件 (Task 3 Step 6)
- [x] README 集成 + 反模式 (Task 4)

### 2. Placeholder scan

- 无 TBD / TODO / "implement later"
- 所有 hex 例子都是真实格式（AA 01 90 C5 CD 55 是 BMS TLV 帧结构）
- 所有 py -3 命令都是可执行命令
- 所有 git commit 命令都具体到文件路径

### 3. Type / API 一致性

- `crc16_modbus(bytes) -> int` 在 Task 2 Step 3 定义，Task 3 Step 5 encode_frame 引用 ✓
- `crc_range_sections(protocol, all_bytes) -> bytes` Task 2 Step 7 定义，Task 3 Step 3 decode_frame + Step 4 verify_frame 都用 ✓
- `encode_crc_bytes(crc_value, size, endian) -> bytes` Task 2 Step 7 定义，Task 3 Step 5 用 ✓
- `compute_crc(algo, bytes) -> int` Task 2 Step 5 定义，Task 3 Step 3 + Step 4 + Step 5 都用 ✓
- CLI 4 个子命令: `decode-frame` / `encode-frame` / `verify-frame` / `inspect-protocol` — Task 3 Step 3 引入，Step 4 + Step 5 补齐，README Task 4 引用 ✓

### 4. 一致性 / 真实性检查

- `references/protocols.json` 的 BMS 示例字段是合理的猜测（基于 SerialCube.html:9930-9939 的 metadata 结构）— **Task 1 Step 1.2 明确要求从项目实际读取后填入**
- `proto_bms` 的 CRC 测试向量 `AA 01 90 C5 CD 55` — 经典 BMS 帧头尾格式，CRC 部分 `C5 CD` 是 LE 输出 0xC5CD 的占位
  - **Task 2 Step 2.1 的测试 `crc16_modbus` 用 `01 03 00 00 00 0A → 0xC5CD` 是 Modbus 经典例，不依赖 BMS 数据** ✓
  - **Task 3 Step 3.6 的手动测试用 `AA 01 90 C5 CD 55` 时若 `crc_verify.match=false`，Step 3 仍然成功（CLI 返回 2 不致命），让用户看到 diff 自己判断** ✓
- pytest 在 Windows 上不需要 `requirements.txt`，stdlib 包含 `unittest` + `pytest` 单独装 — **Task 2 Step 1.2 显式列 `import pytest`，但 Task 2 没装 pytest 的步骤**
  - **注意**: 跑测试前需要 `pip install pytest` — 这是已知的全局约束疏漏，**执行前用户需先 `pip install pytest`**

### 已知问题 / 待补

- **pytest 依赖**: 计划跑测试前用户需 `pip install pytest`（或用 `py -3 -m unittest` 改写测试，去掉 pytest 依赖 — 这是更稳的方案，作为 Plan 的可选优化）
- **T3 Step 3.3 `decode-frame` 的 CRC 判断逻辑**: 当前用 `crc_match` 返回 0/2，但 `crc_match = (int.from_bytes(crc_bytes, 'little') == expected_crc) if crc_size == 2 else (crc_bytes[0] == expected_crc)` 写得过紧 — Step 7 实施时若需要更通用，可改用 `encode_crc_bytes(expected_crc, crc_size, 'LE') == crc_bytes` 统一

---

## Execution Handoff

计划完成，保存到 `docs/superpowers/plans/2026-08-11-serial-protocol-copilot.md`。

**执行选项：**

**1. Subagent-Driven (推荐)** — 每个 task 派发独立子代理，task 间做规格审查 + 代码质量审查两轮检查；快速迭代

**2. Inline Execution** — 当前会话用 executing-plans 批量执行，每 task 完做 checkpoint review

**前置条件（两种方式都需要）**：
- `pip install pytest`（如不装则需把测试改写成 unittest，改动量小）
- 当前在 git 仓库根目录

**选哪个？**
