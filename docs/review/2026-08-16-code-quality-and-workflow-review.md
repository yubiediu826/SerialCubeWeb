# SerialCubeWeb 全面评审与系统化改善方案

> **日期**: 2026-08-16
> **范围**: 代码质量 / 文档完备性 / CI 与工作流 三维度评审 + 仪表盘专项（按位协议解析、模拟主机/模拟从机）+ 落地路线图
> **依据**: 对 `SerialCube.html`（实测 24,679 行 / 1,154.8 KB）、`docs/`（99 个文档文件）、`.github/`、`.minimax/skills/`（16 个 skill）、`docs/reference/` 两份协议文档（EMS-测试上位机-通讯协议V1.4.3.xlsx、BMS通讯协议V1.13 之 md+xlsx）、git 历史与备份分支 `backup-pre-rollback-2026-08-14` 的逐一核查
> **结论先行**: 项目治理文档体系完备度远超工程质量——单文件 2.4 万行无构建无自动化测试、CI 零门禁、"e2e 套件"实为文档化人工流程；协议层"能编码、不能解码"；仪表盘靠每 800ms 的随机抖动"假运转"。v1.4.0 曾实现 BMS V1.13 协议集成 + Python 模拟从机，因方案被判定有问题而整体回滚，主要资产半存于备份分支，是本轮重构可直接复用的底子。

---

## 1. 总体评分

| 维度 | 评分 | 一句话依据 |
|------|------|-----------|
| 代码质量 | 5.5 / 10 | 编码器 8 种帧 kind 齐全但解码器（`parseFrame`）不存在；核心数据流多处断链；类型/常量双表漂移；XSS 一处 |
| 文档完备性 | 7 / 10 | 文档量大、纪律性好（changelog/handover/回滚留痕），但 54 处坏链、规模与行号全面漂移、文档超前于代码 |
| CI / 工作流 | 3 / 10 | 仅 GitHub Pages 部署一条流水线，无任何门禁；"测试"无断言无执行器；push 即上线 |

---

## 2. 代码质量评审

### 2.1 架构现实

- **单文件** `SerialCube.html`：24,679 行 / 1,154.8 KB（文档仍写 21,168 行 / 942KB，见 §3）。
- **无构建、无依赖管理**：仓库无根 `package.json`；`node_modules/`（jsdom、undici 等）是被删除的 `docs/verify/`（jsdom 单测尝试，.gitignore 明示"不进 commit"）留下的孤儿，文档却仍引用它。
- **命名空间**：协议/数据挂在 `NS`（`window.NS`），仪表盘模块整体挂在 `window.__serialWebDashboard`（10634 行 IIFE），另混有裸全局（`_statsUpdateTimer` 10999、`NS_renderIcons` 10687）。
- **内嵌双解码器**：解析视图有一套独立的 `readBinaryValue`/`parseBinarySchemaFrameAt`（19303-19430，17 种类型、含 bool8 逐位展开与 SUM8 校验），但与仪表盘的 `NS.currentVals` **零连接**——能力有了，却没接到主数据流上。

### 2.2 协议层能力矩阵（编码 vs 解码）

| 能力 | 编码（发送） | 解码（接收） |
|------|-------------|-------------|
| 帧 kind | ✅ 8 种全实现（12917-13114 dispatcher + `_buildFrame*`） | ❌ 仅 kind 0 fixed-header 一种，且硬编码 0xAA/0x55 帧（13158-13175） |
| 字段类型 | ⚠️ u8/i8/u16/i16/u32/i32/float（12771-12797）；`double` 声明但无编码分支；`float` 经 `Math.round` 按整数编码（12790-12793），与解码 `getFloat32`（13147）**不对称，往返必错** | ✅ `_bytesToNumber` 全类型（13132-13151） |
| CRC | ✅ 5 种算法 + `crcRange` 5 档（12710-12870） | ❌ **不校验 CRC**（13223 注释自认"CRC 暂不校验"，只认帧边界） |
| 查询响应 | — | ❌ 只认 0x90/0x91 控制 ack（13234），0x80 遥测响应无任何解析路径 |
| 周期轮询 | ❌ `cadence` 字段只进 UI/存储，全文件无任何按 cadence 发查询帧的定时器 | — |
| 位级/位域 | ❌ 无 bit/mask/shift 元数据 | ❌ 无（唯一位操作是方向 bit7，属于帧格式而非数据语义） |
| 缩放/偏移/枚举/单位 | ❌ 无 | ❌ 无 |
| 数组/结构体/变长 | ❌ 无（v1.4.0 尝试过 `count:N`，已回滚） | ❌ 无 |
| 双向帧（MB/CB 不同布局） | ⚠️ v1.4.0 尝试过方向感知帧头，已回滚 | ❌ |

