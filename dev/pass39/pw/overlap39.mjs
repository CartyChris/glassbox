// Phone-width layout audit: overlapping controls + controls whose text spills out of them, per view.
import { webkit, chromium } from 'playwright';
const [url, W='440', H='956'] = process.argv.slice(2);
const eng = process.env.ENG==='chromium'?chromium:webkit;
const b = await eng.launch();
const p = await (await b.newContext({ viewport:{width:+W,height:+H}, deviceScaleFactor:1, hasTouch:true, colorScheme:'dark' })).newPage();
p.on('pageerror', e=>console.log('PAGEERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(url); await p.waitForTimeout(1500);
const ids = await p.evaluate(()=>REGISTRY.tabs.map(t=>t.id));
let total=0, spill=0; const rows=[];
for (const v of ids) {
  await p.evaluate(([v,o])=>{try{go(v)}catch(e){}if(o)document.querySelectorAll('.view.active details').forEach(d=>d.open=true);}, [v,!!process.env.OPEN]); await p.waitForTimeout(350);
  const r = await p.evaluate(()=>window.__gb && __gb.layoutAudit39 ? __gb.layoutAudit39() : (function(){
    const vis=e=>{const d=e.closest('details:not([open])');if(d&&!e.closest('summary'))return false;const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return false;const b=e.getBoundingClientRect();return b.width>2&&b.height>2;};
    const els=[...document.querySelectorAll('.view.active button,.view.active a.btn,.view.active .chip,.view.active input,.view.active select,header.top button,#dock39 button,#dock36 button')].filter(vis);
    const clipOK=(e,b)=>{let a=e.parentElement;while(a&&a!==document.body){const s=getComputedStyle(a);if(/(auto|scroll)/.test(s.overflowX+s.overflowY))return true;if(/(hidden|clip)/.test(s.overflowX+s.overflowY)){const c=a.getBoundingClientRect();if(b.right<=c.left+1||b.left>=c.right-1||b.bottom<=c.top+1||b.top>=c.bottom-1)return false;}a=a.parentElement;}return true;};
    const L=els.map(e=>({e,b:e.getBoundingClientRect()})).filter(x=>clipOK(x.e,x.b));
    const out=[];
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const A=L[i],B=L[j];if(A.e.contains(B.e)||B.e.contains(A.e))continue;if(!!A.e.closest('#dock36,#dock39,header.top')!==!!B.e.closest('#dock36,#dock39,header.top'))continue;
      const ox=Math.min(A.b.right,B.b.right)-Math.max(A.b.left,B.b.left),oy=Math.min(A.b.bottom,B.b.bottom)-Math.max(A.b.top,B.b.top);
      if(ox>4&&oy>4)out.push('OVERLAP '+(A.e.id||A.e.textContent.trim().slice(0,18))+' × '+(B.e.id||B.e.textContent.trim().slice(0,18)));}
    const sp=L.filter(x=>{if(x.e.tagName!=='BUTTON'||getComputedStyle(x.e).overflow!=='visible')return false;const rg=document.createRange();rg.selectNodeContents(x.e);const t=rg.getBoundingClientRect();return t.width>0&&(t.left<x.b.left-3||t.right>x.b.right+3||t.top<x.b.top-3||t.bottom>x.b.bottom+3);}).map(x=>'SPILL '+(x.e.id||x.e.textContent.trim().slice(0,24)));
    return out.concat(sp);})());
  if (r.length) { rows.push(v+': '+r.length+'\n   '+r.slice(0,6).join('\n   ')); total+=r.length; }
}
console.log(rows.join('\n')); console.log('TOTAL', total, 'views', ids.length);
await b.close();
