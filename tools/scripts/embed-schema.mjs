// 将 tools/schemas/*.json 嵌入 SerialCube.html 的 marker 位 (单文件约束下 schema 内嵌)
// marker 约定: 注释行 `// @SCHEMA_EMBED_<ID>@`, 其中 <ID> 为 schema 文件名 (去扩展名, 大写)
// 用法: node tools/scripts/embed-schema.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const schemaDir = 'tools/schemas';
const htmlFile = 'SerialCube.html';

let html = readFileSync(htmlFile, 'utf8');
let embedded = 0;

for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.json'))) {
  const id = file.replace(/\.json$/, '').toUpperCase();
  const marker = `// @SCHEMA_EMBED_${id}@`;
  if (!html.includes(marker)) {
    console.log(`[skip] ${file}: marker ${marker} 不存在`);
    continue;
  }
  const schemaJson = readFileSync(`${schemaDir}/${file}`, 'utf8');
  const block = `        NS._SCHEMA_${id} = ${schemaJson.trim()};\n`;
  html = html.replace(marker, block);
  console.log(`[OK] 已嵌入 ${file} (${(schemaJson.length / 1024).toFixed(1)} KB)`);
  embedded++;
}

if (embedded === 0) {
  console.error('[X] 未嵌入任何 schema, 检查 tools/schemas/ 与 marker');
  process.exit(1);
}
writeFileSync(htmlFile, html);
console.log(`[OK] 共嵌入 ${embedded} 个 schema → ${htmlFile}`);
