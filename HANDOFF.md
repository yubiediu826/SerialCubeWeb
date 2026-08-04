# SerialCube 项目 Mavis 会话交接文档

**日期**: 2026-08-04
**来源 session**: mvs_624d8a7c80df49169cf53699a6d5b900 (root)
**会话时长**: ~2 小时 (8:32 → 10:22)
**目的**: 新 session (root 或 branch) 开场快速恢复工作

---

## 1. 当前项目状态

**仓库**: `D:\WorkSpace\SerialCubeWeb` (SerialCube.html 单文件, GitHub Pages 部署)
**最新 commit**: `3981f29` (v4.8b kind 1-7 真实实现)
**origin/main**: up to date, 0 commits ahead, working tree clean
**总 commits 本 session**: 13 (2 spec/plan + 9 v4.8a + 1 v4.8b + 1 sync)

**v4.8 全部完成** ✅:
- 11 个实施 commit + 2 个 spec/plan commit, 全部 push
- AGENTS.md 数据兼容性 5 条全部不动

---

## 2. v4.8 实施清单 (11 commits)

| Commit | 内容 | 大小 |
|---|---|---|
| `c213460` | v4.8a.1 `NS._KIND_TEMPLATES` 8 kind metadata | +13 行 |
| `4e7bca7` | v4.8a.2 `NS.PROTOCOLS` 加 `kind` 字段, 现状 2 协议改 kind 0 | ±2 行 |
| `65170b0` | v4.8a.3 默认 PROTOCOLS 同步 (line 11010) | ±2 行 |
| `c877e4f` | v4.8a.4 user config 兼容 (无 kind → kind 0) | +7/-1 行 |
| `556fc96` | v4.8a.5 公共抽 `_computeCrcInput` + `_encodeCrcBytes` | +58 行 |
| `ddcfe6e` | v4.8a.6 `_buildFrameFixedHeader` 实现 (kind 0, 100% 兼容现状) | +12/-69 行 |
| `9850aeb` | v4.8a.7 kind 1-7 stub (NOT_IMPLEMENTED 中间状态) | +25 行 |
| `edb2dfb` | v4.8a.8 `NS.buildFrame` 改 dispatcher (switch on kind) | +25/-8 行 |
| `94a09fc` | v4.8a.9 协议编辑器 验证 按钮 + 错误 UI (红徽章 + 红框 + toast) | +120 行 |
| `3981f29` | v4.8b kind 1-7 真实实现 (raw / cmd-split / addr-split / ctrl-bit7 / type-high-bit / msgid-mixed / tlv) | +164/-7 行 |

**Plan 修正 3 处** (实现时发现,已 commit):
1. **Task 6**: 加 `NS.buildFrame = NS._buildFrameFixedHeader` 临时出口(避免中间状态破坏 UI)
2. **Task 7-8**: dispatcher / stub 错误时也返 `bytes: [], sections: []`(兼容 `_renderFramePreview` 调用方)
3. **Task 9**: 验证按钮位置放 modal-header toolbar(跟导入导出同 toolbar-btn 风格,设计一致)

---

## 3. 待办事项

### 立即待办 (v4.8 浏览器 smoke test)
- [ ] 加载 SerialCube.html → 打开 dashboard 模式 → c1-c10 卡片值跟 v4.7 一致
  - Cell 1 ~4.2-4.6V, Pack 均压 ~3.7V, pair 卡 c9 SET 56.0 / ACT ~55.7
- [ ] 协议编辑器 验证 按钮:
  - "BMS TLV v1 (Legacy)" tab → 验证 → "协议验证 OK" toast
  - "Modbus RTU (Legacy)" tab → 同上
  - 临时 `NS.PROTOCOLS[0].kind = 'raw'` → 验证 → "协议错误: NOT_IMPLEMENTED" toast + 红框 + tab 红徽章
  - 还原
- [ ] kind 1-7 测试协议 (DevTools 临时加) → 字节输出符合 spec 3.5 字段表
- [ ] 旧 user config 兼容: `NS.PROTOCOLS = [{...无 kind...}].map(p => ({...p, kind: p.kind || 'fixed-header'}))` → kind 自动归 'fixed-header'

### 后续 sub (留 spec/plan/session)
- **sub-2**: parseFrame (贴字节反解析) + 协议编辑器 UI 重构 (kind 下拉 + 动态 fields)
- **sub-3**: cmd 字段映射重构 (dataSize 自动算) + **pair trigger 真实发送 (0x10/0x11)** ← 用户原 list 第 3 项
- **v5**: 历史回放 (.timeline 录制/回放打磨) ← 用户原 list 第 5 项
- **v4.8.x+**: 端到端真串口验证 (需要用户接真设备)
- **未来**: 测试基础设施 (Playwright / vitest) — PRODUCT.md 列为"未决问题"

---

## 4. 关键文件位置

