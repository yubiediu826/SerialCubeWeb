---
name: version-management
description: SerialCube 版本号 + changelog 同步守门员 — 改 SerialCube.html 前必跑 `bump-version.ps1` 自动同步 VERSION 常量 + changelog 段。**当用户说「commit / push / bump version / 改一行代码 / 加新功能 / 修 bug」时必触发**（push 前还要问用户）。
---

# SerialCube Version Management

## 我是什么

SerialCube 项目的**版本号 / changelog 同步守门员**。当你改完代码准备 commit / push 时, 它强制你:

1. 先评估改动规模 (major / minor / patch)
2. 跑 `scripts/bump-version.ps1` 自动同步两处
3. 确认后自己 commit
4. **push 前必须用 `ask_user` 找用户确认** (硬性要求)

> 这条 skill 跟 `serialcube-workflow` 是**正交关系**: workflow 管「怎么改」, version-management 管「改完怎么发版」。

## 硬性规则 (4 条 + R4.2 子项, 违反任何一条视为事故)

### R1 — 不允许直接 commit SerialCube.html 的代码改动

```
❌ 改完 SerialCube.html → git add → git commit
✅ 改完 SerialCube.html → 跑 bump-version.ps1 → 确认 diff → git add → git commit
```

- **直接 commit 会让 VERSION 跟代码不同步**, 弹窗显示的版本号 / changelog 段会撒谎
- 唯一例外: bump 脚本本身 + docs 改动可以不走 bump, 但要在 commit message 写明

### R2 — 每次 push 前必须用 `ask_user` 找用户确认

```
❌ git commit → git push (跳过确认)
✅ git commit → ask_user("确认推 main 吗? 现在 e2e 都过了吗?") → 用户 y → git push
```

- push 是**不可逆的发布动作** (触发 GitHub Pages 自动部署)
- 弹窗确认时必须包含: **要推哪个分支 / 涉及哪几个 commit / 5 件事 deploy-checklist 过没**
- 用户的硬性要求, 写进这条 skill 就是为了不让 agent 偷懒

### R3 — VERSION 常量 + changelog 段 + (可选) Git tag 三处必须同步

| 位置 | 在哪 | 谁来改 |
|------|------|-------|
| VERSION 常量 | `SerialCube.html` L8068 | bump-version.ps1 |
| changelog 段 | `SerialCube.html` L8043 的 `version-changelog-title` 之后插入 | bump-version.ps1 |
| Git tag | `git tag v1.0.1` (手动) | 人类, 脚本只提示 |

- **脚本不自动打 tag** — tag 是里程碑, 由人类在 push 成功后再决定
- 但脚本会在最后**提示** `git tag vX.Y.Z` 这一步

### R4 — 版本变更后必须更新 README (防断档) 🆕

```
❌ bump-version → 只改 SerialCube.html → push → 文档断档 (README 还写 v1.0.0)
✅ bump-version → 改 SerialCube.html + 更新根 README + 更新 docs/README + 更新 CHANGELOG
   → 跑 check-readme-sync.ps1 全过 → push
```

- **背景**: 之前 v1.1.0 → v1.1.1 时, README 仍写 v1.0.0, 文档与代码脱节
- **强制检查脚本**: `scripts/check-readme-sync.ps1` (本 skill 提供)
- **检查项** (4 项硬性 + 1 项警告):
  1. 根 `README.md` 提当前 VERSION
  2. `docs/README.md` 提当前 VERSION
  3. `docs/CHANGELOG.md` 索引列当前 VERSION
  4. `docs/handover/release-vX.Y.Z-*.md` 或 `docs/changelog/*-vX.Y.Z-*.md` 至少 1 个含当前 VERSION
  5. (WARN) 旧 VERSION 引用是否需要清理
- **运行时机**: bump-version.ps1 之后, commit 之前
- **失败处理**: 修复 README 后重跑, 4 项必须全过

