# 场景 02: 串口连接 / 断开

验证串口连接按钮的 UI 状态切换。**注意**: 真实串口不可用，只能验证 UI 状态变化（按钮文字、disabled 状态）。

## 前置
- 场景 01 通过

## 步骤

```bash
# 1. 找连接按钮（用 snapshot 看标签）
agent-browser snapshot -i --json

# 2. 点击「连接」按钮（ref 从 snapshot 拿）
agent-browser click @e<N>

# 3. 等 500ms
sleep 0.5

# 4. snapshot 看状态变化
agent-browser snapshot -i --json

# 5. 点击「断开」按钮
agent-browser click @e<M>
```

## 期望

- 点「连接」后，按钮文字从「连接」变成「断开」或显示「已连接」状态
- 状态栏显示「未连接 / 已连接 / 连接中」之一
- **不要期望真的连上串口**（浏览器没真串口设备），看 UI 状态是否切换
- Web Serial API 在 Chrome 不可用时会弹原生 picker 或直接报错（OK，也是 UI 反馈）

## 失败排查

- 按钮没反应 → JS 事件没绑，grep SerialCube.html 找 addEventListener
- 报 "Web Serial API not supported" → 当前浏览器不支持，**这不算失败**，标记为 N/A
- 状态卡「连接中」不切换 → mock 模式开关没开，grep 找 mock

## 截图

```bash
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/02-connect.png
```
