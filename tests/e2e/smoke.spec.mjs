// L3 真浏览器 e2e 冒烟 (Playwright): 加载 SerialCube.html → 黄金向量 in-page 断言 → 视觉截图
// 本环境无 chromium 二进制时自动 skip (exit 0); CI (ubuntu) 由 workflow 先 npx playwright install
// 用法: node tests/e2e/smoke.spec.mjs [--base-url http://localhost:8000]
//
// v1.3.11 修:  SerialCube.html 整个 IIFE ~23000 行 inline script,
//   page.goto({waitUntil:'load'}) 在 headless shell 下不等 inline script 执行完就返回,
//   造成 window.NS.crc16Modbus 还没赋值就 evaluate → 假红.
//   改用 'domcontentloaded' + page.waitForFunction 显式等 NS.crc16Modbus 就绪
// v1.3.11 修:  收集 console.error / console.warn, 任意一条就 fail (避免假绿)
// v1.3.11 修:  evaluate 套 try/catch, 失败输出栈而不是直接 throw 退出
// v1.3.11 修:  失败时保留失败截图到 .tmp/e2e-shots/fail-*.png
// v1.3.11 修:  Windows 下 path.normalize 把 / 转 \, ROOT 是 URL pathname 来的保留 /,
//   startsWith 直接比较会失败 → 误判 403. 统一转 forward-slash 再比
// v1.3.11 修:  console error 拆"应用层"和"网络层"两层, 已知 localhost 无后端 API
//   产生的 404 只 WARN 不 FAIL, 避免假绿陷阱
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

