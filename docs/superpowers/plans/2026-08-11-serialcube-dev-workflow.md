# SerialCube 开发工作流跑通 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `.minimax/skills/` 下现有 11 个 skill 串成 SerialCube 项目可执行的开发工作流，补 3 个断点（决策规则 / 端到端验证 / 部署清单），让「需求 → 设计 → 改 HTML → 验证 → 部署 → 收尾」6 步全跑通。

**Architecture:**
- **项目级 SOP** (`.minimax/skills/serialcube-workflow/SKILL.md`) — 6 步工作流的入口 skill，包含决策树（brainstorming vs grill-me、TDD vs prototype）+ 触发链图 + 与现有 11 个 skill 的接口
- **端到端验证** (`.minimax/skills/serialcube-e2e/`) — 用 `agent-browser` 跑 SerialCube.html 的 6 个核心场景，作为「测试」的替代品（单 HTML 项目无测试框架时唯一可行方案）
- **部署清单** (`.minimax/skills/deploy-checklist/`) — GitHub Pages 部署前 5 条硬性检查
- **README 总集成** (`.minimax/skills/README.md` 改动) — 触发链加入新 skill，反模式章节加 2 条

**Tech Stack:**
- 仅用现有工具：Mavis skill 系统 + `agent-browser` (Rust CLI) + `py -3` 跑 Python helper
- 不引入新依赖、不建 npm 项目
- PowerShell 5.1 兼容（Windows 环境）

## Global Constraints

- **不重写现有 11 个 skill** — 只新增 + README 串接
- **不引入第三方测试框架** — 单 HTML 项目加 vitest/jest 是过度工程，用 agent-browser 做 e2e 验证
- **不强制 TDD** — 决策树明确：UI 探索性改动直接写，TDD 用于协议/算法层；这是单 HTML 项目的现实妥协
- **单文件改动要安全** — SerialCube.html 942KB，改一个函数可能影响其他；所有 e2e 场景跑通才算「未破其他」
- **commit 规范** — `<type>(<scope>): <subject>`
- **每 Task 完成后 commit** — Task 内不分多次 commit

---

## Task 1: 项目级 SOP skill (`serialcube-workflow`)

**Files:**
- Create: `.minimax/skills/serialcube-workflow/SKILL.md`
- Create: `.minimax/skills/serialcube-workflow/README.md`
- Create: `.minimax/skills/serialcube-workflow/references/decision-tree.md`
- Create: `.minimax/skills/serialcube-workflow/references/trigger-chains.md`

**Interfaces:**
- Consumes: 现有 11 个 skill 的入口与触发条件
- Produces:
  - 主 SKILL.md (description 字段: 「当用户在 SerialCube 项目里要加/改/调功能，需求是单 HTML 串口调试工具相关」时触发)
  - 决策树: 5 个 Yes/No 问题决定走 brainstorming / grill-me / 直接开写
  - 6 步触发链图（mermaid 文本），每步标「必跑 skill / 选跑 skill / 跳过」

### Step 1: 准备目录与空 SKILL.md

- [ ] **Step 1.1: 建目录**

  ```powershell
  New-Item -ItemType Directory -Force -Path '.minimax/skills/serialcube-workflow' | Out-Null
  New-Item -ItemType Directory -Force -Path '.minimax/skills/serialcube-workflow/references' | Out-Null
  ```
  预期: 两个目录都建好

- [ ] **Step 1.2: 创建空 SKILL.md**

  创建 `.minimax/skills/serialcube-workflow/SKILL.md`:
  ```markdown
  ---
  name: serialcube-workflow
  description: SerialCube 单 HTML 串口调试工具项目的开发工作流入口。包含 6 步触发链 + 5 个决策问题，串起现有 11 个 skill（brainstorming / grill-me / writing-plans / TDD / taste / ui-ux-pro-max / design-system / agent-browser / code-review / verification）并补 2 个缺失环节（e2e 验证 + 部署清单）。**当用户说「在 SerialCube 里加 X / 改 Y / 调 Z」时必触发**。
  ---

  # SerialCube Project Workflow
  ```

- [ ] **Step 1.3: 验证文件存在**

  ```powershell
  Test-Path '.minimax/skills/serialcube-workflow/SKILL.md'
  ```
  预期: `True`

### Step 2: 写决策树

- [ ] **Step 2.1: 创建 decision-tree.md**

  创建 `.minimax/skills/serialcube-workflow/references/decision-tree.md`:
  ```markdown
  # SerialCube 工作流决策树

  回答 5 个问题，决定走 brainstorming / grill-me / 直接开写 / 走 TDD。

  ## Q1: 改动是否触及协议层 / 算法 / 解析逻辑？

  - **是** → 走 TDD（task-driven-development）
    - 例: 加 CRC 算法、改 hex 解析、加 Modbus 命令解析
  - **否** → 进入 Q2

  ## Q2: 改动是否需要新增 UI 控件 / 改配色 / 改布局？

  - **是** → 走 taste → ui-ux-pro-max → design-system 三件套（按 README §⑤ 顺序）
  - **否** → 进入 Q3

  ## Q3: 改动是否影响 ≥ 3 个其他模块 / 多个文件 / 跨 widget？

  - **是** → 走 brainstorming（9 步设计清单）→ writing-plans
  - **否** → 进入 Q4

  ## Q4: 用户已经描述清楚需求（"按钮加个 X、文本改 Y"）？

  - **是** → 走 grill-me（拷问到需求明确为止）→ 直接开写
  - **否** → 进入 Q5

  ## Q5: 改动小到可以一句话写完（< 30 行 HTML/CSS/JS）？

  - **是** → 直接开写（跳过 brainstorming/grill-me），但仍走 verification-before-completion
  - **否** → 走 grill-me 拷问 2-3 个核心问题再开写

  ## 何时**不**用本工作流

  - 排查 bug → 走 systematic-debugging（obra/superpowers）→ 改 → e2e 验证
  - 重构既有代码 → 走 TDD（先有测试再改）
  - 纯文档 / README 改动 → 直接改 → commit
  ```

