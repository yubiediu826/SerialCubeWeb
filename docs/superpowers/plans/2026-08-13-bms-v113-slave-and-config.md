# BMS V1.13 从机模拟器 + SerialCube 配置集成 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 SerialCube.html 当前的"死数据 mock"替换成真实双向串口数据流——主机连 COM21，从机（Mock BMS Python 脚本）连 COM20，全部 19 个命令按 V1.13 协议应答。

**Architecture:**

```
   ┌──────────────────────┐    COM20 ⇄ COM21    ┌──────────────────────────┐
   │ tools/bms_v113_slave │  (Eltima 虚拟串口)   │  SerialCube.html v1.4.0  │
   │   (Python, pyserial)  │ ◄────────────────► │   (Web Serial API host)  │
   │   115200, 8N1         │                     │   浏览器内, 端口 COM21    │
   └──────────────────────┘                     └──────────────────────────┘
```

- 主机: SerialCube.html v1.4.0 (替换 `_defaultProtocols` 里的 proto_bms 为 V1.13)
- 从机: `tools/bms_v113_slave.py`, 单进程 + 单线程 + 阻塞 read, 模拟 BMS 周期性回状态
- 协议文档: `docs/protocol/BMS通信协议V1.13.md` (上一轮已生成, 77 帧 CRC 全校验通过)
- 虚拟串口: COM20 ⇄ COM21 (用户已用 Eltima 建好, 直接用)

**Tech Stack:**

- Python 3.x + pyserial 3.5 (已确认环境)
- SerialCube.html v1.3.1.1 → v1.4.0 (单文件, 无构建)
- Eltima Virtual Serial Port (已装, COM20/21 配对就绪)
- Web Serial API (Chromium only, 需 `http://localhost` 启动)
- 校验算法: CRC-16/Modbus (Python `crcmod` 或手算, 协议里 Python 函数现成)

## Global Constraints

- **SerialCube 单文件规则**: SerialCube.html 不能拆, 改动必须最小化
- **改 HTML 前必须跑 `bump-version.ps1`**: VERSION 常量 + changelog 同步
- **push 必须经用户同意**: 不自动 push, 任何 git push 前 ask_user
- **不做 UI design guard** (本任务不改 UI, 只改配置数据)
- **e2e 6 场景不破**: `select-scenarios` 自动选场景跑通 (本任务至少应用加载 + 主题切换 + 协议编辑不破)
- **CRC 必须实算**: 模拟器发出去的每帧都要 CRC-16/Modbus 实算, 不能照抄 doc 里的硬编码
- **不模拟 flash 写入**: 升级 0x10~0x14 全部返回 `0x00` 成功, 状态存内存, 不写真 flash
- **不模拟 AFE 保护动态触发**: 保护位初始全 0, 周期不变, 等后续任务做动态保护
- **V1.13 doc 已知瑕疵**: 0x06 OCV 字段 xlsx 标 808 bit 但备注说 uint16_t, 按 uint16 (1616 bit) 处理, 模拟器和 doc 一致

---

## File Structure

**新增 (5):**

| 路径 | 职责 |
|------|------|
| `tools/bms_v113_slave.py` | Mock BMS 从机模拟器 (Python, pyserial, 监听 COM20, 19 命令全应答) |
| `tools/gen_bms_v113_config.py` | 从 MD 提取 V1.13 协议字段, 生成 `bms_v113_protocol.json` (独立可机读配置) |
| `docs/protocol/bms_v113_protocol.json` | V1.13 协议的 JSON 中间表示, 供 HTML 集成 + 外部工具使用 |
| `docs/changelog/2026-08-13-v1.4.0-bms-v113-protocol-integration.md` | 改动记录 |
| `docs/handover/HANDOFF-V1.4.0-2026-08-13.md` | 交付说明 |

**修改 (3):**

| 路径 | 改动 |
|------|------|
| `SerialCube.html` | `_defaultProtocols` 里的 `proto_bms` 替换为 V1.13 (fields + 19 commands) |
| `README.md` | 加 v1.4.0 release notes, 指向 `docs/protocol/BMS通信协议V1.13.md` |
| `docs/CHANGELOG.md` | 同步版本 |

**文件大小预估:**
- `bms_v113_slave.py`: ~600 行 (单文件, 19 命令 dispatch)
- `gen_bms_v113_config.py`: ~250 行 (解析 MD 表格, 输出 JSON)
- `bms_v113_protocol.json`: ~15 KB (19 commands + 字段表)
- SerialCube.html 改动: `+1.5 KB` (commands 数组从 8 条扩到 19 条, dataFields 加完)

---

## Task 1: 验证环境 + 工具就绪

**Files:**
- Read: `docs/protocol/BMS通信协议V1.13.md` (确认上轮生成的 doc 在)
- Read: `SerialCube.html:8724` (确认 VERSION = '1.3.1.1')
- Test: `python -c "import serial; serial.Serial('COM20').close()"` (确认 COM20 通)

**Interfaces:**
- Consumes: 无
- Produces: 环境验证报告 (markdown 或日志), 进入 Task 2 的前提

- [ ] **Step 1: 确认 COM20/21 可打开**

```powershell
cd D:\WorkSpace\SerialCubeWeb
python -c "import serial; [serial.Serial(p, 115200, timeout=0.1).close() and print(p, 'OK') for p in ['COM20', 'COM21']]"
```

预期: 两行 OK, 无异常。

- [ ] **Step 2: 确认 V1.13 协议 doc 在**

```powershell
Test-Path 'docs\protocol\BMS通信协议V1.13.md'
(Get-Item 'docs\protocol\BMS通信协议V1.13.md').Length
```

预期: `True`, ~81625 bytes。

- [ ] **Step 3: 确认 SerialCube.html 当前版本**

```powershell
Select-String -Path 'SerialCube.html' -Pattern "VERSION = '"
```