**对照协议文档的差距**（证据见 §5.1）：EMS V1.4.3 与 BMS V1.13 的全部字段都用「起始位 + 长度Bit」描述，含跨字节非对齐位域、位图、符号位、缩放精度、OFFSET、枚举、ASCII 小端字符串、8/20/101 项数组、嵌套结构体、变长数据区。现有 `u8~double` 字节定长模型**无法表达其中任何一项**。且内置 `proto_bms` 是虚构的 TLV 协议（0xAA 帧头 + 0x55 帧尾），与真实 BMS 文档（0x5A/0x55 方向帧头 + addr + cmd + len + set + CRC16-LE，无帧尾）**完全不匹配**——这是"接真设备仪表盘没反应"的第一层原因。

### 2.3 仪表盘断链分析（"无法正常运转"的完整证据链）

数据流应为：`串口 RX → 帧解析 → currentVals → 卡片渲染`。实测断在 5 处：

1. **遥测卡与解码器不匹配**：c1-c8 RX 卡绑定查询命令 0x01-0x04（11252-11259），其响应帧 cmd=0x80（10801-10816），但 `tryDispatchAckFrames` 只认 0x90/0x91（13234）。**0x80 响应永无解析路径**。
2. **无轮询发送器**：`cadence`（200/500/1000/2000ms）从未驱动任何定时器，设备收不到查询，自然不回遥测。
3. **mock tick 无条件覆盖真实数据**：`NS.start` 启动 `setInterval(NS.tickData, 800)`（12685）；`tickData`（11350-11386）内**没有 `_serialConnected` 守卫**，每 800ms 对所有 telemetry 字段随机抖动覆盖 `currentVals` 并全量重绘（11385）。真串口数据会被 mock 抖动冲掉——仪表盘本质是"动画"，不是"测量"。
4. **告警渲染比较类型 bug**：`checkAlert` 返回对象（11396-11427），但 `renderCard` 用 `alert === 'danger'` 字符串比较（11586-11591），恒 false，告警变色/文案失效；仅 11574 一处用对了 `alert.severity`。
5. **无效调用**：`_injectMutation` 里 `NS.checkAlert()` 无参调用（11223）直接返回 null，形同虚设。

另有：渲染依赖 `activeProtoId + _serialConnected` 双条件（11728-11737），而 `_serialConnected` 由主应用 `updateSerialStatus` 末尾同步（17184-17191）——这类"跨模块靠约定同步"的状态在 v1.3.2/1.3.2.1 曾引发两轮 dashboard 修复（`NS.serialConnected` 拼写/赋值漂移），是仪表盘反复出 bug 的结构性根因：**无单一数据源、无响应式机制、渲染触发散落各处**。

### 2.4 代码质量问题 Top 10

| # | 问题 | 证据（行号） |
|---|------|-------------|
| 1 | `parseFrame` 不存在（架构文档却声称有） | 13154/13221 注释自认"留后续 sub-2 重构" |
| 2 | float 编解码不对称 / double 静默丢字节 | 12790-12793 vs 13147-13148 |
| 3 | 类型双表不一致 | `NS.DATA_TYPES`（11231，缺 i8/double）vs `_FIELD_BYTE_SIZE`（11242） |
| 4 | mock tick 无连接守卫，覆盖真实数据 | 12685 + 11350-11386 |
| 5 | 告警对象 vs 字符串比较 bug | 11586-11591 vs 11396-11427 |
| 6 | XSS：协议字段名/单位未转义拼 innerHTML | 11042-11044、11077-11078（f.name/f.unit 来自用户可编辑卡片并持久化） |
| 7 | 8 个 `_buildFrame*` 头/尾/CRC 拼装逐份复制 | 12941-13114 |
| 8 | 魔法数字散落：0xAA/0x55/7 字节偏移/0x90/0x91/`*15` 倍率/800ms/30ms | 13160-13164、13231-13239、11336、11533、11651-11653、12685、13468 |
| 9 | 错误处理缺失：RX 无 CRC 校验、未知 type 静默返回、越界只 break 不报错 | 13223、12782-12794、12807-12808、13169 |
| 10 | 性能：tick 每 800ms 全量 innerHTML 重建 + 重绘全部 sparkline canvas，无节流 | 11877-11893 |

---

## 3. 文档完备性评审

### 3.1 做得好的地方

