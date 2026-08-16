// 将 tools/schemas/*.json 嵌入 SerialCube.html (单文件约束下 schema 内嵌)
// BMS V1.13 为拆分源文件 (host=MB / slave=CB): 先 merge 再嵌入为 NS._SCHEMA_BMS_V113。
// 两种模式:
//   1) 首次: 替换注释 marker `// @SCHEMA_EMBED_<ID>@` (marker 来自 SerialCube.html 注册块)
//   2) 更新: 替换已存在的 `NS._SCHEMA_<ID> = {...};` 赋值块 (marker 已消耗后再次嵌入)
// 用法: node tools/scripts/embed-schema.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { mergeBmsSchemas } from './merge-bms-schema.mjs';

const schemaDir = 'tools/schemas';
const htmlFile = 'SerialCube.html';

let html = readFileSync(htmlFile, 'utf8');
let embedded = 0;

// BMS 拆分源文件 (host/slave) → 合并后嵌入; 跳过它们以免误嵌为独立 schema
const skipFiles = new Set(['bms_v113_host.json', 'bms_v113_slave.json']);
const bmsMerged = mergeBmsSchemas(`${schemaDir}/bms_v113_host.json`, `${schemaDir}/bms_v113_slave.json`);
embedSchema('BMS_V113', bmsMerged);

for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.json') && !skipFiles.has(f))) {
  const id = file.replace(/\.json$/, '').toUpperCase();
  if (id === 'BMS_V113') continue; // 已由 host/slave 合并嵌入
  embedSchema(id, JSON.parse(readFileSync(`${schemaDir}/${file}`, 'utf8')));
}

function embedSchema(id, schemaObj) {
  const marker = `// @SCHEMA_EMBED_${id}@`;
  const schemaJson = JSON.stringify(schemaObj, null, 1);
  const block = `        NS._SCHEMA_${id} = ${schemaJson};\n`;
  // 模式 2: 已有赋值块 (正则到第一个 `};` 结束; 兼容 CRLF 行尾)
  const assignRe = new RegExp(`NS\\._SCHEMA_${id} = \\{.*?\\};\\r?\\n`, 's');
  if (assignRe.test(html)) {
    html = html.replace(assignRe, block);
    console.log(`[OK] 更新 ${id} (${(schemaJson.length / 1024).toFixed(1)} KB)`);
    embedded++;
    return;
  }
  // 模式 1: marker
  if (html.includes(marker)) {
    html = html.replace(marker, block);
    console.log(`[OK] 嵌入 ${id} (${(schemaJson.length / 1024).toFixed(1)} KB)`);
    embedded++;
    return;
  }
  console.log(`[skip] ${id}: 无 marker 且无已有赋值块`);
}

if (embedded === 0) {
  console.error('[X] 未嵌入任何 schema, 检查 tools/schemas/ 与 SerialCube.html');
  process.exit(1);
}
writeFileSync(htmlFile, html);
console.log(`[OK] 共处理 ${embedded} 个 schema → ${htmlFile}`);
