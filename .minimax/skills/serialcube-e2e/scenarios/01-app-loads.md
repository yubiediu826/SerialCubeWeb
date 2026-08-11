# 场景 01: 应用加载

验证 SerialCube.html 打开后能正常渲染，无 JS 报错。

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`（首次跑前）

## 步骤

```bash
# 1. 打开页面
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html

# 2. 等 1s 让 JS 跑完
sleep 1

# 3. snapshot interactive 元素
agent-browser snapshot -i --json

# 4. 检查 console 错误
agent-browser console --level error
```

## 期望

- snapshot 返回至少 20 个 interactive 元素 (按钮 / 输入框 / select)
- console error 输出为空（或只有 favicon 等非关键 warning）
- 页面标题 = "SerialCube"

## 失败排查

- snapshot 返回空 → 页面没加载完，等长一点（sleep 2）
- console 有 JS 错误 → 看错误信息，定位 SerialCube.html 行号
- 标题不对 → 改坏了 `<title>`

## 截图

```bash
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/01-app-loads.png
```
