# 2026-08-12 — README.md 同步修复（补 R5/R6 自检应用）

> **Commits:** (待 commit,见末尾)
> **Tags:** (无)
> **Push time:** 待 push
> **Author:** Mavis
> **Type:** docs

## 改了什么

用户在 R5/R6 硬性规则生效后第一次自检,问「主目录的 README 文档有同步更新吗？」—— 我发现 README.md 漏了 4 处:

### 修复内容

1. **文档导航表新增 3 行**:
   - `docs/handover/SESSION-CHECKLIST-2026-08-11.md` (5 步检查清单)
   - `docs/changelog/` (每次 push 的子 changelog 目录)
   - `docs/superpowers/README.md` (实施计划存档索引)

2. **硬性规则加 2 条**:
   - **R5**: 每次 push 前必写 `docs/changelog/YYYY-MM-DD-<topic>.md` 子文件 + 更新主索引
   - **R6**: 更新完必跑 link check + 同步关联文档（见 DEVELOPER-GUIDE § 13）

### 验证

- ✅ link check 全部通过（16 个 .md 链接全指向存在文件）
- ✅ README.md 现在引用 16 个 .md 文件,覆盖所有 docs/ 顶级目录

## 为什么

R5/R6 是 2026-08-12 docs refactor 刚加的硬性规则 (commit d3a7137),这次自检是规则首次实战应用,发现 README.md 没完全跟上 docs 重构。

**经验:** 写完一批文档后,根 README 容易遗漏 —— 因为它最后写、改动跨度大,引用很多。

## 影响范围

- **行为变化:** 无 (纯文档)
- **链接:** 新增 3 个链接目标
- **断链:** 无

## 关联 commit

- (本 changelog 子文件被 commit 时)
- commit 主题: `docs(readme): 同步 docs refactor 后漏的 4 处(R5/R6 自检发现)`

## 关联文档

| 文件 | 状态 |
|------|------|
| `README.md` | 改 — 加 3 行导航 + R5/R6 硬性规则 |
| `docs/CHANGELOG.md` | 改 — 主索引加本子文件一行 |
| `docs/changelog/2026-08-12-readme-sync-fix.md` | 新 — 本文件 |
| `docs/guides/DEVELOPER-GUIDE.md` | 不变 — R6 规则源 |
| `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` | 不变 — R5 规则源 |
