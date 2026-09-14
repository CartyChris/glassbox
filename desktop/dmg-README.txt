GlassBox — installation
=======================

Drag GlassBox.app onto the Applications folder shown beside it. That is the whole install.

FIRST LAUNCH
  macOS will refuse to open it the first time: this app is not code-signed, and Gatekeeper
  blocks unsigned apps downloaded from anywhere. That is expected, not a fault.

  Right-click GlassBox.app -> Open -> Open.

  You only do this once.

WHAT IT DOES
  It serves itself on http://localhost:8765 and opens your browser there. If that port is
  taken by another program it walks to 8766, 8767, 8781, 8790 and uses the first free one.

  It has no Dock icon on purpose — it is a local server, not a window. To stop it, quit
  "GlassBox" from Activity Monitor.

WHY A SERVER AND NOT JUST THE FILE
  Opened directly, the page's origin is "null", and Ollama refuses a null origin with a 403,
  so local models never connect. Served over localhost they connect with no configuration.

YOUR KEYS
  API keys live in your browser's localStorage. No server, no account, no telemetry.