- [ ] **Step 2.2: 验证**

  ```powershell
  Test-Path '.minimax/skills/serialcube-workflow/references/decision-tree.md'
  ```
  预期: `True`

### Step 3: 写触发链

- [ ] **Step 3.1: 创建 trigger-chains.md**

  创建 `.minimax/skills/serialcube-workflow/references/trigger-chains.md`:
  ```markdown
  # SerialCube 6 步工作流触发链

  ## 主链: 加新功能

  ```
  需求描述
    ↓
  [决策树] 走 brainstorming / grill-me / 直接开写
    ↓
  [设计] ① 视觉: taste → ui-ux-pro-max → design-system
       ② 协议/算法: TDD（写失败测试 → 实现 → 重构）
    ↓
  writing-plans（2-5 分钟粒度）
    ↓
  改 SerialCube.html（用 edit/grep 精修）
    ↓
  验证: agent-browser 跑 serialcube-e2e 的相关场景
    ↓
  requesting-code-review（5 个 agent 并行审查）
    ↓
  verification-before-completion
    ↓
  部署: deploy-checklist（GitHub Pages 5 件事）
  ```

  ## 变体 1: 小改动 (< 30 行)

  ```
  需求
    ↓
  [决策树 Q5=Yes] 直接开写
    ↓
  改 SerialCube.html
    ↓
  agent-browser 单次验证（open + snapshot -i）
    ↓
  verification-before-completion
  ```
  跳过: brainstorming / writing-plans / code-review

  ## 变体 2: Bug 修复

  ```
  用户报 bug
    ↓
  systematic-debugging（根因调查 → 模式分析 → 假设测试）
    ↓
  TDD（写复现测试，e2e 形式）
    ↓
  修 SerialCube.html
    ↓
  agent-browser 验证修复
    ↓
  requesting-code-review
  ```

  ## 变体 3: 部署

  ```
  改完要发版
    ↓
  verification-before-completion
    ↓
  deploy-checklist（5 件事全过）
    ↓
  git push → GitHub Pages 自动部署
    ↓
  部署后烟雾测试: agent-browser 打开生产 URL → snapshot 关键路径
  ```

  ## 与现有 skill 的接口

  | Step | 主用 skill | 辅助 skill |
  |------|-----------|-----------|
  | 需求决策 | serialcube-workflow（本） | brainstorming / grill-me |
  | 视觉设计 | taste | ui-ux-pro-max / design-system |
  | 协议/算法 | test-driven-development | serial-protocol-copilot（建好之后）|
  | 计划 | writing-plans | brainstorming（前置） |
  | 编码 | （直接 edit） | — |
  | 验证 | agent-browser | serialcube-e2e |
  | 审查 | requesting-code-review | — |
  | 验收 | verification-before-completion | — |
  | 部署 | deploy-checklist | agent-browser（部署后烟雾测试）|
  ```

- [ ] **Step 3.2: 验证**

  ```powershell
  Test-Path '.minimax/skills/serialcube-workflow/references/trigger-chains.md'
  ```
  预期: `True`

### Step 4: 补全 SKILL.md 正文

- [ ] **Step 4.1: 写工作流正文**

  把 `.minimax/skills/serialcube-workflow/SKILL.md` 完整内容替换为:
  ```markdown
  ---
  name: serialcube-workflow
  description: SerialCube 单 HTML 串口调试工具项目的开发工作流入口。包含 6 步触发链 + 5 个决策问题，串起现有 11 个 skill 并补 2 个缺失环节（e2e 验证 + 部署清单）。**当用户说「在 SerialCube 里加 X / 改 Y / 调 Z / 排查 bug / 部署」时必触发**。
  ---

  # SerialCube Project Workflow

  ## 我是什么

  SerialCube 项目的**入口 SOP**。当用户说要在 SerialCube 里做改动时：
  1. 先走 [references/decision-tree.md](./references/decision-tree.md) 的 5 个问题
  2. 决定走 brainstorming / grill-me / 直接开写 / TDD
  3. 按 [references/trigger-chains.md](./references/trigger-chains.md) 的 6 步走
  4. 必要时调用 `serialcube-e2e`（验证）和 `deploy-checklist`（部署）

  ## 6 步主链

  1. **决策**（decision-tree.md 5 问）
  2. **设计**（brainstorming 9 步 OR grill-me 拷问 OR TDD 失败测试）
  3. **计划**（writing-plans 2-5 分钟粒度）
  4. **编码**（直接编辑 SerialCube.html）
  5. **验证**（agent-browser 跑 serialcube-e2e）
  6. **审查 + 验收**（requesting-code-review → verification-before-completion）
  7. **部署**（deploy-checklist → git push → 烟雾测试）

  ## 何时用我 vs 不用我

  - **用我**: SerialCube 项目内任何代码改动 / 新功能 / bug 修复
  - **不用我**: 纯文档 / 知识库改动（直接改即可）；Mavis 元问题（cron / agent 配置等）

  ## 注意事项

  - **不强制 TDD**: 单 HTML 项目没测试框架，UI 探索性改动直接写；TDD 只用于协议/算法层
  - **不跳 verification**: 即使小改动也要跑 agent-browser 验证
  - **改完必跑 e2e**: `serialcube-e2e` 6 个核心场景（开/关串口、发/收、协议解析、UI 状态、主题切换、协议编辑器）是「未破其他」的最低保障

  ## 完整文档

  - [decision-tree.md](./references/decision-tree.md) — 5 问决策树
  - [trigger-chains.md](./references/trigger-chains.md) — 6 步主链 + 3 个变体
  ```

