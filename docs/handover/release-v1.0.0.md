# SerialCube v1.0.0 — Release Handover

> **Tag:** `v1.0.0` (annotated, `git rev-parse v1.0.0`)
> **Release commit:** `8570dc0` (HEAD at tag)
> **Release date:** 2026-08-11
> **Code version:** `SerialCube.html const VERSION = '1.0.0'`
> **Author:** Mavis (with user M.\*)

## 这是什么

**SerialCube 第一个正式版本**。单 HTML 文件的串口调试工具，BMS/EMS/PCS 协议调试方向，从 prototype 跨到 production-ready。

11 项核心能力 + 7 个深色模式修复 + 完整 AI 工作流（11 skill）一次性合并发布。

## 核心能力

### 主代码 (`SerialCube.html` 942KB)

- **串口监视 + 设备连接管理** — Web Serial API, mock 模式
- **图形解析** — 仪表盘 widget (大数字 + 范围条 + sparkline + 状态角标) + 卡片详情弹窗 (折线/柱状/面积/散点 + 7 列日志表)
- **时间线系统** — 卡片 + 全局时间范围 + 缩放工具栏
- **预设发送** — 3 种扩展: 自动 / 条件 / 预设组
- **协议编辑器** — TLV 帧结构, 8 kind 协议模板, CRC-8/16-MODBUS/16-CCITT/XOR/Checksum 校验
- **解析协议** — 文本 / 十六进制 切换
- **双主题** — 浅色 / 深色 / 跟随系统, modal / panel 统一实色背景
- **告警** — toast 浮层 + 右上角"通知"历史按钮

### AI 工作流 (`.minimax/skills/` 15 skill)

**4 个本项目自建** (本 session 新建):

| 阶段 | Skill | 用途 |
|------|-------|------|
| ⑧ | `serialcube-workflow` | 5 问决策树 + 7 步主链 |
| ⑨ | `serialcube-e2e` | 6 场景端到端验证 |
| ⑩ | `deploy-checklist` | GitHub Pages 5 件事清单 |
| ⑪ | `version-management` | 3 条硬性规则 + bump 脚本 |

**11 个上游**: using-superpowers / brainstorming / grill-me / writing-plans / TDD / taste / ui-ux-pro-max / design-system / agent-browser / requesting-code-review / verification-before-completion

## Commit 链路 (9 个, 从 0 到 1)

```
8570dc0  perf(skills): trim descriptions + add routing table        (HEAD at v1.0.0)
f008bd8  docs(skills): refresh README (11→15 skills, 7→11 stages)
f733c0f  docs(skills): add stage 11 (version-management)
a24147d  feat(skills): add version-management skill
2f65f8b  chore(release): collapse 1.0.1+1.0.0 → 1.0.0
83b4239  docs(skills): fix 6→7 step count
e46ac49  docs(skills): integrate workflow/e2e/deploy
85e346b  feat(deploy): add GitHub Pages deploy checklist
aa3d977  feat(e2e): add 6-scenario E2E validation
f113767  feat(workflow): add serialcube-workflow SOP
8af70f1  chore: initial baseline commit
```

**净增**: 12 个新文件 (4 skill 目录), 7 个文件改, 约 +3500 行代码

## 性能 / 优化 (本 session)

- **taste SKILL.md** 88KB → 6KB (按需加载 references/core.md 82KB) — 单次触发从 60K → 2K tokens
- **15 skill description 差异化** — 启动 tokens ~2.4K → ~1.9K
- **README routing 速查表** — 14 行「用户说辞 → skill」映射, 4 行撞词高危区分

## 已知问题 / 不在本版本

| 项 | 状态 | 后续 |
|----|------|------|
| GitHub Pages 部署 | **未 push** (本机连不上 github.com, 用户手动) | 用户跑 `git push -u origin main --force` |
| 部署后烟雾测试 | **未跑** | 部署后跑 `serialcube-e2e` 场景 01 + 04 |
| `using-git-worktrees` skill | 未装 (单文件项目用不到) | 多任务并行时再装 |
| `protocol-copilot` skill | 计划存档 (`docs/superpowers/plans/2026-08-11-serial-protocol-copilot.md`) | 等协议层工作量大时再做 |
| `release-management` skill | 未做 | 1.0.1 / 1.1.0 累积时需要 |

## 下一步 (3 件事)

1. **用户手动 push** — `git push -u origin main --force --tags` (因为远端冲突)
2. **部署后跑 e2e** — 打开 https://yubiediu826.github.io/SerialCubeWeb/ 跑 `serialcube-e2e` 场景 01 (应用加载) + 04 (协议编辑器)
3. **CI smoke check** — 看 GitHub Pages 是否 1-2 分钟内生效

## 协议约定 (向后兼容)

- `bump-version.ps1 -Level patch` → 1.0.0 → 1.0.1 (修复)
- `bump-version.ps1 -Level minor` → 1.0.0 → 1.1.0 (新功能)
- `bump-version.ps1 -Level major` → 1.0.0 → 2.0.0 (破坏性)

VERSION 三处同步: SerialCube.html const VERSION / HTML changelog 段 / (可选) git tag

## 文件清单 (本 release 影响)

```
新增:
  .minimax/skills/serialcube-workflow/        (4 文件, SOP)
  .minimax/skills/serialcube-e2e/             (9 文件, e2e)
  .minimax/skills/deploy-checklist/           (3 文件, deploy)
  .minimax/skills/version-management/         (5 文件, version)
  .minimax/skills/taste/references/core.md    (82KB, 按需)
  .gitignore
  docs/superpowers/plans/                     (2 计划存档)
  docs/handover/release-v1.0.0.md             (本文件)

改:
  SerialCube.html                             (VERSION 1.0.1→1.0.0, 合并 changelog)
  .minimax/skills/README.md                   (refresh)
  .minimax/skills/agent-browser/SKILL.md      (description 裁剪)
  .minimax/skills/ui-ux-pro-max/SKILL.md      (description 裁剪)
  .minimax/skills/taste/SKILL.md              (88KB→6KB)
  4 个自建 skill SKILL.md                     (description 差异化)
```

## Authoring Note

本版本由 **Mavis (orchestrator agent) + 4 个 coder subagent** 协作完成:
- 1 个 baseline 初始化 (root session)
- 3 个并行 subagent (Task 2 e2e + Task 3 deploy + Task 4 README)
- 1 个串行 subagent (Task 1 workflow, 早期)
- 1 个串行 subagent (version-management skill)

总计: 6 subagent invocation, 0 push (用户手动), 0 e2e 实际跑 (本机跑, 浏览器自动化留给用户)
