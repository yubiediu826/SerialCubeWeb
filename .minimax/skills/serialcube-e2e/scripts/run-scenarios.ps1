# -*- encoding: utf-8 -*-
<#
.SYNOPSIS
  跑 SerialCube.html 的 e2e 场景（21 个）+ agent-browser 编排。

.DESCRIPTION
  v1.1 重构版：解决"频繁卡住 + 不知道卡还是跑"问题。
    - 命名 session（避免与 default session 互相 hijack / 僵尸进程累积）
    - 跑前杀 Chrome 僵尸 + 干净 session
    - 跑前 wait 网络 idle，结束 close --all 回收
    - 截图改为按需（默认失败才截 + 跑后摘要）
    - 21 个场景全支持（不再只 6 个）
    - scenario 17 (mutator-inject) 自动启用双 session (0/1) BroadcastChannel 模式
    - **v1.1 新增**: 按 module 分类跑 (smoke/monitor/dashboard/config/edit/modal/debug/all)
    - **v1.1 新增**: 实时进度 + ETA (总进度 [N/21] + 单场景 [m/n] + ETA mm:ss)
    - **v1.1 新增**: 用 [Console]::WriteLine 避免 PS 5.1 Write-Host 中文乱码

.PARAMETER Scenario
  跑哪些场景。例: '01', '01,03,05', 'all', 'smoke'(=01+04), 'core'(=01-06)。
  跟 -Module 互斥（-Module 优先）。

.PARAMETER Module
  按功能模块跑。预设:
    smoke     = 01 + 04                       (1.5 min, 跑通即可)
    monitor   = 01 + 02 + 03 + 05             (串口监视/解析, 3 min)
    dashboard = 07 + 10 + 14                  (仪表盘, 2 min)
    config    = 04 + 11 + 12 + 15             (协议配置中心, 4 min)
    edit      = 08 + 09                       (命令/告警编辑, 8 min, 53 cmds)
    modal     = 13 + 19 + 20 + 21             (modal 一致性 + cascade, 6 min)
    debug     = 16 + 17 + 18                  (调试面板, 5 min)
    core      = 01-06                         (旧 core 模式, 4 min)
    all       = 01-21                         (全跑, ~30 min)

.PARAMETER Url
  SerialCube.html 的 file:// URL。

.PARAMETER Session
  命名 session 前缀（避免共享 default）。默认 'e2e' + 时间戳。
  scenario 17 会用 'e2e-bc-0' / 'e2e-bc-1' 双 session。

.PARAMETER WithScreenshot
  强制每个场景结尾截图（默认 off：只有失败才截 + 跑后摘要）。

.PARAMETER Cleanup
  跑前清理僵尸 Chrome（默认 $true）。--no-cleanup 跳过。

.PARAMETER WatchTimeout
  跑前 wait 网络空闲超时秒数（默认 8s）。

.PARAMETER Manual
  手动模式：只打印场景大纲 + 设好命名 session + 杀僵尸，
  不跑 batch — 让 AI (用户 / subagent) 用 agent-browser 逐条交互执行。
  适合旧场景 01-06 (含 @eN 占位 ref) 和所有需要看 snapshot 决策的场景。

.EXAMPLE
  .\run-scenarios.ps1 -Module smoke                          # 跑 01+04 (1.5 min)
  .\run-scenarios.ps1 -Module monitor                        # 跑监视/解析 4 个
  .\run-scenarios.ps1 -Module config                         # 跑协议配置 4 个
  .\run-scenarios.ps1 -Scenario '09,13'                      # 自定义编号
  .\run-scenarios.ps1 -Module all -WithScreenshot            # 全跑且每场景截图
  .\run-scenarios.ps1 -Module modal                          # 跑 modal + cascade 4 个
  .\run-scenarios.ps1 -Manual -Module edit                   # 设好 session + 打印 edit 大纲
  .\run-scenarios.ps1 -NoCleanup -Module smoke               # 跳过 Chrome 清理（debug 用）
