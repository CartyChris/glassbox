// Visit every tab at several widths; report horizontal overflow, page errors, and run the gauntlet.
// usage: node crawl.mjs <url> <engine> <w1,w2,...>
import { chromium, webkit } from 'playwright';
const [url, engine = 'chromium', widths = '375,420,768,1440'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const out = {};
for (const w of widths.split(',').map(Number)) {
  const phone = w < 600;
  const ctx = await browser.newContext({ viewport: { width: w, height: phone ? 860 : 900 }, hasTouch: phone,
    userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1' : undefined });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
  await page.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const views = [...new Set([...document.querySelectorAll('.tab[data-view]')].map(b => b.dataset.view))];
    const over = [];
    for (const v of views) {
      go(v); await new Promise(r => setTimeout(r, 90));
      const W = innerWidth, d = document.documentElement.scrollWidth;
      if (d > W + 1) {
        const sec = document.getElementById('view-' + v);
        const wide = sec ? [...sec.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > W + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 2).map(e => e.tagName + '.' + String(e.className).slice(0, 30)) : [];
        over.push(v + ' ' + d + ' ' + wide.join('|'));
      }
    }
    const g = __gb.gauntletRun();
    return { views: views.length, shell: document.documentElement.dataset.shell, over, gauntlet: g.passed + '/' + g.total, fails: g.results.filter(x => !x.ok).map(x => x.id + ': ' + String(x.detail).slice(0, 160)) };
  });
  out[w] = { ...r, errors: errors.slice(0, 6) };
  await ctx.close();
}
console.log(JSON.stringify({ engine, out }, null, 1));
await browser.close();
