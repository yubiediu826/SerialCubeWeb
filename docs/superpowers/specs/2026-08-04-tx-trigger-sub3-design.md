# v4.9 TX Trigger Sub-3: cmd 字段映射重构 + Pair Trigger 真实发送

**日期**: 2026-08-04
**作者**: yubiediu826 + Mavis
**状态**: 待 review
**范围**: v4.9 sub-3 (cmd.dataSize 自动算 + 0x10/0x11 真实串口发送 + c11/c12 新卡片)
**前置 commit**: v4.8 sub-1 (`3981f29` 12 commits, kind 0-7 + 协议编辑器验证按钮)
**后续 sub**: sub-2 (parseFrame 通用化 + 协议编辑器 UI 重构), v4.9.x+ (dashboard 串口 RX 接入)

---

## 1. Overview

### 1.1 背景

v4.7 commit message 提了 7 种 TLV 协议类型,v4.8 sub-1 (11 commits) 完成 kind 0-7 数据模型 + buildFrame dispatcher + 协议编辑器验证按钮。但 sub-1 留了 2 项未做:
- `cmd.dataSize` 硬编码,UI 需手填
- 0x10 (Control Charge) / 0x11 (Control Disch) 的 ↗ 按钮是占位 toast,不真发

HANDOFF.md (2026-08-04 10:22) 把这两项标为"sub-3"🔥 最高优先级。

现状 pair trigger (SerialCube.html line 9629):
```js
else if (act === 'trigger') NS.toast('触发 ' + c.title + ' (v4.4 占位)', 'info');
```

完全不接串口,set 字段(`charge_v_set` / `charge_i_set` / `discharge_v_set`)只在 `initMockData` 初始后永不变化(jitter 白名单跳过)。

### 1.2 目标(3 件)

1. `cmd.dataSize` 不再硬编码,按 `cmd.dataFields` + `NS.DATA_FIELDS` 自动算 (`NS.computeDataSize`)
2. c9/c10 (0x10 charge) + 新增 c11/c12 (0x11 discharge) 的 ↗ 按钮接真串口发送,设备回 0x90/0x91 后才更新 SET
3. c11/c12 (0x11 discharge pair + trend) 新增,跟 c9/c10 同等地位

### 1.3 非目标(留后续)

- parseFrame 通用化(贴字节反解析完整版):仅实现 ack 路径的简单版,完整留 sub-2
- 协议编辑器 UI 重构 (kind 下拉 + 动态 fields):留 sub-2
- dashboard 模式 RX 字节流接入(让真串口 0x90 自动进 dashboard):现状 dashboard 模式没接 RX 字节流,**sub-3 找入口,能挂就挂,不能挂留 v4.8.x+ + console 提示**
- DATA_FIELDS 加 range/unit/step 字段:modal 数字 stepper 用兜底 hint 表 (`NS._FIELD_HINT`)
- string 变长字段的 N-bytes 估算:`computeDataSize` 遇 string 返 0 + UI 报警
- TX 多设备总线 (hostId/devId 选择):留未来
- 历史回放 .timeline 打磨:留 v5
- 测试基础设施:跟现状一致手测

### 1.4 自测环境(本 spec 实施时可用)

用户确认存在虚拟串口 **com50 / com51** (Windows),可自测真串口发送路径。
- com50:SerialCube 连接 (master)
- com51:模拟设备 (用 Python/Node 脚本或 com0com 桥接)
- 验证清单可走真串口路径(虽然 dashboard 卡片数据仍来自 mock,但串口发送字节可被 com51 脚本捕获验证)

### 1.5 回归保护

- v4.8a/b 11 个 commit 行为不变 (8 个 `_buildFrameXxx` 调用链不动)
- AGENTS.md 数据兼容性 5 条全部遵守 (`localStorage` keys / `SerialWebUserConfig` v1 / `.timeline` magic / API 路径 / JS 内部命名)
- 旧 user config 100% 兼容 (`cmd.dataSize` 字段保留,加载时不读,新逻辑用 `computeDataSize`)
- 现状 mock 模式 c1-c8 卡片值不变

---

## 2. 决策摘要(8 个 brainstorming 决策)

| # | 决策 | 选择 | 理由 |
|---|---|---|---|
| 1 | UX 入口 | 弹 modal 输 SET 后发 | 流程清晰,可复用,跟现有 5 个 modals antd 风格一致 |
| 2 | 范围 | 完整 sub-3 (trigger + dataSize 自动算) | HANDOFF.md 列在一起,一次性做完 |
| 3 | 卡片范围 | 0x10/0x11 都加 UI (c11/c12 新增) | 12 张卡 (原 10 + 2 新) |
| 4 | SET 应用时机 | 设备回才应用 (严格) | 真串口语义,跟 Q5 Mock 模拟回 ack 对称 |
| 5 | Mock 行为 | 模拟设备回 ack | 让 mock 模式触发完整走通,演示/调试友好 |
| 6 | 等待 UI | 按钮 loading + 顶部 toast | 轻量,跟现状 toast 体系一致 |
| 7 | Timeout | 可配 settings.pairTriggerTimeout,默认 3000ms,范围 1000-10000 | 真设备响应时间差异大,需可调 |
| 8 | 连续触发 | 同 cmd 互斥,跨 cmd 独立 | 避免"设备未响应前再次收到 SET"副作用;支持"同时调充放电" |

