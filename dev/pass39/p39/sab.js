  /* ── pass 39 ── */
  {id:'hubs-drop-sections',export:'hub39Auto',why:'sections outside the three chosen hubs vanish from the phone tab bar',broken:()=>(vis,want,gof)=>[{id:'chat',label:'Chat',icon:'assistant',views:(vis||[]).filter(v=>gof(v)==='talk')}]},
  {id:'hub-custom-strands-new',export:'hub39Complete',why:'a section switched on after customising the tab bar is in no hub',broken:()=>(saved)=>(saved||[]).map(s=>({...s,views:(s.views||[]).slice()}))},
  {id:'phone-follows-desktop',export:'navTabPos39',why:'choosing Classic on a phone also moves the desktop layout',broken:()=>(w,mode,pos)=>mode==='classic'?'top':(pos||'auto')},
  {id:'home-gap-in-browser',export:'vgap39',why:'the bottom correction fires in the browser too and lifts the tab bar off the toolbar',broken:()=>(s,i)=>Math.max(0,Math.round(s-i))},
  {id:'emoji-left-alone',export:'emo39Scan',why:'emoji in buttons and headings are drawn as colour emoji',broken:()=>()=>{}},
  {id:'layout-audit-blind',export:'layoutAudit39',why:'the layout check never reports an overlap',broken:()=>()=>[]},
