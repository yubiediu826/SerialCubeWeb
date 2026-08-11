# AI Agent 接手标准动作

> **这是给所有 agent 的 SOP**（不只是 Mavis）— 进窗口 → 理解 → 干活 → 交付。

---

## 1. 进窗口 5 分钟

按 [`../handover/SESSION-CHECKLIST.md`](../handover/SESSION-CHECKLIST.md) 走 5 步:

1. **0️⃣ git 状态** — 工作区干净 / 在正确 commit
2. **1️⃣ 30 秒卡** — [`../handover/HANDOFF-QUICKSTART.md`](../handover/HANDOFF-QUICKSTART.md)
3. **2️⃣ 完整交接** — [`../handover/PROJECT-HANDOVER.md`](../handover/PROJECT-HANDOVER.md)
4. **3️⃣ 激活 skill** — `using-superpowers` + 任务相关
5. **4️⃣ 环境确认** — git config / 工具链 / VERSION
6. **5️⃣ 冒烟测试** — `agent-browser` 跑 SerialCube.html

---

## 2. 接到任务时的判断矩阵

### 2.1 用户说"在 SerialCube 里加 / 改 / 调 X"

**走 `serialcube-workflow` skill** — 5 问决策树:

```
Q1: 触及协议层 / 算法 / 解析逻辑?
    是 → 走 TDD (test-driven-development)
    否 → Q2
Q2: 需要新增 UI 控件 / 改配色 / 改布局?
    是 → 走 taste → ui-ux-pro-max → design-system
    否 → Q3
Q3: 影响 ≥ 3 个其他模块 / 跨 widget?
    是 → brainstorming → writing-plans
    否 → Q4
Q4: 用户已经描述清楚需求?
    是 → grill-me → 直接开写
    否 → Q5
Q5: 一句话能写完 (< 30 行)?
    是 → 直接开写 + verification
    否 → grill-me 拷问 2-3 核心问题
```

### 2.2 用户说"跑一下 / 验证没改坏"

**走 `serialcube-e2e` skill** — 跑 6 个核心场景:
1. 应用加载
2. 串口连接
3. mock 收发
4. 协议编辑器
5. 解析模式切换
6. 主题切换

### 2.3 用户说"部署 / 推 GitHub Pages"

**走 `deploy-checklist` skill** — 部署前 5 件事:
1. console 无错
2. e2e 6 场景过
3. index.html 重定向
4. 资源外链可达
5. VERSION 三处同步

### 2.4 用户说"commit / push / bump / 改一行"

**走 `version-management` skill** — 3 条硬性规则:
- 改 SerialCube.html 前跑 `bump-version.ps1`
- push 前 ask_user 确认
- VERSION 三处同步

### 2.5 用户说"打开 SerialCube 调试"

**走 `agent-browser` skill** — 替代 in-app 内置 Browser:
```bash
agent-browser open <url>
agent-browser snapshot -i --json
agent-browser click @eN
```

---

## 3. 干活时的工作循环

```
接收任务
  ↓
读 SESSION-CHECKLIST 5 步
  ↓
激活 skill(s)
  ↓
如果改 SerialCube.html:跑 bump-version.ps1
  ↓
改代码
  ↓
agent-browser 跑相关 e2e 场景
  ↓
git add + commit (中文)
  ↓
ask_user 确认 push
  ↓
git push origin main --tags
  ↓
等 GitHub Actions 部署完
  ↓
跑 deploy-checklist 5 件事验证
  ↓
更新 docs/CHANGELOG.md
  ↓
交付
```

---

## 4. 完工前必跑（verification-before-completion）

### 4.1 没有验证证据,不声称完成

**必跑:**

```bash
# 1. e2e 6 场景
.\.minimax\skills\serialcube-e2e\scripts\run-scenarios.ps1

# 2. console 无错
agent-browser open http://localhost:8000/SerialCube.html
agent-browser console --level error
# 期望: 空输出（或只有 favicon 警告）

# 3. VERSION 三处一致
Select-String -Path 'SerialCube.html' -Pattern "const VERSION = '"
# 期望: const VERSION = '1.0.1' (或你 bump 的版本)

git log --oneline | Select-Object -First 1
# 期望: 最近的 commit 是你的改动

git tag -l | Select-Object -Last 1
# 期望: v1.0.1 (或你 bump 的版本)
```

### 4.2 必交付的产物

- ✅ 代码改动 (git diff)
- ✅ 中文 commit message
- ✅ 更新 docs/CHANGELOG.md
- ✅ 更新 docs/handover/release-vX.Y.Z.md (如果是发版)
- ✅ e2e 验证截图（在 PR / issue 里附）

---

## 5. 出错时的应对

### 5.1 e2e 失败

**不要立即改代码!** 先看:

1. 是不是 SerialCube.html 自己的 bug → 走 systematic-debugging
2. 是不是 agent-browser timeout → 改 timeout=120s
3. 是不是 mock 数据没初始化 → 刷页面

