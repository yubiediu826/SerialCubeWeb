# HANDOFF — v1.3.4 删除 modal 统一 + 编辑模式加固 (2026-08-14)

> **接手时长**: 10 分钟
> **核心内容**: 3 个删除 modal (协议/命令/卡片) 统一为同一自定义 modal, 修了 3 类用户实测 bug (UX 不一致 / 持久化漏 / edit mode 重复触发 + 无前置条件)
> **改动行数**: SerialCube.html +120 / -60, 新建 2 个文档, 1 个 mockup HTML

---

## TL;DR — 30 秒看完

| 维度 | 旧 (v1.3.3) | 新 (v1.3.4) |
|---|---|---|
| 协议删除 | `window.confirm()` 原生 | 统一 modal |
| 命令删除 | 3 按钮 modal (3 选项) | 2 按钮 modal (自动级联) |
| 卡片删除 | 3 按钮 modal (3 选项) | 2 按钮 modal (自动级联) |
| 持久化 | 命令/卡片删漏 _saveUserConfig | 7 处补全, 刷新不复活 |
| 编辑模式按钮 | 单击触发 2 次 (bug) | 加守卫, 单击只触发 1 次 |
| 编辑模式前置 | 无 (任何时候能进) | 已连串口 + 已激活协议才能进 |
| 卡片修改路径 | 4 处漏 _saveUserConfig | 全部补全 |

---

## 1. 改动文件清单

```
SerialCube.html                                            (+120 / -60)
  ├─ modal HTML (line 8550-8596)                          (重写 3 按钮 → 2 按钮 + 加蓝色信息条 + 去死 section)
  ├─ _renderCascadeModal (line 15478-15560)               (重写 title 去重 + 蓝色 cascade-summary 替换 self-hint)
  ├─ _openCascadeModal (line 15475-15480)                 (返回值: self|cascade|cancel → confirm|cancel)
  ├─ dh-toggle-edit handler (line 16342)                  (加前置条件守卫)
  ├─ NS.attachModalHandlers (line 16082)                  (加 _modalHandlersBound 守卫)
  ├─ NS.reset (line 12681)                                (同步清 _modalHandlersBound flag)
  ├─ 3 个 delete handler                                  (label 去前缀 + auto-cascade + _saveUserConfig)
  │   ├─ 协议删除 (line 14695)                             (window.confirm → _openCascadeModal)
  │   ├─ 命令删除 (line 14795)                             (auto-cascade + _saveUserConfig)
  │   └─ 卡片删除 (line 14895)                             (auto-cascade + _saveUserConfig)
  ├─ 4 处卡片修改路径补 _saveUserConfig                   
  │   ├─ 编辑模式 trend 卡片 del (line 11623)
  │   ├─ 编辑模式 list 卡片 del (line 11688)
  │   ├─ 卡片编辑 modal 列表 del (line 13865)
  │   └─ 卡片编辑 modal 保存/删除 (line 16290/16298)
  ├─ VERSION 1.3.3 → 1.3.4 (line 8774)
  └─ HTML 顶部 changelog 段 (line 8632-8655)              (新增 v1.3.4 段, 6 大类改动)

docs/changelog/2026-08-14-v1.3.4-cascade-modal-unify.md   (新建, 7.9KB, 8 节: 背景/UX/持久化/守卫/前置条件/API/验证/Backlog)
docs/handover/HANDOFF-V1.3.4-2026-08-14.md                (本文)
docs/design/v1.3.4-cascade-modal-redesign-mockup.html     (新建, mockup HTML, 2 场景 + 浅深主题切换)
```

---

## 2. 核心改动点 — 必须理解

### 2.1 3 个删除 modal 统一为同一组件

**新 modal 结构** (line 8550-8596):
```
┌─ ⚠ 确认删除 <label>?                    (无类型前缀, 避免重复)
│   所属协议 proto_bms · BMS TLV v1
│
│ 引用预览
│  [5 张卡片] [1 条告警]                  (chip, 跟之前一致)
│  ℹ 引用对象会一并删除: 5 张卡片 + 1 条告警  (蓝色信息条, NEW)
│
│                       [取消] [确认删除]  (2 按钮, 跟之前 3 按钮对比)
└─
```

**调用方代码** (line 14695-14718 协议删除 举例):
```js
// 旧
if (!confirm('确认删除协议 ' + delId + '?' + refSummary)) return;
// 直接级联删
NS.PROTOCOLS = NS.PROTOCOLS.filter((p) => p.id !== delId);
NS.CARDS = NS.CARDS.filter((c) => c.protocol !== delId);
NS.ALERTS = NS.ALERTS.filter((a) => a.protocol !== delId);
NS._saveUserConfig && NS._saveUserConfig();

// 新
const result = await NS._openCascadeModal('protocol', delId, delId);
if (result !== 'confirm') return;
// auto-cascade (跟旧版本逻辑一致, 只是从 confirm 移到 _openCascadeModal confirm 后)
NS.PROTOCOLS = NS.PROTOCOLS.filter((p) => p.id !== delId);
NS.CARDS = NS.CARDS.filter((c) => c.protocol !== delId);
NS.ALERTS = NS.ALERTS.filter((a) => a.protocol !== delId);
NS._saveUserConfig && NS._saveUserConfig();
```

