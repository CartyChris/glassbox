  /* ── pass 40 ── */
  {id:'chat-drops-thinking-tokens',export:'turn40Meta',why:'the chat footer never shows thinking or cached tokens',broken:()=>(a,r)=>{const u=(a&&a.usage)||{};return{model:r,requested:r,tin:u.prompt_tokens||0,tout:u.completion_tokens||0,tthink:0,tcache:0,ttft:null,ms:0,finish:'',cites:[],rounds:1,cost:null};}},
  {id:'chat-tool-loop-forgets-rounds',export:'turn40Merge',why:'a tool loop shows only its last round’s tokens',broken:()=>(a,b)=>b||a},
  {id:'chat-hides-steps',export:'turn40HTML',why:'the chat shows only the answer, not what the turn did',broken:()=>m=>'<div class="am">'+String(m.content||'')+'</div>'},
  {id:'chat-search-title-only',export:'chatFind40',why:'chat search ignores what was said in a chat',broken:()=>(L,q)=>(L||[]).filter(c=>!q||String(c.title||'').toLowerCase().includes(String(q).toLowerCase()))},
  {id:'chat-markdown-raw',export:'md40',why:'answers show raw Markdown asterisks and fences',broken:()=>t=>'<p>'+esc(String(t||''))+'</p>'},
