import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w,h,n] of [[1440,900,'desk'],[440,956,'phone']]) {
const p = await (await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:w<900?2:1, hasTouch:w<900 })).newPage();
p.on('pageerror', e=>console.log('PAGEERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2]); await p.waitForTimeout(1800);
await p.evaluate(async()=>{
  const real=streamComplete;let k=0;
  const seq=['THOUGHT: The two smallest numbers can be found by brute force; I will print them to check.\n```js\nconst r=[];for(let n=1;r.length<2;n++)if(n%3===2&&n%5===3&&n%7===2)r.push(n);print("found",r,"check",r.map(n=>[n%3,n%5,n%7]));\n```',
    'THOUGHT: Both satisfy every remainder. Submitting.\n```js\nsubmit("The two smallest are **23** and **128** (they repeat every 105).")\n```'];
  streamComplete=async(o,u)=>{const c=seq[Math.min(k++,seq.length-1)];const a={content:c,usage:{prompt_tokens:900,completion_tokens:60},cost:0,elapsed:900,model:'ovh/gpt-oss-20b'};u&&u(a);return a;};
  go('assistant');ASST.mode='agent';const c=achatNew('Agent demo');ACHAT=c.id;renderAsst();
  await asstSend('Find the two smallest positive integers n with n mod 3 = 2, n mod 5 = 3 and n mod 7 = 2.');
  streamComplete=real;
  const th=document.getElementById('asst-thread');th.querySelector('[data-t40steps]').click();
});
await p.waitForTimeout(400);
await p.evaluate(()=>{const th=document.getElementById('asst-thread');th.querySelector('[data-t40tool]').click();th.scrollTop=0;});
await p.waitForTimeout(300);
await p.screenshot({ path: `../shots39/c41-agent-${n}.png` });
await p.evaluate(()=>{go('hlab');});await p.waitForTimeout(600);
await p.screenshot({ path: `../shots39/c41-evolve-${n}.png` });
const a=await p.evaluate(()=>__gb.layoutAudit39(document.querySelector('.view.active')));console.log(n,'audit',JSON.stringify(a));
}
await b.close();
