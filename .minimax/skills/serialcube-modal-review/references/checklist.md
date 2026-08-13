# SerialCube Modal Review — 详细 Checklist

> 配合 [SKILL.md](../SKILL.md) 使用。跑 6 步时**逐项打勾**。

## 0. 前置：风格基线比对

在跑 6 步前，先跑 `ui-ux-pro-max` Step 2d 拿基线：

```bash
# 4 个必查 domain（每个 5-10 条）
python .minimax/skills/ui-ux-pro-max/scripts/search.py "<modal 类型>" --domain style -n 8
python .minimax/skills/ui-ux-pro-max/scripts/search.py "<modal 类型>" --domain color -n 8
python .minimax/skills/ui-ux-pro-max/scripts/search.py "<modal 类型>" --domain typography -n 5
python .minimax/skills/ui-ux-pro-max/scripts/search.py "<modal 类型>" --domain icons -n 10
```

并 grep `SerialCube.html` 找同款元素的 CSS：

```bash
# 既有 modal header 样式
grep -n "modal-header" SerialCube.html
# 既有按钮高度
grep -nE "\.btn.*height|button.*height" SerialCube.html
# 既有 input 高度
grep -nE "input.*height|select.*height" SerialCube.html
```

输出：风格基线表（写进基线报告）。

---

## 1. 必要性（**这 UI 元素真需要吗？**）

- [ ] **功能不可替代？** 没有它用户用不了核心功能
- [ ] **不与现有元素功能重复？**
  - 例：左侧"连接设备 | 当前未连接"已经显示连接状态，**就不要**在 modal 顶部再放"未连接"
  - 例：主区"选择串口"按钮已经引导连接，**就不要**在别处再放"选择协议"按钮
- [ ] **删除它会破坏信息架构？** 删了用户找不到入口
- [ ] **不是装饰性冗余？** 不是为了"看起来更完整"而加

**v1.2.3 案例**: 协议配置 modal 顶部一行 "未激活 | 协议名 | 未连接 | 设置值 | 选择协议" 整体是**冗余**——
- "未激活" / "协议名" → 状态条已经在别处显示
- "未连接" → 跟左侧连接管理面板**重复**
- "选择协议" → 跟主区"选择串口"按钮**功能层级混乱**（一个选协议一个选串口，名字像）
- "设置值" → 未连接时没意义，应该连同下面"字节预览"一起**整个删除**

**判定**: ❌ 整行删掉，移到左侧或别处

---

## 2. 位置（**放哪里最合理？**）

- [ ] **跟同类元素在同一区域？**
  - 协议相关：配置中心 Tab
  - 连接相关：左侧设备连接管理
  - 命令相关：仪表盘
- [ ] **不跨区域耦合？** 不要把"协议"按钮放在"连接"区域
- [ ] **用户视线流顺畅？** 从主区到二级操作的路径最短
- [ ] **不重复出现？** 同功能不要在 N 个地方都有入口

**判定问题**:
- 同类元素在不同区域 → 统一位置
- 跨区域耦合 → 移到合适的区域
- 重复出现 → 保留主入口，删次要

---

## 3. 嵌套（**打开/关闭时怎么处理？**）

- [ ] **嵌套 modal 自动加 `.modal-dimmed`？**（v1.2.2 已实现）
  - 下层 modal: `filter: blur(3px); opacity: 0.5`
  - 栈顶 modal: 不 dim
  - 关闭时: 全部清 dim
- [ ] **不会重开同 modal 时自 dim？**（v1.2.2 已修 dedup）
  - openModal 顶部 dedup 同名
  - closeModal while 全删同名残留
- [ ] **z-index 正确？** 栈顶最高（一般 1000+）
- [ ] **Esc 键关闭栈顶？** 不是底层

**测试场景**:
- 打开 A → 打开 B（A 应该 dim）
- 关闭 B → A 应该 un-dim
- 打开 A → 关闭 A → 再打开 A（不能自 dim）

---

