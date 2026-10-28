/* ═══════════════════ PASS 36 — free providers ═══════════════════ */
/* PURE. Which synced model ids a provider should keep. With no key, a no-key provider keeps only what
   answers anonymously: rows that say they are not usage-billed (LLM7's turbo tier), and ids matching its
   syncFilter (Kilo's ":free" routes). With a key, everything stays. */
function syncKeep36(p,rows,ids){
  if(!p||p.key||!p.anonymous)return ids.slice();
  const billed=new Set((rows||[]).filter(r=>r&&typeof r==='object'&&r.usage_based_only===true).map(r=>String(r.id||r.name||'')));
  let keep=ids.filter(id=>!billed.has(id));
  if(p.syncFilter){let rx=null;try{rx=new RegExp(p.syncFilter);}catch(_){}if(rx)keep=keep.filter(id=>rx.test(id));}
  return keep;
}
const bridgeUp36=()=>typeof BRIDGE_INFO!=='undefined'&&!!BRIDGE_INFO;
