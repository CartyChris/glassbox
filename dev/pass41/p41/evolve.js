/* ═══════════════════ PASS 41 — THE AGENT IMPROVES ITS OWN HARNESS (Ouroboros loop) ═══════════════════
   The model stays frozen; the harness (prompts, guardrails, tool guidance, memory, skills, rules, per-model notes)
   is what changes — tested, gated, versioned, and reversible. One cycle on a task:
     reference  run the current harness (k times) and score it — a hidden verifier when the task has one (the editor
                never sees it), else an independent judge on a rubric
     propose    an editor model reads the trajectory and proposes 1–3 edits, twice: one INVARIANT (general agent
                habits: planning, verification, tool use, format) and one DOMAIN (procedures for this kind of task)
     probe      each candidate harness runs the same task
     select     best score wins; on a tie the smaller harness wins (verified tasks) or a blind pairwise judge decides
     gate       must beat the reference; must not regress the ANCHOR tasks (replayed before/after) beyond a tolerance;
                size cap; edit text is scanned for injected instructions (flagged → needs a person); and by default
                every adoption waits in the review queue for you
     reflect    a lesson is written to the library only if the contrast supports it, and later runs retrieve it
   The editor can only edit the harness. It cannot touch the core protocol, the task suite, the verifiers or the gate —
   a loop that can edit its own benchmark optimises the benchmark. */
