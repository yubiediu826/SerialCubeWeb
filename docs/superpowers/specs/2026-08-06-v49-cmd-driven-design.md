# v4.9 协议编辑器 — Profile + Command 两层架构

**日期**: 2026-08-06
**作者**: yubiediu826 + Mavis
**状态**: ✅ Q1-Q5 已锁定,实施中
**Review 记录**:
- 2026-08-06 用户确认 5 个开放问题(Q1-Q5)
- 7.2 已更新为决策表
**范围**: v4.9 协议编辑器全量重构(Profile + Command 两层 + 12 块 UI 改进)
**前置 commit**:
- `db60879 v4.8d parseFrame 通用化 + 贴字节输入` (frame 解析对称,8 kind 闭环)
- `c80464d docs: VERSION 同步 v6.5`
- v4.8a/b/c/d: 8 kind 模板 + 字段类型 + UI 重构

**配套 mockup**:
- v4 评审版: `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v4-mockup.html`
- v5 人性化补丁: `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v5-mockup.html`

**后续 sub**:
- v4.9.1: 仪表盘绑定实际生效(parseFrame → dashboard 实时刷新)
- v4.9.2: 多协议并行(同设备多协议)
- v5+ : 跨设备方案同步

---

## 1. Overview

### 1.1 背景

v4.8d 已经把 **frame 内核** 完整闭环:
- 8 kind 模板 (`NS._KIND_TEMPLATES`)
- 8 个 `_buildFrameXxx` + 8 个 `_parseFrameXxx` + 双 dispatcher
- 协议编辑器"贴字节"输入(反向解析)

但 **协议编辑器作为工具** 还停留在 v4.7 形态,核心问题是 **"协议"和"命令"概念混淆**:

| 现状问题 | 后果 |
|---|---|
| 协议详情里同时有 帧字段/数据字段/命令列表 | 用户切一种协议,得在 3 处地方来回改 |
| 协议详情里塞 帧字段定义(其实是 kind 模板) | 8 kind 各有差异,展示出来用户也改不了(locked),徒增噪音 |
| "协议详情" = 一大坨配置 | 找命令要滚轮;删一个字段影响谁?不知道 |
| 新建协议只能从 8 kind 选 | 已有"户外电源 BMS"协议时,"户外电源 控制"协议 80% 字段相同,要从零输 |
| 字段定义每次手敲类型/单位/换算 | 嵌入式高频字段(温度/电压/电流)每次都填 |
| 删除只问"你确定吗" | 协议被 3 个 dashboard 引用,删完引用全坏 |
| 导入直接生效,不可逆 | 选完粒度就导入,出问题没法回退 |
| 命令多了找不到 | 全靠鼠标滚轮,没有搜索/快捷键 |
| 第一次打开是空的 | "你还没有方案" → 用户走人 |

v4.8d 后所有"硬骨头"(frame 解析/字段类型/byte order)都已解决,v4.9 的重点是 **把这个工具从"能跑"变成"好用"**。

### 1.2 目标

**1) 架构目标:Profile + Command 两层分离**
- **Profile** = 极简 3 项(name + kind + CRC),是协议的"壳"
- **Command** = 自管的字段池 + 触发配置 + 仪表盘绑定,所有"内容"都在命令里
- 帧字段 = kind 模板,locked,只在命令 modal 的"帧预览"里可见
- 数据字段 = command 级别,每个命令有自己的字段池,**不跨命令共享**

**2) UX 目标:打开就能用 + 失误能救 + 找东西快**

| 改进 | 解决什么 |
|---|---|
| Step 0 入口选择(空白/复制/模板) | 80% 复制场景 30 秒搞定 |
| 9 个嵌入式字段预设 | 温度/电压/电流/SOC 等点一下带单位换算 |
| 方案统计 + 标签 + 引用关系 | 方案"有体温",一眼看到长啥样被谁用 |
| 3-tier 删除 + 影响分析 | 删前知道影响谁,删后能撤销 |
| 操作历史(30 天) + 回收站 | 误删误改有救 |
| 导入前 diff + 错误精确定位 | 不再"导入完才发现" |
| Ctrl+F 全局搜索 + 12 快捷键 | 命令多了也找得到 |
| 空状态 3 步引导 | 新用户不迷路 |

**3) 兼容性目标:不破坏已落盘数据**
- `localStorage:serialweb:prefs` 不动
- `.timeline` 二进制 magic `WSLBIN1` 不动
- `SerialWebUserConfig` type 字符串保持,内部结构 v1 → v2 升级
- API 路径 `/api/serialweb_page-view` 不动
- JS 内部命名 `__serialWeb*` / `clearSerialWebStoredUserData` 不动

### 1.3 非目标 (v4.9 不做)

| 项 | 留到 |
|---|---|
| 仪表盘实际渲染(parseFrame → dashboard 实时刷新) | v4.9.1 |
| 多协议并行(同串口多协议) | v4.9.2 |
| 协议版本控制(方案内命令历史回滚) | v5+ |
| 跨设备方案同步(Git/云) | v5+ |
| 协议模板社区化(用户上传/下载) | v5+ |
| AI 自动生成命令(从抓包字节反推字段定义) | v5+ |
| 协议 simulator(纯软件模拟设备响应) | v5+ |

### 1.4 关键设计决策

**D1: Profile = 极简 3 项 + 标签 + 统计元数据**
- 业务字段:name + kind + CRC(3 项,锁定极简,用户改不了帧字段/数据字段/命令)
- 扩展字段:tags(数组) + stats(派生,运行时算,不存) + createdAt + updatedAt
- 不存 frames(帧字段是 kind 模板,运行时从 `NS._KIND_TEMPLATES` 取)

**D2: Command 自管字段池,不跨命令共享**
- 每个 command 内部维护自己的 `fields[]` 数组
- 删除 command 不会影响其他 command 的字段
- 复制 command 字段独立(深拷贝)
- 字段命名建议全局唯一性检查(避免 dashboard 引用歧义),不强制

**D3: 数据模型 v1 → v2 平滑升级**
- v1 字段全部保留(`protocols[]` 转为 v2 内部表示)
- v1 字段含义解读:`protocol.fields`(协议级)→ 迁移到 v2 的"每个 command 自带一个默认 cmd 的 fields",**保留语义不丢失**
- v1 字段 `protocol.fields`(顶部"协议级字段")→ v2 移到"第一个命令"作为兜底
- v1 没有 commands 概念 → v2 兜底为 `[{ name: 'default', fields: protocol.fields, ... }]`
- 迁移一次性,标记 `_migrated: 'v1-to-v2'`,再次加载不再重复迁移

**D4: 仪表盘绑定是 command 级别,profile 不参与**
- 绑定关系存在 `command.dashboardBindings: [{ cardId, fieldNames, format }]`
- profile 不存 dashboard 引用(避免 profile 改动级联)
- 删除 command 时联动删 dashboard bindings(影响分析里列出来)

**D5: 操作历史 = 30 天 rolling window,落 localStorage**
- 记录:operation type(增/删/改/导入/导出) + 对象 ref(profile/command/field) + 旧值/新值 + timestamp
- 不记录高频操作(拖拽字段顺序、临时输入),只记录"落盘"动作
- 30 天前自动清理(LRU)
- 恢复 = 把历史条目的旧值写回(只支持简单的增/删,复杂的"改"恢复整个对象)

**D6: 导入 = diff + 备份 + 确认,3 步不可跳**
- Step 1:解析文件,展示文件内 方案/命令/字段 清单
- Step 2:diff 现有 vs 文件(新增/修改/重名/冲突),用户勾选
- Step 3:自动备份当前 config 到操作历史,然后按用户选择合并
- 任一步不通过就不动用户数据

**D7: 字段预设 = 内置 + 用户自定义**
- 内置 9 个(温度/电压/电流/功率/SOC/频率/字节/时间戳/状态字) → 写在代码常量
- 用户自定义 = 选字段后点"保存为预设" → 存到 localStorage 的独立 key
- 预设内容:{ name, type, byteOrder, scale, unit, format }

**D8: 全局搜索 = 客户端内存索引,启动时构建**
- 索引字段:name + kind + tag + field name + last modified timestamp
- 100 方案/1000 命令规模下 < 10ms 响应
- 搜索结果按类型分组(方案/命令/字段/标签/历史)

