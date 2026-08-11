# 场景 04: 协议编辑器

验证「协议编辑器」弹窗能打开、关闭、导入/导出 JSON。

## 前置
- 场景 01 通过

## 步骤

```bash
# 1. 找协议编辑器入口（用 snapshot）
agent-browser snapshot -i --json
# 找 "协议编辑器" 文字所在的按钮

# 2. 点击打开
agent-browser click @e<proto-btn-ref>

# 3. 等 300ms
sleep 0.3

# 4. snapshot 弹窗内容
agent-browser snapshot -i --json

# 5. 点击「导出 JSON」按钮
agent-browser click @e<export-ref>

# 6. 验证 textarea 有内容
agent-browser snapshot -i --json

# 7. 关闭弹窗
agent-browser click @e<close-ref>
```

## 期望

- 弹窗标题 = "协议编辑器"
- 副标题含 "TLV 帧结构"
- 导出 textarea 非空（包含协议模板 JSON）
- 关闭后弹窗消失

## 失败排查

- 找不到入口 → grep SerialCube.html 找 `协议编辑器`
- 弹窗打不开 → modal CSS 问题，看 `.modal.open` 规则
- 导出空 → JSON 渲染失败，看 console
