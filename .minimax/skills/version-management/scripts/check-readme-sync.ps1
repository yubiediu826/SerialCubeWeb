<#
.SYNOPSIS
  检查 README 是否与当前 SerialCube VERSION 同步 (防断档)

.DESCRIPTION
  在 bump-version.ps1 之后, push 之前, 强制检查:
    1. 根 README.md 提了当前 VERSION
    2. docs/README.md 提了当前 VERSION
    3. docs/CHANGELOG.md 索引含当前 VERSION
    4. docs/handover/release-vX.Y.Z-*.md 或 docs/changelog/ 至少 1 个含当前 VERSION

  失败原因: 改了 VERSION 但忘了同步 README/CHANGELOG, push 后文档断档
  何时用: version-management 工作流第 5 步 (commit 前) 或 第 7 步 (push 前)

.PARAMETER Version
  当前 SerialCube.html const VERSION 值。默认从 SerialCube.html 自动读。

.EXAMPLE
  pwsh -File check-readme-sync.ps1
  pwsh -File check-readme-sync.ps1 -Version "1.1.1"

.NOTES
  PowerShell 5.1 兼容 (UTF-8 with BOM, single quotes)
#>

[CmdletBinding()]
param(
    [string]$Version
)

$ErrorActionPreference = 'Continue'

# 自动读 VERSION (SerialCube.html L7900)
if (-not $Version) {
    $serialCubeHtml = Join-Path (Get-Location) 'SerialCube.html'
    if (-not (Test-Path $serialCubeHtml)) {
        # 尝试从脚本目录上溯
        $repoRoot = $PSScriptRoot
        for ($i = 0; $i -lt 3; $i++) { $repoRoot = Split-Path -Parent $repoRoot }
        $serialCubeHtml = Join-Path $repoRoot 'SerialCube.html'
    }
    if (Test-Path $serialCubeHtml) {
        $match = Select-String -Path $serialCubeHtml -Pattern "const VERSION = '([0-9]+\.[0-9]+\.[0-9]+)'" -CaseSensitive:$false | Select-Object -First 1
        if ($match) {
            $Version = $match.Matches[0].Groups[1].Value
        }
        else {
            Write-Host '[X] Cannot read VERSION from SerialCube.html' -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host '[X] SerialCube.html not found' -ForegroundColor Red
        exit 1
    }
}

Write-Host "==> Checking README sync for VERSION $Version" -ForegroundColor Cyan
Write-Host ''

# 定位文件
# PSScriptRoot = .../serialcube-workflow/scripts, 需向上 4 层到工作区根
$repoRoot = $PSScriptRoot
for ($i = 0; $i -lt 4; $i++) { $repoRoot = Split-Path -Parent $repoRoot }

$rootReadme   = Join-Path $repoRoot 'README.md'
$docsReadme   = Join-Path $repoRoot 'docs\README.md'
$changelog    = Join-Path $repoRoot 'docs\CHANGELOG.md'
$handoverDir  = Join-Path $repoRoot 'docs\handover'
$changelogDir = Join-Path $repoRoot 'docs\changelog'

$checks = @()
$failed = 0

# 1. 根 README.md 含 VERSION
$rootMatch = Select-String -Path $rootReadme -Pattern ([regex]::Escape($Version)) -CaseSensitive:$false -ErrorAction SilentlyContinue
if ($rootMatch) {
    Write-Host "  [OK]   README.md mentions v$Version" -ForegroundColor Green
}
else {
    Write-Host "  [X]    README.md does NOT mention v$Version" -ForegroundColor Red
    Write-Host "         Add a section like '## Latest version v$Version' with date" -ForegroundColor Yellow
    $failed++
}

# 2. docs/README.md 含 VERSION
$docsMatch = Select-String -Path $docsReadme -Pattern ([regex]::Escape($Version)) -CaseSensitive:$false -ErrorAction SilentlyContinue
if ($docsMatch) {
    Write-Host "  [OK]   docs/README.md mentions v$Version" -ForegroundColor Green
}
else {
    Write-Host "  [X]    docs/README.md does NOT mention v$Version" -ForegroundColor Red
    Write-Host "         Update the 'Latest version' section in docs/README.md" -ForegroundColor Yellow
    $failed++
}

# 3. CHANGELOG.md 主索引含 VERSION
$changelogMatch = Select-String -Path $changelog -Pattern ([regex]::Escape($Version)) -CaseSensitive:$false -ErrorAction SilentlyContinue
if ($changelogMatch) {
    Write-Host "  [OK]   docs/CHANGELOG.md index lists v$Version" -ForegroundColor Green
}
else {
    Write-Host "  [X]    docs/CHANGELOG.md index does NOT list v$Version" -ForegroundColor Red
    Write-Host "         Add a line in docs/CHANGELOG.md under '2026-MM-DD' section" -ForegroundColor Yellow
    $failed++
}

# 4. docs/handover/release-vX.Y.Z-*.md 或 docs/changelog/ 至少 1 个含 VERSION
$handoverFile = Join-Path $handoverDir "release-v$Version-*.md"
$handoverMatches = Get-ChildItem -Path $handoverFile -ErrorAction SilentlyContinue
$changelogFile = Get-ChildItem -Path $changelogDir -Filter "*-v$Version-*" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($handoverMatches -or $changelogFile) {
    $where = if ($handoverMatches) { "handover/$($handoverMatches[0].Name)" } else { "changelog/$($changelogFile.Name)" }
    Write-Host "  [OK]   $where contains v$Version" -ForegroundColor Green
}
else {
    Write-Host "  [X]    No handover/release or changelog file contains v$Version" -ForegroundColor Red
    Write-Host "         Create one of: docs/handover/release-v$Version-YYYY-MM-DD.md" -ForegroundColor Yellow
    Write-Host "                       docs/changelog/YYYY-MM-DD-v$Version-<topic>.md" -ForegroundColor Yellow
    $failed++
}

# 5. (可选) 根 README 不应该有太旧的 VERSION 标记
$oldVersions = @('v1.0.0')
foreach ($old in $oldVersions) {
    if ($old -eq "v$Version") { continue }
    $oldRootMatch = Select-String -Path $rootReadme -Pattern ([regex]::Escape($old)) -CaseSensitive:$false -ErrorAction SilentlyContinue
    if ($oldRootMatch) {
        Write-Host "  [WARN] README.md still mentions $old (consider updating or removing)" -ForegroundColor Yellow
    }
}

Write-Host ''
if ($failed -gt 0) {
    Write-Host "[X] $failed check(s) failed. Fix README sync issues before committing." -ForegroundColor Red
    Write-Host "    This prevents document drift between code and docs." -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host "[OK] All README sync checks passed for v$Version" -ForegroundColor Green
    exit 0
}
