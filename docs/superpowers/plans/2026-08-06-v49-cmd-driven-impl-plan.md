# v4.9 协议编辑器 — 实施 Plan (Profile + Command 两层架构)

**日期**: 2026-08-06
**作者**: yubiediu826 + Mavis
**状态**: 待 review
**Spec**: `docs/superpowers/specs/2026-08-06-v49-cmd-driven-design.md` (1331 行,65KB)
**范围**: v4.9 协议编辑器全量重构

**前置 commit**:
- `db60879 v4.8d parseFrame 通用化 + 贴字节输入` (frame 内核闭环)
- `c80464d docs: VERSION 同步 v6.5`
- v4.8a/b/c/d 系列: 8 kind 模板 + 字段类型 + UI 重构 + parseFrame

**配套 mockup**:
- v4: `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v4-mockup.html` (63KB)
- v5: `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v5-mockup.html` (74KB)

---

## 1. Overview

### 1.1 目标

把 v4.7 形态的"协议编辑器"从"能跑"变成"好用",核心是 **Profile + Command 两层架构重构** + **12 块 UX 改进**。

### 1.2 任务总数

**31 个 tasks,4 个 commits**。按依赖关系排序:

| Commit | 任务数 | 模块 | 风险 | 估时 |
|---|---|---|---|---|
| C1: 数据模型 + 迁移 | 5 | v1→v2 数据迁移 + 别名 + 4 个新存储 | **高**(数据丢失风险) | 大 |
| C2: Profile 视图 + CRUD + 周边 | 11 | 主视图 + Step 0/1/2/3 wizard + diff + 3-tier 删除 + 影响分析 + 操作历史 + 回收站 | 中 | 最大 |
| C3: 命令 modal + 字段 | 7 | 命令 modal 5 section + 字段定义 + 9 预设 + 用户预设 + 帧预览 + 反向解析 + 仪表盘绑定 | 中 | 大 |
| C4: 跨流程增强 | 7 | 导入导出 + 全局搜索 + 12 快捷键 + 3 个空状态 | 低 | 中 |

**总估时**: 4-6 个 session (按用户节奏),每个 commit 完成后需要回归测试。

### 1.3 实施原则

- **从底向上**: C1 数据先行 → C2 视图 → C3 命令 → C4 增强
- **数据零丢失**: v1 → v2 迁移前先备份 v1 到操作历史
- **兼容优先**: `NS.PROTOCOLS` 保留别名,带 deprecation 警告
- **可回滚**: 每个 commit 独立可回滚(数据迁移除外 — 走双向 sync)
- **测试驱动**: 每个 task 有验收清单,commit 前全过

### 1.4 不在本 plan 范围

- v4.9.1: 仪表盘绑定实际生效(parseFrame → 实时刷新)
- v4.9.2: 多协议并行
- v5+: 协议版本控制 / 跨设备同步 / AI 自动生成
- 推 remote(等网络恢复,SSH 22 端口连接已 reset)

---

## 2. Commit 划分

```
C1: 数据模型 + 迁移                 (T1-T5,  5 tasks)
C2: Profile 视图 + CRUD + 周边      (T6-T11 + T19-T23, 11 tasks)
C3: 命令 modal + 字段              (T12-T18, 7 tasks)
C4: 跨流程增强                      (T24-T30, 7 tasks)
C5: 兼容性回归 + 文档 + 推 remote    (T31, 1 task, 等网络恢复后单做)
```

实际上 C5 留作"等网络恢复",在 plan 中作为单一 task 记录。

---

## 3. Commit 1: 数据模型 + 迁移 (T1-T5)

**目标**: 把 `SerialWebUserConfig` 从 v1 升级到 v2,建立所有新数据结构,加 v1 兼容别名。**风险最高,先做**。

### T1. v1 → v2 迁移函数 `NS._migrateV1To2()`

**目标**: 启动时检测到 `version === 1` 自动迁移,标记 `_migrated: 'v1-to-v2'`,不重复迁移。

**文件**:
- `SerialCube.html` 新增 `NS._migrateV1To2 = function (v1Config) { ... }`
- 位置: line ~8100 (VERSION 常量附近) 或独立 helper section

**步骤**:
1. 检测 `v1Config.version === 1` 且 `!v1Config._migrated`
2. 备份 v1 到 operationHistory(`{ type: 'migrate-v1-to-v2', snapshot: v1Config, timestamp }`)
3. 对每个 v1.protocols[i]:
   - 创建 v2 profile(`id: uuid()` 或保留 `proto_bms` 等内置 ID)
   - 拷贝 name/kind/crc
   - tags = [] 空数组
   - createdAt/updatedAt = now
4. commands 迁移:
   - 如果 v1 有 commands[].dataFields → 创建 command, fields 从 protocol.fields 查每个 name
   - 如果 v1 没 commands → 兜底创建 1 个 default command, fields = protocol.fields
5. activeProtoId → activeProfileId(ID 转换)
6. 顶层加 v2 字段:`operationHistory: []`, `fieldPresets: []`, `importHistory: []`, `recycleBin: []`
7. 写入 v1Config(原对象覆盖)
8. 返回 `{ migrated: true, count: profiles.length, warnings: [] }`

**边界**:
- v1.protocols[i].fields 为空 + commands 空 → profile 存在但无 commands
- v1 重复 name → 追加 `(migrated)` 后缀
- v1 缺 kind → 兜底 kind=0
- v1 缺 crc → 兜底 `{ algorithm: 'CRC16-MODBUS', initValue: '0xFFFF', byteOrder: 'LE' }`
- v1.dataFields 引用不存在的字段名 → 过滤掉,记 warning

**验收**:
- [ ] 测试 1: 5 个 v1 profile 迁移后字段全部保留
- [ ] 测试 2: v1 重复 name 自动 `(migrated)` 后缀
- [ ] 测试 3: v1 缺 kind/crc 兜底正确
- [ ] 测试 4: 迁移后写回 localStorage,刷新数据一致
- [ ] 测试 5: 二次加载不重复迁移(`_migrated` 标记生效)
- [ ] 测试 6: 迁移前 v1 备份到 operationHistory
- [ ] 测试 7: `console.warn('[deprecation] PROTOCOLS is deprecated, use PROFILES')` 输出

