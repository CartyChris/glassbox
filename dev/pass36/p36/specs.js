/* ═══════════════════ PASS 36 — SPECS (spec-driven development) ═══════════════════
   The workflow GitHub's Spec Kit (MIT) made standard for coding agents: write down the project's
   principles once (the constitution), then for each feature a SPEC (what and why, no tech), a PLAN
   (how), and TASKS small enough for one agent round each. Tasks carry dependencies the way Beads
   (steveyegge/beads, MIT) tracks them, so "what can be worked on now" is computed, not guessed:
   a task is READY when it is open and every task it depends on is done.
   Everything is local (IndexedDB). Model calls go through streamComplete, so the free route works. */
const SPECS36_DEF={constitution:'',items:[],cur:''};
let SPECS36=JSON.parse(JSON.stringify(SPECS36_DEF)),SPECS36_LOADED=false,SPECS36_BUSY='';
const SPECS36_CAP=40000;                       // per field — keeps one project well under storage limits

/* PURE. Normalise a model's task list: ids unique and slug-safe, dependencies only on tasks that exist
   (never on themselves), status open|done. Accepts an array or text containing one. */
function specParseTasks(input){
  let arr=input;
  if(typeof arr==='string'){
    const m=arr.match(/\[[\s\S]*\]/);if(!m)return[];
    try{arr=JSON.parse(m[0]);}catch(_){return[];}
  }
  if(!Array.isArray(arr))return[];
  const seen=new Set(),out=[];
  arr.forEach((t,i)=>{
    if(!t||typeof t!=='object')return;
    let id=String(t.id||('T'+(i+1))).replace(/[^A-Za-z0-9_.-]/g,'').slice(0,24)||('T'+(i+1));
    while(seen.has(id))id+='b';
    seen.add(id);
    out.push({id,title:String(t.title||t.name||'Untitled task').slice(0,160),detail:String(t.detail||t.description||'').slice(0,1200),
      deps:Array.isArray(t.deps||t.dependencies)?(t.deps||t.dependencies).map(String):[],status:t.status==='done'?'done':'open'});
  });
  const ids=new Set(out.map(t=>t.id));
  out.forEach(t=>{t.deps=[...new Set(t.deps.map(d=>d.replace(/[^A-Za-z0-9_.-]/g,'')))].filter(d=>ids.has(d)&&d!==t.id);});
  return out;
}
/* PURE. Tasks caught in a dependency cycle (they can never become ready). */
function specCycles(tasks){
  const by=new Map((tasks||[]).map(t=>[t.id,t])),state={},bad=new Set();
  const visit=(id,stack)=>{
    if(state[id]===2)return;if(state[id]===1){stack.slice(stack.indexOf(id)).forEach(x=>bad.add(x));return;}
    state[id]=1;stack.push(id);(by.get(id)||{deps:[]}).deps.forEach(d=>visit(d,stack));stack.pop();state[id]=2;};
  (tasks||[]).forEach(t=>visit(t.id,[]));
  return[...bad];
}
/* PURE. Beads' "ready" queue: open tasks whose dependencies are all done, in list order, cycles excluded. */
function specReady(tasks){
  const done=new Set((tasks||[]).filter(t=>t.status==='done').map(t=>t.id)),cyc=new Set(specCycles(tasks));
  return(tasks||[]).filter(t=>t.status!=='done'&&!cyc.has(t.id)&&t.deps.every(d=>done.has(d)));
}
/* PURE. Beads-compatible JSONL (one issue per line) so an agent repo can import it. */
function specJsonl(item){
  return(item.tasks||[]).map(t=>JSON.stringify({id:(item.slug||'spec')+'-'+t.id,title:t.title,description:t.detail,
    status:t.status==='done'?'closed':'open',issue_type:'task',
    dependencies:t.deps.map(d=>({depends_on_id:(item.slug||'spec')+'-'+d,type:'blocks'}))})).join('\n');
}
/* PURE. The prompt a coding agent gets for ONE task — one feature per round, criteria in, nothing else. */
function specHandoff(constitution,item,task){
  const done=(item.tasks||[]).filter(t=>t.status==='done').map(t=>'- '+t.id+' '+t.title).join('\n')||'- (none yet)';
  return['# Task '+task.id+': '+task.title,'',task.detail||'','',
    '## Do this one task and nothing else','Attempting several at once is how these runs fail: context runs out mid-way and everything is left half-built.','',
    '## Already done — do not redo or break',done,'',
    '## Constitution (project rules)',(constitution||'(none)').slice(0,4000),'',
    '## Spec: '+item.title,(item.spec||'').slice(0,6000),'',
    '## Plan',(item.plan||'').slice(0,6000),'',
    '## When finished','Run the project\'s checks. Report what you changed and how you verified it. Do not mark anything done that you did not run.'].join('\n');
}
const specSlug=t=>String(t||'spec').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'spec';

