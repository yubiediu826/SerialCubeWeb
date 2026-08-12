<#
.SYNOPSIS
  根据改动文件 + 上次通过的 e2e baseline, 智能选要跑的 e2e 场景。

.DESCRIPTION
  不是"省 e2e"而是"省重复跑过的 e2e"。本次改动未涉及的场景可跳过。
  规则:
    1. 任何改 SerialCube.html 都要跑 01 (应用加载)
    2. 按改动文件类型选相关场景 (decision table)
    3. 上次失败的场景必须重跑 (在 baseline.json 标 fail)
    4. 纯 docs 改动不跑 e2e

.PARAMETER ChangedFiles
  改动文件路径数组。git diff --name-only 风格。

.PARAMETER Baseline
  baseline.json 路径。含上次的 pass/fail 记录。

.EXAMPLE
  $files = git diff --name-only HEAD~1 HEAD
  $scenarios = & select-scenarios.ps1 -ChangedFiles $files
  .\run-scenarios.ps1 -Scenario $scenarios

.NOTES
  PowerShell 5.1 兼容。
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$ChangedFiles,
    [string]$Baseline = "$PSScriptRoot\..\reports\baseline.json"
)

# 决策表: [pattern -> scenarios]
$rules = @(
    @{ pattern = 'SerialCube\.html';              scenarios = @('01', '04', '06') }  # 主文件改, 必跑 UI/协议/主题
    @{ pattern = 'system-menu|theme-seg|theme\.se';  scenarios = @('01', '06') }   # 系统菜单/主题
    @{ pattern = 'dh-config-center|protocol';      scenarios = @('01', '04') }   # 协议配置/协议编辑器
    @{ pattern = 'modal.*open|modal.*close';      scenarios = @('01', '04') }   # modal 行为
    @{ pattern = 'edit-mode|toolbar-btn';          scenarios = @('01', '04') }   # 编辑模式/工具栏
    @{ pattern = 'card-action|card-default';       scenarios = @('01', '04') }   # 卡片
    @{ pattern = 'connect-btn|connectBtn|webSerial|baudRate'; scenarios = @('01', '02', '03') }  # 串口
    @{ pattern = 'parserMode|hexView|asciiView';   scenarios = @('01', '05') }   # 解析模式
    @{ pattern = '^docs/';                          scenarios = @() }              # 纯 docs 改动不跑
)

$selected = [System.Collections.Generic.HashSet[string]]::new()
$selected.Add('01')  # 01 永远跑 (任何 SerialCube.html 改)

foreach ($file in $ChangedFiles) {
    $normalized = $file -replace '\\', '/'
    # docs 改动不触发 e2e
    if ($normalized -match '^docs/') {
        continue
    }
    foreach ($rule in $rules) {
        if ($normalized -match $rule.pattern) {
            foreach ($s in $rule.scenarios) {
                $selected.Add($s) | Out-Null
            }
        }
    }
}

# baseline 失败场景强制重跑
if (Test-Path $Baseline) {
    try {
        $base = Get-Content $Baseline -Raw | ConvertFrom-Json
        if ($base.fail) {
            foreach ($s in $base.fail) {
                $selected.Add($s) | Out-Null
            }
        }
    }
    catch { }
}

$result = $selected | Sort-Object
Write-Host "==> Selected scenarios: $($result -join ', ')" -ForegroundColor Cyan
Write-Host "==> Based on $($ChangedFiles.Count) changed file(s)" -ForegroundColor Gray
return $result
