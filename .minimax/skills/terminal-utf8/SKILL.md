---
name: terminal-utf8
description: "PowerShell 5.1 中文 UTF-8 终端输出守门。Mavis 在 Windows PowerShell 跑任何中文命令（Get-Content / Select-String / git / Test-Path / agent-browser）前必跑，避免中文乱码。两条命令：`chcp 65001` + `$OutputEncoding = [System.Text.Encoding]::UTF8`。持久化写到 `$PROFILE`。"
---

# Terminal UTF-8 — 中文输出守门

> **Mavis 硬性规则**: 在 Windows PowerShell 5.1 上跑任何命令前, **先跑**下面两条命令。违反 = 中文乱码污染输出 = 没法评审结果 = 用户重做。

## 为什么需要

PowerShell 5.1 默认用 **系统 ANSI code page** (中文 Windows 是 CP936 / GBK), 多字节 UTF-8 字符被错误解码成 `??` 或 `�`。
即使源文件是 UTF-8, PowerShell 输出流也按 ANSI 解, **结果全程乱码**。

**典型症状**:
- `Get-Content` 一个 UTF-8 中文文件 → 输出 `?? ????`
- `Select-String` 搜中文 → 模式匹配正常, 输出乱码
- `git status` 含中文路径 → 乱码
- `node script.js` 输出中文 → 乱码

## 临时配置（每个 session 跑一次）

```powershell
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

**说明**:
- `chcp 65001` 改 active code page 为 UTF-8 (Windows-wide)
- `$OutputEncoding` 改 PowerShell 重定向 / 管道的默认编码
- `[Console]::OutputEncoding` 改 Write-Host / 标准输出流编码

## 持久化（写到 PowerShell profile，一劳永逸）

```powershell
# 1. 检查 profile 是否存在
Test-Path $PROFILE

# 2. 如果是 False, 创建空 profile
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }

# 3. 追加 UTF-8 配置到 profile
Add-Content -Path $PROFILE -Value @'

# Mavis: 强制 UTF-8 终端输出 (中文不乱码)
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
'@
```

下次开 PowerShell 自动生效。

## 验证（配置后跑这两个）

```powershell
# 1. code page 应是 65001
chcp
# 输出: Active code page: 65001

# 2. Get-Content 中文文件应不乱码
Get-Content $PROFILE | Select-Object -Last 3
# 输出应该是实际中文, 不是 ??
```

## 反例（不该这么写）

```powershell
# ❌ 不要用 Out-File 不带 -Encoding UTF8
Get-Content foo.md | Out-File bar.txt
# 默认 ANSI → 二次污染

# ❌ 不要用 Set-Content 不带 -Encoding UTF8
Set-Content -Path bar.txt -Value '中文'
# 默认 ANSI

# ✅ 正确: 显式 -Encoding UTF8
Get-Content foo.md -Encoding UTF8 | Out-File bar.txt -Encoding UTF8
Set-Content -Path bar.txt -Value '中文' -Encoding UTF8
```

或者用 `[System.IO.File]` API（永远 UTF-8 无 BOM）:
```powershell
[System.IO.File]::WriteAllText('bar.txt', '中文', [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::ReadAllText('bar.txt', [System.Text.UTF8Encoding]::new($false))
```

## 适用场景

- 所有 `bash` / PowerShell tool 调用跑命令前
- `Get-Content` / `Select-String` 中文文件
- `git` 操作含中文路径
- `node` / `python` 脚本输出中文
- `agent-browser` 命令结果含中文 (a11y tree, snapshot 等)
- `npm test` / `dotnet test` 输出
- 任何 `&&` 链 / 管道 / 重定向

## 不适用场景

- PowerShell 7+ (pwsh) — 默认 UTF-8, 不需要
- 纯 ASCII 输出
- 用 Write tool / Edit tool 写文件 — 工具层是 UTF-8, 不受 PowerShell 控制

## 已知 PS 5.1 bug: Write-Host 在某些场合不遵守 [Console]::OutputEncoding

**症状**: 设了 `chcp 65001` + `[Console]::OutputEncoding = UTF8` 后, `Write-Host` 中文**仍然乱码**。但 `[Console]::WriteLine` 和 `Get-Content -Encoding UTF8` 正常。

**原因**: PS 5.1 Write-Host 内部走 PSHost buffer, 在 PSHostRawUserInterface 上有时不刷新编码设置 (PS 7 已修).

**3 种 workaround (任选)**:

```powershell
# Workaround 1: 调 [Console]::OutputEncoding 两次 (强制刷新)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8  # 第二次触发刷新

# Workaround 2: 用 [Console]::WriteLine 替代 Write-Host (严格遵守 OutputEncoding)
[Console]::WriteLine("测试中文")  # ✅ 不乱码
# Write-Host "测试中文"          # ❌ 可能乱码

# Workaround 3: 加 -NoNewline + 重定向 (走 $OutputEncoding)
Write-Host "测试中文" | Out-File -Encoding UTF8 foo.log  # ✅ 文件 UTF-8 正确
```

**Mavis 强约束**: 跑命令脚本里, **所有中文 Write-Host 必须用 Workaround 1 模式** (重复设 [Console]::OutputEncoding 两次) 或改 [Console]::WriteLine. 评审输出时, 拿乱码 = 拒绝验收.

## 与其他 skill 配合

- `agent-browser` — 跑前先 chcp 65001, 避免 snapshot / console 输出乱码
- `serialcube-e2e` — run-scenarios.ps1 输出含中文, 跑前先 chcp
- `version-management` — bump-version.ps1 输出含中文 changelog
- `verification-before-completion` — 评审中文输出时必跑

## 失败时降级

如果 chcp 65001 后**还乱码** (罕见, 多见于远程 SSH 工具链):
1. 终端自身编码不对 — 换 Windows Terminal / VS Code integrated terminal
2. 源文件实际不是 UTF-8 — `Get-Content foo.md -Raw | Format-Hex | Select-Object -First 1` 看头 3 字节:
   - `EF BB BF` = UTF-8 BOM
   - `FF FE` = UTF-16 LE BOM
   - 无 BOM 但有中文 = 真 UTF-8 (但 ANSI 解会乱码)
3. 真不行就 `Format-Table` / `Out-String` 后 `clip` 复制到 UTF-8 编辑器评审