- 文档分层清晰（USER/DEVELOPER/AGENT-START-HERE、reference、handover、changelog、superpowers specs/plans、design mockup），角色+时间预算引导成熟。
- changelog「主索引 + 子文件」纪律在大部分版本得到执行；**v1.4.0 回滚事件完整留痕**（回滚原因、13 commit 清单、备份分支、恢复方法），这是难得的良好实践。
- 设计 spec 质量高（含决策对比 A/B/C、风险表、任务拆分）。

### 3.2 问题清单

| 类别 | 具体问题 |
|------|---------|
| 坏链 | 官方 link check 脚本自身有 2 个 bug（跳过正则 `\.` 漏掉所有 `../` 链接、`$_.Matches[0]` 每行只查第一个链接）。修正后穷举出 **54 处坏链接**：6 处引用不存在的 `SESSION-CHECKLIST-2026-08-11.md`、5 处 `HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST`、CHANGELOG 主索引 `../` 路径错位等 |
| 规模漂移 | 文档写 21,168 行 / 942KB，实测 24,679 行 / 1,154.8 KB；ARCHITECTURE.md 章节行号表非均匀漂移（前半 +600~1400，后半 +3493；`const VERSION` 文档写 ~50，实际 8797） |
| 版本自相矛盾 | `docs/README.md` 标题 v1.3.4、正文"当前版本 v1.3.1"；QUICKSTART/PROJECT-HANDOVER 停在 v1.1.0/v1.1.1；代码/README/CHANGELOG 为 v1.3.4 但 **git tag 只到 v1.3.1.1**（缺 v1.3.2/1.3.2.1/1.3.3/1.3.4 四个 tag，"VERSION 三处同步"硬规则已破） |
| 文档超前代码 | ARCHITECTURE.md 数据流写 `NS.parseFrame`（代码不存在）；v1.3.0 debug-panel spec §6.1 同样引用 `NS.parseFrame`；`docs/README.md` 工具表引用已删除的 `docs/verify/*.js` |
| 协议文档自身矛盾 | 工作区 BMS md（423 行）只覆盖 0x01-0x03；备份分支完整版（1352 行）覆盖 19 命令；md 缺 0x0B/0x0C/0x16 三条命令；0x03 字节示例自相矛盾；温度分辨率两表不一致（1℃ vs 0.1℃）；**xlsx 独有的「BMS保护标志位」sheet（逐 bit C 变量名）是位图 schema 的最佳权威来源，md 没有** |
| e2e 场景孤儿 | 21 个场景文件，runner 只认 01-06；07-21 共 15 个从未被执行器读取；`reports/baseline.json` 冻结在 v1.1.1 |
| changelog 主索引漏登 | `docs/changelog/` 实际 19 个文件，CHANGELOG.md 主索引只登 17 条：漏 `2026-08-13-v1.2.2-proto-edit-cmd-list-polish.md`、`2026-08-13-v1.3.1.1-cascade-modal-fix.md` |
| 引用不存在的 plan | CHANGELOG.md:33 引用 `superpowers/plans/2026-08-13-v1.2.1-ui-consistency-plan.md`，该 plan 从未写出（只有 spec） |
| 工具目录计数漂移 | `.minimax/skills/README.md` 写"15 skill"，实际 16 个目录，`serialcube-modal-review` 未入目录（与 CHANGELOG"新增该 skill"矛盾） |
| 路径 typo | v1.2.2 changelog 引用 `modal-review-2026-08.13-...`（"." 应为 "-"）；v1.2.1 changelog 相对路径多一层 `../../`；CHANGELOG.md:16/20/21 的 `../design/`、`../handover/` 应为 `design/`、`handover/` |

---

## 4. CI / 工作流评审

### 4.1 现状：零门禁

`.github/` 下仅 `workflows/pages.yml`：push main → 配置 Pages → 部署。**无 lint、无测试、无 link check、无版本一致性检查**。任何 commit（包括 24,679 行单文件里的一处破坏性改动）直接上线生产 URL。

### 4.2 "测试套件"解剖与挂起根因

所谓 `serialcube-e2e` 的实际机制：

- `scripts/run-scenarios.ps1`（52 行）**只打印场景大纲，从不调用 agent-browser**（第 51-52 行自认"agent-browser 是交互式 CLI，不能脚本化所有步骤；真实运行由 AI 跟随场景文档执行"）。
- 场景文件是给 AI 看的操作说明：01-06 的步骤是 `@e<mock-ref>` 这类占位符（每次重新 `snapshot` 找 ref），"期望"是散文（如"接收区出现 mock 响应"）；07-21 虽写了 `agent-browser assert --text/--value/--checked` 片段，**但没有任何 runner 执行它们**，等于没有断言。
- **无超时控制、无失败汇总、无 exit code、无回归基线**（baseline.json 停在 v1.1.1）。

