/* ═══════════════════ PASS 39 — PHONE NAVIGATION ═══════════════════
   The phone tab bar is four HUBS and All. Together the four hold every section that is switched on, so nothing
   the person picked at setup is more than two taps away. Each hub shows its sections as a scrolling segmented
   row under the title (the iOS pattern: tab bar for places, segmented control for views of a place).
     · Auto (default): the hubs come from the setup answers. Chat is always first; the three hubs with the most
       of what the person picked come next; every other section joins its nearest hub, so the four stay complete.
     · Custom: rename a hub, give it another icon, move sections between hubs, reorder, all on the phone.
   Classic view on a phone is the one scrolling row of tabs across the top. Phone and desktop keep their own
   choice, so picking Classic on a phone does not move the desktop sidebar.
   Home Screen app (iOS standalone): the tab bar sits on the home indicator like a native one, content runs
   under the glass, and a measured correction closes the bottom gap some iOS 26 builds leave (WebKit 158055568:
   the layout viewport ends where Safari's toolbar would have been). The correction has an Off switch and a
   manual knob, because only the phone itself can say what it measured. */
const HUB39_CAND=[
  {id:'chat',  label:'Chat',   icon:'assistant',groups:['talk','setup']},
  {id:'make',  label:'Create', icon:'gen',      groups:['make']},
  {id:'build', label:'Build',  icon:'studio',   groups:['build']},
  {id:'agents',label:'Agents', icon:'vo',       groups:['agents']},
  {id:'models',label:'Models', icon:'modelhub', groups:['models']},
  {id:'know',  label:'Brain',  icon:'brain',    groups:['know']},
];
/* Where a hub that did not get a slot goes — the closest family first. */
const HUB39_NEAR={make:['build','know','agents'],build:['make','agents','know'],agents:['know','build','make'],
  models:['know','agents','build','make'],know:['models','agents','build','make']};
const HUB39_DEFAULT=['make','agents','know'];
const HUB39_SLOTS=4;
let HUB39=Object.assign({mode:'',auto:true,slots:[],last:{},gap:'auto'},store.get('hub39',{}));
const hub39Save=()=>store.set('hub39',HUB39);
/* PURE. Hubs from what is switched on (in the person's order) and what their setup answers asked for.
   Every id in `visible` lands in exactly one hub. */
function hub39Auto(visible,wanted,groupOf){
  const want=new Set(wanted||[]);
  const views={};HUB39_CAND.forEach(c=>views[c.id]=[]);
  (visible||[]).forEach(v=>{
    const g=groupOf(v);
    const c=HUB39_CAND.find(c=>c.groups.includes(g))||HUB39_CAND.find(c=>c.id==='know');
    views[c.id].push(v);
  });
  const score=id=>views[id].filter(v=>want.has(v)).length;
  const rest=HUB39_CAND.filter(c=>c.id!=='chat'&&views[c.id].length).map(c=>c.id);
  const picked=want.size?rest.slice().sort((a,b)=>score(b)-score(a)||HUB39_DEFAULT.concat(rest).indexOf(a)-HUB39_DEFAULT.concat(rest).indexOf(b))
    :HUB39_DEFAULT.filter(id=>rest.includes(id)).concat(rest.filter(id=>!HUB39_DEFAULT.includes(id)));
  const chosen=['chat'].concat(picked.slice(0,HUB39_SLOTS-1));
  const slots=chosen.map(id=>{const c=HUB39_CAND.find(x=>x.id===id);return{id,label:c.label,icon:c.icon,views:views[id].slice()};});
  HUB39_CAND.forEach(c=>{
    if(chosen.includes(c.id)||!views[c.id].length)return;
    const to=(HUB39_NEAR[c.id]||[]).find(x=>chosen.includes(x))||'chat';
    slots.find(s=>s.id===to).views.push(...views[c.id]);
  });
  /* keep the person's own order inside a hub */
  const rank=new Map((visible||[]).map((v,i)=>[v,i]));
  slots.forEach(s=>s.views.sort((a,b)=>rank.get(a)-rank.get(b)));
  return slots.filter(s=>s.views.length||s.id==='chat');
}
/* PURE. A saved (custom) layout made complete again: drop what is switched off, de-duplicate, and put any section
   that is on but in no hub into the hub auto mode would have used — a newly added section is never stranded. */