## 4. 标题（**header 一致性**）

- [ ] **用 `.modal-header-standard` 单行布局**（v1.2.1+ 已有）？
  - X 关闭按钮：右上
  - title：左上
  - 副标题/面包屑：title 右侧
  - 工具按钮（新建/导入）：header 旁
- [ ] **title 字号统一？** 一般 16-18px
- [ ] **title 颜色统一？** 用 token（不是 hardcode 颜色）
- [ ] **X 关闭按钮 32×32px？** click target 够
- [ ] **title 不被截断？** 预留足够宽度

**v1.2.2 教训**:
- 标题 selector 写错 (`#dh-new-command .modal-title` 找不到) → 改用 `getElementById('dh-new-cmd-modal-title')`
- 永远显示"新建命令"因为 mode 参数没传 → 加 `'edit'` 参数

---

## 5. 字段对齐（**表单元素一致性**）

- [ ] **input/select 统一 32px 高？**
  - 不一致会导致视觉乱（v1.2.2 教训: 下拉框比 input 高）
- [ ] **button 统一 28-32px 高？**
  - 主操作按钮 32px
  - 次操作按钮 28px
- [ ] **padding 统一？** 一般 6-10px
- [ ] **border-radius 统一？** 一般 4-6px
- [ ] **gap 统一？** 表单 row 之间 12-16px
- [ ] **label 在 input 上方？** 不要 placeholder-only（v1.2.2 教训）
- [ ] **错误信息在 input 下方？** 不是顶部
- [ ] **必填项有 * 标识？**

**v1.2.2 教训**:
- 新建命令 modal 下拉框比 input 高 → input/select 统一 `height: 32px`
- 命令列表按钮过近 → button `28×28` + `gap 6px`
- 命令列表灰底突兀 → 表格行用 row divider 不再灰底

---

## 6. 主题适配（**浅色 + 深色都验证**）

- [ ] **浅色主题**:
  - 主文字对比度 ≥ 4.5:1
  - 次文字对比度 ≥ 3:1
  - 边框/分隔线在浅色背景上可见
- [ ] **深色主题**:
  - 主文字对比度 ≥ 4.5:1
  - 次文字对比度 ≥ 3:1
  - 边框/分隔线在深色背景上**不**消失
- [ ] **state 一致**:
  - 浅色 hover/focus/disabled 跟深色同样清晰
  - 不要只在一种主题下定义
- [ ] **用 token 不是 hardcode**:
  - 用 `var(--text-primary)` 而不是 `#333`
  - 用 `var(--border-color)` 而不是 `#e0e0e0`
- [ ] **中文字体串行布局陷阱**:
  - flex 容器里**不要**直接放多个 inline 中文 text node（v1.2.2 教训: "基于" + dropdown 被拆字竖排）
  - 修法: 中文包独立 `<span>` + `white-space: nowrap + flex-shrink: 0`
- [ ] **截图比对**:
  - 浅色: `agent-browser screenshot <feature>-light.png`
  - 深色: `agent-browser screenshot <feature>-dark.png`
  - 视觉差异检查通过

---

## 跑完输出

写到 `docs/design/modal-review-<date>-<feature>.md`：

```markdown
# Modal Review — <feature> @ <date>

## 0. 风格基线表
| 元素 | 既有规范 | 新方案 | 一致? |
|---|---|---|---|

## 1. 必要性
- [✅/❌] ...

## 2. 位置
- [✅/❌] ...

## 3. 嵌套
- [✅/❌] ...

## 4. 标题
- [✅/❌] ...

## 5. 字段对齐
- [✅/❌] ...

## 6. 主题适配
- [✅/❌] ...

## 截图
- 浅色: screenshots/<feature>-light.png
- 深色: screenshots/<feature>-dark.png
- 嵌套: screenshots/<feature>-nested.png

## 决策
- [ ] ✅ 进编码
- [ ] ❌ 回到对应步骤重做
```

**没输出 = 未跑 = 违规**。