/* ── storage ── */
async function specsLoad(){
  if(SPECS36_LOADED)return;
  try{const v=await IDB.getStrict('specs36');if(v&&typeof v==='object')SPECS36=Object.assign(JSON.parse(JSON.stringify(SPECS36_DEF)),v);}
  catch(e){toast('Specs could not be read from storage: '+(e&&e.message||e),5000);}
  SPECS36_LOADED=true;
}
async function specsSave(){
  SPECS36.items.forEach(it=>['spec','plan'].forEach(k=>{if((it[k]||'').length>SPECS36_CAP)it[k]=it[k].slice(0,SPECS36_CAP);}));
  const ok=await IDB.set('specs36',SPECS36);
  if(ok===false&&typeof persistFailBanner==='function')persistFailBanner('Could not save your specs — storage is unavailable.');
  return ok!==false;
}
const specCur=()=>SPECS36.items.find(x=>x.id===SPECS36.cur)||null;

/* ── model steps ── */
const SPEC_PROMPTS={
  spec:'Write a feature SPECIFICATION in Markdown for the request below. Describe WHAT and WHY only — no technology choices. Sections: Summary, User stories (with acceptance scenarios as Given/When/Then), Functional requirements (numbered FR-1…, each testable), Edge cases, Out of scope, Open questions (mark each [NEEDS CLARIFICATION]). Follow the constitution.',
  plan:'Write an implementation PLAN in Markdown for the spec below, following the constitution. Sections: Approach, Architecture and data model, Files to create or change, Verification (how each FR is proven — tests or checks that can fail), Risks. Prefer the simplest design that satisfies every requirement.',
  tasks:'Break the plan into TASKS small enough for one coding-agent round each (roughly 1–2 hours of work). Return ONLY a JSON array: [{"id":"T1","title":"…","detail":"what to do and how it is verified","deps":["T0"]}]. Order them so dependencies come first; tests come with or before the code they check. 5–20 tasks.'};
async function specStep(kind){
  const it=specCur();if(!it||SPECS36_BUSY)return;
  const model=primaryModel();if(!model)return toast('Pick a model first (the model pill at the top).',4000);
  const ctx=kind==='spec'?'REQUEST:\n'+it.request:kind==='plan'?'SPEC:\n'+it.spec:'SPEC:\n'+it.spec+'\n\nPLAN:\n'+it.plan;
  if(kind!=='spec'&&!(kind==='plan'?it.spec:it.plan))return toast(kind==='plan'?'Write the spec first.':'Write the plan first.',3500);
  SPECS36_BUSY=kind;specsRender();
  let txt='';
  try{
    const acc=await streamComplete({model,maxTokens:6000,messages:[
      {role:'system',content:'You are a careful staff engineer doing spec-driven development.\n\nCONSTITUTION:\n'+(SPECS36.constitution||'(none)')},
      {role:'user',content:SPEC_PROMPTS[kind]+'\n\n'+ctx}]},
      a=>{txt=(a&&a.content)||'';const o=$('#sp-live');if(o)o.textContent=txt.slice(-1600);},null,'specs:'+kind);
    txt=(acc&&acc.content)||txt;
    if(kind==='tasks'){const t=specParseTasks(txt);if(!t.length)throw new Error('the model did not return a task list — try again or another model');it.tasks=t;}
    else it[kind]=txt.trim();
    it.ts=nowISO();await specsSave();
    toast(kind==='tasks'?it.tasks.length+' tasks — '+specReady(it.tasks).length+' ready now':'Done — edit it freely before the next step',3500);
  }catch(e){toast('Could not '+kind+': '+(e&&e.message||e),6000);}
  finally{SPECS36_BUSY='';specsRender();}
}