---

## 3. dataSize 自动算

### 3.1 现状

`cmd.dataSize` 字段在 `NS.COMMANDS` (SerialCube.html line 9385-9390) 硬编码:
```js
{ id: 0x01, ..., dataFields: ['cell_1_v', ...], dataSize: 10, ... },
{ id: 0x10, ..., dataFields: ['charge_v_set', 'charge_i_set'], dataSize: 4, ... },
{ id: 0x11, ..., dataFields: ['discharge_v_set'], dataSize: 2, ... }
```

实际消费点 (grep 确认):
- 协议编辑器"添加命令"表单 (line 11397) `dataSize: datasize` — 用户**手填**
- 协议编辑器 CMD 列表/详情显示
- **8 个 `_buildFrameXxx` 不用**!length 字段是 `[data.length & 0xFF]` 从 `encodeDataFields` 输出动态算

也就是说"dataSize 自动算"实质只影响 **UI 层 + 1 个新工具函数**。

### 3.2 核心 API

```js
// 新增 (NS 空间)
NS._FIELD_BYTE_SIZE = { u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, float: 4, double: 8 };

NS.computeDataSize = function (cmd) {
  if (!cmd || !cmd.dataFields) return 0;
  let total = 0;
  for (const fname of cmd.dataFields) {
    const field = NS.DATA_FIELDS.find(f => f.name === fname);
    if (!field) return 0;          // 缺字段 → 0 触发 UI 报警
    const size = NS._FIELD_BYTE_SIZE[field.type] || 0;
    if (!size) return 0;           // string / 未知 type → 0 触发 UI 报警
    total += size;
  }
  return total;
};
```

### 3.3 接入点(3 处)

1. **协议编辑器"添加命令"表单** (line ~11397 附近):**删** `datasize` 输入框 → 改只读"自动算 N bytes"标签(实时调 `computeDataSize`)
2. **协议编辑器 CMD 列表/详情**:`data N bytes` 显示改用 `computeDataSize(cmd)`
3. **协议编辑器"编辑命令"**:同样用 `computeDataSize` 显示

### 3.4 `cmd.dataSize` 字段处理(兼容性)

- **不删**,保留(旧 user config 可能有,AGENTS.md 兼容约束)
- **运行时不再依赖**——所有 UI 显示 / 后续 buildFrame 都用 `computeDataSize`
- 加载时:走现有 `if (uc.commands) NS.COMMANDS = uc.commands;` (line 11235),`dataSize` 旧值原样保留
- **不强制一致检查**——保留字段但 spec/runtime 不读,自然让用户/UI 不再手填

### 3.5 类型报警策略

- DATA_FIELDS 里出现 `string` / 未知 type → `computeDataSize` 返 0
- 协议编辑器 CMD 列表显示"data: — bytes (string 变长字段)" + 红字提示

### 3.6 非目标

- 暂不实现 string 类型的 N-bytes 估算
- 暂不动 `_buildFrameXxx` length 逻辑(已经动态从 `data.length` 算,正确)

---

## 4. Pair Trigger 真实发送流程

### 4.1 总体流程

```
用户点 ↗ → 弹 modal 输 SET → 点确认
  → buildFrame(proto, cmdWithUserInput)  // 复用 v4.8a buildFrame
  → sendPayload(bytes, 'pair-trigger')   // 复用现有 sendPayload (line 13067)
  → 推 waiter 到 NS.txAckWaiters
  → 等 0x90/0x91 ack
       ├─ Mock 模式: setTimeout(30ms) 模拟设备回 0x90 → 调 _triggerAckHandler
       ├─ 真串口模式: RX 字节流识别 0x90/0x91 → 调 _triggerAckHandler
       │     (sub-3 找入口;找不到留 v4.8.x+)
       └─ timeout → 错误 toast + SET 不变 + ↗ 恢复
```

### 4.2 关键设计:不重复造轮子,parseFrame 自动更新 currentVals

- 现状 parseFrame 解析 0x80 → 更新 `currentVals.cell_1_v` 等
- 加 0x90/0x91 到 COMMANDS,parseFrame 同样解析 → 自动更新 `currentVals.charge_v_set`
- trigger 流程只负责"发 + 等",不自己写 currentVals
- 跟现状 RX 路径架构一致

但**现状 dashboard 模式没接 RX 字节流**(`initMockData` + `tickMockData` 直接 jitter 写 currentVals,不解析 RX),所以:
- Mock 模式:trigger 流程自己模拟写 currentVals (走 `_triggerAckHandler`)
- 真串口模式:trigger 流程发 bytes,但 dashboard 卡片不会自动更新(需 dashboard RX 接入,v4.8.x+)

### 4.3 触发入口(按钮改造)

