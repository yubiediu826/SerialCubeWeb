// 一次性引导脚本: 把合并的 bms_v113.json 拆成主机(MB)/从机(CB) 两个源文件。
// 之后维护以 host/slave 为准, 合并由 merge-bms-schema.mjs 完成。
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync('tools/schemas/bms_v113.json', 'utf8'));

const host = {
  id: 'proto_bms_v113_host',
  role: 'host',
  version: src.version,
  meta: src.meta,
  frame: src.frame,
  commands: {}
};
const slave = {
  id: 'proto_bms_v113_slave',
  role: 'slave',
  version: src.version,
  meta: src.meta,
  frame: src.frame,
  commands: {}
};

for (const [cmdKey, cmdDef] of Object.entries(src.commands)) {
  const h = { desc: cmdDef.desc };
  const s = { desc: cmdDef.desc };
  if (cmdDef.MB) h.MB = cmdDef.MB;
  if (cmdDef.CB) s.CB = cmdDef.CB;
  if (Object.keys(h).length > 1) host.commands[cmdKey] = h;
  if (Object.keys(s).length > 1) slave.commands[cmdKey] = s;
}

writeFileSync('tools/schemas/bms_v113_host.json', JSON.stringify(host, null, 1) + '\n');
writeFileSync('tools/schemas/bms_v113_slave.json', JSON.stringify(slave, null, 1) + '\n');

const nHost = Object.keys(host.commands).length;
const nSlave = Object.keys(slave.commands).length;
console.log(`[OK] host ${nHost} 命令 (MB), slave ${nSlave} 命令 (CB)`);