**风险**: **高** — 数据丢失风险。缓解:迁移前备份 v1。

---

### T2. `NS.PROFILES` + `NS.activeProfileId` 别名 + 双向同步

**目标**: v2 引入 `PROFILES` 替换 `PROTOCOLS`,但保留 v1 别名,带 deprecation 警告。

**文件**:
- `SerialCube.html` 修改 `NS.PROTOCOLS` 定义区域 (line ~10062)
- 新增 `NS.PROFILES = NS.PROTOCOLS` 引用 + setter/getter 包装

**步骤**:
1. 找到 `NS.PROTOCOLS = [...]` 定义(line ~10062)
2. 替换为:
   ```js
   Object.defineProperty(NS, 'PROFILES', {
     get() { return NS._PROFILES; },
     set(v) {
       console.warn('[deprecation] NS.PROFILES setter is alias for NS._PROFILES; consider migrating to v2 directly');
       NS._syncProfileProtocolAlias(v, 'profiles');
     }
   });
   Object.defineProperty(NS, 'PROTOCOLS', {
     get() { return NS._PROFILES; },
     set(v) {
       console.warn('[deprecation] NS.PROTOCOLS is deprecated, use NS.PROFILES');
       NS._syncProfileProtocolAlias(v, 'protocols');
     }
   });
   ```
3. 实现 `NS._syncProfileProtocolAlias(v, fromKey)`:
   - 如果 `__syncingProfileAlias` flag 为 true,直接 set,return
   - 否则 set flag,赋值给 `NS._PROFILES`,return
4. 实际数据用 `NS._PROFILES` 存储(getter/setter 双向)
5. 同样处理 `NS.activeProtoId` ↔ `NS.activeProfileId`

**边界**:
- 同时设置 PROTOCOLS 和 PROFILES → flag 防循环
- 50ms debounce 防止高频触发

**验收**:
- [ ] 读 `NS.PROFILES` 返回 `NS._PROFILES` 引用
- [ ] 写 `NS.PROFILES = [...]` 同步到 `_PROFILES` 且输出 deprecation 警告
- [ ] 写 `NS.PROTOCOLS = [...]` 同样生效
- [ ] 循环引用不爆栈
- [ ] v1 老代码 `NS.PROTOCOLS.push(x)` 仍生效(走 setter)

**风险**: 中 — 别名同步如果 bug 会导致数据不一致。

---

### T3. 兼容性 getter(`protocol.fields`, `cmd.dataFields`)

**目标**: v1 老代码读 `protocol.fields` / `cmd.dataFields` 仍生效。

**文件**:
- `SerialCube.html` 新增 helper 函数

**步骤**:
1. 在迁移函数里加 wrapper(或者给每个 profile/command 加 getter):
   - 读 `profile.fields` → 返回 `profile.commands[0]?.fields || []`
   - 读 `cmd.dataFields` → 返回 `cmd.fields.map(f => f.name)`
2. 写 `profile.fields = [...]` / `cmd.dataFields = [...]` → 不支持(报错,引导用 v2 API)

**边界**:
- profile 没 commands → `profile.fields` 返回 `[]`
- cmd 没 fields → `cmd.dataFields` 返回 `[]`

**验收**:
- [ ] v1 老代码 `protocol.fields.push(x)` 不再有效(避免误导),用 `protocol.commands[0].fields.push(x)`
- [ ] 读 `protocol.fields` 返回第一个 command 的 fields
- [ ] 读 `cmd.dataFields` 返回字段名数组
- [ ] 单元测试覆盖 5 个常见 v1 访问模式

**风险**: 低 — 只读兼容,不动 v2 数据。

---

### T4. 4 个新顶层存储结构

**目标**: 加 `operationHistory` / `fieldPresets` / `importHistory` / `recycleBin` 4 个新数组(空起步)。

**文件**:
- `SerialCube.html` 修改迁移函数 (T1) + 新增 helper

**步骤**:
1. T1 迁移函数里加 4 个新字段的初始化(空数组)
2. 新增 `NS.recordOperation(type, refId, summary)`:
   - 入参: `type ∈ {add-profile, edit-profile, delete-profile, add-command, ...}`, `refId: uuid`, `summary: string`
   - 写入 `NS._PROFILES_meta.operationHistory`
   - LRU 30 天清理
3. 新增 `NS.addFieldPreset(preset)` / `NS.removeFieldPreset(id)` / `NS.getFieldPresets()`:
   - 存到 `fieldPresets[]`
   - 上限 50 个
4. 新增 `NS.recordImport(filename, result)` / `NS.getImportHistory(limit=10)`
5. 新增 `NS.addToRecycleBin(object)` / `NS.getRecycleBin()` / `NS.restoreFromRecycleBin(id)` / `NS.emptyRecycleBin()`:
   - 存到 `recycleBin[]`
   - 30 天 LRU 清理
   - 超过 100 条自动清理最早

**边界**:
- operationHistory 单条 `{ id, type, refId, summary, timestamp }`(**Q4 锁定:不存大字节**)
- fieldPresets 单条 `{ id, name, type, byteOrder, scale, unit, format }`
- importHistory 单条 `{ id, filename, timestamp, profileCount, commandCount, status, error }`
- recycleBin 单条 `{ id, object: { type, data }, deletedAt, expiresAt }`

**验收**:
- [ ] 4 个 helper 函数可独立调用
- [ ] LRU 30 天清理逻辑正确
- [ ] fieldPresets 上限 50
- [ ] recycleBin 超过 100 自动清最早

**风险**: 低 — 独立模块。

---

### T5. 启动时自动迁移触发 + 一次性 toast

**目标**: 启动时检测 v1,自动迁移,弹一次性 toast 告诉用户。

**文件**:
- `SerialCube.html` 启动逻辑区域(找 `DOMContentLoaded` 或 `init` 函数)