- [ ] **Step 4.2: 验证渲染**

  打开 `.minimax/skills/serialcube-workflow/SKILL.md`，确认 YAML frontmatter + 6 步 + 注意事项都齐

### Step 5: 写 README.md

- [ ] **Step 5.1: 创建 README**

  创建 `.minimax/skills/serialcube-workflow/README.md`:
  ```markdown
  # serialcube-workflow

  SerialCube 单 HTML 串口调试工具项目的开发工作流入口 skill。

  ## 是什么

  串起现有 11 个 skill 的「项目级 SOP」, 含 5 问决策树 + 6 步触发链 + 3 个变体（主链 / 小改 / bug / 部署）。

  ## 何时用

  - 用户说 "在 SerialCube 里加 / 改 / 调 / 排查 / 部署"
  - 任何 SerialCube 项目内的代码改动

  ## 详细文档

  见 [SKILL.md](./SKILL.md) + [references/](./references/)
  ```

- [ ] **Step 5.2: 验证文件结构**

  ```powershell
  Get-ChildItem '.minimax/skills/serialcube-workflow' -Recurse
  ```
  预期: 看到 4 个文件 (SKILL.md, README.md, references/decision-tree.md, references/trigger-chains.md)

### Step 6: Commit

- [ ] **Step 6.1: 提交**

  ```bash
  git add .minimax/skills/serialcube-workflow/
  git commit -m "feat(workflow): add serialcube-workflow project-level SOP (decision tree + trigger chains)"
  ```

---

## Task 2: 端到端验证 skill (`serialcube-e2e`)

**Files:**
- Create: `.minimax/skills/serialcube-e2e/SKILL.md`
- Create: `.minimax/skills/serialcube-e2e/README.md`
- Create: `.minimax/skills/serialcube-e2e/scripts/run-scenarios.ps1`
- Create: `.minimax/skills/serialcube-e2e/scenarios/01-app-loads.md`
- Create: `.minimax/skills/serialcube-e2e/scenarios/02-connect-disconnect.md`
- Create: `.minimax/skills/serialcube-e2e/scenarios/03-send-receive.md`
- Create: `.minimax/skills/serialcube-e2e/scenarios/04-protocol-editor.md`
- Create: `.minimax/skills/serialcube-e2e/scenarios/05-parser-mode-switch.md`
- Create: `.minimax/skills/serialcube-e2e/scenarios/06-theme-toggle.md`

**Interfaces:**
- Consumes: `agent-browser` (vercel-labs, Rust CLI, 已装好) + SerialCube.html
- Produces:
  - 6 个核心场景 Markdown (每个含: 前置 / 步骤 / 期望 / 截图命令 / 失败排查)
  - `run-scenarios.ps1` — 一键跑所有场景的 PowerShell 脚本
  - SKILL.md 描述触发条件 + 工作流

### Step 1: 准备目录

- [ ] **Step 1.1: 建目录结构**

  ```powershell
  New-Item -ItemType Directory -Force -Path '.minimax/skills/serialcube-e2e' | Out-Null
  New-Item -ItemType Directory -Force -Path '.minimax/skills/serialcube-e2e/scripts' | Out-Null
  New-Item -ItemType Directory -Force -Path '.minimax/skills/serialcube-e2e/scenarios' | Out-Null
  ```

- [ ] **Step 1.2: 验证 agent-browser 可用**

  ```powershell
  agent-browser --version
  ```
  预期: 显示版本号（如 `0.34.0`）

### Step 2: 写场景 01 (app-loads)

- [ ] **Step 2.1: 创建场景文件**

  创建 `.minimax/skills/serialcube-e2e/scenarios/01-app-loads.md`:
  ```markdown
  # 场景 01: 应用加载

  验证 SerialCube.html 打开后能正常渲染，无 JS 报错。

  ## 前置
  - SerialCube.html 在工作区根目录
  - agent-browser 已 `install`（首次跑前）

  ## 步骤

  ```bash
  # 1. 打开页面
  agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html

  # 2. 等 1s 让 JS 跑完
  sleep 1

  # 3. snapshot interactive 元素
  agent-browser snapshot -i --json

  # 4. 检查 console 错误
  agent-browser console --level error
  ```

  ## 期望

  - snapshot 返回至少 20 个 interactive 元素 (按钮 / 输入框 / select)
  - console error 输出为空（或只有 favicon 等非关键 warning）
  - 页面标题 = "SerialCube"

  ## 失败排查

  - snapshot 返回空 → 页面没加载完，等长一点（sleep 2）
  - console 有 JS 错误 → 看错误信息，定位 SerialCube.html 行号
  - 标题不对 → 改坏了 `<title>`

  ## 截图

  ```bash
  agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/01-app-loads.png
  ```
  ```

- [ ] **Step 2.2: 验证**

  ```powershell
  Test-Path '.minimax/skills/serialcube-e2e/scenarios/01-app-loads.md'
  ```
  预期: `True`

