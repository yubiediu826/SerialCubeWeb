# 场景 11: 协议配置 modal 合并 + "应用"列 (v1.2.1)

验证 v1.2.1 合并"选择协议 modal"到"协议配置 modal" + 协议列表行内加"应用"列 (●/○ 切换 active)。

## 前置
- SerialCube.html 在工作区根目录
- 默认配置: 2 个协议 (BMS TLV v1 / Modbus RTU), 默认 activeProtoId = null
- 串口未连接

## 步骤

```bash
# 1. 打开页面
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "系统菜单"
sleep 0.5
# 找到"配置"或"协议配置"入口 (system menu 折叠)
# 也可以直接走仪表盘协议条 → 选择协议
agent-browser click --text "选择协议"
sleep 1

# 2. 验证打开了"协议配置 modal" (不是旧的"选择协议 modal")
agent-browser assert --text "管理协议 + 选择激活协议"  # 新副标题
agent-browser assert --text "配置中心 / 协议"  # 新面包屑
agent-browser assert --text "应用"  # 新列名

# 3. 验证每行有"应用"列 (●/○ 圆点)
agent-browser snapshot 2>&1 | grep "apply-dot" | head -5
# 应找到至少 2 个 apply-dot 按钮 (2 个协议)

# 4. 点 ○ 切换为 ● + 关闭 modal → 验证仪表盘协议条更新
# 假设 BMS TLV v1 行的 ○ 切换
agent-browser click --text "○"
sleep 0.5
# 关闭 modal
agent-browser click --text "关闭"
sleep 0.5
# 验证仪表盘协议条显示协议名
agent-browser assert --text "BMS TLV v1"

# 5. 重新打开"协议配置 modal" 验证 ● 状态保持
agent-browser click --text "选择协议"
sleep 1
agent-browser snapshot 2>&1 | grep "apply-dot active" | head -3
# 应找到 active 的 apply-dot

# 6. 截图
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/11-protocol-apply-column.png
```

## 期望
- "选择协议"按钮直接打开"协议配置 modal" (无独立"选择协议 modal")
- 协议列表每行有"应用"列 (●/○)
- 点 ○ → 变 ● + 关闭 modal
- 仪表盘协议条同步显示协议名
- 重新打开 modal, ● 状态保持
- 无 console error

## 失败排查
- 仍弹"选择协议 modal" → 检查 `NS.openSelectProtocolModal` stub + 仪表盘入口
- 应用列不显示 → 检查 `_configCenterTabRenderers.protocols` 函数更新
- 切换不生效 → 检查 `NS.toggleActiveProtocol` 函数 + localStorage 写入
