# Latest continuation — 2026-11-13 21:29 Bangkok

This section supersedes the earlier21:15 checkpoint below. Backend wrapper now11620; frontend25100. Always consult work/dice-runtime/review-processes.json. Built-in browser2/tab3, signed in Main Artist, English commission builder for disposable service3. No new permission question is pending.

F35 numeric brief validation was browser-confirmed: background fee−5.25 saved despite min0. Original evidence retained. Automatic approval review initially refused installation; user then explicitly approved F35. Installed schema validation rejects negative/nonfinite/malformed fee values and enforces declared character limits; browser checks its form before saving and shows bilingual inline feedback. Browser rejects−5.25 and max_chars0, retains input; zero/25.25 and max_chars3 save and survive refresh. Live invalid request422 leaves existing schema unchanged. Five new isolated regressions pass; shared suite now27. Current focused tally:29 client+27 shared+13 Node=69 passed,0 failed,0 blocked,0 not run within this SELECTED regression set. Frontend noEmit passes. This is not the browser/end-to-end coverage tally.

F15 extension installed: shared artist profile, shared admin/artist auction controls and admin account page now use90 new English/Thai messages, plus named profile/auction numeric/media controls. Browser checked both languages, account search, auction modal/Escape and profile labels. Artist-authored content is preserved. F15 remains partial: platform default brief option text and some role badges/generated messages still require review.

Disposable service3 QA Decimal Create20261113 was CREATED THROUGH THE BROWSER at123.45,3slots,7days,Open. All8 blocks now enabled; max_chars3,extra fee0,background prices0/25.25/1200,NDA0; one custom paragraph question QA preferred delivery format, added QA no extra pets exclusion. Add/remove question and exclusion-add controls worked, configuration persists. Service1/2 unchanged. Retain service3 for continued form/add-on checks; no proposals/orders depend on it yet. Backend blocks new invalid writes but does not silently migrate old configurations.

Candidate observation awaiting confirmation/report: rush preview in builder displays fractional cents61.725/30.863 for base123.45. Do not claim a confirmed submitted-price defect or silently fix it. Two-session races, date entry, mobile full journeys and other breadth below remain unfinished.

Project documentation/evidence now published with this checkpoint using original-hash guards. No commits or pushes. Current tests and browser evidence are separate from the preserved historical70-group ledger.

---

# DICE checkpoint — 13 November 2026, 21:15 Bangkok

Continue the approved client/artist/admin review using checklist → browser confirmation → report → repair → focused regression. All reported role repairs are approved. Keep one built-in browser, sequential checks and low CPU. Do not commit, push, merge or switch branch; user will push. Branch edit_1, last observed HEAD016c492. Preserve unrelated changes.

## Runtime and access

Original source D:/DICE. Scoped automatically reviewed elevated installer writes work; no ACL changes needed. Candidate bundles and exact backups live in this workspace outputs. Apply with apply_dice_batch.py, which checks branch and every original hash, backs up, then writes. Mirror only installed frontend changes to work/dice-runtime/frontend (messages first). Backend runs original DICE source against the isolated runtime backend SQLite/uploads; never touch development data. Frontend3000 wrapper25100; backend8000 wrapper33408. Read work/dice-runtime/review-processes.json before control. restart_dice_test_backend.ps1 checks exact ownership; no broad process kills. Backend has no autoreload.

Built-in browser2/tab3, binding continuedDiceTab, signed in Mobile Role QA20261113 client7 at /en directory. Only one tab; native file picker dismissed, uploads working. After compaction call cua.rewriteDocumentation(). Prefer fresh playwright.domSnapshot. Observe state after timeouts before submitting again. Tabs share authentication, so two independent simultaneous sessions remain unavailable. No CUA completion summary yet for the ongoing review.

## Latest repairs and verification

F01–F28 are documented in the older progress report. F15 language coverage remains partial. F28 zero character fee was subsequently browser-confirmed; original fee70 restored, builder now legitimately stores platform default metadata. Do not claim exact schema restoration.

F29 mobile artist navigation overflow: fixed horizontal scrolling, all8 artist/9 admin destinations reachable at390px; first link used keyboard because Next dev badge covered it. This is not complete mobile layout certification.
F30 malformed custom-theme hex accepted: now bilingual visible validation preserving input, valid save applies immediately; new disposable themes deleted, Obsidian restored.
F31 admin modal allowed background navigation: first z-index-only fix failed. Final portal overlay fix passed hit-test, no-navigation, focus/Escape checks. Preserve failed intermediate evidence.
F32 saved revisions invisible to artist/admin: shared workspace now lists pending/resolved feedback, quota, retries and guarded resolution controls. All3 Order21 revisions resolved through artist UI; client sees3 resolved/quota0.
F33 workspace selection lost on refresh and missing order showed unrelated order: selected order/tab now URL-derived, persists through refresh/back/language change; missing order shows explicit error without unrelated data. Native card buttons named and keyboard accessible.
F34 public completed-order count always0: derive canonical owner-user order counts, batch directory query, no legacy ID fallback. Main profile/directory now6, Quiet0. Three isolated regressions pass.

