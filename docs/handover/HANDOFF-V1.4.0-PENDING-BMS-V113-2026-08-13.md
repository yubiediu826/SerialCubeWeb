# SerialCube v1.4.0 交接 — BMS V1.13 协议集成（待执行）— 2026-08-13

> **状态:** **PENDING**（计划已写完，**未开始执行**）
> **VERSION:** 1.3.1.1 → 1.4.0（**未升**，等执行时跑 `bump-version.ps1`）
> **触发:** 用户反馈"SerialCube.html 运行的都是死数据" + 上一轮生成的 V1.13 协议 doc
> **完整计划:** [`../superpowers/plans/2026-08-13-bms-v113-slave-and-config.md`](../superpowers/plans/2026-08-13-bms-v113-slave-and-config.md)（10 Task, 5.7h 估算, 必读）
> **目标交付:** 主机连 COM21 真实读 Mock BMS 数据（COM20），替换当前 30ms 自循环的"死数据"mock

---

## 1. TL;DR（30 秒看完）

**问题**: SerialCube.html v1.3.1.1 当前的 mock 模式 = `initMockData()` 写死初始值 + 30ms 后自动用 `buildFrame()` 造 ack 帧,**数据是静态的、跟协议 doc 不挂钩**。用户昨天写了一份完整的 BMS V1.13 协议 doc（19 commands, 77 帧 CRC 实算通过），要把 doc 转成 SerialCube 能跑的协议配置 + 真实从机。

**方案**: 3 件套

| 组件 | 路径 | 状态 |
|------|------|------|
| 协议 doc（参考） | `docs/protocol/BMS通信协议V1.13.md` | ✅ 已存在（82KB, 上一轮生成） |
| Mock BMS 从机 | `tools/bms_v113_slave.py` | ⏳ 计划已写，待 T3-T6 实现 |
| 协议 JSON 中间表示 | `docs/protocol/bms_v113_protocol.json` | ⏳ 待 T2 从 MD 解析 |
| SerialCube.html V1.4.0 集成 | `SerialCube.html:10711-10759` | ⏳ 待 T8 替换 `_defaultProtocols` |

**虚拟串口**: COM20 ⇄ COM21（用户用 Eltima 已配对，**已确认** pyserial 能 `serial.Serial('COM20').close()` 通过）

**关键决策**（用户已拍板，**不要再问**）:

1. ✅ **HTML 默认配置直接改**（不生成独立 JSON + 运行时导入）
2. ✅ **用 Eltima 现有 COM20/21**（不装 com0com、不用 socket bridge）
3. ✅ **从机全命令 0x01-0x16 都实现**（不只做核心三件套）

---

## 2. 必须知道的背景

### 2.1 SerialCube.html 数据流现状

```
NS.initMockData()  →  NS.currentVals  (静态初值)
                       ↓
              30ms 后 auto reply (setTimeout)
                       ↓
              NS.buildFrame(proto, ackCmd) → bytes
                       ↓
              NS.rxHistory.push(...)
```

- **死数据根因**: `initMockData()` 在 `SerialCube.html:11200` 写死初始值,后续 30ms 循环用 `buildFrame` 造帧,数据是恒定的
- **Web Serial API 真接路径** 已存在: `state.serial.port.readable` → `state.serial.reader.read()` → `processSerialInput()`
- **关键文件位置**:
  - `SerialCube.html:8724` — `const VERSION = '1.3.1.1'`
  - `SerialCube.html:10710-10777` — `NS._defaultProtocols` (proto_bms + proto_modbus)
  - `SerialCube.html:11200` — `NS.initMockData`
  - `SerialCube.html:13300-13320` — 30ms auto-reply 代码

### 2.2 V1.13 协议 doc 现状

- 路径: `docs/protocol/BMS通信协议V1.13.md`（82KB, 1352 行）
- **19 commands**: 0x01-0x0C（常规）+ 0x10-0x15（升级）+ 0x16（级联）
- **77 帧 CRC 实算通过**（上一轮 `_verify.py` 验证）
- **已知瑕疵**: 0x06 OCV 字段 xlsx 标 808 bit 但备注说 uint16_t 101 个值（= 1616 bit），按 uint16 处理（跟 0x04 MB 一致），**实测以 BMS 固件为准**

### 2.3 虚拟串口确认

```python
import serial
serial.Serial('COM20', 115200, timeout=0.1).close()  # OK
serial.Serial('COM21', 115200, timeout=0.1).close()  # OK
```