**步骤**:
1. 在 `NS.init` 或类似函数开头加:
   ```js
   const config = NS._loadUserConfig();
   if (config && config.version === 1 && !config._migrated) {
     const result = NS._migrateV1To2(config);
     NS._saveUserConfig(config);
     NS._showToast(`配置已自动升级到 v2(迁移了 ${result.count} 个方案),可在操作历史回滚`, 'info', 5000);
     NS._setFlagOnce('v49-migrated-toast-seen');  // 防止重复弹
   }
   ```
2. 实现 `NS._showToast(msg, type, durationMs)`:右下角浮窗,可关闭
3. 验证迁移完成(`console.log('[v4.9] migrated:', result)`)

**边界**:
- 配置不存在(新用户)→ 不迁移
- 已经迁移过(`_migrated === 'v1-to-v2'`)→ 跳过
- toast 5s 自动消失,可点 X 提前关

**验收**:
- [ ] 首次启动迁移后弹 toast
- [ ] 刷新后不再弹
- [ ] toast 5s 自动消失
- [ ] toast X 按钮可手动关

**风险**: 低。

---

## 4. Commit 2: Profile 视图 + CRUD + 周边 (T6-T11 + T19-T23)

**目标**: Profile 编辑器主视图 + 新建/编辑 wizard + diff + 删除 + 历史。**UI 主体**。

### T6. 重写 `NS.renderProtoEditor` 主视图

**目标**: 主视图包含 顶部工具栏 + 标签筛选 + 方案列表。

**文件**:
- `SerialCube.html` line ~12515 `NS.renderProtoEditor`

**步骤**:
1. 备份当前实现 → `NS._renderProtoEditorLegacy`(作为 fallback)
2. 重写主视图:
   - 顶部:搜索框(占 360px,Ctrl+F 聚焦) + 协议模板 + 新建方案 + 导入 + 导出 按钮
   - 标签筛选条:chip 风格,带数量
   - 方案列表表格:7 列(名称/类型/标签/命令字段/引用/最近修改/操作)
   - 操作列 3 按钮(查看/编辑/导出)
3. 空状态走 §4.12 组件
4. 滚动到底自动加载(预留,v4.9 不实现)

**边界**:
- 默认按 updatedAt desc 排序
- 列头可点排序
- 表格行 hover 高亮

**验收**:
- [ ] 搜索/标签筛选/排序 3 交互都正常
- [ ] 行操作 3 按钮可点
- [ ] 空状态展示引导
- [ ] 大配置(50 profile)流畅

**风险**: 中 — 主视图改动大,可能影响现有 dashboard/preset 联动。

---

### T7. 方案统计计算函数 `NS._calcProfileStats(profile)`

**目标**: 派生 stats(命令数/字段总数/引用次数/最近修改者),运行时算,不存。

**文件**:
- `SerialCube.html` 新增 helper

**步骤**:
1. 实现 `NS._calcProfileStats(profile)`:
   - `commandCount = profile.commands.length`
   - `fieldCount = profile.commands.reduce((s, c) => s + (c.fields?.length || 0), 0)`
   - `referenceCount = NS._calcProfileReferences(profile)`(查 dashboard cards + presets)
   - `lastModified = profile.updatedAt` (ISO 字符串)
   - `lastModifiedBy = '当前用户'` (v4.9 暂不实现多用户)
   - `weeklyDelta = ...`(本周新增命令数,查 operationHistory)
2. 主视图表格调用此函数填充"命令/字段/引用/最近修改"4 列

**边界**:
- profile.commands 为空 → 0/0
- 无引用 → 0
- weeklyDelta 查 operationHistory 7 天内 add-command 数

**验收**:
- [ ] 4 个统计值正确
- [ ] weeklyDelta 准确(7 天滚动)
- [ ] 大配置(50 profile, 1000 commands)响应 < 50ms

**风险**: 低。

---

### T8. 标签管理(增/删/筛选)

**目标**: profile.tags[] 增/删/筛选,跨 profile 标签聚合(去重 + 计数)。

**文件**:
- `SerialCube.html` 新增 helper

**步骤**:
1. `NS.addProfileTag(profileId, tag)` / `NS.removeProfileTag(profileId, tag)`
2. `NS.getAllTags()`:遍历所有 profile,聚合 tag → `[{ name, count }]`,按 count desc 排序
3. 主视图标签筛选条调用 `NS.getAllTags()` 生成 chip
4. 标签 chip 点击 → 筛选该 tag 的 profiles
5. "+ 新建标签" 按钮 → 弹 input,选 profiles 批量加标签

**边界**:
- 标签去重(同 profile 内不重复)
- 标签长度限制 1-16 字符
- 删除标签:仅从当前 profile 删,其他 profile 的同名标签保留

**验收**:
- [ ] 加/删标签生效
- [ ] 跨 profile 标签聚合去重
- [ ] 标签筛选生效
- [ ] 批量加标签生效

**风险**: 低。

---

### T9. Step 0 入口选择 modal

**目标**: 新建方案时弹 3 个 preset card 选择入口。

**文件**:
- `SerialCube.html` 新增 `NS._showNewProfileStep0()` 函数

**步骤**:
1. 3 个 preset card:
   - "从空白开始"(走 Step 1,kind/crc 全空)
   - "基于现有复制"(选源 profile,深拷贝 commands+fields)
   - "协议模板"(6 个内置,选完 kind/crc/commands 预填)
2. 选"基于现有"展开:现有 profile 列表(单选) + 复制选项(命令/字段/仪表盘/CRC 4 个 checkbox)
3. 选"协议模板"展开:6 个模板卡片(单选) + 模板简介
4. "下一步" → 走 Step 1
5. "取消" → 关闭

**边界**:
- 没选入口时"下一步" disabled
- "基于现有"展开后没选源 → disabled
- 6 个模板:Modbus RTU / Modbus TCP / CANopen / J1939 / DL/T 645 / 自定义(代码常量)

**验收**:
- [ ] 3 个入口都能通到 Step 1
- [ ] "基于现有"复制选项生效
- [ ] "协议模板" 6 个可切换
- [ ] 取消关闭 modal

**风险**: 低。

---

### T10. Step 1 wizard(name + kind + CRC)

