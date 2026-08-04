# v4.9 Sub-3 Pair Trigger 真实发送 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 dashboard 模式 c9/c10 (0x10 charge) + c11/c12 (0x11 discharge) 的 ↗ 按钮从占位 toast 改造为真实串口发送,设备回 0x90/0x91 后才更新 SET,cmd.dataSize 从手填改为自动算。

**Architecture:** 6 个连续 commit,先底层后上层:dataSize 工具函数 → 0x90/0x91 数据模型 → ack 解析抽象 → modal 入口 → 主流程(发 + 等 ack)→ c11/c12 + settings + 真串口 RX 接入。每个 commit 自包含可验证(浏览器手测 + DevTools console 验)。

**Tech Stack:** 原生 JS (IIFE, ES2020+),原生 CSS,Web Serial API (navigator.serial),TextEncoder/TextDecoder,DataView(可能),无测试基础设施(DevTools 验证替代)。

---

## Global Constraints

来自 spec §1.5 / §10 DoD / AGENTS.md,所有 task 隐含遵守:

1. **AGENTS.md 数据兼容性 5 条全部不动**:
   - `localStorage` keys: `serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`
   - 配置 JSON type `SerialWebUserConfig` v1
   - `.timeline` 二进制 magic `0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00` ("WSLBIN1\0")
   - API 路径 `/api/serialweb_page-view`
   - JS 内部命名 `__serialWeb*` / `clearSerialWebStoredUserData`
2. **v4.8a/b 11 个 commit 行为不变**:8 个 `_buildFrameXxx` 调用链不动,协议编辑器"验证"按钮行为不变
3. **旧 user config 100% 兼容**:`cmd.dataSize` 字段保留(运行时不读,UI 自动算),0x90/0x91 不在旧 config 时加载时自动补
4. **mock 模式 c1-c8 卡片值不变**:`initMockData` + `tickMockData` 行为不变
5. **中文 commit message**:标题 + 正文分段(背景 / 范围 / 验证)
6. **单文件优先**:`SerialCube.html` 主代码不动,改完一个 commit 一次
7. **改 UI 后必须截图自检**(HANDOFF.md AGENTS.md):浏览器加载,看截图找问题
8. **无测试基础设施**:DevTools console 验证 + 浏览器手测替代 TDD

**文件位置参考**(实施时定位用):
- `NS.COMMANDS` 定义:`SerialCube.html:9384-9391`
- `NS.DATA_FIELDS` 定义:`SerialCube.html:9367-9379`
- `NS.CARDS` 定义:`SerialCube.html:9396-9407`
- `NS.initMockData` + `NS.tickMockData`:`SerialCube.html:9436-9491`
- 现状 trigger 按钮 handler:`SerialCube.html:9629`
- pair 卡渲染分支:`SerialCube.html:9545-9583`
- 添加命令表单:`SerialCube.html:11397`
- 现有 sendPayload:`SerialCube.html:13067-13080`
- `_buildFrameXxx` 8 个:`SerialCube.html:10556-10760`
- 现有 5 个 modals (modal-backdrop + modal):`SerialCube.html:7154-7250`

**自测环境**:
- 虚拟串口 **com50 / com51**(用户确认,Windows)
- SerialCube 连 com50,Python 脚本桥接 com50-com51
- 模拟设备:Python 脚本从 com51 读 0x10 → 回 0x90 bytes

---

## Task 1: v4.9.1 dataSize 自动算

**Files:**
- Modify: `SerialCube.html:9367-9379` (加 `_FIELD_BYTE_SIZE` 在 DATA_FIELDS 之前)
- Modify: `SerialCube.html` 新增 `NS.computeDataSize` 函数(放在 `NS.encodeDataFields` 之后,约 line 10550 之后)
- Modify: `SerialCube.html:11380-11400` (添加命令表单:datasize 输入框 → 只读自动算显示)
- Modify: `SerialCube.html:11240-11260` (CMD 列表显示 data N bytes:用 computeDataSize)

**Interfaces:**
- Consumes: `NS.DATA_FIELDS` (line 9367 数组,字段含 `name` / `type`)
- Produces:
  - `NS._FIELD_BYTE_SIZE` 字典 (8 个 type → 字节数)
  - `NS.computeDataSize(cmd)` 函数 (输入 cmd,返回字节数;0 表示缺字段 / string 变长)

**验收清单**(commit 前手过):
- [ ] 协议编辑器打开
- [ ] 切到 "BMS TLV v1 (Legacy)" tab,CMD 列表里 0x10 charge 显示 "data 4 bytes"(自动算)
- [ ] 切到添加命令表单,选 0x10 模板 → 看到 "自动算 4 bytes" 标签(无输入框)
- [ ] DevTools:`NS.computeDataSize(NS.COMMANDS.find(c=>c.id===0x10))` → `4`
- [ ] DevTools:`NS.computeDataSize(NS.COMMANDS.find(c=>c.id===0x11))` → `2`
- [ ] DevTools:`NS.computeDataSize(NS.COMMANDS.find(c=>c.id===0x01))` → `10`
- [ ] DevTools:`NS.computeDataSize({dataFields:['nonexistent']})` → `0`
- [ ] 加载旧 user config (无 kind, 0x10/0x11 有 dataSize=4/2)→ 不报错,CMD 列表显示 "data 4 bytes" 自动算值

### Step 1.1: 加 NS._FIELD_BYTE_SIZE 常量

打开 `SerialCube.html`,在 `NS.DATA_FIELDS` 定义之前 (约 line 9366) 插入:

```js
// v4.9.1: dataSize 自动算 - type → 字节数映射
NS._FIELD_BYTE_SIZE = { u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, float: 4, double: 8 };
```

**verify**:浏览器加载,DevTools console:
```js
NS._FIELD_BYTE_SIZE.u16
// 期望: 2
```

### Step 1.2: 加 NS.computeDataSize 函数

在 `NS.encodeDataFields` 定义结束后(约 line 10550 之后,具体位置搜 `NS.encodeDataFields` 函数结尾的 `};` 下面),插入:

```js
// v4.9.1: dataSize 自动算 - 按 cmd.dataFields + DATA_FIELDS 算字节数
// 返 0 = 缺字段 / string 变长 / 未知 type (UI 该报警)
NS.computeDataSize = function (cmd) {
  if (!cmd || !cmd.dataFields) return 0;
  let total = 0;
  for (const fname of cmd.dataFields) {
    const field = NS.DATA_FIELDS.find(f => f.name === fname);
    if (!field) return 0;
    const size = NS._FIELD_BYTE_SIZE[field.type] || 0;
    if (!size) return 0;
    total += size;
  }
  return total;
};
```

**verify**:DevTools:
```js
NS.computeDataSize(NS.COMMANDS.find(c => c.id === 0x10))
// 期望: 4
NS.computeDataSize(NS.COMMANDS.find(c => c.id === 0x11))
// 期望: 2
NS.computeDataSize(NS.COMMANDS.find(c => c.id === 0x01))
// 期望: 10
NS.computeDataSize({ dataFields: ['nonexistent_field'] })
// 期望: 0
```

### Step 1.3: 协议编辑器 CMD 列表显示改用 computeDataSize

找到 CMD 列表渲染代码(在 `dh-cmd-config-modal` 区域,约 line 11240-11260 附近,搜 `cmd.dataSize` 或 `dataSize`),把所有 `cmd.dataSize` 显示改为 `NS.computeDataSize(cmd)`。

典型 pattern:
```js
// 改前
'data ' + cmd.dataSize + ' bytes'
// 改后
'data ' + NS.computeDataSize(cmd) + ' bytes'
```

**verify**:协议编辑器打开,CMD 列表里:
- 0x01 Read Voltage 显示 "data 10 bytes"
- 0x10 Control Charge 显示 "data 4 bytes"
- 0x11 Control Disch 显示 "data 2 bytes"

### Step 1.4: 添加命令表单删 datasize 输入框 → 改只读自动算

打开 `SerialCube.html`,搜 `dh-cmd-form-datasize`(约 line 11380-11400 区域)。删除 `datasize` 输入框 HTML,替换为只读 span:

改前(典型 pattern):
```html
<label>datasize: <input id="dh-cmd-form-datasize" type="number" ...></label>
```

改后:
```html
<label>data: <span id="dh-cmd-form-datasize" class="readonly-auto-calc">自动算 0 bytes</span></label>
```

找到添加命令表单的 `onChange` 函数(在同一个 modal 区域,处理 dataFields 改变时刷新 datasize 显示),改为:
```js
// 改前
document.getElementById('dh-cmd-form-datasize').value = ...;
// 改后
const autoSize = NS.computeDataSize({ dataFields: fields });
const dsEl = document.getElementById('dh-cmd-form-datasize');
if (dsEl) {
  dsEl.textContent = autoSize ? `自动算 ${autoSize} bytes` : '自动算 — (string 变长 / 缺字段)';
  dsEl.classList.toggle('warn', autoSize === 0);
}
```

**verify**:协议编辑器打开 → 添加命令表单:
- 默认:看到 "自动算 0 bytes"
- 选 0x10 模板(2 字段)→ "自动算 4 bytes"
- 选 0x11 模板(1 字段)→ "自动算 2 bytes"
- 删一个字段 → "自动算 2 bytes" / "自动算 0 bytes"

### Step 1.5: 加载旧 user config 兼容性测试

测试旧 user config(无 kind, 0x10/0x11 有 dataSize 字段)加载不报错:

1. DevTools 模拟旧 config:
```js
const oldConfig = {
  type: 'SerialWebUserConfig',
  version: 1,
  protocols: NS.PROTOCOLS.map(p => ({...p, kind: undefined})),  // 模拟无 kind
  dataFields: NS.DATA_FIELDS,
  commands: NS.COMMANDS.map(c => ({...c, dataSize: c.dataSize})),  // 保留旧 dataSize
  cards: NS.CARDS
};
console.log('old config:', JSON.stringify(oldConfig).slice(0, 200));
```
2. 通过用户配置导入入口(在系统菜单)导入 oldConfig
3. 验证:页面正常加载,无 console error
4. 协议编辑器 CMD 列表:0x10 显示 "data 4 bytes"(自动算值,不是旧 dataSize)

