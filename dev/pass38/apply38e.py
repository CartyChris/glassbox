# ═══ E. Dream Catcher + chat pin/rewind ═══
module('dream.js')
rep('      <div id="recall38"></div>','      <div id="recall38"></div>\n      <div id="dream38"></div>')
rep("  if(view==='brain')panelGuard(view,()=>{recallRender38();","  if(view==='brain')panelGuard(view,()=>{recallRender38();dreamRender38();")
rep('          <button class="btn small" id="asst-new">＋ New chat</button>','          <button class="btn small" id="asst-new">＋ New chat</button>\n          <div class="row" style="gap:6px"><button class="btn small ghost" id="asst-pin38">Pin</button><button class="btn small ghost" id="asst-dream38" title="Dream over this chat: propose lessons and ideas for the Brain">Dream</button></div>')
rep("""  $('#asst-list').innerHTML=ACHATS.map(x=>
    `<button class="asst-chat ${x.id===ACHAT?'on':''}" data-id="${x.id}">
       <span>${esc(x.title)}</span>""","""  {const pb=$('#asst-pin38'),cc=achat();if(pb)pb.textContent=cc&&cc.pinned?'Unpin':'Pin';}
  $('#asst-list').innerHTML=achatOrder38(ACHATS).map(x=>
    `<button class="asst-chat ${x.id===ACHAT?'on':''}" data-id="${x.id}">
       <span>${x.pinned?'📌 ':''}${esc(x.title)}</span>""")
rep("""  if(m.role==='user')return `<div class="am user"><div class="am-body">${esc(m.content)}</div>${fork}</div>`;""","""  if(m.role==='user')return `<div class="am user"><div class="am-body">${esc(m.content)}</div>${fork}${typeof i==='number'?`<button class="am-fork" data-rewind38="${i}" style="right:38px" title="Rewind to before this message — it goes back into the composer; the full chat is kept as a copy" aria-label="Rewind to before this message">↶</button>`:''}</div>`;""")
rep("""    const f=e.target.closest('[data-fork]');
    if(f){""","""    const rw=e.target.closest('[data-rewind38]');
    if(rw){const c=achat();if(!c)return;const r=achatRewind38(c.id,+rw.dataset.rewind38);if(!r.ok)return toast(r.error,3000);
      renderAsst();const inp=$('#asst-input');if(inp){inp.value=r.text;inp.focus();}toast('Rewound — edit and send again. The full chat is kept as “(before rewind)”.',4200);return;}
    const f=e.target.closest('[data-fork]');
    if(f){""")
rep("""  $('#asst-new').onclick=()=>{achatNew();renderAsst();};""","""  $('#asst-new').onclick=()=>{achatNew();renderAsst();};
  if($('#asst-pin38'))$('#asst-pin38').onclick=()=>{const c=achat();if(!c)return;c.pinned=!c.pinned;saveAChats();renderAsst();};
  if($('#asst-dream38'))$('#asst-dream38').onclick=async()=>{const c=achat();if(!c||!(c.msgs||[]).length)return toast('Nothing to dream over yet',2500);
    const b=$('#asst-dream38');b.disabled=true;
    try{const r=await dreamCatch38(c.msgs.map(m=>m.role+': '+(typeof m.content==='string'?m.content:'')).join('\\n'),'chat: '+c.title);
      toast(r.note||`${r.added} proposal(s) in Brain → Dream Catcher${r.places?', '+r.places+' new place(s)':''}`,4500);}
    catch(e){toast('Dream: '+(e.message||e),4000);}b.disabled=false;};""")
EXPORTS+=['dreamItems38','achatOrder38','achatRewind38']
rep("""    paneEvent('agent','assistant',{label:ASST.mode,ok:false,note:e.message});
  }
  slot.streaming=false;saveAChats();renderAsst();
  return slot;
}""","""    paneEvent('agent','assistant',{label:ASST.mode,ok:false,note:e.message});
  }
  slot.streaming=false;saveAChats();renderAsst();
  /* Opt-in: dream over the last exchange once it is finished (one extra model call per reply, so off by default). */
  if(DREAM38.afterReply&&!slot.error&&String(slot.content||'').length>200)
    dreamCatch38(c.msgs.slice(-4).map(m=>m.role+': '+(typeof m.content==='string'?m.content:'')).join('\\n'),'chat: '+c.title).catch(()=>{});
  return slot;
}""")
