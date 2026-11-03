/* ═══════════════════ PASS 38 — CLOUD TERMINAL (any device, no bridge) ═══════════════════
   A real Linux PTY from a phone: /api/terminal (this deployment) creates a Vercel Sandbox running pfterm, and the page
   connects STRAIGHT to it — Vercel's own PTY WebSocket first, then pfterm's WebSocket, then pfterm's SSE. Claude Code,
   Codex, Gemini CLI, OpenCode, Oh My Pi, Qwen, Kimi and Aider are one tap away. Any other pfterm host (your Mac behind a
   tunnel, a VPS, a Codespace) connects the same way with its URL and token. The existing bridge terminal is unchanged. */
const CT38={sess:null,term:null,fit:null,io:null,ro:null,timer:null,status:null};
const CT38_PRESETS=[
  ['Claude Code','npm i -g @anthropic-ai/claude-code && claude'],['Codex','npm i -g @openai/codex && codex'],
  ['Gemini CLI','npm i -g @google/gemini-cli && gemini'],['OpenCode','npm i -g opencode-ai && opencode'],
  ['Oh My Pi','npm i -g @oh-my-pi/pi-coding-agent && omp'],['Qwen Code','npm i -g @qwen-code/qwen-code && qwen'],
  ['Kimi','curl -LsSf https://astral.sh/uv/install.sh | sh && . $HOME/.local/bin/env && uv tool install --python 3.13 kimi-cli && kimi'],
  ['Aider','curl -LsSf https://astral.sh/uv/install.sh | sh && . $HOME/.local/bin/env && uv tool install --python 3.12 aider-chat && aider']];
const CT38_KEYS=[['Esc','\x1b','Escape'],['Tab','\t','Tab'],['Ctrl-C','\x03','Control C'],['Ctrl-D','\x04','Control D'],['↑','\x1b[A','Up arrow'],['↓','\x1b[B','Down arrow'],['←','\x1b[D','Left arrow'],['→','\x1b[C','Right arrow'],['|','|','Pipe'],['~','~','Tilde'],['/','/','Slash']];
/* PURE. Which transports to try, best first. */
function ctTransports38(s){
  const out=[];if(!s)return out;
  if(s.shell&&s.shell.url)out.push({kind:'ws',url:s.shell.url,token:s.shell.token});
  if(s.bridge&&s.bridgeToken){out.push({kind:'ws',url:s.bridge.replace(/^http/,'ws').replace(/\/$/,'')+'/pty',token:s.bridgeToken});
    out.push({kind:'sse',base:s.bridge.replace(/\/$/,''),token:s.bridgeToken});}
  return out;
}
/* PURE. Minutes left on a session, never negative. */
function ctMinutesLeft38(until,now){return Math.max(0,Math.floor(((+until||0)-(now||Date.now()))/60000));}
const ctApi38=(action,extra)=>fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',signal:deadline(DL_API),
  body:JSON.stringify(Object.assign({action},extra||{}))}).then(async r=>{let j={};try{j=await r.json();}catch(_){j={ok:false,error:'HTTP '+r.status};}return j;});