**verify**:见上

### Step 1.6: 回归保护测试

1. 加载 SerialCube.html → 切到 dashboard 模式
2. 验证 c1-c8 卡片值不变(pack_v_avg ~3.71V, cell_1_v ~3.71V)
3. 验证 c9/c10 卡片显示 56.0 V SET
4. 验证协议编辑器"验证"按钮(commit `94a09fc`)行为不变:点 ✓ 验证 → 仍出 "协议验证 OK" 绿 toast

**verify**:见上

### Step 1.7: 截图自检 + Commit

1. 浏览器加载 SerialCube.html
2. 截图 dashboard 模式 + 协议编辑器 + 添加命令表单(看 UI 整洁度)
3. 检查 console 无 error
4. Commit:
```bash
git add SerialCube.html
git commit -m "feat(v4.9.1): cmd.dataSize 改为自动算 (NS.computeDataSize)

背景:
- v4.8 sub-1 完成 kind 0-7 dispatcher + 验证按钮
- 但 cmd.dataSize 仍是硬编码 (0x10=4, 0x11=2, 0x01=10)
- 协议编辑器添加命令表单让用户手填 datasize, 易错

范围:
- 加 NS._FIELD_BYTE_SIZE 常量 (8 type → 字节数)
- 加 NS.computeDataSize(cmd) 函数 (查 DATA_FIELDS 自动算)
- CMD 列表 'data N bytes' 改用 computeDataSize
- 添加命令表单: 删 datasize 输入框, 改只读 '自动算 N bytes' 显示
- string 变长 / 缺字段返 0 + UI 报警

验证 (手测):
- 协议编辑器 0x10/0x11/0x01 CMD 列表显示 'data 4/2/10 bytes'
- 添加命令表单: 选 0x10 看到 '自动算 4 bytes' (无输入框)
- DevTools: NS.computeDataSize 返值对 (0x10=4, 0x11=2, 0x01=10)
- 旧 user config 加载不报错 (dataSize 字段保留, 运行时不读)
- 回归: c1-c8 卡片值不变, 协议编辑器验证按钮行为不变
- AGENTS.md 数据兼容性 5 条不动"
```

---

## Task 2: v4.9.2 ACK 0x90/0x91 命令定义

**Files:**
- Modify: `SerialCube.html:9384-9391` (NS.COMMANDS 加 0x90 / 0x91)
- Modify: `SerialCube.html:9437-9442` (NS.initMockData 的 initVals 加 charge_i_set / discharge_v_set)
- Modify: `SerialCube.html:9468-9470` (NS.tickMockData 的 jitter 白名单加新字段)
- Modify: `SerialCube.html:11234-11236` (加载 uc.commands 后,容错插入 0x90/0x91)

**Interfaces:**
- Consumes: 现有 `NS.COMMANDS` 数组(line 9384)
- Produces: `NS.COMMANDS` 数组新增 2 项(0x90 charge ack / 0x91 disch ack),direction='rx',frameType='response',cadence=0

**验收清单**:
- [ ] `NS.COMMANDS` 数组长度 6 → 8
- [ ] 0x90 cmd.direction='rx', frameType='response', dataFields=['charge_v_set','charge_i_set'], dataSize=4
- [ ] 0x91 cmd.direction='rx', frameType='response', dataFields=['discharge_v_set'], dataSize=2
- [ ] `NS.currentVals.charge_i_set === 0`
- [ ] `NS.currentVals.discharge_v_set === 0`
- [ ] `tickMockData` 不抖 set 字段(charge_v_set / charge_i_set / discharge_v_set 都不变)
- [ ] c1-c8 卡片值不变(回归)
- [ ] c9 / c10 初始显示 56.0 / 0(charge_i_set 新加初始 0,无 0x10 触发时 c9 不显示该字段)

### Step 2.1: NS.COMMANDS 加 0x90 / 0x91

打开 `SerialCube.html`,找到 `NS.COMMANDS = [` (line 9384),在 `// v4.4.3: ... 0x11 ...` 注释之后,数组末尾加:

```js
// v4.9.2: ACK 命令定义 (方向 rx, frameType response, cadence 0 不主动 query)
{ id: 0x90, name: 'Charge Ack',  direction: 'rx', frameType: 'response', cadence: 0, protocol: 'proto_bms', dataFields: ['charge_v_set', 'charge_i_set'], dataSize: 4 },
{ id: 0x91, name: 'Disch Ack',   direction: 'rx', frameType: 'response', cadence: 0, protocol: 'proto_bms', dataFields: ['discharge_v_set'], dataSize: 2 }
```

**注意**:`dataSize: 4 / 2` 仍填(保持数组里所有 cmd 有 dataSize 字段,旧 user config 兼容),运行时由 `computeDataSize` 算,这里只是占位。

**verify**:DevTools:
```js
NS.COMMANDS.length
// 期望: 8
NS.COMMANDS.find(c => c.id === 0x90)
// 期望: { id: 0x90, name: 'Charge Ack', direction: 'rx', frameType: 'response', dataFields: ['charge_v_set', 'charge_i_set'], ... }
```

### Step 2.2: NS.initMockData 加 charge_i_set / discharge_v_set 初始值

打开 `SerialCube.html`,找到 `NS.initMockData` (line 9436 附近)。在 `initVals` 对象 (line 9437-9442 附近) 加:

```js
const initVals = {
  'cell_1_v': 3.71, 'cell_2_v': 3.72, 'cell_3_v': 3.69, 'cell_4_v': 3.73,
  'pack_i': 1.2, 'temperature': 25.3, 'soc': 87.5,
  'charge_v_set': 56.0,
  'charge_i_set': 0,           // v4.9.2 新加
  'discharge_v_set': 0          // v4.9.2 新加
};
```

**verify**:刷新页面,DevTools:
```js
NS.currentVals.charge_i_set
// 期望: 0
NS.currentVals.discharge_v_set
// 期望: 0
NS.currentVals.charge_v_set
// 期望: 56.0
```

### Step 2.3: tickMockData 的 jitter 白名单加新字段

打开 `SerialCube.html`,找到 `NS.tickMockData`(在 `initMockData` 之后,约 line 9468-9470 附近)。找到 jitter 白名单:

```js
// v4.4.3: set 字段 (TX 输入值) 不抖, 保持原值, 等用户触发
if (field === 'charge_v_set' || field === 'charge_i_set' || field === 'discharge_v_set') return;
```

**注意**:现状已经有 `charge_i_set` 和 `discharge_v_set` 在白名单里(v4.4.3 当时就预留了),所以**这步可能不用改**。先 verify:

DevTools:
```js
NS.currentVals.charge_i_set = 99;
NS.tickMockData();  // 触发一次
NS.currentVals.charge_i_set
// 期望: 99 (没被 jitter 改)
NS.currentVals.discharge_v_set = 88;
NS.tickMockData();
NS.currentVals.discharge_v_set
// 期望: 88
```

如果白名单已包含 2 个新字段,跳过这步。

### Step 2.4: 加载旧 user config 时容错 0x90/0x91

打开 `SerialCube.html`,找到加载 user config 的代码(约 line 11234-11236 附近,搜 `if (uc.commands) NS.COMMANDS = uc.commands;`)。改成:

```js
// 改前
if (uc.commands) NS.COMMANDS = uc.commands;

// 改后
if (uc.commands) {
  NS.COMMANDS = uc.commands;
  // v4.9.2: 容错 - 旧 config 可能没 0x90/0x91, 自动补
  if (!NS.COMMANDS.find(c => c.id === 0x90)) {
    NS.COMMANDS.push({ id: 0x90, name: 'Charge Ack', direction: 'rx', frameType: 'response', cadence: 0, protocol: 'proto_bms', dataFields: ['charge_v_set', 'charge_i_set'], dataSize: 4 });
  }
  if (!NS.COMMANDS.find(c => c.id === 0x91)) {
    NS.COMMANDS.push({ id: 0x91, name: 'Disch Ack', direction: 'rx', frameType: 'response', cadence: 0, protocol: 'proto_bms', dataFields: ['discharge_v_set'], dataSize: 2 });
  }
}
```

**verify**:
1. DevTools 模拟旧 config(无 0x90/0x91):
```js
const oldConfig = {
  type: 'SerialWebUserConfig',
  version: 1,
  protocols: NS.PROTOCOLS,
  dataFields: NS.DATA_FIELDS,
  commands: NS.COMMANDS.filter(c => c.id !== 0x90 && c.id !== 0x91),
  cards: NS.CARDS
};
// 走用户配置导入入口
```
2. 验证:`NS.COMMANDS.length === 8` (含自动补的 0x90/0x91)
3. 验证:页面正常加载,无 console error

### Step 2.5: 回归保护测试

1. 加载 SerialCube.html → 切到 dashboard
2. c1-c8 卡片值:Cell 1 ~3.71V, Pack 均压 ~3.71V, 跟 v4.8 一致
3. c9 显示 "SET 56.0 / ACT ~55.7" (不变)
4. c10 显示 56.0 (不变)
5. DevTools: `NS.currentVals.charge_i_set === 0` (新加字段,初始 0)
6. DevTools: `NS.currentVals.discharge_v_set === 0` (新加字段,初始 0)

**verify**:见上

### Step 2.6: Commit

