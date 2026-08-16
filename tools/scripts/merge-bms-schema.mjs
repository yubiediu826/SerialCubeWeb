// 合并 bms_v113_host.json (MB) + bms_v113_slave.json (CB) → 单一 bms_v113.json
// 判向 (parseFrame 帧头 match) 需要同一 schema 内同时有 MB+CB, 故运行时合并。
// 用法: node tools/scripts/merge-bms-schema.mjs  (或由 embed-schema.mjs 调用)
import { readFileSync, writeFileSync } from 'node:fs';

export function mergeBmsSchemas(hostPath, slavePath) {
  const host = JSON.parse(readFileSync(hostPath, 'utf8'));
  const slave = JSON.parse(readFileSync(slavePath, 'utf8'));
  // 帧定义以 host 为准 (host/slave 的 frame 应一致; slave 只提供 CB 布局)
  const merged = {
    id: 'proto_bms_v113',
    version: host.version,
    meta: host.meta,
    frame: host.frame,
    commands: {}
  };
  const allKeys = new Set([...Object.keys(host.commands), ...Object.keys(slave.commands)]);
  for (const cmdKey of allKeys) {
    const h = host.commands[cmdKey] || {};
    const s = slave.commands[cmdKey] || {};
    const cmdDef = { desc: h.desc || s.desc };
    if (h.MB) cmdDef.MB = h.MB;
    if (s.CB) cmdDef.CB = s.CB;
    merged.commands[cmdKey] = cmdDef;
  }
  return merged;
}

// CLI 入口
if (process.argv[1] && process.argv[1].endsWith('merge-bms-schema.mjs')) {
  const merged = mergeBmsSchemas('tools/schemas/bms_v113_host.json', 'tools/schemas/bms_v113_slave.json');
  writeFileSync('tools/schemas/bms_v113.json', JSON.stringify(merged, null, 1) + '\n');
  const nCmd = Object.keys(merged.commands).length;
  const nBoth = Object.values(merged.commands).filter((c) => c.MB && c.CB).length;
  console.log(`[OK] 合并 ${nCmd} 命令 (双向 ${nBoth}, MB-only ${Object.values(merged.commands).filter((c) => c.MB && !c.CB).length}, CB-only ${Object.values(merged.commands).filter((c) => c.CB && !c.MB).length})`);
}
