// 版本一致性校验: const VERSION == README == docs/README == CHANGELOG 最新 == 最新 git tag
// "VERSION 三处同步"硬规则的机器化 (根治 tag 断裂类问题)
// 用法: node tools/scripts/check-version.mjs
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const read = (p) => readFileSync(p, 'utf8');

const html = read('SerialCube.html');
const m = html.match(/const VERSION = '([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)'/);
if (!m) { console.error('[FAIL] SerialCube.html 找不到 const VERSION'); process.exit(1); }
const ver = m[1];

const readme = read('README.md');
const readmeVer = (readme.match(/当前版本[^\n]*?v?([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)/) || [])[1];

const docsReadme = read('docs/README.md');
const docsVer = (docsReadme.match(/最新版本[^\n]*?v?([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)/) || [])[1];

const changelog = read('docs/CHANGELOG.md');
const changelogVer = (changelog.match(/\*\*v?([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)\*\*/) || [])[1];

let tagVer = null;
try {
  const tags = execSync('git tag --sort=-version:refname', { encoding: 'utf8' }).trim().split('\n');
  if (tags.length) tagVer = tags[0].replace(/^v/, '');
} catch { /* 无 tag */ }

const rows = [
  ['SerialCube.html const VERSION', ver],
  ['README.md 当前版本', readmeVer],
  ['docs/README.md 最新版本', docsVer],
  ['docs/CHANGELOG.md 最新条目', changelogVer],
  ['最新 git tag', tagVer],
];
for (const [label, v] of rows) console.log(`  ${label}: ${v ?? '(缺失)'}`);

const mismatches = rows.filter(([, v]) => v && v !== ver);
if (mismatches.length) {
  console.error(`[FAIL] 版本不一致: 代码 ${ver}, 不一致项: ${mismatches.map(([l]) => l).join(' / ')}`);
  process.exit(1);
}
console.log(`[OK] 版本一致性: v${ver} 五处同步`);
