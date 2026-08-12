# Protocol Multi-Command & Config Center — 2026-08-12

> **Version:** 1.0.0 → 1.1.0
> **Branch:** `feature/protocol-multi-command`
> **Spec:** [`docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md`](../superpowers/specs/2026-08-12-protocol-multi-command-design.md)
> **Plan:** [`docs/superpowers/plans/2026-08-12-protocol-multi-command-impl.md`](../superpowers/plans/2026-08-12-protocol-multi-command-impl.md)
> **Checklist:** [`docs/handover/HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md`](../handover/HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md)

---

## 🎯 核心变更(8 大模块)

### 1. 数据模型重构 — 命令成为协议一级子项
- **新增 `NS.DATA_TYPES`** — 6 项类型库(u8/u16/u32/i16/i32/float)
- **命令嵌套** — `proto.commands[]` 替代全局 `NS.COMMANDS` 数组,dataFields 内联为 `[{name, type, default}]` 对象数组
- **兼容垫片** — `NS.allCommands()` 通过 `flatMap` 跨协议拉取所有命令
- **删除** — `NS.DATA_FIELDS` + `NS.COMMANDS` 顶层数组退役
- **影响** — `encodeDataFields` / `computeDataSize` / `_parseAckFields` 适配新结构,`buildFrame` 8 种 kind 路径全部兼容

### 2. 第 9 种协议 kind — Custom
- 新增 `kind: 'custom'`,完全空白帧模板起步
- 8 种内置 kind (fixed-header/raw/cmd-split/addr-split/ctrl-bit7/type-high-bit/msgid-mixed/tlv) 保留
- Custom 走 3 步向导 → step 3 空白帧表 → `[+ 添加字段]` 手动拼 header/data/crc/tail

### 3. 统一配置中心 — 5 tab 整合
- **删除 4 个 modal**: `dh-cmd-config` / `dh-card-config` / `dh-alerts` / `dh-ie`
- **新增 1 个 modal**: `dh-config-center`,5 tab 切换:
  - **协议** — picker + 帧模板表 + 新建/导入/编辑
  - **命令** — 协议 group + 8 列表格(增删改)+ 新建
  - **卡片** — 9 列表格 + 新建/编辑/删除
  - **告警** — 从卡片 range 派生 + 重建 + 手动添加(TBD)
  - **导入/导出** — 左栏 JSON 预览 + 下载/复制;右栏拖拽 + 重置
- **删除 4 个 toolbar 按钮**: 命令管理 / 卡片配置 / 导入导出 / 告警
- **新增 1 个 toolbar 按钮**: `[⚙ 配置中心]`(占原 4 个按钮位置)

### 4. 新建协议 3 步向导
- **Step 1** — 9 kind 卡片网格,选 custom 起步空白
- **Step 2** — id/name/byteOrder/CRC 表单(id 唯一性校验)
- **Step 3** — 帧模板表(可拖拽重排 + 添加/删除/编辑)+ 实时帧预览

### 5. 新建命令 modal
- 8 列表格: ID(hex)/名称/方向/类型/周期/字段/size/操作
- 内联 dataFields 编辑器(add/remove/reorder)+ 实时总字节数计算
- 协议 select 切换同步重渲两个 tab(协议+命令)

### 6. v1 配置导入兼容
- 检测 v1 格式: `{type: 'SerialWebUserConfig', version: 1, userConfig: {dashboard: {commands, dataFields, protocols, cards}}}`
- 自动归并:`uc.commands` 按 `cmd.protocol` 归并到 `proto.commands`,dataFields 用 `uc.dataFields` 解析为 `{name, type, default}`
- v1 → v2 边界: `cmd.dataFields` 若是 name 数组,自动转对象数组
- 升级 exportConfig 到 v2(version: 2, 无顶层 commands/dataFields)

### 7. 漫游引导(4 步)
- 手动触发 🎓 按钮,无 localStorage 首次自动弹
- 4 步: 协议 → 命令 → 卡片 → 告警
- 蒙层: `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` 高亮目标
- tooltip: 右下角,含步骤标题/正文/进度点/上一步/下一步/跳过
- 0 协议状态 graceful no-op:提示去协议 tab 加一个

