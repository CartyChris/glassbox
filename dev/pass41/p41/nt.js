/* ═══ PASS 41 — native function calling, automatically, where the model supports it ═══
   A model the catalogue says takes `tools` gets real function calling (tool_calls back, role:"tool" results) instead
   of a text protocol it has to imitate — the more accurate path on every model trained for it. Everything else keeps
   the text protocol (now multi-format). If the provider refuses the tools field, the turn falls back to text. */
function nt41Eligible(cfg){
  return ASST.native!=='text'&&ASST.useTools!==false&&!cfg.web&&typeof ntCapable==='function'&&ntCapable(cfg.model)&&toolCatalog().length>0;
}
async function nt41Turn(opts,cfg,slot,c){
  const cat=toolCatalog(),{list}=tc41Select(cat,TC41.lastQuery,24);
  const sch=ntSchema(list.map(t=>({name:t.name,description:t.description,schema:t.schema})));
  const msgs=opts.messages.slice();let meta=null;const rounds=asstRounds41();
  for(let round=0;round<=rounds;round++){
    const t0=performance.now();
    const r=await ntComplete({model:cfg.model,messages:msgs,tools:round<rounds?sch.tools:undefined,maxTokens:cfg.maxTokens,signal:ASST_ABORT&&ASST_ABORT.signal});
    meta=turn40Merge(meta,turn40Meta({usage:r.usage,elapsed:performance.now()-t0,model:cfg.model,finishReason:r.finish,cost:r.usage&&r.usage.cost},cfg.model));
    const m=r.message||{},calls=ntParseCalls(m,sch.map),content=String(m.content||'');
    if(m.reasoning||m.reasoning_content)slot.reasoning=(slot.reasoning?slot.reasoning+'\n\n':'')+String(m.reasoning||m.reasoning_content);
    if(!calls.length){slot.content=content;break;}
    if(!ASST.auto&&!confirm('The assistant wants to run:\n\n'+calls.map(x=>x.name+' '+JSON.stringify(x.args).slice(0,200)).join('\n')+'\n\nAllow?')){
      slot.tools.push({name:'(declined)',ok:false,status:'declined',note:'you declined '+calls.map(x=>x.name).join(', ')});slot.content=content;break;}
    msgs.push({role:'assistant',content:content||null,tool_calls:m.tool_calls});
    const tt0=Date.now();
    const res=await tc41RunAll(calls.map(x=>({tool:x.name,args:x.args,x})),async q=>({x:q.x,r:q.x.argError?{ok:false,error:q.x.argError}:await toolInvoke(q.x.name,q.x.args)}));
    const per=Math.round((Date.now()-tt0)/Math.max(1,res.length));
    res.forEach(({x,r})=>{slot.tools.push({name:x.name,ok:!!r.ok,status:r.blocked?'blocked':r.ok?'ok':'err',ms:per,args:x.args,
      result:r.ok?(typeof r.result==='string'?r.result:toolText(r.result)).slice(0,6000):r.error,injection:!!r.injection,note:(r.error||toolText(r.result)).slice(0,200)});
      msgs.push({role:'tool',tool_call_id:x.id,content:toolObservation(r,x.name,4000)});});
    slot.content=content;renderAsstStream();
  }
  slot.meta=turn40Estimate(meta,{content:slot.content,ctxChars:msgChars(msgs)});slot.meta.native=true;
  slot.cost=meta&&meta.cost||0;c.cost=(c.cost||0)+(slot.cost||0);slot.model=cfg.model;
}