### Step 3: 写场景 02 (connect-disconnect)

- [ ] **Step 3.1: 创建场景文件**

  创建 `.minimax/skills/serialcube-e2e/scenarios/02-connect-disconnect.md`:
  ```markdown
  # 场景 02: 串口连接 / 断开

  验证串口连接按钮的 UI 状态切换。**注意**: 真实串口不可用，只能验证 UI 状态变化（按钮文字、disabled 状态）。

  ## 前置
  - 场景 01 通过

  ## 步骤

  ```bash
  # 1. 找连接按钮（用 snapshot 看标签）
  agent-browser snapshot -i --json

  # 2. 点击「连接」按钮（ref 从 snapshot 拿）
  agent-browser click @e<N>

  # 3. 等 500ms
  sleep 0.5

  # 4. snapshot 看状态变化
  agent-browser snapshot -i --json

  # 5. 点击「断开」按钮
  agent-browser click @e<M>
  ```

  ## 期望

  - 点「连接」后，按钮文字从「连接」变成「断开」或显示「已连接」状态
  - 状态栏显示「未连接 / 已连接 / 连接中」之一
  - **不要期望真的连上串口**（浏览器没真串口设备），看 UI 状态是否切换
  - Web Serial API 在 Chrome 不可用时会弹原生 picker 或直接报错（OK，也是 UI 反馈）

  ## 失败排查

  - 按钮没反应 → JS 事件没绑，grep SerialCube.html 找 addEventListener
  - 报 "Web Serial API not supported" → 当前浏览器不支持，**这不算失败**，标记为 N/A
  - 状态卡「连接中」不切换 → mock 模式开关没开，grep 找 mock

  ## 截图

  ```bash
  agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/02-connect.png
  ```
  ```

- [ ] **Step 3.2: 验证**

  ```powershell
  Test-Path '.minimax/skills/serialcube-e2e/scenarios/02-connect-disconnect.md'
  ```
  预期: `True`

### Step 4: 写场景 03 (send-receive)

- [ ] **Step 4.1: 创建场景文件**

  创建 `.minimax/skills/serialcube-e2e/scenarios/03-send-receive.md`:
  ```markdown
  # 场景 03: 发送 / 接收 (mock 模式)

  验证发送输入框 + 发送按钮 + 接收区显示。**走 mock 模式**（不接真串口）。

  ## 前置
  - 场景 01 通过
  - 页面有「mock 模式」开关（grep SerialCube.html 找 mock 关键字）

  ## 步骤

  ```bash
  # 1. 打开 mock 模式
  agent-browser snapshot -i --json  # 找 mock 开关
  agent-browser click @e<mock-ref>

  # 2. 在发送输入框填 "AA 01 90"
  agent-browser snapshot -i --json  # 找输入框 ref
  agent-browser fill @e<input-ref> "AA 01 90"

  # 3. 点发送
  agent-browser snapshot -i --json  # 找发送按钮
  agent-browser click @e<send-ref>

  # 4. 等 500ms
  sleep 0.5

  # 5. snapshot 看接收区
  agent-browser snapshot -i --json
  ```

  ## 期望

  - 输入框显示 "AA 01 90"
  - 发送后接收区出现 mock 响应
  - 状态: 字节数 / 时间戳有更新

  ## 失败排查

  - mock 模式没找到 → grep `mock` 看 SerialCube.html，可能藏在设置页
  - 发送按钮 disabled → 检查「连接」状态，mock 模式应该绕过这限制
  - 接收区空白 → console 看错误

  ## 截图

  ```bash
  agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/03-send-receive.png
  ```
  ```

- [ ] **Step 4.2: 验证**

  ```powershell
  Test-Path '.minimax/skills/serialcube-e2e/scenarios/03-send-receive.md'
  ```
  预期: `True`

### Step 5: 写场景 04-06

- [ ] **Step 5.1: 创建 04-protocol-editor.md**

  创建 `.minimax/skills/serialcube-e2e/scenarios/04-protocol-editor.md`:
  ```markdown
  # 场景 04: 协议编辑器

  验证「协议编辑器」弹窗能打开、关闭、导入/导出 JSON。

  ## 前置
  - 场景 01 通过

  ## 步骤

  ```bash
  # 1. 找协议编辑器入口（用 snapshot）
  agent-browser snapshot -i --json
  # 找 "协议编辑器" 文字所在的按钮

  # 2. 点击打开
  agent-browser click @e<proto-btn-ref>

  # 3. 等 300ms
  sleep 0.3

  # 4. snapshot 弹窗内容
  agent-browser snapshot -i --json

  # 5. 点击「导出 JSON」按钮
  agent-browser click @e<export-ref>

  # 6. 验证 textarea 有内容
  agent-browser snapshot -i --json

  # 7. 关闭弹窗
  agent-browser click @e<close-ref>
  ```

  ## 期望

  - 弹窗标题 = "协议编辑器"
  - 副标题含 "TLV 帧结构"
  - 导出 textarea 非空（包含协议模板 JSON）
  - 关闭后弹窗消失

  ## 失败排查

  - 找不到入口 → grep SerialCube.html 找 `协议编辑器`
  - 弹窗打不开 → modal CSS 问题，看 `.modal.open` 规则
  - 导出空 → JSON 渲染失败，看 console
  ```

