# P1-P3 协议 schema + 模拟双工具 + CI 门禁 — 变更记录（main 未发布）

**日期**: 2026-08-16
**VERSION**: 1.3.5（本批为 main 上未发布功能工作，随下次发版 bump）
**状态**: ✅ 已完成并本地提交（11 commit: 7c351f8..dc66e22）；⚠️ 推送因本机网络无法连通 GitHub 暂缓（`git -c http.proxy= -c https.proxy= push origin main --tags` 待网络恢复执行）
**关联**: 评审报告 [docs/review/2026-08-16-code-quality-and-workflow-review.md](../review/2026-08-16-code-quality-and-workflow-review.md)

---

## 内容

### P1 协议位级解析核心（5 commit: 85a909f / 0f24286 / 7a284ec / 35e3a41 / 1f6fef4）
- **schema 中间表示**（`tools/schemas/`）：`bms_v113.json`（0x01/0x02/0x03 完整位表 + 19 命令骨架）、`ems_v143.json`（checksum 帧 + 0xE1/0xEC/0xED 完整 + 其余骨架）；格式规范见 `tools/schemas/README.md`
- **位级解码器** `NS.parseFrame`/`_bitReader`/`_parseSchemaLayout`：跨字节位域、位图展开、缩放/偏移、枚举映射、ASCII 小端、数组、有符号、校验和；`tryDispatchSchemaFrames` 接入 readLoop
- **位级编码器** `_buildFrameSchema`：MB/REQ 帧与 golden 逐字节一致（含 101B 配置帧/位图/有符号往返）
- **cadence 轮询器**：连接态按命令周期发查询帧
- **仪表盘真实遥测卡**：BMS V1.13 6 张 + EMS V1.4.3 4 张
- **黄金向量测试** `tests/golden-vectors.json` + `tests/protocol.test.mjs`（L1 6/6）：文档实算帧 + 修正 3 处文档矛盾（0x01 len 异常/0x03 位定义矛盾/EMS checksum 范围）以"字节按位定义解析的真实结果"为准
- 复用/修复：完整 BMS 协议文档（1352 行）恢复、CRC-REFERENCE 修正、`docs/review/` 入库

### P2 模拟主机 + 模拟从机（3 commit: 9117e92 / d65c3db / dc66e22）
- `tools/schema_codec.py`：Python 位级编解码（与 JS 同逻辑，共享 golden 交叉验证）
- `tools/host_sim.py`：**模拟主机**（schema 驱动周期查询/响应解析/黄金自检）
- `tools/device_sim.py`：**模拟从机**（19 命令应答/状态模型/漂移/故障注入 mute·crc-bad；0x02 ack 与文档示例逐字节一致）
- `tests/test_sim.py`：L2 8/8（含 socket 传输层集成测试，CI 无串口硬件路径）

### P3 CI 门禁 + 文档修复（2 commit: f3dcc70 / cb405bc）
- `.github/workflows/ci.yml`：7 项门禁（link-check / CSS token / 版本一致性 / changelog 存在性 / L1 / L2 / 模拟器自检）全绿才部署
- 坏链 47 → 0（3 个缺失交接文档建重定向存根 + 路径/typo 修复）；link-check 脚本修 3 处 bug（`../` 误跳 / 多链接漏检 / node_modules 未排除）
- **修复 9 个未定义 CSS token**（27 处静默失效，`--bg-elev` v1.2.2 遗留 bug 根除）+ `check-css-tokens.mjs` 防复发

## 验证（本地全绿）
| 检查 | 结果 |
|------|------|
| L1 协议层（BMS+EMS 黄金向量） | 6/6 ✅ |
| L2 模拟器 + 传输集成 | 8/8 ✅ |
| P0 冒烟回归 | 32/32 ✅ |
| CSS token / 版本一致性 / 链接 | 全绿 ✅ |

## 遗留（P4 持续治理）
- EMS 长尾命令字段表（0xE2/0xE3/0xE4-0xEB/0xEE，转储见 `.tmp/ems-xlsx-dump.txt`，与固件确认后转写）
- Playwright L3 e2e + 视觉回归基线
- 推送积压（11 commit + v1.3.5 tag）
- backup 分支 30 天清理窗口内的资产收编

## 涉及文件
`SerialCube.html` / `tools/schemas/{bms_v113,ems_v143}.json` / `tools/schemas/README.md` / `tools/{crc16,schema_codec,host_sim,device_sim}.py` / `tools/scripts/{embed-schema,check-css-tokens,check-version}.mjs` / `tests/{golden-vectors.json,protocol.test.mjs,test_sim.py}` / `.github/workflows/ci.yml` / `docs/reference/BMS通信协议V1.13.md`（1352 行恢复）/ `docs/CHANGELOG.md` / `README.md` / `docs/README.md` / 文档链接修复 20 文件
