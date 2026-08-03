# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

团队内部的嵌入式 / 硬件方向工程师(3-10 人规模)。日常涉及:

- 户外电源 (portable power station / solar generator) 产品
- BMS (Battery Management System) / EMS (Energy Management System) / PCS (Power Conversion System) 通信协议
- 自定义 TLV 数据帧 + Modbus RTU/TCP 数据帧
- 工业级协议栈 (CRC16-MODBUS, 多命令 profile, 字节级字段映射)

## Product Purpose

让团队在浏览器内(无安装、跨设备、离线可用)对嵌入式设备的串口通信
做可视化调试,覆盖三类核心场景:

1. **实时监视**: 看二/十六进制流量,边抓边分析 TLV 字段
2. **协议解析**: 用模板/SDK 把二进制流解析成结构化字段和波形
3. **可重复调试**: 录制 → 冻结 → 回放,支持离线分析和回归测试

成功 = "打开页面,接上设备,5 分钟内看到字段值和波形"。

## Positioning

"Web Serial API + 单文件可分发 + 工业协议 SDK" 三件套是同赛道桌面工具
(PuTTY / MobaXterm / CoolTerm / AccessPort) 在浏览器侧做不到的组合:

- **Web Serial API** 免驱动、跨平台、远程协作零配置
- **单文件 HTML** 双击即用,GitHub Pages 部署,团队任何成员 clone 即跑
- **工业协议 SDK**(TLV → Modbus 路线) 把通用串口监视器升级为协议层
  调试器,这是工程师愿意从 PuTTY 切过来的关键差异化

## Operating Context

- 工位 / 实验室工位环境,连接开发板或成品设备
- 边看波形边改嵌入式代码,可能同时戴着万用表/示波器
- 双屏使用: 一屏看代码 + 终端,一屏开 SerialCube 监视/解析
- 短会话: 一次调试常常 < 30 分钟,需要快速进入和退出
- 团队内部代码评审/调试会时,直接发 GitHub Pages 链接即可

## Capabilities and Constraints

### 已实现 (v1.5)

- Web Serial API 单连接(读/写/重连/失焦释放)
- 串口参数: 波特率/数据位/停止位/校验/流控/RTS/DTR/Break
- 接收监视: 文本/HEX 模式、时间戳、实时事件
- 发送: 手动/定时/触发/预设,ASCII/HEX,换行符
- 解析器: token 模板 + 字段映射 + 实时结果展示
- 图表: 时域图/频域图/柱状图(Canvas 2D 自绘)
- 时间线: 实时录制/冻结/回放,导入导出 .timeline/.csv/.txt
- 配置: JSON 复制粘贴(SerialWebUserConfig v1)
- 持久化: localStorage(主题/布局/最近设置)
- 主题: light/dark,跟随系统
- 响应式: compact-single / layout-expanded / sidebar-collapsed

### 近期路线(用户确认)

1. **多串口并发** — 同一会话同时连接多路串口,多设备协同调试
2. **现有功能打磨** — 解析器 / 时间线 / 图表 / 预设发送,先把做过的做好
3. **Modbus RTU/TCP 协议 SDK** — 把 TLV 模板解析器扩展为支持 Modbus
   工业协议的标准 profile 库

### 技术约束(不可绕过)

- **单文件 HTML** (`SerialCube.html`): 单可分发单元,不引入 build 步骤 / npm /
  构建工具。任何多文件化必须用户明确同意。
- **浏览器要求**: Chromium 系(Edge / Chrome / Brave)。Web Serial API 需
  HTTPS 或 `localhost` / `file:`。Firefox / Safari 不在路线内。
- **数据兼容性字段不可改**:
  - `localStorage` keys: `serialweb:prefs`, `serialweb:version-modal-seen`, `wsl-*`
  - 配置 JSON type: `SerialWebUserConfig` v1
  - `.timeline` 二进制 magic: `WSLBIN1` (`0x57 0x53 0x4C 0x42 0x49 0x4E 0x31 0x00`)
  - 浏览量 API 路径: `/api/serialweb_page-view`
  - JS 内部命名: `__serialWeb*` / `clearSerialWebStoredUserData` 等
- **中英双语**: 每个 UI 标签同步维护中英两个版本,用户可切换或跟系统语言

## Brand Commitments

- **名称**: SerialCube(2026-08-03 从 SerialWeb 改名,见 git history)
- **调性**: 工程师实用主义(Operate 模式),不追求营销美学或华丽动效
- **GitHub**: https://github.com/yubiediu826/SerialCubeWeb
- **GitHub Pages**: https://yubiediu826.github.io/SerialCubeWeb/
- **版本号**: 公开迭代(v1.5,CHANGELOG 内嵌 About 弹窗)
- **支持渠道**: GitHub Issues(主),不公开宣传

## Evidence on Hand

- `docs/architecture.md` — 完整架构分析(模块 / 状态 / 数据契约 / 工作流)
- `.claude/skills/` — 项目级开发 skill 集合(superpowers / taste / impeccable)
- `AGENTS.md` — 强制 agent skill 链 + 兼容性约束
- `SerialCube.html` — 15841 行 / 580.5 KB 单文件实现
- About 弹窗 — v1.5 完整 CHANGELOG
- 测试方式: 手动 smoke test(串口真机),暂无自动化测试基础设施

## Product Principles

1. **单文件可分发优先** — 无 build / 无 npm / 无网络依赖,任何成员 clone 即跑
2. **数据兼容性优先** — 改动不要破坏已落盘的 localStorage / .timeline / user config
3. **Operate 模式优先** — 工程师快速完成任务,UX 不炫技,删除冗余 tooltip/装饰
4. **协议可扩展** — TLV 模板 → Modbus SDK 是已确认的演化路径,解析器设计需可扩展
5. **代码 > 文档** — M5 起明确的偏好,先写可工作的代码,再补文档

## Accessibility & Inclusion

- 团队内部 3-10 人,无强 a11y 法规要求
- 默认遵循浏览器原生语义化控件(标准 `button` / `input` / `aria-*`)
- 中英双语 → 提升非中文工程师可访问性
- 视觉: 浅/深色双主题,contrast 满足 WCAG AA(可后续用 impeccable:audit 校验)
- 键盘: 大部分操作有快捷键,继续扩展
- 屏幕阅读器: 当前未做 ARIA 完整审计,后续视需求补

## Open Questions (未决)

- 是否引入测试基础设施(Playwright? vitest? 串口 mock?)— 待用户拍板
- live 模式(impeccable live): 是否启用浏览器内迭代设计?待评估
- 多串口并发的 UI 形态: tab 切换 / 多窗口 / 拼面板?需 `impeccable:shape` 规划