function hub39Complete(saved,auto,visible){
  const vis=new Set(visible||[]),seen=new Set();
  const slots=(saved||[]).slice(0,HUB39_SLOTS).map(s=>({id:String(s.id||''),label:String(s.label||'Hub').slice(0,18),
    icon:String(s.icon||''),views:(s.views||[]).filter(v=>vis.has(v)&&!seen.has(v)&&seen.add(v))}));
  if(!slots.length)return auto;
  (visible||[]).forEach(v=>{
    if(seen.has(v))return;seen.add(v);
    const home=(auto.find(a=>a.views.includes(v))||{}).id;
    (slots.find(s=>s.id===home)||slots[slots.length-1]).views.push(v);
  });
  return slots;
}
function hub39Visible(){
  return (typeof tabOrderedIds==='function'?tabOrderedIds():REGISTRY.tabs.map(t=>t.id)).filter(id=>!tabHidden(id));
}
function hub39Wanted(){
  return (ONB.picks||[]).map(id=>ONB_INTERESTS.find(x=>x.id===id)).filter(Boolean).flatMap(i=>(i.core||[]).concat(i.more||[]));
}
function hub39Slots(){
  const vis=hub39Visible();
  const auto=hub39Auto(vis,hub39Wanted(),v=>(typeof tabGroupOf==='function'&&tabGroupOf(v))||'');
  return HUB39.auto||!(HUB39.slots||[]).length?auto:hub39Complete(HUB39.slots,auto,vis);
}
const hub39Of=(slots,view)=>(slots||[]).find(s=>s.views.includes(view))||null;
/* PURE. Which navigation a width gets. Phones have their own choice; wider screens keep the desktop setting. */
function navTabPos39(width,mode,tabPos){
  if(width<SHELL36_WIDE)return mode==='classic'?'top':'auto';
  return tabPos||'auto';
}
const navPos39=()=>navTabPos39(innerWidth,HUB39.mode,UI.tabPos);
function hub39SetMode(mode){
  HUB39.mode=mode==='classic'?'classic':'tabs';hub39Save();
  if(document.documentElement.getAttribute('data-navsheet')==='1')shellNavSheet36(false);
  applyTabPos();applyUI();
  toast(HUB39.mode==='classic'?'Classic view: every section in one row across the top':'Tab bar: four hubs at the bottom',2600);
}
const hub39Ic=k=>ic36(k)||ic36('ui:grid');
function dock39Render(){
  const d=document.getElementById('dock36');if(!d)return;
  const slots=hub39Slots();
  const key=JSON.stringify(slots.map(s=>[s.id,s.label,s.icon,s.views.length]));
  if(d.dataset.k39!==key){
    d.dataset.k39=key;
    d.innerHTML=slots.map(s=>`<button type="button" data-hub39="${esc(s.id)}" aria-label="${esc(s.label)}, ${s.views.length} section${s.views.length===1?'':'s'}">${hub39Ic(s.icon)}<span>${esc(s.label)}</span></button>`).join('')+
      `<button type="button" data-d36="__all" aria-expanded="false" aria-controls="tabs">${ic36('ui:grid')}<span>All</span></button>`;
  }
  return slots;
}
function dock39Sync(){
  const d=document.getElementById('dock36');if(!d)return;
  const slots=dock39Render()||[];
  const v=shellCurrent36(),sheet=document.documentElement.getAttribute('data-navsheet')==='1';
  const hub=hub39Of(slots,v);
  if(hub&&HUB39.last[hub.id]!==v){HUB39.last[hub.id]=v;hub39Save();}
  d.querySelectorAll('button').forEach(b=>{
    const on=b.dataset.d36==='__all'?(sheet||!hub):(!sheet&&!!hub&&b.dataset.hub39===hub.id);
    b.classList.toggle('on',on);
    if(b.dataset.hub39)b.setAttribute('aria-current',on?'page':'false');
    if(b.dataset.d36==='__all')b.setAttribute('aria-expanded',sheet?'true':'false');
  });
  subnav39(hub,v);
}
function dock39Tap(id){
  const slots=hub39Slots(),s=slots.find(x=>x.id===id);if(!s||!s.views.length)return;
  const cur=shellCurrent36();
  shellNavSheet36(false);
  if(s.views.includes(cur)){
    /* tapping the hub you are in goes back to its first section, then to the top — the iOS "pop to root" */
    const v=document.querySelector('.view.active');
    if(cur!==s.views[0]&&(!v||v.scrollTop<8))return go(s.views[0]);
    if(v)v.scrollTo({top:0,behavior:'smooth'});return;
  }
  const last=HUB39.last[id];
  go(s.views.includes(last)?last:s.views[0]);
}
/* The hub's sections as a segmented row under the title. Hidden when a hub has one section or outside the tab bar. */
function subnav39(hub,v){
  let el=document.getElementById('subnav39');
  const head=document.querySelector('header.top');if(!head)return;
  const show=document.documentElement.getAttribute('data-shell')==='dock'&&hub&&hub.views.length>1;
  document.documentElement.setAttribute('data-sub39',show?'1':'0');
  if(!show){if(el)el.hidden=true;return;}
  if(!el){
    /* a bar of its own under the title bar: the phone title bar is one row by design (onerow) */
    el=document.createElement('nav');el.id='subnav39';el.className='seg39';el.setAttribute('aria-label','Sections in this hub');
    el.onclick=e=>{const b=e.target.closest('[data-sub39]');if(b)go(b.dataset.sub39);};
    head.after(el);
  }
  el.hidden=false;
  const key=hub.id+'|'+hub.views.join(',')+'|'+v;
  if(el.dataset.k!==key){
    el.dataset.k=key;
    el.innerHTML=hub.views.map(id=>{
      const t=REGISTRY.tabs.find(x=>x.id===id);const lab=(UI.tabLabels&&UI.tabLabels[id])||(t&&t.text)||id;
      return `<button type="button" data-sub39="${esc(id)}"${id===v?' class="on" aria-current="page"':''}>${esc(lab)}</button>`;}).join('');
    const a=el.querySelector('.on');
    if(a)try{a.scrollIntoView({block:'nearest',inline:'center'});}catch(_){}
  }
}

