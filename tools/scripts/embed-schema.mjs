// 将 tools/schemas/*.json 嵌入 SerialCube.html (单文件约束下 schema 内嵌)
// 两种模式:
//   1) 首次: 替换注释 marker `// @SCHEMA_EMBED_<ID>@` (marker 来自 SerialCube.html 注册块)
//   2) 更新: 替换已存在的 `NS._SCHEMA_<ID> = {...};` 赋值块 (marker 已消耗后再次嵌入)
// 用法: node tools/scripts/embed-schema.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const schemaDir = 'tools/schemas';
const htmlFile = 'SerialCube.html';

let html = readFileSync(htmlFile, 'utf8');
let embedded = 0;

for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.json'))) {
  const id = file.replace(/\.json$/, '').toUpperCase();
  const marker = `// @SCHEMA_EMBED_${id}@`;
  const schemaJson = readFileSync(`${schemaDir}/${file}`, 'utf8');
  const block = `        NS._SCHEMA_${id} = ${schemaJson.trim()};\n`;
  // 模式 2: 已有赋值块 (正则到第一个 `};` 结束; 兼容 CRLF 行尾)
  const assignRe = new RegExp(`NS\\._SCHEMA_${id} = \\{.*?\\};\\r?\\n`, 's');
  if (assignRe.test(html)) {
    html = html.replace(assignRe, block);
    console.log(`[OK] 更新 ${file} (${(schemaJson.length / 1024).toFixed(1)} KB)`);
    embedded++;
    continue;
  }
  // 模式 1: marker
  if (html.includes(marker)) {
    html = html.replace(marker, block);
    console.log(`[OK] 嵌入 ${file} (${(schemaJson.length / 1024).toFixed(1)} KB)`);
    embedded++;
    continue;
  }
  console.log(`[skip] ${file}: 无 marker 且无已有赋值块`);
}

if (embedded === 0) {
  console.error('[X] 未嵌入任何 schema, 检查 tools/schemas/ 与 SerialCube.html');
  process.exit(1);
}
writeFileSync(htmlFile, html);
console.log(`[OK] 共处理 ${embedded} 个 schema → ${htmlFile}`);
