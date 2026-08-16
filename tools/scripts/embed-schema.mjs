// 将 tools/schemas/*.json 嵌入 SerialCube.html 的 marker 位 (单文件约束下 schema 内嵌)
// 用法: node tools/scripts/embed-schema.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const schemaFile = 'tools/schemas/bms_v113.json';
const htmlFile = 'SerialCube.html';
const marker = '// @SCHEMA_EMBED_BMS_V113@';

const schemaJson = readFileSync(schemaFile, 'utf8');
const html = readFileSync(htmlFile, 'utf8');
if (!html.includes(marker)) {
  console.error(`[X] marker 不存在于 ${htmlFile}`);
  process.exit(1);
}
const block = `        NS._SCHEMA_BMS_V113 = ${schemaJson.trim()};\n`;
writeFileSync(htmlFile, html.replace(marker, block));
console.log(`[OK] 已嵌入 ${schemaFile} (${(schemaJson.length / 1024).toFixed(1)} KB) → ${htmlFile}`);
