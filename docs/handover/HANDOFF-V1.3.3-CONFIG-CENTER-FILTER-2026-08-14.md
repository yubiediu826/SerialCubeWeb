# SerialCube v1.3.3 交接 — 协议配置中心过滤 + UI 简化 + 自动持久化

> **状态:** 正常 hotfix release (不 bump minor)
> **VERSION:** 1.3.2.1 → 1.3.3
> **commits:** 1 个 (v1.3.3 修复合集, 待 push)
> **影响:** 配置中心 modal 行为变更 + 自动持久化 + UI 一致性

---

## TL;DR

v1.3.2 实测发现 3 个**新阻断 bug** + 3 个**UI 一致性问题**,在 v1.3.3 一次性修完。**同时**把原本"v1.3.2.1 修复"作为子版本合入 v1.3.3,避免 4 段版本号(bump-version.ps1 不支持)。

3 个新 bug:
1. **badge 跨协议总数** — 选 modbus 后顶部还显示 bms 8/12/0
2. **协议删除 UI 复杂** — 三选项 modal 用户觉得不安全
3. **删协议刷新回弹** — 协议没自动持久化

3 个 UI 一致性:
4. **顶部"导入"按钮** — 跟"导入/导出" tab 重复
5. **底部"导出"按钮** — 跟"导入/导出" tab 重复
6. **顶部"新建协议"按钮** — 在所有 tab 显示, 实际只对协议 tab 有效

---

## 主要交付 (1 commit)

| commit | 内容 |
|---|---|
| `(v1.3.3)` | fix: 协议配置中心 3 tab 按 activeProtoId 严格一一对应 + 协议删除默认级联 + 自动持久化 |

**待 push**: 1 commit (7 files, +349 / -158)

**关键文件**:
- `SerialCube.html` (498 行变化) — 1 新函数 `_refreshConfigCenterBadges` + 9 处 badge 统一 + 3 个 tab 渲染器 + 协议删除改简单 confirm + 3 个新持久化函数 + 14 处 `_saveUserConfig` hook
- `README.md` / `docs/README.md` / `docs/CHANGELOG.md` — 版本号 + 索引
- `docs/changelog/2026-08-14-v1.3.3-config-center-proto-filter.md` — 完整 9 段详情 (新)

---

## 关键决策

### 1. 用 1.3.3 不用 1.3.2.1 / 1.3.2.2 / 1.3.2.1.1

bump-version.ps1 只支持 3 段版本号,4 段会报错。1.3.3 是干净命名,涵盖 1.3.2.1 之外的所有未发版修复。

### 2. badge 严格按 activeProtoId 过滤 (没选 = 0/0/0)

**取舍**:
- 旧: 没选时回退全部协议总数 (向后兼容, 用户能"取消激活看全部")
- 新: 没选时 = 0/0/0 (跟"未选占位"tab 一致, 跟仪表盘"未连接串口"逻辑对齐)

**为什么这样选**: 用户多次反馈"tab 显示 8/12 但未激活, 应该一一对应"。跟"一一对应"原则保持一致, 比"向后兼容"更重要。

### 3. 协议删除改简单 confirm, 命令/卡片保留三选项

**取舍**:
- 协议: 用户明确说"默认删除协议就是全部删除", 简单 confirm 一步到位
- 命令/卡片: 三选项 modal 仍保留 (用户可能想"只删命令, 引用卡片保留")

**为什么这样选**: 协议删除的影响是"连根拔起"(整协议 + 所有引用), 简单 confirm 够用; 命令/卡片删除的影响是"局部"(只该命令/该卡片), 三选项 modal 留作兜底。

### 4. 加自动持久化, key = `serialcube.userConfig.v1`

**取舍**:
- 旧: `NS.exportConfig` 手动导出 JSON 文件
- 新: 每次 modify 后自动写 localStorage, 启动时自动恢复

**为什么这样选**: 用户的痛点"删协议刷新回弹" = 协议没存。如果只改 export, 还得让用户每次手动导出/导入。auto-save 是"零配置"的持久化, 符合"零安装零后端零依赖"定位。

