# ═══ B. Sidebar width + Classic view ═══
_i=s.index('<style id="ds36">');_j=s.index('</style>',_i)+len('</style>')
s=s[:_j]+'\n<style id="ds37">\n'+rd('ds.css')+'</style>'+s[_j:]
rep("/* ═══════════════════ ASSISTANT — the front door",rd('shell37.js')+"\n/* ═══════════════════ ASSISTANT — the front door")
rep("  if(typeof living36Sync==='function')living36Sync();\n}","  if(typeof living36Sync==='function')living36Sync();\n  try{shell37Apply();}catch(_){}\n}")
rep("  clampObserve36();\n}","  clampObserve36();\n  try{shell37Build();}catch(_){}\n}")
rep("themeBtn:'Light or dark',","themeBtn:'Light or dark',viewBtn:'Classic view (tabs on top)',")
rep("""  items.push({kind:'action',title:'Web reader tool for agents: '""","""  items.push({kind:'action',title:UI.tabPos==='top'?'Sidebar view (tabs down the side)':'Classic view (every tab across the top)',sub:'Appearance',
    run:()=>classicToggle37()});
  items.push({kind:'action',title:'Web reader tool for agents: '""")
EXPORTS+=['sideClamp37','classicNext37','SIDE37']
