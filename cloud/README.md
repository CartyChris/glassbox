# GlassBox cloud terminal

The GlassBox bridge, running somewhere that is always reachable, with the coding harnesses it drives:
Claude Code, Codex, OpenCode, Gemini CLI, Oh My Pi and REA (plus Playwright Chromium for the headless gauntlet).

## On GitHub Codespaces (free monthly hours)

1. Open this repository in a Codespace. When it starts, the terminal prints the bridge URL and a 6-digit code.
2. Make port **8791** public: Ports panel → right-click 8791 → Port Visibility → Public.
   The bridge still refuses every request without its token, so a public port exposes nothing by itself.
3. In GlassBox: **Terminal → ☁️ Cloud terminal** → paste the URL, type the code, **Pair with code**.
4. Sign in to each CLI once in the Codespace terminal (`claude`, `codex login`, `opencode auth login`, `gemini`, `omp`),
   or add API keys as Codespaces secrets. The Codespace keeps them while it exists.

`glassbox-code` prints the next pairing code. The full token is in `~/.glassbox/remote-token`.
A stopped Codespace can be woken from GlassBox (⏻ Wake it) with a GitHub token that has the `codespace` scope.

## On any Docker host

```bash
docker build -f cloud/Dockerfile -t glassbox-cloud .
docker run -p 8791:8791 glassbox-cloud
```

Put it behind HTTPS (or run `cloudflared tunnel --url http://localhost:8791` inside it) — a browser served over
HTTPS will not talk to a plain-HTTP bridge on another machine.

## Your Mac, from anywhere

```bash
brew install cloudflared
node glassbox-bridge.mjs --tunnel
```

It prints a public `https://….trycloudflare.com` URL and a pairing code for as long as it runs.

## Headless gauntlet

```bash
node tools/run-gauntlet.mjs GlassBox.html            # desktop viewport
node tools/run-gauntlet.mjs GlassBox.html --mobile   # iPhone-sized, touch
```

Exit status 0 when every case passes, 1 when any fails, 2 when it could not run.
