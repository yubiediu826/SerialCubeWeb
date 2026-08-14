# v1.4.0 回滚 followup — 根 README 精简 + HANDOVER 文档

**日期**: 2026-08-14
**前序**: fc81013 v1.4.0 回滚清理 (本 commit 是 fc81013 changelog 描述的"清理项"实际交付物)
**触发**: fc81013 changelog 列出本次清理项, 实际执行时发现:
- 根 README 15.8KB 干 4 件事, 跟 docs/ 重复, 跟"项目介绍"定位不符
- 需要一份完整 session 交接, 给下个 agent 看今天做了什么决策

---

## 改动

| 项 | 操作 | 大小 |
|---|---|---|
| 根 `README.md` | 重写 (15.8KB → 4.3KB, −73%) | 砍掉 5 段版本历史 + 开发工具表 + 24 行文档导航表 + 6 问决策树 + 7 条硬性规则. 根 README 只做项目介绍, 技术细节归 docs/ |
| `docs/handover/HANDOFF-2026-08-14-V1.4-ROLLBACK-AND-MAINTENANCE.md` | 新建 (12.5KB) | 完整 session 交接, 12 章节, 含 6 个关键决策 why + 5 个文档 backlog 清单 + 8 条经验 |

## 不在本 commit 范围 (留 backlog)

- `docs/handover/HANDOFF-QUICKSTART-2026-08-11.md` 当前版本字段过时 (写 v1.1.0, 实际 v1.3.1.1)
- `docs/handover/PROJECT-HANDOVER-2026-08-11.md` 内容过时 (没同步 v1.2~v1.3)
- `docs/README.md` 最新版本字段过时 (写 v1.3.1, 实际 v1.3.1.1)
- `docs/CHANGELOG.md` 主索引没 v1.3.1.1 段

下次顺手补, 1 commit 可搞定 (QUICKSTART + PROJECT-HANDOVER + docs/README + CHANGELOG.md 各加 1-2 行).

## 验证

- `git diff --stat`: README.md 43 insertions / 174 deletions
- 新 HANDOVER 12.5KB / 264 行 / 12 章节
- 本 commit 跟 fc81013 配套, 完整覆盖"v1.4.0 回滚 + 维护整理"事件
