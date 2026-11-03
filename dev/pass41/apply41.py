# Pass 41 — base41.html (= gb-repo 8ff4230, build 8e137962623e2a52) → GlassBox.html
# Tool calls in every format + native function calling, API connectors, MCP session handling, delegate (subagents),
# Agent mode (mini-swe-agent loop), and the self-improving harness loop (Ouroboros-style).
import sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(W+'base41.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count: sys.exit('ANCHOR x%d (want %d): %r'%(n,count,old[:160]))
    s=s.replace(old,new)
rd=lambda f:open(W+'p41/'+f).read()
MOD_ANCHOR="/* ═══════════════════ ASSISTANT — the front door"
def module(f): rep(MOD_ANCHOR,rd(f)+"\n"+MOD_ANCHOR)

i=s.index('<style id="ds40">');j=s.index('</style>',i)+len('</style>')
s=s[:j]+'\n<style id="ds41">\n'+rd('ui.css')+'</style>'+s[j:]
for f in ['tc.js','api.js','orch.js','nt.js','swe.js','evolve.js']: module(f)

# ═══ Catalogue: delegate + find_tools; dispatch; trifecta legs ═══
rep("""  /* First registration wins. Two sources advertising the same name is a real possibility once MCP
     servers are in play, and silently calling whichever happened to be last would be worse than
     picking one and saying so. */
  const seen=new Set(),uniq=[];""","""  /* pass 41: any model can hand work to a subagent; a large catalogue gets a way to find the rest */
  if(TC41.depth===0&&!(typeof ASST!=='undefined'&&ASST.useTools===false))out.push(orch41Tool());
  if(out.length>TC41.limit)out.push({name:'find_tools',source:'meta',description:'List connected tools that fit what you need (only some are shown above). Input: {"query":"…"}.',
    schema:{type:'object',properties:{query:{type:'string'}},required:['query']}});
  /* First registration wins. Two sources advertising the same name is a real possibility once MCP
     servers are in play, and silently calling whichever happened to be last would be worse than
     picking one and saying so. */
  const seen=new Set(),uniq=[];""")
rep("  if(t.source==='memory'||t.source==='skill')return{private:false,untrusted:false,exfil:false};",
    "  if(t.source==='memory'||t.source==='skill'||t.source==='orch'||t.source==='meta')return{private:false,untrusted:false,exfil:false};")
rep("    else if(spec.source==='reader')  result=await readerFetch((args||{}).url);",
    "    else if(spec.source==='orch')    result=await orch41Delegate(args||{});\n    else if(spec.source==='meta')    result=tc41Find((args||{}).query);\n    else if(spec.source==='reader')  result=await readerFetch((args||{}).url);")

# ═══ One parser for every loop ═══
a=s.index('async function handleToolCalls(text,hostEl){');b=s.index('  return out.length?out:null;\n}',a)+len('  return out.length?out:null;\n}')
s=s[:a]+"""async function handleToolCalls(text,hostEl){
  /* pass 41: every format a model might use (tc41Parse); independent calls run together (tc41RunAll). */
  if(!text||!toolCatalog().length)return null;
  const calls=tc41Parse(text,toolCatalog());if(!calls.length)return null;
  const out=await tc41RunAll(calls,async c=>{
    const req={tool:c.tool,args:c.args==null?{}:c.args},src=toolSource(req.tool);
    if(hostEl)hostEl.textContent=src==='ocr'?'reading documents…':src==='openbot'?'asking OpenBot…':src==='orch'?'delegating…':`calling ${req.tool}…`;
    const r=await toolInvoke(req.tool,req.args);const obs=toolObservation(r,req.tool,4000);
    return r.ok?{req,result:r.result,obs,injection:r.injection||null}:{req,error:r.error,obs,blocked:r.blocked||null};});
  return out.length?out:null;
}"""+s[b:]
# connectorBlock lists the whole catalogue with signatures (same gate as before: only when a real tool source is on)
a=s.index('function connectorBlock(){');b=s.index('async function handleToolCalls(text,hostEl){',a)
s=s[:a]+"""function connectorBlock(){
  /* pass 41: the whole catalogue, typed signatures, focused on the request when it is large (tc41Block). Emitted only when
     a real tool source is on, as before — a builder prompt with no tools should not carry tool instructions. */
  const real=CONNECTORS.some(c=>c.on&&c.tools&&c.tools.length)||OCR_DOCS.length||(typeof OPENBOT!=='undefined'&&OPENBOT.ok)||
    (typeof SKILLS!=='undefined'&&SKILLS.some(x=>x.on&&x.body));
  return real?tc41Block(toolCatalog(),TC41.lastQuery):'';
}
"""+s[b:]
rep("    const t=connectorBlock();if(t)parts.push(t);","    const t=ASST.useTools===false?'':tc41Block(toolCatalog(),TC41.lastQuery);if(t)parts.push(t);")

# ═══ The Assistant: Agent mode, native calls, format correction, more rounds ═══
rep("""  playbook:{label:'Playbook router',""","""  agent: {label:'Agent', blurb:'works in steps: writes and runs code, calls your tools, MCP servers and APIs, checks its own answer, then submits',
          maxTokens:2500, web:false, agent41:true, sys:''},
  playbook:{label:'Playbook router',""")
rep("  const slot={role:'assistant',content:'',reasoning:'',tools:[],ts:nowISO(),streaming:true,t0:Date.now(),mode:asstMode().label||ASST.mode};",
    "  const slot={role:'assistant',content:'',reasoning:'',tools:[],ts:nowISO(),streaming:true,t0:Date.now(),mode:asstMode().label||ASST.mode};\n  TC41.lastQuery=String(text||'').slice(0,600);")
rep("  if(asstMode().playbook){","""  if(asstMode().agent41){
    await swe41Turn(text,c,slot,ASST_ABORT.signal);
    slot.streaming=false;slot.t1=Date.now();saveAChats();renderAsst();return slot;
  }
  if(asstMode().playbook){""")
rep("""  if(cfg.web)opts.web={on:true,maxResults:6};
  try{
    const acc=await streamComplete(opts,a=>{""","""  if(cfg.web)opts.web={on:true,maxResults:6};
  /* pass 41: a model that supports function calling gets real tool_calls; a refusal falls back to the text protocol */
  if(nt41Eligible(cfg)){
    try{await nt41Turn(opts,cfg,slot,c);spanEnd(span,{content:slot.content,cost:slot.cost,usage:{}});
      slot.streaming=false;slot.t1=Date.now();saveAChats();renderAsst();return slot;}
    catch(e){if(ASST_ABORT&&ASST_ABORT.signal.aborted){slot.error='stopped';slot.streaming=false;slot.t1=Date.now();saveAChats();renderAsst();return slot;}
      slot.tools.push({name:'native tool calls',ok:false,status:'err',note:'refused ('+String(e.message||e).slice(0,120)+') — used the text protocol'});}
  }
  try{
    const acc=await streamComplete(opts,a=>{""")
rep("""    for(let round=0;round<ASST_TOOL_ROUNDS&&ASST.useTools&&typeof handleToolCalls==='function'&&/===USE TOOL===/.test(slot.content);round++){
      if(!ASST.auto){
        const ok=confirm('The assistant wants to run a tool:\\n\\n'+
          (slot.content.match(/===USE TOOL===[\\s\\S]{0,300}/)||[''])[0]+'\\n\\nAllow?');""","""    /* pass 41: a reply that tried to call a tool and could not be read gets one correction round instead of being the answer */
    if(ASST.useTools&&tc41Looks(slot.content,toolCatalog())){
      slot.tools.push({name:'format correction',ok:false,status:'err',note:'the tool call could not be read — asked the model to resend it'});renderAsstStream();
      opts.messages=opts.messages.concat([{role:'assistant',content:slot.content},{role:'user',content:tc41Feedback(toolCatalog())}]);
      const accF=await streamComplete(opts,a=>{slot.content=a.content||'';renderAsstStream();},ASST_ABORT.signal,'assistant');
      slot.content=accF.content||slot.content;slot.cost=(slot.cost||0)+(accF.cost||0);c.cost=(c.cost||0)+(accF.cost||0);
      slot.meta=turn40Merge(slot.meta,turn40Estimate(turn40Meta(accF,cfg.model),accF));
    }
    for(let round=0;round<asstRounds41()&&ASST.useTools&&typeof handleToolCalls==='function'&&tc41Parse(slot.content,toolCatalog()).length;round++){
      if(!ASST.auto){
        const ok=confirm('The assistant wants to run:\\n\\n'+
          tc41Parse(slot.content,toolCatalog()).map(x=>x.tool+' '+JSON.stringify(x.args).slice(0,200)).join('\\n')+'\\n\\nAllow?');""")

# ═══ Status strip: tool rounds and native calls, switchable in one tap ═══
rep("""    ${tt.tin||tt.tout||tt.cost?`<span class="t40-chip" title="This chat so far">""","""    <button type="button" class="t40-chip" data-t40s="rounds" title="Most tool rounds per answer">${ic40('rotate-ccw')}Rounds ${asstRounds41()}</button>
    <button type="button" class="t40-chip${ASST.native==='text'?'':' on'}" data-t40s="native" title="${ASST.native==='text'?'Every model calls tools by text':'Models that support function calling use it; others use text'}">${ic40('code')}Calls ${ASST.native==='text'?'text':'auto'}</button>
    ${tt.tin||tt.tout||tt.cost?`<span class="t40-chip" title="This chat so far">""")
rep("    if(k==='think'){const L=MOA_EFFORTS","""    if(k==='rounds'){const L=[3,6,10];const n=asstRounds41();ASST.toolRounds=L[(L.indexOf(n)+1)%L.length]||6;toast('Up to '+ASST.toolRounds+' tool rounds per answer',1800);}
    if(k==='native'){ASST.native=ASST.native==='text'?'auto':'text';toast(ASST.native==='text'?'Every model calls tools by text':'Function calling for models that support it',2200);}
    if(k==='think'){const L=MOA_EFFORTS""")

# ═══ MCP: session id, protocol header, initialized notification, paginated tool lists ═══
rep("""    const res=await fetch(c.url,{method:'POST',headers,body:JSON.stringify(body),signal:deadline(DL_WORK)});
    if(!res.ok)throw new Error('HTTP '+res.status);""","""    /* pass 41: streamable-HTTP servers hand out a session id at initialize and require it (and the protocol
       version) on every later request — without it most of them answer 400 to tools/list */
    if(c.sessionId&&method!=='initialize')headers['Mcp-Session-Id']=c.sessionId;
    if(method!=='initialize')headers['MCP-Protocol-Version']=MCP_PROTOCOL;
    const res=await fetch(c.url,{method:'POST',headers,body:JSON.stringify(body),signal:deadline(DL_WORK)});
    {const sid=res.headers.get('mcp-session-id');if(sid)c.sessionId=sid;}
    if(res.status===404&&c.sessionId&&method!=='initialize'){c.sessionId='';throw new Error('the MCP session expired — reconnect this connector');}
    if(!res.ok)throw new Error('HTTP '+res.status);""")
rep("""      const init=await mcpRpc(c,'initialize',{protocolVersion:MCP_PROTOCOL,
        capabilities:{},clientInfo:{name:'Glassbox Jet',version:'1.0'}});
      const list=await mcpRpc(c,'tools/list',{});
      c.tools=(list&&list.tools)||[];""","""      c.sessionId='';
      const init=await mcpRpc(c,'initialize',{protocolVersion:MCP_PROTOCOL,
        capabilities:{},clientInfo:{name:'Glassbox Jet',version:'1.0'}});
      if(c.kind==='mcp-http')try{const hh={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':MCP_PROTOCOL};
        if(c.token)hh.Authorization='Bearer '+c.token;if(c.sessionId)hh['Mcp-Session-Id']=c.sessionId;
        await fetch(c.url,{method:'POST',headers:hh,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),signal:deadline(DL_API)});}catch(_){}
      let list=await mcpRpc(c,'tools/list',{});
      c.tools=(list&&list.tools)||[];
      for(let pg=0;pg<10&&list&&list.nextCursor;pg++){list=await mcpRpc(c,'tools/list',{cursor:list.nextCursor});c.tools=c.tools.concat((list&&list.tools)||[]);}""")

# ═══ API connectors in the connector machinery and UI ═══
rep("""async function connectorConnect(c){
  try{""","""async function connectorConnect(c){
  if(c.kind==='api'){try{await api41Connect(c);logEvent('connector',{id:c.label,tools:c.tools.length});}
    catch(e){c.status='not connected';c.lastError=String(e.message||e);c.tools=[];}c.ts=nowISO();saveConnectors();return c;}
  try{""")
rep("""    if(c.kind==='rest')out=await githubCall(c,tool,args);
    else out=await mcpRpc(c,'tools/call',{name:tool,arguments:args||{}});""","""    if(c.kind==='rest')out=await githubCall(c,tool,args);
    else if(c.kind==='api')out=await api41Call(c,tool,args);
    else out=mcp41Result(await mcpRpc(c,'tools/call',{name:tool,arguments:args||{}}));""")
rep("""  if(p){p.innerHTML=CONNECTOR_PRESETS.map(x=>
    `<button class="btn ghost small" data-cxadd="${x.id}">${x.icon} Add ${esc(x.label)}</button>`).join('');""","""  if(p){p.innerHTML=`<button class="btn small" data-api41add>＋ Add an API (REST, OpenAPI, GraphQL)</button>`+CONNECTOR_PRESETS.map(x=>
    `<button class="btn ghost small" data-cxadd="${x.id}">${x.icon} Add ${esc(x.label)}</button>`).join('');
    const ab=p.querySelector('[data-api41add]');if(ab)ab.onclick=()=>api41Form();""")
rep("""      c.kind==='mcp-stdio'&&!BRIDGE_INFO?'<br><b>This kind needs the bridge</b> — a browser cannot start a local process. Start it from the Handoff tab.':''}</div>`:''}""",
    """      c.kind==='mcp-stdio'&&!BRIDGE_INFO?'<br><b>This kind needs the bridge</b> — a browser cannot start a local process. Start it from the Handoff tab.':''}</div>`:''}
    ${c.kind==='api'?api41RowHTML(c):''}""")
rep("""  host.querySelectorAll('[data-cxdel]').forEach(b=>b.onclick=()=>{""","""  host.querySelectorAll('[data-api41ask],[data-api41w]').forEach(b=>b.onchange=async()=>{
    const c=CONNECTORS.find(x=>x.id===(b.dataset.api41ask||b.dataset.api41w));if(!c)return;c.api=c.api||{};
    if(b.dataset.api41ask)c.api.ask=b.checked;else c.api.allowWrite=b.checked;await connectorConnect(c);renderConnectors();});
  host.querySelectorAll('[data-cxdel]').forEach(b=>b.onclick=()=>{""")

# ═══ Self-improvement card on the Harness Lab tab ═══
rep('<section class="view" id="view-hlab"><div class="wrap"><div id="hlab-panel"></div></div></section>',
    '<section class="view" id="view-hlab"><div class="wrap"><div id="evo41"></div><div id="hlab-panel"></div></div></section>')
rep("  if(view==='hlab')panelGuard(view,()=>hlRender());","  if(view==='hlab'){panelGuard(view,()=>hlRender());panelGuard(view,()=>evo41Render());}")

# ═══ Native tool calls a model sends unasked are collected and turned into actions (gpt-oss, vLLM harmony parsing) ═══
rep("  if(typeof delta.content==='string')acc.content+=delta.content;\n  const rd=delta.reasoning_details;",
    """  if(typeof delta.content==='string')acc.content+=delta.content;
  if(Array.isArray(delta.tool_calls))delta.tool_calls.forEach((t,k)=>{if(!t)return;const i=t.index!=null?t.index:k;acc.toolCalls=acc.toolCalls||[];
    const cur=acc.toolCalls[i]||(acc.toolCalls[i]={id:'',name:'',args:''});if(t.id)cur.id=t.id;const f=t.function||{};
    if(f.name){if(!cur.name)cur.name=f.name;else if(cur.name!==f.name&&!cur.name.endsWith(f.name))cur.name+=f.name;}
    if(f.arguments!=null)cur.args+=typeof f.arguments==='string'?f.arguments:JSON.stringify(f.arguments);});
  const rd=delta.reasoning_details;""")
rep("    acc.content=String(m.content||'');\n    if(m.reasoning_content||m.reasoning)acc.reasoning=String(m.reasoning_content||m.reasoning);",
    """    acc.content=String(m.content||'');
    if(Array.isArray(m.tool_calls))acc.toolCalls=m.tool_calls.map(t=>({id:t.id||'',name:(t.function||{}).name||'',args:typeof (t.function||{}).arguments==='string'?t.function.arguments:JSON.stringify((t.function||{}).arguments||{})}));
    if(m.reasoning_content||m.reasoning)acc.reasoning=String(m.reasoning_content||m.reasoning);""")
rep("  const finish=()=>{finished=true;\n    if(watchdog){clearInterval(watchdog);watchdog=null;}",
    """  const finish=()=>{finished=true;
    if(watchdog){clearInterval(watchdog);watchdog=null;}
    if(acc.toolCalls&&acc.toolCalls.some(Boolean)&&!acc._nativeDone){acc._nativeDone=true;acc.nativeCalls=acc.toolCalls.filter(Boolean);
      acc.content=(String(acc.content||'').trim()?acc.content+'\\n\\n':'')+tc41FromNative(acc.nativeCalls);}""")
# arguments are shaped to the schema before the gate checks them — one place, every loop
rep("  const chk=toolArgsCheck(spec.schema,args);\n  if(!chk.ok){","  args=tc41Coerce(args,spec.schema);\n  const chk=toolArgsCheck(spec.schema,args);\n  if(!chk.ok){")
# an Agent code step shows Code / Output, not Arguments / Result
rep('''  const body=open&&has?`<div class="t40-tb">${t.args!=null?`<div class="t40-lbl">Arguments</div>''','''  const code41=/· (code|python)$/.test(t.name||'');
  const body=open&&has?`<div class="t40-tb">${t.args!=null?`<div class="t40-lbl">${code41?'Code':'Arguments'}</div>''')
rep('''t.result!=null?`<div class="t40-lbl">Result</div>''','''t.result!=null?`<div class="t40-lbl">${code41?'Output':'Result'}</div>''')
EXPORTS=['tc41Coerce','tc41Resolve','tc41FromNative','tc41Parse','tc41Looks','tc41Select','tc41Sig','tc41Block','tc41Kw','api41Url','api41Allowed','api41FromOpenApi','orch41Agent','swe41Action','swe41Rules','swe41Run',
  'edits41Apply','gate41','mcp41Result','lib41Pick','budget41','evolve41','eval41','TASKS41','get H41(){return H41}','get EVO41(){return EVO41}','get LIB41(){return LIB41}']
rep("shellMode36,tabPosFor36,tabFace36,",",".join(EXPORTS)+",shellMode36,tabPosFor36,tabFace36,")
rep("  add({id:'fixture-chat-sweep',",rd('cases.js')+"\n  add({id:'fixture-chat-sweep',")
rep("  {id:'sandbox-noop',",rd('sab.js')+"\n  {id:'sandbox-noop',")
open(W+'GlassBox.html','w').write(s)
print('ok',len(s))
