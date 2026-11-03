/* ═══════════════════ PASS 41 — TOOL CALLS ANY MODEL CAN MAKE ═══════════════════
   Every model was told one format (===USE TOOL=== blocks) and anything else it wrote was silently ignored — a free
   gpt-oss model wrote `read_web_page("https://example.com")` and the turn ended with no tool run. Models are trained on
   different formats, so the parser reads all the common ones and maps them to the same call:
     ===USE TOOL=== {json} ===END===        this app's own
     <tool_call>{"name","arguments"}</tool_call>   Hermes / Qwen / DeepSeek / many fine-tunes
     to=functions.NAME … <|message|>{json}         gpt-oss "harmony" channel text
     ```tool / ```json {"tool"|"name", "args"|"arguments"|"parameters"}   fenced JSON (known tool names only)
     NAME("value") or NAME(key="v", n=3)            a bare call to a known tool
   Arguments go through repairJson, a lone value is mapped onto the tool's one required field, and a message that
   clearly TRIED to call a tool but could not be read gets one precise correction instead of being taken as the answer.
   The tool list in the prompt is built from the whole catalogue with typed signatures, and with many tools only the
   ones relevant to the request are listed (plus find_tools to look up the rest) — schemas are paid on every request. */
const TC41={limit:18,lastQuery:'',depth:0};
/* PURE. The balanced {...} starting at i (string-aware), or ''. */
function tc41Obj(s,i){
  if(s[i]!=='{')return '';let d=0,q=null,esc2=false;
  for(let k=i;k<s.length;k++){const c=s[k];
    if(q){if(esc2)esc2=false;else if(c==='\\')esc2=true;else if(c===q)q=null;continue;}
    if(c==='"'||c==="'"){q=c;continue;}
    if(c==='{')d++;else if(c==='}'){d--;if(!d)return s.slice(i,k+1);}}
  return '';
}
function tc41Json(s){
  if(s==null)return null;if(typeof s==='object')return s;
  const r=typeof repairJson==='function'?repairJson(String(s)):(()=>{try{return{ok:true,value:JSON.parse(s)};}catch(_){return{ok:false};}})();
  return r&&r.ok?r.value:null;
}
/* PURE. {tool,args} from any of the JSON shapes models use. */
function tc41Norm(o){
  if(!o||typeof o!=='object'||Array.isArray(o))return null;
  const f=o.function&&typeof o.function==='object'?o.function:null;
  const tool=o.tool||o.name||o.tool_name||o.toolName||(f&&f.name)||'';
  if(!tool||typeof tool!=='string')return null;
  let args=o.args!==undefined?o.args:o.arguments!==undefined?o.arguments:o.parameters!==undefined?o.parameters:o.input!==undefined?o.input:f?f.arguments:undefined;
  if(typeof args==='string'){const j=tc41Json(args);args=j&&typeof j==='object'?j:args;}
  return{tool:String(tool).replace(/^functions\./,''),args:args==null?{}:args};
}
/* PURE. A lone value or key=value list in name(...) as an args object, using the tool's schema for positional values. */
function tc41Kw(inner,schema){
  const s=String(inner||'').trim();if(!s)return{};
  if(s[0]==='{'){const j=tc41Json(s);if(j&&typeof j==='object')return j;}
  const props=(schema&&schema.properties)||{},req=(schema&&schema.required)||[],keys=Object.keys(props);
  const val=v=>{v=v.trim();if(/^(['"]).*\1$/s.test(v))return v.slice(1,-1);if(/^-?\d+(\.\d+)?$/.test(v))return +v;if(/^(true|false)$/i.test(v))return /^true$/i.test(v);
    if(/^null$/i.test(v))return null;const j=tc41Json(v);return j!=null?j:v;};
  const parts=[];let cur='',q=null,depth=0;
  for(const c of s){if(q){cur+=c;if(c===q)q=null;continue;}if(c==='"'||c==="'"){q=c;cur+=c;continue;}
    if('[{('.includes(c))depth++;if(']})'.includes(c))depth--;if(c===','&&!depth){parts.push(cur);cur='';continue;}cur+=c;}
  if(cur.trim())parts.push(cur);
  const out={};let pos=0;
  parts.forEach(p=>{const m=p.match(/^\s*([A-Za-z_][\w]*)\s*[=:]\s*([\s\S]*)$/);
    if(m&&!/^\s*['"]/.test(p))out[m[1]]=val(m[2]);
    else{const k=req[pos]||keys[pos]||('arg'+pos);out[k]=val(p);pos++;}});
  return out;
}
/* PURE. The catalogue name a model meant: models prefix names (functions., tools., tool:, default_api., mcp__srv__), change
   case or separators, or make a small typo. A unique match wins; anything ambiguous is left as written so the tool gate
   can say "no tool named …" with the list. */
function tc41Lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;let p=Array.from({length:n+1},(_,i)=>i);
  for(let i=1;i<=m;i++){const q=[i];for(let j=1;j<=n;j++)q[j]=Math.min(p[j]+1,q[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=q;}return p[n];}
function tc41Resolve(name,names){
  const n=String(name||'').trim();if(!names||!names.size||names.has(n))return n;
  const clean=n.replace(/^mcp__[^_]+__/,'').replace(/^(functions|tools?|default_api|api)\s*[.:\/]+\s*/i,'');if(names.has(clean))return clean;
  const key=x=>String(x).toLowerCase().replace(/[-\s.:\/]+/g,'_'),k=key(clean),all=[...names];
  let hit=all.filter(x=>key(x)===k);if(hit.length===1)return hit[0];
  hit=all.filter(x=>k.endsWith('_'+key(x))||key(x).endsWith('_'+k));if(hit.length===1)return hit[0];
  if(k.length>=6){hit=all.filter(x=>tc41Lev(key(x),k)<=2);if(hit.length===1)return hit[0];}
  return n;
}
/* PURE. Every tool call in a model's text. `catalog` = [{name,schema}] (names unknown to it are still kept from the
   explicit formats, so the model can be told the tool does not exist). */
function tc41Parse(text,catalog){
  const s=String(text||'');if(!s.trim())return[];
  const cat=catalog||[],names=new Set(cat.map(t=>t.name)),spec=n=>cat.find(t=>t.name===n)||null;
  const out=[],seen=new Set();
  const add=(c,format)=>{if(!c||!c.tool)return;c.tool=tc41Resolve(c.tool,names);
    /* a call wrapped in an invented outer tool: {"tool":"bot","args":{"tool":"real","args":{…}}} */
    if(names.size&&!names.has(c.tool)&&c.args&&typeof c.args==='object'){const inner=tc41Norm(c.args);if(inner&&names.has(tc41Resolve(inner.tool,names))){c=inner;c.tool=tc41Resolve(c.tool,names);}}const k=c.tool+'|'+JSON.stringify(c.args);if(seen.has(k))return;seen.add(k);out.push({tool:c.tool,args:c.args,format});};
  let m;
  const blk=/===USE TOOL===\s*([\s\S]*?)(?:===END===|$)/gi;
  while((m=blk.exec(s))){const i=m[1].indexOf('{');add(tc41Norm(tc41Json(i>=0?tc41Obj(m[1],i)||m[1]:m[1])),'block');}
  const tag=/<(tool_call|function_call|tool)>\s*([\s\S]*?)<\/\1>/gi;
  while((m=tag.exec(s))){const i=m[2].indexOf('{');add(tc41Norm(tc41Json(i>=0?tc41Obj(m[2],i)||m[2]:m[2])),'xml');}
  const harmony=/to=(?:functions\.)?([A-Za-z_][\w.-]*)/g;
  while((m=harmony.exec(s))){const i=s.indexOf('{',m.index);if(i<0||i-m.index>200)continue;const o=tc41Json(tc41Obj(s,i));
    if(o&&typeof o==='object')add({tool:m[1],args:o},'harmony');}
  const fence=/```(?:tool_call|tool|function|json|jsonc)?[ \t]*\n([\s\S]*?)```/gi;
  while((m=fence.exec(s))){const i=m[1].indexOf('{');if(i<0)continue;const c=tc41Norm(tc41Json(tc41Obj(m[1],i)));if(c&&names.has(tc41Resolve(c.tool,names)))add(c,'fence');}
  if(!out.length){
    /* bare JSON object naming a known tool and carrying arguments */
    for(let i=s.indexOf('{');i>=0&&i<s.length;i=s.indexOf('{',i+1)){
      const o=tc41Obj(s,i);if(!o)continue;const j=tc41Json(o);const c=tc41Norm(j);
      if(c&&names.has(tc41Resolve(c.tool,names))&&j&&(j.args!==undefined||j.arguments!==undefined||j.parameters!==undefined))add(c,'json');
      i+=Math.max(0,o.length-1);
    }
  }
  if(!out.length&&names.size){
    /* name(…) on a line of its own (optionally in backticks), for a known tool */
    const call=/(^|\n)[ \t>*-]*`{0,3}[ \t]*([A-Za-z_][\w.-]*)\s*\(([\s\S]*?)\)[ \t`]*(?=\n|$)/g;
    while((m=call.exec(s))){const n=tc41Resolve(m[2],names);if(!names.has(n))continue;add({tool:n,args:tc41Kw(m[3],(spec(n)||{}).schema)},'call');}
  }
  return out.slice(0,8);
}
/* PURE. Did the model try to call a tool and fail to write one that can be read? */
function tc41Looks(text,catalog){
  const s=String(text||'');if(!s)return false;
  if(tc41Parse(s,catalog).length)return false;
  if(/===USE TOOL===|<tool_call>|<function_call>|<\|call\|>|to=functions\./i.test(s))return true;
  const names=(catalog||[]).map(t=>t.name).filter(n=>n.length>3);
  return names.some(n=>new RegExp('(^|[^\\w])'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[({]').test(s));
}
function tc41Feedback(catalog){
  const ex=(catalog||[])[0];
  return 'Your last message tried to call a tool, but it could not be read. Call a tool by writing exactly this, then stop:\n'+
    '===USE TOOL===\n{"tool":"'+(ex?ex.name:'tool_name')+'","args":{'+(ex?Object.keys((ex.schema&&ex.schema.properties)||{}).slice(0,1).map(k=>'"'+k+'":"…"').join(''):'"field":"value"')+'}}\n===END===\n'+
    'One JSON object per block, double-quoted keys, and "args" is an object. If you do not need a tool, answer normally.';
}
/* PURE. A tool's signature: name(field*: type, other: "a"|"b") */
function tc41Sig(t){
  const p=(t.schema&&t.schema.properties)||{},req=new Set((t.schema&&t.schema.required)||[]);
  const ty=v=>v&&v.enum?v.enum.slice(0,5).map(x=>JSON.stringify(x)).join('|'):(v&&(Array.isArray(v.type)?v.type.join('|'):v.type))||'any';
  const args=Object.keys(p).slice(0,10).map(k=>k+(req.has(k)?'*':'')+': '+ty(p[k]));
  return t.name+'('+args.join(', ')+(Object.keys(p).length>10?', …':'')+')';
}
const tc41Words=s=>String(s||'').toLowerCase().replace(/[_\-./:]+/g,' ').match(/[a-z0-9]{3,}/g)||[];
/* PURE. The tools worth listing for a request: everything when there are few, else the best lexical matches
   plus the always-useful core. */
function tc41Select(catalog,query,limit){
  const L=limit||TC41.limit,cat=catalog||[];if(cat.length<=L)return{list:cat,hidden:0};
  const q=new Set(tc41Words(query));const core=new Set(['delegate','find_tools','read_web_page','find_place','load_skill','recall']);
  const scored=cat.map((t,i)=>{const w=tc41Words(t.name+' '+(t.description||''));let s=0;w.forEach(x=>{if(q.has(x))s+=1;});
    tc41Words(t.name).forEach(x=>{if(q.has(x))s+=2;});return{t,s:s+(core.has(t.name)?0.5:0),i};});
  scored.sort((a,b)=>b.s-a.s||a.i-b.i);
  const list=scored.slice(0,L).map(x=>x.t);
  if(!list.some(t=>t.name==='find_tools')){const ft=cat.find(t=>t.name==='find_tools');if(ft)list[list.length-1]=ft;}
  return{list,hidden:cat.length-list.length};
}
/* The instructions every tool-using prompt carries. */
function tc41Block(catalog,query){
  const cat=catalog||[];if(!cat.length)return '';
  const {list,hidden}=tc41Select(cat,query);
  const by={};list.forEach(t=>{const g=t.connectorLabel||({ocr:'Documents',openbot:'OpenBot',skill:'Skills',memory:'Memory',recall:'Recall',reader:'Web',orch:'Agents',meta:'Tools',swe:'Agent'}[t.source]||'Tools');(by[g]=by[g]||[]).push(t);});
  return '\n\nTOOLS YOU CAN CALL. Use one when you need a fact you cannot know, data you have not seen, or an action. To call one, write exactly this and stop — the result comes back to you:\n'+
    '===USE TOOL===\n{"tool":"<name>","args":{"<field>":"<value>"}}\n===END===\n'+
    'Rules: args must match the signature (* = required); several independent calls may go in one reply as separate blocks; never invent or guess a tool result; '+
    'when a call fails, read the error and fix the arguments; when you have what you need, answer normally with no tool block. '+TOOL_SPOTLIGHT_RULE+'\n'+
    Object.entries(by).map(([g,ts])=>g+':\n'+ts.map(t=>'  - '+tc41Sig(t)+' — '+String(t.description||'').replace(/\s+/g,' ').slice(0,150)).join('\n')).join('\n')+
    (hidden?'\n('+hidden+' more tools are connected — call find_tools with {"query":"…"} to list the ones that fit.)':'');
}
/* find_tools: the rest of a large catalogue, on demand */
function tc41Find(query){
  const cat=toolCatalog().filter(t=>t.name!=='find_tools');
  const q=new Set(tc41Words(query));
  const hits=cat.map(t=>({t,s:tc41Words(t.name+' '+(t.description||'')).filter(x=>q.has(x)).length})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,12);
  return hits.length?hits.map(x=>tc41Sig(x.t)+' — '+String(x.t.description||'').slice(0,160)).join('\n'):'no connected tool matches "'+query+'". Connected: '+cat.map(t=>t.name).slice(0,40).join(', ');
}
/* Tool rounds per turn (was a fixed 3). */
const asstRounds41=()=>Math.max(1,Math.min(12,+ASST.toolRounds||6));
/* PURE-ish. Independent calls run together (up to 3 at a time); anything that can send data out runs alone, in order. */
async function tc41RunAll(calls,run){
  const res=new Array(calls.length);let i=0;
  const solo=c=>{try{return !!toolLegs(toolSpec(c.tool)||{name:c.tool}).exfil;}catch(_){return true;}};
  if(calls.some(solo)){for(let k=0;k<calls.length;k++)res[k]=await run(calls[k],k);return res;}
  await Promise.all(Array.from({length:Math.min(3,calls.length)},async()=>{while(i<calls.length){const k=i++;res[k]=await run(calls[k],k);}}));
  return res;
}
/* PURE. Native tool calls a model emitted on its own (gpt-oss's built-in python tool, a provider that turns any
   to=functions.X into tool_calls) as text every loop here reads: code tools become code blocks, the rest tool blocks. */
function tc41FromNative(calls){
  return (calls||[]).filter(c=>c&&c.name).map(c=>{
    const n=String(c.name).replace(/^functions\./,'');let a=tc41Json(c.args);if(a==null)a=c.args;
    const code=typeof a==='string'?a:a&&typeof a==='object'?(a.code||a.source||a.script||a.input):'';
    if(/^(python|py|code_interpreter|execute_python|run_python|jupyter|ipython)$/i.test(n)&&code)return '```python\n'+code+'\n```';
    if(/^(js|javascript|node|execute_js|run_js|run_javascript)$/i.test(n)&&code)return '```js\n'+code+'\n```';
    return '===USE TOOL===\n'+JSON.stringify({tool:n,args:a&&typeof a==='object'?a:{}})+'\n===END===';
  }).join('\n\n');
}

/* PURE. Arguments shaped to the schema where the intent is unambiguous: "1" → 1 for a number field, "true" → true for a
   boolean, a lone value → [value] for an array, a JSON string → object for an object field. Nothing else is touched. */
function tc41Coerce(args,schema){
  if(!args||typeof args!=='object'||Array.isArray(args)||!schema||!schema.properties)return args;
  const o=Object.assign({},args);
  Object.entries(schema.properties).forEach(([k,p])=>{if(!(k in o)||!p)return;const v=o[k],t=Array.isArray(p.type)?p.type[0]:p.type;
    if((t==='integer'||t==='number')&&typeof v==='string'&&/^\s*-?\d+(\.\d+)?\s*$/.test(v))o[k]=t==='integer'?parseInt(v,10):+v;
    else if(t==='boolean'&&typeof v==='string'&&/^(true|false)$/i.test(v.trim()))o[k]=/^true$/i.test(v.trim());
    else if(t==='array'&&v!=null&&!Array.isArray(v)){const j=typeof v==='string'?tc41Json(v):null;o[k]=Array.isArray(j)?j:[v];}
    else if(t==='object'&&typeof v==='string'){const j=tc41Json(v);if(j&&typeof j==='object'&&!Array.isArray(j))o[k]=j;}});
  return o;
}
