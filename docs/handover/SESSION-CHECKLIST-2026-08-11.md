# 每次开新窗口 — 5 步检查清单

> **每次开一个新的 agent 会话 / 工作窗口,按这个清单走一遍。** 避免「接手了但不知道接手了什么」。

---

## 0️⃣ 第 0 步（30 秒）

打开 IDE / 终端,定位到工作区根目录:

```powershell
Set-Location 'D:\WorkSpace\SerialCubeWeb'
```

确认 git 仓库状态:

```powershell
git status
git log --oneline -5
git tag -l | Select-Object -Last 3
```

**期望:**
- `git status` 输出空（工作区干净）或只有未追踪的 `docs/` 新文件
- `git log` 顶部是 `90b8bdf docs(root): 新增根 README 与项目交接文档`（或更新版的 docs 提交）
- `git tag` 包含 `v1.0.0`

**如果不对,先修复:**
- 工作区有未提交改动 → 问用户「这些改动是要继续做、stash、还是 revert」
- HEAD 不是预期 commit → 跑 `git reflog` 看历史,问用户
- 没有 `v1.0.0` tag → 跑 `git tag -l`,可能在新分支

---

## 1️⃣ 第 1 步（30 秒）— 读 30 秒卡

打开 [`HANDOFF-QUICKSTART-2026-08-11.md`](HANDOFF-QUICKSTART-2026-08-11.md),扫一眼:

- ✅ 项目是单 HTML 串口调试工具
- ✅ 当前版本 v1.0.0
- ✅ 4 条硬性规则（commit 中文 / push ask / VERSION 三处 / 改前 bump）
- ✅ 5 个最常用命令在脑子里
- ✅ 别做的事列表

---

## 2️⃣ 第 2 步（1 分钟）— 读完整交接

打开 [`PROJECT-HANDOVER-2026-08-11.md`](PROJECT-HANDOVER-2026-08-11.md),重点看:

- § 2 当前状态（v1.0.0 快照）
- § 3 架构 / 文件结构
- § 4 关键决策日志（理解"为什么这么做"）
- § 5 日常开发流程
- § 7 注意事项 / 硬性规则
- § 8 下一步推荐

确认你**了解**:
- 项目硬性要求（commit 中文、单 HTML 文件、Chromium only）
- AI 工作流入口（`.minimax/skills/README.md`）
- 不知道的事在哪里查（这个文档本身就是地图）

---

## 3️⃣ 第 3 步（30 秒）— 激活核心 skill

按需激活,不要一次全开（trigger description 撞词时只开最相关的）:

```powershell
# 必激活:入口 skill
# 任何任务开始时 → using-superpowers

# 视任务激活:
# - 在 SerialCube 里加/改/调功能 → serialcube-workflow
# - 跑 e2e 验证 → serialcube-e2e
# - 部署到 GitHub Pages → deploy-checklist
# - commit / push / bump → version-management
# - 浏览器调试 SerialCube → agent-browser
```

**判断方法:** 看用户第一句话
- 「在 SerialCube 里加 / 改 / 调 X」 → `serialcube-workflow`
- 「跑一下 / 验证没改坏」 → `serialcube-e2e`
- 「部署 / 推 Pages」 → `deploy-checklist`
- 「commit / push」 → `version-management`
- 「打开 SerialCube 调试」 → `agent-browser`
- 「设计 / 拷问 / 写计划 / 写测试」 → 走上游 skill（brainstorming / grill-me / writing-plans / TDD）

完整触发路由表见 [`.minimax/skills/README.md`](../../.minimax/skills/README.md) § 触发路由速查表。

---

## 4️⃣ 第 4 步（1 分钟）— 确认改动前的环境

### 4.1 git 配置确认

```powershell
git config user.name
git config user.email
git config --get http.proxy     # 应为 http://127.0.0.1:7897
```

**如果 git user 没设:**
```powershell
git config --global user.name "Mavis"
git config --global user.email "Mavis@local"
```

### 4.2 工具链确认

```powershell
node --version          # 应为 24.18.0
npm --version           # 应为 11.16.0
agent-browser --version # 应为 0.34.0
py -3 --version         # Python 3.11+
```

**如果有缺失:**
- `agent-browser` → 跑 `npm install -g agent-browser`
- Python → 走 `py -3` 或装 Python 3.11+

### 4.3 当前 SerialCube.html 版本

```powershell
# 查 VERSION
Select-String -Path 'SerialCube.html' -Pattern "const VERSION = '"
```

**期望:** `const VERSION = '1.0.0';`

**如果不对:**
- VERSION < 1.0.0 → 项目未发布
- VERSION > 1.0.0 → 跑 `bump-version.ps1` 重新同步

---

## 5️⃣ 第 5 步（1 分钟）— 跑一次冒烟测试

确认 SerialCube.html 本身没坏:

```powershell
# 启动本地 server（任选一种）
python -m http.server 8000
# 或
npx http-server -p 8000
```

然后用 `agent-browser` 打开本地:

```bash
agent-browser open http://localhost:8000/SerialCube.html
agent-browser snapshot -i --json
agent-browser console --level error
```

**期望:**
- snapshot 返回 ≥ 20 个 interactive 元素
- console error 输出为空（或只有 favicon 警告）

**如果失败:**
- 截图保存到 `.tmp/` 目录
- 看 `git log` 是不是有人刚改了 SerialCube.html 没验证
- 跑 `git diff HEAD SerialCube.html` 看最近改动

---

## ✅ 通过 5 步后

- 工作区干净 + git 在正确 commit + 环境齐备 + 工具链可用 + SerialCube 能加载
- **可以开始干活了** 🚀

---

## 🚨 异常处理

### 工作区有未提交改动

```powershell
git status
git diff --stat
```

**判断:**
- 是你刚改的 → 继续
- 不是你改的 → 问用户「这些改动是要继续做、stash、还是 revert」

### HEAD 不在 main 分支

```powershell
git branch --show-current
```

**期望:** `main`

**如果不对:** 问用户「要切回 main 吗」

### `SerialCube.html` 改了但没 bump

```powershell
# 查最近修改
(Get-Item 'SerialCube.html').LastWriteTime
git log -1 --format='%ai' SerialCube.html
```

**判断:**
- 文件 mtime > git log 时间 → 文件被改但没 commit
- 跑 `git diff SerialCube.html` 看具体改动
- 问用户「这些改动是未保存的工作、还是误改」

### agent-browser 装不上

```powershell
npm install -g agent-browser
# 失败的话
npm config get prefix    # 看全局 root
# 加到 PATH 或用 npx
npx agent-browser open <url>
```

### Python 没装

```powershell
# Windows 装 Python 3.11+ (winget / choco / 官网)
winget install Python.Python.3.11
# 或 py launcher
py -3 --version
```

### 网络问题（代理 / GitHub 访问）

```powershell
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

# 测连通
curl -I https://github.com
```

---

## 📋 速查卡（贴桌面）

```
Session Start Checklist
─────────────────────
□ 0. Set-Location + git status
□ 1. 读 HANDOFF-QUICKSTART-2026-08-11.md (30s)
□ 2. 读 PROJECT-HANDOVER-2026-08-11.md (2min)
□ 3. 激活 using-superpowers + 任务相关 skill
□ 4. git config / 工具链 / VERSION 确认
□ 5. agent-browser 跑 SerialCube.html 冒烟
─────────────────────
✅ → 可以开始干活
```
