import { webkit } from 'playwright';
const b = await webkit.launch();
const p = await (await b.newContext({ viewport:{width:440,height:956}, hasTouch:true })).newPage();
p.on('pageerror', e=>console.log('PAGEERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2]); await p.waitForTimeout(1500);
const ids = await p.evaluate(()=>REGISTRY.tabs.map(t=>t.id));
let tot=0,skipped=0;const rows=[];const sk={};
for (const v of ids) {
  await p.evaluate(v=>{go(v);document.querySelectorAll('.view.active details').forEach(d=>d.open=true);},v); await p.waitForTimeout(300);
  const r = await p.evaluate(()=>{const app=document.getElementById('app');const left=__gb.emo39Left(app);
    // emoji inside skipped zones, by zone
    const av=document.querySelector('.view.active');let n,z={};if(!av)return {left,z};const w=document.createTreeWalker(av,NodeFilter.SHOW_TEXT);
    while((n=w.nextNode())){if(!/\p{Extended_Pictographic}/u.test(n.nodeValue))continue;const p=n.parentElement;const zz=p.closest('pre,code,textarea,.md,.am-body,.am-text,.oui-root,.xterm,.term,.cm-editor,.ee-doc,.of-paper,[data-emo39=keep],svg');
      if(zz){const k=zz.tagName.toLowerCase()+'.'+String(zz.className).split(' ')[0];z[k]=(z[k]||0)+1;}}
    return {left,z};});
  if (r.left.length) { rows.push(v+': '+[...new Set(r.left)].slice(0,8).join(' ; ')); tot+=r.left.length; }
  for (const [k,n] of Object.entries(r.z)) sk[v+' '+k]=n;
}
console.log(rows.join('\n')); console.log('LEFT', tot); console.log('IN CONTENT ZONES', JSON.stringify(sk));
await b.close();
