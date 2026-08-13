# SerialCube v1.2 → v1.3 接力交接 — 未完成 + 进行中

> **用途:** v1.2 已推完 (commit 9ccf560, origin main 同步), 这份文档专门记**还没做的事**和**正在进行的事**。
> **最后更新:** 2026-08-13
> **当前版本:** v1.3.0 (本地已 commit, 待 push)
> **下一步版本:** v1.3.1+ (backlog 剩余 6 项)
> **关联文档:** [`HANDOFF-V1.2-2026-08-12.md`](HANDOFF-V1.2-2026-08-12.md) (v1.2 完整交接 + 已知限制)

## v1.3.0 启动记录 (2026-08-13)

- **首个任务:** 真实模拟调试面板 (原 v1.3 backlog 第 1)
- **4 决策齐:** 核心场景 = B 主从协同 / 通信层 = A 同浏览器多 tab / UI 形态 = A 折叠浮窗 / Mutator 颗粒度 = C 单条+预设 chip
- **设计 spec:** [`../superpowers/specs/2026-08-13-v1.3.0-debug-panel-design.md`](../superpowers/specs/2026-08-13-v1.3.0-debug-panel-design.md) (430 行, 已 commit 07392f9)
- **UI 预览:** [`../design/v1.3-debug-panel-mockups.html`](../design/v1.3-debug-panel-mockups.html) (3 候选 mockup, 已 commit 07392f9)
- **实施 plan:** [`../superpowers/plans/2026-08-13-v1.3.0-debug-panel-plan.md`](../superpowers/plans/2026-08-13-v1.3.0-debug-panel-plan.md) (4 task / 968 行, 已 commit 4126797)
- **实施进度:** ✅ 4 task 全完成, 4 commit 本地 (Task 1-4: 5408146/35d9b91/fafa45c/2884333)
- **commits:** v1.3.0 调试面板 4 + v1.3.0 文档 4 = 8 commit 本地, 累计 v1.2.2 hotfix 3 = 11 commit 待 push, 等用户拍板
- **剩余 v1.3.1+ backlog:** 5 项 (恢复设置值 / 告警编辑升级 / modal 切协议缓存 / checkAlert 性能 / 自定义域名), 等 v1.3.1 完成后按优先级排

## v1.3.1 启动记录 (2026-08-13)

- **首个任务:** 三选项级联 modal (v1.3.1 backlog 候选 B, 已上轮的 v1.3 backlog B 之后)
- **3 决策齐:** 引用预览 A 简单计数 / 范围 A 只升 3 个 (协议/命令/卡片) / 仅删自己 A 3 选项统一
- **设计 spec:** [`../superpowers/specs/2026-08-13-v1.3.1-cascade-delete-modal-design.md`](../superpowers/specs/2026-08-13-v1.3.1-cascade-delete-modal-design.md) (12KB, 已 commit fc5c84f)
- **UI 预览:** [`../design/v1.3.1-cascade-delete-modal-mockup.html`](../design/v1.3.1-cascade-delete-modal-mockup.html) (3 场景切换, 已 commit c48adbe)
- **实施 plan:** [`../superpowers/plans/2026-08-13-v1.3.1-cascade-delete-modal-plan.md`](../superpowers/plans/2026-08-13-v1.3.1-cascade-delete-modal-plan.md) (3 task / 36KB, 已 commit fc5c84f)
- **实施进度:** Task 1 (VERSION + changelog + 3 e2e) 进行中
- **commits:** mockup + spec/plan 共 2 个本地, Task 1-3 待 commit
- **剩余 v1.3.1+ backlog:** 4 项 (恢复设置值 / 告警编辑升级 / modal 切协议缓存 / checkAlert 性能), 等 v1.3.1 完成后按优先级排

---

## 🚀 TL;DR — 30 秒看完

**v1.2 已完成（看 HANDOFF-V1.2）:** 13 commits / 5 UI 问题 / 4 Tab 表格化 / 告警独立 / 删除级联

