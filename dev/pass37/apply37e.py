# ═══ E. Hosted gateway (from the forge-vercel review) ═══
rep("/* ═══════════════════ ASSISTANT — the front door",rd('gateway.js')+"\n/* ═══════════════════ ASSISTANT — the front door")
rep("const bridgeUp36=()=>typeof BRIDGE_INFO!=='undefined'&&!!BRIDGE_INFO;","const bridgeUp36=()=>(typeof BRIDGE_INFO!=='undefined'&&!!BRIDGE_INFO)||(typeof gatewayUp37==='function'&&gatewayUp37());")
rep("""  if(route.viaBridge){
    if(!BRIDGE_INFO)throw new Error(`${route.provider} needs the local bridge (its server blocks browsers). Start it: node glassbox-bridge.mjs`);
    payload=JSON.stringify({url:route.url,method:'POST',headers:route.headers,body:payload});
    url=bridgeBase()+'/proxy';
    headers={'Content-Type':'application/json'};
  }""","""  if(route.viaBridge&&!BRIDGE_INFO&&gatewayUp37()&&gatewayAllows37(route.url)){
    url=location.origin+'/api/proxy?url='+encodeURIComponent(route.url);   // same-origin hosted gateway
  }else if(route.viaBridge){
    if(!BRIDGE_INFO)throw new Error(`${route.provider} needs the local bridge (its server blocks browsers). Start it: node glassbox-bridge.mjs — or use the hosted site, which forwards it for you`);
    payload=JSON.stringify({url:route.url,method:'POST',headers:route.headers,body:payload});
    url=bridgeBase()+'/proxy';
    headers={'Content-Type':'application/json'};
  }""")
EXPORTS+=['gatewayAllows37']
