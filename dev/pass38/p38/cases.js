  /* ── pass 38 ── */
  add({id:'cloud-terminal-transports',sub:'terminal',uses:['ctTransports38','ctMinutesLeft38'],
    what:'the cloud terminal tries Vercel’s PTY, then the sandbox’s own WebSocket, then SSE — and the token goes with each',
    run:()=>{const t=g.ctTransports38({shell:{url:'wss://pty.x/1',token:'A'},bridge:'https://sb-8080.vercel.run/',bridgeToken:'B'});
      return t.map(x=>x.kind+':'+(x.url||x.base)+':'+x.token).join(' | ')+' · '+g.ctMinutesLeft38(Date.now()+30*60000+500);},
    expect:v=>v==='ws:wss://pty.x/1:A | ws:wss://sb-8080.vercel.run/pty:B | sse:https://sb-8080.vercel.run:B · 30',
    antiWhat:'and with nothing to connect to there is nothing to try, and an ended session shows 0 minutes, not a negative',
    anti:()=>g.ctTransports38(null).length+','+g.ctTransports38({bridge:'https://x'}).length+','+g.ctMinutesLeft38(Date.now()-60000),antiExpect:v=>v==='0,0,0'});
  add({id:'tutor-next-step',sub:'tutor',uses:['tutorNext38','tutorPlan38'],
    what:'the tutor teaches a shaky idea before a new one, never an idea whose prerequisite is not understood yet, and cleans a model’s plan',
    run:()=>{const p=g.tutorPlan38({nodes:[{id:'a',title:'Vectors',deps:[],status:'known'},{id:'b',title:'Dot product',deps:['a']},
        {id:'c',title:'Attention',deps:['b','zzz','c']},{id:'d',title:'Softmax',deps:['a'],status:'shaky'}],probes:[{node:'c',question:'Why scale by √d?'},{node:'nope',question:'x'}]});
      return [g.tutorNext38(p).id,p.nodes[2].deps.join('+'),p.probes.length].join(',');},
    expect:v=>v==='d,b,1',
    antiWhat:'and a fully understood map has nothing left, while a dependency cycle still yields a step instead of stalling',
    anti:()=>{const done=g.tutorPlan38({nodes:[{id:'a',title:'A',status:'known'}]});const cyc=g.tutorPlan38({nodes:[{id:'x',title:'X',deps:['y']},{id:'y',title:'Y',deps:['x']}]});
      return (g.tutorNext38(done)===null)+','+!!g.tutorNext38(cyc);},antiExpect:v=>v==='true,true'});
  add({id:'tutor-reads-json-replies',sub:'tutor',uses:['tutorJson38'],
    what:'a model reply wrapped in prose and fences still yields its JSON',
    run:()=>JSON.stringify(g.tutorJson38('Sure! ```json\n{"correct":true,"repair":""}\n``` hope that helps')),expect:v=>v==='{"correct":true,"repair":""}',
    antiWhat:'and prose with no JSON gives nothing rather than a guess',anti:()=>g.tutorJson38('I think you got it right.'),antiExpect:v=>v===null});
  add({id:'recall-extracts-places',sub:'memory',uses:['recallExtract38'],
    what:'S1 recall files every location in a transcript — repo, local server, URL, home path, file, ssh host — with a usable name',
    run:()=>{const f=g.recallExtract38('Cloned https://github.com/affaan-m/ECC.git into ~/code/ecc, served on http://localhost:5173/app, notes in /Users/chris/Notes/plan.md; logs at ~/.ollama/logs/server.log and the rest; work in /Users/c/All Finished Apps/gb-repo/index.html; deploy: ssh deploy@build.example.com; docs https://docs.vercel.com/sandbox.');
      return f.map(x=>x.kind+':'+x.name).sort().join(' | ');},
    expect:v=>['dir:ecc','file:plan.md','file:server.log','file:index.html','host:deploy@build.example.com','local:localhost:5173/app','repo:affaan-m/ECC','url:docs.vercel.com/sandbox'].every(k=>v.includes(k)),
    antiWhat:'and ordinary prose with no locations yields none (no invented paths)',
    anti:()=>g.recallExtract38('We talked about the plan and agreed to ship on Tuesday, maybe 3/4 of it.').length,antiExpect:v=>v===0});
  add({id:'recall-find-floor',sub:'memory',uses:['recallFind38','recallMerge38','recallUnion38'],
    what:'recall finds a place by a few words, ranks the used one first, and syncing twice never inflates its strength',
    run:()=>{let P=g.recallMerge38([],[{where:'/Users/c/ashfall',kind:'dir',name:'ashfall',source:'chat'},{where:'/Users/c/ashfall-old',kind:'dir',name:'ashfall-old'}]).places;
      P[0].uses=5;const hit=g.recallFind38('ashfall folder',P,Date.now())[0];
      const twice=g.recallUnion38(g.recallUnion38(P,P),P);
      return hit.p.where+'|'+twice.length+'|'+twice.find(p=>p.where==='/Users/c/ashfall').seen;},
    expect:v=>v==='/Users/c/ashfall|2|1',
    antiWhat:'and a query matching nothing answers “not known” instead of the strongest place',
    anti:()=>{const P=g.recallMerge38([],[{where:'/Users/c/ashfall',kind:'dir',name:'ashfall'}]).places;P[0].uses=50;return g.recallFind38('kubernetes billing dashboard',P).length;},antiExpect:v=>v===0});
  add({id:'skill-pack-paths',sub:'skills',uses:['stackSkillPaths38','STACK38'],
    what:'a skill pack import finds exactly the SKILL.md files in a repo tree, and every catalog entry that has an install line names its repo',
    run:()=>{const t={tree:[{path:'skills/review/SKILL.md',type:'blob'},{path:'README.md',type:'blob'},{path:'skills/x',type:'tree'},{path:'a/b/skill.md',type:'blob'},{path:'SKILL.md.bak',type:'blob'}]};
      return g.stackSkillPaths38(t).join(',')+'|'+g.STACK38.filter(x=>x.cmd&&!x.r).length;},
    expect:v=>v==='skills/review/SKILL.md,a/b/skill.md|0',
    antiWhat:'and an empty or failed listing imports nothing',anti:()=>g.stackSkillPaths38(null).length+g.stackSkillPaths38({message:'Not Found'}).length,antiExpect:v=>v===0});
  add({id:'dream-catcher-items',sub:'memory',uses:['dreamItems38'],
    what:'the dreaming pass keeps specific lessons and ideas and drops empty, duplicate and already-known ones',
    run:()=>{const it=g.dreamItems38({lessons:[{name:'Declare loopback only implicitly',body:'Chrome fails a mismatched targetAddressSpace'},{name:'ok'},{name:'Declare loopback only implicitly'}],
        ideas:[{name:'Already in the Brain',body:'x'},{name:'Add a reconnect button to the cloud terminal',body:'sessions survive reloads'}]},['already in the brain'],'chat');
      return it.map(x=>x.kind+':'+x.name).join(' | ');},
    expect:v=>v==='lesson:Declare loopback only implicitly | idea:Add a reconnect button to the cloud terminal',
    antiWhat:'and a reply that is not JSON proposes nothing',anti:()=>g.dreamItems38(null,[],'x').length,antiExpect:v=>v===0});
  add({id:'chat-pin-and-rewind',sub:'assistant',uses:['achatOrder38','achatRewind38'],
    what:'pinned chats list first, and rewinding cuts the chat back to before a message while keeping the full chat as a copy',
    run:()=>{const keep=g.ACHATS.slice();
      try{const c={id:'rw1',title:'T',msgs:[{role:'user',content:'one'},{role:'assistant',content:'a'},{role:'user',content:'two'},{role:'assistant',content:'b'}]};
        g.ACHATS=[{id:'x',title:'X'},c,{id:'p',title:'P',pinned:true}];
        const order=g.achatOrder38(g.ACHATS).map(x=>x.id).join('');const r=g.achatRewind38('rw1',2);
        const copy=g.ACHATS.find(x=>x.id===r.copyId);
        return [order,r.text,c.msgs.length,copy&&copy.msgs.length].join(',');}finally{g.ACHATS=keep;g.saveAChats();}},
    expect:v=>v==='pxrw1,two,2,4',
    antiWhat:'and rewinding a message that does not exist changes nothing',
    anti:()=>{const keep=g.ACHATS.slice();try{g.ACHATS=[{id:'rw2',msgs:[{role:'user',content:'a'}]}];const r=g.achatRewind38('rw2',9);return r.ok+':'+g.ACHATS.length+':'+g.ACHATS[0].msgs.length;}finally{g.ACHATS=keep;g.saveAChats();}},
    antiExpect:v=>v==='false:1:1'});
