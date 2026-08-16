// 从合并的 bms_v113.json 生成主机/从机两个"视角"配置文件。
// 关键: 双页面仿真中, 主机页发 MB(控制/查询) + 收 CB(遥测), 从机页收 MB + 发 CB(响应),
//       两边都需要完整双向布局 (frame + 全部命令的 MB+CB), 区别只在 role 标记 + 协议 id。
// 用法: node tools/scripts/split-bms-schema.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync('tools/schemas/bms_v113.json', 'utf8'));

// 完整双向 schema (frame + 全部命令 MB+CB 原样拷贝)
const fullSchema = {
  version: src.version,
  meta: src.meta,
  frame: src.frame,
  commands: src.commands
};

const host = {
  id: 'proto_bms_v113_host',
  role: 'host',
  ...fullSchema
};
const slave = {
  id: 'proto_bms_v113_slave',
  role: 'slave',
  ...fullSchema
};

writeFileSync('tools/schemas/bms_v113_host.json', JSON.stringify(host, null, 1) + '\n');
writeFileSync('tools/schemas/bms_v113_slave.json', JSON.stringify(slave, null, 1) + '\n');

const nCmd = Object.keys(src.commands).length;
console.log(`[OK] host/slave 各含完整双向 ${nCmd} 命令 (role=host / role=slave)`);
