/* ═══════════════════ PASS 37 — SIDEBAR WIDTH + CLASSIC VIEW ═══════════════════
   Sidebar: drag its edge (or focus the edge and use ←/→) to resize; drag it narrow and it becomes an icon rail;
   double-click the edge to reset. Classic view: every tab across the top in ONE scrolling row, the layout before
   pass 36 — it is the existing "top" tab position, so nothing else in the app has to know about it. */
const SIDE37={min:180,max:480,rail:64,railBelow:132,def:240};
/* PURE. A requested sidebar width → what is drawn. Below railBelow it snaps to the icon rail. */
function sideClamp37(w){
  w=Math.round(+w);if(!isFinite(w))return{w:SIDE37.def,rail:false};
  if(w<SIDE37.railBelow)return{w:SIDE37.rail,rail:true};
  return{w:Math.max(SIDE37.min,Math.min(SIDE37.max,w)),rail:false};
}
function sideSet37(w,save){
  const r=sideClamp37(w),de=document.documentElement;
  de.style.setProperty('--side-w',r.w+'px');
  de.setAttribute('data-rail',r.rail?'1':'0');
  const g=document.getElementById('side37-grip');
  if(g){g.setAttribute('aria-valuenow',String(r.w));g.setAttribute('aria-valuetext',r.rail?'icons only':r.w+' pixels');}
  if(save)store.set('sideW37',r.w);
  return r;
}
/* PURE. Classic view is the "top" tab position; leaving it goes back to automatic (sidebar or dock by width). */
function classicNext37(tabPos){return tabPos==='top'?'auto':'top';}
function classicToggle37(on){
  UI.tabPos=on==null?classicNext37(UI.tabPos):(on?'top':'auto');
  saveUI();applyUI();
  toast(UI.tabPos==='top'?'Classic view — every tab across the top. Scroll the row, or ⋯ → Sidebar view to go back.':'Sidebar view',3200);
  return UI.tabPos;
}
function shell37Build(){
  const app=document.getElementById('app');
  if(app&&!document.getElementById('side37-grip')){
    const g=document.createElement('div');
    g.id='side37-grip';g.tabIndex=0;g.setAttribute('role','separator');g.setAttribute('aria-orientation','vertical');
    g.setAttribute('aria-label','Sidebar width — drag, or use the arrow keys; double-click to reset');
    g.setAttribute('aria-valuemin',String(SIDE37.rail));g.setAttribute('aria-valuemax',String(SIDE37.max));
    g.title='Drag to resize · double-click to reset';
    let x0=0,w0=0,drag=false;
    g.onpointerdown=e=>{if(e.button!==0)return;drag=true;x0=e.clientX;
      const nav=document.getElementById('tabs');w0=nav?nav.getBoundingClientRect().width:SIDE37.def;
      g.setPointerCapture(e.pointerId);document.documentElement.setAttribute('data-resizing','1');e.preventDefault();};
    g.onpointermove=e=>{if(drag)sideSet37(w0+e.clientX-x0,false);};
    const end=e=>{if(!drag)return;drag=false;document.documentElement.removeAttribute('data-resizing');
      try{g.releasePointerCapture(e.pointerId);}catch(_){}
      const nav=document.getElementById('tabs');sideSet37(nav?nav.getBoundingClientRect().width:SIDE37.def,true);};
    g.onpointerup=end;g.onpointercancel=end;
    g.ondblclick=()=>{sideSet37(SIDE37.def,true);toast('Sidebar width reset',1500);};
    g.onkeydown=e=>{
      const cur=+(g.getAttribute('aria-valuenow')||SIDE37.def);
      const step=e.shiftKey?48:16;
      if(e.key==='ArrowLeft'){e.preventDefault();sideSet37(cur<=SIDE37.min?SIDE37.rail:cur-step,true);}
      else if(e.key==='ArrowRight'){e.preventDefault();sideSet37(cur<=SIDE37.rail?SIDE37.min:cur+step,true);}
      else if(e.key==='Home'){e.preventDefault();sideSet37(SIDE37.rail,true);}
      else if(e.key==='End'){e.preventDefault();sideSet37(SIDE37.max,true);}
      else if(e.key==='Enter'){e.preventDefault();sideSet37(cur<=SIDE37.rail?SIDE37.def:SIDE37.rail,true);}
    };
    app.appendChild(g);
  }
  sideSet37(store.get('sideW37',SIDE37.def),false);
  /* Classic view switch: a header control, so on a wide screen it lands in ⋯ like the other secondary controls. */
  const head=document.querySelector('header.top');
  if(head&&!document.getElementById('viewBtn')){
    const b=document.createElement('button');b.id='viewBtn';b.type='button';b.className='btn ghost small';
    b.innerHTML=ic36('ui:side')||'▤';
    /* close ⋯ first (its document-click handler puts the moved controls back), then switch */
    b.onclick=e=>{if(e)e.stopPropagation();if(b.closest('#tb-sheet'))document.body.click();classicToggle37();};
    const more=document.getElementById('tb-more');head.insertBefore(b,more||null);
  }
  /* In the one-row strip a mouse wheel scrolls sideways — most mice have no horizontal wheel. */
  const nav=document.getElementById('tabs');
  if(nav&&!nav._wheel37){nav._wheel37=1;
    nav.addEventListener('wheel',e=>{
      if(document.documentElement.getAttribute('data-shell')!=='classic'||document.body.getAttribute('data-tabpos')!=='top')return;
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX)||nav.scrollWidth<=nav.clientWidth)return;
      nav.scrollLeft+=e.deltaY;e.preventDefault();},{passive:false});}
}
function shell37Apply(){
  const b=document.getElementById('viewBtn');
  if(b){const l=UI.tabPos==='top'?'Sidebar view':'Classic view (tabs on top)';
    b.setAttribute('data-l36',l);b.title=l;b.setAttribute('aria-label',l);b.setAttribute('aria-pressed',UI.tabPos==='top'?'true':'false');}
  if(UI.tabPos==='top'){const a=document.querySelector('#tabs .tab.active');if(a&&a.scrollIntoView)try{a.scrollIntoView({block:'nearest',inline:'nearest'});}catch(_){}}
}
