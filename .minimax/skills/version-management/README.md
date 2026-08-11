# version-management

SerialCube 项目的**版本号 + changelog 同步守门员**。

## 是什么

- 强制每次 commit SerialCube.html 前**先 bump 版本号**
- 自动同步 `SerialCube.html` 的 `VERSION` 常量 + changelog 段
- 强制 push 前用 `ask_user` 找用户确认 (硬性要求)

## 何时用

- 改完 `SerialCube.html`, 准备 commit
- 准备发版 / push 之前
- 用户说「bump version / 发版 / commit / push / 加新功能 / 修 bug / 改一行代码」

## 3 条硬性规则

1. **不允许直接 commit SerialCube.html 的代码改动** — 必须先 `bump-version.ps1`
2. **每次 push 前必须 ask_user 确认** — 不可逆的发布动作
3. **VERSION 常量 + changelog 段 + Git tag 三处必须同步** — 脚本管前两处, tag 人类决定

## 反模式 (踩了就回滚)

- ❌ 直接 `git commit SerialCube.html` 跳过 bump 脚本
- ❌ `git push` 前不 `ask_user` 确认 (规则 2 写进 skill 就是为了防这个)
- ❌ 多个改动攒一次 bump (失去版本粒度)
- ❌ 手工在 SerialCube.html 塞 changelog 段, 脚本会重复插

## 详细文档

见 [SKILL.md](./SKILL.md) + [references/](./references/) + [scripts/](./scripts/)
