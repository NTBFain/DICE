> Historical evidence. For installed fixes and current limits, read REPAIR_PROGRESS_2026-11-13.md. Earlier blocked/unapplied statements and counts below describe their original runs.

# DICE browser continuation — 13 November 2026

Built-in ChatGPT browser control is restored. This file supersedes the old browser-blocker statements in RESUME.md and REVIEW_2026-11-13.md. Sequential checks use the existing isolated runtime (frontend 3000/backend 8000), disposable QA records and local media. No application source has been changed in this continuation.

## Confirmed failures, reported before any code changes

- **F04 / P1 / Artist order workspace:** Open accepted QA Order 15; choose SKETCH WIP. The browser leaves status ACCEPTED and displays no failure feedback. Backend log records PATCH /api/orders/15 → 400. Dropdown displays PENDING because ACCEPTED is missing. Evidence: reports/browser-20261113/F04-artist-stage.jpg. Artist/admin stage repair awaits approval; admin click confirmation still pending.
- **F02 / P1 / Artist Manual Ticket:** Enter title `Role QA Manual Ticket 20261113 Browser`, client `Second QA Client`, and submit. New Order 16 displays client Main Artist. Supporting admin API confirms artist_id 6 / Quiet QA Artist, client_id 2 / Main Artist, instead of intended artist user 2 and client Second QA Client. Evidence: F02-manual-ticket.jpg. Retained as disposable evidence; no fix.
- **F09 / P2 / Artist commission detail:** Open accepted `Client QA reattach draft`. Reference is listed but the image has complete=true/naturalWidth=0. Existing exact-URL HTTP evidence shows anonymous 401 versus authenticated 200. Evidence: F09-reference-broken.jpg. No fix.
- **F08 / P2 / Artist Watermark:** Click Save Configuration with unchanged settings. Native alert says settings could not be saved. The shared global write endpoint is admin-only. Do not broaden global permissions as a repair. Screenshot capture dismissed the native alert before a later indexed click; fresh AX confirmed it gone. The screenshot file is page context, not proof of alert text; the AX result is the alert evidence. No fix.
- **F15 / P3 / English artist localization:** /en artist analytics, commission and watermark routes display substantial Thai-only controls/instructions. Analytics screenshot: artist-analytics-English.jpg. No fix.
- **F16 / P2 / Artist zero pricing:** Service 1 API retains PRIVACY_NDA price=0, but service summary and Form Builder show 500. Separately set artist starting price to 0 and save: Profile Updated appears while editor immediately changes to 500. Restored original starting price 1000 via browser and observed value 1000 after save. Evidence: F16-free-NDA-shows-500.jpg and F16-zero-starting-price.jpg. No fix.
- **F17 / P3 / Artist service-edit keyboard dismissal:** Focus Cancel and press Escape; service-edit modal stays open. Cancel click closes it. This is limited to the observed modal; other modal keyboard checks remain pending.

## Verified interactions (limited scope)

- Main Artist demo credentials populate login fields; sign-in reaches artist orders with the correct identity and data.
- Order selection and Brief & Assets tab render the chosen QA order.
- Manual Ticket submits, but fails ownership/client correctness as above.
- Analytics week, month, quarter and year controls render their respective chart labels. Cross-artist data leakage F01 remains backend-confirmed, not yet reproduced using two live browser identities.
- Artist commission inbox, service list, edit modal, form builder and detail modal open; explicit Cancel/Close buttons dismiss their respective dialogs. Saving form changes was not attempted.
- Profile save works for original price 1000; zero display fails as above.
- Gallery creation uploads a real local PNG and produces `Role QA Artwork 20261113`. Edit saves title `Role QA Artwork 20261113 Edited`. Hide changes PUBLIC/Hide to PRIVATE/Publish. A reload snapshot was taken before data finished loading, so refresh persistence is not yet counted passed. Private disposable artwork retained for character-link checks.

## Current position and remaining work

Browser is signed in as Main Artist on /en/dashboard/artist/characters. Next: disposable linked character CRUD, auctions, supporting API ownership checks for saved gallery/profile values, then admin pages, invalid client payment upload and service draft switching. Full artist/admin and remaining client checklists are still incomplete. Existing 148 backend-check totals and 121 historical browser groups are unchanged; this continuation has not been represented as a full passing suite.

