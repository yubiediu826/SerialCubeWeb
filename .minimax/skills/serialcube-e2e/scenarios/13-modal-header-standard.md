# 场景 13: 4 modal header 一致性 — X 右上 + title 左上 (v1.2.1)

验证 v1.2.1 4 个 modal 全部用 .modal-header-standard: 关闭 X 在右上 + title 在左上 + 副标题 + 面包屑。

## 前置
- SerialCube.html 在工作区根目录
- 默认配置

## 步骤

```bash
# 1. 打开页面
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1

# 2. 打开 协议配置 modal
agent-browser click --text "系统菜单"
sleep 0.5
agent-browser click --text "选择协议"
sleep 1
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/13a-config-center.png
agent-browser assert --text "管理协议 + 选择激活协议"  # 副标题
agent-browser assert --text "配置中心 / 协议"  # 面包屑
# 关闭
agent-browser click --text "关闭"
sleep 0.5

# 3. 打开 协议编辑 modal (从协议配置 → 某协议 → 编辑)
agent-browser click --text "选择协议"
sleep 1
agent-browser click --text "✎"
sleep 1
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/13b-protocol-edit.png
agent-browser assert --text "TLV 帧结构"  # 副标题
agent-browser assert --text "配置中心 / 协议 / 编辑"  # 面包屑
agent-browser click --text "关闭"
sleep 0.5

# 4. 打开 命令编辑 modal (从配置中心 → 命令 tab → 某命令编辑)
agent-browser click --text "系统菜单"
sleep 0.5
agent-browser click --text "选择协议"
sleep 1
# 切到命令 tab
agent-browser click --text "命令"
sleep 0.5
agent-browser click --text "✎"  # 第 1 个编辑按钮
sleep 1
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/13c-command-edit.png
agent-browser assert --text "协议 / 命令"  # 面包屑
agent-browser click --text "关闭"
sleep 0.5

# 5. 打开 告警编辑 modal (从配置中心 → 告警 tab → 新建)
agent-browser click --text "告警"
sleep 0.5
agent-browser click --text "新建告警"
sleep 1
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/13d-alert-edit.png
agent-browser assert --text "配置中心 / 告警"  # 面包屑
agent-browser click --text "关闭"
sleep 0.5

# 6. 验证每个 modal 都用 modal-header-standard
agent-browser snapshot 2>&1 | grep "modal-header-standard" | wc -l
# 期望: 至少 4 (最近打开过的 modal 还在 DOM)
```

## 期望
- 4 modal 全部用 .modal-header-standard
- X 关闭按钮在右上 (margin-left: auto)
- title 在左上 (16px / font-weight 600)
- 副标题在 title 下方 (12px / var(--text-soft))
- 面包屑在副标题下方 (11px / monospace / var(--text-soft))

## 失败排查
- modal 仍用旧 .modal-header → 检查该 modal 的 header DOM (line 7907 / 8058 / 8001 等)
- X 在左 → 检查 `.modal-header-standard .close-btn` CSS
