# SerialCube 仪表盘 - 需求文档

> 状态: v1 设计中 · 2026-08-03
> 路径: `docs/dashboard-requirements.md`
> 关联: [PRODUCT.md](../PRODUCT.md) · [DESIGN.md](../DESIGN.md) · [docs/architecture.md](./architecture.md)

## 1. 概述

SerialCube 当前有两种工作模式:

1. **裸监视模式 (Monitor)**: 原始字节流 / 文本监视
2. **字节解析模式 (Parser)**: 通过 token 模板把字节流解析成结构化字段

第三种模式 **仪表盘 (Dashboard)** 面向 **业务语义层**——把 parser 解析结果按用户配置的卡片组织起来, 提供实时数值、告警提示、趋势可视化, 让工程师一眼看到"业务状态"而非"字节流"。

仪表盘模式 **不替换** 现有 monitor / parser 模式, 而是 topbar mode-switch 中的第三个选项, 与前两者并存。

## 2. 用户与场景

### 主用户

嵌入式 / 硬件方向工程师(3-10 人团队), 工作在 BMS / EMS / PCS 等设备的协议调试一线。详见 [PRODUCT.md §Users](../PRODUCT.md)。

### 典型场景

1. **现场调试 - 单设备状态**
   - 工程师接到新板子, 跑通串口, 进 parser 模式解析出 TLV 字段
   - 进 dashboard 模式, 选几个关键字段(电压、电流、SOC), 放到 KPI 顶部
   - 跑现场测试, 一眼看到状态变化, 触发异常时告警立刻冒出来
2. **远程协作 - 同事复现问题**
   - 同事遇到"上次好使, 这次不行"
   - 工程师把 dashboard 配置导出 JSON, 同事导入, 1 分钟内对齐相同视图
3. **回归测试 - 跑固件升级**
   - 升级前, 工程师建一个 dashboard profile, 记录"基线值"
   - 升级中, dashboard 实时对比, 异常立即告警
4. **验收评审 - 给 PM / 测试看**
   - 工程师把 dashboard 链接发过去, 不必解释"这个字节是啥意思"

### 当前痛点

- parser 输出是 token 流(`name=value` 列表), 工程师需要"再读一遍"才能理解业务含义
- 抓 bug 时, 工程师要在 parser 和 monitor 之间反复切换
- 没有"一眼看到状态"的视图

## 3. 目标与成功指标

| ID  | 目标                              | 衡量                                         |
| --- | --------------------------------- | -------------------------------------------- |
| G1  | 5 分钟内从连接到配置好仪表盘      | 新建用户 task completion time                |
| G2  | 实时刷新延迟 ≤ 100ms              | parser → dashboard render 端到端             |
| G3  | 告警触发提示 ≤ 500ms              | 阈值越过 → 卡片变红 + 告警栏新增             |
| G4  | 模式切换 < 200ms                  | mode-switch click → dashboard 全显           |
| G5  | 100 张卡片渲染流畅                | 主线程帧率 ≥ 60fps                            |
| G6  | 用户从 parser 切到 dashboard 之后 | 平均会话时长 > 5min(说明确实在看业务状态)    |

## 4. 范围

### 4.1 In Scope (v1)

- 模式切换: topbar mode-switch 加 "仪表盘" 选项
- **4 种基础卡片类型**: 数值卡 / 趋势卡 / 状态卡 / 复合卡
- **KPI stat strip**: 5-7 个最关键指标, 一行紧凑卡
- **字段绑定**: 从 parser 输出的 token 中选字段
- **数值格式化**: 整数 / 小数 / 百分比 / 十六进制 / 二进制
- **单位显示**: 自由文本 (V / A / °C / % / kWh / 自定义)
- **阈值告警**: 上限 / 下限 / 范围 / 状态匹配
- **告警栏**: 右侧常驻, 实时滚动, 可折叠, 可确认
- **趋势窗口**: 1min / 10min / 全程, 60px sparkline
- **卡片编辑器**: 选字段 / 选类型 / 设阈值 / 选趋势窗
- **配置导入导出**: JSON 复用 SerialWebUserConfig 体系
- **localStorage 持久化**: 复用 `serialweb:prefs` key
- **浅深双主题适配**
- **中英双语**
- **空状态引导**: 无仪表盘时显示 "创建你的第一个仪表盘"

### 4.2 Out of Scope (v1)

