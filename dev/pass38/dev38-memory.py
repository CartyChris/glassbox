# Inject the app's S1 recall functions into glassbox-memory.mjs (one source of truth, so CLI and browser rank alike).
import re,sys
SRC='/Users/chriscarty/glassbox-work/p38/recall.js'; DST='/Users/chriscarty/Desktop/All Finished Apps/glassbox-memory.mjs'
r=open(SRC).read(); m=open(DST).read()
def fn(name):
    i=r.index('function '+name+'(');j=r.index('\n}\n',i)+2;return r[i:j]
gen='// ── S1 places: GENERATED from GlassBox.html (p38/recall.js) by dev/pass38/dev38-memory.py — edit there, not here ──\nconst RECALL38_FLOOR=0.34;\n'+r[r.index('const RECALL38_KINDS'):r.index('\n',r.index('const RECALL38_KINDS'))+1]+'\n'.join(fn(n) for n in ['recallExtract38','recallMerge38','recallUnion38','recallFind38'])+'\n// ── end generated ──\n'
B,E='// ── S1 places: GENERATED','// ── end generated ──\n'
if B in m: m=m[:m.index(B)]+gen+m[m.index(E)+len(E):]
else: m=m.replace("/* ── tool implementations",gen+"\n/* ── tool implementations",1)
TOOLS='''  {name: 'places_find',
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
];'''
if "name: 'places_find'" not in m:
    i=m.index('];\n\n/* ── tool implementations') if '];\n\n/* ── tool implementations' in m else None
    k=m.index("  {name: 'brain_audit',");k=m.index('];',k)
    m=m[:k]+TOOLS+m[k+2:]
IMPL='''function placesFind(a) {
  const m = load(); const hits = recallFind38(a.query, m.places || [], Date.now(), Math.max(1, Math.min(20, +a.limit || 6)));
  if (hits.length) { hits.forEach(h => { const p = (m.places || []).find(x => x.where === h.p.where); if (p) { p.uses = (p.uses || 0) + 1; p.last = Date.now(); } }); save(m); }
  return hits.length ? hits.map(h => ({where: h.p.where, kind: h.p.kind, name: h.p.name, confidence: h.score})) : {known: false, note: 'no place clears the confidence floor — look it up, then places_remember it'};
}
function placesRemember(a) {
  const m = load(); const w = String(a.where || '').trim(); if (!w) throw new Error('where is required');
  const kind = a.kind || (/^https?:\\/\\/github\\.com\\//.test(w) ? 'repo' : /^https?:/.test(w) ? 'url' : /@/.test(w) ? 'host' : /\\.[\\w]{1,6}$/.test(w) ? 'file' : 'dir');
  const r = recallMerge38(m.places || [], [{where: w, kind, name: a.name || w.split(/[\\\\/]/).pop(), tags: a.tags || [], source: 'mcp', prov: 'person'}]);
  m.places = r.places; save(m); return {ok: true, added: r.added, total: m.places.length};
}
function placesDream(a) {
  const m = load(); const found = recallExtract38(a.text, a.source || 'mcp');
  const r = recallMerge38(m.places || [], found); m.places = r.places; save(m);
  return {seen: found.length, added: r.added, total: m.places.length};
}
'''
if 'function placesFind' not in m:
    m=m.replace("const IMPL = {brain_recall: recall,",IMPL+"const IMPL = {places_find: placesFind, places_remember: placesRemember, places_dream: placesDream, brain_recall: recall,",1)
CLI='''
/* ── command line, for SSH and scripts:  node glassbox-memory.mjs find "ashfall repo" | remember <where> [name] | dream < file ── */
const CLI = process.argv[2];
if (CLI && ['find', 'remember', 'dream'].includes(CLI)) {
  const out = o => { process.stdout.write(JSON.stringify(o, null, 2) + '\\n'); process.exit(0); };
  if (CLI === 'find') out(placesFind({query: process.argv.slice(3).join(' ')}));
  if (CLI === 'remember') out(placesRemember({where: process.argv[3], name: process.argv.slice(4).join(' ') || undefined}));
  if (CLI === 'dream') { let t = ''; process.stdin.on('data', d => t += d); process.stdin.on('end', () => out(placesDream({text: t, source: 'cli'}))); }
} else {
'''
if "const CLI = process.argv[2];" not in m:
    a=m.index("/* ── MCP stdio transport")
    m=m[:a]+CLI+m[a:].rstrip('\n')+'\n}\n'
if "places: []" not in m:
    m=m.replace("const EMPTY = {docs: [], graphs: [], rev: 0, updated: null, external: []};","const EMPTY = {docs: [], graphs: [], places: [], rev: 0, updated: null, external: []};")
open(DST,'w').write(m); print('ok')
