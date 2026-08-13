# SerialCube 支持的协议类型

> **用途:** 嵌入式开发参考, 列 SerialCube 当前支持的协议类型与帧格式族.
> **数据保护:** 本文档**不包含**具体数据帧格式 (字段定义 / 字节序配置 / CRC 算法 / 命令集 / 默认值). 这些是 SerialCube 内部实现, 不对外公开. 如需对真设备调试, 请在 SerialCube 内"配置中心 → 协议"手动新建协议, 按设备说明书填字段.

---

## 1. 内置默认协议 (2 个)

| 协议 ID | 名称 | 帧格式族 | 用途 |
|---------|------|----------|------|
| `proto_bms` | BMS TLV v1 (Legacy) | fixed-header | 户外电源 / 储能 BMS 调试 |
| `proto_modbus` | Modbus RTU (Legacy) | fixed-header | 工业总线 Modbus RTU 调试 |

> 注: `proto_modbus` 当前无内置命令, 待真实用例出现后再补.

---

## 2. 支持的 9 种帧格式族 (`kind`)

SerialCube 通过 `kind` 字段区分帧结构, 9 种内置模板可在"配置中心 → 协议"新建时选:

| kind | 适用场景 | 帧结构概述 |
|------|----------|------------|
| `fixed-header` | 通用固定头帧 | 7 段完整帧 (头/地址/命令/长度/数据/CRC/尾) |
| `raw` | 简化帧 | 5 段 (头/命令/长度/数据/CRC, 无尾) |
| `cmd-split` | 命令独立帧 | 4 段 (头/命令/数据/CRC, 无长度/无尾) |
| `addr-split` | 多地址帧 | 6 段 (头/源地址/目标地址/命令/数据/CRC) |
| `ctrl-bit7` | 控制位帧 | 5 段 (头/地址/控制字节/数据/CRC, 控制字节高 7 位表命令) |
| `type-high-bit` | 类型高位帧 | 5 段 (头/地址/类型/数据/CRC, 类型字节高 bit 表命令类型) |
| `msgid-mixed` | 消息 ID 混合帧 | 4 段 (头/消息 ID /数据/CRC) |
| `tlv` | TLV 编码帧 | 3 段 (头/TLV 段/CRC) |
| `custom` | 自定义帧 | 空白起步, 用户自拼字段 |

> 9 种 kind 默认字段布局见 SerialCube 内部 `NS.KIND_DEFAULTS` (本仓库不开源字段级细节).

---

## 3. CRC 类型支持

| CRC 类型 | 用途 |
|----------|------|
| `crc16-modbus` | Modbus 协议标准 CRC16, 默认 |
| (其他类型待扩展) | - |

> CRC 多项式 / 初始值 / 位序等算法细节属内部实现, 不在本文档公开.

---

## 4. 字节序

| 字节序 | 用途 |
|--------|------|
| BE (大端) | 默认, 适用于多数 MCU 通信 |
| LE (小端) | Modbus 等部分协议 |

---

## 5. 用户自定义协议

通过"配置中心 → 协议"新建, 流程:

1. 选 9 种 `kind` 之一作模板
2. 编辑字段 (新增 / 删除 / 重命名 / 改类型 / 改字节序)
3. 配协议级字节序 + CRC 类型 + CRC 范围
4. 新建命令 (内嵌 `dataFields` 定义命令数据布局)
5. 应用协议 (1 协议同时只能有 1 个 active 协议)

---

## 6. 协议家族 (适用场景)

| 家族 | 典型协议 | SerialCube 支持方式 |
|------|----------|---------------------|
| 户外电源 | BMS (电池管理系统) | ✓ `proto_bms` 内置默认 |
| 户用储能 | EMS (能源管理) / BMS / PCS (储能变流器) | ✓ 自建协议 (9 kind 选) |
| 通信棒模块 | DTU / RTU | ✓ 自建协议 (推荐 `addr-split` 帧) |
| 工业总线 | Modbus RTU | ✓ `proto_modbus` 内置默认 |
| 通用串口设备 | 自定义协议 | ✓ `custom` kind 空白起步 |

---

## 7. 不在本文档 (内部保密)

出于 SerialCube 内部实现保护原则, 以下内容**不对外公开**:

- ❌ 具体字段定义 (字段名 / 类型 / 字节序 / 默认值)
- ❌ CRC 算法细节 (多项式 / 初始值 / 位序)
- ❌ 命令集细节 (命令 id / `dataFields` 字段名)
- ❌ 数据类型库 (`NS.DATA_TYPES` 字段映射)
- ❌ 帧编码 / 解码算法 (`NS.buildFrame` / `NS.parseFrame`)

如需对真设备调试, 请在 SerialCube 内"配置中心 → 协议"按设备说明书手动配.

---

## 8. 关联文档

- 完整协议配置: SerialCube 配置中心 → 协议 Tab (UI 内)
- 9 种 `kind` 默认字段: SerialCube 内部 `NS.KIND_DEFAULTS` (本仓库不开源)
- 用户文档: [`README.md`](./README.md), [`docs/README.md`](./docs/README.md)
- 协议设计 spec: `docs/superpowers/specs/` 目录下的 v1.2.x spec (含协议层架构)
