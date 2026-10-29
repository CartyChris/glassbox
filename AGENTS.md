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
- `api/` holds the hosted gateway (Vercel Edge). Its allowlist is the only thing it forwards to; test: `node dev/pass37/gateway-test.mjs`.

## Deploy
`vercel --prod --yes --scope cloud-ops-game-time` from this folder, then confirm the live `GlassBox.html` hash equals the local one.