- 业务语义预置 (电池 / 储能专用模板) — 用户确认 **generic 路线**
- AI 异常检测
- 远程告警 (邮件 / 钉钉 / 微信 / Slack)
- 多仪表盘 profile 切换 (单 dashboard 内多视图)
- 卡片拖放重排 (v2)
- 全屏模式 (v2)
- 卡片分组 / 折叠
- 公式计算字段 (`a + b * 2` 之类)

## 5. 功能需求

### 5.1 模式切换 (FR-MODE)

- **FR1.1**: topbar mode-switch 加第三个按钮 "仪表盘"
- **FR1.2**: 切换时保留 monitor / parser 状态, 不销毁
- **FR1.3**: 切到 dashboard 时, 默认显示空状态(无仪表盘配置时)或最后一次的仪表盘
- **FR1.4**: 切回 monitor / parser 时, 状态完整恢复
- **FR1.5**: 模式切换走 fade transition, ≤ 200ms

### 5.2 卡片系统 (FR-CARD)

- **FR2.1**: 支持 4 种基础卡片类型:
  - **数值卡 (Value)**: 大字号当前值 + 标签 + 单位 + 状态点
  - **趋势卡 (Trend)**: 数值 + 60px sparkline + 时间窗标签
  - **状态卡 (State)**: 当前状态文字 + 颜色编码 (正常/警告/异常/离线)
  - **复合卡 (Composite)**: 多个字段 + 简易表达式(平均/最大/最小)
- **FR2.2**: 卡片可绑定 1+ 个 parser 字段
- **FR2.3**: 数值格式化
  - 整数 / 小数(精度可配 0-6 位)
  - 百分比 (× 100 + %)
  - 十六进制 (0x 前缀)
  - 二进制 (0b 前缀)
- **FR2.4**: 单位显示(自由文本, 默认空)
- **FR2.5**: 阈值告警: 上限 / 下限 / 范围
  - 触发时卡片边框变 `var(--danger)` + 内部 soft tint
  - 告警 level: warning(橙) / danger(红), 由用户配置
- **FR2.6**: 卡片标题(自由文本, 默认绑定字段名)
- **FR2.7**: 单仪表盘 ≤ 50 张卡片(v1 软限制)

### 5.3 KPI Stat Strip (FR-KPI)

- **FR3.1**: 5-7 个紧凑数值卡, 一行布局, 高度约 80px
- **FR3.2**: 每个 KPI 是简化数值卡(无趋势线, 大字号当前值)
- **FR3.3**: 触发告警的 KPI 高亮(背景 tint + 边框)
- **FR3.4**: KPI 顺序可配(用户拖动)
- **FR3.5**: KPI 数量 < 5 时自适应填充右侧空白

### 5.4 趋势可视化 (FR-TREND)

- **FR4.1**: 3 档时间窗: 1min / 10min / 全程
- **FR4.2**: 60px 高度 sparkline, 嵌入卡片底部
- **FR4.3**: 阈值线(虚线, 仅在用户配置时显示)
- **FR4.4**: 鼠标悬停显示具体数值(tooltip / 浮动数字)
- **FR4.5**: 趋势数据滚动窗口: 每字段最多保留 1000 个采样点(超出按 LRU 淘汰)
- **FR4.6**: 趋势渲染: Canvas 2D(复用现有 chart 渲染管线)

### 5.5 告警 (FR-ALERT)

- **FR5.1**: 阈值规则触发后, 卡片 + KPI 立即变红
- **FR5.2**: 右侧告警栏实时滚动, 每条告警:
  - 时间(精确到秒)
  - 字段名
  - 当前值
  - 阈值
  - 严重等级
  - 触发 / 恢复 / 持续状态
- **FR5.3**: 告警可点击定位到对应卡片(滚动 + 闪烁 1s)
- **FR5.4**: 告警可确认(acknowledge)
  - 确认后从 active 移到 history (告警栏底部)
  - 确认后卡片红色边框消失(但值仍异常)
- **FR5.5**: 告警等级: warning(橙) / danger(红), 用户配置
- **FR5.6**: 告警去抖(debounce): 同字段同阈值 1s 内不重复触发
- **FR5.7**: 告警栏可折叠(整栏隐藏, 仅留一个小徽章指示未读数)
- **FR5.8**: 告警历史保留最近 100 条(超出自动归档)

