/* ═══════════════════ PASS 40 — CHAT, FORGE-GRADE ═══════════════════
   The Assistant shows everything a turn actually did, the way the DeepSeek Forge harness does, using what this
   app already measures (usage, cache, free-route and fallback swaps, citations, tool results were all recorded
   by streamChat and then thrown away by the chat, which printed only the cost):
     · a turn that used tools opens with "Worked for 12s · 3 steps" and folds its steps away once it is done
     · reasoning streams live as "Thinking… 4s" and closes into "Thought for 9s · 1.2k tokens"
     · every tool call is a card: status, name, what it was asked, and its arguments and result on demand
     · the footer: copy, retry, fork, read aloud, save to Brain, details — then provider · model · route,
       time, time to first token, tokens in / out / thinking / cached, cost, and anything unusual (cache hit,
       free-route swap, fallback, loop recovered, cut off)
     · above the composer, the status of the whole chat: model, mode, tools, web, context used, totals
     · a composer that grows as you type, takes attachments, has quick switches, and one Send that turns into Stop
   UI state (what is open) lives in WeakMaps keyed on the message, so a re-render on every token keeps it. */
const T40={open:new WeakMap(),think:new WeakMap(),tool:new WeakMap(),info:new WeakMap(),explain:new WeakMap(),
  stick:true,ctx:[],q:'',rec:null};
const num40=(...v)=>{for(const x of v){const n=+x;if(x!=null&&x!==''&&Number.isFinite(n))return n;}return 0;};
/* PURE. One completion's accounting, from whichever shape the provider sent (OpenAI, Anthropic, OpenRouter). */
function turn40Meta(acc,requested){
  const a=acc||{},u=a.usage||{},cd=u.completion_tokens_details||{},pd=u.prompt_tokens_details||{};
  return{model:String(a.freeModel||a.model||requested||''),requested:String(requested||''),
    tin:num40(u.prompt_tokens,u.input_tokens),tout:num40(u.completion_tokens,u.output_tokens),
    tthink:num40(cd.reasoning_tokens,u.reasoning_tokens),tcache:num40(pd.cached_tokens,u.cache_read_input_tokens),
    ttft:a.ttft!=null&&a.ttft!==''?Math.round(+a.ttft):null,ms:Math.round(+a.elapsed||0),
    finish:String(a.finishReason||''),cached:!!a.cached,semantic:!!a.semanticHit,local:!!a.local,
    freeFrom:String(a.freeFrom||''),fellBack:String(a.fellBackFrom||''),recovered:!!a.recoveredFromLoop,
    truncated:!!a.stillTruncated,cost:a.cost!=null&&a.cost!==''?+a.cost:null,
    cites:(typeof citationsOf==='function'?citationsOf(a):[]).slice(0,12),rounds:1,est:false};
}
/* Some providers stream no usage at all. Then the footer shows an estimate from characters (≈, four per token),
   never a blank that reads as "free of tokens" and never a number presented as measured. */
function turn40Estimate(x,acc){
  if(!x||x.tin||x.tout)return x;
  const a=acc||{},th=String((typeof thoughtOf==='function'?thoughtOf(a):a.reasoning)||''),out=String(a.content||'');
  if(!out&&!th)return x;
  return Object.assign({},x,{est:true,tin:Math.round((+a.ctxChars||0)/4),tout:Math.round((out.length+th.length)/4),tthink:Math.round(th.length/4)});
}
/* PURE. Two rounds of one turn added together — a tool loop is several completions, one answer. */
function turn40Merge(a,b){
  if(!a)return b||null;if(!b)return a;
  const seen=new Set((a.cites||[]).map(c=>c.url));
  return Object.assign({},a,{model:b.model||a.model,tin:a.tin+b.tin,tout:a.tout+b.tout,tthink:a.tthink+b.tthink,
    tcache:a.tcache+b.tcache,ms:a.ms+b.ms,est:!!(a.est||b.est),finish:b.finish||a.finish,cached:a.cached&&b.cached,semantic:a.semantic&&b.semantic,
    truncated:b.truncated,recovered:a.recovered||b.recovered,fellBack:a.fellBack||b.fellBack,freeFrom:a.freeFrom||b.freeFrom,
    cost:a.cost==null&&b.cost==null?null:(a.cost||0)+(b.cost||0),
    cites:(a.cites||[]).concat((b.cites||[]).filter(c=>!seen.has(c.url))).slice(0,12),rounds:a.rounds+b.rounds});
}
function fmtTok40(n){n=+n||0;return n<1000?String(n):n<10000?(n/1000).toFixed(1).replace(/\.0$/,'')+'k':n<1e6?Math.round(n/1000)+'k':(n/1e6).toFixed(1)+'M';}
function fmtDur40(ms){ms=Math.max(0,+ms||0);if(ms<10000)return (ms/1000).toFixed(1).replace(/\.0$/,'')+'s';
  if(ms<60000)return Math.round(ms/1000)+'s';const m=Math.floor(ms/60000),s=Math.round((ms%60000)/1000);return m+'m'+(s?' '+s+'s':'');}