**D9: 快捷键 = 12 个核心动作,Esc 优先,Ctrl 修饰为主**
- 全局 6 个:打开搜索 / 新建 / 导入 / 导出 / 保存 / 切主题
- 方案内 6 个:新建命令 / 编辑方案 / 删除方案 / 加字段 / 移字段 / 反向解析
- modal 内统一 Esc 关闭,Ctrl+S 保存

**D10: 空状态引导 = 3 步可视化,不弹窗不打断**
- 主视图空:展示 3 步流程(选 kind → 配 CRC → 加命令)
- 搜索无结果:展示"试试这些"建议
- 字段为空:展示 9 个预设点一下

---

## 2. 核心架构:Profile + Command 两层

### 2.1 层级关系

```
Profile(协议层)        ←  极简 3 项 + 元数据
├─ id
├─ name              ← 用户改
├─ kind              ← 8 种选一个(锁定 frame layout)
├─ crc               ← 算法 + 起始值 + 字节序
├─ tags[]            ← BMS / EMS / PCS 等
├─ createdAt
├─ updatedAt
├─ stats(派生)       ← 命令数 / 字段总数 / 引用次数 / 最近修改
│
└─ commands[]        ← 业务层
   ├─ Command 1
   │  ├─ id / name / cmdCode(触发码)
   │  ├─ ackCmd / trigger / timeout / retry
   │  ├─ fields[]         ← 自管字段池
   │  │  ├─ field 1 { name, type, byteOrder, scale, unit, format, byteOffset, byteLen }
   │  │  └─ field 2 ...
   │  ├─ frameBytes       ← 帧预览缓存(派生)
   │  └─ dashboardBindings[] ← 1-N dashboard cards
   │
   └─ Command 2 ...
```

### 2.2 Profile 极简 3 项

**业务字段**(用户在 Profile 编辑器改的就这 3 项):
- `name`:方案名(必填,1-32 字符,trim 后非空,不可与已有方案重名)
- `kind`:协议类型(8 选 1,锁定 frame layout)
- `crc`:`{ algorithm, initValue, byteOrder, includeHeader }`
  - algorithm: 8 种(CRC8/CRC16-CCITT/CRC16-MODBUS/CRC32/...见 v4.8c 已有)
  - initValue: hex 字符串(CRC 起始值)
  - byteOrder: BE / LE
  - includeHeader: bool(CRC 是否覆盖 header 字节)

**元字段**(派生/自动管理,UI 显示但不允许直接改):
- `id`:UUID
- `tags[]`:用户加的标签(默认空)
- `createdAt` / `updatedAt`:ISO 字符串
- `stats`:运行时算(命令数/字段总数/引用次数/最近修改者)

**绝对不放**(用户改不了,UI 也不展示):
- 帧字段(在 `NS._KIND_TEMPLATES`,kind 一选就锁定)
- 数据字段(在 command 内部,不属于 profile)
- 命令列表(在 `commands[]`)

### 2.3 Command 自管

**字段定义**(`fields[]`):
```js
{
  id: 'f1',                  // 内部 ID(同 command 内唯一)
  name: 'cell_temp_avg',     // 字段名(全局建议唯一,用于 dashboard 引用)
  type: 'int16',             // uint8/uint16/uint32/int8/int16/int32/float32/bytes/string/bcd/timestamp
  byteOrder: 'BE',           // BE/LE(per-field,不复用 proto.byteOrder)
  scale: 0.1,                // 换算系数(value = raw * scale)
  unit: '℃',                 // 显示单位
  format: '0.0',             // 显示格式(同 Excel 数字格式)
  byteOffset: 0,             // 在 data 段内的偏移(自动算,可手动改)
  byteLen: 2,                // 占用字节数(由 type 推导,可手动改覆盖)
  description: '电池平均温度'  // 可选
}
```

**触发配置**(`trigger`):
```js
{
  mode: 'auto' | 'manual' | 'periodic',
  periodMs: 1000,            // periodic 模式
  manualHotkey: 'F5',        // manual 模式热键
  onConnect: true            // 连接后是否自动发一次
}
```

**Ack 配置**:
- `ackCmd`:null(无 ack)/ 其他 command name(指定 ack command)
- `timeoutMs`:30000
- `retryCount`:3

**仪表盘绑定**(`dashboardBindings[]`):
```js
[
  {
    cardId: 'card-uuid-1',
    fieldNames: ['cell_temp_avg', 'pack_voltage'],
    layout: '2x1',           // 2x1/1x2/1x1(2 字段并排/堆叠/单字段)
    valueFormat: {           // 可覆盖字段的 display format
      cell_temp_avg: '0.0℃',
      pack_voltage: '0.00V'
    }
  }
]
```

### 2.4 关系可视化(防止误删)

**Profile → Command(强)**:删 profile 级联删 commands + 字段 + bindings
**Command → Command(弱,可选)**:可引用其他 command 的 ack(只读引用,删被引用方不影响引用方)
**Command → Dashboard Card(中)**:binding 双向引用,删 command 影响 card
**Profile → Dashboard(弱)**:profile 不直接引用 dashboard,只通过 command 间接

---

## 3. 数据模型:SerialWebUserConfig v1 → v2

### 3.1 v1 现状(读)

v1 配置结构(在 `localStorage.serialweb:prefs` 或导出文件):
```js
{
  type: 'SerialWebUserConfig',    // 类型字符串,保持
  version: 1,                      // v4.9 升级
  protocols: [                     // ← 顶层 protocols
    {
      id: 'proto_bms',             // ← 某些内置 ID 保留
      name: 'BMS 主查询',
      kind: 0,                     // fixed-header
      byteOrder: 'BE',
      fields: [                    // ← 协议级 fields(数据字段)
        { name: 'cell_temp_avg', type: 'int16', byteOrder: 'BE', scale: 0.1, unit: '℃' },
        ...
      ],
      // v4.7 之后字段
      frameFields: [...],          // ← 帧字段(其实就是 kind 模板,迁移时可丢弃)
      commands: [                  // ← v4.8c 后才有
        { name: 'query_voltages', cmdCode: 0x01, dataFields: ['cell_temp_avg'] }
      ],
      crc: { algorithm: 'CRC16-MODBUS', initValue: '0xFFFF', byteOrder: 'LE' }
    }
  ],
  activeProtoId: 'proto_bms',
  dashboard: { cards: [...] },
  presets: [...]
}
```

### 3.2 v2 字段定义(写)

```js
{
  type: 'SerialWebUserConfig',     // ← 不变
  version: 2,                       // ← 升级
  _migrated: 'v1-to-v2',            // ← 迁移标记(只在 localStorage 版本)
  profiles: [                       // ← 重命名 protocols → profiles(语义更准确)
    {
      id: 'profile-uuid-1',         // ← UUID 重新生成(旧 ID 仅迁移日志保留)
      name: 'BMS 主查询 v2.1',
      kind: 0,                      // fixed-header
      crc: { algorithm: 'CRC16-MODBUS', initValue: '0xFFFF', byteOrder: 'LE' },
      tags: ['BMS', '户外电源'],     // ← 新增(空数组起步)
      createdAt: '2026-08-01T...',
      updatedAt: '2026-08-06T...',
      commands: [                   // ← 从 v1 的 commands 字段移过来(同层)
        {
          id: 'cmd-uuid-1',
          name: 'query_voltages',
          cmdCode: 0x01,
          ackCmd: null,
          timeoutMs: 30000,
          retryCount: 3,
          trigger: { mode: 'manual', periodMs: 0, manualHotkey: 'F5', onConnect: false },
          fields: [                  // ← 字段池移到 command 内部(自管)
            { id: 'f-uuid-1', name: 'cell_temp_avg', type: 'int16', byteOrder: 'BE', scale: 0.1, unit: '℃', format: '0.0', byteOffset: 0, byteLen: 2 }
          ],
          dashboardBindings: []      // ← 新增
        }
      ]
    }
  ],
  activeProfileId: 'profile-uuid-1', // ← 重命名 activeProtoId → activeProfileId
  // dashboard / presets 顶层结构不变
  dashboard: { cards: [...] },
  presets: [...],
  // v4.9 新增(顶层,30 天 rolling)
  operationHistory: [
    { id: 'op-uuid', type: 'add-profile' | 'edit-profile' | 'delete-profile' | 'add-command' | ...,
      refId: 'profile-uuid-1', snapshot: { ... }, timestamp: '2026-08-06T...' }
  ],
  // v4.9 新增(用户自定义字段预设)
  fieldPresets: [
    { id: 'preset-uuid-1', name: '我的电压', type: 'uint16', byteOrder: 'BE', scale: 0.01, unit: 'V', format: '0.00V' }
  ],
  // v4.9 新增(导入历史)
  importHistory: [
    { id: 'imp-uuid', filename: 'bms-2026-08-04.json', timestamp: '...', profileCount: 3, commandCount: 12, status: 'success' | 'failed', error: null }
  ],
  // v4.9 新增(回收站)
  recycleBin: [
    { id: 'recycle-uuid', object: { type: 'profile' | 'command' | 'field', data: {...} }, deletedAt: '...', expiresAt: '...' }
  ]
}
```

