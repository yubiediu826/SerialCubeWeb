# SerialCube v1.1.1 工作流加固交接 — 工具 + 硬性规则 + 清理

> **用途:** v1.1.1 主体功能 4 修复 (03323d7) 推完后,本会话强化工作流 (commit 2da12f6) — 6 个新工具 + R4/R4.2 硬性规则 + 20 个无用文件清理。
> **最后更新:** 2026-08-12
> **当前版本:** v1.1.1 (`SerialCube.html const VERSION = '1.1.1'`)
> **本次 commit:** `2da12f6 chore: v1.1.1 工具加固 + docs 同步 + 临时文件清理` (23 files, +2981/-4280)
> **前置文档:** [`HANDOFF-V1.1.1-FIXES-2026-08-12.md`](HANDOFF-V1.1.1-FIXES-2026-08-12.md) (v1.1.1 4 修复交接)

---

## 🚀 TL;DR — 60 秒看完

**3 大改动 (commit 2da12f6):**

1. **6 个新工具** — 解决"卡住不退出"和"token 消耗快"两个用户痛点
2. **R4 + R4.2 硬性规则** — 防文档断档 + 防垃圾堆积,集成到 version-management 工作流
3. **20 个无用文件清理** — docs/verify/ 临时 + design preview v1/v2/v3 + handover 中间 checklist

**核心决策 (用户已确认):**
- 卡住检测 4 层防御: 工具健康 → 陷阱检测 → 备选路径 → 优雅降级
- token 优化不牺牲功能完备性: e2e 增量基线 (按改动选场景, 不跑重复)
- subagent 防 aborted: 4 段 report 模板 + 心跳 + fallback 协议
- 防断档硬性: bump-version 后必跑 check-readme-sync, 4 项全过才能 commit
- 防垃圾硬性: commit 前必跑 check-cleanup, 0 issues 才能 commit

**改动量:** 23 files / +2981 / -4280 / 0 行 SerialCube.html 改动

---

## 📦 6 个新工具 (按使用顺序)

### 1. preflight.ps1 — 改 SerialCube.html 前的健康检查

**位置:** `.minimax/skills/serialcube-workflow/preflight.ps1`

**何时跑:** 任何改 SerialCube.html / 长流程开工前

**检查项 (9 项):**
| # | 项 | 触发条件 | 解决 |
|---|----|---------|------|
| 1 | agent-browser | 不可达 / 5s 无响应 | 走静态 grep fallback |
| 2 | git | 不可达 | 阻塞 |
| 3 | node | 不可达 | warn (subagent 改用 pwsh) |
| 4 | pwsh | 5.1 Desktop | warn (Start-Job timeout 不准) |
| 5 | PS ReadLine 3s | hang | warn → echo y \| script 或手工 |
| 6 | commit msg 文件路径 | 不可写 | warn → git commit -m 短英文 |
| 7 | git proxy 端口 | 配置了但不通 | warn → git push -c http.proxy= |
| 8 | 静态 grep fallback | SerialCube.html 不在工作区 | 阻塞 |
| 9 | agent-browser --help 5s | 不可达 | warn → 用 eval 替代 snapshot |

**输出示例:**
```
[OK] agent-browser                    agent-browser 0.34.0
[!] pwsh                             v5.1.26100.9168 - Start-Job timeout inaccurate
[OK] static grep fallback             SerialCube.html 21997 lines, Select-String ready
Summary: 9 total / 0 block / 2 warn
```

**退出码:** 0=ok, 1=warn(继续), 2=block(停)

### 2. select-scenarios.ps1 — e2e 增量场景选择器

**位置:** `.minimax/skills/serialcube-e2e/scripts/select-scenarios.ps1`

**何时跑:** 改完跑 e2e 前

**用法:**
```powershell
$files = git diff --name-only HEAD~1 HEAD
$scenarios = & .minimax/skills/serialcube-e2e/scripts/select-scenarios.ps1 -ChangedFiles $files
.\.minimax/skills/serialcube-e2e/scripts/run-scenarios.ps1 -Scenario $scenarios
```

**决策表 (10 条):**
- `SerialCube.html` → 01+04+06
- `system-menu|theme-seg` → 01+06
- `dh-config-center|protocol` → 01+04
- `modal.*open|modal.*close` → 01+04
- `edit-mode|toolbar-btn` → 01+04
- `card-action|card-default` → 01+04
- `connect-btn|connectBtn|webSerial|baudRate` → 01+02+03
- `parserMode|hexView|asciiView` → 01+05
- `^docs/` → 0 (纯 docs 改动不跑 e2e)
- baseline.json 失败场景强制重跑

