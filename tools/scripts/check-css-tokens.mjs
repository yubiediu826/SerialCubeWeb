// CSS token 校验: HTML 里每个 var(--x) 都必须在 :root / body.theme-* 中有定义
// 根治 --bg-elev 未定义就引用的那类 bug (v1.2.2 教训)
// 用法: node tools/scripts/check-css-tokens.mjs
import { readFileSync } from 'node:fs';

const html = readFileSync('SerialCube.html', 'utf8');
const defined = new Set();
const used = new Set();

// 定义: --name: value; 出现在 <style> 内
for (const m of html.matchAll(/--([a-zA-Z0-9_-]+)\s*:/g)) defined.add(m[1]);
// 使用: var(--name)
for (const m of html.matchAll(/var\(--([a-zA-Z0-9_-]+)\)/g)) used.add(m[1]);

const undefinedTokens = [...used].filter((t) => !defined.has(t)).sort();
if (undefinedTokens.length) {
  console.error(`[FAIL] ${undefinedTokens.length} 个 var(--x) 未定义: ${undefinedTokens.join(', ')}`);
  process.exit(1);
}
console.log(`[OK] CSS token 校验: ${used.size} 个使用 / ${defined.size} 个定义, 全部有定义`);