预期: `1.3.1.1` (本任务目标升 `1.4.0`)。

- [ ] **Step 4: 跑 preflight (基准线)**

```powershell
pwsh -File .minimax\skills\serialcube-workflow\preflight.ps1
```

预期: 9 项检查全 PASS 或 PASS-with-warnings (记录 warning, 不阻塞)。

- [ ] **Step 5: 跑 e2e 6 场景 (基准线, 改之前)**

```powershell
pwsh -File .minimax\skills\serialcube-e2e\scripts\select-scenarios.ps1
```

预期: 6 场景全 PASS。**这就是后续改 HTML 的"回归基线"**, 后面必须不破。

---

## Task 2: 从 MD 生成 `bms_v113_protocol.json` (中间表示)

**Files:**
- Create: `tools/gen_bms_v113_config.py` (~250 行)
- Create: `docs/protocol/bms_v113_protocol.json` (~15 KB)

**Interfaces:**
- Consumes: `docs/protocol/BMS通信协议V1.13.md` (Section 4-17 的参数表 + 帧格式)
- Produces: 协议 JSON, 字段结构 = SerialCube `NS.PROTOCOLS[0].commands[i].dataFields` 形态

**JSON Schema (顶层):**

```json
{
  "meta": {
    "version": "1.13",
    "source": "docs/protocol/BMS通信协议V1.13.md",
    "crc": "crc16-modbus",
    "crcInit": "0xFFFF",
    "crcEndian": "LE",
    "byteOrder": "BE",
    "frame": { "headMB": "0x5A", "headCB": "0x55", "addr": "0x01" }
  },
  "fields": [
    { "id": "f1", "name": "header", "type": "header", "size": 1, "default": "0x5A" },
    { "id": "f2", "name": "addr", "type": "addr", "size": 1, "default": "0x01" },
    { "id": "f3", "name": "cmd", "type": "cmd", "size": 1, "default": "0x00" },
    { "id": "f4", "name": "length", "type": "length", "size": 1, "default": "auto" },
    { "id": "f4d", "name": "data", "type": "data", "size": 0, "default": "0x00" },
    { "id": "f5", "name": "crc", "type": "crc", "size": 2, "default": "auto" }
  ],
  "commands": [
    {
      "id": "0x01", "name": "控制/状态", "direction": "tx",
      "mb": { "length": 2, "trigger": "period-200ms", "dataFields": [...] },
      "cb": { "length": 143, "trigger": "response", "dataFields": [...] }
    },
    ...
  ]
}
```

- [ ] **Step 1: 写 `gen_bms_v113_config.py` 骨架 + 解析器**

```python
"""从 docs/protocol/BMS通信协议V1.13.md 提取参数, 生成 bms_v113_protocol.json."""
import re, json, sys
from pathlib import Path

MD_PATH = Path(__file__).parent.parent / 'docs' / 'protocol' / 'BMS通信协议V1.13.md'
OUT_PATH = Path(__file__).parent.parent / 'docs' / 'protocol' / 'bms_v113_protocol.json'

# 解析 § 5.1 0x02 的参数表 (硬编码基线, 其它命令用同样模式)
def parse_param_table(text, start_marker, end_marker):
    """从 markdown 文本里抽出参数表 → list[dict]."""
    block = text[text.index(start_marker):text.index(end_marker)]
    rows = []
    for line in block.split('\n'):
        if not line.startswith('|'):
            continue
        if '---' in line or '起始位' in line:
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) < 6:
            continue
        rows.append({
            'startBit': int(cells[0]),
            'lengthBit': int(cells[1]),
            'name': cells[2],
            'unit': cells[3],
            'precision': cells[4],
            'offset': cells[5],
            'description': cells[6] if len(cells) > 6 else '',
            'note': cells[7] if len(cells) > 7 else ''
        })
    return rows
```

- [ ] **Step 2: 为 0x01/0x02 写字段提取函数, 跑通 2 个命令**

```python
def extract_0x02_set(md):
    """0x02 MB 数据区 = 95 字节 = 760 bit, 字段定义在 § 5.1 表."""
    rows = parse_param_table(
        md,
        start_marker='| 起始位 | 长度Bit | 字段名 | 配置值 |',
        end_marker='#### 完整请求帧示例'  # 0x02 表的结束
    )
    return rows

def extract_0x01_cb(md):
    """0x01 CB 响应 = 143 字节 = 1144 bit, 字段定义在 § 4.2 表."""
    # § 4.2 表头是 "| 起始位 | 长度Bit | 数据名称 | 说明 |"
    rows = parse_param_table_01(md)  # 单独处理 9 列的表
    return rows
```

- [ ] **Step 3: 跑脚本, 检查 `bms_v113_protocol.json` 结构正确**

```powershell
cd D:\WorkSpace\SerialCubeWeb
python tools\gen_bms_v113_config.py
python -c "import json; d=json.load(open('docs/protocol/bms_v113_protocol.json',encoding='utf-8')); print('commands:', len(d['commands'])); print([c['id'] for c in d['commands']])"
```

预期: `commands: 19`, 列表是 `['0x01', '0x02', ..., '0x16']`。

- [ ] **Step 4: review 提取结果, 修错**

人工 review JSON, 重点检查:
- 0x02 字段数 (应该是 30 个: OV/UV/OC 等)
- 0x01 CB 字段数 (应该 ~40 个: 各种 temp/curr/cap)
- 字段名规范化 (snake_case, 跟 V1.13 doc 一致)

- [ ] **Step 5: 补 0x03 ~ 0x16 的字段提取**

每个命令一个函数, 解析对应章节的参数表。最后一个命令 0x16 完成 → 重跑 Step 3 验证 commands=19。

- [ ] **Step 6: Commit JSON 中间表示**

```powershell
git add tools/gen_bms_v113_config.py docs/protocol/bms_v113_protocol.json
git commit -m "feat(protocol): BMS V1.13 中间表示 JSON (19 commands)"
```

