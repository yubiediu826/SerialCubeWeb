# SerialCube 开发者指南

> **面向开发者**（改代码 / 调试 / 部署）— 改 SerialCube.html 的标准 SOP。
> 如果你只想用工具,看 [`USER-GUIDE.md`](USER-GUIDE.md)。

---

## 1. 改代码的标准流程

```
1. 需求 / 改需求
   ├─ 创造性工作（新功能 / 改行为）→ brainstorming 9 步
   └─ 小改动（bug 修复 / 文案 / 配置）→ 直接动手

2. 改 SerialCube.html
   └─ 改前必跑: .\bump-version.ps1 -Level <patch|minor|major>
      （version-management R1 硬性规则）

3. 自验证
   └─ 真浏览器打开 SerialCube.html 手动跑

4. 写 changelog 子文件  （硬性规则 5）
   └─ docs/changelog/YYYY-MM-DD-<topic-slug>.md
   └─ docs/CHANGELOG.md 主索引加一行
   └─ 同步更新引用本变更的其他文档

5. 提交
   ├─ git add <files>
   ├─ git commit -m "<type>(<scope>): <中文 subject>"  ← subject 必须中文
   └─ commit 类型 ∈ {feat, fix, docs, chore, perf, refactor, test}

6. 推送
   └─ ⚠️ push 前 ASK USER 确认  （version-management R2 硬性规则）
      git push origin main --tags
      （首次推送要 -u，后续不用）

7. 部署
   └─ GitHub Actions 自动跑 pages.yml，无需手动
   └─ 部署后跑 deploy-checklist 5 件事验证
```

### 1.1 关联文档同步自检（每次 push 前必跑）

```powershell
# 1. 改完先 grep 出所有引用本次变更内容的文档
# 例: 改了 SerialCube.html const VERSION → 找所有提到 1.0.0 的文档
Select-String -Path 'docs' -Pattern '1\.0\.0' -Recurse

# 2. 跑 link check 确认没断链
# (见本文档底部 § 13 自检脚本)

# 3. 看 CHANGELOG.md 主索引有没有漏
Get-Content docs/CHANGELOG.md
```

**自检清单:**
- [ ] changelog 子文件已写（`docs/changelog/YYYY-MM-DD-<topic>.md`）
- [ ] `docs/CHANGELOG.md` 主索引已加链接
- [ ] 所有引用本变更的文档已同步（用 grep 找）
- [ ] 没有断链（link check 通过）
- [ ] commit message 中文
- [ ] ask_user 拿到 push 确认

---

## 2. 改 SerialCube.html 前必跑

```powershell
Set-Location 'D:\WorkSpace\SerialCubeWeb'
.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level patch
# 1.0.0 → 1.0.1 (修复)
# 1.0.0 → 1.1.0 (新功能)
# 1.0.0 → 2.0.0 (破坏性)
```

**脚本自动:**
- 改 `SerialCube.html const VERSION` (e.g. `'1.0.0'` → `'1.0.1'`)
- 改 HTML changelog 段（加新版本 + 描述）
- **不动 git tag** (tag 手动打)

**手动:**
- git add + commit (`chore(release): 准备 v1.0.1` 或类似)
- git tag -a v1.0.1 -m "v1.0.1 发布说明"
- git push origin main --tags

完整流程见 [`.minimax/skills/version-management/SKILL.md`](../../.minimax/skills/version-management/SKILL.md)。

---

## 3. 本地开发环境

### 3.1 工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 24.18.0 | 跑 agent-browser / 工具脚本 |
| npm | 11.16.0 | 全局包管理 |
| agent-browser | 0.34.0 | 浏览器自动化（**唯一浏览器入口**） |
| Python | 3.11+ | 跑协议层工具脚本（如果装 protocol-copilot） |
| PowerShell | 5.1 | 跑 .ps1 脚本 |
| Chrome / Edge | 最新 | 调试 + 真实测试 |

### 3.2 装环境

```powershell
# Node.js 24+
winget install OpenJS.NodeJS

# agent-browser
npm install -g agent-browser@0.34.0
agent-browser install    # 首次下载 Chrome/Chromium

# Python（可选,只有 protocol-copilot 用）
winget install Python.Python.3.11
```

### 3.3 git 配置

```powershell
git config --global user.name "Mavis"
git config --global user.email "Mavis@local"
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

### 3.4 启动本地 server

```powershell
Set-Location 'D:\WorkSpace\SerialCubeWeb'
python -m http.server 8000
# 或
npx http-server -p 8000
```

访问 <http://localhost:8000/SerialCube.html>

---

## 4. 调试流程

### 4.1 用 agent-browser 跑 SerialCube

```bash
# 打开
agent-browser open http://localhost:8000/SerialCube.html
# 或打开本地文件
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html

