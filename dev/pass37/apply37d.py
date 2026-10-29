# ═══ D. S1 harness modules — the loop reads them; the UI edits them through the gate ═══
rep("/* ═══════════════════ ASSISTANT — the front door",rd('s1mod.js')+"\n/* ═══════════════════ ASSISTANT — the front door")
rep("  if(envKind==='order'){decl=JSON.parse(JSON.stringify(S1_ORDER_SPACE));env=s1OrderDesk(o.scenario);goal=env.goal;}",
    "  if(envKind==='order'){decl=s1ModApply37(JSON.parse(JSON.stringify(S1_ORDER_SPACE)),'order');env=s1OrderDesk(o.scenario);goal=env.goal;}")
rep("    decl=JSON.parse(JSON.stringify(S1_COMPUTER_SPACE));decl.gate=Object.assign({},S1CFG.gate);",
    "    decl=s1ModApply37(JSON.parse(JSON.stringify(S1_COMPUTER_SPACE)),'screen');decl.gate=Object.assign({},S1CFG.gate);")
rep("    escalate:esc2||undefined,confirmGoal:","    instructions:s1Lessons37()||undefined,escalate:esc2||undefined,confirmGoal:")
rep("      if(S1_CONSEQUENTIAL.test(label))consequential[c.ref]=desc;else elements[c.ref]=desc;","      if(s1Consequential37(label))consequential[c.ref]=desc;else elements[c.ref]=desc;")
rep("    const p=S1_DECISION_PRESETS.find(x=>x.id===c.soPreset)||S1_DECISION_PRESETS[S1_DECISION_PRESETS.length-1];",
    "    const P=s1Presets37(),p=P.find(x=>x.id===c.soPreset)||P[P.length-1];")
rep("    if(p.key&&!c.soKey)return{error:p.label+' needs a key — paste it under Who decides.'};",
    """    if(p.key&&!c.soKey)return{error:p.label+' needs a key — paste it under Who decides.'};
    /* A profile on the one-letter wire (Cua-S1-style logprobs, any fine-tune behind an OpenAI-compatible server). */
    if(p.wire==='letter')return{decide:s1LetterDecider({endpoint:url.replace(/\\/chat\\/completions$/,''),key:c.soKey,model:(c.soModel||p.model||'').trim(),
      family:p.family||'general_decision',app:(S1_ENVS[envKind]||{}).label}),label:'letter ('+(c.soModel||p.model||p.id)+')'};""")
rep("<select id=\"s1-sop\">${S1_DECISION_PRESETS.map(x=>","<select id=\"s1-sop\">${s1Presets37().map(x=>")
rep("(S1_DECISION_PRESETS.find(x=>x.id===c.soPreset)||{})","(s1Presets37().find(x=>x.id===c.soPreset)||{})",3)
rep('<div id="s1-panel"></div>','<div id="s1-panel"></div><div id="s1mod37" style="margin-top:14px"></div>')
rep("  const h=$('#s1-panel');if(!h)return;\n  const c=S1CFG,envKind","  const h=$('#s1-panel');if(!h)return;\n  setTimeout(()=>{try{s1ModRender37();}catch(e){console.warn('s1 modules',e);}},0);\n  const c=S1CFG,envKind")
EXPORTS+=['get S1MOD(){return S1MOD}','s1ModBundle','s1PatchApply','s1PatchGate37','s1Checks37','s1BundleToOps','s1Presets37','s1Consequential37','s1ModApply37']
