# 场景 11: Mutator 单条注入触发告警 (v1.3.0)

验证 v1.3.0 设备端 Mutator 改 cell_1_v = 4.5V, 客户端能收到过压告警。

## 前置
- 2 个 SerialCube tab (模拟 1 人多 tab)
- Tab A 调试面板 Role = 设备端
- Tab B 调试面板 Role = 客户端
- 客户端选 protocol = proto_bms
- 客户端配置中心有 读 0x01 命令 (Read Voltage, 包含 cell_1_v 字段)
- Chrome 浏览器 (BroadcastChannel 支持)

## 步骤

```bash
# 1. 打开 2 tab
agent-browser --session 0 open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
agent-browser --session 1 open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1

# 2. 都进仪表盘
agent-browser --session 0 click --text "仪表盘"
agent-browser --session 1 click --text "仪表盘"
sleep 1

# 3. 都点开调试面板
agent-browser --session 0 click "#dh-debug-toggle"
agent-browser --session 1 click "#dh-debug-toggle"
sleep 0.5

# 4. 切 Role: Tab A = 设备端, Tab B = 客户端 (默认)
agent-browser --session 0 click "[data-role=device]"
sleep 1

# 5. Tab A (设备端) 选 protocol = proto_bms + 同步 preset
agent-browser --session 0 eval "NS.activeProtoId = 'proto_bms'; NS._populateDebugMutatorFields(); NS._renderDebugPresets();"
sleep 0.5

# 6. Tab A Mutator 改 cell_1_v = 4.5V (通过 _injectMutation)
agent-browser --session 0 eval "NS._injectMutation('cell_1_v', 4.5)"
sleep 0.5

# 7. 验证 Tab A device state 改成功
agent-browser --session 0 eval "NS._debugDeviceState.cell_1_v"
# 期望: 4.5

# 8. Tab B 客户端发 0x01 命令 (走 BC)
agent-browser --session 1 eval "NS.activeProtoId = 'proto_bms'; NS._sendDebugCmd('c1')"
sleep 1

# 9. 验证 Tab B 收到 ack 后 currentVals 变 4.5 (设备端用 device state 编码)
agent-browser --session 1 eval "NS.currentVals.cell_1_v"
# 期望: 4.5 (允许 ±0.1 误差, 浮点)

# 10. 验证 Stats: Tab A (device) rx+1 tx+1, Tab B (client) tx+1 rx+1
agent-browser --session 0 eval "JSON.stringify(NS._debugStats)"
# 期望: {"tx":1,"rx":1,"err":0}
agent-browser --session 1 eval "JSON.stringify(NS._debugStats)"
# 期望: {"tx":1,"rx":1,"err":0}

# 11. 截图: Tab B 仪表盘 Cell 1 卡片显示过压 + 告警
agent-browser --session 1 screenshot .minimax/skills/serialcube-e2e/screenshots/11-mutator-overvolt.png

# 12. 验证 console 无 error
agent-browser --session 0 eval "JSON.stringify(window.__lastErrors || [])"
agent-browser --session 1 eval "JSON.stringify(window.__lastErrors || [])"
# 期望: "[]"
```

## 期望
- Tab A (设备端) 改 cell_1_v = 4.5V 写入 `NS._debugDeviceState`
- Tab B (客户端) 发读 0x01 命令 → BC 同步到 Tab A
- Tab A 收到 cmd 帧 → 临时切 currentVals = device state → buildFrame 生成 ack → BC 发回
- Tab A 收到 ack 帧 (不处理) → 走 ack handler
- Tab B 收到 ack 帧 → _triggerAckHandler 解析 → currentVals.cell_1_v = 4.5
- checkAlert 触发 cell_1_v 过压告警 (v1.2 已有 NS.ALERTS 规则)
- 2 tab Stats 各 tx+1 rx+1, 帧计数正确

## 失败排查
- device state 改不进去 → 检查 `NS._debugDeviceState` 是否初始化
- ack 帧未生成 → 检查 `NS._recvDebugFrame` mute 检查 + buildFrame 调用
- 客户端 currentVals 不变 → 检查 `NS._triggerAckHandler` 收到 ack 帧后调用
- 告警没触发 → v1.2 ALERTS 规则未覆盖 cell_1_v > 4.2, 走配置中心 → 告警检查
- Stats 计数 0 → 检查 `NS._debugStats.tx++` / `rx++` 调用点
