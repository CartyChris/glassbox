#!/bin/bash
# GlassBox launcher.
#
# Serves this folder over http://localhost so Ollama will talk to it: opened as a file://
# URL the page's origin is "null", and Ollama refuses a null origin with a 403.
#
# PORT SELECTION. The old version assumed anything already listening on the port was a
# previous launcher and just opened the URL. That is wrong whenever another app owns the
# port — it opened a browser onto someone else's server, which answered {"error":"unknown
# endpoint"} and looked like GlassBox was broken. Now the port is only reused if it is
# actually serving THIS app; otherwise the next free port is used.

cd "$(dirname "$0")" || exit 1
PORTS=(8765 8766 8767 8781 8790)

echo "──────────────────────────────────────────────"
echo "  GlassBox launcher"
echo "──────────────────────────────────────────────"

if [ ! -f GlassBox.html ]; then
  echo "✗ GlassBox.html is not next to this script."
  echo "  Keep both files in the same folder."
  read -r -p "Press Return to close…" _; exit 1
fi

# Is this port serving OUR file? A 200 whose body contains the app's own title is proof;
# anything else on the port belongs to another program and must not be reused.
serves_glassbox() {
  curl -s --max-time 2 "http://127.0.0.1:$1/GlassBox.html" 2>/dev/null \
    | head -c 4000 | grep -q "GlassBox — Reasoning Studio"
}

PORT=""
REUSED=0
for p in "${PORTS[@]}"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN -t >/dev/null 2>&1; then
    if serves_glassbox "$p"; then PORT="$p"; REUSED=1; break; fi
    OWNER=$(lsof -nP -iTCP:"$p" -sTCP:LISTEN 2>/dev/null | awk 'NR==2{print $1}')
    echo "• Port $p is taken by ${OWNER:-another program} — trying the next one."
    continue
  fi
  PORT="$p"; break
done

if [ -z "$PORT" ]; then
  echo "✗ Every candidate port is busy: ${PORTS[*]}"
  echo "  Quit whatever is holding one, or edit PORTS in this script."
  read -r -p "Press Return to close…" _; exit 1
fi

URL="http://localhost:$PORT/GlassBox.html"

# --- Ollama check (informational; never kills anything the user is running) ---
if curl -s --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  COUNT=$(curl -s --max-time 3 http://127.0.0.1:11434/api/tags 2>/dev/null \
          | grep -o '"name"' | wc -l | tr -d ' ')
  echo "✓ Ollama is running (${COUNT:-?} models). It will connect automatically."
else
  echo "• Ollama is not running. Open Ollama.app or run 'ollama serve', then press"
  echo "  'Connect Ollama' in Settings. Cloud models work regardless."
fi

if [ "$REUSED" = "1" ]; then
  echo "✓ GlassBox is already served on port $PORT — reusing it."
  open "$URL"
  read -r -p "Press Return to close this window…" _; exit 0
fi

# --- optional bridge: local MCP servers, CLI models, CORS-blocked APIs ---
BRIDGE_PID=""
if [ -f glassbox-bridge.mjs ] && command -v node >/dev/null 2>&1; then
  if curl -s --max-time 2 http://127.0.0.1:8791/whoami >/dev/null 2>&1; then
    echo "✓ Bridge already running."
  else
    node glassbox-bridge.mjs >/tmp/glassbox-bridge.log 2>&1 &
    BRIDGE_PID=$!
    # Poll rather than checking once after sleep 1. The bridge probes for installed CLIs and
    # reads their auth files before it binds, which takes longer than a second on a machine
    # with several installed — the single check reported "did not start" for a bridge that
    # was starting perfectly well.
    for _ in $(seq 1 20); do
      curl -s --max-time 1 http://127.0.0.1:8791/whoami >/dev/null 2>&1 && break
      sleep 0.5
    done
    if curl -s --max-time 2 http://127.0.0.1:8791/whoami >/dev/null 2>&1; then
      ACCT=$(curl -s --max-time 2 http://127.0.0.1:8791/whoami \
             | sed -n 's/.*"email":"\([^"]*\)".*/\1/p' | head -1)
      echo "✓ Bridge started${ACCT:+ (Claude Code: $ACCT)}"
    else
      echo "• Bridge did not answer within 10s — see /tmp/glassbox-bridge.log. Cloud models still work."
    fi
  fi
fi

echo "• Serving this folder on port $PORT…"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID $BRIDGE_PID 2>/dev/null' EXIT INT TERM

for _ in $(seq 1 25); do
  serves_glassbox "$PORT" && break
  sleep 0.2
done

if ! serves_glassbox "$PORT"; then
  echo "✗ The server started but is not serving GlassBox.html. Is the file readable?"
  read -r -p "Press Return to close…" _; exit 1
fi

open "$URL"
echo "✓ GlassBox is open at $URL"
echo
echo "Leave this window open while you use the app."
echo "Closing it stops the local server."
echo "──────────────────────────────────────────────"
wait $SERVER_PID
