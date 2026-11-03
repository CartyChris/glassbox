# Pass 39 — base39.html (= gb-repo 1396b6d, build 2d318cdbda8c7a22) → GlassBox.html
# Phone navigation (hubs + classic + Home Screen fit), no emoji in the interface, Apple-style Liquid Glass default.
import sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(W+'base39.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count: sys.exit('ANCHOR x%d (want %d): %r'%(n,count,old[:140]))
    s=s.replace(old,new)
rd=lambda f:open(W+'p39/'+f).read()
MOD_ANCHOR="/* ═══════════════════ ASSISTANT — the front door"
def module(f): rep(MOD_ANCHOR,rd(f)+"\n"+MOD_ANCHOR)

# ═══ CSS: after the pass-37 sheet so it wins at equal specificity; user CSS still comes last ═══
i=s.index('<style id="ds37">');j=s.index('</style>',i)+len('</style>')
s=s[:j]+'\n<style id="ds39">\n'+rd('ds.css')+rd('classic-asst.css')+'</style>'+s[j:]

# ═══ Modules ═══
module('emo-data.js');module('emo.js');module('nav.js')

# ═══ Dock = hubs ═══
rep("""function shellDock36(){
  const d=document.getElementById('dock36');if(!d)return;
  const v=shellCurrent36(),sheet=document.documentElement.getAttribute('data-navsheet')==='1';
  const inDock=DOCK36.some(([id])=>id===v);
  d.querySelectorAll('button').forEach(b=>{
    const id=b.dataset.d36;
    const on=id==='__all'?(sheet||!inDock):(!sheet&&id===v);
    b.classList.toggle('on',on);
    if(id!=='__all')b.setAttribute('aria-current',on?'page':'false');
  });
}""","""function shellDock36(){
  /* pass 39: the dock is four hubs built from the setup answers (nav.js) */
  try{dock39Sync();sheet39Sync();}catch(e){console.warn('dock',e);}
}""")
rep("""  const mode=shellMode36(innerWidth,UI.tabPos);
  de.setAttribute('data-shell',mode);
  de.setAttribute('data-icons',UI.iconStyle==='emoji'?'emoji':'line');""","""  const mode=shellMode36(innerWidth,navPos39());
  de.setAttribute('data-shell',mode);
  de.setAttribute('data-phone39',innerWidth<SHELL36_WIDE?'1':'0');
  de.setAttribute('data-icons','line');""")
rep("  const p=tabPosFor36(innerWidth,TABPOS.includes(UI.tabPos)?UI.tabPos:'auto');","  const p=tabPosFor36(innerWidth,navPos39());")
rep("""  clampObserve36();
  try{shell37Build();}catch(_){}""","""  clampObserve36();
  try{shell37Build();}catch(_){}
  try{nav39Boot();}catch(e){console.warn('nav39',e);}
  try{emo39Start();}catch(e){console.warn('emo39',e);}""")
# Classic switch: on a phone it is the phone's own choice
rep("""function classicToggle37(on){
  UI.tabPos=on==null?classicNext37(UI.tabPos):(on?'top':'auto');""","""function classicToggle37(on){
  if(innerWidth<SHELL36_WIDE){const c=on==null?HUB39.mode!=='classic':!!on;hub39SetMode(c?'classic':'tabs');return c?'top':'auto';}
  UI.tabPos=on==null?classicNext37(UI.tabPos):(on?'top':'auto');""")
rep("""function shell37Apply(){
  const b=document.getElementById('viewBtn');
  if(b){const l=UI.tabPos==='top'?'Sidebar view':'Classic view (tabs on top)';""","""function shell37Apply(){
  const b=document.getElementById('viewBtn');
  const narrow=innerWidth<SHELL36_WIDE,classic=narrow?HUB39.mode==='classic':UI.tabPos==='top';
  if(b&&narrow){const l=classic?'Tab bar at the bottom':'Classic view (tabs on top)';
    b.setAttribute('data-l36',l);b.title=l;b.setAttribute('aria-label',l);b.setAttribute('aria-pressed',classic?'true':'false');}
  else if(b){const l=UI.tabPos==='top'?'Sidebar view':'Classic view (tabs on top)';""")

# ═══ Line icons only ═══
rep("  if(UI.iconStyle==='emoji'||custom||!ICONS36[t.id]){","  if(!ICONS36[t.id]){")
rep('            <label class="chip"><input type="checkbox" id="cz-lineicons" style="margin:0"> line icons (off = emoji)</label>\n','')
rep("        g.UI.showTabLabels=true;g.UI.iconStyle='emoji';g.tabFace36(t);const emoji=t.el.textContent.includes('🔬')&&!t.el.querySelector('svg');",
    "        g.UI.showTabLabels=true;g.UI.iconStyle='emoji';g.UI.tabIcons={lab:'🧪'};g.tabFace36(t);const emoji=!!t.el.querySelector('svg')&&!t.el.textContent.includes('🧪');")
rep("    what:'a tab shows a drawn icon and its name, keeps an accessible name without a label, and emoji style still works',",
    "    what:'a tab shows a drawn icon and its name, keeps an accessible name without a label, and is never drawn as an emoji',")
rep("        g.tabFace36(t);const line=!!t.el.querySelector('svg')&&t.el.textContent.trim()==='Reason Lab';",
    "        g.tabFace36(t);const line=!!t.el.querySelector('svg')&&t.el.textContent.trim()==='Reason Lab';")

# ═══ Dock case follows the hubs ═══
rep("""  add({id:'dock-targets-real',sub:'ui',uses:['DOCK36'],
    what:'every dock button points at a tab that exists, so the phone dock cannot lead nowhere',
    run:()=>{const ids=new Set((g.REGISTRY||{tabs:[]}).tabs.map(t=>t.id));
      const miss=g.DOCK36.filter(([id])=>id!=='__all'&&!ids.has(id)).map(([id])=>id);
      return g.DOCK36.length===5&&!miss.length?'ok':'missing:'+miss.join(',');},""","""  add({id:'dock-targets-real',sub:'ui',uses:['hub39Slots'],
    what:'every phone hub points at sections that exist, there are at most four, and Chat is one of them',
    run:()=>{const ids=new Set((g.REGISTRY||{tabs:[]}).tabs.map(t=>t.id));const s=g.hub39Slots();
      const miss=s.flatMap(x=>x.views).filter(v=>!ids.has(v));
      return s.length<=4&&s.some(x=>x.views.includes('assistant'))&&!miss.length?'ok':'missing:'+miss.join(',');},""")
rep("""  {id:'dock-dead-target',export:'DOCK36',why:'a dock button leads to a tab that does not exist',broken:()=>[['nope','X'],['lab','R'],['gen','C'],['brain','B'],['__all','All']]},""",
    """  {id:'dock-dead-target',export:'hub39Slots',why:'a dock button leads to a tab that does not exist',broken:()=>()=>[{id:'chat',label:'Chat',views:['assistant','nope']}]},""")

# ═══ Chat toolbar: switches report their state ═══
rep("  $('#asst-auto').title=ASST.auto?'Tools run without asking':'Every tool call asks you first';",
    "  $('#asst-auto').title=ASST.auto?'Tools run without asking':'Every tool call asks you first';\n  $('#asst-auto').setAttribute('aria-pressed',String(!!ASST.auto));$('#asst-auto').setAttribute('aria-label',ASST.auto?'Tools run without asking':'Tools ask first');")

# ═══ Liquid Glass is the default look ═══
rep("  fx:'none',fxReduce:true,userCss:'',","  fx:'glass',fxReduce:true,userCss:'',")
rep("  glass:{label:'Liquid Glass',hint:'Translucent frosted panels with a specular edge and a lit backdrop.'},",
    "  glass:{label:'Liquid Glass',hint:'The default. Glass title bar, tab bar, sheets and menus over solid content, the way iOS does it.'},")

# ═══ Setup → tab bar ═══
rep("  ONB.done=true;saveOnb();saveUI();applyUI();","  ONB.done=true;saveOnb();HUB39.auto=true;HUB39.slots=[];hub39Save();saveUI();applyUI();")
rep("""        <p class="help" style="margin:0 0 6px"><b>Your top bar will be:</b></p>
        <div>${named}</div>""","""        <p class="help" style="margin:0 0 6px"><b>Your sections:</b></p>
        <div>${named}</div>
        <p class="help" style="margin:10px 0 6px"><b>On a phone, the tab bar:</b> ${(()=>{try{const vis=tabs;const s=hub39Auto(vis,(ONB.picks||[]).map(id=>ONB_INTERESTS.find(x=>x.id===id)).filter(Boolean).flatMap(i=>(i.core||[]).concat(i.more||[])),v=>tabGroupOf(v)||'');
          return s.map(x=>'<span class="onb-chip">'+esc(x.label)+' · '+x.views.length+'</span>').join('');}catch(_){return '';}})()}</p>""")

rep("      toast('Tip: click a section name in the sidebar to fold it away',6000);",
    "      toast(innerWidth<SHELL36_WIDE&&HUB39.mode!=='classic'?'Tip: All shows every section; Edit tab bar there changes the four hubs':'Tip: click a section name in the sidebar to fold it away',6000);")
# WebOS desktop: as many rows as the desk is tall, so the last icons never sit under its dock on a phone
rep('''function wosIconPos(id,i){
  if(WOS.iconPos[id])return WOS.iconPos[id];
  return{x:18+Math.floor(i/7)*104,y:16+(i%7)*92};
}''','''let WOS_GRID39={rows:7,w:104};
function wosIconPos(id,i){
  if(WOS.iconPos[id])return WOS.iconPos[id];
  return{x:18+Math.floor(i/WOS_GRID39.rows)*WOS_GRID39.w,y:16+(i%WOS_GRID39.rows)*92};
}''')
rep('''  const apps=wosAllApps();
  const sz=WOS.iconSize||84;''','''  const apps=wosAllApps();
  const sz=WOS.iconSize||84;
  {const desk=root.querySelector('.wos-desk');const h=desk&&desk.clientHeight?desk.clientHeight:(root.clientHeight||0)-170;
    WOS_GRID39={rows:h>0?Math.max(3,Math.min(7,Math.floor((h-sz-16)/92)+1)):7,w:innerWidth<500?Math.max(sz+4,88):104};}''')
EXPORTS=['hub39Auto','hub39Complete','hub39Slots','navTabPos39','vgap39','home39Report','emo39Scan','emo39Strip','emo39Split','emo39Icon','emo39Left','layoutAudit39','EMO39_MAP','HUB39_CAND','get HUB39(){return HUB39}']
rep("shellMode36,tabPosFor36,tabFace36,",",".join(EXPORTS)+",shellMode36,tabPosFor36,tabFace36,")
rep("  add({id:'fixture-chat-sweep',",rd('cases.js')+"\n  add({id:'fixture-chat-sweep',")
rep("  {id:'sandbox-noop',",rd('sab.js')+"\n  {id:'sandbox-noop',")
open(W+'GlassBox.html','w').write(s)
print('ok',len(s))