**目标**: Step 0 完成后进入 Step 1,展示基础 + kind 选择 + CRC 配置。

**文件**:
- `SerialCube.html` 新增 `NS._showNewProfileStep1(prefill)` 函数

**步骤**:
1. 顶部 Step 进度:Step 1/2
2. 基础 section:name(必填,实时校验) + tags + description
3. 协议类型 section:8 kind 单选,每个显示 ASCII 帧结构 + 一句话适用场景
4. CRC section:algorithm 8 选 1 + 起始值 hex + 字节序 BE/LE + 覆盖范围 checkbox
5. 实时 CRC 计算(用 v4.8d 已有 CRC 函数)
6. "下一步" → 校验必填 → 跳 Step 2(创建 command modal,profile 已写入草稿)
7. "取消" → 关闭,丢弃草稿

**边界**:
- name 1-32 字符 trim 后非空
- 重名校验:已有 profile 中检查,重名给提示
- 起始值不合法 hex → 实时红框

**验收**:
- [ ] 必填校验生效
- [ ] 8 kind 切换 CRC 自动建议起始值
- [ ] 实时 CRC 校验正确
- [ ] 跳 Step 2 时 profile 草稿写入
- [ ] 重名提示

**风险**: 中 — kind 切换影响 CRC 计算,要测 8 个 kind × 8 个 CRC 的 64 组合。

---

### T11. Profile 编辑 diff 视图

**目标**: 主视图点"编辑"打开 diff 视图,展示旧/新 + 影响列表 + 警告。

**文件**:
- `SerialCube.html` 新增 `NS._showEditProfileDiff(profileId)` 函数

**步骤**:
1. modal 标题:"编辑方案: {oldName} → {newName}"
2. 左右两列 diff:
   - 旧(v1 字段)/ 新(改动后)
   - 变化字段红/绿高亮
   - 未变字段灰
3. 影响列表:
   - 列出所有 commands(因为 commands 是 profile 的子)
   - 标出哪些会受影响(CRC 改 → 所有,kind 改 → 所有+最高警告)
4. 警告区:
   - CRC 改 / kind 改 / tag 改,有不同级别提示
5. 3 个选项按钮:
   - "取消":丢弃改动
   - "保留 v2.0 副本并新建 v2.1":深拷贝当前 profile 为 v2.0,改动应用到 v2.1
   - "应用到 12 个命令":直接覆盖,记入 operationHistory

**边界**:
- 改 name 不影响 commands
- 改 crc 影响所有 commands(警告)
- 改 kind 影响所有 commands(警告最高)
- 改 tags 不影响 commands

**验收**:
- [ ] diff 红/绿高亮正确
- [ ] 影响列表准确
- [ ] 3 个选项按钮都生效
- [ ] "保留副本"真的深拷贝

**风险**: 中 — 误操作覆盖风险。

---

### T19. 删除影响分析函数 `NS._calcDeleteImpact(type, id)`

**目标**: 计算删除 1 个对象的影响范围(命令数/字段数/dashboard cards/preset 引用/其他 profile 引用)。

**文件**:
- `SerialCube.html` 新增 helper

**步骤**:
1. `NS._calcDeleteImpact(type, id)`:
   - `type ∈ {'profile', 'command', 'field'}`
   - 返回 `{ affectedCommands, affectedFields, affectedCards, affectedPresets, affectedProfiles, total }`
2. 实现细节:
   - 删 profile → 所有 commands + 字段 + 引用此 profile 的 dashboard cards + presets + 其他引用此 profile 的 profile commands
   - 删 command → 此 command 的所有字段 + 引用此 command 的 dashboard cards + presets
   - 删 field → 当前 command 少 1 字段 + 引用此 field 的 dashboard cards

**边界**:
- 大配置(50 profile, 1000 commands)下 < 50ms
- 引用关系查:遍历 dashboard.cards[].bindings + presets[].steps

**验收**:
- [ ] 3 个 type 都能算
- [ ] 数字准确
- [ ] < 50ms 响应

**风险**: 低。

---

### T20. 3-tier 删除弹窗(profile/command/field)

**目标**: 3 种删除场景的统一弹窗,展示影响 + 3 个回退选项。

**文件**:
- `SerialCube.html` 新增 `NS._showDeleteConfirm(type, id)` 函数

**步骤**:
1. 弹窗结构(同 spec §4.7):
   - 标题:删除 {type} · {name}
   - 影响列表(调 T19 函数)
   - 3 个回退选项(单选):
     - (●) 直接删除 (10 秒内可撤销)
     - (○) 软删除 (移到回收站,30 天后清除)
     - (○) 导出备份后删除 (建议)
   - 底部:取消 / 先导出备份 / 确认删除(红色)
2. 强制规则:
   - 影响 ≥ 5 处(profile)/ ≥ 3 cards(command)→ 必须勾选"先导出"才能"确认删除"
3. 确认删除后:
   - 走 `NS._deleteProfile(id)` / `NS._deleteCommand(profileId, cmdId)` / `NS._deleteField(profileId, cmdId, fieldId)`
   - 写入 operationHistory
   - 弹 10 秒撤销 toast

**边界**:
- 影响 < 3 → 3 个回退选项都可(默认"直接删除")
- 影响 3-4 → 强烈建议"先导出"
- 影响 ≥ 5 → 强制"先导出"

**验收**:
- [ ] 3 种 type 弹窗内容正确
- [ ] 强制规则生效
- [ ] 确认删除走 NS._delete* 函数
- [ ] 10 秒撤销 toast 出现

**风险**: 中 — 删除操作不可逆(虽然有撤销)。

---

### T21. 10 秒撤销

**目标**: 删除/编辑后弹 toast 含"撤销"按钮,10 秒内可点。

**文件**:
- `SerialCube.html` 新增 `NS._showUndoToast(action, undoFn)` 函数

**步骤**:
1. 复用 T5 的 `NS._showToast`,扩展支持 action 按钮
2. 弹 toast:`已删除「{name}」, 10 秒内可撤销 · [撤销] [×]`
3. 进度条(4px 高,10s 倒计时)
4. 点"撤销" → 调 `undoFn()` 恢复数据 + 写 operationHistory
5. 进度条走完 → 自动隐藏

