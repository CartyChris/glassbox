import { chromium } from 'playwright';
const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
p.on('dialog',d=>d.accept('Login rate limiter'));
await p.addInitScript(()=>{localStorage.setItem('gb.onboarding',JSON.stringify({done:true}));});
await p.goto(process.argv[2]);await p.waitForTimeout(1500);
// 1. reader tool through the real tool path (gate, scan, trace)
const rd=await p.evaluate(async()=>{const r=await toolInvoke('read_web_page',{url:'https://example.com'});return {ok:r.ok,src:r.source,head:String(r.result||r.error||'').slice(0,120)};});
console.log('reader',JSON.stringify(rd));
// 2. Specs: spec → plan → tasks on a free no-key model
const sp=await p.evaluate(async()=>{settings.primaryModel='ovh/gpt-oss-20b';go('specs');await new Promise(r=>setTimeout(r,400));
  document.getElementById('sp-new').click();await new Promise(r=>setTimeout(r,400));
  const it=specCur();it.request='Limit failed login attempts to 5 per 15 minutes per account and per IP, with a clear message and an admin unlock.';
  const t0=Date.now();
  const toasts=[];const te=document.getElementById('toast');new MutationObserver(()=>toasts.push(te.textContent)).observe(te,{childList:true,characterData:true,subtree:true});
  for(const k of ['spec','plan','tasks']){await specStep(k);}
  window.__toasts=toasts;
  const ready=specReady(it.tasks||[]);
  return {toasts:window.__toasts.slice(0,6),secs:Math.round((Date.now()-t0)/1000),spec:(it.spec||'').length,plan:(it.plan||'').length,tasks:(it.tasks||[]).length,ready:ready.map(t=>t.id),first:(it.tasks||[])[0],cycles:specCycles(it.tasks||[])};});
console.log('specs',JSON.stringify(sp).slice(0,900));
await p.screenshot({path:'../shots/specs-live.png',fullPage:false});
await b.close();