async function ctLoadXterm38(){
  if(window.Terminal&&(window.Terminal.Terminal||typeof window.Terminal==='function')&&window.FitAddon)return;
  const js=u=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=u;s.onload=res;s.onerror=()=>rej(new Error('could not load '+u));document.head.appendChild(s);});
  const B='https://cdn.jsdelivr.net/npm/';
  await js(B+'@xterm/xterm@6.0.0/lib/xterm.js');await js(B+'@xterm/addon-fit@0.11.0/lib/addon-fit.js');
  if(!document.getElementById('xterm-css38'))try{const css=await (await fetch(B+'@xterm/xterm@6.0.0/css/xterm.css',{signal:deadline(DL_API)})).text();
    const st=document.createElement('style');st.id='xterm-css38';st.textContent=css;document.head.appendChild(st);}catch(_){}
}
const ctEnc38=new TextEncoder();
function ctWs38(ep,start,h,ms){return new Promise((resolve,reject)=>{
  const ws=new WebSocket(ep.url+(ep.url.includes('?')?'&':'?')+'token='+encodeURIComponent(ep.token));
  ws.binaryType='arraybuffer';let opened=false,exited=false;
  const t=setTimeout(()=>{if(!opened){try{ws.close();}catch(_){}reject(new Error('WebSocket timed out'));}},ms||8000);
  ws.onopen=()=>{opened=true;clearTimeout(t);
    ws.send(JSON.stringify({type:'start',command:start.command||'bash',args:start.args||['-l'],env:Object.entries(Object.assign({TERM:'xterm-256color'},start.env||{})).map(([k,v])=>k+'='+v),cwd:start.cwd,cols:start.cols,rows:start.rows}));
    resolve({transport:'websocket',send:d=>ws.readyState===1&&ws.send(typeof d==='string'?ctEnc38.encode(d):d),
      resize:(c,r)=>ws.readyState===1&&ws.send(JSON.stringify({type:'resize',cols:c,rows:r})),close:()=>{try{ws.close();}catch(_){}}});};
  ws.onmessage=ev=>{if(ev.data instanceof ArrayBuffer)return h.onData(new Uint8Array(ev.data));
    try{const m=JSON.parse(ev.data);if(m&&m.type==='exit'){exited=true;return h.onExit(m.code==null?null:m.code);}}catch(_){}
    h.onData(ctEnc38.encode(String(ev.data)));};
  ws.onerror=()=>{if(!opened){clearTimeout(t);reject(new Error('WebSocket failed'));}};
  ws.onclose=()=>{if(opened&&!exited)h.onExit(null);};
});}
async function ctSse38(ep,start,h){
  const q='?token='+encodeURIComponent(ep.token);
  const r=await fetch(ep.base+'/s'+q,{method:'POST',signal:deadline(DL_API),headers:{'Content-Type':'application/json'},body:JSON.stringify({command:start.command||'bash',args:start.args||['-l'],
    env:Object.entries(Object.assign({TERM:'xterm-256color'},start.env||{})).map(([k,v])=>k+'='+v),cols:start.cols,rows:start.rows})});
  if(!r.ok)throw new Error('SSE start HTTP '+r.status);
  const {id}=await r.json();const es=new EventSource(ep.base+'/s/'+id+'/out'+q);
  es.onmessage=e=>{const b=atob(e.data),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);h.onData(u);};
  es.addEventListener('exit',e=>{let c=null;try{c=JSON.parse(e.data).code;}catch(_){}es.close();h.onExit(c);});
  /* Keystrokes are batched per frame and posted one batch at a time, so fast typing arrives in order. */
  let pend='',busy=false;
  const flush=async()=>{if(busy||!pend)return;busy=true;const d=pend;pend='';
    try{await fetch(ep.base+'/s/'+id+'/in'+q,{method:'POST',body:d,signal:deadline(DL_API)});}catch(_){}busy=false;if(pend)flush();};
  return{transport:'sse',send:d=>{pend+=typeof d==='string'?d:new TextDecoder().decode(d);requestAnimationFrame?requestAnimationFrame(flush):setTimeout(flush,16);},
    resize:(c,rw)=>fetch(ep.base+'/s/'+id+'/resize'+q,{method:'POST',signal:deadline(DL_API),body:JSON.stringify({cols:c,rows:rw})}).catch(()=>{}),
    close:()=>{es.close();fetch(ep.base+'/s/'+id+q,{method:'DELETE',signal:deadline(DL_API)}).catch(()=>{});}};
}
async function ctConnect38(sess,host){
  await ctLoadXterm38();
  const T=window.Terminal.Terminal||window.Terminal,F=(window.FitAddon&&window.FitAddon.FitAddon)||window.FitAddon;
  if(CT38.io)try{CT38.io.close();}catch(_){}
  if(CT38.term)try{CT38.term.dispose();}catch(_){}
  host.innerHTML='';
  const cs=getComputedStyle(document.documentElement),v=k=>(cs.getPropertyValue(k)||'').trim();
  const term=new T({cursorBlink:true,fontSize:innerWidth<600?12:13,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
    theme:{background:v('--bg')||'#0e0f13',foreground:v('--ink')||'#e8e8ec',cursor:v('--acc')||'#4c8dff'}});
  const fit=new F();term.loadAddon(fit);term.open(host);try{fit.fit();}catch(_){}
  CT38.term=term;CT38.fit=fit;
  const h={onData:d=>term.write(d),onExit:c=>{term.write('\r\n\x1b[2m[session ended'+(c!=null?' — exit '+c:'')+']\x1b[0m\r\n');CT38.io=null;ctStatus38('ended');}};
  const start={command:'bash',args:['-l'],cols:term.cols,rows:term.rows,cwd:'/vercel/sandbox/project',env:{__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS:'.vercel.run'}};
  let io=null,errs=[];
  for(const ep of ctTransports38(sess)){
    try{io=ep.kind==='ws'?await ctWs38(ep,start,h):await ctSse38(ep,start,h);break;}catch(e){errs.push(ep.kind+': '+(e.message||e));}
  }
  if(!io){term.write('\x1b[31mCould not connect: '+errs.join('; ')+'\x1b[0m\r\n');ctStatus38('failed');return null;}
  CT38.io=io;term.onData(d=>io.send(d));term.onResize(({cols,rows})=>io.resize(cols,rows));
  if(CT38.ro)CT38.ro.disconnect();CT38.ro=new ResizeObserver(()=>{try{fit.fit();}catch(_){}});CT38.ro.observe(host);
  ctStatus38('connected over '+io.transport);term.focus();
  return io;
}
function ctStatus38(s){CT38.status=s;const el=document.getElementById('ct38-st');if(!el)return;
  const left=CT38.sess&&CT38.sess.until?ctMinutesLeft38(CT38.sess.until)+' min left':'';
  el.textContent=[s,left].filter(Boolean).join(' · ');}
