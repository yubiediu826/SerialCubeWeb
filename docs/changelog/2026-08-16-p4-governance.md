# P4 持续治理 — 备份收编 + EMS 长尾转写 + Playwright L3 — 变更记录

**日期**: 2026-08-16
**VERSION**: 1.3.5（main 未发布工作，随下次发版 bump）
**状态**: ✅ 已完成并本地提交（4 commit: 04e7eb5 / a3deef8 / b2979f0 / 本记录）；⚠️ 待推送

---

## 内容

### ① 备份分支资产收编（04e7eb5）
`backup-pre-rollback-2026-08-14` 中 5 个工作区缺失的独有文档已收编入库（30 天清理窗口内）：
- `docs/superpowers/plans/2026-08-13-bms-v113-slave-and-config.md`（1073 行，模拟从机实施计划——P2 重建依据）
- `docs/handover/HANDOFF-V1.4.0-PENDING-BMS-V113-2026-08-13.md`（328 行，v1.4.0 BMS 集成交接背景）
- `docs/handover/HANDOFF-V1.2.2-HOTFIX-UI-PENDING-2026-08-13.md`、`HANDOFF-V1.3.1.1-2026-08-13.md`
- `docs/superpowers/plans/2026-08-13-v1.2.1-ui-consistency-plan.md`（CHANGELOG 引用恢复）
- 链接全通；分支剩余仅为旧版 .minimax 与 .superpowers 残留（无收编价值）

### ② EMS V1.4.3 长尾命令转写（a3deef8）
- **`tools/scripts/parse-ems-dump.py`**（入库）：从转储解析字段表，修复两处解析问题（带标题 MB 行被 startswith 过滤、列索引偏移）→ 461 字段 / 14 命令 MB+CB
- **`tools/scripts/gen-ems-schema.py`**（入库）：骨架 → schema（type 推断 + RES 兜底），保留 0xE1/0xEC 手写精细版
- **`tools/schemas/ems_v143.json`**：0xE2-0xEB/0xED/0xEE 字段表补全（0xED 电池级联 n1-n5 五组完整，len=190）
- **`embed-schema.mjs`**：支持赋值块正则更新（CRLF 兼容），schema 变更可重新嵌入
- L1 测试扩展：ems schema 结构校验（位区间不重叠/不越界）+ 7/7 全绿

### ③ Playwright L3 e2e（b2979f0）
- `tests/e2e/smoke.spec.mjs`：本地静态服务 + 真浏览器加载 SerialCube.html → in-page 黄金向量断言（CRC/buildFrame/协议注册）→ 浅/深主题截图基线
- 本环境无 chromium 二进制（下载受沙箱限制）→ 自动 SKIP（exit 0）；CI ubuntu 上 `npx playwright install --with-deps chromium` 后运行
- `package-lock.json` 入库（可复现 CI）；CI 新增 `l3-e2e` job + 截图 artifact

## 验证（本地全绿）
| 检查 | 结果 |
|------|------|
| L1 协议层（BMS+EMS，含 ems schema 结构校验） | 7/7 ✅ |
| L2 模拟器 + 传输集成 | 8/8 ✅ |
| P0 冒烟 | 32/32 ✅ |
| CSS token / 版本一致性 / 链接 | 全绿 ✅ |
| L3 e2e | SKIP（无浏览器，CI 运行） |

## 遗留
- EMS 字段 type/枚举/位定义需固件实测确认（schema 已标 note）
- 备份分支删除：本地引用，确认后可 `git branch -D backup-pre-rollback-2026-08-14`（建议保留至下个周期）
- P1-P3 + P4 共 17 个 commit 待推送

## 涉及文件
`docs/superpowers/plans/2026-08-13-bms-v113-slave-and-config.md` 等 5 个收编文档 / `tools/schemas/ems_v143.json` / `tools/scripts/{parse-ems-dump,gen-ems-schema}.py` / `tools/scripts/embed-schema.mjs` / `tests/e2e/smoke.spec.mjs` / `tests/protocol.test.mjs` / `package.json` / `package-lock.json` / `.github/workflows/ci.yml` / `docs/CHANGELOG.md` / `SerialCube.html`