**注意**: 这一步不直接改 HTML, JSON 出来先 review, 后面 Task 8 才会用。

---

## Task 3: Mock BMS 从机 — 骨架 + 串口 + 状态模型

**Files:**
- Create: `tools/bms_v113_slave.py` (~150 行 骨架, 后面再扩)

**Interfaces:**
- Consumes: `pyserial.Serial` 监听 COM20
- Produces: 阻塞读循环, 解析 MB 帧, dispatch 到 handler
- 内部状态: `self.state` dict (配置 + 实时量), `self.cells` list (20 串电压), `self.temps` list (8 颗 NTC)

- [ ] **Step 1: 写骨架 + 串口打开**

```python
"""BMS V1.13 从机模拟器. 监听 COM20, 按 V1.13 协议应答."""
import sys, struct, threading, time
import serial

SERIAL_PORT = 'COM20'
BAUDRATE = 115200
ADDR = 0x01
HEAD_MB = 0x5A  # 主机 -> 从机
HEAD_CB = 0x55  # 从机 -> 主机

def crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x0001: crc = (crc >> 1) ^ 0xA001
            else: crc >>= 1
    return crc

class BmsSlave:
    def __init__(self, port=SERIAL_PORT):
        self.ser = serial.Serial(port, BAUDRATE, timeout=0.05)
        # 状态模型: 保护参数 (来自 0x02 配置)
        self.protect = self._default_protect()
        # 实时量
        self.ocv = [2500 + i * 12 for i in range(101)]  # 0x04 OCV 表
        self.sn = b'BMS-2026-08-0001'
        self.cells = [3550] * 20  # 20 串电压 (mV)
        self.temps = [25] * 8     # 8 颗 NTC (℃)
        self.sys_state = 1  # 运行
        self.balance_mask = 0x00000000
        self.curr_ma = 0
        self.soc = 80
        self.soh = 100
        self.cycles = 0
        self.r_remain_cap = 16000
        self.fan_speed = 0

    def _default_protect(self):
        return {
            'cell_ov_val': 3650, 'cell_ov_recover': 3600, 'cell_ov_timer': 5000, 'cell_ov_recover_timer': 3000,
            'cell_uv_val': 2500, 'cell_uv_recover': 2600, 'cell_uv_timer': 5000, 'cell_uv_recover_timer': 3000,
            # ... 30 个字段 (跟 V1.13 § 5.1 一致)
        }
```

- [ ] **Step 2: 实现 `read_frame()` 通用解析**

```python
def read_frame(self):
    """从串口读一个完整 MB 帧. 返回 (cmd, data_bytes) 或 None."""
    # 1. 等 head
    b = self.ser.read(1)
    if not b or b[0] != HEAD_MB: return None
    # 2. 读 addr + cmd + len (3 字节)
    h = self.ser.read(3)
    if len(h) < 3: return None
    addr, cmd, length = h[0], h[1], h[2]
    if addr != ADDR: return None
    # 3. 读 data + crc
    rest = self.ser.read(length + 2)
    if len(rest) < length + 2: return None
    data = rest[:length]
    crc_l, crc_h = rest[length], rest[length + 1]
    # 4. CRC 校验
    body = bytes([HEAD_MB, addr, cmd, length]) + data
    if crc16_modbus(body) != (crc_h << 8) | crc_l:
        print(f'CRC 错: cmd=0x{cmd:02X} len={length}', file=sys.stderr)
        return None
    return cmd, data
```

- [ ] **Step 3: 实现 `send_frame(cmd, data)` 通用发送**

```python
def send_frame(self, cmd, data: bytes):
    body = bytes([HEAD_CB, ADDR, cmd, len(data)]) + data
    crc = crc16_modbus(body)
    frame = body + bytes([crc & 0xFF, (crc >> 8) & 0xFF])
    self.ser.write(frame)
```

- [ ] **Step 4: 实现 main 循环 (暂时只 echo)**

```python
def run(self):
    print(f'[BMS slave] listening on {SERIAL_PORT} @ {BAUDRATE}')
    while True:
        frame = self.read_frame()
        if frame is None: continue
        cmd, data = frame
        print(f'[RX] cmd=0x{cmd:02X} len={len(data)}', flush=True)
        # TODO: dispatch 19 commands (Task 4-6)

if __name__ == '__main__':
    BmsSlave().run()
```

- [ ] **Step 5: 启脚本 (后台), 用 pyserial 测 echo**

```powershell
# 终端 1
cd D:\WorkSpace\SerialCubeWeb
python tools\bms_v113_slave.py
```

```powershell
# 终端 2 (另开一个)
cd D:\WorkSpace\SerialCubeWeb
python -c "
import serial
s = serial.Serial('COM21', 115200, timeout=1)
import time
# 发 0x01 默认帧: 5A 01 01 02 00 00 91 1D
s.write(bytes.fromhex('5A010102000091 1D'.replace(' ','')))
print('TX OK')
s.close()
"
```

预期: 终端 1 打印 `[RX] cmd=0x01 len=2`, 终端 2 无异常。**注意**: 此时还没有 handler, 不会回包, 只是验证 read_frame 解析正确。

- [ ] **Step 6: Commit 骨架**

```powershell
git add tools/bms_v113_slave.py
git commit -m "feat(slave): BMS V1.13 mock 骨架 + 串口 + 帧解析"
```

---

## Task 4: Mock BMS — 0x01/0x02/0x03/0x05 核心三件套

**Files:**
- Modify: `tools/bms_v113_slave.py` (加 4 个 handler)

**Interfaces:**
- `self.dispatch(cmd, data) -> bytes | None` 返回响应 data 字节 (None 表示无响应)

- [ ] **Step 1: 实现 `handle_0x01_status()` 回 143 字节 CB 状态**

