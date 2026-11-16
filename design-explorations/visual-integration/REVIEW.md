# Phase 1 · Finish review

15.11.2026 · Independent visual review of the isolated surface comparison. Basis: the Phase 1 brief, `DESIGN.md`, Slice 1b planning, the previous integration critique and Impeccable's craft floor.

## Disposition

**Ship for the user's colour choice.** The final comparison is complete enough to compare A and B. This disposition applies only to the static exploration; it does not approve production integration or begin Phase 2.

## Material findings

- No blocking visual findings in the twelve individual screenshots. Login, overview and the open capture dialog retain the same geometry, typography, content, controls and blue-grey contours in both variants. Values, units and primary actions remain legible at the captured desktop and mobile sizes.
- The desktop comparison initially overflowed and cropped the dialogs. The final recapture fixes this: both complete 1280 × 960 views fit side by side, including Save and Cancel. Original-size links provide the necessary readable inspection when these desktop views are scaled down.
- A gives the canvas a recognisably warm material character and visibly separates the white reading field. B feels brighter and quieter, with less distinction between the field, card and canvas. Neither loses the strong control outlines or directed button depth.
- Minor shared polish remains: the account chevron, menu dots and plus signs use text glyphs beside drawn meter icons. A consistent drawn icon set would better meet the craft floor during later integration. This does not impair the surface comparison and is not a request to expand Phase 1.

## Brief fit

The proposal preserves the established friendly measuring-instrument direction: Atkinson, large tabular measurements, semantic OKLCH roles, calm containers and plastic primary buttons. There is no neumorphism. The approved design world's directed button edge and surface radii take precedence over generic craft-floor defaults.

`preview.css` imports the existing foundation; variant B overrides only canvas, surface and field roles. Shared text, border, focus, action and layout recipes remain identical. Both variants include desktop and mobile login, overview and open dialog evidence. The forecast explanation is identical in both and does not confound the colour choice.

## Evidence and limits

Personally inspected all twelve `screenshots/{a,b}-{desktop,mobile}-{login,overview,dialog}.png` files with `view_image`, plus the final `comparison-desktop.png` and `comparison-mobile.png`. The latter compares 390 × 844 mobile frames within the desktop laboratory; the individual mobile captures supply the direct mobile evidence.

`browser-check.json` records 19 passing checks, no page errors, font loading, numerical width equality, no document overflow, 320 px text enlargement/spacing checks and a safe demo login-method switch. Measured role pairs pass the specified thresholds; the final minimum is 4.74:1 for primary-action hover text, above 4.5:1. These measurements cover the tested semantic pairs, not every possible future component or state. `impeccable-check.json` contains `[]`; that detector result is supporting source evidence, not a visual or accessibility certification.

This review uses supplied browser evidence and screenshot inspection rather than a second interactive browser run. The fixture is static. Radix focus management, Escape/dirty-state handling, touch gestures, authentication, persistence, real backend errors, assistive technology and physical-device behaviour remain outside this review. Application/shared-token edits and Phase 2 rollout are not authorised by this review.

## Recommendation

**Prefer A, warm cream.** It carries the established instrument character most clearly while preserving readable contrast. B is a sound alternative if the user prefers a lighter, more neutral surrounding surface; the supplied contrast evidence does not force that choice. Present both and wait for the user's selection before any Phase 2 integration or changes to application tokens and design metadata.

## Follow-up · C, softer cream

15.11.2026 · Scoped refinement after user feedback that A's background is too strong while B loses character. This follow-up supersedes the preference above for the current decision; the original review remains the record of the A/B comparison.

### Disposition

**Ship C for the user's colour choice.** No fix or recapture required. This is still Phase 1 only.

### Material findings

C visibly softens the broad canvas while retaining a cream cast in the header, cards and sheet. In the standalone login and overview captures, the background recedes and the blue-grey typography and buttons carry the hierarchy. In the open dialog, the white reading input remains distinct from its warmer surrounding surface. Desktop and mobile captures show no new wrapping, cropping or visual hierarchy regressions.

The A/C comparison frames are complete and aligned; Save and Cancel are visible. The dimmed dialog background naturally makes the canvas difference less apparent there, so the full-size login and overview captures are the clearest evidence for this particular refinement.

### Brief fit

C answers the feedback directly: it raises surface lightness and reduces chroma while keeping the established cream hue. It retains more material warmth than B without A's stronger overall tint. Source inspection confirms that C overrides only the canvas, surface and field roles, retaining the same white active field, text, outlines, actions, type and layout. The measuring-instrument character and plastic button treatment remain intact.

### Evidence and limits

