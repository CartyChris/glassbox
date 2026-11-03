  /* ── pass 40: chat ── */
  add({id:'chat-turn-accounting',sub:'assistant',uses:['turn40Meta','turn40Merge','turn40Estimate'],
    what:'a turn keeps its tokens (in, out, thinking, cached), timing, route and sources from either provider shape, and a tool loop adds its rounds up',
    run:()=>{const a=g.turn40Meta({model:'ovh/gpt-oss-20b',ttft:412.4,elapsed:2300,cost:0.001,finishReason:'stop',freeFrom:'anthropic/x',
        usage:{prompt_tokens:1200,completion_tokens:300,completion_tokens_details:{reasoning_tokens:120},prompt_tokens_details:{cached_tokens:800}},
        annotations:[{type:'url_citation',url_citation:{url:'https://a.example/x',title:'A'}}]},'anthropic/x');
      const b=g.turn40Meta({usage:{input_tokens:50,output_tokens:20,cache_read_input_tokens:10},elapsed:700,cost:0.0005,annotations:[{type:'url_citation',url_citation:{url:'https://a.example/x'}},{type:'url_citation',url_citation:{url:'https://b.example/'}}]},'anthropic/x');
      const m=g.turn40Merge(a,b);
      return [a.tin,a.tout,a.tthink,a.tcache,a.ttft,a.freeFrom?'free':'',m.tin,m.tout,m.tcache,m.ms,m.rounds,m.cites.length,Math.round(m.cost*1e4)].join(',');},
    expect:v=>v==='1200,300,120,800,412,free,1250,320,810,3000,2,2,15',
    antiWhat:'and a reply with no usage reports zeros and no cost — an estimate only when asked for, and marked as one',
    anti:()=>{const x=g.turn40Meta({},'m');const e=g.turn40Estimate(g.turn40Meta({content:'abcdefgh',ctxChars:400},'m'),{content:'abcdefgh',ctxChars:400});
      return [x.tin,x.tout,x.cost,x.ttft,x.cites.length,e.est,e.tin,e.tout].join(',');},antiExpect:v=>v==='0,0,,,0,true,100,2'});
  add({id:'chat-turn-labels',sub:'assistant',uses:['turn40Summary','think40Label','tool40Status','fmtDur40','fmtTok40'],
    what:'a turn that used tools says how long it worked and how many steps; thinking says live seconds, then how long and how many tokens',
    run:()=>{const m={role:'assistant',t0:1000,t1:13400,tools:[{name:'a',ok:true},{name:'b',ok:false,note:'blocked — not allowed'},{name:'(declined)',ok:false}],
        reasoning:'hmm',content:'answer',th0:1000,th1:9900,meta:{tthink:1234}};
      const live={role:'assistant',t0:1000,streaming:true,reasoning:'r',content:'',th0:1000};
      return [g.turn40Summary(m),g.think40Label(m),g.think40Label(live,5200),m.tools.map(g.tool40Status).join('+'),g.fmtTok40(12345),g.fmtDur40(75000)].join(' | ');},
    expect:v=>v==='Worked for 12s · 3 steps | Thought for 9s · 1.2k tokens | Thinking… 4s | ok+blocked+declined | 12k | 1m 15s',
    antiWhat:'and a turn with no tools or no reasoning gets no header at all',
    anti:()=>g.turn40Summary({tools:[]})+'|'+g.think40Label({reasoning:'  '}),antiExpect:v=>v==='|'});
  add({id:'chat-turn-renders-everything',sub:'assistant',uses:['turn40HTML'],
    what:'a finished turn shows its steps header, thinking, every tool, the provider · model chip, tokens, sources and the action row',
    run:()=>{const m={role:'assistant',content:'Done.',reasoning:'thought',t0:1,t1:4001,th0:1,th1:2001,
        tools:[{name:'read_web_page',ok:true,status:'ok',args:{url:'https://x'},result:'page',note:'read 1 page'}],
        meta:{model:'ovh/gpt-oss-20b',requested:'ovh/gpt-oss-20b',tin:900,tout:120,tthink:60,tcache:0,ttft:300,ms:4000,rounds:2,cites:[{url:'https://src.example/a',title:'S'}]}};
      const h=g.turn40HTML(m,-1);
      return ['Worked for 4s · 1 step','Thought for 2s','read_web_page','gpt-oss-20b','900 in · 120 out','src.example','data-t40info','2 rounds'].map(k=>h.includes(k)?1:0).join('');},
    expect:v=>v==='11111111',
    antiWhat:'and a user message is a bubble with copy / edit / fork, never an assistant footer',
    anti:()=>{const h=g.turn40HTML({role:'user',content:'hi <b>',shown:'hi <b>'},3);return [h.includes('data-rewind38="3"'),h.includes('&lt;b&gt;'),h.includes('t40-foot')].join(',');},antiExpect:v=>v==='true,true,false'});
  add({id:'chat-totals-and-search',sub:'assistant',uses:['chatTotals40','chatFind40','att40Block'],
    what:'the status strip totals a chat, chat search matches titles and what was said, and attachments travel as labelled blocks',
    run:()=>{const c={cost:0.02,msgs:[{role:'user',content:'q'},{role:'assistant',meta:{tin:100,tout:40,tthink:5}},{role:'assistant',meta:{tin:10,tout:2}}]};
      const t=g.chatTotals40(c);
      const L=[{title:'Trip plan',msgs:[{content:'flights to Lisbon'}]},{title:'Code',msgs:[{content:'debounce function'}]}];
      return [t.tin,t.tout,t.turns,g.chatFind40(L,'lisbon').map(x=>x.title).join(),g.chatFind40(L,'').length,g.att40Block([{name:'a.txt',text:'hello'}])].join('|');},
    expect:v=>v==='110|42|2|Trip plan|2|### Attached: a.txt\n```\nhello\n```',
    antiWhat:'and a query that matches nothing finds nothing',
    anti:()=>g.chatFind40([{title:'x',msgs:[]}],'zzz qqq').length,antiExpect:v=>v===0});
  add({id:'chat-markdown-safe',sub:'assistant',uses:['md40'],
    what:'answers render Markdown — code with its language, tables, nested and task lists, quotes, http links — and nothing executable',
    run:()=>{const h=g.md40('# Title\n\nSome **bold** and `x<y`.\n\n```js\nlet a=1<2;\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n- one\n  - nested\n- [x] done\n\n> quoted\n\nSee https://example.com/a.');
      return ['<h3>Title</h3>','<b>bold</b>','<code>x&lt;y</code>','<span>js</span>','let a=1&lt;2;','<th>a</th>','<td>2</td>','<ul><li>one<ul><li>nested','checked','<blockquote><p>quoted','href="https://example.com/a"'].map(k=>h.includes(k)?1:0).join('');},
    expect:v=>v==='11111111111',
    antiWhat:'and script, javascript: links and raw HTML stay text',
    anti:()=>{const h=g.md40('<scr'+'ipt>alert(1)</scr'+'ipt> [x](javascript:alert(1)) <img src=x onerror=1>');return /<scr(?=ipt)|href="javascript|<img/i.test(h);},antiExpect:v=>v===false});
