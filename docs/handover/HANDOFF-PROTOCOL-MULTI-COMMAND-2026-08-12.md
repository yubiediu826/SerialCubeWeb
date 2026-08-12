# 协议方案 · 多命令 & 配置中心 — 实施交接

> **用途：** 协议编辑器只支持单条命令的现状改造为「协议拥有多个命令」+ 4 个独立配置 modal 合并为 1 个配置中心。
> **本文件：** 设计阶段已完成,新会话接手直接开干。
> **最后更新：** 2026-08-12

---

## 🚀 TL;DR — 30 秒读完

**要做什么：** 把 SerialCube 当前「协议编辑器只能配 1 条命令 + 4 个独立配置 modal」改造为「协议自包含 N 条命令 + 1 个配置中心 5 tab」。

**为什么：** 命令和协议松散引用 (`cmd.protocol = 'proto_xxx'`) 是数据模型问题,不是 UI 问题,得从根上改。

**当前状态：** 设计阶段全部完成 (v1→v4 预览 + design spec),代码没动。

**下一步：** 新会话第一件事 → 激活 `writing-plans` skill → 写 2-5 分钟粒度实现 plan → 改代码 → 验证。

---

## 📦 设计阶段产物 (已完成,代码未动)

| 文件 | 用途 | 大小 |
|------|------|------|
| `docs/design/protocol-multi-command-preview.html` | v1 预览: 4 方案对比 + 推荐方案 B 交互 | 50KB |
| `docs/design/protocol-multi-command-v2-preview.html` | v2 预览: 数据字段挂命令下 + 3 步向导 + 新建命令 modal | 67KB |
| `docs/design/protocol-multi-command-v3-preview.html` | v3 预览: 全 Lucide SVG + 4 modal 合并 + 工具栏 5→1 | 81KB |
| `docs/design/protocol-multi-command-v4-preview.html` | v4 预览 (锁定): 删主题 + 漫游引导 + Custom kind | 49KB |
| `docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md` | **正式 design spec** (源真值,改动前必读) | 22KB |

**v1-v3 是迭代历史,可以直接看 v4 + spec。** v4 包含所有最终决策。

---

## 🔒 已锁定的 4 个关键决策 (用户 2026-08-12 拍板)

1. **方案 v4** — 完整采纳,不再讨论
2. **引导触发方式** — 每次手动点 🎓 按钮,不做 first-time-only 自动弹,不用 localStorage
3. **Custom kind** — 加 (9 种 kind 中的第 9 种,空白帧模板用户自填)
4. **协议 JSON 导入** — 走配置中心「导入/导出」tab 的通用导入,不做单独入口

---

## 🎯 设计目标 (出自 spec § 1.3)

1. **命令一等公民** — `PROTOCOLS[i].commands[]` 嵌套,UI 和数据对齐
2. **每条命令自带 dataFields** — 命令拥有 `{name, type, default}`,不再全局引用池
3. **1 个配置入口** — 5 tab 取代 4 独立 modal (协议 / 命令 / 卡片 / 告警 / 导入导出)
4. **Custom 协议** — 第 9 种 kind,完全空白帧模板
5. **图标规范** — 全 Lucide inline SVG (16x16 viewBox / stroke 1.5 / currentColor),无 emoji
6. **新用户引导** — 4 步漫游 (协议 → 命令 → 卡片 → 完成)

---

## 🗂 关键代码定位 (改 SerialCube.html 时先看这几处)

| 位置 | 内容 | 行数 (大约) |
|------|------|-------------|
| `NS._defaultProtocols` | 内置 2 个协议 (BMS + Modbus) | 9923-9950 |
| `NS._defaultCommands` | 内置 8 条命令 (现指向全局 `NS.COMMANDS`) | 9977-9988 |
| `NS.PROTOCOLS` / `NS.COMMANDS` | 全局状态 | 9953 / 9990 |
| `NS.renderProtoEditor` | 协议编辑器主 modal 渲染 | 12094-12235 |
| `NS.renderCmdList` / `NS.populateCmdForm` | 命令管理 modal | 12349-12401 |
| `NS.renderCardEditList` | 卡片配置 modal | 12426-12462 |
| `NS.renderAlertRules` | 告警配置 modal | 12558-12574 |
| `NS.exportConfig` / `NS.importConfig` | 导入导出 (v1 格式) | 12512-12555 |
| 工具栏 5 个 modal 按钮 | `dh-open-proto-editor` / `dh-open-cmd-config` / `dh-open-card-config` / `dh-open-import-export` / `dh-open-alerts` | 7607-7642 |
| 8 种 kind + buildFrame 分发 | `NS._KIND_TEMPLATES` + `NS.buildFrame` | 9913-9953 / 11518-11533 |