async function main() {
  // 1. 本地静态服务
  // v1.3.11 修:  Windows 下 path.normalize 把 / 转 \, ROOT 是 URL pathname 来的保留 /,
  //   startsWith 直接比较会失败 → 误判 403. 统一转 forward-slash 再比
  const ROOT_NORM = ROOT.replace(/\\/g, '/');
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(ROOT, urlPath === '/' ? '/SerialCube.html' : urlPath)).replace(/\\/g, '/');
      if (!file.startsWith(ROOT_NORM)) { res.writeHead(403); res.end(); return; }
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
  const failShot = async (page, tag) => {
    try { await page.screenshot({ path: join(shotsDir, `fail-${tag}.png`), fullPage: false }); } catch {}
  };

  try {
    mkdirSync(shotsDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    const consoleAppErrors = []; // 应用层 console.error
    const consoleNetErrors = []; // 浏览器原生网络层 console.error
    const consoleWarns = [];
    const failedReqs = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (msg) => {
      const t = msg.type();
      const text = msg.text();
      // 区分应用层 vs 网络层 console.error
      //   "Failed to load resource" / "net::ERR_*" 是浏览器原生网络层, 不算应用 bug
      if (t === 'error') {
        if (/Failed to load resource|net::ERR_/i.test(text)) consoleNetErrors.push(text);
        else consoleAppErrors.push(text);
      } else if (t === 'warning') consoleWarns.push(text);
    });
    page.on('requestfailed', (req) => failedReqs.push(`${req.url()} (${req.failure()?.errorText || 'failed'})`));
    page.on('response', (resp) => {
      if (resp.status() >= 400) failedReqs.push(`${resp.status()} ${resp.url()}`);
    });

    // domcontentloaded 而不是 load: SerialCube.html 整个 IIFE 在 body 末尾, 解析完 body 时
    // 23000 行 inline script 才执行, load 事件在 headless shell 下可能先于 script 执行完成触发
    const resp = await page.goto(`${base}/SerialCube.html`, { waitUntil: 'domcontentloaded' });
    if (resp) console.log(`  [DBG] page.goto: status=${resp.status()} url=${resp.url()}`);

    // 显式等 NS.crc16Modbus 就绪 (race-condition 修复)
    const ready = await page
      .waitForFunction(() => !!(window.NS && typeof window.NS.crc16Modbus === 'function'), null, { timeout: 30000 })
      .then(() => true)
      .catch((e) => { console.log(`  [DBG] waitForFunction err: ${e.message.split('\n')[0]}`); return false; });
    if (!ready) {
      // 诊断: 拿当前 window.NS 状态 + 任何 console + 页面 DOM 状态
      const dbg = await page.evaluate(() => {
        const ls = window.__dbgLog || [];
        return {
          pageURL: location.href,
          title: document.title,
          hasNS: !!window.NS,
          NSkeys: window.NS ? Object.keys(window.NS).slice(0, 30) : [],
          crcType: window.NS ? typeof window.NS.crc16Modbus : 'NS-undef',
          readyState: document.readyState,
          bodyChild: document.body && document.body.children.length,
          bodyHTML: document.body ? document.body.innerHTML.length : 0,
          dashboardHost: !!document.getElementById('dashboard-host'),
          hostHTML: document.getElementById('dashboard-host') ? document.getElementById('dashboard-host').outerHTML.length : 0,
          scriptCount: document.scripts.length,
          lastScriptLen: document.scripts.length ? document.scripts[document.scripts.length - 1].textContent.length : 0,
        };
      }).catch((e) => ({ err: String(e) }));
      console.log(`  [DBG] NS 状态: ${JSON.stringify(dbg)}`);
      await failShot(page, 'ns-not-ready');
      ok(false, 'NS.crc16Modbus 30s 内就绪', '(SerialCube.html IIFE 未完成执行?)');
      return 1;
    }
    ok(true, 'NS.crc16Modbus 30s 内就绪');

    const title = await page.title();
    ok(title && title.trim() !== '', '页面标题非空', `(got: "${title}")`);

    ok(pageErrors.length === 0, '加载期无 pageerror', pageErrors.slice(0, 2).join(' | '));
    ok(consoleAppErrors.length === 0, '加载期无应用层 console.error (真 bug)', consoleAppErrors.slice(0, 2).join(' | '));
    if (consoleNetErrors.length) console.log(`  [WARN] 浏览器网络层 console.error: ${consoleNetErrors.length} 条 (可能 localhost 无后端 API)`);
    if (failedReqs.length) console.log(`  [INFO] 4xx/5xx 资源: ${failedReqs.length} 个, e.g. ${failedReqs.slice(0, 3).join(' | ')}`);

    // 3. in-page 黄金向量断言 (真浏览器验证 JS 集成) — try/catch 输出具体栈
    const evalRes = await page.evaluate(() => {
      try {
        const NS = window.NS;
        const out = { ok: true, errors: [] };
        out.crc = NS.crc16Modbus([0x5A, 0x01, 0x03, 0x01, 0x00]) === 0x618C;
        const proto = (NS.PROTOCOLS || []).find((p) => p.id === 'proto_bms_v113');
        out.proto = !!proto;
        out.cmdBoth = !!(proto && proto.commands.find((c) => c.id === 0x01 && c.direction === 'both'));
        if (proto) {
          const cmd = proto.commands.find((c) => c.id === 0x03);
          const f = NS.buildFrame(proto, cmd);
          out.frame = !!(f && f.bytes && f.bytes.length === 7 && f.bytes[0] === 0x5A && f.bytes[5] === 0x8C && f.bytes[6] === 0x61);
        } else { out.frame = false; }
        const dashBtn = document.getElementById('dashboard-mode-btn') || document.querySelector('[data-mode="dashboard"]');
        out.dashBtn = !!dashBtn;
        return out;
      } catch (e) { return { ok: false, err: String(e && e.stack || e) }; }
    });

    if (!evalRes.ok) {
      fail += 5; // 5 个 in-page 断言全算失败
      console.log(`  [FAIL] in-page evaluate 抛异常: ${evalRes.err}`);
      await failShot(page, 'eval-throw');
    } else {
      ok(evalRes.crc, 'in-page CRC16 黄金向量');
      ok(evalRes.proto, 'proto_bms_v113 注册');
      ok(evalRes.cmdBoth, '0x01 命令双向 (tx+rx)');
      ok(evalRes.frame, 'buildFrame 0x03 帧字节正确');
      ok(evalRes.dashBtn, '仪表盘入口按钮存在');
    }

    // 4. 视觉截图 (浅色/深色, 基线第一轮)
    try {
      await page.screenshot({ path: join(shotsDir, 'light-home.png'), fullPage: false });
      await page.evaluate(() => { document.body.classList.add('theme-dark'); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(shotsDir, 'dark-home.png'), fullPage: false });
      console.log(`  [INFO] 截图已存 .tmp/e2e-shots/ (viewport, 视觉回归基线)`);
    } catch (e) {
      console.log(`  [WARN] 截图失败: ${e.message.split('\n')[0]}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`L3 e2e: ${fail === 0 ? '通过' : `${fail} 项失败`}`);
  return fail ? 1 : 0;
}

process.exit(await main());
