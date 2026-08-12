# 场景 08: 命令编辑 (v1.2)

验证命令编辑 modal 三模式 (new / edit / dup) + 字段预填 + 保存后表格更新。

## 前置
- SerialCube.html 在工作区根目录
- agent-browser 已 `install`
- 默认配置: BMS 协议下 8 条命令

## 步骤

```bash
# 1. 打开页面 → 配置中心 → 命令 tab
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "协议配置"
sleep 1
agent-browser click --text "命令" --nth 1  # 第二个 "命令" 按钮 (在 tab 区)
sleep 1

# 2. 截图: 命令 tab 表格
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/08-cmd-list.png

# 3. 验证表格 8 列
agent-browser assert --text "0x01"  # 第一行
agent-browser assert --text "Read Voltage"

# 4. 点击第一行"编辑"按钮
agent-browser click --selector "[data-cmd-edit='0']"
sleep 1

# 5. 验证 modal 标题"编辑命令" + 字段预填
agent-browser assert --text "编辑命令"
agent-browser assert --value "0x01"  # dh-new-cmd-id
agent-browser assert --value "Read Voltage"  # dh-new-cmd-name

# 6. 修改名字为 "Read Voltage Modified"
agent-browser fill --selector "#dh-new-cmd-name" --value "Read Voltage Modified"
agent-browser click --text "保存命令"
sleep 1

# 7. 验证表格第一行已更新
agent-browser assert --text "Read Voltage Modified"

# 8. 截图: 编辑保存后
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/08-cmd-edited.png

# 9. 测试复制: 点击第一行"复制"按钮
agent-browser click --selector "[data-cmd-dup='0']"
sleep 1

# 10. 验证 modal 标题"编辑命令" + ID 改了 (新 ID)
agent-browser assert --text "编辑命令"
agent-browser assert --value "0x02"  # 默认 dup 后 ID = 0x02 (原 0x01 + 1)

# 11. 关闭
agent-browser click --text "取消"
```

## 期望
- modal 标题"编辑命令" 正确切换
- 字段预填正确 (0x01, Read Voltage, RX, query, 200ms)
- 编辑保存后表格第一行变 "Read Voltage Modified"
- 复制后 ID 自动 +1 (0x01 → 0x02)
- 取消/保存后 modal 正常关闭

## 失败排查
- modal 标题没变 → openNewCommandModal 标题逻辑问题
- 字段没预填 → 浅拷贝 JSON.parse(JSON.stringify(editCmd)) 失败
- 复制 ID 冲突 → 找下一个未占用 ID 逻辑失败