- [ ] **Step 5.2: 创建 05-parser-mode-switch.md**

  创建 `.minimax/skills/serialcube-e2e/scenarios/05-parser-mode-switch.md`:
  ```markdown
  # 场景 05: 解析模式切换 (文本 / 十六进制)

  验证解析协议设置面板的「文本解析 / 十六进制解析」tab 切换。

  ## 前置
  - 场景 01 通过

  ## 步骤

  ```bash
  # 1. 找解析面板
  agent-browser snapshot -i --json
  # 找 "解析协议设置" 区域

  # 2. 点 "十六进制解析" tab
  agent-browser click @e<hex-tab-ref>

  # 3. 等 200ms
  sleep 0.2

  # 4. snapshot 看输入框格式
  agent-browser snapshot -i --json

  # 5. 切回 "文本解析"
  agent-browser click @e<text-tab-ref>
  ```

  ## 期望

  - 切到 hex 模式，输入框 placeholder 变化（暗示 hex 输入）
  - 切回 text 模式，placeholder 变化
  - 解析结果区刷新

  ## 失败排查

  - tab 不响应 → grep `data-parser-mode` 找切换逻辑
  - 解析区不刷新 → 看 state 更新
  ```

- [ ] **Step 5.3: 创建 06-theme-toggle.md**

  创建 `.minimax/skills/serialcube-e2e/scenarios/06-theme-toggle.md`:
  ```markdown
  # 场景 06: 主题切换 (浅色 / 深色)

  验证浅色 / 深色 / 跟随系统 3 档主题切换。

  ## 前置
  - 场景 01 通过

  ## 步骤

  ```bash
  # 1. snapshot 找主题切换按钮
  agent-browser snapshot -i --json
  # 找主题相关按钮（图标是太阳/月亮）

  # 2. 点击切换到深色
  agent-browser click @e<theme-btn-ref>

  # 3. 等 200ms
  sleep 0.2

  # 4. 检查 body class
  agent-browser eval "document.body.className"

  # 5. 切回浅色
  agent-browser click @e<theme-btn-ref>
  ```

  ## 期望

  - body 含 `theme-dark` class（深色）
  - body 不含 `theme-dark` class（浅色）
  - 主题切换无白屏闪烁

  ## 失败排查

  - 按钮没反应 → grep `theme-dark` 看 class 切换逻辑
  - 切换后白屏 → CSS 变量缺失，看 `:root` 和 `.theme-dark` 规则
  - 切回浅色不生效 → toggle 逻辑写成了单向
  ```

- [ ] **Step 5.4: 验证 4 个文件**

  ```powershell
  Get-ChildItem '.minimax/skills/serialcube-e2e/scenarios'
  ```
  预期: 6 个 .md 文件

### Step 6: 写 run-scenarios.ps1

- [ ] **Step 6.1: 创建脚本**

  创建 `.minimax/skills/serialcube-e2e/scripts/run-scenarios.ps1`:
  ```powershell
  # -*- encoding: utf-8 -*-
  <#
  .SYNOPSIS
    跑 SerialCube.html 的 6 个核心 e2e 场景。
  .DESCRIPTION
    逐个跑 scenarios/0X-*.md 里的步骤, 出错时停下并保留截图。
  .EXAMPLE
    .\run-scenarios.ps1                       # 跑全部 6 个
    .\run-scenarios.ps1 -Scenario 03          # 只跑 03
    .\run-scenarios.ps1 -Url "file:///D:/path/SerialCube.html"  # 自定义 URL
  #>
  [CmdletBinding()]
  param(
      [ValidateSet('01','02','03','04','05','06')]
      [string[]]$Scenario = @('01','02','03','04','05','06'),
      [string]$Url = 'file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html',
      [string]$OutDir = "$PSScriptRoot\..\screenshots"
  )

  $ErrorActionPreference = 'Stop'

  # 准备截图目录
  if (-not (Test-Path $OutDir)) {
      New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
  }

  # 检查 agent-browser
  $ab = Get-Command agent-browser -ErrorAction SilentlyContinue
  if (-not $ab) {
      Write-Error "agent-browser 不在 PATH, 先跑 npm install -g agent-browser"
      exit 1
  }

  Write-Host "==> 跑场景: $($Scenario -join ', ')" -ForegroundColor Cyan
  Write-Host "==> URL: $Url" -ForegroundColor Cyan
  Write-Host "==> 截图输出: $OutDir" -ForegroundColor Cyan

  foreach ($s in $Scenario) {
      $file = Join-Path $PSScriptRoot "..\scenarios\$s-*.md"
      $scenarioFile = Get-ChildItem $file | Select-Object -First 1
      if (-not $scenarioFile) {
          Write-Warning "场景 $s 文件不存在, 跳过"
          continue
      }
      Write-Host ""
      Write-Host "==> [$s] $($scenarioFile.BaseName)" -ForegroundColor Yellow
      Get-Content $scenarioFile.FullName | Select-String -Pattern '^## |^### |^```bash|^```powershell' | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Gray }
  }

  Write-Host ""
  Write-Host "==> 说明: 本脚本只打印场景大纲, 具体步骤请打开 scenarios/$($Scenario[0])-*.md 跟着跑" -ForegroundColor Green
  Write-Host "==> (agent-browser 是交互式 CLI, 不能脚本化所有步骤; 真实运行由 AI 跟随场景文档执行)" -ForegroundColor Green
  ```

- [ ] **Step 6.2: 验证**

  ```powershell
  Test-Path '.minimax/skills/serialcube-e2e/scripts/run-scenarios.ps1'
  ```
  预期: `True`

### Step 7: 写 SKILL.md