const EVO41_DEFAULTS={k:1,editor:'',judge:'',executor:'',requireApproval:true,maxCalls:60,maxUSD:0.5,tol:0.1,sizeCap:14000,log:[],queue:[],scores:{},tasks:[]};
let EVO41=Object.assign({},EVO41_DEFAULTS,store.get('evo41',{}));
const saveEvo41=()=>{EVO41.log=(EVO41.log||[]).slice(0,120);EVO41.queue=(EVO41.queue||[]).slice(0,20);store.set('evo41',EVO41);};
let EVO41_BUSY=null;
/* Built-in tasks with hidden verifiers (the verifier source never reaches a model). */
const TASKS41=[
  {id:'fizzbazz',title:'FizzBuzzBazz',domain:'code',tags:['anchor'],prompt:'Return an array for n = 1..35: "Fizz" if divisible by 3, "Buzz" by 5, "Bazz" by 7 — concatenated in that order when several apply (21 → "FizzBazz", 35 → "BuzzBazz") — otherwise the number as a string. Submit the array.',
   verify:'(a)=>{const e=[];for(let n=1;n<=35;n++){let s="";if(n%3===0)s+="Fizz";if(n%5===0)s+="Buzz";if(n%7===0)s+="Bazz";e.push(s||String(n));}const ok=Array.isArray(a)&&a.length===35&&a.every((x,i)=>String(x)===e[i]);return{score:ok?1:0,detail:ok?"exact":"wrong at "+(Array.isArray(a)?a.findIndex((x,i)=>String(x)!==e[i]):"(not an array)")};}'},
  {id:'median-b',title:'Median of group B',domain:'data',tags:[],prompt:'data.csv has columns group,value. Submit the median value of group B as a number.',
   files:{'data.csv':'group,value\nA,4\nB,10\nB,3\nA,8\nB,7\nB,21\nA,1\nB,5\n'},verify:'(a)=>({score:Number(a)===7?1:0,detail:"expected 7, got "+JSON.stringify(a)})'},
  {id:'range-fix',title:'Fix rangeSum',domain:'code',tags:['anchor'],prompt:'src/range_sum.js has a buggy rangeSum(a, b). It must return the sum of all integers from a to b INCLUSIVE, in either order (rangeSum(4,1) === 10). Fix the file in place, then submit("fixed").',
   files:{'src/range_sum.js':'function rangeSum(a, b) {\n  let s = 0;\n  for (let i = a; i < b; i++) s += i;\n  return s;\n}\n'},
   verify:'(a,vfs)=>{try{const f=new Function((vfs["src/range_sum.js"]||"")+";return rangeSum;")();const t=[[1,4,10],[4,1,10],[5,5,5],[-2,2,0],[0,100,5050]];const bad=t.filter(([x,y,z])=>f(x,y)!==z);return{score:bad.length?0:1,detail:bad.length?"fails "+JSON.stringify(bad[0]):"all cases pass"};}catch(e){return{score:0,detail:"error: "+e.message};}}'},
  {id:'roman',title:'Roman numerals',domain:'code',tags:[],prompt:'input is an array of integers. Submit an array with each converted to a Roman numeral (standard subtractive form).',input:[1994,2024,4,9,3999,14],
   verify:'(a)=>{const e=["MCMXCIV","MMXXIV","IV","IX","MMMCMXCIX","XIV"];const ok=Array.isArray(a)&&e.every((x,i)=>a[i]===x);return{score:ok?1:0,detail:ok?"exact":"expected "+e.join(",")};}'},
  {id:'crt',title:'Remainders puzzle',domain:'math',tags:['heldout'],prompt:'Find the two smallest positive integers n with n mod 3 = 2, n mod 5 = 3 and n mod 7 = 2. Submit them as an array, smallest first.',
   verify:'(a)=>{const ok=Array.isArray(a)&&a[0]===23&&a[1]===128&&a.length===2;return{score:ok?1:0,detail:ok?"exact":"expected [23,128]"};}'},
  {id:'top-words',title:'Top words',domain:'data',tags:['heldout'],prompt:'essay.txt is text; input.stopwords lists words to ignore. Lower-case everything, count words (letters only), and submit the 3 most frequent remaining words — ties broken alphabetically.',
   files:{'essay.txt':'The river runs. The river bends, and the river sleeps. A stone sits by the bend; the stone waits. Rain falls on the stone and the river.'},input:{stopwords:['the','and','a','on','by']},
   verify:'(a)=>{const e=["river","stone","bend"];const ok=Array.isArray(a)&&e.every((x,i)=>a[i]===x)&&a.length===3;return{score:ok?1:0,detail:ok?"exact":"expected "+e.join(",")};}'},
  {id:'team-done',title:'Done per team',domain:'data',tags:['anchor'],prompt:'input is a list of {team, status}. Submit an object mapping EVERY team (including teams with none done) to its count of status "done", with keys sorted alphabetically.',
   input:[{team:'ops',status:'done'},{team:'web',status:'open'},{team:'ops',status:'open'},{team:'data',status:'done'},{team:'data',status:'done'},{team:'web',status:'open'}],
   verify:'(a)=>{const ok=a&&typeof a==="object"&&JSON.stringify(a)===JSON.stringify({data:2,ops:1,web:0});return{score:ok?1:0,detail:ok?"exact":"expected {data:2,ops:1,web:0} with sorted keys"};}'},
];
const tasks41=()=>TASKS41.concat(EVO41.tasks||[]);
/* A spend guard every model call in a cycle passes BEFORE it is made. */
function budget41(maxCalls,maxUSD){let calls=0,usd=0;return{take(){if(calls>=maxCalls||usd>=maxUSD)return false;calls++;return true;},spend(c){usd+=+c||0;},
  why:()=>calls>=maxCalls?calls+' model calls':'$'+usd.toFixed(3),get calls(){return calls;},get usd(){return usd;}};}
