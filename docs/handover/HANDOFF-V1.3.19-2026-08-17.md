# HANDOFF V1.3.19 — 2026-08-17

> **v1.3.19** 0x01 卡片补全 — 状态 / 验证 / 后续
> 配合 changelog: [`changelog/2026-08-17-v1.3.19-0x01-full-fields.md`](../changelog/2026-08-17-v1.3.19-0x01-full-fields.md)

## 改动一句话

0x01 命令卡片生成层从硬编码 12+4 字段白名单扩到 34 set + 5 bitset (Device) + 12 trend (Host), 覆盖 BMS V1.13 §4.2 全部非 RSVD 字段。JSON 字段命名 `BackupPowerVoltage → AdapterVolt` 对齐协议修订, `SignalSource` type `u8 → bitset` 让位表卡正确生成。

## 卡生成层公式

`_generateSchemaCards(protoId, schema, role)` (SerialCube.html:21015)
- `host`: 16 → 25 张 (10 ctrl bit + 12 trend + 3 header)
- `device`: 16 → 41 张 (34 set + 5 bitset + 2 header)
- 总: 32 → 61 (89% 增长)

## 命名差异处理

| 位置 | JSON 旧名 | 协议表新名 | 处理 |
|------|----------|-----------|------|
| bit 1080 | BackupPowerVoltage | AdapterVolt | 改 JSON |
| bit 120 | SignalSource (type u8) | SignalSource (bitset 8b) | 改 type + 加 bits 数组 |
| bit 48/496/512/528/544 | RSVD0-4 | RSVD1-5 | 保留差异 (无功能影响) |

## 后续 P0 / P1

### P0 阻塞 push

- [ ] 等用户拍板: 6 个 v1.3.18 unpushed commits (a3779e2 ... 874535e) 一起 push, 还是要拆
- [ ] 等用户拍板: 1 个新 v1.3.19 commit (feat) + 1 docs commit — 跟 v1.3.18 一起 push 还是单独

### P1 后续决策

- **数组字段补全**: `Cell_Temp[8]` (8 温度) + `Vcell[20]` (20 电芯电压) — 三选项
  - A. 每项独立卡 (28 张)
  - B. 单卡带表 (新组件)
  - C. 不补 (当前)
- **SignalSource 位名**: 协议附录 A16 待固件确认, bit0-bit7 占位, 后续按固件实际定义细化
- **Host/Device 字段去重**: host trend 6 字段 (ASOC/CellTempMin/Vcell_min/PackVolt/AverageCurr/AdapterVolt) 跟 device set 重叠 — 是否 host 端用更少 trend?

### P2 nice-to-have

- 0x01 字段按物理组折叠/分组卡 (保护位/温度/电流/容量/电压 5 大组)
- 0x02-0x16 其他命令也走白名单扩 (跟 0x01 一致)
- 协议导入时自动扫描 schema 全字段生成卡片 (而非白名单驱动)

## 验证清单

- [x] agent-browser host 模式 25 张卡渲染正确
- [x] agent-browser device 模式 41 张卡渲染正确
- [x] console 0 错
- [x] VERSION 三处同步 (SerialCube.html:9070 + changelog 段 + README.md:6 + docs/CHANGELOG.md)
- [x] JSON 字段命名 1 处 + type 1 处已改
- [x] 协议守门 (`git status --short -- docs/protocol/ docs/reference/` = 0 行)
- [ ] e2e 6 场景 (用户拍板后跑 serialcube-e2e)
- [ ] push 6+2 commits (用户 ASK 后)

## 工作流教训 (本次)

- ✅ 用户在基础上修改 — 直接扩白名单, 不另起新协议, 符合预期
- ✅ 跳过数组/ctrl-rsvd = 系统默认, 节省一轮 ask
- ⚠️ 1 个 SignalSource 改错地方 (line 14017 而不是 line 11500) — 因为同名字段在两个 schema 都存在, edit 时容易误改, 守门: 改后必 verify grep + eval 验证 schema 实际值
- ✅ 一次性 1 commit + 1 docs commit, 跟之前 v1.3.18 3 步走不同 (本任务用户给完整 0x01 列表 = 一次到位更高效)

## 文件位置

- 改动主入口: SerialCube.html:21015 (`_generateSchemaCards`)
- JSON schema 字段: SerialCube.html:11086 (`_SCHEMA_BMS_V113`)
- 协议权威源: `docs/protocol/BMS通信协议V1.13.md` §4
- 改动 changelog: `docs/changelog/2026-08-17-v1.3.19-0x01-full-fields.md`
- 本 handover: `docs/handover/HANDOFF-V1.3.19-2026-08-17.md`
