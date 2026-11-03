# Handoff — pass 40 (3 Nov 2026): Chat shows everything a turn did (Forge-style)

| | |
|---|---|
| Build | APP_BUILD 8e137962623e2a52 (base a6812b1214928d53); DMG + Windows zip rebuilt, byte-for-byte |
| Gauntlet | 445/445 Chromium 375/420/768/1440 + WebKit 390/1024; sabotage 270/270 caught |
| Layout / emoji | overlap39 TOTAL 0 (WebKit 440, Chromium 375, every disclosure open); emoleft39 0 |
| Live | ovh/gpt-oss-20b (free, no key): thinking 8–17 s shown live then folded, first token, total time, ≈ tokens, widget + Markdown prose |

## Source
The DeepSeek Harness Forge Merged HTML (in38/dshf.html): its thread view (72-ui-thread.js) — "Worked for … · N tool calls"
steps that fold, live "Thinking… Ns" → "Thought for Ns", tool cards (status, summary, live log, args/result/diff), critic/error
tail, footer (copy, retry, plugin message actions, provider · model · route chip, duration), status bar, composer
(auto-grow, context chips, + menu, pills, one send/stop button, Enter on desktop), empty state with suggestion cards.

## What changed in GlassBox
- One renderer for every Assistant turn (`turn40HTML`): steps header + tool cards (args/result on demand, blocked /
  declined / running states, "instructions in result" flag), thinking pill, typing dots, error with Retry, Markdown answer,
  sources, offers, footer actions (copy, retry, fork, read aloud, save to Brain, explain another way, details) and facts
  (provider · model, route flags, time + first token, tokens in/out/thinking/cached, cost) + a details table.
- Recording: `asstSend` keeps timing, accounting across tool rounds, and full tool records (they were reduced to one line).
- Markdown renderer `md40` (code with language + copy, tables, nested/task lists, quotes, http links only) — also for the prose
  around generative-UI widgets. Offers now read the message source (rendered text has no code fences).
- Status strip: model, mode, tools auto/ask, web, thinking effort (tap to change), context meter, chat totals.
- Composer: grows, attachments (files, drag-drop, Brain notes), + menu (attach, Brain note, skill, dictation), Enter sends on a
  keyboard, one Send/Stop button. Chat search, chat menu (pin, dream, rename, export md/json, copy, fork, delete), jump to latest,
  scroll stays put while you read.

## Not done / honest notes
- Free gpt-oss-20b did not follow the ===USE TOOL=== protocol in a live try, so tool cards were verified with a fixture
  and the gauntlet, not a live tool call.
- OVH streams no usage; those turns show ≈ estimates (characters / 4), labelled as estimates.
- Reason Lab, Council and Compare keep their own output views; they were not rebuilt this pass.
