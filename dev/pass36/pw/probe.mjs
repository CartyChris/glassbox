import { chromium } from 'playwright';
const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1440,height:900},colorScheme:'light'})).newPage();
await p.addInitScript(()=>{localStorage.setItem('gb.onboarding',JSON.stringify({done:true}));localStorage.setItem('gb.ui',JSON.stringify({theme:'light'}));});
await p.goto(process.argv[2]);await p.waitForTimeout(1200);
console.log(await p.evaluate(()=>{go('pane');const out=[];document.querySelectorAll('#view-pane .btn').forEach((b,i)=>{if(i>5)return;const cs=getComputedStyle(b);out.push([b.className,b.textContent.trim().slice(0,12),b.disabled,cs.color,cs.backgroundColor,cs.opacity,b.getAttribute('style')]);});
const de=document.documentElement;return JSON.stringify({out,acc:getComputedStyle(de).getPropertyValue('--acc'),inline:de.getAttribute('style')});}));
await b.close();