```python
def handle_0x01_status(self, mb_data: bytes) -> bytes:
    """回 143 字节状态. 对应 V1.13 § 4.2 表."""
    import struct
    p = bytearray()
    # ProtectCode (16) + ErrCode (16) + AFE_ProtectCode (16) + RSVD (16) = 8 字节, 全 0
    p += b'\x00\x00\x00\x00\x00\x00\x00\x00'
    # ChgDsgState (16) = 0xC338 (bit0=1 chg mos, bit4=1 charging, bit6=1 dsg ctrl)
    p += struct.pack('<H', 0xC338)
    # SysState (8) = 1 (运行)
    p += bytes([0x01])
    # CellBalance (32) = 0
    p += b'\x00\x00\x00\x00'
    # SignalSource (8) = 0
    p += bytes([0x00])
    # Cell_Temp (128) = 8 个 int16, 0x18=24℃
    p += struct.pack('<8h', *self.temps)
    # CellTempMax/Min (16+16) = 24℃ / 24℃
    p += struct.pack('<HH', max(self.temps), min(self.temps))
    # ChgMosTemp / DsgMosTemp (16+16) = 0xFF 默认 / 实际
    p += struct.pack('<HH', 0xFFFF, self.temps[0])
    # ... (按 V1.13 § 4.2 表, 剩余 50+ 字段)
    return bytes(p[:143])  # 截断保 143 字节
```

**完整字段表 (按 V1.13 § 4.2 顺序)**: 14 字段 (含 RSVD), 113 字节需要 113 字节 (实际字段定义要按 V1.13 doc 一行一行写)。

- [ ] **Step 2: 实现 `handle_0x02_protect_config()` 解析 95 字节, 回 Ack**

```python
def handle_0x02_protect_config(self, data: bytes) -> bytes:
    """解析 95 字节, 写内部 protect. 回 1 字节 Ack (0=成功, 1=失败)."""
    if len(data) != 95:
        return bytes([0x01])  # 长度错
    import struct
    fields = [
        ('cell_ov_val', '<H', 0), ('cell_ov_recover', '<H', 2), ...
    ]
    for name, fmt, off in fields:
        self.protect[name] = struct.unpack_from(fmt, data, off)[0]
    return bytes([0x00])  # 成功
```

- [ ] **Step 3: 实现 `handle_0x03_bms_info()` 回 21 字节**

```python
def handle_0x03_bms_info(self, data: bytes) -> bytes:
    """回 21 字节 BMS 信息. 对应 V1.13 § 6.2."""
    import struct
    p = bytearray()
    # NTC_CNT(4)=8 | RSVD(4)=0 | CELL_CNT(5)=20 | BAT_TYPE(3)=1 (磷酸铁锂)
    p += bytes([0x80 | 0x01])  # NTC=8, type=1 (低 4=NTC, 高 4 RSVD)
    p += bytes([(20 << 0) | (1 << 5)])  # cell=20 (低 5), type 又占位 → 实际位 8-12 cell, 13-15 type
    # Version(16) = 0x000D = V1.3
    p += struct.pack('<H', 0x000D)
    # HARD_TYPE(8) = 1 (O2)
    p += bytes([0x01])
    # RSVD1(16) + RSVD2(16)
    p += b'\x00\x00\x00\x00'
    # DEVICE(32) = "B20T" (B=BMS, 20=序号, T=Ti)
    p += b'B20T'[::-1]  # LE
    # CAP_normal(32) = 20000 mAh
    p += struct.pack('<I', 20000)
    # CAP_real(32) = 19800 mAh
    p += struct.pack('<I', 19800)
    return bytes(p)
```

- [ ] **Step 4: 实现 `handle_0x05_protect_query()` 回 95 字节当前配置**

```python
def handle_0x05_protect_query(self, data: bytes) -> bytes:
    """回 95 字节当前保护参数. 与 0x02 字段顺序一致."""
    import struct
    # 按 0x02 字段顺序, 把 self.protect 打包成 95 字节
    layout = [
        ('cell_ov_val', '<H'), ('cell_ov_recover', '<H'), ('cell_ov_timer', '<H'),
        # ... 共 30 个
    ]
    p = bytearray()
    for name, fmt in layout:
        p += struct.pack(fmt, self.protect.get(name, 0))
    return bytes(p[:95])
```

- [ ] **Step 5: dispatch 路由**

```python
def dispatch(self, cmd, data):
    handlers = {
        0x01: self.handle_0x01_status,
        0x02: self.handle_0x02_protect_config,
        0x03: self.handle_0x03_bms_info,
        0x05: self.handle_0x05_protect_query,
        # Task 5-6 补齐
    }
    h = handlers.get(cmd)
    if h is None: return
    resp = h(data)
    if resp is not None: self.send_frame(cmd, resp)
```

- [ ] **Step 6: 端到端测试 (pyserial)**

```powershell
# 终端 1: 启从机
python tools\bms_v113_slave.py
```

```powershell
# 终端 2: 主机测试脚本
cd D:\WorkSpace\SerialCubeWeb
python -c "
import serial
import time
s = serial.Serial('COM21', 115200, timeout=1)
def tx(b):
    s.write(bytes.fromhex(b.replace(' ','')))
    time.sleep(0.05)
    return s.read(256)

# 0x01 状态请求
print('--- 0x01 状态 ---')
r = tx('5A 01 01 02 00 00 91 1D')
print(f'回包 {len(r)} 字节: {r.hex()}')

# 0x02 配 95 字节 (用 V1.13 doc 默认值)
r = tx('5A 01 02 5F 42 0E 10 0E 88 13 B8 0B C4 09 28 0A 88 13 B8 0B F4 01 10 27 D0 07 88 13 3C 32 88 13 B8 0B EC F6 88 13 B8 0B 37 2D 88 13 B8 0B 00 05 88 13 B8 0B 10 27 00 00 88 13 10 27 E0 B1 FF FF 88 13 10 27 C0 63 FF FF D0 07 88 13 FF 3F 00 20 4E 00 00 42 0E 10 0E 30 75 10 27 F4 01 50 46 88 13 B8 0B 70 CF')
print(f'回包 {len(r)} 字节 (期望 7): {r.hex()}')

# 0x03 BMS 信息
r = tx('5A 01 03 01 00 8C 61')
print(f'回包 {len(r)} 字节 (期望 27): {r.hex()}')

# 0x05 查 95 字节
r = tx('5A 01 05 01 00 6C 60')
print(f'回包 {len(r)} 字节 (期望 99): {r.hex()[:60]}...')
s.close()
"
```

