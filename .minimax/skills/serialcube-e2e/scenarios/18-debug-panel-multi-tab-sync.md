# 场景 12: 2 tab 协同 (命令帧 + ack) (v1.3.0)

验证客户端发命令 → 设备端收到 → 自动生成 ack → 客户端解析 → Stats 计数正确。

## 前置
- 2 个 SerialCube tab (Tab A 设备端, Tab B 客户端)
- 客户端有读 0x01 命令 (Read Voltage, 5 个 cell 字段)
- Chrome 浏览器 (BroadcastChannel 支持)

## 步骤

```bash
# 1. 打开 2 tab + 仪表盘 + 调试面板
agent-browser --session 0 open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
agent-browser --session 1 open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser --session 0 click --text "仪表盘"
agent-browser --session 1 click --text "仪表盘"
sleep 1
agent-browser --session 0 click "#dh-debug-toggle"
agent-browser --session 1 click "#dh-debug-toggle"
sleep 0.5

# 2. 切 Role: Tab A = 设备端
agent-browser --session 0 click "[data-role=device]"
sleep 1

# 3. 2 tab 都设 activeProtoId = proto_bms
agent-browser --session 0 eval "NS.activeProtoId = 'proto_bms'; NS._populateDebugMutatorFields();"
agent-browser --session 1 eval "NS.activeProtoId = 'proto_bms';"
sleep 0.5

# 4. 验证初始 Stats 都 0
agent-browser --session 0 eval "JSON.stringify(NS._debugStats)"
agent-browser --session 1 eval "JSON.stringify(NS._debugStats)"
# 期望: {"tx":0,"rx":0,"err":0}

# 5. Tab B 客户端发读 0x01 命令
agent-browser --session 1 eval "NS._sendDebugCmd('c1')"
sleep 1

# 6. 验证 2 tab Stats 都更新: tx+1 rx+1
agent-browser --session 0 eval "JSON.stringify(NS._debugStats)"
# 期望: {"tx":1,"rx":1,"err":0}  (设备端: 收 cmd rx+1, 发 ack tx+1)
agent-browser --session 1 eval "JSON.stringify(NS._debugStats)"
# 期望: {"tx":1,"rx":1,"err":0}  (客户端: 发 cmd tx+1, 收 ack rx+1)

# 7. 验证 Channel 段两 tab 都显示 ● 已连接 + 1 peer
agent-browser --session 0 assert --text "已连接"
agent-browser --session 0 assert --text "1 peer"
agent-browser --session 1 assert --text "已连接"
agent-browser --session 1 assert --text "1 peer"

# 8. 截图: 2 tab 调试面板 Stats 同步
agent-browser --session 0 screenshot .minimax/skills/serialcube-e2e/screenshots/12-tab-a-device-stats.png
agent-browser --session 1 screenshot .minimax/skills/serialcube-e2e/screenshots/12-tab-b-client-stats.png

# 9. 连续发 3 次命令, 验证 Stats 累计 +3
agent-browser --session 1 eval "NS._sendDebugCmd('c1'); NS._sendDebugCmd('c1'); NS._sendDebugCmd('c1')"
sleep 2
agent-browser --session 0 eval "JSON.stringify(NS._debugStats)"
# 期望: {"tx":4,"rx":4,"err":0}  (累计 4 次: 1+3)
agent-browser --session 1 eval "JSON.stringify(NS._debugStats)"
# 期望: {"tx":4,"rx":4,"err":0}

# 10. 验证 console 无 error
agent-browser --session 0 eval "JSON.stringify(window.__lastErrors || [])"
agent-browser --session 1 eval "JSON.stringify(window.__lastErrors || [])"
# 期望: "[]"
```

## 期望
- 2 tab 都开调试面板后, Channel 段显示 ● 已连接 (收到对方 hello)
- 客户端发 cmd → 设备端 rx+1 → 设备端生成 ack → tx+1 → 客户端 rx+1
- 2 tab Stats 同步: tx=N rx=N (N = 命令数)
- 连续 3 次发命令 → Stats 累计 +3
- console 无 error (postMessage / onmessage 都正常)

## 失败排查
- Stats 一直 0 → 检查 `NS._debugStats.tx++ / rx++` 调用点 (在 send / onReceive)
- Channel 一直未连接 → BC 没收到 hello, 检查 init 时 postMessage hello
- 设备端不生成 ack → 检查 `NS._recvDebugFrame` 收到 cmd-frame 时调用
- BC 跨 tab 不通 → 浏览器禁用 BC (隐私模式), 检查 `NS._debugBcAvailable`
- 错误累计 → `NS._debugStats.err++` 触发, 检查 BC send 异常处理
