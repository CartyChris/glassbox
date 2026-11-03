/* ═══════════════════ PASS 38 — DREAM CATCHER + chat rewind/pin ═══════════════════
   From the Dreaming Factory: after work is done, a "dreaming" pass reads it back and proposes reusable LESSONS and next
   IDEAS. They wait in an inbox; only what a person accepts reaches the Brain (auto-accept exists and is off — "not
   recommended" in the original too: a model grading its own run is the self-judging loop the research warns about).
   Locations seen in the same pass are filed in S1 recall at once — those are copied, not invented, so need no review. */
let DREAM38=Object.assign({inbox:[],auto:false,afterReply:false},store.get('dream38',{}));
const saveDream38=()=>{DREAM38.inbox=DREAM38.inbox.slice(0,60);store.set('dream38',DREAM38);};
/* PURE. Model output → inbox items, dropping anything empty, overlong, duplicate or already in the Brain. */
function dreamItems38(j,have,source){
  const seen=new Set((have||[]).map(x=>String(x).toLowerCase().trim()));
  const out=[];
  const take=(arr,kind)=>(Array.isArray(arr)?arr:[]).forEach(x=>{
    const name=String((x&&x.name)||x||'').trim().slice(0,90),body=String((x&&(x.body||x.why))||'').trim().slice(0,600);
    if(name.length<6||seen.has(name.toLowerCase()))return;seen.add(name.toLowerCase());
    out.push({id:'d'+Math.random().toString(36).slice(2,9),kind,name,body,source:source||'',at:new Date().toISOString()});});
  take(j&&j.lessons,'lesson');take(j&&j.ideas,'idea');
  return out.slice(0,6);
}
async function dreamCatch38(text,source){
  const t=String(text||'').slice(-24000);if(t.length<200)return{added:0,places:0,note:'not enough to dream over'};
  let places=0;try{await recallLoad38();const r=recallMerge38(RECALL38.places,recallExtract38(t,source));RECALL38.places=r.places;places=r.added;await recallSave38();}catch(_){}
  const acc=await streamComplete({model:primaryModel(),temperature:0.3,maxTokens:1500,messages:[
    {role:'system',content:'You are the dreaming pass of an agent workspace. You read finished work and keep only what is worth remembering.'},
    {role:'user',content:'FINISHED WORK:\n'+t+'\n\nPropose up to 3 LESSONS (reusable, specific, checkable — what to do or avoid next time, with the reason) and up to 2 next IDEAS '+
      '(concrete follow-ups the person might want). Nothing generic. JSON only: {"lessons":[{"name":"…","body":"…"}],"ideas":[{"name":"…","body":"…"}]}'}]},null,null,'dream catcher');
  const items=dreamItems38(tutorJson38(acc.content)||{},(BRAIN.docs||[]).map(d=>d.name).concat(DREAM38.inbox.map(i=>i.name)),source);
  if(DREAM38.auto){for(const it of items)await dreamAccept38(it,true);}else{DREAM38.inbox=items.concat(DREAM38.inbox);saveDream38();}
  try{logEvent('dream-catch',{items:items.length,places,source});}catch(_){}
  return{added:items.length,places};
}
async function dreamAccept38(it,auto){
  await brainAdd({name:it.name,body:it.body+(it.source?'\n\nFrom: '+it.source:''),kind:it.kind==='idea'?'research':'insight',
    tags:['dream',auto?'auto-accepted':'accepted'],source:'dream catcher'});
  DREAM38.inbox=DREAM38.inbox.filter(x=>x.id!==it.id);saveDream38();
}
function dreamRender38(){
  const h=$('#dream38');if(!h)return;
  h.innerHTML=`<div class="card"><h3 style="margin-top:0">Dream Catcher</h3>
    <p class="help">After work is done, a dreaming pass proposes lessons and next ideas. They wait here; what you accept joins the Brain and shapes later runs.
      Locations it sees go straight into S1 recall. Run it from a chat (Assistant → Dream) or below on recent work.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small" id="dr-recent">Dream over recent chats</button>
      <label class="chip"><input type="checkbox" id="dr-after"${DREAM38.afterReply?' checked':''} style="margin:0"> dream after each finished chat reply</label>
      <label class="chip"><input type="checkbox" id="dr-auto"${DREAM38.auto?' checked':''} style="margin:0"> auto-accept (not recommended)</label></div>
    <div style="margin-top:8px">${DREAM38.inbox.map(it=>`<div class="diagbox" style="margin-top:6px"><span class="chip">${it.kind}</span> <b>${esc(it.name)}</b>
      <div class="help">${esc(it.body)}</div><div class="row" style="gap:6px;margin-top:6px"><button class="btn small" data-dra="${esc(it.id)}">Keep</button>
      <button class="btn small ghost" data-drr="${esc(it.id)}">Discard</button></div></div>`).join('')||'<p class="help">Inbox empty.</p>'}</div></div>`;
  $$('[data-dra]').forEach(b=>b.onclick=async()=>{const it=DREAM38.inbox.find(x=>x.id===b.dataset.dra);if(it){await dreamAccept38(it,false);toast('Kept in the Brain',1800);dreamRender38();}});
  $$('[data-drr]').forEach(b=>b.onclick=()=>{DREAM38.inbox=DREAM38.inbox.filter(x=>x.id!==b.dataset.drr);saveDream38();dreamRender38();});
  $('#dr-after').onchange=e=>{DREAM38.afterReply=e.target.checked;saveDream38();};
  $('#dr-auto').onchange=e=>{DREAM38.auto=e.target.checked;saveDream38();};
  $('#dr-recent').onclick=async()=>{const b=$('#dr-recent');b.disabled=true;
    const txt=(ACHATS||[]).slice(0,5).map(c=>(c.msgs||[]).slice(-12).map(m=>m.role+': '+(typeof m.content==='string'?m.content:'')).join('\n')).join('\n\n');
    try{const r=await dreamCatch38(txt,'recent chats');toast(`${r.added} proposal(s), ${r.places} new place(s)`,3500);}catch(e){toast('Dream: '+(e.message||e),4000);}
    b.disabled=false;dreamRender38();recallRender38();};
}
/* ── chat: pin + rewind ── */
/* PURE. Pinned chats first, otherwise the existing order. */
function achatOrder38(list){return (list||[]).filter(c=>c&&c.pinned).concat((list||[]).filter(c=>c&&!c.pinned));}
/* Rewind to before message i: the full chat is kept as a copy first (nothing is lost), then this chat is cut back and
   the message goes back into the composer to be edited and resent. */
function achatRewind38(chatId,i){
  const c=ACHATS.find(x=>x.id===chatId);if(!c||!c.msgs||!c.msgs[i])return{ok:false,error:'nothing to rewind'};
  const copy=JSON.parse(JSON.stringify(c));copy.id=uid();copy.title=(c.title||'Chat')+' (before rewind)';copy.pinned=false;
  ACHATS.splice(ACHATS.indexOf(c)+1,0,copy);
  const text=typeof c.msgs[i].content==='string'?c.msgs[i].content:'';
  c.msgs=c.msgs.slice(0,i);saveAChats();
  return{ok:true,text,copyId:copy.id};
}