**边界**:
- 多个 toast 排队(最多 3 个同时)
- toast X 按钮可手动关

**验收**:
- [ ] 删除/编辑后弹撤销 toast
- [ ] 10s 倒计时进度条
- [ ] 点撤销真的恢复
- [ ] 进度条走完自动隐藏

**风险**: 低。

---

### T22. 30 天回收站(recycleBin)

**目标**: 软删除的对象进回收站,30 天后清除,可手动恢复/永久删除。

**文件**:
- `SerialCube.html` 复用 T4 的 `NS.addToRecycleBin` / `NS.getRecycleBin` / `NS.restoreFromRecycleBin`

**步骤**:
1. T20 删除时,选"软删除"→ 走 `NS.addToRecycleBin({ type, data })`
2. 回收站 UI:独立 tab 或 modal
   - 列表展示:🗑 {name} · 删除于 {time} · [查看] [恢复] [永久删除]
3. 启动时清理:遍历 recycleBin,expiresAt < now → 永久删
4. 上限 100 条,超过自动 LRU 清最早

**边界**:
- 回收站里的对象仍可"恢复"(写入原位置)
- 永久删除 = 从 recycleBin 移除,不可恢复

**验收**:
- [ ] 软删除进回收站
- [ ] 30 天 LRU 清理逻辑正确
- [ ] 100 条上限生效
- [ ] 恢复/永久删除都生效

**风险**: 低。

---

### T23. 操作历史 UI

**目标**: 主视图独立 tab"操作历史"展示 30 天记录,可恢复/查看差异。

**文件**:
- `SerialCube.html` 新增 `NS._showOperationHistory()` 函数

**步骤**:
1. modal 标题:"操作历史(30 天)"
2. 顶部筛选:按类型(add/edit/del/import/export) + 按对象(profile/command/field) + 按时间
3. 列表:
   - 彩色圆点(add=绿/mod=蓝/del=红/import=紫)
   - 每行:操作类型 + 对象 + 摘要 + 时间
   - "恢复"按钮(只支持 add/del)
   - "查看差异"按钮(打开 diff 视图,T11)
4. 底部"导出全部"按钮(JSON 格式)

**边界**:
- 不记录高频操作(拖拽/临时输入)
- 30 天 LRU 清理
- 最后 5 条标"永久"避免丢

**验收**:
- [ ] 列表展示正确
- [ ] 3 个筛选生效
- [ ] "恢复"按钮生效
- [ ] "查看差异"打开 T11
- [ ] "导出全部"下载 JSON

**风险**: 低。

---

## 5. Commit 3: 命令 modal + 字段 (T12-T18)

**目标**: 命令级别 modal 完整重写,字段定义 + 9 预设 + 帧预览 + 反向解析 + 仪表盘绑定(配置层)。

### T12. 重写命令 modal(5 个 section + tabs)

**目标**: 命令 modal 分 5 section,tabs 切换。

**文件**:
- `SerialCube.html` 找到现有命令 modal 入口(可能被 v4.8c 重写过)

**步骤**:
1. 备份当前实现
2. 重写 modal 结构:
   - 顶部 tabs:基础 / 字段 / 帧预览 / 反向解析 / 仪表盘绑定
   - 每个 tab 一个 section 内容
3. tabs 切换:用 CSS `display: none/block`,不重建 DOM(保留用户输入)
4. 底部:取消 / 保存草稿 / 保存并关闭 / 保存并加新命令

**边界**:
- 5 个 section 都可折叠/展开
- Esc 关闭(提示"有未保存改动")
- 切换 tab 不丢未保存输入

**验收**:
- [ ] 5 个 tab 都能切换
- [ ] 切换不丢输入
- [ ] Esc 关闭提示未保存
- [ ] 4 个底部按钮都生效

**风险**: 中 — modal 改动大,可能影响现有交互。

---

### T13. 字段定义 section(拖拽/byte order/单位/换算)

**目标**: §4.4 Section 2 字段定义完整实现。

**文件**:
- `SerialCube.html` T12 modal 的字段 tab

**步骤**:
1. 9 个预设行(参考 T14)
2. 字段列表:
   - 每行:拖拽手柄 + 编号 + 字段名 + type dropdown + byteOrder(BE/LE per-field) + scale input + unit input + format input + X 按钮
3. 拖拽:HTML5 Drag & Drop API,实时调换顺序,byteOffset 自动重算
4. "+ 加字段" 按钮(手动加)
5. 批量操作:"批量改单位"按钮(选中多字段,统一改 unit)
6. 同 profile 内重名校验:Q1 锁定 — 同 profile 内重名红框阻止保存

**边界**:
- 字段 type 8 选 1(uint8/uint16/uint32/int8/int16/int32/float32/bytes/string/bcd/timestamp)
- byteOrder 改 → byteOffset 不变,只影响解析
- 拖拽顺序 → byteOffset 重算

**验收**:
- [ ] 字段增/删/改都生效
- [ ] 拖拽顺序生效 + byteOffset 重算
- [ ] 批量改单位生效
- [ ] 同 profile 内重名阻止保存
- [ ] 跨 profile 重名仅提示

**风险**: 中 — 拖拽交互可能卡顿。

---

### T14. 9 个内置字段预设

**目标**: 9 个嵌入式高频字段预设(温度/电压/电流/功率/SOC/频率/字节/时间戳/状态字)。

**文件**:
- `SerialCube.html` 新增 `NS._BUILTIN_FIELD_PRESETS` 常量

**步骤**:
1. 定义 9 个预设(参考 spec §4.5 表格)
2. T13 字段定义 section 顶部展示 9 个预设按钮
3. 点预设 → 自动填 type/byteOrder/scale/unit/format
4. 字段定义新增到 fields 列表

**边界**:
- 9 个内置不可删/不可改(代码常量)
- 预设按使用频率排序(内置 9 个固定第一,自定义按点击次数)

