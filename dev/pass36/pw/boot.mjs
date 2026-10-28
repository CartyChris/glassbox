import { chromium } from 'playwright';
const urls = process.argv.slice(2); const b = await chromium.launch();
for (const u of urls) { const t = [];
  for (let i = 0; i < 4; i++) { const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
    await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
    const t0 = Date.now(); await p.goto(u, { waitUntil: 'load' }); await p.waitForFunction(() => window.__gb && document.querySelector('.view.active'));
    const m = await p.evaluate(() => ({ dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd), load: Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd) }));
    t.push(m); await p.close(); }
  console.log(u.split('/').pop(), JSON.stringify(t.slice(1))); }
await b.close();
