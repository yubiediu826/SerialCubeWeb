---
name: deploy-checklist
description: SerialCube GitHub Pages 部署前 5 件事硬性检查（console 无错 / 6 个 e2e 场景通过 / index.html 重定向 / 资源外链可达 / 版本号同步）+ 部署后烟雾测试。**当用户说「部署 / 推 GitHub Pages / 上线 / 部署后冒烟」时触发**。
---

# SerialCube Deploy Checklist

## 何时用

- 用户说「发版 / 部署 / 推 GitHub Pages / 上线」
- 任何要 push 到 main 分支并触发 GitHub Pages 自动部署的场景

## 5 件事

详见 [references/github-pages-checklist.md](./references/github-pages-checklist.md)

1. **SerialCube.html 内无 console error**
2. **6 个 e2e 场景全过** (调 serialcube-e2e)
3. **index.html 重定向正常**
4. **资源外链可访问** (preconnect 的 yubiediu826.github.io + github.com)
5. **版本号 / changelog 同步** (SerialCube.html 与 docs/handover/ 一致)

任何一件没过 → 阻塞部署, 修完再 deploy。

## 部署后

跑烟雾测试: 打开生产 URL → 跑场景 01 + 04 → 截图存档。

## 注意事项

- **GitHub Pages 自动部署**: push 到 main 后等 1-2 分钟才生效
- **不要在 main 直推**: 走 feature branch + PR, 触发 code-review
- **回滚方案**: GitHub Pages 设置里可以回滚到上一次部署, 但要先 grep 出坏在哪