#>
[CmdletBinding()]
param(
    [string]$Scenario,
    [string]$Module,
    [string]$Url = 'file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html',
    [string]$Session = "e2e-$((Get-Date).ToString('HHmmss'))",
    [switch]$WithScreenshot,
    [switch]$NoCleanup,
    [switch]$Manual,
    [int]$WatchTimeout = 8
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

# 解决 PS 5.1 Write-Host 中文乱码 (terminal-utf8 skill): 强制刷 [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ----------------------------------------------------------------------------
# 进度条工具（[Console]::WriteLine 严格遵守 UTF-8）
# ----------------------------------------------------------------------------
function Write-Progress {
    param([int]$Done, [int]$Total, [string]$Label = '')
    $pct = [int](($Done / $Total) * 100)
    $bar = '█' * [int]($pct / 5) + '░' * (20 - [int]($pct / 5))
    [Console]::WriteLine(("  [{0}] {1,3}%  ({2}/{3})  {4}" -f $bar, $pct, $Done, $Total, $Label))
}

function Write-Eta {
    param([int]$Done, [int]$Total, $StartTime)
    if ($Done -le 0) { return }
    $elapsed = (Get-Date) - $StartTime
    $avg = $elapsed.TotalSeconds / $Done
    $remaining = $Total - $Done
    $etaSec = [int]($avg * $remaining)
    $ts = [TimeSpan]::FromSeconds($etaSec)
    [Console]::WriteLine(("       ETA: {0:mm\:ss}  (avg {1:n1}s/scenario, {2} done)" -f $ts, $avg, $Done))
}

# ----------------------------------------------------------------------------
# 前置检查
# ----------------------------------------------------------------------------
$ab = Get-Command agent-browser -ErrorAction SilentlyContinue
if (-not $ab) { [Console]::WriteLine("[X] agent-browser 不在 PATH, 先跑: npm install -g agent-browser"); exit 1 }

$serialCube = ($Url -replace '^file:///', '') | Split-Path -Leaf
$serialCubePath = $Url -replace '^file:///', ''
if (-not (Test-Path $serialCubePath)) {
    [Console]::WriteLine("[X] SerialCube.html 不在: $serialCubePath"); exit 1
}

# ----------------------------------------------------------------------------
# 解析场景 (按 -Module 或 -Scenario)
# ----------------------------------------------------------------------------
$allScenarios = Get-ChildItem "$PSScriptRoot\..\scenarios" -Filter '*.md' |
    Where-Object { $_.BaseName -match '^\d{2}-' } |
    Sort-Object Name | ForEach-Object { $_.BaseName.Substring(0,2) }

# v1.1: 模块路由
$modules = @{
    'smoke'     = @('01','04')
    'core'      = @('01','02','03','04','05','06')
    'monitor'   = @('01','02','03','05')
    'dashboard' = @('07','10','14')
    'config'    = @('04','11','12','15')
    'edit'      = @('08','09')
    'modal'     = @('13','19','20','21')
    'debug'     = @('16','17','18')
    'all'       = $allScenarios
}

if ($Module) {
    if (-not $modules.ContainsKey($Module)) {
        [Console]::WriteLine("[X] 未知模块: $Module. 可用: $($modules.Keys -join ', ')")
        exit 1
    }
    $selected = $modules[$Module]
    $mode = "module:$Module"
} else {
    switch -Regex ($Scenario) {
        '^all$'   { $selected = $allScenarios; $mode = 'all' }
        '^smoke$' { $selected = @('01','04'); $mode = 'smoke' }
        '^core$'  { $selected = @('01','02','03','04','05','06'); $mode = 'core' }
        default   {
            if (-not $Scenario) { $selected = @('01','04'); $mode = 'default-smoke' }
            else {
                $selected = $Scenario -split '[,\s]+' | Where-Object { $_ } | ForEach-Object { $_.Trim().PadLeft(2,'0') }
                $mode = 'custom'
            }
        }
    }
}

$valid = $selected | Where-Object { $allScenarios -contains $_ }
if ($valid.Count -ne $selected.Count) {
    $missing = $selected | Where-Object { $allScenarios -notcontains $_ }
    [Console]::WriteLine("[!] 跳过不存在场景: $($missing -join ', ')")
}
if (-not $valid) { [Console]::WriteLine("[X] 没有有效场景可跑"); exit 1 }

# ----------------------------------------------------------------------------
# 跑前清理（关键：解决僵尸 Chrome 累积）
# ----------------------------------------------------------------------------
if (-not $NoCleanup) {
    [Console]::WriteLine("==> 清理僵尸 Chrome (启动 > 10 分钟的进程)")
    $zombies = Get-Process chrome -ErrorAction SilentlyContinue |
        Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-10) }
    if ($zombies) {
        [Console]::WriteLine("    杀 $($zombies.Count) 个 Chrome")
        $zombies | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    [Console]::WriteLine("==> 关闭所有 agent-browser session")
    & agent-browser close --all 2>$null | Out-Null
    Start-Sleep -Seconds 1
}

