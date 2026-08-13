# Modal Review — 系统菜单 主题/配置风格统一 @ 2026-08-13

> **触发**: 用户"修改UI样式"前缀 + 截图反馈"主题和配置样式不统一，一个明显框看着变扭"
> **严重度**: 🔴 累计同类 UI bug 已 ≥ 3（modal 结构 + 协议条 + 系统菜单），按 Q3 强制 design review，不直接 hotfix

## 1. 必要性

- [✅] "主题" 行: 浅色/深色/跟随便主题切换 — 功能价值 ✓
- [✅] "配置" 行: 复制/粘贴/清空配置操作 — 功能价值 ✓
- [❌] **`.menu-config-line` 容器的浅蓝紫背景 + 10px 圆角** — 把主题/配置都圈成"框"，反而**强化**了风格冲突的违和感

## 2. 位置

- [✅] 系统菜单右上角 — 位置合理
- [✅] 4 个 section 顺序: 关于 / 主题 / 配置 / 链接 — 信息架构清晰

## 3. 嵌套

N/A（菜单是浮层，不是 modal 嵌套）

## 4. 标题

- [✅] "主题" / "配置" label — 清晰
- [⚠️] label 在控件**左边** (line 7474, 7491) — 跟其他菜单行（弹窗位置、Pair Trigger）一致

## 5. 字段对齐 — ⚠️ 核心问题

| 元素 | 主题行 (line 7472-7489) | 配置行 (line 7490-7495) | 一致? |
|---|---|---|---|
| 容器 | `.menu-config-line` (背景 rgba 蓝紫 0.06, 圆角 10px) | 同 | ✅ |
| label | "主题:" | "配置：" | ✅ |
| 控件类型 | **segmented** (`.theme-seg` 包裹 + 3 button 紧贴) | **3 独立 button** (gap 5px) | ❌ |
| button 高度 | min-height 24px (theme-seg button) | min-height 28px (menu-config-line button) | ❌ |
| button border | 无 (外层 .theme-seg 统一 border) | 每个 button 1px border | ❌ |
| 视觉感 | 1 个连体 segmented | 3 个独立 chip | ❌ |

**问题**: 同样的框 + 同样的 label 位置 + 不同的控件类型 — 用户期望"同类行为"但拿到的是"不同 UI"

## 6. 主题适配

- [✅] 浅色: 浅蓝紫背景对比可读
- [✅] 深色: rgba 蓝紫半透明在深色背景下应该也 OK（待验）
- [⚠️] theme-seg active 态: `var(--bg-panel-strong)` — 浅色下是白色，active 态高亮清晰

## 截图

- 用户截图: 浅色主题下系统菜单展开 — 主题 + 配置行有明显浅蓝紫背景框

## 改法

### 方案 A: 删 .menu-config-line 背景（最小修复）

只删 `line 1108: background: rgba(86, 114, 205, 0.06);`

**优点**: 1 行改动，"框"感消失，主题/配置直接平铺
**缺点**: 主题 segmented 和配置独立 button 风格**仍然不同** — 但没了"框"对比，违和感降低

### 方案 B: 拆 section 加 divider

1. 删 .menu-config-line 背景
2. 主题和配置之间加 divider (`border-bottom: 1px solid var(--border);`)

**优点**: 视觉分组清晰，主题/配置各成一组
**缺点**: 多 1 个 divider 元素

### 方案 C: 统一为独立 button 风格

1. 删 .menu-config-line 背景
2. 主题行改 3 个独立 button（去掉 .theme-seg 容器）
3. 配置行保持 3 独立 button

**优点**: 控件风格完全一致
**缺点**: 主题 segmented 的"互斥"视觉感丢失（用户看不到"当前选的是深色"）
**不推荐**: 主题 segmented 是 v1.1.1 设计的，破坏行为可发现性

### 方案 D (我推荐): 方案 A + 主题 button 高度对齐到 28px

1. 删 .menu-config-line 背景（消除"框"）
2. .theme-seg button min-height 从 24px → 28px，跟 .menu-config-line button 一致

**优点**: 
- "框"消失，违和感主要来源消除
- 控件高度统一（即使类型不同，至少尺寸对齐）
- 主题 segmented 保留（互斥视觉感保留）
- 改动最小（2 行 CSS）

## 决策

- [ ] 用户选方案 → 改 → agent-browser 验证 → commit
- [ ] 否 → 回到 6 步讨论
