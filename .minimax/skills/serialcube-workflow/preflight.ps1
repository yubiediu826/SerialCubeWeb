<#
.SYNOPSIS
  SerialCube pre-flight health check before editing SerialCube.html

.DESCRIPTION
  Detects broken tools, PowerShell traps, and agent-browser fallback paths
  BEFORE you start editing. Avoid wasting 30+ minutes on a stuck tool.

  Checks (3 categories, 9 items):
    [1] Tool health (4): agent-browser / git / node / pwsh version
    [2] PowerShell traps (3): ReadLine / commit msg file / git proxy port
    [3] agent-browser fallback (2): interactive probe / static grep ready

  Output: JSON to stdout (with -Json) or human summary (default).
  Exit code: 0=ok, 1=warn(continue), 2=block(stop)

.EXAMPLE
  pwsh -File preflight.ps1
  pwsh -File preflight.ps1 -Json
  pwsh -File preflight.ps1 -Quiet

.NOTES
  PowerShell 5.1 compatible (UTF-8 with BOM, single quotes, Start-Job)
#>

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$Quiet
)

$ErrorActionPreference = 'Continue'
$results = @()
$blocking = 0
$warning = 0

function Add-Check {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Detail = '',
        [string]$Fallback = ''
    )
    $script:results += [PSCustomObject]@{
        name     = $Name
        status   = $Status
        detail   = $Detail
        fallback = $Fallback
    }
    switch ($Status) {
        'pass' { }
        'warn' { $script:warning++ }
        'fail' { $script:blocking++ }
    }
    if (-not $Quiet -and -not $Json) {
        $color = switch ($Status) { 'pass' { 'Green' } 'warn' { 'Yellow' } 'fail' { 'Red' } }
        $icon  = switch ($Status) { 'pass' { '[OK]' } 'warn' { '[!]' } 'fail' { '[X]' } }
        Write-Host ("  {0} {1,-32} {2}" -f $icon, $Name, $Detail) -ForegroundColor $color
    }
}

# ===== [1] Tool health (4) =====

try {
    $abVer = (& agent-browser --version 2>&1) | Select-Object -First 1
    if ($abVer -match '\d+\.\d+') {
        Add-Check -Name 'agent-browser' -Status 'pass' -Detail $abVer.Trim()
    }
    else {
        Add-Check -Name 'agent-browser' -Status 'fail' -Detail 'version not recognized' -Fallback 'use static grep on SerialCube.html'
    }
}
catch {
    Add-Check -Name 'agent-browser' -Status 'fail' -Detail 'unreachable' -Fallback 'static grep + html direct read'
}

try {
    $gitVer = (& git --version 2>&1) | Select-Object -First 1
    if ($gitVer -match 'git version') {
        Add-Check -Name 'git' -Status 'pass' -Detail $gitVer.Trim()
    }
    else {
        Add-Check -Name 'git' -Status 'warn' -Detail 'abnormal version'
    }
}
catch {
    Add-Check -Name 'git' -Status 'fail' -Detail 'unreachable'
}

try {
    $nodeVer = (& node --version 2>&1) | Select-Object -First 1
    if ($nodeVer -match 'v\d+') {
        Add-Check -Name 'node' -Status 'pass' -Detail $nodeVer.Trim()
    }
    else {
        Add-Check -Name 'node' -Status 'warn' -Detail 'not recognized'
    }
}
catch {
    Add-Check -Name 'node' -Status 'warn' -Detail 'unreachable (subagent cannot run node scripts)' -Fallback 'subagent uses pwsh instead'
}

$psVer = $PSVersionTable.PSVersion
if ($psVer.Major -ge 7) {
    Add-Check -Name 'pwsh' -Status 'pass' -Detail "v$psVer (Core)"
}
else {
    Add-Check -Name 'pwsh' -Status 'warn' -Detail "v$psVer (5.1 Desktop) - Start-Job timeout inaccurate" -Fallback 'use Start-Process + pipe stdin'
}

# ===== [2] PowerShell traps (3) =====

try {
    $testJob = Start-Job -ScriptBlock { [Console]::ReadLine() } -ErrorAction Stop
    $completed = Wait-Job $testJob -Timeout 3
    if ($completed) {
        Stop-Job $testJob -ErrorAction SilentlyContinue
        Remove-Job $testJob -ErrorAction SilentlyContinue
        Add-Check -Name 'PS ReadLine (3s)' -Status 'pass' -Detail 'interactive bump-version.ps1 available'
    }
    else {
        Stop-Job $testJob -ErrorAction SilentlyContinue
        Remove-Job $testJob -ErrorAction SilentlyContinue
        Add-Check -Name 'PS ReadLine (3s)' -Status 'warn' -Detail 'no response in 3s' -Fallback 'echo y | script.ps1 or Start-Process pipe stdin'
    }
}
catch {
    Add-Check -Name 'PS ReadLine (3s)' -Status 'fail' -Detail "ERR: $($_.Exception.Message)" -Fallback 'manual VERSION + changelog edit'
}

