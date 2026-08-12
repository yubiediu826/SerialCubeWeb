# SerialCube v1.1.0 — Release Handover

> **Tag:** `v1.1.0` (`git rev-parse v1.1.0` = `b02b9a4`)
> **Feature commit:** `b02b9a4` (`feat(protocol): 协议多命令方案 + 配置中心 v2`)
> **Merge commit (main):** `fcd6cfb` (`merge: 合并 feature/protocol-multi-command → main (v1.1.0 发布)`)
> **Release date:** 2026-08-12
> **Code version:** `SerialCube.html const VERSION = '1.1.0'`
> **Author:** Mavis (with user M.\*)
> **Commit message language:** 中文 (per user requirement)

## 这是什么

**SerialCube 第二个大版本**。从「单协议单命令 + 4 个独立配置 modal」跃迁到「协议自包含 N 条命令 + 1 个配置中心 5 tab」。

**核心变化:** 数据模型重构(命令嵌套协议,字段跟随命令) + 4 modal 合并为 1 配置中心 + 14 任务全过端到端验证。

## ⚠️ BREAKING CHANGE

**旧 API 顶层数组已删除:**
- `NS.COMMANDS` ❌ (顶层数组,扁平所有命令)
- `NS.DATA_FIELDS` ❌ (顶层数组,扁平所有数据字段)

**新 API 兼容垫片:**
- `NS.allCommands()` ✅ → 返回所有协议下所有命令的扁平数组(向后兼容)
- `NS.DATA_TYPES` ✅ → 6 项基础类型(`uint8/uint16/uint32/int8/int16/int32` + 派生类型)
- `proto.commands[].dataFields` ✅ → 改为对象数组 `[{name, type, default}]`,字段归命令不归协议

**迁移建议:**
```javascript
// 旧 v1.0.0
NS.COMMANDS.forEach(cmd => { ... });

// 新 v1.1.0
NS.allCommands().forEach(cmd => { ... });
// 或
NS.PROTOCOLS.flatMap(p => p.commands || []).forEach(cmd => { ... });
```

**外部 import 影响:**
- 旧 SerialCube v1.0.0 的 user config(本地存储)→ v1.1.0 导入时自动走 v1→v2 迁移
- 任何外部脚本直接引用 `NS.COMMANDS` / `NS.DATA_FIELDS` 会失败,需要改用 `NS.allCommands()`

## 核心变更

### 主代码 (`SerialCube.html` 981KB / +2118 / -696)

#### 数据模型重构 (Task 1)
- **命令嵌套协议:** `proto.commands[]` 数组,每条命令自带 `dataFields`
- **字段归命令:** `{name: 'voltage', type: 'uint16', default: 0}`,类型 + 默认值随命令走
- **顶层兼容垫片:** `NS.allCommands()` / `NS.DATA_TYPES` 暴露必要 API
- **删除:** 顶层 `NS.COMMANDS` / `NS.DATA_FIELDS` 数组(BREAKING)

#### 协议 + 工具栏合并 (Task 3-5)
- **工具栏改造:** 5 config 按钮 + 主题按钮 → `[⚙ 配置中心]` + `[🎓 引导]` (2 按钮)
- **删 4 旧 modal:** `dh-cmd-config` / `dh-card-config` / `dh-alerts` / `dh-ie` (-194 行)
- **删 4 旧 render + handlers + `menu-theme-*` CSS** (-180 行)

#### 1 个配置中心 5 tab (Task 9-13)
| Tab | 用途 | 关键操作 |
|-----|------|----------|
| 协议 (Protocols) | 增删改协议 + 9 kind 切换 | 3 步新建向导 / 编辑 / 复制 / 删 |
| 命令 (Commands) | 跨协议所有命令的扁平列表 | 8 列(id / 名称 / 方向 / 类型 / 周期 / 字段 / size / 操作) |
| 卡片 (Cards) | 仪表盘 widget 配置 | 增 / 改 / 删 / 启停 |
| 告警 (Alerts) | 告警规则 + 阈值 | 增 / 改 / 删 / 启停 |
| 导入导出 (Import/Export) | 配置备份恢复 | 左导出 / 右导入 / 拖拽 / 重置 |

#### 新建协议 3 步向导 (Task 7)
- **Step 1:** 9 kind 卡片(BMS / EMS / PCS / Modbus / CAN / Custom / 等),点选进入下一步
- **Step 2:** 基础信息(协议名 / ID / 描述 / 备注)
- **Step 3:** 帧模板编辑器(可拖拽重排,实时帧预览)
- **新增第 9 kind: Custom** — 空白帧模板起步,适合自定义协议

#### 新建命令 modal (Task 8)
- **8 列表格:** ID / 名称 / 方向 / 类型 / 周期 / 字段 / size / 操作
- **内联 dataFields 编辑器:** 实时算总字节,类型切换自动更新 size
- **校验:** 字段重名检测,类型 + size 必填

#### 漫游引导 (Task 14)
- **`NS.startGuidedTour`:** 4 步 overlay(协议 / 命令 / 卡片 / 告警)
- **box-shadow 蒙层高亮** 当前 tab + tooltip 说明
- **进度点:** 4 圆点指示当前步
- **上一步 / 下一步 / 跳过** 3 按钮
- **手动触发:** 工具栏 `[🎓 引导]` 按钮(无 localStorage 自动弹,避免打扰老用户)