# 看 interactive 元素（JSON 输出 + @eN ref）
agent-browser snapshot -i --json

# 用 ref 行动
agent-browser click @e3
agent-browser fill @e5 "AA 01 90"

# 每次页面变都要重新 snapshot（ref 会失效）
agent-browser snapshot -i --json

# 看 console
agent-browser console --level error

# 截图 / 录视频
agent-browser screenshot .tmp/debug.png
agent-browser video record .tmp/debug.mp4
```

### 4.2 跑 6 个端到端场景

`.minimax/skills/serialcube-e2e/scenarios/`:

1. `01-app-loads.md` — 应用加载
2. `02-connect-disconnect.md` — 串口连接/断开
3. `03-send-receive.md` — 发送/接收（mock 模式）
4. `04-protocol-editor.md` — 协议编辑器
5. `05-parser-mode-switch.md` — 解析模式切换
6. `06-theme-toggle.md` — 主题切换

**一键跑全部:**
```powershell
.\.minimax\skills\serialcube-e2e\scripts\run-scenarios.ps1
```

### 4.3 DevTools 调试 SerialCube.html

按 F12 → Console,常用对象:

```js
NS.state           // 全应用 state
NS.PROTOCOLS       // 协议模板
NS.COMMANDS        // 命令定义
NS.CARDS           // 仪表盘卡片
NS.DATA_FIELDS     // 数据字段定义
NS.rxHistory       // 接收历史
NS.currentVals     // 当前数据值
NS.buildFrame(proto, cmd)  // 构造一帧（看实时输出）
```

### 4.4 看 changelog 段

SerialCube.html 里有 HTML 注释版的 changelog（更新日志弹窗用）:

```powershell
Select-String -Path 'SerialCube.html' -Pattern 'version-changelog' -Context 0,0
```

改 VERSION 时,脚本会自动同步这段。

---

## 5. 部署到 GitHub Pages

### 5.1 部署前 5 件事（deploy-checklist）

1. ✅ Console 无错误（`agent-browser console --level error` 输出空）
2. ✅ 6 个 e2e 场景过（跑 `serialcube-e2e`）
3. ✅ `index.html` 重定向正常（访问根 URL 自动跳到 SerialCube.html）
4. ✅ 资源外链可达（ECharts CDN 链接能加载）
5. ✅ VERSION 三处同步（`SerialCube.html const VERSION` / HTML changelog 段 / Git tag）

### 5.2 推送

```powershell
git add <files>
git commit -m "feat(scope): 中文描述"  # 中文
git push origin main --tags           # ⚠️ ASK USER 确认
```

### 5.3 部署后烟雾测试

GitHub Actions 跑 `pages.yml` 部署（1-2 分钟）:

```bash
# 打开生产 URL
agent-browser open https://yubiediu826.github.io/SerialCubeWeb/SerialCube.html

# 跑 2 个关键场景
agent-browser snapshot -i --json      # 场景 01: 应用加载
agent-browser click @e<protocol-btn>  # 场景 04: 协议编辑器
```

---

## 6. 关键文件位置

| 找什么 | 去哪里 |
|--------|--------|
| 主代码 | `SerialCube.html`（942KB / 21,168 行） |
| 跳转页 | `index.html`（690B） |
| 部署 workflow | `.github/workflows/pages.yml` |
| 工作流工具集 | `.minimax/skills/`（15 skill） |
| 文档 | `docs/` |
| 临时文件 | `.tmp/`（gitignored） |
| 版本脚本 | `.minimax/skills/version-management/scripts/bump-version.ps1` |
| e2e 场景 | `.minimax/skills/serialcube-e2e/scenarios/` |
| 部署清单 | `.minimax/skills/deploy-checklist/references/` |

---

## 7. 代码风格

### 7.1 命名约定

- **全局对象:** `NS`（Namespace）
- **常量:** `UPPER_SNAKE_CASE`（e.g. `VERSION`, `PROTOCOLS`, `DATA_FIELDS`）
- **函数:** `camelCase`（e.g. `buildFrame`, `parseHexOr0`）
- **DOM refs:** `refs.camelCase`（e.g. `refs.autoSendQueue`）
- **state:** `state.camelCase`（e.g. `state.serial.connected`）

### 7.2 文件组织

- 单文件,所有 CSS 在 `<style>`,所有 JS 在 `<script>`
- 全局命名空间 `NS = window.NS || {}`
- 关键章节用注释 `// --- Section Name ---` 分隔
- HTML 注释解释意图（不是 what 而是 why）