**还需要你做的事（3 项）:**
1. ⏳ **等 GitHub Pages 重新部署**（push 后自动，5-10 分钟生效）
2. 🖱️ **手动跑 3 个 e2e 场景**（agent-browser 不可用，只能你浏览器实测 + 截图）
3. 🤝 **决定 2 个副作用**（remote URL 改 HTTPS / commit author 是 Mavis@local）

**v1.3 计划（6 项）:** 看下面"v1.3 Backlog"

**环境问题（3 项, 低优先）:** agent-browser 没装 / pwsh 没装 / 代理端口不稳

---

## ⏳ 进行中 (In-Flight) — 需要你决策或验证

### 1. GitHub Pages 自动部署验证

| 状态 | 说明 |
|------|------|
| ⏳ 进行中 | push 到 main 后 GitHub Actions 自动触发 Pages 部署 |
| 预期时间 | 5-10 分钟 |
| 验证方式 | 打开 <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html> 看是否 v1.2.0 |
| 验证 VERSION | DevTools Console 跑 `document.title` 或看 About 弹窗 |
| 失败排查 | GitHub → Actions 页面看 build log |

**不会做的事：** 我不会自动设 cron 监控 Pages，因为：
- 5-10 分钟自己检查更轻量
- 你打开浏览器就顺便看了，比 cron 准

---

### 2. 3 个 e2e 场景手动跑 (无 agent-browser)

| 场景 | 验证点 | 截图存哪 |
|------|--------|----------|
| 07-dashboard-single-protocol | 仪表盘未连接占位 + DB9 icon + 切换协议 modal | `.minimax/skills/serialcube-e2e/screenshots/07-dashboard-disconnected.png` |
| 08-cmd-edit | 命令编辑三模式 + 字段预填 + 复制 ID+1 | `.minimax/skills/serialcube-e2e/screenshots/08-cmd-list.png` / `08-cmd-edited.png` |
| 09-alert-edit | 重建 10 条 + 严重度三档 + 编辑预填 + 删除 | `.minimax/skills/serialcube-e2e/screenshots/09-alert-{empty,rebuilt,edited}.png` |

**完整步骤：** 看 `.minimax/skills/serialcube-e2e/scenarios/07-09-*.md`（agent-browser CLI 命令你浏览器里手工点）

**当前状态：** 全部用 `Select-String` + `read` 代码层静态验证过，关键代码路径都在位。**但 UI 实际效果（hover 态/动画/响应式）只有你浏览器看得见。**

**screenshots 目录不存在（需要建）:**
```powershell
mkdir .minimax/skills/serialcube-e2e/screenshots
```

---

### 3. 2 个 Push 副作用 — 需你决策

| # | 副作用 | 当前状态 | 选项 A（推荐） | 选项 B |
|---|--------|----------|----------------|--------|
| 3.1 | **remote URL 改了** | `https://github.com/yubiediu826/SerialCubeWeb.git` (HTTPS) | **保持 HTTPS**（凭证管理器 + proxy 已能工作，少折腾） | 切回 SSH `git@github.com:...`（需先 `ssh-keygen` + 上传公钥到 GitHub） |
| 3.2 | **commit author 是 Mavis** | 所有 v1.2 commits (15 个) author = `Mavis <Mavis@local>` | **保持 Mavis**（标识是 agent 生成, 反而便于追溯） | 改回 `yubiediu826 <yubiediu826@163.com>`（用 git rebase 改） |

**怎么改：**
```powershell
# 3.1 切回 SSH
git remote set-url origin git@github.com:yubiediu826/SerialCubeWeb.git

# 3.2 批量改 author (改完 force-push, ⚠️ 改历史)
git rebase -i 4dcffbf~1 --exec 'git commit --amend --reset-author --no-edit'
git push --force-with-lease origin main
```

