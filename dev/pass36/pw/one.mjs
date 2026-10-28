import { chromium } from 'playwright';
const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.addInitScript(()=>{localStorage.setItem('gb.onboarding',JSON.stringify({done:true}));});
for(const u of process.argv.slice(2)){await p.goto(u);await p.waitForTimeout(1200);
console.log(u.split('/').pop(),await p.evaluate(()=>{const r=[];for(let i=0;i<3;i++){const t=performance.now();__gb.gauntletRun();r.push(Math.round(performance.now()-t));}
let t=performance.now();for(let i=0;i<20;i++)applyUI();const au=Math.round((performance.now()-t)/20);return JSON.stringify({gauntletMs:r,applyUIms:au});}));}
await b.close();
