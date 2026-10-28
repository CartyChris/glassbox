// One sabotage per evaluate, each with a deadline, so a hang names itself.
import { chromium } from 'playwright';
const [url, from = '0'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
let CUR='';p.on('dialog', d => { console.log('DIALOG', d.type(), JSON.stringify(d.message().slice(0, 80)), 'during', CUR); d.dismiss(); });
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(url); await p.waitForTimeout(1500);
const ids = await p.evaluate(() => GAUNTLET_SABOTAGE.map(s => s.id));
let caught = 0, missed = [];
for (let i = +from; i < ids.length; i++) {
  const id = ids[i]; CUR = id; const t0 = Date.now();
  const r = await Promise.race([
    p.evaluate(id => { const g = __gb, s = GAUNTLET_SABOTAGE.find(x => x.id === id), o = g[s.export];
      if (o === undefined) return 'no-export'; try { g[s.export] = s.broken(); return gauntletRun().failed > 0 ? 'caught' : 'MISSED'; } finally { g[s.export] = o; } }, id),
    new Promise(r => setTimeout(() => r('TIMEOUT'), 30000))]);
  if (r === 'caught') caught++; else missed.push(id + ':' + r);
  if (r === 'TIMEOUT' || Date.now() - t0 > 5000) console.log(i, id, r, Date.now() - t0 + 'ms');
  if (r === 'TIMEOUT') break;
}
const after = await p.evaluate(() => gauntletRun().green).catch(e => 'err ' + e.message);
console.log(JSON.stringify({ total: ids.length, caught, missed, restoredGreen: after }));
await b.close();
