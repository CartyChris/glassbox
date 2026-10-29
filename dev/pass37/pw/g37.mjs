// Run the gauntlet (all cases) + list failures and the pass-37 cases.
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const g = __gb.gauntletRun(); return { s: g.passed + '/' + g.total, fails: g.results.filter(x => !x.ok).map(x => x.id + ': ' + String(x.detail).slice(0, 200)) }; });
console.log(JSON.stringify({ ...r, errs }, null, 1)); await b.close();
