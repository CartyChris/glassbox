/* ═══════════════════ PASS 38 — TUTOR (learn hard things) ═══════════════════
   This app's own MIT implementation of the learning loop popularised by LearnHarness (amosblomqvist/learnharness, AGPL —
   ideas only, no code): MEASURE where your understanding ends → PLAN a prerequisite map to the goal → TEACH one reasoning
   step at a time (you predict first, then the explanation, an interactive illustration drawn in generative UI, and a check;
   a wrong answer gets a repair before anything builds on it) → PRACTISE with varied problems that need what you learned
   without naming it. What you learn is stored as PROPOSITIONS with the PREMISES that lead to them — ideas and their
   connections, never ratings of you — and every later lesson reads that graph. Stored in IndexedDB; works with any model. */
const TUTOR38_DEF={subjects:[],cur:null};
let TUTOR38=JSON.parse(JSON.stringify(TUTOR38_DEF)),TUTOR38_LOADED=false,TUTOR38_STEP=null;
async function tutorLoad38(){if(TUTOR38_LOADED)return;
  try{const v=await IDB.getStrict('tutor38');if(v&&typeof v==='object')TUTOR38=Object.assign(JSON.parse(JSON.stringify(TUTOR38_DEF)),v);}
  catch(e){toast('Tutor could not read its notebook: '+(e&&e.message||e),5000);}
  TUTOR38_LOADED=true;}