**存储内容**:
```json
{
  "protocols": [...],
  "cards": [...],
  "alerts": [...],
  "activeProtoId": "proto_bms"
}
```

**Reset 行为**: "重置为默认配置" 按钮会清 localStorage + 恢复 `_defaultProtocols()` + `_defaultCards` 副本。

---

## 实施细节

### 改动 1: badge 严格过滤 (问题 1)

**位置**: `SerialCube.html:15085-15108` (`_refreshConfigCenterBadges`)

**前**:
```js
cmdsForActive = protoId ? (p && p.commands) || [] : (typeof NS.allCommands === 'function' ? NS.allCommands() : []);
```

**后**:
```js
cmdsForActive = protoId ? (p && p.commands) || [] : [];
```

### 改动 2: 协议删除改简单 confirm (问题 2)

**位置**: `SerialCube.html:14686-14716` (data-proto-del binding)

**前**: `_openCascadeModal('protocol', delId, '协议 ' + delId)` — 弹三选项 modal

**后**: 简单 confirm:
```js
const refSummary = (cmdCount + cardCount + alertCount) > 0
  ? `\n\n引用对象会一起删除: ${cmdCount} 条命令 + ${cardCount} 张卡片 + ${alertCount} 条告警`
  : '\n\n该协议无引用对象';
if (!confirm('确认删除协议 ' + delId + '?' + refSummary)) return;
// 直接级联删 (协议 + 所有引用对象)
NS.PROTOCOLS = NS.PROTOCOLS.filter((p) => p.id !== delId);
NS.CARDS = NS.CARDS.filter((c) => c.protocol !== delId);
NS.ALERTS = NS.ALERTS.filter((a) => a.protocol !== delId);
```

### 改动 3: 自动持久化 (问题 3)

**位置**: `SerialCube.html:10822-10870` (持久化函数) + 14 处 hook

**3 个新函数**:
```js
NS._USER_CONFIG_KEY = 'serialcube.userConfig.v1';
NS._loadUserConfig = function () { /* 从 localStorage 读 + 覆盖 PROTOCOLS/CARDS/ALERTS/activeProtoId */ };
NS._saveUserConfig = function () { /* 写 localStorage JSON.stringify */ };
NS._clearUserConfig = function () { /* removeItem */ };
```

**14 处 hook** (modify 路径):
1. 启动时 `_loadUserConfig` (在 `NS.CARDS = [...]` 默认值后立即调, 避免被覆盖)
2. `NS.toggleActiveProtocol` 切协议
3. 协议删除 (已加)
4. 协议复制 (line 14681)
5. 协议导入 (line 14641)
6. 协议新建 wizard 完成 (line 14298)
7. 命令新建/删除/编辑 (line 14796, 16032)
8. 卡片新建/删除/编辑 (line 14882, 14962, 16260)
9. 告警新建/删除/编辑/toggle (line 15079, 15090, 15375)
10. ie 导入/重置 (line 15678, 15713)
11. `NS.reset` 调 `_clearUserConfig`

### 改动 4: UI 一致性 (4 处 HTML + 3 处 JS)

**删**:
- HTML `dh-cc-proto-import-header` 按钮 (line 8440-8443) — 顶部"导入"
- HTML `dh-config-center-export` 按钮 (line 8476) — 底部"导出"
- HTML `dh-cc-proto-new-header` 按钮 (line 8444-8447) — 顶部"新建协议"
- JS `dh-cc-cmd-proto-select` 协议下拉框 + `_ccSelectedProtoId` 独立状态 (line 14691-14711)

**挪**:
- "新建协议" 按钮从 modal 顶部挪到协议 tab 内容区右上 (id 改 `dh-cc-proto-new-inside`)

**加**:
- `_renderConfigCenter` 入口处总是更新 footer "共 N 个协议" (不依赖 tab 切换)

### 改动 5: cards / alerts 行 idx 改全局下标

**位置**: `SerialCube.html:14775-14798` (cards) + `14957-14974` (alerts)

