/* ═══════════════════ PASS 36 — web reader tool ═══════════════════
   Agents read pages as clean Markdown instead of raw HTML — the Firecrawl / Jina Reader pattern that coding and
   research agents now use everywhere: a third of the tokens, none of the navigation chrome. Jina Reader serves it
   free with no key and answers browsers (measured 28 Oct 2026). It is a normal tool: it passes the tool gate,
   counts as untrusted input for the lethal-trifecta guard, and its output is injection-scanned like any other. */
const READER36={on:store.get('reader36',{on:true}).on!==false,cap:30000};
/* PURE. Only public http(s) pages go to the reader — never a local or private address, which would hand
   something on this machine or network to a third party. */
function readerUrlOk(u){
  let x;try{x=new URL(String(u||'').trim());}catch(_){return false;}
  if(!/^https?:$/.test(x.protocol))return false;
  const h=x.hostname.toLowerCase();
  if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h==='0.0.0.0'||h.includes(':'))return false;
  const m=h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if(m){const[a,b]=[+m[1],+m[2]];if(a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127))return false;}
  return true;
}
async function readerFetch(url){
  if(!readerUrlOk(url))throw new Error('only public http(s) addresses can be read — local and private ones stay on this machine');
  const r=await fetch('https://r.jina.ai/'+String(url).trim(),{headers:{'X-Return-Format':'markdown'},signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw new Error('reader answered HTTP '+r.status+(r.status===429?' — free rate limit, try again in a minute':''));
  const t=await r.text();
  return t.length>READER36.cap?t.slice(0,READER36.cap)+'\n\n[… truncated at '+READER36.cap+' characters]':t;
}
