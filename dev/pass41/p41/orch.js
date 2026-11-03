/* ═══════════════════ PASS 41 — ORCHESTRATION: ANY MODEL CAN DELEGATE ═══════════════════
   `delegate` is a tool, so every model that can call tools can hand a piece of work to a subagent: one of your bots
   (with its own model and brief) or a role (researcher, builder, reviewer, planner), optionally on another model. The
   subagent runs its own tool loop over the same catalogue (MCP, APIs, web, Brain) through the same gate, and returns
   its answer plus what it did. Several delegate calls in one reply run in parallel (tc41RunAll).
   Limits that keep it from running away: depth 1 (a subagent cannot delegate), 4 tool rounds per subagent, the
   caller's Stop aborts every subagent, and each one is a span, so the run tree shows who did what and what it cost. */
const ORCH41_ROLES={
  researcher:'You find what is already known. Use the tools to read real sources; cite what you read; say plainly what you could not verify.',
  builder:'You implement. Complete, working output — no placeholders. Check your own work before you hand it back.',
  reviewer:'You look for the defect everyone missed: the input that breaks it, the claim with no evidence. Be specific.',
  planner:'You decide order and scope: what must exist first, which decisions are expensive to reverse. Return a short numbered plan.',
  analyst:'You work with data: compute, compare, and show the numbers you used.',
};
const ORCH41={runs:[],signal:null};
/* PURE. Who a delegate call goes to: a bot by name, else a role, else a generalist. */
function orch41Agent(name,bots){
  const n=String(name||'').trim().toLowerCase();
  const b=(bots||[]).find(x=>String(x.name||'').toLowerCase()===n);
  if(b)return{kind:'bot',name:b.name,brief:b.brief||b.purpose||'',model:b.model||'',role:b.role||''};
  const r=Object.keys(ORCH41_ROLES).find(k=>k===n||n.includes(k));
  if(r)return{kind:'role',name:r,brief:ORCH41_ROLES[r],model:'',role:r};
  return{kind:'general',name:name?String(name).slice(0,40):'subagent',brief:'You are a capable generalist subagent.',model:'',role:''};
}
function orch41Tool(){
  const who=(typeof BOTS!=='undefined'?BOTS:[]).slice(0,8).map(b=>b.name).concat(Object.keys(ORCH41_ROLES));
  return{name:'delegate',source:'orch',description:'Hand a self-contained subtask to a subagent that has the same tools and returns its result. '+
    'Use it to split independent work (several delegate calls in one reply run in parallel) or to get a second opinion. agent: one of '+who.join(', ')+'.',
    schema:{type:'object',properties:{task:{type:'string',description:'everything the subagent needs — it cannot see this conversation'},
      agent:{type:'string'},model:{type:'string',description:'optional model id for this subagent'}},required:['task']}};
}
async function orch41Delegate(args){
  const a=args||{};if(!String(a.task||'').trim())throw new Error('delegate needs a task');
  if(TC41.depth>=1)throw new Error('a subagent cannot delegate further (depth limit 1) — do the work yourself');
  const ag=orch41Agent(a.agent,typeof BOTS!=='undefined'?BOTS:[]);
  const model=String(a.model||ag.model||asstCfg().model||settings.archModel);
  const span=spanStart('subagent:'+ag.name,'agent',{model});
  const t0=Date.now(),steps=[];let cost=0,answer='';
  TC41.depth++;
  try{
    const cat=toolCatalog();
    const sys='You are the subagent "'+ag.name+'"'+(ag.role?' ('+ag.role+')':'')+'. '+ag.brief+
      '\nYou were handed one task by another agent. Do it completely, using tools when they help, then reply with the result only — no preamble.'+tc41Block(cat,a.task);
    const msgs=[{role:'system',content:sys},{role:'user',content:String(a.task)}];
    for(let round=0;round<5;round++){
      const acc=await streamComplete({model,maxTokens:2200,messages:msgs},null,ORCH41.signal||(typeof ASST_ABORT!=='undefined'&&ASST_ABORT?ASST_ABORT.signal:undefined),'subagent:'+ag.name);
      cost+=acc.cost||0;const text=String(acc.content||'');
      const calls=round<4?tc41Parse(text,cat):[];
      if(!calls.length){answer=text.replace(/===USE TOOL===[\s\S]*?(===END===|$)/g,'').trim();break;}
      const res=await tc41RunAll(calls,async c=>{const r=await toolInvoke(c.tool,c.args);steps.push({tool:c.tool,ok:!!r.ok,note:(r.error||toolText(r.result)).slice(0,120)});return{c,r};});
      msgs.push({role:'assistant',content:text},{role:'user',content:'TOOL RESULTS\n\n'+res.map(x=>toolObservation(x.r,x.c.tool,3000)).join('\n\n')+'\n\n'+TOOL_SPOTLIGHT_RULE+' Continue; finish with the result.'});
    }
    if(!answer)answer='(the subagent used its rounds without a final answer)';
    spanEnd(span,{content:answer,cost,usage:{}});
  }catch(e){spanEnd(span,null,e);throw e;}
  finally{TC41.depth--;}
  const rec={ts:Date.now(),agent:ag.name,model,ms:Date.now()-t0,cost,steps:steps.length,task:String(a.task).slice(0,200)};
  ORCH41.runs.unshift(rec);ORCH41.runs.length=Math.min(ORCH41.runs.length,40);
  paneEvent('agent','subagent',{label:ag.name,note:steps.length+' tool call(s) · '+short40(model)});
  return 'Result from '+ag.name+' ('+short40(model)+', '+fmtDur40(rec.ms)+(steps.length?', '+steps.length+' tool call(s): '+steps.map(s=>s.tool+(s.ok?'':' ✗')).join(', '):'')+'):\n\n'+answer;
}
