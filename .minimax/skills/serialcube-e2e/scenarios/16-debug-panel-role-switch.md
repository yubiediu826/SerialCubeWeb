# 场景 10: 调试面板 Role 切换 (v1.3.0)

验证 v1.3.0 调试面板 4 段布局 + BroadcastChannel 通信 + Role 切换状态同步。

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`
- Chrome 浏览器 (BroadcastChannel 支持)
- 默认配置: 2 个协议 (BMS TLV v1 / Modbus RTU), 调试面板占位已实装

## 步骤

```bash
# 1. 打开页面 + 切到仪表盘
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "仪表盘"
sleep 1

# 2. 点开调试面板 (右下角 ⚙ 按钮, 已改为 Lucide settings SVG)
agent-browser click "#dh-debug-toggle"
sleep 0.5

# 3. 验证 4 段 UI 全部可见
agent-browser assert --text "Role"
agent-browser assert --text "Channel"
agent-browser assert --text "Mutator"
agent-browser assert --text "Stats"

# 4. 验证 Channel 段显示 "BC:serialcube-debug-v1" (默认 client + 未连接)
agent-browser assert --text "BC:serialcube-debug-v1"
agent-browser assert --text "未连接"

# 5. 切换 Role 到设备端
agent-browser click "[data-role=device]"
sleep 0.5

# 6. 验证 Role 段 active 切到设备端
agent-browser eval "document.querySelector('[data-role=device]').classList.contains('active')"
# 期望: true

# 7. 验证 Channel 段显示 "1 peer · 设备端" (BC 收到自己 hello, 算 1 peer)
agent-browser assert --text "设备端"
agent-browser assert --text "1 peer"

# 8. 截图: 调试面板 4 段 UI (设备端 role)
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/10-debug-panel-device-role.png
```

## 期望
- ⚙ 按钮显示 Lucide settings SVG (无 emoji, 18x18 viewBox stroke 1.5)
- 浮窗 4 段 (Role / Channel / Mutator / Stats) 全部可见
- Role 段 segmented [客户端] [设备端] 默认 active = client
- Channel 段显示 ● + 通道名 "BC:serialcube-debug-v1"
- 切到设备端后 Channel 状态变 "1 peer · 设备端"
- console 无 error

## 失败排查
- 4 段不显示 → 检查 `.debug-section` CSS + SerialCube.html:7970-7984 HTML 结构
- 通道一直未连接 → 检查 `NS._debugBcAvailable` 浏览器支持 BroadcastChannel
- Role 切换无反应 → 检查 `NS._switchDebugRole` 绑 onclick
- emoji 还在 → ⚙ 没换成 Lucide SVG, 检查 SerialCube.html:7972
