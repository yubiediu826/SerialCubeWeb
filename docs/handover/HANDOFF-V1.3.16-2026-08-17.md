# HANDOFF-V1.3.16-2026-08-17 — 新建/编辑命令 modal 数据字段优化

> **版本**: v1.3.16 (基于 v1.3.15, patch bump)
> **日期**: 2026-08-17
> **作者**: Mavis (M3) + 用户 M.*
> **关联 modal-review**: `docs/design/modal-review-2026-08-17-new-edit-cmd.md`
> **子 changelog**: `docs/changelog/2026-08-17-v1.3.16-new-edit-cmd-datafield-grouping.md`
> **预览**: `.tmp/review/preview-new-edit-cmd.html` + `preview-new-edit-cmd-full.png`

---

## 1. TL;DR (30 秒看完)

新建 + 编辑命令 modal 数据字段 8 项优化 (P0×3 + P1×5) 一波完成. 跟 v1.3.15 差异: 49 字段表格按方向分组 (RX 折叠/TX 展开), 方向从 select 改为按钮组 (token 化颜色), 仅 bitset 显示位定义, 3 模板按钮, cmd.direction 联动, 行高 36px, 删除按钮 32px.

| 改动 | 描述 | 行号 |
|------|------|------|
| **CSS** | 重写 `.wiz-field-table` (行高 36px, 宽 120/140/110) | line 7384+ |
| **CSS** | 新增 `.new-cmd-df-dir-group` + 4 dir-btn (TX 蓝/RX 绿/TX+RX 紫/— 灰) | line 7390+ |
| **CSS** | 新增 `.df-group` + sticky thead + 折叠 | line 7400+ |
| **CSS** | 新增 `.df-add-bar` 3 模板按钮 + 重置默认值为 0 | line 7414+ |
| **CSS** | 新增 `.bit-na` "u8 无位定义" 灰字 | line 7408+ |
| **CSS** | 新增 `.wiz-field-del` 32×32 + 垃圾桶 SVG | line 7386 |
| **Token** | 浅/暗主题加 `--dir-tx-fg` `--dir-rx-fg` `--dir-both-fg` `--dir-none-fg` | line 119+ / 174 / 230 |
| **JS** | `_renderNewCmdDataFields` 整段重写: 按方向分组 + bitset 类型判断 + dir 按钮组 + 32px del | line 22984+ |
| **JS** | `bind('dh-new-cmd-add-field', ...)` 拆 3 模板 + cmd.direction 联动 + _userDirSet 标记 | line 23562+ |
| **JS** | "批量默认值" → "重置默认值为 0" 真实实现 + toast | line 23170+ |
| **HTML** | 4 按钮: + u8 字段 / + u16 字段 / + bitset 字段 / 重置默认值为 0 | line 8499+ |

## 2. 设计决策 (跟用户的 4 轮迭代)

### 2.1 第一轮: 大范围评审 (15 项 P0/P1/P2)
- 用户起初要求"评审协议配置 UI", 跑 ui-ux-pro-max + taste, 产出 15 项优化建议
- 范围过大 (协议/命令/卡片/告警/导入 5 大模块), 评审报告 proposal-2026-08-17-protocol-config-ui-review.md

### 2.2 第二轮: 用户拒绝, 聚焦 2 modal
- 用户: "当前优化方案不接受, 先优化新建命令和编辑命令的弹窗界面"
- 收缩范围到 dh-new-command-modal (新建 + 编辑共用) + dh-edit-cmd-modal
- 8 项核心问题 (3 P0 真问题 + 5 P1 改进)

### 2.3 第三轮: 用户要求"完整界面"
- 用户实测发现: 第一次 preview 仍有 max-height 限制, 看不到 49 字段全貌
- 修复: 移除我额外加的 max-height, 让 modal 用 SerialCube 默认 90vh, mock 展示完整 49 字段 (按方向分组, 都展开用 "..." 表示更多)
- preview-new-edit-cmd.html 完整截图: `preview-new-edit-cmd-full.png`

### 2.4 第四轮: 用户拍板 3 决策
- 范围: 8 项 v1.3.16 一次到位 (推荐)
- 分组: RX 默认折叠, TX 默认展开 (推荐, 调试 cmd 时关注"我发什么")
- 方向联动: 未 override 的 follow, 改过的保留 (推荐, 加 `_userDirSet` per-field 标记)

### 2.5 最终 v1.3.16 (落地版)
- **按方向分组**: 3 个 df-group (TX/RX/BOTH), 各自 sticky thead, sticky thead 让 scroll 时表头不丢
- **仅 bitset 显示位定义**: u8/u16/i8/i16/f32/f64/bytes 字段显示 "u8 无位定义" 灰字, 不再误导用户加位
- **方向按钮组**: 4 个 dir-btn (TX/RX/TX+RX/—), active 状态有背景色, token 化 (浅+深主题)
- **行高 36px**: 基线 36px, input/select 宽 80→140/110, 32px del 按钮
- **3 模板按钮**: + u8 / + u16 / + bitset, 替代空字段; 80% 场景一键添加
- **cmd.direction 联动**: 新增字段 dir 自动 follow cmd.direction, 用户 override 后 (_userDirSet=true) 脱离联动
- **重置默认值为 0**: 真实实现 (df.default='0'), 替代原 prompt 流程

## 3. 实施过程 (10 步)