# ----------------------------------------------------------------------------
# 输出计划
# ----------------------------------------------------------------------------
[Console]::WriteLine("")
[Console]::WriteLine("================================================================")
[Console]::WriteLine("  SerialCube E2E  ($mode 模式, $($valid.Count) 场景)")
[Console]::WriteLine("  场景: $($valid -join ', ')")
[Console]::WriteLine("  Session: $Session")
[Console]::WriteLine("  URL: $Url")
[Console]::WriteLine("  截图: $(if ($WithScreenshot) {'每场景结尾'} else {'仅失败'})")
[Console]::WriteLine("  时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[Console]::WriteLine("================================================================")
[Console]::WriteLine("")

# ----------------------------------------------------------------------------
# Manual 模式
# ----------------------------------------------------------------------------
if ($Manual) {
    [Console]::WriteLine("")
    [Console]::WriteLine("  Manual 模式 — 准备好命名 session + 杀完僵尸, 不自动跑")
    [Console]::WriteLine("")
    [Console]::WriteLine("  用法: `$env:AGENT_BROWSER_SESSION='$Session'")
    [Console]::WriteLine("        agent-browser open '$Url'")
    [Console]::WriteLine("        agent-browser snapshot -i      # 看 @eN ref")
    [Console]::WriteLine("        agent-browser click @e<N>      # 跟场景文档走")
    [Console]::WriteLine("")
    [Console]::WriteLine("----------------------------------------------------------------")
    [Console]::WriteLine("  场景大纲")
    [Console]::WriteLine("----------------------------------------------------------------")
    foreach ($s in $valid) {
        $f = Get-ChildItem "$PSScriptRoot\..\scenarios\$s-*.md" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($f) {
            [Console]::WriteLine("")
            [Console]::WriteLine("[$s] $($f.BaseName)")
            Get-Content $f.FullName | Select-Object -First 30 | ForEach-Object { [Console]::WriteLine("  $_") }
        }
    }
    $env:AGENT_BROWSER_SESSION = $null
    exit 0
}

# ----------------------------------------------------------------------------
# 主循环: 逐场景跑, 带实时进度
# ----------------------------------------------------------------------------
$results = @()
$failed  = @()
$totalStart = Get-Date
$env:AGENT_BROWSER_SESSION = $Session
$idx = 0
$totalScenarios = $valid.Count

foreach ($s in $valid) {
    $idx++
    $scenarioFile = Get-ChildItem "$PSScriptRoot\..\scenarios\$s-*.md" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $scenarioFile) { [Console]::WriteLine("[!] 场景 $s 文件不存在, 跳过"); continue }

    $isBcTest = $s -eq '17'

    [Console]::WriteLine("")
    [Console]::WriteLine("----------------------------------------------------------------")
    [Console]::WriteLine("[$idx/$totalScenarios] $($scenarioFile.BaseName)  ($((Get-Date).ToString('HH:mm:ss')))")
    [Console]::WriteLine("----------------------------------------------------------------")

    # 实时进度条 + ETA
    Write-Progress -Done ($idx - 1) -Total $totalScenarios -Label '总进度'
    if ($idx -gt 1) { Write-Eta -Done ($idx - 1) -Total $totalScenarios -StartTime $totalStart }

    $start = Get-Date
    $status = 'pass'
    $note = ''

    try {
        # 解析场景命令（除 # 注释、空行）
        $rawLines = Get-Content $scenarioFile.FullName |
            Where-Object { $_ -match '^\s*agent-browser ' -and $_ -notmatch '^\s*#' } |
            ForEach-Object { $_ -replace '^\s*agent-browser\s+', '' }

        # 检测「交互式」场景：用了 @e<N> 占位 ref — 不能 batch 自动跑
        $needsAi = $rawLines | Where-Object { $_ -match '@e<\w+>' }
        $cmds = $rawLines | Where-Object { $_ -notmatch '@e<\w+>' }
        $cmds = $cmds | Where-Object { $_ -notmatch '^\s*sleep\s+' }

        if (-not $cmds -and -not $needsAi) {
            $status = 'skip'; $note = '无 agent-browser 命令'
            [Console]::WriteLine("  ⊘ SKIP: 无 agent-browser 命令")
        } elseif ($needsAi -and -not $cmds) {
            $status = 'interactive'; $note = "需要 AI 跟随 ($($needsAi.Count) 处 @eN 占位), 不可 batch"
            [Console]::WriteLine("  ⚠ INTERACTIVE: $($needsAi.Count) 处 @eN 占位, 需 AI 跟手")
        } else {
            [Console]::WriteLine("  共 $($cmds.Count) 条 batch 命令 (跳过 $($needsAi.Count) 处 @eN 占位 + $($rawLines.Count - $cmds.Count - $needsAi.Count) 条 sleep)")

            if ($isBcTest) { $env:AGENT_BROWSER_SESSION = "$Session-bc-0" }

            # 逐条执行 (不用 agent-browser batch 内部命令, 这样能显示每条进度)
            $batchFail = $false
            $cmdsTotal = $cmds.Count
            $cmdIdx = 0
            foreach ($cmd in $cmds) {
                $cmdIdx++
                $cmdShort = if ($cmd.Length -gt 70) { $cmd.Substring(0, 67) + '...' } else { $cmd }
                $cmdStart = Get-Date
                $output = & agent-browser $cmd 2>&1
                $cmdExit = $LASTEXITCODE
                $cmdDur = [int]((Get-Date) - $cmdStart).TotalSeconds
                if ($cmdExit -ne 0) {
                    [Console]::WriteLine("  ✗ [$cmdIdx/$cmdsTotal] FAIL (${cmdDur}s) $cmdShort")
                    [Console]::WriteLine("    " + ($output | Select-Object -Last 3 | Out-String).Trim())
                    $batchFail = $true
                    break
                } else {
                    [Console]::WriteLine("  ✓ [$cmdIdx/$cmdsTotal] (${cmdDur}s) $cmdShort")
                }
            }

            if ($isBcTest) { $env:AGENT_BROWSER_SESSION = $Session }

            if ($batchFail) {
                $status = 'fail'
                $note = "第 $cmdIdx 条命令失败"
            } else {
                if ($needsAi) {
                    $status = 'partial'; $note = "batch 通过 + 剩余 $($needsAi.Count) 步需 AI 交互验证"
                    [Console]::WriteLine("  ⚠ batch 通过 + 剩余 $($needsAi.Count) 步需 AI 跟")
                } else {
                    [Console]::WriteLine("  ✓ batch 通过")
                }
            }
        }

        # 截图（按需）
        $shotPath = "$PSScriptRoot\..\screenshots\$($scenarioFile.BaseName).png"
        if ($WithScreenshot -or $status -eq 'fail') {
            New-Item -ItemType Directory -Path (Split-Path $shotPath) -Force | Out-Null
            & agent-browser screenshot $shotPath 2>$null | Out-Null
            if (Test-Path $shotPath) {
                [Console]::WriteLine("  📷 $($status -eq 'fail' ? '失败' : '完成')截图: $shotPath")
            }
        }
    } catch {
        $status = 'fail'; $note = $_.Exception.Message
        [Console]::WriteLine("  ✗ 异常: $note")
    }

    $dur = [int]((Get-Date) - $start).TotalSeconds
    $statusEmoji = switch ($status) {
        'pass'       { '✓ PASS' }
        'fail'       { '✗ FAIL' }
        'partial'    { '⚠ PARTIAL' }
        'interactive'{ '⚠ INTERACTIVE' }
        'skip'       { '⊘ SKIP' }
    }
    [Console]::WriteLine("  ─ $statusEmoji ($dur s) $note")

    $results += [PSCustomObject]@{ No=$s; Name=$scenarioFile.BaseName; Status=$status; DurationSec=$dur; Note=$note }
    if ($status -eq 'fail') { $failed += $s }

    # 每个场景结束强制清 session
    if ($isBcTest) {
        $env:AGENT_BROWSER_SESSION = "$Session-bc-1"
        & agent-browser close 2>$null | Out-Null
    } else {
        & agent-browser close 2>$null | Out-Null
    }
}

