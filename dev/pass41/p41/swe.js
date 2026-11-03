/* ═══════════════════ PASS 41 — AGENT MODE (mini-swe-agent principles) ═══════════════════
   The loop that holds up on hard tasks is the simple one (mini-swe-agent; Ouroboros builds on it): the model writes a
   short THOUGHT and exactly ONE action, the action runs, the output comes back, repeat — and the run ends only when the
   model calls submit(answer). No hidden state: the whole trajectory is the message list, so every step is inspectable.
     · action = one ```js block (runs in the opaque-origin sandbox, a fresh worker each step, files persist), one
       ```python block (Pyodide), or tool calls (MCP servers, APIs, web, Brain, delegate — through the tool gate)
     · a reply with no readable action gets a precise format correction, not silence
     · the harness (system, guardrails, tool guidance, memory, skills, rules, per-model notes) is DATA, versioned, and is
       what the self-improvement loop edits; the core protocol below is not editable by it
     · lessons the loop learned are retrieved into the prompt by relevance */
const SWE41_CORE='# How you work\nEach reply: a short THOUGHT, then exactly ONE action:\n'+
  '  · one ```js code block — it runs in a sandbox and its printed output comes back to you, or\n'+
  '  · one ```python code block (slower to start), or\n'+
  '  · one or more tool calls (===USE TOOL=== blocks).\n'+
  'When the task is done, call submit(answer) inside a code block (the answer is the final deliverable: a string, number, array or object). '+
  'If nothing needs computing or looking up, reply with FINAL: and the answer instead.';
const H41_DEFAULT={label:'v1 (stock)',
  system:'You are an autonomous agent. Solve the task by acting, observing and checking — never by guessing.',
  guardrails:'- Never state a result you did not compute, read or receive from a tool.\n- Before submit(), check the answer against every explicit requirement in the task and print the check.\n- If a step errors, read the error and change approach; never repeat the same failing action.',
  toolGuidance:'Sandbox (JavaScript; fresh each step, files persist): print(...), fs.read(p), fs.write(p,text), fs.ls(), fs.rm(p), fs.exists(p), input (task data), submit(answer). '+
    'Python: ```python blocks with the same files, input and submit(). The sandbox has no network — use tools for the web, APIs and MCP servers.',
  memory:'',skills:[],rules:[],overlays:{},maxSteps:12};