```
1. 跑 ui-ux-pro-max 4 domain (style/colors/typography/icons) 拿基线
2. 截 v1.3.15 实际 20 张 modal 截图 (5 modal × 4 tab)
3. 写 modal-review 基线报告 (6 步 guard)
4. 做 preview HTML mock (8 项优化演示, 完整 49 字段无 max-height 截断)
5. 跟用户 4 轮迭代确认 (范围/分组/方向联动)
6. bump-version v1.3.15 → v1.3.16 (wrapper.ps1 + SC_AUTO_CONFIRM='y')
7. CSS + token 改动 (3 主题块加 --dir-tx-fg/--dir-rx-fg/--dir-both-fg/--dir-none-fg)
8. JS 改动 (_renderNewCmdDataFields 整段重写 + addField handler 拆 3 模板 + cmd.direction 联动 + bulk-default 重置)
9. agent-browser 实装验证 (3 字段 / 49 字段 / 暗+浅 / cmd.direction 联动 / override 保留)
10. check-readme-sync 4/4 + commit 2 个 + ASK push + push origin main
```

## 4. 验证清单 (已过)

- ✅ 3 字段新建: 1 group (RX 折叠), 12 dir btns (3 字段 × 4 按钮), 2 bit-na (u8+u16), 1 bit-add (bitset), 4 add-bar btns
- ✅ 49 字段编辑 (cmd.direction=both): 2 group (TX 23 字段 46 字节 + RX 26 字段 59 字节), 数据字段 105 字节 (49 字段)
- ✅ cmd.direction RX→TX 联动: 4 字段未 override 自动 follow TX
- ✅ override 测试: field_1 手动 RX (_userDirSet=true), 改 cmd=both 后 field_1 保持 RX, 其他 3 字段 both
- ✅ 默认折叠状态 (TX 展开 + RX 折叠): 90vh 562px 内, 49 字段无 scrollbar
- ✅ 浅色主题: token 化颜色正确切换 (TX 蓝 / RX 绿 / TX+RX 紫)
- ✅ 帧预览 7 段字节级 (header/addr/cmd/length/data/crc/tail) 实时联动
- ✅ 重置默认值为 0: 1 click → 所有字段 default='0' + toast "已重置"
- ✅ check-readme-sync: 4 项全过
- ✅ 协议守门: docs/protocol/ + docs/reference/ 0 文件入 commit
- ✅ push origin main: a8952cf..c469641 main -> main 成功

## 5. 跟 v1.3.15 关系

v1.3.15 (1 commit a8952cf): 编辑命令 modal 数据字段方向列从只读 span 改为下拉 (TX/RX/TX+RX/—). 但保留旧 select 颜色 hardcoded #d97706 (警告色, 错配).

v1.3.16 (2 commits c469641+4f8fd92):
- 方向列从 select 升级为按钮组 (更直观, 颜色可视觉表达)
- 颜色 token 化 (复用 v1.3.12 footer-direction token, 浅+深主题双适配)
- 49 字段按方向分组 (RX 折叠/TX 展开, scroll 5-6 次 → 1 次)
- 仅 bitset 显示位定义 (u8/u16 字段不再误导显示 "+ 添加位")

## 6. 关联文档

- modal-review 基线报告: `docs/design/modal-review-2026-08-17-new-edit-cmd.md`
- 子 changelog: `docs/changelog/2026-08-17-v1.3.16-new-edit-cmd-datafield-grouping.md`
- PROJECT-HANDOVER 当前版本: v1.3.16 同步 (line 顶部 "当前版本" + 概览 "当前版本")
- README 当前版本: v1.3.16 同步 (line 1)
- docs/README 当前版本: v1.3.16 同步 + 最近 release 加 v1.3.16
- docs/CHANGELOG.md: v1.3.16 加在子文件索引 + 历史 release 表
- preview HTML: `.tmp/review/preview-new-edit-cmd.html` (45KB 单 HTML)
- preview 截图: `.tmp/review/preview-new-edit-cmd-full.png` (完整 49 字段)
- 实装截图: `.tmp/mockups/v1316-new-cmd-3fields.png` (3 字段) + `v1316-edit-cmd-49fields.png` (49 字段)

## 7. 推送记录

- 本地 2 commit: `4f8fd92` (docs) + `c469641` (feat)
- 远程: `a8952cf..c469641 main -> main`
- 推前 ASK USER 确认 ✓ (per user memory R2)
- 绕开 127.0.0.1:7897 代理: `git -c http.proxy= -c https.proxy= push origin main`
- 部署验证: cron `check-gh-pages-v1.3.16` (5 分钟后跑, 验证后自动删)

## 8. 下次接手提示

- 8 项 P0/P1/P2 优化已实装, 后续如再优化 modal, 优先看:
  - 帧预览交互 (hover 单字节高亮 / 复制单字节)
  - 字段类型 i8/f32 验证 (目前只测了 u8/u16/bitset)
  - 字段方向快捷键 (TX/RX/BOTH 按钮加 1/2/3 数字键)
  - 位定义复制粘贴 (跨字段复制位)
- v1.3.12 颜色 token (type-badge/footer-direction) 在 v1.3.16 复用 + 扩展, 跨 modal 统一
- 49 字段按方向分组: 如用户反馈 RX 也常用, 可改为"上次状态记住" (localStorage, 10 行代码)
