import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:900} })).newPage();
p.on('pageerror', e=>console.log('PAGEERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2]); await p.waitForTimeout(1800);
await p.evaluate(()=>{go('assistant');const c=achatNew('live40');c.model='ovh/gpt-oss-20b';ACHAT=c.id;renderAsst();
  const i=document.getElementById('asst-input');i.value='In two short paragraphs: why is the sky blue? Then give a 3-row markdown table of colours and wavelengths.';i.dispatchEvent(new Event('input'));});
await p.click('#asst-send');
let s='';for(let k=0;k<60;k++){await p.waitForTimeout(1000);s=await p.evaluate(()=>{const c=achat();const m=c.msgs[c.msgs.length-1];return m.streaming?'':'done';});if(s)break;}
const r = await p.evaluate(()=>{const c=achat();const m=c.msgs[c.msgs.length-1];return {err:m.error,len:(m.content||'').length,think:(m.reasoning||'').length,meta:m.meta,t:[m.t0&&m.t1?m.t1-m.t0:0,m.th0&&m.th1?m.th1-m.th0:0],
  chips:[...document.querySelectorAll('#asst-thread .t40-meta .t40-chip')].map(x=>x.textContent.trim()),think40:(document.querySelector('.t40-ts')||{}).textContent,table:!!document.querySelector('#asst-thread .t40-table'),status:document.getElementById('asst-status40').textContent.replace(/\s+/g,' ').trim()};});
console.log(JSON.stringify(r,null,1));
await p.screenshot({path:'../shots39/c40-live-real.png'});
await b.close();
