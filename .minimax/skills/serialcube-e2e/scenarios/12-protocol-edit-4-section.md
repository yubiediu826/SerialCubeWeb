# 场景 12: 协议编辑 modal 4 段 + 帧预览 dropdown (v1.2.1)

验证 v1.2.1 协议编辑 modal header 标准化 + 帧预览 dropdown 切换命令 + ④/⑤ 命令列表段。

## 前置
- SerialCube.html 在工作区根目录
- 默认配置: BMS TLV v1 协议有 2 个命令 (e.g. Read Pack Info / Write Config)

## 步骤

```bash
# 1. 打开页面 + 进协议配置 + 编辑某协议
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "系统菜单"
sleep 0.5
agent-browser click --text "选择协议"
sleep 1
# 找到 BMS TLV v1 行的"编辑"按钮
agent-browser click --text "✎"  # 第 1 个编辑按钮
sleep 1

# 2. 验证 modal 显示 (v1.1.0 4 段 + v1.2.1 新 ⑤ 命令列表)
agent-browser assert --text "① 帧字段"  # v1.1.0 段 1
agent-browser assert --text "② 数据字段"  # v1.1.0 段 2
agent-browser assert --text "③ CRC 设置"  # v1.1.0 段 3
agent-browser assert --text "④ 帧预览"  # v1.1.0 段 4
agent-browser assert --text "⑤ 命令列表"  # v1.2.1 新段

# 3. 验证 header 用 .modal-header-standard (X 在右上)
agent-browser snapshot 2>&1 | grep "modal-header-standard" | head -3
# 应找到 modal-header-standard 容器

# 4. 验证 ④ 帧预览段顶部 dropdown 选命令
agent-browser snapshot 2>&1 | grep "dh-proto-frame-cmd-select" | head -2
# 应找到 select 元素

# 5. 切换 dropdown → 帧预览应实时刷新
agent-browser snapshot 2>&1 | grep "dh-frame-bytes" | head -3
# 验证 frame-bytes 元素存在 + 包含 .byte.{type} 色块

# 6. 验证 ⑤ 命令列表段表格
agent-browser snapshot 2>&1 | grep "inline-edit-table" | head -3
# 应找到命令表格

# 7. 截图
agent-browser screenshot .minimax/skills/serialcube-e2e/screenshots/12-protocol-edit-4-section.png
```

## 期望
- 协议编辑 modal 弹 4 段 (v1.1.0 1/2/3/4) + ⑤ 命令列表段 (v1.2.1 新)
- header 用 .modal-header-standard (X 右上)
- ④ 帧预览段顶部有 dropdown 选命令
- dropdown 切换命令 → frame-bytes 元素实时刷新
- ⑤ 命令列表段有表格 + 行内编辑/删除按钮
- 无 console error

## 失败排查
- 4 段不全 → 检查 `NS.renderProtoEditor` 函数
- dropdown 切换不刷新 → 检查 `NS._protoEditFrameCmdChange` 函数
- ⑤ 段缺失 → 检查 `NS._renderProtoEditCommandsSection` 调用
