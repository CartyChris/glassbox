# Pass 40 — base40.html (= gb-repo ef97ec0, build a6812b1214928d53) → GlassBox.html
# Chat shows everything a turn did (Forge-style turns, tool cards, thinking, meta), status strip, new composer.
import sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(W+'base40.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count: sys.exit('ANCHOR x%d (want %d): %r'%(n,count,old[:140]))
    s=s.replace(old,new)
rd=lambda f:open(W+'p40/'+f).read()
MOD_ANCHOR="/* ═══════════════════ ASSISTANT — the front door"
def module(f): rep(MOD_ANCHOR,rd(f)+"\n"+MOD_ANCHOR)

# ═══ CSS after ds39 ═══
i=s.index('<style id="ds39">');j=s.index('</style>',i)+len('</style>')
s=s[:j]+'\n<style id="ds40">\n'+rd('chat.css')+'</style>'+s[j:]
module('icons.js');module('md.js');module('chat.js')

# ═══ Markup: side (search, ⋯), thread wrapper + jump, status strip, composer ═══
rep("""          <div class="row" style="gap:6px"><button class="btn small ghost" id="asst-pin38">Pin</button><button class="btn small ghost" id="asst-dream38" title="Dream over this chat: propose lessons and ideas for the Brain">Dream</button></div>
          <div id="asst-list" class="asst-list"></div>""","""          <div class="row" style="gap:6px"><button class="btn small ghost" id="asst-pin38">Pin</button><button class="btn small ghost" id="asst-dream38" title="Dream over this chat: propose lessons and ideas for the Brain">Dream</button><button class="btn small ghost" id="asst-more40" title="Rename, export, fork or delete this chat" aria-label="Chat actions">⋯</button></div>
          <input id="asst-search40" type="search" placeholder="Search chats" aria-label="Search chats" autocomplete="off">
          <div id="asst-list" class="asst-list"></div>""")
rep("""          <div id="asst-thread" class="asst-thread"></div>
          <div id="asst-slash" class="slash-pop"></div>
          <div class="row" style="gap:8px;align-items:flex-end">
            <textarea id="asst-input" rows="3" style="flex:1"
              placeholder="Ask anything — ⌘/Ctrl+Enter to send. Type / to load a skill."></textarea>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn" id="asst-send">Send</button>
              <button class="btn small" id="asst-stop">Stop</button>
            </div>
          </div>""","""          <div class="t40-threadwrap"><div id="asst-thread" class="asst-thread" aria-live="polite"></div>
            <button type="button" id="asst-jump40" data-float hidden>Jump to latest</button></div>
          <div id="asst-slash" class="slash-pop"></div>
          <div id="asst-status40" class="t40-status" role="group" aria-label="Chat status"></div>
          <div class="cmp40">
            <div id="asst-ctx40" class="t40-ctx" hidden></div>
            <textarea id="asst-input" rows="1" aria-label="Message"
              placeholder="Message the assistant · / for skills"></textarea>
            <div class="cmp40-bar">
              <button type="button" class="cmp40-ib" id="asst-plus40" aria-label="Add files, notes, a skill or dictation" title="Add"><svg class="ic40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg></button>
              <span class="cmp40-hint">Enter to send · Shift+Enter for a new line · drop files to attach</span>
              <span class="cmp40-sp"></span>
              <button class="btn small ghost" id="asst-stop" hidden>Stop</button>
              <button type="button" class="cmp40-send" id="asst-send" aria-label="Send" disabled></button>
            </div>
          </div>""")

# ═══ Renderer ═══
a=s.index('function asstMsgHTML(m,i){');b=s.index('function renderAsstStream(){',a)
s=s[:a]+"""function asstMsgHTML(m,i){
  /* pass 40: one renderer for every kind of turn — chat, bots, MoA, cascade, scouts, playbooks, harnesses */
  return turn40HTML(m,i);
}
"""+s[b:]
rep("""  const m=c.msgs[c.msgs.length-1];
  if(last&&m){last.outerHTML=asstMsgHTML(m);try{genuiHydrate($('#asst-thread').lastElementChild);}catch(_){}}
  const th=$('#asst-thread');th.scrollTop=th.scrollHeight;""","""  const m=c.msgs[c.msgs.length-1];
  if(m)turn40Tick(m);
  if(last&&m){last.outerHTML=asstMsgHTML(m,c.msgs.length-1);try{genuiHydrate($('#asst-thread').lastElementChild);}catch(_){}}
  const th=$('#asst-thread');if(T40.stick)th.scrollTop=th.scrollHeight;
  send40Sync();""")
rep("""  const c=achat();
  th.innerHTML=c&&c.msgs.length?c.msgs.map(asstMsgHTML).join('')
    :`<div class="asst-empty"><h3>${esc(asstMode().label)}</h3>
       <p class="help">${esc(asstMode().blurb)} — with this app's models, connectors, MCP tools,
       skills and Brain already wired in.</p></div>`;
  try{genuiHydrate(th);}catch(_){}
  th.scrollTop=th.scrollHeight;""","""  const c=achat();
  if(c&&c.msgs.length)c.msgs.forEach(turn40Tick);
  th.innerHTML=c&&c.msgs.length?c.msgs.map(asstMsgHTML).join(''):empty40HTML();
  try{genuiHydrate(th);}catch(_){}
  if(T40.stick)th.scrollTop=th.scrollHeight;
  try{status40Render();send40Sync();}catch(_){}""")
rep("""  $('#asst-list').innerHTML=achatOrder38(ACHATS).map(x=>
    `<button class="asst-chat ${x.id===ACHAT?'on':''}" data-id="${x.id}">
       <span>${x.pinned?'📌 ':''}${esc(x.title)}</span><small>${esc((x.mode||'chat'))}${x.model?' · '+esc(x.model.split('/').pop()):''}${x.cost?' · '+money(x.cost):''}</small></button>`).join('')
    ||'<p class="help" style="padding:8px">No chats yet.</p>';""","""  $('#asst-list').innerHTML=chatList40HTML();""")
rep("""  $('#asst-list').onclick=e=>{const b=e.target.closest('.asst-chat');if(!b)return;
    ACHAT=b.dataset.id;renderAsst();};""","""  $('#asst-list').onclick=e=>{const b=e.target.closest('.asst-chat');if(!b)return;
    ACHAT=b.dataset.id;T40.stick=true;renderAsst();};""")
rep("""  $('#asst-settings-btn').onclick=()=>{$('#asst-settings').classList.toggle('open');renderAsstSettings();};
  renderAsstSettings();renderAsst();
}""","""  $('#asst-settings-btn').onclick=()=>{$('#asst-settings').classList.toggle('open');renderAsstSettings();};
  renderAsstSettings();renderAsst();
  try{init40();}catch(e){console.warn('chat40',e);}
}""")
rep("  $('#asst-new').onclick=()=>{achatNew();renderAsst();};","  $('#asst-new').onclick=()=>{achatNew();T40.stick=true;renderAsst();const i=$('#asst-input');if(i)i.focus();};")

# ═══ Recording: a turn keeps its timing, accounting and every tool call in full ═══
rep("  const slot={role:'assistant',content:'',reasoning:'',tools:[],ts:nowISO(),streaming:true};",
    "  const slot={role:'assistant',content:'',reasoning:'',tools:[],ts:nowISO(),streaming:true,t0:Date.now(),mode:asstMode().label||ASST.mode};")
rep("""    slot.cost=acc.cost||0;c.cost=(c.cost||0)+(acc.cost||0);
    spanEnd(span,acc);styleNote(acc);""","""    slot.cost=acc.cost||0;c.cost=(c.cost||0)+(acc.cost||0);
    slot.meta=turn40Estimate(turn40Meta(acc,cfg.model),acc);slot.model=slot.meta.model;
    spanEnd(span,acc);styleNote(acc);""")
rep("""        if(!ok){slot.tools.push({name:'(declined)',ok:false,note:'you declined this tool call'});""",
    """        if(!ok){slot.tools.push({name:'(declined)',ok:false,status:'declined',note:'you declined this tool call'});""")
rep("""      let r=null;
      try{r=await handleToolCalls(slot.content);}
      catch(e){slot.tools.push({name:'tools',ok:false,note:e.message});break;}
      if(!r||!r.length)break;
      r.forEach(x=>slot.tools.push({name:x.req.tool,ok:!x.error,
        note:(x.blocked?'blocked — ':'')+(x.error||toolText(x.result)).slice(0,200)+(x.injection?' ⚠ instruction-shaped text found':'')}));
      renderAsstStream();""","""      let r=null;
      const run40={name:'running tools',ok:true,status:'run',note:'calling…'};slot.tools.push(run40);renderAsstStream();
      const tt0=Date.now();
      try{r=await handleToolCalls(slot.content);}
      catch(e){slot.tools.splice(slot.tools.indexOf(run40),1);slot.tools.push({name:'tools',ok:false,status:'err',note:e.message});break;}
      slot.tools.splice(slot.tools.indexOf(run40),1);
      if(!r||!r.length)break;
      const per40=Math.round((Date.now()-tt0)/r.length);
      r.forEach(x=>slot.tools.push({name:x.req.tool,ok:!x.error,status:x.blocked?'blocked':x.error?'err':'ok',ms:per40,
        args:x.req.args||{},result:x.error?x.error:(typeof x.result==='string'?x.result:toolText(x.result)).slice(0,6000),injection:!!x.injection,
        note:(x.blocked?'blocked — ':'')+(x.error||toolText(x.result)).slice(0,200)}));
      renderAsstStream();""")
rep("""      slot.content=acc2.content||before;
      slot.cost=(slot.cost||0)+(acc2.cost||0);c.cost=(c.cost||0)+(acc2.cost||0);""","""      slot.content=acc2.content||before;
      slot.cost=(slot.cost||0)+(acc2.cost||0);c.cost=(c.cost||0)+(acc2.cost||0);
      slot.meta=turn40Merge(slot.meta,turn40Estimate(turn40Meta(acc2,cfg.model),acc2));""")
rep("""  slot.streaming=false;saveAChats();renderAsst();
  /* Opt-in: dream over the last exchange""","""  slot.streaming=false;slot.t1=Date.now();saveAChats();renderAsst();
  /* Opt-in: dream over the last exchange""")

# layout check: a floating control (jump to latest) overlaps content by design, and a spinning icon is not a spill
rep("""  const L=[...R.querySelectorAll('button,a.btn,.chip,input:not([type=hidden]),select')].filter(vis)""",
    """  const L=[...R.querySelectorAll('button,a.btn,.chip,input:not([type=hidden]),select')].filter(e=>!e.closest('[data-float]')).filter(vis)""")
rep("""  L.forEach(x=>{if(x.e.tagName!=='BUTTON'||getComputedStyle(x.e).overflow!=='visible')return;""",
    """  L.forEach(x=>{if(x.e.tagName!=='BUTTON'||x.e.querySelector('.spin40')||getComputedStyle(x.e).overflow!=='visible')return;""")
# answers render Markdown; the offers read the message, not the rendered text (code fences live in the source)
rep("  return chip+`<div class=\"am-body${g?' am-rich':''}\">${g||esc(m.content)||(m.streaming?'<span class=\"help\">…</span>':'')}</div>`+acts;",
    "  return chip+`<div class=\"am-body${g?' am-rich':m.role!=='user'&&m.content?' am-md':''}\">${g||(m.role!=='user'&&m.content?md40(m.content):esc(m.content))||(m.streaming?'<span class=\"help\">…</span>':'')}</div>`+acts;")
rep("""    const b=e.target.closest('.am-offer');if(!b)return;
    const bubble=b.closest('.am');
    const body=bubble&&bubble.querySelector('.am-body');
    asstTakeOffer(b.dataset.offer,b.dataset.payload,body?body.textContent:'');""","""    const b=e.target.closest('.am-offer');if(!b)return;
    const bubble=b.closest('.am');
    const cm=achat(),mi=bubble&&bubble.dataset.t40i,mm=cm&&mi!==''&&mi!=null?cm.msgs[+mi]:null;
    const body=bubble&&bubble.querySelector('.am-body');
    asstTakeOffer(b.dataset.offer,b.dataset.payload,mm&&typeof mm.content==='string'?mm.content:body?body.textContent:'');""")
# the prose around a widget is Markdown too (unless it holds an HTML / SVG / Mermaid block the preview owns)
rep(r"""    return t.trim()?'<div class="gu-prose">'+t.replace(/^\n+|\n+$/g,'')+'</div>':'';""",
    r"""    const sp40=GENUI.html&&/```(mermaid|html|svg)\b/i.test(p.text);"""+"\n"+r"""    return t.trim()?'<div class="gu-prose'+(sp40?'':' am-md')+'">'+(sp40?t.replace(/^\n+|\n+$/g,''):md40(p.text))+'</div>':'';""")
EXPORTS=['md40','turn40Estimate','turn40Meta','turn40Merge','turn40Summary','think40Label','tool40Status','chatTotals40','att40Block','route40','fmtTok40','fmtDur40','chatFind40','turn40HTML','T40']
rep("shellMode36,tabPosFor36,tabFace36,",",".join(EXPORTS)+",shellMode36,tabPosFor36,tabFace36,")
rep("  add({id:'fixture-chat-sweep',",rd('cases.js')+"\n  add({id:'fixture-chat-sweep',")
rep("  {id:'sandbox-noop',",rd('sab.js')+"\n  {id:'sandbox-noop',")
open(W+'GlassBox.html','w').write(s)
print('ok',len(s))
