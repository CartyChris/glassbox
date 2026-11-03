# Handoff — pass 39 (3 Nov 2026): phone UI, four-hub tab bar, no emoji, Liquid Glass default

| | |
|---|---|
| Build | APP_BUILD a6812b1214928d53 (base 2d318cdbda8c7a22); DMG + Windows zip rebuilt, byte-for-byte |
| Gauntlet | 440/440 Chromium 375/420/768/1440 + WebKit 390/1024; sabotage 265/265 caught |
| Phone layout check | overlap39: 0 overlapping/spilling controls on 60 views (WebKit 440, Chromium 375; every disclosure opened) |
| Emoji | emoleft39: 0 emoji drawn in the interface across 60 views (one left inside a sample Office document — content) |

## What changed
- **Overlapping buttons (the screenshot)**: one-line scrolling rows flex-shrank buttons to the 44pt floor while their text kept
  its width. Fix is global (`.row>.btn{flex-shrink:0}`), plus the chat toolbar on a phone: modes scroll, UI / Auto / settings
  are icon toggles with `aria-pressed`. Also fixed: model-picker button sliding over the next control (local, graphs, guards),
  inputs inside sentences at the touch floor, WebOS desktop icons under its dock on short screens (grid now sized to the desk).
- **Bottom gap in the Home Screen app**: iOS 26 standalone can end the layout viewport where Safari's toolbar would be
  (WebKit 158055568, fixed in Safari 26.1 per its notes). `home39Apply` measures screen vs viewport in standalone only,
  lowers the tab bar and extends the body by the gap; content now runs under the glass bars instead of stopping at them.
  Off switch + manual offsets + live readout in All → Edit tab bar → Home Screen app fit. Verified by emulation
  (navigator.standalone + a short viewport); NOT yet on a physical iPhone.
- **Tab bar = four hubs built from setup**: Chat first, then the three hubs with most of the picked sections; every other
  section joins its nearest hub, Settings/Help join Chat. Each hub shows its sections as a scrolling segmented row under the title.
  Editable (rename, icon, reorder, move sections) in All → Edit tab bar; "Rebuild from my setup answers" returns to auto.
- **Classic on phones**: All sheet → Tab bar | Classic, the header view button, and the editor. Separate from desktop.
- **No emoji**: 235 distinct emoji → Lucide 0.469 (ISC) icons at the DOM; arrows kept as text with U+FE0E; emoji icon style removed.
  Model/user content (markdown, code, editors) is left as written on purpose.
- **Look**: Liquid Glass is the default (one-time migration for installs still on "none"); glass on the navigation layer only
  (title bar, tab bar, sheets, menus, toasts), solid inset-grouped cards; iOS system colours; 15px phone body; capsule buttons.

## Not done / honest notes
- Physical-iPhone check of the standalone gap fix: the Simulator's access prompt was not answered, so Add to Home Screen
  could not be driven. iOS 27 Safari (Simulator) renders the build.
- `p39/emomap.py` reads Lucide from a scratch folder; `npm pack lucide-static@0.469.0` and set the path to regenerate.
