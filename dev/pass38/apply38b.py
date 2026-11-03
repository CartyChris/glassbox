# ═══ B. Tutor tab ═══
rep("""    <button class="tab" data-view="specs">📐 Specs</button>""","""    <button class="tab" data-view="tutor">🎓 Tutor</button>
    <button class="tab" data-view="specs">📐 Specs</button>""")
rep("""    <section class="view" id="view-specs"><div class="wrap"><div id="specs-panel"></div></div></section>""","""    <section class="view" id="view-tutor"><div class="wrap"><div id="tutor-panel"></div></div></section>
    <section class="view" id="view-specs"><div class="wrap"><div id="specs-panel"></div></div></section>""")
rep("""   views:['assistant','genui','lab','council','compare','relay','transplant','pane','history']},""","""   views:['assistant','genui','tutor','lab','council','compare','relay','transplant','pane','history']},""")
rep("""  if(view==='specs')panelGuard(view,()=>specsRender());""","""  if(view==='specs')panelGuard(view,()=>specsRender());
  if(view==='tutor')panelGuard(view,()=>tutorRender38());""")
module('tutor.js')
s=s.replace('ICONS36.specs=','ICONS36.tutor="<path d=\\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\\"/><path d=\\"M22 10v6\\"/><path d=\\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\\"/>";\nICONS36.specs=',1)
EXPORTS+=['tutorNext38','tutorPlan38','tutorJson38']
