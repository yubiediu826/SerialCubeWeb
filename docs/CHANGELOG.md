# SerialCube 变更记录

> **本项目所有变更的统一日志**。按版本号倒序排列，与 `SerialCube.html const VERSION` 严格对齐。
>
> 写规则：每次发版（patch / minor / major）追加一节；`docs/handover/release-vX.Y.Z.md` 是详细 release notes，本文件是索引 + 摘要。

---

## [未发布]

### 计划中

- 暂无

---

## [1.0.0] — 2026-08-11

> **Tag:** `v1.0.0` (annotated)
> **Release commit:** `d286d93`（详见 [`handover/release-v1.0.0.md`](handover/release-v1.0.0.md)）
> **代码版本:** `SerialCube.html const VERSION = '1.0.0'`

### ✨ 首次正式发布

- **11 项核心能力 + 7 个深色模式修复 + 完整 AI 工作流**（15 个 skill）一次性合并
- 单 HTML 文件 `SerialCube.html`（942KB / 21,168 行）全内嵌实现
- 完整 commit 历史 17 个，全部中文 message
- 配套 4 个本项目自建 skill：workflow / e2e / deploy / version-management

### ✨ 核心能力

- 串口监视 + 设备连接管理（Web Serial API + mock 模式）
- 图形解析（仪表盘 widget + 4 种图表弹窗）
- 时间线系统（卡片 + 全局时间范围 + 缩放工具栏）
- 3 种预设发送扩展（自动 / 条件 / 预设组）
- 协议编辑器（TLV 帧结构 + 2 个内置协议模板 + 5 种 CRC）
- 解析协议（文本 / 十六进制切换）
- 双主题（浅色 / 深色 / 跟随系统，modal/panel 统一实色）
- 告警（toast 浮层 + 通知历史）

### 🔧 协议 / 算法

- 5 种 CRC：CRC-8 / CRC-16 MODBUS / CRC-16 CCITT / Checksum / XOR
- 2 个内置协议模板：proto_bms (BMS TLV v1 Legacy) / proto_modbus (Modbus RTU Legacy)
- 8 种 buildFrame kind：fixed-header / raw / cmd-split / addr-split / ctrl-bit7 / type-high-bit / msgid-mixed / tlv
- 11 个数据字段：cell_1_v ~ discharge_v_set
- 8 个命令：0x01-0x04 (RX query) + 0x10/0x11 (TX control) + 0x90/0x91 (RX ack)

### 🛠 性能 / 优化

- taste SKILL.md 拆分：88KB → 6KB + references/core.md 82KB（按需加载）
- 15 skill description 差异化（启动 tokens ~2.4K → ~1.9K）
- README routing 速查表（14 行「用户说辞 → skill」映射）

### 📦 工程

- GitHub Pages 部署 workflow（`actions/deploy-pages@v4`）
- 5 件事部署清单 + 6 场景端到端验证
- 完整交接文档（PROJECT-HANDOVER + release notes + 5 步检查清单）

---

## 变更记录维护规则

### 何时追加

1. **新版本发布** — patch / minor / major 发版时追加新节
2. **破坏性变更** — 即使 patch 也必须在「破坏性变更」节列出
3. **安全修复** — 在「安全」节单独列出（即使未发版）

### 何时**不**追加

- 单个 commit 的修复（累积到下个版本）
- 文档微调（除非破坏现有 API）
- 内部重构（无对外行为变化）

### 格式规范

```markdown
## [X.Y.Z] — YYYY-MM-DD

> **Tag:** `vX.Y.Z` (annotated)
> **Release commit:** `<sha>` (详见 `handover/release-vX.Y.Z.md`)
> **代码版本:** `SerialCube.html const VERSION = 'X.Y.Z'`

### ✨ 新功能 / 🔧 修复 / ⚠️ 破坏性 / 📦 工程 / 🔒 安全

- 描述
```

### 链接到详细 release notes

- [`release-v1.0.0.md`](handover/release-v1.0.0.md) — 首次正式发布
