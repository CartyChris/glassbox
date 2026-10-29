// What the hosted page probes to know whether the gateway exists (it does not when GlassBox runs from a file or the desktop app).
import { HOSTS } from './proxy.mjs';
export const config = { runtime: 'edge' };
export default function handler() {
  return new Response(JSON.stringify({ ok: true, app: 'glassbox', features: { proxy: true }, hosts: HOSTS }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
