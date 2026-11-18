# Softer DICE themes — 17 November 2026

Implemented locally on `feature/artist-payout-requests`. Existing payout work is preserved. No commit, merge or push; no backend behavior, academic document or statistical content changed in this styling phase.

## Changes

All 15 built-in theme IDs and names are retained. Their palettes now use muted surfaces, restrained accents and softer text rather than near-black/bright-white/neon combinations. Obsidian uses the selected muted navy direction; the other palettes retain their recognizable hue families and light/dark identities.

`frontend/src/lib/themePalettes.ts` is the shared palette source for the initial page, runtime application, gallery and picker previews. Theme text, button fills, selected backgrounds, control boundaries, focus and status colors have separate tokens. The initial HTML receives the default palette to avoid an unstyled first paint. No dependency additions or data migrations are needed.

Shared top menus, role headers, bottom navigation, buttons, fields, notifications and dialogs use the softer surfaces. Navigation selection remains visible with labels/weight/borders; primary actions and danger states retain readable foregrounds. Decorative repeated glow, floating, wiggle, pulse and ping effects are disabled; brief transitions and loading spinners remain. Reduced-motion handling remains in place.

Existing custom color values are preserved. Compatible derived styling tokens and a readable button foreground are supplied without rewriting saved palettes. The custom-theme preview now uses the same rendering tokens as the applied theme. Arbitrary custom palettes are not automatically recolored or certified for contrast.

## Automated checks

**250 passed; 0 failed; 0 skipped.** Client Python 45 + shared Python 126 + legacy isolated Python 18 + Node 61. This retains the previous 232 checks and adds 18 palette checks. Frontend TypeScript also passed. Runs were sequential and used disposable databases/uploads; no real payments were made.

The new checks cover known luminance/contrast examples, all 15 palettes, normal/muted/accent text on primary/panel/hover/selected surfaces, essential control/focus boundaries, normal and hover button text, status backgrounds, preview consistency, retained IDs, distinct backgrounds, unknown-ID fallback and unchanged legacy custom-color values.

Logs: `reports/soft-themes/combined-checks.log` and `reports/soft-themes/frontend-typecheck.log`. No automatic retries or reduced assertions were used. Early palette drafts that failed contrast checks were adjusted before browser acceptance.

## Built-in browser review

Reviewed **45 representative theme/role combinations** in Chromium at 1440×1000: each of the 15 themes on client orders, artist earnings/payouts and administrator payment settings. Each switch was performed through the real theme picker; actual applied theme and dimensions were recorded, and viewport screenshots were inspected individually or in overview sheets. No horizontal document overflow was recorded in this desktop matrix.

Additional checks passed:

- Rendered admin text-field boundaries, primary button labels and selected navigation in **all 15 themes** after the field-selector repair. Minimum measured ratios: field boundary 3.529:1, primary button label 4.632:1, selected navigation 4.760:1. These are actual rendered color pairs, separate from the palette-unit checks.
- Client mobile order cards/menu, admin validation and payout dialogs at 390 px and 320 px. At 320 px, the dialog measured 289 px and the document remained 320 px wide. Horizontal role-navigation scrolling remains intentional.
- English and Thai screen labels; visible keyboard focus, Tab, Escape dismissal and focus restoration.
- Invalid fee input shows an inline explanation without saving payment settings. Reload restored the saved 5.00 value; no settings mutation occurred.
- Existing payout totals and receipt labels remain visible after refresh. The prior commission/auction balances remain unchanged; the combined run includes all payment/request regressions.
- Transfer-proof preview remains at its original 480×240 dimensions, with `filter: none`, opacity 1 and `object-fit: contain`. There are no page-wide media color filters. QR image elements retain their white image background; actual QR decoding/accounting remains covered by existing regressions, rather than a new bank interaction.
- A custom theme created using the legacy saved-field shape retained its exact selected background `#14283b`, accent `#82b0cc` and text `#e8eef4` after reload and built-in/custom switching. The isolated browser retains this clearly named QA sample; pre-existing custom palettes were not deleted or changed.
- Local wallpaper URL and 25% opacity, plus compact layout, survived refresh. Wallpaper visibility was confirmed on discovery with a transparent page surface. The test ended with the original no-wallpaper/grid preferences and muted navy selected.

Matrix and rendered measurements: `reports/soft-themes/theme-matrix.json`, `reports/soft-themes/rendered-contrast.json`. Screenshots and overview sheets are generated evidence and excluded from Git.

## Findings and targeted repairs

1. **Faint default text-field boundaries:** some `<input>` elements omit a `type` attribute, so the old selectors missed them. Confirmed in the light admin payment form and reported before repair. Added `input:not([type])` to the shared field styling. Rendered boundary checks then passed for every theme. Original screenshot: `admin-rose-field-before-fix.jpg`.
2. **Custom preview differed from applied button text:** the preview inherited the current page's text color instead of the custom button's foreground. Reported before repair. The preview now uses the same theme-variable calculation and foreground as the applied palette. Browser regression confirmed RGB(23,32,43) for the sample button, matching `--accent-contrast: #17202b`; stored custom colors stayed unchanged.

The existing unrelated admin mobile role-label defect documented in the payout report remains unchanged; this phase preserves application wording and behavior.

## Before/after and limits

Retained before/after examples of the same English payout dialog:

- [Before](reports/soft-themes/before-payout-dialog-desktop.jpg): original retained screenshot from the preceding payout verification.
- [After](reports/soft-themes/after-payout-dialog-desktop.jpg): softened palette and shared dialog.
- [Finished top menu and earnings screen](reports/soft-themes/after-navy-desktop.jpg).
- [Client mobile screen](reports/soft-themes/client-navy-mobile.jpg).

Enlarged-text/browser zoom remains **not verified**: browser keyboard zoom attempts did not produce a measurable viewport/device-scale change in the available controls. Compact mobile widths were checked, but are not presented as a substitute for a 200% text-enlargement test. Reduced-motion CSS was retained; OS preference switching was not exercised. This is a targeted visual/readability review, not a complete WCAG certification, production performance test or user research study. Arbitrary custom colors, wallpaper images and every possible page/content/state combination are outside the contrast guarantees of the built-in palette checks. Firefox/WebKit were not run.

Future palette changes should update the shared definitions, rerun the palette checks and type check, and repeat the representative role/theme matrix. Keep media/QR backgrounds separate from themed surfaces and retain the documented contrast thresholds.