| 路径 | 用途 |
|---|---|
| `SerialCube.html` | 主单文件, 15841 行 / 580.5 KB |
| `HANDOFF.md` | **本交接文档 (新 session 开场必读)** |
| `docs/superpowers/specs/2026-08-04-tlv-protocol-refactor-sub1-design.md` | v4.8 spec (15.5KB, 11 节) |
| `docs/superpowers/plans/2026-08-04-tlv-protocol-refactor-sub1-plan.md` | v4.8 plan (69.9KB, 18 tasks) |
| `.superpowers/sdd/2026-08-04-tlv-protocol-refactor-sub1-plan/progress.md` | v4.8 ledger (SDD 进度) |
| `AGENTS.md` | 强制 skill 链 + 数据兼容性 (必读) |
| `PRODUCT.md` | 项目背景 + 路线图 |
| `DESIGN.md` | 设计系统 (kind 0 徽章样式以后可能要用) |
| `docs/architecture.md` | 架构总览 |

---

## 5. 关键设计决策 (避免新 session 重新 brainstorm)

### 数据模型 (B 方案 — protocol.kind + 7 套 kind 模板)
- `NS._KIND_TEMPLATES` 8 个 kind metadata (固定, 不可加新 kind)
- `NS.PROTOCOLS` 加 `kind` 字段, 默认 'fixed-header' 兼容旧 user config
- 8 kind: `fixed-header` (legacy) / `raw` / `cmd-split` / `addr-split` / `ctrl-bit7` / `type-high-bit` / `msgid-mixed` / `tlv`
- 7 kind 都是"方向参与 frame 编码", kind 0 单独是"header 写死"
- **加 kind 0 原因**: commit message 7 kind 设计跟现状 BMS 协议(0xAA 写死 header, 方向不参与)不兼容, 加 kind 0 兼容 + 标 Legacy

### buildFrame 拆法
- `NS.buildFrame` 是 dispatcher, switch on `protocol.kind`
- 8 个 `_buildFrameXxx` 子函数
- 公共抽 `_computeCrcInput` + `_encodeCrcBytes`
- 错误处理: 返 `{ error: 'CODE', bytes: [], sections: [] }` (跟现状 UI 调用方兼容, .bytes 不崩)
- 错误码: `NO_PROTOCOL` / `UNKNOWN_KIND` / `MISSING_FIELD` / `INVALID_TYPE` / `CRC_ERROR` / `NOT_IMPLEMENTED`

### 错误处理
- 严格模式 + UI 错误提示 (不静默 fallback)
- 协议编辑器 验证 按钮 (modal-header toolbar) 触发 buildFrame 验证
- 错误时: 协议 tab 红徽章 ⚠ + 字节预览区红框 + 顶部 toast (3s 自动消失, var(--danger) 红框 / var(--accent) OK 绿框)
- AGENTS.md 严格模式 = "bug 早暴露, 不要静默失败"

### 用户偏好 (从对话总结,避免重复问)
- 中文 commit message, 标题一行, 正文分段 (背景 / 范围 / 验证)
- 多个相关文件一次 commit, 不拆碎片
- 改 UI 后用户自己浏览器验证 (AGENTS.md "看截图找问题, 不查 console")
- 重视 UI 整洁度 (v6.3 移除告警 ? 图标就是例子)
- 喜欢 antd 风格: tab 用 antd 卡片式
- 不喜欢被防御性提问打断, 偏好直接动手
- 工作领域: 户外电源 (portable power station) BMS/EMS/PCS 通信协议, 工业级 TLV/Modbus

---

## 6. 数据兼容性约束 (AGENTS.md 强制)

| 字段 | 处理 |
|---|---|
| `localStorage` keys (`serialweb:prefs` / `serialweb:version-modal-seen` / `wsl-*`) | **不动** |
| 配置 JSON type (`SerialWebUserConfig` v1) | **不动** |
| `.timeline` 二进制 magic (`WSLBIN1`) | **不动** |
| API 路径 (`/api/serialweb_page-view`) | **不动** |
| JS 内部命名 (`__serialWeb*` / `clearSerialWebStoredUserData`) | **不动** |

---

## 7. 下次会话建议

### 开场 (新 session 必走)
1. **先读本 HANDOFF.md** 恢复 context (5 分钟)
2. 跑浏览器 smoke test 验证 v4.8 (上面 "立即待办" 清单, 5-10 分钟)
3. 报告 v4.8 状态 (OK / 有问题), 选下一项

### 下一项候选 (按用户原 list)
- **pair trigger 接 0x10/0x11 真实发送** (sub-3, 30-45 分钟, 需要新 spec/plan)
- **v5 历史回放** (.timeline 录制/回放打磨, 1-2 小时, 独立大块)
- **sub-2 协议编辑器 UI 重构** (kind 下拉 + 动态 fields, 中等)

### 新 session 工作流
- 直接说"按 HANDOFF.md 继续 [具体任务]"
- 跟之前一样走 `using-superpowers` / `brainstorming` (新任务需要 design 时)
- AGENTS.md 强制 skill 链不能跳过

---

## 8. 进度追踪

`.superpowers/sdd/2026-08-04-tlv-protocol-refactor-sub1-plan/progress.md` 保留 v4.8 完整 ledger (Setup + Tasks 1-9 + Task 11-18 + Plan 修正 3 处 + 后续清单), 新 session 可读。

---

**最后更新**: 2026-08-04 10:22 (本 session 结束)
**下次会话提示**: 浏览器 smoke test → 报 v4.8 状态 → 选下一项 (pair trigger / v5 / sub-2/3 / 暂停)
