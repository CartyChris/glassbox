import { webkit } from 'playwright';
const [url, tag='x'] = process.argv.slice(2);
const b = await webkit.launch();
for (const [w,h,dpr,n] of [[440,956,2,'phone'],[1440,900,1,'desk']]) {
  const p = await (await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:dpr, hasTouch:w<900 })).newPage();
  p.on('pageerror', e=>console.log('PAGEERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
  await p.goto(url); await p.waitForTimeout(1500);
  await p.evaluate(()=>{go('assistant');});await p.waitForTimeout(400);
  await p.screenshot({ path: `../shots39/c40-empty-${n}.png` });
  await p.evaluate(()=>{
    const now=Date.now();
    ACHATS.unshift({id:'fx40',title:'Is Lisbon worth it in March?',mode:'chat',cost:0.0021,msgs:[
      {role:'user',content:'Is Lisbon worth visiting in March? Check the weather and what is on.',ts:new Date(now-60000).toISOString()},
      {role:'assistant',content:'Yes — March is a good shoulder month for Lisbon.\n\n**Weather:** highs around 18 °C, about 8 rainy days, so pack a light jacket.\n\n**On:** the Lisbon Half Marathon and Monstra animation festival.\n\nCrowds are thinner than summer and hotel prices are lower.',
       reasoning:'The user wants a judgement plus facts. I should check climate averages and events, then weigh crowds and price.',
       t0:now-14000,t1:now-2000,th0:now-14000,th1:now-9000,ts:new Date(now-50000).toISOString(),mode:'Chat',cost:0.0021,
       tools:[{name:'web_search',ok:true,status:'ok',ms:1800,args:{query:'Lisbon March weather average'},result:'Average high 18°C, 8 rain days…',note:'5 results'},
              {name:'read_web_page',ok:true,status:'ok',ms:2400,args:{url:'https://www.visitlisboa.com/en/events'},result:'Monstra festival 12–22 March…',note:'visitlisboa.com/en/events',injection:true},
              {name:'github_search',ok:false,status:'blocked',note:'blocked — not allowed in this mode'}],
       meta:{model:'ovh/gpt-oss-20b',requested:'ovh/gpt-oss-20b',tin:4210,tout:380,tthink:212,tcache:1800,ttft:420,ms:11800,finish:'stop',rounds:2,cites:[{url:'https://www.visitlisboa.com/en/events',title:'Visit Lisboa'},{url:'https://weatherspark.com/lisbon',title:'Weather Spark'}]}},
      {role:'user',content:'Show me a packing list and a quick script to convert °C to °F.'},{role:'assistant',content:'Here you go.\n\n| Item | Why |\n|---|---|\n| Light jacket | about 8 rainy days |\n| Walking shoes | the hills |\n\n- [x] Passport\n- [ ] Adapter (type F)\n\n```js\nconst f = c => c * 9 / 5 + 32;\nconsole.log(f(18)); // 64.4\n```',t0:Date.now()-30000,t1:Date.now()-27000,meta:{model:'ovh/gpt-oss-20b',tin:820,tout:96,ttft:380,ms:3000,rounds:1,cites:[]}},{role:'user',content:'And May?',ts:new Date(now-20000).toISOString()},
      {role:'assistant',content:'',error:'HTTP 429 — the free model is busy; try again in 20 seconds',t0:now-9000,t1:now-8000,ts:new Date().toISOString()},
    ]});
    ACHAT='fx40';renderAsst();
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `../shots39/c40-chat-${n}.png` });
  // open the steps and details of the first answer
  await p.evaluate(()=>{const th=document.getElementById('asst-thread');th.scrollTop=0;
    th.querySelector('[data-t40steps]').click();});
  await p.waitForTimeout(150);
  await p.evaluate(()=>{const th=document.getElementById('asst-thread');th.querySelector('[data-t40tool]').click();th.querySelector('[data-t40info]').click();th.scrollTop=0;});
  await p.waitForTimeout(300);
  await p.screenshot({ path: `../shots39/c40-open-${n}.png` });
  // a live turn
  await p.evaluate(()=>{const c=achat();c.msgs.push({role:'user',content:'Plan 3 days'},{role:'assistant',content:'',reasoning:'Day one should cover Alfama and Baixa…',tools:[{name:'running tools',status:'run',note:'calling…'}],t0:Date.now()-6000,th0:Date.now()-6000,streaming:true});renderAsst();});
  await p.waitForTimeout(300);
  await p.screenshot({ path: `../shots39/c40-live-${n}.png` });
  const audit = await p.evaluate(()=>__gb.layoutAudit39(document.getElementById('view-assistant')));
  console.log(n,'audit',JSON.stringify(audit));
}
await b.close();
