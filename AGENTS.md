# Working on Glassbox Jet (for coding agents and people)

One file is the app: `GlassBox.html` (`index.html` is a byte-identical copy). No build step ships it — the page is the build.

## Change it
- Edit with unique, asserted anchors (see `dev/pass36/apply36.py`): a replace that matches 0 or 2 places must fail, never guess.
- New code goes in as whole functions; export what tests need on `window.__gb` (the export object near the end of the script).
- Never put a key, token or personal value in the file. Keys live in the user's browser or `~/.glassbox/keys.json` (bridge).

## Verify (all must pass before a commit)
1. `python3 check.py` — parse, duplicate declarations/ids, empty catches around saves, plus `gb-lint.mjs` (ESLint 9 in
   `~/.cache/glassbox-lint`) for undeclared names, duplicate keys and TDZ reads.
2. `node tools/run-gauntlet.mjs GlassBox.html --json` and again with `--mobile` — the in-page regression gauntlet.
   Every case has a fixture AND an anti-fixture; a new feature adds one case and one sabotage (`GAUNTLET_SABOTAGE`).
3. Layout: `node dev/pass36/pw/crawl.mjs <url> chromium 375,420,768,1440` (and `webkit`) — every tab, no overflow, no errors.
4. `python3 check.py --stamp` before deploying (APP_BUILD drives the PWA update prompt).

## Shape of the UI (pass 36)
- Design tokens and components: `<style id="ds36">` — calm buttons (`.btn` = the one primary, `.btn.small` tinted,
  `.btn.ghost` neutral), sentence-case headings, AA contrast checked by the `text-contrast-aa` case.
- Navigation: `shellApply36()` — sidebar at ≥900px, five-item dock + "All" sheet below. Both reuse the same `.tab` buttons.
- Search: ⌘K palette covers tabs, sections, settings and content.
- Specs tab (`specs36`, IndexedDB): constitution → spec → plan → tasks with a computed ready queue; `specReady` is the rule.
- Agent tools: register in `toolCatalog()`, execute in `toolInvoke()` — never a side path around the tool gate.
- Local servers (pass 37): never declare `targetAddressSpace:'local'` for 127.0.0.1 — Chrome fails the request. Use `localFetchOpts(url)`.
- System One harness edits go through `s1PatchGate37` (frozen checks in code, loosening needs a person). Never write S1MOD directly.
- `api/terminal.mjs` is the cloud terminal (Node, @vercel/sandbox). Off unless GLASSBOX_TERMINAL_CODE is set. Test: `node dev/pass38/terminal-test.mjs`.
- S1 recall functions are shared with `glassbox-memory.mjs` — regenerate it with `dev/pass38/dev38-memory.py`, never edit its generated block.
- `api/` holds the hosted gateway (Vercel Edge). Its allowlist is the only thing it forwards to; test: `node dev/pass37/gateway-test.mjs`.
- Phone navigation (pass 39, `nav.js` in dev/pass39): the dock is FOUR HUBS + All from `hub39Slots()`. Every switched-on
  section must be in exactly one hub (`hub39Auto`/`hub39Complete`, cases `hub-tabs-hold-everything`, `hub-custom-stays-complete`).
  Phone layout (`HUB39.mode`: tabs|classic) is separate from the desktop `UI.tabPos` — read it through `navPos39()`.
- No emoji in the interface: `emo39.js` swaps them for Lucide icons at the DOM (MutationObserver, before paint). Do not add an
  emoji to `EMO39_SKIP` zones' chrome; new emoji need an entry in `dev/pass39/p39/emomap.py` (regenerate emo-data.js).
- Phone layout check: `node dev/pass39/pw/overlap39.mjs <url>` (and `ENG=chromium … 375 812`) must report TOTAL 0.
- Chat (pass 40, dev/pass40): every Assistant turn renders through `turn40HTML` (all modes — chat, bots, MoA, cascade,
  scouts, playbooks, harnesses). A turn records `t0/t1`, `th0/th1`, `meta` (`turn40Meta` + `turn40Merge` per tool round,
  `turn40Estimate` when a provider sends no usage — shown with ≈) and full tool records `{name,status,args,result,ms}`.
  Answers are Markdown via `md40` (escape first; http(s) links only). Open/closed UI state lives in `T40` WeakMaps.
- Tools (pass 41, dev/pass41): every loop parses calls with `tc41Parse` (block, <tool_call>, gpt-oss harmony, fenced/bare JSON,
  name(args)), resolves names with `tc41Resolve`, shapes args with `tc41Coerce` (inside toolInvoke) and lists tools with
  `tc41Block`. Native tool_calls a model streams unasked are converted in streamChat's finish (`tc41FromNative`).
  API connectors are CONNECTORS of kind `api` (`api41*`): host-locked, read-only and ask-first by default.
  `delegate` (orch41) has depth 1. Agent mode = `swe41Run`; the self-improvement loop (`evolve41`) edits only the H41
  harness — never the core protocol, tasks, verifiers or gate. E2E: start dev/pass41/pw/servers.mjs, run e2e41.mjs.

## Deploy
`vercel --prod --yes --scope cloud-ops-game-time` from this folder, then confirm the live `GlassBox.html` hash equals the local one.