/* PURE. A tool card's state from either the new record or the old {ok,note} shape. */
function tool40Status(t){
  if(!t)return'err';if(t.status)return t.status;
  if(/declined/i.test(t.name||''))return'declined';if(/blocked/i.test(t.note||''))return'blocked';
  return t.ok?'ok':'err';
}
/* PURE. The header of a turn that did work. */
function turn40Summary(m,now){
  const n=(m.tools||[]).length;if(!n)return '';
  const t1=m.streaming?(now||Date.now()):(m.t1||m.t0||0),dur=m.t0?t1-m.t0:0;
  return (m.streaming?'Working':'Worked')+(dur?' for '+fmtDur40(dur):'')+' · '+n+' step'+(n===1?'':'s');
}
/* PURE. "Thinking… 4s" while it streams, "Thought for 9s · 1.2k tokens" once the answer starts. */
function think40Label(m,now){
  if(!m||!String(m.reasoning||'').trim())return '';
  const done=!m.streaming||!!String(m.content||'').trim();
  const t0=m.th0||m.t0,t1=done?(m.th1||m.t1||now||Date.now()):(now||Date.now());
  const secs=t0?Math.max(1,Math.round((t1-t0)/1000)):0;
  const tok=m.meta&&m.meta.tthink?' · '+fmtTok40(m.meta.tthink)+' tokens':'';
  return done?(secs?'Thought for '+secs+'s':'Thought')+tok:'Thinking…'+(secs?' '+secs+'s':'');
}
/* PURE. Totals for the chat, for the status strip. */
function chatTotals40(c){
  const t={tin:0,tout:0,tthink:0,turns:0,cost:+((c&&c.cost)||0)};
  ((c&&c.msgs)||[]).forEach(m=>{if(m.role!=='assistant')return;t.turns++;const x=m.meta;if(!x)return;t.tin+=x.tin||0;t.tout+=x.tout||0;t.tthink+=x.tthink||0;});
  return t;
}
/* PURE. The block that carries attachments into the prompt. */
function att40Block(list){
  return (list||[]).filter(a=>a&&a.name).map(a=>'### Attached: '+a.name+'\n```\n'+String(a.text||'').slice(0,30000)+'\n```').join('\n\n');
}
/* PURE. Route flags worth seeing next to the answer. */
function route40(x){
  if(!x)return[];const f=[];
  if(x.cached)f.push(x.semantic?'similar-prompt cache':'cache hit');
  if(x.freeFrom)f.push('free route');
  if(x.fellBack)f.push('fallback from '+String(x.fellBack).split('/').pop());
  if(x.recovered)f.push('loop recovered');
  if(x.truncated)f.push('cut off');else if(x.rounds>1)f.push(x.rounds+' rounds');
  return f;
}
function prov40(model,x){
  const id=String(model||''),head=id.split('/')[0];
  if((x&&x.local)||/^(ollama|lmstudio|llamacpp|mlxs|locals|osaurus)$/i.test(head))return 'Local';
  const p=typeof providerById==='function'?providerById(head):null;
  return String((p&&(p.label||p.name))||(id.includes('/')?'OpenRouter':'')).split(/\s+[—–(]/)[0];
}
const short40=m=>String(m||'').split('/').pop();

/* ── Rendering ─────────────────────────────────────────────────────────── */
function tool40HTML(t,k){
  const st=tool40Status(t),open=T40.tool.get(t);
  const ico={ok:'check',err:'x',blocked:'shield-alert',declined:'x',run:'loader-circle'}[st]||'circle-alert';
  const j=v=>{try{return typeof v==='string'?v:JSON.stringify(v,null,2);}catch(_){return String(v);}};
  const has=t.args!=null||t.result!=null;
  const body=open&&has?`<div class="t40-tb">${t.args!=null?`<div class="t40-lbl">Arguments</div><pre>${esc(j(t.args).slice(0,4000))}</pre>`:''}${
    t.result!=null?`<div class="t40-lbl">Result</div><pre>${esc(j(t.result).slice(0,6000))}</pre>`:''}</div>`:'';
  return `<div class="t40-tool st-${st}${open?' open':''}">
    <button type="button" class="t40-th" data-t40tool="${k}"${has?` aria-expanded="${open?'true':'false'}"`:' tabindex="-1"'}>
      <span class="t40-st">${ic40(ico,st==='run'?'spin40':'')}</span><span class="t40-nm">${esc(t.name||'step')}</span>
      <span class="t40-sm">${esc(String(t.note||'').slice(0,160))}</span>${t.injection?'<span class="t40-warn" title="The result contained text shaped like instructions; it was treated as data">instructions in result</span>':''}${
      t.ms?`<span class="t40-ms">${fmtDur40(t.ms)}</span>`:''}${has?ic40('chevron-down','t40-chev'):''}</button>${body}</div>`;
}
function meta40HTML(m){
  const x=m.meta||null,bits=[];
  const model=(x&&x.model)||m.model||'';
  if(model||x){const pv=prov40(model,x);bits.push(`<span class="t40-chip strong" title="provider · model${x&&x.requested&&x.requested!==model?' (asked for '+esc(x.requested)+')':''}">${ic40('cpu')}${esc([pv,short40(model)].filter(Boolean).join(' · ')||'model')}</span>`);}
  route40(x).forEach(f=>bits.push(`<span class="t40-chip${/fallback|cut off|loop/.test(f)?' flag':''}">${esc(f)}</span>`));
  const dur=m.t0&&m.t1?m.t1-m.t0:(x&&x.ms)||m.ms||0;
  if(dur)bits.push(`<span class="t40-chip" title="total time">${ic40('clock')}${fmtDur40(dur)}${x&&x.ttft!=null&&x.ttft>0?` <i>· first token ${x.ttft<1000?x.ttft+'ms':fmtDur40(x.ttft)}</i>`:''}</span>`);
  if(x&&(x.tin||x.tout))bits.push(`<span class="t40-chip" title="${x.est?'estimated from characters — the provider sent no token counts':'tokens in / out'}">${ic40('layers')}${x.est?'≈ ':''}${fmtTok40(x.tin)} in · ${fmtTok40(x.tout)} out${x.tthink?` <i>· ${fmtTok40(x.tthink)} thinking</i>`:''}${x.tcache?` <i>· ${fmtTok40(x.tcache)} cached</i>`:''}</span>`);
  const cost=m.cost!=null?m.cost:x&&x.cost;
  if(cost!=null&&(cost>0||x))bits.push(`<span class="t40-chip" title="cost">${ic40('coins')}${cost>0?money(cost):'free'}</span>`);
  return bits.length?`<div class="t40-meta">${bits.join('')}</div>`:'';
}
function info40HTML(m){
  const x=m.meta||{},row=(k,v)=>v===''||v==null?'':`<tr><th>${esc(k)}</th><td>${v}</td></tr>`;
  return `<table class="t40-info">${row('Provider',esc(prov40(x.model||m.model,x)))}${row('Model',esc(x.model||m.model||''))}${
    x.requested&&x.requested!==x.model?row('Asked for',esc(x.requested)):''}${row('Mode',esc(m.mode||''))}${
    row('Finish',esc(x.finish||''))}${row('Rounds',x.rounds||'')}${row('Time',m.t0&&m.t1?fmtDur40(m.t1-m.t0):'')}${
    row('First token',x.ttft!=null&&x.ttft>0?x.ttft+' ms':'')}${row('Thinking',m.th0&&m.th1?fmtDur40(m.th1-m.th0):'')}${
    row('Tokens in',x.tin?(x.est?'≈ ':'')+x.tin.toLocaleString():'')}${row('Tokens out',x.tout?(x.est?'≈ ':'')+x.tout.toLocaleString():'')}${
    row('Thinking tokens',x.tthink?x.tthink.toLocaleString():'')}${row('Cached tokens',x.tcache?x.tcache.toLocaleString():'')}${
    row('Cost',m.cost!=null?money(m.cost):x.cost!=null?money(x.cost):'')}${row('Route',esc(route40(x).join(', ')))}${
    row('Steps',(m.tools||[]).length||'')}</table>`;
}
function cites40HTML(x){
  const c=(x&&x.cites)||[];if(!c.length)return '';
  return `<div class="t40-cites"><span class="t40-lbl">${ic40('link')}Sources</span>${c.map((s,i)=>{
    let host='';try{host=new URL(s.url).hostname.replace(/^www\./,'');}catch(_){}
    return `<a class="t40-cite" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.title||s.url)}"><b>${i+1}</b>${esc(host||s.title||'source')}</a>`;}).join('')}</div>`;
}
function turn40HTML(m,i){
  if(typeof i!=='number'){const c=achat();i=c?c.msgs.indexOf(m):-1;}
  const idx=i>=0?i:'';
  if(m.role==='user'){
    const shown=m.shown!=null?m.shown:m.content;
    return `<div class="am user t40u" data-t40u="${idx}">${m.att&&m.att.length?`<div class="t40-att">${ic40('paperclip')}${m.att.map(esc).join(', ')}</div>`:''}
      <div class="am-body">${esc(shown)}</div>
      ${i>=0?`<div class="t40-uact"><button type="button" data-t40copy="${i}" aria-label="Copy message" title="Copy">${ic40('copy')}</button><button type="button" data-rewind38="${i}" aria-label="Edit and resend" title="Edit and resend (the full chat is kept as a copy)">${ic40('pencil')}</button><button type="button" data-fork="${i}" aria-label="Fork from here" title="Copy this chat up to here into a new one">${ic40('git-fork')}</button></div>`:''}</div>`;
  }
  const c=achat(),last=c&&i===c.msgs.length-1;
  const now=Date.now(),tools=m.tools||[];
  const openSteps=T40.open.has(m)?T40.open.get(m):!!m.streaming;
  const steps=tools.length?`<button type="button" class="t40-wk${openSteps?' open':''}" data-t40steps="${idx}" aria-expanded="${openSteps?'true':'false'}">${
      m.streaming?ic40('loader-circle','spin40'):ic40('wrench')}<span>${esc(turn40Summary(m,now))}</span><i></i>${ic40('chevron-down','t40-chev')}</button>
    <div class="t40-steps"${openSteps?'':' hidden'}>${tools.map((t,k)=>tool40HTML(t,idx+':'+k)).join('')}</div>`:'';
  const tl=ASST.showThinking?think40Label(m,now):'';
  const thinkDone=!m.streaming||!!String(m.content||'').trim();
  const openThink=T40.think.has(m)?T40.think.get(m):!thinkDone;
  const think=tl?`<div class="t40-think${thinkDone?'':' live'}"><button type="button" class="t40-ts" data-t40think="${idx}" aria-expanded="${openThink?'true':'false'}">${
      ic40('atom',thinkDone?'':'spin40')}<span>${esc(m.bot?m.bot.name+' · '+tl:tl)}</span>${ic40('chevron-down','t40-chev')}</button>${
      openThink?`<div class="t40-tt">${esc(m.reasoning)}</div>`:''}</div>`:'';
  const typing=m.streaming&&!String(m.content||'').trim()&&!tl?'<div class="t40-typing" aria-label="Working"><i></i><i></i><i></i></div>':'';
  const err=m.error?`<div class="t40-err">${ic40('circle-alert')}<span>${esc(m.error)}</span>${last&&!m.streaming?`<button type="button" class="btn small" data-t40retry="${i}">${ic40('rotate-ccw')}Retry</button>`:''}</div>`:'';
  const head=m.bot?`<div class="bt-head"><span class="bt-face">${botSprite(m.bot.avatar||m.bot.name,30)}</span><b>${esc(m.bot.name)}</b><i>${esc(m.bot.role||'')}</i>${
    m.fellBack?'<span class="tag warn" title="First choice did not answer">fallback</span>':''}</div>`:'';
  if(!m.streaming&&m.content&&!m._offers)m._offers=asstArtifacts(m.content);
  const ex=T40.explain.get(m)?' explain-open':'',info=T40.info.get(m);
  const act=(k,ico,label,extra)=>`<button type="button" ${k}="${i}" aria-label="${label}" title="${label}"${extra||''}>${ic40(ico)}</button>`;
  const foot=m.streaming?'':`<div class="t40-foot"><div class="t40-act">${m.content?act('data-t40copy','copy','Copy'):''}${
      last?act('data-t40retry','rotate-ccw','Retry'):''}${i>=0?act('data-fork','git-fork','Fork from here'):''}${
      m.content&&'speechSynthesis' in window?act('data-t40speak','volume-2','Read aloud'):''}${
      m.content?act('data-t40brain','brain','Save to Brain'):''}${m.content?act('data-t40explain','lightbulb','Explain it another way',` aria-pressed="${ex?'true':'false'}"`):''}${
      act('data-t40info','info','Details',` aria-expanded="${info?'true':'false'}"`)}${m.runId?`<a href="#" data-botrun="${esc(m.runId)}" class="t40-audit">audit</a>`:''}</div>${meta40HTML(m)}${info?info40HTML(m):''}</div>`;
  return `<div class="am asst t40${m.streaming?' streaming':''}${m.bot?' bot-turn':''}${ex}" data-t40i="${idx}">${head}${steps}${think}${typing}${err}
    ${asstBodyHTML(m)}${asstOfferHTML(m)}${cites40HTML(m.meta)}${foot}</div>`;
}
/* Timing, kept by whichever path streams: first reasoning, first answer text after it. */
function turn40Tick(m){
  if(!m||m.role!=='assistant')return;
  if(!m.t0)m.t0=Date.now();
  if(!m.th0&&String(m.reasoning||'').trim())m.th0=Date.now();
  if(m.th0&&!m.th1&&String(m.content||'').trim())m.th1=Date.now();
  if(!m.streaming&&!m.t1)m.t1=Date.now();
}
function turn40Rerender(i){
  const c=achat(),th=$('#asst-thread');if(!c||!th)return;const m=c.msgs[+i];if(!m)return;
  const n=th.querySelector(`[data-t40i="${+i}"]`);if(!n)return;
  n.outerHTML=turn40HTML(m,+i);try{genuiHydrate(th.querySelector(`[data-t40i="${+i}"]`));}catch(_){}
}

