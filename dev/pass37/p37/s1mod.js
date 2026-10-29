/* ═══════════════════ PASS 37 — S1 HARNESS MODULES ═══════════════════
   System One's harness as plain, editable data that ANY model (Jev, Cua-S1, a fine-tune, a frontier model, Claude Code
   or Codex outside the app) can change — and a gate that decides whether a change is kept. The design follows the
   2026 harness-evolution literature (Harness², AHE, Prime Agent, "Do Agent Optimizers Compound?"): a loop only
   produces lasting gains when edits are tested against checks the editor cannot touch, by something outside the loop,
   before they persist; the base prompt is immutable; every edit can be reverted by id; there is an experience log.
   It is also stage 3 of the S1 Forge v3 plan that was never built ("S2 proposes setup patches tested against a frozen
   check set that the patch path cannot edit; the harness, not S2, accepts it only when it is not worse").

   The modules are a VIEW over the settings the loop already reads (S1CFG.gate, maxSteps…) plus four new parts the
   loop now reads too (instruction addenda, action guidance, extra commit words, lessons, model profiles). No second
   store, so nothing can drift. The checks live in code, not in the bundle: no patch path reaches them. */
let S1MOD=Object.assign({v:1,instructions:{order:'',screen:''},actions:{},consequentialExtra:[],models:[],lessons:[],
  history:[],experience:[]},store.get('s1mod37',{}));
const saveS1Mod=()=>{S1MOD.history=(S1MOD.history||[]).slice(0,20);S1MOD.experience=(S1MOD.experience||[]).slice(0,60);store.set('s1mod37',S1MOD);};
const S1MOD_LIMITS={text:1200,lesson:300,lessons:12,words:24,models:24,budget:2600};
const S1MOD_SCHEMA='A patch is JSON: {"why":"one sentence","ops":[...]} with ops from this list ONLY:\n'+
  '{"op":"set","path":"instructions.order"|"instructions.screen","value":"text appended to the base instructions (base is fixed)"}\n'+
  '{"op":"set","path":"guardrails.gate.read"|"guardrails.gate.write"|"guardrails.gate.destructive"|"guardrails.gate.finish","value":0.3-0.99}\n'+
  '{"op":"set","path":"actions.click"|"actions.click_consequential"|"actions.type_text"|"actions.select_option"|"actions.wait","value":"better description"}\n'+
  '{"op":"add"|"remove","path":"guardrails.consequential","value":"a word that marks a committing button"}\n'+
  '{"op":"set","path":"limits.maxSteps" (3-60)|"limits.confirmGoal" (1-3),"value":n}\n'+
  '{"op":"add","path":"lessons","value":"one short lesson"} · {"op":"remove","path":"lessons","value":index}\n'+
  '{"op":"add","path":"models","value":{"id":"slug","label":"Name","wire":"systemone"|"letter","url":"https://… or http://127.0.0.1:…","model":"id","params":7,"key":false,"note":"…"}} · {"op":"remove","path":"models","value":"id"}\n'+
  'Rules: lowering a gate, removing a commit word or raising the step limit LOOSENS safety and is never applied without a person. '+
  'Instructions and lessons must not contain URLs, credentials or instructions to ignore rules.';
