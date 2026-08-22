#!/usr/bin/env node
/* GlassBox Bridge v2 — one local door to every AI CLI and provider you already pay for.
 *
 * Three jobs:
 *   1. MODELS   — drive the agentic CLIs you have installed and signed into, so their
 *                 subscription usage is available inside GlassBox.
 *   2. PROXY    — forward requests to API providers whose servers don't send CORS
 *                 headers, which a browser page cannot reach on its own.
 *   3. HANDOFF  — write a finished project (code + full context) to a real directory and
 *                 launch the next tool inside it, so another agent picks up where you left off.
 *
 *   node glassbox-bridge.mjs
 *
 * A web page cannot read your subscription credentials, and relaying a subscription
 * through a third-party service is not something the providers allow. Driving the CLIs
 * you already installed, on your own machine, is the legitimate path — that is all this is.
 *
 * Safety: model calls run with tools disabled in a throwaway temp dir. The endpoints that
 * write files or spawn programs require a pairing token, so a random web page you happen
 * to visit cannot reach them.
 */
import http from 'node:http';
import {spawn, execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT_LADDER = process.env.GLASSBOX_BRIDGE_PORT
  ? [+process.env.GLASSBOX_BRIDGE_PORT] : [8791, 8792, 8890, 9137, 8787];
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'glassbox-bridge-'));
const NO_TOOLS = 'Bash,Edit,Write,Read,Glob,Grep,Task,WebFetch,WebSearch,NotebookEdit,TodoWrite';

/* ── pairing: gates the file-writing / process-spawning endpoints ────────────── */
const TOKEN = crypto.randomBytes(16).toString('hex');
let PAIRED = false;
const STARTED = Date.now();
const PAIR_WINDOW_MS = 10 * 60 * 1000;
const authed = req => (req.headers['x-glassbox-token'] || '') === TOKEN;

/* ── CLI adapters. Every invocation below was read off `--help` on a real install. ──
 * kind: how stdout is parsed.  promptMode: how the prompt reaches the process.       */
const ADAPTERS = {
  cc:      {label: 'Claude Code',    bin: 'claude',      kind: 'claude-json', promptMode: 'stdin',
            models: ['fable', 'opus', 'sonnet', 'haiku']},
  codex:   {label: 'Codex',          bin: 'codex',       kind: 'text',        promptMode: 'stdin',
            models: ['gpt-5.6-codex', 'gpt-5.6']},
  kimi:    {label: 'Kimi Code',      bin: 'kimi',        kind: 'kimi-json',   promptMode: 'arg',
            models: ['default']},
  grok:    {label: 'Grok Build',     bin: 'grok',        kind: 'text',        promptMode: 'file',
            models: ['default']},
  hermes:  {label: 'Hermes Agent',   bin: 'hermes',      kind: 'text',        promptMode: 'arg',
            models: ['default']},
  prime:   {label: 'Prime Agent',    bin: 'prime-agent', kind: 'text',        promptMode: 'arg',
            models: ['default']},
  omp:     {label: 'Oh My Pi',       bin: 'omp',         kind: 'text',        promptMode: 'arg',
            models: ['default']},
  goose:   {label: 'Goose',          bin: 'goose',       kind: 'text',        promptMode: 'arg',
            models: ['default']},
  copilot: {label: 'GitHub Copilot', bin: 'copilot',     kind: 'text',        promptMode: 'arg',
            models: ['default']},
  traycer: {label: 'Traycer',        bin: 'traycer',     kind: 'text',        promptMode: 'arg',
            models: ['default']},
  /* JCode — Rust coding agent. Its distinguishing feature is subagent delegation nested up to
     three levels, which keeps the parent's context clean; that is the same context-isolation
     principle the compaction ladder is built on, so it slots in naturally rather than as a
     novelty. Fast to start and small in memory, which matters when a local model owns most of
     the machine's RAM. */
  jcode:   {label: 'JCode',          bin: 'jcode',       kind: 'text',        promptMode: 'arg',
            models: ['default']},
  /* Parallel-agent orchestrators. Both run agents across isolated git worktrees, which is the
     correct isolation: parallel agents sharing ONE tree corrupt each other's edits, while a
     worktree surfaces conflicts at merge where tooling can actually handle them. */
  diri:    {label: 'diri',           bin: 'diri',        kind: 'text',        promptMode: 'arg',
            models: ['default']},
  souschef:{label: 'sous-chef',      bin: 'sous-chef',   kind: 'text',        promptMode: 'arg',
            models: ['default']},
};
/* Terminals the bridge can open a window in. Ghostty first where present: it is GPU-accelerated,
   so a fast local token stream does not stutter the window, and it is light enough not to compete
   with a 27B model for unified memory. Falls back to Terminal.app, which is always there. */
const TERMINALS = {
  ghostty: {label: 'Ghostty', app: 'Ghostty', bundle: 'com.mitchellh.ghostty'},
  iterm:   {label: 'iTerm2',  app: 'iTerm',   bundle: 'com.googlecode.iterm2'},
  terminal:{label: 'Terminal',app: 'Terminal',bundle: 'com.apple.Terminal'},
};
function detectTerminals() {
  const found = {};
  for (const [id, t] of Object.entries(TERMINALS)) {
    try {
      const r = spawnSync('mdfind', [`kMDItemCFBundleIdentifier == "${t.bundle}"`], {encoding: 'utf8', timeout: 3000});
      found[id] = !!(r.stdout && r.stdout.trim());
    } catch (e) { found[id] = false; }
  }
  return found;
}