/* ── panel ── */
async function specsRender(){
  const host=$('#specs-panel');if(!host)return;
  await specsLoad();
  const it=specCur(),ready=it?specReady(it.tasks||[]):[],cyc=it?specCycles(it.tasks||[]):[];
  const step=(k,label,have)=>`<button class="btn${have?' small':''}" data-sp-step="${k}" ${SPECS36_BUSY?'disabled':''}>${SPECS36_BUSY===k?'Writing…':label}</button>`;
  host.innerHTML=`
  <div class="card"><h2>Specs</h2>
    <p class="help">Spec-driven development, the way GitHub's Spec Kit does it: principles once, then for each feature a spec (what and why), a plan (how) and small tasks. Tasks carry dependencies like Beads, so the <b>ready</b> list is computed — hand coding agents one ready task at a time.</p>
    <details class="dd"${SPECS36.constitution?'':' open'}><summary>Constitution — the rules every spec, plan and task must follow</summary><div class="ddb">
      <textarea id="sp-const" aria-label="Constitution" rows="5" placeholder="e.g. Tests before code. No new dependencies without a reason. Accessible by keyboard. Simplest design that works.">${esc(SPECS36.constitution)}</textarea>
      <button class="btn small" id="sp-const-save" style="margin-top:8px">Save constitution</button></div></details>
    <div class="row" style="margin-top:12px;align-items:center">
      <select id="sp-pick" aria-label="Feature" style="flex:1;min-width:180px"><option value="">${SPECS36.items.length?'Choose a feature…':'No features yet'}</option>
        ${SPECS36.items.map(x=>`<option value="${esc(x.id)}"${x.id===SPECS36.cur?' selected':''}>${esc(x.title)}</option>`).join('')}</select>
      <button class="btn ghost small" id="sp-new">New feature</button>
      ${it?'<button class="btn ghost small" id="sp-del">Delete</button>':''}</div>
  </div>
  ${it?`<div class="card"><h3>${esc(it.title)}</h3>
    <label class="field">What should it do?<textarea id="sp-req" rows="3">${esc(it.request||'')}</textarea></label>
    <div class="row" style="margin-top:10px">${step('spec','1 · Write the spec',!!it.spec)}${step('plan','2 · Write the plan',!!it.plan)}${step('tasks','3 · Break into tasks',!!(it.tasks||[]).length)}</div>
    ${SPECS36_BUSY?'<pre class="mono help" id="sp-live" style="white-space:pre-wrap;max-height:220px;overflow:auto"></pre>':''}
    ${it.spec?`<details class="dd"><summary>Spec</summary><div class="ddb"><textarea id="sp-spec" aria-label="Spec" rows="14">${esc(it.spec)}</textarea></div></details>`:''}
    ${it.plan?`<details class="dd"><summary>Plan</summary><div class="ddb"><textarea id="sp-plan" aria-label="Plan" rows="14">${esc(it.plan)}</textarea></div></details>`:''}
    ${it.spec||it.plan?'<button class="btn ghost small" id="sp-save-docs" style="margin-top:8px">Save edits</button>':''}
  </div>`:''}
  ${it&&(it.tasks||[]).length?`<div class="card"><h3>Tasks <span class="muted">${it.tasks.filter(t=>t.status==='done').length}/${it.tasks.length} done · ${ready.length} ready</span></h3>
    ${cyc.length?`<div class="banner">These tasks depend on each other in a circle and can never start: ${esc(cyc.join(', '))}. Edit their dependencies.</div>`:''}
    <div class="sp-tasks">${it.tasks.map(t=>{const r=ready.some(x=>x.id===t.id);
      return `<label class="sp-task${t.status==='done'?' done':''}${r?' ready':''}"><input type="checkbox" data-sp-done="${esc(t.id)}"${t.status==='done'?' checked':''}>
        <span><b>${esc(t.id)} · ${esc(t.title)}</b>${r?' <span class="chip-sm ok">ready</span>':''}${t.deps.length?` <span class="muted mini">needs ${esc(t.deps.join(', '))}</span>`:''}
        ${t.detail?`<small class="help">${esc(t.detail)}</small>`:''}</span></label>`;}).join('')}</div>
    <div class="row" style="margin-top:12px">
      <button class="btn small" id="sp-next" ${ready.length?'':'disabled'}>Copy the next ready task for a coding agent</button>
      <button class="btn ghost small" id="sp-asst" ${ready.length?'':'disabled'}>Open it in the Assistant</button>
      <button class="btn ghost small" id="sp-export">Download spec, plan, tasks (.md + Beads .jsonl)</button></div>
  </div>`:''}`;
  const on=(sel,fn)=>{const el=host.querySelector(sel);if(el)el.onclick=fn;};
  on('#sp-const-save',async()=>{SPECS36.constitution=host.querySelector('#sp-const').value.slice(0,SPECS36_CAP);await specsSave();toast('Constitution saved',2000);});
  const pick=host.querySelector('#sp-pick');if(pick)pick.onchange=()=>{SPECS36.cur=pick.value;specsSave();specsRender();};
  on('#sp-new',async()=>{const title=(prompt('Feature name?')||'').trim();if(!title)return;
    const it2={id:uid(),title:title.slice(0,120),slug:specSlug(title),request:'',spec:'',plan:'',tasks:[],ts:nowISO()};
    SPECS36.items.unshift(it2);SPECS36.cur=it2.id;await specsSave();specsRender();});
  on('#sp-del',async()=>{if(!confirm('Delete “'+it.title+'” and its spec, plan and tasks?'))return;
    SPECS36.items=SPECS36.items.filter(x=>x.id!==it.id);SPECS36.cur=(SPECS36.items[0]||{}).id||'';await specsSave();specsRender();});
  const req=host.querySelector('#sp-req');if(req)req.onchange=()=>{it.request=req.value.slice(0,8000);specsSave();};
  host.querySelectorAll('[data-sp-step]').forEach(b=>b.onclick=()=>{if(req)it.request=req.value.slice(0,8000);specStep(b.dataset.spStep);});
  on('#sp-save-docs',async()=>{const s=host.querySelector('#sp-spec'),p=host.querySelector('#sp-plan');
    if(s)it.spec=s.value;if(p)it.plan=p.value;await specsSave();toast('Saved',1800);});
  host.querySelectorAll('[data-sp-done]').forEach(c=>c.onchange=async()=>{const t=it.tasks.find(x=>x.id===c.dataset.spDone);
    if(t)t.status=c.checked?'done':'open';await specsSave();specsRender();});
  const next=()=>ready[0]?specHandoff(SPECS36.constitution,it,ready[0]):'';
  on('#sp-next',async()=>{const t=next();try{await navigator.clipboard.writeText(t);toast('Copied task '+ready[0].id+' — paste it into Claude Code, Codex, OpenCode…',3500);}
    catch(_){downloadText(it.slug+'-'+ready[0].id+'.md',t);toast('Clipboard blocked — downloaded it instead',3500);}});
  on('#sp-asst',()=>{const t=next();if(!t)return;const c=achatNew('Task '+ready[0].id+': '+ready[0].title);go('assistant');
    setTimeout(()=>{const inp=$('#asst-input');if(inp){inp.value=t;inp.focus();}},120);void c;});
  on('#sp-export',()=>{downloadText(it.slug+'.md',['# '+it.title,'','## Constitution',SPECS36.constitution||'(none)','','## Spec',it.spec||'','','## Plan',it.plan||'','','## Tasks',
      ...(it.tasks||[]).map(t=>'- ['+(t.status==='done'?'x':' ')+'] **'+t.id+'** '+t.title+(t.deps.length?' (needs '+t.deps.join(', ')+')':'')+(t.detail?'\n  '+t.detail:''))].join('\n'));
    downloadText(it.slug+'.issues.jsonl',specJsonl(it));});
  if(SPECS36_BUSY){const live=host.querySelector('#sp-live');if(live)live.textContent='…';}
}
