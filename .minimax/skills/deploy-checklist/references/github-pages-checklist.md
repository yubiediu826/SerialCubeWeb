# GitHub Pages 部署前 5 件事

SerialCube 项目部署目标 = GitHub Pages (推断: index.html 跳转到 SerialCube.html)。

## 1. SerialCube.html 内无 console error

```bash
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser console --level error
```
期望: 无 error 输出。

## 2. 6 个 e2e 场景全过

```bash
# 跑 serialcube-e2e 的 6 个场景
```
任何一个失败 → 阻塞部署, 先修。

## 3. index.html 重定向正常

```bash
agent-browser open https://yubiediu826.github.io/SerialCubeWeb/
sleep 1
agent-browser eval "window.location.href"
```
期望: 包含 `SerialCube.html`。

## 4. 资源外链可访问

SerialCube.html:7-9 有 preconnect 到 `yubiediu826.github.io` 和 `github.com`。
```bash
curl -I https://yubiediu826.github.io/ 2>&1 | Select-String -Pattern 'HTTP/'
```
期望: `HTTP/2 200`。

## 5. 版本号 / changelog 同步

SerialCube.html 内的 changelog 区块 (grep 找 `版本`) 与 docs/handover/ 里的 release notes 一致。
```bash
# 同步检查
Select-String -Path 'D:\WorkSpace\SerialCubeWeb\SerialCube.html' -Pattern '^\s*<strong>1\.\d+\.\d+ 版本' | Select-Object -First 1
Get-ChildItem 'D:\WorkSpace\SerialCubeWeb\docs\handover' -Recurse -Filter '*.md' | Select-String -Pattern '^# 1\.\d+\.\d+'
```
期望: 两者都列出了最新版本号。

## 部署后: 烟雾测试

```bash
# 1. 打开生产 URL
agent-browser open https://yubiediu826.github.io/SerialCubeWeb/

# 2. 跑场景 01 (应用加载)
# 3. 跑场景 04 (协议编辑器)
# 4. 截图存档
agent-browser screenshot .minimax/skills/deploy-checklist/smoke-<date>.png
```