All screenshots are under reports/browser-20261113. The latest package is in the Codex working folder; publication to D:/DICE/test-suite has not succeeded. Prior authorization does not override the current read-only filesystem profile.

## Subsequent artist/admin checks

- **F01 / P1 / financial isolation browser-confirmed:** Logged out admin and logged in Quiet QA Artist (user 6/profile 2). Queue correctly shows only Orders 6 and 16, neither paid or completed. Earnings displays 1950.40 and three completed orders, which belong to Main Artist. Screenshot F01-quiet-artist-revenue-leak.jpg and F01-live-ownership-comparison.json preserve browser/real API comparison. No new financial fixture was needed. No fix.
- **F04 / admin confirmed too:** Selecting LINEART WIP on accepted Order 15 leaves it unchanged and offers no error. Screenshot F04-admin-stage.jpg.
- **F05 / linked character browser-confirmed:** Created Character 3 `Role QA Linked Character 20261113`, linked the new private artwork via its edit modal, then clicked character delete. DELETE /characters/3 → 500; character remains with no error message. Screenshot F05-linked-character-delete.jpg. Character retained. Admin later successfully edited its lore text through the UI.
- **F06 / admin artist deletion browser-confirmed:** Supporting fixture setup created user 7/profile 3 `Role Review Disposable Artist` (role-review-artist-20261113@example.test). Search isolates it. Delete sends DELETE /auth/users/7 → 500; UI shows Failed to delete user; account remains. Screenshot F06-admin-artist-delete.jpg. Native confirm temporarily stalled the browser controls; browser Escape recovered them. No existing account was deleted. No fix.
- **F07 / admin rejected watermark upload browser-confirmed:** Changed mode to hybrid and text to `Role QA rejected logo 20261113`, chose rejected-logo.svg, clicked Save. Failure alert appeared. Supporting GET nevertheless returned the changed type/text. Original full settings restored and browser reload showed original text mode/text. Evidence F07-watermark-after-rejection.json. Native error alert vanished before the next indexed OK action; this is a tool/dialog behavior, not an additional app defect. No fix.
- **F10 / admin homepage browser-confirmed:** Entered `Role QA Live Headline 20261113` and saved through editor. Supporting GET confirmed saved headline; public /en still shows Find & Hire Professional 2D Artists For Your Projects. Original settings restored and verified. F10-homepage-save-success.jpg actually captures the publishing/preview state before success settles, so its filename must not be interpreted as proof of a completed save; the API read and public screenshot provide the outcome. No fix.
- **F12 / legacy admin profile confirmed:** Direct known route /en/dashboard/admin/profile renders empty artist fields and an enabled Save Profile despite no admin artist profile, without explaining unavailable data. Screenshot F12-empty-admin-profile.jpg. This route is absent from normal admin nav and remains low priority. No save attempted; no fix.
- **F18 / P2 / auction decimal creation:** Native browser validation blocks start bid 100.25 and increment 10.25 (nearest valid whole numbers), while auto-buy 200.75 is allowed. Screenshot F18-auction-decimal-validation.jpg. Continuing with start 100/increment 10 successfully publishes Auction 4 with real local PNG. Artist chat sends and survives reload; empty send is disabled. Admin closes the no-bid auction; supporting GET confirms ENDED and no winning bid. No fix.
- **F19 / P2 / custom theme immediate application:** Preset Imperial Gold saved as one disposable custom theme. UI marks it ACTIVE, but document data-theme remains obsidian/style null immediately after creation. Reload applies data-theme=custom and the gold CSS variables. Screenshot F19-new-custom-theme.jpg. Restored Obsidian through UI; one disposable custom theme remains stored locally. A native save-success popup blocked control and required the user to dismiss it; connection recovered. No fix.
- **F15 scope expanded:** Admin Theme Studio and Watermark also have Thai-only controls on /en. Analytics admin itself has English period buttons; their raw accessible names are lowercase despite CSS title casing. The initial Week locator mismatch was a test locator issue, not an app defect.

