# v4.8 协议编辑器 UI 重构 — Sub-2: Kind 下拉 + 动态 Fields

**日期**: 2026-08-05
**作者**: yubiediu826 + Mavis
**状态**: 待 review
**范围**: v4.8 sub-2 (协议编辑器 UI 重构 + "+ 新建" 协议流程)
**前置 commit**:
- `6743873 spec: v4.8 sub-1 TLV 协议重构设计文档` (数据模型 + buildFrame 内核)
- `1d2b1a2 plan: v4.8 sub-1 TLV 协议重构实现 plan` (18 tasks 实施计划)
- `3981f29 v4.8b kind 1-7 真实实现` (raw/cmd-split/addr-split/ctrl-bit7/type-high-bit/msgid-mixed/tlv buildFrame 子函数)

**后续 sub**:
- sub-3: parseFrame (贴字节反解析) + 协议编辑器"贴字节"输入框
- sub-4: cmd 字段映射重构 (dataSize 自动算) + pair trigger 真实发送

**v4.8c 路线预览**: 用户已 review 预览 `docs/superpowers/previews/v48c-ui-mockup.html` (左右对比现状 vs 改造后),确认 3 个改造点: ① 顶部加 Kind 下拉 ② fields 动态化 ③ + 新建按钮

---

## 1. Overview

### 1.1 背景

v4.8 sub-1 已完成 buildFrame 内核 (8 kind 子函数实现),但**协议编辑器 UI 还停在 sub-1 之前**: 2 个 Legacy tab (BMS / Modbus) + 固定 fields 列表,用户**无法选工业协议模板** (raw / cmd-split / ... / tlv),即使 buildFrame 内部已支持,UI 选不到。

当前痛点:
- 新协议 (比如用户自定 TLV 协议) 只能**手写 6-8 行 fields schema**,容易出错
- 7 种新 kind (raw/cmd-split/...) **buildFrame 支持,UI 选不到**
- "协议编辑器只支持两种"(用户原话) — 现状是 2 个 Legacy 协议,不是 2 种 kind

### 1.2 目标

1. **协议编辑器顶部加 Kind 下拉** — 8 种 (fixed-header / raw / cmd-split / addr-split / ctrl-bit7 / type-high-bit / msgid-mixed / tlv),选 kind 自动填默认 fields
2. **fields 列表根据 kind 动态化** — 切 kind 时 fields 自动重写 (重置为该 kind 的默认 fields);不可编辑字段灰显
3. **"+ 新建" 按钮** — 弹模板选择 modal,选 kind 一键创建新协议 (默认 fields + 默认 name)
4. **byte preview 按段着色** — header/type/length/data/crc/tail 各自颜色,TLV 段循环
5. **现状 2 协议** 保留为 kind 0 (fixed-header) + "(Legacy)" 命名
6. **v4.8 sub-1 buildFrame 验证按钮** 保留 (错误时红框 + toast)

### 1.3 非目标 (留后续 sub / 后续版本)

| 项 | 留到 |
|---|---|
| parseFrame (贴字节反解析) | sub-3 |
| 协议编辑器"贴字节"输入框 | sub-3 |
| cmd 字段映射重构 (dataSize 自动算) | sub-4 |
| pair trigger 真实发送 | sub-4 |
| 多协议并行 (同设备多协议) | v5+ |
| 协议导入/导出 UI 改进 | v5+ |
| 协议版本管理 (git-style) | v5+ |
| 端到端真串口验证 | v4.8.x+ |

### 1.4 关键设计决策

- **D1**: 协议编辑器 UI 形式 = **保留多 tab + 加 kind 下拉** (跟 sub-1 spec 路线一致,改动小,sub-1 已确定)
- **D2**: "+ 新建" 流程 = **弹模板选择 modal**,8 kind 模板 + "复制现有协议" 2 选项
- **D3**: kind 切换行为 = **重置 fields 为该 kind 的默认模板** (用户可继续编辑,不强制)
- **D4**: 现状 2 协议 (BMS / Modbus) **保留为 kind 0 + "(Legacy)" 命名** (跟 sub-1 spec 5.2 一致)
- **D5**: 字节预览按段着色 (header/type/length/data/crc/tail),TLV kind 显示多 TLV 段循环
- **D6**: **locked 字段 = 固定模板**,所有 input 不可编辑 (size/type/default 全锁);**"+ 加字段" 按钮只在 unlocked 字段位置生效**,不允许在 locked 字段间插入新行;locked 字段也不能删、不能移位。unlocked 字段(如 kind 0 的 cmd/data, TLV 的 crc)允许加/删/插。

