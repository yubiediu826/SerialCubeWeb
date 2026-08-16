// L3 真浏览器 e2e 冒烟 (Playwright): 加载 SerialCube.html → 黄金向量 in-page 断言 → 视觉截图
// 本环境无 chromium 二进制时自动 skip (exit 0); CI (ubuntu) 由 workflow 先 npx playwright install
// 用法: node tests/e2e/smoke.spec.mjs [--base-url http://localhost:8000]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

async function main() {
  // 1. 本地静态服务
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(ROOT, urlPath === '/' ? '/SerialCube.html' : urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const shotsDir = join(ROOT, '.tmp', 'e2e-shots');

  // 2. 浏览器 (缺失则 skip)
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.log(`[SKIP] 无 chromium 二进制, L3 e2e 跳过 (CI 会安装): ${e.message.split('\n')[0]}`);
    server.close();
    return 0;
  }

  let fail = 0;
  const ok = (cond, name, detail = '') => { if (cond) { console.log(`  [PASS] ${name}`); } else { fail++; console.log(`  [FAIL] ${name} ${detail}`); } };

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${base}/SerialCube.html`, { waitUntil: 'load' });

    ok(await page.title() !== '', '页面标题非空');
    ok(errors.length === 0, '加载期无页面错误', errors.slice(0, 2).join(' | '));

    // 3. in-page 黄金向量断言 (真浏览器验证 JS 集成)
    const result = await page.evaluate(() => {
      const NS = window.NS;
      const out = {};
      out.crc = NS.crc16Modbus([0x5A, 0x01, 0x03, 0x01, 0x00]) === 0x618C;
      const proto = (NS.PROTOCOLS || []).find((p) => p.id === 'proto_bms_v113');
      out.proto = !!proto;
      out.emsProto = !!(NS.PROTOCOLS || []).find((p) => p.id === 'proto_ems_v143');
      if (proto) {
        const cmd = proto.commands.find((c) => c.id === 0x03);
        const f = NS.buildFrame(proto, cmd);
        out.frame = f.bytes.length === 7 && f.bytes[0] === 0x5A && f.bytes[5] === 0x8C && f.bytes[6] === 0x61;
      }
      // 切换仪表盘模式 (UI 层)
      const dashBtn = document.getElementById('dashboard-mode-btn') || document.querySelector('[data-mode="dashboard"]');
      out.dashBtn = !!dashBtn;
      return out;
    });
    ok(result.crc, 'in-page CRC16 黄金向量');
    ok(result.proto, 'proto_bms_v113 注册');
    ok(result.emsProto, 'proto_ems_v143 注册');
    ok(result.frame, 'buildFrame 0x03 帧字节正确');
    ok(result.dashBtn, '仪表盘入口按钮存在');

    // 4. 视觉截图 (浅色/深色, 基线第一轮)
    mkdirSync(shotsDir, { recursive: true });
    await page.screenshot({ path: join(shotsDir, 'light-home.png'), fullPage: true });
    await page.evaluate(() => { document.body.classList.add('theme-dark'); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(shotsDir, 'dark-home.png'), fullPage: true });
    console.log(`  [INFO] 截图已存 .tmp/e2e-shots/ (视觉回归基线)`);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`L3 e2e: ${fail === 0 ? '通过' : `${fail} 项失败`}`);
  return fail ? 1 : 0;
}

process.exit(await main());
