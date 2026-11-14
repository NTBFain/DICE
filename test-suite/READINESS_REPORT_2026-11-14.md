# DICE demonstration readiness —14 November2026

The defined local demonstration journeys have no remaining known reproducible defects after the reported repairs and targeted regressions. This is an academic demonstration review across client, artist and admin, not a guarantee that undiscovered bugs do not exist.

## Current results

- Mandatory capability groups: **61 passed,0 failed,0 blocked,0 not run**. These reconcile retained browser evidence against current source and add the final regressions; they are not61 new independent browser executions.
- Actual final automated run: **163 passed,0 failed,0 blocked,0 not run**:45 client Python,57 shared Python,18 isolated older Python checks and43 Node checks. The original98 focused checks were retained and expanded; focused checks now total145, plus18 older checks.
- Frontend TypeScript check and Git whitespace check pass.86 installed source/test files match their reviewed candidates and the affected frontend files match the preview mirror. Formatting cleanup preserved existing layout content.
- Actual empty-database clean start and repeated startup pass with demo disabled(0 demo accounts) and enabled(3 accounts). The isolated preview is running normally, demo mode enabled and all designated fault controls off.

Read [the capability results](ROLE_CAPABILITIES.json) for each role area, exact observed outcomes and evidence. [The current inventory](INVENTORY_CURRENT.json) records34 page routes,506 interactive/control definitions, their handlers/navigation/API call sources and93 mounted backend actions. Repeated list rows count as one source definition. Source mapping alone is not a passing browser test for every control instance.

## Final repairs and regressions

- **F48/P1 — auction transaction integrity.** Original browser fault on disposable auction10 left ENDED/no winner/order. Expiry and auto-buy now commit status, winning bid, order and invoice together and roll back on failed writes. Nine regressions cover order/invoice faults, safe retries, stale expiry, repeated and competing finalization. Actual browser faults on11/12 left ACTIVE/no partial result; retries created exactly Order29/30 and one invoice each.
- **F49/P2 — auction phase/recovery controls.** Expired cached auctions no longer offer bids during failed finalization; useful finalizing/error/Retry states appear. Browser auction13 had no bid control before start, opened automatically and ended without bids/winner/order. No page refresh or shortened deadline was used for this start/end check.
- **Selected Bangkok/draft behavior.** Frontend/backend use Bangkok’s calendar. Deadline midnight/year boundaries pass. Request13 retained2026-12-14 through Order31. Failed/cancelled drafts and another service’s unfinished draft remain; only the successfully submitted service resets.
- **F50/P2 — readable bilingual saved briefs.** Additive readonly commission_brief comes only from an authorized linked saved request. English/Thai structured fields replace raw metadata in client/artist/admin views. Terms, answers, amounts and artist-authored text remain unchanged. Unrecoverable historical question labels use Additional answer/คำตอบเพิ่มเติม; old descriptions remain fallback.
- **F51/P2 — system labels.** Artist inbox statuses, canonical commercial licenses, legacy canvas choices and standard generated deposit/final invoice titles render in the selected language. Unknown/custom text remains verbatim.
- **F52/P2 — missing artwork categories.** Shared artist/admin editor now offers all eight supported categories; saved Commission artwork no longer appears as Illustration. Browser change/reopen/restore/refresh and16 real HTTP category roundtrips pass.
- **F53/P2 — blank failed data pages.** Active network/server query failures show a bilingual recovery notice with Retry. Actual analytics503 blank-page failure was preserved; Retry restored its real totals. Inactive cached errors and expected permission/missing-record responses do not produce stale global notices.
- **F54/P2 — blank server messages/revisions.** Whitespace-only order chat/revision requests reject before persistence or quota consumption. Existing browser empty-message guard remains. Real HTTP expiry, quota and valid feedback regressions pass.
- **F55/P2 — PDF proof review.** Accepted PDF slips no longer render as broken images. Their authenticated document action downloads the actual PDF for review, with modal focus/dismissal. Browser download matched the uploaded sample bytes; unauthorized access and failed-replacement preservation pass. Image slips retain image previews.
- **F56/P2 — collection overlap.** Mobile file names, long titles and navigation actions now occupy separate areas below the preview. Browser mobile layout fits without horizontal overflow, and the client’s downloaded original matches delivery bytes.
- **Repeatable setup.** Demo seeding and quick credentials require explicit DEMO_MODE. A one-time setup generates and privately preserves a signing secret; configured database failure no longer silently switches data. New demo images are bundled locally. Older live/configured-database scripts now use disposable databases/uploads and do not print tokens.
- **Embedded-browser usability.** Commission-hub acceptance/save messages remain in the page instead of native alerts that repeatedly interrupted embedded control. This is recorded separately from new product-defect totals.

## Complete journeys and role verification

- **Client commission:** discovery, all-eight-block brief, references/deadline/terms, acceptance, deposit, WIP/chat/revision, final payment, protected original and collection. Browser client actions completed desktop Order18 and mobile Order22; supporting role APIs are recorded.
- **Client auction:** mobile auction6 covered initial/invalid/own-highest bids, outbid, anti-sniping, auto-buy, chat, order/invoice, sample payment, delivery/download and collection. Auction7 verified the losing client’s expiry/permissions outcome;13 covered real scheduled-start/no-bid expiry. Finalization fault/retry checks used11/12.
- **All-primary-role desktop:** Order21’s admin manual ticket, artist workflow and client payment/download/review used the browser for primary actions, with real setup/evidence reads.
- **Artist mobile:** fresh Request13→Order31 completed in Thai at390px: browser acceptance, own queue, deposit approval, sketch/WIP/chat, feedback resolution, coloring/final PDF, unpaid-completion rejection, final approval and completion. Supporting client API actions were sample proof uploads and revision9. Client browser then confirmed paid delivery, exact original PDF and collection.
- **Admin:** browser account search and disposable role changes survived refresh; cancel and actual deletion of disposable account9 passed. Global queues/finance, catalogue categories, themes, homepage settings and watermark controls retain earlier verified actions with current targeted checks and mobile inspection. Live role reduction, authorization and financial isolation regressions pass.

No real money was transferred. The deliberately broken original auction10 and original failed-test/screenshots are retained as evidence. They are disposable review data, not a clean demo seed. The clean demonstration database does not inherit review records.

## Limits and honest counts

Extended methods/permutations: **0 failed,1 blocked,3 not run**; these are separate from mandatory acceptance. Independent simultaneous browser contexts are unavailable because built-in tabs share authentication; the approved separately authenticated API/WebSocket substitute was used. Firefox/WebKit, production load/multi-worker certification and exhaustive permutations are not run. No claim is made that every possible input or506 control definitions were independently clicked. Representative desktop/mobile layouts were visually inspected; screenshot scaling limits exact pixel certification.

Known generated labels are bilingual; custom prose and original descriptions are preserved. This does not certify every custom text/layout/error combination. The current inventory and per-capability limitations replace stale historical pass totals. Prior reports remain as original evidence; F21 was not a finding, and the preliminary missing-review claim was disproved by the existing verified-review form.

## Run and demonstrate

Use [local setup](../docs/DEMONSTRATION_SETUP.md) and [the short demonstration script](../docs/DEMONSTRATION_SCRIPT.md). Run focused checks sequentially with the project’s Python environment: `python test-suite/run_checks.py --legacy`. This runner uses a temporary working directory, database and signing secret; it does not contact a running server. Install frontend dependencies before the small TypeScript-helper checks.

Changes remain on **edit_1**, HEAD **016c492**. No commit, merge, push or branch change was performed. Existing unrelated work and failure evidence were preserved.
