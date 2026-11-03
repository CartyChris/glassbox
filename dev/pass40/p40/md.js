/* ═══ PASS 40 — Markdown for answers ═══
   Escape first, then add only the structure Markdown names: fenced code (with its language and a copy button),
   headings, lists (nested, numbered, task), quotes, tables, rules, emphasis, inline code, and http(s) links only.
   An unclosed fence while streaming renders as code to the end, so a half-written block never shows as prose. */
function md40Inline(s){
  const codes=[];
  s=String(s).replace(/`([^`\n]+)`/g,(m,c)=>{codes.push(c);return '\u0000'+(codes.length-1)+'\u0000';});
  s=esc(s)
    .replace(/\*\*([^*\n]+?)\*\*/g,'<b>$1</b>').replace(/__([^_\n]+?)__/g,'<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)/g,'$1<i>$2</i>').replace(/(^|[^_\w])_([^_\s][^_\n]*?)_(?!\w)/g,'$1<i>$2</i>')
    .replace(/~~([^~\n]+)~~/g,'<s>$1</s>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,(m,t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?'"])/g,'$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return s.replace(/\u0000(\d+)\u0000/g,(m,k)=>'<code>'+esc(codes[+k])+'</code>');
}
function md40(src){
  const L=String(src==null?'':src).replace(/\r\n?/g,'\n').split('\n');const out=[];let i=0;
  const isList=l=>/^(\s*)([-*+]|\d+[.)])\s+/.test(l);
  const tableSep=l=>/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const cells=l=>l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
  while(i<L.length){
    const l=L[i];let m;
    if((m=l.match(/^\s*(```|~~~)\s*([\w+#.-]*)/))){
      const fence=m[1],lang=m[2]||'';const body=[];i++;
      while(i<L.length&&!L[i].trim().startsWith(fence)){body.push(L[i]);i++;}
      i++;
      out.push(`<div class="t40-code"><div class="t40-codeh"><span>${esc(lang||'code')}</span><button type="button" data-t40code aria-label="Copy code" title="Copy">${ic40('copy')}</button></div><pre><code>${esc(body.join('\n'))}</code></pre></div>`);
      continue;
    }
    if(!l.trim()){i++;continue;}
    if((m=l.match(/^(#{1,6})\s+(.*)$/))){const n=Math.min(6,m[1].length+2);out.push(`<h${n}>${md40Inline(m[2].replace(/\s#+\s*$/,''))}</h${n}>`);i++;continue;}
    if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){out.push('<hr>');i++;continue;}
    if(/^\s*>/.test(l)){const q=[];while(i<L.length&&/^\s*>/.test(L[i])){q.push(L[i].replace(/^\s*>\s?/,''));i++;}out.push('<blockquote>'+md40(q.join('\n'))+'</blockquote>');continue;}
    if(l.includes('|')&&i+1<L.length&&tableSep(L[i+1])){
      const head=cells(l);i+=2;const rows=[];
      while(i<L.length&&L[i].includes('|')&&L[i].trim()){rows.push(cells(L[i]));i++;}
      out.push('<div class="t40-table"><table><thead><tr>'+head.map(c=>'<th>'+md40Inline(c)+'</th>').join('')+'</tr></thead><tbody>'+
        rows.map(r=>'<tr>'+head.map((_,k)=>'<td>'+md40Inline(r[k]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
      continue;
    }
    if(isList(l)){
      /* a stack of open lists by indent: deeper indent opens a nested list inside the last item */
      let h='';const st=[];
      while(i<L.length&&(isList(L[i])||(L[i].trim()&&/^\s{2,}\S/.test(L[i])&&st.length))){
        const x=L[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if(!x){h+=' '+md40Inline(L[i].trim());i++;continue;}
        const ind=x[1].replace(/\t/g,'    ').length,tag=/\d/.test(x[2])?'ol':'ul';
        while(st.length&&ind<st[st.length-1].ind){h+='</li></'+st.pop().tag+'>';}
        if(!st.length||ind>st[st.length-1].ind){h+='<'+tag+(tag==='ol'&&/^\d+/.test(x[2])&&parseInt(x[2])!==1?' start="'+parseInt(x[2])+'"':'')+'>';st.push({ind,tag});}
        else h+='</li>';
        let t=x[3];const task=t.match(/^\[([ xX])\]\s+(.*)$/);
        h+='<li'+(task?' class="t40-task"':'')+'>'+(task?`<input type="checkbox" disabled${task[1]!==' '?' checked':''} aria-label="${task[1]!==' '?'done':'not done'}"> `+md40Inline(task[2]):md40Inline(t));
        i++;
      }
      while(st.length)h+='</li></'+st.pop().tag+'>';
      out.push(h);continue;
    }
    const p=[];
    while(i<L.length&&L[i].trim()&&!/^\s*(```|~~~|#{1,6}\s|>)/.test(L[i])&&!isList(L[i])&&!(L[i].includes('|')&&i+1<L.length&&tableSep(L[i+1]))){p.push(md40Inline(L[i]));i++;}
    if(p.length)out.push('<p>'+p.join('<br>')+'</p>');else i++;
  }
  return out.join('');
}
