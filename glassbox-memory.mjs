#!/usr/bin/env node
/* GlassBox Memory — an MCP stdio server that gives ANY local CLI read/write/audit access to
 * the GlassBox Brain and knowledge graphs.
 *
 *   Prime Agent, Claude Code, Codex, Kimi, Hermes, Goose, Oh My Pi — anything that speaks MCP.
 *
 * WHY A SEPARATE FILE rather than more routes on the bridge: CLIs consume MCP over stdio, and
 * a stdio server has to BE a process they spawn. The bridge is an HTTP server; making it also
 * pretend to be a stdio child would be a worse version of just writing the 200 lines.
 *
 * WHERE THE DATA LIVES: ~/.glassbox/memory.json — one file, written atomically. The browser
 * cannot share its IndexedDB with a subprocess, so GlassBox mirrors the Brain here through the
 * bridge and pulls external edits back. That mirror is the contract between the two worlds.
 *
 * Register it with a CLI the same way as any MCP server, e.g. for Claude Code:
 *   claude mcp add glassbox-memory -- node /path/to/glassbox-memory.mjs
 *
 * Zero dependencies, same as the bridge.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = path.join(os.homedir(), '.glassbox');
const FILE = process.env.GLASSBOX_MEMORY_FILE || path.join(DIR, 'memory.json');
const EMPTY = {docs: [], graphs: [], places: [], rev: 0, updated: null, external: []};

function load() {
  try { return Object.assign({}, EMPTY, JSON.parse(fs.readFileSync(FILE, 'utf8'))); }
  catch { return JSON.parse(JSON.stringify(EMPTY)); }
}
/* Atomic write. A CLI and the browser can both be writing; a half-written JSON file would be
   read back as an empty memory, which looks exactly like "the Brain lost everything". */
