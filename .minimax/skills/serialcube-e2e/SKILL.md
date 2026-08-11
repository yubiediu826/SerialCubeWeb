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
