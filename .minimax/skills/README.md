# SerialCubeWeb — Pro-Max 工作流 Skills

本目录是 **SerialCube 单 HTML 串口调试项目**的 AI 工作流工具集，供 Mavis / Claude Code / Cursor / 兼容 harness 自动加载。

**项目重心：** 单文件 Web 串口调试 + GitHub Pages 部署 + 嵌入式/硬件方向 BMS/EMS/PCS 协议调试。
**核心文件：** `SerialCube.html` / `index.html`（双胞胎，开发版 + 部署版）。

> **浏览器调试原则：** 所有浏览器相关任务（点击、填表、截图、scrape、QA）**统一用 `agent-browser` CLI**。
> 不走 in-app 内置浏览器 —— 那个 token 消耗大、启动慢；agent-browser 用 accessibility tree + `@eN` ref，**每页只占 200-400 tokens**，Rust 原生 CLI 启动快 5-10x。

---

## 已安装（11 个 skill，全在 `.minimax/skills/` 下独立文件夹）

按 Pro-Max 工作流 7 阶段分组：

### ① 入口（每次会话开始自动激活）

| Skill | 来源 | 用途 |
|-------|------|------|
| **using-superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | **入口**：定义如何发现和使用其他 skill；任何任务开始时必触发 |

### ② 产品定义（写代码前先把需求想清楚）