#### 全图标统一 Lucide (Task 2)
- **30 个 ICONS map** (viewBox 24x24, stroke 1.5)
- **`icon(name)` helper:** 一行调用 inline SVG
- **`NS_renderIcons()` 启动扫描:** 自动替换 `data-icon="xxx"` 占位
- **覆盖:** 工具栏 / 全部 modal / 按钮 / 通知

#### 配置导入导出升级 v2 (Task 6)
- **`NS.exportConfig`:** version 升级到 2,无顶层 commands/dataFields
- **`NS.importConfig`:** v1 检测 → v2 自动迁移(归并 uc.commands 到 proto.commands,解析 uc.dataFields 为对象数组)
- **边界保护:** 字段缺失 / 类型错误 → toast 警告 + 保留可用部分

#### 3 处 Bug 修复
1. **`refs.themeOpts` undefined 守卫** (L9235 + L20413): `(refs.themeOpts || []).forEach(...)`
2. **`NS.attachModalHandlers` 强制早期绑定:** 在 main script 末尾 `initDashboardState IIFE` 关闭后加 `window.__serialWebDashboard.attachModalHandlers()`,避免 IIFE 嵌套函数体内代码不自动跑
3. **`NS_renderIcons` 保留 children:** 旧实现 `el.innerHTML = icon(...)` 覆盖整个 innerHTML 破坏 button 里的 badge,改为 `replace first SVG` 或 `insertAdjacentHTML('afterbegin', ...)`

## 验证

### 7 个 task 级 verify 脚本(全过)
- `verify-task7-8.js` — 27 wizard 场景 + 6 command modal 场景
- `verify-task9.js` — 40+ config center skeleton 场景
- `verify-task10.js` — 协议 tab 场景
- `verify-task11.js` — 命令 tab 场景
- `verify-task12.js` — 卡片 + 告警 tab 场景
- `verify-task13.js` — 导入导出 tab 场景
- `verify-task14.js` — 漫游引导 4 步场景

### Phase 3 端到端 13 场景(`verify-phase3-baseline.js`)
- 6 个 baseline(应用加载 / 串口连接 / 发送接收 mock / 协议编辑器 / 解析模式切换 / 主题切换)
- 7 个新场景(配置中心 modal / 5 tab 切换 / 协议 3 步向导 / 命令 modal / 卡片增删 / 告警增删 / 漫游引导 4 步)
- **全部通过,console.error = 0**

## 升级指南

### 用户(直接用 v1.1.0)
1. 在线访问:https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html
2. 旧 v1.0.0 localStorage user config → v1.1.0 自动迁移,无需手动操作
3. 工具栏只剩 2 按钮(配置中心 + 引导),其他功能全在 modal 内
4. 协议编辑器改成"协议自带 N 命令"模式,旧"独立命令编辑器"已删除

### 开发者(扩展 / 改代码)
- 阅读 [`docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md`](../superpowers/specs/2026-08-12-protocol-multi-command-design.md) 了解数据模型
- 改前必跑 `bump-version.ps1`
- subagent 用法: 1 task 1 subagent, ≤ 500 行 / ≤ 3K prompt, parent agent 跑 verify
- 全部开发 SOP 见 `.minimax/skills/serialcube-workflow/`

## 相关文档

| 文档 | 用途 |
|------|------|
| [`HANDOFF-POST-V1.1.0-2026-08-12.md`](HANDOFF-POST-V1.1.0-2026-08-12.md) | 发版后会话交接(在做什么 / 待做什么) |
| [`HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md`](HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md) | v1.1.0 设计阶段交接 |
| [`HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md`](HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md) | 实施 checklist |
| [`changelog/2026-08-12-protocol-multi-command.md`](../changelog/2026-08-12-protocol-multi-command.md) | 完整变更记录(6.9KB) |
| [`docs/superpowers/specs/2026-08-12-protocol-multi-command-design.md`](../superpowers/specs/2026-08-12-protocol-multi-command-design.md) | 正式 design spec (源真值) |
| [`docs/superpowers/plans/2026-08-12-protocol-multi-command-impl.md`](../superpowers/plans/2026-08-12-protocol-multi-command-impl.md) | 18-task 实施 plan (29KB) |

## Git 状态

- **HEAD (main):** `fcd6cfb` (merge commit)
- **tag v1.1.0:** → `b02b9a4`
- **feature 分支(保留):** `origin/feature/protocol-multi-command` → `b02b9a4`
- **workflow run #5:** https://github.com/yubiediu826/SerialCubeWeb/actions/runs/31567431305 (17s success)
- **在线访问:** https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html
- **Last-Modified:** 2026-08-12 05:42:39 GMT

## 统计

- **14 文件修改** (3 modify + 11 new)
- **+7544 / -696 行**
- **14 / 14 task 完成**
- **13 / 13 端到端场景通过**
- **7 / 7 task 级 verify 通过**
- **0 console.error**
- **0 conflict**(merge 自动 ort strategy 顺利)

**Co-Authored-By:** Mavis (M3) <noreply@local>
