# 场景 05: 解析模式切换 (文本 / 十六进制)

验证解析协议设置面板的「文本解析 / 十六进制解析」tab 切换。

## 前置
- 场景 01 通过

## 步骤

```bash
# 1. 找解析面板
agent-browser snapshot -i --json
# 找 "解析协议设置" 区域

# 2. 点 "十六进制解析" tab
agent-browser click @e<hex-tab-ref>

# 3. 等 200ms
sleep 0.2

# 4. snapshot 看输入框格式
agent-browser snapshot -i --json

# 5. 切回 "文本解析"
agent-browser click @e<text-tab-ref>
```

## 期望

- 切到 hex 模式，输入框 placeholder 变化（暗示 hex 输入）
- 切回 text 模式，placeholder 变化
- 解析结果区刷新

## 失败排查

- tab 不响应 → grep `data-parser-mode` 找切换逻辑
- 解析区不刷新 → 看 state 更新
