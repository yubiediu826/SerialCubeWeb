# 场景 15: 协议配置 modal "新建协议"按钮去重 (v1.2.1)

验证 v1.2.1 "新建协议"按钮去重：只保留 1 个 (内容区右上)。

## 前置
- SerialCube.html 在工作区根目录
- 默认配置

## 步骤

```bash
# 1. 打开页面 + 进协议配置 modal
agent-browser open file:///D:/WorkSpace/SerialCubeWeb/SerialCube.html
sleep 1
agent-browser click --text "系统菜单"
sleep 0.5
agent-browser click --text "选择协议"
sleep 1

# 2. 计数 modal 内"新建协议"按钮
agent-browser snapshot 2>&1 | grep -c "新建协议"
# 期望: 1 (只在内容区右上)
# 历史: 3 (顶部 header / 内容区右上 / 底部 footer)

# 3. 验证位置
agent-browser snapshot 2>&1 | grep -B 2 "新建协议" | head -10
# 期望出现在协议列表 (table-wrap) 之前
```

## 期望
- "新建协议"按钮只剩 1 个
- 位置: 内容区右上 (在 .table-wrap 之前, 在协议列表 toolbar 区)
- 顶部 header 旁无 "新建协议" 按钮 (v1.2.1 删)
- 底部 footer 无 "新建协议" 按钮 (原本就不存在)

## 失败排查
- > 1 个 → 检查 `dh-config-center-modal` header 改用 .modal-header-standard (line 7950 附近) + toolbar 内 1 个 dh-cc-proto-new
- 位置错 → 检查 toolbar 在 .table-wrap 之前的顺序