**挂起根因**：整个流程依赖 agent-browser 交互式 CLI（daemon 默认 ~60s 超时）在冷启动 Chrome 上逐条执行人肉命令；任何一步卡住（daemon 超时、ref 失效、页面重绘导致 snapshot 过期）都没有超时兜底或重试，直接表现为"进程挂起"。历史文档多处自证：PROJECT-HANDOVER 记"60s timeout（Chrome 启动慢）"、AGENT-START-HERE 要求"改 timeout=120s"、cascade 计划记"daemon timeout 频繁"——而"runner"本身没有任何 Start-Job/Wait-Job/重试兜底。而**核心协议功能（帧构造、CRC、解析、仪表盘数值）在 21 个场景中零覆盖**——因为 `parseFrame` 不存在，本来就没有可断言的解析结果；唯一沾边的场景 17 是手工 `eval NS.currentVals.cell_1_v=4.5`，且不在 runner 覆盖范围。

### 4.3 UI 协同滞后的断链点

- 设计规范资产其实存在：`docs/design/`（各版本 mockup HTML/PNG）、`serialcube-modal-review`（6 步 guard）、`ui-ux-pro-max`（风格基线比对）、`design-system` skill。但**全部依赖 agent 自觉执行，无任何机器强制**。
- 历史佐证：v1.2.0 部署后用户实测反馈 **8 个 UI 问题** → v1.2.1 专门出 spec 修复；v1.2.2 又连续 **6 个 commit 修 10 个 UI bug**；工作流 SKILL 自认"本质是缺 design guard"。v1.2.2 还出现过 `--bg-elev` **未定义就引用**的主题 bug——说明 CSS token 没有定义校验，改样式全靠肉眼。
- 结论：spec/mockup 是"事后补"或"跳步"而非"事前门"；mockup 与实现无联动校验；token 无单一数据源。这正是"UI 协同滞后 → 样式频繁错乱"的机制性原因。

### 4.4 v1.4.0 回滚的教训（与本次需求直接相关）

- 触发：用户反馈"SerialCube.html 运行的都是死数据"——与本次"仪表盘无法正常运转"同源。
- 实施：13 个 commit 一次塞入四件事（BMS V1.13 协议集成 + Python 从机 + chrome-cdp 新 skill + 弃用 agent-browser），用户判定"整体方案有问题"后 force-push 回滚。
- 现状：13 commit 已不可恢复；**备份分支 `backup-pre-rollback-2026-08-14` 保留了集成版 SerialCube.html（695 行差异，含 19 命令、count:N 数组、i8、方向感知帧头、JSON 导入）+ 1352 行完整协议 md + xlsx + 从机设计计划（1073 行）**；Python 从机代码不在备份树中（已丢失，需按计划重建）。
- 教训：①一次只做一个主题，工具链替换（chrome-cdp/agent-browser）不与功能绑定；②协议 schema 要覆盖位级需求再集成（v1.4.0 只加了 count:N/i8，没解决位域，等于没根治）；③做一半的集成没有测试保护时，回滚是必然。

---

## 5. 仪表盘专项 A：按位协议解析升级方案

### 5.1 协议需求盘点（两份文档穷举）

| 需求 | EMS V1.4.3 证据 | BMS V1.13 证据 |
|------|----------------|---------------|
| 帧格式 | `0xAA 0xAA + addr(2B) + cmd(1B) + len(1B) + data + checksum(1B)`；命令 0xE1~0xEE | `head(0x5A MB/0x55 CB) + addr(1B,0=广播) + cmd(1B) + len(1B) + set + crc16-modbus(LE)`；命令 0x01~0x16 |
| 校验 | 1 字节累加和 = sum(addr+cmd+len+data)，**不含 2 字节帧头** | CRC-16/Modbus，init 0xFFFF，LE 输出，**从帧头起算** |
| 位寻址 | 全部字段按「起始位+长度Bit」（bit0=LSB、小端、跨字节连续编号） | 同左 |
| 跨字节位域 | 0xE3：ByteCmdOn 起始位72/长4、SysState 起始位328/长4、InnerErrCode 起始位346/长6 | 0x03：NTC_CNT uint4 / CELL_CNT uint5 / BAT_TYPE uint3（bit13 起，跨字节） |
| 位图 | EE 9 个故障码位图 | ProtectCode/ErrCode/AFE_ProtectCode/ChgDsgState/CellBalance 位图；xlsx「BMS保护标志位」sheet 提供逐 bit C 变量名 |
| 符号/缩放/偏移 | 备注标 int32_t/s32；精度 0.1/0.01/1E-3/10；OFFSET=40 | 精度列 + OFFSET 列；DsgOCLv1_Val=-20000mA（`E0 B1 FF FF` 小端补码） |
| 枚举 | WorkMode 0x1111 等 | BAT_TYPE 0=锂电 1=磷酸铁锂 2=三元 3=钛酸锂 4=铅酸 |
| ASCII 字符串 | — | DEVICE 设备号 = u32 ASCII 小端 "B26T"（0x42323654） |
| 数组 | 0xED 5 组电池重复结构体 | 8×s16 温度、20×u16 Vcell、101×u16 OCV 表 |
| 变长 | — | 0x14 升级数据包 PAC=8×i |
| 双向帧 | — | MB/CB 同一 cmd 不同布局（如 0x01：MB=2 字节控制位图，CB=143 字节遥测） |
| 主动上行 | — | 0x15 升级完成由 CB 主动上报 |

