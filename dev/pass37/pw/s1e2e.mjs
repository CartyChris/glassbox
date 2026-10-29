import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1500);
await p.evaluate(() => go('systemone')); await p.waitForTimeout(800);
const r = await p.evaluate(async () => {
  const out = {};
  out.checks0 = await s1Checks37(); out.checks0 = out.checks0.passed + '/' + out.checks0.total;
  const good = { why: 'add Lara + a lesson', ops: [{ op: 'add', path: 'lessons', value: 'Cancel only with the reason the goal names.' },
    { op: 'set', path: 'instructions.order', value: 'Read the goal twice before cancelling.' },
    { op: 'add', path: 'models', value: { id: 'lara', label: 'Lara (test)', wire: 'systemone', url: 'https://s1.test/v1/systemone', model: 'lara-1', params: 4, key: false } }] };
  document.getElementById('s1m-in').value = JSON.stringify(good); document.getElementById('s1m-test').click();
  await new Promise(r => setTimeout(r, 1500));
  out.afterGood = document.getElementById('s1m-out').innerText.slice(0, 120); out.v = S1MOD.v;
  const tiny = await s1PatchGate37({ why: 'fewer steps', ops: [{ op: 'set', path: 'limits.maxSteps', value: 3 }] });
  out.tiny = [tiny.accept, tiny.stage, tiny.failing.map(c => c.id).join(',')].join(' | ');
  const loose = await s1PatchGate37({ why: 'be bolder', ops: [{ op: 'set', path: 'guardrails.gate.write', value: S1CFG.gate.write - 0.05 }] });
  out.loose = [loose.accept, loose.stage, loose.loosens.join(';')].join(' | ');
  const looseOk = await s1PatchGate37({ why: 'be bolder', ops: [{ op: 'set', path: 'guardrails.gate.write', value: S1CFG.gate.write - 0.05 }] }, { humanApproved: true });
  out.looseApproved = looseOk.accept;
  const floor = await s1PatchGate37({ why: 'yolo', ops: [{ op: 'set', path: 'guardrails.gate.destructive', value: 0.5 }] }, { humanApproved: true });
  out.floor = [floor.accept, floor.failing.map(c => c.id).join(',')].join(' | ');
  // a real run through s1Go, with the Lara profile, against a fake systemone server
  const sent = []; const realFetch = window.fetch; let n = 0;
  window.fetch = async (url, o) => { if (String(url).startsWith('https://s1.test/')) { const body = JSON.parse(o.body); sent.push(body); n++;
      const ans = { next_action: { choice: 'cancel_order', probabilities: { cancel_order: 0.97 } }, cancel_order__reason: { choice: 'fraud', probabilities: { fraud: 0.97 } }, goal_reached: { noul: n > 1 ? 0.95 : 0.1 } };
      return new Response(JSON.stringify({ answers: ans, usage: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
    return realFetch(url, o); };
  const keep = { d: S1CFG.decider, p: S1CFG.soPreset };
  try { S1CFG.decider = 'systemone'; S1CFG.soPreset = 'lara';
    const run = await s1Go({ envKind: 'order', scenario: 'cancel_fraud' });
    const st = JSON.parse(sent[0].state);
    out.run = [run.status, run.reason, run.decider || '', run.steps.length, 'model=' + sent[0].model].join(' | ');
    out.stateHas = { lesson: /Cancel only with the reason/.test(st.instructions || ''), addon: /Read the goal twice/.test(st.instructions || '') };
  } finally { window.fetch = realFetch; S1CFG.decider = keep.d; S1CFG.soPreset = keep.p; }
  // revert the good patch
  const id = S1MOD.history.find(h => h.why === 'add Lara + a lesson').id; s1ModRevert37(id);
  out.afterRevert = { v: S1MOD.v, models: S1MOD.models.length, lessons: S1MOD.lessons.length, exp: S1MOD.experience.length };
  return out;
});
console.log(JSON.stringify({ r, errs }, null, 1));
await p.screenshot({ path: '../shots37/s1mod.png', fullPage: false }); await b.close();
