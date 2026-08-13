# 场景 14: 主题切换 (浅色 + 深色) — 帧预览 .byte.data 微差"切开"感 (v1.2.1)

验证 v1.2.1 帧预览主题适配：.byte.data 用 var(--bg) 而非 var(--bg-terminal)，浅色 + 深色下保持微差"切开"感。

## 前置
- SerialCube.html 在工作区根目录
- 默认配置: BMS TLV v1 协议

## 步骤

```bash
# 1. 打开页面 + 进协议编辑 modal
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "系统菜单"
sleep 0.5
agent-browser click --text "选择协议"
sleep 1
agent-browser click --text "✎"
sleep 1

# 2. 浅色模式 — 截屏 ④ 帧预览段
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/14a-light-mode.png

# 3. 切到深色模式 (通过系统菜单 → 主题 → 深色)
agent-browser click --text "关闭"
sleep 0.5
agent-browser click --text "系统菜单"
sleep 0.5
agent-browser click --text "深色"
sleep 0.5

# 4. 重新进协议编辑 modal
agent-browser click --text "系统菜单"
sleep 0.5
agent-browser click --text "选择协议"
sleep 1
agent-browser click --text "✎"
sleep 1

# 5. 深色模式 — 截屏 ④ 帧预览段
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/14b-dark-mode.png

# 6. 验证 .byte.data 颜色用 var(--bg) 而非 var(--bg-terminal)
# (检查 SerialCube.html line 6720)
# 期望: .byte.data { background: var(--bg); }
# 不能用 var(--bg-terminal) (否则深色下 data 段"白色")
```

## 期望
- 浅色模式: frame 容器 #f6f6f7, .byte.data #ffffff (微差"切开")
- 深色模式: frame 容器 #161618, .byte.data #1b1b1f (微差"切开")
- 7 种 byte 色块都清晰可读
- modal header 在 2 个主题下都正确 (var(--text) / var(--text-soft) / var(--border))

## 失败排查
- data 段没微差 → 检查 `.byte.data { background: var(--bg) }` (line 6720)
- 深色下 data "白" → 检查 hardcoded 颜色 (SerialCube 反馈 v3 → v4 fix 史)
