# HANDOFF V1.2.2 — 协议编辑器深度打磨 (2026-08-13)

## 概要

v1.2.2 是 v1.2.1 协议编辑器 UI 一致性修复的延伸, 在用户实地使用中发现的细节问题集中修复.
本轮**没有引入新功能**, 全部是 bug 修复 + UI 微观打磨, 6 个 commit 全部 in-place 改动.

## 核心问题 + 修法

| # | 反馈 | 根因 | 修法 | Commit |
|---|---|---|---|---|
| 1 | 帧预览 dropdown 切换后 bytes 不更新 | `const NS` 不挂 window, inline `onchange="NS.xxx()"` 报 ReferenceError 静默失败 | `const NS` 后面加 `window.NS = NS;`, 4 处 inline handler 全部恢复 | `52f4b8a` |
| 2 | 命令列表文本/数值没对齐, 按钮过近, 灰底突兀, 缺 hover 反馈 | `.cmd-list-table` 用 `.inline-edit-table` + `.frame-preview` 灰底, 没专门的命令列表样式 | 新增 `.cmd-list-table` + `.cmd-actions` + `.cmd-row-active`, 表格行用 row divider 不再灰底, 按钮 28×28 + gap 6px | `52f4b8a` |
| 3 | 帧预览 dropdown 切换, 命令列表不高亮当前 cmd | dropdown 切换只刷 frame preview, 不刷命令列表 | `_protoEditFrameCmdChange` 末尾调 `_renderProtoEditCommandsSection(proto, cmd.id)`, 旧段加 `dh-cmd-list-section` class 便于去重 | `52f4b8a` |
| 4 | 帧预览"基于 [dropdown]" 中文被拆字竖排 | `<span style="display:flex">` 容器里直接放中文, 浏览器把每字当匿名 inline-block flex item, gap 把它们纵向分开 | "基于" 包独立 `<span>` 作为单个 flex item, 父加 `white-space:nowrap + flex-shrink:0` | `739d88b` |
| 5 | 帧预览 byte 被强制 wrap 成 2 行 | `.frame-bytes` `word-break: break-all` 在窄容器里强制断行 | `.frame-bytes { white-space: nowrap }` + `.frame-preview { overflow-x: auto }` | `52f4b8a` |
| 6 | 嵌套 modal 没虚化, 看不到 focus 在哪 | 之前 `NS.openModal` 不管下层 modal 状态 | 加 `.modal.modal-dimmed { filter: blur(3px); opacity: 0.5 }`, openModal/closeModal 自动管理 | `2e15ab6` |
| 7 | 帧预览 UI 在协议编辑器/命令编辑/仪表盘 3 个 modal 各一套 | `NS.renderFramePreview` 旧版用分列 5 段, 跟协议编辑器 `.frame-bytes + .frame-meta + .legend` 不一样 | 重写 `NS.renderFramePreview` 用同款 DOM, 3 处 modal 像素级一致 | `2e15ab6` |
| 8 | 嵌套 modal 虚化导致"重开同 modal 也被自己 dimmed" | `openModal` 没 dedup, `forEach` 加 dimmed 时自己也在 stack 里 | 加 `_refreshModalDimmed()` 辅助函数 + openModal 顶部 dedup + closeModal while 全删同名 | `d10b134` |
| 9 | 协议编辑器点编辑命令弹"新建命令" | `data-edit-cmd` onclick 调 `openNewCommandModal(proto.id, cmd)` 漏传 `'edit'` mode | 加 `'edit'` 参数 | `a571ffe` |
| 10 | 标题永远"新建命令"（#9 的副 bug）| title selector `#dh-new-command .modal-title` 找不到元素, modal 实际标题在 `#dh-new-cmd-modal-title` | selector 改 `getElementById('dh-new-cmd-modal-title')` | `a571ffe` |
| 11 | 新建命令 modal 下拉框比 input 高, 视觉乱 | `.new-cmd-row input/select` 只设 `padding: 6px 10px`, 没设 height | input/select 统一 `height: 32px`, row 加 `align-items: end` | `a571ffe` |

## 关键决策

### D1: const NS 不挂 window 是潜在已久的 bug

inline `onchange="NS._protoEditFrameCmdChange()"` 在 SerialCube 里用了至少 4 处,
浏览器解析时 element scope → window 链上找 `NS`, 但 `const NS = ...` 不会自动挂到 window,
所以 `NS` 是 `undefined`, 4 处 inline handler 全部静默 ReferenceError. 之前没人发现是因为:
- `dh-dash-settings-btn` 一直是 disabled 状态
- 其它 inline onclick 用户没触发到

