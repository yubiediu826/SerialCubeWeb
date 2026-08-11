# SerialCube 工作流决策树

回答 5 个问题，决定走 brainstorming / grill-me / 直接开写 / 走 TDD。

## Q1: 改动是否触及协议层 / 算法 / 解析逻辑？

- **是** → 走 TDD（test-driven-development）
  - 例: 加 CRC 算法、改 hex 解析、加 Modbus 命令解析
- **否** → 进入 Q2

## Q2: 改动是否需要新增 UI 控件 / 改配色 / 改布局？

- **是** → 走 taste → ui-ux-pro-max → design-system 三件套（按 README §⑤ 顺序）
- **否** → 进入 Q3

## Q3: 改动是否影响 ≥ 3 个其他模块 / 多个文件 / 跨 widget？

- **是** → 走 brainstorming（9 步设计清单）→ writing-plans
- **否** → 进入 Q4

## Q4: 用户已经描述清楚需求（"按钮加个 X、文本改 Y"）？

- **是** → 走 grill-me（拷问到需求明确为止）→ 直接开写
- **否** → 进入 Q5

## Q5: 改动小到可以一句话写完（< 30 行 HTML/CSS/JS）？

- **是** → 直接开写（跳过 brainstorming/grill-me），但仍走 verification-before-completion
- **否** → 走 grill-me 拷问 2-3 个核心问题再开写

## 何时**不**用本工作流

- 排查 bug → 走 systematic-debugging（obra/superpowers）→ 改 → e2e 验证
- 重构既有代码 → 走 TDD（先有测试再改）
- 纯文档 / README 改动 → 直接改 → commit