现状 `else if (act === 'trigger') NS.toast('触发 ' + c.title + ' (v4.4 占位)', 'info');` (line 9629)
改为:
```js
else if (act === 'trigger') {
  if (NS.txPendingCmds.has(c.cmd)) {
    NS.toast('请等待上次响应 (cmd 0x' + c.cmd.toString(16).padStart(2, '0').toUpperCase() + ')', 'warn');
  } else {
    NS.openPairTriggerModal(c.cmd, c);
  }
}
```

按钮渲染时(`renderCard` 之类):
- 如果 `NS.txPendingCmds.has(c.cmd)` → ↗ 按钮 disabled + 加 `.is-loading` class (CSS 留 design 阶段定)

### 4.4 Modal 形态 (antd 风格,跟现有 5 个 modals 一致)

复用现有 modal DOM 模式 (`dh-proto-modal` line 7154-7175 风格):
- **backdrop + modal** 结构
- **header**:关闭按钮 × + 标题 "触发 0x10 Control Charge" + 子标题 "字段 · V / A" + spacer
- **body**:字段区 (动态生成)
- **footer**:取消 + 触发(主按钮)

字段区(数据驱动,0x10/0x11 共用):
- 遍历 `cmd.dataFields`,每个字段一个 `compact-input` 数字 stepper
- hint 查 `NS._FIELD_HINT[fname]`,兜底 `{ label: fname, unit: '', min: 0, max: 100, step: 0.1 }`
- 0x10:2 字段 (充电电压 V + 充电电流 A)
- 0x11:1 字段 (放电电压 V)
- 初始值:`NS.currentVals[fname]`

```js
NS._FIELD_HINT = {
  'charge_v_set':     { label: '充电电压', unit: 'V', min: 0, max: 60, step: 0.1 },
  'charge_i_set':     { label: '充电电流', unit: 'A', min: 0, max: 30, step: 0.1 },
  'discharge_v_set':  { label: '放电电压', unit: 'V', min: 0, max: 60, step: 0.1 }
};
```

**实时字节预览**:调 `NS.buildFrame(proto, cmdWithInput)` → 显示 hex 格式 (`AA 10 04 XX XX CRC 55`)。复用 v4.8a 协议编辑器预览能力。

**modal ID**:`dh-pair-trigger-backdrop` + `dh-pair-trigger-modal`

### 4.5 确认后发送(主流程)

```js
NS.openPairTriggerModal = async function (cmdId, sourceCard) {
  const cmd = NS.COMMANDS.find(c => c.id === cmdId);
  const proto = NS.PROTOCOLS.find(p => p.id === cmd.protocol);

  // 1. 弹 modal, 用户编辑 SET, 实时预览 buildFrame
  //    (modal 内部维护临时 userSet 对象, 不写 currentVals)
  const userSet = {};  // { charge_v_set: val1, charge_i_set: val2, ... }

  // 2. 用户点"触发"按钮 (modal 关闭, 走下面):
  const cmdWithInput = {
    ...cmd,
    dataFieldsValues: { ...NS.currentVals, ...userSet }  // 临时值, 不写 currentVals
  };
  const frame = NS.buildFrame(proto, cmdWithInput);
  if (frame.error) {
    NS.toast('协议错误: ' + frame.error, 'danger');
    return;
  }

  // 3. 推 waiter
  const ackCmdId = cmd.expectResponse;  // 0x90 / 0x91
  const timeoutMs = state.settings.pairTriggerTimeout || 3000;
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

  // 4. 标记 pending + 锁按钮 + toast
  NS.txPendingCmds.add(cmdId);
  NS.renderKpiCards();
  NS.toast(`已发送 0x${cmdId.toString(16).padStart(2,'0').toUpperCase()} (${frame.bytes.length}B), 等待设备 ack…`, 'info', 0);  // 0 = 不自动消失

  // 5. 发
  const sendOk = await sendPayload(frame.bytes, 'pair-trigger');
  if (!sendOk) {
    // 串口未连接 / sendPayload 内部 toast 已发
    NS.txAckWaiters.delete(ackCmdId);
    clearTimeout(timeoutId);
    NS.txPendingCmds.delete(cmdId);
    NS.renderKpiCards();
    return;
  }

  // 6. Mock 模式: 30ms 后模拟设备回 ack
  if (!state.serial.connected) {
    setTimeout(() => {
      // 用 userSet 生成 ack bytes (临时改 currentVals + buildFrame + 还原)
      const saved = { ...NS.currentVals };
      Object.assign(NS.currentVals, userSet);
      const ackCmd = NS.COMMANDS.find(c => c.id === ackCmdId);
      const ackFrame = NS.buildFrame(proto, ackCmd);
      Object.keys(saved).forEach(k => NS.currentVals[k] = saved[k]);
      // 调 triggerAckHandler (写 currentVals + trendData + resolve waiter)
      NS._triggerAckHandler(ackCmdId, ackFrame.bytes);
    }, 30);
  }

  // 7. 等 ack / timeout
  try {
    await ackPromise;
    NS.toast(`0x${cmdId.toString(16).padStart(2,'0').toUpperCase()} ack 收到 ✓`, 'success', 2000);
  } catch (e) {
    NS.toast(`0x${cmdId.toString(16).padStart(2,'0').toUpperCase()} 未收到响应 (timeout ${timeoutMs}ms)`, 'danger', 4000);
  } finally {
    NS.txPendingCmds.delete(cmdId);
    NS.renderKpiCards();
  }
};
```