/* ── Home Screen app ───────────────────────────────────────────────────── */
function standalone39(){
  try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;}
  catch(_){return false;}
}
/* PURE. The bottom gap to close: how far the app's area falls short of the screen, only in a Home Screen app,
   only in a believable range (a keyboard or a split view is not a gap). */
function vgap39(screenH,innerH,isStandalone,setting){
  if(!isStandalone||setting==='off')return 0;
  if(Number.isFinite(+setting)&&setting!==''&&setting!=='auto')return Math.max(0,Math.min(160,Math.round(+setting)));
  const g=Math.round((+screenH||0)-(+innerH||0));
  return g>2&&g<=160?g:0;
}
function screenH39(){
  const a=screen.width||0,b=screen.height||0,land=innerWidth>innerHeight;
  return land?Math.min(a,b):Math.max(a,b);
}
function safeArea39(){
  const p=document.createElement('div');
  p.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0';
  document.body.appendChild(p);const s=getComputedStyle(p);const r={top:parseFloat(s.paddingTop)||0,bottom:parseFloat(s.paddingBottom)||0};p.remove();
  return r;
}
function home39Apply(){
  const de=document.documentElement,sa=standalone39();
  de.setAttribute('data-standalone',sa?'1':'0');
  /* A keyboard on screen shrinks the viewport too; never "correct" for it. */
  const kb=window.visualViewport&&visualViewport.height<innerHeight-80;
  const g=kb?0:vgap39(screenH39(),innerHeight,sa,HUB39.gap);
  de.style.setProperty('--vgap39',g+'px');
  return g;
}
function home39Report(){
  const sa=safeArea39();
  return {standalone:standalone39(),screen:screenH39(),inner:innerHeight,visual:window.visualViewport?Math.round(visualViewport.height):null,
    safeTop:sa.top,safeBottom:sa.bottom,gap:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vgap39'))||0};
}

/* ── Customise the tab bar ─────────────────────────────────────────────── */
const HUB39_ICONS=['assistant','lab','gen','studio','three','office','brain','vo','bots','modelhub','local','terminal','factory',
  'design','creations','library','metrics','webos','settings','help','guards','graphs','spline','history','g:talk','g:make','g:build','g:know'];
function hub39Edit(){
  const slots=hub39Slots();
  const r=home39Report();
  const name=id=>{const t=REGISTRY.tabs.find(x=>x.id===id);return (UI.tabLabels&&UI.tabLabels[id])||(t&&t.text)||id;};
  const rows=slots.map((s,i)=>`<div class="hub39-card" data-hubi="${i}">
      <div class="hub39-top">
        <details class="hub39-icons"><summary aria-label="Icon for ${esc(s.label)}">${hub39Ic(s.icon)}</summary>
          <div class="hub39-iconpick">${HUB39_ICONS.map(k=>`<button type="button" data-hubicon="${i}:${esc(k)}" aria-label="${esc(k.replace('g:',''))} icon"${k===s.icon?' class="on"':''}>${hub39Ic(k)}</button>`).join('')}</div></details>
        <input class="hub39-name" data-hubname="${i}" value="${esc(s.label)}" maxlength="18" aria-label="Hub ${i+1} name">
        <span class="hub39-move">
          <button type="button" class="btn ghost small" data-hubup="${i}"${i===0?' disabled':''} aria-label="Move ${esc(s.label)} left">${ic39u('chevron-left')}</button>
          <button type="button" class="btn ghost small" data-hubdown="${i}"${i===slots.length-1?' disabled':''} aria-label="Move ${esc(s.label)} right">${ic39u('chevron-right')}</button>
        </span>
      </div>
      <div class="hub39-views">${s.views.map(v=>`<label class="hub39-v">${esc(name(v))}${ic39u('move')}
        <select data-hubmove="${esc(v)}" aria-label="Move ${esc(name(v))} to another hub">${slots.map((o,j)=>`<option value="${j}"${j===i?' selected':''}>${j===i?'Keep in ':'Move to '}${esc(o.label)}</option>`).join('')}</select></label>`).join('')||'<span class="help">No sections — move some here, or it is hidden from the bar.</span>'}</div>
    </div>`).join('');
  openModal(`<div class="hub39-edit">
    <h3 style="margin-top:0">Phone navigation</h3>
    <div class="seg39 seg39-big" role="radiogroup" aria-label="Layout on a phone">
      <button type="button" role="radio" data-hubmode="tabs" aria-checked="${HUB39.mode!=='classic'}"${HUB39.mode!=='classic'?' class="on"':''}>Tab bar</button>
      <button type="button" role="radio" data-hubmode="classic" aria-checked="${HUB39.mode==='classic'}"${HUB39.mode==='classic'?' class="on"':''}>Classic</button>
    </div>
    <p class="help">${HUB39.auto?'Built from your setup answers. Change anything below and it becomes yours; every section that is switched on stays in one of the four hubs.':'Your own layout. Sections you switch on later join the hub they belong to.'}</p>
    <div class="hub39-list">${rows}</div>
    <div class="row" style="gap:8px;margin-top:12px">
      <button type="button" class="btn ghost small" id="hub39-auto"${HUB39.auto?' disabled':''}>Rebuild from my setup answers</button>
      <button type="button" class="btn ghost small" id="hub39-sections">Switch sections on or off</button>
      <button type="button" class="btn ghost small" id="hub39-redo">Re-run setup</button>
    </div>
    <details class="hub39-diag"><summary>Home Screen app fit</summary>
      <p class="help">On a phone app added to the Home Screen, some iOS versions leave a strip under the tab bar. This closes it by measuring the screen.</p>
      <div class="row" style="gap:8px;align-items:center">
        <select id="hub39-gap" aria-label="Bottom gap correction">
          <option value="auto"${HUB39.gap==='auto'?' selected':''}>Measure automatically</option>
          <option value="off"${HUB39.gap==='off'?' selected':''}>Off</option>
          ${[20,40,60,80,100].map(n=>`<option value="${n}"${String(HUB39.gap)===String(n)?' selected':''}>Lower by ${n}pt</option>`).join('')}
        </select>
      </div>
      <p class="mini muted" id="hub39-diagtext">${r.standalone?'Home Screen app':'In the browser'} · screen ${r.screen}pt · app area ${r.inner}pt${r.visual!=null?' · visible '+r.visual+'pt':''} · safe area ${r.safeTop}/${r.safeBottom}pt · correction ${r.gap}pt</p>
    </details>
  </div>`);
  const commit=next=>{HUB39.auto=false;HUB39.slots=next;hub39Save();applyUI();hub39Edit();};
  const cur=()=>hub39Slots().map(s=>({...s,views:s.views.slice()}));
  $$('[data-hubmode]').forEach(b=>b.onclick=()=>{hub39SetMode(b.dataset.hubmode);hub39Edit();});
  $$('[data-hubname]').forEach(inp=>inp.onchange=()=>{const n=cur();n[+inp.dataset.hubname].label=inp.value.trim()||'Hub';commit(n);});
  $$('[data-hubicon]').forEach(b=>b.onclick=()=>{const [i,k]=b.dataset.hubicon.split(/:(.+)/);const n=cur();n[+i].icon=k;commit(n);});
  $$('[data-hubup]').forEach(b=>b.onclick=()=>{const i=+b.dataset.hubup,n=cur();[n[i-1],n[i]]=[n[i],n[i-1]];commit(n);});
  $$('[data-hubdown]').forEach(b=>b.onclick=()=>{const i=+b.dataset.hubdown,n=cur();[n[i+1],n[i]]=[n[i],n[i+1]];commit(n);});
  $$('[data-hubmove]').forEach(sel=>sel.onchange=()=>{const v=sel.dataset.hubmove,to=+sel.value,n=cur();
    n.forEach(s=>s.views=s.views.filter(x=>x!==v));n[to].views.push(v);commit(n);});
  const a=$('#hub39-auto');if(a)a.onclick=()=>{HUB39.auto=true;HUB39.slots=[];hub39Save();applyUI();hub39Edit();};
  const t=$('#hub39-sections');if(t)t.onclick=()=>openTabManager();
  const rd=$('#hub39-redo');if(rd)rd.onclick=()=>{ONB.done=false;ONB.step=0;saveOnb();closeModal();onbRender();};
  const gp=$('#hub39-gap');if(gp)gp.onchange=()=>{HUB39.gap=gp.value;hub39Save();home39Apply();hub39Edit();};
}
/* a few UI icons not in the tab set */
const IC39_UI={'chevron-left':'<path d="m15 18-6-6 6-6"/>','chevron-right':'<path d="m9 18 6-6-6-6"/>',
  'pencil':'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  'move':'<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  'rows':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>','dock':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 15h18"/>'};
const ic39u=k=>`<svg class="ic36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC39_UI[k]||''}</svg>`;
/* The two switches every phone user needs, at the top of the All sheet. */
function sheet39Build(){
  if(document.getElementById('sheet39'))return;
  const el=document.createElement('div');el.id='sheet39';
  el.innerHTML=`<div class="seg39" role="radiogroup" aria-label="Layout on a phone">
      <button type="button" role="radio" data-sheetmode="tabs">${ic39u('dock')}Tab bar</button>
      <button type="button" role="radio" data-sheetmode="classic">${ic39u('rows')}Classic</button></div>
    <button type="button" class="btn ghost small" id="sheet39-edit">${ic39u('pencil')}Edit tab bar</button>`;
  el.onclick=e=>{
    const m=e.target.closest('[data-sheetmode]');if(m)return hub39SetMode(m.dataset.sheetmode);
    if(e.target.closest('#sheet39-edit')){shellNavSheet36(false);hub39Edit();}
  };
  document.getElementById('app').appendChild(el);
}
function sheet39Sync(){
  const el=document.getElementById('sheet39');if(!el)return;
  el.querySelectorAll('[data-sheetmode]').forEach(b=>{const on=(HUB39.mode==='classic')===(b.dataset.sheetmode==='classic');
    b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false');});
}
/* One-time moves: a phone that had chosen the top bar keeps it; Liquid Glass becomes the look for an
   install that never picked an effect (the old default was "none", saved like any other value). */
function nav39Boot(){
  if(!HUB39.mode){HUB39.mode=UI.tabPos==='top'?'classic':'tabs';hub39Save();}
  if(!store.get('fx39',false)){if(!UI.fx||UI.fx==='none'){UI.fx='glass';saveUI();}store.set('fx39',true);}
  if(UI.iconStyle==='emoji'){UI.iconStyle='line';saveUI();}
  sheet39Build();
  const d=document.getElementById('dock36');
  if(d)d.onclick=e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.d36==='__all')return shellNavSheet36();
    if(b.dataset.hub39)dock39Tap(b.dataset.hub39);};
  home39Apply();
  addEventListener('resize',()=>{home39Apply();});
  if(window.visualViewport)visualViewport.addEventListener('resize',()=>home39Apply());
  try{matchMedia('(display-mode: standalone)').addEventListener('change',()=>home39Apply());}catch(_){}
  /* iOS leaves a Home Screen app's viewport short after the keyboard closes; re-seat and re-measure */
  if(standalone39())document.addEventListener('focusout',()=>setTimeout(()=>{try{scrollTo(0,0);}catch(_){}home39Apply();},300));
}

/* ── Layout check: controls that sit on top of each other, or whose text spills out ──
   Used by the gauntlet on a fixture, and by the phone crawl on every section. Content that scrolls is checked
   as laid out (not as clipped), a closed disclosure is skipped, and the fixed tab bar is compared with nothing,
   because content scrolling under it is the design. */
function layoutAudit39(root){
  const R=root||document.querySelector('.view.active');if(!R)return[];
  const vis=e=>{const d=e.closest('details:not([open])');if(d&&!e.closest('summary'))return false;
    const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return false;
    const b=e.getBoundingClientRect();return b.width>2&&b.height>2;};
  const clipOK=(e,b)=>{let a=e.parentElement;while(a&&a!==document.body){const s=getComputedStyle(a);const o=s.overflowX+s.overflowY;
    if(/(auto|scroll)/.test(o))return true;
    if(/(hidden|clip)/.test(o)){const c=a.getBoundingClientRect();if(b.right<=c.left+1||b.left>=c.right-1||b.bottom<=c.top+1||b.top>=c.bottom-1)return false;}
    a=a.parentElement;}return true;};
  const L=[...R.querySelectorAll('button,a.btn,.chip,input:not([type=hidden]),select')].filter(vis)
    .map(e=>({e,b:e.getBoundingClientRect()})).filter(x=>clipOK(x.e,x.b));
  const nm=e=>e.id||(e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,22);
  /* inside a scroller, a control is only drawn where the scroller is — clip to it when comparing with outside */
  const scroller=e=>{let a=e.parentElement;while(a&&a!==R.parentElement){const s=getComputedStyle(a);if(/(auto|scroll)/.test(s.overflowX+s.overflowY))return a;a=a.parentElement;}return null;};
  const clipTo=(b,c)=>{const r=c.getBoundingClientRect();return{left:Math.max(b.left,r.left),right:Math.min(b.right,r.right),top:Math.max(b.top,r.top),bottom:Math.min(b.bottom,r.bottom)};};
  L.forEach(x=>x.s=scroller(x.e));
  const out=[];
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const A=L[i],B=L[j];if(A.e.contains(B.e)||B.e.contains(A.e))continue;
    let a=A.b,b=B.b;
    if(A.s!==B.s){if(A.s&&!A.s.contains(B.e))a=clipTo(a,A.s);if(B.s&&!B.s.contains(A.e))b=clipTo(b,B.s);}
    const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    if(ox>4&&oy>4)out.push('overlap: '+nm(A.e)+' × '+nm(B.e));
  }
  L.forEach(x=>{if(x.e.tagName!=='BUTTON'||getComputedStyle(x.e).overflow!=='visible')return;
    const rg=document.createRange();rg.selectNodeContents(x.e);const t=rg.getBoundingClientRect();
    if(t.width>0&&(t.left<x.b.left-3||t.right>x.b.right+3||t.top<x.b.top-3||t.bottom>x.b.bottom+3))out.push('spills: '+nm(x.e));});
  return out;
}
