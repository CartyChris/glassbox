/* ═══════════════════ PASS 39 — NO EMOJI IN THE INTERFACE ═══════════════════
   Every emoji the app's own chrome prints (buttons, headings, chips, toasts, menus, tab faces) is drawn as a line
   icon instead, in the text colour, at the text size. Done at the DOM, not in the 2,400 string literals that carry
   them: those strings also feed prompts, exports, tests and generated apps, where an <svg> would be wrong.
   A MutationObserver callback runs as a microtask BEFORE the browser paints, so an emoji written by any code path
   is replaced before it is ever seen; no flash, no per-call-site edits.
   Left alone on purpose: what a person or a model wrote (chat replies, markdown, code, editors, inputs). An emoji
   someone asked a model for is content, and turning it into a monochrome glyph would change what it says.
   Arrows that iOS would otherwise draw as colour emoji (↗ ↔ ↩) keep their character with the text-style selector. */
const EMO39_TEXTSTYLE='↗↔↩↘↖↙↕↪⤴⤵▫▪©®™‼⁉';
const EMO39_SKIP='pre,code,textarea,script,style,svg,[contenteditable="true"],[contenteditable=""],.md,.am-body,.am-text,'+
  '.oui-root,.xterm,.term,.cm-editor,.CodeMirror,.ee-doc,.of-paper,iframe,[data-emo39="keep"]';
/* one emoji: a pictograph, then any variation selector, skin tone or ZWJ-joined continuation */
const EMO39_RE=/\p{Extended_Pictographic}(?:️|︎|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic}️?)*/gu;
const EMO39={on:true,n:0,obs:null};
const emo39Svg=name=>`<svg class="ic39" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-ic39="${name}">${EMO39_SVG[name]||'<circle cx="12" cy="12" r="2.5"/>'}</svg>`;
/* PURE. Which icon an emoji becomes; '' = keep it as a text-style character; null = no icon (drop it). */
function emo39Icon(e){
  const base=String(e||'').replace(/[︎️]/g,'');
  if(EMO39_MAP[base])return EMO39_MAP[base];
  const first=[...base][0]||'';
  if(EMO39_TEXTSTYLE.includes(first))return '';
  if(EMO39_MAP[first])return EMO39_MAP[first];
  return null;
}
/* PURE. Split text into plain runs and emoji: [{t:'text'}|{e:'⚙',icon:'settings'|''|null}]. */
function emo39Split(text){
  const out=[];let last=0;const s=String(text||'');
  EMO39_RE.lastIndex=0;let m;
  while((m=EMO39_RE.exec(s))){
    if(m.index>last)out.push({t:s.slice(last,m.index)});
    out.push({e:m[0],icon:emo39Icon(m[0])});last=m.index+m[0].length;
  }
  if(last<s.length)out.push({t:s.slice(last)});
  return out;
}
/* PURE. Text with the emoji removed (attributes, <option>, document titles) — text-style arrows kept. */
function emo39Strip(text){
  return emo39Split(text).map(p=>p.t!=null?p.t:(p.icon===''?p.e.replace(/[︎️]/g,'')+'︎':'')).join('')
    .replace(/^\s+(?=\S)/,'').replace(/ {2,}/g,' ');
}
const emo39Human=n=>String(n||'').replace(/-\d+$/,'').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
function emo39Skip(el){return !el||!el.closest||!!el.closest(EMO39_SKIP);}
function emo39TextNode(node){
  const t=node.nodeValue;if(!t)return;
  EMO39_RE.lastIndex=0;if(!EMO39_RE.test(t))return;
  const p=node.parentElement;if(!p||emo39Skip(p))return;
  if(/^(OPTION|TITLE|OPTGROUP|TEXTAREA)$/.test(p.tagName)){node.nodeValue=emo39Strip(t);EMO39.n++;return;}
  const parts=emo39Split(t);
  const frag=document.createDocumentFragment();let firstIcon='';
  parts.forEach((x,i)=>{
    if(x.t!=null){frag.appendChild(document.createTextNode(x.t));return;}
    if(x.icon===''){frag.appendChild(document.createTextNode(x.e.replace(/[︎️]/g,'')+'︎'));return;}
    if(x.icon===null){
      /* an emoji with no icon still leaves a mark if it was the whole label, so the control is not blank */
      if(parts.length===1){const sp=document.createElement('span');sp.className='emo39';sp.innerHTML=emo39Svg('');frag.appendChild(sp);}
      return;
    }
    const sp=document.createElement('span');sp.className='emo39';sp.innerHTML=emo39Svg(x.icon);frag.appendChild(sp);
    if(!firstIcon)firstIcon=x.icon;
  });
  node.replaceWith(frag);EMO39.n++;
  /* An icon-only control keeps an accessible name: its title, else the icon's own name. */
  const ctl=p.closest('button,a,[role="button"],.chip,.tab');
  if(ctl&&!ctl.getAttribute('aria-label')&&!(ctl.textContent||'').trim()){
    ctl.setAttribute('aria-label',emo39Strip(ctl.getAttribute('title')||'')||emo39Human(firstIcon)||'Button');
  }
}
const EMO39_ATTRS=['title','aria-label','placeholder','alt','data-l36'];
function emo39Attrs(el){
  if(emo39Skip(el)&&!el.matches('textarea,[contenteditable]'))return;
  for(const a of EMO39_ATTRS){
    const v=el.getAttribute&&el.getAttribute(a);if(!v)continue;
    EMO39_RE.lastIndex=0;if(EMO39_RE.test(v)){const nv=emo39Strip(v);if(nv!==v)el.setAttribute(a,nv);}
  }
}
function emo39Scan(root){
  if(!EMO39.on||!root)return;
  if(root.nodeType===3){emo39TextNode(root);return;}
  if(root.nodeType!==1&&root.nodeType!==11)return;
  if(root.nodeType===1){if(root.closest&&root.closest('svg'))return;emo39Attrs(root);}
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    if(n.nodeType===1)return n.matches(EMO39_SKIP)&&!n.matches('textarea')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
    return NodeFilter.FILTER_ACCEPT;}});
  const texts=[];let n;
  while((n=w.nextNode())){if(n.nodeType===3)texts.push(n);else emo39Attrs(n);}
  texts.forEach(emo39TextNode);
}
function emo39Start(){
  if(EMO39.obs)return;
  emo39Scan(document.body);
  if(document.title)document.title=emo39Strip(document.title);
  EMO39.obs=new MutationObserver(recs=>{
    if(!EMO39.on)return;
    for(const r of recs){
      if(r.type==='characterData')emo39TextNode(r.target);
      else if(r.type==='attributes'){if(r.target.nodeType===1)emo39Attrs(r.target);}
      else r.addedNodes.forEach(emo39Scan);
    }
    EMO39.obs.takeRecords();      // our own replacements are already clean
  });
  EMO39.obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:EMO39_ATTRS});
}
/* For the layout check and the gauntlet: emoji still drawn in the visible chrome of a root. */
function emo39Left(root){
  const out=[];const w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){
    const p=n.parentElement;if(!p||emo39Skip(p))continue;
    EMO39_RE.lastIndex=0;const m=n.nodeValue.match(EMO39_RE);if(!m)continue;
    const real=m.filter(e=>emo39Icon(e)!=='');if(!real.length)continue;
    const b=p.getBoundingClientRect();if(!b.width&&!b.height)continue;
    out.push(real.join('')+' in '+(p.id?'#'+p.id:p.tagName.toLowerCase()+(p.className&&typeof p.className==='string'?'.'+p.className.split(' ')[0]:'')));
  }
  return out;
}
