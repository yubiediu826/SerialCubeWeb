# Scenario 19: 三选项级联 modal - 删协议 (v1.3.1)

验证 v1.3.1 协议删除走 3 选项 modal (替换 v1.2 browser confirm).

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`
- 默认配置: 2 个协议 (proto_bms + proto_modbus), proto_bms 有 8 命令 + 12 卡片 + 4 告警

## 步骤

```bash
# 1. 打开页面 + 进配置中心
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "配置"
sleep 1

# 2. 协议 Tab (默认), 点 proto_bms 行 [删除] 按钮
agent-browser click "[data-proto-del='proto_bms']"
sleep 0.5

# 3. 验证 modal 浮起
agent-browser assert --text "确认删除协议"
agent-browser assert --text "条命令"
agent-browser assert --text "张卡片"
agent-browser assert --text "条告警"

# 4. 验证仅删自己 hint
agent-browser assert --text "会留下"

# 5. 验证 3 按钮
agent-browser assert --text "取消"
agent-browser assert --text "仅删自己"
agent-browser assert --text "级联删除"

# 6. 截图
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/19-cascade-protocol.png

# 7. 点 [取消] 验证关闭
agent-browser click "#dh-cascade-delete-modal button[data-result='cancel']"
sleep 0.5
agent-browser assert --text "BMS TLV"  # 协议保留

# 8. 验证 console 无错
agent-browser eval 'JSON.stringify(window.__lastErrors || [])'
# 期望: "[]"
```

## 期望
- modal 标题 "确认删除协议 proto_bms?"
- 引用 chip: [8 条命令] [12 张卡片] [4 条告警]
- 仅删自己 hint: "会留下 12 张孤儿卡片 + 4 条孤儿告警"
- 3 按钮: [取消] [仅删自己] [级联删除 (24 个)]
- 点 [取消] 协议保留, modal 关闭
- console 无 error

## 失败排查
- modal 不显示 → 检查 NS._openCascadeModal 是否触发 + openModal
- chip 缺失 → 检查 _findReferences 返回正确 type
- 3 按钮缺失 → 检查 _renderCascadeModal 渲染 footer
- 仅删自己 hint 不显示 → 检查 orphanCount > 0
