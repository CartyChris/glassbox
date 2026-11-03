/* ═══════════════════ PASS 38 — STACK: skill packs + the agent ecosystem ═══════════════════
   Skill packs come in for real: the importer lists every SKILL.md in a GitHub repo (git trees API — no key, answers browsers),
   you pick, and they join the skill library switched OFF (so they cost nothing until chosen or auto-selected). The tool list
   is the verified install line from each project's own README; "Run" types it into the cloud terminal, "Copy" is for your Mac. */
const STACK38_PACKS=[['addyosmani/agent-skills','25 production engineering skills — review, testing, interviewing requirements'],
  ['affaan-m/ECC','ECC — skills, instincts, memory and security for any coding harness'],
  ['rohitg00/ai-engineering-from-scratch','AI engineering curriculum as skills — learn it, build it, ship it'],
  ['NVIDIA/OpenShell','how to drive OpenShell sandboxes and write their policies'],['Nutlope/hallmark','the anti-AI-slop design skill']];
const STACK38=[
  {g:'Harness kits',n:'ECC',r:'affaan-m/ECC',cmd:'npx ecc-universal@2.2.3 setup',why:'Skills, hooks, memory and security for Claude Code, Codex, OpenCode and more.'},
  {g:'Harness kits',n:'Agent Skills',r:'addyosmani/agent-skills',cmd:'npx skills add addyosmani/agent-skills',why:'25 engineering skills for any agent; also importable into GlassBox above.'},
  {g:'Harness kits',n:'AI engineering from scratch',r:'rohitg00/ai-engineering-from-scratch',cmd:'npx skills add rohitg00/ai-engineering-from-scratch',why:'A full curriculum as skills — pair with the Tutor tab to learn it step by step.'},
  {g:'Sandboxes',n:'NVIDIA OpenShell',r:'NVIDIA/OpenShell',cmd:'curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh && openshell sandbox create --name glassbox',why:'Policy-checked sandbox for any agent: filesystem, network and process rules; credentials never visible to the agent. Needs Docker, Podman or host virtualisation.',mac:true},
  {g:'Sandboxes',n:'Cloud terminal',r:'',cmd:'',why:'Already here: Terminal tab → Cloud terminal (a Vercel Sandbox per session).'},
  {g:'Coding agents',n:'OpenHands Agent Canvas',r:'OpenHands/OpenHands',cmd:'npm install -g @openhands/agent-canvas',why:'Multi-step build/test/fix with orchestration.'},
  {g:'Coding agents',n:'Aider',r:'Aider-AI/aider',cmd:'curl -LsSf https://astral.sh/uv/install.sh | sh && . $HOME/.local/bin/env && uv tool install --python 3.12 aider-chat',why:'Git-native pair programmer: maps the repo, edits, commits.'},
  {g:'Coding agents',n:'Letta Code',r:'letta-ai/letta',cmd:'npm install -g @letta-ai/letta-code',why:'Stateful agent with self-editing memory.'},
  {g:'Memory',n:'mem0 CLI',r:'mem0ai/mem0',cmd:'npm install -g @mem0/cli',why:'A memory layer; GlassBox’s own MCP memory (glassbox-memory.mjs) already gives every harness Brain + S1 places — run one, not both, for the same facts.'},
  {g:'Mac inference (also in Settings → Local)',n:'Locals',r:'Generated-Computers/Locals',cmd:'uv tool install --python 3.12 locals && locals start',why:'Many agents at once on one Mac (continuous batching) at 127.0.0.1:8321.',mac:true},
  {g:'Mac inference (also in Settings → Local)',n:'mlx-serve',r:'ddalcu/mlx-serve',cmd:'brew install mlx-serve && mlx-serve run gemma4',why:'Native MLX server, no Python, OpenAI + Anthropic + Ollama APIs at :11234.',mac:true},
  {g:'Mac inference (also in Settings → Local)',n:'Osaurus',r:'osaurus-ai/osaurus',cmd:'brew install --cask osaurus',why:'Native macOS harness and server at 127.0.0.1:1337.',mac:true},
  {g:'Mac inference (also in Settings → Local)',n:'MLX LM',r:'ml-explore/mlx-lm',cmd:'pip install mlx-lm && mlx_lm.server --model mlx-community/Qwen3-8B-4bit',why:'Apple’s own: inference, quantisation, LoRA; Model Forge writes its training configs.',mac:true},
  {g:'Agent OS research',n:'Octopus SI OS',r:'miuuyy/Octopus-SI-OS',cmd:'',why:'Agent execution on OS principles: artifacts, runs that park and wake, per-arrival policy, marks after a verifier passes. Research preview (Rust kernel).'},
  {g:'Agent OS research',n:'DeepSeek superagent',r:'deepseek-ai/dsh-superagent-prototype',cmd:'',why:'Proactive repo agent for DeepSeek Harness: work items from GitHub, own session per item, a panel for what needs a person.'},
  {g:'3D',n:'Hi3D v1.0',r:'hi3d-official/Hi3Dv1.0',cmd:'',why:'Open refinement model (Sparc3D lineage): reference image + coarse mesh → high-res mesh. Needs a CUDA 12.4 GPU and a coarse mesh (e.g. Hunyuan3D-2 mini); no hosted endpoint. Run it on a GPU box, bring the GLB into the 3D Editor.'},
  {g:'3D',n:'Hyper3D (Rodin)',r:'',url:'https://hyper3d.ai',cmd:'',why:'Hosted text/image → 3D, GLB out — opens straight in Godot and in the 3D Editor here.'},
  {g:'Factories',n:'addyosmani/factory',r:'addyosmani/factory',cmd:'',why:'Reference software factory for Claude Code and Codex — the Factory tab runs the same stations in-app.'},
  {g:'Factories',n:'Awesome software factories',r:'varun1505/awesome-software-factories',cmd:'',why:'Index of factory patterns and harnesses.'}];