function save(m) {
  m.rev = (m.rev || 0) + 1;
  m.updated = new Date().toISOString();
  fs.mkdirSync(DIR, {recursive: true});
  const tmp = FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(m, null, 2));
  fs.renameSync(tmp, FILE);
  return m;
}
const uid = () => Math.random().toString(36).slice(2, 9);
const words = s => new Set(String(s || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []);

/* Lexical scoring with a length penalty, so a long note does not win every query merely by
   containing more words. This is the same shape as the app's own scoring — deliberately, so
   a CLI and the browser rank the same memory the same way. */
function score(text, q) {
  const t = words(text), qs = words(q);
  if (!qs.size || !t.size) return 0;
  let hits = 0;
  qs.forEach(w => { if (t.has(w)) hits++; });
  return (hits / qs.size) * (1 - Math.min(0.4, t.size / 4000));
}

/* ── the six tools ───────────────────────────────────────────────────────────── */
const TOOLS = [
  {name: 'brain_recall',
   description: 'Search the GlassBox Brain for what this project has already learned. Use this BEFORE proposing an approach — it is how you avoid repeating something already tried and rejected.',
   inputSchema: {type: 'object', required: ['query'], properties: {
     query: {type: 'string'}, limit: {type: 'number', description: 'default 8'},
     kind: {type: 'string', description: 'filter: insight | mistake | reference | decision | research | snippet'}}},
   annotations: {readOnlyHint: true, openWorldHint: false}},

  {name: 'brain_remember',
   description: 'Write a durable lesson into the Brain. Record CONCLUSIONS, not transcripts. State what you verified and how, because later runs will trust this without re-checking it.',
   inputSchema: {type: 'object', required: ['name', 'body'], properties: {
     name: {type: 'string'}, body: {type: 'string'},
     kind: {type: 'string', description: 'insight | mistake | reference | decision | snippet'},
     agents: {type: 'array', items: {type: 'string'}, description: 'which agents need this'},
     provenance: {type: 'string', description: 'verified | trial | model | research'},
     expiresInDays: {type: 'number', description: 'omit for permanent'}}},
   annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false}},

  {name: 'brain_mistake',
   description: 'Record a mistake so it is never repeated. Injected unconditionally into every future build, regardless of topic match — use it when something cost you a round.',
   inputSchema: {type: 'object', required: ['name', 'body'], properties: {
     name: {type: 'string'}, body: {type: 'string'},
     severity: {type: 'number', description: '1 low, 2 medium, 3 high'}}},
   annotations: {readOnlyHint: false, destructiveHint: false}},

  {name: 'graph_query',
   description: 'Traverse a GlassBox knowledge graph. Returns typed relationships, not just matching text — this is what tells you that approach A SUPERSEDES approach B, which flat search cannot.',
   inputSchema: {type: 'object', required: ['query'], properties: {
     query: {type: 'string'}, graph: {type: 'string', description: 'graph name; omit to search all'},
     depth: {type: 'number', description: 'default 2'}}},
   annotations: {readOnlyHint: true, openWorldHint: false}},

  {name: 'graph_learn',
   description: 'Add a typed relationship to a graph. Edge types: depends_on, causes, fixes, supersedes, contradicts, supports, uses, example_of, derived_from. Prefer supersedes when you replace an approach — it is what stops the next run reverting to it.',
   inputSchema: {type: 'object', required: ['graph', 'from', 'edge', 'to'], properties: {
     graph: {type: 'string'}, from: {type: 'string'}, edge: {type: 'string'}, to: {type: 'string'},
     note: {type: 'string'}, body: {type: 'string'},
     provenance: {type: 'string', description: 'verified | trial | model | research | opensource | news'}}},
   annotations: {readOnlyHint: false, destructiveHint: false}},

  {name: 'brain_audit',
   description: 'Audit the memory for the failure modes that actually degrade agent memory: contradictions with no winner, stale entries, unsupported claims, duplicates and orphan graph nodes. Returns findings; it never edits anything itself.',
   inputSchema: {type: 'object', properties: {
     fix: {type: 'boolean', description: 'when true, applies only the SAFE fixes: demote duplicates and expire dead entries. Never deletes.'}}},
   annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true}},
  {name: 'places_find',
   description: 'System-1 recall: WHERE a file, folder, repo, site, host or local server is. Instant, no model call. Answers not-known rather than guessing — then search properly and call places_remember.',
   inputSchema: {type: 'object', required: ['query'], properties: {query: {type: 'string'}, limit: {type: 'number', description: 'default 6'}}},
   annotations: {readOnlyHint: true, openWorldHint: false}},
  {name: 'places_remember',
   description: 'Remember where something is (a path, URL, repo, host, or a command that opens it), so every agent and the person can recall it instantly.',
   inputSchema: {type: 'object', required: ['where'], properties: {where: {type: 'string'}, name: {type: 'string'}, kind: {type: 'string', description: 'file | dir | repo | url | local | host | command'}, tags: {type: 'array', items: {type: 'string'}}}},
   annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true}},
  {name: 'places_dream',
   description: 'Dreaming pass: give it a transcript, log or notes and it files every location it mentions (mechanically — it cannot invent one).',
   inputSchema: {type: 'object', required: ['text'], properties: {text: {type: 'string'}, source: {type: 'string'}}},
   annotations: {readOnlyHint: false, destructiveHint: false}},
];