⚠️ 3.2 改历史要 force-push，**单独问你**。3.1 切 SSH 之前需先配 SSH key (`ssh-keygen` + GitHub Settings → SSH keys)。

---

## 🛑 未开始 (Not Started) — v1.3 Backlog

按用户优先级（v1.2 已知限制章节已经列过完整版）：

| 优先级 | 任务 | 描述 | 工作量 |
|--------|------|------|--------|
| 🔴 高 | **真实模拟调试面板** | 仪表盘右下角 ⚙ 按钮实装：BroadcastChannel 主从连接 + Mutator 数据注入。v1.2 留了占位 | 3-5 天 |
| 🔴 高 | **三选项级联 modal** | 删除协议/命令/卡片时弹自定义 modal (含"仅删自己 / 级联 / 取消" 3 按钮 + 引用预览)，替换 v1.2 的 browser confirm | 1-2 天 |
| 🟡 中 | **告警编辑 modal 升级** | 同样三选项 (含引用 cmd/field 选择器) + 实时预览 | 1 天 |
| 🟡 中 | **modal 切协议时缓存字段** | openNewCommandModal / openAlertEdit 切协议时保留已填字段 (缓存 form state) | 0.5 天 |
| 🟢 低 | **checkAlert 性能优化** | 按 field 建索引，>100 alert 时避免每帧全扫 | 0.5 天 |
| 🟢 低 | **GitHub Pages 自定义域名** (可选) | 看你有没有自己的域名 | 0.5 天 |

**决策记录：**
- v1.3 不做：导出 v4、插件系统、多语言
- v1.3 评估中：移动端响应式（桌面优先，目前勉强能用）

**完整 v1.3 backlog（含详情 + 决策记录）：** [`HANDOFF-V1.2-2026-08-12.md` §"已知限制 / 后续 TODO (v1.3+)"](HANDOFF-V1.2-2026-08-12.md)

---

## 🛠️ 环境问题（低优, 不阻塞 v1.2）

| # | 问题 | 影响 | 当前兜底 | 建议修法 |
|---|------|------|----------|----------|
| 1 | **agent-browser 不在 PATH** | 6+3 e2e 自动化跑不了 | 用 `Select-String` 静态 grep | 装 `cargo install agent-browser` 或 release 下载 |
| 2 | **pwsh 不在 PATH** | preflight 9 项跑不全 (Start-Job 精度低) | 用 `powershell` 兼容版 | 装 PowerShell 7 (cross-platform) |
| 3 | **git proxy 127.0.0.1:7897 不稳** | git push 有时连不上 | 切换 HTTPS + 凭证管理器 (现方案) | 配稳定代理或 unset http.proxy |

**修法详情：**
```powershell
# 1. agent-browser 安装: 看 .minimax/skills/agent-browser/SKILL.md
#    (该项目唯一浏览器入口, 替代 in-app 内置 Browser, ~10x token 省)

# 2. pwsh 安装: winget install Microsoft.PowerShell
#    验证: pwsh -Command '$PSVersionTable.PSVersion'

# 3. proxy 修法二选一:
#    a) unset: git config --global --unset http.proxy
#    b) 换端口: git config --global http.proxy http://127.0.0.1:<新端口>
```

---

## 📋 当前 main 状态 (推送后)

