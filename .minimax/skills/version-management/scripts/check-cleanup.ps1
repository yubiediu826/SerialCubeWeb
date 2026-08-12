<#
.SYNOPSIS
  检测临时文件和无用脚本残留 (R4.2 防垃圾堆积)

.DESCRIPTION
  在 commit/push 前检测工作区的临时文件 + 无用脚本残留, 防止:
    1. debug-*.js / .tmp-* 临时脚本被误 commit
    2. *.bak / *.orig / *.rej 备份文件残留
    3. COMMIT_MSG.txt / commit-msg.txt 等临时提交文件
    4. docs/verify/ 目录里 verify-task6.js 等已被取代的脚本
    5. preview v1/v2 等中间设计稿 (只留 vN final)

  默认 rule:
    - .gitignore 已忽略的不报 (.tmp, *.bak, *.orig, *.rej, docs/verify/)
    - 工作区根 + 子目录的 debug-* / test-* / report-*.md / COMMIT_MSG.txt
    - docs/design/*-preview-v[0-9]+.html (v1, v2 之类中间稿, 保留 vN final)
    - docs/verify/verify-task6.js (已被 baseline 取代)
    - docs/handover/*-CHECKLIST-*.md (实施期 checklist, 已完结的)

.PARAMETER Strict
  严格模式: 把 WARN 也算 fail (适合 commit hook)

.PARAMETER AutoArchive
  自动归档到 .minimax/archive/cleanup-YYYY-MM-DD/ (而非仅报告)

.EXAMPLE
  pwsh -File check-cleanup.ps1
  pwsh -File check-cleanup.ps1 -Strict
  pwsh -File check-cleanup.ps1 -AutoArchive

.NOTES
  PowerShell 5.1 兼容 (UTF-8 with BOM, single quotes)
#>

[CmdletBinding()]
param(
    [switch]$Strict,
    [switch]$AutoArchive
)

$ErrorActionPreference = 'Continue'

# 定位工作区根
$repoRoot = $PSScriptRoot
for ($i = 0; $i -lt 4; $i++) { $repoRoot = Split-Path -Parent $repoRoot }

$today = Get-Date -Format 'yyyy-MM-dd'
$archiveDir = Join-Path $repoRoot ".minimax\archive\cleanup-$today"

Write-Host "==> Checking temp files / unused scripts in $repoRoot" -ForegroundColor Cyan
Write-Host "    Mode: $(if ($Strict) { 'STRICT (WARN = fail)' } else { 'NORMAL' })$(if ($AutoArchive) { ' + AUTO-ARCHIVE' } else { '' })"
Write-Host ''

# 定义 pattern 规则
# format: @{ pattern; root (相对 repoRoot); type (warn|fail); description }
$rules = @(
    # 工作区根临时文件
    @{ pattern = 'debug-*.js';                 root = '.';           type = 'fail'; desc = 'temp debug script' }
    @{ pattern = 'debug-*.py';                 root = '.';           type = 'fail'; desc = 'temp debug script' }
    @{ pattern = 'test-icons.js';              root = '.';           type = 'fail'; desc = 'temp test script' }
    @{ pattern = 'verify-changes.js';          root = '.';           type = 'fail'; desc = 'one-off verify script' }
    @{ pattern = 'report-task*.md';            root = '.';           type = 'fail'; desc = 'interim task report' }
    @{ pattern = 'COMMIT_MSG.txt';             root = '.';           type = 'fail'; desc = 'temp commit message file' }
    @{ pattern = 'commit-msg.txt';             root = '.';           type = 'fail'; desc = 'temp commit message file' }
    @{ pattern = '.tmp-*.js';                  root = '.';           type = 'fail'; desc = 'temp file' }
    @{ pattern = '.tmp-*.py';                  root = '.';           type = 'fail'; desc = 'temp file' }
    # docs 子目录
    @{ pattern = 'docs\handover\*-CHECKLIST-*.md'; root = 'docs\handover'; type = 'fail'; desc = 'completed implementation checklist' }
    # design preview v1/v2/v3 (中间稿, 保留 vN final, vN+1 也保留作下一版起点)
    @{ pattern = 'docs\design\*-preview-v[0-9]+.html'; root = 'docs\design'; type = 'warn'; desc = 'preview v[0-9]+ (intermediate draft, keep vN+1+ only)' }
    # verify-task6.js (已被 baseline 取代)
    @{ pattern = 'verify-task6.js';            root = 'docs\verify'; type = 'fail'; desc = 'replaced by verify-phase3-baseline.js' }
)

# 收集 git ls-files (tracked) 排除 ignore 的
# 用 git ls-files 拿 tracked, 还要 untracked 用 git status
$gitTracked = @{}
$gitUntracked = @{}

# tracked files
$trackedRaw = & git -C $repoRoot ls-files 2>&1
if ($LASTEXITCODE -eq 0) {
    foreach ($line in $trackedRaw) {
        $line = $line.Trim()
        if ($line) { $gitTracked[$line] = $true }
    }
}

# untracked files
$untrackedRaw = & git -C $repoRoot ls-files --others --exclude-standard 2>&1
if ($LASTEXITCODE -eq 0) {
    foreach ($line in $untrackedRaw) {
        $line = $line.Trim()
        if ($line) { $gitUntracked[$line] = $true }
    }
}

Write-Host "  Scanned: $($gitTracked.Count) tracked + $($gitUntracked.Count) untracked" -ForegroundColor Gray
Write-Host ''

$allFiles = @{}
foreach ($k in $gitTracked.Keys) { $allFiles[$k] = 'tracked' }
foreach ($k in $gitUntracked.Keys) { if (-not $allFiles.ContainsKey($k)) { $allFiles[$k] = 'untracked' } }

$issues = @()
$archived = 0

foreach ($rule in $rules) {
    $searchRoot = if ($rule.root -eq '.') { $repoRoot } else { Join-Path $repoRoot $rule.root }
    if (-not (Test-Path $searchRoot)) { continue }

    Get-ChildItem -Path $searchRoot -Filter (Split-Path $rule.pattern -Leaf) -File -ErrorAction SilentlyContinue | ForEach-Object {
        $relPath = $_.FullName.Substring($repoRoot.Length).TrimStart('\', '/') -replace '\\', '/'
        $issue = [PSCustomObject]@{
            path = $relPath
            type = $rule.type
            desc = $rule.desc
            tracked = if ($allFiles.ContainsKey(($relPath -replace '/', '\'))) { 'tracked' } else { 'untracked' }
        }
        $issues += $issue
    }
}

# 也扫全局 .tmp-* 和 COMMIT_MSG.txt (在所有子目录)
$globalPatterns = @('.tmp-*.js', '.tmp-*.py', 'COMMIT_MSG.txt', 'commit-msg.txt', 'debug-*.js', 'debug-*.py')
foreach ($pat in $globalPatterns) {
    Get-ChildItem -Path $repoRoot -Filter $pat -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $relPath = $_.FullName.Substring($repoRoot.Length).TrimStart('\', '/') -replace '\\', '/'
        # 跳过 archive
        if ($relPath -like '.minimax/archive/*') { return }
        # 跳过已记录的
        if ($issues | Where-Object { $_.path -eq $relPath }) { return }
        $issues += [PSCustomObject]@{
            path = $relPath
            type = 'fail'
            desc = 'global temp pattern match'
            tracked = if ($allFiles.ContainsKey(($relPath -replace '/', '\'))) { 'tracked' } else { 'untracked' }
        }
    }
}

if ($issues.Count -eq 0) {
    Write-Host "  [OK]   No temp files or unused scripts found" -ForegroundColor Green
    Write-Host ''
    exit 0
}

# 输出
$fails = @($issues | Where-Object { $_.type -eq 'fail' })
$warns = @($issues | Where-Object { $_.type -eq 'warn' })

Write-Host "  Found $($issues.Count) issue(s): $($fails.Count) fail, $($warns.Count) warn" -ForegroundColor Yellow
Write-Host ''

# 按 fail / warn 分组输出
foreach ($issue in ($issues | Sort-Object type, path)) {
    $color = if ($issue.type -eq 'fail') { 'Red' } else { 'Yellow' }
    $icon = if ($issue.type -eq 'fail') { '[X]' } else { '[!]' }
    $tag = if ($issue.tracked -eq 'tracked') { 'tracked' } else { 'untracked' }
    Write-Host ("  {0} {1,-50} [{2}] {3}" -f $icon, $issue.path, $tag, $issue.desc) -ForegroundColor $color
}

# Auto-archive: 把所有 fail + warn 的文件移到 archive
if ($AutoArchive -and $issues.Count -gt 0) {
    Write-Host ''
    Write-Host "==> Auto-archiving $($issues.Count) file(s) to $archiveDir" -ForegroundColor Cyan
    if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null }
    foreach ($issue in $issues) {
        $src = Join-Path $repoRoot ($issue.path -replace '/', '\')
        $dest = Join-Path $archiveDir (Split-Path $issue.path -Leaf)
        if ($src -eq $dest) { $dest = Join-Path $archiveDir ([System.Guid]::NewGuid().ToString() + '_' + (Split-Path $issue.path -Leaf)) }
        if (Test-Path $src) {
            Move-Item -Path $src -Destination $dest -Force -ErrorAction SilentlyContinue
            $archived++
        }
    }
    Write-Host "  Archived: $archived file(s)" -ForegroundColor Green
    Write-Host ''
    exit 0
}

# 退出码
if ($fails.Count -gt 0) {
    Write-Host ''
    Write-Host "[X] $($fails.Count) fail(s) need cleanup before commit" -ForegroundColor Red
    Write-Host "    Run with -AutoArchive to move them to .minimax/archive/cleanup-$today/" -ForegroundColor Yellow
    Write-Host "    Or manually delete/move them." -ForegroundColor Yellow
    exit 1
}
elseif ($Strict -and $warns.Count -gt 0) {
    Write-Host ''
    Write-Host "[X] $($warns.Count) warn(s) under STRICT mode" -ForegroundColor Red
    exit 1
}
else {
    Write-Host ''
    Write-Host "[OK] No blocking issues (warns only, not blocking)" -ForegroundColor Green
    exit 0
}
