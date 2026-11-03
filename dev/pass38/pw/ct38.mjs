import { chromium } from 'playwright'; import fs from 'fs';
const tok = fs.readFileSync(process.argv[3], 'utf8').trim(), bridge = 'http://127.0.0.1:8851';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1200);
const run = async (noWs) => p.evaluate(async ({ bridge, tok, noWs }) => {
  go('terminal'); await new Promise(r => setTimeout(r, 400));
  if (noWs) window.WebSocket = function () { throw new Error('no websockets here'); };
  const host = document.getElementById('ct38-term');
  const io = await ctConnect38({ bridge, bridgeToken: tok, shell: { url: 'ws://127.0.0.1:1/nope', token: 'x' } }, host);
  if (!io) return { fail: CT38.status };
  await new Promise(r => setTimeout(r, 1200));
  io.send('echo $((6*7)); echo DONE-$((1+1))\r'); for (let i = 0; i < 20; i++) io.send('');
  await new Promise(r => setTimeout(r, 1800));
  const buf = CT38.term.buffer.active; let txt = ''; for (let i = 0; i < buf.length; i++) txt += (buf.getLine(i)?.translateToString(true) || '') + '\n';
  io.send('exit\r'); await new Promise(r => setTimeout(r, 1200));
  return { transport: io.transport, has42: /\n42\n/.test('\n' + txt.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')), done: txt.includes('DONE-2'), status: CT38.status };
}, { bridge, tok, noWs });
const ws = await run(false), sse = await run(true);
const files = await p.evaluate(async ({ bridge, tok }) => {
  const q = '?token=' + encodeURIComponent(tok), bin = btoa(String.fromCharCode(0, 255, 10, 13, 128));
  await fetch(bridge + '/fs/write' + q, { method: 'POST', body: JSON.stringify({ files: [{ path: 'a/b.txt', b64: btoa('héllo') .length ? btoa(unescape(encodeURIComponent('héllo'))) : '' }, { path: 'bin.dat', b64: bin }] }) });
  const rd = await (await fetch(bridge + '/fs/read' + q, { method: 'POST', body: JSON.stringify({ paths: ['a/b.txt', 'bin.dat'] }) })).json();
  const esc = await fetch(bridge + '/fs/write' + q, { method: 'POST', body: JSON.stringify({ files: [{ path: '../escape.txt', b64: 'eA==' }] }) });
  const noTok = await fetch(bridge + '/fs/list');
  return { text: decodeURIComponent(escape(atob(rd.files[0].b64))) === 'héllo', bin: rd.files[1].b64 === bin, escape: esc.status, noToken: noTok.status };
}, { bridge, tok });
console.log(JSON.stringify({ ws, sse, files, errs })); await b.close();
