// Real Chrome, the production origin, a chosen build: what does Settings → Ollama say?
import { chromium } from 'playwright';
import fs from 'fs';
const [file, label = ''] = process.argv.slice(2);
const ORIGIN = 'https://glassbox-jet.vercel.app';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
await ctx.grantPermissions(['local-network-access'], { origin: ORIGIN });
if (file) await ctx.route(ORIGIN + '/GlassBox.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(file) }));
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
const cons = []; page.on('console', m => { if (/11434|address space/.test(m.text())) cons.push(m.text().slice(0, 200)); });
await page.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await page.goto(ORIGIN + '/GlassBox.html', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  try { go('settings'); } catch (_) {}
  const n = await syncOllama(true);
  const el = document.getElementById('ollama-status');
  return { n, status: (el ? el.innerText : '').replace(/\s+/g, ' ').slice(0, 700) };
});
console.log(label, JSON.stringify({ ...r, cons: cons.slice(0, 3), errs: errs.slice(0, 3) }, null, 1));
await browser.close();