预期:
- 0x01 回 145 字节 (head+addr+cmd+len+143+CRC = 4+143+2=149, wait 头是 4 字节 5A 01 01 8F + data 143 + CRC 2 = 149... 但实际我们 send_frame 是 head=0x55 所以是 4 字节头 + 143 数据 + 2 CRC = 149 字节, 等等让我算下)
  - V1.13 § 4.2 头 `55 01 01 8F` (head+addr+cmd+len) = 4 字节; 143 字节数据; 2 字节 CRC = 总 149 字节
- 0x02 回 7 字节 (5A/55 + addr + cmd + len=01 + 1 字节 Ack + 2 字节 CRC = 4+1+2 = 7)
- 0x03 回 27 字节 (4+21+2)
- 0x05 回 99 字节 (4+95+2)

**所有 4 个回包 CRC 都应该实算通过**, 跟上一轮 V1.13 doc 的示例 CRC 一致。

- [ ] **Step 7: Commit**

```powershell
git add tools/bms_v113_slave.py
git commit -m "feat(slave): 实现 0x01/0x02/0x03/0x05 handler"
```

---

## Task 5: Mock BMS — 0x04/0x06/0x07/0x08/0x09 配置 + SN + 均衡

**Files:**
- Modify: `tools/bms_v113_slave.py` (加 5 个 handler)

- [ ] **Step 1: 实现 `handle_0x04_ocv_config()` 解析 204 字节, 回 Ack**

```python
def handle_0x04_ocv_config(self, data: bytes) -> bytes:
    if len(data) != 204: return bytes([0x01])
    import struct
    self.ocv = [struct.unpack_from('<H', data, i*2)[0] for i in range(101)]
    return bytes([0x00])  # 成功
```

- [ ] **Step 2: 实现 `handle_0x06_ocv_query()` 回 204 字节**

```python
def handle_0x06_ocv_query(self, data: bytes) -> bytes:
    import struct
    p = bytearray()
    for v in self.ocv:
        p += struct.pack('<H', v)
    # OCV_Enable = 0x0001
    p += struct.pack('<H', 0x0001)
    return bytes(p)
```

- [ ] **Step 3: 实现 `handle_0x07_sn_write()` 解析 16 字节, 回 Ack**

```python
def handle_0x07_sn_write(self, data: bytes) -> bytes:
    if len(data) != 16: return bytes([0x01])
    self.sn = data  # 内存存, 不写文件
    return bytes([0x00])  # 成功
```

- [ ] **Step 4: 实现 `handle_0x08_sn_query()` 回 16 字节**

```python
def handle_0x08_sn_query(self, data: bytes) -> bytes:
    return self.sn.ljust(16, b'\x00')[:16]
```

- [ ] **Step 5: 实现 `handle_0x09_balance()` 1 字节开关, 回 Ack**

```python
def handle_0x09_balance(self, data: bytes) -> bytes:
    if len(data) != 1: return None
    on = data[0] == 1
    if on:
        self.balance_mask = 0xFFFFFFFF  # 32 串全开 (示意)
    else:
        self.balance_mask = 0
    return bytes([0x00])  # 成功
```

- [ ] **Step 6: 端到端测试 (扩展上一轮的测试脚本)**

加 0x04/0x06/0x07/0x08/0x09 五个 case, 验证:
- 0x04 配 204 字节 → Ack=0
- 0x06 查 → 204 字节 (头 4 + 数据 204 + CRC 2 = 210 字节)
- 0x07 写 "BMS-2026-TEST-001" → Ack=0
- 0x08 查 → 16 字节 ASCII (头 4 + 数据 16 + CRC 2 = 22 字节)
- 0x09 开均衡 → Ack=0, self.balance_mask 变化

- [ ] **Step 7: Commit**

```powershell
git add tools/bms_v113_slave.py
git commit -m "feat(slave): 实现 0x04/0x06/0x07/0x08/0x09 handler"
```

---

## Task 6: Mock BMS — 0x0A/0x0B/0x0C/0x10-0x15/0x16 日志 + 容量 + 风扇 + 升级 + 级联

**Files:**
- Modify: `tools/bms_v113_slave.py` (加 7 个 handler + 升级流程)

- [ ] **Step 1: 实现 `handle_0x0a_log()` 回 64 字节历史日志**

按 V1.13 § 13.2 字段表, 写死一组示例值 (历史最高 3680mV / 最低 2480mV / 温度 -15~45℃ / 各保护次数等)。

- [ ] **Step 2: 实现 `handle_0x0b_remain_cap()` 解析 2 字节, 回 Ack**

```python
def handle_0x0b_remain_cap(self, data: bytes) -> bytes:
    if len(data) != 2: return bytes([0x01])
    import struct
    self.r_remain_cap = struct.unpack('<H', data)[0]
    return bytes([0x00])
```

- [ ] **Step 3: 实现 `handle_0x0c_fan_speed()` 解析 2 字节, 回 Ack**

```python
def handle_0x0c_fan_speed(self, data: bytes) -> bytes:
    if len(data) != 2: return bytes([0x01])
    import struct
    self.fan_speed = struct.unpack('<H', data)[0]
    return bytes([0x00])
```

