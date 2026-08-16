# SerialCube v1.3.1.1 hotfix 交接 — 2026-08-13

> **状态:** v1.3.1.1 hotfix 已 commit + push
> **VERSION:** 1.3.1 → 1.3.1.1
> **commits:** c4d8b08 (修复) + fc1857b (chore: 删除 SUPPORTED-PROTOCOLS.md)
> **触发:** 用户实测 v1.3.1 发现「协议/命令/卡片删除都没弹窗」

## TL;DR

v1.3.1 commit 81deb3e 的 `dh-cascade-delete-modal` 有 **2 个独立 HTML 位置/CSS 优先级 bug**，共同导致 modal 永不显示。v1.3.1.1 hotfix 修这 2 个 bug，**未引入新功能**。

## 触发背景

v1.3.1 push 完后用户实测："协议删除、命令删除、卡片删除存在类似现象，没有弹窗"。我**已**用内置 browser (control-in-app-browser) + 走完整流程实测，确认：

1. **modal 元素在 DOM 里**（query text 找到"确认删除"标题）
2. **但默认 display 计算值异常**（inspect 时 modal 按钮 layout box x:0/48/145，y:901——viewport 中心应该是 x≈640，y≈39）
3. **没有 modal 视觉显示**（viewport 截图无 modal）

## Bug 根因

### Bug 1: inline `style="display: none;"` 锁死 modal

- v1.3.1 commit 81deb3e 在 modal HTML 元素上加了 `style="display: none;"`（line 8548 原版）
- `NS.openModal('dh-cascade-delete')` 只调 `classList.add('open')` 切到 `display: flex`
- **inline style 优先级 > 外部 CSS 规则**，盖过 `.dashboard-host .modal.open { display: flex }`
- 结果：modal 永远 `display: none`

### Bug 2: modal 写在 `.dashboard-host` 闭合 div 之后

- v1.3.1 commit 把 cascade modal 段插在 `</div></section></div>` (line 8540-8542) 之后
- 但 **line 8540 才是 `.dashboard-host` 真正的收尾**（数 div 深度验证）
- line 8541 `</section>` + line 8542 `</div>` 是**HTML 容错的孤立关闭**——浏览器自动闭合
- 结果：cascade modal 在 dashboard-host **外部**，不匹配 `.dashboard-host .modal { display: none }` 作用域
- 退化为 `display: block` (div 默认) + 继承不到 `position: fixed` → **inline 渲染在 page 末尾 y=798+**

## 修复 (c4d8b08)

| 位置 | 改动 | 行数 |
|------|------|------|
| `SerialCube.html` line 8548 | 删 inline `style="display: none;"` | -1, 0 |
| `SerialCube.html` line 8540-8590 范围 | cascade modal 整段移到 `.dashboard-host` 内部（dashboard-host 真正收尾 line 8540 之前） | -3, +3 |
| `SerialCube.html` line 8724 | VERSION `1.3.1` → `1.3.1.1` | -1, +1 |
| `docs/changelog/2026-08-13-v1.3.1.1-cascade-modal-fix.md` | 新建（2.9KB，详细 bug 根因 + 修复 + 经验） | new 2894B |

**diff stat:** SerialCube.html 18 行改动（+10 -8） + changelog 子文件新建

## 验证

### 修复前
- inspect 列 66 个元素（含 cascade modal 默认显示的"取消 / 仅删自己 / 级联删除"按钮，layout box 非零 x:0/48/145 y:901）
- modal 实际渲染在 page 末尾（fullPage 截图 y=798）
- viewport 截图**没**看到 modal

### 修复后
- inspect 列 58 个元素（cascade modal 按钮**消失**——证明默认 `display: none` 生效）
- modal 元素在 DOM 里（query text 找到"确认删除"标题）
- 用户实测：待用户硬刷后验证

## 经验（已 append 到 agent memory）

1. **inline style 优先级**：HTML 元素加 inline `display: none` 后，**任何** JS 切 `classList` 都无法显示。**不要**再加 inline 样式防闪烁——用 `<style>` 默认 `display: none` + `.open` class 切显示
2. **CSS 作用域**：所有 modal **必须**写在 `.dashboard-host` **内部**，否则 `.dashboard-host .modal { ... }` 规则不匹配
3. **HTML 容错**：孤立 `</section></div>` 浏览器会忽略，找 div 收尾要数**深度**，**不**是看代码缩进
4. **测试 modal 显示**：用 **viewport 截图**，**不要**用 fullPage——Chromium fullPage 把 `position: fixed` 元素画在 page 末尾，看起来像 fixed 失效
5. **守门 8 步**（在 modal-review 6 步基础上加）：
   - ⑦ grep `id="dashboard-host"` 开标签 + 数 div 深度到 modal 位置，确认 modal 在 dashboard-host 内部
   - ⑧ grep modal 元素 inline style，不准 `display: none` / `visibility: hidden` / `position: absolute` 之类手动锁显示

## v1.3.1.1 vs v1.3.1 关系

v1.3.1 是 minor 版本（新功能：三选项级联 modal），v1.3.1.1 是 patch hotfix（修 v1.3.1 的 HTML 位置/CSS bug，**无新功能**）。按 semver 规范属于 patch 级别。

## 文件改动汇总

| 文件 | 改动 |
|------|------|
| `SerialCube.html` | -8 / +10 (3 处改动) |
| `docs/changelog/2026-08-13-v1.3.1.1-cascade-modal-fix.md` | 新建 (2.9KB) |
| `docs/handover/HANDOFF-V1.3.1.1-2026-08-13.md` | (本文) |
| `README.md` | 加 v1.3.1.1 段（最新版本），v1.3.1 改历史段 |
| `docs/README.md` | 当前状态/最新 release 改 v1.3.1.1 |
| `docs/handover/HANDOFF-PENDING-V1.3-2026-08-12.md` | 加 v1.3.1.1 完成记录 |
| `SUPPORTED-PROTOCOLS.md` | 删除（fc1857b，用户确认不再需要） |

## 待办

- **5-10 分钟后** GitHub Pages 部署完成
- 用户硬刷本地版 + GitHub Pages 部署版，**分别**测试：
  1. 切到仪表盘模式（顶部第 3 个 mode 按钮）
  2. 点左上角"协议配置"按钮进配置中心
  3. 配置中心 → 协议 tab → 协议行右边找**删除**按钮（垃圾桶图标，**不是编辑**）→ 点删除
  4. 应该弹出 v1.3.1 级联 modal（标题"确认删除" + 引用预览 chip + 3 按钮）

## 相关 commit

- c4d8b08 fix(v1.3.1.1): cascade modal 位置 + inline display:none 修复
- fc1857b chore: 删除 SUPPORTED-PROTOCOLS.md (不再需要, 用户确认)
- 81deb3e docs(v1.3.1): Mutator 注入绑定 + 完整 handoff (v1.3.1 上一 commit)