注: `serial.tools.list_ports.comports()` **不列** COM20/21（虚拟串口不通过标准方式注册），但 `serial.Serial()` 直接打开成功。

### 2.4 BMS V1.13 帧结构

| 字段 | 大小 | 说明 |
|------|------|------|
| head | 1 | MB=0x5A, CB=0x55 |
| addr | 1 | 默认 0x01 |
| cmd | 1 | 命令字 |
| len | 1 | 数据区长度 |
| set | N | 数据区（小端序） |
| crc_l | 1 | CRC16-Modbus 低字节 |
| crc_h | 1 | CRC16-Modbus 高字节 |

CRC 算法已在 V1.13 doc § 2 给 Python 函数,直接复用。

---

## 3. 完整计划

**计划文档**: [`../superpowers/plans/2026-08-13-bms-v113-slave-and-config.md`](../superpowers/plans/2026-08-13-bms-v113-slave-and-config.md)

**核心架构**:

```
   ┌──────────────────────┐    COM20 ⇄ COM21    ┌──────────────────────────┐
   │ tools/bms_v113_slave │  (Eltima 虚拟串口)   │  SerialCube.html v1.4.0  │
   │   (Python, pyserial)  │ ◄────────────────► │   (Web Serial API host)  │
   │   115200, 8N1         │                     │   浏览器内, 端口 COM21    │
   └──────────────────────┘                     └──────────────────────────┘
```

**10 个 Task 摘要**:

| Task | 内容 | 关键产物 | 自测门 |
|------|------|----------|--------|
| T1 | 验证环境 | COM20/21 OK, MD 82KB, e2e 基准 | preflight + select-scenarios 全 PASS |
| T2 | MD 解析 → JSON | `bms_v113_protocol.json` (19 commands) | `len(commands)==19` |
| T3 | 从机骨架 + 串口 + 帧解析 | `bms_v113_slave.py` skeleton | pyserial 测 read_frame 正确 |
| T4 | 0x01/0x02/0x03/0x05 handler | 4 handler | pyserial 测 4 命令, CRC 通过 |
| T5 | 0x04/0x06/0x07/0x08/0x09 | 5 handler | pyserial 测 5 命令, 含 SN 写后读回 |
| T6 | 0x0A/0x0B/0x0C/0x10-0x15/0x16 | 7 handler + 升级流程 + 0x15 主动上行 | 19 命令全测, 升级流程 0x15 100ms 后上行 |
| T7 | JSON → SerialCube JS 格式 | `bms_v113_protocol_js.json` | review JS 格式, `id` 是 int 不是 string |
| T8 | 替换 HTML `_defaultProtocols` | `SerialCube.html` v1.4.0 | DevTools 验 `NS.PROTOCOLS[0].commands.length==19` + e2e 6 场景全 PASS |
| T9 | 端到端联调 | 浏览器连 COM21 + Mock BMS COM20 + agent-browser 截图 | 实时数据 + 配置写后读回 |
| T10 | changelog + handoff | docs 3 文件 | 等用户 push |

**预估**: 5.7h, 70+ checkbox

---

## 4. 关键设计决策

### 4.1 从机 head 方向简化

V1.13 doc 规定 MB=0x5A、CB=0x55。SerialCube 内部 `proto_bms` 当前是单 head (0xAA)，不支持双向 head。

**决策**: 让 Mock BMS 响应**也用 0x5A**（协议解析不影响,只是命名差异）。

**风险**: 如果用户真实 BMS 固件严格要求 CB head=0x55,需要扩展 protocol schema 加 `headCB` 字段,或者拆成 2 个 protocol。

**接手时若发现此问题**: 改 `_defaultProtocols` 加 `headCB` 字段,改 `buildFrame` 处理双向 head,改动较大,需要单独 plan。

### 4.2 配置/状态存内存, 不写 flash

Mock BMS 的 `self.protect` / `self.ocv` / `self.sn` 等存 Python 实例属性（内存 dict）。
**重启即丢**,符合"模拟器"定位。

**升级流程 (0x10-0x14)**: 全部返回 0x00 成功,不写 flash,只累加 `self.last_pkt_num`。0x15 在最后一包后 100ms 主动上行。

### 4.3 状态实时变化