async function score41(task,run,o){
  if(task.verify){
    if(run.status!=='submitted'&&run.status!=='answered')return{score:0,method:'verifier',detail:'no submission ('+run.status+')'};
    const code='const __v=('+task.verify+');return __v('+JSON.stringify(run.answer===undefined?null:run.answer)+','+JSON.stringify(run.vfs||{})+','+JSON.stringify(task.input===undefined?null:task.input)+');';
    const r=await e2bRun(code,'js',{timeout:8000});let v=null;try{v=r.result?JSON.parse(r.result):null;}catch(_){}
    return v&&typeof v==='object'?{score:Math.max(0,Math.min(1,+v.score||0)),method:'verifier',detail:String(v.detail||'').slice(0,200)}:{score:0,method:'verifier',detail:'verifier error: '+(r.error||'no result')};
  }
  if(run.answer===undefined)return{score:0,method:'judge',detail:'no answer'};
  if(o&&o.budget&&!o.budget.take())return{score:0,method:'judge',detail:'budget spent'};
  const acc=await streamComplete({model:EVO41.judge||settings.archModel,maxTokens:300,temperature:0,messages:[{role:'user',content:
    'You are an impartial evaluator. Score the RESPONSE to the TASK from 0 to 10 using the RUBRIC. Judge only the final deliverable. Return JSON {"score":number,"reason":string}.\n\nTASK:\n'+task.prompt+
    '\n\nRUBRIC:\n'+(task.rubric||'Correct, complete, follows the requested format, concise.')+'\n\nRESPONSE:\n'+String(swe41AnswerText(run.answer)).slice(0,4000)}]},null,o&&o.signal,'evolve:judge');
  if(o&&o.budget)o.budget.spend(acc.cost||0);
  const j=tc41Json(acc.content)||{};return{score:Math.max(0,Math.min(1,(+j.score||0)/10)),method:'judge',detail:String(j.reason||'').slice(0,200)};
}
async function eval41(task,h,o){
  const run=await swe41Run(task,Object.assign({harness:h,model:EVO41.executor||undefined,tools:false,maxSteps:Math.min(10,h.maxSteps||10)},o||{}));
  const sc=await score41(task,run,o);return Object.assign(run,sc);
}
const harnessSize41=h=>JSON.stringify({s:h.system,g:h.guardrails,m:h.memory,t:h.toolGuidance,k:h.skills,r:h.rules,o:h.overlays}).length;
/* PURE. Apply edits to a COPY. Returns the new harness, what applied, what was refused, and anything flagged for a person. */
function edits41Apply(base,edits,o){
  const h=JSON.parse(JSON.stringify(base)),applied=[],errors=[],flags=[];
  const txt=['system','guardrails','memory','toolGuidance'];
  const scan=s=>{try{const r=injectionScan(String(s||''),'harness edit');if(r&&!r.clean)flags.push(r.hits.map(x=>x.what).join(', '));}catch(_){}};
  const redos=p=>/\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)[+*{]/.test(p);
  (Array.isArray(edits)?edits:[]).slice(0,4).forEach((e,i)=>{
    if(!e||typeof e!=='object'){errors.push('#'+i+' not an object');return;}
    const c=String(e.component||'');
    if(txt.includes(c)){
      const content=String(e.content||'').slice(0,2000);if(!content.trim()){errors.push('#'+i+' empty content');return;}scan(content);
      if(e.op==='replace'&&e.find){if(!String(h[c]).includes(e.find)){errors.push('#'+i+' "find" text not in '+c);return;}h[c]=String(h[c]).replace(e.find,content);}
      else if(e.op==='replace')h[c]=content;else h[c]=(h[c]?h[c]+'\n':'')+content;
      applied.push(c+' '+(e.op||'append'));return;}
    if(c==='skills'){const n=String(e.name||'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').slice(0,40);if(!n){errors.push('#'+i+' skill needs a name');return;}
      h.skills=h.skills||[];const k=h.skills.findIndex(s=>s.name===n);
      if(e.op==='remove'){if(k<0){errors.push('#'+i+' no skill '+n);return;}h.skills.splice(k,1);applied.push('skill − '+n);return;}
      const s={name:n,description:String(e.description||'').slice(0,160),body:String(e.body||'').slice(0,2500)};scan(s.description+' '+s.body);
      if(k>=0)h.skills[k]=s;else h.skills.push(s);applied.push('skill '+(k>=0?'~ ':'+ ')+n);return;}
    if(c==='rules'){const n=String(e.name||'').slice(0,40)||'rule';h.rules=h.rules||[];
      if(e.op==='remove'){const k=h.rules.findIndex(r=>r.name===n);if(k<0){errors.push('#'+i+' no rule '+n);return;}h.rules.splice(k,1);applied.push('rule − '+n);return;}
      const p=String(e.pattern||'');try{new RegExp(p,e.flags||'');}catch(err){errors.push('#'+i+' bad regex');return;}
      if(!p||p.length>200||redos(p)){errors.push('#'+i+' regex refused (empty, too long or catastrophic)');return;}
      if(!['before','after'].includes(e.when)||!['block','warn','hint'].includes(e.effect)){errors.push('#'+i+' rule needs when before|after and effect block|warn|hint');return;}
      scan(e.message);h.rules.push({name:n,when:e.when,pattern:p,flags:String(e.flags||'').replace(/[^gimsu]/g,''),effect:e.effect,message:String(e.message||'').slice(0,300)});applied.push('rule + '+n);return;}
    if(c==='overlays'){const m=String(e.model||'').slice(0,120);if(!m){errors.push('#'+i+' overlay needs a model');return;}h.overlays=h.overlays||{};scan(e.content);
      h.overlays[m]=((h.overlays[m]||'')+'\n'+String(e.content||'').slice(0,800)).trim();applied.push('notes for '+m);return;}
    errors.push('#'+i+' unknown component '+c);
  });
  return{h,applied,errors,flags,size:harnessSize41(h)};
}
const EDIT41_SCHEMA='Return ONLY JSON: {"rationale":"…","edits":[ {"component":"system|guardrails|memory|toolGuidance","op":"append|replace","content":"…","find":"(optional exact text to replace)"}, '+
  '{"component":"skills","op":"add|update|remove","name":"kebab-name","description":"one line","body":"markdown"}, '+
  '{"component":"rules","op":"add|remove","name":"rule-name","when":"before|after","pattern":"regex","effect":"block|warn|hint","message":"…"}, '+
  '{"component":"overlays","op":"append","model":"model-id","content":"…"} ]}. 1–3 edits. Never include the task\'s answer.';