```bash
git add SerialCube.html
git commit -m "feat(v4.9.2): 加 0x90/0x91 ACK 命令 + charge_i_set/discharge_v_set 初始值

背景:
- v4.8 sub-1 留 sub-3 实施 pair trigger 真实发送
- 触发 0x10/0x11 后, 设备回 0x90/0x91 才能被 parseFrame 识别
- 现状 COMMANDS 数组没有 0x90/0x91 定义
- 现状 currentVals 没有 charge_i_set (0x10 第 2 字段) / discharge_v_set (0x11 字段)

范围:
- NS.COMMANDS 加 0x90 (Charge Ack) + 0x91 (Disch Ack), direction=rx, frameType=response, cadence=0
- initMockData 的 initVals 加 charge_i_set=0 + discharge_v_set=0
- tickMockData 的 jitter 白名单已包含新字段 (v4.4.3 预留, 不动)
- 加载 user config 时容错: 旧 config 缺 0x90/0x91 时自动补

验证 (手测):
- NS.COMMANDS.length === 8
- 0x90/0x91 cmd 字段正确 (direction/frameType/dataFields/dataSize)
- NS.currentVals.charge_i_set === 0
- NS.currentVals.discharge_v_set === 0
- 旧 user config (无 0x90/0x91) 加载后自动补全
- 回归: c1-c8 卡片值不变, c9/c10 初始 56.0 不变
- AGENTS.md 数据兼容性 5 条不动"
```

---

## Task 3: v4.9.3 ack 解析 + 状态空间

**Files:**
- Modify: `SerialCube.html` (新增 `NS._parseAckFields` / `NS._triggerAckHandler` / `NS._FIELD_HINT` / `NS._mockAckDisabled` / `NS.txPendingCmds` / `NS.txAckWaiters`,放在 `NS._buildFrameXxx` 8 个函数之后,约 line 10760 之后)

**Interfaces:**
- Consumes:
  - `NS.DATA_FIELDS` (查 type → byteSize)
  - `NS.PROTOCOLS` (查 byteOrder)
  - `NS.currentVals` (triggerAckHandler 写入)
  - `NS.trendData` (push 新点)
  - `NS.txAckWaiters` (Map, key = ack cmd id)
  - `NS._FIELD_BYTE_SIZE` (Task 1 加的)
- Produces:
  - `NS._FIELD_HINT` (字典, 字段名 → { label, unit, min, max, step })
  - `NS._parseAckFields(ackCmd, bytes, protoId)` (简单 ack 字节解析,返 `{field: value}`)
  - `NS._bytesToNumber(bytes, endian, type)` (bytes → number,支持 u8/u16/u32/i8/i16/i32/float)
  - `NS._triggerAckHandler(rxCmdId, bytes)` (查 waiter + 解析 + 写 currentVals + resolve)
  - `NS._mockAckDisabled` (布尔,默认 false,DevTools 设 true 屏蔽 mock)
  - `NS.txPendingCmds` (Set, 跟踪 pending 中的 cmd)
  - `NS.txAckWaiters` (Map, ack 等待表)

**验收清单**:
- [ ] `NS._FIELD_BYTE_SIZE` 8 个 type → 字节数
- [ ] `NS._FIELD_HINT` 3 个字段 → hint 对象
- [ ] `NS._parseAckFields(ackCmd, fakeBytes, 'proto_bms')` 返 { charge_v_set: 0x0238, charge_i_set: 0x0001 }
- [ ] `NS._bytesToNumber([0x02, 0x38], 'BE', 'u16')` → 568
- [ ] `NS._bytesToNumber([0x38, 0x02], 'LE', 'u16')` → 568
- [ ] DevTools 手动调 `NS._triggerAckHandler(0x90, [0xAA, 0x90, 0x04, 0x02, 0x38, 0x01, 0x00, 0x00, 0x55])` 后:
  - `NS.currentVals.charge_v_set === 56.8` (0x0238 = 568, ÷ 10 = 56.8 — 注意:现状编码可能没除以 10,直接整数,看 step 3.1 实现)
  - `NS.trendData['10.charge_v_set'].length` 增 1
  - c9 / c10 卡片刷新显示新值
- [ ] `NS.txPendingCmds` Set 是空,`NS.txAckWaiters` Map 是空
- [ ] `NS._mockAckDisabled = false` (默认)

### Step 3.1: 加 _FIELD_BYTE_SIZE / _FIELD_HINT 常量

打开 `SerialCube.html`,在 `NS._buildFrameXxx` 8 个函数结束后(约 line 10760 之后),插入:

```js
// v4.9.3: TX trigger 状态空间 - 字段 hint (modal 数字 stepper 兜底)
NS._FIELD_HINT = {
  'charge_v_set':     { label: '充电电压', unit: 'V', min: 0, max: 60, step: 0.1 },
  'charge_i_set':     { label: '充电电流', unit: 'A', min: 0, max: 30, step: 0.1 },
  'discharge_v_set':  { label: '放电电压', unit: 'V', min: 0, max: 60, step: 0.1 }
};

// v4.9.3: mock ack 调试开关 (DevTools 用, 不暴露 UI)
NS._mockAckDisabled = false;
```

**verify**:DevTools:
```js
Object.keys(NS._FIELD_HINT).length
// 期望: 3
NS._FIELD_HINT.charge_v_set
// 期望: { label: '充电电压', unit: 'V', min: 0, max: 60, step: 0.1 }
NS._mockAckDisabled
// 期望: false
```

### Step 3.2: 加 NS._bytesToNumber 函数

在 Step 3.1 之后插入:

```js
// v4.9.3: bytes → number 转换 (按 type + byteOrder)
NS._bytesToNumber = function (bytes, endian, type) {
  if (!bytes || !bytes.length) return 0;
  // 切到 DataView (统一处理大小端)
  const buf = new ArrayBuffer(Math.max(bytes.length, 8));
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) u8[i] = bytes[i];
  const dv = new DataView(buf);
  const isLE = (endian || 'BE') === 'LE';
  switch (type) {
    case 'u8':  return dv.getUint8(0);
    case 'i8':  return dv.getInt8(0);
    case 'u16': return dv.getUint16(0, isLE);
    case 'i16': return dv.getInt16(0, isLE);
    case 'u32': return dv.getUint32(0, isLE);
    case 'i32': return dv.getInt32(0, isLE);
    case 'float': return dv.getFloat32(0, isLE);
    case 'double': return dv.getFloat64(0, isLE);
    default: return 0;
  }
};
```

**verify**:DevTools:
```js
NS._bytesToNumber([0x02, 0x38], 'BE', 'u16')
// 期望: 568
NS._bytesToNumber([0x38, 0x02], 'LE', 'u16')
// 期望: 568
NS._bytesToNumber([0x01], 'BE', 'u8')
// 期望: 1
NS._bytesToNumber([0xFF], 'BE', 'u8')
// 期望: 255
```

### Step 3.3: 加 NS._parseAckFields 函数

在 Step 3.2 之后插入:

```js
// v4.9.3: 简单 ack bytes 解析 (按 ackCmd.dataFields 顺序切, 跳过 header/cmd/length/crc/tail)
// 完整 parseFrame 留 sub-2, 这里只针对 kind 0 fixed-header 协议
NS._parseAckFields = function (ackCmd, bytes, protoId) {
  const out = {};
  if (!ackCmd || !bytes || bytes.length < 6) return out;
  const proto = NS.PROTOCOLS.find(p => p.id === protoId);
  const protoEndian = (proto && proto.byteOrder) || 'BE';
  // kind 0 fixed-header: header(1) + cmd(1) + length(1) + data(N) + crc(2) + tail(1)
  const dataLen = bytes.length - 6;
  const data = bytes.slice(3, 3 + dataLen);
  let off = 0;
  for (const fname of (ackCmd.dataFields || [])) {
    const df = NS.DATA_FIELDS.find(f => f.name === fname);
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

**verify**:DevTools:
```js
// 模拟 0x90 ack bytes (0xAA 0x90 0x04 [2B charge_v_set=56.8=0x0238] [2B charge_i_set=0.1=0x0001] CRC CRC 0x55)
const fakeBytes = [0xAA, 0x90, 0x04, 0x02, 0x38, 0x00, 0x01, 0x00, 0x00, 0x55];
const ackCmd = NS.COMMANDS.find(c => c.id === 0x90);
NS._parseAckFields(ackCmd, fakeBytes, 'proto_bms')
// 期望: { charge_v_set: 568, charge_i_set: 1 }
// (注意: 568 是原始值, 没有除以 10, 跟现状 encodeDataFields 一致 — 不做单位换算)
```

### Step 3.4: 加 NS.txPendingCmds / NS.txAckWaiters 状态空间

在 Step 3.3 之后插入:

```js
// v4.9.3: TX trigger 状态空间
// txPendingCmds: 跟踪 pending 中的 cmd (用于同 cmd 互斥, 跨 cmd 独立)
NS.txPendingCmds = new Set();
// txAckWaiters: ack 等待表
//   key = ack cmd id (0x90/0x91)
//   value = { resolve, reject, timeoutId, triggerCmdId, ts }
NS.txAckWaiters = new Map();
```

**verify**:DevTools:
```js
NS.txPendingCmds.size
// 期望: 0
NS.txAckWaiters.size
// 期望: 0
NS.txPendingCmds instanceof Set
// 期望: true
NS.txAckWaiters instanceof Map
// 期望: true
```

### Step 3.5: 加 NS._triggerAckHandler 函数

在 Step 3.4 之后插入:

```js
// v4.9.3: trigger ack handler
//  - 查 waiter (NS.txAckWaiters.get(rxCmdId))
//  - 解析 ack bytes → 写 NS.currentVals + NS.trendData
//  - resolve waiter
//  返 true = 处理了 (trigger 响应), false = 放行 (非 trigger 响应)
NS._triggerAckHandler = function (rxCmdId, bytes) {
  // 1. 查 waiter
  const waiter = NS.txAckWaiters.get(rxCmdId);
  if (!waiter) return false;
  // 2. 找 cmd
  const cmd = NS.COMMANDS.find(c => c.id === waiter.triggerCmdId);
  if (!cmd) return false;
  const ackCmd = NS.COMMANDS.find(c => c.id === rxCmdId);
  if (!ackCmd) return false;
  // 3. 解析
  const parsed = NS._parseAckFields(ackCmd, bytes, cmd.protocol);
  // 4. 写 currentVals + push trendData
  cmd.dataFields.forEach((field) => {
    if (parsed[field] != null) {
      NS.currentVals[field] = parsed[field];
      const key = `${cmd.id.toString(16).padStart(2, '0').toUpperCase()}.${field}`;
      NS.trendData[key] = NS.trendData[key] || [];
      NS.trendData[key].push({ t: Date.now(), v: parsed[field] });
      if (NS.trendData[key].length > 60) NS.trendData[key].shift();
    }
  });
  // 5. resolve waiter
  NS.txAckWaiters.delete(rxCmdId);
  clearTimeout(waiter.timeoutId);
  waiter.resolve(bytes);
  return true;
};
```

**verify**:DevTools 手动测试:
```js
// 准备: 推一个 waiter
const ackPromise = new Promise((resolve, reject) => {
  NS.txAckWaiters.set(0x90, { resolve, reject, timeoutId: setTimeout(() => reject(new Error('TIMEOUT')), 5000), triggerCmdId: 0x10, ts: Date.now() });
});