只 `self.curr_ma` / `self.soc` / `self.temps` 在 `run()` 主循环里**轻微漂移**（±0.5mA 电流、±0.1% SOC、温度在 -15~45℃ 随机游走）。其他字段（cells 电压、保护状态）保持配置值。

**不模拟**: AFE 保护动态触发、电芯真实压差、短路、电池过温保护等异常状态。这些由真实 BMS 固件处理。

### 4.4 e2e 6 场景不破

T8 改 HTML 后必跑 `select-scenarios.ps1`,任一 FAIL 立即回滚 `SerialCube.html.bak`（T8 Step 2 备份）。

### 4.5 0x06 OCV 字段长度歧义

xlsx 标 808 bit, 备注说 uint16_t 101 个值（= 1616 bit）。
**处理**: 按 1616 bit / 204 字节 / uint16 处理（与 0x04 MB 一致）,doc § 9.2 已标注"以 BMS 固件为准"。

---

## 5. 风险与回滚

| 风险 | 触发条件 | 回滚 |
|------|----------|------|
| **改 HTML 破 e2e** | T8 Step 6 任一 FAIL | `Move-Item SerialCube.html.bak SerialCube.html -Force` |
| **Mock BMS 跟实际 BMS 行为不一致** | 用户实接 BMS 时发现差异 | 改 `tools/bms_v113_slave.py` |
| **Web Serial 不支持** | 浏览器不是 Chromium | 提示换浏览器 |
| **COM20/21 被占用** | 别的程序占用 | 退出占进程 |
| **协议 doc 错误** | 实接发现帧对不上 | 改 `BMS通信协议V1.13.md`（跟固件团队核）|
| **head 方向不匹配真实 BMS** | 真实 BMS 拒收 0x5A 响应 | 扩展 protocol schema 加 headCB |

**回滚 SerialCube.html 不影响 `tools/bms_v113_slave.py`**,两个独立组件,任一坏了另一个不坏。

---

## 6. 接手 checklist（30 分钟读完即可开干）

### 6.1 必读文档

- [ ] **本 handoff** (本文档) — 5 分钟
- [ ] **完整 plan**: `../superpowers/plans/2026-08-13-bms-v113-slave-and-config.md` — 20 分钟（70+ 步骤,每步 2-5 分钟）
- [ ] **V1.13 协议 doc** 重点章节: § 2 (CRC), § 5.1 (0x02 字段表 — gold standard), § 4.2 (0x01 状态 143 字节) — 10 分钟
- [ ] **PROTOCOL-TEMPLATES.md** — 5 分钟（理解 SerialCube 内部 protocol schema）

### 6.2 执行顺序

**严格按 plan 顺序执行**, 不要跳 Task。每个 Task 完成后跑对应的自测门, FAIL 立即排查/回滚。

```
T1 (0.1h) → T2 (1.0h) → T3 (0.4h) → T4 (1.0h) → T5 (0.6h) → T6 (1.0h)
   ↓                                                            ↓
preflight+e2e 基准                                          19 命令全测
                                                                ↓
T7 (0.4h) → T8 (0.4h) → T9 (0.5h) → T10 (0.3h)
            ↓             ↓
       e2e 6 场景      浏览器实测
```

### 6.3 关键命令速查

```powershell
# 启 HTTP 服务（浏览器连 SerialCube）
cd D:\WorkSpace\SerialCubeWeb
python -m http.server 8000

# 启 Mock BMS 从机
python tools\bms_v113_slave.py

# 跑 preflight
pwsh -File .minimax\skills\serialcube-workflow\preflight.ps1

# 跑 e2e 6 场景
pwsh -File .minimax\skills\serialcube-e2e\scripts\select-scenarios.ps1

# 升 VERSION
pwsh -File .minimax\skills\version-management\scripts\bump-version.ps1 -Level minor

# 回滚 HTML
Move-Item SerialCube.html.bak SerialCube.html -Force
```

### 6.4 e2e 联调脚本片段

`tools/host_observer.py`（待 T9 创建）后台读 COM21 mirror, 抓 SerialCube 发出的所有 TX 帧:

```python
import serial
s = serial.Serial('COM20', 115200, timeout=1)
while True:
    data = s.read(256)
    if data: print(f'[TX from host] {data.hex()}')
```

跟 `tools/bms_v113_slave.py` 一起跑,**同时观察**两条数据流（host→slave, slave→host）。

---

## 7. 验收标准 (DoD)