/* ── Empty state ───────────────────────────────────────────────────────── */
const SUGG40=[
  {ic:'lightbulb',t:'Explain something',s:'clearly, with a worked example',p:'Explain how attention in a transformer works, with a tiny worked example I can follow by hand.'},
  {ic:'code',t:'Write and check code',s:'with tests and edge cases',p:'Write a JavaScript function that debounces another function, with tests for the edge cases.'},
  {ic:'globe',t:'Research with sources',s:'and say what is uncertain',p:'What changed in web browsers this year that matters to people building web apps? Cite sources.',web:true},
  {ic:'list-checks',t:'Plan a project',s:'in steps you can start today',p:'Plan a weekend project: a habit tracker web app. Give me the steps, smallest first.'},
  {ic:'file-text',t:'Draft a document',s:'that you can open in Office',p:'Draft a one-page project brief for a small team building a mobile app: goal, scope, risks, timeline.'},
  {ic:'sparkles',t:'Show it, do not tell it',s:'an interactive explanation',p:'Show me how compound interest grows with an interactive chart I can adjust.'},
];
function empty40HTML(){
  const md=asstMode(),cfg=asstCfg(),pv=prov40(cfg.model);
  const conn=(typeof API_KEY!=='undefined'&&API_KEY)||providerFor(cfg.model)||pv==='Local'
    ?`Connected · <b>${esc([pv,short40(cfg.model)].filter(Boolean).join(' · '))}</b>`
    :`No key yet · the free no-key models answer, or add a key in <a href="#" data-t40go="settings">Settings</a>`;
  return `<div class="t40-empty"><div class="t40-mark">${ic40('message-circle')}</div>
    <h2>${esc(md.label==='Chat'?'What can I help with?':md.label)}</h2>
    <p class="help">${esc(md.blurb)} — with this app's models, connectors, MCP tools, skills and Brain already wired in.</p>
    <p class="t40-conn">${conn}</p>
    <div class="t40-sugg">${SUGG40.map((s,k)=>`<button type="button" data-t40sugg="${k}">${ic40(s.ic)}<span><b>${esc(s.t)}</b><small>${esc(s.s)}</small></span></button>`).join('')}</div></div>`;
}