**收益:** v1.1.1 patch 改动省 50% e2e 跑时, 01 永远跑 + baseline 失败强制重跑, 覆盖率不打折

### 3. subagent-template.md — 4 段 report 模板

**位置:** `.minimax/skills/serialcube-workflow/references/subagent-template.md`

**何时用:** 拆 subagent 任务 (≤ 500 行 / ≤ 3K prompt) 时

**强制 4 段:**
```
[REPORT-CHANGED]    改了哪些 + diff stat
[REPORT-VERIFIED]   subagent 自测了什么 (不跑真 e2e)
[REPORT-NEXT]       parent 下一步接力动作
[HEARTBEAT-EVERY-100L]  进度心跳 (防 aborted 失联)
```

**真实案例:** v1.1.1 modal stack 改动约 200 行, 拆 subagent 跑 1 段 30 分钟, parent 接力 e2e + commit

### 4. check-readme-sync.ps1 — R4 防断档

**位置:** `.minimax/skills/version-management/scripts/check-readme-sync.ps1`

**何时跑:** bump-version.ps1 之后, commit 之前

**检查项 (4 硬性 + 1 warn):**
1. 根 `README.md` 提当前 VERSION
2. `docs/README.md` 提当前 VERSION
3. `docs/CHANGELOG.md` 索引列当前 VERSION
4. `docs/handover/release-vX.Y.Z-*.md` 或 `docs/changelog/*-vX.Y.Z-*.md` 至少 1 个含当前 VERSION
5. (WARN) 旧 VERSION 引用

**触发背景:** v1.1.0 → v1.1.1 时, README 仍写 v1.0.0, 文档与代码脱节

### 5. check-cleanup.ps1 — R4.2 防垃圾堆积

**位置:** `.minimax/skills/version-management/scripts/check-cleanup.ps1`

**何时跑:** bump-version.ps1 之后, commit 之前 (与 R4 一起跑)

**检测规则 (默认 fail):**
- 工作区根 `debug-*.js` / `test-*.js` / `verify-changes.js` / `report-task*.md` / `COMMIT_MSG.txt` / `commit-msg.txt` / `.tmp-*`
- `docs/handover/*-CHECKLIST-*.md` (实施期 checklist)
- `docs/verify/verify-task6.js` (被 baseline 取代)

**检测规则 (warn):**
- `docs/design/*-preview-v[0-9]+.html` (中间稿, 保留 vN+1+ final)

**两种模式:**
- `NORMAL` (默认): fail 阻塞, warn 不阻塞
- `STRICT`: warn 也算 fail

**Auto-archive:** 加 `-AutoArchive` 自动移到 `.minimax/archive/cleanup-YYYY-MM-DD/`

### 6. baseline.json — e2e 增量基线

**位置:** `.minimax/skills/serialcube-e2e/reports/baseline.json`

**内容:** v1.1.1 6 场景全过基线 + last_passed 时间戳

**作用:** select-scenarios 跨版本对比, baseline 失败场景强制重跑

---

## 🛡 工作流硬性规则 (R1-R4.2)

集成到 `version-management` SKILL.md 第 6-6.5 步:

| 规则 | 触发 | 强制检查 | 失败后果 |
|------|------|----------|----------|
| R1 | 改 SerialCube.html | 跑 bump-version.ps1 | VERSION 与代码不同步 |
| R2 | 任何 push | ask_user 确认 | 不可逆发布 |
| R3 | bump-version | VERSION 三处同步 (const / changelog 段 / tag) | 弹窗显示版本号撒谎 |
| R4 | bump-version | check-readme-sync.ps1 (4 项) | 文档断档 |
| R4.2 | bump-version | check-cleanup.ps1 (0 issues) | 垃圾文件 / 中间稿混进 commit |

**新工作流 (8 步):**
```
[1] 评估改动规模 (decision tree)
[2] 选 level (major/minor/patch)
[3] 跑 bump-version.ps1
[4] 脚本输出 diff 给你审
[5] 输 y 确认, 脚本改 SerialCube.html
[6] 🆕 跑 check-readme-sync.ps1 (R4, 4 项硬性)
[6.5] 🆕 跑 check-cleanup.ps1 (R4.2, 0 issues)
[7] 自己 git add + commit (中文, -F 文件避免 PS 引号) + push 前 ask_user
[8] (可选) git tag + git push --tags
```

---

## 🗑 20 个无用文件清理记录