### 3.3 v1 → v2 迁移逻辑

**触发时机**:
- 启动时读取 `localStorage.serialweb:prefs`
- 检测到 `version === 1` 或 `_migrated !== 'v1-to-v2'`
- 自动执行迁移,标记 `version: 2, _migrated: 'v1-to-v2'`
- 一次性,不重复执行

**迁移步骤**:
```
1. 备份 v1 到操作历史({ type: 'migrate-v1-to-v2', snapshot: v1Data })
2. 对每个 v1.protocols[i]:
   a. 创建 v2.profiles[i] = {
        id: uuid() (或保留 proto_bms 等内置 ID),
        name: protocols[i].name,
        kind: protocols[i].kind,
        crc: protocols[i].crc,
        tags: [],  // 空
        createdAt: now(),
        updatedAt: now()
      }
   b. 对每个 v1.protocols[i].commands[j]:
      - 创建 command, fields 解析:
        * 如果 v1 有 commands[].dataFields(字段名数组),
          从 protocols[i].fields(协议级)里查每个字段定义
        * 如果 v1 没有 commands(老版本),
          兜底建一个 default command, fields = protocols[i].fields
      - dashboardBindings: [] (v1 没有,空)
   c. 如果 v1.protocols[i].fields 有但 commands 为空:
      - 兜底建一个 default command, fields = protocols[i].fields
3. activeProtoId → activeProfileId(ID 转换用 1-1 映射表)
4. 写入 localStorage(覆盖 v1)
5. 弹一次 toast:"配置已自动升级到 v2,可在操作历史回滚"
```

**边界处理**:
- v1.protocols[i].fields 为空数组 + commands 为空 → 迁移后 profile 存在但无 commands(允许)
- v1 重复 profile name → 迁移后追加 `(migrated)` 后缀
- v1.protocols[i] 缺 kind → 兜底 kind=0(fixed-header)
- v1.protocols[i] 缺 crc → 兜底 `{ algorithm: 'CRC16-MODBUS', initValue: '0xFFFF', byteOrder: 'LE' }`
- v1.protocols[i].commands[j].dataFields 引用了不存在的字段名 → 迁移时过滤掉,记录到操作历史 warning

### 3.4 向后兼容

**老 v1 文件导入**(用户拿 v1 时期的导出文件导入):
- 走 v1 → v2 迁移(同 §3.3)
- 导入历史记一笔:`{ filename, version: 1 → 2, status: 'success' }`

**v2 文件被 v4.9 之前版本打开**:
- v1 之前的版本不认识 `_migrated` 字段,会忽略(无害)
- 不影响 version=1 的旧版本,只是不展示 v4.9 新增的 UI 元素

**导出文件 v1 兼容模式**(可选,v4.9.1+ 考虑):
- 导出时提供"v1 兼容"选项,把 v2 降级到 v1 结构导出(扁平化,丢标签/历史等)
- v4.9 暂不做,等用户明确需要再加

---

## 4. UI 设计 — 12 块改进

UI 改动遵守:
- **所有图标用 SVG**(user 明确要求,不用 emoji / 文字图标)
- 沿用 v4.8c 风格(antd 卡片 / 主色 #1677ff / 圆角 8px / 字号 12-13px)
- 每块改动有 1) 触发场景 2) UI 描述 3) 边界 4) 不破坏什么

### 4.1 方案编辑器主视图(主入口)

**触发场景**:用户打开协议编辑器 tab,看到所有方案。