```powershell
# bump 后必跑 (R4 强制)
pwsh -File .minimax/skills/version-management/scripts/check-readme-sync.ps1
# 期望输出: [OK] All README sync checks passed for vX.Y.Z
```

### R4.2 — 临时文件 + 无用脚本清理 (防垃圾堆积) 🆕

```
❌ bump-version → 留着 debug-*.js / .tmp-* / preview-v1.html / COMMIT_MSG.txt → commit 进去
✅ bump-version → 跑 check-cleanup.ps1 → 0 issues → push
```

- **背景**: 工作区长期积累临时文件 (debug / tmp / bak / orig / 临时 commit msg / preview 中间稿 / 已废 verify 脚本)
- **强制检查脚本**: `scripts/check-cleanup.ps1` (本 skill 提供)
- **检测规则** (默认 fail, 详见脚本):
  - 工作区根 `debug-*.js` / `debug-*.py` / `test-*.js` / `verify-changes.js` / `report-task*.md` / `COMMIT_MSG.txt` / `commit-msg.txt` / `.tmp-*` → fail
  - 全局递归 `*.tmp` / `*.bak` / `*.orig` / `*.rej` (虽然 .gitignore 已忽略, 但本地残留仍提示) → fail
  - `docs/handover/*-CHECKLIST-*.md` (实施期 checklist, 已完结) → fail
  - `docs/verify/verify-task6.js` (已被 baseline 取代) → fail
  - `docs/design/*-preview-v[0-9]+.html` (中间稿, 保留 vN+1+ final) → warn
- **运行时机**: bump-version.ps1 之后, commit 之前 (与 R4 一起跑)
- **失败处理**:
  - 手动删除/移动
  - 或加 `-AutoArchive` 自动归档到 `.minimax/archive/cleanup-YYYY-MM-DD/`
- **配合 R4**: bump 后必跑两脚本, 都过才能 commit

```powershell
# bump 后必跑 (R4.2 强制, 配合 R4)
pwsh -File .minimax/skills/version-management/scripts/check-cleanup.ps1
# 期望输出: [OK] No temp files or unused scripts found
# 或: 跑 -AutoArchive 自动归档
pwsh -File .minimax/skills/version-management/scripts/check-cleanup.ps1 -AutoArchive
```

## 工作流 (6 步 + R4 同步检查)

```
[1] 评估改动规模
   ↓  看 references/version-policy.md 的决策树
[2] 选 level (major / minor / patch)
   ↓
[3] 跑 scripts/bump-version.ps1
   ↓  pwsh -File scripts/bump-version.ps1 -Level patch -Note "..." -Type 修复
[4] 脚本输出 diff 给你审
   ↓  VERSION: 1.0.0 → 1.0.1
   ↓  新增 changelog 段
[5] 输 y 确认, 脚本改 SerialCube.html
   ↓
[6] 🆕 跑 scripts/check-readme-sync.ps1 (R4 防断档, 4 项硬性检查全过)
   ↓  失败时: 修 README → 重跑
[6.5] 🆕 跑 scripts/check-cleanup.ps1 (R4.2 防垃圾堆积, 0 issues 才能 commit)
   ↓  失败时: 删/移, 或加 -AutoArchive
[7] 自己 git add + git commit + (push 前 ask_user)
   ↓
[8] (可选) git tag v1.0.1 + git push --tags
```

### 命令模板

```powershell
# 1. 修 bug / 改文案 → patch
pwsh -File .minimax/skills/version-management/scripts/bump-version.ps1 `
  -Level patch `
  -Note "仪表盘边框" `
  -Type 修复

# 2. 加新功能 / 新 widget → minor
pwsh -File .minimax/skills/version-management/scripts/bump-version.ps1 `
  -Level minor `
  -Note "新增 sparkline tooltip" `
  -Type 新增

# 3. 协议层破坏性重构 → major
pwsh -File .minimax/skills/version-management/scripts/bump-version.ps1 `
  -Level major `
  -Note "协议模板 kind 重命名" `
  -Type 破坏性