$msgTestPath = Join-Path $PSScriptRoot '.preflight-msg-test.txt'
try {
    'test' | Out-File -FilePath $msgTestPath -Encoding utf8 -ErrorAction Stop
    if (Test-Path $msgTestPath) {
        Remove-Item $msgTestPath -Force -ErrorAction SilentlyContinue
        Add-Check -Name 'commit msg file path' -Status 'pass' -Detail 'can write commit msg to file'
    }
    else {
        Add-Check -Name 'commit msg file path' -Status 'warn' -Detail 'not found after write'
    }
}
catch {
    Add-Check -Name 'commit msg file path' -Status 'fail' -Detail "write failed: $($_.Exception.Message)" -Fallback 'git commit -m short EN message'
}

$proxy = & git config --get http.proxy 2>&1
if ($proxy -and $proxy -match '127\.0\.0\.1:(\d+)') {
    $port = $Matches[1]
    $testConn = Test-NetConnection -ComputerName '127.0.0.1' -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($testConn) {
        Add-Check -Name "git proxy :$port" -Status 'pass' -Detail 'proxy reachable'
    }
    else {
        Add-Check -Name "git proxy :$port" -Status 'warn' -Detail 'proxy configured but not reachable' -Fallback 'git push -c http.proxy= bypass'
    }
}
else {
    Add-Check -Name 'git proxy' -Status 'pass' -Detail 'no proxy, direct connect'
}

# ===== [3] agent-browser fallback (2) =====

# PS 5.1 兼容: Join-Path 一次只接受一个 path segment, 嵌套调用
# PSScriptRoot = .../serialcube-workflow (skill dir), 需向上 3 层到工作区根
$repoRoot = $PSScriptRoot
for ($i = 0; $i -lt 3; $i++) {
    $repoRoot = Split-Path -Parent $repoRoot
}
$serialCubeHtml = Join-Path $repoRoot 'SerialCube.html'
if (Test-Path $serialCubeHtml) {
    $lineCount = (Get-Content $serialCubeHtml).Count
    Add-Check -Name 'static grep fallback' -Status 'pass' -Detail "SerialCube.html $lineCount lines, Select-String ready"
}
else {
    Add-Check -Name 'static grep fallback' -Status 'fail' -Detail 'SerialCube.html not in workspace root'
}

if ($results[0].status -ne 'fail') {
    try {
        $abTestJob = Start-Job -ScriptBlock { agent-browser --help 2>&1 | Out-String } -ErrorAction Stop
        $abDone = Wait-Job $abTestJob -Timeout 5
        if ($abDone) {
            Remove-Job $abTestJob -ErrorAction SilentlyContinue
            Add-Check -Name 'agent-browser --help (5s)' -Status 'pass' -Detail 'responsive, safe to use'
        }
        else {
            Stop-Job $abTestJob -ErrorAction SilentlyContinue
            Remove-Job $abTestJob -ErrorAction SilentlyContinue
            Add-Check -Name 'agent-browser --help (5s)' -Status 'warn' -Detail 'no response in 5s' -Fallback 'use eval directly (skip full snapshot)'
        }
    }
    catch {
        Add-Check -Name 'agent-browser --help (5s)' -Status 'warn' -Detail "ERR: $($_.Exception.Message)"
    }
}

# ===== Output =====

$summary = [PSCustomObject]@{
    blocking = $blocking
    warning  = $warning
    total    = $results.Count
    results  = $results
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 3
}
elseif (-not $Quiet) {
    Write-Host ''
    Write-Host ('  Summary: {0} total / {1} block / {2} warn' -f $summary.total, $summary.blocking, $summary.warning)
    if ($blocking -gt 0) {
        Write-Host '  [X] blocking items, fix first' -ForegroundColor Red
    }
    elseif ($warning -gt 0) {
        Write-Host '  [!] warnings present, can continue with fallback notes' -ForegroundColor Yellow
    }
    else {
        Write-Host '  [OK] all clear, start editing' -ForegroundColor Green
    }
}

if ($blocking -gt 0) { exit 2 }
elseif ($warning -gt 0) { exit 1 }
else { exit 0 }
