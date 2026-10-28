# Pass 36b — free providers (exec'd by apply36.py: uses its `s` and `rep`). Every claim below was probed
# from this machine on 27 Oct 2026; see WORKLOG.md.
rep("""  {id:'moonshot',label:'Moonshot — Kimi',base:'https://api.moonshot.ai/v1',""",r"""  /* LLM7 — measured 27 Oct 2026: answers WITHOUT a key for its "turbo" tier (the rows whose
     usage_based_only is false), sends Access-Control-Allow-Origin:* and streams. Its anonymous rate limit
     is per second, not per hour ("retry after 1 s"), so it suits single questions and short chats.
     A free token from token.llm7.io raises the limits; paste it as the key. */
  {id:'llm7',label:'LLM7 — free, no key',base:'https://api.llm7.io/v1',key:'',on:true,viaBridge:false,anonymous:true,rpm:20,
   models:['gpt-oss:20b','mistral-Nemo-Instruct-2407','codestral-latest','minimax-m2.7','nemotron-3-nano:30b'],
   hint:'No account needed, with a per-second rate limit and a daily token quota per network. A free token from token.llm7.io raises both — paste it as the key.'},
  /* Kilo's OpenRouter-compatible gateway serves its ":free" routes with no key at all (measured: 200 with
     an answer, streaming). It sends NO Access-Control-Allow-Origin, so a browser cannot call it directly —
     it goes through the bridge, and it only counts as available while the bridge is connected. */
  {id:'kilo',label:'Kilo Gateway — free models, no key (needs the bridge)',base:'https://api.kilo.ai/api/openrouter',key:'',on:true,
   viaBridge:true,anonymous:true,rpm:20,syncFilter:'(:free$|^kilo-auto/free$)',
   models:['kilo-auto/free','nvidia/nemotron-3.5-super-vl:free','poolside/laguna-s-2.1:free','nvidia/nemotron-3-ultra-550b-a55b:free','cohere/north-mini-code:free'],
   hint:'Free models through Kilo with no account. The gateway blocks browsers, so this runs through the local or cloud bridge.'},
  /* Free WITH a free key. CORS checked 27 Oct 2026 with a preflight from the app's origin: Hugging Face and
     Z.ai answer browsers; NVIDIA and SambaNova do not, so they go through the bridge. */
  {id:'hf',label:'Hugging Face — free monthly credit (token)',base:'https://router.huggingface.co/v1',key:'',on:false,viaBridge:false,freeTier:true,rpm:20,
   models:['openai/gpt-oss-120b','deepseek-ai/DeepSeek-V4.1-Flash','Qwen/Qwen3.8-27B','zai-org/GLM-5.3-Flash','moonshotai/Kimi-K3'],
   hint:'A free read token from huggingface.co/settings/tokens. Every account gets a small monthly credit across the inference providers.'},
  {id:'nvidia',label:'NVIDIA NIM — free developer key (≈40 req/min)',base:'https://integrate.api.nvidia.com/v1',key:'',on:false,viaBridge:true,freeTier:true,rpm:40,
   models:['deepseek-ai/deepseek-v4.1-flash','moonshotai/kimi-k2.6','nvidia/nemotron-3-ultra-550b-a55b','z-ai/glm-5.3','openai/gpt-oss-20b'],
   hint:'Free key at build.nvidia.com — for evaluation, about 40 requests a minute. Runs through the bridge (NVIDIA does not answer browsers).'},
  {id:'sambanova',label:'SambaNova Cloud — free key',base:'https://api.sambanova.ai/v1',key:'',on:false,viaBridge:true,freeTier:true,rpm:20,
   models:['gpt-oss-120b','DeepSeek-V3.2','Meta-Llama-3.3-70B-Instruct','MiniMax-M3.1-Flash','gemma-4-31B-it'],
   hint:'Free key at cloud.sambanova.ai. Very fast. Runs through the bridge.'},
  {id:'zaifree',label:'Z.ai — GLM Flash, free key',base:ZAI_GENERAL_BASE,key:'',on:false,viaBridge:false,freeTier:true,rpm:20,
   models:['glm-4.7-flash','glm-4.5-flash'],
   hint:'Free models on a free Z.ai key (z.ai) — GLM-4.7-Flash and GLM-4.5-Flash are priced at zero.'},
  /* Uncensored, honestly labelled: no API serves one for free today (Venice bills free accounts per token;
     OpenRouter's Dolphin "Venice edition" lost its :free route). These are the cheap paid ones. The free
     route for uncensored models is local — see Help → "Free and uncensored". */
  {id:'venice',label:'Venice — uncensored models (paid per token)',base:'https://api.venice.ai/api/v1',key:'',on:false,viaBridge:false,uncensored:true,
   models:['venice-uncensored-1-2','venice-uncensored-role-play'],
   hint:'Paid per token (about $0.20 in / $0.90 out per million for Venice Uncensored). Free accounts can call the API but are billed.'},
  {id:'moonshot',label:'Moonshot — Kimi',base:'https://api.moonshot.ai/v1',""")