```

## 何时用我 vs 不用我

### 用我 ✅

- 改完 SerialCube.html, 准备 commit
- 准备发版 / push 之前
- 用户说「bump version」「加个新版本号」「发版」「commit 代码」「push 代码」
- changelog 段要更新

### 不用我 ❌

- 纯 docs / 知识库改动 (`docs/` `*.md` `AGENTS.md` `README.md` 等, 不涉及 SerialCube.html 运行时)
- bump 脚本本身 / 本 skill 文件的改动 (自己的元改动)
- 排查 bug 中间状态 (没修好不 commit, 也就没 bump 的事)

## 注意事项

- **不要手工改 SerialCube.html 的 VERSION 常量** — 那是脚本的唯一入口, 手工改会跟脚本 regex 不匹配
- **不要手工往 changelog 段塞新 div** — 同样的原因, 脚本会插在你手工段的前面, 顺序会乱
- **Note 字段写人话, 不要写"fix bug"** — 脚本会原样塞进 changelog, 用户能看到
- **Type 选错不影响 bump 结果** — bump 只看 level, Type 只是给 changelog 段的 `<li>` 前缀
- **脚本不自动 commit** — 这是有意的, 让你自己 review diff
- **脚本不自动 push** — 永远不要在脚本里写 `git push`, 配合 R2

## 与其他 skill 协作

| Step | 主用 skill | 本 skill 角色 |
|------|-----------|--------------|
| 改代码 | `serialcube-workflow` 7 步主链 | 改完准备 commit 时接管 |
| 验证 | `serialcube-e2e` 6 个场景 | e2e 全过 → 触发本 skill |
| 审查 | `requesting-code-review` | 审查完 → 触发本 skill |
| 部署 | `deploy-checklist` 5 件事 | 第 5 件事「版本号同步」由本 skill 保证 |
| 验收 | `verification-before-completion` | 验证完 → 触发本 skill |
| 写 changelog 文案 | 本 skill | — |

**触发顺序** (从 code-change 到 push):

```
serialcube-workflow
  → serialcube-e2e
  → requesting-code-review
  → verification-before-completion
  → version-management  ← 你在这里
    → deploy-checklist (push 前再过一遍 5 件事)
    → ask_user (push 确认)
    → git push
```

## 反模式 (踩了就回滚)

- ❌ 直接 `git commit -m "fix: xxx" SerialCube.html` 跳过 bump
- ❌ bump 后不审 diff 就 commit (脚本改了啥你要知道)
- ❌ **bump 后不跑 check-readme-sync.ps1, 推完发现 README 写的是 v1.0.0** 🆕
- ❌ **bump 后不跑 check-cleanup.ps1, 临时文件 + preview 中间稿混进 commit** 🆕
- ❌ push 前不 ask_user, 直接 `git push origin main`
- ❌ 多个改动攒一起 bump, 一次 minor 包 10 个 patch
- ❌ bump 了 SerialCube.html 但忘了 commit, 推到一半发现 diff 不见
- ❌ 在 SerialCube.html 手工塞 changelog 段, 脚本会重复插

## 完整文档

- [references/version-policy.md](./references/version-policy.md) — major / minor / patch 决策树
- [references/changelog-template.md](./references/changelog-template.md) — 5 类 changelog 段格式
- [scripts/bump-version.ps1](./scripts/bump-version.ps1) — 自动 bump 脚本 (PowerShell 5.1 兼容)
- [scripts/check-readme-sync.ps1](./scripts/check-readme-sync.ps1) — README 同步检查 (R4 防断档) 🆕
- [scripts/check-cleanup.ps1](./scripts/check-cleanup.ps1) — 临时文件清理检查 (R4.2 防垃圾) 🆕