### 5.2 git push 冲突

```powershell
# 看冲突
git pull origin main
# 解决冲突（保留你的改动,或 rebase）
git rebase -i HEAD~3
# 强制推送（⚠️ ASK USER 确认）
git push origin main --force-with-lease
```

**重要:** 永远不要 `--force` 用 `--force-with-lease` 替代,后者会检查远端是否被改。

### 5.3 GitHub Pages 部署失败

1. 看 Actions 标签页: <https://github.com/yubiediu826/SerialCubeWeb/actions>
2. 看具体错误
3. 常见: path 写错 / 权限问题 / 缓存

### 5.4 agent-browser 跑不起来

```powershell
# 1. 重装
npm install -g agent-browser@latest
agent-browser install

# 2. 检查 Chrome/Chromium
agent-browser --version
# 如果找不到 Chromium:
agent-browser install    # 重新下载
```

---

## 6. 与 Mavis / Claude Code / Cursor 协作

### 6.1 单文件 maintenance 模式

- **Mavis root session:** 直接做（小改、文档、配置）
- **Mavis branch subagent:** 复杂实现（多模块改动、长任务）
- **Cursor:** 主要 IDE 编码（用户在 IDE 里改, agent 辅助）

### 6.2 任务分配原则

| 任务 | 谁做 |
|------|------|
| 改一行代码 / 文案 | root session 直接做 |
| 跑 e2e / 验证 | root session 或 verifier subagent |
| 新功能实现 | branch subagent（用户授权后） |
| 大型重构 | branch subagent + 多次验证 |
| 文档改写 | root session 直接做 |
| 部署 / 发版 | root session（必须问用户） |

### 6.3 不要做的事

- ❌ **不先问就改 SerialCube.html** — 必跑 bump-version.ps1
- ❌ **不验证就声称完成** — 必跑 e2e + 看 console
- ❌ **不跑 task agent 跑大改** — 必先和用户对齐
- ❌ **push 前不问用户** — 必 ask_user
- ❌ **不更新 CHANGELOG 就发版** — 必同步

---

## 7. 接手一份「新」任务的标准动作

### 7.1 任务分类

| 类别 | 例子 | 第一动作 |
|------|------|----------|
| **Bug 修复** | "图表不显示" | systematic-debugging → 复现 → 修 → e2e |
| **新功能** | "加一个告警规则" | brainstorming → writing-plans → 实施 |
| **小改** | "改个按钮颜色" | grill-me 1-2 问 → 直接做 → verification |
| **文档** | "写个 README" | 直接做 (不跑 bump) → commit |
| **发版** | "发 v1.0.1" | bump → 改 → e2e → CHANGELOG → tag → ask push |
| **部署** | "推 GitHub Pages" | deploy-checklist 5 件事 → ask push → 部署后 smoke |
| **排查** | "为啥 CRC 错误" | 读协议编辑器 → 跑测试帧 → 查 reference/CRC-REFERENCE.md |

### 7.2 任务状态追踪

用 TodoWrite 跟踪（最少 3 步的任务）:

```
[
  { content: "读 X 文件", status: "completed" },
  { content: "改 Y 代码", status: "in_progress" },
  { content: "跑 e2e 验证", status: "pending" },
  { content: "commit + ask push", status: "pending" }
]
```

每完成一项立即更新,**别攒到最后**。

### 7.3 完成定义（Definition of Done）

- [ ] 代码改动实现需求
- [ ] e2e 相关场景通过
- [ ] console 无错
- [ ] 中文 commit message
- [ ] docs/CHANGELOG.md 更新（如适用）
- [ ] docs/handover/release-vX.Y.Z.md 更新（如发版）
- [ ] push 前 ask_user 拿到确认
- [ ] 部署后 smoke（如部署）

---

## 8. 链接到完整文档

| 我想了解 | 去看 |
|----------|------|
| 30 秒接手卡 | [`../handover/HANDOFF-QUICKSTART.md`](../handover/HANDOFF-QUICKSTART.md) |
| 完整项目交接 | [`../handover/PROJECT-HANDOVER.md`](../handover/PROJECT-HANDOVER.md) |
| 5 步检查清单 | [`../handover/SESSION-CHECKLIST.md`](../handover/SESSION-CHECKLIST.md) |
| 工具怎么用 | [`USER-GUIDE.md`](USER-GUIDE.md) |
| 改代码 SOP | [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md) |
| 完整文档地图 | [`../README.md`](../README.md) |
| 触发路由表 | [`.minimax/skills/README.md`](../../.minimax/skills/README.md) |

---

## 9. 自我提醒

> **每个 agent 接手时,先问自己 3 个问题:**

1. **我有没有读 30 秒卡?** → 没读就回去读
2. **我有没有跑 e2e?** → 没跑就别声称完成
3. **我有没有问用户再 push?** → 没问就停下来

> **3 个问题都回答 "是" → 可以开始干活。**