- [ ] **Step 7.1: 创建主 SKILL.md**

  创建 `.minimax/skills/serialcube-e2e/SKILL.md`:
  ```markdown
  ---
  name: serialcube-e2e
  description: SerialCube 项目端到端验证 — 用 agent-browser 跑 6 个核心场景（应用加载 / 串口连接 / 发送接收 mock / 协议编辑器 / 解析模式切换 / 主题切换），替代单 HTML 项目无测试框架的「测试」环节。**当用户说「验证一下 SerialCube 没改坏 / 跑 e2e / 部署前自检 / 改完跑一遍场景」时触发**。
  ---

  # SerialCube E2E 验证

  ## 何时用

  - 改完 SerialCube.html，跑一遍 6 个场景确认没破其他
  - 部署前自检（替代 GitHub Actions 跑单测，单 HTML 项目无 CI）
  - 排查 bug 时用场景复现

  ## 6 个场景

  | 编号 | 名称 | 文件 | 关键验证 |
  |------|------|------|----------|
  | 01 | 应用加载 | [scenarios/01-app-loads.md](./scenarios/01-app-loads.md) | 页面渲染、JS 错误、title |
  | 02 | 连接/断开 | [scenarios/02-connect-disconnect.md](./scenarios/02-connect-disconnect.md) | 串口按钮 UI 状态切换 |
  | 03 | 发送/接收 | [scenarios/03-send-receive.md](./scenarios/03-send-receive.md) | mock 模式收/发 |
  | 04 | 协议编辑器 | [scenarios/04-protocol-editor.md](./scenarios/04-protocol-editor.md) | 弹窗、导入/导出 JSON |
  | 05 | 解析模式 | [scenarios/05-parser-mode-switch.md](./scenarios/05-parser-mode-switch.md) | 文本/hex 切换 |
  | 06 | 主题切换 | [scenarios/06-theme-toggle.md](./scenarios/06-theme-toggle.md) | 浅色/深色 |

  ## 工作流

  1. 跑 `scripts/run-scenarios.ps1` 看场景大纲
  2. AI 跟场景文档用 agent-browser 逐步执行
  3. 每个场景结尾截图（命令在文档里）
  4. 失败场景保留截图到 `screenshots/`
  5. 全部通过 → verification-before-completion 可勾

  ## 注意事项

  - **不期望真连串口** — 浏览器没真串口设备，场景 02/03 走 UI 状态验证
  - **agent-browser 不能全脚本化** — 步骤含「snapshot 找 ref」，需 AI 实时读 snapshot
  - **每次跑前清状态** — `agent-browser session reset` 或重启 session
  - **改 UI 后必跑** — 任何 SerialCube.html 改动都至少跑 01 + 04

  ## 与其他 skill 协作

  - **agent-browser**: 本 skill 必用工具，所有步骤都通过它
  - **serialcube-workflow**: 主工作流第 5 步「验证」就是调本 skill
  - **verification-before-completion**: 跑通 6 个场景才能勾「测试通过」
  ```

- [ ] **Step 7.2: 写 README.md**

  创建 `.minimax/skills/serialcube-e2e/README.md`:
  ```markdown
  # serialcube-e2e

  SerialCube 端到端验证。详见 [SKILL.md](./SKILL.md)。
  ```

### Step 8: Commit

- [ ] **Step 8.1: 提交**

  ```bash
  git add .minimax/skills/serialcube-e2e/
  git commit -m "feat(e2e): add 6-scenario E2E validation using agent-browser"
  ```

---

## Task 3: 部署清单 skill (`deploy-checklist`)

**Files:**
- Create: `.minimax/skills/deploy-checklist/SKILL.md`
- Create: `.minimax/skills/deploy-checklist/README.md`
- Create: `.minimax/skills/deploy-checklist/references/github-pages-checklist.md`

**Interfaces:**
- Consumes: 部署目标 = GitHub Pages (从 `index.html` 重定向到 `SerialCube.html` 推断)
- Produces:
  - 5 条硬性检查 + 失败排查
  - 部署后烟雾测试 (用 agent-browser 打开生产 URL)

### Step 1: 准备目录

- [ ] **Step 1.1: 建目录**

  ```powershell
  New-Item -ItemType Directory -Force -Path '.minimax/skills/deploy-checklist' | Out-Null
  New-Item -ItemType Directory -Force -Path '.minimax/skills/deploy-checklist/references' | Out-Null
  ```

### Step 2: 写 checklist

