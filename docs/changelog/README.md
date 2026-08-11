# docs/changelog/ — 变更日志存档

> **本目录是 SerialCube 项目每次 push 后的"变更日志存档"**。
>
> **维护原则:** **每次 push commit 到 main 前**（无论大小）必写一个 `YYYY-MM-DD-<topic>.md` 子文件,记下这次 push 的内容。
>
> **主索引** 在 [`../CHANGELOG.md`](../CHANGELOG.md),只放路径指针,不重复内容。

---

## 目录结构

```
docs/changelog/
├── README.md                                  ← 你在这里
├── 2026-08-11-v1.0.0-release.md                ← v1.0.0 首次正式发布
├── 2026-08-11-docs-restructured.md            ← docs 目录首次重构(13 文档)
└── 2026-08-12-docs-naming-and-changelog-refactor.md  ← 交接文档加时间 + changelog 主从结构
```

---

## 命名规范

`<YYYY-MM-DD>-<topic-slug>.md`

- **日期:** 这次 push 的日期（ISO 8601,UTC+8 北京时间）
- **topic-slug:** kebab-case,简短描述这次改动主题
  - 例: `v1.0.0-release` / `docs-restructured` / `fix-uart-rx-buffer-overflow` / `feat-add-crc32` / `bump-version-1.0.1`

**禁止:**
- ❌ 多个子文件同名（用 topic-slug 区分）
- ❌ topic 用中文（保持 URL / 文件系统兼容）
- ❌ 跳过日期（必带）

---

## 子文件模板

```markdown
# <YYYY-MM-DD> — <主题一句话>

> **Commits:** <commit-sha-list> (例: `1a973ad`, `90b8bdf`)
> **Tags:** <tag-name> (可选,版本 tag)
> **Push time:** <HH:MM>
> **Author:** <author>
> **Type:** feat | fix | docs | chore | perf | refactor | test (多选)

## 改了什么

- ...
- ...

## 为什么

...

## 影响范围

- 行为变化: ...
- 文档同步: ...
- 部署影响: ...

## 关联 commit

- <sha> <commit-subject>
- ...
```

---

## 与其他文档的关系

| 关系 | 说明 |
|------|------|
| `../CHANGELOG.md` | **主索引**(只放路径指针,极简) |
| `../handover/release-vX.Y.Z-*.md` | **发版详细** release notes(每个版本一个) |
| `../handover/PROJECT-HANDOVER-*.md` | **项目级交接**(反映最新状态) |
| `../README.md` | **根 README**(面向 GitHub 访客) |
| `../../CHANGELOG.md` | **根目录 CHANGELOG** 根(本目录的父) |

---

## 工作流

```
1. 改完代码 / 文档
2. 跑 serialcube-e2e 6 场景(如果改了 SerialCube.html)
3. 写 docs/changelog/<日期>-<topic>.md 子文件(本次 push 内容)
4. 跑 docs/CHANGELOG.md 主索引(加一行链接到新子文件)
5. 同步更新关联文档(README / handover / guides)
6. git add + 中文 commit
7. ask_user 确认 push
8. git push origin main --tags
```

---

## 自我审计清单

每次 push 完跑一遍:

- [ ] 新子文件已写
- [ ] 主 CHANGELOG.md 已更新索引
- [ ] 引用新内容的文档都同步了
- [ ] 旧引用没断链
- [ ] commit message 中文,符合 conventional commits
- [ ] tag 打了(如果发版)