/* Build argv for one adapter. `p` is the prompt (or a file path when promptMode==='file').
   `auto` carries Prime Agent's autonomous settings; every other adapter ignores it. */
function argvFor(id, model, p, sys, budget, auto) {
  switch (id) {
    case 'cc': {
      const a = ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
                 '--model', model || 'sonnet', '--disallowed-tools', NO_TOOLS];
      if (sys) a.push('--append-system-prompt', sys);
      if (budget > 0) a.push('--max-budget-usd', String(budget));
      return a;
    }
    case 'codex':   return ['exec', '--skip-git-repo-check'];
    case 'kimi':    return ['-p', p, '--output-format', 'stream-json'];
    case 'grok':    return ['--prompt-file', p, '--output-format', 'plain'];
    case 'hermes':  return model && model !== 'default' ? ['-z', p, '-m', model] : ['-z', p];
    /* Prime Agent's autonomous mode is the whole point of it: a persistent goal, a gate command
       that must actually pass, and a bounded turn/token budget. Without these flags it behaves
       like any other one-shot CLI and the harness it ships is left on the table. The gate is a
       real shell command Prime re-runs until it exits 0, which is a verification GlassBox
       cannot fake from the browser side. */
    case 'prime': {
      const a = ['-p', '--mode', 'text'];
      if (auto && auto.on) {
        a.push('--autonomous');
        if (auto.gate) a.push('--autonomous-gate', String(auto.gate));
        if (+auto.maxTurns > 0) a.push('--autonomous-max-turns', String(+auto.maxTurns));
        if (+auto.maxTokens > 0) a.push('--autonomous-max-tokens', String(+auto.maxTokens));
        if (+auto.timeoutMs > 0) a.push('--autonomous-timeout-ms', String(+auto.timeoutMs));
      }
      a.push(p);
      return a;
    }
    case 'omp':     return model && model !== 'default' ? ['-p', '--model', model, p] : ['-p', p];
    case 'goose':   return ['run', '-t', p];
    case 'copilot': return ['-p', p];
    case 'traycer': return ['-p', p];
    default:        return [p];
  }
}

function have(bin) {
  try { execFileSync('/usr/bin/which', [bin], {stdio: 'ignore'}); return true; } catch { return false; }
}
function whichPath(bin) {
  try { return execFileSync('/usr/bin/which', [bin], {encoding: 'utf8'}).trim(); } catch { return null; }
}
const DETECTED = {};
for (const [id, a] of Object.entries(ADAPTERS)) DETECTED[id] = have(a.bin);

/* ── accounts ─────────────────────────────────────────────────────────────── */
function claudeAccount() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8'));
    const a = j.oauthAccount || {};
    return {tool: 'Claude Code', email: a.emailAddress || null, status: a.emailAddress ? 'signed in' : 'unknown'};
  } catch { return {tool: 'Claude Code', email: null, status: 'no ~/.claude.json'}; }
}
/* Report an email only when we actually found one. Absence of a file we happen to know
   about is NOT evidence of being signed out — several CLIs keep auth in a keychain or a
   path we don't know. Saying "not signed in" there would be a fabricated diagnosis. */
function fileAccount(tool, rels) {
  for (const r of rels) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), r), 'utf8'));
      const email = j.email || j.user || (j.tokens && j.tokens.email) || (j.account && j.account.email) || null;
      if (email) return {tool, email, status: 'signed in'};
      return {tool, email: null, status: 'auth file found'};
    } catch {}
  }
  return {tool, email: null, status: 'installed — manages its own auth'};
}
function accounts() {
  const out = [];
  if (DETECTED.cc)     out.push(claudeAccount());
  if (DETECTED.codex)  out.push(fileAccount('Codex', ['.codex/auth.json', '.config/codex/auth.json']));
  if (DETECTED.kimi)   out.push(fileAccount('Kimi Code', ['.kimi-code/auth.json', '.kimi/auth.json', '.kimi-code/config.json']));
  if (DETECTED.grok)   out.push(fileAccount('Grok Build', ['.grok/auth.json', '.grok/credentials.json']));
  if (DETECTED.hermes) out.push(fileAccount('Hermes Agent', ['.hermes/auth.json', '.config/hermes/auth.json']));
  return out;
}

/* ── SSE helpers ──────────────────────────────────────────────────────────── */
/* CLIs print their own chrome (session-resume hints, banners). That is not model
   output and must never end up inside generated code. */