✅ T1-T10 全勾完
✅ `bms_v113_slave.py` 19 命令全应答, CRC 实算通过
✅ SerialCube.html `_defaultProtocols` 有 19 commands, 选 V1.13 协议后跟 Mock BMS 通信正常
✅ e2e 6 场景全 PASS（**任何 1 个 FAIL 必须回滚**）
✅ preflight 9 项全 PASS
✅ `docs/changelog/2026-08-13-v1.4.0-*.md` 新建
✅ `docs/handover/HANDOFF-V1.4.0-2026-08-13.md` 新建（**不是**本 pending 文档,而是完成态）
✅ `README.md` 加 v1.4.0 release notes
✅ `docs/CHANGELOG.md` 同步
✅ 所有 commit 干净（每步可单独回滚）
✅ **没自动 push**（遵守"用户同意才 push"硬规则,完成态 ask_user）

---

## 8. 不在范围（本任务明确排除）

- ❌ 真实 BMS 硬件实接（用户后续自己接）
- ❌ AFE 保护动态触发模拟
- ❌ 多机级联（0x16 只模拟单机 + 1 假级联）
- ❌ 升级流程的 flash 写入模拟
- ❌ 单元测试框架（单 HTML 项目, 用 e2e）
- ❌ 自动 push
- ❌ Eltima / com0com 安装（用户已有 COM20/21）

---

## 9. 相关 commit / 文件

**未做**（pending 状态,无 commit）:
- 等待 T2 起开始 commit

**已完成**（上下文,不算本次任务产物）:
- 上一轮 commit（V1.13 协议 doc 生成）: 不在本 handoff 范围

**待创建**:
- `tools/bms_v113_slave.py` (T3)
- `tools/gen_bms_v113_config.py` (T2)
- `tools/json2sc_config.py` (T7, 可选, 可合并到 T2)
- `tools/host_observer.py` (T9, 可选)
- `docs/protocol/bms_v113_protocol.json` (T2)
- `docs/protocol/bms_v113_protocol_js.json` (T7)
- `docs/changelog/2026-08-13-v1.4.0-bms-v113-protocol-integration.md` (T10)
- `docs/handover/HANDOFF-V1.4.0-2026-08-13.md` (T10, 完成态,区别于本文)
- `docs/verify/2026-08-13-v1.4.0-e2e-log.md` (T9)

**待修改**:
- `SerialCube.html` (T8, -8/+10 行, 替换 `_defaultProtocols` proto_bms)
- `SerialCube.html:8724` (T8, VERSION 1.3.1.1 → 1.4.0)
- `README.md` (T10)
- `docs/CHANGELOG.md` (T10)

---

## 10. 联系 / 上下文

**触发这次任务的用户原话**:
> "当前 SerialCube.html 运行的都是死数据,根据 D:/WorkSpace/SerialCubeWeb/docs/protocol BMS通信协议V1.13.md 文件生成配置文件,测试主机,从机数据交互,虚拟串口是 COM20,COM21。制定计划"

**用户 3 个决策** (通过 `ask_user` 确认, 2026-08-13):
1. 改 HTML 默认配置（推荐）
2. 用现有 Eltima COM20/21（不装 com0com）
3. 从机全命令 0x01-0x16（不只核心三件套）

**用户当前期望**: 看到交接文档, **不会立即执行**,等下次启动 / 别的 agent 接手 / 决定执行时再说。

---

## 11. Quick Start（执行第一步）

如果决定开始执行,跑这个:

```powershell
# 0. 备份（防回滚）
Copy-Item D:\WorkSpace\SerialCubeWeb\SerialCube.html D:\WorkSpace\SerialCubeWeb\SerialCube.html.bak

# 1. 跑 preflight 看现状
pwsh -File D:\WorkSpace\SerialCubeWeb\.minimax\skills\serialcube-workflow\preflight.ps1

# 2. 跑 e2e 看基线
pwsh -File D:\WorkSpace\SerialCubeWeb\.minimax\skills\serialcube-e2e\scripts\select-scenarios.ps1

# 3. 创建 tools 目录（如不存在）
New-Item -ItemType Directory -Path D:\WorkSpace\SerialCubeWeb\tools -Force

# 4. 开 T1
```

如果 e2e 已经 FAIL,先别动 HTML,排查是 V1.3.1.1 自身问题还是别的。

---

**TL;DR 完。30 秒看完。剩 5.7h 在 plan 里。**