**UI 描述**:
```
┌─ 协议编辑器 ──────────────────────────────────────────────┐
│ [搜索框:方案/命令/字段/标签] Ctrl+F  [协议模板] [+ 新建] │
├──────────────────────────────────────────────────────────┤
│ 标签: 全部(14) | BMS(5) | EMS(3) | PCS(4) | 充电桩(2) +│
├──────────────────────────────────────────────────────────┤
│ ┌─ 表格 ─────────────────────────────────────────────┐  │
│ │ 名称           类型       标签    命令  引用  最近 │  │
│ │ BMS 主查询 v2.1 fixed-h  BMS 户外 12/48 7处  2h前 │  │
│ │ BMS 控制 v1.0  cmd-split BMS       6/22  3处  昨天│  │
│ │ ...                                              │  │
│ └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**关键 UI 元素**:
- **顶部工具栏**:搜索(占 360px,Ctrl+F 聚焦) + 协议模板 + 新建方案
- **标签筛选条**:横向 chip,带数量
- **方案列表表格**:列固定(名称/类型/标签/命令字段/引用/最近修改/操作),操作列 3 按钮(查看/编辑/导出)
- **空状态**:见 §4.12

**边界**:
- 方案名搜索:模糊匹配 + 字段名匹配 + 标签匹配(任一命中即返回)
- 标签筛选:单选(切换),不取消即生效
- 排序:默认按 updatedAt desc,可点列头切换

**不破坏**:
- 协议编辑器 tab 入口位置不动
- 已有的"导入"按钮移到 §4.9 的统一入口,这里不重复

### 4.2 Step 0 — 新建方案入口选择

**触发场景**:用户点 "+ 新建方案"。

**UI 描述**:弹 modal,3 个 preset card 选一个:
```
┌─ 新建方案 ────────────────────────────────────────┐
│ Step 0 · 选择来源                                  │
├───────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│ │ ⚡ 从空白开始 │ │ 📋 基于现有 │ │ 📦 协议模板 │    │
│ │ 选 8 kind  │ │ 复制方案+   │ │ Modbus/CAN │    │
│ │ + CRC 算法 │ │ 命令+字段   │ │ open 等 6  │    │
│ │            │ │ 80% 场景    │ │            │    │
│ │ [8 kinds]  │ │ [推荐]      │ │ [6 模板]   │    │
│ └────────────┘ └────────────┘ └────────────┘    │
│                                                    │
│ (选了"基于现有"后展开:)                            │
│ ┌─ 现有方案表 ─────────────────────────────────┐  │
│ │ ◉ BMS 主查询 v2.1  fixed-h  12 cmd  48 fld   │  │
│ │ ○ BMS 控制 v1.0   cmd-split 6 cmd  22 fld   │  │
│ │ ○ EMS 调度         tlv       8 cmd  31 fld   │  │
│ └──────────────────────────────────────────────┘  │
│ 新方案名: [BMS 控制 v2.0 (基于主查询 v2.1 复制)]   │
│ 复制选项: [✓]命令定义 [✓]字段定义 [ ]仪表盘 [✓]CRC│
├───────────────────────────────────────────────────┤
│              [取消]  [下一步 → 配置 CRC]          │
└───────────────────────────────────────────────────┘
```

**3 个入口**:
1. **从空白开始**:走 §4.3 的 Step 1 wizard
2. **基于现有复制**(默认高亮):选现有方案,深拷贝 commands+fields,进入 Step 1 wizard
3. **协议模板**:6 个内置模板(Modbus RTU / Modbus TCP / CANopen / J1939 / DL/T 645 / 自定义),选完进入 Step 1,kind+crc+commands 都预填

**Step 0 → Step 1 衔接**:
- 选"空白"→ 跳 Step 1,kinds/CRCs 全空
- 选"复制"→ 跳 Step 1,profile.name 待填,kind/crc/commands 预填
- 选"模板"→ 跳 Step 1,profile.name 待填,kind/crc/commands 预填(用户可改)

**边界**:
- 没选任何入口时"下一步"按钮 disabled
- "基于现有"展开后没选源方案 → "下一步" disabled
- 复制选项全不勾 → 跳 Step 1 后 commands 仍来自源,只是字段/CRC 不带

**不破坏**:
- Step 1 之后流程不动
- "协议模板" 按钮的入口也可从顶部工具栏进入(空状态时也有),不走 Step 0

### 4.3 Step 1 — Wizard(name + kind + CRC)

**触发场景**:Step 0 选择完成,或顶部"新建方案"快速入口(跳 Step 0)。

**UI 描述**:
```
┌─ 新建方案 · Step 1 / 2 ─────────────────────────────┐
│ ┌─ 基础 ──────────────────────────────────────────┐│
│ │ 方案名 *  [_______________] (必填,1-32 字符)    ││
│ │ 标 签     [BMS ×] [户外电源 ×] [+ 添加]        ││
│ │ 描 述     [_______________] (可选)             ││
│ └─────────────────────────────────────────────────┘│
│ ┌─ 协议类型 * ────────────────────────────────────┐│
│ │ (○) fixed-header  头+地址+命令+数据+CRC+尾      ││
│ │     适用:大多数工业协议(主从问答)              ││
│ │ (●) cmd-split     头+命令(2B)+地址+数据+CRC    ││
│ │     适用:BMS/EMS 控制命令                       ││
│ │ (○) raw           纯数据流,无帧结构             ││
│ │     适用:简单透传/ASCII                        ││
│ │ ... (8 kinds)                                   ││
│ └─────────────────────────────────────────────────┘│
│ ┌─ CRC 配置 * ────────────────────────────────────┐│
│ │ 算法 *  [CRC16-MODBUS    ▾]                     ││
│ │ 起始值   [0xFFFF    ] (hex)                     ││
│ │ 字节序   (●) BE  (○) LE                         ││
│ │ 覆盖范围 [✓] header  [✓] data  [ ] 全部        ││
│ │ 实时校验: 对"AA 01 03 04 00 00 00 00" → CRC=... ││
│ └─────────────────────────────────────────────────┘│
│                                      [取消]  [下一步 →]│
└─────────────────────────────────────────────────────────┘
```

**关键 UI 元素**:
- 8 kind 每个显示:ASCII 帧结构 + 一句话适用场景
- CRC 实时校验:输入"测试字节"后立刻算 CRC 值(用 v4.8d 已有 CRC 函数)
- 标签输入:chip 风格,回车添加,X 删除

**Step 1 → Step 2 衔接**:
- 必填项(name+kind+crc)全填 → 启用"下一步"
- 点了"下一步" → 校验 name 唯一性,提示重名(让用户改或选其他)
- 通过 → 写入 profile 草稿,跳 Step 2(创建第一个 command,或从复制/模板带过来的 commands)

**边界**:
- 用户在 Step 1 中途关 modal → 草稿丢弃,不写入 localStorage
- 重名校验仅在最终提交时(v1 → v2 迁移时的重名是另一回事)
- CRC 起始值不合法(非 hex)→ 实时红框提示

**不破坏**:
- v4.8c 已有的 8 kind 模板
- v4.8d 已有的 CRC 实时计算

### 4.4 Step 2 — 命令 modal(完整命令定义)

**触发场景**:Step 1 完成后,或主视图点"加命令" / 编辑已有命令。

**UI 描述**(分 5 个 section,antd 折叠):
```
┌─ 编辑命令: query_cell_voltages ──────────────────────┐
│ Tabs: 基础 | 字段 | 帧预览 | 反向解析 | 仪表盘绑定   │
├──────────────────────────────────────────────────────┤
│ Section 1: 命令基础 + 触发                          │
│ 名称 *  [query_cell_voltages]                       │
│ 命令码 * [0x01] (hex)  [✓] 区分大小端              │
│ Ack 命令  [无 ▾] / 选其他命令(同 profile)         │
│ 超时(ms) [30000]  重试 [3]                         │
│ 触发模式  (●)手动 (○)定时1000ms (○)自动            │
│ 手动热键  [F5]                                     │
│ 连接后自动发 [✓]                                   │
│                                                     │
│ Section 2: 数据字段定义                            │
│ ┌─ 9 个预设 ─────────────────────────────────────┐│
│ │ 🌡温度 ⚡电压 🔋电流 💡功率 🔋SOC ⏱频率 ...    ││
│ │ 点一下自动填 type/byteOrder/scale/unit/format   ││
│ └────────────────────────────────────────────────┘│
│ ┌─ 字段列表(可拖拽) ───────────────────────────┐│
│ │ ⋮ 1 cell_temp_avg  [int16] [BE] ÷10 [0.1℃] ✕ ││
│ │ ⋮ 2 pack_voltage   [uint16][BE] ÷100 [0.00V]✕││
│ │ ⋮ 3 pack_current   [int16] [LE] ÷100 [0.00A]✕││
│ │ ⋮ 4 soc             [uint8] [BE] ÷255 [0.0%] ✕││
│ └────────────────────────────────────────────────┘│
│ [+ 加字段] [从预设选] [批量改单位]               │
│                                                     │
│ Section 3: 帧预览(派生)                           │
│ ┌─ 字节预览(按段着色) ──────────────────────────┐│
│ │ AA 01 03 04 [00 00 00 00] CRC_H CRC_L 55      ││
│ │ 头  命  长 数据  CRC(2)  尾                    ││
│ └────────────────────────────────────────────────┘│
│ [验证(buildFrame)] [清空] [测试数据填字段]        │
│                                                     │
│ Section 4: 反向解析(贴字节)                       │
│ 字节输入: [AA 01 03 04 00 00 00 00 00 00 55]    │
│ 解析结果:                                               │
│   cell_temp_avg  →  25.4  (raw: 0x00FE)  ✓      │
│   pack_voltage   →  48.20 (raw: 0x12D4)  ✓      │
│   ...                                              │
│ [采纳为字段定义]  [清空]                          │
│                                                     │
│ Section 5: 仪表盘绑定(1-N 字段)                  │
│ 当前绑定: (无)                                    │
│ [+ 绑定到仪表盘卡片]                              │
│ ┌─ 选卡片 ──────────────────────────────────────┐│
│ │ 卡片: 实时电压监控 ✓                          ││
│ │ 字段: [✓] cell_temp_avg [✓] pack_voltage     ││
│ │ 布局: (●)2x1 (○)1x2 (○)1x1                    ││
│ │ 格式: cell_temp_avg = "0.0℃"                  ││
│ │       pack_voltage = "0.00V"                  ││
│ └──────────────────────────────────────────────┘│
│ 预览:                                              │
│ ┌────────────┐ ┌────────────┐                    │
│ │ 25.4℃     │ │ 48.20V     │                    │
│ │ 电池温度  │ │ 电池电压  │                    │
│ └────────────┘ └────────────┘                    │
├──────────────────────────────────────────────────────┤
│ [取消] [保存草稿] [保存并关闭] [保存并加新命令 →] │
└──────────────────────────────────────────────────────┘
```

**关键 UI 元素**:
- **Section 1 基础**:名称/命令码/ack/超时/重试/触发(模式+热键+自动)
- **Section 2 字段**:9 个预设 + 字段列表(可拖拽改顺序) + 3 个批量操作
- **Section 3 帧预览**:调用 `NS.buildFrame()`,按段着色(头/命/长/数据/CRC/尾)
- **Section 4 反向解析**:贴字节 → 调 `NS.parseFrame()` → 展示每个 field 的 raw + value + 校验状态
- **Section 5 仪表盘绑定**:1-N 字段绑定,布局 3 选 1,值格式可覆盖,实时预览卡片

**边界**:
- 字段重名校验:同 command 内不允许重名(同 profile 内提示但不阻止)
- 字段名建议唯一:用于 dashboard 引用,全局去重(用"global field name"提示)
- 拖拽顺序:byteOffset 自动重算
- 反向解析失败:红框 + 错误信息(精确到字节位置)
- 仪表盘绑定为空允许保存(无绑定 = 仪表盘不显示)

**不破坏**:
- v4.8d 已有 `NS.parseFrame` 通用化
- v4.8c 已有 buildFrame 字节预览按段着色

### 4.5 字段类型预设(嵌入式 9 个)

**触发场景**:用户在 §4.4 Section 2 字段定义时。

**9 个内置预设**:
| 名称 | type | byteOrder | scale | unit | format | 用例 |
|---|---|---|---|---|---|---|
| 🌡 温度 | int16 | BE | 0.1 | ℃ | 0.0 | 电池/环境温度 |
| ⚡ 电压 | uint16 | BE | 0.01 | V | 0.00 | 电池/总线电压 |
| 🔋 电流 | int16 | LE | 0.01 | A | 0.00 | 充放电电流(含方向) |
| 💡 功率 | int32 | LE | 0.001 | kW | 0.000 | 实时功率 |
| 🔋 SOC | uint8 | BE | 0.392 | % | 0.0 | 荷电状态(÷255) |
| ⏱ 频率 | uint16 | BE | 1 | Hz | 0 | 交流频率 |
| 🌐 字节 | bytes | — | — | — | 0x | 原始字节(hex 字符串) |
| ⏲ 时间戳 | uint32 | BE | 1 | — | YYYYMMDDhhmmss | BCD 时间 |
| ❓ 状态字 | uint16 | BE | 1 | — | bits | 位定义(位编辑器单独弹窗) |

**用户自定义预设**:
- 选一个字段后点"保存为预设" → 弹 modal 输预设名 → 存到 `fieldPresets[]`
- 预设列表展示在 9 个内置之后,带"删除"按钮
- 同一台浏览器不同 profile 共享(全局)

**边界**:
- 9 个内置不可删/不可改(代码常量)
- 用户预设上限 50 个(超过提示)
- 预设按使用频率排序(内置 9 个固定第一,自定义按点击次数)

**不破坏**:
- 字段定义本身是 v4.8c 已实现的,这里只是 UX 包装

### 4.6 方案编辑 diff 视图

**触发场景**:主视图点方案行的"编辑"按钮。

**UI 描述**:
- **Step A:diff 视图** — 旧值 vs 新值,左右两列,变化标红/绿
- **Step B:影响列表** — 列出这个 profile 改动会影响的 commands(因为 commands 是 profile 的子)
- **Step C:确认** — 用户点"应用"才写入,否则丢弃

```
┌─ 编辑方案: BMS 主查询 v2.0 → v2.1 ──────────────┐
│  ┌─ 旧 ──────────┐  ┌─ 新 ──────────┐           │
│  │ name: v2.0    │  │ name: v2.1   │ ← changed  │
│  │ kind: fixed-h │  │ kind: fixed-h │            │
│  │ crc: 0xFFFF   │  │ crc: 0xA001  │ ← changed  │
│  │ tags: []      │  │ tags: [BMS]  │ ← changed  │
│  └───────────────┘  └──────────────┘           │
│                                                    │
│  影响 12 个命令:                                    │
│   - query_cell_voltages: crc 0xA001, 帧长度不变   │
│   - query_pack_info:      crc 0xA001             │
│   - set_charge_current:   crc 0xA001,需重新验证  │
│   - ...                                          │
│                                                    │
│  ⚠ 警告:                                            │
│   - CRC 起始值变了,所有已录制的 .timeline 文件     │
│     用 v2.0 解析会失败,建议保留 v2.0 profile     │
│                                                    │
│                  [取消] [保留 v2.0 副本并新建]   │
│                              [应用到 12 个命令]   │
└────────────────────────────────────────────────────┘
```

**关键 UI 元素**:
- diff 视图:左右两列,变化字段高亮(红 = 旧,绿 = 新),未变字段灰
- 影响列表:列出所有 commands,标出哪些会受影响(CRC 改 → 所有,kind 改 → 所有+警告)
- 警告:CRC 改 / kind 改 / tag 改,有不同级别的提示
- 选项:
  - "取消":丢弃改动
  - "保留 v2.0 副本并新建 v2.1":深拷贝当前 profile 为 v2.0,改动应用到 v2.1(不破坏)
  - "应用到 12 个命令":直接覆盖,记入操作历史

**边界**:
- 改 name 不影响 commands(只是显示名)
- 改 crc 影响所有 commands(帧字节变)
- 改 kind 影响所有 commands(kind 不同 = frame layout 完全不同,警告级别最高)
- 改 tags 不影响 commands(只影响筛选)

**不破坏**:
- Profile 极简 3 项(name/kind/crc)的约束保持
- commands 内部字段不被波及(只 crc 改时需要重新计算 frameBytes 缓存)

### 4.7 3-tier 删除 + 影响分析

**触发场景**:删除 profile / command / field。

**3 个层级**(UI 几乎一致,只是影响范围不同):

**Tier 1 — 删除字段(field)**:
```
┌─ 删除字段: legacy_temp2 ──────────────────────────┐
│ 影响:                                             │
│   - 当前命令 query_voltages 少 1 个数据点          │
│   - 仪表盘「实时温度」会变空白                     │
│                                                    │
│ 确认删除 (10 秒内可撤销):                          │
│              [取消] [确认删除]                    │
└────────────────────────────────────────────────────┘
```

**Tier 2 — 删除命令(command)**:
```
┌─ 删除命令: query_cell_voltages ───────────────────┐
│ 影响:                                             │
│   - 该命令 4 字段全部删除                          │
│   - 仪表盘「实时电压」会变空白(2 卡片)             │
│   - 预设「启动自检」中此命令被引用,会变灰          │
│                                                    │
│ 10 秒撤销 / 30 天回收站:                          │
│              [取消] [软删除] [确认删除]           │
└────────────────────────────────────────────────────┘
```

**Tier 3 — 删除方案(profile)**:
```
┌─ 删除方案: BMS 主查询 v2.1 ───────────────────────┐
│ 影响 7 处:                                        │
│   📊 仪表盘「实时电压监控」会变空白 (2 卡片)      │
│   📊 仪表盘「SOC 趋势」会变空白 (1 卡片)         │
│   ⚡ 预设「启动自检」「故障查询」「均衡状态」…   │
│   🔗 其他方案「BMS 控制 v1.0」引用了此方案命令   │
│                                                    │
│ 回退选项:                                          │
│   (●) 直接删除 (10 秒内可撤销)                    │
│   (○) 软删除 (移到回收站,30 天后清除)            │
│   (○) 导出备份后删除 (建议)                       │
│                                                    │
│              [取消] [先导出备份] [确认删除]       │
└────────────────────────────────────────────────────┘
```

**关键 UI 元素**:
- 影响范围统计(数字 + 分类列表)
- 3 个回退选项(直接/软/先导出)
- 二次确认按钮红色
- 顶部 ⚠ icon 提示严重程度

**边界**:
- profile 删除时影响 ≥ 5 处 → 必须勾选"先导出备份"才能点"确认删除"
- command 删除时影响 ≥ 3 个 dashboard 卡片 → 同样必须导出
- field 删除时无影响 → 直接确认即可

**不破坏**:
- v4.7 已有的删除逻辑(改写增强,不删旧)
- 删除后真删走 `NS.deleteProfile / deleteCommand / deleteField`,走 operationHistory

### 4.8 操作历史 + 撤销 + 回收站

**触发场景**:
- 任何 add/edit/delete/import/export 操作后
- 误删/误改想恢复
- 30 天内查看"我都改过啥"

**UI 描述**(主视图 → 操作历史 tab 或独立入口):
```
┌─ 操作历史 (30 天) ─────────────────────────────────┐
│ 🔍 [按类型筛选]  [按对象筛选]  [按时间筛选]        │
├────────────────────────────────────────────────────┤
│ ● + 2 小时前  编辑 BMS 主查询 v2.1 CRC16 起始值  │
│              0xFFFF → 0xA001              [恢复]   │
│ ● + 昨天 18:23  在 BMS 控制 v1.0 新增命令        │
│              set_balance() (3 字段)        [恢复]   │
│ ● − 昨天 16:05  删除了 PCS 旧版 (8 命令)         │
│                                  [恢复] [查看差异]│
│ ● ↻ 2 天前      导入 bms-emspcs-2026-08-04.json  │
│              (3 方案 26 命令)              [回滚]   │
│ ● + 3 天前      从 BMS 主查询 v2.0 复制创建 v2.1 │
│                                  [查看]            │
└────────────────────────────────────────────────────┘
```

**关键 UI 元素**:
- 时间线样式,彩色圆点(add/mod/del/import)
- 每行:操作类型 + 对象 + 摘要 + 时间
- "恢复"按钮:把 snapshot 写回(只支持 add/del,mod 恢复整个对象)
- "查看差异"按钮:打开 diff 视图(同 §4.6)
- 30 天 LRU 自动清理,清理前的最后 5 条标"永久"避免丢

**回收站(recycleBin)**(独立入口):
```
┌─ 回收站 (30 天后自动清除) ──────────────────────────┐
│ 🗑 BMS 主查询 v2.1     删除于 2 小时前             │
│    [查看] [恢复] [永久删除]                         │
│ 🗑 legacy_temp2        删除于 3 天前               │
│    [查看] [恢复] [永久删除]                         │
└────────────────────────────────────────────────────┘
```

**边界**:
- 操作历史只记录"落盘"动作(用户按了"保存"),不记录临时输入/拖拽中间态
- 恢复 = 写入 operationHistory 一条新记录(可再次撤销)
- 永久删除 = 从 recycleBin 删,不可恢复

**不破坏**:
- 10 秒内撤销 vs 30 天回收站:前者快路径,后者深路径
- 操作历史和回收站是 2 个独立存储,前者记录"动过啥",后者存"删除的对象"

### 4.9 导入导出(粒度 + diff + 错误定位 + 历史)

**触发场景**:配置跨机器迁移 / 团队分享 / 备份。

**导出 modal**:
```
┌─ 导出配置 ──────────────────────────────────────────┐
│ 范围:                                              │
│   (●) 全部配置 (3 方案 26 命令)                    │
│   (○) 选中方案 (1 方案 BMS 主查询 v2.1)           │
│   (○) 选中方案 + 依赖 (1 方案 + 引用它的 1 方案)   │
│   (○) 选中方案 + 命令级 (1 方案 12 命令全选)       │
│                                                    │
│ 文件版本: v2 (默认)                                │
│ 文件名:  serialweb-config-2026-08-06.json          │
│                                                    │
│ 内容预览:                                          │
│   profiles[0]: BMS 主查询 v2.1 (12 cmd)           │
│   profiles[1]: EMS 调度 (8 cmd)                   │
│   profiles[2]: PCS 并机 (6 cmd)                   │
│   dashboard: 5 cards                              │
│   presets: 2                                      │
│                                                    │
│              [取消] [复制到剪贴板] [下载]          │
└────────────────────────────────────────────────────┘
```

**导入 modal**(3 步不可跳):
```
Step 1: 解析 + 文件信息
┌─ 导入配置 ──────────────────────────────────────────┐
│ 文件: bms-emps-2026-08-04.json (8.2 KB)            │
│ 检测: v2 格式 ✓  CRC 全部识别 ✓  2 项重名 ⚠       │
├────────────────────────────────────────────────────┤
│ 内容预览(勾选要导入的):                            │
│ ☐ BMS 主查询 v2.1     [重名]  当前 v2.0/10cmd      │
│   ↳ query_cell_voltages    [新增字段 cell_temp]   │
│   ↳ set_charge_current     [新命令]               │
│ ☐ EMS 调度            [新增]  8 命令              │
│ ☐ PCS 并机            [重名]  无                  │
│                                                    │
│ 重名处理:                                          │
│   BMS 主查询: (●)合并 (○)替换 (○)重命名 (○)跳过   │
│   PCS 并机:   (●)合并 (○)替换 (○)重命名 (○)跳过   │
│                                                    │
│ 潜在问题:                                          │
│   ⚠ query_cell_voltages 字段定义有差异:           │
│      当前 BE, 文件 LE, v2.0 调用方需重新验证      │
│   ⚠ CRC16 起始值不同: 当前 0xFFFF, 文件 0x0000   │
│   ⚠ 仪表盘绑定会断: 「实时电压」绑定了当前 cmd    │
│                                                    │
│ ☑ 导入前先备份当前配置 (出问题一键回滚)            │
│                                                    │
│           [取消] [备份当前并导入] [导入 3 方案]    │
└────────────────────────────────────────────────────┘
```

**Step 2: 备份 + 写入**(自动)
- 把当前 config 完整 snapshot 到 operationHistory
- 按用户选择合并/替换/重命名/跳过
- 记录到 importHistory

**Step 3: 完成 toast** + 错误定位
```
┌─ 导入完成 ──────────────────────────────────────────┐
│ ✓ 成功导入 3 方案 12 命令                          │
│   备份到操作历史 (3 分钟前快照,可一键回滚)        │
│                                                    │
│ 失败项 (0):                                        │
│                                                    │
│              [关闭] [查看导入历史]                 │
└────────────────────────────────────────────────────┘
```

**错误定位(导入失败时)**:
```
导入失败 · BMS 主查询 v2.1 / query_cell_voltages
位置: profiles[0].commands[3].fields[7]
字段名: cell_temp_avg
错误: type="int16" 与 length=3 冲突 (int16 应为 2 字节)
[自动修正 length=2]  [手动打开编辑器]
```

**导入历史**(独立 tab):
```
┌─ 导入历史 (最近 10 条) ──────────────────────────────┐
│ ● bms-emps-2026-08-04.json  2 天前  3 方案 26 命令 │
│                                    [查看 diff] [回滚]│
│ ● ems-2026-07-30.json        1 周前  1 方案 8 命令  │
│                                    [查看 diff] [回滚]│
└────────────────────────────────────────────────────┘
```

**边界**:
- 解析失败:展示在 Step 1,不动用户数据
- v1 文件:走 v1 → v2 迁移(§3.3),导入历史标"v1 → v2"
- 重名处理:用户提供 4 选 1(合并/替换/重命名/跳过)
- 勾选全空:不导入,但也不报错
- 备份 checkbox 默认勾选(导入总是可回滚)

**不破坏**:
- v1 配置文件可被导入(走迁移)
- 导出文件结构清晰(JSON,可 git diff)

### 4.10 全局搜索

**触发场景**:Ctrl+F 或顶部搜索框。

**UI 描述**:
```
┌─ 搜索 ──────────────────────────────────────────────┐
│ 🔍 [cell_temp                       ] Esc          │
├────────────────────────────────────────────────────┤
│ 匹配 7 项                                          │
│ 📦 BMS 主查询 v2.1  [方案]      4 匹配             │
│   📦 query_cell_voltages · cell_temp_avg  [命令]  │
│   📦 set_balance       · cell_temp_limit  [命令]  │
│   📦 get_pack_info     · cell_temp_max    [命令]  │
│ 📦 BMS 控制 v1.0  [方案]         2 匹配            │
│   📦 set_charge_current · cell_temp_protect[命令]  │
│ 🏷 标签 cell_temp_monitor                       [标签]│
│ 🕒 3 天前操作历史: 修改 cell_temp_avg          [历史]│
├────────────────────────────────────────────────────┤
│ ↑↓ 移动   Enter 打开   Ctrl F 打开搜索            │
└────────────────────────────────────────────────────┘
```

**搜索范围**:
- 方案名(name)
- 方案 kind
- 方案 tag
- 命令名(name)
- 命令 cmdCode
- 字段名(name)
- 字段单位(unit)
- 字段描述(description)
- 操作历史摘要

**匹配规则**:
- 模糊匹配(包含,不分大小写)
- 匹配项按类型分组(方案/命令/字段/标签/历史)
- 字段名匹配高亮 `<mark>cell_temp</mark>_avg`

**索引构建**:
- 启动时一次性构建(扁平化所有 profiles/commands/fields)
- 增量更新(任何 add/edit/delete 后重建索引,O(n) n 是字段总数,实测 < 5ms)
- 100 方案 / 1000 命令 / 5000 字段规模 < 10ms 响应

**边界**:
- 搜索结果 ≤ 50 项时全显示,超过截断并提示"还有 N 项"
- Enter 打开:方案 → 主视图该方案详情;命令 → 命令 modal;字段 → 所在命令 modal 高亮该字段;标签 → 主视图应用该标签筛选

**不破坏**:
- 顶部搜索框的常驻位置(已有)
- Ctrl+F 浏览器原生快捷键冲突 → 在 modal 内 Esc 关闭,Ctrl+F 仍然打开搜索

### 4.11 键盘快捷键(12 个)

**全局 6**:
| 快捷键 | 动作 | 位置 |
|---|---|---|
| Ctrl + F | 打开全局搜索 | 主视图/任意位置 |
| Ctrl + N | 新建方案 | 主视图 |
| Ctrl + I | 导入配置 | 主视图 |
| Ctrl + E | 导出配置 | 主视图 |
| Ctrl + S | 保存当前编辑(命令 modal) | 命令 modal |
| Ctrl + Shift + L | 切深色/浅色 | 任意位置 |

**方案内 6**:
| 快捷键 | 动作 | 位置 |
|---|---|---|
| Ctrl + Shift + N | 新建命令 | 方案详情/主视图 |
| Ctrl + Shift + E | 编辑当前方案(打开 diff 视图) | 方案详情 |
| Ctrl + Delete | 删除当前方案/命令(打开确认) | 方案详情/命令 modal |
| Ctrl + D | 加字段(命令 modal) | 命令 modal Section 2 |
| Alt + ↑/↓ | 字段上下移(命令 modal) | 命令 modal Section 2 |
| Ctrl + Shift + P | 反向解析(命令 modal) | 命令 modal Section 4 |
| F5 | 帧预览刷新 | 命令 modal Section 3 |
| Esc | 关闭当前 modal | 任意 modal |

**UI 提示**:
- 每个按钮 hover 展示 tooltip:"Ctrl + N 新建方案"
- 独立"快捷键速查" modal(顶部菜单 → 帮助 → 快捷键)

**边界**:
- input/textarea 聚焦时:部分快捷键禁用(如 Ctrl+N,避免误触发)
- macOS 用 Cmd 替代 Ctrl(自动检测 platform)
- 快捷键冲突:以"主功能"优先,平台原生快捷键让位(不抢浏览器默认)

**不破坏**:
- 已有按钮(快捷键只是快捷方式,功能不变)

### 4.12 空状态 + 引导

**触发场景**:3 个空状态点。

**A. 主视图空(没方案)**:
```
┌─ 空状态 ────────────────────────────────────────────┐
│              📦                                     │
│         还没有协议方案                               │
│   方案 = 一组共享协议规则 + 命令的集合                │
│   先建一个,5 分钟跑通第一个命令                      │
│                                                    │
│       [+ 新建方案] [协议模板] [导入已有配置]         │
│                                                    │
│   3 步开始:                                         │
│   ① 选协议类型 (8 种 Modbus/TLV/固定帧头…)         │
│   ② 配 CRC (8 种算法 + 起始值)                     │
│   ③ 加命令 + 字段 (用预设或贴字节反向解析)         │
│                                                    │
│   📖 5 分钟教程  🎬 视频演示  💬 社区示例           │
└────────────────────────────────────────────────────┘
```

**B. 搜索无结果**:
```
没找到匹配 "legacy_xxx" 的内容
试试这些:
  • 检查拼写 · 缩短关键词 · 用标签筛选
  • 在操作历史里找 · 显示已删除的字段
  • 如果是协议字段定义,去回收站看看
