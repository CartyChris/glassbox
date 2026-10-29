/* ═══════════════════ PASS 37 — AI-LOOK CHECK ═══════════════════
   Trending this week: Nutlope/hallmark (MIT, ~41k★) and pbakaus/impeccable (Apache-2.0, ~93k★) — design skills
   that catch "AI slop" before it ships. Their insight, kept here: split the tells into a FLOOR (never ship: broken
   for someone) and REFLEXES (defaults a model falls into — fine with a reason, a smell without one), check them
   MECHANICALLY rather than by asking a model whether its own page looks generic, and give every finding its fix.
   This is an independent, compact rule set written for this app (no code copied); no model call, works offline. */
const SLOP37={steer:store.get('slop37',{steer:true}).steer!==false};
const SLOP37_HYPE=/\b(unlock the (full )?power|revolutioni[sz]e|seamless(ly)?|elevate your|next[- ]gen(eration)?|cutting[- ]edge|game[- ]?changer|supercharge|effortless(ly)?|unleash|harness the power|in today'?s fast[- ]paced|take .{0,20} to the next level|all[- ]in[- ]one)\b/gi;
const SLOP37_AIHUE=/#(6366f1|8b5cf6|a855f7|7c3aed|9333ea|ec4899|d946ef|c026d3|818cf8|a78bfa)\b|\b(indigo|purple|violet|fuchsia|magenta)\b/gi;
/* PURE (needs DOMParser). html → {score, floor, reflex, findings:[{id,tier,msg,fix}]}. */
function slopCheck37(html){
  const src=String(html||'');const out=[];
  const add=(id,tier,msg,fix)=>out.push({id,tier,msg,fix});
  let doc=null;try{doc=new DOMParser().parseFromString(src,'text/html');}catch(_){}
  const css=doc?[...doc.querySelectorAll('style')].map(s=>s.textContent).join('\n')+'\n'+
    [...doc.querySelectorAll('[style]')].map(e=>'x{'+e.getAttribute('style')+'}').join('\n'):src;
  const cls=doc?[...doc.querySelectorAll('[class]')].map(e=>e.getAttribute('class')).join(' '):'';
  const text=doc&&doc.body?doc.body.textContent.replace(/\s+/g,' '):src.replace(/<[^>]+>/g,' ');
  const rules=css.match(/[^{}]*\{[^{}]*\}/g)||[];
  const cnt=(re,s)=>((s||'').match(re)||[]).length;
  /* ── floor ── */
  if(rules.some(r=>/gradient/i.test(r)&&/background-clip\s*:\s*text/i.test(r))||(/\bbg-clip-text\b/.test(cls)&&/\bbg-gradient-/.test(cls)))
    add('gradient-text','floor','gradient-filled headline text','Solid ink for type. Put colour in one accent element, not in the letters.');
  if(/transition(-property)?\s*:\s*all\b/i.test(css)||/\btransition-all\b/.test(cls))
    add('transition-all','floor','transition: all','Name the properties that move (opacity, transform). "all" animates layout and jank comes with it.');
  if(doc){
    const emo=[...doc.querySelectorAll('h1,h2,h3,h4,button,li,.icon,[class*="icon"]')].filter(e=>/^\s*\p{Extended_Pictographic}/u.test(e.textContent||''));
    if(emo.length>=2)add('emoji-icons','floor',emo.length+' emoji used as icons ("'+emo[0].textContent.trim().slice(0,12)+'"…)','Use one line-icon set (aria-hidden) or no icon. Emoji render differently on every system.');
    const nested=[...doc.querySelectorAll('[class*="card"]')].filter(e=>e.parentElement&&e.parentElement.closest('[class*="card"]'));
    if(nested.length)add('card-in-card','floor',nested.length+' card(s) nested inside a card','Flatten: a section heading and a divider group content better than a box in a box.');
    const unnamed=[...doc.querySelectorAll('button,a[href]')].filter(b=>!(b.textContent||'').trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title'));
    if(unnamed.length)add('unnamed-control','floor',unnamed.length+' icon-only control(s) with no name','Give every icon button an aria-label; a screen reader otherwise says "button".');
  }
  if(/(?:^|[;{\s])(min-)?height\s*:\s*100[sdl]?vh/i.test(css)||/\b(min-)?h-screen\b/.test(cls))
    add('hero-vh','floor','a section sized to 100vh','Size the hero by its content. A full-screen hero hides the page on a laptop and jumps on a phone.');
  if((/@keyframes|animation\s*:/i.test(css)||/\banimate-/.test(cls))&&!/prefers-reduced-motion/i.test(css+src)&&!/\bmotion-(safe|reduce):/.test(cls))
    add('motion-no-reduce','floor','animation with no prefers-reduced-motion fallback','Wrap motion in @media (prefers-reduced-motion: no-preference) or turn it off under reduce.');
  if(/lorem ipsum|\bFILL ME\b|\bJohn Doe\b|\bJane Doe\b|example@example\.|\bAcme (Inc|Corp)\b/i.test(text))
    add('placeholder','floor','placeholder content ("lorem ipsum", "John Doe", "Acme"…)','Use the real material, or leave a visible gap the owner must fill — never a fake that looks finished.');
  const fams=new Set((css.match(/font-family\s*:\s*([^;}]+)/gi)||[]).map(f=>f.split(':')[1].split(',')[0].trim().replace(/["']/g,'').toLowerCase()).filter(f=>!/^(inherit|initial|var\()/.test(f)));
  if(fams.size>3)add('font-soup','floor',fams.size+' font families ('+[...fams].slice(0,4).join(', ')+')','Two families at most: one for text, one for display — or one used well.');
  /* ── reflexes ── */
  const grads=css.match(/gradient\([^)]*(\([^)]*\)[^)]*)*\)/gi)||[];
  if(grads.some(g=>cnt(SLOP37_AIHUE,g)>=2)||(/\bfrom-(indigo|purple|violet|fuchsia)-\d00\b/.test(cls)&&/\bto-(pink|purple|fuchsia|violet)-\d00\b/.test(cls)))
    add('ai-gradient','reflex','the indigo→purple→pink gradient','The single most recognisable AI default. Pick a colour from the subject (a brand, a material, a photo) and use it flat.');
  if(cnt(/\b(bg|text|from|to|via|border)-(indigo|purple|violet|fuchsia|slate)-\d00\b/g,cls)>=3)
    add('tailwind-defaults','reflex','the default Tailwind palette, unchanged','Define your own tokens; the stock indigo/slate ramp reads as "generated".');
  const first=[...fams][0]||'';
  if(/^(inter|poppins|space grotesk|montserrat)$/.test(first)&&fams.size<=1)
    add('default-font','reflex','"'+first+'" as the only typeface','Fine for UI text; give headings a face with character, or set Inter with tighter tracking and real weight contrast.');
  if((/repeat\(\s*3\s*,\s*(minmax\([^)]*\)|1fr)\s*\)/i.test(css)||/\bgrid-cols-3\b/.test(cls))&&doc&&doc.querySelectorAll('[class*="feature"],[class*="card"]').length>=3)
    add('three-tiles','reflex','three equal icon-and-blurb tiles','Lead with the one thing that matters; vary size and weight, or use a list with real detail.');
  if(cnt(/:hover[^{]*\{[^}]*scale\(/gi,css)+cnt(/\bhover:scale-/g,cls)>=3)
    add('hover-scale','reflex','hover-grow on many elements','Reserve motion for what is clickable and meaningful; a colour or underline change is calmer.');
  if((css.match(/cubic-bezier\(([^)]*)\)/gi)||[]).some(c=>c.replace(/[^\d.,-]/g,'').split(',').map(Number).some((v,i)=>(i===1||i===3)&&(v>1||v<0))))
    add('overshoot','reflex','bouncy overshoot easing','Use a plain ease-out; overshoot makes an interface feel like a toy.');
  if(cnt(/backdrop-filter\s*:/gi,css)+cnt(/\bbackdrop-blur/g,cls)>=4)
    add('glass-everywhere','reflex','frosted glass on many surfaces','Glass on one floating layer (a header or a sheet), solid surfaces elsewhere.');
  const hype=(text.match(SLOP37_HYPE)||[]);
  if(hype.length>=2)add('hype-copy','reflex','marketing filler: "'+[...new Set(hype.map(h=>h.toLowerCase()))].slice(0,3).join('", "')+'"','Say what it does, for whom, in plain words. Specific beats superlative.');
  if(doc&&[...doc.querySelectorAll('h1,h2,h3')].some(h=>/[✨🚀⚡🔥💡]/u.test(h.textContent||'')))
    add('sparkle-headings','reflex','✨ / 🚀 in headings','Drop them; a heading earns attention with words.');
  const h1=doc&&doc.querySelector('h1');
  if(h1&&(h1.textContent||'').trim().split(/\s+/).length>12)add('long-h1','reflex','a '+(h1.textContent||'').trim().split(/\s+/).length+'-word h1','Under ten words; the rest belongs in the lede.');
  if(/\b\d+(\.\d+)?\s?[x×] (faster|better|more)\b|\b99\.9+%|\b\d{1,3}(,\d{3})+\+?\s(users|customers|developers|teams)\b/i.test(text))
    add('invented-metrics','reflex','headline numbers ("10x faster", "99.9%", "10,000+ users")','Keep only numbers the owner supplied, with their source.');
  const floor=out.filter(f=>f.tier==='floor').length,reflex=out.length-floor;
  return{score:Math.max(0,100-12*floor-4*reflex),floor,reflex,findings:out};
}
/* The builder is told the same rules up front — cheaper than fixing them after. Constant text, so it stays in the
   cache-stable half of the prompt. */
function slopSteer37(){
  if(!SLOP37.steer)return'';
  return 'DESIGN FLOOR (when you produce UI): no gradient-filled text; no "transition: all"; no emoji as icons; no card inside a card; '+
    'no 100vh hero; every animation has a prefers-reduced-motion fallback; every icon-only control has an aria-label; no lorem ipsum, '+
    'John Doe or invented metrics; at most two font families. AVOID THE AI LOOK: no indigo→purple→pink gradient, no stock Tailwind '+
    'palette, no three identical icon tiles, no hover-scale on everything, no bouncy easing, glass on one layer at most, no hype copy '+
    '("seamless", "unlock the power", "revolutionize"), no ✨/🚀 in headings. Prefer one confident colour taken from the subject, '+
    'real content, plain specific words, and hierarchy through size and weight.';
}
function slopReportHTML37(r){
  if(!r)return'';
  const row=f=>`<li><b>${esc(f.msg)}</b> <span class="chip${f.tier==='floor'?' bad':''}" style="font-size:11px">${f.tier==='floor'?'never ship':'AI habit'}</span><div class="help">${esc(f.fix)}</div></li>`;
  return `<div class="diagbox${r.floor?' bad':''}"><b>${r.score}/100</b> — ${r.findings.length?`${r.floor} must-fix, ${r.reflex} AI habit${r.reflex===1?'':'s'}`:'no tells found'}</div>`+
    (r.findings.length?`<ul style="margin:10px 0 0 18px;display:grid;gap:8px">${r.findings.map(row).join('')}</ul>`:'');
}
function dsSlop(host){
  const last=(CREATIONS||[]).find(c=>c&&c.files&&Object.keys(c.files).some(n=>/\.html?$/i.test(n)));
  host.innerHTML=`<div class="card"><h3>AI-look check</h3>
    <p class="help">Checks a page for the tells that make UI look machine-made — gradient text, the indigo-to-pink gradient, emoji
      icons, cards in cards, hype copy — and for the floor no page should ship below (motion without a reduced-motion fallback,
      unnamed icon buttons, placeholder content). No model call. Rule tiers follow this month's most-starred design skills
      (Hallmark, Impeccable); the rules are this app's own.</p>
    <label class="chip" style="margin:6px 0"><input type="checkbox" id="slop-steer"${SLOP37.steer?' checked':''} style="margin:0"> tell the builder these rules up front</label>
    <textarea id="slop-in" class="mono" rows="9" placeholder="Paste HTML here" style="width:100%;margin-top:8px"></textarea>
    <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="btn" id="slop-run">Check</button>
      <button class="btn small" id="slop-last"${last?'':' disabled'}>${last?'Load latest creation — '+esc(String(last.title).slice(0,40)):'No HTML creation yet'}</button>
      <button class="btn small ghost" id="slop-fix" disabled>Fix with the primary model</button>
    </div>
    <div id="slop-out" style="margin-top:12px"></div></div>`;
  let report=null;
  const run=()=>{report=slopCheck37($('#slop-in').value);$('#slop-out').innerHTML=slopReportHTML37(report);$('#slop-fix').disabled=!report.findings.length;return report;};
  $('#slop-steer').onchange=e=>{SLOP37.steer=e.target.checked;store.set('slop37',{steer:SLOP37.steer});};
  $('#slop-run').onclick=run;
  $('#slop-last').onclick=()=>{if(!last)return;const n=Object.keys(last.files).find(n=>/\.html?$/i.test(n));$('#slop-in').value=last.files[n];run();};
  /* The model rewrites; the CHECK decides whether it helped — a "fix" that scores lower is shown as such, not kept quietly. */
  $('#slop-fix').onclick=async()=>{
    const before=report||run();if(!before.findings.length)return;
    const btn=$('#slop-fix');btn.disabled=true;btn.textContent='Fixing…';
    try{
      const acc=await streamComplete({model:primaryModel(),maxTokens:16000,temperature:0.3,messages:[
        {role:'system',content:'You fix a web page. Return the COMPLETE corrected HTML document and nothing else — no fences, no commentary. Keep all content, links, forms and scripts working.\n'+slopSteer37()},
        {role:'user',content:'Fix these findings:\n'+before.findings.map(f=>'- '+f.msg+' → '+f.fix).join('\n')+'\n\nPAGE:\n'+$('#slop-in').value.slice(0,60000)}]},null,null,'ai-look fix');
      let html=String(acc.content||'').trim().replace(/^```(?:html)?\s*/i,'').replace(/```\s*$/,'');
      const after=slopCheck37(html);
      if(after.score>=before.score&&/<\/?(html|body|div|section|main)/i.test(html)){$('#slop-in').value=html;report=after;
        $('#slop-out').innerHTML=`<p class="help">${before.score} → <b>${after.score}</b> after the rewrite.</p>`+slopReportHTML37(after);}
      else $('#slop-out').innerHTML=`<p class="help">The rewrite scored ${after.score} (was ${before.score}), so it was not kept.</p>`+slopReportHTML37(before);
    }catch(e){toast('Fix failed: '+(e.message||e),5000);}
    btn.textContent='Fix with the primary model';btn.disabled=false;
  };
}