**验收**:
- [ ] 9 个预设点一下字段定义自动填
- [ ] type/byteOrder/scale/unit/format 都正确
- [ ] 状态字预设弹"位编辑器"(v4.9 简化为:展示提示,完整位编辑器留 v4.9.1)

**风险**: 低。

---

### T15. 用户自定义字段预设

**目标**: 字段定义后"保存为预设",存到 fieldPresets[]。

**文件**:
- `SerialCube.html` T13 字段定义 section

**步骤**:
1. 字段定义 row 加"保存为预设"按钮(下拉菜单里)
2. 点 → 弹 input 输预设名 → `NS.addFieldPreset({ name, type, byteOrder, scale, unit, format })`
3. 9 个内置之后展示用户预设,带"删除"按钮
4. 上限 50 个

**边界**:
- 同名预设 → 弹"覆盖确认"
- 删除用户预设 → 直接删(不影响已用此预设的字段)

**验收**:
- [ ] 保存预设生效
- [ ] 用户预设展示在 9 个内置之后
- [ ] 删除用户预设生效
- [ ] 上限 50 生效

**风险**: 低。

---

### T16. 帧预览 section(已有 buildFrame 集成)

**目标**: §4.4 Section 3 帧预览,按段着色。

**文件**:
- `SerialCube.html` T12 modal 的帧预览 tab

**步骤**:
1. 调 `NS.buildFrame(profile, command)` 拿到 frame bytes
2. 按段着色(头/命/长/数据/CRC/尾),用 SVG/CSS 实现
3. 字段 data 段按字段定义 sub-着色
4. "验证"按钮:重新 build 一次(强制刷新)
5. "清空"按钮:清空预览
6. "测试数据填字段"按钮:用一组合成数据填 fields(走 v4.8d parseFrame 验证)

**边界**:
- buildFrame 失败 → 红框 + 错误信息
- parseFrame 反向校验 → 字段值回显

**验收**:
- [ ] 帧预览按段着色正确
- [ ] 3 个按钮生效
- [ ] 字段值回显正确

**风险**: 低 — 复用 v4.8c + v4.8d。

---

### T17. 反向解析 section(贴字节)

**目标**: §4.4 Section 4 贴字节反向解析。

**文件**:
- `SerialCube.html` T12 modal 的反向解析 tab

**步骤**:
1. 字节输入 textarea(接受 hex 字符串,空格/`0x`/`,` 分隔)
2. 实时 parse(500ms debounce)
3. 展示每 field 的 raw + value + 校验状态
4. "采纳为字段定义"按钮 → 把 raw 解析结果填到 fields(自动推断 type/scale)
5. 错误定位:失败时红框 + 字节位置

**边界**:
- 输入格式:空格/`0x`/`,` 都可
- 解析失败不弹错,只展示红框
- 采纳 = 自动填字段(覆盖现有)

**验收**:
- [ ] 贴字节实时解析
- [ ] 3 种输入格式都生效
- [ ] 错误精确定位
- [ ] "采纳"自动填字段

**风险**: 低 — 复用 v4.8d parseFrame。

---

### T18. 仪表盘绑定 section(配置层 + 预览)

**目标**: §4.4 Section 5 仪表盘绑定 1-N 字段,Q3 锁定只做配置层。

**文件**:
- `SerialCube.html` T12 modal 的仪表盘绑定 tab

**步骤**:
1. 当前绑定列表(空时显示"+ 绑定到仪表盘卡片")
2. 添加绑定 modal:
   - 选卡片(单选,从 dashboard.cards 拉)
   - 选字段(多选,从当前 command.fields 拉)
   - 布局 3 选 1(2x1/1x2/1x1)
   - 值格式覆盖(每个字段独立 input)
3. 实时预览卡片(静态 mock,只展示布局,数据不真刷新 — Q3 锁定)
4. 删除绑定

**边界**:
- 没卡片 → 提示"先建仪表盘卡片"
- 字段 ≥ 2 → 2x1/1x2 可用;1 字段 → 1x1 only

**验收**:
- [ ] 添加/删除绑定生效
- [ ] 3 种布局可切换
- [ ] 实时预览布局
- [ ] 没卡片时引导

**风险**: 低 — 配置层不做真数据。

---

## 6. Commit 4: 跨流程增强 (T24-T30)

**目标**: 导入导出 + 全局搜索 + 12 快捷键 + 3 个空状态。

### T24. 导出 modal(粒度选择)

**目标**: §4.9 导出 modal,粒度选择 + 文件名 + 内容预览。

**文件**:
- `SerialCube.html` 新增 `NS._showExportConfig()` 函数

**步骤**:
1. 4 个粒度单选:
   - 全部配置
   - 选中方案(1 个 profile)
   - 选中方案 + 依赖(profile + 引用它的 profile)
   - 选中方案 + 命令级(profile 选 + commands 多选)
2. 文件版本:v2 默认(无 v1 兼容导出 — Q5 锁定)
3. 文件名:`serialweb-config-{YYYY-MM-DD}.json`
4. 内容预览:展示 profiles/dashboard/presets 列表
5. 3 个按钮:取消 / 复制到剪贴板 / 下载

**边界**:
- 粒度选"选中方案"但没选 → 灰
- 大配置(50 profile)预览要快(< 200ms)

**验收**:
- [ ] 4 个粒度都生效
- [ ] 文件名生成正确
- [ ] 内容预览准确
- [ ] 复制到剪贴板生效
- [ ] 下载 JSON 生效

**风险**: 低。

---

### T25. 导入 modal 3 步(解析/diff/备份+写入)

**目标**: §4.9 导入 modal 3 步不可跳。

**文件**:
- `SerialCube.html` 新增 `NS._showImportConfig()` 函数

**步骤**:
1. **Step 1:解析 + 文件信息**
   - 上传文件 / 拖拽 JSON
   - 解析 v1/v2,展示 profiles/commands/fields 清单
   - 检测重名
2. **Step 2:diff 现有 vs 文件**
   - 勾选要导入的
   - 重名处理 4 选 1(合并/替换/重命名/跳过)
   - 潜在问题列表(字段定义差异/CRC 差异/绑定断裂)