let H41=Object.assign({active:'h0',versions:[]},store.get('harness41',{}));
if(!H41.versions.length)H41.versions=[{id:'h0',parent:null,ts:nowISO(),h:JSON.parse(JSON.stringify(H41_DEFAULT)),note:'stock harness'}];
const saveH41=()=>{H41.versions=H41.versions.slice(-30);store.set('harness41',H41);};
const h41=()=>{const v=H41.versions.find(x=>x.id===H41.active)||H41.versions[H41.versions.length-1];return v.h;};
let LIB41=store.get('lib41',[]);
const saveLib41=()=>store.set('lib41',LIB41.slice(0,200));
/* PURE. The few lessons that fit this task, by word overlap (domain match counts double). */
function lib41Pick(lib,text,domain,n){
  const q=new Set(tc41Words(text));
  return (lib||[]).map(l=>({l,s:tc41Words(l.situation+' '+l.lesson+' '+(l.tags||[]).join(' ')).filter(w=>q.has(w)).length+(domain&&l.domain===domain?2:0)}))
    .filter(x=>x.s>0).sort((a,b)=>b.s-a.s||(b.l.delta||0)-(a.l.delta||0)).slice(0,n||4).map(x=>x.l);
}
/* PURE. The system prompt an agent run gets. */
function swe41System(h,model,catalog,task,lessons){
  const sk=(h.skills||[]).slice(0,12);let budget=3500;
  const skills=sk.map(s=>{const body=String(s.body||'');const take=body.length<=Math.max(0,budget)?body:'';budget-=take.length;
    return '## skill: '+s.name+'\n> '+s.description+(take?'\n'+take:'');}).join('\n\n');
  return [SWE41_CORE,'# System\n'+h.system,'# Guardrails\n'+h.guardrails,h.memory?'# Memory\n'+h.memory:'','# Tool guidance\n'+h.toolGuidance,
    skills?'# Skills\n'+skills:'',
    lessons&&lessons.length?'# Lessons learned on earlier tasks (apply when they fit)\n'+lessons.map(l=>'- '+(l.situation?'When '+l.situation+': ':'')+l.lesson).join('\n'):'',
    h.overlays&&h.overlays[model]?'# Notes for '+model+'\n'+h.overlays[model]:'',
    tc41Block(catalog,task)].filter(Boolean).join('\n\n');
}
/* PURE. The action in a reply: {kind:'js'|'python'|'tools'|'final'|'none'|'many', ...} */
function swe41Action(text,catalog){
  const s=String(text||'');
  const code=[...s.matchAll(/```(js|javascript|python|py)?[ \t]*\n([\s\S]*?)```/gi)].filter(m=>!/^\s*\{\s*"(tool|name)"/.test(m[2]));
  const calls=tc41Parse(s.replace(/```(js|javascript|python|py)[ \t]*\n[\s\S]*?```/gi,''),catalog);
  if(code.length>1)return{kind:'many',n:code.length};
  if(code.length===1&&!calls.length)return{kind:/^py/i.test(code[0][1]||'')?'python':'js',code:code[0][2]};
  if(calls.length&&!code.length)return{kind:'tools',calls};
  if(code.length&&calls.length)return{kind:'many',n:code.length+calls.length};
  const f=s.match(/(?:^|\n)\s*FINAL:\s*([\s\S]+)$/i);
  if(f)return{kind:'final',answer:f[1].trim()};
  return{kind:'none'};
}
const swe41Thought=t=>String(t||'').replace(/```[\s\S]*?```/g,'').replace(/===USE TOOL===[\s\S]*?(===END===|$)/g,'').replace(/^\s*THOUGHT:\s*/i,'').trim();
/* The sandbox program for one step: files and input in, files, submission and error out. */
function swe41Wrap(code,vfs,input,allowNet){
  return (allowNet?'':'try{self.fetch=undefined;self.XMLHttpRequest=undefined;self.WebSocket=undefined;self.importScripts=undefined;self.EventSource=undefined;}catch(_){}\n')+
    'const __vfs='+JSON.stringify(vfs||{})+';const input='+JSON.stringify(input===undefined?null:input)+';let __sub=null;\n'+
    'const fs={read:p=>{p=String(p);if(!(p in __vfs))throw new Error("no such file: "+p);return __vfs[p];},write:(p,t)=>{__vfs[String(p)]=String(t);return true;},'+
    'ls:()=>Object.keys(__vfs),rm:p=>{delete __vfs[String(p)];return true;},exists:p=>String(p) in __vfs};\n'+
    'const print=(...a)=>console.log(...a);const submit=a=>{__sub={v:a===undefined?null:a};};\n'+
    'let __err=null;\ntry{await (async()=>{\n'+code+'\n})();}catch(e){__err=String(e&&e.stack||e).split("\\n").slice(0,5).join("\\n");}\n'+
    'return {vfs:__vfs,sub:__sub,err:__err};';
}
function swe41WrapPy(code,vfs,input){
  return 'import json, os\nos.makedirs("/work", exist_ok=True)\nos.chdir("/work")\n__vfs=json.loads('+JSON.stringify(JSON.stringify(vfs||{}))+')\n'+
    'for __k,__v in __vfs.items():\n    __d=os.path.dirname(__k)\n    if __d: os.makedirs(__d, exist_ok=True)\n    open(__k,"w").write(__v)\n'+
    '__sub=None\ndef submit(v):\n    global __sub\n    __sub={"v":v}\ninput=json.loads('+JSON.stringify(JSON.stringify(input===undefined?null:input))+')\n__err=None\n'+
    'try:\n    exec(compile('+JSON.stringify(code)+',"<agent>","exec"),globals())\nexcept Exception:\n    import traceback\n    __err=traceback.format_exc()[-900:]\n'+
    '__out={}\nfor __r,_,__fs in os.walk("/work"):\n    for __f in __fs:\n        __p=os.path.relpath(os.path.join(__r,__f),"/work")\n        try: __out[__p]=open(os.path.join(__r,__f)).read()\n        except Exception: pass\n'+
    'json.dumps({"vfs":__out,"sub":__sub,"err":__err},default=str)';
}
async function swe41Exec(act,vfs,input,o){
  const py=act.kind==='python';
  const r=await e2bRun(py?swe41WrapPy(act.code,vfs,input):swe41Wrap(act.code,vfs,input,o&&o.allowNet),py?'python':'js',{timeout:py?120000:(o&&o.timeout)||20000});
  let out=null;try{out=r.result?JSON.parse(py&&typeof r.result==='string'&&r.result[0]!=='{'?r.result:r.result):null;}catch(_){}
  if(typeof out==='string'){try{out=JSON.parse(out);}catch(_){}}
  const err=(out&&out.err)||(!r.ok?r.error:'');
  return{ok:!err,stdout:String(r.stdout||''),error:err||'',vfs:(out&&out.vfs)||vfs,submitted:!!(out&&out.sub),answer:out&&out.sub?out.sub.v:undefined,ms:r.ms||0};
}
/* PURE. A rule's verdict on a piece of text (before = the action, after = its output). */
function swe41Rules(h,when,text){
  const notes=[];let blocked=null;
  for(const r of (h.rules||[])){if(r.when!==when||r.disabled)continue;let re;try{re=new RegExp(r.pattern,r.flags||'');}catch(_){continue;}
    if(re.test(text)){if(r.effect==='block')blocked='BLOCKED by rule "'+r.name+'": '+r.message;else notes.push('['+(r.effect==='warn'?'warning':'hint')+' · '+r.name+'] '+r.message);}}
  return{notes,blocked};
}
/* One agent run. `task` = {prompt, files, input, domain}; returns the trajectory and the submission. */
async function swe41Run(task,o){
  const opt=o||{},h=opt.harness||h41(),model=opt.model||asstCfg().model||settings.archModel;
  const cat=opt.tools===false?[]:toolCatalog(),lessons=opt.lessons!==undefined?opt.lessons:lib41Pick(LIB41,task.prompt,task.domain,4);
  const sys=swe41System(h,model,cat,task.prompt,lessons);
  let user='# Task\n'+task.prompt;
  if(task.files&&Object.keys(task.files).length)user+='\n\n# Files\n'+Object.keys(task.files).map(f=>'- '+f).join('\n');
  if(task.input!==undefined)user+='\n\n# input\nThe variable `input` holds: '+String(JSON.stringify(task.input)).slice(0,1500);
  const msgs=[{role:'system',content:sys}].concat(opt.history||[],[{role:'user',content:user}]);
  let vfs=Object.assign({},task.files||{});const trace=[];let answer,status='step_limit',cost=0,calls=0;
  const maxSteps=Math.max(1,Math.min(30,opt.maxSteps||h.maxSteps||12));
  for(let step=0;step<maxSteps;step++){
    if(opt.signal&&opt.signal.aborted){status='aborted';break;}
    if(opt.budget&&!opt.budget.take())throw new Error('budget spent ('+opt.budget.why()+')');
    let acc;
    try{acc=await streamComplete({model,maxTokens:opt.maxTokens||2500,temperature:opt.temperature,messages:msgs},
      opt.onText?a=>opt.onText(String(a.content||''),step):null,opt.signal,'agent:step');}
    catch(e){status='error';trace.push({step,error:String(e.message||e)});break;}
    calls++;cost+=acc.cost||0;if(opt.budget)opt.budget.spend(acc.cost||0);
    const text=String(acc.content||'');msgs.push({role:'assistant',content:text});
    const act=swe41Action(text,cat),rec={step,thought:swe41Thought(text).slice(0,1200),kind:act.kind,t0:Date.now()};
    let obs='';
    if(act.kind==='final'){answer=act.answer;status='submitted';rec.submitted=true;trace.push(rec);opt.onStep&&opt.onStep(rec);break;}
    if(act.kind==='none'||act.kind==='many'){
      /* A plain answer to a question that needed no action is accepted; anything that tried to act and could not be read is corrected. */
      if(act.kind==='none'&&!tc41Looks(text,cat)&&step===0&&!/```/.test(text)&&text.trim()){answer=text.trim();status='answered';rec.submitted=true;trace.push(rec);opt.onStep&&opt.onStep(rec);break;}
      obs=act.kind==='many'?'Format error: exactly ONE action per reply (found '+act.n+'). Send one code block, or tool calls, or FINAL: answer.'
        :(tc41Looks(text,cat)?tc41Feedback(cat):'Format error: no action found. Reply with a THOUGHT and exactly one ```js block (call submit(answer) when done), tool calls, or FINAL: answer.');
      rec.formatError=true;rec.obs=obs;trace.push(rec);opt.onStep&&opt.onStep(rec);msgs.push({role:'user',content:obs});continue;
    }
    if(act.kind==='tools'){
      rec.calls=act.calls.map(c=>({tool:c.tool,args:c.args}));
      const res=await tc41RunAll(act.calls,async c=>({c,r:await toolInvoke(c.tool,c.args)}));
      obs=res.map(x=>toolObservation(x.r,x.c.tool,4000)).join('\n\n');rec.ok=res.every(x=>x.r.ok);rec.results=res.map(x=>x.r.ok?toolText(x.r.result).slice(0,1500):'error: '+x.r.error);
    }else{
      rec.code=act.code;rec.lang=act.kind;
      const pre=swe41Rules(h,'before',act.code);
      const r=pre.blocked?{ok:false,error:pre.blocked,stdout:'',vfs}:await swe41Exec(act,vfs,task.input,{allowNet:opt.allowNet});
      vfs=r.vfs||vfs;
      obs=(r.stdout?String(r.stdout).slice(-3500):'')+(r.ok?'':(r.stdout?'\n':'')+'ERROR: '+r.error)||'(no output — print() what you need to see)';
      const post=swe41Rules(h,'after',obs);const notes=pre.notes.concat(post.notes);if(notes.length)obs+='\n'+notes.join('\n');
      rec.ok=r.ok;rec.ms=r.ms;
      if(r.submitted){answer=r.answer;status='submitted';rec.submitted=true;}
    }
    rec.obs=obs;rec.ms=rec.ms||Date.now()-rec.t0;trace.push(rec);opt.onStep&&opt.onStep(rec);
    if(status==='submitted')break;
    msgs.push({role:'user',content:(rec.kind==='tools'?'TOOL RESULTS\n\n':'<returncode>'+(rec.ok?0:1)+'</returncode>\n<output>\n')+obs+(rec.kind==='tools'?'\n\n'+TOOL_SPOTLIGHT_RULE:'\n</output>')});
  }
  return{answer,status,trace,vfs,cost,calls,model,steps:trace.length,lessons:lessons.map(l=>l.id)};
}
const swe41AnswerText=a=>a===undefined?'':typeof a==='string'?a:'```json\n'+JSON.stringify(a,null,2)+'\n```';
/* The Assistant's Agent mode: the chat's files persist on the chat, each step is a card. */
async function swe41Turn(text,c,slot,signal){
  const hist=c.msgs.filter(m=>m!==slot&&m.role&&(m.content||'').trim()).slice(-7,-1).map(m=>({role:m.role,content:String(m.shown!=null?m.shown:m.content).slice(0,2000)}));
  const think=[];
  try{
    const r=await swe41Run({prompt:text,files:c.vfs41||{},domain:'chat'},{signal,history:hist,
      onText:(t,step)=>{slot.content='';slot.reasoning=think.concat(['step '+(step+1)+': '+swe41Thought(t).slice(0,400)]).join('\n\n');renderAsstStream();},
      onStep:rec=>{think.push('step '+(rec.step+1)+': '+rec.thought.slice(0,400));
        const name=rec.kind==='tools'?'step '+(rec.step+1)+' · '+rec.calls.map(x=>x.tool).join(', '):rec.formatError?'step '+(rec.step+1)+' · format':rec.kind==='final'?'step '+(rec.step+1)+' · answer':'step '+(rec.step+1)+' · '+(rec.lang==='python'?'python':'code');
        slot.tools.push({name,status:rec.formatError?'err':rec.ok===false?'err':'ok',ms:rec.ms,note:rec.thought.slice(0,140)||(rec.submitted?'submitted':''),
          args:rec.code!=null?rec.code:rec.calls?rec.calls:undefined,result:rec.obs!=null?String(rec.obs).slice(0,4000):undefined});
        slot.reasoning=think.join('\n\n');renderAsstStream();}});
    c.vfs41=r.vfs;slot.cost=r.cost;c.cost=(c.cost||0)+r.cost;slot.model=r.model;
    slot.content=r.answer!==undefined?swe41AnswerText(r.answer):'';
    if(r.status!=='submitted'&&r.status!=='answered')slot.error=r.status==='step_limit'?'stopped at the step limit without submitting — ask it to continue, or raise the limit in Settings':r.status==='aborted'?'stopped':((r.trace[r.trace.length-1]||{}).error||r.status);
    slot.meta={model:r.model,requested:r.model,tin:0,tout:0,tthink:0,tcache:0,ttft:null,ms:Date.now()-(slot.t0||Date.now()),finish:r.status,cites:[],rounds:r.calls,cost:r.cost,est:false};
    slot.agentTask={prompt:text,status:r.status,steps:r.steps};
  }catch(e){slot.error=e.message;}
}