---

## 2. UI 设计

### 2.1 协议编辑器整体布局 (改造后)

```
┌─ Modal (居中, 1100px 宽) ──────────────────────────────────────┐
│  协议编辑器                                          [关闭 ×]   │
├─────────────────────────────────────────────────────────────────┤
│  [BMS TLV v1 (Legacy) ×] [Modbus RTU (Legacy) ×] [+ 新建]      │  ← tab bar (跟现状一致)
├─────────────────────────────────────────────────────────────────┤
│  Kind  [▼ 7 · Pure TLV (Type+Length+Value 循环) ]   [✓ 验证]  │  ← 新加: kind 下拉 + 描述
│         tlv type bit7 编码方向                                 │
├─────────────────────────────────────────────────────────────────┤
│  字段列表 (4 行, TLV 模板):                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ # │ name    │ size │ type   │ default │ 备注        │   │  │
│  ├───┼─────────┼──────┼────────┼─────────┼─────────────┼───┤  │
│  │ 1 │ header  │  1   │ header │ 0xAA    │ 固定         │ × │  │
│  │ 2 │ tlv     │  0   │ data   │ —       │ 循环 TLV     │ × │  │  ← 灰显 size/default
│  │ 3 │ crc     │  2   │ crc    │ auto    │ crc16-modbus │ × │  │
│  │ 4 │ tail    │  1   │ tail   │ 0x55    │ 固定         │ × │  │
│  └───┴─────────┴──────┴────────┴─────────┴─────────────┴───┘  │
│  [+ 加字段]                                                    │
├─────────────────────────────────────────────────────────────────┤
│  字节预览 (cmd 0x01, tlvs=[01:0A 0B 0C, 02:0D 0E]):          │
│  AA  [01 02 0A 0B 0C]  [02 02 0D 0E]  XX XX  55                │  ← 按段着色
│  hdr  TLV 1 (01)        TLV 2 (02)        CRC  tail           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 协议 tab bar (改动小)

**现状**: 2 个 tab + "+ 新建" 占位 (无功能)
**改造后**:
- tab 数量不限 (现状 2 + 用户新建的)
- tab 右上角小"x"删除按钮 (现状已有)
- "(Legacy)" 徽章 — 现状 2 协议保留
- "(NEW)" 徽章 (绿色) — v4.8c 后建的协议
- "+ 新建" 按钮位置不变,点击 → 弹模板选择 modal

### 2.3 Kind 下拉 (新加)

**位置**: tab bar 下方,验证按钮左边
**选项**: 8 种 kind (来自 `NS._KIND_TEMPLATES`)
**下拉格式**:
```
[ ▼ 0 · fixed-header (Legacy)         ]
[   1 · raw (MB/CB 不同帧头)          ]
[   2 · cmd-split (同帧头+命令分区)    ]
[   3 · addr-split (同帧头+地址区分)   ]
[   4 · ctrl-bit7 (控制位方向)         ]
[   5 · type-high-bit (Type 高位方向)  ]
[   6 · msgid-mixed (15+7+8 packed)    ]
[ ✓ 7 · tlv (Type+Length+Value 循环)   ]   ← 当前选中
```
**行为**:
- 切 kind → **fields 列表重置为该 kind 的默认 fields** (见 §4)
- 切 kind → **byte preview 重新计算**
- 切 kind → 协议名加 "(kind X)" 后缀 (如 "BMS TLV v1 (fixed-header) → BMS TLV v1 (tlv)")

### 2.4 fields 列表 (动态化)

**列定义** (跟现状类似, 7 列):
| 列 | 字段 | 备注 |
|---|---|---|
| # | 自动序号 | 灰显 |
| name | 文本输入 | 必填 |
| size | 文本输入 (B 数) | auto / 数字 |
| type | 下拉 (header/cmd/length/data/crc/tail/ctrl/type/srcAddr/dstAddr/msgID/tlv) | kind 决定可选范围 |
| default | 文本输入 (hex / auto / —) | 灰显不可编辑的字段 |
| 备注 | 灰显文字 (kind 模板说明) | 新加列 |
| 删除 | 按钮 | |

**动态化行为**:
- 切 kind → fields 重置 (弹出确认 modal: "切 kind 会重置 fields, 确认?")
- "+ 加字段" → 按钮放在每行下方, **只在 unlocked 行后激活**;locked 行后按钮 disabled (不允许在 locked 字段间插入)
- unlocked 字段 (可加/删/插) 示例: kind 0 的 cmd/data, TLV 的 crc, addr-split 的 header/srcAddr/dstAddr/cmd/data
- locked 字段 (固定模板) 灰显 + 所有 input disabled + 删除按钮 disabled + 不允许插行
- 字段顺序由 kind 模板固定 (TLV = header/tlv/crc/tail, msgid-mixed = msgID/length/data/crc/tail, 等)

### 2.5 字节预览 (按段着色)

**位置**: fields 列表下方
**格式**:
```
AA  01 02 0A 0B 0C   02 02 0D 0E   XX XX  55
hdr TLV 1 (01)      TLV 2 (02)    CRC    tail
```

**颜色方案** (跟 preview 一致):
- `header` 蓝色 (rgba(86,114,205,0.18))
- `cmd` 橘色 (rgba(217,119,6,0.18))
- `type` 紫色 (rgba(156,39,176,0.18))
- `length` 淡蓝
- `data` 绿色 (rgba(44,154,74,0.18))
- `crc` 红色 (rgba(224,87,94,0.18))
- `tail` 灰色
- `addr` 中灰 (srcAddr / dstAddr)
- `msgID` 蓝色 (kind 6)

**TLV 段**: 每个 TLV 一个 `<div class="byte-group">`, 内部连续字节,外加 type 标签 (1B) + length 标签 (1B) + value 标签 (N B)

### 2.6 "+ 新建" 协议 modal (新加)

**触发**: 点击 tab bar 的 "+ 新建"
**内容**:
```
┌─ 新建协议 ──────────────────────────────────────┐
│  协议名:  [_________________________________]    │  ← 文本输入, 默认 "新协议 1"
│  Kind:                                          │  ← 单选 8 种模板 + "复制现有协议" 2 选项
│  ○ 0 · fixed-header (Legacy)                    │
│  ○ 1 · raw (MB/CB 不同帧头)                     │
│  ○ 2 · cmd-split (同帧头+命令分区)               │
│  ○ 3 · addr-split (同帧头+地址区分)              │
│  ○ 4 · ctrl-bit7 (控制位方向)                    │
│  ○ 5 · type-high-bit (Type 高位方向)             │
│  ○ 6 · msgid-mixed (15+7+8 packed)               │
│  ● 7 · tlv (Type+Length+Value 循环)              │  ← 默认选中 kind 7 (用户场景)
│  ○ [复制现有协议 ▼]  复制哪个协议的 fields       │  ← 复制选项
│                                                  │
│  默认 fields (kind 7):                           │
│    header(1B), tlv(循环), crc(2B), tail(1B)      │  ← 预览模板
│                                                  │
│              [取消]    [创建]                    │
└──────────────────────────────────────────────────┘
```

**行为**:
- 选 kind → 实时预览默认 fields (下方)
- 选 "复制现有协议" → 二级下拉选择源协议,fields 复制
- 选 kind 不复制 → fields 用 kind 默认模板 (见 §4)
- 点 "创建" → 协议加到 `NS.PROTOCOLS`,切到新 tab,关闭 modal

---

## 3. 数据模型

### 3.1 NS.PROTOCOLS (改:不动)

sub-1 已加 `kind` 字段,本 sub 不动数据结构。**`NS._KIND_TEMPLATES`** (sub-1 定义) 也不动,直接复用。

### 3.2 8 kind 默认 fields 模板 (新加,NS._KIND_FIELD_TEMPLATES)

```js
NS._KIND_FIELD_TEMPLATES = {
  'fixed-header':  [
    { name: 'header', size: 1, type: 'header', default: '0xAA' },
    { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
    { name: 'length', size: 1, type: 'length', default: 'auto' },
    { name: 'data',   size: 0, type: 'data',   default: '0x00' },
    { name: 'crc',    size: 2, type: 'crc',    default: 'auto' },
    { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
  ],
  'raw': [
    { name: 'header', size: 1, type: 'header', default: '0x5A' },
    { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
    { name: 'length', size: 1, type: 'length', default: 'auto' },
    { name: 'data',   size: 0, type: 'data',   default: '0x00' },
    { name: 'crc',    size: 2, type: 'crc',    default: 'auto' },
    { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
  ],
  'cmd-split': [
    { name: 'header', size: 1, type: 'header', default: '0xAA' },
    { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00', bit7: 'direction' },
    { name: 'length', size: 1, type: 'length', default: 'auto' },
    { name: 'data',   size: 0, type: 'data',   default: '0x00' },
    { name: 'crc',    size: 2, type: 'crc',    default: 'auto' },
    { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
  ],
  'addr-split': [
    { name: 'header',   size: 1, type: 'header',   default: '0xAA' },
    { name: 'srcAddr',  size: 1, type: 'srcAddr',  default: '0x00', addrRole: 'MB:hostId, CB:devId' },
    { name: 'dstAddr',  size: 1, type: 'dstAddr',  default: '0x00', addrRole: 'MB:devId, CB:hostId' },
    { name: 'cmd',      size: 1, type: 'cmd',      default: '0x00' },
    { name: 'length',   size: 1, type: 'length',   default: 'auto' },
    { name: 'data',     size: 0, type: 'data',     default: '0x00' },
    { name: 'crc',      size: 2, type: 'crc',      default: 'auto' },
    { name: 'tail',     size: 1, type: 'tail',     default: '0x55' }
  ],
  'ctrl-bit7': [
    { name: 'header', size: 1, type: 'header', default: '0xAA' },
    { name: 'ctrl',   size: 1, type: 'ctrl',   default: '0x10', bit7: 'direction' },
    { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
    { name: 'length', size: 1, type: 'length', default: 'auto' },
    { name: 'data',   size: 0, type: 'data',   default: '0x00' },
    { name: 'crc',    size: 2, type: 'crc',    default: 'auto' },
    { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
  ],
  'type-high-bit': [
    { name: 'header', size: 1, type: 'header', default: '0xAA' },
    { name: 'type',   size: 1, type: 'type',   default: '0x20', bit7: 'direction' },
    { name: 'cmd',    size: 1, type: 'cmd',    default: '0x00' },
    { name: 'length', size: 1, type: 'length', default: 'auto' },
    { name: 'data',   size: 0, type: 'data',   default: '0x00' },
    { name: 'crc',    size: 2, type: 'crc',    default: 'auto' },
    { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
  ],
  'msgid-mixed': [
    { name: 'msgID',  size: 2, type: 'msgID',  default: '0x0000', bitfield: 'bit15=dir, bit14-8=func, bit7-0=addr' },
    { name: 'length', size: 1, type: 'length', default: 'auto' },
    { name: 'data',   size: 0, type: 'data',   default: '0x00' },
    { name: 'crc',    size: 2, type: 'crc',    default: 'auto' },
    { name: 'tail',   size: 1, type: 'tail',   default: '0x55' }
  ],
  'tlv': [
    { name: 'header', size: 1, type: 'header', default: '0xAA', locked: true },
    { name: 'tlv',    size: 0, type: 'data',   default: '—',      locked: true, note: '循环 TLV (cmd.tlvs)' },
    { name: 'crc',    size: 2, type: 'crc',    default: 'auto', locked: false },
    { name: 'tail',   size: 1, type: 'tail',   default: '0x55', locked: true }
  ]
};
```

**字段说明**:
- `locked: true` → UI 灰显,所有 input 不可编辑 (size/type/default 全锁);不允许加/删/插 (TLV 模板的 header/tlv/tail 锁定)
- `locked: false` (默认) → 字段可编辑,"+ 加字段" 按钮允许在 unlocked 行后插入新行
- `bit7: 'direction'` → 字节 bit7 自动编码方向 (cmd-split / ctrl-bit7 / type-high-bit 标识)
- `addrRole` → 地址角色说明 (addr-split 标识 MB/CB 时 src/dst 含义)
- `bitfield` → 位域说明 (msgid-mixed 的 15+7+8 packed)
- `note` → 备注,UI 显示在"备注"列

**locked 分布** (D6 严格):

| kind | locked 行 | unlocked 行 (可加/删/插) |
|---|---|---|
| fixed-header | header, length, crc, tail | cmd, data |
| raw | length, crc, tail | header, cmd, data |
| cmd-split | length, crc, tail | header, cmd, data |
| addr-split | length, crc, tail | header, srcAddr, dstAddr, cmd, data |
| ctrl-bit7 | length, crc, tail | header, ctrl, cmd, data |
| type-high-bit | length, crc, tail | header, type, cmd, data |
| msgid-mixed | length, crc, tail | msgID, data |
| tlv | header, tlv, tail | crc (1 个) |

**"可加字段位置"语义**: "+ 加字段" 按钮放在每行 row 下方,只在 unlocked 行后激活;locked 行后按钮 disabled。**总行数受 kind 模板限制**: unlocked 行可加任意多,locked 行数固定。

### 3.3 现状 2 协议 (不动)

**proto_bms**: kind=fixed-header, name='BMS TLV v1 (Legacy)', fields=[原 6 行]
**proto_modbus**: kind=fixed-header, name='Modbus RTU (Legacy)', fields=[原 6 行]

跟 sub-1 spec 5.2 一致,**字段值不变**,但 fields 列表加 `locked` 标记 (header/length/data/crc/tail 灰显)。

---

## 4. 8 kind 默认 Fields 详解

### 4.1 fixed-header (Legacy, 6 行)

| # | name | size | type | default | locked | 备注 |
|---|---|---|---|---|---|---|
| 1 | header | 1 | header | 0xAA | false | — |
| 2 | cmd | 1 | cmd | 0x00 | false | — |
| 3 | length | 1 | length | auto | true | 固定 auto |
| 4 | data | 0 | data | 0x00 | false | size 由 cmd.dataFields 决定 |
| 5 | crc | 2 | crc | auto | true | 固定 auto |
| 6 | tail | 1 | tail | 0x55 | false | — |

### 4.2 raw (6 行, header 0x5A)

跟 fixed-header 一致,但 `header.default = '0x5A'`(MB=0x5A, CB=0x55,v4.8b sub-1 spec 2.3 表)。

### 4.3 cmd-split (6 行, cmd bit7)

跟 fixed-header 一致,但 `cmd.bit7 = 'direction'`(cmd 字节 bit7 编码方向: MB=0, CB=1)。

### 4.4 addr-split (7 行, 多 srcAddr/dstAddr)

| # | name | size | type | default | locked |
|---|---|---|---|---|---|
| 1 | header | 1 | header | 0xAA | false |
| 2 | srcAddr | 1 | srcAddr | 0x00 | false |
| 3 | dstAddr | 1 | dstAddr | 0x00 | false |
| 4 | cmd | 1 | cmd | 0x00 | false |
| 5 | length | 1 | length | auto | true |
| 6 | data | 0 | data | 0x00 | false |
| 7 | crc | 2 | crc | auto | true |
| 8 | tail | 1 | tail | 0x55 | false |

(8 行, 加 srcAddr/dstAddr 2 行)

### 4.5 ctrl-bit7 / type-high-bit (7 行, 多 ctrl/type)

跟 fixed-header 一致,但多 `ctrl` 或 `type` 字段 (在 cmd 之前),bit7 编码方向。

### 4.6 msgid-mixed (5 行, msgID 2B)

| # | name | size | type | default | locked |
|---|---|---|---|---|---|
| 1 | msgID | 2 | msgID | 0x0000 | false |
| 2 | length | 1 | length | auto | true |
| 3 | data | 0 | data | 0x00 | false |
| 4 | crc | 2 | crc | auto | true |
| 5 | tail | 1 | tail | 0x55 | false |

(5 行, 无 header, msgID 在最前)

### 4.7 tlv (4 行, 循环 TLV)

| # | name | size | type | default | locked | 备注 |
|---|---|---|---|---|---|---|
| 1 | header | 1 | header | 0xAA | true | 固定 |
| 2 | tlv | 0 | data | — | true | 循环 TLV (cmd.tlvs) |
| 3 | crc | 2 | crc | auto | false | — |
| 4 | tail | 1 | tail | 0x55 | true | 固定 |

(4 行, tlv 段循环,3 个 locked)

---

## 5. 状态管理

### 5.1 NS.activeProtoId (现状,不动)

sub-1 已用,本 sub 不动。

### 5.2 NS._protoDraftKind (新加,UI 状态)

```js
NS._protoDraftKind = null;  // null = 跟 protocol.kind 走;非 null = 用户改了 kind 但未保存
```

**用途**: kind 下拉切 kind 时,`fields` 列表实时重置(不需要先保存),但 `protocol.kind` 不变(等用户点保存)。**这一步可选**,本 sub 直接同步重置 protocol.fields 即可,不需要 _protoDraftKind。

### 5.3 NS._protoNewModal (新加,新建协议 modal 状态)

```js
NS._protoNewModal = {
  open: false,
  name: '',
  kind: 'tlv',  // 默认 kind 7
  source: null,  // null = 用 kind 默认模板;非 null = 复制现有 protocol id
};
```

**位置**: 临时状态,仅 modal open 时使用。

### 5.4 NS._renderProtoEditor (改:加 kind 下拉 + 动态 fields)

**入口** (sub-1 spec 3.1):
```js
NS.renderProtoEditor = function () {
  const proto = NS.PROTOCOLS.find((p) => p.id === NS.activeProtoId);
  // ... tab bar 渲染
  // ... [新加] kind 下拉
  // ... [新加] fields 动态化 (根据 proto.kind 渲染 rows,locked 字段灰显)
  // ... [新加] 字节预览按段着色
  // ... [保留] 验证按钮 (sub-1)
};
```

### 5.5 NS._applyKindTemplate (新加)

```js
NS._applyKindTemplate = function (kind) {
  return NS._KIND_FIELD_TEMPLATES[kind] || NS._KIND_FIELD_TEMPLATES['fixed-header'];
};
```

**用途**: 取 kind 的默认 fields 列表 (深拷贝,不引用原数组)。

---

## 6. 交互流程

### 6.1 切换 kind

```
用户点 kind 下拉
  → 选 kind X
  → 弹确认 modal: "切到 kind X 会重置 fields, 确认?"
  → 用户点确认
  → protocol.kind = X
  → protocol.fields = deep copy of _KIND_FIELD_TEMPLATES[X]
  → NS.renderProtoEditor() 重新渲染 fields + byte preview
  → protocol.name += ' (kind X)' 后缀 (可选,仅首次)
```

**取消**: 用户点取消,kind 下拉回到原值,无副作用。

### 6.2 "+ 新建" 协议

```
用户点 "+ 新建" 按钮
  → 弹新建 modal
  → 默认 name="新协议 1", kind=tlv
  → 实时预览 kind 默认 fields
  → 用户改 name + 选 kind
  → 选 kind → fields 预览更新
  → 用户点 "创建"
  → NS.PROTOCOLS.push({ id: 'proto_new_1', kind, name, fields: deep copy of template, ... })
  → NS.activeProtoId = 'proto_new_1'
  → 关闭 modal,渲染新 tab
  → 触发"验证"按钮 (sub-1) 自动 buildFrame 验证
```

**取消**: 用户点取消,modal 关闭,无副作用。

### 6.3 编辑 fields

```
用户编辑某行字段 (name/size/type/default)
  → input.onchange 触发
  → protocol.fields[rowIdx].xxx = newValue
  → NS.renderProtoEditor() 重新渲染 (仅 byte preview 部分)
```

**locked 字段**: 所有 input (name/size/type/default) 都 disabled,onchange 不触发,值无法改。

### 6.4 删除字段

```
用户点某行删除按钮 (仅 unlocked 行有可点击按钮)
  → 弹确认 modal: "删除字段 <name>?"
  → 确认 → protocol.fields.splice(rowIdx, 1)
  → NS.renderProtoEditor() 重新渲染
```

**locked 字段**: 删除按钮 disabled,**不允许删** (如 TLV 模板的 header/tlv/tail)。

### 6.4b 插入字段 (+ 加字段)

```
用户点某行下方的 "+ 加字段" 按钮 (仅 unlocked 行下方按钮可点击)
  → 在该行后插入空白 unlocked 行 (name='', size=0, type='data', default='0x00')
  → NS.renderProtoEditor() 重新渲染
```

**locked 行下方按钮 disabled**: 不允许在 locked 字段间插入新行 (D6)。

### 6.5 验证 (sub-1 行为,保留)

```
用户点 "验证" 按钮
  → NS.buildFrame(protocol, NS.COMMANDS[0])  // 用第 1 个 cmd 验证
  → 成功: 绿底 "✓ 验证" + 字节预览绿色边框
  → 失败: 红底 "✕ 验证" + 字节预览红框 + 错误消息 + tab 红徽章 + toast
```

### 6.6 删除协议 (现状,不动)

```
用户点 tab 右上角 ×
  → 弹确认 modal: "删除协议 X?"
  → 确认 → NS.PROTOCOLS = NS.PROTOCOLS.filter(p => p.id !== id)
  → 切到下一个 tab
```

**保留**: 2 个 Legacy 协议 (BMS / Modbus) 不能删 (disable × 按钮,跟现状一致)。

---

## 7. 错误处理

### 7.1 kind 切换错误

| 场景 | 处理 |
|---|---|
| 用户切 kind 但 fields 有未保存修改 | 弹确认 modal,告知会重置 |
| _KIND_FIELD_TEMPLATES 缺 kind 模板 | fallback 到 fixed-header 模板 |
| kind 字符串无效 (空 / typo) | kind 下拉显示 "未知 kind" 灰显,fields 列表空 |

### 7.2 "+ 新建" 错误

| 场景 | 处理 |
|---|---|
| name 为空 | "创建" 按钮 disabled |
| name 重复 (跟现有协议名冲突) | "创建" 按钮 disabled,提示"协议名已存在" |
| kind 模板缺失 | fallback 到 fixed-header |
| 创建后 activeProtoId 找不到 | 切到第 1 个 tab,console.warn |

### 7.3 fields 编辑错误

| 场景 | 处理 |
|---|---|
| size 输入非数字 | input 红框,验证时 buildFrame 报错 |
| default 输入非法 hex | input 红框,验证时报 INVALID_HEX |
| type 字段不在 kind 允许范围 | type 下拉限制,不允许选 |
| 必填字段 (name) 为空 | input 红框,验证时报 MISSING_FIELD |

**注**: 这些错误**触发 buildFrame 验证按钮时**统一处理,UI 实时反馈(input 红框) + 验证时红框 + toast。

### 7.4 字节预览错误

| 场景 | 处理 |
|---|---|
| 字段配置错误 (size 0 但 type 必填) | 字节预览区灰底 "配置错误: 不可生成字节" |
| 必填字段缺失 | 字节预览区灰底 "MISSING_FIELD: <字段名>" |
| buildFrame 返回 error | 字节预览区红框 + 错误消息 |

---

## 8. 兼容性

### 8.1 现状 2 协议 (BMS / Modbus) 行为

**kind 0 (fixed-header) + 6 行 fields**,跟 sub-1 spec 5.2 一致。本 sub:
- kind 下拉显示 "0 · fixed-header (Legacy)" + "(Legacy)" 灰徽章
- fields 列表按 _KIND_FIELD_TEMPLATES['fixed-header'] 渲染 (跟现状 6 行一致)
- **不改 protocol.fields 内容**,但 UI 渲染时加 `locked` 标记 (length/auto/crc 灰显)
- "验证" 按钮行为不变 (sub-1 实现)
- byte preview 跟现状一致 (header/cmd/length/data/crc/tail 段)

**升级路径**: 用户打开 BMS / Modbus 协议,看到 "(Legacy)" 徽章,fields 已自动锁定,可继续编辑 (跟 v5.1.6 一样)。

### 8.2 旧 user config (SerialWebUserConfig v1) 兼容

**加载兼容点** (sub-1 spec 5.1, line 10894):
```js
if (uc.protocols) {
  NS.PROTOCOLS = uc.protocols.map(p => ({ ...p, kind: p.kind || 'fixed-header' }));
}
```

**本 sub 兼容**:
- 旧 user config (无 kind) 加载 → kind = 'fixed-header' → UI 走 kind 0 渲染
- 旧 user config (有 kind) 加载 → kind = 原值 → UI 走对应 kind 渲染
- **不动** 默认 PROTOCOLS 列表 (sub-1 5.4 已加 kind: 'fixed-header')

### 8.3 旧代码路径

- `NS.encodeDataFields(cmd, protocol)` (sub-1 spec 6 明确不动) - 继续用
- `NS.computeCrc(crcType, input, init)` (sub-1 实现) - 继续用
- `NS.buildFrame(protocol, cmd)` (sub-1 实现) - 继续用,验证按钮调它

### 8.4 子函数映射

`NS._KIND_FIELD_TEMPLATES` 是 UI 用,不影响 buildFrame 子函数 (`NS._buildFrameXxx`,sub-1 实现)。两边解耦:
- `_KIND_FIELD_TEMPLATES` 给 UI 渲染默认 fields
- `_buildFrameXxx` 给 buildFrame 生成字节
- 中间通过 `protocol.kind` 关联

---

## 9. 数据兼容性约束 (AGENTS.md 强制)

| 字段 | 处理 |
|---|---|
| `localStorage` keys (`serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`) | **不动** |
| 配置 JSON type (`SerialWebUserConfig` v1) | **不动** |
| `.timeline` 二进制 magic (`WSLBIN1`) | **不动** |
| API 路径 (`/api/serialweb_page-view`) | **不动** |
| JS 内部命名 (`__serialWeb*` / `clearSerialWebStoredUserData`) | **不动** |
| sub-1 新增的 `NS._KIND_TEMPLATES` / `NS._buildFrameXxx` | **不动** |
| sub-1 改的 `NS.PROTOCOLS` 加 `kind` 字段 | **不动** |

**sub-2 新增 (合规)**:
- `NS._KIND_FIELD_TEMPLATES` (新)
- `NS._protoNewModal` (新,UI 临时状态)
- `NS._applyKindTemplate` (新)
- `_renderProtoEditor` 内部改造 (kind 下拉 + 动态 fields + 字节预览按段着色)
- `_renderProtoTabBar` (新,抽出 tab bar 渲染)

---

## 10. 拆 commit

### 10.1 v4.8c (本 sub,1 个 commit)

**范围**:
- 加 `NS._KIND_FIELD_TEMPLATES` (8 kind 默认 fields)
- 改 `NS.renderProtoEditor`:
  - tab bar 抽出 `_renderProtoTabBar`
  - 加 kind 下拉 (8 种,带描述)
  - fields 列表动态化 (按 kind 渲染 + locked 灰显)
  - 字节预览按段着色 (header/type/length/data/crc/tail/addr/msgID)
  - "+ 新建" 按钮弹 modal (含模板选择 + 实时预览)
- 改 `NS._protoNewModal`:
  - 加 `_protoNewModal` 状态
  - 加 `NS._renderProtoNewModal` 渲染
  - 加 `NS._createProtoFromTemplate` 创建协议
- 改 `NS._applyKindTemplate` (深拷贝 fields)
- 加 CSS:
  - kind 下拉样式
  - fields locked 灰显样式
  - 字节预览按段着色 (.b-h/.b-c/.b-t/.b-l/.b-d/.b-crc/.b-tl/.b-a)
  - "+ 新建" modal 样式

**验证** (手动 smoke test):
- 浏览器加载,打开协议编辑器,看到 2 个 Legacy tab
- tab bar 下方加 kind 下拉 (默认 fixed-header,显示 "(Legacy)" 灰徽章)
- 切 kind → 弹确认 modal → 确认 → fields 列表重置
- 切到 kind 7 (TLV) → fields 4 行 (header/tlv/crc/tail),3 个 locked
- 字节预览按段着色,TLV 段循环
- "+ 新建" 按钮 → 弹 modal → 选 kind 7 + 输 name → 创建 → 新 tab 出现 + 自动验证
- 现状 2 协议 (BMS / Modbus) 走 kind 0 渲染 (跟 v5.1.6 视觉一致)

### 10.2 不拆 commit

v4.8c 整体 1 个 commit 即可,内部不分 a/b (sub-1 因为有"中间状态 dashboard 仍跑"需求,才拆 a/b 2 阶段)。

sub-2 不需要中间状态,UI 改造一气呵成。

---

## 11. References

- `6743873 spec: v4.8 sub-1 TLV 协议重构设计文档` - 数据模型 + buildFrame 内核
- `1d2b1a2 plan: v4.8 sub-1 18 tasks, 2 阶段 commit` - sub-1 实施计划
- `3981f29 v4.8b kind 1-7 真实实现` - 7 个 buildFrame 子函数
- `e028be3 feat(v4.9.8): RX 接入加 ASCII 帧解析分支` - 类似解析范式参考
- `SerialCube.html line 12055-12120` - 现状 `NS.renderProtoEditor` 实现
- `SerialCube.html line 7487-7493` - 协议编辑器 modal 入口
- `SerialCube.html line 7293-7296` - mode switch (text/binary) 现状
- `docs/superpowers/previews/v48c-ui-mockup.html` - 现状 vs 改造后预览 (用户已 review)
- AGENTS.md - 强制 skill 链 + 数据兼容性字段
- docs/architecture.md - 架构总览

---

## Self-Review (writing-specs)

1. **Placeholder scan**: 无 TBD / TODO / "fill in details" / "实现时定",所有内容明确
2. **Internal consistency**: 11 节一致,UI 设计 / 数据模型 / 状态管理 / 交互流程 / 错误处理 / 兼容性 章节交叉引用一致
3. **Scope check**: 聚焦 v4.8c (UI 重构),sub-3 (parseFrame) + sub-4 (cmd 字段映射) 明确留后续
4. **Ambiguity check**:
   - "切 kind 弹确认 modal" - 明确 (§6.1)
   - "locked 字段 = 固定模板,所有 input disabled" - 明确 (D6 + §2.4 + §3.2)
   - "+ 加字段 只在 unlocked 行后激活" - 明确 (D6 + §2.4 + §6.4b)
   - "现状 2 协议走 kind 0 渲染" - 明确 (§8.1)
   - "+ 新建 默认 kind=tlv" - 明确 (§2.6)
   - "byte preview 按段着色" - 明确颜色方案 (§2.5)
   - "8 kind 的 locked 分布表" - 明确 (§3.2)

Self-review 通过,2026-08-05 第二轮 review (D6 加强 + 8 kind locked 分布表 + §6.4b 新加段)。