**重点关注:**
- `NS.buildFrame` 当前依赖 `cmd` 字段在 `protocol.fields` 数组里 — spec § 5.3 说要移除,改用 `cmd.id` 填入 cmd 位置
- `NS.computeDataSize` 当前用全局 `NS.DATA_FIELDS` 查 type 字节数 — spec § 2 改成查 `NS.DATA_TYPES` (新加的全局类型小库)
- `NS.allCommands()` 是新加的兼容垫片,所有 `NS.COMMANDS.find()` 调用换成它

---

## 📐 数据模型速查 (新模型,出自 spec § 2)

```js
// 新全局: 类型字节数小库
NS.DATA_TYPES = [
  { name: 'u8',  size: 1 },
  { name: 'u16', size: 2, byteOrder: 'BE' },
  { name: 'u32', size: 4, byteOrder: 'BE' },
  { name: 'i16', size: 2, byteOrder: 'BE' },
  { name: 'i32', size: 4, byteOrder: 'BE' },
  { name: 'float', size: 4, byteOrder: 'BE' }
];

// 协议自包含: 帧模板 + 命令
NS.PROTOCOLS = [{
  id: 'proto_bms', name: 'BMS TLV v1', kind: 'fixed-header',  // 或 'raw' / 'cmd-split' / '...' / 'custom'
  fields: [/* 帧模板: header/addr/length/data/crc/tail (cmd 字段移除) */],
  crcType, crcInit, crcEndian, crcRange,
  commands: [  // ← NEW: 命令一等公民
    {
      id: 0x01, name: 'Read Voltage', direction: 'rx', frameType: 'query',
      cadence: 200, expectResponse: 0x80,
      dataFields: [  // ← NEW: 命令自带字段
        { name: 'cell_1_v',   type: 'u16', default: '0x0000' },
        { name: 'cell_2_v',   type: 'u16', default: '0x0000' },
        // ...
      ]
    }
  ]
}];

// 兼容垫片
NS.allCommands = () => NS.PROTOCOLS.flatMap(p => p.commands || []);
```

**9 种 kind:** `fixed-header` / `raw` / `cmd-split` / `addr-split` / `ctrl-bit7` / `type-high-bit` / `msgid-mixed` / `tlv` / `custom` (新)

---

## 🛠 实施 7 阶段 (出自 spec § 6,1 个 sprint ~8h)

| Phase | 任务 | 估时 | 关键产出 |
|-------|------|------|----------|
| 1 | 数据模型 + Lucide icon 工具 | 1h | `NS.DATA_TYPES` + `icon()` helper + 30+ 图标替换 |
| 2 | 新建协议 3 步向导 (含 Custom kind) | 1.5h | `NS.openNewProtocolWizard()` |
| 3 | 新建命令 modal | 1h | `NS.openNewCommandModal(protocolId)` |
| 4 | 配置中心 modal + 5 tab 渲染 | 2.5h | `NS.openConfigCenter()` |
| 5 | 漫游引导 overlay | 1h | `NS.startGuidedTour()` (手动触发) |
| 6 | v1 配置迁移 + 删 4 旧 modal | 0.5h | `importConfig` 兼容 + toolbar 清理 |
| 7 | agent-browser e2e 验证 | 0.5h | 6 baseline + 7 新场景 |

**注意:** Phase 1-6 是**串行依赖** (数据模型 → wizard → 配置中心),Phase 7 独立最后跑。

---

## ⚠️ 改造风险 (出自 spec § 7,实施时必看)

| 风险 | 缓解 |
|------|------|
| 协议 `fields[]` 移除 cmd 字段后,`NS.buildFrame` 旧调用会断 | Phase 1 同时改 buildFrame,把所有 `cmd.id` 注入替换原 `cmd` 字段 |
| Card 引用 `cmd` by id,跨协议同 ID 会模糊 (Modbus 0x03 ≠ BMS 0x03) | 实施时考虑 `card.protocol` 字段,迁移时回填 |
| Custom kind 0 字段保存 → `buildFrame` 报错 | Wizard step 3 验证:≥1 字段才能下一步 |
| 引导高亮元素不存在 (0 协议状态) | Tour graceful no-op:第 4 步直接显示"完成引导" |
| Lucide 图标 stroke-width 不一致 | 所有图标集中在 `ICONS` map,不允许 inline `<svg>` path 散落 |
| `NS.exportConfig` 改格式破 v1 导入 | 导出版本号 `version: 1 → 2`,v1 检测自动迁移 |

