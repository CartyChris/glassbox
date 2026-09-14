#!/bin/bash
# Build every desktop artifact — GlassBox.app, GlassBox-macOS.dmg and GlassBox-Windows.zip —
# from the sources in this repo.
#
# This exists because there was no repeatable build, and the consequence was not theoretical:
# the shipped .app carried a GlassBox.html from 21 Aug while the web app moved 23,000 lines on,
# and its launcher still probed for a <title> string that had since changed — so the app would
# start its server, fail its own health check and quit. Both are the kind of thing a build script
# checks every time and a person checks once.
#
#   ./build-desktop.sh            build and verify everything
#   ./build-desktop.sh --no-dmg   assemble the .app only, skip the images
set -euo pipefail
cd "$(dirname "$0")/.."                       # gb-repo
ROOT="$(pwd)"
OUT="$ROOT/desktop"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
say(){ printf '  %s\n' "$*"; }

echo "▸ Verifying sources"
[ -f "$ROOT/GlassBox.html" ] || { echo "FAIL: GlassBox.html missing"; exit 1; }
python3 "$ROOT/check.py" >/dev/null || { echo "FAIL: check.py gate did not pass"; exit 1; }
say "check.py OK"

# The launcher health contract, verified against the bytes that will actually ship.
for TOKEN in 'glassbox-jet-v1' 'GlassBox — Reasoning Studio'; do
  BYTE=$(python3 -c "import sys;d=open('$ROOT/GlassBox.html','rb').read();i=d.find('''$TOKEN'''.encode());print(i)")
  [ "$BYTE" -ge 0 ] || { echo "FAIL: launcher token '$TOKEN' missing"; exit 1; }
  [ "$BYTE" -le 4000 ] || { echo "FAIL: launcher token '$TOKEN' at byte $BYTE, past the 4000-byte probe window"; exit 1; }
  say "launcher token '$TOKEN' at byte $BYTE"
done

echo "▸ Assembling GlassBox.app"
APP="$STAGE/GlassBox.app"
cp -R "$OUT/app-template" "$APP"
cp "$ROOT/GlassBox.html"        "$APP/Contents/Resources/GlassBox.html"
cp "$ROOT/glassbox-bridge.mjs"  "$APP/Contents/Resources/"
cp "$ROOT/glassbox.d.ts"        "$APP/Contents/Resources/"
chmod +x "$APP/Contents/MacOS/GlassBox"
bash -n "$APP/Contents/MacOS/GlassBox" || { echo "FAIL: launcher has a syntax error"; exit 1; }

# Stamp the bundle version from the app's own build id, so "which build is this?" has an answer
# that does not depend on anyone remembering to bump a number.
STAMP=$(python3 -c "import re;print(re.search(r\"const APP_BUILD='([^']*)'\",open('$ROOT/GlassBox.html').read()).group(1))")
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $STAMP"            "$APP/Contents/Info.plist" >/dev/null
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $STAMP" "$APP/Contents/Info.plist" >/dev/null
say "bundle stamped $STAMP"

echo "▸ Verifying the assembled app serves and passes its own probe"
PORT=8794
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$APP/Contents/Resources" >/dev/null 2>&1 &
SRV=$!
for _ in $(seq 1 40); do curl -sf --max-time 1 "http://127.0.0.1:$PORT/GlassBox.html" >/dev/null 2>&1 && break; sleep 0.2; done
# NB: fetch the head into a variable rather than piping through `head`. Under `set -o pipefail`
# a truncating `head` closes the pipe, curl dies on SIGPIPE and the pipeline reports failure even
# when grep matched — which reads as "the app is broken" when nothing is wrong. The launcher
# itself does not set pipefail, so it is unaffected; only this checker was.
PROBE_OK=1
HEAD4K="$(curl -s --max-time 3 -r 0-4095 "http://127.0.0.1:$PORT/GlassBox.html" || true)"
case "$HEAD4K" in *glassbox-jet-v1*) ;; *) PROBE_OK=0 ;; esac
kill "$SRV" 2>/dev/null || true
[ "$PROBE_OK" = 1 ] || { echo "FAIL: the assembled app does not pass its own launcher probe"; exit 1; }
say "probe matches the served page"