| Skill | 来源 | 用途 |
|-------|------|------|
| **brainstorming** | obra/superpowers | **9 步设计清单**：探索上下文 → 提问 → 方案 → 审批 → 写设计文档 → 自审 → 用户审 → 实现；任何创造性工作前必跑 |
| **grill-me** | [mattpocock/skills](https://github.com/mattpocock/skills) | **一句话拷问**：持续追问逼需求清楚（比 brainstorming 更直接，适合小需求快速收敛） |

### ③ 架构（设计 → 可执行计划）

| Skill | 来源 | 用途 |
|-------|------|------|
| **writing-plans** | obra/superpowers | **2-5 分钟粒度的可执行计划**：假设执行者零上下文；含完整代码 + 精确文件路径 + 测试方法 |

### ④ 测试（Red-Green-Refactor）

| Skill | 来源 | 用途 |
|-------|------|------|
| **test-driven-development** | obra/superpowers | **严格 TDD**：没有失败测试就没有生产代码；3 阶段循环：失败测试 → 最小实现 → 重构 |

### ⑤ 视觉（设计 token + UI/UX）

| Skill | 来源 | 用途 |
|-------|------|------|
| **taste** | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | **审美反模板**：避免千篇一律 SaaS 风格；按 brief 推断正确设计方向，audit-first on redesigns |
| **ui-ux-pro-max** | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | **设计规范库**：84 风格 + 192 色板 + 74 字体 + 22 栈；本地 BM25 搜索 |
| **design-system** | impeccable 衍生 | **Token 架构**：primitive→semantic→component 三层；CSS 变量 + 间距/字阶 + 组件规范 |

### ⑥ 浏览器调试（替代 in-app 内置 Browser）

| Skill | 来源 | 用途 |
|-------|------|------|
| **agent-browser** | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | **Rust 原生浏览器自动化 CLI**：accessibility tree snapshot + `@eN` ref 元素定位；session 隔离；video 录制；dashboard :4848。**本项目唯一浏览器工具** |

**`agent-browser` 工作循环**（来自 `agent-browser/core.md`）：

```bash
agent-browser open <url>            # 1. 打开页面
agent-browser snapshot -i --json    # 2. 看到 interactive 元素（JSON 输出 + ref）
agent-browser click @e3             # 3. 用 ref 行动
agent-browser snapshot -i --json    # 4. 每次页面变都重 snapshot（ref 会失效）
```

**对比 in-app 内置 Browser**：

| 维度 | in-app 内置 Browser | agent-browser |
|------|---------------------|----------------|
| Token/页 | 2000-6000（完整 DOM） | **200-400**（accessibility tree 摘要） |
| 启动 | 慢（in-app 渲染） | **快**（Rust CLI，独立进程） |
| 元素定位 | selector 字符串 | **`@eN` ref**（页面变 ref 自动失效，强 re-snapshot） |
| 会话隔离 | 单实例 | 多 session 并行（admin / user / test） |
| 调试附件 | 截图 | **截图 + 视频录制 + network 拦截 + cookies 持久化** |
| 看板 | 无 | **dashboard :4848** 看 session 状态 |

**前置依赖**（已装好）：
- Node.js 24.18.0 + npm 11.16.0
- `agent-browser@0.34.0` 全局（`npm install -g agent-browser`）
- 首次使用前跑 `agent-browser install` 下载 Chrome/Chromium

### ⑦ 收尾（review + 验收）

| Skill | 来源 | 用途 |
|-------|------|------|
| **requesting-code-review** | obra/superpowers | **5 个 Agent 并行审查**：安全/性能/正确性/风格/测试；置信度评分；Critical 立即修、Important 推进前修、Minor 延后 |
| **verification-before-completion** | obra/superpowers | **完工前清单**：没有验证证据不声称完成；必须运行命令 + 确认输出 |

### ⑧ 项目级 SOP（串起 11 个 skill）

| Skill | 来源 | 用途 |
|-------|------|------|
| **serialcube-workflow** | 本项目自建 | **入口 SOP**：5 问决策树 + 6 步触发链 + 3 个变体（主链 / 小改 / bug / 部署）；当用户在 SerialCube 项目内做改动时必触发 |

### ⑨ 端到端验证（替代单 HTML 项目的测试）

| Skill | 来源 | 用途 |
|-------|------|------|
| **serialcube-e2e** | 本项目自建 | **6 个核心场景**：应用加载 / 串口连接 / 发送接收 mock / 协议编辑器 / 解析模式切换 / 主题切换；用 agent-browser 跑，替代 TDD 在单 HTML 项目跑不通的「测试」环节 |

### ⑩ 部署清单（GitHub Pages）

| Skill | 来源 | 用途 |
|-------|------|------|
| **deploy-checklist** | 本项目自建 | **GitHub Pages 部署前 5 件事**：console 无错 / 6 个 e2e 场景过 / index.html 重定向 / 资源外链可达 / 版本号同步；部署后烟雾测试 |

---

## 怎么用

按开发顺序触发（自然语言即可，skill 自动激活）：

| 任务 | 触发链 |
|------|--------|
| 「在 SerialCube 里加 / 改 / 调 X」 | `serialcube-workflow` (决策树 5 问) → 走对应 skill 链 |
| 「改完跑一下 / 验证没破其他」 | `serialcube-e2e` 6 个场景 → 截图存档 |
| 「要发版了 / 推 GitHub Pages」 | `deploy-checklist` 5 件事 → `git push` → 部署后烟雾测试 |
| 「我要加一个波形监控面板」 | `using-superpowers` → `brainstorming`（9 步设计）→ `writing-plans`（落成 2-5 分钟步骤） |
| 「小需求快搞」 | `using-superpowers` → `grill-me`（一句话追问）→ 直接开写 |
| 「写个新模块的代码」 | `writing-plans` → `test-driven-development`（先写失败测试）→ `requesting-code-review` |
| 「改 UI / 换配色 / 加控件」 | `taste`（反模板）→ `ui-ux-pro-max`（色板/字体/规范）→ `design-system`（token 化） |
| **「打开 SerialCube 调试 / 点按钮 / 填串口参数」** | **`agent-browser`：`open SerialCube.html` → `snapshot -i --json` → `click @eN` / `fill @eN "..."` → 必要时 re-snapshot** |
| **「截屏做 bug 报告 / 录视频回放调试过程」** | **`agent-browser screenshot page.png` / `agent-browser video record`** |
| **「并行多账号测试（admin / user）」** | **`agent-browser --session admin ...` + `agent-browser --session user ...`** |
| 「改完要交付了」 | `requesting-code-review`（并行审查）→ `verification-before-completion`（完工清单） |
| 「bug 排查」 | `test-driven-development`（先复现）→ 修 → `verification-before-completion` |

**项目级串联**（与 SerialCube 现有文档配合）：
- `docs/handover/` — 项目历史 / 交接
- `.minimax/skills/` — 本工作流工具集（你正在看）
- `SerialCube.html` / `index.html` — 主代码
- `agent-browser` — 浏览器调试 CLI（**唯一浏览器入口**）

---

## 文件结构

```
.minimax/skills/                     ← 你在这里
├── README.md                         ← 本文件
├── brainstorming/                    ← ② 需求（obra）
├── using-superpowers/                ← ① 入口（obra）
├── writing-plans/                    ← ③ 架构（obra）
├── test-driven-development/          ← ④ 测试（obra）
├── requesting-code-review/           ← ⑦ review（obra）
├── verification-before-completion/   ← ⑦ 验收（obra）
├── grill-me/                         ← ② 拷问（mattpocock）
├── taste/                            ← ⑤ 审美（taste-skill）
├── ui-ux-pro-max/                    ← ⑤ 规范（nextlevelbuilder）
├── design-system/                    ← ⑤ token（impeccable 衍生）
└── agent-browser/                    ← ⑥ 浏览器（vercel-labs, Rust CLI）
    ├── SKILL.md                      (3.3 KB, 薄 stub — Mavis 入口)
    ├── core.md                       (29 KB,  完整 workflow)
    └── references/                   (10 个详细参考, 82 KB)

.minimax/repos/                       ← 源仓库（升级用，git clone 保留）
├── superpowers/                      ← obra/superpowers
├── mattpocock-skills/                ← mattpocock/skills
└── agent-browser/                    ← vercel-labs/agent-browser（CLI 仓库）
```

> **关于 taste / ui-ux-pro-max / design-system**：原本是 global `C:\Users\Administrator\.minimax\skills\` 下的整包 clone（含仓库结构 + scripts/ + data/）。**没有外部引用** — 实际可用的 `SKILL.md` 已复制到本目录独立文件夹里。
>
> **关于 agent-browser**：skill 文件 + CLI 仓库都在本工作区。CLI 已 `npm install -g` 装到 `%APPDATA%\npm\agent-browser`（`%APPDATA%\npm` 是 `npm config get prefix` 报的位置，**全局 npm root**），**不是**装到本工作区。Chrome/Chromium 在首次 `agent-browser install` 时下载到 CLI 自管目录（不在 `.minimax/` 内）。

---

## 更新

```powershell
# 1) 拉上游新版本
cd D:\WorkSpace\SerialCubeWeb\.minimax\repos\superpowers; git pull
cd D:\WorkSpace\SerialCubeWeb\.minimax\repos\mattpocock-skills; git pull
cd D:\WorkSpace\SerialCubeWeb\.minimax\repos\agent-browser; git pull

# 2) 重新复制到 .minimax/skills/（覆盖）
#    （沿用之前安装时用过的 Copy-Item 脚本；brainstorming 跳嵌套子目录）

# 3) taste / ui-ux-pro-max / design-system 来自 global 整包
#    若 global 整包更新，需要重新从 C:\Users\Administrator\.minimax\skills\ 复制

# 4) agent-browser CLI 升级（要新版本直接拉新 npm）
npm install -g agent-browser@latest
```

---

## 网络检索：相关但未默认装入

| 资源 | 链接 | 是否建议装入本仓库 |
|------|------|-------------------|
| **mattpocock/skills** | https://github.com/mattpocock/skills | **已装 grill-me**；其余 4 个（to-prd/to-issues/git-guardrails/improve-codebase-architecture）按需 |
| **obra/superpowers** | https://github.com/obra/superpowers | **已装 6 个**；其余 8 个（dispatching-parallel-agents、subagent-driven-development、using-git-worktrees、writing-skills 等）单 HTML 项目用不到 |
| **vercel-labs/agent-browser** | https://github.com/vercel-labs/agent-browser | **已装**（skill 文档 + CLI） |
| **anthropics/skills** | https://github.com/anthropics/skills | 官方 17 个 skill（docx/pdf/pptx/xlsx + 工具类），按需摘取 |
| **lijinnair/claude-code-skillforge** | https://github.com/lijinnair/claude-code-skillforge | **元 skill**：构建/升级/扫描 skill 自身用；要做新 skill 时再装 |
| **testdouble/skills-test-harness** | https://github.com/testdouble/skills-test-harness | skill 触发准确率评测；debug skill 行为时用 |
| **awesome-claude-skills** | https://github.com/heilcheng/awesome-agent-skills | 索引合集，搜 skill 用 |
| **anthropics/claude-plugins-official** | https://github.com/anthropics/claude-plugins-official | 官方插件市场（与 skill 不同，含 hooks/MCP） |

**几乎用不上：**
- 纯 Web SaaS / landing / Compose-Android / iOS / Tauri 等非浏览器/非嵌入式专用 skill
- 串口协议 BMS/EMS/PCS 公开 skill 较少（SerialCube 自家协议栈在代码里）

---

## 反模式（不推荐做的事）

- ❌ **跳过 brainstorming 直接写代码** — 单文件项目改一个地方看似无害，但 widget/配色/事件链改完容易走偏
- ❌ **skill 触发后绕过 SKILL.md 流程** — 例如 grill-me 拷问到一半嫌烦直接开写
- ❌ **local skill 与 global skill 重复** — global 里的整包 clone 与 `.minimax/skills/` 会让 Mavis 扫到两份（即便 name 去重，扫描时间也翻倍）
- ❌ **用 TDD 跑探索性 prototype** — Red-Green-Refactor 对"先跑起来再说"的需求太重；这种时候直接 `grill-me` 写小函数即可
- ❌ **走 in-app 内置 Browser 调 SerialCube** — token 消耗大、selector 字符串脆弱。**永远用 `agent-browser`**（Rust CLI + `@eN` ref，10x 速度差）
- ❌ **改 SerialCube.html 不跑 e2e 验证** — 942KB 单文件改一处可能破其他；改完必跑 `serialcube-e2e` 6 个场景，否则不算改完
- ❌ **跳过 deploy-checklist 直接 push** — GitHub Pages 自动部署后回滚麻烦，5 件事全过才能 push 到 main

---

**TL;DR** — 你说「做 X」，Mavis 自动走：`using-superpowers` → 看 X 大小选 `brainstorming` 或 `grill-me` → `writing-plans` → `taste`/`ui-ux-pro-max`/`design-system` 出视觉 → `test-driven-development` 出代码 → **需要浏览器验证时用 `agent-browser` 而非 in-app Browser**（Rust CLI + ref）→ `requesting-code-review` → `verification-before-completion`。
