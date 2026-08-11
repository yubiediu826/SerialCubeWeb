# SerialCube 本地备份策略

> **目标:** 工作区意外丢失时（硬盘坏 / 误删 / 误 git reset）能从本地备份恢复。
> **策略:** 自动化 GitHub 推送 + 本地周期性手动/外部工具备份（重要里程碑前必做）。

---

## 备份分层

### L0 — GitHub 远程（已自动）

- **机制:** `git push origin main` 推到 https://github.com/yubiediu826/SerialCubeWeb
- **频率:** 每次发版（patch / minor / major）+ 阶段性 commit
- **覆盖:** 全部代码（SerialCube.html / index.html / docs/ / .minimax/skills/ / .github/）
- **不覆盖:** `.tmp/`、本地个人配置、浏览器 localStorage 数据

**验证:**
```powershell
git ls-remote origin main
# 应看到最新 commit SHA
```

### L1 — 本地完整克隆（推荐）

- **机制:** 在另一块硬盘 / 网盘 / NAS 上跑 `git clone`
- **频率:** 大版本发版后 1 次（v1.0.0 → v1.1.0）
- **覆盖:** 与 GitHub 一致

**创建:**
```powershell
# 在备份盘
git clone https://github.com/yubiediu826/SerialCubeWeb.git SerialCubeWeb-backup
# 之后定时 pull
Set-Location 'E:\Backup\SerialCubeWeb-backup'
git pull origin main
```

### L2 — 里程碑标签 + 完整目录快照

- **机制:** 重大版本前打 `git tag -a` + 整个工程目录压缩包
- **频率:** 每个 major / minor 版本（v1.0.0 / v1.1.0 / v2.0.0）
- **覆盖:** 全部文件（含 .git/ 历史、压缩更小）

**创建:**
```powershell
# 1. 切到工作区根
Set-Location 'D:\WorkSpace\SerialCubeWeb'

# 2. 确认工作区干净
git status    # 应为空

# 3. 打标签
git tag -a v1.0.0 -m "v1.0.0 完整快照（已部署 GitHub Pages）"

# 4. 推标签
git push origin v1.0.0

# 5. 压缩整个工程（含 .git/）到备份盘
$date = Get-Date -Format 'yyyyMMdd'
$dest = "E:\Backup\SerialCubeWeb-$date.zip"
Compress-Archive -Path 'D:\WorkSpace\SerialCubeWeb\*' -DestinationPath $dest -CompressionLevel Optimal
```

### L3 — docs/ 历史快照（agent 接手保险）

- **机制:** 每次重写 docs/ 之前,先备份到 `.tmp/docs-snapshot-YYYYMMDD/`
- **频率:** 每次 docs 大改前
- **覆盖:** docs/ 全部 + README.md

**创建:**
```powershell
$date = Get-Date -Format 'yyyyMMdd-HHmm'
$snapshotDir = ".tmp/docs-snapshot-$date"
New-Item -ItemType Directory -Force -Path $snapshotDir | Out-Null
Copy-Item -Recurse -Force 'docs' $snapshotDir
Copy-Item -Force 'README.md' $snapshotDir
Write-Host "Snapshot saved to $snapshotDir"
```

**注意:** `.tmp/` 在 `.gitignore` 里,不会被 git 追踪,需手动同步到备份盘。

### L4 — 浏览器 localStorage 数据（用户偏好）

**不备份在 git 里,也不在工程内。** localStorage 存在用户浏览器,记录:
- 主题偏好（light / dark / system）
- 模块开关状态
- 卡片配置
- 预设发送队列

**用户如果想换浏览器 / 清缓存,这些会丢。** 在 USER-GUIDE.md § 个性化设置 里说明了导出方式（复制 localStorage key `serialweb:prefs`）。

---

## 备份验证（每月 1 次）

### 1. 验证 GitHub 远程

```powershell
git fetch origin
git status
# "Your branch is up to date with 'origin/main'."
```

### 2. 验证 L1 本地克隆

```powershell
Set-Location 'E:\Backup\SerialCubeWeb-backup'
git log --oneline -5
# 应与主工作区一致
```

### 3. 验证 L2 压缩包能解压

```powershell
$testDir = "E:\Backup\test-extract"
Expand-Archive -Path 'E:\Backup\SerialCubeWeb-20260811.zip' -DestinationPath $testDir -Force
Get-ChildItem $testDir\SerialCubeWeb
# 应看到 SerialCube.html / index.html / docs/ / .minimax/ / .github/ / README.md
Remove-Item -Recurse -Force $testDir
```

