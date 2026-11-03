import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:900} })).newPage();
p.on('pageerror', e=>console.log('PAGEERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2]); await p.waitForTimeout(1800);
const R = await p.evaluate(async()=>{
  const out={};
  const real=streamComplete;
  window.__calls=[];
  streamComplete=async(opts,onUpdate,signal,label)=>{const c=await window.__fake(opts,label||'');window.__calls.push(label);const acc={content:c,usage:{prompt_tokens:100,completion_tokens:20},cost:0,elapsed:5,ttft:2,model:opts.model,finishReason:'stop'};if(onUpdate)onUpdate(acc);return acc;};
  try{
  // A. MCP with session id + pagination
  const m=connectorAdd('mcp-http',{label:'TestMCP',url:'http://127.0.0.1:8842/'});await connectorConnect(m);
  out.mcp=[m.status,m.tools.map(t=>t.name).join('+'),toolText((await toolInvoke('add',{a:2,b:3})).result)];
  // B. OpenAPI connector, header auth, read-only
  const a=connectorAdd('api',{label:'Pets',url:'',token:'k123'});a.api={kind:'openapi',specUrl:'http://127.0.0.1:8841/openapi.json',authType:'header',authName:'X-API-Key',ask:false,allowWrite:false};
  await connectorConnect(a);
  const g1=await toolInvoke('pets_getpet',{id:1}),w1=await toolInvoke('pets_addpet',{body:{name:'Rex'}});
  const lg=await (await fetch('http://127.0.0.1:8841/log')).json();
  out.api=[a.status,a.tools.map(t=>t.name).join('+'),g1.ok&&g1.result.name,w1.ok,String(w1.error).slice(0,60),lg.filter(x=>/pets\/1/.test(x)).pop()];
  // C. chat, model writes a python-style call, then a format-correction case
  ASST.mode='chat';ASST.auto=true;ASST.useTools=true;ASST.native='text';
  let n=0;window.__fake=(o,l)=>{n++;return n===1?'Let me look.\npets_getpet(id=1)':'Pet 1 is Biscuit, a 4-year-old dog.';};
  const c1=achatNew('e2e-c');ACHAT=c1.id;const s1=await asstSend('What is pet 1?');
  out.chat=[s1.tools.map(t=>t.name+':'+t.status).join(','),s1.content];
  n=0;window.__fake=(o,l)=>{n++;return n===1?'===USE TOOL===\nplease get pet one\n===END===':n===2?'===USE TOOL===\n{"tool":"pets_getpet","args":{"id":1}}\n===END===':'It is Biscuit.';};
  const s2=await asstSend('Pet 1 again?');out.correct=[s2.tools.map(t=>t.name+':'+t.status).join(','),s2.content];
  // D. delegate: parent → researcher subagent → MCP add tool
  n=0;window.__fake=(o,l)=>{ if(/^subagent/.test(l)){return o.messages.some(x=>/TOOL RESULTS/.test(x.content))?'5':'===USE TOOL===\n{"tool":"add","args":{"a":2,"b":3}}\n===END===';}
    n++;return n===1?'===USE TOOL===\n{"tool":"delegate","args":{"task":"Add 2 and 3 with the add tool and return only the number.","agent":"researcher"}}\n===END===':'The researcher says 5.';};
  const s3=await asstSend('Use a subagent to add 2 and 3');out.delegate=[s3.tools.map(t=>t.name+':'+t.status).join(','),String((s3.tools[0]||{}).result||'').slice(0,80),s3.content];
  // E. Agent mode on verified tasks: compute, format error, tool action, files
  const step=(seq)=>{let k=0;return (o,l)=>seq[Math.min(k++,seq.length-1)];};
  window.__fake=step(['THOUGHT: brute force\n```js\nconst r=[];for(let n=1;r.length<2;n++)if(n%3===2&&n%5===3&&n%7===2)r.push(n);print(r);\n```','```js\na()\n```\n```js\nb()\n```','THOUGHT: verified above\n```js\nsubmit([23,128])\n```']);
  const crt=TASKS41.find(t=>t.id==='crt');let r=await eval41(crt,h41(),{});out.agentCrt=[r.status,r.score,r.trace.map(s=>s.kind+(s.formatError?'!':'')).join('>'),String(r.trace[0].obs).slice(0,40)];
  window.__fake=step(['```js\nconst s=fs.read("src/range_sum.js");fs.write("src/range_sum.js","function rangeSum(a,b){if(a>b)[a,b]=[b,a];let s=0;for(let i=a;i<=b;i++)s+=i;return s;}");print(fs.ls());\n```','```js\nconst f=new Function(fs.read("src/range_sum.js")+";return rangeSum;")();print(f(4,1));submit("fixed")\n```']);
  r=await eval41(TASKS41.find(t=>t.id==='range-fix'),h41(),{});out.agentFix=[r.status,r.score,r.detail];
  window.__fake=step(['===USE TOOL===\n{"tool":"add","args":{"a":40,"b":2}}\n===END===','```python\nsubmit(42)\n```']);
  r=await swe41Run({prompt:'What is 40+2? use the add tool',domain:'math'},{});out.agentTool=[r.status,JSON.stringify(r.answer),r.trace.map(s=>s.kind).join('>')];
  // F. Evolve: the stock harness fails the puzzle; a proposed self-check guardrail fixes it; anchors hold; it waits for approval
  EVO41.requireApproval=true;EVO41.queue=[];
  window.__fake=(o,l)=>{const sys=(o.messages[0]||{}).content||'',u=o.messages.map(x=>x.content).join('\n');
    if(l==='evolve:propose')return /\[invariant\]/.test(u)?'{"rationale":"verify before submitting","edits":[{"component":"guardrails","op":"append","content":"- self-check: brute-force small search spaces and print the check before submit()."}]}':'{"rationale":"nothing domain-specific","edits":[]}';
    if(l==='evolve:reflect')return '{"situation":"number puzzles with small answers","lesson":"brute-force and print the check before submitting","tags":["math"]}';
    if(/FizzBuzzBazz|"Bazz"/.test(u))return '```js\nconst o=[];for(let n=1;n<=35;n++){let s="";if(n%3===0)s+="Fizz";if(n%5===0)s+="Buzz";if(n%7===0)s+="Bazz";o.push(s||String(n));}submit(o)\n```';
    if(/rangeSum/.test(u))return '```js\nfs.write("src/range_sum.js","function rangeSum(a,b){if(a>b)[a,b]=[b,a];let s=0;for(let i=a;i<=b;i++)s+=i;return s;}");submit("fixed")\n```';
    if(/status "done"/.test(u))return '```js\nconst o={};for(const r of input)o[r.team]=(o[r.team]||0)+(r.status==="done"?1:0);submit(Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]])))\n```';
    return /self-check/.test(sys)?'```js\nsubmit([23,128])\n```':'```js\nsubmit([23,46])\n```';};
  const before=H41.active;const rec=await evolve41(crt,{});
  out.evolve=[rec.ref,rec.cands.map(c=>c.scope+':'+c.score).join(','),rec.adopted,EVO41.queue.length,before===H41.active,(LIB41[0]||{}).lesson];
  }catch(e){out.err=e.message+' '+e.stack.slice(0,300);}
  streamComplete=real;
  return out;
});
console.log(JSON.stringify(R,null,1));
await b.close();
