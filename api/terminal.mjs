// Glassbox Jet cloud terminal — Vercel Function (Node). POST /api/terminal {action, ...}
// A real Linux shell from ANY device, no bridge: this route creates a Vercel Sandbox, starts pfterm (a stdlib-only PTY +
// file bridge) in it, and hands the browser short-lived credentials. Terminal bytes never pass through this function —
// the browser connects straight to the sandbox (Functions cannot hold WebSockets).
// Sandboxes bill the deployer, so the route is OFF unless GLASSBOX_TERMINAL_CODE is set, and every action but
// unlock/status needs the signed cookie that a correct code earns. Same-origin only. Minutes are clamped.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PFTERM_SOURCE } from './_pfterm.mjs';

export const PORTS = [8080, 3000, 5173, 8000];
export const NAME_RE = /^gbt-[a-z0-9]{10,24}$/;
const COOKIE = 'gbterm';
const COOKIE_HOURS = 12;
const env = (k) => process.env[k] || '';
const sdk = () => (globalThis.__glassboxSandboxSdk ? Promise.resolve(globalThis.__glassboxSandboxSdk) : import('@vercel/sandbox'));
export const clampMinutes = (m) => Math.max(5, Math.min(45, Math.round(+m || 30)));
const json = (status, obj, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

/* Cost and abuse brakes. Per function instance — a floor, not a fortress; the access code is the real gate. */
const ATTEMPTS = new Map(), CREATES = [];
function limited(ip) {
  const now = Date.now(), win = 10 * 60_000, list = (ATTEMPTS.get(ip) || []).filter((t) => now - t < win);
  list.push(now); ATTEMPTS.set(ip, list); return list.length > 8;
}
function createAllowed() {
  const now = Date.now(); while (CREATES.length && now - CREATES[0] > 3600_000) CREATES.shift();
  if (CREATES.length >= +(env('GLASSBOX_TERMINAL_MAX_PER_HOUR') || 6)) return false;
  CREATES.push(now); return true;
}
export function sameOrigin(req) {
  const self = new URL(req.url).host, o = req.headers.get('origin');
  if (o) { try { return new URL(o).host === self; } catch { return false; } }
  return req.headers.get('sec-fetch-site') === 'same-origin';
}
const sign = (exp) => createHmac('sha256', env('GLASSBOX_TERMINAL_CODE')).update('glassbox-terminal|' + exp).digest('base64url');
export function cookieFor(now = Date.now()) {
  const exp = String(now + COOKIE_HOURS * 3600_000);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/api/terminal; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_HOURS * 3600}`;
}
export function unlocked(req, now = Date.now()) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=(\\d+)\\.([A-Za-z0-9_-]+)'));
  if (!m || +m[1] < now) return false;
  const a = Buffer.from(m[2]), b = Buffer.from(sign(m[1]));
  return a.length === b.length && timingSafeEqual(a, b);
}
function codeOk(code) {
  const want = Buffer.from(env('GLASSBOX_TERMINAL_CODE')), got = Buffer.from(String(code || ''));
  return want.length >= 8 && got.length === want.length && timingSafeEqual(got, want);
}
const plain = (e) => {
  const s = String((e && e.message) || e);
  if (/not.?found|stopped|404/i.test(s)) return 'that sandbox has stopped — start a new one';
  if (/forbidden|401|403|oidc|token|credential/i.test(s)) return 'this deployment is not allowed to create sandboxes (Vercel Sandbox needs to be available to the project)';
  if (/quota|limit|429/i.test(s)) return 'Vercel Sandbox limit reached for now — try again later';
  return s.slice(0, 200);
};

async function create(minutes) {
  const { Sandbox } = await sdk();
  const name = 'gbt-' + randomBytes(9).toString('hex').slice(0, 14);
  const sb = await Sandbox.create({ name, ports: PORTS, timeout: minutes * 60_000, resources: { vcpus: 2 }, persistent: false });
  const bridgeToken = randomBytes(24).toString('base64url');
  await sb.writeFiles([{ path: '/vercel/sandbox/.pfterm/pfterm.py', content: PFTERM_SOURCE, mode: 0o755 }]);
  await sb.mkDir('/vercel/sandbox/project').catch(() => {});
  const py = await sb.runCommand('python3', ['--version']).catch(() => null);
  if (!py || py.exitCode !== 0) await sb.runCommand({ cmd: 'dnf', args: ['install', '-y', 'python3'], sudo: true }).catch(() => null);
  // The token goes through env, never argv (argv is visible to every process in the sandbox).
  await sb.runCommand({ cmd: 'python3', args: ['/vercel/sandbox/.pfterm/pfterm.py', '--port', '8080', '--root', '/vercel/sandbox/project'], env: { PFTERM_TOKEN: bridgeToken }, detached: true });
  const ports = {}; for (const p of PORTS) { try { ports[p] = sb.domain(p); } catch {} }
  let healthy = false;
  for (let i = 0; i < 30 && ports[8080]; i++) {
    try { const r = await fetch(ports[8080] + '/health', { signal: AbortSignal.timeout(2000) }); if (r.ok) { healthy = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return { name, bridge: ports[8080] || '', bridgeToken, ports, until: Date.now() + minutes * 60_000, healthy };
}

export async function POST(req) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: 'only pages served by this site may use its terminal' });
  let body = {}; try { body = await req.json(); } catch { return json(400, { ok: false, error: 'send JSON' }); }
  const enabled = env('GLASSBOX_TERMINAL_CODE').length >= 8;
  const act = String(body.action || '');
  if (act === 'status') return json(200, { ok: true, enabled, unlocked: enabled && unlocked(req), maxMinutes: 45 });
  if (!enabled) return json(503, { ok: false, error: 'the cloud terminal is off on this deployment — set GLASSBOX_TERMINAL_CODE (8+ characters) in the Vercel project to turn it on' });
  if (act === 'unlock') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (limited(ip)) return json(429, { ok: false, error: 'too many tries — wait ten minutes' });
    if (!codeOk(body.code)) return json(401, { ok: false, error: 'wrong access code' });
    return json(200, { ok: true }, { 'set-cookie': cookieFor() });
  }
  if (!unlocked(req)) return json(401, { ok: false, error: 'locked — enter the access code first' });
  try {
    if (act === 'create') {
      if (!createAllowed()) return json(429, { ok: false, error: 'too many sandboxes started this hour' });
      return json(200, { ok: true, ...(await create(clampMinutes(body.minutes))) });
    }
    if (!NAME_RE.test(String(body.name || ''))) return json(400, { ok: false, error: 'bad sandbox name' });
    const { Sandbox } = await sdk();
    const sb = await Sandbox.get({ name: body.name });
    if (act === 'shell') return json(200, { ok: true, ...(await sb.openInteractive()) });
    if (act === 'extend') { const m = Math.min(15, clampMinutes(body.minutes || 15)); await sb.extendTimeout(m * 60_000); return json(200, { ok: true, addedMinutes: m }); }
    if (act === 'stop') { await sb.stop(); return json(200, { ok: true }); }
    return json(400, { ok: false, error: 'unknown action' });
  } catch (e) { return json(502, { ok: false, error: plain(e) }); }
}
export function GET() { return json(405, { ok: false, error: 'POST only' }); }