### 5.2 目标 schema 设计（单 JSON 中间表示，一次定义四处复用）

```jsonc
{
  "id": "proto_bms_v113",
  "meta": { "name": "BMS V1.13", "byteOrder": "LE", "bit0": "LSB",
            "crc": { "type": "crc16-modbus", "init": "0xFFFF", "endian": "LE", "range": "all" } },
  "frame": { "fields": [
      { "name": "head",  "type": "u8", "match": { "MB": "0x5A", "CB": "0x55" } },
      { "name": "addr",  "type": "u8" },
      { "name": "cmd",   "type": "u8" },
      { "name": "len",   "type": "u8", "semantic": "dataLength" },
      { "name": "set",   "type": "data", "lenBy": "len" },
      { "name": "crc",   "type": "crc16", "endian": "LE" }
  ]},
  "commands": {
    "0x01": {
      "MB": { "desc": "控制/常规请求", "fields": [
          { "name": "ctrl", "type": "bitset", "startBit": 0, "bitLen": 16, "bits": [
              { "bit": 0, "name": "Load" }, { "bit": 1, "name": "AC_Adapter" },
              { "bit": 7, "name": "Test_mode" }, { "bit": 9, "name": "fan_enable" } ] }
      ]},
      "CB": { "desc": "常规运行数据", "fields": [
          { "name": "ProtectCode", "type": "bitset", "startBit": 0,  "bitLen": 16 },
          { "name": "SysState",    "type": "enum",   "startBit": 80, "bitLen": 8,
            "values": { "0": "idle", "2": "run", "4": "chg" } },
          { "name": "Cell_Temp",   "type": "array",  "startBit": 128, "bitLen": 128,
            "item": { "type": "s16", "bitLen": 16, "count": 8 },
            "scale": 0.1, "unit": "℃", "naValue": "0xFFFF" },
          { "name": "SysCurr",     "type": "s32",   "startBit": 384, "bitLen": 32, "scale": 1, "unit": "mA" },
          { "name": "BatVolt",     "type": "u16",   "startBit": 1064, "bitLen": 16, "scale": 10, "unit": "mV" },
          { "name": "Vcell",       "type": "array", "startBit": 680, "bitLen": 320,
            "item": { "type": "u16", "bitLen": 16, "count": 20 }, "scale": 1, "unit": "mV" }
      ]}
    }
  }
}
```

**schema 四处分复用**：① 页面端 `NS.buildFrame`/`NS.parseFrame`；② 模拟主机（按 schema 周期发查询、解析响应）；③ 模拟从机（按 schema 应答与自举遥测）；④ 测试黄金向量生成。**协议变更只改 schema，不再重制上位机/设备模拟器**——直接回应"避免每次协议变更都重制上位机"。

### 5.3 单文件内的实现策略（不破坏"单 HTML"硬约束）

