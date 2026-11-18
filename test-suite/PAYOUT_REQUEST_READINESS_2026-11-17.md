# Artist payout request verification — 17 November 2026

Branch: `feature/artist-payout-requests`, based on payment commit `c0b3a1f`. Changes are local and uncommitted. No merge or push performed. Academic documents and statistical data were not edited.

## Result

**232 automated checks passed; 0 failed; 0 skipped.** This retains the existing 208 checks and adds 24 payout-request regressions. Sequential combined runner: client Python 45, shared Python 126, legacy isolated Python 18, Node 43. Frontend TypeScript check passed separately. Final combined log: `reports/payout-requests/combined-checks.log`; type-check log: `reports/payout-requests/frontend-typecheck.log`.

An initial combined run had one test-harness failure: the new submission fault-injection test patched a helper after its route import, so it did not actually inject a failure. It was corrected to fail the real database commit boundary; its focused rerun and final combined run passed. The initial log is retained as `combined-checks-initial.log`. No production safeguard or assertion was weakened.

The 24 new regression scenarios cover:

1. Full request → claim → exact-net QR → transfer record → artist confirmation; exact gross/fee/net and balances.
2. Receiving-name/mobile validation, mobile normalization, profile versions and private reads.
3. Optional QR import: valid/invalid images, no implicit profile save or ownership-verification claim.
4. Missing profile, empty/duplicate/non-integer/invalid selections, ownership and whole-order rules.
5. Unpaid, cancelled, uncollected and zero-net exclusions.
6. Stale receiving profile and stale financial preview rejection.
7. Frozen destination after profile edits; masked history lists.
8. Idempotent submission without duplicate request/audit/notifications.
9. Concurrent artist submissions reserve an order once.
10. Cancellation/rejection reason, history and reservation release, followed by resubmission.
11. Legacy admin payout conflict and financial/status-edit blocking while reserved.
12. Competing admin claims, stale versions, claiming-admin release restrictions and no-transfer confirmation.
13. Client/other-artist/other-admin access boundaries for details, QR, transfer, acknowledgement and proofs.
14. Invalid, disguised and oversized proofs leave no settlement or orphaned upload.
15. Concurrent/repeated transfer recording produces one settlement and one evidence file; changed evidence is rejected.
16. Transfer commit failure rolls back settlement, audit, notifications and file while retaining the reservation.
17. Problem reporting, admin resolution note and later receipt confirmation never change money or permit a second payout.
18. Out-of-band changes to frozen financial inputs block transfer recording.
19. WebSocket notification follows commit; failed delivery leaves the persisted notification.
20. Legacy zero fee and mixed historical/platform receipt totals remain exact.
21. Repeated additive startup preserves existing orders/payouts and creates no fictitious requests.
22. Request submission commit failure leaves no partial request, audit, reservation or notification.
23. Multiple whole orders round fees per order before aggregation and settle together exactly once.
24. Valid PDF transfer proof remains private and is accessible to its owning artist.

## Browser confirmation

Used the built-in Chromium browser, one session at a time, against frontend `127.0.0.1:3002` and backend `127.0.0.1:8002`. Database and uploads are isolated in `work/payout-requests-preview`, outside the checkout. All identities, receiving data and evidence are disposable QA examples. No real money was transferred.

**Both mandatory payout journeys passed; 0 failed or blocked.**

- Commission: real backend invoice instructions → sample client slip → artist manual approval → completed order → artist receiving-profile save and payout request → admin claim → exact-amount QR display/download → sample evidence upload and manual transfer recording → artist confirmation → browser refresh. English desktop, 1440×1000. Gross ฿1,000, frozen fee 5% (฿50), net ฿950.
- Auction: backend auto-buy finalization and real invoice/slip/approval → completed order → Thai artist request → Thai admin claim and proof recording → artist problem report → supporting separately authenticated admin API resolution note → Thai artist receipt confirmation → browser refresh. Mobile viewport 390×844. Gross ฿2,000, fee ฿100, net ฿1,900.

Commission orders were disposable setup fixtures; this review did not repeat the unrelated discovery/commission-form journey. Existing commission/auction creation regressions remained in the combined run. The new request, claim, proof upload, problem and confirmation controls were exercised through the browser. The supporting admin resolution note used the real protected API; its screen control was implemented and type-checked, while the state/authorization behavior was covered by the backend regression.

Additional observed browser outcomes: available/requested/transferred balances are separate; reserved orders disappear from eligible selection; references/proofs persist; request/transfer/receipt labels are bold and distinct; mobile page width is 390 px with no horizontal document overflow; dialogs fit the viewport; Tab produces visible focus; Escape dismisses the dialog; payout notifications persist and link to their request.

Final independent ledger read: platform collections 300,000 satang, total fees 15,000, recorded payouts 285,000; eligible/requested balances both zero; exactly two settlements; both receipts confirmed. Request acknowledgement and issue resolution did not create extra transfers.

Browser evidence is retained in ignored `reports/payout-requests/`:

- `commission-receipt-confirmed-desktop.jpg`
- `auction-receipt-confirmed-mobile.jpg`
- `notification-link-before-fix.jpg` and `notification-link-after-fix.jpg`
- `admin-mobile-role-label.jpg`

## Reported findings

New payout integration defect, repaired: from an already-open earnings page, opening a notification changed `?request=` but did not reopen the corresponding request dialog. Reported before repair. The panel now responds to query changes and removes the request query when closed. Browser regression: close request, open a different request from notifications, verify the correct modal, keyboard focus and receipt state. Passed; original evidence retained.

Existing unrelated minor defect, **not repaired in this branch**: admin's Thai mobile navigation menu identifies System Admin as “นักวาด” rather than “ผู้ดูแล”. Reproduction: sign in as demo admin, use mobile viewport, open the main navigation menu. Expected administrator role label; actual artist label. Severity: low (P3), cosmetic; administrator authorization remained correct. Reported during work; evidence in `admin-mobile-role-label.jpg`. This remains outside the payout module's mandatory scenario results.

## Limits and handoff

No real bank verification or transfer, ownership verification, banking-limit certification, financial correction/reversal workflow, production load test, PostgreSQL/multi-worker certification or Firefox/WebKit run is claimed. Concurrent-write checks used separate sessions against isolated SQLite databases. Live notification display and protected destination navigation were observed; commit-before-broadcast and offline recovery were verified by isolated regression.

Operating and implementation instructions are in `docs/PROMPTPAY_SETUP.md` and `docs/ARTIST_PAYOUT_REQUESTS.md`. The latter identifies future Chapter 3 schema/diagram and Chapter 4 screenshot changes. Word files and locked statistics remain unchanged. Generated evidence is excluded from Git. All source/test/instruction changes remain uncommitted on the new branch.