| 类别 | 文件 | 原因 |
|------|------|------|
| verify 临时 | `.tmp-cmd-tab.js` `.tmp-count.py` | 临时文件 |
| verify 临时 | `COMMIT_MSG.txt` | 临时 commit msg |
| verify 临时 | `debug-add-field.js` `debug-add-field2.js` `debug-click.js` `debug-notif.js` `debug-notif2.js` | 临时 debug 脚本 |
| verify 临时 | `report-task2-3.md` `test-icons.js` `verify-changes.js` | 临时测试/报告 |
| verify 废弃 | `verify-task6.js` | 被 verify-phase3-baseline.js 取代 |
| design preview | `v1.1.1-fixes-preview.html` (v1) | v3 final 保留, v1 删 |
| design preview | `v1.1.1-fixes-preview-v2.html` (v2) | v3 final 保留, v2 删 |
| design preview | `protocol-multi-command-preview.html` (v1) | v4 final 保留, v1 删 |
| design preview | `protocol-multi-command-v2-preview.html` (v2) | v4 final 保留, v2 删 |
| design preview | `protocol-multi-command-v3-preview.html` (v3) | v4 final 保留, v3 删 |
| handover 中间 | `SESSION-CHECKLIST-2026-08-11.md` | 早期开窗口 checklist, 被 preflight 取代 |
| handover 中间 | `HANDOFF-PROTOCOL-MULTI-COMMAND-CHECKLIST-2026-08-12.md` | v1.1.0 实施 checklist, 已完结 |
| screenshots 残留 | `commit-msg.txt` (in screenshots/) | 临时残留 |

**归档位置:** `.minimax/archive/docs-cleanup-2026-08-12/{verify,design,handover,screenshots}/`
- 7 天内可手动恢复
- 7 天后建议 `mavis-trash` 或 `Remove-Item` 永久删除

**删除前 0 断链验证:**
- 根 README.md + docs/README.md 检查 → 引用 0 处
- docs/CHANGELOG.md 索引 → 已包含 v1.1.1
- v1.1.0 handoff 那张表里 3 个 design preview 链接会断 (handoff 整个 untracked, 不进 git)

---

## 📋 关键文件位置速查

| 内容 | 位置 |
|------|------|
| 主 system-menu HTML | `SerialCube.html` 行 7031-7077 (主题 segmented 已加) |
| 协议配置 modal title | `SerialCube.html` 行 7726 ("协议配置") |
| 主题 segmented handler | `SerialCube.html` 行 21199 (`bindSystemMenuThemeSeg()`) |
| Modal stack | `SerialCube.html` 行 12520-12580 (NS._modalStack) |
| 编辑模式 active 强化 | `SerialCube.html` 行 5700 (.toolbar-btn.active !important) |
| 卡片 action 20px | `SerialCube.html` 行 6106-6121 |
| VERSION 常量 | `SerialCube.html` 行 7900 (v1.1.1) |
| 6 工具 + 1 模板 | `.minimax/skills/{serialcube-workflow,serialcube-e2e,version-management}/` |
| 4 R 硬性规则 | `.minimax/skills/version-management/SKILL.md` 行 19-99 |
| 新工作流图 | `.minimax/skills/version-management/SKILL.md` 行 80-94 |
| v1.1.1 工具加固 commit | `2da12f6 chore: v1.1.1 工具加固 + docs 同步 + 临时文件清理` |
| v1.1.1 4 修复 commit | `03323d7 fix(v1.1.1): 4 个用户反馈修复` |

---

## 🧪 测试覆盖 (本次加固验证)

| 测试 | 结果 |
|------|------|
| preflight (9 项健康检查) | ✅ 0 block, 2 warn (pwsh 5.1 + proxy 7897) |
| check-readme-sync (R4) | ✅ 4/4 硬性 (v1.1.1 同步) |
| check-cleanup (R4.2) | ✅ 0 issues (NORMAL + STRICT 模式) |
| select-scenarios (v1.1.1 改动) | ✅ 选 01+04+06 (跳过 02/03/05) |
| agent-browser 实测 (主题/Modal stack/卡片) | ✅ 3 张截图存档 |
| git push (commit 2da12f6) | ✅ 03323d7..2da12f6 main -> main |

---

## 🐛 已知限制 / 后续 TODO

| 限制 | 影响 | 后续 |
|------|------|------|
| preflight 跑在 Windows PowerShell 5.1 | Start-Job timeout 精度有限 (实际可能 ±5s) | 升级到 PowerShell 7 (cross-platform) |
| select-scenarios 决策表 pattern 硬编码 | 新增协议/新场景需手动加 rule | 改动态分析 (AST) |
| check-cleanup Auto-archive | archive 目录 7 天后需手动清理 | 加 cron 自动 archive + 通知 |
| subagent 4 段 report 模板 | subagent 仍可能漏掉 HEARTBEAT 段 | parent 端检查 (grep 必含 4 个 marker) |
| R4.2 中 `docs/design/*-preview-v[0-9]+.html` | 假设 final 永远 vN+1, 不灵活 | 改 pattern 让 final 显式标注 |
| v1.1.0 handoff 那张表 3 个 design preview 链接 | untracked handoff 内部, 暂不修 | handoff 入仓时统一更新 |

