/* ═══════════════════ PASS 36 — SHELL ═══════════════════
   Navigation in one place per form factor, decided by width, never by user agent:
     · ≥900px  "side"  — the tab bar becomes a grouped sidebar (the existing data-tabpos=left grid)
     · <900px  "dock"  — a five-item glass dock at the bottom; "All" opens every tab as a sheet
   Both reuse the SAME .tab buttons, their handlers, folding, ordering and hiding — nothing is
   rebuilt, so every feature that reads or writes the tab bar keeps working.
   A person who picked top/left/right/bottom in Customise keeps it ("classic"); "auto" is the default. */
const ic36=(k,cls)=>ICONS36[k]?`<svg class="ic36${cls?' '+cls:''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS36[k]}</svg>`:'';
const SHELL36_WIDE=900;
const DOCK36=[['assistant','Chat'],['lab','Reason'],['gen','Create'],['brain','Brain'],['__all','All']];
/* Header controls that live behind ⋯ on a wide screen, with the words their icon buttons lack. */
const SEC36={autoBtn:'Automate a task',projpill:'',fsBtn:'Fullscreen this tab',popBtn:'Open in its own window',
  themeBtn:'Light or dark',modeBtn:'How many tabs to show',helpBtn:'Help',spendpill:''};
/* PURE. Which shell a width and a tab-position setting produce. */
function shellMode36(width,tabPos){
  if(tabPos&&tabPos!=='auto')return 'classic';
  return width>=SHELL36_WIDE?'side':'dock';
}
/* PURE. Where the tab bar goes for a setting at a width. */
function tabPosFor36(width,tabPos){
  if(!tabPos||tabPos==='auto')return width>=SHELL36_WIDE?'left':'top';
  return tabPos;
}
/* One tab's face: a line icon and its name. Emoji are kept for anyone who chose a custom icon or
   switched icon style back, and an icon-only bar still has an accessible name. */
function tabFace36(t){
  const lab=(UI.tabLabels&&UI.tabLabels[t.id])||t.text;
  const custom=UI.tabIcons&&UI.tabIcons[t.id];
  if(UI.iconStyle==='emoji'||custom||!ICONS36[t.id]){
    t.el.textContent=(UI.showTabIcons&&(custom||t.icon)?(custom||t.icon)+'\u00a0\u00a0':'')+(UI.showTabLabels?lab:((custom||t.icon)?'':lab));
  }else{
    t.el.innerHTML=(UI.showTabIcons?ic36(t.id):'')+((UI.showTabLabels||!UI.showTabIcons)?`<span class="tl36">${esc(lab)}</span>`:'');
  }
  if(!UI.showTabLabels)t.el.setAttribute('aria-label',lab);else t.el.removeAttribute('aria-label');
}
function shellCurrent36(){return (typeof currentView==='function'&&currentView())||'';}
function shellNavSheet36(on){
  const de=document.documentElement;
  const open=on==null?de.getAttribute('data-navsheet')!=='1':!!on;
  de.setAttribute('data-navsheet',open?'1':'0');
  const all=document.querySelector('#dock36 [data-d36="__all"]');
  if(all)all.setAttribute('aria-expanded',open?'true':'false');
  shellDock36();
  if(open){const a=document.querySelector('#tabs .tab.active');if(a)a.scrollIntoView({block:'nearest'});}
}
function shellDock36(){
  const d=document.getElementById('dock36');if(!d)return;
  const v=shellCurrent36(),sheet=document.documentElement.getAttribute('data-navsheet')==='1';
  const inDock=DOCK36.some(([id])=>id===v);
  d.querySelectorAll('button').forEach(b=>{
    const id=b.dataset.d36;
    const on=id==='__all'?(sheet||!inDock):(!sheet&&id===v);
    b.classList.toggle('on',on);
    if(id!=='__all')b.setAttribute('aria-current',on?'page':'false');
  });
}
function shellBuild36(){
  const head=document.querySelector('header.top');if(!head||head.dataset.s36)return;
  head.dataset.s36='1';
  /* Search: the one entry point for tabs, sections, settings AND content. */
  const omni=document.getElementById('omnibtn');
  if(omni){
    omni.classList.add('s36');omni.setAttribute('role','button');omni.tabIndex=0;
    omni.setAttribute('aria-label','Search or jump to anything (⌘K)');
    omni.innerHTML=ic36('ui:search')+'<span class="s36-l">Search or jump to…</span><span class="s36-k">⌘K</span>';
    omni.onclick=()=>openPalette();
    omni.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPalette();}};
    const brand=head.querySelector('.brand');
    if(brand&&brand.nextElementSibling!==omni)brand.after(omni);
  }
  const brand=head.querySelector('.brand>div');
  if(brand&&!brand.querySelector('.s36-name')){
    const small=brand.querySelector('small');
    brand.innerHTML='<span class="s36-name">Glassbox&nbsp;Jet</span><span class="s36-title"></span>';
    if(small)brand.appendChild(small);
  }
  Object.entries(SEC36).forEach(([id,l])=>{const el=document.getElementById(id);if(el&&l)el.setAttribute('data-l36',l);});
  const more=document.getElementById('tb-more');
  if(more){more.innerHTML=ic36('ui:more');more.setAttribute('aria-haspopup','menu');}
  if(!document.getElementById('dock36')){
    const d=document.createElement('nav');d.id='dock36';d.setAttribute('aria-label','Main');
    d.innerHTML=DOCK36.map(([id,l])=>{
      const t=id==='__all'?null:(REGISTRY.tabs||[]).find(x=>x.id===id);
      return `<button type="button" data-d36="${id}"${id==='__all'?' aria-expanded="false" aria-controls="tabs"':''}>${ic36(id==='__all'?'ui:grid':id)}<span>${esc(l||(t&&t.text)||id)}</span></button>`;
    }).join('');
    d.onclick=e=>{const b=e.target.closest('[data-d36]');if(!b)return;
      const id=b.dataset.d36;
      if(id==='__all')return shellNavSheet36();
      shellNavSheet36(false);goEnsure(id);};
    document.getElementById('app').appendChild(d);
  }
  /* Picking a tab from the sheet closes it — the sheet is a way to get somewhere, not a place. */
  const nav=document.getElementById('tabs');
  if(nav)nav.addEventListener('click',e=>{
    if(document.documentElement.getAttribute('data-navsheet')!=='1')return;
    if(e.target.closest('.tab[data-view]'))setTimeout(()=>shellNavSheet36(false),0);
  });
  addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.documentElement.getAttribute('data-navsheet')==='1'){shellNavSheet36(false);}
  });
  clampObserve36();
}
/* Called at the end of applyUI — which go(), resize and every setting change already run. */
function shellApply36(){
  const de=document.documentElement;
  const mode=shellMode36(innerWidth,UI.tabPos);
  de.setAttribute('data-shell',mode);
  de.setAttribute('data-icons',UI.iconStyle==='emoji'?'emoji':'line');
  if(mode!=='dock'&&de.getAttribute('data-navsheet')==='1')de.setAttribute('data-navsheet','0');
  const v=shellCurrent36();
  const t=(REGISTRY.tabs||[]).find(x=>x.id===v);
  const title=document.querySelector('header.top .s36-title');
  if(title)title.textContent=t?((UI.tabLabels&&UI.tabLabels[v])||t.text):'';
  shellDock36();
  clamp36();
  if(typeof living36Sync==='function')living36Sync();
}