1. **新增 `NS.parseFrame(protocol, bytes)` 通用化解码器**（落实 13154/13221 注释预留的 sub-2）：按 `frame.fields` 切帧 → 校验 CRC/checksum（失败计数 + 告警，不静默）→ 按 `commands[cmd].方向` 位表解析 → 写 `NS.currentVals`。
2. **新增 `NS._bitReader`**：`readBits(view, startBit, bitLen, {signed, endian})`，统一处理跨字节位域、小端多字节、补码符号位。
3. **统一类型表**：合并 `NS.DATA_TYPES`（11231）与 `NS._FIELD_BYTE_SIZE`（11242）为一份，补 `double` 编码分支、修正 float IEEE754 编码（与 `_bytesToNumber` 对称）。
4. **补 cadence 轮询器**：`state.serial.connected` 时按命令 `cadence` 周期发送查询帧；断开即停。
5. **`tickData` 加守卫**：`NS._serialConnected` 为真时跳过 mock 抖动（仅保留趋势绘制），把仪表盘从"动画"变回"测量"。
6. **修告警比较 bug**（11586-11591 改为 `alert.severity`）+ `checkAlert()` 无参调用（11223）+ XSS（11042-11044/11077-11078 补 `escapeHtml`）。
7. **内置协议替换**：以 xlsx 为权威（md 缺 0x0B/0x0C/0x16、分辨率矛盾处标 TODO 待固件确认），把虚构 `proto_bms` 替换为真实 BMS V1.13 schema，并新增 EMS V1.4.3 schema（`checksum` + `crcRange=no_header` 需确认 2 字节帧头的跳过逻辑）。
8. **黄金向量固化**：协议文档自带 CRC 实算帧（如 BMS 0x02 完整 101 字节帧 CRC=0xCF70、EMS 各命令示例），直接转成测试 fixture。

### 5.4 复用 v1.4.0 资产

- 从 `backup-pre-rollback-2026-08-14` 提取：集成版 SerialCube.html（19 命令、`count:N` 数组、i8、方向感知帧头、JSON 导入）、1352 行协议 md、两份 xlsx、1073 行从机计划。
- 但**不能原样恢复**：v1.4.0 无位域/缩放/枚举，且被判定方案有问题。正确姿势是按 §5.2 schema 重做中间表示，只借用其验证过的 CRC 向量与命令清单。

---

## 6. 仪表盘专项 B：模拟主机 + 模拟从机方案

### 6.1 目标拓扑（schema 一源三端）

```
┌───────────────┐  USB/串口   ┌──────────────┐
│  模拟主机       │ ─────────► │  真实设备      │   （替代上位机，联调真硬件）
│ (host simulator)│ ◄───────── │  (BMS/EMS)   │
└───────────────┘            └──────────────┘
        │ 相同 schema
        ▼
┌───────────────┐  虚拟串口对  ┌──────────────┐
│ SerialCube Web │ (COM21) ⇄  │  模拟从机      │   （替代真设备，无硬件联调）
│ / 测试脚本      │ (COM20)    │ (slave sim)   │
└───────────────┘            └──────────────┘
```

### 6.2 模拟主机（host simulator，本次新增）

- **形态**：Python 3（本机已装 3.13 + pyserial 3.5）CLI 工具 `tools/protocol_host_sim.py`，附 JSON 场景文件。
- **能力**：加载协议 schema JSON → 按命令表周期发送查询帧（cadence 可配）→ 校验响应 CRC 并解析 → 时间戳日志/CSV 落盘 → 支持脚本化断言（"读回 RSOC==26 则 PASS"）→ 支持故障注入（发坏 CRC、超时重发、错误地址）。
- **价值**：协议每次变更只需更新 schema，**不再重制上位机**；真设备到货前，上位机侧逻辑就能用模拟从机联调完毕。

### 6.3 模拟从机（slave simulator，按 v1.4.0 计划重建）

- **形态**：Python `tools/bms_v113_slave.py`（v1.4.0 蓝图：18 个 handler + 0x15 主动上行 + 状态模型 protect/ocv/sn/cells/temps/curr/soc/fan + 漂移 daemon「双正弦电流 + 慢积分 SOC」+ 故障注入 CRC 错/静默超时/越界值）。
- **丢失代码的教训**：这次必须**入库**（`tools/` 目录），并配套 pytest 集成测试（socket 回环 + 虚拟串口双路径）。
- **通用化**：协议相关部分全部由 schema 驱动，模拟器内核（状态模型、漂移、故障注入、帧编解码）与具体协议解耦，新增 EMS 从机只换 schema + 少量 handler。

### 6.4 应用内调试面板演进（BC 面板补齐缺口）

现有 BroadcastChannel 面板（10888-11227）仅能"手动单帧主从互答"。补齐：①按 cadence 周期发命令（主机角色）；②设备端自主遥测推送（从机角色不依赖命令）；③**串口↔BC 桥**（`navigator.serial` 收到字节 → BC 广播，实现浏览器当模拟主机连真设备；或 BC 帧 → `writer.write` 发给真实串口，实现浏览器当"设备"被真上位机查询）；④单 tab 自环（无 BC peer 时本地回环，不依赖双 tab）。

### 6.5 虚拟串口与 CI 联调