function ctSave38(){try{CT38.sess?sessionStorage.setItem('gbterm38',JSON.stringify(CT38.sess)):sessionStorage.removeItem('gbterm38');}catch(_){}}
async function ctRender38(){
  const box=document.getElementById('term-sbx38');if(!box)return;
  if(CT38.io&&box.querySelector('#ct38-term .xterm'))return;   // never tear down a live terminal on a re-render
  try{if(!CT38.sess)CT38.sess=JSON.parse(sessionStorage.getItem('gbterm38')||'null');}catch(_){}
  if(CT38.sess&&CT38.sess.until&&CT38.sess.until<Date.now()){CT38.sess=null;ctSave38();}
  const hosted=location.protocol==='https:'&&!pageIsLoopback(location.origin);
  const st=hosted?await ctApi38('status').catch(()=>({ok:false})):{ok:false};
  const enabled=st&&st.ok&&st.enabled,unl=st&&st.unlocked;
  const presets=CT38_PRESETS.map(([l,c],i)=>`<button class="btn small" data-ct38p="${i}">${esc(l)}</button>`).join('');
  box.innerHTML=`<div class="card"><h2 style="margin-top:0">Cloud terminal</h2>
    <p class="help">A real Linux shell from any device — this phone included — with nothing running on your computer. Each session is a fresh
      sandbox on this site's Vercel account (it bills the account owner, so it needs the access code), up to 45 minutes, and it
      disappears when it ends. Or connect any machine running <a href="/cloud/pfterm.py" download>pfterm.py</a> (your Mac, a VPS, a Codespace).</p>
    ${!hosted?`<p class="help"><b>Open the hosted site</b> (glassbox-jet.vercel.app) to start a cloud sandbox, or connect your own pfterm host below.</p>`:
      !enabled?`<div class="diagbox">The cloud terminal is <b>off</b> on this deployment. The owner turns it on once by setting an access code (8+ characters):</div>
        <div class="row" style="margin-top:6px"><code class="mono cmdbox">vercel env add GLASSBOX_TERMINAL_CODE production</code></div>
        <p class="help">then redeploys. Until then, connect your own pfterm host below.</p>`:
      !unl?`<div class="row" style="gap:8px;flex-wrap:wrap"><input id="ct38-code" type="password" autocomplete="current-password" placeholder="access code" style="flex:0 1 220px">
        <button class="btn" id="ct38-unlock">Unlock</button></div>`:
      `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn" id="ct38-start">${CT38.sess?'Reconnect':'Start a cloud terminal'}</button>
        <select id="ct38-min" aria-label="Minutes"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option></select>
        ${CT38.sess?'<button class="btn small" id="ct38-more">+15 min</button><button class="btn small ghost" id="ct38-stop">Stop</button>':''}</div>`}
    <details class="dd" style="margin-top:8px"><summary>Connect your own pfterm host</summary><div class="ddb">
      <p class="help">On the machine: <span class="mono">PFTERM_TOKEN=&lt;16+ random characters&gt; python3 pfterm.py --port 8080 --root .</span> behind HTTPS
        (for example <span class="mono">cloudflared tunnel --url http://localhost:8080</span>). Then:</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input id="ct38-url" class="mono" placeholder="https://your-host" style="flex:2 1 220px">
        <input id="ct38-tok" type="password" placeholder="token" style="flex:1 1 140px"><button class="btn small" id="ct38-own">Connect</button></div></div></details>
    <div id="ct38-st" class="help" style="margin-top:8px"></div>
    <div class="row" id="ct38-presets" style="gap:6px;flex-wrap:wrap;margin:8px 0">${presets}</div>
    <div id="ct38-term" style="height:min(60vh,520px);border-radius:10px;overflow:hidden;background:var(--bg);border:1px solid var(--edge)"></div>
    <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:6px">${CT38_KEYS.map(([l,,n],i)=>`<button class="btn small ghost" data-ct38k="${i}" aria-label="${esc(n)}">${esc(l)}</button>`).join('')}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">
      <button class="btn small ghost" id="ct38-push">Send latest creation to /project</button><button class="btn small ghost" id="ct38-pull">Pull /project into Creations</button>
      ${CT38.sess&&CT38.sess.ports&&CT38.sess.ports[3000]?`<a class="btn small ghost" href="${esc(CT38.sess.ports[3000])}" target="_blank" rel="noopener">Open port 3000</a>`:''}</div></div>`;
  const $id=i=>document.getElementById(i),termHost=$id('ct38-term');
  box.querySelectorAll('[data-ct38k]').forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>{if(CT38.io)CT38.io.send(CT38_KEYS[+b.dataset.ct38k][1]);};});
  box.querySelectorAll('[data-ct38p]').forEach(b=>b.onclick=()=>{if(!CT38.io)return toast('Start or connect a terminal first',2500);CT38.io.send(CT38_PRESETS[+b.dataset.ct38p][1]+'\r');CT38.term&&CT38.term.focus();});
  if($id('ct38-unlock'))$id('ct38-unlock').onclick=async()=>{const r=await ctApi38('unlock',{code:$id('ct38-code').value});if(r.ok){toast('Unlocked for 12 hours',2000);ctRender38();}else toast(r.error||'Refused',4000);};
  if($id('ct38-start'))$id('ct38-start').onclick=async()=>{
    const btn=$id('ct38-start');btn.disabled=true;
    try{if(!CT38.sess){ctStatus38('starting a sandbox (about 20 seconds)…');const r=await ctApi38('create',{minutes:+$id('ct38-min').value});
        if(!r.ok)throw new Error(r.error||'could not start');CT38.sess={name:r.name,bridge:r.bridge,bridgeToken:r.bridgeToken,ports:r.ports,until:r.until};ctSave38();}
      const sh=await ctApi38('shell',{name:CT38.sess.name});CT38.sess.shell=sh.ok?{url:sh.url,token:sh.token}:null;
      await ctRender38();await ctConnect38(CT38.sess,document.getElementById('ct38-term'));}
    catch(e){toast('Cloud terminal: '+(e.message||e),5000);ctStatus38('failed');}finally{const b=$id('ct38-start');if(b)b.disabled=false;}};
  if($id('ct38-more'))$id('ct38-more').onclick=async()=>{const r=await ctApi38('extend',{name:CT38.sess.name,minutes:15});
    if(r.ok){CT38.sess.until+=r.addedMinutes*60000;ctSave38();ctStatus38(CT38.status||'');}else toast(r.error,4000);};
  if($id('ct38-stop'))$id('ct38-stop').onclick=async()=>{if(CT38.io)CT38.io.close();await ctApi38('stop',{name:CT38.sess.name});CT38.sess=null;ctSave38();ctRender38();};
  $id('ct38-own').onclick=async()=>{const u=$id('ct38-url').value.trim(),t=$id('ct38-tok').value;
    if(!/^https?:\/\//.test(u)||t.length<16)return toast('A URL and a token of 16+ characters',3000);
    CT38.sess={own:true,bridge:u.replace(/\/$/,''),bridgeToken:t};await ctConnect38(CT38.sess,termHost);};
  $id('ct38-push').onclick=async()=>{const s=CT38.sess,c=(CREATIONS||[])[0];if(!s||!s.bridge)return toast('Connect a terminal first',2500);if(!c)return toast('No creation yet',2500);
    const files=Object.entries(c.files||{}).map(([p,t])=>({path:p,b64:btoa(unescape(encodeURIComponent(String(t))))}));
    const r=await fetch(s.bridge+'/fs/write?token='+encodeURIComponent(s.bridgeToken),{method:'POST',headers:{'Content-Type':'application/json'},signal:deadline(DL_API),body:JSON.stringify({files})}).then(r=>r.json()).catch(e=>({error:e.message}));
    toast(r.written!=null?r.written+' file(s) written to /project':'Write failed: '+(r.error||''),3500);};
  $id('ct38-pull').onclick=async()=>{const s=CT38.sess;if(!s||!s.bridge)return toast('Connect a terminal first',2500);
    const q='?token='+encodeURIComponent(s.bridgeToken);
    try{const l=await (await fetch(s.bridge+'/fs/list'+q,{signal:deadline(DL_API)})).json();const paths=(l.files||[]).filter(f=>f.size<2e6).slice(0,200).map(f=>f.path);
      const rd=await (await fetch(s.bridge+'/fs/read'+q,{method:'POST',signal:deadline(DL_API),headers:{'Content-Type':'application/json'},body:JSON.stringify({paths})})).json();
      const files={};(rd.files||[]).forEach(f=>{try{files[f.path]=decodeURIComponent(escape(atob(f.b64)));}catch(_){}});
      if(!Object.keys(files).length)return toast('Nothing to pull',2500);
      creationSave({title:'From the cloud terminal',files,entry:Object.keys(files).find(n=>/index\.html?$/i.test(n))||''});toast(Object.keys(files).length+' file(s) saved as a creation',3500);}
    catch(e){toast('Pull failed: '+(e.message||e),4000);}};
  clearInterval(CT38.timer);CT38.timer=setInterval(()=>{if(CT38.sess&&CT38.sess.until)ctStatus38(CT38.status||'');},30000);
  ctStatus38(CT38.status||(CT38.sess?'session ready — press '+(CT38.io?'a preset':'Reconnect'):''));
}
