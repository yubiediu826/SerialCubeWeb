# 版本升级策略 (major / minor / patch)

判定一次代码改动应该 bump 哪个 level, 是发版前最容易出错的一步。本文档给 SerialCube 项目专属的判断规则 + 决策树。

## 速查表

| 改动类型 | Level | 例子 |
|---------|-------|------|
| 协议层架构调整 (parser / framer 重写) | **major** | 协议模板从 JSON 改成 YAML 解析 |
| 删 API / 删字段 / 删协议模板 | **major** | 移除 `parseHexLine()` |
| 协议模板 kind 重命名 | **major** | `kind: "uart"` → `kind: "serial"` |
| 引入新的存储格式 / 文件 schema | **major** | 预设从 localStorage 改 IndexedDB |
| 新增 widget / 新模块 | **minor** | 加 sparkline tooltip 模块 |
| 新协议模板 | **minor** | 新增 Modbus RTU preset |
| 新 e2e 场景 | **minor** | 6 场景扩成 7 场景 |
| 新弹窗 / 新通知通道 | **minor** | 通知历史增加导出按钮 |
| 主题新增 (第三种) | **minor** | 加高对比度模式 |
| bug 修复 | **patch** | 仪表盘边框在深色下看不见 |
| 文案 / 标签改字 | **patch** | "刷新" → "重新连接" |
| 样式 token 调整 | **patch** | 背景从 `#fff` 改成 token |
| 性能优化 (无 API 变更) | **patch** | 减少 sparkline 重绘 |
| 单行代码改动 | **patch** | typo 修字 |
| 部署配置 / CI 调整 | **patch** | GitHub Actions 加 retry |

## 决策树 (5 问)

回答以下 5 个问题, 按顺序判定 level:

### Q1: 改动是否破坏向后兼容?

- **是** → **major** (X+1.0.0)
  - 协议层重写, 旧协议文件无法被新版本读取
  - 删除了用户已用的 API / 字段 / 模板
  - kind 命名改了, 用户旧 preset 加载报错
  - 引入新 schema 但不兼容旧 schema
- **否** → 进入 Q2

### Q2: 改动是否新增了用户可见的功能 / 模板 / 模块?

- **是** → **minor** (X.Y+1.0)
  - 新增 widget (新交互模式)
  - 新增协议模板 (新解析规则)
  - 新增弹窗 / 新增通知通道
  - 新增 e2e 场景
  - 新增主题 (第三种主题)
- **否** → 进入 Q3

### Q3: 改动是否只是修复 bug / 调样式 / 改文案 / 性能优化?

- **是** → **patch** (X.Y.Z+1)
  - bug 修复
  - 颜色 / 字体 / 间距 token 调整
  - 文案 / i18n 字符串改字
  - 减少重绘 / 减少内存占用的性能改动
  - CI / 部署配置的修改
- **否** → 进入 Q4

### Q4: 改动是否影响 ≥ 3 个模块 / 跨 ≥ 3 个 widget?

- **是** → **minor** (即使是 bug 修复, 涉及面广也按 minor 算)
  - 修一个深色模式的颜色 token, 实际牵动 8 个面板
  - 修一个解析 bug, 改了 parser + 4 个 widget 显示
- **否** → 进入 Q5

### Q5: 这是 hotfix / 紧急修复?

- **是** → **patch** (即使涉及面广也按 patch, 但要在 changelog 段顶部加 ⚠️ 标注)
- **否** → **patch** (默认)

## 反模式

- ❌ **多改动攒一起 bump**: 一次 minor 包 10 个 patch, 失去版本粒度
- ❌ **patch 装 minor**: 新加功能走 patch, 用户看不到新增
- ❌ **minor 装 major**: 协议层小优化走 minor, 破坏性改走 minor
- ❌ **自己拍脑袋**: 拿不准就去看最近 3 次 commit, 参考历史判定
- ❌ **先 commit 后补 bump**: 顺序反了, 改完代码先跑 bump 脚本, 再 commit

## 举例 (真实场景)

### 例 1: 修仪表盘深色模式边框看不清
- Q1: 破坏兼容? **否**
- Q2: 新增功能? **否**
- Q3: bug 修复? **是** → **patch** (1.0.0 → 1.0.1)
- changelog: `<li>修复: 仪表盘边框</li>`

### 例 2: 加 sparkline tooltip
- Q1: 破坏兼容? **否**
- Q2: 新增功能? **是** → **minor** (1.0.0 → 1.1.0)
- changelog: `<li>新增: sparkline tooltip</li>`

### 例 3: 协议模板 kind 从 uart 改成 serial
- Q1: 破坏兼容? **是** (旧 preset 加载报错) → **major** (1.0.0 → 2.0.0)
- changelog: `<li>破坏性: 协议模板 kind 重命名 uart -> serial, 需手动迁移 preset</li>`

### 例 4: 主题加第三种 (高对比度)
- Q1: 破坏兼容? **否**
- Q2: 新增功能? **是** → **minor** (1.0.0 → 1.1.0)
- changelog: `<li>新增: 高对比度主题</li>`

### 例 5: CI 部署加 retry
- Q1: 破坏兼容? **否**
- Q2: 新增功能? **否** (CI 不影响用户)
- Q3: 部署配置? **是** → **patch** (1.0.0 → 1.0.1)
- changelog: `<li>修复: GitHub Pages 部署偶发卡 Queued</li>`