const TRAILER = /^\s*(?:To resume this session:|To continue this session:|Resume with:|Session ID:|Session saved).*$/gim;
const clean = s => String(s).replace(TRAILER, '').replace(/\n{3,}/g, '\n\n');
const sse = (res, o) => { try { res.write('data: ' + JSON.stringify(o) + '\n\n'); } catch {} };
const dText   = t => ({choices: [{index: 0, delta: {content: clean(t)},    finish_reason: null}]});
const dReason = t => ({choices: [{index: 0, delta: {reasoning_content: t}, finish_reason: null}]});
function finish(res) {
  sse(res, {choices: [{index: 0, delta: {}, finish_reason: 'stop'}]});
  try { res.write('data: [DONE]\n\n'); res.end(); } catch {}
}
function flatten(messages) {
  const sys = [], turns = [];
  for (const m of messages || []) {
    const text = Array.isArray(m.content)
      ? m.content.map(p => (p && p.type === 'text' ? p.text : '')).join('\n')
      : String(m.content || '');
    if (m.role === 'system') sys.push(text);
    else turns.push((m.role === 'assistant' ? 'ASSISTANT:\n' : 'USER:\n') + text);
  }
  return {system: sys.join('\n\n'), prompt: turns.join('\n\n')};
}

/* ── run a CLI as a model ─────────────────────────────────────────────────── */
function runCLI(res, body) {
  const raw = String(body.model || '');
  const id = raw.split('/')[0];
  const model = raw.split('/').slice(1).join('/');
  const A = ADAPTERS[id];
  if (!A)            { sse(res, dText('[bridge] unknown adapter "' + id + '"')); return finish(res); }
  if (!DETECTED[id]) { sse(res, dText(`[bridge] \`${A.bin}\` is not on PATH — install it or pick another model.`)); return finish(res); }

  const {system, prompt} = flatten(body.messages);
  const full = (A.promptMode === 'stdin' || id === 'cc') ? prompt : (system ? system + '\n\n' + prompt : prompt);

  let payload = full, tmpFile = null;
  if (A.promptMode === 'file') {
    tmpFile = path.join(SANDBOX, 'prompt-' + Date.now() + '.txt');
    fs.writeFileSync(tmpFile, full);
    payload = tmpFile;
  } else if (A.promptMode === 'arg' && Buffer.byteLength(full) > 180_000) {
    // A single argv entry has a hard size limit; keep the tail, which holds the live task.
    payload = '[...earlier context trimmed by the bridge to fit the command line...]\n\n' + full.slice(-180_000);
  }

  const args = argvFor(id, model, payload, system, body.max_budget_usd, body.autonomous);
  const cp = spawn(A.bin, args, {cwd: SANDBOX, stdio: ['pipe', 'pipe', 'pipe']});
  if (A.promptMode === 'stdin') { cp.stdin.write(full); }
  cp.stdin.end();

  let buf = '', streamed = false, emitted = false, err = '';
  cp.stderr.on('data', d => { err += d.toString().slice(0, 2000); });

  cp.stdout.on('data', chunk => {
    if (A.kind === 'text') { emitted = true; return sse(res, dText(chunk.toString())); }
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!line) continue;
      let j; try { j = JSON.parse(line); } catch { continue; }

      if (A.kind === 'claude-json') {
        if (j.type === 'stream_event' && j.event) {
          const d = j.event.delta || {};
          if (d.type === 'text_delta' && d.text)              { streamed = emitted = true; sse(res, dText(d.text)); }
          else if (d.type === 'thinking_delta' && d.thinking) { streamed = true; sse(res, dReason(d.thinking)); }
          continue;
        }
        if (j.type === 'assistant' && j.message && Array.isArray(j.message.content) && !streamed) {
          if (j.message.model === '<synthetic>') continue;   // CLI notice, not model output
          for (const b of j.message.content) {
            if (b.type === 'text' && b.text)              { emitted = true; sse(res, dText(b.text)); }
            else if (b.type === 'thinking' && b.thinking) sse(res, dReason(b.thinking));
          }
          continue;
        }
        if (j.type === 'result') {
          if (j.is_error) {
            const m = String(j.result || 'unknown error');
            sse(res, dText('[bridge error] ' + m + (/authenticate|OAuth|expired/i.test(m)
              ? '\n\n[bridge] Sign in again: run `claude` in a terminal, then /login.' : '')));
          } else if (!emitted && j.result) sse(res, dText(String(j.result)));
          const u = j.usage || {};
          sse(res, {usage: {prompt_tokens: u.input_tokens || 0, completion_tokens: u.output_tokens || 0,
                            total_tokens: (u.input_tokens || 0) + (u.output_tokens || 0), cost: j.total_cost_usd || 0}});
        }
        continue;
      }
      if (A.kind === 'kimi-json') {
        // Kimi Code stream-json: accept the common shapes rather than assuming one.
        const t = j.text || j.content || (j.delta && (j.delta.text || j.delta.content))
               || (j.message && j.message.content) || '';
        const think = j.thinking || j.reasoning || (j.delta && j.delta.thinking) || '';
        if (think && typeof think === 'string') sse(res, dReason(think));
        if (typeof t === 'string' && t) { emitted = true; sse(res, dText(t)); }
        else if (Array.isArray(t)) for (const b of t) if (b && b.text) { emitted = true; sse(res, dText(b.text)); }
      }
    }
  });

  cp.on('error', e => { sse(res, dText(`[bridge] could not launch \`${A.bin}\`: ` + e.message)); finish(res); });
  cp.on('close', code => {
    if (buf.trim() && A.kind !== 'text' && !emitted) sse(res, dText(buf.trim()));
    if (code !== 0 && err) sse(res, dText(`\n[bridge] ${A.bin} exited ${code}: ` + err.slice(0, 600)));
    if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch {} }
    finish(res);
  });
}

