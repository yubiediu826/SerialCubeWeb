# Scenario 20: 三选项级联 modal - 删命令 (v1.3.1)

验证 v1.3.1 命令删除走 3 选项 modal, [仅删自己] 行为保留引用卡片的 cmd=null (v1.2 line 13558 行为).

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`
- 默认配置: proto_bms 有 8 命令 + 12 卡片 + 4 告警
- 0x01 Read Voltage 命令被 4 张卡片引用 + 1 条告警

## 步骤

```bash
# 1. 打开页面 + 进配置中心 + 切到命令 Tab
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "配置"
sleep 1
agent-browser click --text "命令"
sleep 1

# 2. 找 0x01 Read Voltage 行的 [删除] 按钮
agent-browser click "[data-cmd-del='0x01']"
sleep 0.5

# 3. 验证 modal 浮起
agent-browser assert --text "确认删除命令"
agent-browser assert --text "Read Voltage"

# 4. 验证引用 chip
agent-browser assert --text "张卡片引用"
agent-browser assert --text "条告警引用"

# 5. 验证仅删自己 hint
agent-browser assert --text "会留下"
agent-browser assert --text "card.cmd = null"

# 6. 截图
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/20-cascade-command.png

# 7. 验证 [级联删除] 按钮文案含 (6 个) = 1 命令 + 4 卡片 + 1 告警
agent-browser assert --text "级联删除"
agent-browser assert --text "6"

# 8. 点 [取消] 验证关闭
agent-browser click "#dh-cascade-delete-modal button[data-result='cancel']"
sleep 0.5

# 9. 验证 console 无错
agent-browser eval 'JSON.stringify(window.__lastErrors || [])'
# 期望: "[]"
```

## 期望
- modal 标题 "确认删除命令 0x01 Read Voltage?"
- 引用 chip: [4 张卡片引用] [1 条告警引用]
- 仅删自己 hint: "会留下 4 张孤儿卡片, 引用 card.cmd = null"
- 级联按钮文案: "级联删除 (6 个)" (1 + 4 + 1)
- console 无 error

## 失败排查
- modal 不显示 → 检查 _openCascadeModal 触发
- 引用数错 → 检查 _findReferences('command', cmdId) 返回正确
- card.cmd = null hint 不显示 → 检查 _renderCascadeModal hintText 拼接