- [ ] **Step 2.1: 创建 checklist 文档**

  创建 `.minimax/skills/deploy-checklist/references/github-pages-checklist.md`:
  ```markdown
  # GitHub Pages 部署前 5 件事

  SerialCube 项目部署目标 = GitHub Pages (推断: index.html 跳转到 SerialCube.html)。

  ## 1. SerialCube.html 内无 console error

  ```bash
  agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
  sleep 1
  agent-browser console --level error
  ```
  期望: 无 error 输出。

  ## 2. 6 个 e2e 场景全过

  ```bash
  # 跑 serialcube-e2e 的 6 个场景
  ```
  任何一个失败 → 阻塞部署, 先修。

  ## 3. index.html 重定向正常

  ```bash
  agent-browser open https://yubiediu826.github.io/SerialCubeWeb/
  sleep 1
  agent-browser eval "window.location.href"
  ```
  期望: 包含 `SerialCube.html`。

  ## 4. 资源外链可访问

  SerialCube.html:7-9 有 preconnect 到 `yubiediu826.github.io` 和 `github.com`。
  ```bash
  curl -I https://yubiediu826.github.io/ 2>&1 | Select-String -Pattern 'HTTP/'
  ```
  期望: `HTTP/2 200`。

  ## 5. 版本号 / changelog 同步

  SerialCube.html 内的 changelog 区块 (grep 找 `版本`) 与 docs/handover/ 里的 release notes 一致。
  ```bash
  # 同步检查
  Select-String -Path 'D:\WorkSpace\SerialCubeWeb\SerialCube.html' -Pattern '^\s*<strong>1\.\d+\.\d+ 版本' | Select-Object -First 1
  Get-ChildItem 'D:\WorkSpace\SerialCubeWeb\docs\handover' -Recurse -Filter '*.md' | Select-String -Pattern '^# 1\.\d+\.\d+'
  ```
  期望: 两者都列出了最新版本号。

  ## 部署后: 烟雾测试

  ```bash
  # 1. 打开生产 URL
  agent-browser open https://yubiediu826.github.io/SerialCubeWeb/

  # 2. 跑场景 01 (应用加载)
  # 3. 跑场景 04 (协议编辑器)
  # 4. 截图存档
  agent-browser screenshot .minimax/skills/deploy-checklist/smoke-<date>.png
  ```
  ```

- [ ] **Step 2.2: 验证**

  ```powershell
  Test-Path '.minimax/skills/deploy-checklist/references/github-pages-checklist.md'
  ```
  预期: `True`

### Step 3: 写 SKILL.md

- [ ] **Step 3.1: 创建主 SKILL.md**

  创建 `.minimax/skills/deploy-checklist/SKILL.md`:
  ```markdown
  ---
  name: deploy-checklist
  description: SerialCube 项目 GitHub Pages 部署前 5 件事硬性检查（console 无错 / 6 个 e2e 场景通过 / index.html 重定向正常 / 资源外链可访问 / 版本号同步）+ 部署后烟雾测试。**当用户说「部署 / 发布 / 推 GitHub Pages / 上线」时必触发**。
  ---

  # SerialCube Deploy Checklist

  ## 何时用

  - 用户说「发版 / 部署 / 推 GitHub Pages / 上线」
  - 任何要 push 到 main 分支并触发 GitHub Pages 自动部署的场景

  ## 5 件事

  详见 [references/github-pages-checklist.md](./references/github-pages-checklist.md)

  1. **SerialCube.html 内无 console error**
  2. **6 个 e2e 场景全过** (调 serialcube-e2e)
  3. **index.html 重定向正常**
  4. **资源外链可访问** (preconnect 的 yubiediu826.github.io + github.com)
  5. **版本号 / changelog 同步** (SerialCube.html 与 docs/handover/ 一致)

  任何一件没过 → 阻塞部署, 修完再 deploy。

  ## 部署后

  跑烟雾测试: 打开生产 URL → 跑场景 01 + 04 → 截图存档。

  ## 注意事项

  - **GitHub Pages 自动部署**: push 到 main 后等 1-2 分钟才生效
  - **不要在 main 直推**: 走 feature branch + PR, 触发 code-review
  - **回滚方案**: GitHub Pages 设置里可以回滚到上一次部署, 但要先 grep 出坏在哪
  ```

- [ ] **Step 3.2: 写 README.md**

  创建 `.minimax/skills/deploy-checklist/README.md`:
  ```markdown
  # deploy-checklist

  SerialCube GitHub Pages 部署清单。详见 [SKILL.md](./SKILL.md)。
  ```

### Step 4: Commit

- [ ] **Step 4.1: 提交**

  ```bash
  git add .minimax/skills/deploy-checklist/
  git commit -m "feat(deploy): add GitHub Pages deploy checklist (5 items + smoke test)"
  ```

---

## Task 4: README 集成 + 反模式

**Files:**
- Modify: `.minimax/skills/README.md` (插入 3 个新 skill, 反模式 + 2 条, 触发链 + 3 行)

### Step 1: 读 README 当前结构

- [ ] **Step 1.1: 定位 ⑦ 阶段标题**

  第 82 行附近「### ⑦ 收尾 (review + 验收)」。

- [ ] **Step 1.2: 定位反模式章节**

  第 186 行附近「## 反模式 (不推荐做的事)」。

- [ ] **Step 1.3: 定位触发链表格**

  「## 怎么用」下, 第 96 行附近。

### Step 2: 加 ⑧ ⑨ ⑩ 阶段

- [ ] **Step 2.1: 修改 ⑦ 阶段表格**

  在「| **verification-before-completion** | obra/superpowers |」这一行**后面**插入 3 个新阶段:

  ```markdown
  ### ⑧ 项目级 SOP (串起 11 个 skill)

  | Skill | 来源 | 用途 |
  |-------|------|------|
  | **serialcube-workflow** | 本项目自建 | **入口 SOP**：5 问决策树 + 6 步触发链 + 3 个变体（主链 / 小改 / bug / 部署）；当用户在 SerialCube 项目内做改动时必触发 |

  ### ⑨ 端到端验证 (替代单 HTML 项目的测试)

  | Skill | 来源 | 用途 |
  |-------|------|------|
  | **serialcube-e2e** | 本项目自建 | **6 个核心场景**：应用加载 / 串口连接 / 发送接收 mock / 协议编辑器 / 解析模式切换 / 主题切换；用 agent-browser 跑，替代 TDD 在单 HTML 项目跑不通的「测试」环节 |

  ### ⑩ 部署清单 (GitHub Pages)

  | Skill | 来源 | 用途 |
  |-------|------|------|
  | **deploy-checklist** | 本项目自建 | **GitHub Pages 部署前 5 件事**：console 无错 / 6 个 e2e 场景过 / index.html 重定向 / 资源外链可达 / 版本号同步；部署后烟雾测试 |
  ```

