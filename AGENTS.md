# AGENTS.md — SerialCube 项目 Agent 强制规范

> 本文件约束**任何** AI agent(Claude Code / Mavis / Codex / Cursor / Aider 等)接手 SerialCube 项目时的行为。
> 上游优先: 用户在 chat 中的明确指令 > 本文件 > 默认行为。

## 1. 工作流程 (轻量, 不强制 skill 链)

**直接动手。** 项目小、单文件、用户偏好"看截图找问题不查 console" —
不需要 superpowers / impeccable / TDD 等重型框架. 必要时调用下面的轻量 skill:

| 场景 | 可选 skill |
|---|---|
| 新功能 / 改 UI / 设计方向 | `brainstorming` (基础) → `design-taste-frontend` (色板/字体/状态判断) |
| 生成预览图 (PNG) | `imagegen-frontend-web` (image_synthesize 用) |
| 高端视觉参考 (landing / 营销页) | `high-end-visual-design` |

**注意边界**: `design-taste-frontend` 文档明确 *Not dashboards, not
data tables, not multi-step product UI* — SerialCube 是 **Operate 模式**工具,
借鉴其规则(色彩锁定、形状一致、状态机), 不照搬其 landing 美学.

## 2. 关键架构约束(不可绕过)

- **单文件优先**: `SerialCube.html` 是核心可分发单元,任何拆分(多文件 / 引入
  build 步骤)需用户明确同意
- **数据兼容性字段不可改**:
  - `localStorage` keys: `serialweb:prefs`, `serialweb:version-modal-seen`,
    `wsl-*` 系列
  - 配置 JSON type 字符串: `SerialWebUserConfig` (v1)
  - `.timeline` 二进制 magic: `WSLBIN1` (`0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00`)
  - API 路径: `/api/serialweb_page-view`
  - JS 内部命名: `__serialWeb*` / `clearSerialWebStoredUserData` / 等
  改这些会**破坏用户已落盘的历史数据**(localStorage 偏好、录制的 .timeline 文件、
  复制过的 user config)

## 3. 提交流程

- 中文 commit message,标题一行,正文分段(背景 / 范围 / 验证)
- 多个相关文件一次 commit,不拆碎片
- 改 UI 后必须截图自检(用户偏好:看截图找问题,不查 console)
- 不要做防御性提问,直接动手,真问题再问

## 4. Skill 安装源(供 sync / 升级用)

- taste: https://github.com/Leonxlnx/taste-skill
- high-end-visual-design: 同 taste 作者的设计参考库

项目内副本在 `.claude/skills/`(已 commit,锁定当前版本)。需要升级时:
1. clone 上游 → 比对 `.claude/skills/` → 同步变更
2. 升级后单独 commit,标题写"sync skills from upstream (date)"

## 5. 项目速查

- 主代码: `SerialCube.html` (15841 行, 580.5 KB)
- 架构分析: `docs/architecture.md`
- 在线版本: https://yubiediu826.github.io/SerialCubeWeb/
- 仓库: https://github.com/yubiediu826/SerialCubeWeb
- 浏览器要求: Chromium 系(需要 Web Serial API)
