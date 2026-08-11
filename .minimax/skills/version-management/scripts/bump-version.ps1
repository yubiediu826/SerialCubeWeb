<#
.SYNOPSIS
  Bump SerialCube.html 的 VERSION 常量 + 在 changelog 段顶部插入新版本记录。

.DESCRIPTION
  解析 SerialCube.html 的 'const VERSION = 'X.Y.Z'' 常量,
  按 -Level 升级版本号, 插入一段 <div class="version-release"> 到
  <div class="version-changelog-title"> 之后。

  流程: 读 -> parse -> bump -> 输出 diff -> 等用户 y/N -> 改文件。
  不自动 commit, 不自动 push, 不自动打 tag。

  PowerShell 5.1 兼容:
    - UTF-8 无 BOM 读写
    - 字符串用单引号
    - [Console]::ReadLine() 用 Start-Job + Wait-Job 做 60s 超时

.PARAMETER Level
  升级级别: major | minor | patch。

.PARAMETER Note
  changelog 段的 <li> 文本, 例: "仪表盘边框"。

.PARAMETER Type
  changelog 段前缀: 新增 | 修复 | 优化 | 文档 | 破坏性。默认 修复。

.EXAMPLE
  pwsh -File scripts/bump-version.ps1 -Level patch -Note "仪表盘边框" -Type 修复
  # 1.0.0 -> 1.0.1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('major', 'minor', 'patch')]
    [string]$Level,

    [Parameter(Mandatory = $true)]
    [string]$Note,

    [Parameter(Mandatory = $false)]
    [ValidateSet('新增', '修复', '优化', '文档', '破坏性')]
    [string]$Type = '修复'
)

$ErrorActionPreference = 'Stop'

# ----- 1. 定位 SerialCube.html -----
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..\..\..')).Path
$HtmlPath = Join-Path $RepoRoot 'SerialCube.html'

if (-not (Test-Path -LiteralPath $HtmlPath)) {
    Write-Host '[X] 错误: 找不到 SerialCube.html (期望: ' $HtmlPath ')' -ForegroundColor Red
    exit 1
}

# ----- 2. 读文件 (UTF-8 无 BOM) -----
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($HtmlPath, $Utf8NoBom)

# ----- 3. 解析当前 VERSION -----
$VersionPattern = "const VERSION = '([0-9]+\.[0-9]+\.[0-9]+)'"
$match = [regex]::Match($content, $VersionPattern)
if (-not $match.Success) {
    Write-Host '[X] 错误: 在 SerialCube.html 找不到 const VERSION = X.Y.Z 模式' -ForegroundColor Red
    Write-Host '    请检查 L8068 附近是否有 const VERSION = ' -ForegroundColor Red
    exit 1
}

$currentVersion = $match.Groups[1].Value
$parts = $currentVersion.Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

# ----- 4. 按 Level bump -----
switch ($Level) {
    'major' { $major++; $minor = 0; $patch = 0 }
    'minor' { $minor++; $patch = 0 }
    'patch' { $patch++ }
}
$newVersion = "$major.$minor.$patch"
$today = Get-Date -Format 'yy/M/d'

# ----- 5. 打印 diff 给用户审 -----
Write-Host ''
Write-Host '提议变更:' -ForegroundColor Cyan
Write-Host ('  VERSION:  {0} -> {1}' -f $currentVersion, $newVersion)
Write-Host ('  新增 changelog 段:  {0} 版本 · {1}' -f $newVersion, $today)
Write-Host ('    <li>{0}: {1}</li>' -f $Type, $Note)
Write-Host ''

# ----- 6. 等待 y/N (60s 默认 n) -----
Write-Host -NoNewline '确认变更? (y/N) '

# 检测非交互式环境 (CI / agent 跑) -> 直接拒绝, 避免误改
if ([Environment]::UserInteractive -eq $false) {
    Write-Host ''
    Write-Host '[!] 非交互式环境, 默认 n (拒绝改动)' -ForegroundColor Yellow
    Write-Host '    请在真实终端中重新运行此脚本' -ForegroundColor Yellow
    exit 0
}

$readJob = Start-Job -ScriptBlock { [Console]::ReadLine() }
$answered = Wait-Job $readJob -Timeout 60
if ($answered) {
    $answer = (Receive-Job $readJob).Trim()
} else {
    Stop-Job $readJob | Out-Null
    Write-Host ''
    Write-Host '[!] 60s 内未输入, 默认 n' -ForegroundColor Yellow
    $answer = 'n'
}
Remove-Job $readJob -Force | Out-Null

if (($answer -ne 'y') -and ($answer -ne 'Y')) {
    Write-Host '[!] 已取消, SerialCube.html 未改动' -ForegroundColor Yellow
    exit 0
}

# ----- 7. 应用变更 1: VERSION 常量 -----
$oldLine = "const VERSION = '$currentVersion'"
$newLine = "const VERSION = '$newVersion'"
if (-not $content.Contains($oldLine)) {
    Write-Host '[X] 错误: regex match 成功但找不到原文' $oldLine ', 文件可能已被改' -ForegroundColor Red
    exit 1
}
$newContent = $content.Replace($oldLine, $newLine)

# ----- 8. 应用变更 2: 在 changelog title 之后插入新 release -----
$titleAnchor = '          <div class="version-changelog-title">更新日志</div>'
if (-not $newContent.Contains($titleAnchor)) {
    Write-Host '[X] 错误: 找不到 changelog title anchor' -ForegroundColor Red
    Write-Host '    请检查 L8043 附近的 HTML 结构' -ForegroundColor Red
    exit 1
}

$newRelease = @"

          <div class="version-release">
            <strong>${newVersion} 版本 · ${today}</strong>
            <ul>
              <li>${Type}: ${Note}</li>
            </ul>
          </div>
"@

$newContent = $newContent.Replace($titleAnchor, $titleAnchor + $newRelease)

# ----- 9. 写回 (UTF-8 无 BOM) -----
[System.IO.File]::WriteAllText($HtmlPath, $newContent, $Utf8NoBom)

# ----- 10. 收尾输出 -----
Write-Host ''
Write-Host '[OK] 已更新 SerialCube.html' -ForegroundColor Green
Write-Host ''
Write-Host '请在 git diff 确认后, 自己 git commit:' -ForegroundColor Cyan
Write-Host '  git add SerialCube.html'
Write-Host ('  git commit -m ''chore(release): bump {0} -> {1}''' -f $currentVersion, $newVersion)
Write-Host ''
Write-Host '可选: commit 后再打 tag' -ForegroundColor Cyan
Write-Host ('  git tag v{0}' -f $newVersion)
Write-Host ''
Write-Host 'push 前务必 ask_user 确认 (硬性要求)' -ForegroundColor Magenta