// ── S1 places: GENERATED from GlassBox.html (p38/recall.js) by dev/pass38/dev38-memory.py — edit there, not here ──
const RECALL38_FLOOR=0.34;
const RECALL38_KINDS={dir:'dir folder directory',file:'file',repo:'repo repository github',url:'url site website link page docs',local:'local server localhost port',host:'host server ssh machine',command:'command cmd run'};
function recallExtract38(text,source){
  const t=String(text||'').slice(0,400000),out=new Map(),add=(where,kind)=>{
    where=where.replace(/[)\].,;:'"`>]+$/,'');if(where.length<4||where.length>300||out.has(where))return;
    const name=kind==='repo'?where.replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,''):(kind==='url'||kind==='local')?where.replace(/^https?:\/\//,'').replace(/\/$/,''):where.split(/[\\/]/).filter(Boolean).pop()||where;
    out.set(where,{where,kind,name:name.slice(0,80),source:source||''});};
  (t.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/g)||[]).forEach(u=>add(u,'repo'));
  (t.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d{2,5}[^\s'"<>)]*/g)||[]).forEach(u=>add(u,'local'));
  (t.match(/https?:\/\/[^\s'"<>()]+/g)||[]).forEach(u=>{if(!out.has(u.replace(/[)\].,;:'"`>]+$/,'')))add(u,/github\.com\/[\w.-]+\/[\w.-]+/.test(u)?'repo':'url');});
  (t.match(/(?:^|[\s'"`(=])((?:~|\/Users|\/home|\/opt|\/var|\/etc|\/private|\/Volumes|\/tmp)(?:\/[\w .@+~-]*[\w@+~-](?=\/))*\/[\w.@+~-]*[\w@+~-])/g)||[])
    .forEach(m=>{const p=m.replace(/^[\s'"`(=]/,'');add(p,/\.[\w]{1,6}$/.test(p)?'file':'dir');});
  (t.match(/\b[A-Za-z]:\\(?:[\w .-]+\\)*[\w .-]+/g)||[]).forEach(p=>add(p,'file'));
  (t.match(/\bssh\s+(?:-\w+\s+\S+\s+)*([\w.-]+@[\w.-]+)/g)||[]).forEach(m=>add(m.split(/\s+/).pop(),'host'));
  return [...out.values()];
}
function recallMerge38(places,found,now){
  const by=new Map((places||[]).map(p=>[p.where,p]));const T=now||Date.now();let added=0;
  (found||[]).forEach(f=>{const p=by.get(f.where);
    if(p){p.seen=(p.seen||1)+1;p.last=T;if(f.source&&!(p.sources||[]).includes(f.source))p.sources=(p.sources||[]).concat([f.source]).slice(-5);}
    else{by.set(f.where,{id:'p'+Math.random().toString(36).slice(2,9),where:f.where,kind:f.kind,name:f.name,tags:f.tags||[],seen:1,uses:0,
      first:T,last:T,sources:f.source?[f.source]:[],prov:f.prov||'dream'});added++;}});
  return{places:[...by.values()],added};
}
function recallUnion38(a,b){
  const by=new Map((a||[]).map(p=>[p.where,Object.assign({},p)]));
  (b||[]).forEach(q=>{if(!q||!q.where)return;const p=by.get(q.where);
    if(!p)by.set(q.where,Object.assign({},q));
    else{p.seen=Math.max(p.seen||1,q.seen||1);p.uses=Math.max(p.uses||0,q.uses||0);p.last=Math.max(p.last||0,q.last||0);
      if(q.prov==='person')p.prov='person';p.tags=[...new Set((p.tags||[]).concat(q.tags||[]))].slice(0,12);}});
  return[...by.values()];
}
function recallFind38(q,places,now,limit){
  const qs=String(q||'').toLowerCase().match(/[a-z0-9]{2,}/g)||[];if(!qs.length)return[];
  const T=now||Date.now();
  return (places||[]).map(p=>{
    const hay=(p.name+' '+p.where+' '+(RECALL38_KINDS[p.kind]||p.kind||'')+' '+(p.tags||[]).join(' ')+' '+(p.sources||[]).join(' ')).toLowerCase();
    const hits=qs.filter(w=>hay.includes(w)).length/qs.length;
    const strength=Math.min(1,0.55+0.12*Math.log2(1+(p.uses||0)*2+(p.seen||1)));
    const fresh=Math.max(0.6,1-((T-(p.last||T))/864e5)/180);
    return{p,score:+(hits*strength*fresh*(p.prov==='person'?1.1:1)).toFixed(3)};})
    .filter(x=>x.score>=RECALL38_FLOOR).sort((a,b)=>b.score-a.score).slice(0,limit||6);
}
// ── end generated ──

/* ── tool implementations ────────────────────────────────────────────────────── */
function recall(a) {
  const m = load();
  const lim = Math.max(1, Math.min(40, +a.limit || 8));
  let docs = m.docs.filter(d => !d.expires || d.expires > Date.now());
  if (a.kind) docs = docs.filter(d => d.kind === a.kind);
  const ranked = docs.map(d => ({d, s: score(d.name + ' ' + d.body, a.query)}))
    .filter(x => x.s > 0.08).sort((x, y) => y.s - x.s).slice(0, lim);
  /* Mistakes ride along unconditionally — the mistake you are about to repeat rarely shares
     vocabulary with the task that repeats it, so relevance ranking is the wrong filter. */
  const mistakes = docs.filter(d => d.kind === 'mistake').slice(0, 5);
  return {
    found: ranked.length,
    memories: ranked.map(x => ({name: x.d.name, kind: x.d.kind, body: x.d.body,
      relevance: +x.s.toFixed(2), provenance: x.d.provenance || 'unknown',
      status: x.d.status || 'stable'})),
    mistakes_to_avoid: mistakes.map(d => ({name: d.name, body: d.body})),
    note: ranked.length ? undefined :
      'Nothing matched. That is information: this project has not learned about this yet, so proceed carefully and write back what you find.',
  };
}
function remember(a) {
  const m = load();
  const doc = {id: uid(), name: String(a.name).slice(0, 120), body: String(a.body).slice(0, 8000),
    kind: a.kind || 'insight', agents: a.agents || [], provenance: a.provenance || 'model',
    status: 'stable', source: 'external CLI', ts: new Date().toISOString(),
    expires: a.expiresInDays > 0 ? Date.now() + a.expiresInDays * 86400000 : null};
  /* Merge on an identical name instead of accumulating near-duplicates — duplicate memories
     are the documented route to "memory pollution", where a low-value fact is retrieved
     forever because there are now five copies of it. */
  const dupe = m.docs.find(d => d.name.toLowerCase() === doc.name.toLowerCase());
  if (dupe) { dupe.body = doc.body; dupe.ts = doc.ts; dupe.provenance = doc.provenance;
    save(m); return {updated: dupe.name, merged: true}; }
  m.docs.unshift(doc);
  if (m.docs.length > 800) m.docs.length = 800;
  m.external.push({t: doc.ts, what: 'remember', name: doc.name});
  if (m.external.length > 200) m.external.shift();
  save(m);
  return {saved: doc.name, id: doc.id, total: m.docs.length};
}
function mistake(a) {
  const m = load();
  const doc = {id: uid(), name: String(a.name).slice(0, 120), body: String(a.body).slice(0, 4000),
    kind: 'mistake', severity: +a.severity || 2, provenance: 'verified', status: 'stable',
    agents: [], source: 'external CLI', ts: new Date().toISOString(), expires: null};
  m.docs.unshift(doc);
  m.external.push({t: doc.ts, what: 'mistake', name: doc.name});
  save(m);
  return {recorded: doc.name,
    effect: 'This is now injected into every future build on this project, unconditionally.'};
}
function graphQuery(a) {
  const m = load();
  const graphs = a.graph ? m.graphs.filter(g => g.name.toLowerCase() === String(a.graph).toLowerCase()) : m.graphs;
  if (!graphs.length) return {found: 0, note: 'No such graph. Available: ' + (m.graphs.map(g => g.name).join(', ') || 'none yet')};
  const depth = Math.max(1, Math.min(3, +a.depth || 2));
  const out = [];
  for (const g of graphs) {
    const byId = new Map(g.nodes.map(n => [n.id, n]));
    const seeds = g.nodes.map(n => ({n, s: score(n.label + ' ' + (n.body || ''), a.query)}))
      .filter(x => x.s > 0.1).sort((x, y) => y.s - x.s).slice(0, 5).map(x => x.n);
    const keep = new Set(), rels = [];
    const walk = (node, lvl) => {
      if (!node || keep.has(node.id) || lvl > depth) return;
      keep.add(node.id);
      g.edges.forEach(e => {
        if (e.from === node.id) { const t = byId.get(e.to);
          if (t) { rels.push(`${node.label} ${e.type} ${t.label}${e.note ? ' — ' + e.note : ''}`); walk(t, lvl + 1); } }
        else if (e.to === node.id) { const f = byId.get(e.from);
          if (f) { rels.push(`${f.label} ${e.type} ${node.label}${e.note ? ' — ' + e.note : ''}`); walk(f, lvl + 1); } }
      });
    };
    seeds.forEach(s => walk(s, 0));
    if (keep.size) out.push({graph: g.name, kind: g.kind,
      nodes: [...keep].map(id => byId.get(id)).filter(Boolean).map(n => ({label: n.label, type: n.type, body: n.body})),
      relationships: [...new Set(rels)].slice(0, 30)});
  }
  return {found: out.length, results: out,
    note: out.length ? 'A "supersedes" relationship means the older item was already tried and replaced. Do not go back to it.' : 'Nothing matched in any graph.'};
}
function graphLearn(a) {
  const m = load();
  let g = m.graphs.find(x => x.name.toLowerCase() === String(a.graph).toLowerCase());
  if (!g) { g = {id: uid(), name: String(a.graph).slice(0, 60), kind: 'build', nodes: [], edges: [], runs: 0};
    m.graphs.unshift(g); }
  const node = label => {
    let n = g.nodes.find(x => x.label.toLowerCase() === String(label).toLowerCase());
    if (!n) { n = {id: 'n' + uid(), label: String(label).slice(0, 120), type: 'concept',
      body: '', source: a.provenance || 'model', ts: new Date().toISOString(), hits: 1, wins: 0, losses: 0, refs: []};
      g.nodes.push(n); }
    return n;
  };
  const f = node(a.from), t = node(a.to);
  if (a.body) f.body = String(a.body).slice(0, 2000);
  if (f.id === t.id) return {error: 'from and to are the same node'};
  const BASE = {verified: 1.0, user: 0.95, trial: 0.7, research: 0.8, opensource: 0.75, model: 0.55, news: 0.45};
  const dup = g.edges.find(e => e.from === f.id && e.to === t.id && e.type === a.edge);
  if (dup) { dup.count = (dup.count || 1) + 1; save(m); return {reinforced: true, edge: `${f.label} ${a.edge} ${t.label}`, count: dup.count}; }
  g.edges.push({id: 'e' + uid(), from: f.id, to: t.id, type: a.edge,
    provenance: a.provenance || 'model', conf: BASE[a.provenance] || 0.55,
    note: String(a.note || '').slice(0, 240), ts: new Date().toISOString(), count: 1, reinforced: 0});
  m.external.push({t: new Date().toISOString(), what: 'graph_learn', name: `${f.label} ${a.edge} ${t.label}`});
  save(m);
  return {added: `${f.label} ${a.edge} ${t.label}`, graph: g.name,
    nodes: g.nodes.length, edges: g.edges.length};
}
/* The audit checks for the exact failure modes practitioners report, rather than generic
   "quality". Each finding names what it would cost if left alone. */
function audit(a) {
  const m = load();
  const now = Date.now();
  const findings = [];
  const live = m.docs.filter(d => !d.expires || d.expires > now);

  // 1. contradictions with no winner — the documented "two memories disagree, no rule" failure
  m.graphs.forEach(g => {
    const byId = new Map(g.nodes.map(n => [n.id, n]));
    g.edges.filter(e => e.type === 'contradicts').forEach(e => {
      const opposed = g.edges.some(x => x.type === 'supersedes' &&
        ((x.from === e.from && x.to === e.to) || (x.from === e.to && x.to === e.from)));
      if (!opposed) findings.push({kind: 'unresolved-contradiction', graph: g.name,
        detail: `"${(byId.get(e.from) || {}).label}" contradicts "${(byId.get(e.to) || {}).label}" and nothing says which wins`,
        cost: 'Both get injected, so the model picks one at random and neither run is reproducible.',
        fix: 'Add a supersedes edge from the one that is actually right.'});
    });
  });
  // 2. duplicates — the route to memory pollution
  const seen = new Map();
  live.forEach(d => {
    const k = d.name.toLowerCase().trim();
    if (seen.has(k)) findings.push({kind: 'duplicate', detail: `"${d.name}" appears more than once`,
      cost: 'Duplicates crowd the retrieval budget and make a low-value fact look corroborated.',
      fix: 'Merge them.', id: d.id});
    else seen.set(k, d);
  });
  // 3. stale: old, never reinforced, and not user-authored
  live.forEach(d => {
    const age = (now - new Date(d.ts).getTime()) / 86400000;
    if (age > 120 && !d.expires && (d.provenance === 'model' || d.provenance === 'news'))
      findings.push({kind: 'stale', detail: `"${d.name}" is ${Math.round(age)} days old, from ${d.provenance}, and has never been confirmed`,
        cost: 'Facts that were once true and are now wrong are the single most common way memory degrades output.',
        fix: 'Re-verify it, or give it an expiry.', id: d.id});
  });
  // 4. unsupported: a claim with no provenance at all
  live.forEach(d => {
    if (!d.provenance || d.provenance === 'unknown')
      findings.push({kind: 'unsourced', detail: `"${d.name}" has no provenance`,
        cost: 'A model guess and a passing test get treated as equally trustworthy.',
        fix: 'Set provenance, or delete it.', id: d.id});
  });
  // 5. orphan graph nodes — retrieved as context, connected to nothing, pure noise
  m.graphs.forEach(g => {
    const used = new Set(g.edges.flatMap(e => [e.from, e.to]));
    const orphans = g.nodes.filter(n => !used.has(n.id));
    if (orphans.length) findings.push({kind: 'orphan-nodes', graph: g.name,
      detail: `${orphans.length} node(s) with no relationships: ${orphans.slice(0, 5).map(n => n.label).join(', ')}`,
      cost: 'They occupy the graph without adding structure, which is the "retrieval drift" complaint.',
      fix: 'Connect them or drop them.'});
  });

  let fixed = 0;
  if (a && a.fix) {
    /* Only the safe half. Demote and expire; never delete — learned forgetting deleting
       something safety-critical is a documented failure and an unrecoverable one. */
    const dupIds = new Set(findings.filter(f => f.kind === 'duplicate').map(f => f.id));
    const staleIds = new Set(findings.filter(f => f.kind === 'stale').map(f => f.id));
    m.docs.forEach(d => {
      if (dupIds.has(d.id)) { d.status = 'wip'; d.demoted = true; fixed++; }
      if (staleIds.has(d.id) && !d.expires) { d.expires = now + 30 * 86400000; fixed++; }
    });
    save(m);
  }
  return {
    scanned: {memories: live.length, graphs: m.graphs.length,
      nodes: m.graphs.reduce((n, g) => n + g.nodes.length, 0),
      edges: m.graphs.reduce((n, g) => n + g.edges.length, 0)},
    findings: findings.slice(0, 60),
    total_findings: findings.length,
    fixed: a && a.fix ? fixed : 0,
    note: findings.length
      ? 'These are the failure modes that actually degrade agent memory. Nothing was deleted.'
      : 'Memory is clean.',
  };
}

function placesFind(a) {
  const m = load(); const hits = recallFind38(a.query, m.places || [], Date.now(), Math.max(1, Math.min(20, +a.limit || 6)));
  if (hits.length) { hits.forEach(h => { const p = (m.places || []).find(x => x.where === h.p.where); if (p) { p.uses = (p.uses || 0) + 1; p.last = Date.now(); } }); save(m); }
  return hits.length ? hits.map(h => ({where: h.p.where, kind: h.p.kind, name: h.p.name, confidence: h.score})) : {known: false, note: 'no place clears the confidence floor — look it up, then places_remember it'};
}
function placesRemember(a) {
  const m = load(); const w = String(a.where || '').trim(); if (!w) throw new Error('where is required');
  const kind = a.kind || (/^https?:\/\/github\.com\//.test(w) ? 'repo' : /^https?:/.test(w) ? 'url' : /@/.test(w) ? 'host' : /\.[\w]{1,6}$/.test(w) ? 'file' : 'dir');
  const r = recallMerge38(m.places || [], [{where: w, kind, name: a.name || w.split(/[\\/]/).pop(), tags: a.tags || [], source: 'mcp', prov: 'person'}]);
  m.places = r.places; save(m); return {ok: true, added: r.added, total: m.places.length};
}
function placesDream(a) {
  const m = load(); const found = recallExtract38(a.text, a.source || 'mcp');
  const r = recallMerge38(m.places || [], found); m.places = r.places; save(m);
  return {seen: found.length, added: r.added, total: m.places.length};
}
const IMPL = {places_find: placesFind, places_remember: placesRemember, places_dream: placesDream, brain_recall: recall, brain_remember: remember, brain_mistake: mistake,
  graph_query: graphQuery, graph_learn: graphLearn, brain_audit: audit};


/* ── command line, for SSH and scripts:  node glassbox-memory.mjs find "ashfall repo" | remember <where> [name] | dream < file ── */
const CLI = process.argv[2];
if (CLI && ['find', 'remember', 'dream'].includes(CLI)) {
  const out = o => { process.stdout.write(JSON.stringify(o, null, 2) + '\n'); process.exit(0); };
  if (CLI === 'find') out(placesFind({query: process.argv.slice(3).join(' ')}));
  if (CLI === 'remember') out(placesRemember({where: process.argv[3], name: process.argv.slice(4).join(' ') || undefined}));
  if (CLI === 'dream') { let t = ''; process.stdin.on('data', d => t += d); process.stdin.on('end', () => out(placesDream({text: t, source: 'cli'}))); }
} else {
/* ── MCP stdio transport: newline-delimited JSON-RPC ─────────────────────────── */
let buf = '';
const send = o => process.stdout.write(JSON.stringify(o) + '\n');

process.stdin.on('data', d => {
  buf += d.toString();
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    const reply = r => send({jsonrpc: '2.0', id: msg.id, result: r});

    if (msg.method === 'initialize') {
      reply({protocolVersion: '2025-06-18', capabilities: {tools: {}},
        serverInfo: {name: 'glassbox-memory', version: '1'}});
    } else if (msg.method === 'notifications/initialized') {
      // no reply expected
    } else if (msg.method === 'tools/list') {
      reply({tools: TOOLS});
    } else if (msg.method === 'tools/call') {
      const {name, arguments: args} = msg.params || {};
      const fn = IMPL[name];
      if (!fn) {
        send({jsonrpc: '2.0', id: msg.id,
          error: {code: -32602, message: `unknown tool "${name}". Available: ${Object.keys(IMPL).join(', ')}`}});
      } else {
        try { reply({content: [{type: 'text', text: JSON.stringify(fn(args || {}), null, 2)}]}); }
        catch (e) { send({jsonrpc: '2.0', id: msg.id, error: {code: -32603, message: String(e.message || e)}}); }
      }
    }
  }
});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
}
