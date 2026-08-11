# Changelog 段格式 (5 类)

SerialCube 的 changelog 在 `SerialCube.html` 的 `<div class="version-changelog">` 内, 每条 release 是一个 `<div class="version-release">`。本文档定义 5 类 `<li>` 条目的格式。

## 通用结构

```html
<div class="version-release">
  <strong>X.Y.Z 版本 · YY/M/D</strong>   <!-- YY/M/D 用 (Get-Date -Format 'yy/M/d') 自动生成 -->
  <ul>
    <li>类型: 简短说明 (≤ 30 字)</li>
    <li>类型: 简短说明 (≤ 30 字)</li>
    <!-- 1-N 个 li, 按重要性倒序: 重要修复在前, 文案调整在后 -->
  </ul>
</div>
```

- 段标题日期 = `yy/m/d` (无前导 0, 例: `26/8/11`)
- 段标题不加 emoji, 不加 `(hotfix)` 等后缀 (如需标注放 li 内)
- `<li>` 文本是用户能看懂的人话, 不是 commit message
- 同一次 bump 的多个 li 按 **重要性** 倒序 (破坏性 > 新增 > 修复 > 优化 > 文档)

## 5 类格式

### 1. 新增 (对应 bump-version.ps1 `-Type 新增`)

新功能 / 新 widget / 新协议模板 / 新弹窗。

```html
<li>新增: sparkline tooltip, 鼠标悬停显示精确数值。</li>
<li>新增: Modbus RTU 预设模板 (含 CRC16 校验)。</li>
<li>新增: 高对比度主题 (深色基础 + 加粗边框)。</li>
```

要点:
- 用 "新增: X, 副说明" 格式
- 副说明可以加 (X = 参数, Y = 行为)
- 避免 "新增: X 功能" (功能冗余)

### 2. 修复 (对应 `-Type 修复`) ⭐ 最常用

Bug 修复, 排第一是因为用户最关心"我之前踩的坑修了吗"。

```html
<li>修复: 仪表盘深色模式下卡片边框不明显, 跟浅色背景混在一起无法区分。</li>
<li>修复: 卡片详情弹窗 (图表 / 日志) 在深色模式下背景是硬编码白色, 切换 token。</li>
<li>修复: GitHub Pages 部署偶发卡 Queued 1.5h, 改用 ref + run_id 独立 concurrency group。</li>
```

要点:
- "修复: 现象, 原因 / 解决方案" 格式
- 现象要可观察 (用户在 UI 上能看到的)
- 原因 / 解决方案可省略, 但写上更专业
- 紧急修复加 `⚠️` 标注: `<li>修复: ⚠️ 紧急 - 串口断连后无法重连</li>`

### 3. 优化 (对应 `-Type 优化`)

性能 / 体验优化, 无功能变更。

```html
<li>优化: 图表重绘频率从 60fps 降到 30fps, 低端 CPU 帧率提升 40%。</li>
<li>优化: sparkline 数据采样从每 100ms 改为每 250ms, 内存占用减半。</li>
<li>优化: 通知历史分页加载, 避免一次渲染 1000+ 条卡顿。</li>
```

要点:
- "优化: 改动, 收益" 格式
- 收益要可量化 (X%, Xms, X KB)
- 避免 "优化: 性能" (太空)

### 4. 文档 (对应 `-Type 文档`)

文档 / 文案 / i18n 字符串 / 注释改动。

```html
<li>文档: README 加 "如何连接虚拟串口" 章节。</li>
<li>文档: 设置面板"刷新"按钮文案改成"重新连接", 更准确。</li>
<li>文档: 协议编辑器 tooltip 加 "支持正则反向引用" 提示。</li>
```

要点:
- "文档: 改了什么文档 / 文案" 格式
- 文案调整也归这里, 不算修复
- 加 i18n 字符串也算

### 5. 破坏性 (对应 `-Type 破坏性`) 🚨

API / 字段 / 协议删除或重命名, **必须** bump major。

```html
<li>破坏性: 协议模板 kind 从 uart 改为 serial, 旧 preset 需手动迁移。</li>
<li>破坏性: 移除 parseHexLine() 公共方法, 用 parseHexStream() 替代。</li>
<li>破坏性: localStorage 预设改用 IndexedDB, 首次启动自动迁移。</li>
```

要点:
- **必须**说明迁移路径 (用户怎么从旧版升级)
- 单独成段, 不要跟新增 / 修复混
- commit message 也要用 `BREAKING CHANGE:` 前缀

## 完整示例 (单段)

```html
<div class="version-release">
  <strong>1.0.1 版本 · 26/8/11</strong>
  <ul>
    <li>修复: ⚠️ 紧急 - 串口断连后无法重连, 需手动刷新页面。</li>
    <li>修复: 仪表盘深色模式下卡片边框不明显, 跟浅色背景混在一起无法区分。</li>
    <li>修复: 设置面板"主题"下拉按钮高度比配置按钮高出一截, 跟配置按钮对齐 (44px → 28px)。</li>
    <li>优化: 图表重绘频率从 60fps 降到 30fps, 低端 CPU 帧率提升 40%。</li>
    <li>文档: README 加 "如何连接虚拟串口" 章节。</li>
  </ul>
</div>
```

## 反模式

- ❌ **commit message 当 changelog**: `fix: bump version` — 用户看不懂
- ❌ **空泛描述**: `修复: 修了一些 bug` — 没信息量
- ❌ **过长描述**: `修复: 仪表盘在 4K 显示器下深色模式卡片边框颜色因为 CSS 变量没继承...` — 超过 30 字就拆
- ❌ **技术黑话**: `修复: CSS variable inheritance regression` — 用户不是开发者
- ❌ **多段合一个**: 5 个 patch 攒一个 release, 失去粒度
- ❌ **emoji 滥用**: 每条都加 🎉 / ✨ / 🚀 — 干扰阅读

## 长度参考

| 改动规模 | li 数量 | 示例 |
|---------|---------|------|
| hotfix | 1-2 | 1.0.0 → 1.0.1 |
| 普通 patch | 3-5 | 1.0.0 → 1.0.1 |
| minor | 5-8 | 1.0.0 → 1.1.0 |
| major | 5-10 + 迁移说明 | 1.x.x → 2.0.0 |
