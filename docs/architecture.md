# SerialCube 架构分析

> 适用版本: v1.5 · 2026-08-03  
> 文件: `SerialCube.html` (单文件, 15841 行 / 580.5 KB)

## 1. 项目定位

浏览器内运行的工业级串口调试工具,目标用户是嵌入式 / 硬件方向工程师
(BMS / EMS / PCS 通信协议调试)。单 HTML、双击即用、可下载离线版。

- **运行模式**: Web Serial API (navigator.serial) + Web Crypto (无)
- **部署形态**: 单文件 SPA,纯原生 JS / CSS,无构建步骤,无 npm
- **GitHub**: https://github.com/yubiediu826/SerialCubeWeb
- **GitHub Pages**: https://yubiediu826.github.io/SerialCubeWeb/

## 2. 技术栈

| 类别       | 选型                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 前端框架   | 原生 JS (IIFE, ES2020+),无 React/Vue                                |
| 样式       | 原生 CSS + CSS 变量,无 Tailwind / Less                              |
| 图表       | Canvas 2D 自绘 (40 处 getContext),无 Chart.js / D3                   |
| 状态管理   | 集中式 `state` 对象 (line 6210),命令式直接修改                       |
| 持久化     | `localStorage` (`serialweb:prefs`, `serialweb:version-modal-seen`)    |
| 通讯       | Web Serial API (navigator.serial)                                   |
| 编码       | TextEncoder / TextDecoder                                            |
| 浏览器要求 | Chromium 系 (Web Serial API 需要 HTTPS 或 localhost)                |

## 3. 单文件结构 (行号地图)

```
┌────────────────────────────────────────────────────────────────┐
│ <head> 内联 <script>  (L7–97)                                  │
│   - 主题/暗色模式初始检测                                        │
│   - localStorage 偏好读取                                       │
│   - 动态 favicon (SVG 字母 SC)                                  │
├────────────────────────────────────────────────────────────────┤
│ <style>  (L98–5430, 约 5300 行 CSS)                             │
│   - CSS 变量主题系统 (light/dark)                                │
│   - 完整布局/组件样式                                            │
│   - 响应式断点: ≤1180, ≤1080, ≤720                              │
│   - 动画: pulse, liveSweep, reconnectRibbonPulse                │
├────────────────────────────────────────────────────────────────┤
│ <body>  (L5432–6031, UI 标记)                                  │
│   - header.topbar: brand-block / timeline-block / corner-block  │
│   - main.workspace: left-column / right-column                 │
│   - version-modal (关于信息)                                    │
│   - toast-layer                                                  │
├────────────────────────────────────────────────────────────────┤
│ <script>  (L6034–15845, 约 9800 行 IIFE 主逻辑)                 │
│   - 常量/配置                                                     │
│   - state 集中状态 (L6210)                                       │
│   - 工具函数 (hex/format/parse)                                  │
│   - 串口子系统                                                    │
│   - 解析器子系统                                                  │
│   - 图表子系统                                                    │
│   - 时间线子系统                                                  │
│   - UI 渲染/事件                                                  │
│   - 持久化 / 配置导入导出                                        │
│   - 初始化入口 (L15840)                                          │
└────────────────────────────────────────────────────────────────┘
```

## 4. 功能模块

| 模块       | 主要职责                                       | 关键锚点              |
| ---------- | ---------------------------------------------- | --------------------- |
| 设备连接   | navigator.serial 连接/断开/重连/失焦释放        | `state.serial`        |
| 串口参数   | 波特率/数据位/停止位/校验/流控/DTR/RTS/Break   | `state.settings`      |
| 接收监视器 | 文本/HEX 显示,时间戳,实时事件                  | `monitor-panel`       |
| 发送       | 手动/定时/条件/预设,ASCII/HEX,换行符          | `sendDraft`, 预设表  |
| 解析器     | 自定义模板解析(token/字段/TLV 风格)            | `parser-panel`        |
| 图表       | 时域图/频域图/柱状图,Canvas 自绘               | `charts-panel`        |
| 时间线     | 实时录制/冻结/回放,二进制归档                  | `TIMELINE_BIN_MAGIC`  |
| 模式切换   | 串口监视 ↔ 图形解析(顶栏 logo 区域)            | `logo-mode-switch`    |
| 系统菜单   | 主题/布局/紧凑模式/配置导入导出/关于          | `system-menu`         |
| 持久化     | localStorage + 配置 JSON 复制粘贴             | `buildLocalPrefsSnapshot` |
| 主题       | light/dark,跟随 prefers-color-scheme           | `:root` CSS 变量     |
| 响应式     | compact-single (≤720) / layout-expanded       | `body` class 切换    |

## 5. 状态管理 (state, L6210)

集中式 `state` 对象,无响应式/无 Proxy,所有变更命令式 `state.x = y` 后手动调用
`renderXxx()`。核心顶层字段:

```
state = {
  version, theme, layoutExpanded, parserMode,
  serial: { supported, connected, port, reader, writer,
            reconnectTask/session/phase/reason,
            signalInputs: { cts, dsr, dcd, ri }, ... },
  settings: { baudRate, dataBits, stopBits, parity,
              flowControl, signalDtr/Rts/Break,
              autoReconnect, rxDisplayMode, textEncoding,
              appendTimestamp, sendMode, newlineMode, ... },
  sendDraft: { text, hex },
  session: { startMs, ... },
  ...  (图表/解析器/时间线 各自的子状态)
}
```

**特点**: 单点真理,UI 全部从 state 派生;但同步逻辑散布在 100+ 函数中。

## 6. 关键数据格式 (兼容性契约,已落盘)

