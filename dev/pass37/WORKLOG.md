# Pass 36 — UI/UX overhaul, free providers, WASM where it pays

Baseline: gb-repo a09396d, GlassBox.html sha 31c937289e65dbf3 (= production). Work dir ~/glassbox-work (NOT /private/tmp — that gets cleaned).
Build: apply36.py patches base36.html → GlassBox.html; modules in p36/. Preview: launch.json "gb36" on :8836.

## Decision: no framework rewrite
72k-line single file ships as one HTML (PWA, offline, desktop DMG, gauntlet in-page). Next.js/React migration = months and
breaks one-file distribution. Use the modern platform instead: CSS nesting/layers, container queries, :has(), color-mix/oklch,
<dialog>/popover, View Transitions, backdrop-filter + SVG displacement for liquid glass. Rust→WASM only where measured.

## Stages
S1 Free providers: LLM7 (no key, CORS ok, streams — verified 27 Oct), Kilo gateway (no key for :free, NO CORS → bridge),
   HF router, NVIDIA NIM (bridge), SambaNova (bridge), Cohere, Chutes (key). Uncensored: none free via API (Venice bills free
   accounts; OR dolphin-venice no longer :free) → local Ollama suggestions + "uncensored" tag on paid ones.
S2 Design tokens + components (calm buttons, sentence-case headings, AA contrast, 16px inputs on touch)
S3 Shell: desktop sidebar (grouped, collapsible), mobile bottom bar + "All" sheet, header declutter, ⌘K jumps to tabs
S4 Line icons for nav instead of emoji (emoji kept for user overrides)
S5 Per-view declutter: notice strip → one health bubble, long help clamped
S6 Liquid glass material (+ reduced transparency/motion fallbacks)
S7 WASM benchmark (REA scan) — ship only if ≥3× faster
S8 Boot perf measure
S9 AGENTS.md + verify skill in repo
S10 Verify (gauntlet desktop+mobile, sabotage, crawl 375/420/768/1440, contrast) + ship

## Done criteria
gauntlet green desktop + mobile; sabotage all caught; every tab reachable ≤2 taps on phone and listed in sidebar on desktop;
no horizontal overflow at 375/420/768/1440; 0 console errors; text tokens ≥4.5:1.

## Log
- S2/S3/S4 done: ds.css (tokens AA both themes, calm buttons, sentence-case headings, glass header/menus/palette/toast),
  shell.js (auto layout: sidebar ≥900 / dock <900, All sheet, line icons Lucide 0.469 ISC, ⋯ holds secondary controls,
  merged ⌘K search incl. content, heading emoji hidden in line style, long prose clamp + More). Gauntlet 409/409, 5 new sabotages caught.
  Traps: NBSP in tab label code; :not(#id) raises specificity; hidden pane → stale screenshots and paused CSS animations
  (never animate opacity from 0 on content).
- S1 done: LLM7 (no key, browser, streams) — live "pong" from the app; Kilo (no key, via bridge) — live "pong" via test
  bridge :8798; HF/NVIDIA/SambaNova/Z.ai Flash free-key entries (CORS measured); Venice labelled paid-uncensored;
  Help: "Free with no key at all" + "Free and uncensored" (dolphin3:8b, huihui_ai/qwen3-abliterated:8b, gemma3-abliterated:4b
  — tag pages verified on ollama.com, ≤9B per no-large-local-models). syncKeep36 + bridge rule with cases + sabotage. 411/411.
- S7 WASM ledger (NOT shipped): Rust no_std scanner 908 B. 64 MB, best of 5: entropy WASM 184 ms vs JS 186 ms (no gain);
  strings 88 vs 208 ms (2.4×, under the 3× bar, ~120 ms once per file, and JS also finds UTF-16). Crate kept in wasm/rea-scan.
  Go: no portion benefits without porting the whole bridge (two bridges to keep in sync) — not done.
- Light theme: old rule forced white text on every non-ghost .btn → tinted buttons invisible. Fixed + case light-tinted-buttons-readable.
- Sabotage hang: render-escapes inserted a LIVE <img src=x onerror=alert(1)>; with esc sabotaged the alert blocked the page.
  Probe is now inert. The button ran ~240 gauntlets in one sync task (froze the tab >10 min); now gauntletSabotageAsync
  (250 ms slices): 238/238 caught, 85 s, longest main-thread gap 1.2 s. sync gauntletSabotage kept for scripts.
- 28 Oct: adding 1–2 features from recent OSS (user request).
- New features (28 Oct): Specs tab (Spec Kit constitution→spec→plan→tasks + Beads ready queue, deps, cycles, Beads JSONL export,
  one-task hand-off, open in Assistant) — live run on ovh/gpt-oss-20b: spec 6.9k, plan 8.9k, 18 tasks, 4 ready, 0 cycles.
  read_web_page tool (Jina Reader, no key, CORS ok) through toolInvoke — live "Example Domain" markdown; private/local URLs refused.
  LLM7 anonymous has a DAILY token quota (hit it: HTTP 429) — hint updated.
- Final: 416/416 chromium 375/420/768/1440 + webkit 390/1024; sabotage 242/242 async in 87 s; 58 tabs.

# Pass 37 — 28 Oct 2026 (baseline base37.html = gb-repo 25e0b8f, md5 71781aff…)
Stage map:
A Ollama: targetAddressSpace bug ('local' for loopback ⇒ Chrome 156 rejects every request; measured with real Chrome
  + Playwright), one-paste mac fix incl. persistence + login-race guard, `open -a Ollama` not `ollama serve`. Case+sabotage.
  Verify: real Chrome, routed vercel origin, before = "refuses this site", after running the shipped command = connected.
B Sidebar drag-resize (pointer+keyboard, dbl-click reset, rail when narrow) + "Classic view" (top tabs, one scrolling row). Cases.
C Research: top X posts last 7 days → 1–2 features, repos verified.
D S1 Harness modules: harness-as-data (models incl. Jev/Cua/Lara/custom, guardrails, spaces, instructions, lessons),
  any-LLM patch proposals → apply to copy → frozen check set → harness accepts only if not worse; guardrail loosening
  needs a human; revert by id; experience log. Runtime must READ the modules (no reader-less tables).
E Forge zip review: candidates = Vercel Edge allowlisted CORS gateway (/api/proxy), /api/search.
F Verify: check.py, crawl chromium+webkit, sabotage async; commit; deploy; handoff; memory.
Findings so far: Ollama 0.40.12 running TWICE (app on *:11434 IPv6, terminal `ollama serve` on 127.0.0.1); both 403 the
vercel origin (no OLLAMA_ORIGINS). App code sends targetAddressSpace:'local' → Chrome: "target IP address space of
`local` yet the resource is in address space `loopback`" — so even after a correct OLLAMA_ORIGINS fix it could never connect.