```

**C. 字段为空(命令新建时)**:
```
还没有字段
  • 从 9 个预设快速添加(温度/电压/电流/...)
  • 手动加字段
  • 贴字节反向解析(自动生成)
```

**边界**:
- 空状态只在"完全为空"时展示,有内容就不展示
- 教程/视频/社区链接打开新 tab(不打断当前操作)

**不破坏**:
- 现有的"+"按钮位置

---

## 5. 兼容性

### 5.1 不变的字段(AGENTS.md §2 强制约束)

| 项 | 当前值 | v4.9 处理 |
|---|---|---|
| `localStorage:serialweb:prefs` key | 字符串 | 不动(数据升级在 value 内部) |
| `localStorage:serialweb:version-modal-seen` | 字符串 | 不动 |
| `localStorage:wsl-*` 系列 | 字符串 | 不动 |
| 配置 JSON `type` 字符串 | `'SerialWebUserConfig'` | 不动(只升级 `version: 1 → 2`) |
| `.timeline` 二进制 magic | `WSLBIN1` (`0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00`) | 不动 |
| API 路径 | `/api/serialweb_page-view` | 不动 |
| JS 内部命名 | `__serialWeb*` / `clearSerialWebStoredUserData` 等 | 不动 |
| `NS.activeProtoId` 引用 | 全局变量 | v4.9 标记 deprecated,新增 `NS.activeProfileId`(兼容读写,带 deprecation 警告) |
| `NS.PROTOCOLS` 引用 | 全局变量 | v4.9 标记 deprecated,新增 `NS.PROFILES`(兼容读写,内部 sync) |

### 5.2 升级路径

**老用户首次打开 v4.9**:
1. 检测到 `version === 1`
2. 自动迁移到 v2(§3.3)
3. 弹一次性 toast:"配置已自动升级到 v2,可在操作历史回滚"
4. 后续操作走 v2 流程

**v4.9 用户的配置文件被同事(v4.7)打开**:
- v4.7 不认识 `_migrated`/`operationHistory`/`fieldPresets`/`importHistory`/`recycleBin` 等新字段,会忽略
- v4.7 仍能读 `version: 2` 但只读 `protocols[]`(v2 已无此字段)→ 列表为空
- **这不可接受**,所以 v4.9 保留 `protocols[]` 字段(从 `profiles[]` 同步),v4.7 能读(只读,改写覆盖 v2 字段会丢新增)
- **写入时双向同步**:`NS.PROFILES` 改了 → 自动同步 `NS.PROTOCOLS`(平铺,丢嵌套新增);反之亦然(带 deprecation 警告)
- v4.9+ 后续大版本(v5)正式放弃 v1 兼容

**v4.9 用户的 .timeline 文件被 v4.7 打开**:
- .timeline 是二进制,跟 version 无关,能读
- 但 v4.7 不认 v4.9 新加的字段(如 `field.preset` 引用),会显示为未知
- 不影响主功能(读 + 显示)

### 5.3 破坏性变更(用户已知)

| 变更 | 影响 | 缓解 |
|---|---|---|
| `protocols` → `profiles` 字段重命名 | API 读 `NS.PROTOCOLS` 的外部代码失效 | 保留 `NS.PROTOCOLS` 别名(写同步),deprecated 警告 |
| `activeProtoId` → `activeProfileId` | 同上 | 保留 `activeProtoId` 别名,同步 |
| `protocol.fields` 顶层字段下移 | 旧代码读 `protocol.fields` 取字段定义失效 | 兜底 default command + 兼容 getter(读时检查,优先返回 v2 第一个 command 的 fields) |
| `protocol.commands[].dataFields`(字段名数组)→ `protocol.commands[].fields`(字段定义数组) | 旧代码读 `cmd.dataFields` 失效 | 兼容 getter:`cmd.dataFields` 自动从 `cmd.fields` 提取 `name` |

### 5.4 不动的视觉/交互

- 顶部导航 tab 顺序不动
- 主色 `#1677ff` 不动
- v4.8c 已有 modal 风格不动
- 协议编辑器 tab 内子 tab 顺序不动(基础/字段/帧预览/反向解析/仪表盘绑定)