async function tutorSave38(){try{await IDB.set('tutor38',TUTOR38);}catch(e){toast('Tutor could not save: '+(e&&e.message||e),5000);}}
const tutorCur38=()=>TUTOR38.subjects.find(s=>s.id===TUTOR38.cur)||null;
/* PURE. The first JSON object or array in a model reply (fences and prose tolerated). */
function tutorJson38(t){
  const s=String(t||'').replace(/```(?:json)?/gi,'');
  for(const [o,c] of [['{','}'],['[',']']]){const i=s.indexOf(o),j=s.lastIndexOf(c);if(i>=0&&j>i){try{return JSON.parse(s.slice(i,j+1));}catch(_){}}}
  return null;
}
/* PURE. Normalise a plan: unique ids, deps that exist, no self-deps, status in the known set. */
function tutorPlan38(raw){
  const nodes=(raw&&Array.isArray(raw.nodes)?raw.nodes:[]).filter(n=>n&&n.title).slice(0,24);
  const ids=new Set();const out=nodes.map((n,i)=>{let id=String(n.id||('n'+(i+1))).replace(/[^\w-]/g,'').slice(0,24)||('n'+(i+1));while(ids.has(id))id+='x';ids.add(id);
    return{id,title:String(n.title).slice(0,120),why:String(n.why||'').slice(0,240),deps:[],status:['known','shaky','unknown'].includes(n.status)?n.status:'unknown',_deps:n.deps||[]};});
  out.forEach(n=>{n.deps=(Array.isArray(n._deps)?n._deps:[]).map(String).filter(d=>ids.has(d)&&d!==n.id);delete n._deps;});
  return{nodes:out,probes:(raw&&Array.isArray(raw.probes)?raw.probes:[]).filter(p=>p&&p.question&&ids.has(String(p.node))).slice(0,8).map(p=>({node:String(p.node),question:String(p.question).slice(0,300)}))};
}
/* PURE. What to teach next: the first node not yet known whose prerequisites are all known. Cycles never deadlock —
   if nothing is ready but something is unknown, the least-blocked node is taught (and the plan says why). */
function tutorNext38(plan){
  const N=(plan&&plan.nodes)||[],st=Object.fromEntries(N.map(n=>[n.id,n.status]));
  const open=N.filter(n=>st[n.id]!=='known');if(!open.length)return null;
  const ready=open.filter(n=>n.deps.every(d=>st[d]==='known'));
  if(ready.length)return ready.sort((a,b)=>(a.status==='shaky'?0:1)-(b.status==='shaky'?0:1))[0];
  return open.slice().sort((a,b)=>a.deps.filter(d=>st[d]!=='known').length-b.deps.filter(d=>st[d]!=='known').length)[0];
}
const TUTOR38_SYS='You are a patient expert tutor. You teach ONE reasoning step at a time, check understanding before building on it, '+
  'repair misconceptions immediately, and never pad. Use what the learner already knows (the GRAPH) and their own words.';
async function tutorAsk38(user,maxT,label){
  const acc=await streamComplete({model:primaryModel(),temperature:0.4,maxTokens:maxT||2500,messages:[{role:'system',content:TUTOR38_SYS},{role:'user',content:user}]},null,null,label||'tutor');
  return String(acc.content||'');
}
const tutorGraphText38=s=>(s.props||[]).slice(-40).map(p=>'- '+p.text+(p.premises&&p.premises.length?' (because: '+p.premises.join('; ')+')':'')).join('\n')||'(empty)';
async function tutorMakePlan38(goal,start){
  const t=await tutorAsk38(`GOAL: ${goal}\nWHERE I AM STARTING FROM (my words): ${start||'(not said)'}\n\n`+
    'Build the prerequisite map from where I start to the goal: 4–12 nodes, each one idea, with deps (ids of nodes it needs). Mark nodes I clearly already know as "known". '+
    'Also write up to 5 diagnostic probes — short questions whose answers show where my understanding ends (never yes/no). '+
    'Reply with JSON only: {"nodes":[{"id":"n1","title":"…","why":"…","deps":[],"status":"unknown"}],"probes":[{"node":"n1","question":"…"}]}',3000,'tutor plan');
  return tutorPlan38(tutorJson38(t)||{});
}
async function tutorEstimate38(s,answers){
  const t=await tutorAsk38(`PLAN:\n${s.plan.nodes.map(n=>n.id+': '+n.title).join('\n')}\n\nMY ANSWERS TO THE PROBES (answer, confidence 1-5, reasoning):\n`+
    answers.map(a=>`- [${a.node}] Q: ${a.question}\n  A: ${a.answer}\n  confidence ${a.conf}; reasoning: ${a.reason||'—'}`).join('\n')+
    '\n\nJudge each probed node: known / shaky / unknown, from the reasoning more than the answer. JSON only: {"status":{"n1":"known"},"notes":"one sentence"}',1200,'tutor measure');
  const j=tutorJson38(t)||{};const m=j.status||{};
  s.plan.nodes.forEach(n=>{if(['known','shaky','unknown'].includes(m[n.id]))n.status=m[n.id];});
  return j.notes||'';
}
async function tutorTeach38(s,node,illustrate){
  const ui='';
  const t=await tutorAsk38(`GOAL: ${s.goal}\nTEACH THIS NODE NOW: ${node.title} (${node.why})\nWHAT I ALREADY UNDERSTAND (graph):\n${tutorGraphText38(s)}\n`+
    (s.lastRepair?'LAST TIME I GOT THIS WRONG: '+s.lastRepair+'\n':'')+
    '\nGive the NEXT single reasoning step only. First a line "PREDICT: <a question asking me to predict an outcome before you explain>". '+
    'Then "EXPLAIN:" with the step (short, concrete, one idea). Then "CHECK: <one question that tests the step without repeating its wording>" and "ANSWER: <the expected answer>". '+
    'Then "PROPOSITION: <the one claim I will have learned>" and "PREMISES: <the earlier claims it rests on, separated by ;>".'+ui,2500,'tutor teach');
  const f=k=>{const m=t.match(new RegExp('^\\s*'+k+':\\s*([\\s\\S]*?)(?=^\\s*(?:PREDICT|EXPLAIN|CHECK|ANSWER|PROPOSITION|PREMISES):|```openui|$(?![\\s\\S]))','im'));return m?m[1].trim():'';};
  const ou=(t.match(/```openui\s*([\s\S]*?)```/i)||[])[1]||'';
  return{predict:f('PREDICT'),explain:f('EXPLAIN'),check:f('CHECK'),answer:f('ANSWER'),prop:f('PROPOSITION'),premises:f('PREMISES').split(';').map(x=>x.trim()).filter(Boolean),ui:ou.trim()};
}
/* A separate call for the picture: a weak model asked for "an optional illustration" at the end of a lesson skips it, so the
   illustration is its own request, drawn while the learner reads, in the app's generative-UI language. */