/* ── Chat list: search, time, model, cost ──────────────────────────────── */
function ago40(iso){const t=Date.parse(iso||'');if(!t)return '';const s=(Date.now()-t)/1000;
  return s<60?'now':s<3600?Math.round(s/60)+'m':s<86400?Math.round(s/3600)+'h':s<604800?Math.round(s/86400)+'d':new Date(t).toLocaleDateString();}
/* PURE. Chats matching a query by title or by anything said in them. */
function chatFind40(list,q){
  const w=String(q||'').toLowerCase().trim().split(/\s+/).filter(Boolean);if(!w.length)return (list||[]).slice();
  return (list||[]).filter(c=>{const hay=((c.title||'')+' '+(c.msgs||[]).map(m=>typeof m.content==='string'?m.content:'').join(' ')).toLowerCase();return w.every(x=>hay.includes(x));});
}
function chatList40HTML(){
  const list=chatFind40(achatOrder38(ACHATS),T40.q);
  return list.map(x=>{const lm=(x.msgs||[])[x.msgs.length-1];
    return `<button class="asst-chat ${x.id===ACHAT?'on':''}" data-id="${x.id}">
      <span>${x.pinned?ic40('pin','t40-pin'):''}${esc(x.title)}</span><small>${esc(x.mode||'chat')}${x.model?' · '+esc(short40(x.model)):''}${x.cost?' · '+money(x.cost):''}${lm&&lm.ts?' · '+ago40(lm.ts):''}</small></button>`;}).join('')
    ||`<p class="help" style="padding:8px">${T40.q?'No chat matches “'+esc(T40.q)+'”.':'No chats yet.'}</p>`;
}