3. **Step 3:备份 + 写入**
   - 自动备份当前 config 到 operationHistory
   - 按用户选择合并
   - 记录到 importHistory
4. v1 文件走 T1 迁移函数(标记"v1 → v2")
5. 错误定位:失败时精确到字段/字节

**边界**:
- 解析失败:Step 1 展示错误,不动用户数据
- v1 → v2 自动迁移
- 默认勾选"导入前先备份"

**验收**:
- [ ] 3 步流程不可跳
- [ ] 4 种重名处理都生效
- [ ] 备份 checkbox 默认勾
- [ ] v1 文件自动迁移
- [ ] 错误精确定位

**风险**: 中 — 导入操作影响用户数据。

---

### T26. 错误精确定位

**目标**: 导入失败时展示精确错误位置(字段/字节)。

**文件**:
- `SerialCube.html` T25 导入 modal

**步骤**:
1. 解析 JSON 失败:`位置: line {n} col {m}`
2. 字段定义冲突:`位置: profiles[{i}].commands[{j}].fields[{k}]`
3. 类型不匹配:`错误: type="int16" 与 length=3 冲突 (int16 应为 2 字节)`
4. 失败行展示在 modal 底部,带"自动修正"/"手动打开编辑器"按钮

**边界**:
- 错误信息用 JSON Schema 风格描述
- 自动修正只能修简单错误(length 不匹配等),复杂错误引导手动

**验收**:
- [ ] 3 类错误都精确定位
- [ ] 错误信息清晰
- [ ] 自动修正按钮只对简单错误生效

**风险**: 低。

---

### T27. 导入历史 UI

**目标**: §4.9 导入历史(最近 10 条)。

**文件**:
- `SerialCube.html` 独立 tab 或 modal

**步骤**:
1. 列表展示:文件名 + 时间 + 方案数 + 命令数 + 状态
2. "查看 diff"按钮 → 打开 T11 diff 视图
3. "回滚"按钮 → 用 operationHistory 的备份恢复
4. 上限 10 条,超过 LRU

**边界**:
- 回滚 = 用 operationHistory 的 migrate-v1-to-v2 snapshot 写回
- v1 → v2 的导入历史标特殊 icon

**验收**:
- [ ] 列表展示正确
- [ ] 查看 diff 打开 T11
- [ ] 回滚真的恢复
- [ ] 10 条上限生效

**风险**: 低。

---

### T28. 全局搜索(Ctrl+F + 索引 + 命中分组)

**目标**: §4.10 全局搜索 7 个类型命中 + 索引 + Enter 跳转。

**文件**:
- `SerialCube.html` 新增 `NS._showGlobalSearch()` 函数 + `NS._buildSearchIndex()`