### 7.3 不要做的事

- ❌ 拆成多文件（用户硬性要求单 HTML）
- ❌ 引入 npm 依赖（除了 ECharts CDN）
- ❌ 用 TypeScript / JSX / 框架
- ❌ 改完不跑 e2e 验证
- ❌ commit message 用英文

---

## 8. 常见改动模式

### 8.1 加一个新的数据字段

```js
// 1. 改 NS.DATA_FIELDS (line ~9989)
NS.DATA_FIELDS = [
  // ... 现有
  { name: 'my_new_field', type: 'u16', default: '0x0000' }
];

// 2. 加到命令的 dataFields
NS.COMMANDS[0].dataFields.push('my_new_field');

// 3. 加到仪表盘卡片（可选）
NS.CARDS.push({ id: 'c11', type: 'trend', cmd: 0x01, dir: 'rx', field: 'my_new_field', ... });

// 4. 跑 e2e 验证
```

### 8.2 加一个新的协议模板

```js
// 改 NS._defaultProtocols (line ~9923)
NS._defaultProtocols = function () {
  return [
    // 现有 proto_bms / proto_modbus
    {
      id: 'proto_my_dev',
      kind: 'fixed-header',
      name: 'My Device v1',
      byteOrder: 'BE',
      crcRange: 'all',
      crcType: 'crc16-modbus',
      crcInit: '0xFFFF',
      crcEndian: 'LE',
      fields: [
        { id: 'f1', name: 'header', type: 'header', size: 1, default: '0xAA' },
        // ...
      ]
    }
  ];
};
```

### 8.3 加一种新的 CRC

```js
// 改 NS.computeCrc (line ~11338)
NS.computeCrc = function (type, bytes, init) {
  switch (type) {
    case 'none': return 0;
    // 现有 case
    case 'crc32': return NS.crc32(bytes);  // 新增
    // ...
  }
};

// 加 NS.crc32 实现
NS.crc32 = function (bytes) {
  // 实现
};
```

### 8.4 改一个 UI 文案

```powershell
# 1. 找文案
Select-String -Path 'SerialCube.html' -Pattern '要改的文案'

# 2. 改（read 上下文, edit 替换）

# 3. bump version（patch）
.\.minimax\skills\version-management\scripts\bump-version.ps1 -Level patch

# 4. 跑场景 01 验证
```

### 8.5 改主题色

```powershell
# 找 CSS 变量
Select-String -Path 'SerialCube.html' -Pattern ':root\s*{' -Context 0,0

# 改 --accent / --text / --bg 等
```

---

## 9. 性能优化

### 9.1 当前瓶颈

- 单文件 942KB,首次加载 ~200-500ms
- 接收数据频繁触发渲染,大数量可能卡顿

### 9.2 优化方向

- **接收渲染:** 节流 / 防抖（`requestAnimationFrame` 批渲染）
- **图表:** ECharts 启用 `notMerge: false` + 增量更新
- **时间线:** 大量数据用 downsampling

### 9.3 何时考虑拆文件

**目前不拆。** 单 HTML 是用户硬性要求。
**触发条件:** 文件 > 800KB 且 gzip 后 > 200KB 且团队多人维护。

---

## 10. 测试

### 10.1 端到端测试（用 agent-browser）

跑 6 个核心场景,见 `.minimax/skills/serialcube-e2e/`。

### 10.2 单元测试

**目前没有单测**。单 HTML + 零依赖 + 协议层用 TDD 太重。
**未来:** `protocol-copilot` skill 装好后会带 Python 单元测试。

### 10.3 手动测试清单

改完代码必跑:

- [ ] 应用加载（页面无 JS 报错）
- [ ] Mock 模式收发
- [ ] 真实串口连接（如果有硬件）
- [ ] 协议解析（文本 + 十六进制）
- [ ] 仪表盘 widget 显示
- [ ] 时间线缩放
- [ ] 预设发送（自动 / 条件 / 组）
- [ ] 主题切换（浅 / 深 / 跟随）
- [ ] localStorage 持久化（刷新页面看设置还在）

---

## 11. 链接到详细文档

