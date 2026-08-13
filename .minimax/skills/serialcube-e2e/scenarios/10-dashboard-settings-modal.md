# 场景 10: 仪表盘修复后 — ⚙ 设置值按钮 + 无引导 + 无底部预览区 (v1.2.1)

验证 v1.2.1 仪表盘协议条改：删"引导"按钮 + 加"⚙ 设置值"按钮 + 删底部"设置值/字节预览"常驻区。

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已装 + Chrome 已就绪
- 默认配置: 2 个协议, 12 张卡片, 默认 activeProtoId = null
- 串口未连接 (默认)

## 步骤

```bash
# 1. 打开页面 + 切到仪表盘
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "仪表盘"
sleep 1

# 2. 验证工具栏按钮
agent-browser assert --text "设置值"  # ⚙ 设置值按钮存在
agent-browser assert --text "选择协议"  # 选择协议按钮存在
# 验证无"引导"按钮 (v1.1.1 已删, v1.2.1 复检)

# 3. 验证未连接时按钮状态
# ⚙ 设置值按钮应该 disabled (opacity 0.4)
agent-browser snapshot 2>&1 | grep -A 2 "设置值" | head -5

# 4. 验证无底部"设置值/字节预览"常驻区
# (历史 v1.0 一直存在, v1.2.1 删除)

# 5. 截图
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/10-dashboard-fixed.png
```

## 期望
- 工具栏有"⚙ 设置值"按钮 (disabled, 灰显)
- 工具栏有"选择协议"按钮
- **无**"引导"按钮
- 仪表盘底部**无**"设置值/字节预览"常驻区
- 串口未连接时, ⚙ 按钮 opacity 0.4 / cursor not-allowed

## 失败排查
- 按钮 disabled 状态错 → 检查 `NS.updateDashboardSettingsBtn()` 调用点
- 仍显示底部预览区 → 检查 `dh-frame-preview-area` DOM 是否删除