- [ ] **Step 4: 实现 0x10/0x11/0x12/0x13 (升级元信息) — 全部回 0x00**

```python
def handle_0x10_dev(self, data): return bytes([0x00])  # 设备号
def handle_0x11_pac(self, data): return bytes([0x00])  # 总包数
def handle_0x12_size(self, data): return bytes([0x00])  # 总字节
def handle_0x13_check(self, data): return bytes([0x00])  # 总校验
```

- [ ] **Step 5: 实现 0x14 (升级数据包) — 简单累加包号, 回 0x00**

```python
def __init__ 里加 self.last_pkt_num = 0
def handle_0x14_packet(self, data: bytes) -> bytes:
    if len(data) < 2: return bytes([0x06])  # 包序号错
    import struct
    pkt_num = struct.unpack('<H', data[:2])[0]
    if pkt_num != self.last_pkt_num + 1:
        return bytes([0x06])  # 包序号错
    self.last_pkt_num = pkt_num
    return bytes([0x00])  # 成功
```

- [ ] **Step 6: 实现 0x15 (升级完成) — 主动上行, 不通过 dispatch**

0x15 是从机主动发, 不在 dispatch 路由里. 在 0x14 收到最后一包 (self.last_pkt_num == self.total_pac) 后, 等 100ms, 主动 send_frame(0x15, bytes([1]))。

```python
# 在 handle_0x14_packet 末尾:
if self.last_pkt_num == self.total_pac:
    time.sleep(0.1)
    self.send_frame(0x15, bytes([0x01]))  # 升级成功
    self.last_pkt_num = 0  # 重置, 准备下次升级
```

- [ ] **Step 7: 实现 0x16 (级联) — 假装主机 + 1 个级联, 其余 FF/FFFF**

```python
def handle_0x16_cascade(self, data: bytes) -> bytes:
    """回 52 字节, 假装主机+1 级联在线, 2/3 离线."""
    import struct
    p = bytearray()
    p += bytes([self.soc, 70, 0xFF, 0xFF])  # SOC
    p += struct.pack('<H', sum(self.cells) // len(self.cells))  # 主机电压
    p += struct.pack('<H', sum(self.cells) // len(self.cells) - 50)  # 级联 1 电压
    p += struct.pack('<H', 0)  # 级联 2 离线
    p += struct.pack('<H', 0)  # 级联 3 离线
    p += struct.pack('<i', self.curr_ma)  # 主机电流
    p += struct.pack('<i', 0)
    p += struct.pack('<i', 0)
    p += struct.pack('<i', 0)
    p += bytes([0x01, 0x0F, 0x00, 0x00])  # MOS
    p += bytes([0x00, 0x00, 0x00, 0x00])  # 保护
    p += struct.pack('<h', max(self.temps) * 10)  # 温度 0.1℃
    p += struct.pack('<h', min(self.temps) * 10)
    p += struct.pack('<h', 315)
    p += struct.pack('<h', 275)
    p += struct.pack('<h', -1)  # 离线 = 0xFFFF = -1
    p += struct.pack('<h', -1)
    p += struct.pack('<h', -1)
    p += struct.pack('<h', -1)
    return bytes(p[:52])
```

- [ ] **Step 8: 加 dispatch 路由**

```python
handlers = {
    ...  # 之前 9 个
    0x0A: self.handle_0x0a_log,
    0x0B: self.handle_0x0b_remain_cap,
    0x0C: self.handle_0x0c_fan_speed,
    0x10: self.handle_0x10_dev,
    0x11: self.handle_0x11_pac,
    0x12: self.handle_0x12_size,
    0x13: self.handle_0x13_check,
    0x14: self.handle_0x14_packet,
    0x16: self.handle_0x16_cascade,
}
```

- [ ] **Step 9: 19 命令全量端到端测试**

加 7 个 case, 加 0x15 主动上行的检查 (写一个测试脚本主动发 0x10-0x14 完整升级流程, 期望 0x15 在最后一包后 100ms 上行)。

- [ ] **Step 10: Commit**

```powershell
git add tools/bms_v113_slave.py
git commit -m "feat(slave): 实现 0x0A/0x0B/0x0C/0x10-0x15/0x16, 19 命令全"
```

---

## Task 7: 把协议 JSON 转换为 SerialCube JS 配置

**Files:**
- Create: `tools/bms_v113_protocol_js.json` (JS 字面量格式)
- Or: 直接在 SerialCube.html 替换时手工转换 (节省一个文件)

**Interfaces:**
- Consumes: `bms_v113_protocol.json` (Task 2 产物)
- Produces: JS 对象字面量, 可直接粘到 `_defaultProtocols`

- [ ] **Step 1: 写 `tools/json2sc_config.py` (或一次性脚本)**

读 `bms_v113_protocol.json`, 输出 `_defaultProtocols` 第 0 项的 JS 字符串, 字段对应 SerialCube 内部 schema:

```python
def convert(json_path, out_path):
    cfg = json.load(open(json_path, encoding='utf-8'))
    js = f'''{{
    id: 'proto_bms_v113',
    kind: 'fixed-header',
    name: 'BMS 通讯协议 V1.13',
    byteOrder: 'BE',
    crcRange: 'all',
    crcType: 'crc16-modbus',
    crcInit: '0xFFFF',
    crcEndian: 'LE',
    fields: {json.dumps(cfg['fields'], indent=2)},
    commands: [
'''
    for cmd in cfg['commands']:
        js += cmd_to_js(cmd) + ',\n'
    js += ']}'
    open(out_path, 'w', encoding='utf-8').write(js)
```

`cmd_to_js()` 要把 JSON 格式的 dataFields 映射到 SerialCube 的 dataFields 格式 (字段名, type, default)。

- [ ] **Step 2: 跑转换, 输出 `bms_v113_protocol_js.json`**