// 准备: 记下触发前的 charge_v_set
const before = NS.currentVals.charge_v_set;
console.log('before:', before);

// 调 handler (模拟 0x90 ack: charge_v_set=56.8=0x0238, charge_i_set=0.1=0x0001)
const fakeBytes = [0xAA, 0x90, 0x04, 0x02, 0x38, 0x00, 0x01, 0x00, 0x00, 0x55];
NS._triggerAckHandler(0x90, fakeBytes);

// 等 promise resolve
ackPromise.then(bytes => {
  console.log('after currentVals:', NS.currentVals.charge_v_set);
  // 期望: 568
  console.log('trendData length:', NS.trendData['10.charge_v_set'].length);
  // 期望: 增 1
  console.log('txAckWaiters.size:', NS.txAckWaiters.size);
  // 期望: 0
});

// 视觉: 浏览器 c9 / c10 卡片应显示新值
```

### Step 3.6: 验证 _triggerAckHandler 接入到 dashboard

刷新页面,看 c9 / c10 卡片是否在 DevTools 调 handler 后立即刷新:
1. DevTools: `NS.currentVals.charge_v_set` 初始 ~56.0
2. DevTools 推 waiter + 调 handler(同 Step 3.5)
3. 浏览器 c9 卡片 SET 应显示 568(原始值,看现状编码是否要除以 10)
4. c9 sparkline 加新点

**注意**:现状 encodeDataFields 对 u16 字段(charge_v_set)的编码是**直接整数值**(没除以 10),所以 0x0238=568 在卡片上显示 568。但**用户期望的是 56.8V**——这个 unit 转换是 sub-3 要不要做的?

**决策**:sub-3 暂不做 unit 转换(保持跟现状一致,直接整数值),留 sub-X 改善显示。如果用户期望 56.8,后续 sub-2 重构时再加 unit 转换。

### Step 3.7: 回归保护

1. 加载页面 → c1-c8 卡片值不变
2. c9 / c10 初始 56.0
3. 协议编辑器打开,0x90 / 0x91 出现在 cmd 列表(direction='rx', frameType='response')
4. 协议编辑器"验证"按钮(commit `94a09fc`)行为不变

### Step 3.8: Commit

```bash
git add SerialCube.html
git commit -m "feat(v4.9.3): ack 解析抽象 + TX trigger 状态空间

背景:
- v4.9.2 加了 0x90/0x91 命令定义
- 触发 0x10/0x11 后, 需要解析设备回 0x90/0x91 bytes → 更新 currentVals
- 现状没有简单 bytes→number 工具, 没有 ack 处理函数

范围:
- NS._FIELD_HINT: 3 字段 hint (label/unit/min/max/step) 给 modal 数字 stepper
- NS._mockAckDisabled: DevTools 调试开关, 默认 false
- NS._bytesToNumber: DataView 包装, 支持 u8/u16/u32/i8/i16/i32/float/double + BE/LE
- NS._parseAckFields: 简单 ack bytes 解析 (kind 0 fixed-header 协议)
- NS.txPendingCmds: Set, 跟踪 pending 中的 cmd
- NS.txAckWaiters: Map, ack 等待表 (key=ack cmd id, value={resolve,reject,timeoutId,...})
- NS._triggerAckHandler: 查 waiter + 解析 + 写 currentVals + push trendData + resolve

验证 (手测):
- DevTools: NS._bytesToNumber([0x02,0x38], 'BE', 'u16') === 568
- DevTools: NS._parseAckFields(ackCmd, fakeBytes, 'proto_bms') 返 { charge_v_set: 568, charge_i_set: 1 }
- DevTools 手动调 _triggerAckHandler: currentVals.charge_v_set 更新 + trendData 加点
- 浏览器 c9/c10 卡片在 handler 调后立即刷新
- 回归: c1-c8 卡片值不变, 协议编辑器 0x90/0x91 出现, 验证按钮行为不变
- AGENTS.md 数据兼容性 5 条不动"
```

---

## Task 4: v4.9.4 弹 modal 改造 ↗ 按钮

**Files:**
- Modify: `SerialCube.html` body 区域 (约 line 7154-7250 现有 5 个 modals 之后) — 加 pair trigger modal DOM
- Modify: `SerialCube.html` CSS 区域 (约 line 5430 之前) — 加 modal 数字 stepper 样式 + .is-loading 样式
- Modify: `SerialCube.html:9629` (trigger 按钮 handler 改调 `openPairTriggerModal`)
- Modify: `SerialCube.html` 新增 `NS.openPairTriggerModal` 函数(放 `NS._triggerAckHandler` 之后)

**Interfaces:**
- Consumes:
  - `NS.COMMANDS` (查 cmd by id)
  - `NS.PROTOCOLS` (查 proto by cmd.protocol)
  - `NS.buildFrame` (v4.8a 加的,实时预览)
  - `NS.encodeDataFields` (buildFrame 内部用)
  - `NS.DATA_FIELDS` (查字段 unit/byteOrder)
  - `NS._FIELD_HINT` (Task 3 加的)
  - `NS.txPendingCmds` (查是否 pending)
- Produces:
  - `NS.openPairTriggerModal(cmdId, sourceCard)` (主入口)
  - 弹 `dh-pair-trigger-backdrop` + `dh-pair-trigger-modal`

**验收清单**:
- [ ] 点 c9 ↗ → 弹 modal 标题 "触发 0x10 Control Charge"
- [ ] modal 字段:2 个数字 stepper (充电电压 V + 充电电流 A),初始值 NS.currentVals
- [ ] modal 实时 hex 预览:输 56.5V → 显示 `AA 10 04 02 39 ...`(随输入变)
- [ ] 点取消 → modal 关闭,无 toast
- [ ] 点 c10 ↗ (trend 卡)→ 同样弹 modal(因为也是 0x10 cmd)
- [ ] 点 c11 ↗ → 弹 modal 标题 "触发 0x11 Control Disch",1 字段 (放电电压)
- [ ] modal 没 trigger 按钮(还没接发送),只有取消

### Step 4.1: 加 modal DOM 结构

打开 `SerialCube.html`,找到现有 5 个 modals 区域(约 line 7154-7250,在 5 个 modal 之后,版本 modal 之前)。在最后 1 个 modal (导入导出) 之后,加:

```html
<!-- v4.9.4: Pair trigger modal (0x10/0x11 共用) -->
<div class="modal-backdrop" id="dh-pair-trigger-backdrop" hidden></div>
<div class="modal" id="dh-pair-trigger-modal" hidden>
  <div class="modal-header">
    <button class="close-btn" data-close="dh-pair-trigger">×</button>
    <span class="modal-title" id="dh-pair-trigger-title">触发命令</span>
    <span class="modal-subtitle" id="dh-pair-trigger-subtitle">字段</span>
    <span style="flex: 1;"></span>
  </div>
  <div class="modal-body">
    <div class="form-section-title">设置值</div>
    <div id="dh-pair-trigger-fields" class="form-section-fields"></div>
    <div class="form-section-title" style="margin-top: 18px;">字节预览 (buildFrame)</div>
    <pre id="dh-pair-trigger-bytes" class="frame-preview">—</pre>
  </div>
  <div class="modal-footer">
    <button class="toolbar-btn" data-close="dh-pair-trigger">取消</button>
    <span class="spacer"></span>
    <button class="toolbar-btn primary" id="dh-pair-trigger-confirm-btn">触发</button>
  </div>