---

## 📋 实施前必读清单 (新会话)

按这个顺序读,5 分钟能上手:

1. **本文件** (HANDOFF, 2 分钟) ← 你正在读
2. **正式 design spec** `docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md` (10 分钟)
3. **v4 预览 HTML** `docs/design/protocol-multi-command-v4-preview.html` (浏览器打开,5 分钟)
4. **现有 SerialCube 协议编辑器代码** `NS.renderProtoEditor` 在 `SerialCube.html` 12094-12235 行 (5 分钟)
5. **既有架构文档** `docs/reference/ARCHITECTURE.md` (10 分钟,理解大结构)
6. **5 步实施 checklist** `HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md` (本文档同目录)

---

## 🚦 怎么判断"现在该不该动手"

新会话接到这个任务时:

- 用户说「按这个方案实施」/「开干」→ 激活 `writing-plans` skill → 写 2-5 分钟粒度 plan → 实施
- 用户说「我看了 spec 有问题」→ 改 spec → 重新 review
- 用户说「先做 Phase X」→ 激活 `serialcube-workflow` skill → 5 问决策树 → 直接改

---

## ❌ 别做的事

- ❌ **跳过 design spec 直接看 v1-v3 预览** — 那是迭代历史,直接看 v4 + spec 就行
- ❌ **跳过 `bump-version.ps1` 直接改 SerialCube.html** — version-management R1 硬性规则
- ❌ **跳过 `agent-browser` 跑 e2e** — serialcube-e2e 6 场景必跑 + 7 新场景
- ❌ **跳过 `writing-plans` skill 直接开写** — brainstorm → spec → **plan → code** 流程不能跳
- ❌ **Push 前不问用户** — version-management R2 硬性规则
- ❌ **新加 emoji 或文字图标** — 设计规范规定全 Lucide SVG
- ❌ **改 docs 不同步 CHANGELOG.md** — 项目硬性要求

---

## 🔗 关键路径速查

| 找什么 | 去哪里 |
|--------|--------|
| 正式 spec (源真值) | `docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md` |
| 视觉设计参考 | `docs/design/protocol-multi-command-v4-preview.html` |
| 5 步实施 checklist | `docs/handover/HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md` |
| 30 秒项目总卡 | `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` |
| 完整项目交接 | `docs/handover/PROJECT-HANDOVER-2026-08-11.md` |
| 每次开窗口清单 | `docs/handover/SESSION-CHECKLIST-2026-08-11.md` |
| 内部架构 | `docs/reference/ARCHITECTURE.md` |
| 协议模板速查 | `docs/reference/PROTOCOL-TEMPLATES.md` |
| AI 工作流入口 | `.minimax/skills/README.md` |

---

## ✅ 验收标准 (出自 spec § 9)

- [ ] 4 个用户决策全部落地 (v4 / 手动引导 / Custom kind / 通用导入)
- [ ] `writing-plans` 写完实现 plan,用户 review 通过
- [ ] Phase 1-6 全部完成,7 阶段 ~8h
- [ ] agent-browser 跑 6 baseline + 7 新场景全绿
- [ ] v1 配置 JSON 文件能正常导入并自动迁移 (用真实 v1 export 测)
- [ ] 中文 commit + version bump + push 前 ask user (硬性 3 条)
- [ ] 在 `docs/changelog/2026-08-12-protocol-multi-command.md` 写变更说明 + 同步 `docs/CHANGELOG.md` 主索引

---

## 📝 跟项目既有约定的衔接

- **commit 规范:** `feat(scope): 中文描述` (例: `feat(protocol): 多命令方案 + 配置中心 v2`)
- **version bump:** Phase 1 开始前跑 `.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level minor` (1.0.0 → 1.1.0,因为新增功能)
- **changelog:** `docs/changelog/2026-08-12-protocol-multi-command.md` 写 4-8 条要点
- **branch:** 创建 `feature/protocol-multi-command`,push 时跟用户确认
- **e2e 必跑:** 走 `.minimax/skills/serialcube-e2e/` 6 场景
- **部署:** 走 `.minimax/skills/deploy-checklist/` 5 件事
