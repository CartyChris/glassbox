# Pass 36 — design system, shell, free providers. base36.html (= gb-repo a09396d) → GlassBox.html
import sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(W+'base36.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count: sys.exit('ANCHOR x%d (want %d): %r'%(n,count,old[:140]))
    s=s.replace(old,new)
rd=lambda f:open(W+'p36/'+f).read()

# ── design system stylesheet: after the main <style>, before anything a person adds at runtime ──
i=s.index('</style>')+len('</style>')
s=s[:i]+'\n<style id="ds36">\n'+rd('ds.css')+'</style>'+s[i:]
rep("""  system:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  inter:""","""  system:'-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI Variable","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  inter:""")
rep('<meta name="theme-color" content="#0b0d12">','<meta name="theme-color" content="#0e0f13" media="(prefers-color-scheme: dark)">\n<meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)">')

# ── modules ──
MODS=['icons.js','shell.js']+[f for f in ['providers.js','glass.js','reader.js','specs.js'] if os.path.exists(W+'p36/'+f)]
rep("/* ═══════════════════ ASSISTANT — the front door","\n".join(rd(f) for f in MODS)+"\n/* ═══════════════════ ASSISTANT — the front door")

# ── tab faces: line icons ──
rep("""      t.el.textContent=(UI.showTabIcons&&t.icon?t.icon+'\xa0\xa0':'')+
        (UI.showTabLabels?t.text:(t.icon?'':t.text));
      t.el.title=t.text;""","""      tabFace36(t);
      t.el.title=t.text;""")
# applyUI ends by resolving the shell for the current width and view
rep("""  const active=$('.view.active');
  if(active){const id=active.id.replace(/^view-/,'');if(tabHidden(id))go(firstVisibleTab());}
}""","""  const active=$('.view.active');
  if(active){const id=active.id.replace(/^view-/,'');if(tabHidden(id))go(firstVisibleTab());}
  try{applyTabPos();shellApply36();}catch(_){}
}""")
# ── tab bar placement: "auto" (sidebar on wide screens, dock on narrow) is the default ──
rep("const TABPOS=['top','left','right','bottom'];","const TABPOS=['auto','top','left','right','bottom'];")
rep("""  const p=TABPOS.includes(UI.tabPos)?UI.tabPos:'top';
  document.body.setAttribute('data-tabpos',p);""","""  const p=tabPosFor36(innerWidth,TABPOS.includes(UI.tabPos)?UI.tabPos:'auto');
  document.body.setAttribute('data-tabpos',p);""")
rep("""  UI.tabPos=TABPOS.includes(p)?p:'top';saveUI();applyTabPos();
  toast('Tab bar moved to the '+UI.tabPos,2000);""","""  UI.tabPos=TABPOS.includes(p)?p:'auto';saveUI();applyTabPos();applyUI();
  toast(UI.tabPos==='auto'?'Navigation: sidebar on wide screens, dock on narrow ones':'Tab bar moved to the '+UI.tabPos,2600);""")
rep("""(UI.tabPos||'top')===p?' on':''""","""(UI.tabPos||'auto')===p?' on':''""")
# ── header ⋯: on a wide screen only the secondary controls go behind it ──
rep("""      [...head.children].forEach(el=>{
        if(el===b||el.classList.contains('brand'))return;
        if(el.classList.contains('spacer'))return;""","""      const phone=document.documentElement.getAttribute('data-onerow')==='1';
      [...head.children].forEach(el=>{
        if(el===b||el.classList.contains('brand'))return;
        if(el.classList.contains('spacer'))return;
        if(!phone&&!(el.id in SEC36))return;
        if(phone&&el.id==='omnibtn')return;""")
rep("bootSafe(storageJunkSweep,fixtureChatBoot,","bootSafe(storageJunkSweep,shellBuild36,fixtureChatBoot,")
rep("""function shellBuild36(){
  const head=""","""function shellBuild36(){
  setTimeout(()=>{try{applyUI();}catch(_){}},0);
  const head=""")
# ── one search: tabs, sections and settings first, then everything the omnibox finds ──
rep("""    <input type="text" id="pal-q" placeholder="Jump to a tab, section, theme or preset…" autocomplete="off">""",
    """    <input type="text" id="pal-q" placeholder="Search tabs, settings, notes, chats…" autocomplete="off" aria-label="Search">""")
rep("""    shown=items.map(it=>({it,s:palScore(term,it.title+' '+(it.sub||''))}))
      .filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,40).map(x=>x.it);""","""    shown=items.map(it=>({it,s:palScore(term,it.title+' '+(it.sub||''))}))
      .filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,term?24:40).map(x=>x.it);
    /* Content too — the old 🔎 search lived in a second box; one place to look is the point. */
    if(term.length>=2&&typeof omniSearch==='function'){try{omniSearch(term,16).forEach(r=>shown.push(
      {kind:r.kind,title:r.title,sub:r.sub||'',run:()=>go(r.go)}));}catch(_){}}""")
# ── Customise: line icons vs emoji ──
rep("""            <label class="chip"><input type="checkbox" id="cz-labels" style="margin:0"> show labels</label>""",
    """            <label class="chip"><input type="checkbox" id="cz-labels" style="margin:0"> show labels</label>
            <label class="chip"><input type="checkbox" id="cz-lineicons" style="margin:0"> line icons (off = emoji)</label>""")
rep("""  $('#cz-scale').oninput=e=>{UI.scale=""","""  const li=$('#cz-lineicons');
  if(li){li.checked=UI.iconStyle!=='emoji';li.onchange=()=>{UI.iconStyle=li.checked?'line':'emoji';saveUI();applyUI();};}
  $('#cz-scale').oninput=e=>{UI.scale=""")

# group headings: icon in its own span (hidden in the sidebar), a drawn chevron instead of ▾/▸
rep("""      chip.innerHTML=`<span class="tg-car">${folded?'▸':'▾'}</span>${esc(g.icon)} ${esc(g.label)}`+""",
    """      chip.innerHTML=`<span class="tg-car" aria-hidden="true">${UI.iconStyle==='emoji'?(folded?'▸':'▾'):ic36('ui:chev')}</span><span class="tg-ico">${esc(g.icon)} </span>${esc(g.label)}`+""")
# Effects: the base look is now glass bars on a calm page; "Living" adds the WebGL light field
rep("""  none:{label:'Flat',hint:'No effects. Fastest, and the safest on an old phone.'},""",
    """  none:{label:'Standard',hint:'Glass bars over a calm page. Turns solid with Reduce Transparency.'},
  living:{label:'Living',hint:'A slow light field behind the glass, drawn by one WebGL shader at a quarter resolution. Pauses when hidden or on 3D tabs.'},""")
rep("toast('Tip: click a group name in the tab bar to fold its tabs away',6000);","toast('Tip: click a section name in the sidebar to fold it away',6000);")
# render-escapes inserted a LIVE payload: with esc() sabotaged, <img src=x onerror=alert(1)> ran and the alert blocked
# the page (a headless run hung on it). An inert probe tag proves injection just as well and can never execute.
rep("""      host.innerHTML='<span>'+g.esc('<img src=x onerror=alert(1)>')+'</span>';""","""      host.innerHTML='<span>'+g.esc('<img data-gb-probe>')+'</span>';""")
rep("""      host.innerHTML='<span>'+'<img src=x>'+'</span>';""","""      host.innerHTML='<span>'+'<img data-gb-probe>'+'</span>';""")
# Sabotage without freezing the page: the button ran ~240 gauntlets in ONE synchronous task, locking the tab for
# minutes (and cases' setTimeout clean-ups could not run in between, so it grew slower as it went). Same work, sliced.
_a=s.index('function gauntletSabotage(){');_b=s.index('function gauntletReport(run){')
s=s[:_a]+"""/* One sabotage: swap the export for its broken version, run the suite, restore unconditionally. */
function sabotageOne(s){
  const g=window.__gb,original=g[s.export];
  if(original===undefined)return{id:s.id,caught:false,note:'export missing — cannot sabotage'};
  try{
    g[s.export]=s.broken();
    const r=gauntletRun();
    return{id:s.id,export:s.export,why:s.why,caught:r.failed>0,failedCases:r.results.filter(x=>!x.ok).map(x=>x.id)};
  }finally{
    g[s.export]=original;                        // unconditional restore
  }
}
function sabotageSummary(baseline,report,after){
  return{baselineGreen:baseline.green,
    sabotages:report.length,
    caught:report.filter(r=>r.caught).length,
    uncaught:report.filter(r=>!r.caught).map(r=>r.id),
    restoredGreen:after.green,
    /* The verdict that matters. If a sabotage slipped through, the suite has a hole exactly
       where it claims coverage — which is worse than an honest gap, because the green result
       actively vouches for the broken guard. */
    verdict:report.every(r=>r.caught)&&after.green
      ?'The suite can go red: every sabotage was caught, and the app was restored to green.'
      :`Coverage hole: ${report.filter(r=>!r.caught).length} sabotage(s) went undetected.`,
    report};
}
/* Synchronous, for scripts and tests. The UI uses gauntletSabotageAsync. */
function gauntletSabotage(){
  const baseline=gauntletRun();
  const report=GAUNTLET_SABOTAGE.map(sabotageOne);
  return sabotageSummary(baseline,report,gauntletRun());
}
/* The same work in ~250 ms slices, yielding between them so the page stays responsive and progress can be shown. */
function gauntletSabotageAsync(onStep){
  return new Promise((resolve,reject)=>{
    const list=GAUNTLET_SABOTAGE.slice(),report=[];let i=0,baseline=null;
    const step=()=>{
      try{
        if(!baseline)baseline=gauntletRun();
        const t0=performance.now();
        while(i<list.length&&performance.now()-t0<250)report.push(sabotageOne(list[i++]));
        if(onStep)try{onStep(i,list.length);}catch(_){}
        if(i<list.length)return setTimeout(step,0);
        resolve(sabotageSummary(baseline,report,gauntletRun()));
      }catch(e){reject(e);}
    };
    setTimeout(step,0);
  });
}
"""+s[_b:]
rep("""    setTimeout(()=>{const sab=gauntletSabotage();GAUNTLET_BUSY=false;
      out().innerHTML=`""","""    gauntletSabotageAsync((i,n)=>{const o=out();if(o)o.innerHTML='<p class="help">Breaking guard '+i+' of '+n+' — the page stays usable while this runs.</p>';})
    .catch(e=>{GAUNTLET_BUSY=false;toast('Sabotage run stopped: '+(e&&e.message||e),6000);return null;})
    .then(sab=>{if(!sab)return;GAUNTLET_BUSY=false;
      out().innerHTML=`""")
rep("""      toast(sab.verdict,8000);renderGauntlet();},20);
  };""","""      toast(sab.verdict,8000);renderGauntlet();});
  };""")
# ── exports + gauntlet ──
rep("storageJunkSweep,fixtureChatSweep,","storageJunkSweep,shellMode36,tabPosFor36,tabFace36,clamp36,contrast36,ICONS36,DOCK36,fixtureChatSweep,")
CASES=open(W+'p36/cases.js').read() if os.path.exists(W+'p36/cases.js') else ''
SAB=open(W+'p36/sab.js').read() if os.path.exists(W+'p36/sab.js') else ''
if CASES: rep("  add({id:'fixture-chat-sweep',",CASES+"\n  add({id:'fixture-chat-sweep',")
if SAB: rep("  {id:'sandbox-noop',",SAB+"\n  {id:'sandbox-noop',")
if os.path.exists(W+'apply36b.py'): exec(open(W+'apply36b.py').read())
open(W+'GlassBox.html','w').write(s)
print('ok',len(s))
