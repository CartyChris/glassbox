# ═══ D. Stack: skill packs, ecosystem catalog, three Mac runtimes ═══
module('stack.js')
rep('<section class="view" id="view-harnesshub"><div class="wrap"><div id="hh-panel"></div></div></section>','<section class="view" id="view-harnesshub"><div class="wrap"><div id="hh-panel"></div><div id="stack38"></div></div></section>')
rep("  if(view==='harnesshub')panelGuard(view,()=>hhRender());","  if(view==='harnesshub')panelGuard(view,()=>{hhRender();stackRender38();});")
rep("  mlx:{label:'MLX (mlx-lm)',prefix:'mlx/',port:8080,","""  mlxserve:{label:'mlx-serve',prefix:'mlxs/',port:11234,bases:['http://127.0.0.1:11234','http://localhost:11234'],
    chat:'/v1/chat/completions',list:'/v1/models',blurb:'Native MLX server (Zig/Swift, no Python). OpenAI, Anthropic and Ollama APIs.',start:'mlx-serve run gemma4'},
  locals:{label:'Locals',prefix:'locals/',port:8321,bases:['http://127.0.0.1:8321'],
    chat:'/v1/chat/completions',list:'/v1/models',blurb:'MLX with continuous batching — many agents at once on one Mac.',start:'locals start'},
  osaurus:{label:'Osaurus',prefix:'osaurus/',port:1337,bases:['http://127.0.0.1:1337'],
    chat:'/v1/chat/completions',list:'/v1/models',blurb:'Native macOS harness and server; strict OpenAI semantics.',start:'open -a Osaurus'},
  mlx:{label:'MLX (mlx-lm)',prefix:'mlx/',port:8080,""")
EXPORTS+=['stackSkillPaths38','STACK38']
