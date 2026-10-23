#!/bin/bash
# Start the GlassBox bridge in remote mode: every request needs the token, and a 6-digit single-use code is printed
# (and kept in ~/.glassbox/pair-code; `glassbox-code` shows it) so a phone can pair without typing the token.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
BRIDGE="$DIR/glassbox-bridge.mjs"; [ -f "$BRIDGE" ] || BRIDGE=/opt/glassbox/glassbox-bridge.mjs
export GLASSBOX_REMOTE=1 GLASSBOX_BRIDGE_PORT="${GLASSBOX_BRIDGE_PORT:-8791}"
if [ -n "$CODESPACE_NAME" ]; then
  # Codespaces: run in the background so the container keeps going, and make the port reachable from a phone.
  pkill -f "glassbox-bridge.mjs" 2>/dev/null
  nohup node "$BRIDGE" --remote > /tmp/glassbox-bridge.log 2>&1 &
  if gh codespace ports visibility "${GLASSBOX_BRIDGE_PORT}:public" -c "$CODESPACE_NAME" >/dev/null 2>&1; then VIS="public"; else VIS="private — Ports panel → right-click ${GLASSBOX_BRIDGE_PORT} → Port Visibility → Public"; fi
  for i in $(seq 1 20); do grep -q "pairing code" /tmp/glassbox-bridge.log 2>/dev/null && break; sleep 0.5; done
  echo "────────────────────────────────────────────────────────"
  echo " GlassBox cloud terminal"
  echo " URL  : https://${CODESPACE_NAME}-${GLASSBOX_BRIDGE_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  echo " code : $(cat "$HOME/.glassbox/pair-code" 2>/dev/null)   (single use; run glassbox-code for the next one)"
  echo " port : $VIS"
  echo "────────────────────────────────────────────────────────"
else
  exec node "$BRIDGE" --remote
fi