/* ── generic proxy: reach providers that don't send CORS headers ──────────── */
async function doProxy(req, res, body) {
  try {
    const up = await fetch(body.url, {
      method: body.method || 'POST',
      headers: body.headers || {},
      body: body.body ? (typeof body.body === 'string' ? body.body : JSON.stringify(body.body)) : undefined,
    });
    res.writeHead(up.status, {
      'Content-Type': up.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    if (!up.body) return res.end();
    const reader = up.body.getReader();
    for (;;) { const {done, value} = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
    res.end();
  } catch (e) {
    res.writeHead(502, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify({error: String(e.message || e)}));
  }
}

/* ── native notifications ───────────────────────────────────────────────────
   Text reaches the OS as ARGUMENTS, never interpolated into a shell string. A run title can
   contain quotes, backticks or a semicolon — on macOS that would end the AppleScript string and
   run whatever followed as code, so building this by concatenation would turn "notify me when the
   build finishes" into arbitrary command execution against the user's own machine. */
/* Notes extraction. A record separator no note will contain, rather than JSON built inside
   AppleScript — osascript string escaping is its own small nightmare and one stray quote in a note
   would corrupt the whole batch. */
const NOTE_SEP = '\u0001GBNOTE\u0001';
const FIELD_SEP = '\u0002GBF\u0002';
function readNotes(res, body) {
  const limit = Math.max(1, Math.min(2000, +body.limit || 500));
  const script = `
    tell application "Notes"
      set out to ""
      set n to 0
      repeat with f in folders
        set fname to name of f
        if fname is not "Recently Deleted" then
          repeat with t in notes of f
            if n < ${limit} then
              if password protected of t is false then
                set out to out & (name of t) & "${FIELD_SEP}" & (plaintext of t) & "${FIELD_SEP}" & fname & "${FIELD_SEP}" & ((creation date of t) as string) & "${FIELD_SEP}" & ((modification date of t) as string) & "${NOTE_SEP}"
                set n to n + 1
              end if
            end if
          end repeat
        end if
      end repeat
      return out
    end tell`;
  try {
    const r = spawnSync('osascript', ['-e', script], {encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024});
    if (r.error) throw r.error;
    if (r.status !== 0) {
      const err = (r.stderr || '').trim();
      const denied = /not authoriz|not allowed|-1743/i.test(err);
      res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
      return res.end(JSON.stringify({ok: false, error: err || 'osascript failed',
        permission: denied ? 'macOS blocked automation access to Notes — allow it in System Settings > Privacy & Security > Automation' : null}));
    }
    const notes = (r.stdout || '').split(NOTE_SEP).filter(x => x.trim()).map(chunk => {
      const [name, text, folder, created, modified] = chunk.split(FIELD_SEP);
      return {name: (name || '').trim(), text: (text || '').trim(), folder: (folder || '').trim(),
              created: (created || '').trim(), modified: (modified || '').trim()};
    });
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    return res.end(JSON.stringify({ok: true, count: notes.length, notes}));
  } catch (e) {
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    return res.end(JSON.stringify({ok: false, error: String(e.message || e)}));
  }
}

function nativeNotify(res, body) {
  const title = String(body.title || 'GlassBox').slice(0, 120);
  const msg = String(body.body || '').slice(0, 400);
  const ok = (extra) => {
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify(Object.assign({ok: true, platform: process.platform}, extra || {})));
  };
  const fail = (e) => {
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify({ok: false, error: String(e && e.message || e), platform: process.platform}));
  };
  try {
    if (process.platform === 'darwin') {
      /* JXA rather than AppleScript: it takes the strings from argv, so nothing the user or a
         model can type is ever parsed as code. */
      const script = 'function run(argv){ var app = Application.currentApplication(); ' +
        'app.includeStandardAdditions = true; ' +
        'app.displayNotification(argv[1], {withTitle: argv[0]}); }';
      const r = spawnSync('osascript', ['-l', 'JavaScript', '-e', script, title, msg],
        {encoding: 'utf8', timeout: 5000});
      if (r.error) return fail(r.error);
      if (r.status !== 0) return fail(new Error((r.stderr || '').trim() || 'osascript failed'));
      return ok({channel: 'osascript-jxa'});
    }
    if (process.platform === 'win32') {
      /* PowerShell reads the two strings from the environment, so again they are never parsed. */
      const ps = '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] > $null;' +
        '$t=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(1);' +
        '$n=$t.GetElementsByTagName("text");' +
        '$n.Item(0).AppendChild($t.CreateTextNode($env:GB_TITLE)) > $null;' +
        '$n.Item(1).AppendChild($t.CreateTextNode($env:GB_BODY)) > $null;' +
        '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("GlassBox").Show(' +
        '[Windows.UI.Notifications.ToastNotification]::new($t))';
      const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps],
        {encoding: 'utf8', timeout: 8000, env: Object.assign({}, process.env, {GB_TITLE: title, GB_BODY: msg})});
      if (r.error) return fail(r.error);
      return ok({channel: 'powershell-toast'});
    }
    if (process.platform === 'linux') {
      const r = spawnSync('notify-send', [title, msg], {encoding: 'utf8', timeout: 5000});
      if (r.error) return fail(new Error('notify-send not installed'));
      return ok({channel: 'notify-send'});
    }
    return fail(new Error('unsupported platform: ' + process.platform));
  } catch (e) { return fail(e); }
}