/* ── Status strip ──────────────────────────────────────────────────────── */
function status40HTML(){
  const c=achat(),cfg=asstCfg(),md=asstMode();
  const hist=((c&&c.msgs)||[]).slice(-cfg.history);
  let sys=0;try{sys=String(asstSystem()||'').length;}catch(_){}
  const u=contextUtilization(msgChars(hist)+sys,cfg.model),tt=chatTotals40(c);
  const pct=Math.min(100,Math.round(u.pct*100));
  const per=(ASST.perMode&&ASST.perMode[ASST.mode])||{};
  return `<button type="button" class="t40-chip strong" data-t40s="model" title="Model for this mode — change it in settings">${ic40('cpu')}${esc(short40(cfg.model)||'model')}</button>
    <button type="button" class="t40-chip" data-t40s="mode" title="Mode">${ic40('layers')}${esc(md.label)}</button>
    <button type="button" class="t40-chip${ASST.auto?' on':''}" data-t40s="tools" aria-pressed="${ASST.auto?'true':'false'}" title="${ASST.auto?'Tools run without asking':'Every tool call asks first'}">${ic40('wrench')}Tools ${ASST.auto?'auto':'ask'}</button>
    <button type="button" class="t40-chip${cfg.web?' on':''}" data-t40s="web" aria-pressed="${cfg.web?'true':'false'}" title="Search the web for this mode">${ic40('globe')}Web ${cfg.web?'on':'off'}</button>
    <button type="button" class="t40-chip${cfg.effort?' on':''}" data-t40s="think" title="Thinking effort (models that support it)">${ic40('atom')}Think ${esc(per.effort&&MOA_EFFORTS.indexOf(per.effort)>0?per.effort:'off')}</button>
    <span class="t40-chip ctx-${u.state}" title="${esc(u.advice)}">${ic40('gauge')}<span class="t40-bar"><i style="width:${Math.max(2,pct)}%"></i></span>${pct}% · ${fmtTok40(u.tokens)} / ${fmtTok40(u.window)}</span>
    ${tt.tin||tt.tout||tt.cost?`<span class="t40-chip" title="This chat so far">${ic40('coins')}${fmtTok40(tt.tin+tt.tout)} tokens · ${tt.cost?money(tt.cost):'free'}</span>`:''}`;
}
function status40Render(){const el=$('#asst-status40');if(el)el.innerHTML=status40HTML();}

