# 场景 03: 发送 / 接收 (mock 模式)

验证发送输入框 + 发送按钮 + 接收区显示。**走 mock 模式**（不接真串口）。

## 前置
- 场景 01 通过
- 页面有「mock 模式」开关（grep SerialCube.html 找 mock 关键字）

## 步骤

```bash
# 1. 打开 mock 模式
agent-browser snapshot -i --json  # 找 mock 开关
agent-browser click @e<mock-ref>

# 2. 在发送输入框填 "AA 01 90"
agent-browser snapshot -i --json  # 找输入框 ref
agent-browser fill @e<input-ref> "AA 01 90"

# 3. 点发送
agent-browser snapshot -i --json  # 找发送按钮
agent-browser click @e<send-ref>

# 4. 等 500ms
sleep 0.5

# 5. snapshot 看接收区
agent-browser snapshot -i --json
```

## 期望

- 输入框显示 "AA 01 90"
- 发送后接收区出现 mock 响应
- 状态: 字节数 / 时间戳有更新

## 失败排查

- mock 模式没找到 → grep `mock` 看 SerialCube.html，可能藏在设置页
- 发送按钮 disabled → 检查「连接」状态，mock 模式应该绕过这限制
- 接收区空白 → console 看错误

## 截图

```bash
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/03-send-receive.png
```
