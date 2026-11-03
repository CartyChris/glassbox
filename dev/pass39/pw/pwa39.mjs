import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [vh,tag] of [[956,'nobug'],[882,'bug74']]) {
  const ctx = await b.newContext({ viewport:{width:440,height:vh}, screen:{width:440,height:956}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'display-mode',value:'standalone'}]});
  await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); Object.defineProperty(Navigator.prototype,'standalone',{get:()=>true}); } catch (_) {} });
  await p.goto(process.argv[2]); await p.waitForTimeout(1600);
  await p.evaluate(()=>go('brain')); await p.waitForTimeout(500);
  const r = await p.evaluate(()=>{const d=document.getElementById('dock36').getBoundingClientRect();const v=document.querySelector('.view.active');
    return {mm:matchMedia('(display-mode: standalone)').matches, sa:document.documentElement.dataset.standalone, rep:__gb.home39Report(), dockTop:Math.round(d.top), dockBottom:Math.round(d.bottom), inner:innerHeight,
      viewPadB:getComputedStyle(v).paddingBottom, appH:document.getElementById('app').getBoundingClientRect().height};});
  console.log(tag, JSON.stringify(r));
  await p.screenshot({ path: `../shots39/pwa-${tag}.png` });
  await ctx.close();
}
await b.close();