### 4.6 数据模型改动(必须)

**加 0x90/0x91 到 COMMANDS** (line 9384 附近):
```js
NS.COMMANDS = [
  // ... 现有 0x01-0x04, 0x10, 0x11 ...
  { id: 0x90, name: 'Charge Ack',  direction: 'rx', frameType: 'response', cadence: 0, protocol: 'proto_bms', dataFields: ['charge_v_set', 'charge_i_set'], dataSize: 4 },
  { id: 0x91, name: 'Disch Ack',   direction: 'rx', frameType: 'response', cadence: 0, protocol: 'proto_bms', dataFields: ['discharge_v_set'], dataSize: 2 }
];
```

**cadence: 0** → 不主动 query(不会跟 0x10 一样被 dashboard tick 调,不会污染 RX 流)

**`NS.currentVals` 初始化加 2 个新字段** (line 9437-9442 附近):
```js
const initVals = {
  'cell_1_v': 3.71, ..., 'charge_v_set': 56.0,
  'charge_i_set': 0,           // 新加
  'discharge_v_set': 0         // 新加
};
```

**`jitter` 白名单加 2 个新字段** (line 9470 附近):
```js
if (field === 'charge_v_set' || field === 'charge_i_set' || field === 'discharge_v_set') return;
```

(保持"set 字段不抖,等用户触发"语义)

### 4.7 settings 新增

`state.settings.pairTriggerTimeout`:
- 默认 3000 (ms)
- 范围 1000-10000
- 加载/序列化走现有 `buildLocalPrefsSnapshot` (line 17993)
- 系统菜单配置入口 (见第 7 节 C)

### 4.8 状态空间(第 4 节新增)

```js
NS.txPendingCmds = new Set();            // Q8 决策:同 cmd 互斥
NS.txAckWaiters = new Map();             // key = ack cmd id (0x90/0x91)
                                          // value = { resolve, reject, timeoutId, triggerCmdId, ts }
NS.openPairTriggerModal = async function (cmdId, sourceCard) { ... };
```

---

## 5. ack 解析 + Mock 模拟 + RX 接入

### 5.1 triggerAckHandler 机制(核心抽象)