/* ── Long descriptions: two lines and "More" ─────────────────────────────
   Most panels open with a paragraph explaining why the feature exists. Useful once, clutter every
   visit after. Only prose is clamped: never a paragraph holding a control, never output or chat. */
const CLAMP36_SEL=':is(.card,.wrap,section,.panel)>:is(p,.help,div.help)';
const CLAMP36_SKIP='.oui-root,.asst-msgs,.amsg,.md,.msg,pre,.out,[contenteditable],.modal,.pal,.no-clamp36,.term,.ee-doc,.of-paper,#tb-sheet';
/* Headings keep their emoji in the DOM (search, REGISTRY and screen readers still see them) but the
   line-icon style does not draw them: a page of "🔍 Glass-Pane", "📎 Paperclip", "⚡ Cache" is the look
   this pass removes. Only a heading's FIRST text node is touched. */
function emoji36(r){
  r.querySelectorAll('h1,h2,h3,h4,.subtab,.chip,.btn').forEach(h=>{
    if(h.dataset.e36)return;h.dataset.e36='1';
    const t=[...h.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()||n.nodeType===1);
    if(!t||t.nodeType!==3)return;
    const m=t.textContent.replace(/^\s+/,'').match(RE_TAB_ICON);if(!m)return;
    const lead=t.textContent.match(/^\s*/)[0];
    const rest=t.textContent.slice(lead.length+m[0].length);
    if(!rest.trim()&&h.textContent.trim()===t.textContent.trim())return;   // the emoji IS the label
    const sp=document.createElement('span');sp.className='emo36';sp.setAttribute('aria-hidden','true');sp.textContent=m[0];
    t.textContent=t.textContent.slice(lead.length+m[0].length);
    h.insertBefore(sp,t);
  });
}
function clamp36(root){
  const r=root||document.querySelector('.view.active');if(!r)return;
  emoji36(r);
  r.querySelectorAll(CLAMP36_SEL).forEach(el=>{
    if(el.dataset.c36)return;
    el.dataset.c36='1';
    if(el.closest(CLAMP36_SKIP)||el.querySelector('input,select,textarea,button,canvas,svg,img,table'))return;
    if((el.textContent||'').trim().length<260)return;
    el.classList.add('clamp36');
    /* Only keep the clamp if it actually hides something at this width. */
    if(el.scrollHeight<=el.clientHeight+2){el.classList.remove('clamp36');return;}
    const b=document.createElement('button');b.type='button';b.className='more36';b.textContent='More';
    b.setAttribute('aria-expanded','false');
    b.onclick=()=>{const open=!el.classList.contains('open');el.classList.toggle('open',open);
      b.textContent=open?'Less':'More';b.setAttribute('aria-expanded',open?'true':'false');};
    el.onclick=e=>{if(!el.classList.contains('open')&&!e.target.closest('a'))b.click();};
    el.after(b);
  });
}
let CLAMP36_T=0;
function clampObserve36(){
  const main=document.getElementById('main');if(!main||main._c36)return;main._c36=1;
  new MutationObserver(()=>{clearTimeout(CLAMP36_T);CLAMP36_T=setTimeout(()=>clamp36(),350);})
    .observe(main,{childList:true,subtree:true});
}

/* ── Contrast check (WCAG 2.x relative luminance), used by the gauntlet ── */
function contrast36(fg,bg){
  const lum=h=>{const m=String(h).trim().match(/^#?([0-9a-f]{6})$/i);if(!m)return null;
    const n=parseInt(m[1],16),c=[n>>16,(n>>8)&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
    return .2126*c[0]+.7152*c[1]+.0722*c[2];};
  const a=lum(fg),b=lum(bg);if(a==null||b==null)return 0;
  return Math.round(((Math.max(a,b)+.05)/(Math.min(a,b)+.05))*100)/100;
}