**关键 API**:
- `NS._openCascadeModal(type, id, label)` — type: 'protocol' | 'command' | 'card'; id: 数据 id; label: 显示文本 (不含类型前缀!)
- 返回 `Promise<'confirm' | 'cancel'>`

### 2.2 持久化覆盖 (7 处 _saveUserConfig)

**原则**: 任何 modify `NS.PROTOCOLS / NS.CARDS / NS.ALERTS / activeProtoId` 的路径, 末尾都要调 `NS._saveUserConfig && NS._saveUserConfig();`

**漏调会怎样**: 浏览器刷新 → `_loadUserConfig` 读 localStorage → 用存的数据覆盖回 in-memory → 你刚的修改丢失。

**v1.3.4 已覆盖 7 处**:
1. 编辑模式 trend 卡片 del (line 11623)
2. 编辑模式 list 卡片 del (line 11688)
3. 卡片编辑 modal 列表 del (line 13865)
4. 协议删除 (line 14710, v1.3.3 已有)
5. 命令删除 (line 14816, NEW)
6. 卡片删除 (line 14933, NEW)
7. 卡片编辑 modal 保存/删除 (line 16290/16298, NEW)

**漏的可能路径** (未来要加的):
- 新建协议 (line 14689 area — 看一下)
- 新建命令 (line 16058 area — 看一下)
- 新建告警
- 新建卡片向导 (line 15005 — push 完了 openCardEdit, 改完保存触发 dh-ce-save 才会持久化, 中途取消的话 placeholder card 在内存中, 刷新就丢)
- 复制命令/复制协议
- 重置 (line 12690 用 _clearUserConfig 不用 _saveUserConfig, 正确)

### 2.3 attachModalHandlers 重复绑定守卫

**根因**: `attachModalHandlers` 在 2 个地方被调:
- 脚本末尾 (L16469): `window.__serialWebDashboard.attachModalHandlers();`
- `NS.start` 内部 (L12659): 有 `!_initialized` 守卫, 但 `start` 在 attachModalHandlers 之后还会被调一次, 等于 bind 2 次

**症状**: 任何 click handler (e.g. 编辑模式按钮) 单击触发 2 次 → toggle 来回 2 次 → 净效果 0 + 2 个 toast

**修法** (line 16082-16089):
```js
NS.attachModalHandlers = function () {
  if (NS._modalHandlersBound) return;  // 一次性守卫
  NS._modalHandlersBound = true;
  const bind = (id, fn) => { ... };
  // ... 原有 bind 调用
};
```

**reset() 同步清 flag** (line 12685): `NS._modalHandlersBound = false;` 让 reset 后能重绑

### 2.4 编辑模式前置条件

**位置**: `dh-toggle-edit` handler 入口 (line 16342-16354)

```js
bind('dh-toggle-edit', () => {
  if (!NS.editMode) {  // 只在"进入"时检查
    if (!NS._serialConnected) {
      NS.toast('请先连接串口 (编辑模式需基于已应用的协议)', 'warn');
      return;
    }
    if (!NS.activeProtoId) {
      NS.toast('请先在配置中心激活协议 (编辑模式需基于已应用的协议)', 'warn');
      return;
    }
  }
  NS.editMode = !NS.editMode;
  // ... 原有 toggle 逻辑
});
```

**为什么这样设计**:
- 退出编辑模式不受影响 (用户能随时退出)
- 没串口 = 不能应用协议 = 不能编辑 (逻辑上)
- 没激活协议 = 仪表盘上根本没数据 = 编辑也没意义
- 用 `warn` toast 提示, 不静默拒绝, 让用户知道为什么不能进

---

## 3. 测试清单 (用户手动验证)

