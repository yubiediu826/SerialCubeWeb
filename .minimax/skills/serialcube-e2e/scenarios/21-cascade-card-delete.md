# Scenario 21: 三选项级联 modal - 删卡片 (v1.3.1)

验证 v1.3.1 卡片删除走 3 选项 modal, [仅删自己] 行为保留孤儿告警.

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`
- 默认配置: proto_bms 有 12 卡片 (c1-c12) + 4 告警
- c1 Cell 1 电压 卡片被 1 条告警引用

## 步骤

```bash
# 1. 打开页面 + 进配置中心 + 切到卡片 Tab
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "配置"
sleep 1
agent-browser click --text "卡片"
sleep 1

# 2. 找 c1 Cell 1 电压 行的 [删除] 按钮
agent-browser click "[data-card-del='c1']"
sleep 0.5

# 3. 验证 modal 浮起
agent-browser assert --text "确认删除卡片"
agent-browser assert --text "Cell 1"

# 4. 验证引用 chip (1 条告警)
agent-browser assert --text "条告警引用"

# 5. 验证仅删自己 hint
agent-browser assert --text "会留下"
agent-browser assert --text "孤儿告警"

# 6. 截图
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/21-cascade-card.png

# 7. 验证 [级联删除] 按钮文案含 (2 个) = 1 卡片 + 1 告警
agent-browser assert --text "级联删除"
agent-browser assert --text "2"

# 8. 点 [取消] 验证关闭
agent-browser click "#dh-cascade-delete-modal button[data-result='cancel']"
sleep 0.5

# 9. 验证 console 无错
agent-browser eval 'JSON.stringify(window.__lastErrors || [])'
# 期望: "[]"
```

## 期望
- modal 标题 "确认删除卡片 c1 Cell 1 电压?"
- 引用 chip: [1 条告警引用]
- 仅删自己 hint: "会留下 1 条孤儿告警, 引用悬挂"
- 级联按钮文案: "级联删除 (2 个)" (1 + 1)
- console 无 error

## 失败排查
- modal 不显示 → 检查 _openCascadeModal 触发
- 引用数错 → 检查 _findReferences('card', cardId) 返回正确
- 孤儿告警 hint 不显示 → 检查 _renderCascadeModal hintText