/* ── handoff: write the finished work somewhere a human or another agent can use ── */
function safeJoin(root, rel) {
  const p = path.resolve(root, rel);
  if (!p.startsWith(path.resolve(root) + path.sep) && p !== path.resolve(root))
    throw new Error('path escapes the destination: ' + rel);
  return p;
}
function handoffWrite(res, body) {
  try {
    const dir = String(body.dir || '').replace(/^~/, os.homedir());
    if (!dir) throw new Error('no destination directory');
    fs.mkdirSync(dir, {recursive: true});
    const files = body.files || {};
    const written = [];
    for (const [name, content] of Object.entries(files)) {
      const p = safeJoin(dir, name);
      fs.mkdirSync(path.dirname(p), {recursive: true});
      fs.writeFileSync(p, String(content));
      written.push(path.relative(dir, p));
    }
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify({ok: true, dir, written, count: written.length}));
  } catch (e) {
    res.writeHead(400, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify({ok: false, error: String(e.message || e)}));
  }
}
/* Open a Terminal window sitting in the handed-off directory, optionally running a CLI. */
function handoffLaunch(res, body) {
  try {
    const dir = String(body.dir || '').replace(/^~/, os.homedir());
    if (!fs.existsSync(dir)) throw new Error('directory does not exist: ' + dir);
    const id = body.adapter;
    let cmd = '';
    if (id && ADAPTERS[id]) {
      if (!DETECTED[id]) throw new Error(`${ADAPTERS[id].bin} is not installed`);
      cmd = ADAPTERS[id].bin;
    } else if (body.command) {
      cmd = String(body.command);
    }
    const script = `cd ${JSON.stringify(dir).replace(/"/g, '\\"')}` + (cmd ? ` && ${cmd}` : '');
    if (process.platform === 'darwin') {
      const osa = `tell application "Terminal"\nactivate\ndo script "${script.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\nend tell`;
      spawn('osascript', ['-e', osa], {detached: true, stdio: 'ignore'}).unref();
    } else {
      spawn('sh', ['-c', script], {cwd: dir, detached: true, stdio: 'ignore'}).unref();
    }
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify({ok: true, dir, launched: cmd || '(finder/terminal only)'}));
  } catch (e) {
    res.writeHead(400, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify({ok: false, error: String(e.message || e)}));
  }
}

