// Test servers for pass 41: a CORS REST API with an OpenAPI spec (8841) and a streamable-HTTP MCP server that requires a session id (8842).
import http from 'node:http';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Access-Control-Expose-Headers':'Mcp-Session-Id'};
const log=[];
http.createServer((q,r)=>{
  if(q.method==='OPTIONS'){r.writeHead(204,cors);return r.end();}
  let b='';q.on('data',c=>b+=c);q.on('end',()=>{
    log.push(q.method+' '+q.url+' auth='+(q.headers['x-api-key']||'-'));
    const j=(code,o)=>{r.writeHead(code,{...cors,'Content-Type':'application/json'});r.end(JSON.stringify(o));};
    const u=new URL(q.url,'http://x');
    if(u.pathname==='/openapi.json')return j(200,{openapi:'3.0.0',info:{title:'Pets'},servers:[{url:'http://127.0.0.1:8841/v1'}],paths:{
      '/pets/{id}':{get:{operationId:'getPet',summary:'Get one pet by id',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}]}},
      '/pets':{post:{operationId:'addPet',summary:'Add a pet',requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Pet'}}}}}}},
      components:{schemas:{Pet:{type:'object',required:['name'],properties:{name:{type:'string'}}}}}});
    if(u.pathname==='/v1/pets/1')return j(200,{id:1,name:'Biscuit',species:'dog',age:4});
    if(u.pathname==='/v1/pets'&&q.method==='POST')return j(201,{created:JSON.parse(b||'{}')});
    if(u.pathname==='/log')return j(200,log);
    j(404,{error:'not found '+u.pathname});
  });
}).listen(8841,'127.0.0.1');
const sessions=new Set();
http.createServer((q,r)=>{
  if(q.method==='OPTIONS'){r.writeHead(204,cors);return r.end();}
  let b='';q.on('data',c=>b+=c);q.on('end',()=>{
    let m={};try{m=JSON.parse(b||'{}');}catch(_){}
    const sid=q.headers['mcp-session-id'];
    const reply=(o,h)=>{r.writeHead(200,{...cors,'Content-Type':'text/event-stream',...(h||{})});r.end('event: message\ndata: '+JSON.stringify(o)+'\n\n');};
    if(m.method==='initialize'){const s='s'+Math.random().toString(36).slice(2);sessions.add(s);return reply({jsonrpc:'2.0',id:m.id,result:{protocolVersion:'2025-06-18',serverInfo:{name:'test-mcp'},capabilities:{tools:{}}}},{'Mcp-Session-Id':s});}
    if(!sid||!sessions.has(sid)){r.writeHead(400,{...cors,'Content-Type':'application/json'});return r.end(JSON.stringify({jsonrpc:'2.0',id:m.id,error:{code:-32000,message:'Bad Request: No valid session ID provided'}}));}
    if(m.method==='notifications/initialized'){r.writeHead(202,cors);return r.end();}
    if(m.method==='tools/list'){const all=[{name:'add',description:'Add two numbers',inputSchema:{type:'object',properties:{a:{type:'number'},b:{type:'number'}},required:['a','b']}},
      {name:'echo',description:'Echo text back',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text']}}];
      return reply({jsonrpc:'2.0',id:m.id,result:m.params&&m.params.cursor?{tools:[all[1]]}:{tools:[all[0]],nextCursor:'p2'}});}
    if(m.method==='tools/call'){const a=m.params.arguments||{};const t=m.params.name==='add'?String(a.a+a.b):String(a.text);
      return reply({jsonrpc:'2.0',id:m.id,result:{content:[{type:'text',text:t}]}});}
    reply({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'no method'}});
  });
}).listen(8842,'127.0.0.1');
console.log('servers up');
