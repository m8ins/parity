# Mobile modal position · 21 November 2026

The condition editor and its review/discard steps share `DialogContent`.
Before the fix, Chromium measured the 390 × 844 editor at x = −195 and
y = −145.16: the mobile sheet was anchored at left/bottom zero but still
had the default Tailwind `translate: -50% -50%` applied.

The shared dialog now owns desktop centering and the mobile bottom-sheet
recipe in `controls.css`. Below 640 px every dialog uses full width, bottom
anchoring, rounded top corners, a bounded scroll area and safe-area padding.
Larger viewports keep centered dialogs. The conflicting Tailwind positioning
utilities and separate condition/reading positioning rules were removed.

Visible dialog surfaces subscribe to Visual Viewport resize/scroll events,
adjusting their height and bottom inset above the keyboard. Listeners are
removed on close. The reading dialog retains its existing form layout and
drag handle, while sharing geometry and keyboard handling with all dialogs.

## Verification

- `npm test -- --run`: 194 tests passed, including viewport resize/pan,
  listener cleanup, forwarded refs and browsers without Visual Viewport.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `node docs/verification/slice-6/build-isolated.mjs`: production build passed
  in a temporary copy with synthetic configuration.
- `node docs/verification/modal-position/verify-browser.mjs`: 15 real Chromium
  layout checks passed with synthetic preview data. Edit, payment review and
  discard confirmation fit inside 390 × 844, 320 × 568, 844 × 390 and
  1440 × 1000 viewports, plus 320 × 568 with 200% text. Actions were exercised
  through the rendered forms, including scrolling shorter viewports.
- `node docs/verification/modal-position/verify-all-dialogs.mjs`: 47 shared
  dialog checks passed. Setup and its discard confirmation, rename, deletion,
  reading and its nested discard confirmation, period end, settlement and
  all three continuation steps were checked at 390 × 844, 320 × 568,
  320 × 568 with 200% text and 1440 × 1000. Each dialog fits its viewport;
  mobile sheets are flush with the bottom and full width, desktop dialogs
  are centered, and the last action is reachable by scrolling. The password
  dialog also passed mobile geometry, Reduced Motion and simulated keyboard
  viewport checks (height 400, offsetTop 100: sheet spans y=116 to y=500).

Run the dev server with `PARITY_DESIGN_PREVIEW=1` and Supabase configuration,
then run the script. `PREVIEW_URL`, `PLAYWRIGHT_MODULE` and `BROWSER_PATH` can
override its local defaults. Geometry is recorded in `browser.json` and
`all-dialogs.json`; PNGs capture each checked state. Mobile edit/review,
profile, 200% deletion, nested setup confirmation and desktop period-end
screenshots were inspected. The account-menu check uses an isolated synthetic
session cookie in its own browser context; no real account is used.

This verifies emulated viewport layout and interactions in Chromium, not
physical iOS/Android keyboards, Safari or production persistence. No data
was saved by this check.