/* ── server ───────────────────────────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = req.url.split('?')[0];

  if (url === '/whoami') {
    const models = [];
    for (const [id, a] of Object.entries(ADAPTERS)) {
      if (!DETECTED[id]) continue;
      for (const m of a.models) models.push({id: id + '/' + m, label: a.label});
    }
    const clis = Object.entries(ADAPTERS).map(([id, a]) => ({
      id, label: a.label, bin: a.bin, found: DETECTED[id], path: DETECTED[id] ? whichPath(a.bin) : null}));
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ok: true, version: 3, sandbox: SANDBOX,
      prefixes: Object.keys(ADAPTERS), accounts: accounts(), models, clis, paired: PAIRED,
      // v3 capabilities, declared rather than guessed at by the client
      features: {exec: true, pty: false, mcpStdio: true, autonomous: ['prime'], memory: true, notify: true, notes: true},
      memoryFile: MEM_FILE, memoryRev: memRead().rev,
      terminals: execList()}));
  }

  // Pairing: hand the token to the first caller, or to anyone inside the opening window.
  if (url === '/pair') {
    const open = !PAIRED || (Date.now() - STARTED) < PAIR_WINDOW_MS;
    res.writeHead(open ? 200 : 403, {'Content-Type': 'application/json'});
    if (!open) return res.end(JSON.stringify({ok: false, error: 'pairing window closed — restart the bridge'}));
    if (!PAIRED) { PAIRED = true; console.log('  ✓ paired with a GlassBox tab'); }
    return res.end(JSON.stringify({ok: true, token: TOKEN}));
  }

  if (req.method === 'POST') {
    let raw = '';
    req.on('data', d => { raw += d; if (raw.length > 80e6) req.destroy(); });
    req.on('end', () => {
      let body; try { body = JSON.parse(raw); } catch { res.writeHead(400); return res.end('bad json'); }

      if (url === '/v1/chat/completions') {
        res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive'});
        return runCLI(res, body);
      }
      if (url === '/proxy') return doProxy(req, res, body);

      /* Plain presence check. /exec is an SSE stream, so asking it "is this installed?" means
         parsing a stream as JSON — which fails and reports everything absent, including things
         that are installed. A false negative is worse than no check: it sends the user installing
         software they already have. */
      /* Apple Notes. Read-only, and it never touches password-protected notes: those are
         encrypted and AppleScript cannot open them, so they are counted and reported rather than
         attempted. "Recently Deleted" is excluded because importing the bin is never what anyone
         means by "import my notes". */
      if (url === '/notes') {
        if (!authed(req)) {
          res.writeHead(401, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({ok: false, error: 'not paired'}));
        }
        return readNotes(res, body);
      }

      if (url === '/which') {
        if (!authed(req)) {
          res.writeHead(401, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({ok: false, error: 'not paired'}));
        }
        const names = Array.isArray(body.names) ? body.names.slice(0, 40) : [];
        const found = {};
        for (const n of names) {
          if (!/^[\w.\-+]+$/.test(String(n))) { found[n] = false; continue; }   // argv only, no shell
          const r = spawnSync('command', ['-v', String(n)], {encoding: 'utf8', timeout: 3000, shell: '/bin/sh'});
          found[String(n)] = r.status === 0 && !!(r.stdout || '').trim();
        }
        res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        return res.end(JSON.stringify({ok: true, found}));
      }

      /* Native OS notification. This is the ONLY channel that survives the tab being closed:
         a web page's Notification API dies with its tab, and real Web Push would need a service
         worker plus a push service plus a server, none of which a single offline HTML file has.
         The bridge is already a separate local process, so it can simply ask the OS. */
      if (url === '/notify') {
        if (!authed(req)) {
          res.writeHead(401, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({ok: false, error: 'not paired'}));
        }
        return nativeNotify(res, body);
      }

      // Spawning an MCP server is spawning a process, so it needs the token like the rest.
      if (url === '/mcp') {
        if (!authed(req)) {
          res.writeHead(401, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({error: {message: 'not paired — press Connect bridge in GlassBox'}}));
        }
        return mcpStdio(res, body);
      }
      // The shared Brain mirror. Token-gated: it reads and writes a real file.
      if (url === '/memory') {
        if (!authed(req)) {
          res.writeHead(401, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({ok: false, error: 'not paired — press Connect bridge in GlassBox'}));
        }
        return memHandle(res, body);
      }
      // Spawning a shell is the most powerful thing here, so it sits behind the same token.
      if (url === '/exec' || url === '/exec/input' || url === '/exec/kill') {
        if (!authed(req)) {
          res.writeHead(401, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({ok: false, error: 'not paired — press Connect bridge in GlassBox'}));
        }
        if (url === '/exec') return execStart(res, body);
        return url === '/exec/input' ? execInput(res, body) : execKill(res, body);
      }
      // Anything that touches the filesystem or spawns a process needs the token.
      if (url === '/handoff/write' || url === '/handoff/launch') {
        if (!authed(req)) {
          res.writeHead(401, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({ok: false, error: 'not paired — press Connect bridge in GlassBox'}));
        }
        return url === '/handoff/write' ? handoffWrite(res, body) : handoffLaunch(res, body);
      }
      res.writeHead(404); res.end('unknown endpoint');
    });
    return;
  }
  res.writeHead(404); res.end('glassbox bridge v2 — try /whoami');
});

/* ── shared memory mirror: the contract between the browser and every local CLI ──
   The Brain lives in the browser's IndexedDB, which a subprocess cannot read. So GlassBox
   mirrors it to ~/.glassbox/memory.json, glassbox-memory.mjs serves that same file over MCP,
   and external CLIs read and write it like any other memory store.

   `rev` is the whole concurrency story: the browser sends the rev it last saw, and if the file
   has moved on because a CLI wrote to it, the browser is told to merge rather than overwrite.
   Last-write-wins would silently discard whatever Prime Agent just learned. */
const MEM_DIR = path.join(os.homedir(), '.glassbox');
const MEM_FILE = path.join(MEM_DIR, 'memory.json');
const MEM_EMPTY = {docs: [], graphs: [], rev: 0, updated: null, external: []};
function memRead() {
  try { return Object.assign({}, MEM_EMPTY, JSON.parse(fs.readFileSync(MEM_FILE, 'utf8'))); }
  catch { return JSON.parse(JSON.stringify(MEM_EMPTY)); }
}
function memWrite(m) {
  m.rev = (m.rev || 0) + 1;
  m.updated = new Date().toISOString();
  fs.mkdirSync(MEM_DIR, {recursive: true});
  const tmp = MEM_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(m, null, 2));
  fs.renameSync(tmp, MEM_FILE);          // atomic: a half-written file reads back as empty
  return m;
}
function memHandle(res, body) {
  const reply = (o, c = 200) => { res.writeHead(c, {'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'}); res.end(JSON.stringify(o)); };
  const cur = memRead();
  if (body.op === 'pull') return reply({ok: true, memory: cur, file: MEM_FILE});
  if (body.op === 'push') {
    /* Stale push: something else wrote since the browser last synced. Hand back the current
       state and let the caller merge — refusing is safer than clobbering an agent's work. */
    if (body.baseRev != null && body.baseRev !== cur.rev)
      return reply({ok: false, conflict: true, theirRev: cur.rev, memory: cur,
        error: 'memory moved on since your last sync — merge and push again'}, 409);
    const next = Object.assign({}, cur, {docs: body.docs || cur.docs,
      graphs: body.graphs || cur.graphs});
    memWrite(next);
    return reply({ok: true, rev: next.rev, docs: next.docs.length, graphs: next.graphs.length});
  }
  return reply({ok: false, error: 'op must be pull or push'}, 400);
}