**前**: `cardsScoped.map((c, i) => ...)` — 用 filtered 局部下标, 删/编辑调 `NS.CARDS[idx]` 拿到错位的卡片

**后**: 用 `NS.CARDS.indexOf(c)` 全局下标

**根因**: 之前 v1.3.2 引入"按 activeProtoId 过滤"但用 filtered 下标, 选了 modbus 后点 modbus 卡片编辑会打开 bms 卡片

---

## 实测验证

| 场景 | 期望 | 实际 |
|------|------|------|
| 默认 (无激活) | badges 0/0/0, tab 显示"未选占位" | ✓ |
| 选 modbus | badges 0/0/0, tab 显示"协议 MODBUS · 共 0 ..." | ✓ |
| 选 bms | badges 8/12/0, tab 显示"协议 BMS · 共 8 条命令" + 12 行卡片 | ✓ |
| 切到 cards / alerts tab (没选) | 显示"未选择协议"占位 + "去 协议 tab 激活" 按钮 | ✓ |
| footer "共 N 个协议" | 切任意 tab 立即反映真实数字 | ✓ |
| 删 bms 协议 | confirm 弹"引用对象会一起删除: 8 命令 + 12 卡片 + 0 告警" → 确认 → 直接级联 | ✓ |
| 删后刷新 | 仍是 1 个协议 (modbus), 没回默认 | ✓ |
| 切协议后刷新 | activeProtoId 仍保留 | ✓ |
| 改/删/增 卡片/告警 | 刷新后保持 | ✓ |
| "重置为默认配置" | 清 localStorage + 恢复 _defaultProtocols + _defaultCards | ✓ |

---

## Backlog (v1.3.4+)

- **`_refreshConfigCenterBadges` 跟 `_renderConfigCenter` 重复**: 9 处调用点里有 7 处跟 `_renderConfigCenter()` 配对, 后续可考虑合并到统一"重渲配置中心"函数
- **cards / alerts tab 加 toggle "看全部 / 只看当前协议"**: 让用户在"严格按协议过滤"和"看全部"间快速切换 (目前需要点协议行的 ○ 取消激活)
- **commands tab 协议下拉删除后, badge 跟下拉解耦**: badge 只跟 activeProtoId (已修), 但 commands tab 内容现在也只跟 activeProtoId (已修), 跟 _ccSelectedProtoId 完全解耦, 后续可以删 NS._ccSelectedProtoId 字段 (留作兼容)
- **自动持久化 key 升级策略**: v1 是 `serialcube.userConfig.v1`, 后续字段增加要 bump 到 v2, 加 schema version 字段
- **`_saveUserConfig` 性能**: 现在每次 modify 都同步写 localStorage, 大数据集 (>10MB) 可能卡顿, 后续用 debounce 300ms 已经做了 (但只在 _renderConfigCenter 末尾触发, modify 路径不调, 实际还是每次写)

---

## 关联文档

- **v1.3.2 修复详情**: [`../changelog/2026-08-14-v1.3.2-dashboard-bug-fixes.md`](../changelog/2026-08-14-v1.3.2-dashboard-bug-fixes.md)
- **v1.3.2.1 占位区 3 状态详情**: [`../changelog/2026-08-14-v1.3.2.1-dashboard-state-3way.md`](../changelog/2026-08-14-v1.3.2.1-dashboard-state-3way.md)
- **v1.3.3 完整详情 (本 release)**: [`../changelog/2026-08-14-v1.3.3-config-center-proto-filter.md`](../changelog/2026-08-14-v1.3.3-config-center-proto-filter.md)
- **v1.4.0 回滚 handoff** (策略参考): [`HANDOFF-2026-08-14-V1.4-ROLLBACK-AND-MAINTENANCE.md`](HANDOFF-2026-08-14-V1.4-ROLLBACK-AND-MAINTENANCE.md)
- **PENDING v1.3 (v1.3.0 启动历史快照, 仅供参考)**: [`HANDOFF-PENDING-V1.3-2026-08-12.md`](HANDOFF-PENDING-V1.3-2026-08-12.md)
