# Current role review status

This role is actively reviewed. Project writes and built-in browser control work. The following older checklist is preserved as historical evidence; its blocked/unapplied labels are superseded by ../REPAIR_PROGRESS_2026-11-13.md and the dated browser ledger. Deep coverage remains incomplete. There are no empty passing tests.

---

> Update: built-in browser is restored and initial role-page checks were performed. Older "browser blocked" entries below describe the earlier checkpoint, not current control availability. See ../BROWSER_REVIEW_2026-11-13.md and ../BROWSER_CHECKLIST_2026-11-13.md for current failures/passes/limits. Repairs are approved but blocked on project writes; deep checks remain incomplete.

# Artist review checklist - 13 November 2026

This role is now actively reviewed. Backend and source checks are separate from browser confirmation. No browser pass is claimed while VS Code preview control is unavailable. See ../REVIEW_2026-11-13.md for findings and evidence.

1. **Orders - browser blocked.** Backend progression, quote/invoice limits, WIP/final access, chat/revisions, payment and delivery checked. F02/F04/F11 fail; browser controls and file preview paths blocked.

2. **Commissions - browser blocked.** Service/add-on/policy/schema writes, ownership, capacity conflicts, accept/decline/withdraw repeats, subscriptions/cooldown and reference count/cleanup checked. F09/F13 fail; draft switching, every form block and modal interactions blocked.

3. **Earnings and Stats - browser blocked.** All four periods and artist/platform scoping checked. F01 fails. Chart rendering, selected-period labels and empty/error states blocked.

4. **Gallery - browser blocked.** Create/edit/hide/delete/ownership and image bytes checked. Browser filter/edit/upload interaction and responsive layouts blocked.

5. **Profile - browser blocked.** Backend text/styles/zero starting price persisted. Image picker, refreshed identity, validation, zero-price display and recovery blocked.

6. **Auctions - browser blocked.** Decimal bids/increments, highest bidder, owner restriction, auto-buy/duplicate, future bids, no-bid close, expiry order/invoice and chat length checked. Browser publish/chat/close controls, previews and dates blocked.

7. **Original characters - browser blocked.** Create/edit/ownership and unlink recovery checked. F05 fails on linked deletion. Browser card/editor controls blocked.

8. **Watermark - browser blocked.** F08: shared save endpoint rejects artist writes. Actual editor presets/preview/upload/keyboard controls blocked.

Cross-cutting browser checks remain blocked: English/Thai, desktop/mobile, keyboard/focus/Escape, route guards during account switching, refresh/back navigation, visible recoverable errors, draft preservation and real two-session updates. Onboarding/signup and every registration edge also need the role-specific browser journey.
