# 场景 06: 主题切换 (浅色 / 深色)

验证浅色 / 深色 / 跟随系统 3 档主题切换。

## 前置
- 场景 01 通过

## 步骤

```bash
# 1. snapshot 找主题切换按钮
agent-browser snapshot -i --json
# 找主题相关按钮（图标是太阳/月亮）

# 2. 点击切换到深色
agent-browser click @e<theme-btn-ref>

# 3. 等 200ms
sleep 0.2

# 4. 检查 body class
agent-browser eval "document.body.className"

# 5. 切回浅色
agent-browser click @e<theme-btn-ref>
```

## 期望

- body 含 `theme-dark` class（深色）
- body 不含 `theme-dark` class（浅色）
- 主题切换无白屏闪烁

## 失败排查

- 按钮没反应 → grep `theme-dark` 看 class 切换逻辑
- 切换后白屏 → CSS 变量缺失，看 `:root` 和 `.theme-dark` 规则
- 切回浅色不生效 → toggle 逻辑写成了单向