```
9ccf560 docs(v1.2): handoff 交接 + README/docs/CHANGELOG 索引同步   ← 最新
748bb97 test(v1.2): 3 个 e2e scenario (07-09 仪表盘/命令/告警)
3b741c2 feat(v1.2): checkAlert 改用 NS.ALERTS 独立规则
7804f7f feat(v1.2): 删除级联 confirm (_findReferences + _cascadeConfirm)
bf6aac3 feat(v1.2): 告警编辑 modal (openAlertEdit)
40669da feat(v1.2): 配置中心 Tab 4 告警重做 (独立规则 + 严重度)
c351cb0 feat(v1.2): 配置中心 Tab 3 卡片 (协议列 + 选协议+命令向导)
5559f08 feat(v1.2): 命令编辑 modal 帧预览 + 批量默认值
1b7370d feat(v1.2): 配置中心 Tab 2 命令重做 (编辑/复制/删除 + 三模式 modal)
45f540c feat(v1.2): 配置中心 Tab 1 协议重做 (列表 + 状态徽章 + 行操作)
853cc72 feat(v1.2): 选择协议 modal + 协议条切换按钮按状态显隐
526b273 feat(v1.2): 仪表盘重做 (单协议聚焦 + 未连接占位 + 调试面板占位)
a3fcc21 feat(v1.2): 数据结构 NS.ALERTS + activeProtoId + v3 export/import
1499694 chore(v1.2): VERSION 1.1.1 -> 1.2.0 + changelog 子文件 + README 同步
4dcffbf docs: v1.2 配置中心重构 实施计划 (14 tasks)
2da12f6 chore: v1.1.1 工具加固 + docs 同步 + 临时文件清理
```

**Remote:** `https://github.com/yubiediu826/SerialCubeWeb.git` (临时改的, 见 §3.1)
**Branch:** `main` (HEAD = 9ccf560, 已同步)
**未 push:** 无 (所有改动已上 remote)

---

## 🎯 v1.3 启动 Checklist (下次开工前)

```powershell
# 1. 拉最新
git pull origin main

# 2. 跑健康检查 (至少 pwsh 修好后再跑完整 preflight)
pwsh -NoProfile -File .minimax/skills/serialcube-workflow/preflight.ps1

# 3. 跑文档同步 + 清理检查 (R4 + R4.2)
powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/check-readme-sync.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .minimax/skills/version-management/scripts/check-cleanup.ps1

# 4. 决定 v1.3 第一个 Task (推荐从"真实模拟调试面板"开始, 阻塞 9 个 e2e scenario)
#    然后跑 brainstorming skill: skill({ name: "brainstorming" })

# 5. 改 SerialCube.html 前先 bump version:
pwsh -NoProfile -File .minimax/skills/version-management/scripts/bump-version.ps1 -Level minor -Note 'v1.3 真实模拟调试面板' -Type 新增
```

**v1.3 spec 模板路径:** `docs/superpowers/specs/2026-08-12-v1.3-XXX-design.md` (套 v1.2 模板)
**v1.3 plan 模板路径:** `docs/superpowers/plans/2026-08-12-v1.3-XXX-plan.md` (套 v1.2 模板)

---

## 🔗 关联文档

- **v1.2 完整交接 (主体):** [`HANDOFF-V1.2-2026-08-12.md`](HANDOFF-V1.2-2026-08-12.md)
- **v1.2 spec:** [`../superpowers/specs/2026-08-12-v1.2-config-center-refactor-design.md`](../superpowers/specs/2026-08-12-v1.2-config-center-refactor-design.md)
- **v1.2 plan:** [`../superpowers/plans/2026-08-12-v1.2-config-center-refactor-plan.md`](../superpowers/plans/2026-08-12-v1.2-config-center-refactor-plan.md)
- **v1.2 changelog:** [`../changelog/2026-08-12-v1.2.0-config-center-refactor.md`](../changelog/2026-08-12-v1.2.0-config-center-refactor.md)
- **3 个新 e2e scenarios:** [`.minimax/skills/serialcube-e2e/scenarios/07-09-*.md`](../../.minimax/skills/serialcube-e2e/scenarios/)
- **workflow skill:** [`.minimax/skills/serialcube-workflow/`](../../.minimax/skills/serialcube-workflow/)
- **e2e skill:** [`.minimax/skills/serialcube-e2e/`](../../.minimax/skills/serialcube-e2e/)
- **version-management skill:** [`.minimax/skills/version-management/`](../../.minimax/skills/version-management/)
- **30 秒接手卡:** [`HANDOFF-QUICKSTART-2026-08-11.md`](HANDOFF-QUICKSTART-2026-08-11.md)