```js
NS._parseAckFields = function (ackCmd, bytes, protoId) {
  // 简单实现: 只支持 u8/u16/u32/i8/i16/i32/float (跟 _FIELD_BYTE_SIZE 对应)
  // 按 ackCmd.dataFields 顺序切 bytes, 跳过 header(1) + cmd(1) + length(1)
  // → data(N) → crc(2) + tail(1) [kind 0 fixed-header]
  // 完整 parseFrame 留 sub-2
  const proto = NS.PROTOCOLS.find(p => p.id === protoId);
  const out = {};
  if (bytes.length < 6) return out;  // 太短
  const dataLen = bytes.length - 6;
  const data = bytes.slice(3, 3 + dataLen);
  let off = 0;
  for (const fname of (ackCmd.dataFields || [])) {
    const df = NS.DATA_FIELDS.find(f => f.name === fname);
    if (!df) continue;
    const size = NS._FIELD_BYTE_SIZE[df.type] || 2;
    const slice = data.slice(off, off + size);
    if (slice.length < size) break;
    out[fname] = NS._bytesToNumber(slice, df.byteOrder || (proto && proto.byteOrder) || 'BE', df.type);
    off += size;
  }
  return out;
};

NS._triggerAckHandler = function (rxCmdId, bytes) {
  // 1. 查 waiter
  const waiter = NS.txAckWaiters.get(rxCmdId);
  if (!waiter) return false;  // 不是 trigger 响应, 放行
  // 2. 找 cmd (用于 trendData key)
  const cmd = NS.COMMANDS.find(c => c.id === waiter.triggerCmdId);
  if (!cmd) return false;
  const ackCmd = NS.COMMANDS.find(c => c.id === rxCmdId);
  if (!ackCmd) return false;
  // 3. 解析
  const parsed = NS._parseAckFields(ackCmd, bytes, cmd.protocol);
  // 4. 写 currentVals (跟 initMockData 一样的写法)
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

**注**:`NS._bytesToNumber` 工具函数 — 现状 NS.encodeDataFields 处理编码,可能没现成解码函数。**实施时检查**:
- 如果没有 `_bytesToNumber`,加 1 个:支持 u8/u16/u32/i8/i16/i32/float,接 byteOrder (BE/LE)
- 或者临时用 `DataView` 反向切(简单但要 byteSwap)

### 5.2 Mock 模式 ack 模拟

已在 §4.5 step 6 描述,核心:
```js
if (!state.serial.connected) {
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
```

**注意**:这里临时改 `NS.currentVals` 是为了 buildFrame 能从 currentVals 读 SET 值(encodeDataFields 现状实现);buildFrame 完立即还原(避免脏数据影响 mock 渲染)。

### 5.3 真串口 RX 接入(找入口,30 分钟探查预算)

**目标**:真串口接 com50 时,设备(com51 脚本)回 0x90 字节 → `_triggerAckHandler(0x90, bytes)` 被调 → waiter resolve → 卡片更新。

**决策标准(实施时)**:
1. **30 分钟探查预算**:从 `state.serial.reader` 入口 + dashboard 启动路径开始搜,看是否有现成 RX 钩子(如 `state.serial.onRxBytes` / `processRxBuffer` / dashboard start 函数里有 RX 订阅)
2. **找到入口** → 挂 `_triggerAckHandler(extractCmdId(bytes), bytes)`,extractCmdId 从 bytes[1](cmd 字节)取
3. **找不到入口** → 加最小 RX 接管:dashboard 启动时把 `_triggerAckHandler` 注册到 `state.serial` 的字节流(只识别 cmd byte == 0x90/0x91 才处理,其他字节原样放行)
4. **接管也困难** → 留 v4.8.x+,sub-3 仅 mock 模式生效,真串口模式触发给"dashboard 串口接入 v4.8.x+ 完成"提示

**实施时判断**:如果 30 分钟内没找到干净的接入点,放弃接管走 fallback(避免无限 debug 烧时间)。

**自测路径**(有 com50/com51):
- SerialCube 连 com50,Python 脚本桥接 com50-com51
- 模拟设备:Python 脚本从 com51 读 0x10 → 回 0x90 bytes(用 SerialCube 同一 buildFrame 算法)
- 验证:`_triggerAckHandler` 是否被调(可在入口 `console.log` 一行调试)
- 验证:dashboard 卡片是否更新(需 RX 接入生效;若不生效 console 看到 hook 未挂提示,v4.8.x+ 完成)

### 5.4 状态空间(第 5 节新增)

```js
NS._FIELD_BYTE_SIZE = { u8:1, i8:1, u16:2, i16:2, u32:4, i32:4, float:4, double:8 };
NS._parseAckFields = function (ackCmd, bytes, protoId) { ... };
NS._triggerAckHandler = function (rxCmdId, bytes) { ... };
NS._bytesToNumber = function (bytes, endian, type) { ... };  // 实施时检查,可能新加
```

---

## 6. c11/c12 卡片 + 错误/Timeout/状态机

### 6.1 c11 / c12 卡片定义(新加)

加到 `NS.CARDS` (line 9396 之后):
```js
NS.CARDS = [
  // ... 现有 c1-c10 ...
  { id: 'c11', type: 'pair',  cmd: 0x11, dir: 'tx', pairId: 'discharge_v', title: '放电电压', unit: 'V', fromOtherCmd: false },
  { id: 'c12', type: 'trend', cmd: 0x11, dir: 'tx', field: 'discharge_v_set', title: '放电设定', unit: 'V', range: [0, 60], precision: 1, fromOtherCmd: false }
];
```

### 6.2 pair 卡渲染分支 (line 9545-9583)

现状:
```js
if (c.pairId === 'charge_v') {
  set = NS.currentVals.charge_v_set != null ? NS.currentVals.charge_v_set : 0;
  act = (NS.currentVals.pack_v_avg != null ? NS.currentVals.pack_v_avg : 0) * 15;
}
```

加 `discharge_v` 分支:
```js
} else if (c.pairId === 'discharge_v') {
  set = NS.currentVals.discharge_v_set != null ? NS.currentVals.discharge_v_set : 0;
  act = (NS.currentVals.pack_v_avg != null ? NS.currentVals.pack_v_avg : 0) * 15;  // 4 cell 串联总电压
}
```

**act 公式**:`pack_v_avg * 15` 跟 charge 一致(同一电池,充放电时 pack_v_avg 表现一样),**sub-3 不动这个公式**。后续 sub-X 可考虑 c11 独立 act 来源(比如 discharge 模式时 ACT 用不同派生)。

### 6.3 trend 卡渲染

c12 走通用 trend 渲染(`else` 分支,line 9584-9604),**无特殊处理** ✓

### 6.4 错误 / Timeout 状态机

**状态机(每个 cmd 独立)**:
```
IDLE  ─点 ↗ 触发(且同 cmd 无 pending)─→  PENDING
        ↓ (buildFrame 失败)
        → ERROR_BEFORE_SEND (toast: '协议错误: X', 不发,不入 PENDING)
PENDING  ─设备 ack 0x90/0x91─→  ACK (toast: 'ack 收到 ✓', currentVals 更新)
        ─timeout─→  TIMEOUT (toast: '未收到响应 (timeout Xms)', currentVals 不变)
        ─sendPayload 失败(无 writer)─→  ERROR_NO_SERIAL (toast: '串口未连接', modal 关闭)