| 我想了解 | 去看 |
|----------|------|
| SerialCube.html 内部结构（行号速查） | [`../reference/ARCHITECTURE.md`](../reference/ARCHITECTURE.md) |
| CRC 算法速查 | [`../reference/CRC-REFERENCE.md`](../reference/CRC-REFERENCE.md) |
| 协议模板速查 | [`../reference/PROTOCOL-TEMPLATES.md`](../reference/PROTOCOL-TEMPLATES.md) |
| 5 步接手检查清单 | [`../handover/SESSION-CHECKLIST-2026-08-11.md`](../handover/SESSION-CHECKLIST-2026-08-11.md) |
| 完整项目交接 | [`../handover/PROJECT-HANDOVER-2026-08-11.md`](../handover/PROJECT-HANDOVER-2026-08-11.md) |
| AI 工作流总入口 | [`.minimax/skills/README.md`](../../.minimax/skills/README.md) |

---

## 12. 踩坑记录

### ❌ 拆文件
单 HTML 是用户硬性要求,不许拆。

### ❌ 改 VERSION 不跑 bump
会漏 changelog 段,导致 About 弹窗版本号不一致。

### ❌ 跳过 e2e
942KB 单文件改一处可能破其他,不跑 6 场景不算改完。

### ❌ push 前不问用户
force push / 误推是不可逆操作。

### ❌ 改完没同步 CHANGELOG
docs/CHANGELOG.md 是变更记录,发版必更新。

### ❌ 浏览器用 in-app 内置 Browser
用 agent-browser（token 消耗 1/10,ref 定位稳）。

### ❌ 改 UI 不跑 taste / ui-ux-pro-max / design-system
5 步 SOP 在 `.minimax/skills/README.md` §⑤。

### ❌ 改完不写 changelog 子文件
**硬性规则 5:** 每次 push 前必在 `docs/changelog/<YYYY-MM-DD>-<topic>.md` 写子文件 + 更新 [`../CHANGELOG.md`](../CHANGELOG.md) 主索引。

### ❌ 改完不同步关联文档
跑了 grep 发现有 50+ 处引用就要全部更新；改文件名/链接路径后必须跑 link check。

---

## 13. 自检脚本（PowerShell）

### 13.1 Link check — 验证所有内部链接

```powershell
Set-Location 'D:\WorkSpace\SerialCubeWeb'
$bad = @()
Get-ChildItem -Recurse -File -Filter '*.md' | Where-Object {
  $_.FullName -notlike '*.minimax*' -and $_.FullName -notlike '*.git*'
} | ForEach-Object {
  $file = $_.FullName
  $dir = Split-Path $file -Parent
  (Get-Content $file -Encoding UTF8) | Select-String -Pattern '\]\(([^)]+)\)' | ForEach-Object {
    # v1.3.5 P0 修: 遍历该行全部链接 (旧代码 $_.Matches[0] 只查第 1 个, 多链接行漏检)
    $_.Matches | ForEach-Object {
      $target = $_.Groups[1].Value
      # 跳过外部链接 / 锚点 (注意: 不要跳过 ./ 与 ../ 相对链接 — 旧正则里的 \. 会误吞它们)
      if ($target -match '^(https?:|mailto:|#)') { return }
      $clean = $target -replace '#.*$', ''
      if ([string]::IsNullOrWhiteSpace($clean)) { return }
      $resolved = if ($clean.StartsWith('/')) { Join-Path (Get-Location).Path $clean.TrimStart('/') } else { Join-Path $dir $clean }
      $resolved = $resolved -replace '/', '\'
      if (-not (Test-Path $resolved)) {
        $script:bad += [PSCustomObject]@{ Source = $file.Replace((Get-Location).Path + '\', ''); Target = $target }
      }
    }
  }
}
if ($bad.Count -eq 0) { Write-Host '✅ 链接全通' -ForegroundColor Green } else { Write-Host "❌ $($bad.Count) 个坏链接"; $bad | Format-Table -AutoSize }
```

### 13.2 改某文档后找引用方

```powershell
# 改了 docs/reference/ARCHITECTURE.md
Select-String -Path 'docs' -Pattern 'ARCHITECTURE\.md' -Recurse
# 看哪些文档引用了它
```

### 13.3 找所有 "TODO" / "FIXME"

```powershell
Select-String -Path 'docs' -Pattern 'TODO|FIXME|XXX' -Recurse
```

### 13.4 改 SerialCube.html 前必查的引用

```powershell
# VERSION / 1.0.0 / changelog 段
Select-String -Path 'docs' -Pattern '1\.0\.0' -Recurse
Select-String -Path 'docs' -Pattern 'VERSION' -Recurse
```

### 13.5 跑完自检

每次 commit 前:
1. 跑 § 13.1 link check
2. 跑 § 13.2 看引用方是否需要同步
3. 跑 § 13.4 如果改了 SerialCube.html
4. 全部 ✅ 才能 commit