# 100% 进度
[Console]::WriteLine("")
Write-Progress -Done $totalScenarios -Total $totalScenarios -Label '完成'
Write-Eta -Done $totalScenarios -Total $totalScenarios -StartTime $totalStart

# ----------------------------------------------------------------------------
# 总结
# ----------------------------------------------------------------------------
$totalDur = [int]((Get-Date) - $totalStart).TotalSeconds
[Console]::WriteLine("")
[Console]::WriteLine("================================================================")
[Console]::WriteLine("  跑完 — 模式=$mode, 场景=$($valid.Count), 用时=${totalDur}s")
[Console]::WriteLine("================================================================")

# 表格
$table = $results | Format-Table No, Status, DurationSec, Name, Note -AutoSize | Out-String
[Console]::WriteLine($table)

# 写回报告
$reportDir = "$PSScriptRoot\..\reports"
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
$passCount    = ($results | Where-Object Status -eq 'pass').Count
$failCount    = ($results | Where-Object Status -eq 'fail').Count
$partialCount = ($results | Where-Object Status -eq 'partial').Count
$interCount   = ($results | Where-Object Status -eq 'interactive').Count
$skipCount    = ($results | Where-Object Status -eq 'skip').Count
$lastRun = @{
    ran_at    = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    mode      = $mode
    scenarios = $valid
    total_sec = $totalDur
    pass      = $passCount
    fail      = $failCount
    partial   = $partialCount
    interactive = $interCount
    skip      = $skipCount
    results   = $results
} | ConvertTo-Json -Depth 5 -AsArray
$lastRun | Set-Content -Path "$reportDir\last-run.json" -Encoding UTF8
[Console]::WriteLine("  报告: $reportDir\last-run.json")

# 收尾
$env:AGENT_BROWSER_SESSION = $null
& agent-browser close --all 2>$null | Out-Null

[Console]::WriteLine("")
[Console]::WriteLine("  pass=$passCount  fail=$failCount  partial=$partialCount  interactive=$interCount  skip=$skipCount")

if ($failCount -gt 0) {
    [Console]::WriteLine("  ✗ 失败场景: $($failed -join ', ')")
    exit 1
}
if ($partialCount -gt 0 -or $interCount -gt 0) {
    [Console]::WriteLine("  ⚠ 有 partial/interactive 场景, 需 AI 跟手验证")
    exit 0
}
[Console]::WriteLine("  ✓ 全部通过")
exit 0