# Sync: a no-key provider lists only what answers without a key (LLM7 marks paid rows; Kilo's free ids end in :free)
rep("""  p.synced=[...new Set(ids)];p.syncedAt=nowISO();p.syncError=null;
  saveProviders();rebuildProviderModels();""","""  const keep=syncKeep36(p,rows,ids);
  p.synced=[...new Set(keep)];p.syncedAt=nowISO();p.syncError=null;
  saveProviders();rebuildProviderModels();""")
rep("""  if(!quiet)toast(`${p.label}: ${ids.length} model(s) via ${route}`,3500);
  return{ok:true,count:ids.length,route};""","""  if(!quiet)toast(`${p.label}: ${keep.length} model(s) via ${route}`+(keep.length<ids.length?` (${ids.length-keep.length} need a key)`:''),3500);
  return{ok:true,count:keep.length,route};""")
# An anonymous provider behind the bridge can only answer while the bridge is up.
rep("""  const p=(S.providers||[]).find(x=>x&&x.id===head);
  if(p)return !!(p.on&&(p.key||p.anonymous));""","""  const p=(S.providers||[]).find(x=>x&&x.id===head);
  if(p)return !!(p.on&&(p.key||(p.anonymous&&!(p.viaBridge&&!(S.bridge!=null?S.bridge:bridgeUp36())))));""")
rep("""  return (p&&p.on&&(p.key||p.anonymous))?p:null;
}""","""  return (p&&p.on&&(p.key||(p.anonymous&&!(p.viaBridge&&!bridgeUp36()))))?p:null;
}""")
rep("""const FREE_PREFER=['openai','gpt-oss-20b',""","""const FREE_PREFER=['openai','gpt-oss-20b','gpt-oss:20b','kilo-auto/free',""")
rep(""" :'<b>No free model can run</b> — switch on the OVHcloud no-key provider below, or connect Ollama.')""",
    """ :'<b>No free model can run</b> — switch on OVHcloud or LLM7 (no key) below, or connect Ollama.')""")
# Help: the honest map of free and uncensored options
rep("""    {q:'Is my key safe here?',""","""    {q:'Free with no key at all',
     a:`<p>Four providers answer with no account. Each is rate limited per network, and the app falls through
        to the next one when one says no.</p>
        <ul><li><b>OVHcloud</b> — about 2 requests a minute per model.</li>
        <li><b>LLM7</b> — several open models, streams; a free token from token.llm7.io raises the limit.</li>
        <li><b>Pollinations</b> — three models, answers arrive whole; a small hourly allowance.</li>
        <li><b>Kilo Gateway</b> — its <code>:free</code> models; needs the bridge because it blocks browsers.</li></ul>
        <p>With a free sign-up key: Groq, Cerebras, Mistral, Google AI Studio, Hugging Face, NVIDIA NIM,
        SambaNova and Z.ai GLM Flash — all in Settings → Providers.</p>`},
    {q:'Free and uncensored',
     a:`<p>No hosted API serves an uncensored model for free at the moment — the ones advertised as free either
        bill free accounts (Venice) or lost their free route (OpenRouter's Dolphin "Venice edition"). The free
        and private way is a small local model through Ollama:</p>
        <ul><li><code>ollama pull dolphin3:8b</code></li>
        <li><code>ollama pull huihui_ai/qwen3-abliterated:8b</code></li>
        <li><code>ollama pull huihui_ai/gemma3-abliterated:4b</code> — for laptops with less memory</li></ul>
        <p>They appear in the Local tab once pulled. Paid and cheap: the Venice provider, or
        <code>cognitivecomputations/dolphin-mistral-24b-venice-edition</code> with an OpenRouter key.</p>`},
    {q:'Is my key safe here?',""")
