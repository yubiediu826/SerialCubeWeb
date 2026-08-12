# 场景 07: 仪表盘单协议聚焦 (v1.2)

验证 v1.2 仪表盘按 activeProtoId 过滤卡片 (串口 1:1 物理事实, 不再显示多协议并行)。

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`
- 默认配置: 2 个协议 (BMS TLV v1 / Modbus RTU), 12 张卡片
- 默认 activeProtoId = null (未连接, 占位显示)

## 步骤

```bash
# 1. 打开页面 + 切到仪表盘
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "仪表盘"
sleep 1

# 2. 验证占位显示
agent-browser assert --text "未连接串口"
agent-browser assert --text "选择串口"

# 3. 截图: 未连接状态
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/07-dashboard-disconnected.png

# 4. 验证协议条显示 "未激活 — 未连接"
agent-browser assert --text "未激活"
```

## 期望
- 仪表盘区域显示 DB9 占位 + "未连接串口"
- 协议条显示 "未激活" 状态
- 没有协议条 "切换协议" 按钮 (因未连接)

## 失败排查
- 显示协议卡片 → NS.activeProtoId 没默认 null, 检查 initMockData 顺序
- 占位不显示 → 检查 dh-dash-empty 容器
