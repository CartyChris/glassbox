/* ═══════════════════ PASS 38 — S1 RECALL (places) ═══════════════════
   System 1 memory for agents: WHERE things are — files, folders, repos, sites, hosts, ports, commands — recalled instantly,
   with no model call, the way a person just knows where the keys are. System 2 work (reasoning runs, chats, terminals) is
   "dreamed" over afterwards: a mechanical extractor (no model to hallucinate a path) pulls every location it sees and files
   it with where it was seen. Use strengthens a place; age without use fades it. Recall below the confidence floor answers
   "not known" rather than a guess — that is the S1/S2 router: S1 answers when it is sure, otherwise S2 (a model, a search)
   has to look. Shared with every harness: the find_place agent tool, the MCP server (glassbox-memory.mjs places_find /
   places_remember / places_dream), its command line over SSH, and the bridge's memory sync. */
let RECALL38={places:[]},RECALL38_LOADED=false;
const RECALL38_FLOOR=0.34,RECALL38_CAP=800;
/* The words people use for each kind, so "the openshell repo" or "ollama logs folder" match on kind as well as name. */
const RECALL38_KINDS={dir:'dir folder directory',file:'file',repo:'repo repository github',url:'url site website link page docs',local:'local server localhost port',host:'host server ssh machine',command:'command cmd run'};
async function recallLoad38(){if(RECALL38_LOADED)return;try{const v=await IDB.getStrict('recall38');if(v&&Array.isArray(v.places))RECALL38=v;}catch(_){}RECALL38_LOADED=true;}
async function recallSave38(){RECALL38.places=RECALL38.places.slice(0,RECALL38_CAP);try{await IDB.set('recall38',RECALL38);}catch(e){toast('Recall could not save: '+(e&&e.message||e),4000);}}
/* PURE. Every location mentioned in a text: absolute and home paths, URLs, GitHub repos, localhost ports, ssh targets. */
function recallExtract38(text,source){
  const t=String(text||'').slice(0,400000),out=new Map(),add=(where,kind)=>{
    where=where.replace(/[)\].,;:'"`>]+$/,'');if(where.length<4||where.length>300||out.has(where))return;
    const name=kind==='repo'?where.replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,''):(kind==='url'||kind==='local')?where.replace(/^https?:\/\//,'').replace(/\/$/,''):where.split(/[\\/]/).filter(Boolean).pop()||where;
    out.set(where,{where,kind,name:name.slice(0,80),source:source||''});};
  (t.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/g)||[]).forEach(u=>add(u,'repo'));
  (t.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d{2,5}[^\s'"<>)]*/g)||[]).forEach(u=>add(u,'local'));
  (t.match(/https?:\/\/[^\s'"<>()]+/g)||[]).forEach(u=>{if(!out.has(u.replace(/[)\].,;:'"`>]+$/,'')))add(u,/github\.com\/[\w.-]+\/[\w.-]+/.test(u)?'repo':'url');});
  (t.match(/(?:^|[\s'"`(=])((?:~|\/Users|\/home|\/opt|\/var|\/etc|\/private|\/Volumes|\/tmp)(?:\/[\w .@+~-]*[\w@+~-](?=\/))*\/[\w.@+~-]*[\w@+~-])/g)||[])
    .forEach(m=>{const p=m.replace(/^[\s'"`(=]/,'');add(p,/\.[\w]{1,6}$/.test(p)?'file':'dir');});
  (t.match(/\b[A-Za-z]:\\(?:[\w .-]+\\)*[\w .-]+/g)||[]).forEach(p=>add(p,'file'));
  (t.match(/\bssh\s+(?:-\w+\s+\S+\s+)*([\w.-]+@[\w.-]+)/g)||[]).forEach(m=>add(m.split(/\s+/).pop(),'host'));
  return [...out.values()];
}
/* PURE. File new sightings: same `where` merges (sightings add up, the best name wins), new ones start weak. */
function recallMerge38(places,found,now){
  const by=new Map((places||[]).map(p=>[p.where,p]));const T=now||Date.now();let added=0;
  (found||[]).forEach(f=>{const p=by.get(f.where);
    if(p){p.seen=(p.seen||1)+1;p.last=T;if(f.source&&!(p.sources||[]).includes(f.source))p.sources=(p.sources||[]).concat([f.source]).slice(-5);}
    else{by.set(f.where,{id:'p'+Math.random().toString(36).slice(2,9),where:f.where,kind:f.kind,name:f.name,tags:f.tags||[],seen:1,uses:0,
      first:T,last:T,sources:f.source?[f.source]:[],prov:f.prov||'dream'});added++;}});
  return{places:[...by.values()],added};
}
/* PURE. Union two copies of the store (this browser and the shared file): same place → the larger counts and the
   later time win, so syncing back and forth never inflates a place's strength. */
function recallUnion38(a,b){
  const by=new Map((a||[]).map(p=>[p.where,Object.assign({},p)]));
  (b||[]).forEach(q=>{if(!q||!q.where)return;const p=by.get(q.where);
    if(!p)by.set(q.where,Object.assign({},q));
    else{p.seen=Math.max(p.seen||1,q.seen||1);p.uses=Math.max(p.uses||0,q.uses||0);p.last=Math.max(p.last||0,q.last||0);
      if(q.prov==='person')p.prov='person';p.tags=[...new Set((p.tags||[]).concat(q.tags||[]))].slice(0,12);}});
  return[...by.values()];
}
/* PURE. S1 lookup: words of the query against name, where, tags and sources, weighted by use and freshness.
   Below the floor it returns nothing — "not known" is an answer; a confident wrong path is not. */
function recallFind38(q,places,now,limit){
  const qs=String(q||'').toLowerCase().match(/[a-z0-9]{2,}/g)||[];if(!qs.length)return[];
  const T=now||Date.now();
  return (places||[]).map(p=>{
    const hay=(p.name+' '+p.where+' '+(RECALL38_KINDS[p.kind]||p.kind||'')+' '+(p.tags||[]).join(' ')+' '+(p.sources||[]).join(' ')).toLowerCase();
    const hits=qs.filter(w=>hay.includes(w)).length/qs.length;
    const strength=Math.min(1,0.55+0.12*Math.log2(1+(p.uses||0)*2+(p.seen||1)));
    const fresh=Math.max(0.6,1-((T-(p.last||T))/864e5)/180);
    return{p,score:+(hits*strength*fresh*(p.prov==='person'?1.1:1)).toFixed(3)};})
    .filter(x=>x.score>=RECALL38_FLOOR).sort((a,b)=>b.score-a.score).slice(0,limit||6);
}
async function recallUse38(id){const p=RECALL38.places.find(x=>x.id===id);if(p){p.uses=(p.uses||0)+1;p.last=Date.now();await recallSave38();}}
/* The dreaming pass: read back what System 2 produced and file every location in it. Mechanical, so it cannot invent one. */
async function recallDream38(){
  await recallLoad38();const found=[];
  const scan=(txt,src)=>recallExtract38(txt,src).forEach(f=>found.push(f));
  try{(BRAIN.docs||[]).slice(0,400).forEach(d=>scan(d.name+' '+d.body,'brain: '+String(d.name).slice(0,40)));}catch(_){}
  try{(ACHATS||[]).slice(0,40).forEach(c=>(c.msgs||[]).slice(-40).forEach(m=>scan(typeof m.content==='string'?m.content:'', 'chat: '+String(c.title||'').slice(0,40))));}catch(_){}
  try{(CREATIONS||[]).slice(0,30).forEach(c=>scan(JSON.stringify(c.files||{}).slice(0,60000),'creation: '+String(c.title).slice(0,40)));}catch(_){}
  try{(S1CFG.runs||[]).forEach(r=>scan(r.goal,'system one'));}catch(_){}
  try{(HH&&HH.jobs||[]).slice(0,40).forEach(j=>scan(JSON.stringify(j).slice(0,4000),'handoff'));}catch(_){}
  try{scan(JSON.stringify({o:settings.ollama,b:typeof bridgeBase==='function'?bridgeBase():''}),'settings');}catch(_){}
  const r=recallMerge38(RECALL38.places,found);RECALL38.places=r.places;await recallSave38();
  try{logEvent('recall-dream',{seen:found.length,added:r.added});}catch(_){}
  return{seen:found.length,added:r.added,total:RECALL38.places.length};
}
function recallRender38(){
  const h=$('#recall38');if(!h)return;
  if(!RECALL38_LOADED){recallLoad38().then(recallRender38);return;}
  const P=RECALL38.places,by=k=>P.filter(p=>p.kind===k).length;
  h.innerHTML=`<div class="card"><h3 style="margin-top:0">S1 recall — where things are</h3>
    <p class="help">Instant memory of locations — files, folders, repos, sites, hosts, local servers — for you and every agent, with no model call.
      “Dream” reads back your chats, notes, creations and runs and files every location it finds; using one makes it stronger. Agents ask it
      through the <span class="mono">find_place</span> tool, and any harness can through MCP or SSH (<span class="mono">glassbox-memory.mjs find …</span>).</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><input id="rc-q" placeholder="where is… (e.g. ashfall repo, ollama logs)" style="flex:1 1 240px">
      <button class="btn" id="rc-dream">Dream now</button></div>
    <div class="help" style="margin:6px 0">${P.length} place(s) · ${by('repo')} repos · ${by('dir')+by('file')} paths · ${by('url')+by('local')} sites · ${by('host')} hosts</div>
    <div id="rc-out"></div>
    <details class="dd"><summary>Add a place yourself</summary><div class="ddb"><div class="row" style="gap:6px;flex-wrap:wrap">
      <input id="rc-n" placeholder="name" style="flex:1 1 140px"><input id="rc-w" class="mono" placeholder="path, URL, repo or host" style="flex:2 1 240px">
      <button class="btn small" id="rc-add">Remember</button></div></div></details></div>`;
  const show=()=>{const q=$('#rc-q').value.trim(),res=q?recallFind38(q,P):P.slice().sort((a,b)=>(b.uses||0)-(a.uses||0)||(b.last||0)-(a.last||0)).slice(0,8).map(p=>({p,score:null}));
    $('#rc-out').innerHTML=res.length?res.map(({p,score})=>`<div class="row" style="gap:8px;align-items:center;margin:4px 0;flex-wrap:wrap"><span class="chip">${esc(p.kind)}</span><b>${esc(p.name)}</b>
      <code class="mono" style="flex:1 1 200px;overflow:hidden;text-overflow:ellipsis">${esc(p.where)}</code>${score!=null?`<span class="help">${score}</span>`:''}
      <button class="btn small ghost" data-rcuse="${esc(p.id)}">Copy</button></div>`).join(''):`<p class="help">${q?'Not known — nothing clears the confidence floor. Try Dream now, or add it.':'Nothing yet — press Dream now.'}</p>`;
    $$('[data-rcuse]').forEach(b=>b.onclick=()=>{const p=P.find(x=>x.id===b.dataset.rcuse);if(!p)return;navigator.clipboard.writeText(p.where).then(()=>toast('Copied'),()=>{});recallUse38(p.id);});};
  $('#rc-q').oninput=show;show();
  $('#rc-dream').onclick=async()=>{const b=$('#rc-dream');b.disabled=true;const r=await recallDream38();b.disabled=false;toast(`Dreamed over ${r.seen} sighting(s): ${r.added} new place(s), ${r.total} in all`,4000);recallRender38();};
  $('#rc-add').onclick=async()=>{const w=$('#rc-w').value.trim();if(!w)return;
    const r=recallMerge38(RECALL38.places,[{where:w,kind:/^https?:\/\/github\.com\//.test(w)?'repo':/^https?:/.test(w)?'url':/@/.test(w)?'host':/\.[\w]{1,6}$/.test(w)?'file':'dir',name:$('#rc-n').value.trim()||w.split(/[\\/]/).pop(),source:'you',prov:'person'}]);
    RECALL38.places=r.places;await recallSave38();recallRender38();};
}
