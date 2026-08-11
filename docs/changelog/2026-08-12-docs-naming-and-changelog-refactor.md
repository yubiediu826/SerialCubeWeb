# 2026-08-12 — 交接文档加时间命名 + CHANGELOG 主从结构 + 每次 push 必写 changelog

> **Commits:** (待 commit,见末尾)
> **Tags:** (无)
> **Push time:** 待 push
> **Author:** Mavis
> **Type:** docs + chore (硬性规则 +1)

## 改了什么

按用户 2026-08-12 新需求,在 2026-08-11 docs 重构基础上再 refactor:

### 1. 交接文档全部加时间后缀

**命名约定:** `<原名>-YYYY-MM-DD.md`

| 旧名 | 新名 |
|------|------|
| `docs/handover/PROJECT-HANDOVER-2026-08-11.md` | `docs/handover/PROJECT-HANDOVER-2026-08-11.md` |
| `docs/handover/release-v1.0.0-2026-08-11.md` | `docs/handover/release-v1.0.0-2026-08-11.md` |
| `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` | `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` |
| `docs/handover/SESSION-CHECKLIST-2026-08-11.md` | `docs/handover/SESSION-CHECKLIST-2026-08-11.md` |

**好处:**
- 一眼看出文档最后更新时间
- 多个版本可并列保留（不被覆盖）
- 时间序列追溯清晰

### 2. CHANGELOG 拆主从结构

**之前:** `docs/CHANGELOG.md` 单文件包含所有变更详情
**现在:**
- `docs/CHANGELOG.md` — **主索引**（只放路径指针,极简倒序列表）
- `docs/changelog/YYYY-MM-DD-<topic>.md` — **每次 push 写一个子文件**
- `docs/changelog/README.md` — 子目录说明 + 命名规范 + 模板

**子文件命名:** `<YYYY-MM-DD>-<topic-slug>.md`
- 例: `2026-08-11-v1.0.0-release.md` / `2026-08-11-docs-restructured.md` / `2026-08-12-docs-naming-and-changelog-refactor.md`

### 3. 新增硬性规则：每次 push 后必写 changelog 子文件

在 4 个文档里加 "硬性规则":

- `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` — § 硬性规则
- `docs/guides/DEVELOPER-GUIDE.md` — § 1 改代码标准流程 + § 12 踩坑
- `docs/guides/AGENT-START-HERE.md` — § 3 干活时的工作循环 + § 7 完成定义
- `docs/CHANGELOG.md` — § 维护规则

### 4. 新增自审计规则：更新完必检查关联文档同步

- 在 DEVELOPER-GUIDE 加 § 关联文档同步检查清单
- 在 AGENT-START-HERE 加 § 完工前同步检查

## 为什么

用户 2026-08-12 明确要求:
- "交接文档的命名应该带有时间"
- "每次编写交接文档都需要浏览整个工程避免遗漏"
- "变更日志应该一个主文件（带路径）加子文件带时间,这样方便查询"
- "每次 push 代码后编写对应变更日志"
- "更新好需要检查关联文档是否同步更新"

## 影响范围

- **行为变化:** 无（纯文档 + 工作流规则）
- **链接同步:** 10 个文件、50+ 处引用全部更新
- **工作流变更:** 5 步 SOP 增加"push 前必写 changelog 子文件"

## 关联 commit

- (本 changelog 子文件被 commit 时)
- commit 主题: `docs(changelog): 交接文档加时间 + changelog 主从结构 + 每次 push 必写`

## 关联文档（同时更新）

| 文件 | 更新内容 |
|------|----------|
| `README.md` (根) | 文档导航表改新文件名 |
| `docs/README.md` | 全文档索引改新文件名 |
| `docs/CHANGELOG.md` | 改为主索引,3 行子文件指针 |
| `docs/changelog/README.md` | 新建 — 子目录说明 |
| `docs/changelog/2026-08-11-v1.0.0-release.md` | 新建 — v1.0.0 release 详情 |
| `docs/changelog/2026-08-11-docs-restructured.md` | 新建 — docs 重构详情 |
| `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` | 重命名 + 硬性规则 +1 |
| `docs/handover/PROJECT-HANDOVER-2026-08-11.md` | 重命名 |
| `docs/handover/SESSION-CHECKLIST-2026-08-11.md` | 重命名 |
| `docs/handover/release-v1.0.0-2026-08-11.md` | 重命名 |
| `docs/guides/DEVELOPER-GUIDE.md` | 硬性规则 +1 + 关联同步清单 |
| `docs/guides/AGENT-START-HERE.md` | 硬性规则 +1 + 关联同步清单 |
| `docs/superpowers/README.md` | 引用改新文件名 |
| `docs/backup/BACKUP.md` | 引用改新文件名 |
