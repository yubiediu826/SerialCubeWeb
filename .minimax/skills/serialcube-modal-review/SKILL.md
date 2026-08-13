---
name: serialcube-modal-review
description: SerialCube 新建/大改 modal/页面 6 步自查 guard。**当用户说「新建 modal / 新建组件 / 新建页面内段 / 大改 modal 布局 / 改 modal header / 加新组件 / 改 UI 风格 / UI 一致性修复」时必跑**。6 步覆盖：① 必要性 ② 位置 ③ 嵌套 ④ 标题 ⑤ 字段对齐 ⑥ 主题适配。任何一步 ❌ 就不进编码。
---

# SerialCube Modal Review — 6 步 Guard

> **目的**: v1.2.2 教训——6 个 hotfix 修 10 个 UI bug，本质是缺 design guard。本 skill 是**新建/大改 modal 提交前必跑**的 6 步自查。
>
> **触发**: `serialcube-workflow` Q2 判定为「**大改**」时，**或**累计同类 UI bug ≥ 3 个时。

## 6 步总览

| # | 步骤 | 关键问题 | 失败动作 |
|---|---|---|---|
| 1 | **必要性** | 这 UI 元素真的需要吗？删除它会怎样？ | 删 / 合并 / 隐藏 |
| 2 | **位置** | 放在哪里最合理？跟同功能元素是否重复？ | 移动 / 合并 / 删除重复 |
| 3 | **嵌套** | 嵌套打开时怎么处理？栈顶元素如何高亮？ | 加 modal-dimmed / 调整 z-index |
| 4 | **标题** | title / 副标题 / X 关闭按钮位置统一？ | 套 `.modal-header-standard` |
| 5 | **字段对齐** | 表单元素高度/padding/gap 跟既有同款是否一致？ | 用统一 token（input 32px / button 28-32px）|
| 6 | **主题适配** | 浅色 + 深色 都验证过？对比度够？ | 调 token / 加主题 CSS 变量 |

**任何一步 ❌ = 不进编码**。改完进 e2e 验证。

## 详细 checklist

每一步的完整检查项见 [references/checklist.md](./references/checklist.md)。

## 6 步配合其他 skill

```
[1] 必要性 → brainstorm (9 步)  +  ui-ux-pro-max (Step 2d 风格基线)
[2] 位置   → 读 SerialCube.html 同类元素 (grep)
[3] 嵌套   → 检查 .modal / .modal-dimmed 现状
[4] 标题   → 套 .modal-header-standard 单行布局 (v1.2.1+ 已有)
[5] 字段   → design-system token (32px input / 28-32px button / gap 6-8px)
[6] 主题   → 浅色 + 深色 都跑 agent-browser 截图比对
```

## 输出格式

跑完 6 步输出一份**基线报告**，写到 `docs/design/modal-review-<date>-<feature>.md`：

```markdown
# Modal Review — <feature> @ <date>

## 6 步结果

| # | 步骤 | 结果 | 备注 |
|---|---|---|---|
| 1 | 必要性 | ✅ / ❌ | 原因 |
| 2 | 位置 | ✅ / ❌ | 原因 |
| 3 | 嵌套 | ✅ / ❌ | 原因 |
| 4 | 标题 | ✅ / ❌ | 原因 |
| 5 | 字段 | ✅ / ❌ | 原因 |
| 6 | 主题 | ✅ / ❌ | 原因 |

## 风格基线表（必填）

| 元素 | 既有规范 | 新方案 | 一致? |
|---|---|---|---|
| Modal header | 56px, X 右上, title 左上 | ... | ✅/❌ |
| 按钮高度 | 32px | ... | ✅/❌ |
| Input 高度 | 32px | ... | ✅/❌ |
| Section 间距 | 16px | ... | ✅/❌ |
| ... | ... | ... | ... |

## 截图（必填）

- 浅色: `screenshots/<feature>-light.png`
- 深色: `screenshots/<feature>-dark.png`
- 嵌套场景: `screenshots/<feature>-nested.png`

## 决策

- [ ] ✅ 6 步全过，基线表一致，截图正常 → 进编码
- [ ] ❌ 任一步失败 → 回到对应步骤重做
```

**没有基线报告 = 未跑 modal-review**。serialcube-workflow 的 verification-before-completion 会卡这一步。

## 红线

- 🚨 **不跑这个 skill 就改 modal** = 违规
- 🚨 **跳过任何一步** = 违规
- 🚨 **基线表有空项** = 违规
- 🚨 **没截图** = 违规

## 跟其他 skill 的关系

| 上游 | 关系 |
|---|---|
| `serialcube-workflow` | Q2=大改时强制调用本 skill |
| `brainstorming` | [1] 必要性 阶段配合产出 spec |
| `ui-ux-pro-max` | [1] 阶段跑 Step 2d 风格基线 |

| 下游 | 关系 |
|---|---|
| `verification-before-completion` | 验证基线报告存在 + 6 步全过 |
| `serialcube-e2e` | 验证 modal 在 6 场景下表现正常 |
| `agent-browser` | 截图 + 主题切换验证 |
