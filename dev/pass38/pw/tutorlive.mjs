import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1500);
const r = await p.evaluate(async (model) => {
  settings.primaryModel = model; const out = {}; const t0 = Date.now();
  const plan = await tutorMakePlan38('understand why binary search is O(log n)', 'I can write a for loop; logarithms confuse me');
  out.plan = { nodes: plan.nodes.map(n => n.id + ':' + n.title + (n.deps.length ? '<' + n.deps.join('+') : '') + '[' + n.status + ']'), probes: plan.probes.length };
  const s = { id: 'x', goal: 'understand why binary search is O(log n)', plan, props: [], illustrate: true };
  const node = tutorNext38(plan); out.next = node && node.title;
  const st = await tutorTeach38(s, node, true);
  out.step = { predict: st.predict.slice(0, 140), explain: st.explain.slice(0, 200), check: st.check.slice(0, 140), prop: st.prop.slice(0, 120), premises: st.premises.length, uiChars: st.ui.length };
  st.ui = await tutorIllustrate38(s, node, st); out.step.uiChars = st.ui.length; out.uiHead = st.ui.slice(0, 160);
  if (st.ui) { const host = document.createElement('div'); document.body.appendChild(host); ouiMount(host, {}).set(st.ui, true); await new Promise(r => setTimeout(r, 300)); out.uiRendered = host.innerText.slice(0, 160).replace(/\s+/g, ' '); out.uiEls = host.querySelectorAll('*').length; }
  const v = await tutorGrade38(st, st.answer, 'I used the definition');
  out.gradeOwnAnswer = v.correct; const w = await tutorGrade38(st, 'banana', '');
  out.gradeNonsense = w.correct; out.ms = Date.now() - t0; return out;
}, process.argv[3]);
console.log(JSON.stringify({ r, errs }, null, 1)); await b.close();