> 这些字段**故意保留 SerialWeb 命名**——用户的浏览器 localStorage / 历史
> .timeline 文件 / 历史复制过的 user config 都依赖这些 magic。

| 字段                                | 用途                          | 改/不改 |
| ----------------------------------- | ----------------------------- | ------- |
| `localStorage` key `serialweb:prefs` | 用户偏好(主题/布局/最近设置) | 保留    |
| `localStorage` key `serialweb:version-modal-seen` | 关于弹窗已读标记 | 保留 |
| `localStorage` key `wsl-*`          | 旧版遗留 key                  | 保留    |
| JSON type `SerialWebUserConfig` v1  | 配置复制粘贴格式              | 保留    |
| 二进制 magic `0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00` ("WSLBIN1\\0") | .timeline 二进制归档头 | 保留 |
| API 路径 `/api/serialweb_page-view` | 浏览量统计(可移除)           | 保留    |
| JS 内部命名 `__serialWeb*`          | 局部变量/函数                 | 保留    |

**已替换**(用户可见): `<title>`, 顶栏 `status-pill-title`, 关于 modal, GitHub
链接, 下载文件名, `ONLINE_VERSION_URL`, `DOWNLOAD_HTML_FILENAME` 全部改为
SerialCube / yubiediu826 仓库。

## 7. 主题与响应式

- **主题**: `:root` CSS 变量 + `body.theme-dark` 覆盖,两套色值
- **模式**: `compact-single` (≤720px 一栏折叠), `layout-expanded` (拉宽左右双栏),
  `sidebar-collapsed`, `parser-results-expanded`
- **预渲染**: 内联 `<script>` 在 body 渲染前根据 localStorage + prefers-color-scheme
  设置初始 class,避免主题闪烁

## 8. 后续开发工作流(结合 superpowers + taste + impeccable)

每个会话先过 `using-superpowers`——按任务类型选 skill:

| 任务类型                     | 主 skill                          | 辅助                          |
| ---------------------------- | --------------------------------- | ----------------------------- |
| 新增功能/UI 模块             | `brainstorming` → `impeccable:shape` | `impeccable:craft-floor` 写代码前 |
| UI 视觉精修                  | `impeccable:audit` → `polish`     | `design-taste-frontend` 作参考 |
| UI 大改造                    | `impeccable:critique` → 选命令    | `design-taste-frontend` 三拨盘 |
| bug 修复                     | `systematic-debugging`            | —                             |
| 性能优化                     | `impeccable:optimize`             | —                             |
| 跨设备适配                   | `impeccable:adapt`                | —                             |
| 设计系统化(token/组件抽取)   | `impeccable:extract`              | —                             |
| 首次跑新项目                 | `impeccable:init` → 写 PRODUCT.md | `design-taste-frontend` 定基线 |

**impeccable 命令速记**:
- `shape [feature]` — 写代码前规划 UX/UI
- `audit [target]` — 可访问性/性能/响应式
- `critique [target]` — UX 启发式评审
- `polish` / `bolder` / `quieter` / `distill` — 视觉微调方向
- `harden` — 错误态/边界/空态/i18n
- `animate` / `colorize` / `typeset` / `layout` / `delight` — 单独维度增强

**impeccable 跑法**(每个会话开头):
```bash
node .claude/skills/impeccable/scripts/context.mjs --target SerialCube.html
# 编辑 UI 前必读
# reference/craft-floor.md
```

**taste skill 适用边界**: 文档明确"Not dashboards, not data tables, not
multi-step product UI"——SerialCube 是 Operate 模式工具,taste 的部分规则(色
彩/字体/状态)仍可借鉴,但其 landing/portfolio 范式**不适用**。

## 9. 已知结构挑战

| 挑战                                 | 现状                                    | 应对                |
| ------------------------------------ | --------------------------------------- | ------------------- |
| 580KB 单文件,编辑器跳转成本高        | 找 CSS class 需 grep,函数跨数百行        | 暂不拆分;按需锚点    |
| CSS 5300 行 / JS 9800 行 混杂        | 同一文件混合 design tokens/逻辑/状态     | 暂不拆分            |
| 集中 state 无响应式                   | 每次改动需手动 `renderXxx()`            | 暂不引入框架         |
| 大量 `el.classList.toggle()` 手动同步 | UI class 与 state 易脱节                | 写测试/截图自检      |
| 没有任何自动化测试                    | 改动回归靠肉眼                          | 关键模块加 smoke test |
| Web Serial API 仅 Chromium           | 文档需明确标注浏览器要求                | 已在 About 注明     |

**暂不建议拆分**——单文件 = 单可分发单元(双击即用,GitHub Pages 部署)是核心
体验,拆分引入 build 步骤会破坏这一价值。等出现以下信号再拆:
- 单文件 > 1.5MB
- 多人协作冲突频繁
- 出现可独立复用的"协议解析 SDK"等可移植子模块

## 10. 后续开发切入点候选

按"性价比 / 用户感知度"排序:

1. **预设发送 + 自动发送** 体验打磨(用户已经在用,反馈多)
2. **时间线回放** 性能(60s 滚动卡顿?)
3. **解析器** 更多字段类型(int8/int16/float32/string,大端/小端,位域)
4. **图表** 通道高亮/图例交互/导出 PNG
5. **多串口并发** (目前单连接)
6. **WSL 透传** (已经有 `wsl-` localStorage key 痕迹,似乎有过实验)
7. **协议 profile** (Modbus RTU/TCP, 用户 profile 已点出方向)
8. **键盘快捷键** 全局化(目前局部)
