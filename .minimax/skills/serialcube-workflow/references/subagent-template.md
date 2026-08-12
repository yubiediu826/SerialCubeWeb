# Subagent 4 段 Report 模板

> 适用: SerialCube 项目的所有 subagent 调用 (≤ 3K prompt / ≤ 500 行改动)

## 硬性规则 (subagent 容易 aborted, 必须遵守)

1. **任务拆分**: 1 subagent 1 task, ≤ 500 行代码改动, ≤ 3K token prompt
2. **不在 subagent 里跑 verify**: subagent 只改代码 + 写最小自测; verify 由 parent agent 跑
3. **强制 4 段 report**: subagent 完成必须输出以下 4 段, aborted 时 parent 至少能拿 partial
4. **fallback 协议**: subagent aborted 时 parent 立即 `git diff --stat` + 跑 untracked verify 脚本 + 不重试,直接接力 patch
5. **心跳**: subagent prompt 要求每 100 行改输出 [HEARTBEAT] 当前进度

## 4 段 Report 格式

subagent **必须**在最终输出包含以下 4 段 (顺序固定):

```
[REPORT-CHANGED]
- Files: <changed file paths>
- Diff: <git diff --stat 输出>
- Lines: <+/- 行数>
- Heartbeats: <最后一次 heartbeat 行数>

[REPORT-VERIFIED]
- Self-test: <subagent 自己跑的最小自测, 例如 grep 验证关键行存在>
- Console: <console.error 数量, 期望 0>
- e2e: NOT_RUN (parent 跑)

[REPORT-NEXT]
- Parent should: <下一步接力动作, 例如 "跑 preflight.ps1 → 跑 e2e 01+04+06 → bump-version.ps1 → 中文 commit">
- Risk: <残余风险, 例如 "v1.1.1 modal stack 改动需要真实浏览器测一遍, jsdom 不可达">
- Block: <阻塞项, 无则写 "none">

[HEARTBEAT-EVERY-100L]
- Last at: <行号, 例如 "300/500">
- Progress: <当前任务进度, 例如 "modal stack 重构 100% done, edit mode CSS 50% pending">
```

## Subagent Prompt 模板

```markdown
# Task
<具体任务, ≤ 3K token, 包含: 文件路径 / 行号 / 改什么 / 验收标准>

# Constraints (硬性)
- 改动 ≤ 500 行
- 不要跑 e2e / agent-browser (parent 跑)
- 不修改 SerialCube.html 之外的 docs/handover (除非指定)
- 改完 grep 验证关键改动存在 (最小自测)

# Output Required (4 段, 顺序固定)
[REPORT-CHANGED] ...
[REPORT-VERIFIED] ...
[REPORT-NEXT] ...
[HEARTBEAT-EVERY-100L] ...

# Heartbeat (每 100 行改输出一次, 防 aborted 失联)
每改 100 行, 输出一行 [HEARTBEAT] <行数>: <进度摘要>

# Fallback (aborted 时)
如果你被截断, 立即:
1. git diff --stat 输出当前进度
2. 列出未完成的行号 + 待改内容
3. 不要重试, 让 parent 接力

# Done Criteria
- 改动 < 验收标准>
- 4 段 report 全部输出
- 最后一行输出 "DONE: <task-name>"
```

## Parent 端 Fallback 协议 (subagent aborted)

```powershell
# 1. 看 subagent 是否给了 partial report
$lastReport = "<subagent 最后输出>"

# 2. 看 git 状态
git diff --stat
git status --short

# 3. 看未追踪的 verify 脚本 (subagent 可能写了但没 commit)
Get-ChildItem -Recurse -Filter "verify-*.js" -ErrorAction SilentlyContinue

# 4. 不重试 subagent, parent 接力 patch
# 读 subagent 的 partial report + git diff, 直接补改
```

## 为什么 4 段?

| 段 | 价值 | 缺它会怎样 |
|---|---|---|
| REPORT-CHANGED | 知道改了哪些文件 + diff 大小 | aborted 时不知道哪些已改 |
| REPORT-VERIFIED | 知道 subagent 自测了什么 | aborted 时不知道哪部分可信 |
| REPORT-NEXT | 接力点 | parent 不知道下一步 |
| HEARTBEAT | 进度可视化 | aborted 时不知道停在第几行 |

## 真实案例 (v1.1.1 modal stack 改动)

如果当时 v1.1.1 拆 subagent 跑 modal stack, prompt 应是:

```markdown
# Task
改 SerialCube.html 行 12480-12500 (NS.openModal / NS.closeModal), 引入 NS._modalStack 栈。
改动: openModal push, closeModal 弹栈, z-index 动态 1000 + stack.length*20。
另外删除 4 处 NS.closeModal('dh-config-center'): 行 12824/12863/12934/13612。
Esc 键绑定 document keydown, 只关栈顶。
最后加 [REPORT-CHANGED/VERIFIED/NEXT/HEARTBEAT] 4 段。
```

约 200 token, 1 subagent 跑完, parent 接力 e2e + commit。**实际总 token 消耗预计省 30%** (subagent 报告只回核心 4 段, 不带 context)。