```

### 6.5 错误 toast 详细

| 触发条件 | toast 标题 | 描述 | 级别 | 时长 |
|---|---|---|---|---|
| buildFrame 返 error | '协议错误' | `error code + kind` | danger | 4s |
| sendPayload 返 false (无 writer) | '发送失败' | '串口未连接,无法发送' | warn | 3s |
| 设备未回 0x90/0x91 超时 | '0xXX 未收到响应' | `timeout ${ms}ms` | danger | 4s |
| ack 收到但 parseAckFields 失败 | '0x90 解析失败' | `field 缺失 / bytes 太短` | warn | 3s |
| ack 收到,正常 | '0xXX ack 收到' | '✓' | success | 2s |
| 等待中(已发,等响应) | '0xXX 已发送,等待 ack' | `${bytes.length}B` | info | **不自动消失** |

### 6.6 ↗ 按钮状态

- IDLE:`↗` 可点
- PENDING:`↗` disabled,加 `.is-loading` class(CSS 留 design 阶段细化,antd loading 风格)
- ACK/TIMEOUT:1s 后恢复 IDLE(让用户看到反馈),再 enable

CSS 简化:复用现有 `.card-action` + 加 `.is-loading` modifier:
```css
.card-action.is-loading { animation: spin 0.8s linear infinite; opacity: 0.5; cursor: not-allowed; }
```

### 6.7 数字 stepper 输入校验

- input 元素 `min` / `max` / `step` 属性
- 提交时校验(0x10 charge_v_set:0-60V;charge_i_set:0-30A;0x11 discharge_v_set:0-60V)
- 越界 → toast '输入超出范围 (0-60V)',danger,不发送

---

## 7. 拆 commit 计划

按"先底层后上层",每个 commit 自包含可验证。

| # | Commit | 范围 | 验证(手测) |
|---|---|---|---|
| 1 | `v4.9.1` dataSize 自动算 | 加 `NS._FIELD_BYTE_SIZE` + `NS.computeDataSize` + 协议编辑器"添加命令"表单删 datasize 输入 → 改只读自动算显示 | 协议编辑器"添加命令"表单:选 0x10 → 看到"自动算 4 bytes"标签;选 0x11 → "自动算 2 bytes";旧 user config 加载不报错 |
| 2 | `v4.9.2` ACK 0x90/0x91 命令定义 | `NS.COMMANDS` 加 0x90 (charge ack) + 0x91 (disch ack),direction='rx' / frameType='response' / cadence=0;`NS.currentVals` 初始化加 `charge_i_set` + `discharge_v_set` = 0;`jitter` 白名单加新字段 | 页面加载: c1-c8 卡片值不变;`NS.currentVals` 查 charge_i_set=0 / discharge_v_set=0;cmd 列表里看到 0x90/0x91 |
| 3 | `v4.9.3` ack 解析 + 状态空间 | 加 `NS._parseAckFields` + `NS._triggerAckHandler` + `NS._FIELD_HINT` + `NS.txPendingCmds` Set + `NS.txAckWaiters` Map;**不开 UI**,只把"地基"建好;在 DevTools 可手动调 `NS._triggerAckHandler(0x90, fakeBytes)` 验证写 currentVals | DevTools 手动调:`NS._triggerAckHandler(0x90, [0xAA, 0x90, 0x04, 0x02, 0x38, 0x01, 0x00, 0x00, 0x55])` → `NS.currentVals.charge_v_set` 变成新值;c9/c10 卡片刷新显示 |
| 4 | `v4.9.4` 弹 modal 改造 ↗ 按钮 | 加 `NS.openPairTriggerModal(cmdId, sourceCard)` + modal DOM + 字段渲染(数据驱动,0x10/0x11 共用);↗ 按钮 handler 改调 `openPairTriggerModal`;modal 实时字节预览接 buildFrame | 加载页面 → 点 c9/c10 ↗ → 弹 modal 输 SET → 实时看到 hex 预览(随输入变化);取消 → 关闭,不触发 |
| 5 | `v4.9.5` 真实发送 + Mock ack 模拟 | modal 确认 → `buildFrame` → `sendPayload` → 推 waiter → Mock 模式 `setTimeout(30ms)` 调 `NS._triggerAckHandler`;PENDING 状态 ↗ 按钮 disabled + loading + 顶部 toast;ack 后 ↗ 恢复 + success toast;错误 / timeout 处理(§6.4 状态机) | 点 ↗ 输 56.5V → 确认 → 30ms 内 c9/c10 卡片 SET 变 56.5、sparkline 加新点;modal 期间再次点 ↗ 同 cmd 灰按钮;点 0x11 跨 cmd 独立可点;超时测试(改 timeout=1000 + 关 mock 模拟):1s 后错误 toast + 卡片不变 |
| 6 | `v4.9.6` c11/c12 + settings + RX 接入点 | 加 c11/c12 卡片定义 + pair 渲染分支;settings 加 `pairTriggerTimeout`(默认 3000, 范围 1000-10000)+ 系统菜单配置入口;RX 接入点挂 hook(找现状 `processRxBuffer` 入口,如没有则只加 TODO 注释 + console.warn 'dashboard RX 未接入, 真串口触发在 dashboard 模式仅做 TX 字节发');最终验证(§8) | 系统菜单:看到 "Pair trigger 超时" 配置项,可调 1000-10000ms;加载 c11/c12:2 张新卡 12 个 trend grid;点 c11 ↗ 弹 modal 输放电电压;改 timeout 滑块后立即生效(下次触发用新值);com50/com51 真串口自测见 §8 |

---

## 8. 验证清单 (commit 6 后跑)

### 8.1 回归保护

- [ ] 加载页面 → c1-c8 卡片值跟 v4.8 一致(数值范围不变,pack_v_avg ~3.71V)
- [ ] c9 pair 显示 "SET 56.0 / ACT ~55.7"(初始)
- [ ] c10 trend 显示 56.0
- [ ] 协议编辑器打开,0x10 charge 在 cmd 列表里显示 "data 4 bytes" 自动算
- [ ] 协议编辑器"添加命令"表单:没有 datasize 输入框了,有只读自动算显示
- [ ] 0x90 / 0x91 在 cmd 列表里出现,direction='rx',frameType='response'

### 8.2 新功能 (Mock 模式)

- [ ] 点 c9 ↗ → 弹 modal 标题 "触发 0x10 Control Charge"
- [ ] modal 字段:2 个数字 stepper(充电电压 V + 充电电流 A)
- [ ] modal 实时 hex 预览:输 56.5V → 显示 `AA 10 04 02 39 ...`(随输入变)
- [ ] 点确认 → ↗ 灰按钮 + 顶部 "已发送 0x10 (12B), 等待 ack"
- [ ] 30ms 后 ↗ 恢复 + "0x10 ack 收到 ✓" 成功 toast + c9 SET 变 56.5 + c10 显示 56.5 + sparkline 加新点
- [ ] 点 c9 ↗ 弹 modal 中(未确认)→ 再点 c9 ↗(同 cmd)灰按钮 + "请等待上次响应"
- [ ] 点 c9 ↗ 弹 modal 中 → 点 c11 ↗(跨 cmd)正常弹新 modal(0x11)
- [ ] 点 c11 ↗ → 弹 modal 标题 "触发 0x11 Control Disch",1 字段(放电电压)
- [ ] 改 timeout 为 1000ms,临时屏蔽 mock(setTimeout 不调 ack)→ 1s 后红色 toast "0x10 未收到响应 (1000ms)" + 卡片不变
- [ ] 系统菜单:看到 "Pair trigger 超时" 滑块 / 数字 stepper,默认 3000ms,范围 1000-10000
- [ ] 改 timeout 为 5000 → 下次触发等待 5s 才超时

### 8.3 新功能 (c11/c12)

- [ ] 加载 c11 → 显示 0 V SET / 0 V ACT(初始)
- [ ] 加载 c12 → 显示 0(初始)
- [ ] 触发 0x11 → modal 输 48.0V → 确认 → 30ms 内 c11 SET 变 48.0 + c12 显示 48.0

### 8.4 真串口 (有 com50/com51 自测)

- [ ] SerialCube 连 com50,Python 脚本桥接 com50-com51(脚本读 com51 + 回 0x90 bytes)
- [ ] 触发 0x10 → com51 脚本收到 `AA 10 04 02 39 01 00 00 [crc] 55` 字节
- [ ] com51 脚本回 `AA 90 04 02 39 01 00 00 [crc] 55` 字节
- [ ] SerialCube 看到 ack:dashboard 卡片更新(需 RX 接入生效,sub-3 找入口;若不生效 console 看到 hook 未挂提示,v4.8.x+ 完成)
- [ ] console 看到 `[pair-trigger] TX bytes sent: AA 10 04 02 39 01 00 00 55` (发送成功)

### 8.5 数据兼容性

- [ ] 旧 user config 加载:0x10/0x11 的 dataSize=4/2 字段被忽略(computeDataSize 算);0x90/0x91 不在旧 config 里 → 加载时容错 + 自动用默认 0x90/0x91 定义
- [ ] 旧 .timeline 文件:不动(无影响)
- [ ] localStorage prefs:不动
- [ ] AGENTS.md 数据兼容性 5 条全部遵守

### 8.6 v4.8a 行为不变

- [ ] 协议编辑器 验证 按钮 (commit `94a09fc`) 行为不变
- [ ] 8 个 `_buildFrameXxx` 调用链不变
- [ ] 错误 toast (红框 / 红徽章 / var(--danger)) 跟 v4.8a 一致

---

## 9. 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| 现状 dashboard 模式没接 RX,真串口 trigger 在 dashboard 模式"看起来不工作" | 中 | console 显式提示;sub-3 实施时找 RX 入口,挂上则生效;挂不上则 sub-3 完整覆盖 mock 模式,真串口模式仅做 TX 字节发(用户可从 com51 脚本验证字节正确) |
| `_parseAckFields` 只支持 u8/u16/u32,新加 type 未识别会失败 | 低 | 现状 DATA_FIELDS 全部 u16,实际不会触发;新 type 加 _FIELD_BYTE_SIZE 即可 |
| sparkline 新点加在 SET trend,但 ACT 派生 trend 不变 → 视觉"只有 SET 跳" | 低 | 预期行为(用户触发的就是 SET);DOC + 注释说明 |
| 同 cmd 互斥在重复 modal 实例下失效 | 极低 | 单页应用,不会有多个 openPairTriggerModal 同 cmd 并发;`txPendingCmds` Set 检查 |
| 旧 user config 加载时 0x90/0x91 缺失 → mock ack 模拟无目标 cmd 定义 | 中 | 默认 COMMANDS 始终包含 0x90/0x91(硬编码),user config 不允许删;加载时校验 0x90/0x91 存在,缺失则插入默认 |
| `setTimeout` 模拟 mock ack 被浏览器后台节流 → UI 状态悬挂 | 低 | 浏览器后台 setTimeout 会被节流到 1s+,但 timeout 默认 3s,正常够;`finally` 块确保 txPendingCmds 释放 |
| 触发 0x10 后用户立刻断开串口 → waiter 永远不 resolve | 中 | sendPayload 失败时已走 catch 路径;断开时走 catch 路径;modal 关闭事件 force-release waiter |
| 数字 stepper 输入负数/超界 | 低 | input 元素 min/max 属性 + 提交时校验 + toast 提示 |
| `_bytesToNumber` 工具函数不存在 | 低 | 实施时检查,如无则加(支持 u8/u16/u32/i8/i16/i32/float + byteOrder) |
| **临时屏蔽 mock 做超时测试** | 低 | 实施时加 `NS._mockAckDisabled = false` 调试开关(commit 5);DevTools 设为 `true` 可让 mock 不模拟回 ack,用于测试 timeout 路径;commit 6 收尾保留开关(不暴露 UI,仅 DevTools) |

---

## 10. Definition of Done (DoD)

- [ ] 6 个 commit 全部 push 到 main
- [ ] 浏览器加载 SerialCube.html → dashboard 渲染正常,12 张卡布局正确
- [ ] c1-c8 卡片值跟 v4.8 一致(回归保护)
- [ ] c9/c10 初始显示 56.0(回归保护)
- [ ] c11/c12 初始显示 0(新功能)
- [ ] 协议编辑器"添加命令"表单显示"自动算 N bytes",无 datasize 输入框
- [ ] 协议编辑器 0x10/0x11 cmd 列表显示"data 4 bytes" / "data 2 bytes"
- [ ] 协议编辑器 0x90/0x91 出现(direction='rx', frameType='response')
- [ ] 触发 0x10 → modal → 输 56.5V → 30ms 内 c9/c10 显示 56.5 + sparkline 加新点
- [ ] 触发 0x11 → c11/c12 显示新值
- [ ] 同 cmd 互斥:同 modal 期间再点 ↗ 灰按钮
- [ ] 跨 cmd 独立:0x10 modal 中可点 0x11
- [ ] 改 timeout=1000ms + 屏蔽 mock → 1s 后错误 toast + 卡片不变
- [ ] 系统菜单看到 "Pair trigger 超时" 配置项,可调
- [ ] com50/com51 真串口自测:触发 0x10 字节能被 com51 脚本捕获
- [ ] 旧 user config 加载不报错(0x90/0x91 自动补)
- [ ] v4.8a 协议编辑器 验证 按钮行为不变
- [ ] AGENTS.md 数据兼容性 5 条全部遵守
- [ ] HANDOFF.md 更新到 v4.9

---

## 11. 时间估计

| Commit | 估计 | 备注 |
|---|---|---|
| v4.9.1 dataSize 自动算 | 30 min | 纯 UI + 1 个新函数 |
| v4.9.2 ACK 0x90/0x91 命令定义 | 20 min | 数据模型改动 |
| v4.9.3 ack 解析 + 状态空间 | 45 min | 核心抽象 + 1 个 bytes→number 工具 |
| v4.9.4 弹 modal 改造 ↗ 按钮 | 60 min | modal DOM + 字段渲染 + 实时预览 |
| v4.9.5 真实发送 + Mock ack | 60 min | 主流程 + 状态机 + 错误处理 |
| v4.9.6 c11/c12 + settings + RX hook | 45 min | 收尾 + 自测 |
| **总** | **4-4.5 小时** | 2-3 个 session |

注:HANDOFF.md 估的"30-45 分钟"是只算 trigger 部分;完整 sub-3 含 dataSize + c11/c12 + settings,需要更多时间。

---

## 12. 后续 sub 路径

- **sub-2**:parseFrame 通用化 + 协议编辑器 UI 重构(kind 下拉 + 动态 fields)
- **v4.9.x+**:dashboard 模式串口 RX 接入(让真串口 0x90 自动进 dashboard,不仅 TX 字节发)
- **v5**:历史回放 .timeline 录制/回放打磨
- **未来**:DATA_FIELDS 加 range/unit/step 字段;TX 多设备总线;测试基础设施

---

**最后更新**: 2026-08-04 11:58
**下次会话提示**: 用户 review → 调 writing-plans skill 写 plan → 调 coder/general sub-agent 执行
