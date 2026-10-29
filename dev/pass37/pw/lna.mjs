// How does real Chrome treat a public https page fetching loopback Ollama? Variants of targetAddressSpace and mode.
import { chromium } from 'playwright';
const grant = process.argv[2] || '';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext();
if (grant) { for (const p of grant.split(',')) { try { await ctx.grantPermissions([p], { origin: 'https://glassbox-jet.vercel.app' }); console.log('granted', p); } catch (e) { console.log('grant fail', p, e.message.slice(0, 120)); } } }
const page = await ctx.newPage();
const logs = []; page.on('console', m => logs.push(m.text().slice(0, 300)));
await page.goto('https://glassbox-jet.vercel.app/robots.txt').catch(()=>{});
const r = await page.evaluate(async () => {
  const out = {};
  for (const name of ['local-network-access', 'loopback-network', 'local-network']) {
    try { out['perm:' + name] = (await navigator.permissions.query({ name })).state; } catch (e) { out['perm:' + name] = 'ERR ' + e.message.slice(0, 60); }
  }
  for (const tas of [undefined, 'local', 'loopback', 'private']) for (const mode of ['cors', 'no-cors']) for (const host of ['127.0.0.1', 'localhost']) {
    const k = `${host} tas=${tas} ${mode}`;
    try { const o = { mode, signal: AbortSignal.timeout(4000) }; if (tas) o.targetAddressSpace = tas;
      const res = await fetch(`http://${host}:11434/api/tags`, o); out[k] = 'ok ' + res.status + ' ' + res.type;
    } catch (e) { out[k] = 'ERR ' + e.name + ' ' + e.message.slice(0, 80); }
  }
  return out;
});
console.log(JSON.stringify(r, null, 1)); console.log(logs.slice(0, 12).join('\n'));
await browser.close();
