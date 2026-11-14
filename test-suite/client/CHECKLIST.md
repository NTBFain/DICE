# Current client checklist —14 November2026

Authoritative scope and limits: [readiness report](../READINESS_REPORT_2026-11-14.md) and [machine-readable capability results](../ROLE_CAPABILITIES.json). This is a reconciled demonstration checklist, not an exhaustive claim for every input/control permutation.

- [x] **C01 Accounts and registration** — Invalid, short and duplicate registration feedback; valid registration and normalized identity.
- [x] **C02 Login, password visibility, demo buttons and logout** — Correct and incorrect credentials; all three demo logins; demo helpers hide when explicitly disabled.
- [x] **C03 Sessions, refresh, protected routes and account switching** — Persisted identity, expiry401, protected-route redirects and live revocation/cache clearing; sequential account switching.
- [x] **C04 Artist search and directory filters** — Search, categories, open-only, clearing filters, empty results and artist-card navigation.
- [x] **C05 Public profile, social links, artwork and character navigation** — Profile tabs, social web links, preview dismissal, character-to-filtered-portfolio links and back navigation.
- [x] **C06 Gallery filtering and pagination** — Eight categories; 32-to35 and32-to63 pagination without duplicates; oldest matching artwork found in501-item boundary catalogue; temporary boundary fixtures removed.
- [x] **C07 Commission availability and eligibility** — Open, closed, full and waitlist presentations; ineligible requests blocked; original availability restored.
- [x] **C08 Slot subscriptions and opening notices** — Subscribe/unsubscribe, refresh persistence, opening notification and cooldown/repeated-open protection.
- [x] **C09 Commission steps and configurable brief options** — All eight blocks exercised in mobile Order22: characters, background, rush, NDA, canvas, pose, scope and custom answers; required fields, terms and navigation.
- [x] **C10 References, removal and invalid/oversized attachments** — Browser attachment removal/reselection; real HTTP six-file rejection,10MB limit and partial-upload cleanup with no saved request.
- [x] **C11 Draft preservation and successful form reset** — Past-date and corrupt-image errors preserve entered text/date; cancel preserves draft; successful service2 resets only itself and leaves service3 draft intact.
- [x] **C12 Exact prices, deposits and immutable price/terms snapshots** — Displayed/persisted decimal totals;0%,50%,100% deposits; half-up cents; later service/policy edits preserve original request total and terms.
- [x] **C13 Proposals and repeated/invalid actions** — Pending, withdrawal, acceptance, decline information and linked orders; repeated withdrawal/decline/acceptance and capacity-change rejection.
- [x] **C14 Direct inquiry and estimator continuation** — Guest sign-in returns to draft; selections reach a meaningful pending order; corrected overlong inquiry and double-submit guard; deliberate outage retains input.
- [x] **C15 Orders, deep links and progress** — Empty dashboard, New Request, correct artist/brief/price, refresh/back/direct links, cancellation and missing/unauthorized orders; accepted-to-completed journey.
- [x] **C16 Invoices and payment proofs** — Deposit/final totals, image/PDF slips, invalid and15MB limits, retained proof after failed replacement, pending/approved states and duplicate approval.
- [x] **C17 Order chat** — Real send/receive and persistence, supporting separate actor updates, length and empty-input guards; whitespace-only server writes now rejected.
- [x] **C18 Revisions and feedback** — Permitted stages, client submission, quota, resolution and useful rejected completion/feedback states; blank feedback cannot consume quota.
- [x] **C19 Protected references, WIP and original files** — Reference access, watermarked WIP, unpaid final-image preview/non-image restrictions, paid original downloads, filenames and matching bytes.
- [x] **C20 My Collection** — Completed commissions and won auctions appear; authenticated images load; PDF filename/title/actions remain readable on mobile; exact original download verified.
- [x] **C21 Auction listing, scheduled start, countdown and no-bid expiry** — List/detail/filter/back behavior; future auction13 has no bid control before start, opens automatically and closes automatically with zero bids/winner/orders.
- [x] **C22 Bids, outbid, anti-sniping, auto-buy and auction order continuation** — Min/increment/own-highest rules, live outbid, anti-sniping, win/lose, order/invoice and auction chat; expiry/auto-buy storage fault rollback and safe retry create exactly one result.
- [x] **C23 Notifications** — Panel open/close/Escape, unread/read/read-all persistence and correct destinations; known generated copy localizes and authored text is retained.
- [x] **C24 Client profile and identity** — Name/avatar save and refreshed identity; corrupt and5MB avatar failures preserve records.
- [x] **C25 Verified reviews** — Existing verified review form used after completed Order21; saved five-star review visible. Earlier claim of a missing review interface was disproved.
- [x] **C26 English/Thai navigation and saved briefs** — Known labels/enums/booleans/options and invoice titles localize, query route survives language change, saved answers/artist wording stay verbatim; missing historical question labels are generic.
- [x] **C27 Appearance, keyboard and mobile navigation** — 15 palettes, grid/masonry/compact, local background/opacity/removal, persistence, modal focus/Escape and mobile navigation; core client commission22/auction6 completed at390px.

Shared permissions, recovery, upload, transaction, date and setup checks also apply. All mandatory groups above pass; no mandatory failed, blocked or not-run group remains. Extended browser/load/permutation limits are explicit in the report. Earlier counts, original failures and unresolved notes are preserved in CHECKLIST_HISTORY_BEFORE_FINAL_2026-11-14.md and are superseded only by the evidence stated in the current report. The earlier blocked native deadline entry is now browser-confirmed, not blocked.
