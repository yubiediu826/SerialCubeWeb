# SerialCube 变更记录

> **本文件是变更日志的「主索引」**。**完整详情见 `docs/changelog/` 子目录**。
>
> **维护规则:**
> - **每次 push commit 到 main 前** 必在 [`docs/changelog/`](changelog/) 写一个 `YYYY-MM-DD-<topic>.md` 子文件
> - 本主文件**只放路径指针**,不重复内容
> - 倒序排列（最新在最上）

---

## 📑 子文件索引

### 2026-08-12

- [`changelog/2026-08-12-protocol-multi-command.md`](changelog/2026-08-12-protocol-multi-command.md) — v1.1.0 协议多命令 + 统一配置中心 5 tab + 漫游引导 + 9 kind (含 Custom) + Lucide 图标统一
- [`changelog/2026-08-12-readme-sync-fix.md`](changelog/2026-08-12-readme-sync-fix.md) — README.md 同步修复（R5/R6 自检发现 4 处遗漏：3 个文档导航 + 2 条硬性规则）
- [`changelog/2026-08-12-docs-naming-and-changelog-refactor.md`](changelog/2026-08-12-docs-naming-and-changelog-refactor.md) — 交接文档加时间命名 + CHANGELOG 主从结构 + 每次 push 必写 changelog

### 2026-08-11

- [`changelog/2026-08-11-v1.0.0-release.md`](changelog/2026-08-11-v1.0.0-release.md) — v1.0.0 首次正式发布（11 核心能力 + 5 CRC + 15 skill + GitHub Pages 部署）
- [`changelog/2026-08-11-docs-restructured.md`](changelog/2026-08-11-docs-restructured.md) — docs 目录首次重构（12 新文档 + 1 重写）

---

## 🔧 工作流集成

### 每次 push commit 前必做

1. 写 `docs/changelog/<YYYY-MM-DD>-<topic-slug>.md` 子文件
2. 在本主文件加一行索引
3. 同步更新引用本内容的其他文档
4. 跑 link check 验证
5. `git add` + 中文 commit
6. `ask_user` 确认 push
7. `git push origin main --tags`

### 发版额外做

- 写 `docs/handover/release-vX.Y.Z-YYYY-MM-DD.md` 详细 release notes
- 跑 `bump-version.ps1 -Level <patch|minor|major>`
- VERSION 三处同步（SerialCube.html const VERSION / HTML changelog 段 / Git tag）
- 更新 `docs/handover/PROJECT-HANDOVER-YYYY-MM-DD.md`（反映最新状态）

### 关联文档同步自检

每次更新完跑:
- [ ] 所有引用本文件的文档已更新链接
- [ ] 所有被本文件引用的文档存在
- [ ] `CHANGELOG.md` 主索引列出所有子文件
- [ ] 旧的失效链接全部修掉

---

## 🗂 历史 release notes

| 版本 | 发布日期 | 详细 notes |
|------|----------|------------|
| v1.0.0 | 2026-08-11 | [`handover/release-v1.0.0-2026-08-11.md`](handover/release-v1.0.0-2026-08-11.md) |

---

## 🔗 链接

- [`docs/changelog/README.md`](changelog/README.md) — 子目录说明 + 命名规范 + 模板
- [`docs/handover/PROJECT-HANDOVER-2026-08-11.md`](handover/PROJECT-HANDOVER-2026-08-11.md) — 项目主交接
- [`docs/handover/HANDOFF-QUICKSTART-2026-08-11.md`](handover/HANDOFF-QUICKSTART-2026-08-11.md) — 30 秒接手卡
- [`docs/README.md`](README.md) — 文档中心
- [`../README.md`](../README.md) — 根 README
