  /* ── pass 36: shell, icons, contrast, clamping ── */
  add({id:'shell-mode-by-width',sub:'ui',uses:['shellMode36','tabPosFor36'],
    what:'wide screens get the sidebar, narrow ones the dock, and a chosen tab position is kept',
    run:()=>[g.shellMode36(1440),g.shellMode36(393,'auto'),g.shellMode36(1440,'top'),
      g.tabPosFor36(1440,'auto'),g.tabPosFor36(393,'auto'),g.tabPosFor36(393,'right')].join(','),
    expect:v=>v==='side,dock,classic,left,top,right',
    antiWhat:'and the boundary belongs to the sidebar, not the dock',
    anti:()=>g.shellMode36(900,'auto')+','+g.shellMode36(899,'auto'),antiExpect:v=>v==='side,dock'});

  add({id:'tab-face-line-icons',sub:'ui',uses:['tabFace36','ICONS36'],
    what:'a tab shows a drawn icon and its name, keeps an accessible name without a label, and emoji style still works',
    run:()=>{const keep={s:g.UI.iconStyle,i:g.UI.showTabIcons,l:g.UI.showTabLabels,ti:g.UI.tabIcons};
      try{const t={id:'lab',text:'Reason Lab',icon:'🔬',el:document.createElement('button')};
        g.UI.iconStyle='line';g.UI.showTabIcons=true;g.UI.showTabLabels=true;g.UI.tabIcons={};
        g.tabFace36(t);const line=!!t.el.querySelector('svg')&&t.el.textContent.trim()==='Reason Lab';
        g.UI.showTabLabels=false;g.tabFace36(t);const named=t.el.getAttribute('aria-label')==='Reason Lab'&&!t.el.textContent.trim();
        g.UI.showTabLabels=true;g.UI.iconStyle='emoji';g.tabFace36(t);const emoji=t.el.textContent.includes('🔬')&&!t.el.querySelector('svg');
        return [line,named,emoji].join(',');
      }finally{g.UI.iconStyle=keep.s;g.UI.showTabIcons=keep.i;g.UI.showTabLabels=keep.l;g.UI.tabIcons=keep.ti;}},
    expect:v=>v==='true,true,true',
    antiWhat:'and a tab with no drawn icon falls back to its emoji rather than going blank',
    anti:()=>{const keep=g.UI.iconStyle;try{g.UI.iconStyle='line';const t={id:'no-such-tab',text:'X',icon:'🧪',el:document.createElement('button')};
      g.tabFace36(t);return t.el.textContent.includes('🧪');}finally{g.UI.iconStyle=keep;}},antiExpect:v=>v===true});

  add({id:'text-contrast-aa',sub:'a11y',uses:['contrast36'],
    what:'every text colour of the design system reads at 4.5:1 or better on its surfaces, in dark and light',
    run:()=>{const css=(document.getElementById('ds36')||{}).textContent||'';
      const blocks=[css.match(/:root\{([^}]*)\}/),css.match(/:root\[data-theme="light"\]\{([^}]*)\}/)].map(m=>m?m[1]:'');
      const bad=[];
      blocks.forEach((b,bi)=>{const v=k=>(b.match(new RegExp('--'+k+':\\s*(#[0-9a-fA-F]{6})'))||[])[1];
        [['ink','bg'],['ink','panel2'],['ink2','panel2'],['ink3','panel2'],['ink3','bg'],['acc','panel2'],['acc','bg'],['on-acc','acc-fill']]
          .forEach(([f,s])=>{const r=g.contrast36(v(f),v(s));if(!(r>=4.5))bad.push((bi?'light ':'dark ')+f+'/'+s+'='+r);});});
      return bad.length?bad.join('; '):'aa';},
    expect:v=>v==='aa',
    antiWhat:'and the check can fail: mid-grey on mid-grey is far below 4.5',
    anti:()=>g.contrast36('#777777','#888888'),antiExpect:v=>v>0&&v<4.5});

  add({id:'long-prose-clamps',sub:'ui',uses:['clamp36'],
    what:'a long description folds to two lines with a More button; short text and text holding a control are left alone',
    run:()=>{const box=document.createElement('div');box.style.cssText='position:fixed;left:-2000px;top:0;width:300px';
      const long='This explains at length why the feature exists and what it measures, '.repeat(6);
      box.innerHTML=`<div class="card"><p id="c36a">${long}</p><p id="c36b">Short note.</p><p id="c36c">${long}<button>x</button></p></div>`;
      document.body.appendChild(box);
      try{g.clamp36(box);
        const a=box.querySelector('#c36a'),b=box.querySelector('#c36b'),c=box.querySelector('#c36c');
        return [a.classList.contains('clamp36')&&!!(a.nextElementSibling&&a.nextElementSibling.classList.contains('more36')),
          !b.classList.contains('clamp36'),!c.classList.contains('clamp36')].join(',');
      }finally{box.remove();}},
    expect:v=>v==='true,true,true',
    antiWhat:'and a paragraph that already fits is not given a pointless More button',
    anti:()=>{const box=document.createElement('div');box.style.cssText='position:fixed;left:-4000px;top:0;width:4000px';
      box.innerHTML=`<div class="card"><p>${'word '.repeat(60)}</p></div>`;document.body.appendChild(box);
      try{g.clamp36(box);return box.querySelectorAll('.more36').length;}finally{box.remove();}},antiExpect:v=>v===0});

  add({id:'dock-targets-real',sub:'ui',uses:['DOCK36'],
    what:'every dock button points at a tab that exists, so the phone dock cannot lead nowhere',
    run:()=>{const ids=new Set((g.REGISTRY||{tabs:[]}).tabs.map(t=>t.id));
      const miss=g.DOCK36.filter(([id])=>id!=='__all'&&!ids.has(id)).map(([id])=>id);
      return g.DOCK36.length===5&&!miss.length?'ok':'missing:'+miss.join(',');},
    expect:v=>v==='ok',
    antiWhat:'and a renamed tab would be caught',
    anti:()=>{const ids=new Set((g.REGISTRY||{tabs:[]}).tabs.map(t=>t.id));return ids.has('no-such-tab-36');},antiExpect:v=>v===false});

  add({id:'light-tinted-buttons-readable',sub:'a11y',uses:['contrast36'],
    what:'in the light theme a secondary (tinted) button keeps dark accent text, not white on a pale tint',
    run:()=>{const de=document.documentElement,keep=de.getAttribute('data-theme');const b=document.createElement('button');
      b.className='btn small';b.textContent='x';document.body.appendChild(b);
      try{de.setAttribute('data-theme','light');return getComputedStyle(b).color;}finally{b.remove();de.setAttribute('data-theme',keep||'dark');}},
    expect:v=>v!=='rgb(255, 255, 255)'&&/^rgb/.test(v),
    antiWhat:'and the primary button in the light theme is white on solid blue',
    anti:()=>{const de=document.documentElement,keep=de.getAttribute('data-theme');const b=document.createElement('button');
      b.className='btn';b.textContent='x';document.body.appendChild(b);
      try{de.setAttribute('data-theme','light');return getComputedStyle(b).color;}finally{b.remove();de.setAttribute('data-theme',keep||'dark');}},
    antiExpect:v=>v==='rgb(255, 255, 255)'});