</div>
```

### Step 4.2: 加 modal CSS 样式

打开 `SerialCube.html`,找到现有 modal CSS (约 line 5300 之前,搜 `.modal-backdrop` 样式)。在 modal 相关样式之后加:

```css
/* v4.9.4: Pair trigger modal */
#dh-pair-trigger-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 0 4px;
}
#dh-pair-trigger-fields .field-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
#dh-pair-trigger-fields .field-label {
  flex: 0 0 100px;
  font-size: 13px;
  color: var(--text-soft);
}
#dh-pair-trigger-fields .field-input {
  flex: 1;
}
#dh-pair-trigger-fields .field-unit {
  flex: 0 0 30px;
  font-size: 12px;
  color: var(--text-soft);
}
#dh-pair-trigger-bytes {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  padding: 10px;
  background: var(--bg-soft, #f5f5f5);
  border-radius: 6px;
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-soft);
}
body.theme-dark #dh-pair-trigger-bytes {
  background: rgba(255, 255, 255, 0.04);
}
```

### Step 4.3: 加 NS.openPairTriggerModal 函数(只有 modal 渲染 + 实时预览,无发送)

打开 `SerialCube.html`,在 `NS._triggerAckHandler` (Task 3 加的) 之后插入:

```js
// v4.9.4: 弹 modal - 输 SET + 实时字节预览 (无发送, Task 5 才接)
NS.openPairTriggerModal = function (cmdId, sourceCard) {
  const cmd = NS.COMMANDS.find(c => c.id === cmdId);
  if (!cmd) return;
  const proto = NS.PROTOCOLS.find(p => p.id === cmd.protocol);
  if (!proto) return;

  // 同 cmd 互斥检查 (Q8 决策)
  if (NS.txPendingCmds.has(cmdId)) {
    NS.toast('请等待上次响应 (cmd 0x' + cmdId.toString(16).padStart(2, '0').toUpperCase() + ')', 'warn');
    return;
  }

  // 临时 userSet (modal 内编辑, 不写 currentVals)
  const userSet = {};
  cmd.dataFields.forEach(f => {
    userSet[f] = NS.currentVals[f] != null ? NS.currentVals[f] : 0;
  });

  // 渲染标题 + 字段
  const titleEl = document.getElementById('dh-pair-trigger-title');
  const subtitleEl = document.getElementById('dh-pair-trigger-subtitle');
  const fieldsEl = document.getElementById('dh-pair-trigger-fields');
  const bytesEl = document.getElementById('dh-pair-trigger-bytes');
  if (titleEl) titleEl.textContent = '触发 0x' + cmdId.toString(16).padStart(2, '0').toUpperCase() + ' ' + cmd.name;
  if (subtitleEl) {
    const fieldDescs = cmd.dataFields.map(f => {
      const h = NS._FIELD_HINT[f];
      return h ? `${h.label} (${h.unit})` : f;
    });
    subtitleEl.textContent = '字段 · ' + fieldDescs.join(' / ');
  }

  // 字段输入框 (数字 stepper)
  fieldsEl.innerHTML = '';
  cmd.dataFields.forEach(f => {
    const h = NS._FIELD_HINT[f] || { label: f, unit: '', min: 0, max: 100, step: 0.1 };
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
      <span class="field-label">${NS.escapeHtml(h.label)}</span>
      <input class="compact-input field-input" type="number" data-field="${f}"
             min="${h.min}" max="${h.max}" step="${h.step}" value="${userSet[f]}">
      <span class="field-unit">${NS.escapeHtml(h.unit)}</span>
    `;
    fieldsEl.appendChild(row);
  });

  // 实时字节预览
  const updatePreview = () => {
    fieldsEl.querySelectorAll('input[data-field]').forEach(input => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) userSet[input.dataset.field] = v;
    });
    const cmdWithInput = {
      ...cmd,
      dataFieldsValues: { ...NS.currentVals, ...userSet }
    };
    const frame = NS.buildFrame(proto, cmdWithInput);
    if (frame.error) {
      bytesEl.textContent = '错误: ' + frame.error;
      bytesEl.style.color = 'var(--danger)';
    } else {
      bytesEl.textContent = frame.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      bytesEl.style.color = '';
    }
  };
  fieldsEl.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener('input', updatePreview);
  });
  updatePreview();

  // 显示 modal
  const backdrop = document.getElementById('dh-pair-trigger-backdrop');
  const modal = document.getElementById('dh-pair-trigger-modal');
  if (backdrop) backdrop.hidden = false;
  if (modal) modal.hidden = false;
  // 暂不接发送 (Task 5), 触发按钮只 toast 占位
  const confirmBtn = document.getElementById('dh-pair-trigger-confirm-btn');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      NS.toast('触发逻辑将在 Task 5 实施', 'info');
    };
  }
  // 关闭按钮 (× + 取消) 隐藏 modal
  modal.querySelectorAll('[data-close="dh-pair-trigger"]').forEach(btn => {
    btn.onclick = () => {
      if (backdrop) backdrop.hidden = true;
      if (modal) modal.hidden = true;
    };
  });
  // backdrop 点击关闭
  if (backdrop) {
    backdrop.onclick = () => {
      if (backdrop) backdrop.hidden = true;
      if (modal) modal.hidden = true;
    };
  }
};
```

### Step 4.4: ↗ 按钮 handler 改调 openPairTriggerModal

打开 `SerialCube.html:9629` (现状 trigger handler):
```js
else if (act === 'trigger') NS.toast('触发 ' + c.title + ' (v4.4 占位)', 'info');
```

改为:
```js
else if (act === 'trigger') NS.openPairTriggerModal(c.cmd, c);
```

### Step 4.5: 验证 modal 行为

刷新页面,点 c9 / c10 / c11 / c12 的 ↗ 按钮:

| 卡片 | 期望行为 |
|---|---|
| c9 (charge pair) | 弹 modal 标题 "触发 0x10 Control Charge",2 字段 (充电电压/电流) |
| c10 (charge trend) | 弹 modal 标题 "触发 0x10 Control Charge"(同 cmd,共用 modal) |
| c11 (discharge pair) | 弹 modal 标题 "触发 0x11 Control Disch",1 字段 (放电电压) |
| c12 (discharge trend) | 同 c11 |

**verify**:
- [ ] 4 个 ↗ 按钮都能弹 modal
- [ ] 字段 stepper 初始值 = currentVals 现有值
- [ ] 改 stepper 值 → 字节预览实时变
- [ ] 改 56.0 → 56.5:字节预览从 `02 30` 变 `02 39`(0x0230=560, 0x0239=569)
- [ ] 取消 / × / 点击 backdrop 都能关闭 modal
- [ ] 点"触发"按钮 → 弹 toast "触发逻辑将在 Task 5 实施"(占位)

### Step 4.6: 回归

- [ ] c1-c8 卡片值不变
- [ ] c9/c10 初始 56.0 不变
- [ ] 协议编辑器 验证 按钮行为不变
- [ ] 现有 5 个 modals (协议编辑器/命令管理/卡片配置/卡片编辑/导入导出) 行为不变

### Step 4.7: Commit

```bash
git add SerialCube.html
git commit -m "feat(v4.9.4): 弹 modal 输 SET + 实时字节预览 + ↗ 按钮改造

背景:
- 现状 ↗ 按钮 handler 'NS.toast(触发 xxx (v4.4 占位))' 完全不发字节
- 弹 modal 输 SET 是 sub-3 UX 入口 (Q1 决策)
- modal 共用 0x10/0x11, 数据驱动 (0x10=2 字段, 0x11=1 字段)

范围:
- 加 dh-pair-trigger-backdrop / dh-pair-trigger-modal DOM (antd 风格, 跟现有 5 个 modals 一致)
- 加 modal CSS (字段行 / 数字 stepper / 字节预览框)
- 加 NS.openPairTriggerModal(cmdId, sourceCard):
  - 同 cmd 互斥检查 (Q8: NS.txPendingCmds.has)
  - 弹 modal 标题/字段/字节预览
  - 数字 stepper 实时预览 buildFrame
  - 取消/×/backdrop 都能关闭
  - 触发按钮占位 toast (Task 5 才接真发送)
- ↗ 按钮 handler 改调 openPairTriggerModal (line 9629)

验证 (手测):
- c9/c10/c11/c12 ↗ 都能弹 modal
- 字段 stepper 初始值 = currentVals
- 改 stepper → 字节预览实时变 (如 56.0→56.5: 02 30→02 39)
- 取消 / × / backdrop 都能关闭
- 触发按钮占位 toast
- 回归: c1-c8 不变, c9/c10 初始 56.0 不变, 现有 5 个 modals 行为不变
- AGENTS.md 数据兼容性 5 条不动"
```

---

## Task 5: v4.9.5 真实发送 + Mock ack 模拟

**Files:**
- Modify: `SerialCube.html` (完善 `NS.openPairTriggerModal`,接 buildFrame + sendPayload + waiter + Mock 模拟)
- Modify: `SerialCube.html` (加 ↗ 按钮 PENDING 状态渲染)
- Modify: `SerialCube.html` (加 `.card-action.is-loading` CSS)

**Interfaces:**
- Consumes:
  - `NS.buildFrame` (v4.8a)
  - `sendPayload` (line 13067,现有)
  - `NS.txAckWaiters` (Task 3)
  - `NS._triggerAckHandler` (Task 3)
  - `state.settings.pairTriggerTimeout` (Task 6 加,默认 3000)
  - `state.serial.connected` (判断 mock vs 真串口)
- Produces: 完整的 `openPairTriggerModal` 主流程(含发送 + 等 ack + 状态机)

**验收清单**:
- [ ] 触发 0x10 → modal 输 56.5V → 确认 → 30ms 内 c9 SET 显示 56.5
- [ ] c9 sparkline 加新点
- [ ] c10 显示 56.5
- [ ] modal 期间再点 c9 ↗(同 cmd)→ 灰按钮 + "请等待上次响应" warn toast
- [ ] modal 期间点 c11 ↗(跨 cmd)→ 正常弹新 modal
- [ ] 改 timeout=1000ms + `NS._mockAckDisabled = true` → 1s 后错误 toast "0x10 未收到响应 (1000ms)" + 卡片不变
- [ ] ack 成功后:↗ 恢复 + 成功 toast "0x10 ack 收到 ✓" + 卡片刷新
- [ ] ack 失败 / timeout:↗ 恢复 + 错误 toast + 卡片不变

### Step 5.1: 改 NS.openPairTriggerModal 为主流程(发 + 等)

打开 `SerialCube.html`,找到 Task 4.3 加的 `NS.openPairTriggerModal` 函数。**整体替换**为:

```js
// v4.9.5: 弹 modal - 输 SET + 实时字节预览 + 触发发送 + 等 ack
NS.openPairTriggerModal = async function (cmdId, sourceCard) {
  const cmd = NS.COMMANDS.find(c => c.id === cmdId);
  if (!cmd) return;
  const proto = NS.PROTOCOLS.find(p => p.id === cmd.protocol);
  if (!proto) return;

  // 同 cmd 互斥检查 (Q8 决策)
  if (NS.txPendingCmds.has(cmdId)) {
    NS.toast('请等待上次响应 (cmd 0x' + cmdId.toString(16).padStart(2, '0').toUpperCase() + ')', 'warn');
    return;
  }

  // 临时 userSet (modal 内编辑, 不写 currentVals)
  const userSet = {};
  cmd.dataFields.forEach(f => {
    userSet[f] = NS.currentVals[f] != null ? NS.currentVals[f] : 0;
  });

  // 渲染标题 + 字段
  const titleEl = document.getElementById('dh-pair-trigger-title');
  const subtitleEl = document.getElementById('dh-pair-trigger-subtitle');
  const fieldsEl = document.getElementById('dh-pair-trigger-fields');
  const bytesEl = document.getElementById('dh-pair-trigger-bytes');
  if (titleEl) titleEl.textContent = '触发 0x' + cmdId.toString(16).padStart(2, '0').toUpperCase() + ' ' + cmd.name;
  if (subtitleEl) {
    const fieldDescs = cmd.dataFields.map(f => {
      const h = NS._FIELD_HINT[f];
      return h ? `${h.label} (${h.unit})` : f;
    });
    subtitleEl.textContent = '字段 · ' + fieldDescs.join(' / ');
  }

  // 字段输入框 (数字 stepper)
  fieldsEl.innerHTML = '';
  cmd.dataFields.forEach(f => {
    const h = NS._FIELD_HINT[f] || { label: f, unit: '', min: 0, max: 100, step: 0.1 };
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
      <span class="field-label">${NS.escapeHtml(h.label)}</span>
      <input class="compact-input field-input" type="number" data-field="${f}"
             min="${h.min}" max="${h.max}" step="${h.step}" value="${userSet[f]}">
      <span class="field-unit">${NS.escapeHtml(h.unit)}</span>
    `;
    fieldsEl.appendChild(row);
  });

  // 实时字节预览
  const updatePreview = () => {
    fieldsEl.querySelectorAll('input[data-field]').forEach(input => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) userSet[input.dataset.field] = v;
    });
    const cmdWithInput = {
      ...cmd,
      dataFieldsValues: { ...NS.currentVals, ...userSet }
    };
    const frame = NS.buildFrame(proto, cmdWithInput);
    if (frame.error) {
      bytesEl.textContent = '错误: ' + frame.error;
      bytesEl.style.color = 'var(--danger)';
    } else {
      bytesEl.textContent = frame.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      bytesEl.style.color = '';
    }
  };
  fieldsEl.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener('input', updatePreview);
  });
  updatePreview();

  // 显示 modal
  const backdrop = document.getElementById('dh-pair-trigger-backdrop');
  const modal = document.getElementById('dh-pair-trigger-modal');
  if (backdrop) backdrop.hidden = false;
  if (modal) modal.hidden = false;

  // 关闭 modal 工具函数
  const closeModal = () => {
    if (backdrop) backdrop.hidden = true;
    if (modal) modal.hidden = true;
  };

  // 取消 / × / backdrop 关闭 (不发送)
  modal.querySelectorAll('[data-close="dh-pair-trigger"]').forEach(btn => {
    btn.onclick = closeModal;
  });
  if (backdrop) backdrop.onclick = closeModal;

  // 触发按钮 - 真正发送
  const confirmBtn = document.getElementById('dh-pair-trigger-confirm-btn');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      // 1. 校验输入
      let valid = true;
      fieldsEl.querySelectorAll('input[data-field]').forEach(input => {
        const v = parseFloat(input.value);
        if (isNaN(v)) { valid = false; input.classList.add('error'); }
        else { input.classList.remove('error'); userSet[input.dataset.field] = v; }
      });
      if (!valid) {
        NS.toast('输入有误', 'danger');
        return;
      }

      // 2. buildFrame
      const cmdWithInput = {
        ...cmd,
        dataFieldsValues: { ...NS.currentVals, ...userSet }
      };
      const frame = NS.buildFrame(proto, cmdWithInput);
      if (frame.error) {
        NS.toast('协议错误: ' + frame.error, 'danger', 4000);
        return;
      }

      // 3. 关闭 modal
      closeModal();

      // 4. 推 waiter
      const ackCmdId = cmd.expectResponse;
      const timeoutMs = (state.settings && state.settings.pairTriggerTimeout) || 3000;
      let ackResolve, ackReject;
      const ackPromise = new Promise((resolve, reject) => {
        ackResolve = resolve;
        ackReject = reject;
      });
      const timeoutId = setTimeout(() => {
        if (NS.txAckWaiters.has(ackCmdId)) {
          NS.txAckWaiters.delete(ackCmdId);
          ackReject(new Error('TIMEOUT'));
        }
      }, timeoutMs);
      NS.txAckWaiters.set(ackCmdId, {
        resolve: ackResolve, reject: ackReject, timeoutId,
        triggerCmdId: cmdId, ts: Date.now()
      });

      // 5. 标记 pending + toast
      NS.txPendingCmds.add(cmdId);
      NS.renderKpiCards();
      NS.toast(
        `已发送 0x${cmdId.toString(16).padStart(2, '0').toUpperCase()} (${frame.bytes.length}B), 等待设备 ack…`,
        'info', 0
      );

      // 6. 发
      const sendOk = await sendPayload(frame.bytes, 'pair-trigger');
      if (!sendOk) {
        NS.txAckWaiters.delete(ackCmdId);
        clearTimeout(timeoutId);
        NS.txPendingCmds.delete(cmdId);
        NS.renderKpiCards();
        return;
      }

      // 7. Mock 模式: 30ms 后模拟设备回 ack (Q5 决策)
      if (!state.serial.connected && !NS._mockAckDisabled) {
        setTimeout(() => {
          // 用 userSet 生成 ack bytes (临时改 currentVals + buildFrame + 还原)
          const saved = { ...NS.currentVals };
          Object.assign(NS.currentVals, userSet);
          const ackCmd = NS.COMMANDS.find(c => c.id === ackCmdId);
          const ackFrame = NS.buildFrame(proto, ackCmd);
          Object.keys(saved).forEach(k => NS.currentVals[k] = saved[k]);
          NS._triggerAckHandler(ackCmdId, ackFrame.bytes);
        }, 30);
      }

      // 8. 等 ack / timeout
      try {
        await ackPromise;
        NS.toast(
          `0x${cmdId.toString(16).padStart(2, '0').toUpperCase()} ack 收到 ✓`,
          'success', 2000
        );
      } catch (e) {
        NS.toast(
          `0x${cmdId.toString(16).padStart(2, '0').toUpperCase()} 未收到响应 (timeout ${timeoutMs}ms)`,
          'danger', 4000
        );
      } finally {
        NS.txPendingCmds.delete(cmdId);
        NS.renderKpiCards();
      }
    };
  }
};
```

### Step 5.2: 加 ↗ 按钮 PENDING 状态渲染

打开 `SerialCube.html`,找到 c9 / c10 / c11 / c12 的 ↗ 按钮渲染代码(在 `renderCard` 之类函数,约 line 9570-9603 附近)。找到 `data-action="trigger"` 按钮模板,加 PENDING 状态:

```js
// 现状 (line 9601 附近):
'<button class="card-action ' + (c.fromOtherCmd ? 'disabled' : '') + '" ' + (c.fromOtherCmd ? 'disabled title="RX-only, 不可写入"' : 'title="触发" data-action="trigger"') + '>' + (c.fromOtherCmd ? '🔒' : '↗') + '</button>'

