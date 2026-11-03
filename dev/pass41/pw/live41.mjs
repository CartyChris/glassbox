import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:900} })).newPage();
p.on('pageerror', e=>console.log('PAGEERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2]); await p.waitForTimeout(1800);
const R = await p.evaluate(async()=>{
  const out={};const M='ovh/gpt-oss-20b';
  try{
    const t0=Date.now();
    const r=await eval41(TASKS41.find(t=>t.id==='crt'),h41(),{model:M,maxSteps:6});
    out.agent={status:r.status,score:r.score,detail:r.detail,steps:r.trace.map(s=>s.kind+(s.formatError?'!':'')+(s.ok===false?'✗':'')).join('>'),answer:r.answer,ms:Date.now()-t0,firstObs:String((r.trace[0]||{}).obs||'').slice(0,120)};
  }catch(e){out.agentErr=e.message;}
  try{
    const a=connectorAdd('api',{label:'Pets',url:'',token:'k123'});a.api={kind:'openapi',specUrl:'http://127.0.0.1:8841/openapi.json',authType:'header',authName:'X-API-Key',ask:false,allowWrite:false};
    await connectorConnect(a);
    ASST.mode='chat';ASST.auto=true;ASST.useTools=true;ASST.native='text';
    const c=achatNew('live41');c.model=M;ACHAT=c.id;
    const s=await asstSend('Look up pet number 1 with the Pets API and tell me its name, species and age.');
    out.chat={tools:s.tools.map(t=>t.name+':'+t.status+(t.args?':'+JSON.stringify(t.args):'')).join(' | '),content:String(s.content).slice(0,300),err:s.error};
  }catch(e){out.chatErr=e.message;}
  return out;
});
console.log(JSON.stringify(R,null,1));
await b.close();