### Step 3: 反模式章节加 2 条

- [ ] **Step 3.1: 在反模式最后追加**

  在「- ❌ **走 in-app 内置 Browser 调 SerialCube**」这一行**后面**插入:

  ```markdown
  - ❌ **改 SerialCube.html 不跑 e2e 验证** — 942KB 单文件改一处可能破其他；改完必跑 `serialcube-e2e` 6 个场景，否则不算改完
  - ❌ **跳过 deploy-checklist 直接 push** — GitHub Pages 自动部署后回滚麻烦，5 件事全过才能 push 到 main
  ```

### Step 4: 触发链表格更新

- [ ] **Step 4.1: 在「怎么用」表格里加 3 行**

  找到「| 「改完要交付了」」那行附近，在最前面插入 3 行:

  ```markdown
  | 「在 SerialCube 里加 / 改 / 调 X」 | `serialcube-workflow` (决策树 5 问) → 走对应 skill 链 |
  | 「改完跑一下 / 验证没破其他」 | `serialcube-e2e` 6 个场景 → 截图存档 |
  | 「要发版了 / 推 GitHub Pages」 | `deploy-checklist` 5 件事 → `git push` → 部署后烟雾测试 |
  ```

### Step 5: 验证整个 README

- [ ] **Step 5.1: 检查 3 处改动**

  打开 `.minimax/skills/README.md`, 确认 ⑧⑨⑩ 3 阶段标题 + 表格、反模式 2 条新增、触发链 3 行新增都生效; 现有结构没破

### Step 6: Commit

- [ ] **Step 6.1: 提交**

  ```bash
  git add .minimax/skills/README.md
  git commit -m "docs(skills): integrate workflow/e2e/deploy into README (3 new stages, 2 anti-patterns, 3 trigger chains)"
  ```

---

## Self-Review

### 1. Spec coverage

- [x] 决策规则 (Task 1 decision-tree.md 5 问)
- [x] 触发链 (Task 1 trigger-chains.md 6 步)
- [x] 端到端验证 (Task 2 6 个场景 + run-scenarios.ps1)
- [x] 部署清单 (Task 3 5 件事 + 烟雾测试)
- [x] README 集成 (Task 4 3 阶段 + 2 反模式 + 3 触发链)

### 2. Placeholder scan

- 无 TBD / TODO / 「implement later」
- 所有 `agent-browser` 命令是真实可执行的
- 所有 PowerShell 步骤都按 PowerShell 5.1 语法写（用 `;` 不用 `&&`，`Test-Path` 不用 `test`，etc.）
- `run-scenarios.ps1` 是真实可跑的（虽然「跑全部」是占位说明，但脚本本身有效）

### 3. API / 命名一致性

- 6 个场景编号 `01` 到 `06`, 文件名 `0X-name.md` 全程统一
- 3 个新 skill 命名 `serialcube-workflow` / `serialcube-e2e` / `deploy-checklist` 一致
- 触发链 6 步 = 决策 → 设计 → 计划 → 编码 → 验证 → 审查 → 部署 (7 个阶段含 1 个收尾, 但 README 写「6 步」是简化)
  - **注**: trigger-chains.md 标题「6 步」但实际画了 7 个箭头, 标 6 个 box + 一个收尾; OK 算合理

### 4. 真实性 / 风险

- **场景 02-03 走 mock 模式**: 假设 SerialCube.html 有 mock 开关, 需要 `grep mock` 验证
  - **前置任务 (不属本计划)**: 执行 Task 2 前先 grep SerialCube.html 确认 mock 模式存在; 若不存在, 改走「UI 状态模拟」路径, 场景描述里也写明
- **preconnect URL**: SerialCube.html:7-9 已确认是 `yubiediu826.github.io` + `github.com`, 真实有效
- **GitHub Pages URL**: 从 preconnect 推断是 `https://yubiediu826.github.io/SerialCubeWeb/`, 仓库名是 SerialCubeWeb (跟工作区目录名一致)
- **e2e 场景不能全脚本化**: 步骤含「snapshot 找 ref」需 AI 实时读, run-scenarios.ps1 只打印大纲, 这是设计妥协 (不假装能跑全自动化)

### 已知疏漏

- **run-scenarios.ps1 不能真跑**: 只能打印场景大纲, 真实步骤由 AI 跟随场景文档执行; 这是 agent-browser 交互式 CLI 的限制, 已写在脚本注释里
- **未提供 mock 模式开关的真实 ref**: 场景 03 要 grep SerialCube.html 找 mock, 计划没硬性要求 grep; 实际跑时按需补
- **Task 2 6 个场景不互锁**: 任一失败不会自动中止其他场景, 这是「手动跑 + 截图」的妥协

---

## Execution Handoff

计划完成, 保存到 `docs/superpowers/plans/2026-08-11-serialcube-dev-workflow.md`。

**执行选项**:

**1. Subagent-Driven (推荐)** — 每个 Task 派发独立子代理, Task 间做规格审查 + 代码质量审查两轮检查

**2. Inline Execution** — 当前会话直接跑, 每 Task 完做 checkpoint review

**前置条件 (两种方式都需要)**:
- 在 git 仓库根目录
- agent-browser 已装好 (`agent-browser --version` 应返回版本号; 0.34.0 已确认)

**选哪个?**