### 8. 图标统一 — Lucide inline SVG
- **新增** `ICONS` map(30 个 Lucide path,ISC License) + `icon(name, size)` helper
- **viewBox**: `0 0 24 24`,**stroke-width**: `1.5`(跟现有 SerialCube 风格一致)
- 全部 emoji / 文字图标 → `data-svg="<name>" data-svg-size="<n>"` 属性 + `NS_renderIcons()` 启动扫描
- 已知改名: help-circle → circle-question-mark, alert-triangle → triangle-alert, plus-circle → circle-plus, check-circle → circle-check, filter → funnel

### 附: 主题切换按钮删除
- 跟随系统 `prefers-color-scheme`,删除 manual 切换(3 个 menu-theme-opt 按钮 + 关联 CSS 死代码)

---

## 🔢 数据规模

| 指标 | v1.0.0 | v1.1.0 | 变化 |
|---|---|---|---|
| SerialCube.html 行数 | 21,168 | 21,310 | +142 |
| Modal 数量 | 5(protocol/card-edit/cmd-config/card-config/alerts/ie) | 4(proto/card-edit/new-proto-wizard/new-command)+ 配置中心 | 净 -2 |
| Toolbar config 按钮 | 4 个 | 1 个(配置中心) | -3 |
| 全局顶层数组 | `NS.DATA_FIELDS` + `NS.COMMANDS` | (已删除) | -2 |
| 命令数据归属 | 全局 `NS.COMMANDS[].protocol` 字符串引用 | 协议 `proto.commands[].*` 一级子项 | 重构 |
| 协议 kind 数 | 8 | 9(+ Custom) | +1 |
| 配置导入兼容 | 仅当前格式 | v1 自动迁移到 v2 | 新增 |

---

## ✅ 验证(Phase 3 端到端)

13 场景全过(`verify-phase3-baseline.js`):
- 6 baseline: 应用加载 / 串口连接(mock) / 发送接收(mock) / 协议编辑器 / 解析模式切换 / 主题切换
- 7 新场景: 配置中心 modal / 5 tab 切换 / 新建协议 3 步向导 / 新建命令 modal / Custom kind 空白起步 / 漫游引导 4 步 / v1 配置导入自动迁移
- **console.error: 0 个**
- **任务级 verify (7 个独立脚本):全过**

子 verify 脚本:
- `verify-task7-8.js`(wizard + command modal) — 27 + 6 项 pass
- `verify-task9.js`(config center 骨架) — 40+ 项 pass
- `verify-task10.js`(协议 tab)
- `verify-task11.js`(命令 tab)
- `verify-task12.js`(卡片 + 告警 tab)
- `verify-task13.js`(导入导出 tab)
- `verify-task14.js`(漫游引导 4 步)

---

## 🐛 已知限制 / 后续 Task

| 限制 | 影响 | 后续 |
|---|---|---|
| "新建卡片" 占位 push + 打开编辑 modal | 用户取消 modal 后,占位卡会留在 `NS.CARDS` 列表(需手动删) | v1.1.1 改:让 `openCardEdit(null)` 直接走新建流程(不占位) |
| "手动添加告警" 按钮占位 toast | TBD | v1.1.1 改:实现手动添加 UI |
| `clipboard.writeText` 在 jsdom 不可用 | 测试用 fallback `execCommand` | 真浏览器走 `navigator.clipboard`,正常 |
| `NS.reset()` 后 trendData 清空 | 重置默认会闪一下 | setTimeout 50ms 缓冲(已实现) |
| 漫游引导高亮位置依赖 `getBoundingClientRect` | jsdom 返回 0,0,0,0(但 verify 通过 DOM 结构) | 真浏览器 OK |
| 解析模式切换(state.parser) | 在闭包内,jsdom 不可直接测 | 真浏览器测 |

---

## 🔗 相关链接

- 设计预览 v4: `docs/design/protocol-multi-command-v4-preview.html`
- 实施计划: `docs/superpowers/plans/2026-08-12-protocol-multi-command-impl.md`
- 设计 spec: `docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md`
- 5 步 checklist: `docs/handover/HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md`
- 总交接: `docs/handover/HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md`
- 30 秒卡: `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md`
- 项目交接: `docs/handover/PROJECT-HANDOVER-2026-08-11.md`