// 改后:
const isPending = NS.txPendingCmds && NS.txPendingCmds.has(c.cmd);
'<button class="card-action ' + (c.fromOtherCmd ? 'disabled' : '') + (isPending ? ' is-loading' : '') + '" ' + (c.fromOtherCmd ? 'disabled title="RX-only, 不可写入"' : (isPending ? 'disabled title="等待响应中..."' : 'title="触发" data-action="trigger"')) + '>' + (c.fromOtherCmd ? '🔒' : '↗') + '</button>'
```

**verify**:刷新页面,点 c9 ↗ → 触发后,↗ 按钮立即变灰 + 加 `is-loading` class

### Step 5.3: 加 .is-loading CSS

打开 `SerialCube.html`,找到现有 `.card-action` 样式(约 line 2000-3000 之间),加:

```css
.card-action.is-loading {
  animation: spin 0.8s linear infinite;
  opacity: 0.5;
  cursor: not-allowed;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**verify**:触发时 ↗ 按钮旋转动画

### Step 5.4: 加数字 stepper 错误态 CSS

打开 `SerialCube.html`,modal CSS 区域(Step 4.2 加的附近)加:

```css
#dh-pair-trigger-fields input.error {
  border-color: var(--danger);
  background: rgba(220, 38, 38, 0.05);
}
```

### Step 5.5: 验证主流程

刷新页面,触发 0x10:

| 步骤 | 期望行为 |
|---|---|
| 1. 点 c9 ↗ | 弹 modal 标题 "触发 0x10 Control Charge" |
| 2. 改 charge_v_set 56.0 → 56.5 | 字节预览从 `... 02 30 ...` 变 `... 02 39 ...` |
| 3. 点触发 | modal 关闭,↗ 灰 + 顶部 "已发送 0x10 (12B), 等待 ack" |
| 4. 30ms 后 | ↗ 恢复,成功 toast "0x10 ack 收到 ✓" + c9 SET 显示 568(0x0238) + c10 显示 568 + sparkline 加新点 |
| 5. 改 charge_v_set 70 (超界 max=60) | 字节预览 OK (buildFrame 不校验范围,看后续) → 触发 → c9 显示 700 |

**注意**:sub-3 暂不做 input 范围校验(留后续)。如果需要,在 Step 5.1 校验块加范围检查。

### Step 5.6: 验证同 cmd 互斥 + 跨 cmd 独立

| 场景 | 期望 |
|---|---|
| 触发 0x10 后立刻再点 c9 ↗ (同 cmd) | 灰按钮 + "请等待上次响应" warn toast |
| 触发 0x10 modal 中点 c11 ↗ (跨 cmd) | 正常弹 c11 modal |

### Step 5.7: 验证 timeout 路径

```js
// DevTools 准备
NS._mockAckDisabled = true;
state.settings.pairTriggerTimeout = 1000;
```

| 步骤 | 期望 |
|---|---|
| 1. 触发 0x10 | ↗ 灰 + "已发送 0x10 ..." |
| 2. 1s 后 | ↗ 恢复 + 错误 toast "0x10 未收到响应 (1000ms)" + 卡片不变 |

**还原**:
```js
NS._mockAckDisabled = false;
state.settings.pairTriggerTimeout = 3000;
```

### Step 5.8: 回归

- [ ] c1-c8 卡片值不变
- [ ] c9/c10 初始 56.0 不变
- [ ] 协议编辑器 验证 按钮行为不变
- [ ] 现有 5 个 modals 行为不变

### Step 5.9: Commit

```bash
git add SerialCube.html
git commit -m "feat(v4.9.5): pair trigger 真实发送 + Mock ack 模拟 + 状态机

背景:
- v4.9.4 加了 modal 入口, 但还没接发送
- 触发 0x10/0x11 后需真发, 设备回 0x90/0x91 才更新 SET
- Mock 模式 (未接真串口) 需模拟设备回 ack 让走通

范围:
- 完善 NS.openPairTriggerModal 主流程:
  - 同 cmd 互斥 (NS.txPendingCmds.has 检查)
  - buildFrame 校验 (错误 → toast)
  - 推 waiter (NS.txAckWaiters.set)
  - txPendingCmds.add + 锁按钮 + '已发送 0x10 (12B)' toast
  - sendPayload 发
  - Mock 模式 setTimeout(30ms) 模拟设备回 ack (Q5 决策)
  - 等 ack / timeout
  - finally 块清 pending + 重新渲染按钮
- ↗ 按钮加 is-loading class (PENDING 状态), CSS spin 动画
- 数字 stepper 加 .error 错误态 (输入 NaN)
- 错误 toast: '0x10 未收到响应 (timeout 1000ms)' / '协议错误: X' / '发送失败'
- 成功 toast: '0x10 ack 收到 ✓'
- 等待中 toast: 'info, 不自动消失'

验证 (手测):
- 触发 0x10 → 30ms 内 c9 SET 变 568 + sparkline 加点
- 同 cmd 互斥: modal 期间点 c9 ↗ 灰按钮 + warn toast
- 跨 cmd 独立: 0x10 modal 中可点 0x11
- timeout: NS._mockAckDisabled=true + timeout=1000 → 1s 后错误 toast
- 回归: c1-c8 不变, c9/c10 初始 56.0 不变, 5 个 modals 不变
- AGENTS.md 数据兼容性 5 条不动"
```

---

## Task 6: v4.9.6 c11/c12 + settings + RX 接入

**Files:**
- Modify: `SerialCube.html:9396-9407` (NS.CARDS 加 c11 / c12)
- Modify: `SerialCube.html:9545-9583` (pair 渲染加 discharge_v 分支)
- Modify: `SerialCube.html:7752-7758` (settings 加 pairTriggerTimeout)
- Modify: `SerialCube.html:17993-17997` (buildLocalPrefsSnapshot 加新字段)
- Modify: `SerialCube.html` 系统菜单 (找现状 settings UI 入口) — 加 "Pair trigger 超时" 配置
- Modify: `SerialCube.html` 串口子系统的 RX 字节流 — 找现状 RX 入口,挂 `_triggerAckHandler`(30 分钟探查预算,找不到留 v4.8.x+)

**Interfaces:**
- Consumes: 现有 `NS.CARDS` / `NS.settings` / `NS.buildLocalPrefsSnapshot` / `state.serial` 的 RX 路径
- Produces:
  - `NS.CARDS` 数组新增 c11 / c12
  - `state.settings.pairTriggerTimeout` 字段
  - pair 卡 discharge_v 渲染分支
  - 真串口 RX 0x90/0x91 识别(若 30 分钟内找到入口)

**验收清单**(全 spec DoD):
- [ ] c11 / c12 在 dashboard 显示,初始 0
- [ ] 系统菜单有 "Pair trigger 超时" 配置,默认 3000,范围 1000-10000
- [ ] 改 timeout 立即生效(下次触发用新值)
- [ ] 触发 0x11 → c11/c12 显示新值
- [ ] 触发 0x10 → c9/c10 显示新值
- [ ] 系统菜单配置持久化(刷新后保留)
- [ ] com50/com51 真串口自测:触发 0x10 → com51 脚本收到字节(若 RX 接入生效,dashboard 卡片也更新)
- [ ] 旧 user config 加载不报错
- [ ] v4.8a 协议编辑器 验证 按钮行为不变
- [ ] AGENTS.md 数据兼容性 5 条全部遵守
- [ ] HANDOFF.md 更新到 v4.9

### Step 6.1: NS.CARDS 加 c11 / c12

打开 `SerialCube.html:9396-9407`,在 c10 之后加:

```js
{ id: 'c11', type: 'pair',  cmd: 0x11, dir: 'tx', pairId: 'discharge_v', title: '放电电压', unit: 'V', fromOtherCmd: false },
{ id: 'c12', type: 'trend', cmd: 0x11, dir: 'tx', field: 'discharge_v_set', title: '放电设定', unit: 'V', range: [0, 60], precision: 1, fromOtherCmd: false }
```

**verify**:刷新页面,dashboard 显示 12 张卡(原 10 + c11 + c12),c11 显示 0 V SET / 0 V ACT,c12 显示 0

### Step 6.2: pair 卡渲染加 discharge_v 分支

打开 `SerialCube.html:9545-9583`,在 `if (c.pairId === 'charge_v')` 块之后加:

```js
} else if (c.pairId === 'discharge_v') {
  set = NS.currentVals.discharge_v_set != null ? NS.currentVals.discharge_v_set : 0;
  act = (NS.currentVals.pack_v_avg != null ? NS.currentVals.pack_v_avg : 0) * 15;  // 4 cell 串联总电压
}
```

**verify**:触发 0x11 输 48.0V → c11 SET 显示 480 + ACT 显示 ~55.7(pack_v_avg * 15)+ c12 显示 480

### Step 6.3: settings 加 pairTriggerTimeout

打开 `SerialCube.html:7752-7758` 附近(state.settings 初始值),加:

```js
state.settings = {
  // ... 现有字段 ...
  pairTriggerTimeout: 3000,  // v4.9.6: 默认 3 秒, 范围 1000-10000
  // ... 现有字段 ...
};
```

**verify**:DevTools:
```js
state.settings.pairTriggerTimeout
// 期望: 3000
```

### Step 6.4: buildLocalPrefsSnapshot 加新字段

打开 `SerialCube.html:17993-17997` 附近(搜 `buildLocalPrefsSnapshot` 函数,加 `pairTriggerTimeout` 序列化):

```js
// 改后 (在 snapshot 对象里加)
pairTriggerTimeout: (state.settings.pairTriggerTimeout || 3000),
```

并在加载 snapshot 时(搜 `applyLocalPrefsSnapshot` 或 `if (uc.settings.pairTriggerTimeout)`):
```js
if (uc.settings.pairTriggerTimeout != null) {
  state.settings.pairTriggerTimeout = uc.settings.pairTriggerTimeout;
}
```

**verify**:DevTools 设 `state.settings.pairTriggerTimeout = 5000` → 触发 localStorage 保存 → 刷新页面 → 值恢复 5000

### Step 6.5: 系统菜单加 "Pair trigger 超时" 配置入口

打开 `SerialCube.html`,找到系统菜单的 settings UI 渲染(搜 `state.settings.pairTriggerTimeout` 引用)。在合适位置加 stepper / slider 控件(具体位置看现状,可能用现有的"系统偏好"区域):

```html
<!-- 系统菜单 → 调试/高级 分组 -->
<div class="settings-row">
  <label>Pair trigger 超时 (ms)</label>
  <input type="number" id="dh-settings-pair-trigger-timeout" min="1000" max="10000" step="500" value="${state.settings.pairTriggerTimeout || 3000}">
</div>
```

JS 绑定(在系统菜单初始化代码里):
```js
const timeoutInput = document.getElementById('dh-settings-pair-trigger-timeout');
if (timeoutInput) {
  timeoutInput.addEventListener('change', () => {
    const v = parseInt(timeoutInput.value, 10);
    if (v >= 1000 && v <= 10000) {
      state.settings.pairTriggerTimeout = v;
      // 触发 localStorage 保存 (走现有 buildLocalPrefsSnapshot 机制)
      saveLocalPrefs && saveLocalPrefs();
    } else {
      NS.toast('范围 1000-10000 ms', 'warn');
      timeoutInput.value = state.settings.pairTriggerTimeout || 3000;
    }
  });
}
```

**verify**:打开系统菜单 → 看到 "Pair trigger 超时" 输入框 → 改 1000 → 关闭 → 触发 0x10 → 1s 后错误 toast(timeout 生效)

### Step 6.6: 真串口 RX 接入(30 分钟探查预算)

**目标**:真串口接 com50 时,com51 脚本回 0x90 bytes → dashboard 卡片更新。

**实施步骤**:
1. **搜 RX 入口**(10 分钟):
   - 搜 `state.serial.reader` / `state.serial.onRx` / `processRxBuffer` / `state.serial.onRxBytes` / dashboard `start` 函数
   - 找 dashboard 模式是否已订阅 RX 字节流
2. **找到入口**(10 分钟挂 hook):
   ```js
   // 在 dashboard 启动时, 接管 RX 字节流 (只识别 0x90/0x91)
   if (state.serial.reader) {
     // 实际 RX 接管 (看现状 API 决定怎么挂)
     // 例子 (按实际 API 调整):
     const origOnChunk = state.serial.onChunk;
     state.serial.onChunk = (bytes) => {
       if (bytes && bytes[1] != null && (bytes[1] === 0x90 || bytes[1] === 0x91)) {
         NS._triggerAckHandler(bytes[1], bytes);
       }
       if (origOnChunk) origOnChunk(bytes);
     };
   }
   ```
3. **找不到入口**(留 v4.8.x+):
   - 加 TODO 注释 + console.warn: `[pair-trigger] dashboard RX 接入未实施, 真串口触发在 dashboard 模式仅做 TX 字节发`
   - sub-3 仅 mock 模式生效

**verify**(若找到入口):
1. 连 com50 → 触发 0x10
2. com51 脚本捕获字节
3. com51 脚本回 0x90 bytes
4. dashboard c9/c10 卡片更新

**verify**(若找不到):
1. 连 com50 → 触发 0x10
2. console 看到 `[pair-trigger] dashboard RX 接入未实施`
3. dashboard c9/c10 卡片不变(只 mock 模式生效)

### Step 6.7: 更新 HANDOFF.md

打开 `D:\WorkSpace\SerialCubeWeb\HANDOFF.md`,更新 v4.8 描述到 v4.9,加上 sub-3 完成状态 + 浏览器 smoke test 清单 + 后续 sub 候选。

### Step 6.8: 完整回归测试(spec §8 全部)

**回归保护**(spec §8.1):
- [ ] c1-c8 卡片值跟 v4.8 一致
- [ ] c9 / c10 初始 56.0
- [ ] 协议编辑器 CMD 列表 "data N bytes" 自动算
- [ ] 添加命令表单 "自动算 N bytes"
- [ ] 0x90 / 0x91 在 cmd 列表

**新功能 mock 模式**(spec §8.2):
- [ ] 触发 0x10 → c9/c10 显示新值
- [ ] 同 cmd 互斥
- [ ] 跨 cmd 独立
- [ ] timeout 路径

**c11/c12**(spec §8.3):
- [ ] c11 / c12 初始 0
- [ ] 触发 0x11 → c11/c12 显示新值

**真串口**(spec §8.4,有 com50/com51):
- [ ] com50 → com51 捕获字节
- [ ] console 看到 TX bytes

**数据兼容性**(spec §8.5):
- [ ] 旧 user config 加载
- [ ] AGENTS.md 5 条

**v4.8a 行为**(spec §8.6):
- [ ] 协议编辑器 验证 按钮
- [ ] 8 个 _buildFrameXxx

### Step 6.9: Commit + Push

```bash
git add SerialCube.html HANDOFF.md
git commit -m "feat(v4.9.6): c11/c12 discharge 卡片 + pairTriggerTimeout settings + 真串口 RX 接入

背景:
- v4.9.5 完成 0x10 真实发送, 但 0x11 没 UI 入口
- timeout 硬编码 3000ms, 真设备响应时间差异大需可配
- 真串口模式触发需 dashboard RX 接入才能完整生效

范围:
- NS.CARDS 加 c11 (discharge pair) + c12 (discharge trend)
- pair 渲染加 discharge_v 分支 (act 仍用 pack_v_avg*15)
- state.settings.pairTriggerTimeout: 默认 3000, 范围 1000-10000
- buildLocalPrefsSnapshot 持久化新字段
- 系统菜单加 'Pair trigger 超时' 配置入口 (数字 stepper)
- RX 接入: 30 分钟探查 budget, 找到入口挂 _triggerAckHandler
  (cmd byte == 0x90/0x91), 找不到留 v4.8.x+ + console.warn
- HANDOFF.md 更新到 v4.9

验证 (spec §8 全跑):
- 回归: c1-c8 不变, c9/c10 初始 56.0, 协议编辑器 验证 按钮行为不变
- 新功能: 触发 0x10/0x11 → c9/c10/c11/c12 显示新值
- 互斥: 同 cmd 互斥, 跨 cmd 独立
- timeout: 可配 1000-10000ms, 立即生效
- 真串口: com50/com51 自测 (若 RX 接入生效)
- 数据兼容: 旧 user config 加载, AGENTS.md 5 条全守
- AGENTS.md 数据兼容性 5 条不动"
```

---

## Self-Review (Plan ↔ Spec 对照)

### 1. Spec coverage(每节是否都有 task 覆盖?)

| Spec 节 | 对应 Task | 备注 |
|---|---|---|
| §1.1 背景 | (无 task,描述性) | ✓ |
| §1.2 目标(3 件) | Task 1-6 全覆盖 | ✓ |
| §1.3 非目标(8 项) | 不动,留后续 | ✓ |
| §1.4 自测环境 | Task 6.6 真串口 RX 接入 | ✓ |
| §1.5 回归保护 | Task 1.6 / 2.5 / 3.7 / 4.6 / 5.8 / 6.8 各自回归 | ✓ |
| §2 决策摘要(8 个) | Task 1-6 全部采纳 | ✓ |
| §3 dataSize 自动算 | Task 1 | ✓ |
| §4.1 总体流程 | Task 4 + 5 | ✓ |
| §4.3 触发入口 | Task 4.4 | ✓ |
| §4.4 Modal 形态 | Task 4.1-4.3 | ✓ |
| §4.5 确认后发送 | Task 5.1 | ✓ |
| §4.6 数据模型改动 | Task 2 | ✓ |
| §4.7 settings | Task 6.3-6.5 | ✓ |
| §5.1 triggerAckHandler | Task 3.5 | ✓ |
| §5.2 Mock 模式 ack 模拟 | Task 5.1 step 7 | ✓ |
| §5.3 RX 接入 | Task 6.6 | ✓ |
| §6.1 c11/c12 | Task 6.1 | ✓ |
| §6.2 pair 渲染 | Task 6.2 | ✓ |
| §6.4 状态机 | Task 5.1 + 5.2 | ✓ |
| §6.5 toast 详细 | Task 5.1 (info 不自动消失, success 2s, warn 3s, danger 4s) | ✓ |
| §6.6 ↗ 按钮状态 | Task 5.2-5.3 | ✓ |
| §6.7 数字 stepper 校验 | Task 5.1 step 1 (NaN 校验;范围校验 sub-X) | ✓ |
| §7 拆 commit 6 个 | Task 1-6 严格对应 | ✓ |
| §8 验证清单 | 每个 Task 验收 + Task 6.8 完整 spec §8 | ✓ |
| §9 风险 | (实施时注意) | ✓ |
| §10 DoD 19 项 | Task 6.8 + 各 Task 验收 | ✓ |
| §11 时间估计 4-4.5h | (参考) | ✓ |

**gap 检查**:
- spec §4.5 "modal 关闭事件 force-release waiter"(风险表) → Task 5.1 关闭 modal 只在发送前 / 取消时;发送后 modal 已关闭,waiter 由 ack / timeout 处理。**没显式 force-release**。补充:在 Task 5.1 modal 显示期间如果用户按 × 或 backdrop,加 force-release 逻辑(可选,Task 5.8 验收加这条)

### 2. Placeholder scan

无 "TBD" / "TODO" / "implement later" / "fill in details"。所有 step 都有具体代码、文件、行号、命令、验证。

**允许的"找"用法**:
- "搜 X"(找代码位置,具体行动)
- "找现状 RX 入口"(Task 6.6,30 分钟 budget 明确)
- "实施时检查"(具体不明确时,留 brief 决策点)

### 3. Type / API consistency

跨 task 名字一致性:
- `NS._FIELD_BYTE_SIZE` ✓ (Task 1.1 → 3.1-3.3 用)
- `NS.computeDataSize` ✓ (Task 1.2 → 1.3-1.4 用)
- `NS._FIELD_HINT` ✓ (Task 3.1 → 4.3 / 5.1 用)
- `NS._mockAckDisabled` ✓ (Task 3.1 → 5.7 用)
- `NS._bytesToNumber` ✓ (Task 3.2 → 3.3 用)
- `NS._parseAckFields` ✓ (Task 3.3 → 3.5 用)
- `NS.txPendingCmds` (Set) ✓ (Task 3.4 → 4.3 / 5.1 / 5.2 用)
- `NS.txAckWaiters` (Map) ✓ (Task 3.4 → 5.1 用)
- `NS._triggerAckHandler` ✓ (Task 3.5 → 5.1 / 6.6 用)
- `NS.openPairTriggerModal` ✓ (Task 4.3 → 4.4 调 / 5.1 替换)
- `state.settings.pairTriggerTimeout` ✓ (Task 6.3 → 6.4-6.5 / 5.1 step 4 用)
- `cmd.expectResponse` (0x10 → 0x90, 0x11 → 0x91) ✓ (Task 2.1 → 5.1 step 4 用)

无冲突。

### 4. 行号引用

基于 review 时的现状 (2026-08-04 11:58):
- line 9384 / 9385-9390 / 9396-9407: ✓ 已 grep 确认
- line 9437-9442 / 9468-9470: ✓ 已 grep 确认
- line 9629: ✓ 已 grep 确认
- line 11397: ✓ 已 grep 确认
- line 13067-13080: ✓ 已 grep 确认
- line 9545-9583: ✓ 已 grep 确认
- line 7154-7250: ✓ 已 grep 确认
- line 7752-7758 / 17993-17997: 估算,实施时如不准搜变量名定位

---

## 执行选择(等你决定)

Plan 写完并 self-review 完。接下来执行方式二选一:

**1. Subagent-Driven (推荐)**:
- 我为每个 Task 派 1 个 fresh subagent(general 或 coder)
- Task 间我做两阶段 review(代码 review + 行为 review)
- Fast iteration,每个 Task 独立 review gate
- 适合:多 commit 串行实施 + 严格 review

**2. Inline Execution**:
- 我在本 session 内批量执行 Task 1-6
- 关键节点(checkpoint)由你 review
- 不切换 context,实施快
- 适合:连续 commit 不太需要 review gate,信任度高

**哪个?** 你的偏好?