---

## 6. 测试要点

### 6.1 数据迁移测试(关键!)

- [ ] v1 配置文件(`version: 1`,有 `protocols[]` 无 `profiles[]`)→ 升级到 v2 后字段全部保留
- [ ] v1 多 profile 迁移后所有 profile 都有正确 commands + fields
- [ ] v1 `activeProtoId` 迁移后 `activeProfileId` 正确指向
- [ ] v1 重复 profile name → 迁移后自动 `(migrated)` 后缀
- [ ] v1 `protocols[i].fields` 有但 `commands` 空 → 迁移后 commands 有 1 个 default
- [ ] v1 缺 kind → 兜底 kind=0
- [ ] v1 缺 crc → 兜底 CRC16-MODBUS 0xFFFF LE
- [ ] v1 → v2 后写回 localStorage,刷新页面数据一致
- [ ] v1 → v2 标记 `_migrated: 'v1-to-v2'`,再次加载不重复迁移

### 6.2 UI 功能测试

- [ ] Step 0 入口选择 3 个路径都能通到 Step 1
- [ ] Step 1 必填校验(name+kind+crc)未填时"下一步" disabled
- [ ] Step 1 8 kind 切换时 CRC 起始值是否合理(自动建议)
- [ ] Step 1 提交时重名校验,重名给出改/选建议
- [ ] Step 2 5 个 section 都能正常填写/保存
- [ ] 字段拖拽顺序,byteOffset 自动重算
- [ ] 9 个预设点一下字段定义自动填
- [ ] 自定义预设保存/删除/复用
- [ ] 帧预览按段着色正确(头/命/长/数据/CRC/尾)
- [ ] 反向解析贴字节成功/失败都有清晰反馈
- [ ] 仪表盘绑定 1-N 字段,布局 3 选 1,实时预览