| # | 场景 | 期望 | 验证方法 |
|---|---|---|---|
| 1 | 删命令 (有引用) | 弹新 modal, title 不重复, 显示 chip + 蓝色信息条, 确认 → 自动级联 | 配置中心 → 命令 tab → 点 del → 看 modal |
| 2 | 删卡片 (有引用) | 同上 | 配置中心 → 卡片 tab → 点 del |
| 3 | 删协议 (有引用) | 弹新 modal, 跟命令/卡片一致 | 配置中心 → 协议 tab → 点 del |
| 4 | 删任意 (无引用) | 蓝色信息条变 "无引用对象, 仅删除当前项" 灰色态 | 删一个孤立命令/卡片 |
| 5 | 命令/卡片删除刷新 | 修改保留, 不复活 | 删一个 → 刷新 → 看是否复活 |
| 6 | 编辑模式按钮 1 次点击 | 只 1 个 toast, 进入编辑模式 | 仪表盘点编辑模式 → 看 toast 数量 |
| 7 | 没串口时点编辑模式 | 警告 toast "请先连接串口", 拒绝进入 | 断开串口 (默认就没连) → 点编辑模式 |
| 8 | 没激活协议时点编辑模式 | 警告 toast "请先在配置中心激活协议", 拒绝进入 | 串口连上 + 不激活协议 → 点编辑模式 |
| 9 | 退出编辑模式 | 正常退出 | 在编辑模式点编辑模式 → 退出 |
| 10 | 卡片编辑 modal 保存 | 修改保留, 刷新不丢 | 编辑一个卡片 → 保存 → 刷新 → 看修改 |
| 11 | 卡片编辑 modal 删除 | 卡片不复活 | 编辑 modal 里删 → 刷新 → 看是否复活 |

---

## 4. 已知遗留问题 (Backlog for v1.3.5+)

1. **编辑模式图标尺寸偏小** (14x14) — 用户反馈 "未显示对应图标"。建议加大到 16 或 18。
2. **`_renderCascadeModal` meta 解析正则不健壮** — `label.match(/0x.../)` 在 cmd 名字含 "0x" 时会误匹配。建议传完整 cmd obj 给 renderer。
3. **协议删除的「关联命令/卡片/告警」可点开展开** — 现在只显示数量, 用户可能想看具体哪些。后续可加详情展开。
4. **旧 `NS._cascadeConfirm` 兼容代码可清理** — v1.3.1 升级时为防回归保留的, v1.3.4 稳定后可以删 (line 15587+ 区域)。
5. **agent-browser e2e 没法跑** — chromium 启动一直 timeout, 跳过自动化验证, 全靠用户手动测。可能是 v1.3.3 改 dashboard 时把 chromium 启动参数搞坏了 (待排查)。

---

## 5. 关键决策 why (回答 "为什么这么改")

| 决策 | 原因 |
|---|---|
| 3 modal 完全统一, 不保留旧的 3 按钮选项 | 命令/卡片只属其协议, 引用方离开被引用方就没意义, 让用户做无意义选择 = 糟糕 UX。直接 confirm + 自动级联 = 跟协议删除 v1.3.3 一致, 最简单 |
| 协议删除从 window.confirm 改 modal | 3 modal 必须统一, 协议用原生 confirm 是最大不一致点。modal 还能显示 chip + 信息条, 信息密度更高 |
| 蓝色信息条替换橙色 self-hint | 橙色太抢眼跟主操作 (确认删除按钮) 视觉冲突, 蓝色跟 modal 主题色 (accent) 一致更和谐 |
| Label 去掉类型前缀 | 避免 "确认删除命令 命令 0x01..." 这种 title 重复。label 跟 title 拼起来无前缀最自然 |
| 7 处 _saveUserConfig 补全 | 浏览器刷新覆盖机制下, modify 路径必须显式保存。漏一处就一处不持久化 |
| attachModalHandlers 加守卫 | 根本问题是 2 处调用, 改调用顺序风险大 (影响 _initialized 逻辑), 加 flag 守卫最安全 |
| 编辑模式前置条件加 NS._serialConnected | 用户逻辑: 没串口 = 不能应用协议 = 不能编辑。三段提示分别覆盖 |
| _openCascadeModal 返回值简化为 confirm | 移除 self 路径后, 二选一逻辑无意义, 简化为单结果 |

---

## 6. 接手建议

1. **先看 mockup**: `docs/design/v1.3.4-cascade-modal-redesign-mockup.html` — 可视化新旧对比, 2 场景 (命令/卡片) + 协议场景在 mockup 里有但需手动看, 切深色主题也试一下
2. **再读 changelog**: `docs/changelog/2026-08-14-v1.3.4-cascade-modal-unify.md` — 8 节详细改动, 含测试矩阵
3. **最后看代码**: `SerialCube.html` line 8550-8596 (modal) + 15475-15560 (renderer) + 14695-14933 (3 delete handler) + 11623/11688/13865/16290/16298 (4 卡片修改路径) + 16082 (守卫) + 16342 (前置条件) + 12685 (reset 清 flag)

---

## 7. 关联文档

- **详细 changelog**: `docs/changelog/2026-08-14-v1.3.4-cascade-modal-unify.md`
- **Mockup**: `docs/design/v1.3.4-cascade-modal-redesign-mockup.html`
- **v1.3.3 changelog** (前置): `docs/changelog/2026-08-14-v1.3.3-config-center-proto-filter.md`
- **v1.3.1 changelog** (3 选项 modal 起源): `docs/changelog/2026-08-13-v1.3.1-cascade-delete-modal.md`
- **根 README**: `README.md` (VERSION 1.3.3 → 1.3.4 待同步)
- **docs README**: `docs/README.md` (版本列表待加 v1.3.4)