/* PURE. The editable view: what an editor sees and what a patch changes. */
function s1ModBundle(){
  return JSON.parse(JSON.stringify({v:S1MOD.v,instructions:S1MOD.instructions,actions:S1MOD.actions,
    guardrails:{gate:S1CFG.gate,consequential:S1MOD.consequentialExtra},limits:{maxSteps:S1CFG.maxSteps,confirmGoal:S1CFG.confirmGoal},
    lessons:S1MOD.lessons,models:S1MOD.models}));
}
/* PURE. bundle + ops → {ok, next, errors[], loosens[]}. Unknown paths, wrong types and out-of-range values are refused. */
function s1PatchApply(bundle,ops){
  const b=JSON.parse(JSON.stringify(bundle)),errors=[],loosens=[];
  const str=(v,max)=>typeof v==='string'&&v.length<=max&&!/https?:\/\/|\bapi[_-]?key\b|\bsk-[A-Za-z0-9]/i.test(v)&&
    (typeof injectionScan!=='function'||injectionScan(v,'harness patch').clean);
  (Array.isArray(ops)?ops:[]).forEach((o,i)=>{
    const at='op '+(i+1)+' ('+String(o&&o.path)+')';
    if(!o||typeof o!=='object'||typeof o.path!=='string')return errors.push(at+': not an op');
    const p=o.path,v=o.value;let m;
    if(o.op==='set'&&(m=p.match(/^instructions\.(order|screen)$/))){if(!str(v,S1MOD_LIMITS.text))return errors.push(at+': text too long, or holds a URL/credential/instruction-override');b.instructions[m[1]]=v;}
    else if(o.op==='set'&&(m=p.match(/^guardrails\.gate\.(read|write|destructive|finish)$/))){
      if(typeof v!=='number'||!(v>=0.3&&v<=0.99))return errors.push(at+': a gate is a number from 0.3 to 0.99');
      if(v<b.guardrails.gate[m[1]])loosens.push(m[1]+' gate '+b.guardrails.gate[m[1]]+' → '+v);b.guardrails.gate[m[1]]=v;}
    else if(o.op==='set'&&(m=p.match(/^actions\.(click|click_consequential|type_text|select_option|wait)$/))){if(!str(v,400))return errors.push(at+': description too long or unsafe');b.actions[m[1]]=v;}
    else if(p==='guardrails.consequential'&&(o.op==='add'||o.op==='remove')){
      if(typeof v!=='string'||!/^[a-z][a-z \-]{1,24}$/i.test(v))return errors.push(at+': a commit word is 2–25 letters');
      const w=v.toLowerCase(),list=b.guardrails.consequential;
      if(o.op==='add'){if(!list.includes(w)&&list.length<S1MOD_LIMITS.words)list.push(w);}
      else{const k=list.indexOf(w);if(k<0)return errors.push(at+': no such word (the built-in words cannot be removed)');list.splice(k,1);loosens.push('commit word "'+w+'" removed');}}
    else if(o.op==='set'&&(m=p.match(/^limits\.(maxSteps|confirmGoal)$/))){
      const lim=m[1]==='maxSteps'?[3,60]:[1,3];
      if(!Number.isInteger(v)||v<lim[0]||v>lim[1])return errors.push(at+': '+m[1]+' must be a whole number '+lim.join('–'));
      if(m[1]==='maxSteps'&&v>b.limits.maxSteps)loosens.push('step limit '+b.limits.maxSteps+' → '+v);
      if(m[1]==='confirmGoal'&&v<b.limits.confirmGoal)loosens.push('finish confirmations '+b.limits.confirmGoal+' → '+v);
      b.limits[m[1]]=v;}
    else if(p==='lessons'&&o.op==='add'){if(!str(v,S1MOD_LIMITS.lesson))return errors.push(at+': lesson too long or unsafe');if(b.lessons.length>=S1MOD_LIMITS.lessons)return errors.push(at+': at most '+S1MOD_LIMITS.lessons+' lessons — remove one first');b.lessons.push(v);}
    else if(p==='lessons'&&o.op==='remove'){if(!Number.isInteger(v)||!b.lessons[v])return errors.push(at+': no lesson at that index');b.lessons.splice(v,1);}
    else if(p==='models'&&o.op==='add'){
      const x=v||{};
      if(!/^[a-z0-9][a-z0-9-]{1,40}$/.test(String(x.id||'')))return errors.push(at+': model id is a lowercase slug');
      if(!/^https?:\/\/[^\s]+$/.test(String(x.url||'')))return errors.push(at+': model url must be http(s)');
      if(!['systemone','letter'].includes(x.wire))return errors.push(at+': wire is "systemone" or "letter"');
      if('key' in x&&typeof x.key!=='boolean')return errors.push(at+': "key" says whether one is NEEDED (true/false) — never the key itself');
      if(b.models.length>=S1MOD_LIMITS.models&&!b.models.some(y=>y.id===x.id))return errors.push(at+': too many model profiles');
      const clean={id:x.id,label:String(x.label||x.id).slice(0,60),wire:x.wire,url:x.url,model:String(x.model||'').slice(0,80),
        params:+x.params>0?+x.params:undefined,key:!!x.key,note:String(x.note||'').slice(0,200),custom:true};
      b.models=b.models.filter(y=>y.id!==x.id).concat([clean]);}
    else if(p==='models'&&o.op==='remove'){const n=b.models.length;b.models=b.models.filter(y=>y.id!==v);if(b.models.length===n)errors.push(at+': no such model profile');}
    else errors.push(at+': not an allowed path/op');
  });
  return{ok:!errors.length,next:b,errors,loosens};
}
/* The loop's readers. */
function s1ModApply37(decl,kind,bundle){
  const b=bundle||s1ModBundle();
  const add=b.instructions&&b.instructions[kind==='order'?'order':'screen'];
  if(add)decl.instructions=decl.instructions+' '+add;
  if(kind!=='order')Object.entries(b.actions||{}).forEach(([k,d])=>{if(decl.actions[k]&&d)decl.actions[k].description=d;});
  return decl;
}
function s1Consequential37(label){
  return S1_CONSEQUENTIAL.test(label)||(S1MOD.consequentialExtra||[]).some(w=>new RegExp('\\b'+w.replace(/[^a-z \-]/gi,'')+'\\b','i').test(label));
}
function s1Lessons37(bundle){const l=((bundle||S1MOD).lessons||[]).slice(0,S1MOD_LIMITS.lessons);return l.length?'Lessons from earlier runs: '+l.join(' · '):'';}
function s1Presets37(){return S1_DECISION_PRESETS.slice(0,-1).concat(S1MOD.models||[],S1_DECISION_PRESETS.slice(-1));}
/* The frozen check set. Deterministic, no model calls, NOT in the bundle. A patch is judged on all of it. */
async function s1Checks37(bundle){
  const b=bundle||s1ModBundle(),out=[];const ck=(id,ok,why)=>out.push({id,ok:!!ok,why});
  const gt=b.guardrails.gate;
  ck('gate-order',gt.read<=gt.write&&gt.write<=gt.destructive,'read ≤ write ≤ destructive');
  ck('destructive-floor',gt.destructive>=0.8,'committing actions need at least 0.8');
  ['pay','delete','send','submit','purchase'].forEach(w=>ck('commit-'+w,S1_CONSEQUENTIAL.test(w),'"'+w+'" still marks a committing button'));
  const order=s1ModApply37(JSON.parse(JSON.stringify(S1_ORDER_SPACE)),'order',b),screen=s1ModApply37(JSON.parse(JSON.stringify(S1_COMPUTER_SPACE)),'screen',b);
  screen.gate=Object.assign({},gt);
  const so=s1Space(order),ss=s1Space(screen);
  ck('order-space-valid',so.ok,so.error||'order desk action space compiles');ck('screen-space-valid',ss.ok,ss.error||'screen action space compiles');
  const extra=(b.instructions.order+b.instructions.screen+s1Lessons37(b)).length;
  ck('prompt-budget',extra<=S1MOD_LIMITS.budget,extra+' added characters (≤ '+S1MOD_LIMITS.budget+')');
  ck('no-injection',[b.instructions.order,b.instructions.screen].concat(b.lessons).every(t=>!t||typeof injectionScan!=='function'||injectionScan(t,'harness').clean),'nothing instruction-override-shaped');
  ck('no-secrets',!/sk-[A-Za-z0-9]{8}|nace_sk_|Bearer\s/i.test(JSON.stringify(b)),'no credentials in the harness');
  /* The known-correct order-desk paths, replayed at 0.95 confidence, must still complete under these guardrails and
     this step limit — a gate set so high (or a limit so low) that a near-certain correct move is refused fails here. */
  for(const sc of Object.keys(S1_REPLAYS)){
    const env=s1OrderDesk(sc),d=JSON.parse(JSON.stringify(order));d.gate=Object.assign({},S1_ORDER_SPACE.gate,{destructive:Math.max(S1_ORDER_SPACE.gate.destructive,gt.destructive),write:Math.max(S1_ORDER_SPACE.gate.write,gt.write)});
    const sp=s1Space(d);let ok=false,why='';
    if(sp.ok){const r=await s1Run(env.goal,{space:sp.space,env,decide:s1Scripted(S1_REPLAYS[sc]),deciderLabel:'replay',maxSteps:b.limits.maxSteps,record:false});
      ok=r.status==='completed'&&(!env.goalMet||env.goalMet());why=r.status+' / '+r.reason+' in '+r.steps.length+' steps';}
    else why=sp.error;
    ck('replay-'+sc,ok,why);
  }
  return{passed:out.filter(c=>c.ok).length,total:out.length,checks:out};
}
/* The gate. The harness — not the editor — decides: every check passes, no worse than the current harness, and
   anything that loosens safety waits for a person. */
