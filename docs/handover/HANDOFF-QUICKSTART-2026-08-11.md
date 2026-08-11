# SerialCube 30 秒快速接手卡

> **这是每个新 agent / 新窗口第一份必读文档。** 30 秒读完,马上知道「这是什么、现在什么状态、下一步怎么走」。

---

## 🚀 30 秒读完这一段就够开始干活了

**项目:** 单 HTML 文件的 Web 串口调试工具（BMS / EMS / PCS 协议调试方向）
**主文件:** `SerialCube.html`（942KB / 21,168 行,所有代码内嵌）
**当前版本:** `v1.0.0`（`SerialCube.html const VERSION = '1.0.0'`）
**在线访问:** <https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html>
**代码仓库:** <https://github.com/yubiediu826/SerialCubeWeb>

**改代码 5 步:**
1. 跑 `.minimax/skills/version-management/scripts/bump-version.ps1 -Level <patch|minor|major>`（version-management R1 硬性规则）
2. 改 `SerialCube.html`
3. 用 `agent-browser` 跑端到端验证（`.minimax/skills/serialcube-e2e/` 6 场景）
4. 中文 commit（`<type>(<scope>): <中文 subject>`）
5. **push 前** 走 `ask_user` 拿到用户确认（version-management R2 硬性规则,避免 force push 误操作）

**AI 工作流总入口:** [`.minimax/skills/README.md`](../../.minimax/skills/README.md)（15 skill,11 阶段 SOP）

---

## 📌 5 条硬性规则（不可破）

| # | 规则 | 原因 | 违反后果 |
|---|------|------|----------|
| 1 | **Commit message 中文** | 用户硬性要求 | PR 不被接受 |
| 2 | **Push 前 ask_user** | 不可逆操作 | 误推到 main / force push 灾难 |
| 3 | **VERSION 三处同步** | `SerialCube.html const VERSION` / HTML changelog 段 / Git tag | 版本号混乱 |
| 4 | **改 SerialCube.html 前跑 bump-version** | 自动同步 VERSION + changelog 段 | 漏 changelog / 漏 tag |
| 5 | **每次 push 前必写 changelog 子文件** | `docs/changelog/YYYY-MM-DD-<topic>.md` + 更新主索引 [`CHANGELOG.md`](../CHANGELOG.md) | 变更追溯断裂 |

---

## 🗂 关键路径速查

| 找什么 | 去哪里 |
|--------|--------|
| 完整项目交接 | [`PROJECT-HANDOVER-2026-08-11.md`](PROJECT-HANDOVER-2026-08-11.md) |
| v1.0.0 发布说明 | [`release-v1.0.0-2026-08-11.md`](release-v1.0.0-2026-08-11.md) |
| 5 步接手检查清单 | [`SESSION-CHECKLIST-2026-08-11.md`](SESSION-CHECKLIST-2026-08-11.md) |
| 工具怎么用（用户视角） | [`../guides/USER-GUIDE.md`](../guides/USER-GUIDE.md) |
| 改代码 / 部署 SOP | [`../guides/DEVELOPER-GUIDE.md`](../guides/DEVELOPER-GUIDE.md) |
| Agent 接手标准动作 | [`../guides/AGENT-START-HERE.md`](../guides/AGENT-START-HERE.md) |
| SerialCube.html 内部结构 | [`../reference/ARCHITECTURE.md`](../reference/ARCHITECTURE.md) |
| 5 种 CRC 速查 | [`../reference/CRC-REFERENCE.md`](../reference/CRC-REFERENCE.md) |
| 协议模板速查 | [`../reference/PROTOCOL-TEMPLATES.md`](../reference/PROTOCOL-TEMPLATES.md) |
| 本地备份策略 | [`../backup/BACKUP.md`](../backup/BACKUP.md) |
| 完整文档地图 | [`../README.md`](../README.md) |
| AI 工作流总入口 | [`.minimax/skills/README.md`](../../.minimax/skills/README.md) |
| 变更记录 | [`../CHANGELOG.md`](../CHANGELOG.md) |

---

## 🛠 5 个最常用命令

```powershell
# 1. 改 SerialCube.html 前必跑
.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level patch

# 2. 状态
git status
git log --oneline -20

# 3. 提交（中文）
git add <files>
git commit -m "feat(scope): 中文描述改动"

# 4. 推送（⚠️ ASK USER 确认后）
git push origin main
git push origin main --tags    # 含 tag

# 5. 浏览器调试（替代 in-app 内置 Browser）
agent-browser open <url>
agent-browser snapshot -i --json
agent-browser click @e3
```

---

## ⚠️ 项目级约束

- **单 HTML 文件维护** — 不拆,按文件 > 800KB 时 gzip 后仍 < 200KB 评估
- **Web Serial 仅 Chromium** — Safari / Firefox / 移动端不支持（文档明说）
- **PowerShell 5.1 兼容** — 不用 PowerShell 7 特性
- **不用 Remove-Item** — safety policy,用回收站 API
- **代理** — git 走 `http://127.0.0.1:7897`（已设 `git config --global http.proxy`）

---

## 🚦 怎么判断"现在该不该动手"

| 用户说 | 怎么走 |
|--------|--------|
| 「在 SerialCube 里加 / 改 / 调 X」 | 激活 `serialcube-workflow` skill → 5 问决策树 |
| 「设计新组件 / 改行为」 | 走 `brainstorming` 9 步 |
| 「拷问 / 追问 / 这需求清楚吗」 | 走 `grill-me` |
| 「跑一下 / 验证没改坏」 | 走 `serialcube-e2e` 6 场景 |
| 「部署 / 上线」 | 走 `deploy-checklist` 5 件事 |
| 「commit / push / bump」 | 走 `version-management` |
| 「打开网页 / 调试 SerialCube」 | 走 `agent-browser` |

完整速查表见 [`.minimax/skills/README.md`](../../.minimax/skills/README.md) § 触发路由速查表。

---

## ❌ 别做的事

- ❌ 跳过 `bump-version.ps1` 直接改 `SerialCube.html`
- ❌ 跳过 `serialcube-e2e` 验证（942KB 单文件改一处可能破其他）
- ❌ 跳过 `deploy-checklist` 直接 push
- ❌ push 前不问用户（force push 误操作不可逆）
- ❌ 用 in-app 内置 Browser 调 SerialCube（token 消耗大 10x,selector 脆弱）
- ❌ 在 docs/ 之外乱建文档（按 `docs/README.md` 的角色 / 时间预算分层）
- ❌ 改 docs 不同步 CHANGELOG.md

---

## ✅ 第一件事该做什么

1. **读完本文件**（30 秒,你现在在做）
2. **激活 `using-superpowers` skill**（自动发现其他 skill）
3. **5 步检查清单**: [`SESSION-CHECKLIST-2026-08-11.md`](SESSION-CHECKLIST-2026-08-11.md)
4. 干活去吧 🚀