# exports + cases for the provider rules
rep("storageJunkSweep,shellMode36,","storageJunkSweep,syncKeep36,shellMode36,")
rep("""  /* ── pass 36: shell, icons, contrast, clamping ── */""","""  /* ── pass 36: free providers ── */
  add({id:'nokey-sync-keeps-free',sub:'providers',uses:['syncKeep36'],
    what:'a no-key provider keeps only the models that answer without a key (LLM7 tiers, Kilo :free ids)',
    run:()=>{const l=g.syncKeep36({anonymous:true,key:''},[{id:'a',usage_based_only:false},{id:'b',usage_based_only:true}],['a','b']);
      const k=g.syncKeep36({anonymous:true,key:'',syncFilter:'(:free$|^kilo-auto/free$)'},[],['x/y:free','x/z','kilo-auto/free']);
      return l.join()+'|'+k.join();},
    expect:v=>v==='a|x/y:free,kilo-auto/free',
    antiWhat:'and with a key in, nothing is filtered',
    anti:()=>g.syncKeep36({anonymous:true,key:'k',syncFilter:':free$'},[{id:'b',usage_based_only:true}],['b','x/z']).join(),antiExpect:v=>v==='b,x/z'});
  add({id:'bridge-only-free-needs-bridge',sub:'providers',uses:['modelRunnable'],
    what:'a no-key provider that blocks browsers counts as runnable only while the bridge is connected',
    run:()=>{const P=[{id:'kilo',on:true,anonymous:true,viaBridge:true,key:''}];
      return g.modelRunnable('kilo/x',{providers:P,bridge:false})+','+g.modelRunnable('kilo/x',{providers:P,bridge:true});},
    expect:v=>v==='false,true',
    antiWhat:'and a browser-friendly no-key provider runs without one',
    anti:()=>g.modelRunnable('llm7/x',{providers:[{id:'llm7',on:true,anonymous:true,viaBridge:false,key:''}],bridge:false}),antiExpect:v=>v===true});

  /* ── pass 36: shell, icons, contrast, clamping ── */""")
rep("""  {id:'shell-always-classic',""","""  {id:'sync-keeps-paid',export:'syncKeep36',why:'no-key providers list models that refuse without a key',broken:()=>(p,r,ids)=>ids},
  {id:'shell-always-classic',""")
rep("storageJunkSweep,syncKeep36,","storageJunkSweep,syncKeep36,gauntletSabotageAsync,")
# ── Specs tab (Spec Kit + Beads) and the web reader tool ──
rep("""    <button class="tab" data-view="harnesshub">🤝 Harness Hub</button>""","""    <button class="tab" data-view="specs">📐 Specs</button>
    <button class="tab" data-view="harnesshub">🤝 Harness Hub</button>""")
rep("""    <section class="view" id="view-harnesshub"><div class="wrap"><div id="hh-panel"></div></div></section>""","""    <section class="view" id="view-specs"><div class="wrap"><div id="specs-panel"></div></div></section>
    <section class="view" id="view-harnesshub"><div class="wrap"><div id="hh-panel"></div></div></section>""")
rep("""   views:['factory','forge','library','handoff','harnesshub','launch','webos','connect']},""","""   views:['factory','forge','library','specs','handoff','harnesshub','launch','webos','connect']},""")
rep("""   core:['studio','relay'],           more:['launch','webos','design','devices','handoff']},""","""   core:['studio','relay'],           more:['specs','launch','webos','design','devices','handoff']},""")
rep("""  if(view==='harnesshub')panelGuard(view,()=>hhRender());""","""  if(view==='harnesshub')panelGuard(view,()=>hhRender());
  if(view==='specs')panelGuard(view,()=>specsRender());""")
rep("""  /* First registration wins. Two sources advertising the same name is a real possibility once MCP""","""  if(typeof READER36!=='undefined'&&READER36.on)
    out.push({name:'read_web_page',description:'Read a public web page as clean Markdown (title, text, links) — far fewer tokens than raw HTML. '+
      'Input: {"url":"https://…"}.',schema:{type:'object',properties:{url:{type:'string'}},required:['url']},source:'reader'});
  /* First registration wins. Two sources advertising the same name is a real possibility once MCP""")
rep("""    else if(spec.source==='ocr')     result=await ocrToolCall(name,args||{});""","""    else if(spec.source==='reader')  result=await readerFetch((args||{}).url);
    else if(spec.source==='ocr')     result=await ocrToolCall(name,args||{});""")
rep("""  items.push({kind:'action',title:'Toggle light / dark',sub:'Appearance',""","""  items.push({kind:'action',title:'Web reader tool for agents: '+(READER36.on?'on — turn off':'off — turn on'),sub:'Tools',
    run:()=>{READER36.on=!READER36.on;store.set('reader36',{on:READER36.on});toast('Web reader tool '+(READER36.on?'on':'off'),2400);}});
  items.push({kind:'action',title:'Toggle light / dark',sub:'Appearance',""")