async function tutorIllustrate38(s,node,step){
  const acc=await streamComplete({model:primaryModel(),temperature:0.3,maxTokens:5000,messages:[
    {role:'system',content:ouiSystemPrompt(ouiLib(),{})},
    {role:'user',content:'Draw ONE small interactive teaching illustration for this lesson step — something the learner can play with (a slider that '+
      'changes a value and shows the effect, a chart, a step-by-step diagram). Concrete numbers, short labels, no prose paragraphs.\n'+
      'SUBJECT: '+s.goal+'\nIDEA: '+(node?node.title:'practice')+'\nSTEP: '+String(step.explain||step.check).slice(0,1200)}]},null,null,'tutor illustration');
  return String(acc.content||'').replace(/^```(?:openui)?\s*/i,'').replace(/```\s*$/,'').trim();
}
async function tutorGrade38(step,reply,reason){
  const t=await tutorAsk38(`CHECK QUESTION: ${step.check}\nEXPECTED: ${step.answer}\nMY ANSWER: ${reply}\nMY REASONING: ${reason||'—'}\n`+
    'Is my understanding right? Judge the reasoning, not wording. JSON only: {"correct":true|false,"misconception":"…if wrong","repair":"2-4 sentences that fix it, if wrong"}',800,'tutor check');
  const j=tutorJson38(t)||{};return{correct:!!j.correct,misconception:String(j.misconception||''),repair:String(j.repair||'')};
}
async function tutorPractice38(s){
  const pool=(s.props||[]).slice(-30);if(pool.length<2)return null;
  const t=await tutorAsk38(`THINGS I HAVE LEARNED:\n${pool.map(p=>'- '+p.text).join('\n')}\n\nWrite ONE practice problem that needs at least two of these WITHOUT naming them or saying which. `+
    'Vary the surface from how they were taught. JSON only: {"problem":"…","answer":"…","uses":["…"]}',1000,'tutor practice');
  const j=tutorJson38(t);return j&&j.problem?{check:String(j.problem),answer:String(j.answer||''),practice:true}:null;
}
function tutorRender38(){
  const host=$('#tutor-panel');if(!host)return;
  if(!TUTOR38_LOADED){tutorLoad38().then(tutorRender38);host.innerHTML='<p class="help">Opening your notebook…</p>';return;}
  const s=tutorCur38();
  const subj=TUTOR38.subjects.map(x=>`<option value="${esc(x.id)}"${x.id===TUTOR38.cur?' selected':''}>${esc(x.goal.slice(0,60))}</option>`).join('');
  const nodeChip=n=>`<span class="chip${n.status==='known'?' on':''}" title="${esc(n.why)}">${n.status==='known'?'✓ ':n.status==='shaky'?'~ ':''}${esc(n.title)}</span>`;
  host.innerHTML=`<div class="card"><h2 style="margin-top:0">Tutor</h2>
    <p class="help">Learn something difficult, properly. It finds where your understanding ends, maps the prerequisites to your goal, then
      teaches one step at a time: you predict first, see the explanation and an interactive illustration, and answer a check — a wrong
      answer is repaired before anything builds on it. What you learn is kept as ideas and the reasons behind them, and every later
      lesson uses it. Works with any model, including the free ones.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">
      ${subj?`<select id="tu-pick" aria-label="Subject" style="flex:1 1 220px">${subj}</select>`:''}
      <button class="btn small ghost" id="tu-new">New subject</button></div></div>
    <div class="card" id="tu-newbox" style="display:${s?'none':'block'}">
      <label class="field">What do you want to understand?<input id="tu-goal" placeholder="e.g. why attention in transformers scales quadratically, and how FlashAttention avoids it"></label>
      <label class="field">Where are you starting from? (your own words)<textarea id="tu-start" rows="3" placeholder="what you already know, what confuses you"></textarea></label>
      <button class="btn" id="tu-plan">Map it</button></div>
    ${s?`<div class="card"><h3 style="margin-top:0">${esc(s.goal)}</h3>
      <div class="row" style="gap:6px;flex-wrap:wrap">${s.plan.nodes.map(nodeChip).join('')}</div>
      <p class="help" style="margin-top:6px">${s.plan.nodes.filter(n=>n.status==='known').length} of ${s.plan.nodes.length} understood · ${(s.props||[]).length} idea(s) in your graph</p>
      ${s.plan.probes&&s.plan.probes.length&&!s.measured?`<h4>First, where does your understanding end?</h4>${s.plan.probes.map((p,i)=>`<div class="diagbox" style="margin-top:8px"><b>${esc(p.question)}</b>
        <textarea data-tup="${i}" rows="2" placeholder="your answer" style="width:100%;margin-top:6px"></textarea>
        <textarea data-tur="${i}" rows="2" placeholder="think out loud — why you think so, what you are unsure about" style="width:100%;margin-top:4px"></textarea>
        <label class="help">confidence <input type="range" min="1" max="5" value="3" data-tuc="${i}" aria-label="confidence"></label></div>`).join('')}
        <div class="row" style="gap:8px;margin-top:8px"><button class="btn" id="tu-measure">Check my starting point</button><button class="btn small ghost" id="tu-skip">Skip</button></div>`:
      `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn" id="tu-teach">${tutorNext38(s.plan)?'Teach me the next step':'Everything is mapped as understood'}</button>
        <button class="btn small" id="tu-practice"${(s.props||[]).length<2?' disabled':''}>Practice</button>
        <label class="chip"><input type="checkbox" id="tu-ill"${s.illustrate!==false?' checked':''} style="margin:0"> interactive illustrations</label>
        <button class="btn small ghost" id="tu-export">Export graph (Markdown)</button></div>`}
      <div id="tu-step" style="margin-top:12px"></div></div>
    <details class="card dd"><summary>Your graph — ideas and their reasons (${(s.props||[]).length})</summary><div class="ddb">
      ${(s.props||[]).slice().reverse().map(p=>`<div style="margin:6px 0"><b>${esc(p.text)}</b>${p.premises&&p.premises.length?`<div class="help">because ${esc(p.premises.join(' · '))}</div>`:''}</div>`).join('')||'<p class="help">Nothing yet.</p>'}
      <label class="field" style="margin-top:8px">Add your own notes (one idea per line)<textarea id="tu-notes" rows="3"></textarea></label><button class="btn small" id="tu-addnotes">Add to graph</button></div></details>`:''}`;
  const busy=(b,l)=>{if(b){b.disabled=true;b.dataset.l=b.textContent;b.textContent=l;}};
  const done=b=>{if(b){b.disabled=false;b.textContent=b.dataset.l||b.textContent;}};
  if($('#tu-pick'))$('#tu-pick').onchange=e=>{TUTOR38.cur=e.target.value;tutorSave38();tutorRender38();};
  $('#tu-new').onclick=()=>{$('#tu-newbox').style.display='block';$('#tu-goal').focus();};
  $('#tu-plan').onclick=async()=>{const g=$('#tu-goal').value.trim();if(!g)return toast('Say what you want to understand',2500);
    const b=$('#tu-plan');busy(b,'Mapping…');
    try{const plan=await tutorMakePlan38(g,$('#tu-start').value.trim());if(!plan.nodes.length)throw new Error('the model did not return a map — try again or pick another model');
      const sj={id:uid(),goal:g,start:$('#tu-start').value.trim(),plan,props:[],sessions:[],illustrate:true,measured:!plan.probes.length,at:nowISO()};
      TUTOR38.subjects.unshift(sj);TUTOR38.subjects=TUTOR38.subjects.slice(0,30);TUTOR38.cur=sj.id;await tutorSave38();tutorRender38();}
    catch(e){toast('Tutor: '+(e.message||e),5000);done(b);}};
  if(!s)return;
  if($('#tu-skip'))$('#tu-skip').onclick=async()=>{s.measured=true;await tutorSave38();tutorRender38();};
  if($('#tu-measure'))$('#tu-measure').onclick=async()=>{const b=$('#tu-measure');busy(b,'Reading your reasoning…');
    const ans=s.plan.probes.map((p,i)=>({node:p.node,question:p.question,answer:(host.querySelector(`[data-tup="${i}"]`)||{}).value||'',
      reason:(host.querySelector(`[data-tur="${i}"]`)||{}).value||'',conf:+(host.querySelector(`[data-tuc="${i}"]`)||{}).value||3}));
    try{const note=await tutorEstimate38(s,ans);s.measured=true;await tutorSave38();tutorRender38();if(note)toast(note,5000);}catch(e){toast('Tutor: '+(e.message||e),5000);done(b);}};
  if($('#tu-ill'))$('#tu-ill').onchange=e=>{s.illustrate=e.target.checked;tutorSave38();};
  if($('#tu-export'))$('#tu-export').onclick=()=>downloadText('tutor-'+s.goal.slice(0,30).replace(/\W+/g,'-')+'.md','# '+s.goal+'\n\n## Map\n'+
    s.plan.nodes.map(n=>'- ['+(n.status==='known'?'x':' ')+'] '+n.title+(n.deps.length?' (needs '+n.deps.join(', ')+')':'')).join('\n')+'\n\n## What I learned\n'+
    (s.props||[]).map(p=>'- '+p.text+(p.premises&&p.premises.length?'\n  - because: '+p.premises.join('; '):'')).join('\n')+'\n');
  if($('#tu-addnotes'))$('#tu-addnotes').onclick=async()=>{const lines=$('#tu-notes').value.split('\n').map(x=>x.trim()).filter(Boolean);
    lines.forEach(l=>s.props.push({id:uid(),text:l.slice(0,300),premises:[],node:null,from:'notes',at:nowISO()}));await tutorSave38();tutorRender38();};
  const stepBox=$('#tu-step');
  const showStep=(step,node)=>{
    TUTOR38_STEP={step,node};
    stepBox.innerHTML=`${step.practice?'<h4>Practice</h4>':`<h4>${esc(node.title)}</h4>`}
      ${step.predict?`<div class="diagbox"><b>Predict first:</b> ${esc(step.predict)}<textarea id="tu-pred" rows="2" style="width:100%;margin-top:6px" placeholder="your prediction"></textarea>
        <button class="btn small" id="tu-reveal" style="margin-top:6px">Show me</button></div>`:''}
      <div id="tu-body" style="display:${step.predict?'none':'block'}">
        ${step.explain?`<div class="md" style="margin-top:10px">${ouiMd(step.explain)}</div>`:''}
        <div id="tu-ui" style="margin-top:10px"></div>
        <div class="diagbox" style="margin-top:10px"><b>Check:</b> ${esc(step.check)}
          <textarea id="tu-ans" rows="2" style="width:100%;margin-top:6px" placeholder="your answer"></textarea>
          <textarea id="tu-why" rows="2" style="width:100%;margin-top:4px" placeholder="think out loud (optional)"></textarea>
          <button class="btn" id="tu-grade" style="margin-top:6px">Check my answer</button></div>
        <div id="tu-verdict" style="margin-top:8px"></div></div>`;
    const reveal=()=>{$('#tu-body').style.display='block';const r=$('#tu-reveal');if(r)r.disabled=true;
      const box=$('#tu-ui');
      const draw=t=>{try{ouiMount(box,{}).set(t,true);}catch(e){box.innerHTML='<p class="help">The illustration could not be drawn.</p>';}};
      if(step.ui)draw(step.ui);
      else if(s.illustrate!==false&&!step.practice){box.innerHTML='<p class="help">Drawing an illustration…</p>';
        tutorIllustrate38(s,node,step).then(t=>{step.ui=t;if(t&&document.body.contains(box))draw(t);else if(document.body.contains(box))box.innerHTML='';})
          .catch(()=>{if(document.body.contains(box))box.innerHTML='';});}};
    if($('#tu-reveal'))$('#tu-reveal').onclick=reveal;else reveal();
    $('#tu-grade').onclick=async()=>{const b=$('#tu-grade');busy(b,'Checking…');
      try{const v=await tutorGrade38(step,$('#tu-ans').value,$('#tu-why').value);
        if(v.correct){
          if(!step.practice&&step.prop){s.props.push({id:uid(),text:step.prop.slice(0,300),premises:step.premises.slice(0,6),node:node&&node.id,from:'lesson',at:nowISO()});
            node.done=(node.done||0)+1;if(node.done>=2||node.status==='shaky')node.status='known';else node.status='shaky';}
          s.lastRepair='';await tutorSave38();
          $('#tu-verdict').innerHTML=`<div class="diagbox"><b>Right.</b> ${step.practice?'':`Added to your graph: “${esc(step.prop)}”.`}</div><button class="btn small" data-tuagain="1" style="margin-top:6px">${step.practice?'Another problem':'Next step'}</button>`;
        }else{s.lastRepair=v.misconception;await tutorSave38();
          $('#tu-verdict').innerHTML=`<div class="diagbox bad"><b>Not yet.</b> ${esc(v.misconception)}<p style="margin:6px 0 0">${esc(v.repair)}</p></div><button class="btn small" data-tuagain="1" style="margin-top:6px">Try the step again</button>`;}
        $('[data-tuagain]').onclick=()=>step.practice?$('#tu-practice').click():$('#tu-teach').click();
      }catch(e){toast('Tutor: '+(e.message||e),5000);}done(b);};
  };
  if($('#tu-teach'))$('#tu-teach').onclick=async()=>{const node=tutorNext38(s.plan);if(!node)return toast('All mapped ideas are understood — practise, or start a new subject',3500);
    const b=$('#tu-teach');busy(b,'Preparing the step…');
    try{const st=await tutorTeach38(s,node,s.illustrate!==false);if(!st.check)throw new Error('the model did not return a step — try again');showStep(st,node);}catch(e){toast('Tutor: '+(e.message||e),5000);}
    done(b);};
  if($('#tu-practice'))$('#tu-practice').onclick=async()=>{const b=$('#tu-practice');busy(b,'Writing a problem…');
    try{const st=await tutorPractice38(s);if(!st)throw new Error('learn at least two ideas first');showStep(st,null);}catch(e){toast('Tutor: '+(e.message||e),5000);}done(b);};
}