async function s1PatchGate37(patch,opts){
  const o=opts||{},cur=s1ModBundle();
  const r=s1PatchApply(cur,patch&&patch.ops);
  if(!r.ok)return{accept:false,stage:'validate',errors:r.errors,loosens:r.loosens};
  const before=await s1Checks37(cur),after=await s1Checks37(r.next);
  const failing=after.checks.filter(c=>!c.ok);
  let verdict={accept:!failing.length&&after.passed>=before.passed,stage:'checks',before,after,failing,loosens:r.loosens,next:r.next};
  if(verdict.accept&&r.loosens.length&&!o.humanApproved)verdict=Object.assign(verdict,{accept:false,stage:'needs-person'});
  return verdict;
}
function s1ModCommit37(next,meta){
  const before=s1ModBundle(),id=uid();
  S1MOD.instructions=next.instructions;S1MOD.actions=next.actions;S1MOD.consequentialExtra=next.guardrails.consequential;
  S1MOD.lessons=next.lessons;S1MOD.models=next.models;S1MOD.v=(S1MOD.v||1)+1;
  S1CFG.gate=Object.assign({},S1CFG.gate,next.guardrails.gate);S1CFG.maxSteps=next.limits.maxSteps;S1CFG.confirmGoal=next.limits.confirmGoal;saveS1();
  S1MOD.history.unshift({id,at:nowISO(),by:(meta&&meta.by)||'person',why:String((meta&&meta.why)||'').slice(0,240),ops:(meta&&meta.ops)||[],before});
  s1ModLearn37('accepted v'+S1MOD.v+' ('+((meta&&meta.by)||'person')+'): '+((meta&&meta.why)||'')+((meta&&meta.loosens&&meta.loosens.length)?' — loosening approved by a person: '+meta.loosens.join('; '):''));
  saveS1Mod();try{logEvent('s1-harness',{v:S1MOD.v,by:meta&&meta.by});}catch(_){}
  return id;
}
function s1ModRevert37(id){
  const h=(S1MOD.history||[]).find(x=>x.id===id);if(!h)return false;
  s1ModCommit37(h.before,{by:'revert',why:'reverted to before '+id});return true;
}
function s1ModLearn37(line){S1MOD.experience.unshift({at:nowISO(),line:String(line).slice(0,300)});saveS1Mod();}
/* PURE. A whole edited harness (from an LLM outside the app) → the ops that turn the current one into it. */
function s1BundleToOps(cur,want){
  const ops=[],w=want||{};
  ['order','screen'].forEach(k=>{const v=w.instructions&&w.instructions[k];if(typeof v==='string'&&v!==cur.instructions[k])ops.push({op:'set',path:'instructions.'+k,value:v});});
  Object.entries(w.actions||{}).forEach(([k,v])=>{if(v!==cur.actions[k])ops.push({op:'set',path:'actions.'+k,value:v});});
  Object.entries((w.guardrails&&w.guardrails.gate)||{}).forEach(([k,v])=>{if(v!==cur.guardrails.gate[k])ops.push({op:'set',path:'guardrails.gate.'+k,value:v});});
  const wc=(w.guardrails&&w.guardrails.consequential)||cur.guardrails.consequential;
  wc.filter(x=>!cur.guardrails.consequential.includes(x)).forEach(x=>ops.push({op:'add',path:'guardrails.consequential',value:x}));
  cur.guardrails.consequential.filter(x=>!wc.includes(x)).forEach(x=>ops.push({op:'remove',path:'guardrails.consequential',value:x}));
  Object.entries(w.limits||{}).forEach(([k,v])=>{if(v!==cur.limits[k])ops.push({op:'set',path:'limits.'+k,value:v});});
  if(Array.isArray(w.lessons)){for(let i=cur.lessons.length-1;i>=0;i--)if(!w.lessons.includes(cur.lessons[i]))ops.push({op:'remove',path:'lessons',value:i});
    w.lessons.filter(x=>!cur.lessons.includes(x)).forEach(x=>ops.push({op:'add',path:'lessons',value:x}));}
  if(Array.isArray(w.models)){cur.models.filter(m=>!w.models.some(x=>x.id===m.id)).forEach(m=>ops.push({op:'remove',path:'models',value:m.id}));
    w.models.filter(m=>JSON.stringify(m)!==JSON.stringify(cur.models.find(x=>x.id===m.id))).forEach(m=>ops.push({op:'add',path:'models',value:m}));}
  return ops;
}
/* The editor: ANY model that can run (primary, a free one, a local one). It proposes; the gate disposes. */
async function s1ModPropose37(model){
  const failed=(S1CFG.runs||[]).filter(r=>r.status!=='completed').slice(0,8);
  const msg='CURRENT S1 HARNESS (JSON):\n'+JSON.stringify(s1ModBundle(),null,1)+'\n\nRECENT RUNS THAT DID NOT COMPLETE:\n'+
    (failed.length?failed.map(r=>'- '+r.env+' "'+r.goal+'" → '+r.status+'/'+r.reason+' after '+r.steps+' steps ('+r.decider+')').join('\n'):'(none — propose only clear improvements, or an empty ops list)')+
    '\n\nEXPERIENCE (earlier harness edits and what happened):\n'+((S1MOD.experience||[]).slice(0,10).map(e=>'- '+e.line).join('\n')||'(none)')+
    '\n\n'+S1MOD_SCHEMA+'\nPropose the SMALLEST patch likely to fix the failures. Answer with the JSON patch only.';
  const acc=await streamComplete({model:model||primaryModel(),temperature:0.2,maxTokens:3000,messages:[
    {role:'system',content:'You improve a decision-model harness by proposing small, reversible patches. Never loosen safety unless a failure proves it necessary, and say so in "why".'},
    {role:'user',content:msg}]},null,null,'s1 harness proposal');
  const t=String(acc.content||'');const j=t.slice(t.indexOf('{'),t.lastIndexOf('}')+1);
  try{const p=JSON.parse(j);return{ok:true,patch:{why:String(p.why||''),ops:Array.isArray(p.ops)?p.ops:[]},model:acc.model||model};}
  catch(_){return{ok:false,error:'the model did not answer with a JSON patch',raw:t.slice(0,400)};}
}
function s1ModRender37(){
  const h=$('#s1mod37');if(!h)return;
  const b=s1ModBundle();
  const cmd=c=>`<div class="row" style="margin-top:6px"><code class="mono cmdbox" style="max-height:120px;overflow:auto">${esc(c)}</code></div>`;
  h.innerHTML=`<div class="card"><h3 style="margin-top:0">Harness modules — let any model improve System One, safely</h3>
    <p class="help">Everything that shapes a run is editable here or by a model: instruction add-ons (the base is fixed), action guidance,
      guardrails, limits, lessons and <b>model profiles</b> (Jev, Cua-S1, Laya, Lara, a fine-tune on Ollama — any server that speaks
      <span class="mono">systemone</span> or one-letter <span class="mono">letter</span> logprobs). A change is kept only if the
      <b>frozen checks</b> (${'which no patch can edit'}) all pass and it is no worse than now; anything that loosens safety waits for you.
      Every version can be reverted.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin:8px 0">
      <span class="chip">version ${b.v}</span><span class="chip">${b.models.length} model profile(s)</span><span class="chip">${b.lessons.length} lesson(s)</span>
      <span class="chip" id="s1m-ck">checks: …</span></div>
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="btn" id="s1m-prop">Improve from my runs</button>
      <input id="s1m-model" class="mono" style="flex:0 1 220px" placeholder="editor model (blank = ${esc(primaryModel()||'primary')})">
      <button class="btn small" id="s1m-copy">Copy for another AI</button>
      <button class="btn small ghost" id="s1m-exp">Export JSON</button>
      <button class="btn small ghost" id="s1m-xp">Export EXPERIENCE.md</button></div>
    <textarea id="s1m-in" class="mono" rows="6" style="width:100%;margin-top:10px" placeholder='Paste a patch {"why":…,"ops":[…]} or a whole edited harness JSON from any AI'></textarea>
    <div class="row" style="gap:8px;margin-top:6px"><button class="btn small" id="s1m-test">Test &amp; apply</button>
      <label class="chip"><input type="checkbox" id="s1m-ok" style="margin:0"> I approve changes that loosen safety</label></div>
    <div id="s1m-out" style="margin-top:10px"></div>
    <details class="dd" style="margin-top:10px"><summary>Model profiles (${b.models.length})</summary><div class="ddb">
      ${b.models.map(m=>`<div class="row" style="gap:8px;align-items:center;margin:4px 0"><b>${esc(m.label)}</b><span class="mono help">${esc(m.wire)} · ${esc(m.url)} · ${esc(m.model||'—')}${m.params?' · '+m.params+'B':''}</span></div>`).join('')||'<p class="help">None yet. Add one with a patch, e.g.</p>'+cmd('{"why":"add Lara","ops":[{"op":"add","path":"models","value":{"id":"lara","label":"Lara","wire":"systemone","url":"http://127.0.0.1:8000/v1/systemone","model":"lara","params":4,"key":false}}]}')}
      <p class="help">Profiles appear under <b>Who decides → Decision model</b>. A local profile over this Mac's size cap is refused before it is called.</p></div></details>
    <details class="dd" style="margin-top:8px"><summary>Versions (${(S1MOD.history||[]).length})</summary><div class="ddb">
      ${(S1MOD.history||[]).map(x=>`<div class="row" style="gap:8px;align-items:center;margin:4px 0"><span class="mono help">${esc(x.at.slice(0,16).replace('T',' '))}</span><span>${esc(x.by)}: ${esc(x.why||'(no reason)')}</span><button class="btn small ghost" data-s1rev="${esc(x.id)}">Revert</button></div>`).join('')||'<p class="help">No edits yet.</p>'}</div></details>`;
  s1Checks37().then(c=>{const el=$('#s1m-ck');if(el)el.textContent='checks: '+c.passed+'/'+c.total;});
  const out=$('#s1m-out');
  const show=(v,patch,by)=>{
    if(v.stage==='validate'){out.innerHTML=`<div class="diagbox bad"><b>Refused before testing.</b><ul>${v.errors.map(e=>'<li>'+esc(e)+'</li>').join('')}</ul></div>`;s1ModLearn37('refused ('+by+'): '+v.errors[0]);return;}
    const rows=v.after.checks.map(c=>`<li>${c.ok?'✓':'✗'} ${esc(c.id)} <span class="help">${esc(c.why)}</span></li>`).join('');
    if(v.accept){const id=s1ModCommit37(v.next,{by,why:patch.why,ops:patch.ops,loosens:v.loosens});
      out.innerHTML=`<div class="diagbox"><b>Kept as version ${S1MOD.v}.</b> Checks ${v.before.passed}/${v.before.total} → ${v.after.passed}/${v.after.total}. <button class="btn small ghost" data-s1rev="${esc(id)}">Undo</button></div>`;
      setTimeout(()=>{s1ModRender37();const o2=$('#s1m-out');if(o2)o2.innerHTML=out.innerHTML;wire();},0);return;}
    out.innerHTML=`<div class="diagbox bad"><b>${v.stage==='needs-person'?'Waiting for you — this loosens safety:':'Not kept — the checks say it is worse.'}</b>
      ${v.loosens.length?'<div>'+v.loosens.map(esc).join('; ')+'</div>':''}<ul style="margin:6px 0 0 18px">${rows}</ul></div>`;
    s1ModLearn37((v.stage==='needs-person'?'held for a person':'rejected')+' ('+by+'): '+(patch.why||'')+' — '+(v.failing.map(c=>c.id).join(', ')||v.loosens.join('; ')));
  };
  const test=async(patch,by)=>{out.innerHTML='<p class="help">Testing against the frozen checks…</p>';
    const v=await s1PatchGate37(patch,{humanApproved:$('#s1m-ok').checked});show(v,patch,by);};
  const wire=()=>{$$('[data-s1rev]').forEach(x=>x.onclick=()=>{if(s1ModRevert37(x.dataset.s1rev)){toast('Reverted',2000);s1ModRender37();}});};
  wire();
  $('#s1m-test').onclick=()=>{let j;try{j=JSON.parse($('#s1m-in').value);}catch(_){return toast('That is not JSON',3000);}
    const patch=Array.isArray(j.ops)?{why:j.why||'',ops:j.ops}:{why:'whole-harness edit',ops:s1BundleToOps(s1ModBundle(),j)};
    if(!patch.ops.length)return toast('Nothing differs from the current harness',3000);test(patch,'pasted');};
  $('#s1m-prop').onclick=async()=>{const btn=$('#s1m-prop');btn.disabled=true;btn.textContent='Asking…';
    try{const r=await s1ModPropose37($('#s1m-model').value.trim());
      if(!r.ok){out.innerHTML=`<div class="diagbox bad">${esc(r.error)}</div>`;}
      else if(!r.patch.ops.length){out.innerHTML='<p class="help">The model proposed no change.</p>';}
      else{$('#s1m-in').value=JSON.stringify(r.patch,null,1);await test(r.patch,'model '+(r.model||''));}}
    catch(e){out.innerHTML=`<div class="diagbox bad">${esc(e.message||String(e))}</div>`;}
    btn.disabled=false;btn.textContent='Improve from my runs';};
  $('#s1m-copy').onclick=()=>navigator.clipboard.writeText('Improve this System One harness. '+S1MOD_SCHEMA+'\n\nHARNESS:\n'+JSON.stringify(s1ModBundle(),null,1)+'\n\nAnswer with a JSON patch, or the whole edited harness JSON.').then(()=>toast('Copied — paste it into any AI, then paste its answer back here'),()=>toast('Copy failed'));
  $('#s1m-exp').onclick=()=>downloadJSON('s1-harness.json',s1ModBundle());
  $('#s1m-xp').onclick=()=>downloadText('EXPERIENCE.md','# S1 harness experience\n\n'+(S1MOD.experience||[]).map(e=>'- '+e.at.slice(0,16)+' '+e.line).join('\n')+'\n');
}