/* ── Composer ──────────────────────────────────────────────────────────── */
function ctx40Render(){
  const bar=$('#asst-ctx40');if(!bar)return;
  bar.innerHTML=T40.ctx.map((a,k)=>`<span class="t40-ctxchip">${ic40('paperclip')}${esc(a.name)}<small>${fmtTok40(Math.round(String(a.text||'').length/4))} tok</small><button type="button" data-t40unatt="${k}" aria-label="Remove ${esc(a.name)}">${ic40('x')}</button></span>`).join('');
  bar.hidden=!T40.ctx.length;send40Sync();
}
function send40Sync(){
  const b=$('#asst-send'),inp=$('#asst-input');if(!b)return;
  const run=!!(ASST_ABORT&&!ASST_ABORT.signal.aborted&&(achat()||{msgs:[]}).msgs.some(m=>m.streaming));
  b.classList.toggle('stop',run);b.innerHTML=run?ic40('square'):ic40('arrow-up');
  b.setAttribute('aria-label',run?'Stop':'Send');b.title=run?'Stop':'Send';
  b.disabled=!run&&!(inp&&inp.value.trim())&&!T40.ctx.length;
}
function grow40(){const t=$('#asst-input');if(!t)return;t.style.height='auto';t.style.height=Math.min(Math.round(innerHeight*0.34),Math.max(44,t.scrollHeight))+'px';send40Sync();}
async function send40(){
  const inp=$('#asst-input');if(!inp)return;
  const text=inp.value.trim();if(!text&&!T40.ctx.length)return;
  const att=T40.ctx.slice();T40.ctx=[];ctx40Render();
  inp.value='';grow40();T40.stick=true;
  const full=att.length?(text||'(see the attached context)')+'\n\n'+att40Block(att):text;
  const p=asstSend(full);
  const c=achat();
  if(c&&att.length){const um=[...c.msgs].reverse().find(m=>m.role==='user');if(um){um.shown=text;um.att=att.map(a=>a.name);renderAsst();}}
  send40Sync();
  try{await p;}finally{send40Sync();status40Render();}
}
function plus40(btn){
  const items=[
    {ic:'paperclip',l:'Attach a file',d:'text, code, CSV, JSON, Markdown',run:()=>{const f=document.createElement('input');f.type='file';f.multiple=true;
      f.onchange=async()=>{for(const x of f.files){if(x.size>400000){toast(x.name+' is over 400 KB — attach part of it',3200);continue;}
        try{T40.ctx.push({name:x.name,text:await x.text()});}catch(_){}}ctx40Render();};f.click();}},
    {ic:'brain',l:'Add a Brain note',d:'send a note along as context',run:()=>{const docs=((typeof BRAIN!=='undefined'&&BRAIN.docs)||[]).slice(0,40);
      if(!docs.length)return toast('The Brain has no notes yet',2400);
      openModal(`<h3 style="margin-top:0">Add a Brain note</h3><div class="t40-pick">${docs.map((d,k)=>`<button type="button" class="btn ghost" data-t40note="${k}">${esc(d.name||d.title||'note')}</button>`).join('')}</div>`);
      $$('[data-t40note]').forEach(b=>b.onclick=()=>{const d=docs[+b.dataset.t40note];T40.ctx.push({name:d.name||'note',text:d.body||d.text||''});closeModal();ctx40Render();});}},
    {ic:'sparkles',l:'Load a skill',d:'type / to search them',run:()=>{const t=$('#asst-input');t.value=(t.value&&!/\n$/.test(t.value)?t.value+'\n':t.value)+'/';t.focus();t.dispatchEvent(new Event('input'));}},
  ];
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR)items.push({ic:'mic',l:T40.rec?'Stop dictation':'Dictate',d:'speech to text',run:()=>dictate40()});
  let m=$('#t40-menu');if(m)m.remove();
  m=document.createElement('div');m.id='t40-menu';m.className='t40-menu';m.setAttribute('role','menu');
  m.innerHTML=items.map((x,k)=>`<button type="button" role="menuitem" data-k="${k}">${ic40(x.ic)}<span><b>${esc(x.l)}</b><small>${esc(x.d)}</small></span></button>`).join('');
  document.body.appendChild(m);
  const r=btn.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,r.top-m.offsetHeight-8)+'px';
  const close=()=>{m.remove();document.removeEventListener('pointerdown',out,true);};
  const out=e=>{if(!m.contains(e.target))close();};
  setTimeout(()=>document.addEventListener('pointerdown',out,true),0);
  m.onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;close();items[+b.dataset.k].run();};
  const f=m.querySelector('button');if(f)f.focus();
  m.onkeydown=e=>{if(e.key==='Escape'){close();btn.focus();}};
}
function dictate40(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
  if(T40.rec){try{T40.rec.stop();}catch(_){}T40.rec=null;return;}
  const r=new SR();r.interimResults=true;r.continuous=false;const inp=$('#asst-input'),base=inp.value?inp.value+' ':'';
  r.onresult=e=>{inp.value=base+[...e.results].map(x=>x[0].transcript).join('');grow40();};
  r.onend=()=>{T40.rec=null;toast('Dictation stopped',1500);};r.onerror=e=>{T40.rec=null;toast('Dictation: '+(e.error||'failed'),2600);};
  T40.rec=r;try{r.start();toast('Listening…',1800);}catch(e){T40.rec=null;}
}
function retry40(){
  const c=achat();if(!c)return;if((c.msgs||[]).some(m=>m.streaming))return;
  let i=c.msgs.length-1;while(i>=0&&c.msgs[i].role!=='user')i--;if(i<0)return;
  const u=c.msgs[i];c.msgs.splice(i);saveAChats();
  const p=asstSend(u.content);
  if(u.shown!=null||u.att){const um=c.msgs[i];if(um&&um.role==='user'){um.shown=u.shown;um.att=u.att;renderAsst();}}
  send40Sync();p.finally(()=>{send40Sync();status40Render();});
}
function copy40(text){
  const t=String(text||'');
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copied',1200),()=>{
    const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Copied',1200);}catch(_){}a.remove();});
}
function chatMd40(c){
  return '# '+(c.title||'Chat')+'\n\n'+(c.msgs||[]).map(m=>m.role==='user'?'**You:** '+(m.shown!=null?m.shown:m.content):
    '**Assistant'+(m.bot?' ('+m.bot.name+')':'')+':** '+(m.tools&&m.tools.length?'\n\n'+m.tools.map(t=>'> step `'+t.name+'` '+(t.note||'')).join('\n')+'\n\n':'')+(m.content||'')+(m.error?'\n\n> error: '+m.error:'')).join('\n\n---\n\n');
}
function menu40(){
  const c=achat();if(!c)return toast('Open a chat first',2000);
  openModal(`<h3 style="margin-top:0">${esc(c.title)}</h3><div class="t40-pick">
    <button type="button" class="btn ghost" data-t40m="pin">${ic40('pin')}${c.pinned?'Unpin':'Pin to the top'}</button>
    <button type="button" class="btn ghost" data-t40m="dream">${ic40('sparkles')}Dream over this chat</button>
    <button type="button" class="btn ghost" data-t40m="rename">${ic40('pencil')}Rename</button>
    <button type="button" class="btn ghost" data-t40m="md">${ic40('download')}Export Markdown</button>
    <button type="button" class="btn ghost" data-t40m="json">${ic40('download')}Export JSON</button>
    <button type="button" class="btn ghost" data-t40m="copy">${ic40('copy')}Copy as Markdown</button>
    <button type="button" class="btn ghost" data-t40m="fork">${ic40('git-fork')}Fork the whole chat</button>
    <button type="button" class="btn ghost bad" data-t40m="delete">${ic40('trash-2')}Delete chat</button></div>`);
  const slug=(c.title||'chat').replace(/[^\w-]+/g,'-').slice(0,40)||'chat';
  $$('[data-t40m]').forEach(b=>b.onclick=()=>{const k=b.dataset.t40m;
    if(k==='pin'){c.pinned=!c.pinned;saveAChats();}
    else if(k==='dream'){closeModal();const d=$('#asst-dream38');if(d)d.click();return;}
    else if(k==='rename'){const n=prompt('Rename chat',c.title);if(n&&n.trim()){c.title=n.trim().slice(0,80);saveAChats();}}
    else if(k==='md')downloadText(slug+'.md',chatMd40(c));
    else if(k==='json')downloadJSON(slug+'.json',c);
    else if(k==='copy')copy40(chatMd40(c));
    else if(k==='fork'){const r=achatFork(c.id,c.msgs.length-1,{});if(r&&r.note)toast(r.note,3000);}
    else if(k==='delete'){if(!confirm('Delete “'+c.title+'”? This cannot be undone.'))return;ACHATS=ACHATS.filter(x=>x!==c);ACHAT=ACHATS[0]?ACHATS[0].id:null;saveAChats();}
    closeModal();renderAsst();});
}
function init40(){
  const th=$('#asst-thread');if(!th||th._t40)return;th._t40=1;
  th.addEventListener('scroll',()=>{T40.stick=th.scrollHeight-th.scrollTop-th.clientHeight<90;
    const j=$('#asst-jump40');if(j)j.hidden=T40.stick;},{passive:true});
  th.addEventListener('click',e=>{
    const q=s=>e.target.closest(s);let b;
    const c=achat();const msg=k=>c&&c.msgs[+k];
    if((b=q('[data-t40steps]'))){const m=msg(b.dataset.t40steps);if(!m)return;T40.open.set(m,b.getAttribute('aria-expanded')!=='true');return turn40Rerender(b.dataset.t40steps);}
    if((b=q('[data-t40think]'))){const m=msg(b.dataset.t40think);if(!m)return;T40.think.set(m,b.getAttribute('aria-expanded')!=='true');return turn40Rerender(b.dataset.t40think);}
    if((b=q('[data-t40tool]'))){const [mi,ti]=b.dataset.t40tool.split(':');const m=msg(mi),t=m&&(m.tools||[])[+ti];if(!t||(t.args==null&&t.result==null))return;T40.tool.set(t,!T40.tool.get(t));return turn40Rerender(mi);}
    if((b=q('[data-t40info]'))){const m=msg(b.dataset.t40info);if(!m)return;T40.info.set(m,!T40.info.get(m));return turn40Rerender(b.dataset.t40info);}
    if((b=q('[data-t40explain]'))){const m=msg(b.dataset.t40explain);if(!m)return;T40.explain.set(m,!T40.explain.get(m));return turn40Rerender(b.dataset.t40explain);}
    if((b=q('[data-t40copy]'))){const m=msg(b.dataset.t40copy);return m&&copy40(m.shown!=null?m.shown:m.content);}
    if((b=q('[data-t40retry]')))return retry40();
    if((b=q('[data-t40speak]'))){const m=msg(b.dataset.t40speak);if(!m)return;
      if(speechSynthesis.speaking){speechSynthesis.cancel();return;}
      const u=new SpeechSynthesisUtterance(String(m.content||'').replace(/```[\s\S]*?```/g,' (code) ').replace(/[#*_`>|]/g,'').slice(0,6000));speechSynthesis.speak(u);return;}
    if((b=q('[data-t40brain]'))){const m=msg(b.dataset.t40brain);if(!m)return;
      const name=String(m.content||'').split('\n').find(x=>x.trim())||'Chat answer';
      brainAdd({name:name.replace(/^#+\s*/,'').slice(0,70),body:m.content,kind:'note',tags:['chat'],source:'chat: '+(c.title||'')}).then(()=>toast('Saved to the Brain',1800),e=>toast('Brain: '+(e.message||e),2600));return;}
    if((b=q('[data-t40sugg]'))){const s=SUGG40[+b.dataset.t40sugg];if(!s)return;
      if(s.web){ASST.perMode=ASST.perMode||{};ASST.perMode[ASST.mode]=Object.assign({},ASST.perMode[ASST.mode],{web:true});saveASST();}
      const inp=$('#asst-input');inp.value=s.p;grow40();send40();return;}
    if((b=q('[data-t40go]'))){e.preventDefault();go(b.dataset.t40go);return;}
    if((b=q('[data-t40code]'))){const pre=b.closest('.t40-code');if(pre)copy40(pre.querySelector('code').textContent);}
  });
  const st=$('#asst-status40');
  if(st)st.onclick=e=>{const b=e.target.closest('[data-t40s]');if(!b)return;const k=b.dataset.t40s;
    ASST.perMode=ASST.perMode||{};const per=ASST.perMode[ASST.mode]=Object.assign({},ASST.perMode[ASST.mode]);
    if(k==='model'||k==='mode'){$('#asst-settings').classList.add('open');renderAsstSettings();if(k==='mode'){const ms=$('#asst-modes');if(ms)ms.scrollIntoView({block:'nearest',inline:'nearest'});}return;}
    if(k==='tools'){ASST.auto=!ASST.auto;toast(ASST.auto?'Tools will run automatically':'Every tool call will ask first',2200);}
    if(k==='web'){per.web=!asstCfg().web;toast(per.web?'Web search on for this mode':'Web search off for this mode',2000);}
    if(k==='think'){const L=MOA_EFFORTS.filter(Boolean);const cur=L.indexOf(per.effort);per.effort=cur<0?L[0]:cur+1<L.length?L[cur+1]:'';
      toast(per.effort?'Thinking effort: '+per.effort:'Thinking effort off',2000);}
    saveASST();renderAsst();};
  const ctx=$('#asst-ctx40');if(ctx)ctx.onclick=e=>{const b=e.target.closest('[data-t40unatt]');if(!b)return;T40.ctx.splice(+b.dataset.t40unatt,1);ctx40Render();};
  const plus=$('#asst-plus40');if(plus)plus.onclick=()=>plus40(plus);
  const more=$('#asst-more40');if(more)more.onclick=menu40;
  const j=$('#asst-jump40');if(j)j.onclick=()=>{T40.stick=true;th.scrollTo({top:th.scrollHeight,behavior:'smooth'});j.hidden=true;};
  const s=$('#asst-search40');if(s)s.oninput=()=>{T40.q=s.value;$('#asst-list').innerHTML=chatList40HTML();};
  const inp=$('#asst-input');
  if(inp){inp.addEventListener('input',grow40);
    /* Enter sends on a keyboard; on a touch screen Enter is a new line and the arrow sends. ⌘/Ctrl+Enter always sends. */
    inp.addEventListener('keydown',e=>{
      if(e.defaultPrevented||e.isComposing||e.key!=='Enter'||e.shiftKey||e.metaKey||e.ctrlKey)return;
      if($('#asst-slash')&&$('#asst-slash').classList.contains('open'))return;
      if(matchMedia('(pointer:coarse)').matches)return;
      e.preventDefault();send40();});
    inp.addEventListener('dragover',e=>e.preventDefault());
    inp.addEventListener('drop',async e=>{const fs=[...(e.dataTransfer&&e.dataTransfer.files||[])];if(!fs.length)return;e.preventDefault();
      for(const x of fs){if(x.size<=400000)try{T40.ctx.push({name:x.name,text:await x.text()});}catch(_){}}ctx40Render();});}
  /* One button: Send, or Stop while a turn runs. The old Stop stays (hidden) for anything that clicks it by id. */
  const send=$('#asst-send');
  if(send)send.onclick=()=>{if(send.classList.contains('stop')){if(ASST_ABORT)ASST_ABORT.abort();setTimeout(send40Sync,50);return;}send40();};
  grow40();status40Render();ctx40Render();
}
