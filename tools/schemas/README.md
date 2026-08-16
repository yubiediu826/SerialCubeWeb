# SerialCube 协议 schema 中间表示

> 单一 JSON 描述一份协议的帧格式 + 命令位表。**一处定义，四处复用**：页面端 `NS.buildFrame`/`NS.parseFrame`、模拟主机、模拟从机、测试黄金向量。
> 协议变更只改 schema，不再重制上位机/设备模拟器。

## 文件

| 文件 | 协议 | 状态 |
|------|------|------|
| `bms_v113.json` | BMS V1.13（head+addr+cmd+len+set+crc16） | ✅ 权威完整双向 schema（MB+CB 全 19 命令） |
| `bms_v113_host.json` | BMS V1.13 主机视角（完整双向 + `role:"host"`） | ✅ 双页面仿真主机页导入 |
| `bms_v113_slave.json` | BMS V1.13 从机视角（完整双向 + `role:"slave"`） | ✅ 双页面仿真从机页导入 |
| `ems_v143.json` | EMS V1.4.3（0xAA 0xAA + addr2 + cmd + len + data + checksum） | 见文件内 TODO |

> **host/slave 拆分约定**：双页面仿真中，主机页发 MB（控制/查询）+ 收 CB（遥测），从机页收 MB + 发 CB（响应），**两边都需要完整双向布局**。因此 host/slave 文件都是 `bms_v113.json` 的完整副本，区别只在 `role` 标记（导入后自动设置仿真角色）和独立协议 id（`proto_bms_v113_host` / `proto_bms_v113_slave`，两页面各导各的互不覆盖）。改协议只改 `bms_v113.json`，再跑 `split-bms-schema.mjs` 重新生成两个视角副本。

## 嵌入与同步

schema 在单文件 `SerialCube.html` 中以 `NS._SCHEMA_<ID>` 内嵌（`// @SCHEMA_EMBED_<ID>@` marker）：

```bash
node tools/scripts/split-bms-schema.mjs   # 从 bms_v113.json 重新生成 host/slave 视角副本
node tools/scripts/embed-schema.mjs       # 修改 tools/schemas/*.json 后必跑 (bms_v113.json 直接嵌入, host/slave 跳过)
```

## 结构

```jsonc
{
  "id": "proto_bms_v113",            // 协议 id (NS.PROTOCOLS 条目 id)
  "version": "1.13",
  "meta": { "name": "BMS V1.13", "byteOrder": "LE", "bit0": "LSB" },
  "frame": {
    "fields": [                        // 帧级字段 (按序切片)
      { "name": "head", "type": "u8", "match": { "MB": "0x5A", "CB": "0x55" }, "head": true },
      { "name": "addr", "type": "u8" },
      { "name": "cmd",  "type": "u8" },
      { "name": "len",  "type": "u8", "semantic": "dataLength" },
      { "name": "data", "type": "data", "lenBy": "len" },
      { "name": "crc",  "type": "crc16", "endian": "LE" }   // 或 type "checksum"
    ],
    "crc": { "type": "crc16-modbus", "init": "0xFFFF", "endian": "LE", "range": "all" }
    // range: all | no_header | no_header_tail | no_tail | data_only
  },
  "commands": {
    "0x01": {                          // 命令键: "0x01" / "01" / "0X01" 均可
      "MB": { "len": 2, "fields": [    // 方向键: MB/CB (BMS) 或 REQ/RESP (EMS); 无方向头时用 "default"
        { "name": "ctrl", "type": "bitset", "bitLen": 16, "bits": [{ "bit": 0, "name": "Load" }] }
      ]},
      "CB": { "len": 159, "fields": [ /* 数据区位表 */ ] }
    }
  }
}
```

## 字段类型与元数据

| type | 说明 | 关键元数据 |
|------|------|-----------|
| u8/i8/u16/i16/u32/i32/float/double | 数值（i* 有符号补码） | `startBit` `bitLen` `scale` `offset` `unit` |
| bitset | 位图 | `bitLen` + `bits: [{bit, name}]` → 展开为 `字段名.位名` |
| enum | 枚举 | `bitLen` + `enum: {"0": "标签"}` → 额外输出 `字段名_label` |
| ascii | 定长 ASCII（LE 时字节反序） | `bitLen` `endian` |
| array | 数组 | `item: {type, bitLen, count}` |
| bytes | 原始字节（TODO/变长占位） | — |

**位寻址约定**：`startBit` 为数据区内绝对位偏移，bit0 = 首字节最低位（LSB-first），跨字节连续编号，多字节字段按小端解释——与 BMS/EMS 协议文档一致。

**物理值换算**：`物理值 = raw × scale + offset`；编码时 `raw = round(物理值 / scale)`。

## 测试

黄金向量在 `tests/golden-vectors.json`，由 `tests/protocol.test.mjs`（jsdom 加载 SerialCube.html 后直调 NS.*）断言：

```bash
node tests/protocol.test.mjs   # L1 协议层测试 (CRC 向量 / 帧 CRC / schema 结构 / parseFrame / 编码器往返)
```
