/* ═══════════════════ PASS 41 — ANY API AS TOOLS ═══════════════════
   An API connector turns an HTTP API into tools every model and subagent here can call, through the same tool gate as
   MCP (phase filter, lethal-trifecta guard, argument check, injection scan, logging). Three shapes:
     · REST   — one `<name>_request` tool: method, path, query, body — locked to the base URL's host and path
     · OpenAPI — the spec's operations become one typed tool each (path/query/header params + JSON body)
     · GraphQL — one `<name>_graphql` tool: query + variables
   Permission is the user's, per connector, and the defaults are the safe ones:
     read-only (GET/HEAD and GraphQL queries) until "allow writes" is ticked · ask before every call until "ask" is
     unticked · the host can never change (a path cannot point the call anywhere else) · keys go in a header unless the
     API only accepts a query parameter, and then the UI says so.
   Calls go straight from the browser when the API allows it (CORS) and through the bridge when it does not. */
const API41_WRITE=/^(POST|PUT|PATCH|DELETE)$/i;
const api41Slug=s=>String(s||'api').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,24)||'api';
/* PURE. The URL a call may go to, or an error — the host and base path are fixed by the connector. */
function api41Url(base,path,query){
  let b;try{b=new URL(String(base||''));}catch(_){return{error:'the connector has no valid base URL'};}
  if(!/^https?:$/.test(b.protocol))return{error:'only http(s) APIs'};
  const p=String(path||'');
  if(/^[a-z][a-z0-9+.-]*:/i.test(p)||p.startsWith('//'))return{error:'the path must be relative to '+b.origin+' — a full URL is not allowed'};
  const basePath=b.pathname.replace(/\/$/,'');
  let u;try{u=new URL(basePath+'/'+p.replace(/^\//,''),b.origin);}catch(_){return{error:'bad path'};}
  if(u.origin!==b.origin)return{error:'that path leaves '+b.origin};
  if(basePath&&!(u.pathname===basePath||u.pathname.startsWith(basePath+'/')))return{error:'that path leaves '+b.origin+basePath};
  if(/(^|\/)\.\.(\/|$)/.test(decodeURIComponent(u.pathname)))return{error:'".." is not allowed in a path'};
  Object.entries(query||{}).forEach(([k,v])=>{if(v!=null&&v!=='')u.searchParams.set(k,typeof v==='object'?JSON.stringify(v):String(v));});
  b.searchParams.forEach((v,k)=>{if(!u.searchParams.has(k))u.searchParams.set(k,v);});
  return{url:u.toString()};
}
/* PURE. What permission a call needs, from the connector's settings. */
function api41Allowed(api,method,gqlQuery){
  const m=String(method||'GET').toUpperCase();
  if(gqlQuery!=null){if(/^\s*(mutation|subscription)\b/i.test(String(gqlQuery).replace(/^\s*#.*$/gm,''))&&!api.allowWrite)
    return{ok:false,why:'this GraphQL connector is read-only — tick "allow writes" to let models run mutations'};return{ok:true};}
  if(!/^(GET|HEAD|POST|PUT|PATCH|DELETE)$/.test(m))return{ok:false,why:'method '+m+' is not supported'};
  if(API41_WRITE.test(m)&&!api.allowWrite&&!(api.readPost&&m==='POST'))return{ok:false,why:m+' changes data, and this connector is read-only — tick "allow writes" to permit it'};
  return{ok:true};
}
/* PURE. OpenAPI 3 / Swagger 2 operations → tool definitions (capped; the spec's own words become descriptions). */
function api41FromOpenApi(spec,prefix,cap){
  const out=[],P=(spec&&spec.paths)||{},pre=api41Slug(prefix);
  const deref=(o,d)=>{if(!o||d>6)return o||{};if(o.$ref&&typeof o.$ref==='string'){const p=o.$ref.replace(/^#\//,'').split('/');let x=spec;for(const k of p)x=x&&x[decodeURIComponent(k.replace(/~1/g,'/').replace(/~0/g,'~'))];return deref(x,d+1);}return o;};
  const simp=(s,d)=>{s=deref(s,d||0);if(!s||typeof s!=='object')return{type:'string'};if((d||0)>3)return{type:s.type||'object'};
    const o={};['type','enum','description','format'].forEach(k=>{if(s[k]!=null)o[k]=k==='description'?String(s[k]).slice(0,120):s[k];});
    if(s.type==='object'||s.properties){o.type='object';o.properties={};Object.entries(s.properties||{}).slice(0,20).forEach(([k,v])=>o.properties[k]=simp(v,(d||0)+1));if(Array.isArray(s.required))o.required=s.required;}
    if(s.type==='array')o.items=simp(s.items,(d||0)+1);if(!o.type)o.type='string';return o;};
  for(const [path,item] of Object.entries(P)){
    for(const method of ['get','post','put','patch','delete']){
      const op=item&&item[method];if(!op)continue;
      const params=[...(item.parameters||[]),...(op.parameters||[])].map(x=>deref(x,0)).filter(x=>x&&x.name&&['path','query','header'].includes(x.in));
      const props={},req=[];
      params.forEach(x=>{props[x.name]=Object.assign(simp(x.schema||{type:x.type||'string'}),x.description?{description:String(x.description).slice(0,120)}:{});if(x.required||x.in==='path')req.push(x.name);});
      const body=op.requestBody?deref(op.requestBody,0):null,bs=body&&body.content&&(body.content['application/json']||Object.values(body.content)[0]);
      const swBody=(op.parameters||[]).map(x=>deref(x,0)).find(x=>x&&x.in==='body');
      if((bs&&bs.schema)||swBody){props.body=simp((bs&&bs.schema)||swBody.schema);if(body&&body.required||swBody&&swBody.required)req.push('body');}
      const id=api41Slug(op.operationId||(method+'_'+path.replace(/\{([^}]+)\}/g,'by_$1')));
      out.push({name:(pre+'_'+id).slice(0,64),description:String(op.summary||op.description||method.toUpperCase()+' '+path).replace(/\s+/g,' ').slice(0,200)+' ['+method.toUpperCase()+' '+path+']',
        inputSchema:{type:'object',properties:props,required:[...new Set(req)]},_op:{method:method.toUpperCase(),path,params:params.map(x=>({name:x.name,in:x.in}))}});
      if(out.length>=(cap||60))return out;
    }
  }
  return out;
}
function api41Tools(c){
  const a=c.api||{},pre=api41Slug(c.label);
  if(a.kind==='graphql')return[{name:pre+'_graphql',description:'Run a GraphQL '+(a.allowWrite?'query or mutation':'query (read-only)')+' against '+a.base+'. '+(a.notes||''),
    inputSchema:{type:'object',properties:{query:{type:'string'},variables:{type:'object'}},required:['query']}}];
  if(a.kind==='openapi'&&Array.isArray(a.ops)&&a.ops.length)return a.ops;
  return[{name:pre+'_request',description:'Call the '+c.label+' HTTP API at '+a.base+' ('+(a.allowWrite?'any method':'GET only — read-only')+'). path is relative to the base URL. '+(a.notes||''),
    inputSchema:{type:'object',properties:{method:{type:'string',enum:a.allowWrite?['GET','POST','PUT','PATCH','DELETE']:['GET']},path:{type:'string'},query:{type:'object'},body:{type:'object'}},required:['path']}}];
}
async function api41Fetch(c,url,init){
  const a=c.api||{},headers=Object.assign({Accept:'application/json, text/plain;q=0.9, */*;q=0.5'},init.headers||{});
  if(a.authType==='bearer'&&c.token)headers.Authorization='Bearer '+c.token;
  else if(a.authType==='header'&&c.token)headers[a.authName||'X-API-Key']=c.token;
  else if(a.authType==='basic'&&c.token)headers.Authorization='Basic '+btoa(c.token);
  if(a.authType==='query'&&c.token){const u=new URL(url);u.searchParams.set(a.authName||'api_key',c.token);url=u.toString();}
  const read=async r=>{const t=await r.text();const j=tc41Json(t);return{status:r.status,ok:r.ok,body:j!=null&&typeof j==='object'?j:t.slice(0,60000)};};
  try{const r=await fetch(url,{method:init.method,headers,body:init.body,signal:deadline(DL_WORK)});return Object.assign(await read(r),{via:'direct'});}
  catch(e){
    if(!(typeof BRIDGE_INFO!=='undefined'&&BRIDGE_INFO))throw new Error('the API could not be reached from the browser ('+String(e.message||e)+') — it may block cross-site calls; connect the bridge to call it through that');
    const r=await bridgePost('/proxy',{url,method:init.method,headers,body:init.body});
    const j=typeof r==='string'?tc41Json(r):r;return{status:200,ok:true,body:j!=null?j:r,via:'bridge'};
  }
}
async function api41Call(c,tool,args){
  const a=c.api||{},x=args||{};
  if(a.kind==='graphql'){
    const p=api41Allowed(a,'POST',x.query);if(!p.ok)throw new Error(p.why);
    const u=api41Url(a.base,'',{});if(u.error)throw new Error(u.error);
    if(a.ask&&!confirm('Let the model run this GraphQL '+(/^\s*mutation/i.test(x.query)?'MUTATION':'query')+' on '+c.label+'?\n\n'+String(x.query).slice(0,500)))throw new Error('you declined this call');
    const r=await api41Fetch(c,u.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:x.query,variables:x.variables||{}})});
    if(!r.ok)throw new Error('HTTP '+r.status+': '+toolText(r.body).slice(0,300));return r.body;
  }
  let method='GET',path='',query={},body,headers={};
  const op=(a.ops||[]).find(o=>o.name===tool);
  if(op&&op._op){
    method=op._op.method;path=op._op.path;
    for(const p of op._op.params){const v=x[p.name];if(v==null)continue;
      if(p.in==='path')path=path.replace('{'+p.name+'}',encodeURIComponent(String(v)));else if(p.in==='query')query[p.name]=v;else if(p.in==='header'&&!/^(authorization|cookie|host)$/i.test(p.name))headers[p.name]=String(v);}
    if(/\{[^}]+\}/.test(path))throw new Error('missing path parameter(s): '+path.match(/\{[^}]+\}/g).join(', '));
    if(x.body!==undefined)body=x.body;
  }else{method=String(x.method||'GET').toUpperCase();path=x.path||'';query=x.query||{};body=x.body;}
  const p=api41Allowed(a,method);if(!p.ok)throw new Error(p.why);
  const u=api41Url(a.base,path,query);if(u.error)throw new Error(u.error);
  if(a.ask&&!confirm('Let the model call '+c.label+'?\n\n'+method+' '+u.url.replace(/([?&](api_key|key|token|access_token)=)[^&]+/gi,'$1•••')+(body!==undefined?'\n\n'+toolText(body).slice(0,400):'')))throw new Error('you declined this call');
  if(body!==undefined&&typeof body!=='string'){headers['Content-Type']='application/json';body=JSON.stringify(body);}
  const r=await api41Fetch(c,u.url,{method,headers,body:method==='GET'||method==='HEAD'?undefined:body});
  if(!r.ok)throw new Error('HTTP '+r.status+': '+toolText(r.body).slice(0,400));
  return r.body;
}
async function api41Connect(c){
  const a=c.api=Object.assign({kind:'rest',base:'',authType:'none',authName:'',allowWrite:false,ask:true,notes:''},c.api||{});
  if(a.kind==='openapi'){
    let spec=a.specText?tc41Json(a.specText):null;
    if(!spec&&a.specUrl){const r=await api41Fetch(c,a.specUrl,{method:'GET'});spec=typeof r.body==='object'?r.body:tc41Json(r.body);}
    if(!spec||!spec.paths)throw new Error('could not read an OpenAPI/Swagger JSON spec (YAML is not supported — convert it to JSON)');
    if(!a.base){const s=(spec.servers&&spec.servers[0]&&spec.servers[0].url)||(spec.host?(spec.schemes&&spec.schemes[0]||'https')+'://'+spec.host+(spec.basePath||''):'');
      try{a.base=new URL(s,a.specUrl||undefined).toString();}catch(_){}}
    a.ops=api41FromOpenApi(spec,c.label,60);a.title=(spec.info&&spec.info.title)||'';a.specText='';
  }
  if(!api41Url(a.base,'',{}).url)throw new Error('add a base URL (https://…)');
  c.tools=api41Tools(c).map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema,_op:t._op}));
  if(a.kind==='openapi')a.ops=c.tools;
  c.status='ready · '+c.tools.length+' tool'+(c.tools.length===1?'':'s')+' · '+(a.allowWrite?'reads and writes':'read-only')+(a.ask?' · asks first':'');c.lastError='';
}
function api41Form(){
  openModal(`<h3 style="margin-top:0">Connect an API</h3>
    <p class="help">Any HTTP API becomes tools the models and subagents here can call — with your permission. It starts read-only and asks before every call.</p>
    <div class="seg39 seg39-big" role="radiogroup" aria-label="API kind">${[['rest','REST'],['openapi','OpenAPI spec'],['graphql','GraphQL']].map(([k,l],i)=>`<button type="button" role="radio" data-apik="${k}"${i?'':' class="on"'} aria-checked="${!i}">${l}</button>`).join('')}</div>
    <label class="field">Name<input id="api-label" placeholder="e.g. Weather"></label>
    <label class="field" data-apiw="rest graphql openapi">Base URL<input id="api-base" placeholder="https://api.example.com/v1"></label>
    <label class="field" data-apiw="openapi" hidden>Spec URL (JSON)<input id="api-spec" placeholder="https://api.example.com/openapi.json"></label>
    <label class="field" data-apiw="openapi" hidden>…or paste the spec (JSON)<textarea id="api-spectext" rows="3"></textarea></label>
    <div class="row" style="gap:8px">
      <label class="field" style="flex:1 1 140px">Auth<select id="api-auth"><option value="none">none</option><option value="bearer">Bearer token</option><option value="header">API key header</option><option value="basic">Basic (user:pass)</option><option value="query">key in the URL</option></select></label>
      <label class="field" style="flex:1 1 140px">Header / parameter name<input id="api-authname" placeholder="X-API-Key"></label></div>
    <label class="field">Key / token<input id="api-token" type="password" autocomplete="off" placeholder="stored on this device only"></label>
    <p class="help" id="api-qwarn" hidden>Some APIs only accept a key in the URL. It will be part of the address of every call (and in any proxy's logs) — use a header if the API allows it.</p>
    <label class="field">Notes for the model (optional)<input id="api-notes" placeholder="e.g. dates are YYYY-MM-DD; use /forecast?city="></label>
    <label class="chk"><input type="checkbox" id="api-ask" checked> ask me before every call</label>
    <label class="chk"><input type="checkbox" id="api-write"> allow writes (POST, PUT, PATCH, DELETE, GraphQL mutations)</label>
    <div class="row" style="margin-top:10px"><button class="btn good" id="api-save">Connect</button></div>`);
  let kind='rest';
  $$('[data-apik]').forEach(b=>b.onclick=()=>{kind=b.dataset.apik;$$('[data-apik]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b?'true':'false');});
    $$('[data-apiw]').forEach(el=>el.hidden=!el.dataset.apiw.split(' ').includes(kind));});
  $('#api-auth').onchange=()=>{$('#api-qwarn').hidden=$('#api-auth').value!=='query';};
  $('#api-save').onclick=async()=>{
    const c=connectorAdd('api',{label:$('#api-label').value.trim()||'API',url:$('#api-base').value.trim(),token:$('#api-token').value});
    c.api={kind,base:$('#api-base').value.trim(),specUrl:$('#api-spec')?$('#api-spec').value.trim():'',specText:$('#api-spectext')?$('#api-spectext').value:'',
      authType:$('#api-auth').value,authName:$('#api-authname').value.trim(),allowWrite:$('#api-write').checked,ask:$('#api-ask').checked,notes:$('#api-notes').value.trim().slice(0,300)};
    closeModal();await connectorConnect(c);renderConnectors();
    toast(c.lastError?'Could not connect: '+c.lastError:c.label+': '+c.tools.length+' tool(s) ready for every model',4200);};
}
function api41RowHTML(c){const a=c.api||{};
  return `<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><span class="help">${esc(a.kind||'rest')} · ${esc(a.base||'')}</span>
    <label class="chip"><input type="checkbox" data-api41ask="${c.id}"${a.ask?' checked':''} style="margin:0"> ask before each call</label>
    <label class="chip"><input type="checkbox" data-api41w="${c.id}"${a.allowWrite?' checked':''} style="margin:0"> allow writes</label></div>`;}
/* PURE. An MCP tools/call result as what a model should read: the text parts joined, structured content kept, and
   isError treated as an error (it was passed back as a successful result before). */
function mcp41Result(r){
  if(!r||typeof r!=='object'||!Array.isArray(r.content))return r;
  const text=r.content.map(x=>x&&x.type==='text'?String(x.text||''):x&&x.type==='resource'?String((x.resource&&(x.resource.text||x.resource.uri))||''):x&&x.type?'['+x.type+(x.mimeType?' '+x.mimeType:'')+']':'').filter(Boolean).join('\n');
  if(r.isError)throw new Error(text||'the MCP tool reported an error');
  return r.structuredContent!=null?{text,structured:r.structuredContent}:text;
}