- 本地：Eltima COM20⇄COM21 已验证可用（pyserial 打开通过）。
- CI：Linux runner 用 `socat -d -d pty,raw,echo=0 pty,raw,echo=0` 或纯 socket 回环跑 host↔slave 集成测试，不依赖 Windows 虚拟串口。

---

## 7. 测试策略改造（分层 + 根治挂起）

| 层 | 内容 | 工具 | 执行位置 |
|----|------|------|---------|
| L1 协议核心单测 | CRC 黄金向量、buildFrame 已知帧、parseFrame 已知字节→值（含位域/缩放/枚举/数组）、float 往返 | Node 24 + jsdom（加载 SerialCube.html 后直接调 `NS.*`）+ node:test；fixtures 来自协议文档实算帧 | 本地 + CI |
| L2 模拟器集成测试 | host↔slave 全命令矩阵、CRC 错/超时/越界注入、0x15 主动上行、漂移 | Python pytest + socket 回环/虚拟串口 | 本地 + CI |
| L3 UI e2e | 加载/连接/发收/仪表盘数值/告警变色/主题/modal 回归，**断言化**（数值断言而非"看到 mock 响应"） | Playwright（headless，稳定版 pinned）+ `navigator.serial` polyfill 喂 L1 生成的帧 | CI |
| L4 真机冒烟 | 真串口 + 真设备 / 模拟器双路 | 人工 + agent-browser（仅交互调试用） | 发版前 |

**根治挂起的四条硬规则**：
1. CI 里**禁用交互式 CLI**（agent-browser 降级为人工调试工具）；e2e 必须 headless + 确定性。
2. 每个场景必须有**可编程断言**（数值/文本/DOM 状态），失败输出 diff，不再是散文"期望"。
3. job 级 `timeout-minutes` + 步骤级重试上限，杜绝"挂起"。
4. 把 15 个孤儿场景（07-21）要么纳入新 runner 要么删除，`baseline.json` 每次运行刷新。

---

## 8. CI 流水线设计（门禁化）

```
PR / push → [gate] ── 全过 ──► [deploy pages]
                │
   ┌────────────┼─────────────────────────────┐
   │ 1. link-check   （修正 §13.1 脚本 2 个 bug 后入 CI）│
   │ 2. 一致性自检   （VERSION const == README == CHANGELOG == tag；规模行号自检）│
   │ 3. changelog 存在性（改 SerialCube.html 必带 docs/changelog 子文件）│
   │ 4. token 校验    （HTML 里每个 var(--x) 都在 :root 定义——根治 --bg-elev 类 bug）│
   │ 5. L1 协议单测 + L2 模拟器集成 + L3 Playwright e2e │
   └─────────────────────────────────────────┘
```

- **工具链落地**：补根 `package.json`（jsdom、playwright 为 devDependencies，版本 pinned）、`tools/requirements.txt`（pyserial、pytest）。
- **分支策略**：默认分支保护（PR 必审 + CI 必绿才能合并）；发版 tag 由 release action 自动打（根治 tag 断裂：当前缺 v1.3.2~v1.3.4 四个 tag 应先行补上）。
- **部署**：保留 pages.yml，但其前增加 gate job 依赖（`needs`），push 即上线的风险闭环。
- **保留纪律**：push 前 ask_user 确认维持（已是最低成本的防止误推防线）。

---

## 9. UI 设计协同机制（把"纪律"变成"机器门"）

1. **Design token 单一数据源**：把 `:root`/`theme-*` 的 CSS 变量抽为 `docs/design/tokens.json`，HTML 生成时引用；CI 校验"每个 `var(--x)` 都有定义、每个 token 都被使用"（§8 gate 4）。
2. **Mockup-first 强制门**：涉及 UI 的 PR 必须链接 `docs/design/` 下的 mockup artifact 并在 PR 模板勾选；CI 用启发式检查（feat 提交改动 HTML 样式段时要求 changelog 引用 design/ 文件）。
3. **modal-review 机器化**：把 `serialcube-modal-review` 6 步 prose 清单改为 `docs/design/modal-checklist.json` + 必填截图路径，PR 模板要求逐项勾选，reviewer 按单核对。
4. **视觉回归**：Playwright 对关键页面（仪表盘/协议编辑器/4 个 modal）浅色+深色双主题截图，与 `docs/design/baselines/` 基线 diff，防"样式错乱"重演（v1.2.0 的 8 个反馈、v1.2.2 的 10 个 bug 用此机制本可拦截）。
5. **skill 保留但降权**：taste/ui-ux-pro-max/design-system 继续作为设计阶段的辅助，但**不作为验收依据**；验收只认机器门 + 截图基线。

---

## 10. 分阶段落地路线图