### 5.6 配置 (FR-CONFIG)

- **FR6.1**: 仪表盘配置 JSON 导入/导出
  - 复用 SerialWebUserConfig 体系, 在 userConfig.dashboard 下挂载
  - 不破坏现有 userConfig 解析逻辑
- **FR6.2**: localStorage 持久化: 复用 `serialweb:prefs` key, 字段 `dashboard`
- **FR6.3**: 卡片编辑器:
  - 进入: 右上角齿轮 / "编辑" 按钮
  - 字段选择: dropdown 列出当前 parser 输出 token 列表
  - 类型选择: 4 种卡片
  - 阈值设置: 滑块 + 数字输入(实时预览)
  - 趋势窗: 1min / 10min / 全程
  - 单位 / 标题: 文本输入
- **FR6.4**: 删除卡片: 编辑模式下卡片右上角 "×"
- **FR6.5**: 添加卡片: 卡片网格空白处显示 "+" 槽位
- **FR6.6**: 退出编辑: 自动保存(无需确认)

## 6. 非功能需求

- **NFR1**: 实时刷新延迟 ≤ 100ms(parser → dashboard 渲染)
- **NFR2**: 100 张卡片渲染流畅(主线程 ≥ 60fps)
- **NFR3**: 趋势数据存储 < 5MB / 字段
- **NFR4**: 模式切换 < 200ms
- **NFR5**: 暗色模式 1:1 适配(所有 token 复用 DESIGN.md 暗色变体)
- **NFR6**: 中英双语 1:1 适配
- **NFR7**: 浏览器要求: Chromium only(复用现有)
- **NFR8**: 复用现有 Web Serial API + 解析管线, 不引入新依赖
- **NFR9**: 单文件 HTML 原则, 不引入 build 步骤

## 7. 约束

- 复用现有 [DESIGN.md](../DESIGN.md) 的 design token(8 条 Named Rules 全部继承)
- 复用现有 [PRODUCT.md](../PRODUCT.md) 的产品约束(单文件 / Chromium only / 数据兼容性)
- 复用 parser state 的解析结果, 不重新解析
- 复用 SerialWebUserConfig 体系, 不破坏现有 userConfig 解析
- 数据兼容性字段(SerialWebUserConfig type / serialweb:prefs / WSLBIN1)不可破坏

## 8. 风险与缓解

| ID  | 风险                           | 缓解                                                                  |
| --- | ------------------------------ | --------------------------------------------------------------------- |
| R1  | 卡片数量过多时性能下降        | 软限制 ≤ 50 卡片/仪表盘, 超出提示; 趋势 LRU 淘汰                      |
| R2  | 趋势数据内存爆炸              | 滚动窗口 + LRU, 每字段 1000 采样点上限                                 |
| R3  | 告警频繁触发                  | 1s debounce, 同字段同阈值不重复                                       |
| R4  | dashboard state 与 parser 冲突 | 完全隔离的 sub-state, 通过 event bus 单向订阅                         |
| R5  | 编辑模式误操作                | 编辑模式必须显式进入; 删除有 1s 撤销提示(可选)                         |
| R6  | parser 未配置时切到 dashboard  | 空状态引导: "请先在 parser 模式配置解析规则"                           |
| R7  | 趋势采样精度                  | 大量数据时降采样(downsample), 保留视觉形状但降内存                      |

## 9. 开放问题

待用户拍板后写进 SPEC:

- **O1**: v1 是否包含"卡片拖放重排"? 还是 v2?
- **O2**: v1 是否支持"多仪表盘 profile 切换"? 还是 v2?
- **O3**: 告警声音提示?
- **O4**: 复合卡的"简易表达式"语法范围? (avg/max/min vs. `a + b * 2`)
- **O5**: 卡片编辑器是"inline 编辑"还是"右侧抽屉"?
- **O6**: 趋势数据是否导出? (CSV / JSON)

## 10. 关联

- 上游: [PRODUCT.md §Capabilities and Constraints](../PRODUCT.md) 的"近期路线"第 1 条 / 第 2 条
- 复用: [docs/architecture.md §4 功能模块](./architecture.md) 的 parser / chart 子系统
- 设计: [DESIGN.md](../DESIGN.md) 全部(无新增 token)
- Agent 约束: [AGENTS.md](../AGENTS.md) §1 强制 skill 链(brainstorming 已走)
