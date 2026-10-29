import { chromium } from 'playwright';
const url = process.argv[2], out = process.argv[3];
const b = await chromium.launch();
const shots = [];
async function ctxAt(w, h, phone) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: phone });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 150)));
  await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1200); return { ctx, p, errs };
}
{ const { ctx, p, errs } = await ctxAt(1440, 900, false);
  const grip = await p.$('#side37-grip'); const bb = await grip.boundingBox();
  await p.mouse.move(bb.x + 4, bb.y + 300); await p.mouse.down(); await p.mouse.move(bb.x + 124, bb.y + 300, { steps: 6 }); await p.mouse.up();
  const w1 = await p.evaluate(() => [document.getElementById('tabs').getBoundingClientRect().width, store.get('sideW37')]);
  await p.screenshot({ path: out + '/side-wide.png' });
  await p.mouse.move(bb.x + 124, bb.y + 300); await p.mouse.down(); await p.mouse.move(bb.x - 140, bb.y + 300, { steps: 8 }); await p.mouse.up();
  const w2 = await p.evaluate(() => [document.getElementById('tabs').getBoundingClientRect().width, document.documentElement.dataset.rail]);
  await p.screenshot({ path: out + '/side-rail.png' });
  await p.dblclick('#side37-grip'); const w3 = await p.evaluate(() => document.getElementById('tabs').getBoundingClientRect().width);
  await p.click('#tb-more'); await p.waitForTimeout(200); await p.screenshot({ path: out + '/more-menu.png' });
  await p.click('#viewBtn'); await p.waitForTimeout(400);
  const c = await p.evaluate(() => { const n = document.getElementById('tabs'); return [document.documentElement.dataset.shell, document.body.dataset.tabpos, n.getBoundingClientRect().height, n.scrollWidth > n.clientWidth, getComputedStyle(n).flexWrap]; });
  await p.mouse.move(700, 77); await p.mouse.wheel(0, 600); await p.waitForTimeout(300);
  const sl = await p.evaluate(() => document.getElementById('tabs').scrollLeft);
  await p.screenshot({ path: out + '/classic-wide.png' });
  console.log('wide', JSON.stringify({ w1, w2, w3, classic: c, wheelScrollLeft: sl, errs }));
  await ctx.close(); }
{ const { ctx, p, errs } = await ctxAt(390, 844, true);
  await p.evaluate(() => classicToggle37(true)); await p.waitForTimeout(400);
  const c = await p.evaluate(() => { const n = document.getElementById('tabs'); return [document.documentElement.dataset.shell, n.getBoundingClientRect().height, document.documentElement.scrollWidth]; });
  await p.screenshot({ path: out + '/classic-phone.png' });
  await p.evaluate(() => classicToggle37(false)); await p.waitForTimeout(300);
  const d = await p.evaluate(() => document.documentElement.dataset.shell);
  console.log('phone', JSON.stringify({ c, back: d, errs })); await ctx.close(); }
await b.close();
