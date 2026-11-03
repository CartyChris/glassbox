import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  go('harnesshub'); await new Promise(r => setTimeout(r, 500));
  const before = SKILLS.length; document.getElementById('st-list').click();
  for (let i = 0; i < 40 && !document.getElementById('st-imp'); i++) await new Promise(r => setTimeout(r, 250));
  if (!document.getElementById('st-imp')) return { err: document.getElementById('st-out').innerText };
  const boxes = [...document.querySelectorAll('[data-stp]')]; boxes.forEach((c, i) => c.checked = i < 3);
  document.getElementById('st-imp').click(); for (let i = 0; i < 40 && SKILLS.length < before + 3; i++) await new Promise(r => setTimeout(r, 250));
  const added = SKILLS.slice(before); return { listed: boxes.length, added: added.map(s => s.name + ' ' + s.chars + ' on=' + s.on) };
});
console.log(JSON.stringify(r)); await b.close();
