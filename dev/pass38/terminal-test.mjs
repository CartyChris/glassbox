// node test-terminal.mjs — the route's gates, with a stub @vercel/sandbox (no network, no billing).
const calls = [];
globalThis.__glassboxSandboxSdk = { Sandbox: {
  async create(p) { calls.push(['create', p]); return { async writeFiles(f) { calls.push(['write', f[0].path, f[0].content.length]); }, async mkDir() {}, 
    async runCommand(a, b) { calls.push(['run', typeof a === 'string' ? a : a]); return { exitCode: 0 }; }, domain(p) { return 'https://sb-' + p + '.vercel.run'; } }; },
  async get(p) { calls.push(['get', p.name]); return { async openInteractive() { return { url: 'wss://pty.vercel.run/x', token: 'T' }; }, async extendTimeout(ms) { calls.push(['extend', ms]); }, async stop() { calls.push(['stop']); } }; } } };
globalThis.fetch = async () => new Response('ok');
const A = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
const site = 'https://glassbox-jet.vercel.app';
const mod = await import(process.argv[2] || '../../api/terminal.mjs');
const R = (body, h = {}) => new Request(site + '/api/terminal', { method: 'POST', headers: { origin: site, 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
delete process.env.GLASSBOX_TERMINAL_CODE;
let r = await mod.POST(R({ action: 'status' })); let j = await r.json(); A(j.enabled === false, 'off without GLASSBOX_TERMINAL_CODE');
r = await mod.POST(R({ action: 'create' })); A(r.status === 503 && !calls.length, 'create refused while off, nothing created');
process.env.GLASSBOX_TERMINAL_CODE = 'correct-horse-42';
r = await mod.POST(R({ action: 'create' })); A(r.status === 401 && !calls.length, 'create refused without the cookie');
r = await mod.POST(R({ action: 'unlock', code: 'nope' }, { 'x-forwarded-for': '1.1.1.1' })); A(r.status === 401, 'wrong code refused');
r = await mod.POST(new Request(site + '/api/terminal', { method: 'POST', headers: { origin: 'https://evil.test' }, body: JSON.stringify({ action: 'unlock', code: 'correct-horse-42' }) })); A(r.status === 403, 'cross-site refused');
r = await mod.POST(R({ action: 'unlock', code: 'correct-horse-42' }, { 'x-forwarded-for': '2.2.2.2' }));
const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
A(r.status === 200 && /HttpOnly/.test(r.headers.get('set-cookie')) && /SameSite=Strict/.test(r.headers.get('set-cookie')), 'right code sets an HttpOnly SameSite=Strict cookie');
A(!mod.unlocked(R({}, { cookie: cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) })), 'a tampered cookie is refused');
A(!mod.unlocked(R({}, { cookie }), Date.now() + 13 * 3600_000), 'an expired cookie is refused');
r = await mod.POST(R({ action: 'create', minutes: 999 }, { cookie })); j = await r.json();
const cr = calls.find((c) => c[0] === 'create')[1];
A(r.status === 200 && cr.timeout === 45 * 60_000 && cr.persistent === false && /^gbt-/.test(j.name), 'create clamps to 45 min, not persistent');
const run = calls.filter((c) => c[0] === 'run').map((c) => c[1]).find((x) => x && x.args && String(x.args[0]).includes('pfterm.py'));
A(run && run.env.PFTERM_TOKEN === j.bridgeToken && !run.args.join(' ').includes(j.bridgeToken), 'bridge token passed via env, never argv');
A(j.bridge === 'https://sb-8080.vercel.run' && j.healthy === true, 'bridge URL + health returned');
r = await mod.POST(R({ action: 'shell', name: 'bad name' }, { cookie })); A(r.status === 400, 'bad sandbox name refused');
r = await mod.POST(R({ action: 'shell', name: j.name }, { cookie })); j = await r.json(); A(j.url === 'wss://pty.vercel.run/x' && j.token === 'T', 'shell returns openInteractive');
r = await mod.POST(R({ action: 'extend', name: 'gbt-abcdefghij12', minutes: 40 }, { cookie })); A(calls.some((c) => c[0] === 'extend' && c[1] === 15 * 60_000), 'extend capped at 15 minutes');
for (let i = 0; i < 9; i++) await mod.POST(R({ action: 'unlock', code: 'x' }, { 'x-forwarded-for': '9.9.9.9' }));
r = await mod.POST(R({ action: 'unlock', code: 'correct-horse-42' }, { 'x-forwarded-for': '9.9.9.9' })); A(r.status === 429, 'code guessing rate-limited per IP');
