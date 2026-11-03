  /* ── pass 39 ── */
  add({id:'hub-tabs-hold-everything',sub:'ui',uses:['hub39Auto'],
    what:'the four phone hubs hold every section that is on, exactly once, with Chat first and the hubs the setup answers asked for next',
    run:()=>{const vis=['assistant','lab','gen','three','spline','studio','factory','vo','bots','modelhub','brain','settings','help'];
      const gof=v=>({assistant:'talk',lab:'talk',gen:'make',three:'make',spline:'make',studio:'make',factory:'build',vo:'agents',bots:'agents',modelhub:'models',brain:'know',settings:'setup',help:'setup'})[v];
      const s=g.hub39Auto(vis,['three','spline','gen','studio','factory','vo'],gof);
      const all=s.flatMap(x=>x.views);
      return s.map(x=>x.id).join(',')+' · '+(all.length===vis.length&&new Set(all).size===vis.length&&vis.every(v=>all.includes(v)));},
    expect:v=>v==='chat,make,agents,build · true',
    antiWhat:'and with no setup answers the bar is Chat, Create, Agents, Brain — still holding everything',
    anti:()=>{const vis=['assistant','gen','vo','brain','modelhub','factory'];const gof=v=>({assistant:'talk',gen:'make',vo:'agents',brain:'know',modelhub:'models',factory:'build'})[v];
      const s=g.hub39Auto(vis,[],gof);return s.map(x=>x.label).join(',')+' · '+s.flatMap(x=>x.views).length;},
    antiExpect:v=>v==='Chat,Create,Agents,Brain · 6'});
  add({id:'hub-custom-stays-complete',sub:'ui',uses:['hub39Complete'],
    what:'a hand-made tab bar drops sections that were switched off, never shows one twice, and takes in a newly switched-on section',
    run:()=>{const auto=[{id:'chat',label:'Chat',views:['assistant','lab']},{id:'make',label:'Create',views:['gen','three']}];
      const saved=[{id:'make',label:'Studio',icon:'gen',views:['gen','gen','gone']},{id:'chat',label:'Talk',icon:'assistant',views:['assistant']}];
      const s=g.hub39Complete(saved,auto,['assistant','lab','gen','three']);
      return s.map(x=>x.label+':'+x.views.join('+')).join(' | ');},
    expect:v=>v==='Studio:gen+three | Talk:assistant+lab',
    antiWhat:'and nothing saved means the setup-built layout',
    anti:()=>g.hub39Complete([],[{id:'chat',label:'Chat',views:['assistant']}],['assistant']).map(x=>x.label).join(),antiExpect:v=>v==='Chat'});
  add({id:'phone-has-its-own-layout',sub:'ui',uses:['navTabPos39'],
    what:'a phone uses its own choice (tab bar or classic) and a wide screen keeps the desktop setting',
    run:()=>[g.navTabPos39(390,'classic','auto'),g.navTabPos39(390,'tabs','top'),g.navTabPos39(1440,'classic','auto'),g.navTabPos39(1440,'tabs','right')].join(','),
    expect:v=>v==='top,auto,auto,right',
    antiWhat:'and the boundary is the sidebar width, not one pixel off',
    anti:()=>g.navTabPos39(899,'classic','left')+','+g.navTabPos39(900,'classic','left'),antiExpect:v=>v==='top,left'});
  add({id:'home-screen-gap-measured',sub:'ui',uses:['vgap39'],
    what:'in a Home Screen app the bottom gap is measured from the screen and closed; a manual value and Off are honoured',
    run:()=>[g.vgap39(956,882,true,'auto'),g.vgap39(956,956,true,'auto'),g.vgap39(956,882,true,'40'),g.vgap39(956,882,true,'off')].join(','),
    expect:v=>v==='74,0,40,0',
    antiWhat:'and nothing is corrected in the browser, nor for a keyboard-sized shrink',
    anti:()=>g.vgap39(956,882,false,'auto')+','+g.vgap39(956,520,true,'auto'),antiExpect:v=>v==='0,0'});
  add({id:'emoji-become-line-icons',sub:'ui',uses:['emo39Scan','emo39Strip','emo39Split'],
    what:'emoji in the interface become line icons (an icon-only button keeps a name), attributes lose them, arrows stay as text',
    run:()=>{const box=document.createElement('div');box.style.cssText='position:fixed;left:-4000px;top:0';
      box.innerHTML='<button id="emo39-a">✨ UI on</button><button id="emo39-b">⚙️</button><select><option>🔒 Ask first</option></select>';
      document.body.appendChild(box);
      try{g.emo39Scan(box);const a=box.querySelector('#emo39-a'),b=box.querySelector('#emo39-b');
        return [a.querySelector('svg')?.dataset.ic39,a.textContent.trim(),b.querySelector('svg')?.dataset.ic39,b.getAttribute('aria-label'),
          box.querySelector('option').textContent,g.emo39Strip('Open ↗')==='Open ↗︎'].join(',');}
      finally{box.remove();}},
    expect:v=>v==='sparkles,UI on,settings,Settings,Ask first,true',
    antiWhat:'and what a model or a person wrote (markdown, code) keeps its emoji',
    anti:()=>{const box=document.createElement('div');box.innerHTML='<div class="md">Party 🎉</div><pre>✅ ok</pre>';
      document.body.appendChild(box);try{g.emo39Scan(box);return box.textContent;}finally{box.remove();}},antiExpect:v=>v==='Party 🎉✅ ok'});
  add({id:'no-emoji-left-in-chrome',sub:'ui',uses:['emo39Left'],
    what:'the header, the tab bar and the sidebar draw no emoji at all once the page has settled',
    run:()=>{
      return ['header.top','#dock36','#tabs'].map(s=>document.querySelector(s)).filter(Boolean).flatMap(el=>g.emo39Left(el)).join(' | ')||'none';},
    expect:v=>v==='none',
    antiWhat:'and the checker does see an emoji when one is there',
    anti:()=>{const box=document.createElement('div');box.innerHTML='<span>🚀 go</span>';document.body.appendChild(box);
      try{return g.emo39Left(box).length;}finally{box.remove();}},antiExpect:v=>v===1});
  add({id:'layout-audit-finds-overlap',sub:'ui',uses:['layoutAudit39'],
    what:'the layout check reports two controls drawn on top of each other and a label spilling out of its button',
    run:()=>{const box=document.createElement('div');box.style.cssText='position:fixed;left:0;top:0;width:300px;height:120px;z-index:-1;opacity:.01';
      box.innerHTML='<button style="position:absolute;left:0;top:0;width:100px;height:40px">A</button><button style="position:absolute;left:50px;top:10px;width:100px;height:40px">B</button>'+
        '<button style="position:absolute;left:0;top:60px;width:40px;height:40px;white-space:nowrap;overflow:visible;padding:0">a long label here</button>';
      document.body.appendChild(box);box.style.opacity='1';
      try{return g.layoutAudit39(box).map(x=>x.split(':')[0]).sort().join(',');}finally{box.remove();}},
    expect:v=>v.includes('overlap')&&v.includes('spills'),
    antiWhat:'and a clean row of buttons reports nothing',
    anti:()=>{const box=document.createElement('div');box.style.cssText='position:fixed;left:0;top:0;width:400px;display:flex;gap:8px;z-index:-1';
      box.innerHTML='<button>One</button><button>Two</button><button>Three</button>';document.body.appendChild(box);
      try{return g.layoutAudit39(box).length;}finally{box.remove();}},antiExpect:v=>v===0});