---

## 🔑 用户硬性规则 (不可违反)

1. **commit 中文** (用 `git commit -F <file>` 避免 PS 引号问题)
2. **push 前必 ask_user** (避免 force push 误操作, 不可逆发布)
3. **VERSION 三处同步** (SerialCube.html const / HTML changelog 段 / Git tag)
4. **改 SerialCube.html 前必跑 bump-version.ps1** (R1)
5. **每次 push 前必写 changelog 子文件** (`docs/changelog/YYYY-MM-DD-<topic>.md` + CHANGELOG.md 索引)
6. **🆕 版本变更后必跑 check-readme-sync.ps1 (R4) + check-cleanup.ps1 (R4.2)**
7. **更新完必跑 link check + 同步关联文档**

---

## 🎯 用户背景 (避免重复问)

- **角色:** 嵌入式 / 硬件方向 (SerialCube 用于 BMS / EMS / PCS 协议调试)
- **领域:** 户外电源 / 户用储能 / 通信棒模块 (类似 tastek.cn 的 DTU/RTU)
- **场景:** 离线 / 户外网络不稳, 协议解析高频, 卡住不退出是痛点
- **设计偏好:**
  - 数据字段归命令不归协议 (cmd 自带 dataFields)
  - 添加用 modal 不用内嵌表单
  - 图标只用 inline SVG (Lucide, 16x16 viewBox + stroke 1.5)
  - 喜欢正交分层一站式 modal
  - 工具栏按钮越少越好
- **subagent 约定:** 1 task 1 subagent, ≤ 500 行 / ≤ 3K prompt
- **工作流偏好:** 优化 token 消耗但不能牺牲性能 + 防卡住 (本次加固的 2 个核心驱动)

---

## 📦 当前 main 状态

```
2da12f6 chore: v1.1.1 工具加固 + docs 同步 + 临时文件清理
03323d7 fix(v1.1.1): 4 个用户反馈修复
fcd6cfb merge: 合并 feature/protocol-multi-command → main (v1.1.0 发布)
b02b9a4 feat(protocol): 协议多命令方案 + 配置中心 v2
```

**v1.1.1 完整生命周期 (03323d7 + 2da12f6):**
- 03323d7: 4 用户反馈修复 (主题 / 协议配置 / 编辑模式 / Modal stack)
- 2da12f6: 工具加固 (preflight / R4 / R4.2 / 清理) — 本次交接

**未变更:** SerialCube.html 主体功能 (v1.1.1 生效在 03323d7)

---

## 🔗 关联文档

- **v1.1.1 4 修复交接:** [`HANDOFF-V1.1.1-FIXES-2026-08-12.md`](HANDOFF-V1.1.1-FIXES-2026-08-12.md)
- **v1.1.0 完整交接:** [`HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md`](HANDOFF-PROTOCOL-MULTI-COMMAND-2026-08-12.md)
- **v1.1.0 发版后状态:** [`HANDOFF-POST-V1.1.0-2026-08-12.md`](HANDOFF-POST-V1.1.0-2026-08-12.md)
- **v1.1.0 release notes:** [`release-v1.1.0-2026-08-12.md`](release-v1.1.0-2026-08-12.md)
- **30 秒快速接手卡:** [`HANDOFF-QUICKSTART-2026-08-11.md`](HANDOFF-QUICKSTART-2026-08-11.md)
- **项目主交接:** [`PROJECT-HANDOVER-2026-08-11.md`](PROJECT-HANDOVER-2026-08-11.md)
- **v1.1.1 changelog:** [`../changelog/2026-08-12-v1.1.1-fixes.md`](../changelog/2026-08-12-v1.1.1-fixes.md)
- **version-management SKILL:** [`.minimax/skills/version-management/SKILL.md`](../../.minimax/skills/version-management/SKILL.md)
- **workflow skill (含 subagent 模板):** [`.minimax/skills/serialcube-workflow/`](../../.minimax/skills/serialcube-workflow/)
- **e2e skill:** [`.minimax/skills/serialcube-e2e/`](../../.minimax/skills/serialcube-e2e/)
- **根 README:** [`../../README.md`](../../README.md)
- **docs 主入口:** [`../README.md`](../README.md)
- **CHANGELOG 主索引:** [`../CHANGELOG.md`](../CHANGELOG.md)
