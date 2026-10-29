// Glassbox Jet hosted gateway — Vercel Edge. POST|GET /api/proxy?url=<encoded https URL>
// Some free model providers (Kilo, NVIDIA NIM, SambaNova, Z.ai, Moonshot, xAI, DeepSeek) send no CORS headers, so a
// browser page cannot call them; until now that meant running the local bridge, which a phone cannot. This forwards
// ONLY to those hosts, ONLY for pages served from this same deployment, streams the reply back untouched, and keeps
// nothing: no logging of headers or bodies, no stored keys (a key the person typed passes through to its provider).
// Hardening adapted from the S1 Forge gateway (forge-vercel/api/_lib/guard.js, same author).
export const config = { runtime: 'edge' };
export const HOSTS = ['api.kilo.ai', 'integrate.api.nvidia.com', 'api.sambanova.ai', 'api.z.ai', 'api.moonshot.ai', 'api.x.ai', 'api.deepseek.com'];
const MAX_BODY = 2 * 1024 * 1024;
const DROP = ['connection', 'keep-alive', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'cookie',
  'set-cookie', 'content-length', 'forwarded', 'origin', 'referer', 'content-encoding'];
const json = (status, error) => new Response(JSON.stringify({ ok: false, error }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export function checkTarget(raw) {
  let u; try { u = new URL(raw); } catch { return { status: 400, error: 'invalid url' }; }
  if (u.protocol !== 'https:') return { status: 400, error: 'https only' };
  if (u.username || u.password || (u.port && u.port !== '443')) return { status: 400, error: 'credentials and ports are not allowed' };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!HOSTS.includes(host)) return { status: 403, error: 'host not allowed: ' + host };
  return { url: u };
}
/* Same-origin only: the page asking must be served by this deployment. Browsers set Origin on POST and
   Sec-Fetch-Site on every request; another website's page cannot fake either. (A script outside a browser can —
   the host allowlist is what bounds that: it only reaches these providers, with the caller's own key.) */
export function sameOrigin(req) {
  const self = new URL(req.url).host;
  const o = req.headers.get('origin');
  if (o) { try { return new URL(o).host === self; } catch { return false; } }
  return req.headers.get('sec-fetch-site') === 'same-origin';
}
export function clean(h) {
  const out = new Headers();
  for (const [k, v] of h) { const l = k.toLowerCase(); if (DROP.includes(l) || l.startsWith('x-forwarded-') || l.startsWith('x-vercel-') || l === 'x-real-ip' || l.startsWith('cf-') || l.startsWith('sec-')) continue; out.set(k, v); }
  return out;
}
export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(405, 'method not allowed');
  if (!sameOrigin(req)) return json(403, 'only pages served by this site may use its gateway');
  const chk = checkTarget(new URL(req.url).searchParams.get('url') || '');
  if (chk.error) return json(chk.status, chk.error);
  let body;
  if (req.method === 'POST') {
    if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return json(413, 'request body too large');
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY) return json(413, 'request body too large');
  }
  const headers = clean(req.headers); headers.set('accept-encoding', 'identity');
  let up;
  try { up = await fetch(chk.url, { method: req.method, headers, body, redirect: 'manual' }); }
  catch (e) { return json(502, 'upstream did not answer: ' + String(e && e.message || e).slice(0, 120)); }
  if (up.status >= 300 && up.status < 400) return json(502, 'upstream redirected; not followed');
  const out = clean(up.headers);
  out.set('cache-control', 'no-store'); out.set('x-glassbox-gateway', '1');
  if ((up.headers.get('content-type') || '').includes('text/event-stream')) out.set('x-accel-buffering', 'no');
  return new Response(up.body, { status: up.status, headers: out });
}