if [ "${1:-}" = "--no-dmg" ]; then
  rm -rf "$OUT/GlassBox.app"; cp -R "$APP" "$OUT/GlassBox.app"
  echo "▸ Done (app only): $OUT/GlassBox.app"; exit 0
fi

echo "▸ Building the disk image"
DMGSRC="$STAGE/dmgsrc"; mkdir -p "$DMGSRC"
cp -R "$APP" "$DMGSRC/"
cp "$OUT/GlassBox-Launch.command" "$DMGSRC/"
cp "$OUT/dmg-README.txt" "$DMGSRC/README.txt"
ln -s /Applications "$DMGSRC/Applications"
rm -f "$OUT/GlassBox-macOS.dmg"
hdiutil create -volname "GlassBox" -srcfolder "$DMGSRC" -ov -format UDZO \
  -quiet "$OUT/GlassBox-macOS.dmg"
say "$(du -h "$OUT/GlassBox-macOS.dmg" | cut -f1)  $OUT/GlassBox-macOS.dmg"

echo "▸ Verifying the disk image"
MNT="$(mktemp -d)"
hdiutil attach -nobrowse -readonly -mountpoint "$MNT" "$OUT/GlassBox-macOS.dmg" >/dev/null
FAIL=0
[ -x "$MNT/GlassBox.app/Contents/MacOS/GlassBox" ] || { echo "FAIL: launcher not executable in the image"; FAIL=1; }
cmp -s "$MNT/GlassBox.app/Contents/Resources/GlassBox.html" "$ROOT/GlassBox.html" \
  || { echo "FAIL: bundled GlassBox.html differs from the repo copy"; FAIL=1; }
grep -q 'glassbox-jet-v1' "$MNT/GlassBox.app/Contents/MacOS/GlassBox" \
  || { echo "FAIL: launcher in the image still probes for something else"; FAIL=1; }
say "image contains the current app, byte-for-byte"
hdiutil detach "$MNT" >/dev/null; rmdir "$MNT" 2>/dev/null || true
[ "$FAIL" = 0 ] || exit 1
echo "▸ Building the Windows bundle"
# The Windows zip had exactly the same rot as the disk image: it still carried the 21 Aug page and
# the PowerShell launcher that probes for a title string which no longer exists. Vercel serves both
# as public downloads, so a stale artifact here is not a private inconvenience — it is what someone
# actually gets when they click Download.
WINSTAGE="$STAGE/win"; mkdir -p "$WINSTAGE"
cp "$ROOT/GlassBox.html"       "$WINSTAGE/"
cp "$ROOT/glassbox-bridge.mjs" "$WINSTAGE/"
cp "$OUT/GlassBox-Launch.bat"  "$WINSTAGE/"
cp "$OUT/GlassBox-Launch.ps1"  "$WINSTAGE/"
grep -q 'glassbox-jet-v1' "$WINSTAGE/GlassBox-Launch.ps1" \
  || { echo "FAIL: the PowerShell launcher does not probe for the current token"; exit 1; }
rm -f "$OUT/GlassBox-Windows.zip"
( cd "$WINSTAGE" && zip -q -r "$OUT/GlassBox-Windows.zip" . )
say "$(du -h "$OUT/GlassBox-Windows.zip" | cut -f1)  $OUT/GlassBox-Windows.zip"

echo "▸ Verifying the Windows bundle"
WZ="$STAGE/wcheck"; mkdir -p "$WZ"
unzip -qo "$OUT/GlassBox-Windows.zip" -d "$WZ"
cmp -s "$WZ/GlassBox.html" "$ROOT/GlassBox.html" \
  || { echo "FAIL: the zipped GlassBox.html differs from the repo copy"; exit 1; }
grep -q 'glassbox-jet-v1' "$WZ/GlassBox-Launch.ps1" \
  || { echo "FAIL: zipped PowerShell launcher probes for the wrong token"; exit 1; }
say "archive contains the current app, byte-for-byte"

echo "▸ Done"
