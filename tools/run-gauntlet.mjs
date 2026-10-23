#!/usr/bin/env node
/* Run GlassBox's self-test gauntlet in a headless browser — the same suite the app runs in Settings, with no
   network and no model calls. For coding harnesses fixing a red run, CI, and the cloud terminal.

   usage: node tools/run-gauntlet.mjs [GlassBox.html] [--mobile] [--json] [--only id1,id2] [--chrome]
     --mobile  iPhone Air sized (420×912), touch, iPhone user agent — the layout the phone tests depend on
     --json    machine-readable result on stdout
     --only    report only these case ids (the whole suite still runs)
     --chrome  use the installed Google Chrome instead of Playwright's bundled Chromium

   Exit status: 0 every case passed · 1 at least one failed · 2 the suite could not run. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const only = (() => { const i = args.indexOf('--only'); return i >= 0 ? String(args[i + 1] || '').split(',').filter(Boolean) : null; })();
const onlyAt = args.indexOf('--only');
const file = path.resolve(args.filter((a, i) => !a.startsWith('--') && (onlyAt < 0 || i !== onlyAt + 1))[0] || 'GlassBox.html');
const die = (msg) => { if (flag('--json')) console.log(JSON.stringify({ok: false, error: msg})); else console.error('✗ ' + msg); process.exit(2); };
if (!fs.existsSync(file)) die('no such file: ' + file);

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const roots = [process.cwd()];
  try { roots.push(execSync('npm root -g', {encoding: 'utf8'}).trim()); } catch {}
  for (const r of roots) {
    try { return createRequire(path.join(r, 'noop.js'))('playwright'); } catch {}
    try { return createRequire(path.join(r, 'noop.js'))(path.join(r, 'playwright')); } catch {}
  }
  die('Playwright is not installed — `npm i -g playwright@1 && npx playwright install chromium` (or pass --chrome)');
}

const dir = path.dirname(file), name = path.basename(file);
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.png': 'image/png'};
const server = http.createServer((req, res) => {
  const p = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream'});
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const pw = await loadPlaywright();
let browser;
/* Playwright's own Chromium first (what the cloud image ships); an installed Google Chrome when that is missing. */
for (const opts of flag('--chrome') ? [{channel: 'chrome'}] : [{}, {channel: 'chrome'}]) {
  try { browser = await pw.chromium.launch({headless: true, ...opts}); break; } catch (e) { var launchErr = e; }
}
if (!browser) { server.close(); die('could not start a browser: ' + String(launchErr && launchErr.message || launchErr).split('\n')[0]); }
const ctx = await browser.newContext(flag('--mobile') ? {
  viewport: {width: 420, height: 912}, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1'
} : {viewport: {width: 1366, height: 900}});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message || e)));
let result;
try {
  await page.goto(`http://127.0.0.1:${port}/${name}`, {waitUntil: 'load', timeout: 60000});
  await page.waitForFunction(() => window.__gb && typeof window.__gb.gauntletRun === 'function', null, {timeout: 60000});
  result = await page.evaluate(() => {
    const r = window.__gb.gauntletRun();
    return {total: r.total, failed: r.failed, boot: (window.BOOT_FAILS || []).length,
      fails: r.results.filter(x => !x.ok).map(x => ({id: x.id, sub: x.sub, what: x.what, detail: String(x.detail || x.error || ''), uses: x.uses}))};
  });
} catch (e) {
  await browser.close(); server.close();
  die('the suite did not run: ' + String(e.message || e).split('\n')[0] + (pageErrors.length ? ' — page error: ' + pageErrors[0] : ''));
}
await browser.close(); server.close();
const shown = only ? result.fails.filter(f => only.includes(f.id)) : result.fails;
if (flag('--json')) console.log(JSON.stringify({ok: result.failed === 0, ...result, fails: shown, pageErrors}));
else {
  console.log(`${result.failed ? '✗ RED' : '✓ GREEN'} — ${result.total - result.failed}/${result.total} cases${flag('--mobile') ? ' (mobile)' : ''}`);
  for (const f of shown) console.log(`  ✗ ${f.id} [${f.sub}] ${f.detail}`);
  if (pageErrors.length) console.log('  page errors: ' + pageErrors.slice(0, 3).join(' | '));
}
process.exit(result.failed ? 1 : 0);
