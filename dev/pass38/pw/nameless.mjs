import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => { const r = __gb.gauntletRun().results.find(x => x.id === 'a11y-every-control-is-named');
  __gb.a11yNamePass(document); return [...document.querySelectorAll('button,select,textarea,a[href],input:not([type=hidden])')].filter(b => !__gb.a11yHasName(b)).slice(0, 6).map(b => b.outerHTML.slice(0, 160) + ' IN ' + (b.closest('[id]') || {}).id).join('\n'); }));
await b.close();
