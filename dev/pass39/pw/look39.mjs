import { webkit, chromium } from 'playwright';
const [url, out='../shots39', views='assistant,brain,gen'] = process.argv.slice(2);
const eng = process.env.ENG==='chromium'?chromium:webkit;
const b = await eng.launch();
const ctx = await b.newContext({ viewport:{width:440,height:956}, deviceScaleFactor:2, hasTouch:true, isMobile: process.env.ENG==='chromium', colorScheme: process.env.DARK?'dark':'light' });
const p = await ctx.newPage();
p.on('pageerror', e=>console.log('PAGEERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1500);
for (const v of views.split(',')) {
  await p.evaluate(v => go(v), v); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${v}.png` });
}
if (process.env.ALL) { await p.evaluate(()=>shellNavSheet36(true)); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/allsheet.png` }); }
await b.close();