Personally inspected the six `screenshots/c-{desktop,mobile}-{login,overview,dialog}.png` files and both `comparison-ac-{desktop,mobile}.png` files with `view_image`. Unchanged A/B individual captures were not re-reviewed. Inspected the C role overrides and comparison-pair wiring; the laboratory defaults to A/C and retains A/B as an option.

The rerun `browser-check.json` records 28 checks, zero page errors and 22 passing contrast pairs per variant; its current minimum is 4.77:1. As before, this is a static fixture and screenshot review supported by the supplied browser run, with no second interactive run by this reviewer. All earlier limits concerning Radix, gestures, authentication, persistence, backend states and physical devices still apply.

### Recommendation

**Prefer C, softer cream, in light of the user's feedback.** It preserves the character the user liked and makes the large background quieter. Present C for selection before Phase 2. This review changes no application tokens, shared components or design metadata and does not authorise rollout.

## Follow-up · C + Orange actions

15.11.2026 · Scoped Phase 1 exploration explicitly requested by the user. The comparison now isolates C's blue-grey primary actions against orange primary actions on the same C surfaces.

### Disposition

**Ship for the user's colour choice.** No fix, recapture or rebuild required for this static comparison. Phase 2 remains unstarted.

### Material findings

The orange gives the primary action a clear visual accent without recolouring the background, labels, measurement values or quiet actions. In login it makes the next step immediately apparent; in the capture dialog it distinguishes Save from Cancel while the large white reading field remains easy to find. In the overview, repeated orange actions draw more attention than their blue-grey counterparts, but the measurements retain their size and hierarchy. This is a visibly more playful and energetic direction than plain C.

All six standalone screens fit their captured desktop and mobile layouts. The four comparison captures are aligned and complete, including Save and Cancel in both dialog comparisons. The unchanged blue-grey border and directed lower edge keep the orange buttons looking like physical controls. No neumorphism, new wrapping or clipping was observed.

### Brief fit

The refinement keeps C's softer cream surfaces, Atkinson, tabular measurements, blue-grey outlines and the existing 4 px button depth. Source inspection confirms that Orange adds only action, hover and action-text colour overrides, using OKLCH values; the geometry and shared content remain identical. Orange is presented as an action accent, with no new warning or status claim in the fixture. The palette supports the established friendly instrument direction, with more character concentrated in the controls.

The comparison makes the changed variable explicit: C versus C + Orange changes primary-action fill and label colour; the retained A/B and A/C choices compare surfaces. The shared selection/accent styling also derives from the action role, as in the existing fixture; the supplied screenshots show resting states.

### Evidence and limits

Personally inspected all six `screenshots/orange-{desktop,mobile}-{login,overview,dialog}.png` files and `comparison-orange-desktop.png`, `comparison-orange-mobile.png`, `comparison-orange-desktop-login.png` and `comparison-orange-desktop-overview.png` with `view_image`. Inspected the variant's CSS roles and comparison-pair wiring. Unchanged variant captures were not independently re-reviewed in this follow-up.

The latest `browser-check.json` records 37 passing checks and no page errors across all four variants. All 24 measured Orange role pairs pass: action-label contrast is 6.36:1 at rest and 6.90:1 on hover; blue-grey border contrast against orange is 3.82:1 at rest and 4.14:1 on hover. The minimum of 3.82:1 is a non-text boundary pair, not a text-contrast result. The original variants currently report a minimum of 4.68:1. These figures describe this rerun and supersede earlier report values above.

This remains screenshot inspection plus supplied browser-check evidence, without an independent interactive run. The fixture does not prove production focus management, native/Radix behaviour, touch gestures, real auth, backend results, persistence or physical-device behaviour. No application/shared-token or design-metadata changes were made by this review.

### Recommendation

**Prefer C + Orange if the desired next step is more character in the controls.** It preserves the quieter warm background and adds a purposeful, recognisable action accent. Plain C remains the calmer option. Keep the orange concentrated on primary actions in the presented direction and let the user select before any Phase 2 integration; this finish verdict does not approve a production rollout.

## Follow-up · Lighter Orange button labels

15.11.2026 · **Pass for this text-colour refinement.** Personally inspected the six regenerated Orange desktop/mobile login, overview and dialog captures with `view_image`. The lighter blue-grey labels look less severe against orange and remain clearly readable. No new visual issue observed.

Source confirms the isolated action ink is now `oklch(33% .035 264)`. The refreshed browser report records 37 passing checks, zero page errors and all Orange contrast pairs passing. Action-label contrast is now **4.93:1 at rest and 5.38:1 on hover**, superseding the earlier Orange label figures above. Both exceed 4.5:1.

This verdict covers only the requested label colour in the static Phase 1 fixture. The earlier evidence limits still apply; no production readiness claim or Phase 2 approval follows. Only this review file was edited by the reviewer.