```powershell
cd D:\WorkSpace\SerialCubeWeb
python tools\json2sc_config.py docs\protocol\bms_v113_protocol.json docs\protocol\bms_v113_protocol_js.json
```

- [ ] **Step 3: 人工 review JS 格式 (重要!)**

打开 `bms_v113_protocol_js.json`, 检查:
- `id: '0x01'` vs `id: 0x01` (SerialCube 内部是 int, 不是 string)
- `dataFields` 每个字段的 `type` (SerialCube 支持 u8/u16/u32/i8/i16/i32/float, V1.13 doc 里 u16/int8/u32 等要映射)
- `name: 'snake_case'` 跟 SerialCube 内部卡片显示一致

- [ ] **Step 4: 修转换脚本, 重跑, 直到 JS 格式正确**

- [ ] **Step 5: Commit**

```powershell
git add tools/json2sc_config.py docs/protocol/bms_v113_protocol_js.json
git commit -m "feat(config): V1.13 协议转 SerialCube JS 配置格式"
```

---

## Task 8: 替换 SerialCube.html `_defaultProtocols`

**Files:**
- Modify: `SerialCube.html:10710-10777` (替换 `proto_bms`)
- Modify: `SerialCube.html:8724` (VERSION 1.3.1.1 → 1.4.0)

**Interfaces:**
- 替换后 `NS.PROTOCOLS[0].commands` 必须是 19 条, 包含 0x01-0x16
- 卡片渲染 (KPI / chart) 用的字段名必须跟 dataFields 一致

- [ ] **Step 1: 跑 `bump-version.ps1 -Level minor` (VERSION 1.3.1.1 → 1.4.0)**

```powershell
cd D:\WorkSpace\SerialCubeWeb
pwsh -File .minimax\skills\version-management\scripts\bump-version.ps1 -Level minor
```

预期: VERSION 常量 + changelog 段同步更新 (1.4.0)。

- [ ] **Step 2: 备份原 HTML**

```powershell
Copy-Item SerialCube.html SerialCube.html.bak
```

(后面 e2e 不通过可以一键回滚)

- [ ] **Step 3: 替换 `_defaultProtocols` 里的 `proto_bms`**

编辑 `SerialCube.html:10711-10759`, 把整个 `proto_bms` 对象 (id 到 commands 结束) 替换成 Task 7 输出的 JS。

**关键约束**:
- 保持 `proto_modbus` 不动
- 保持 `NS.PROTOCOLS = NS._defaultProtocols();` 这行不动
- 保持 `NS.KIND_DEFAULTS` 等其他全局不动
- 19 个 commands 的 `id` 必须是 int (0x01, 0x02, ..., 0x16), 不是 string

- [ ] **Step 4: 在 `SerialCube.html` 头部 VERSION 注释加 V1.4.0 简述**

`SerialCube.html:8724` 那行 VERSION 注释, 在 `1.3.1.1 hotfix: ...` 后面加 `// v1.4.0: V1.13 协议集成, 19 命令`

- [ ] **Step 5: 本地启动 HTTP server, 浏览器加载**

```powershell
cd D:\WorkSpace\SerialCubeWeb
python -m http.server 8000
```

浏览器开 `http://localhost:8000/SerialCube.html`, 打开 DevTools, 运行:

```js
NS.PROTOCOLS[0].commands.length  // 期望 19
NS.PROTOCOLS[0].commands.map(c => c.id)  // 期望 [1,2,...,22] (0x01..0x16)
```

- [ ] **Step 6: 跑 e2e 6 场景, 确保没破**

```powershell
pwsh -File .minimax\skills\serialcube-e2e\scripts\select-scenarios.ps1
```

预期: 6 场景全 PASS。**任何 1 个 FAIL → 立即回滚 SerialCube.html.bak**

- [ ] **Step 7: Commit**

```powershell
git add SerialCube.html
git commit -m "feat(html): 集成 V1.13 协议 (proto_bms 替换为 19 commands)"
```

---

## Task 9: 端到端联调 (Mock BMS ↔ SerialCube)

**Files:**
- Create: `docs/verify/2026-08-13-v1.4.0-e2e-log.md` (测试日志)
- Modify: 临时 `tools/host_observer.py` (后台读 COM21 抓帧, 验证)

**Interfaces:**
- COM20 跑 bms_v113_slave.py
- COM21 给 SerialCube (Web Serial API)
- 同时第三方脚本读 COM21 mirror, 验证主机发出去的帧

- [ ] **Step 1: 启动 Mock BMS (后台)**

```powershell
cd D:\WorkSpace\SerialCubeWeb
Start-Process python -ArgumentList 'tools\bms_v113_slave.py' -NoNewWindow
```

预期: 后台进程起来, 监听 COM20。

- [ ] **Step 2: 启动 SerialCube, 浏览器连 COM21**

- 浏览器开 `http://localhost:8000/SerialCube.html`
- 点 "连接串口", 选 COM21, 115200 8N1
- 选 "BMS 通讯协议 V1.13" 协议
- 期望: KPI 卡片开始跳动 (周期 200ms 0x01 状态)

- [ ] **Step 3: 抓帧验证 (第三方观察者)**

写一个简单的 `tools/host_observer.py`, 读 COM21 (mirror), 打印所有收到的 TX 帧 (从 SerialCube 发到 Mock BMS), 验证格式正确。

- [ ] **Step 4: 触发 0x02 配置, 验证从机回 Ack**

- 在 SerialCube 协议编辑器里选 0x02 命令
- 改个字段 (例如 cell_ov_val 从 3650 → 3700)
- 点 "发送"
- 期望: DevTools console 或 send log 里看到 0x02 帧发出 + Ack 回包

- [ ] **Step 5: 触发 0x05 查询, 验证配置写后能读回**

- 选 0x05 命令, 点 "发送"
- 期望: 95 字节回包, 里面 cell_ov_val = 3700 (你刚才写的值)

