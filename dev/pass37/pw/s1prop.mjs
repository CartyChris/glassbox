import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1500);
const r = await p.evaluate(async (model) => {
  S1CFG.runs = [{ at: nowISO(), env: 'app', goal: 'open Harness Lab and add the Plan → answer → verify template', status: 'incomplete', reason: 'repeated_action', steps: 4, decider: 'llm' },
    { at: nowISO(), env: 'app', goal: 'turn on the web reader tool', status: 'incomplete', reason: 'no_confident_action', steps: 3, decider: 'llm' }];
  const t0 = Date.now(); const pr = await s1ModPropose37(model);
  if (!pr.ok) return { pr, ms: Date.now() - t0 };
  const v = await s1PatchGate37(pr.patch);
  return { ms: Date.now() - t0, model: pr.model, patch: pr.patch, verdict: { accept: v.accept, stage: v.stage, errors: v.errors, loosens: v.loosens, failing: (v.failing || []).map(c => c.id) } };
}, process.argv[3]);
console.log(JSON.stringify(r, null, 1)); await b.close();