**这次发现**: 协议编辑器的帧预览 dropdown 用户**每次切都触发**, 终于暴露. 修法一行 (`window.NS = NS;`), 一次性修 4 处.

### D2: 帧预览 UI 统一, 不重写 `_renderFramePreview`

- 协议编辑器用 `NS._renderFramePreview(frame, proto)` 接受完整 buildFrame 结果
- 命令编辑 / 仪表盘用 `NS.renderFramePreview(containerId, cmdOrState)` 接受 cmd 或临时 state
- 两者输入参数不同, **不能**简单互调
- 选择**重写 `renderFramePreview`** 用同款 DOM 结构, **保留** `_renderFramePreview` 不动
- 命令编辑的临时 state 走 `cmdOrState.dataFields` 拿, 不依赖 `buildFrame` (后者用 `cmd.dataFields`)

### D3: 嵌套 modal 虚化用 `_refreshModalDimmed()` 集中算

之前第一版用 `forEach` 加 dimmed, 但有 bug: 重开同 modal 时自己也在 stack 里, 把自己 dimmed.
修法抽 `_refreshModalDimmed()` 集中算, 每次 open/close 后调一次:
- 全部 modal 清 `modal-dimmed` class
- stack **除顶部外** 加 `modal-dimmed`
- 顶部 (用户当前 focus 的) 不加
+ `openModal` 顶部 dedup (同名先关)
+ `closeModal` while 全删同名残留 (防 stack 重复)

## 累计 commit (本机)

```
a571ffe fix(v1.2.2): 协议编辑器点编辑命令弹的是新建 + 修复 modal 标题切换 + 统一表单高度
d10b134 fix(v1.2.2): 嵌套 modal 虚化 dedup 修复 (重开同 modal 不再把自己 dimmed)
2e15ab6 fix(v1.2.2): 嵌套 modal 下层虚化 (focus 聚焦栈顶) + 命令/仪表盘 modal 帧预览 UI 跟协议编辑器统一
739d88b fix(v1.2.2): 帧预览"基于 [dropdown]" 标题中文被拆字竖排
52f4b8a fix(v1.2.2): 协议编辑器 inline onchange 失效 (const NS 不挂 window) + 帧预览 dropdown 实时刷新
5f48521 fix(v1.2.2): 新建/导入/复制协议后立刻调 _renderConfigCenter 重渲染列表
+ 之前 v1.2.1 13 commits
+ 之前 v1.2.0 1 commit
```

**6 个新 v1.2.2 commit 全部已 push 到 GitHub origin/main** (代理 127.0.0.1:7897 在 11:58 恢复).

## 文件变更

| 文件 | 改动 |
|---|---|
| `SerialCube.html` | 累计 +281 / -123 (10 个 fix 集中) |
| `docs/changelog/2026-08-13-v1.2.2-proto-edit-cmd-list-polish.md` | 增量 changelog (新建) |
| `docs/handover/HANDOFF-V1.2.2-2026-08-13.md` | 本文档 (新建) |
| `.tmp/v1.2.2-proto-edit-v2-preview.html` + `.png` | 设计预览 (新建, 留档) |
| `.tmp/v1.2.2-frame-*.png` + `*-dimmed-modal.png` + `*-edit-modal-fixed.png` | 实测截图 (新建, 留档) |
| `.minimax/archive/docs-cleanup-2026-08-13/commit-msg-{1-6}-v1.2.2.txt` | commit msg 归档 |

## 守门验证

```
check-readme-sync.ps1 → 4 项 OK (warning v1.0.0 旧引用不动)
check-cleanup.ps1    → 0 temp / 0 unused
agent-browser 实测   → 6 个 modal/场景全部 OK
```

## 下一步建议

- [ ] v1.2.2 暂不需继续修, 等待用户新反馈或下一波功能需求
- [ ] v1.2.3 候选: 命令编辑 modal 数据字段的拖拽排序 / 数据类型 enum 完善
- [ ] v1.3 候选: 卡片配置 modal header 标准化 (跟协议编辑器同款单行布局)
- [ ] 长期: 把 `const NS` 改成 `var NS = window.NS = ...` 避免未来再出 inline handler 找不到 NS 的问题

## 已知 issue / 不在 v1.2.2 范围

- 命令编辑 modal 的"帧预览"在仪表盘设置值 modal 同样调用 `renderFramePreview`, CRC 计算是占位 "— (实时占位)" (实时算 CRC 需要调 `NS.computeCrc`, 留待 v1.2.3)
- 帧预览的 byte 颜色 chip 在 light/dark 主题下都已验证, 但还没做"用户自定义配色"功能
- "基于 [dropdown]" 在非常窄 modal (< 400px) 下, "基于" 文字会被压缩 (flex-shrink:0 已经处理)
