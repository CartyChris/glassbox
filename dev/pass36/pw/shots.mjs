// Screenshot a set of views at given sizes, in Chromium or WebKit, and report overflow + console errors.
// usage: node shots.mjs <url> <outdir> <engine:chromium|webkit> <WxH> [views comma list] [--light] [--sheet]
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
const [url, out, engine = 'chromium', size = '1440x900', viewsArg = 'assistant,lab,pane,modelhub,settings'] = process.argv.slice(2);
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')));
const [w, h] = size.split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
const phone = w < 600;
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone && engine !== 'webkit' ? true : undefined, hasTouch: phone,
  colorScheme: flags.has('--light') ? 'light' : 'dark',
  userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1' : undefined });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
await page.addInitScript((light) => {
  try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); if (light) { const u = JSON.parse(localStorage.getItem('gb.ui') || '{}'); u.theme = 'light'; localStorage.setItem('gb.ui', JSON.stringify(u)); } } catch (_) {}
}, flags.has('--light'));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1500);
const report = [];
for (const v of viewsArg.split(',')) {
  await page.evaluate(v => { go(v); }, v);
  await page.waitForTimeout(500);
  if (flags.has('--sheet')) await page.evaluate(() => shellNavSheet36(true));
  const o = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, iw: innerWidth, shell: document.documentElement.dataset.shell }));
  await page.screenshot({ path: `${out}/${engine}-${size}-${v}${flags.has('--light') ? '-light' : ''}.png` });
  report.push({ v, ...o, overflow: o.docW > o.iw + 1 });
}
console.log(JSON.stringify({ engine, size, report, errors: errors.slice(0, 20) }, null, 1));
await browser.close();
