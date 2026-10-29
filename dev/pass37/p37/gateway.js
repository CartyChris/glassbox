/* ═══ PASS 37 — HOSTED GATEWAY ═══
   On the hosted site, providers that block browsers (Kilo's free models, NVIDIA, SambaNova…) used to need the local
   bridge — impossible on a phone. The deployment now carries a tiny same-origin gateway (/api/proxy, allowlisted hosts,
   nothing stored). The page asks /api/health once; from a file, the desktop app or localhost there is no gateway and
   nothing changes. The bridge still wins when it is running. */
const GATEWAY37={ok:false,hosts:[]};
function gatewayUp37(){return GATEWAY37.ok;}
/* PURE. May this upstream URL go through the gateway? */
function gatewayAllows37(target,hosts){try{return (hosts||GATEWAY37.hosts).includes(new URL(target).hostname);}catch(_){return false;}}
async function gatewayProbe37(){
  if(location.protocol!=='https:'||pageIsLoopback(location.origin))return false;
  try{const r=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    const j=r.ok?await r.json():null;
    GATEWAY37.ok=!!(j&&j.ok&&j.features&&j.features.proxy);GATEWAY37.hosts=GATEWAY37.ok&&Array.isArray(j.hosts)?j.hosts:[];}
  catch(_){GATEWAY37.ok=false;}
  if(GATEWAY37.ok)try{mergeCatalog();}catch(_){}
  return GATEWAY37.ok;
}
setTimeout(()=>{gatewayProbe37();},0);