### 6.3 Profile 编辑 diff 测试

- [ ] 改 name → 不影响 commands
- [ ] 改 crc → 影响所有 commands(警告)
- [ ] 改 kind → 影响所有 commands(警告最高)
- [ ] 改 tags → 不影响 commands
- [ ] "保留 v2.0 副本" 选项真的深拷贝
- [ ] diff 视图红/绿高亮正确

### 6.4 删除影响分析测试

- [ ] 删字段影响 1 个 command → 1-tier 弹窗
- [ ] 删命令影响 1 个 dashboard → 2-tier 弹窗
- [ ] 删方案影响 5+ 处 → 必须勾"先导出"
- [ ] 10 秒撤销按钮真的撤销
- [ ] 软删除到回收站 30 天后真的清除

### 6.5 导入导出测试

- [ ] 导出全部 → JSON 结构 v2,所有字段齐全
- [ ] 导出选中 profile → JSON 只含该 profile
- [ ] 导入 v1 文件 → 自动迁移,导入历史标"v1 → v2"
- [ ] 导入 v2 文件 → 直接走 diff 流程
- [ ] 重名处理 4 选 1 都正确
- [ ] 错误精确定位到字段/字节
- [ ] 备份当前后导入,出问题回滚能恢复到导入前状态

### 6.6 全局搜索测试