Additional verified interactions: artist gallery edited title, private visibility and linked character persist after route navigation/reload; admin sees the private artwork and its linked character. Admin user search returns matching account and an empty table for absent search. Admin analytics week/quarter/year labels render. Admin character edit saves. All nine normal admin destinations plus legacy profile have had an initial browser pass. Neither role's deep checklist is complete; modal accessibility, validation, uploads/recovery, role changes, full service creation and two-session behavior remain partial/not run.

Current browser: Quiet QA Artist earnings. Next: remaining client upload and service-draft isolation; preserve artist/admin evidence and request repair approval before changing their code. No application code changes, builds, bulk seed, concurrent browser or full suite run occurred.


## Final approved-repair checkpoint

The user explicitly approved artist/admin fixes, including the reported priority issues, in addition to earlier client-fix approval. Do not ask for that authorization again. Filesystem access is the current repair blocker.

F14 is now browser-confirmed: Replace Slip on Order 15/invoice 13 accepted the 22-byte corrupt RIFF/WAVE-style PNG with no error. Authenticated download returned exactly those invalid bytes; payment remains unapproved. See F14-invalid-slip-browser.jpg and F14-browser-upload-stored.json.

F20 (P2) is a new browser-confirmed client defect: a populated Illustration draft (two characters, Scenic, fixed add-on, distinctive name/brief) carried into Sketch service 2 at step 2. Its summary even showed Add-ons (1) at zero although Sketch has none. Submission created proposal 7 under Sketch with Illustration text. Withdrew proposal 7 through browser and observed Withdrawn. See F20-cross-service-draft.jpg and F20-wrong-service-request-submitted.jpg. No applied fix.

The attempted native date entry did not reach the saved request (requested_deadline=null). This is blocked/unverified, not a claimed past-deadline defect. No F21 finding exists. blocked-native-date-result.json records the limitation.

Mobile client menu and notification Escape dismissal, New Request, and client redirect away from artist/admin routes pass. Measured document width fits the 390px viewport. Artist mobile workspace also fits; its studio nav is independently scrollable, but every item was not exercised. Mobile screenshot scaling limits exact pixel review. Temporary viewport overrides were reset. Latest observed tab is signed out at /en/login and marked for continuation.

Continuation ledger: 70 granular scenario groups — 32 passed, 20 failed, 2 blocked, 16 not run. Repeated scenarios can share one issue. There are 17 distinct browser-confirmed findings (F01/F02/F04-F10/F12/F14-F20) plus 3 backend-only findings (F03/F11/F13), 20 total catalogued. Do not add overlapping/historical totals. See BROWSER_CHECKLIST_2026-11-13.md. All eight artist and nine normal admin destinations plus legacy profile had initial passes; deep coverage is incomplete, not certified complete.

approved-repairs contains ten staged source/test files for F01/F02/F03/F04/F14/F20 with original hashes. Combined staged backend checks passed 35/35; virtual-source TypeScript checks passed. Initial priority-test harness errors (strict EmailStr versus existing test-domain registration, and a Pydantic response read as a dictionary) were corrected before the green run; neither is an app finding. Live post-fix regressions are blocked because installed DICE code is unchanged.

Both latest write requests returned file_system=null. No grant was claimed and no DICE source/test-suite file was written. No runtime frontend substitution, server restart or production build was used to disguise an applied fix. Repairs and evidence remain on C:. Original homepage and watermark settings and starting price 1000 were restored and verified; Obsidian was restored, while one disposable Imperial Gold custom theme remains locally stored.

Screenshot limitation: F01 financial capture includes the transient Loading Studio overlay, with financial values and identity underneath. AX state and F01-live-ownership-comparison.json are the decisive ownership evidence. F04-artist-stage.jpg is a clear visual example. Preserve all original failure evidence.

Resume with working DICE project writes, compare source hashes, merge/apply staged deltas preserving other uncommitted work, mirror only changed frontend files, restart only the owned isolated backend, then rerun installed targeted checks and browser regressions. Finish the remaining approved findings and not-run groups afterward. No further repair approval is needed for the reported scope.