rep("storageJunkSweep,syncKeep36,","storageJunkSweep,syncKeep36,specParseTasks,specReady,specCycles,specJsonl,specHandoff,readerUrlOk,")
rep("""  /* ── pass 36: free providers ── */""",r"""  /* ── pass 36: Specs (Spec Kit + Beads) and the web reader ── */
  add({id:'spec-tasks-normalised',sub:'specs',uses:['specParseTasks'],
    what:'a model task list is cleaned: unique ids, no self or unknown dependencies, JSON found inside prose',
    run:()=>{const t=g.specParseTasks('Here you go: [{"id":"T1","title":"a","deps":["T1","T9"]},{"id":"T1","title":"b","deps":["T1"]}] thanks');
      return t.map(x=>x.id+':'+x.deps.join('+')).join(',');},
    expect:v=>v==='T1:,T1b:T1',
    antiWhat:'and text with no list in it yields no tasks rather than an invented one',
    anti:()=>g.specParseTasks('I could not do that.').length,antiExpect:v=>v===0});
  add({id:'spec-ready-queue',sub:'specs',uses:['specReady','specCycles'],
    what:'ready = open tasks whose dependencies are done; a dependency cycle is reported and never ready',
    run:()=>{const T=[{id:'A',deps:[],status:'done'},{id:'B',deps:['A'],status:'open'},{id:'C',deps:['B'],status:'open'},
      {id:'X',deps:['Y'],status:'open'},{id:'Y',deps:['X'],status:'open'}];
      return g.specReady(T).map(t=>t.id).join()+'|'+g.specCycles(T).sort().join();},
    expect:v=>v==='B|X,Y',
    antiWhat:'and with every dependency done, the blocked task becomes ready',
    anti:()=>g.specReady([{id:'A',deps:[],status:'done'},{id:'B',deps:['A'],status:'done'},{id:'C',deps:['B'],status:'open'}]).map(t=>t.id).join(),antiExpect:v=>v==='C'});
  add({id:'spec-beads-export',sub:'specs',uses:['specJsonl','specHandoff'],
    what:'the Beads export is one JSON issue per line with blocking dependencies, and a hand-off names exactly one task',
    run:()=>{const it={slug:'login',title:'Login',spec:'S',plan:'P',tasks:[{id:'T1',title:'a',detail:'',deps:[],status:'done'},{id:'T2',title:'b',detail:'d',deps:['T1'],status:'open'}]};
      const l=g.specJsonl(it).split('\n').map(x=>JSON.parse(x));
      const h=g.specHandoff('C',it,it.tasks[1]);
      return [l.length,l[0].status,l[1].dependencies[0].depends_on_id,/# Task T2: b/.test(h),/T1 a/.test(h)].join(',');},
    expect:v=>v==='2,closed,login-T1,true,true',
    antiWhat:'and an item with no tasks exports nothing',
    anti:()=>g.specJsonl({slug:'x',tasks:[]}),antiExpect:v=>v===''});
  add({id:'reader-public-only',sub:'tools',uses:['readerUrlOk','toolCatalog'],
    what:'the web reader takes only public http(s) pages, and agents see it as a tool',
    run:()=>[g.readerUrlOk('https://example.com/a'),g.toolCatalog().some(t=>t.name==='read_web_page'&&t.source==='reader')].join(','),
    expect:v=>v==='true,true',
    antiWhat:'and local or private addresses are never handed to a third party',
    anti:()=>['http://localhost:3000','http://127.0.0.1','http://192.168.1.4','http://10.0.0.2','file:///etc/passwd','http://[::1]/','http://printer.local'].filter(g.readerUrlOk).length,antiExpect:v=>v===0});

  /* ── pass 36: free providers ── */""")
rep("""  {id:'sync-keeps-paid',""","""  {id:'spec-parse-raw',export:'specParseTasks',why:'self-dependencies and duplicate ids survive into the task list',broken:()=>x=>Array.isArray(x)?x:JSON.parse((String(x).match(/\\[[\\s\\S]*\\]/)||['[]'])[0]).map(t=>Object.assign({status:'open',deps:[]},t))},
  {id:'spec-ready-all',export:'specReady',why:'blocked tasks are offered as ready',broken:()=>T=>(T||[]).filter(t=>t.status!=='done')},
  {id:'spec-jsonl-flat',export:'specJsonl',why:'the Beads export drops dependencies',broken:()=>it=>(it.tasks||[]).map(t=>JSON.stringify({id:t.id,title:t.title,status:'open',dependencies:[]})).join('\\n')},
  {id:'reader-any-url',export:'readerUrlOk',why:'local and private addresses are sent to the reader service',broken:()=>()=>true},
  {id:'sync-keeps-paid',""")
