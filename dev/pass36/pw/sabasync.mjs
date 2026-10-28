import { chromium } from 'playwright';
const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
p.on('dialog',d=>{console.log('DIALOG',d.message());d.dismiss();});
await p.addInitScript(()=>{localStorage.setItem('gb.onboarding',JSON.stringify({done:true}));});
await p.goto(process.argv[2]);await p.waitForTimeout(1500);
const r=await p.evaluate(async()=>{let ticks=0,maxGap=0,last=performance.now();const iv=setInterval(()=>{const n=performance.now();maxGap=Math.max(maxGap,n-last);last=n;ticks++;},50);
const t0=performance.now();let steps=0;const s=await __gb.gauntletSabotageAsync(()=>steps++);clearInterval(iv);
return {sec:Math.round((performance.now()-t0)/1000),n:s.sabotages,caught:s.caught,uncaught:s.uncaught,green:s.restoredGreen,steps,ticks,maxGapMs:Math.round(maxGap)};});
console.log(JSON.stringify(r));await b.close();
