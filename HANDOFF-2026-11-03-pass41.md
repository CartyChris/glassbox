# Handoff — pass 41 (3 Nov 2026): any model calls any MCP / API, orchestration, Agent mode, self-improvement

| | |
|---|---|
| Build | APP_BUILD f93b49cb173f2f33 (base 8e137962623e2a52); DMG + Windows zip rebuilt, byte-for-byte |
| Gauntlet | 457/457 Chromium 375/420/768/1440 + WebKit 390/1024; sabotage 280/280 caught; overlap 0; emoji 0 |
| E2E (local servers) | MCP with session id + pagination; OpenAPI → typed tools, header auth, read-only refused a POST; chat parsed a python-style call and recovered a bad call with one correction; delegate → subagent → MCP tool; Agent solved 3 verified tasks (code, file fix, tool + python); evolve: ref 0 → candidate 1, anchors held, queued, lesson saved |
| Live (free ovh/gpt-oss-20b) | Agent mode solved the verified remainders puzzle (score 1); chat looked up a pet through an OpenAPI connector in one call |

## Sources used
ouroboros.html (mini-swe loop: THOUGHT + exactly one action, format-error feedback, submit(); Propose–Probe–Compose with
hidden verifiers, anchor/held-out replay, review queue, lessons library) · harness-studio v2 (Harness² improve loop,
untrusted-by-default plugins, SSRF guard, anonymized selection) · distill pack (tolerant JSON repair, budget identity,
injection scanning, claims audit discipline).

## What changed
- Tool calls: multi-format parser, name resolution, argument coercion, wrapper unwrapping, one correction round for an
  unreadable call, typed signatures for the whole catalogue with relevance selection + find_tools, independent calls in
  parallel (exfil-capable calls alone), tool rounds 3 → 6 (switchable 3/6/10), native function calling automatically for
  catalogue-known tool models (falls back to text), native tool_calls streamed unasked are now executed (was: empty answer).
- MCP: Mcp-Session-Id + MCP-Protocol-Version headers, notifications/initialized, tools/list pagination, results flattened to
  text, isError treated as an error.
- API connectors (Connections → Add an API): REST, OpenAPI JSON, GraphQL; auth none/bearer/header/basic/query; locked to the
  base URL's host and path; read-only and ask-first until changed; direct or through the bridge.
- delegate: any model can hand a task to a bot or role subagent with its own tool loop (depth 1, 5 rounds, parallel).
- Agent mode (Assistant): mini-swe loop with JS/Python sandbox steps (opaque-origin iframe + worker, no network, files persist
  per chat), tool steps, FINAL:, format correction, lessons retrieved by relevance.
- Self-improving agent (Harness Lab): 7 verified tasks (3 anchor, 2 held-out) + your own (verifier or judge); evolve with
  budget caps; gates; approval queue (default on); versions with rollback; lessons; export.

## Not done / honest notes
- OpenAPI YAML specs are not parsed (JSON only). Legacy MCP HTTP+SSE (2024-11-05) transport is not supported.
- API keys live in this browser's storage with the other connector tokens (as MCP tokens always have).
- The evolve loop was verified with scripted editor/executor models and one live agent run, not a long live evolution.
- Free OVH models are rate-limited (≈2 req/min); multi-step agents are slow on them.