**步骤**:
1. 启动时构建扁平索引:
   ```js
   NS._searchIndex = [];
   for (const profile of NS._PROFILES) {
     NS._searchIndex.push({ type: 'profile', id: profile.id, name: profile.name, ... });
     for (const tag of profile.tags || []) {
       NS._searchIndex.push({ type: 'tag', id: `${profile.id}#${tag}`, name: tag, profileId: profile.id });
     }
     for (const cmd of profile.commands) {
       NS._searchIndex.push({ type: 'command', id: cmd.id, name: cmd.name, profileId: profile.id, cmdCode: cmd.cmdCode });
       for (const field of cmd.fields || []) {
         NS._searchIndex.push({ type: 'field', id: field.id, name: field.name, ... });
       }
     }
   }
   for (const op of NS._PROFILES_meta.operationHistory) {
     NS._searchIndex.push({ type: 'history', id: op.id, summary: op.summary, ... });
   }
   ```
2. 搜索 modal(§4.10 UI):
   - 顶部输入框,实时搜索(100ms debounce)
   - 7 个类型分组(方案/命令/字段/标签/历史)
   - 字段名匹配高亮 `<mark>`
3. Enter 跳转:
   - 方案 → 主视图该方案详情
   - 命令 → 命令 modal
   - 字段 → 命令 modal 高亮该字段
   - 标签 → 主视图应用该标签筛选
   - 历史 → 操作历史 modal
4. 增量更新:任何 add/edit/delete 后重建索引

**边界**:
- 100 方案 / 1000 命令 / 5000 字段规模 < 10ms 响应
- 搜索结果 ≤ 50 项时全显示,超过截断
- Esc 关闭,Ctrl+F 重新打开

**验收**:
- [ ] 7 个类型都能命中
- [ ] 字段名高亮生效
- [ ] Enter 跳转各类型正确
- [ ] < 10ms 响应
- [ ] 增量更新生效

**风险**: 中 — 索引性能可能不够好,要 benchmark。

---

### T29. 12 个键盘快捷键

**目标**: §4.11 全局 6 + 方案内 6 = 12 快捷键。

**文件**:
- `SerialCube.html` 新增 `NS._initKeyboardShortcuts()` 函数

**步骤**:
1. 全局 6:
   - `Ctrl+F` → 打开搜索(T28)
   - `Ctrl+N` → 新建方案(走 Step 0 T9)
   - `Ctrl+I` → 导入(T25)
   - `Ctrl+E` → 导出(T24)
   - `Ctrl+S` → 保存当前编辑(命令 modal)
   - `Ctrl+Shift+L` → 切深色/浅色
2. 方案内 6:
   - `Ctrl+Shift+N` → 新建命令
   - `Ctrl+Shift+E` → 编辑当前方案(T11)
   - `Ctrl+Delete` → 删除当前方案/命令(T20)
   - `Ctrl+D` → 加字段(T13)
   - `Alt+↑/↓` → 字段上下移(T13)
   - `Ctrl+Shift+P` → 反向解析(T17)
3. `F5` → 帧预览刷新(T16)
4. `Esc` → 关闭当前 modal
5. macOS 用 Cmd 替代 Ctrl(检测 `navigator.platform`)
6. input/textarea 聚焦时禁用部分快捷键(避免误触)
7. 快捷键冲突:不抢浏览器原生(如 Ctrl+T)

**边界**:
- macOS 自动适配
- 按钮 hover 展示 tooltip

**验收**:
- [ ] 12 个快捷键都生效
- [ ] macOS 用 Cmd
- [ ] input 聚焦时禁用误触
- [ ] 浏览器原生快捷键不抢

**风险**: 低。

---

### T30. 空状态 3 个 + 引导

**目标**: §4.12 3 个空状态(主视图/搜索无结果/字段为空)。

**文件**:
- `SerialCube.html` 3 个空状态 component

**步骤**:
1. **A. 主视图空**:
   - 中心 icon(空 package SVG)
   - 标题"还没有协议方案" + 描述
   - 3 个按钮:+ 新建方案 / 协议模板 / 导入已有配置
   - 3 步引导(选 kind → 配 CRC → 加命令)
   - 教程/视频/社区链接(打开新 tab)
2. **B. 搜索无结果**:
   - 标题"没找到匹配 '{query}'"
   - 试试这些建议
   - 显示已删除的字段链接
   - 回收站链接
3. **C. 字段为空**(命令新建时):
   - 标题"还没有字段"
   - 9 预设快速添加
   - 手动加字段
   - 贴字节反向解析

**边界**:
- 空状态只在"完全为空"时展示
- 教程/视频/社区链接占位(v4.9 留 TODO,链接先写 #)

**验收**:
- [ ] 3 个空状态展示正确
- [ ] 3 步引导显示
- [ ] 教程链接占位

**风险**: 低。

---

## 7. Commit 5: 兼容性回归 + 文档 + 推 remote (T31)

**目标**: 兼容性全量回归 + 性能 benchmark + 文档同步 + 推 remote。

### T31. 兼容性回归 + 文档 + 推 remote

**步骤**:
1. **回归测试**(全量):
   - [ ] localStorage:serialweb:prefs key 不变
   - [ ] localStorage:serialweb:version-modal-seen key 不变
   - [ ] localStorage:wsl-* 系列不变
   - [ ] .timeline 二进制 magic WSLBIN1 不变
   - [ ] API /api/serialweb_page-view 调用正常
   - [ ] JS 内部命名 __serialWeb* / clearSerialWebStoredUserData 不动
2. **性能 benchmark**:
   - [ ] 启动时间增加 < 200ms
   - [ ] 100 方案 1000 命令下,搜索 < 10ms
   - [ ] 列表/筛选 < 100ms
   - [ ] diff 视图 < 300ms
   - [ ] 导入 10 方案 100 命令 < 1s
3. **文档同步**:
   - [ ] README.md 加 v4.9 章节
   - [ ] PRODUCT.md 同步
   - [ ] DESIGN.md 同步(架构图)
   - [ ] VERSION 同步到 v6.6(如果有版本号)
4. **Commit message**: 中文,按 AGENTS.md 规范(背景/范围/验证)
5. **推 remote**: 等网络恢复(SSH 22 reset)

**验收**: 全部 checklist 过

**风险**: 低。

---

## 8. 验收清单 (Overall)

### 8.1 数据迁移
- [ ] v1 → v2 迁移后所有字段保留
- [ ] 兼容性 getter 生效
- [ ] 别名 + deprecation 警告生效

### 8.2 UI 12 块
- [ ] 主视图(统计/标签/搜索/列表)
- [ ] Step 0/1/2 wizard
- [ ] 命令 modal 5 section
- [ ] 9 字段预设
- [ ] diff 视图
- [ ] 3-tier 删除 + 影响分析
- [ ] 操作历史 + 撤销 + 回收站
- [ ] 导入导出
- [ ] 全局搜索
- [ ] 12 快捷键
- [ ] 3 个空状态

### 8.3 兼容性
- [ ] AGENTS.md §2 全部字段不动
- [ ] 已有功能(v4.8c/d)正常

### 8.4 性能
- [ ] 启动 < 200ms
- [ ] 搜索 < 10ms
- [ ] 大配置流畅

---

## 9. 风险与回滚

| 风险 | 缓解 | 回滚 |
|---|---|---|
| C1 数据迁移丢失 | 备份 v1 到 operationHistory | 用 operationHistory 恢复 |
| C2 主视图改动大 | 保留 `_renderProtoEditorLegacy` fallback | git revert commit |
| C3 命令 modal 改动大 | tabs 切换不重建 DOM 保留输入 | git revert commit |
| C4 性能不够 | benchmark 后优化 | 关闭对应功能 |
| 推 remote 失败 | 已在 summary 中记录,网络恢复后推 | 等网络 |

---

## 10. 实施节奏建议

按用户 session 节奏(快迭代,看截图):
- **Session 1**: C1 数据迁移(T1-T5) — 5 tasks — 风险最高先做
- **Session 2**: C2 Profile 视图 + CRUD(T6-T11) — 6 tasks
- **Session 3**: C2 续 — 删除 + 历史(T19-T23) — 5 tasks
- **Session 4**: C3 命令 modal + 字段(T12-T18) — 7 tasks
- **Session 5**: C4 导入导出 + 搜索 + 快捷键 + 空状态(T24-T30) — 7 tasks
- **Session 6**: C5 回归 + 文档 + 推 remote(T31) — 1 task

每个 session 结束:
- 截图自检(用户偏好)
- commit + 中文 message
- 等用户 review 再进下一个 session

---

## 11. 相关文件

| 文件 | 用途 |
|---|---|
| `SerialCube.html` | 主代码, 20800+ 行, 882KB |
| `docs/superpowers/specs/2026-08-06-v49-cmd-driven-design.md` | 本 plan 对应 spec(1331 行) |
| `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v4-mockup.html` | v4 评审版 |
| `docs/superpowers/previews/2026-08-06-cmd-driven-redesign-v5-mockup.html` | v5 人性化补丁 |
| `docs/superpowers/specs/2026-08-06-v48d-sub3-parse-frame-design.md` | 前置 spec |
| `docs/superpowers/plans/2026-08-06-v48d-sub3-impl-plan.md` | 前置 plan(1480 行) |
| `AGENTS.md` §2 | 兼容性约束 |

---

**Plan 状态**: 待 review
**下一步**: 用户 review → 实施(按 Session 1-6 节奏)
