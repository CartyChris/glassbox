# Pass 38 — base38.html (= gb-repo aae0e1b) → GlassBox.html
import sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(W+'base38.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count: sys.exit('ANCHOR x%d (want %d): %r'%(n,count,old[:140]))
    s=s.replace(old,new)
rd=lambda f:open(W+'p38/'+f).read()
MOD_ANCHOR="/* ═══════════════════ ASSISTANT — the front door"
def module(f): rep(MOD_ANCHOR,rd(f)+"\n"+MOD_ANCHOR)

# ═══ A. Cloud terminal ═══
rep('      <div id="term-cloud"></div>','      <div id="term-sbx38"></div>\n      <div id="term-cloud"></div>')
module('cloudterm.js')
rep("function cloudRender(){\n  const host=$('#term-cloud');if(!host)return;","function cloudRender(){\n  try{ctRender38();}catch(e){console.warn('cloud terminal',e);}\n  const host=$('#term-cloud');if(!host)return;")
EXPORTS=['ctTransports38','ctMinutesLeft38','CT38_PRESETS']

for part in ['apply38b.py','apply38c.py','apply38d.py','apply38e.py','apply38f.py']:
    if os.path.exists(W+part): exec(open(W+part).read())
rep("shellMode36,tabPosFor36,tabFace36,",",".join(EXPORTS)+",shellMode36,tabPosFor36,tabFace36,")
if rd('cases.js').strip(): rep("  add({id:'fixture-chat-sweep',",rd('cases.js')+"\n  add({id:'fixture-chat-sweep',")
if rd('sab.js').strip(): rep("  {id:'sandbox-noop',",rd('sab.js')+"\n  {id:'sandbox-noop',")
open(W+'GlassBox.html','w').write(s)
print('ok',len(s))
