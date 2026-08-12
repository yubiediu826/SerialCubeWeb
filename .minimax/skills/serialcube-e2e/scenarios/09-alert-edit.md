# 场景 09: 告警编辑 (v1.2)

验证告警独立规则 + 严重度筛选 + 编辑/删除。

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`
- 默认配置: NS.ALERTS = [] (空), 12 张卡片 (10 张有 range)

## 步骤

```bash
# 1. 打开页面 → 配置中心 → 告警 tab
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "协议配置"
sleep 1
agent-browser click --text "告警" --nth 1  # tab 区第二个
sleep 1

# 2. 验证默认 0 条规则 + 工具栏文案
agent-browser assert --text "共 0 条规则"
agent-browser assert --text "从卡片重建"
agent-browser assert --text "新建告警"

# 3. 截图: 空状态
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/09-alert-empty.png

# 4. 点击 "从卡片重建" → 应生成 10 条 warn 规则 (10 cards with range)
agent-browser click --text "从卡片重建"
sleep 1

# 5. 验证表格 10 行 + badge 同步
agent-browser assert --text "共 10 条规则"
agent-browser assert --text "10 启用"
agent-browser assert --text "Cell 1 电压"
agent-browser assert --text "BMS"

# 6. 截图: 重建后
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/09-alert-rebuilt.png

# 7. 点击 "新建告警"
agent-browser click --text "新建告警"
sleep 1

# 8. 验证 modal 标题"新建告警" + 默认值
agent-browser assert --text "新建告警"
agent-browser assert --value ""  # name 空
agent-browser assert --checked "#dh-alert-enabled"  # 默认启用
agent-browser assert --value "2000"  # 默认 debounceMs

# 9. 填: 名称=Test Alert, 严重度=danger
agent-browser fill --selector "#dh-alert-name" --value "Test Alert"
agent-browser click --selector "input[name='dh-alert-sev'][value='danger']"
agent-browser click --text "保存"
sleep 1

# 10. 验证表格多一行 (11 条)
agent-browser assert --text "共 11 条规则"
agent-browser assert --text "Test Alert"
agent-browser assert --text "危险"  # danger pill

# 11. 点击行的"编辑" (找 Test Alert 那行)
agent-browser click --selector "tr:contains('Test Alert') [data-alert-edit]"
sleep 1

# 12. 验证 modal 标题"编辑告警规则" + 字段预填
agent-browser assert --text "编辑告警规则"
agent-browser assert --value "Test Alert"

# 13. 改严重度为 warn, 保存
agent-browser click --selector "input[name='dh-alert-sev'][value='warn']"
agent-browser click --text "保存"
sleep 1

# 14. 验证 pill 颜色变 warn (警告)
agent-browser assert --text "警告"

# 15. 截图: 编辑后
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/09-alert-edited.png

# 16. 删除 Test Alert 行
agent-browser click --selector "tr:contains('Test Alert') [data-alert-del]"
agent-browser click --text "确定"  # confirm dialog
sleep 1

# 17. 验证行消失 (10 条)
agent-browser assert --text "共 10 条规则"
agent-browser assert --not-text "Test Alert"
```

## 期望
- 0 条状态 + 工具栏文案正确
- "从卡片重建" 生成 10 条 warn 规则
- "新建告警" modal 默认值正确 (启用 / 2000ms / 严重度 warn)
- 保存后表格行新增, badge 同步
- 编辑模式预填正确
- 严重度切换 pill 颜色变化
- 删除后行消失, badge 减少

## 失败排查
- 0 条 badge 错误 → 检查 NS._refreshAlertsBadge 调用
- 重建不生成 → 检查 NS.CARDS.filter(range) 逻辑
- 字段没预填 → 检查 NS.openAlertEdit 浅拷贝
- 删除 confirm 不触发 → 检查 browser confirm handler (Test 13 不需要 confirm, 直接 splice)
