# ═══ C. S1 recall (places) ═══
module('recall.js')
rep('    <section class="view" id="view-brain"><div class="wrap">','    <section class="view" id="view-brain"><div class="wrap">\n      <div id="recall38"></div>')
rep("  if(view==='brain')panelGuard(view,()=>{renderBrainDomains();renderBrainConsole();renderTraces();});","  if(view==='brain')panelGuard(view,()=>{recallRender38();renderBrainDomains();renderBrainConsole();renderTraces();});")
rep("""  if(typeof READER36!=='undefined'&&READER36.on)
    out.push({name:'read_web_page',""","""  out.push({name:'find_place',description:'System-1 recall: where a file, folder, repo, site, host or local server is — instant, no search. '+
    'Answers "not known" rather than guessing; then look it up properly. Input: {"query":"ashfall repo"}.',
    schema:{type:'object',properties:{query:{type:'string'}},required:['query']},source:'recall'});
  if(typeof READER36!=='undefined'&&READER36.on)
    out.push({name:'read_web_page',""")
rep("    else if(spec.source==='reader')  result=await readerFetch((args||{}).url);","""    else if(spec.source==='reader')  result=await readerFetch((args||{}).url);
    else if(spec.source==='recall'){await recallLoad38();const hits=recallFind38((args||{}).query,RECALL38.places);
      hits.forEach(h=>recallUse38(h.p.id));
      result=hits.length?hits.map(h=>`${h.p.kind}: ${h.p.where}  (${h.p.name}; confidence ${h.score})`).join('\\n'):'not known — no place clears the confidence floor; search for it and it will be remembered next time';}""")
# sync places with the bridge file every CLI reads
rep("""    const r=await bridgePost('/memory',{op:'push',baseRev:MEM_REV,
      docs:brainLive(),graphs:GRAPHS});
    if(r.conflict){""","""    await recallLoad38();
    const r=await bridgePost('/memory',{op:'push',baseRev:MEM_REV,
      docs:brainLive(),graphs:GRAPHS,places:RECALL38.places});
    if(r.conflict){
      if(r.memory&&Array.isArray(r.memory.places)){RECALL38.places=recallUnion38(RECALL38.places,r.memory.places);await recallSave38();}""")
rep("""      const retry=await bridgePost('/memory',{op:'push',baseRev:MEM_REV,
        docs:brainLive(),graphs:GRAPHS});""","""      const retry=await bridgePost('/memory',{op:'push',baseRev:MEM_REV,
        docs:brainLive(),graphs:GRAPHS,places:RECALL38.places});""")
rep("""    const m=r.memory||{docs:[],graphs:[]};
    const have=new Set(BRAIN.docs.map(d=>String(d.name).toLowerCase()));""","""    const m=r.memory||{docs:[],graphs:[]};
    if(Array.isArray(m.places)&&m.places.length){await recallLoad38();RECALL38.places=recallUnion38(RECALL38.places,m.places);await recallSave38();}
    const have=new Set(BRAIN.docs.map(d=>String(d.name).toLowerCase()));""")
EXPORTS+=['recallExtract38','recallMerge38','recallUnion38','recallFind38','RECALL38_FLOOR']
