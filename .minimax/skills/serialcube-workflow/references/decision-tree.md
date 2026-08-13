# SerialCube 工作流决策树

回答 6 个问题，决定走 brainstorming / grill-me / 直接开写 / TDD / **UI design guard**。

## Q1: 改动是否触及协议层 / 算法 / 解析逻辑？

- **是** → 走 TDD（test-driven-development）
  - 例: 加 CRC 算法、改 hex 解析、加 Modbus 命令解析
- **否** → 进入 Q2

## Q2: 改动是「新建/大改 UI 元素」还是「小修」？

| 子情况 | 判定 | 流程 |
|---|---|---|
| 新建 modal / 新建页内段 / 大改 modal 布局 / 改 header / 加新组件 | **大改** | 强制走 brainstorming（9 步）→ 画 mockup → **用户确认** → 写代码。**禁用** "我先做着试试" |
| 改字号 / 改颜色 / 改 padding / 改单个按钮样式 / 删冗余 UI | **小修** | 直接开写，但**仍走** `serialcube-modal-review` 自查表 |

- **大改** → brainstorming → 写 spec → 画 mockup → 用户确认 → 进入 Q3
- **小修** → 直接开写 → 必跑 `serialcube-modal-review` 6 步自查（即便改动 < 30 行）→ 验证

**为什么有这条**：v1.2.2 教训——把"UI 探索性改动直接写"当规则，导致 6 个 commit 修 10 个 UI bug，本质是缺 design guard。

## Q3: 累计同类 UI bug ≥ 3 个时强制 design review

> **累计追踪**（一个 minor / minor + major）= 设计问题，必须停下来 design review，不是再加一条 hotfix

- **是** → 走 grill-me（拷问"为什么重复犯"）→ brainstorming 找根因 → writing-plans → 实施
- **否** → 进入 Q4

**触发场景举例**（v1.2.2 真实案例）：
- 按钮间距 / 表单对齐 / 主题适配 / 嵌套 modal —— 任何一类累计 3 个 hotfix 立即 design review

## Q4: 改动是否影响 ≥ 3 个其他模块 / 多个文件 / 跨 widget？

- **是** → 走 brainstorming（9 步设计清单）→ writing-plans
- **否** → 进入 Q5

## Q5: 用户已经描述清楚需求（"按钮加个 X、文本改 Y"）？

- **是** → 走 grill-me（拷问到需求明确为止）→ 直接开写
- **否** → 进入 Q6

## Q6: 改动小到可以一句话写完（< 30 行 HTML/CSS/JS）？

- **是** → 直接开写（跳过 brainstorming/grill-me），但仍走：
  - `verification-before-completion`（验证）
  - **`serialcube-modal-review` 6 步自查**（UI 改动必跑）
  - **`agent-browser` 视觉确认**（截图比对）
- **否** → 走 grill-me 拷问 2-3 个核心问题再开写

**重要：< 30 行不是 UI 改动的护身符**。v1.2.2 6 个 commit 每个都 < 30 行，但累计 280+ 行 = 一个 modal 重构。

## 何时**不**用本工作流

- 排查 bug → 走 systematic-debugging（obra/superpowers）→ 改 → e2e 验证
- 重构既有代码 → 走 TDD（先有测试再改）
- 纯文档 / README 改动 → 直接改 → commit

## 红线（必触发 workflow，不可绕过）

- 🚨 新建 modal / 新建页内段 / 大改 header → 走 Q2 大改分支
- 🚨 UI 改动累计同类 ≥ 3 个 hotfix → 走 Q3 强制 design review
- 🚨 任何 UI 改动提交前 → 必跑 `serialcube-modal-review` 6 步