function trace41Text(run){
  return (run.trace||[]).slice(0,12).map(s=>'#'+s.step+(s.formatError?' [FORMAT ERROR]':'')+'\nthought: '+String(s.thought||'').slice(0,300)+(s.code?'\ncode: '+String(s.code).slice(0,600):'')+
    (s.calls?'\ntools: '+JSON.stringify(s.calls).slice(0,300):'')+'\nobs: '+String(s.obs||s.error||'').slice(0,500)).join('\n---\n')+
    '\nRESULT: status='+run.status+' score='+(run.score!=null?run.score.toFixed(2):'?')+' ('+run.method+': '+(run.detail||'')+')';
}
async function propose41(task,base,ref,scope,lessons,o){
  if(o.budget&&!o.budget.take())throw new Error('budget spent');
  const prompt='['+scope+'] You are the HARNESS EDITOR. A frozen model runs inside the harness below. Improve the harness so the agent does better.\n'+
    (scope==='invariant'?'Scope "invariant": fix general agent habits that recur across tasks (planning, verification, tool use, format). Do NOT add facts about this task.'
      :'Scope "domain": add procedures or constraints for "'+task.domain+'" tasks, preferably as a skill. Do NOT add this task\'s answer.')+
    '\n\nCURRENT HARNESS:\n'+JSON.stringify({system:base.system,guardrails:base.guardrails,memory:base.memory,toolGuidance:base.toolGuidance,skills:(base.skills||[]).map(s=>({name:s.name,description:s.description})),rules:base.rules,overlays:base.overlays})+
    '\n\nTASK: '+task.prompt+'\n\nREFERENCE RUN (scored by '+(task.verify?'a hidden verifier you never see':'a judge')+'):\n'+trace41Text(ref)+
    '\n\nLESSONS SO FAR:\n'+(lessons.length?lessons.map(l=>'- ('+l.domain+', Δ'+(+l.delta||0).toFixed(2)+') '+l.lesson).join('\n'):'(none)')+'\n\n'+EDIT41_SCHEMA;
  const acc=await streamComplete({model:EVO41.editor||settings.archModel,maxTokens:1600,temperature:0.4,messages:[{role:'user',content:prompt}]},null,o.signal,'evolve:propose');
  if(o.budget)o.budget.spend(acc.cost||0);
  const j=tc41Json(acc.content)||{};return{scope,rationale:String(j.rationale||'').slice(0,400),edits:Array.isArray(j.edits)?j.edits:[]};
}
async function reflect41(task,rec,o){
  if(o.budget&&!o.budget.take())return{};
  const acc=await streamComplete({model:EVO41.editor||settings.archModel,maxTokens:400,temperature:0.2,messages:[{role:'user',content:
    'You are the EXPERIENCE REFLECTOR. Summarise what this improvement step taught, ONLY if the contrast below supports it. Return JSON {"situation":"when this applies","lesson":"what to do / avoid","tags":["…"]}; if the evidence is weak return {"lesson":""}.\n'+
    'TASK ('+task.domain+'): '+task.prompt+'\nSTEP: '+JSON.stringify(rec).slice(0,3500)}]},null,o.signal,'evolve:reflect');
  if(o.budget)o.budget.spend(acc.cost||0);return tc41Json(acc.content)||{};
}
function evo41Log(msg,kind){EVO41.log.unshift({ts:Date.now(),msg:String(msg),kind:kind||''});saveEvo41();try{evo41Render();}catch(_){}}
function h41Commit(h,note,parent){const id='h'+Date.now().toString(36);H41.versions.push({id,parent:parent||H41.active,ts:nowISO(),h,note:String(note||'').slice(0,200)});H41.active=id;saveH41();return id;}
/* PURE. The gate's verdict on a selected candidate. */
function gate41(c){
  const r=[];let pass=true,needsPerson=false;
  if(!(c.delta>0)){pass=false;r.push('did not beat the reference');}
  if(c.size>c.sizeCap){pass=false;r.push('harness too large ('+c.size+' > '+c.sizeCap+')');}
  if(c.anchor&&c.anchor.after<c.anchor.before-c.tol){pass=false;r.push('anchor regression '+c.anchor.before.toFixed(2)+' → '+c.anchor.after.toFixed(2));}
  if(c.flags&&c.flags.length){needsPerson=true;r.push('flagged text: '+c.flags.join(' | '));}
  if(c.requireApproval)needsPerson=true;
  return{pass,needsPerson,reasons:r};
}
async function evolve41(task,o){
  const opt=Object.assign({signal:EVO41_BUSY&&EVO41_BUSY.signal},o||{});opt.budget=opt.budget||budget41(EVO41.maxCalls,EVO41.maxUSD);
  const base=h41(),baseId=H41.active,k=Math.max(1,Math.min(3,+EVO41.k||1));
  evo41Log('Evolve on “'+task.title+'” — base '+(H41.versions.find(v=>v.id===baseId)||{}).note,'i');
  const refs=[];for(let i=0;i<k;i++)refs.push(await eval41(task,base,opt));
  const refMean=refs.reduce((a,r)=>a+r.score,0)/refs.length;EVO41.scores[task.id]={score:refMean,h:baseId,ts:Date.now()};
  evo41Log('  reference '+refs.map(r=>r.score.toFixed(2)).join(', ')+' (mean '+refMean.toFixed(2)+')');
  const lessons=lib41Pick(LIB41,task.prompt,task.domain,4);
  const props=[];for(const sc of ['invariant','domain']){try{props.push(await propose41(task,base,refs[0],sc,lessons,opt));}catch(e){evo41Log('  propose '+sc+' failed: '+e.message,'w');}}
  const pool=[];
  for(const p of props){
    const ap=edits41Apply(base,p.edits);
    if(!ap.applied.length){evo41Log('  '+p.scope+': no usable edits ('+ap.errors.join('; ').slice(0,140)+')','w');continue;}
    const run=await eval41(task,ap.h,opt);
    pool.push({scope:p.scope,rationale:p.rationale,h:ap.h,applied:ap.applied,flags:ap.flags,size:ap.size,score:run.score,run});
    evo41Log('  probe '+p.scope+': '+run.score.toFixed(2)+' (Δ '+(run.score-refMean).toFixed(2)+') — '+ap.applied.join(', ')+(ap.flags.length?' [flagged]':''),run.score>refMean?'g':'');
  }
  pool.sort((a,b)=>b.score-a.score||a.size-b.size);
  const best=pool[0];const rec={task:task.id,ref:refMean,cands:pool.map(p=>({scope:p.scope,score:p.score,applied:p.applied})),selected:best?best.scope:'base'};
  if(!best||best.score<=refMean){evo41Log('  kept the current harness — no candidate beat the reference','w');rec.adopted=false;}
  else{
    let anchor=null;
    const anchors=tasks41().filter(t=>(t.tags||[]).includes('anchor')&&t.id!==task.id).slice(0,3);
    if(anchors.length){const before=[],after=[];
      for(const t of anchors){const prev=EVO41.scores[t.id];before.push(prev&&prev.h===baseId?prev.score:(await eval41(t,base,opt)).score);after.push((await eval41(t,best.h,opt)).score);}
      anchor={before:before.reduce((a,b)=>a+b,0)/before.length,after:after.reduce((a,b)=>a+b,0)/after.length};
      evo41Log('  anchor replay '+anchor.before.toFixed(2)+' → '+anchor.after.toFixed(2));}
    const g=gate41({delta:best.score-refMean,size:best.size,sizeCap:EVO41.sizeCap,anchor,tol:EVO41.tol,flags:best.flags,requireApproval:EVO41.requireApproval});
    rec.gate=g;
    if(!g.pass){evo41Log('  gate refused: '+g.reasons.join('; '),'w');rec.adopted=false;}
    else if(g.needsPerson){EVO41.queue.unshift({id:'q'+Date.now().toString(36),ts:Date.now(),task:task.id,title:task.title,baseId,h:best.h,applied:best.applied,delta:best.score-refMean,why:g.reasons.join('; ')||'approval required',rationale:best.rationale});
      evo41Log('  passed the gates — waiting for your approval in the review queue','g');rec.adopted='queued';}
    else{const id=h41Commit(best.h,'evolved on '+task.title+' (+'+(best.score-refMean).toFixed(2)+'): '+best.applied.join(', '),baseId);evo41Log('  adopted as '+id,'g');rec.adopted=true;}
  }
  try{if(best&&best.score!==refMean){const L=await reflect41(task,rec,opt);
    if(L&&L.lesson){LIB41.unshift({id:'l'+Date.now().toString(36),ts:Date.now(),task:task.id,domain:task.domain,situation:String(L.situation||'').slice(0,200),lesson:String(L.lesson).slice(0,400),tags:(L.tags||[]).slice(0,6),delta:+(best.score-refMean).toFixed(3)});saveLib41();evo41Log('  lesson: '+L.lesson.slice(0,140));}}}
  catch(e){evo41Log('  reflect failed: '+e.message,'w');}
  evo41Log('  spent '+opt.budget.calls+' model call(s), $'+opt.budget.usd.toFixed(4));saveEvo41();
  return rec;
}
async function evo41RunMany(ids,mode){
  if(EVO41_BUSY)return toast('Already running',1800);
  EVO41_BUSY=new AbortController();const budget=budget41(EVO41.maxCalls,EVO41.maxUSD);
  try{for(const id of ids){const t=tasks41().find(x=>x.id===id);if(!t)continue;if(EVO41_BUSY.signal.aborted)break;
      if(mode==='evolve')await evolve41(t,{budget,signal:EVO41_BUSY.signal});
      else{const r=await eval41(t,h41(),{budget,signal:EVO41_BUSY.signal});EVO41.scores[t.id]={score:r.score,h:H41.active,ts:Date.now(),detail:r.detail,steps:r.steps};evo41Log(t.title+': '+r.score.toFixed(2)+' — '+r.detail+' ('+r.steps+' steps)',r.score>=1?'g':r.score>0?'':'w');}}}
  catch(e){evo41Log('stopped: '+e.message,'w');}
  finally{EVO41_BUSY=null;saveEvo41();evo41Render();}
}
function evo41Render(){
  const host=$('#evo41');if(!host)return;
  const T=tasks41(),ver=H41.versions.find(v=>v.id===H41.active)||{},h=h41();
  const sel=new Set(EVO41.sel||T.map(t=>t.id));
  host.innerHTML=`<div class="card evo41"><h2>Self-improving agent</h2>
    <p class="help">The Agent mode's harness improves itself on tasks you choose: it runs, an editor model proposes changes, each change is tested on the same task, and only a change that scores better — without breaking the anchor tasks — is kept. By default nothing is applied until you approve it. The model never changes; the prompts, skills and rules around it do.</p>
    <div class="evo41-ver"><b>Harness ${esc(ver.id||'')}</b> <span class="help">${esc(ver.note||'')} · ${harnessSize41(h).toLocaleString()} characters · ${(h.skills||[]).length} skill(s) · ${(h.rules||[]).length} rule(s) · ${LIB41.length} lesson(s)</span></div>
    <div class="evo41-tasks">${T.map(t=>{const s=EVO41.scores[t.id];return `<label class="evo41-t"><input type="checkbox" data-evo41t="${esc(t.id)}"${sel.has(t.id)?' checked':''}>
      <span><b>${esc(t.title)}</b><small>${esc(t.domain)}${(t.tags||[]).length?' · '+esc(t.tags.join(', ')):''}${t.verify?' · verified':' · judged'}</small></span>
      <span class="evo41-s ${s?(s.score>=1?'ok':s.score>0?'mid':'bad'):''}">${s?Math.round(s.score*100)+'%':'—'}</span></label>`;}).join('')}</div>
    <div class="row" style="gap:8px;margin-top:10px">
      <button class="btn" data-evo41="evolve"${EVO41_BUSY?' disabled':''}>Improve on selected</button>
      <button class="btn ghost small" data-evo41="eval"${EVO41_BUSY?' disabled':''}>Score selected</button>
      ${EVO41_BUSY?'<button class="btn ghost small" data-evo41="stop">Stop</button>':''}
      <button class="btn ghost small" data-evo41="addtask">Add a task</button>
      <button class="btn ghost small" data-evo41="settings">Settings</button>
      <button class="btn ghost small" data-evo41="export">Export harness</button></div>
    ${EVO41.queue.length?`<h3>Waiting for you (${EVO41.queue.length})</h3>${EVO41.queue.map(q=>`<div class="evo41-q"><div><b>${esc(q.title)}</b> · +${(q.delta*100).toFixed(0)} points · ${esc(q.applied.join(', '))}<div class="help">${esc(q.rationale||'')}${q.why?' — '+esc(q.why):''}</div></div>
      <div class="row" style="gap:6px"><button class="btn small good" data-evo41ok="${q.id}">Apply</button><button class="btn small ghost" data-evo41no="${q.id}">Reject</button><button class="btn small ghost" data-evo41see="${q.id}">See changes</button></div></div>`).join('')}`:''}
    <details class="dd"><summary>Versions (${H41.versions.length})</summary><div class="ddb">${H41.versions.slice().reverse().map(v=>`<div class="evo41-vr"><span><b>${esc(v.id)}</b>${v.id===H41.active?' · in use':''} <span class="help">${esc(v.note||'')}</span></span>${v.id!==H41.active?`<button class="btn small ghost" data-evo41use="${v.id}">Use this</button>`:''}</div>`).join('')}</div></details>
    <details class="dd"><summary>Lessons (${LIB41.length})</summary><div class="ddb">${LIB41.slice(0,40).map(l=>`<div class="evo41-vr"><span>${l.situation?'<b>'+esc(l.situation)+'</b> — ':''}${esc(l.lesson)} <span class="help">${esc(l.domain||'')} · Δ ${(+l.delta||0).toFixed(2)}</span></span><button class="btn small ghost" data-evo41forget="${l.id}" aria-label="Forget this lesson">Forget</button></div>`).join('')||'<p class="help">None yet — lessons appear after improvement runs.</p>'}</div></details>
    <details class="dd"${EVO41_BUSY?' open':''}><summary>Log</summary><div class="ddb evo41-log">${EVO41.log.slice(0,60).map(x=>`<div class="${esc(x.kind)}">${esc(new Date(x.ts).toLocaleTimeString())} ${esc(x.msg)}</div>`).join('')||'<p class="help">Nothing run yet.</p>'}</div></details></div>`;
  host.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
    const ids=$$('[data-evo41t]').filter(x=>x.checked).map(x=>x.dataset.evo41t);
    const k=b.dataset.evo41;
    if(k==='evolve'||k==='eval'){if(!ids.length)return toast('Pick at least one task',2000);EVO41.sel=ids;saveEvo41();evo41RunMany(ids,k);setTimeout(evo41Render,50);return;}
    if(k==='stop'){if(EVO41_BUSY)EVO41_BUSY.abort();return;}
    if(k==='export')return downloadJSON('agent-harness-'+H41.active+'.json',{harness:h41(),lessons:LIB41,version:H41.active});
    if(k==='addtask'){openModal(`<h3 style="margin-top:0">Add a task</h3><label class="field">Title<input id="e41-title"></label><label class="field">Task (what the agent is asked)<textarea id="e41-prompt" rows="4"></textarea></label>
      <label class="field">Domain<input id="e41-domain" placeholder="code, data, writing…"></label>
      <label class="field">Verifier (optional JavaScript: (answer, files, input) => ({score:0..1, detail})) — without one a judge scores it<textarea id="e41-verify" rows="3" placeholder='(a)=>({score:a===42?1:0,detail:"expected 42"})'></textarea></label>
      <label class="field">Rubric for the judge (optional)<input id="e41-rubric"></label><button class="btn good" id="e41-save">Add</button>`);
      $('#e41-save').onclick=()=>{const p=$('#e41-prompt').value.trim();if(!p)return;EVO41.tasks.push({id:'u'+Date.now().toString(36),title:$('#e41-title').value.trim()||p.slice(0,30),prompt:p,domain:$('#e41-domain').value.trim()||'general',
        verify:$('#e41-verify').value.trim()||undefined,rubric:$('#e41-rubric').value.trim()||undefined,tags:[]});saveEvo41();closeModal();evo41Render();};return;}
    if(k==='settings'){openModal(`<h3 style="margin-top:0">Self-improvement settings</h3>
      <label class="field">Agent model (blank = the Assistant's)<input id="e41-ex" value="${esc(EVO41.executor||'')}"></label>
      <label class="field">Editor model — use a strong one<input id="e41-ed" value="${esc(EVO41.editor||'')}" placeholder="${esc(settings.archModel)}"></label>
      <label class="field">Judge model (for tasks with no verifier) — ideally another family<input id="e41-ju" value="${esc(EVO41.judge||'')}"></label>
      <div class="row" style="gap:8px"><label class="field" style="flex:1">Runs per reference<input id="e41-k" type="number" min="1" max="3" value="${EVO41.k}"></label>
      <label class="field" style="flex:1">Max model calls<input id="e41-mc" type="number" min="5" max="400" value="${EVO41.maxCalls}"></label>
      <label class="field" style="flex:1">Max $<input id="e41-mu" type="number" min="0" step="0.05" value="${EVO41.maxUSD}"></label></div>
      <label class="chk"><input type="checkbox" id="e41-ap"${EVO41.requireApproval?' checked':''}> wait for my approval before applying a change</label>
      <button class="btn good" id="e41-ok">Save</button>`);
      $('#e41-ok').onclick=()=>{Object.assign(EVO41,{executor:$('#e41-ex').value.trim(),editor:$('#e41-ed').value.trim(),judge:$('#e41-ju').value.trim(),k:+$('#e41-k').value||1,
        maxCalls:+$('#e41-mc').value||60,maxUSD:+$('#e41-mu').value||0.5,requireApproval:$('#e41-ap').checked});saveEvo41();closeModal();evo41Render();};return;}
    if(b.dataset.evo41ok){const q=EVO41.queue.find(x=>x.id===b.dataset.evo41ok);if(!q)return;h41Commit(q.h,'approved: '+q.title+' (+'+q.delta.toFixed(2)+'): '+q.applied.join(', '),q.baseId);EVO41.queue=EVO41.queue.filter(x=>x!==q);saveEvo41();toast('Applied — the Agent uses it from the next run',2600);return evo41Render();}
    if(b.dataset.evo41no){EVO41.queue=EVO41.queue.filter(x=>x.id!==b.dataset.evo41no);saveEvo41();return evo41Render();}
    if(b.dataset.evo41see){const q=EVO41.queue.find(x=>x.id===b.dataset.evo41see);const base=(H41.versions.find(v=>v.id===q.baseId)||{}).h||{};
      const rows=['system','guardrails','memory','toolGuidance'].filter(c=>base[c]!==q.h[c]).map(c=>`<h4>${c}</h4><pre class="patchbox">${esc(q.h[c]||'')}</pre>`).join('')+
        ((q.h.skills||[]).length!==(base.skills||[]).length||JSON.stringify(q.h.skills)!==JSON.stringify(base.skills)?'<h4>skills</h4><pre class="patchbox">'+esc(JSON.stringify(q.h.skills,null,1))+'</pre>':'')+
        (JSON.stringify(q.h.rules)!==JSON.stringify(base.rules)?'<h4>rules</h4><pre class="patchbox">'+esc(JSON.stringify(q.h.rules,null,1))+'</pre>':'');
      return openModal('<h3 style="margin-top:0">Proposed harness</h3>'+(rows||'<p class="help">No visible difference.</p>'));}
    if(b.dataset.evo41use){H41.active=b.dataset.evo41use;saveH41();toast('Using '+H41.active,1800);return evo41Render();}
    if(b.dataset.evo41forget){LIB41=LIB41.filter(l=>l.id!==b.dataset.evo41forget);saveLib41();return evo41Render();}
  };
  host.onchange=e=>{const c=e.target.closest('[data-evo41t]');if(!c)return;EVO41.sel=$$('[data-evo41t]').filter(x=>x.checked).map(x=>x.dataset.evo41t);saveEvo41();};
}
