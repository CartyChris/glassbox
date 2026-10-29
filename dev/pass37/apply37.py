# Pass 37 — base37.html (= gb-repo 25e0b8f) → GlassBox.html
import sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(W+'base37.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count: sys.exit('ANCHOR x%d (want %d): %r'%(n,count,old[:140]))
    s=s.replace(old,new)
def block(start,end,new):
    """Replace from start (inclusive) to the first end after it (inclusive); both must be unique."""
    global s
    if s.count(start)!=1: sys.exit('BLOCK START x%d: %r'%(s.count(start),start[:120]))
    i=s.index(start); j=s.index(end,i)+len(end)
    s=s[:i]+new+s[j:]
rd=lambda f:open(W+'p37/'+f).read()

# ═══ A. Ollama ═══
# A1. Chrome 142+ (Local Network Access) rejects a request whose DECLARED address space differs from the real one.
#     'local' now means the private LAN; 127.0.0.1 is 'loopback'. Declaring 'local' for loopback made every request fail
#     ("target IP address space of `local` yet the resource is in address space `loopback`") — measured in Chrome 156.
rep("""function localFetchOpts(){return pageIsLoopback(location.origin)?{}:{targetAddressSpace:'local'};}""",
"""/* PURE. Which address space a URL is in: 'loopback' (this machine), 'local' (private LAN) or '' (public). */
function addrSpace(u){
  let h='';try{h=new URL(String(u||'')).hostname.replace(/^\\[|\\]$/g,'').toLowerCase();}catch(_){return'';}
  if(/^(localhost|127\\.\\d+\\.\\d+\\.\\d+|::1)$/.test(h)||/\\.localhost$/.test(h))return'loopback';
  if(/^(10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.|169\\.254\\.)/.test(h)||/^f[cd][0-9a-f]{2}:/.test(h)||/\\.local$/.test(h))return'local';
  return'';
}
/* Chrome 142+ asks before a public site reaches this machine or the LAN. Only a private-LAN target is declared
   ('local' — it also lifts the mixed-content block on http LAN servers). Loopback is NOT declared: Chrome infers it,
   and a declared space that differs from the real one fails the request outright, before it is sent. */
function localFetchOpts(u){
  if(pageIsLoopback(location.origin))return{};
  return addrSpace(u)==='local'?{targetAddressSpace:'local'}:{};
}""")
rep("return fetch(base+'/api/tags',Object.assign({signal:c.signal},localFetchOpts(),opts))","return fetch(base+'/api/tags',Object.assign({signal:c.signal},localFetchOpts(base),opts))")
rep("route.local&&!route.viaBridge?localFetchOpts():{}","route.local&&!route.viaBridge?localFetchOpts(url):{}")
rep("signal:deadline(DL_API)},loop?localFetchOpts():{}));","signal:deadline(DL_API)},loop?localFetchOpts(url):{}));")
rep("fetch(cand.base+'/pair',Object.assign({signal:deadline(DL_LOCAL)},typeof localFetchOpts==='function'?localFetchOpts():{}))","fetch(cand.base+'/pair',Object.assign({signal:deadline(DL_LOCAL)},typeof localFetchOpts==='function'?localFetchOpts(cand.base):{}))")
rep("typeof localFetchOpts==='function'?localFetchOpts():{}));\n","typeof localFetchOpts==='function'?localFetchOpts(base):{}));\n")
rep("{method,signal:deadline(DL_LOCAL)},typeof localFetchOpts==='function'?localFetchOpts():{})","{method,signal:deadline(DL_LOCAL)},typeof localFetchOpts==='function'?localFetchOpts(REA_GHIDRA):{})")

# A2. macOS: one paste allows this site, makes it survive a restart, stops BOTH servers and reopens the app.
block("  return{label:'macOS',shell:'Terminal',","permanentWhy:'launchctl setenv is forgotten when the Mac restarts. This adds a tiny login item that sets it again at every login (before Ollama starts).'};\n}",rd('ollama-mac.js'))
# A3. The help: lead with "survives a restart" (it is in the one paste now), offer the undo, and on a Mac recommend the
#     menu-bar app rather than a terminal `ollama serve`, which starts the second server this fix exists to avoid.
rep("""    if(fx.permanent)h+=`<details class="dd" style="margin-top:8px"><summary>Make it survive a restart of your computer</summary><div class="ddb"><p class="help">${esc(fx.permanentWhy)}</p>${cmd(fx.permanent)}</div></details>`;""",
"""    if(fx.permanent)h+=`<details class="dd" style="margin-top:8px"><summary>Make it survive a restart of your computer</summary><div class="ddb"><p class="help">${esc(fx.permanentWhy)}</p>${cmd(fx.permanent)}</div></details>`;
    if(fx.undo)h+=`<details class="dd" style="margin-top:8px"><summary>What it changes, and how to undo it</summary><div class="ddb"><p class="help">It adds this site to Ollama's allowed sites, saves a small login item (<span class="mono">com.glassbox.ollama-origins</span>) so the setting survives a restart, and restarts Ollama. Nothing else. To undo:</p>${cmd(fx.undo)}</div></details>`;""")
rep("""      h+=`<p class="help" style="margin-top:10px">Open <b>Ollama.app</b> (or run the line below). This page keeps checking and connects the moment Ollama answers.</p>`+cmd('ollama serve');""",
"""      const mac=ollamaOS()==='mac';
      h+=`<p class="help" style="margin-top:10px">Open <b>Ollama</b>${mac?' (the menu-bar app — not a terminal <span class="mono">ollama serve</span>, which starts a second server that does not get your settings)':' (or run the line below)'}. This page keeps checking and connects the moment Ollama answers.</p>`+cmd(mac?'open -a Ollama':'ollama serve');""")
rep("""h+=`<p class="help" style="margin-top:10px"><b>Paste this into ${esc(fx.shell)}</b> — it allows this site, restarts Ollama, and prints <b>HTTP 200</b> when it worked. This page reconnects by itself the moment it does.</p>`+cmd(fx.now);""",
"""h+=`<p class="help" style="margin-top:10px"><b>Paste this into ${esc(fx.shell)}</b> — it allows this site${fx.undo?' (and keeps it allowed after a restart)':''}, restarts Ollama, and prints <b>HTTP 200</b> when it worked. This page reconnects by itself the moment it does.</p>`+cmd(fx.now);""")

EXPORTS=['addrSpace']
for part in ['apply37b.py','apply37c.py','apply37d.py','apply37e.py']:
    if os.path.exists(W+part): exec(open(W+part).read())
# ── exports + gauntlet (cases and sabotages from every stage) ──
rep("shellMode36,tabPosFor36,tabFace36,",",".join(EXPORTS)+",shellMode36,tabPosFor36,tabFace36,")
rep("  add({id:'fixture-chat-sweep',",rd('cases.js')+"\n  add({id:'fixture-chat-sweep',")
rep("  {id:'sandbox-noop',",rd('sab.js')+"\n  {id:'sandbox-noop',")
open(W+'GlassBox.html','w').write(s)
print('ok',len(s))