/* PURE. Which repo paths are skills. */
function stackSkillPaths38(tree){return((tree&&tree.tree)||[]).filter(x=>x.type==='blob'&&/(^|\/)SKILL\.md$/i.test(x.path)).map(x=>x.path).slice(0,300);}
function stackRun38(cmd){
  if(typeof CT38!=='undefined'&&CT38.io){CT38.io.send(cmd+'\r');go('terminal');toast('Typed into the cloud terminal',2000);return;}
  navigator.clipboard.writeText(cmd).then(()=>toast('Copied — no cloud terminal is connected (Terminal tab → Cloud terminal)',3500),()=>toast('Copy failed',2000));
}
function stackRender38(){
  const h=$('#stack38');if(!h)return;
  const groups=[...new Set(STACK38.map(x=>x.g))];
  h.innerHTML=`<div class="card"><h3 style="margin-top:0">Import a skill pack</h3>
    <p class="help">Skills from any GitHub repo, in one step. They arrive switched off — the skill selector loads one only when a task matches it.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><select id="st-pack" style="flex:1 1 260px" aria-label="Skill pack">${STACK38_PACKS.map(([r,d])=>`<option value="${esc(r)}">${esc(r)} — ${esc(d)}</option>`).join('')}</select>
      <input id="st-repo" class="mono" placeholder="or owner/repo" style="flex:0 1 200px"><button class="btn" id="st-list">List skills</button></div>
    <div id="st-out" style="margin-top:8px"></div></div>
    <div class="card"><h3 style="margin-top:0">Agent stack</h3><p class="help">Install lines are the ones in each project's own README. <b>Run</b> types it into the cloud terminal; Mac-only tools are copy-only.</p>
    ${groups.map(gr=>`<h4 style="margin:12px 0 6px">${esc(gr)}</h4>${STACK38.filter(x=>x.g===gr).map((x,i)=>{const k=STACK38.indexOf(x);return`<div class="row" style="gap:8px;align-items:flex-start;margin:6px 0;flex-wrap:wrap">
      <div style="flex:1 1 260px"><b>${esc(x.n)}</b>${x.r||x.url?` <a class="help" href="${esc(x.url||'https://github.com/'+x.r)}" target="_blank" rel="noopener">${esc(x.r||x.url)}</a>`:''}<div class="help">${esc(x.why)}</div></div>
      ${x.cmd?`<button class="btn small" data-st38="${k}">${x.mac?'Copy':'Run'}</button>`:''}</div>`;}).join('')}`).join('')}</div>`;
  $$('[data-st38]').forEach(b=>b.onclick=()=>{const x=STACK38[+b.dataset.st38];if(x.mac)navigator.clipboard.writeText(x.cmd).then(()=>toast('Copied — run it on your Mac',2500),()=>{});else stackRun38(x.cmd);});
  $('#st-list').onclick=async()=>{const repo=($('#st-repo').value.trim()||$('#st-pack').value).replace(/^https?:\/\/github\.com\//,'').replace(/\/$/,'');
    if(!/^[\w.-]+\/[\w.-]+$/.test(repo))return toast('owner/repo',2000);
    const out=$('#st-out');out.innerHTML='<p class="help">Listing…</p>';
    try{const r=await fetch('https://api.github.com/repos/'+repo+'/git/trees/HEAD?recursive=1',{signal:deadline(DL_API)});
      if(!r.ok)throw new Error('GitHub answered '+r.status+(r.status===403?' (rate limit — try again in an hour)':''));
      const paths=stackSkillPaths38(await r.json());if(!paths.length)throw new Error('no SKILL.md files in that repo');
      const have=new Set(SKILLS.map(s=>s.name));
      out.innerHTML=`<div class="row" style="gap:6px;flex-wrap:wrap;max-height:240px;overflow:auto">${paths.map((p,i)=>{const nm=p.split('/').slice(-2,-1)[0]||p;
        return`<label class="chip"><input type="checkbox" data-stp="${i}" ${i<12&&!have.has(nm)?'checked':''} style="margin:0"> ${esc(nm)}</label>`;}).join('')}</div>
        <button class="btn small" id="st-imp" style="margin-top:8px">Import selected</button>`;
      $('#st-imp').onclick=async()=>{const pick=[...out.querySelectorAll('[data-stp]:checked')].map(c=>paths[+c.dataset.stp]);let n=0,chars=0,skipped=0;
        for(const p of pick){if(chars>300000){skipped++;continue;}
          try{const t=await (await fetch('https://raw.githubusercontent.com/'+repo+'/HEAD/'+p.split('/').map(encodeURIComponent).join('/'),{signal:deadline(DL_API)})).text();
            const k=parseSkillMd(t,p.split('/').slice(-2,-1)[0]||'skill');if(SKILLS.some(s=>s.name===k.name)){skipped++;continue;}
            SKILLS.push({id:uid(),name:k.name,desc:k.desc,body:k.body.slice(0,40000),tags:['pack',repo],on:false,chars:Math.min(k.body.length,40000),source:'https://github.com/'+repo+'/blob/HEAD/'+p});n++;chars+=k.body.length;}
          catch(_){skipped++;}}
        saveSkills();toast(`${n} skill(s) imported from ${repo}${skipped?', '+skipped+' skipped':''} — switched off until selected`,5000);};
    }catch(e){out.innerHTML=`<div class="diagbox bad">${esc(e.message||String(e))}</div>`;}};
}