- [ ] Ctrl+F 在任意位置都能打开
- [ ] 搜索方案/命令/字段/标签/历史都能命中
- [ ] 100 方案 / 1000 命令规模 < 10ms 响应
- [ ] Enter 打开:方案/命令/字段/标签/历史 各类型跳转正确
- [ ] 搜索无结果时引导"试试这些"

### 6.7 快捷键测试

- [ ] 12 个快捷键都能触发
- [ ] input/textarea 聚焦时禁用会误触的快捷键
- [ ] macOS 用 Cmd,Windows/Linux 用 Ctrl
- [ ] 快捷键速查 modal 内容正确

### 6.8 兼容性回归测试

- [ ] 顶部 tab 顺序/位置/颜色不变
- [ ] 已有 protocol 编辑器功能(v4.8c)正常
- [ ] 已有 dashboard/preset 正常
- [ ] 已有 .timeline 录制/回放正常
- [ ] API `/api/serialweb_page-view` 调用正常
- [ ] localStorage:serialweb:prefs key 不变

### 6.9 性能测试

- [ ] 启动时间增加 < 200ms(数据迁移 + 索引构建)
- [ ] 100 方案 1000 命令下,搜索/列表/筛选响应 < 100ms
- [ ] diff 视图加载 < 300ms
- [ ] 导入 10 方案 100 命令 JSON < 1s

---

## 7. 风险与开放问题

### 7.1 已知风险

**R1: 数据迁移丢失**
- v1 → v2 迁移时,如果用户手动改过 localStorage 导致数据格式异常,迁移可能丢字段
- **缓解**:迁移前先备份 v1 到 operationHistory,出问题可一键回滚
- **缓解**:迁移后弹 toast 告诉用户升级了,有问题看历史

**R2: 大配置性能**
- 100 方案 / 1000 命令 / 5000 字段规模下,搜索/列表/筛选 < 100ms 是设计目标,但实测如果 JS 实现不够优化可能超出
- **缓解**:索引在启动时构建,运行时只查不建;O(n) 单次扫描不缓存
- **缓解**:超过 50 项搜索结果截断(不全显示)

**R3: 向后兼容别名同步的循环依赖**
- `NS.PROFILES` ↔ `NS.PROTOCOLS` 双向同步可能产生循环触发
- **缓解**:用 flag `__syncingProfileAlias` 防止递归
- **缓解**:每次同步 debounce 50ms

**R4: 字段重名检测的"全局唯一"语义**
- 当前 spec 说"建议全局唯一,不强制"
- 但 dashboard 引用字段名时如果重名会有歧义
- **缓解**:搜索结果显示所有匹配,加"哪个 profile/command"前缀
- **开放问题**:是否在保存时强制全局唯一(类似 Java package)?倾向于不强制,提示风险

**R5: 30 天回收站占空间**
- 大配置下,回收站里 30 天删除的对象可能累积几 MB
- **缓解**:超过 100 条自动 LRU 清理最早的
- **缓解**:用户可"清空回收站"

### 7.2 开放问题(已锁定 — 2026-08-06 用户确认)

| # | 决策 | 锁定答案 | 实施影响 |
|---|---|---|---|
| Q1 | 字段重名校验 | 跨 profile **不强制**(每个 profile 独立),同 profile 内**强制** | §4.4 命令 modal 保存时同 profile 内重名红框阻止;跨 profile 重名仅提示 |
| Q2 | 协议模板数量 | v4.9 内置 6 个够用,社区模板留 v5 | §4.2 Step 0 选"协议模板"时展示 6 个内置;不做"用户上传"入口 |
| Q3 | 仪表盘绑定 | v4.9 **只做配置层**(绑定 + 预览),真生效留 v4.9.1 | §4.4 Section 5 卡片预览是静态 mock,数据不真刷新;§9 spec 末尾标注"v4.9.1 接 parseFrame" |
| Q4 | 操作历史数据 | 只存元数据,**不存**字段值/字节流 | §4.8 记录 `{ type, refId, summary, timestamp }`,不存 snapshot.data 的字节 |
| Q5 | v1 兼容 | v4.9 保留别名 + deprecation 警告,**v5 起砍** | §5.2-5.3 双向 sync + 兼容 getter,带 `console.warn('[deprecation] PROTOCOLS is deprecated, use PROFILES')` |

### 7.3 暂未实现(明确不做)

- AI 自动生成命令(从抓包反推)
- 协议 simulator(纯软件模拟设备)
- 协议版本控制(方案内命令历史回滚)
- 跨设备方案同步(Git/云)
- 多协议并行(同串口多协议,留 v4.9.2)

---

## 8. 实施分批

按"风险/价值"排序,推荐 4 个 commit 完成:

### Commit 1: 数据模型 + 迁移(spec §3)
- `SerialWebUserConfig` v1 → v2 迁移函数
- `NS.PROFILES` + `NS.activeProfileId` 别名 + sync
- v1 → v2 边界 case 全覆盖
- 兼容性 getter(`protocol.fields`, `cmd.dataFields`)
- **验证**:启动 5 个 v1 测试 profile,迁移后刷新数据一致

### Commit 2: UI 框架 + 12 块改进分批
- §4.1 主视图重写
- §4.2-4.5 Step 0/1/2 + 字段预设
- §4.6 diff 视图
- §4.7 3-tier 删除 + 影响分析
- §4.8 操作历史 + 回收站
- §4.9 导入导出
- §4.10 全局搜索
- §4.11 快捷键
- §4.12 空状态

可能拆成 2-3 个 commit(按"基础设施"→"主流程"→"增强"分)

### Commit 3: 兼容性回归 + 性能优化
- localStorage / WSLBIN1 / API 全部回归测试
- 启动时间 / 搜索响应时间 benchmark
- 100 方案压力测试

### Commit 4: 文档 + 提交
- README / PRODUCT / DESIGN 同步更新
- 中文 commit message 按 AGENTS.md 规范
- 推 remote(等网络恢复)

---

## 9. 相关文件参考

| 文件 | 用途 |
|---|---|
| `SerialCube.html` | 主代码,20800+ 行, 882KB, v6.5 |
| `docs/architecture.md` | 整体架构 |
| `docs/superpowers/specs/2026-08-06-v48d-sub3-parse-frame-design.md` | 前置 spec(532 行) |
| `docs/superpowers/plans/2026-08-06-v48d-sub3-impl-plan.md` | 前置 plan(1480 行) |
| `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v4-mockup.html` | v4 评审版 mockup(63KB) |
| `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v5-mockup.html` | v5 人性化补丁 mockup(74KB) |
| `AGENTS.md` §2 | 兼容性字段强制约束 |
| `README.md` / `PRODUCT.md` / `DESIGN.md` | 用户可见文档 |

---

**Spec 状态**: 待 review
**下一步**: 用户 review → 写 v4.9 plan → 实施(预计 25-30 tasks,3-4 commits)