Current distinct focused checks VERIFIED21:13: client Python29 passed; shared Python22 passed; Node13 passed; total64. Frontend full noEmit passed. Logs outputs/client-regression-latest.txt, shared-regression-latest.txt, node-regression-latest.txt, frontend-check-latest.txt. These are selected regressions, not exhaustive end-to-end coverage. Historical70 browser groups remain32 passed/20 failed/2 blocked/16 not run at their original pre-repair run; preserve history rather than relabel it as fresh results.

Correction preserved: a proposed missing-review finding was wrong; existing public ClientReviewForm already works. Redundant order-review UI/endpoints/schema/six tests were exactly reverted. Isolated SQLite retains unused nullable artistreview.order_id column/index from that experiment; original DICE database untouched. Do not count discarded tests or misleading review screenshots as defect evidence. Actual F25 is stale auction highest-bidder warning, fixed and browser-confirmed.

## Verified journeys and disposable records

Order18 completed/paid2395.83, invoices14/15=1197.92+1197.91, client4/artist2, revision4 resolved, originals PNG/PDF byte-matched, collection confirmed. Supporting artist/admin actions partly real API, so not all-role browser certification.
Auction5 ended: start100.25/increment10.25/auto-buy200.75, client4 won through browser, Order19 completed/paid invoice16, delivery and collection confirmed. Supporting roles partly API. Anti-sniping/long expiry not newly verified.
Order20 pending client7/artist2: deliberate owned-backend outage displayed useful submission error and preserved exact inquiry; restart and browser double-submit created exactly one order. No repair needed.
Order21 completed/paid150.25, client7/artist2, title Portal Regression Manual Ticket20261113, invoice17 approved, WIP20 PNG/final21 PDF, revisions5/6/7 resolved. Admin manual creation, quote, negative-invoice validation, valid invoice, stages, upload, quick reply; client chat/slip/revisions; artist protected slip approval/resolution/completion; client original download and collection were ALL browser actions. Supporting API used only fixture/evidence reads. PDF at C:/Users/Ball/Downloads/sample-deliverable.pdf matches fixture byte-for-byte. First offscreen pointer download did not act, keyboard Enter did; do not call that app defect. Final evidence order-21-all-role-browser-flow.json in reports/fixed-20261113.
Client7 mobile-role-qa-20261113@example.test / LocalQA-2026-Test, name Mobile Role QA20261113, plainclient/no artist profile, real PNG avatar persists. Temporary artist/admin flags revoked; refresh redirected correctly. Retain user7 because orders/review depend on it. Existing public review form submitted one5star review for client7, now Main rating4.7 with3 reviews. Earlier deleted artist7 is a different fixture whose reused numericID must not be confused.
Default accounts: admin@example.com, artist@example.com, client@example.com / password123. Client4 client-qa-1794441815@example.test / LocalQA-2026-Test. Quiet artist user6/profile2. Main artist user2/profile1. Completed Main orders1,3,5,18,19,21. Preserve all failure/repair data.

## Evidence and unfinished work

C: outputs/role-review-package/reports/{browser-20261113,fixed-20261113} contains original and latest evidence. DICE test-suite docs/evidence were last published14:47 and are STALE. Update README, RESUME and progress with this checkpoint and latest evidence using a new checked bundle; do not rerun hardcoded publish_role_review.py blindly. Reports ignored except .gitkeep. Do not publish logs containing WebSocket tokens, candidate source trees, or redundant reverted feature.

Remaining: F15 English/Thai static copy in shared admin auctions/profile and admin users; generated notifications breadth; service creation/every modular builder input; artist onboarding/media; post-portal gallery/character CRUD and upload boundaries; deep admin moderation/layout; mobile full commission/auction journeys; native deadline entry; every media combination; broader network recovery; modal/keyboard breadth. Two independent simultaneous browser sessions and Firefox/WebKit are unavailable/not run. No exhaustive review claim.

Potential timestamp discrepancy is UNCONFIRMED: distinguish browser timezone before reporting. Public private-art count also unconfirmed in visible UI; do not invent defects from source alone.