### 4. 验证关键文件能加载

```powershell
# 解压后,跑一次 SerialCube.html
Set-Location "$testDir\SerialCubeWeb"
python -m http.server 8000
# 浏览器打开 http://localhost:8000/SerialCube.html
# 看到主界面 + 无 JS 报错 = 通过
```

---

## 恢复流程

### R1 — 从 GitHub 恢复

```powershell
# 1. 重新克隆
Set-Location 'D:\WorkSpace'
Remove-Item -Recurse -Force 'SerialCubeWeb'  # 或改名备份
git clone https://github.com/yubiediu826/SerialCubeWeb.git

# 2. 验证
Set-Location 'SerialCubeWeb'
git log --oneline -5
git status
```

### R2 — 从 L1 本地克隆恢复

```powershell
# 1. 直接复制
Copy-Item -Recurse -Force 'E:\Backup\SerialCubeWeb-backup' 'D:\WorkSpace\SerialCubeWeb'

# 2. 重置 origin（指向 GitHub）
Set-Location 'D:\WorkSpace\SerialCubeWeb'
git remote set-url origin https://github.com/yubiediu826/SerialCubeWeb.git
git fetch origin
git status
```

### R3 — 从 L2 压缩包恢复

```powershell
# 1. 解压
Expand-Archive -Path 'E:\Backup\SerialCubeWeb-20260811.zip' -DestinationPath 'D:\WorkSpace' -Force
# 2. 应该已经看到 SerialCubeWeb/ 目录
Set-Location 'D:\WorkSpace\SerialCubeWeb'
git status
```

### R4 — 从 L3 docs 快照恢复

```powershell
# 1. 复制回去
Copy-Item -Recurse -Force '.tmp/docs-snapshot-20260811-1430/*' .

# 2. 验证
git diff docs/
# 应该有大量新增（如果之前已经 commit 过新 docs）
```

---

## 备份检查清单（贴桌面）

```
SerialCube Backup Checklist
──────────────────────────
每次大版本发版后:
  □ L0: git push origin main + --tags
  □ L1: 备份盘 git pull
  □ L2: 打 tag + 整个工程 zip
  □ L3: .tmp/ docs 快照（如果这次改了 docs）

每月 1 次:
  □ 验证 GitHub 远程连通
  □ 验证 L1 备份与主仓库一致
  □ 抽 1 个 L2 压缩包解压测试
  □ 跑一次 SerialCube.html 确认能加载

每季度 1 次:
  □ 检查备份盘空间
  □ 清理 > 1 年的旧压缩包（保留 v1.0.0 / v2.0.0 永久）
──────────────────────────
```

---

## ⚠️ 注意事项

### 不要备份在工程内

- `.tmp/` 在 `.gitignore` 里,不会被 git 追踪
- 但 `.tmp/` 在工作区根,如果工程被整体删,`.tmp/` 也没了
- **重要快照必须同步到备份盘**

### 不要把备份盘当开发盘

- 备份盘只读（或者只 `git pull`,不直接改）
- 在备份盘改东西会让"主仓库"和"备份"分叉

### 跨平台注意

- Windows / macOS / Linux 路径分隔符不同,但 git 自动处理
- zip 压缩在 Windows / macOS 默认编码不同,跨平台解压可能文件名乱码
- **推荐:** 用 `git bundle` 而不是 zip

**用 git bundle 替代 zip:**
```powershell
git bundle create E:\Backup\SerialCubeWeb-v1.0.0.bundle --all
# 恢复
git clone E:\Backup\SerialCubeWeb-v1.0.0.bundle SerialCubeWeb
```

### 大文件注意

- `SerialCube.html` 942KB 一直在,git 能处理（远小于 GitHub 100MB 限制）
- 如果以后加大型资源（视频 / 字体）,考虑 Git LFS

---

## 🔗 相关文档

- [`HANDOFF-QUICKSTART.md`](../handover/HANDOFF-QUICKSTART.md) — 30 秒接手卡
- [`SESSION-CHECKLIST.md`](../handover/SESSION-CHECKLIST.md) — 每次开新窗口 5 步
- [`../README.md`](../README.md) — 文档中心
- [`.gitignore`](../../.gitignore) — 排除规则