| 阶段 | 内容 | 预估 | 完成标志 |
|------|------|------|---------|
| **P0 止血**（可立即做） | tick 守卫 + 告警比较 bug + checkAlert 无参 + float/double 编码对称 + 类型双表合并 + XSS 转义；补 4 个缺失 tag；修正 link-check 脚本 | 0.5-1 天 | 真串口数据不再被 mock 覆盖；告警变色生效；v1.3.5 补 tag |
| **P1 协议解码核心** | §5.2 schema + §5.3 实现（parseFrame/_bitReader/轮询器/内置真实 BMS+EMS 协议/黄金向量 L1 测试）；复用 backup 分支资产 | 3-5 天 | L1 测试全绿：文档实算帧全部解析正确（含位域/缩放/枚举/数组） |
| **P2 仿真双工具** | §6.2 模拟主机 + §6.3 模拟从机重建（含 pytest L2）+ §6.4 面板补齐（周期发送/自主遥测/串口桥/单 tab 自环） | 2-4 天 | host↔slave 全命令矩阵 L2 全绿；浏览器连虚拟串口看到真实遥测曲线 |
| **P3 工程化收口** | §8 CI 门禁全量 + §7 L3 Playwright e2e + §9 视觉回归/PR 模板 + §3 文档修复（54 坏链/规模行号/版本同步/场景孤儿清理） | 2-3 天 | PR 无门禁不可合并；文档自检全绿；e2e 断言化且稳定不挂 |
| **P4 持续治理** | 仪表盘单一数据源重构（currentVals → 集中 store + 订阅式渲染）；协议文档矛盾处与固件确认后回写；EMS 从机 schema | 滚动 | 新增协议 = 只加 schema + fixture，不动渲染代码 |

**依赖关系**：P0 → P1 → P2 → P3（P2 的 host/slave 复用 P1 的 schema 与解析器；P3 的 e2e 依赖 P1 的黄金帧喂数据）。

---

## 11. 风险与权衡

| 风险 | 对策 |
|------|------|
| 单文件硬约束 vs 可测试性 | 不拆文件；协议核心保持纯函数挂 `NS.*`，测试用 jsdom 加载整页后直调（已验证 jsdom 可跑）；文档分区维护 |
| Web Serial 无 Firefox/Safari | e2e 用 `navigator.serial` polyfill；真机冒烟保留人工通道 |
| 协议文档矛盾（md vs xlsx） | schema 以 **xlsx 为权威**（含位图表）；矛盾处标 `TODO(固件确认)` 注释，不做猜测 |
| 重蹈 v1.4.0 回滚 | 一次一个主题（本次按 P0→P3 分阶段）；工具链替换（如弃用 agent-browser）单独评估，不与功能耦合；每阶段独立可发布、独立可回滚 |
| 备份分支 30 天清理期 | 尽快 cherry-pick 可复用资产（协议 md/xlsx/计划/集成版 HTML 的参考代码）到工作区，避免对象过期 |
| CI 依赖 GitHub Actions 资源 | 分层测试总时长控制在 10 分钟内（L1 秒级、L2 分钟级、L3 按需裁剪） |
| mock tick 移除后演示体验 | P0 后 mock 模式改由"模拟从机回放"驱动（复用 L1 fixtures），而不是随机抖动 |

---

## 12. 遗留资产清单（backup 分支 `backup-pre-rollback-2026-08-14`）

| 资产 | 位置 | 处置 |
|------|------|------|
| 集成版 SerialCube.html（19 命令/count:N/i8/方向帧头/JSON 导入） | 分支内 `SerialCube.html` | 参考实现，按 §5.2 新 schema 重写中间表示 |
| BMS 完整协议 md（1352 行，19 命令） | `docs/protocol/BMS通信协议V1.13.md` | 提取到工作区，替代现有 423 行残卷 |
| BMS xlsx（含位图表 + 分辨率表） | `docs/protocol/bms通讯协议V1.13.xlsx` | 作为 schema 权威源 |
| 从机设计计划（1073 行） | `docs/superpowers/plans/2026-08-13-bms-v113-slave-and-config.md` | §6.3 重建依据 |
| v1.4.0 待办交接（328 行） | `docs/handover/HANDOFF-V1.4.0-PENDING-BMS-V113-2026-08-13.md` | 背景与决策记录 |
| Python 从机代码 | ❌ 不在分支树中（随 13 commit 丢失） | 按计划重建并**入库 tools/** |

---

*评审与方案：基于 2026-08-16 对代码、文档、CI、两份协议文档及 git 历史的完整核查。行号以 `SerialCube.html`（24,679 行）实际 grep 定位为准。*