/* ── interactive exec: run a real CLI and stream it to the browser ────────────
   A browser cannot spawn a process, so an in-app terminal has to run here. Sessions are
   held open (unlike /mcp, which is deliberately one-shot) because a terminal without a
   live stdin is not a terminal.

   HONEST LIMIT: these are pipes, not a PTY. Node ships no pty and this file has no
   dependencies, so programs that demand a TTY (full-screen TUIs, raw-mode key handling,
   password prompts) will not behave normally. Line-oriented CLIs — which is all of the
   agent CLIs above — work correctly. TERM/FORCE_COLOR are set so colour still comes
   through, and the client is told `pty:false` so it can say so rather than look broken.

   Security: this spawns arbitrary commands, so it is token-gated exactly like
   /handoff/launch, which already does the same thing. Same trust boundary, stated plainly. */
const EXEC = new Map();                 // id -> {child, cwd, cmd, started, out}
let EXEC_SEQ = 0;
const EXEC_CAP = 12;                    // concurrent sessions; a runaway tab cannot fork-bomb

function execStart(res, body) {
  const cmdline = String(body.cmd || '').trim();
  if (!cmdline) { res.writeHead(400, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ok: false, error: 'no command'})); }
  if (EXEC.size >= EXEC_CAP) { res.writeHead(429, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ok: false, error: `too many live terminals (${EXEC_CAP})`})); }

  const cwd = String(body.cwd || os.homedir()).replace(/^~/, os.homedir());
  if (!fs.existsSync(cwd)) { res.writeHead(400, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ok: false, error: 'no such directory: ' + cwd})); }

  const id = 'x' + (++EXEC_SEQ) + '-' + Date.now().toString(36);
  res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*'});

  // Run through the user's shell so pipes, &&, and PATH behave the way they do in Terminal.
  const shell = process.env.SHELL || '/bin/sh';
  let child;
  try {
    child = spawn(shell, ['-lc', cmdline], {cwd, stdio: ['pipe', 'pipe', 'pipe'],
      env: {...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1'}});
  } catch (e) {
    sse(res, {type: 'exit', code: -1, error: String(e.message || e)});
    try { res.write('data: [DONE]\n\n'); res.end(); } catch {}
    return;
  }

  const rec = {child, cwd, cmd: cmdline, started: Date.now(), bytes: 0};
  EXEC.set(id, rec);
  sse(res, {type: 'start', id, cwd, cmd: cmdline, pty: false, shell});

  const pump = (stream, type) => stream.on('data', d => {
    rec.bytes += d.length;
    sse(res, {type, data: d.toString()});
  });
  pump(child.stdout, 'out');
  pump(child.stderr, 'err');

  child.on('error', e => sse(res, {type: 'err', data: `[bridge] ${e.message}\n`}));
  child.on('close', code => {
    EXEC.delete(id);
    sse(res, {type: 'exit', code, ms: Date.now() - rec.started, bytes: rec.bytes});
    try { res.write('data: [DONE]\n\n'); res.end(); } catch {}
  });
  // A closed tab must not leave a process running forever.
  res.on('close', () => { if (EXEC.has(id)) { try { child.kill(); } catch {} EXEC.delete(id); } });
}

function execInput(res, body) {
  const rec = EXEC.get(String(body.id || ''));
  const reply = (o, c = 200) => { res.writeHead(c, {'Content-Type': 'application/json'}); res.end(JSON.stringify(o)); };
  if (!rec) return reply({ok: false, error: 'no such terminal (it may have exited)'}, 404);
  try { rec.child.stdin.write(String(body.data == null ? '' : body.data)); return reply({ok: true}); }
  catch (e) { return reply({ok: false, error: String(e.message || e)}, 500); }
}
function execKill(res, body) {
  const id = String(body.id || '');
  const rec = EXEC.get(id);
  const reply = (o, c = 200) => { res.writeHead(c, {'Content-Type': 'application/json'}); res.end(JSON.stringify(o)); };
  if (!rec) return reply({ok: false, error: 'no such terminal'}, 404);
  try { rec.child.kill(body.signal || 'SIGTERM'); } catch {}
  EXEC.delete(id);
  return reply({ok: true, id});
}
/* Read-only census of what this bridge is running — the Glass-Pane reads this so the
   user can see local processes they started from another tab, or from a previous session. */
function execList() {
  return [...EXEC.entries()].map(([id, r]) => ({id, cmd: r.cmd, cwd: r.cwd,
    started: r.started, ms: Date.now() - r.started, bytes: r.bytes, pid: r.child.pid}));
}

/* ── MCP over stdio ──────────────────────────────────────────────────────────
   A browser cannot spawn a process, so local MCP servers have to run here. Each request
   starts the server, performs the handshake it requires, sends the one call, and shuts it
   down. That is slower than holding the process open, but it is stateless and cannot leak a
   child process when a tab closes — the right trade for a local developer tool.
   Messages are newline-delimited JSON, per the MCP stdio transport.            */
function mcpStdio(res, body) {
  // body arrives already parsed by the router, like every other handler here.
  const cfg = body || {};
  const cmdline = String(cfg.cmd || '').trim();
  const rpc = cfg.rpc;
  const reply = (obj, code = 200) => {
    res.writeHead(code, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obj));
  };
  if (!cmdline || !rpc) return reply({error: {message: 'need both cmd and rpc'}}, 400);

  // Split respecting quotes, so a path with spaces survives.
  const parts = cmdline.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  const exe = parts.shift();
  const args = parts.map(a => a.replace(/^["']|["']$/g, ''));
  if (!exe) return reply({error: {message: 'empty command'}}, 400);

  let child;
  try {
    child = spawn(exe, args, {stdio: ['pipe', 'pipe', 'pipe'], env: process.env});
  } catch (e) {
    return reply({error: {message: `could not start "${exe}": ${e.message}`}}, 500);
  }

  let out = '', err = '', done = false, id = 1;
  const finish = (obj, code) => {
    if (done) return;
    done = true;
    try { child.kill(); } catch {}
    reply(obj, code);
  };
  const timer = setTimeout(() => finish({error: {message:
    `the server did not answer within 20s${err ? ' — it said: ' + err.slice(0, 300) : ''}`}}, 504), 20000);

  const send = o => { try { child.stdin.write(JSON.stringify(o) + '\n'); } catch {} };
  // Handshake first — most servers reject tool calls before initialize.
  send({jsonrpc: '2.0', id: id++, method: 'initialize', params: {
    protocolVersion: '2025-06-18', capabilities: {},
    clientInfo: {name: 'glassbox-bridge', version: '2'}}});

  let initialised = false;
  child.stdout.on('data', d => {
    out += d.toString();
    let nl;
    while ((nl = out.indexOf('\n')) >= 0) {
      const line = out.slice(0, nl).trim();
      out = out.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (!initialised && msg.result && msg.result.protocolVersion !== undefined) {
        initialised = true;
        send({jsonrpc: '2.0', method: 'notifications/initialized'});
        send(Object.assign({}, rpc, {id: id++}));      // the caller's actual request
        continue;
      }
      if (initialised && (msg.result !== undefined || msg.error !== undefined)) {
        clearTimeout(timer);
        return finish(msg);
      }
    }
  });
  child.stderr.on('data', d => { err += d.toString().slice(0, 2000); });
  child.on('error', e => { clearTimeout(timer);
    finish({error: {message: `could not run "${exe}": ${e.message}. Is it installed and on PATH?`}}, 500); });
  child.on('close', code => {
    clearTimeout(timer);
    /* The commonest cause by far is an unquoted path containing a space: the split hands node
       half a path and it reports a module it cannot find, which reads like a broken install
       rather than a quoting problem. Say what it actually is. */
    const spaceTrap = /Cannot find module|no such file/i.test(err) && / /.test(cmdline) && !/"|'/.test(cmdline);
    finish({error: {message: `the server exited (code ${code})${err ? ': ' + err.slice(0, 400) : ' with no output'}`
      + (spaceTrap ? '\n\n[bridge] That path contains a space and is not quoted. Wrap it: '
          + `node "${(cmdline.split(/\s+/).slice(1).join(' ')) || '/path/with spaces/server.mjs'}"` : '')}}, 502);
  });
}

process.on('exit', () => {
  // Never leave a terminal's child process orphaned when the bridge goes down.
  for (const [, r] of EXEC) { try { r.child.kill(); } catch {} }
  try { fs.rmSync(SANDBOX, {recursive: true, force: true}); } catch {}
});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

function listenSomewhere(ports) {
  const port = ports[0];
  if (port === undefined) {
    console.error('✗ Every candidate port is busy. Try: GLASSBOX_BRIDGE_PORT=9500 node glassbox-bridge.mjs');
    process.exit(1);
  }
  server.once('error', e => {
    if (e.code === 'EADDRINUSE') { console.log('  port ' + port + ' busy, trying ' + ports[1] + '…'); listenSomewhere(ports.slice(1)); }
    else { console.error(e); process.exit(1); }
  });
  server.listen(port, '127.0.0.1', () => {
    const found = Object.entries(ADAPTERS).filter(([id]) => DETECTED[id]);
    const missing = Object.entries(ADAPTERS).filter(([id]) => !DETECTED[id]);
    console.log('──────────────────────────────────────────────');
    console.log('  GlassBox bridge v3 → http://127.0.0.1:' + port);
    console.log('──────────────────────────────────────────────');
    console.log('  detected : ' + (found.length ? found.map(([, a]) => a.label).join(', ') : 'none'));
    if (missing.length) console.log('  missing  : ' + missing.map(([, a]) => a.bin).join(', '));
    for (const a of accounts()) console.log('  account  : ' + a.tool + ' — ' + (a.email || a.status));
    console.log('  sandbox  : ' + SANDBOX + '  (tools disabled)');
    console.log('\n  Press "Connect bridge" in GlassBox Settings. Ctrl-C to stop.');
  });
}
listenSomewhere(PORT_LADDER);
