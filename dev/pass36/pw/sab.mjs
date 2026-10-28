import { chromium } from 'playwright';
const [url] = process.argv.slice(2);
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(url); await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const s = __gb.gauntletSabotage(); return { n: s.sabotages, caught: s.caught, uncaught: s.uncaught, green: s.restoredGreen }; });
console.log(JSON.stringify(r)); await b.close();
