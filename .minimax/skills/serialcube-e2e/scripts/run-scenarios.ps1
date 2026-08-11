# -*- encoding: utf-8 -*-
<#
.SYNOPSIS
  跑 SerialCube.html 的 6 个核心 e2e 场景。
.DESCRIPTION
  逐个跑 scenarios/0X-*.md 里的步骤, 出错时停下并保留截图。
.EXAMPLE
  .\run-scenarios.ps1                       # 跑全部 6 个
  .\run-scenarios.ps1 -Scenario 03          # 只跑 03
  .\run-scenarios.ps1 -Url "file:///D:/path/SerialCube.html"  # 自定义 URL
#>
[CmdletBinding()]
param(
    [ValidateSet('01','02','03','04','05','06')]
    [string[]]$Scenario = @('01','02','03','04','05','06'),
    [string]$Url = 'file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html',
    [string]$OutDir = "$PSScriptRoot\..\screenshots"
)

$ErrorActionPreference = 'Stop'

# 准备截图目录
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}

# 检查 agent-browser
$ab = Get-Command agent-browser -ErrorAction SilentlyContinue
if (-not $ab) {
    Write-Error "agent-browser 不在 PATH, 先跑 npm install -g agent-browser"
    exit 1
}

Write-Host "==> 跑场景: $($Scenario -join ', ')" -ForegroundColor Cyan
Write-Host "==> URL: $Url" -ForegroundColor Cyan
Write-Host "==> 截图输出: $OutDir" -ForegroundColor Cyan

foreach ($s in $Scenario) {
    $file = Join-Path $PSScriptRoot "..\scenarios\$s-*.md"
    $scenarioFile = Get-ChildItem $file | Select-Object -First 1
    if (-not $scenarioFile) {
        Write-Warning "场景 $s 文件不存在, 跳过"
        continue
    }
    Write-Host ""
    Write-Host "==> [$s] $($scenarioFile.BaseName)" -ForegroundColor Yellow
    Get-Content $scenarioFile.FullName | Select-String -Pattern '^## |^### |^```bash|^```powershell' | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "==> 说明: 本脚本只打印场景大纲, 具体步骤请打开 scenarios/$($Scenario[0])-*.md 跟着跑" -ForegroundColor Green
Write-Host "==> (agent-browser 是交互式 CLI, 不能脚本化所有步骤; 真实运行由 AI 跟随场景文档执行)" -ForegroundColor Green