- [ ] **Step 6: agent-browser 截图验证 UI**

```powershell
# 用 agent-browser 跑 verify 任务
```

- 截图 0x01 状态卡片 (应该有 24℃ / 3550mV 等实时值)
- 截图协议编辑器 (应该看到 19 commands 列表)
- 截图发送历史 (应该看到 0x01 周期 200ms)

- [ ] **Step 7: 写测试日志, commit**

```powershell
git add docs/verify/ tools/host_observer.py
git commit -m "verify: V1.4.0 端到端联调日志"
```

---

## Task 10: bump-version + changelog + handoff

**Files:**
- Create: `docs/changelog/2026-08-13-v1.4.0-bms-v113-protocol-integration.md`
- Modify: `docs/CHANGELOG.md` (顶部加 1.4.0 段)
- Modify: `README.md` (加 v1.4.0 release notes)
- Create: `docs/handover/HANDOFF-V1.4.0-2026-08-13.md`

- [ ] **Step 1: 写 changelog**

格式跟 v1.3.1 一样 (参考 `docs/changelog/2026-08-13-v1.3.0-debug-panel.md`):

```markdown
# v1.4.0 (2026-08-13) - BMS V1.13 协议集成

## 改动
- `SerialCube.html` `_defaultProtocols` 替换 proto_bms: 8 commands → 19 commands
- 协议文档同步: `docs/protocol/BMS通信协议V1.13.md` (CRC 实算, 77 帧验证通过)
- 新增 `tools/bms_v113_slave.py`: Mock BMS 从机, COM20, 19 命令全应答
- 新增 `tools/gen_bms_v113_config.py` + `bms_v113_protocol.json`: 协议 JSON 中间表示
- 新增 `docs/protocol/bms_v113_protocol_js.json`: 转 SerialCube JS 配置格式
```

- [ ] **Step 2: 更新 `docs/CHANGELOG.md`**

- [ ] **Step 3: 更新 `README.md`** (跟 v1.3.1.1 一样加 release notes 段)

- [ ] **Step 4: 写 handoff**

```markdown
# Handoff V1.4.0 - 2026-08-13

## 怎么用 V1.13
1. 启动 Mock BMS: `python tools/bms_v113_slave.py`
2. 浏览器连 `http://localhost:8000/SerialCube.html`
3. 选 COM21 + V1.13 协议, 开始测

## 怎么扩 V1.14
1. 改 `docs/protocol/BMS通信协议V1.14.md`
2. 跑 `python tools/gen_bms_v113_config.py` (改输入路径)
3. 改 `SerialCube.html` _defaultProtocols
4. 改 `tools/bms_v113_slave.py` 加新命令 handler

## 已知问题
- Web Serial API 在 file:// 下禁用, 必须 HTTP 服务
- 0x06 OCV 字段长度 doc 标 808 bit 但按 1616 处理 (见 Task 2 注)
- 升级流程 (0x10-0x15) 简化模拟, 不写 flash
```

- [ ] **Step 5: Commit + 跑 preflight + 等用户 push**

```powershell
git add docs/changelog/ docs/CHANGELOG.md README.md docs/handover/
git commit -m "docs: v1.4.0 changelog + handoff"
pwsh -File .minimax\skills\serialcube-workflow\preflight.ps1
```

**重要**: 不要自动 push! 等用户确认。

---

## 风险与回滚

| 风险 | 触发条件 | 回滚方式 |
|------|----------|----------|
| 改 HTML 破 e2e | Task 8 Step 6 任一 FAIL | `Move-Item SerialCube.html.bak SerialCube.html -Force` |
| Mock BMS 跟实际 BMS 行为不一致 | 用户实接 BMS 时发现差异 | 改 `tools/bms_v113_slave.py`, 真实 BMS 是真值 |
| Web Serial 不支持 | 浏览器不是 Chromium | 提示换浏览器, 不能用 Safari/FF |
| COM20/21 被占用 | 用户跑了别的程序 | 退出占进程, 或换 COM 对 |
| 协议 doc 错误 (跟真实 BMS 固件) | 实接发现帧对不上 | 改 `BMS通信协议V1.13.md` (你昨天写的, 跟固件团队核) |

---

## 时间预估

- Task 1: 0.1h (纯环境)
- Task 2: 1.0h (MD 解析)
- Task 3: 0.4h (骨架)
- Task 4: 1.0h (核心 4 命令)
- Task 5: 0.6h (配置/SN/均衡)
- Task 6: 1.0h (日志/容量/风扇/升级/级联)
- Task 7: 0.4h (JSON 转 JS)
- Task 8: 0.4h (HTML 替换)
- Task 9: 0.5h (E2E 联调)
- Task 10: 0.3h (文档)
- **总计: 5.7h**

---

## 不在范围 (本任务)

- ❌ 真实 BMS 硬件实接 (用户后续自己接)
- ❌ AFE 保护动态触发模拟
- ❌ 多机级联 (0x16 只模拟单机 + 1 假级联)
- ❌ 升级流程的 flash 写入模拟
- ❌ 单元测试框架 (单 HTML 项目, 用 e2e)
- ❌ 自动 push (遵守"用户同意才 push"硬规则)
- ❌ Eltima / com0com 安装 (用户已有 COM20/21)

---

## 完成定义 (DoD)

✅ Task 1-10 全勾完  
✅ `bms_v113_slave.py` 能 19 命令全应答, 全部 CRC 通过  
✅ `SerialCube.html` _defaultProtocols 有 19 commands, 选 V1.13 协议后能跟 Mock BMS 通信  
✅ e2e 6 场景全 PASS  
✅ preflight 9 项全 PASS  
✅ changelog + handoff + README 都更新  
✅ 所有 commit 干净 (单步可回滚)  
✅ 没自动 push (等用户拍板)
