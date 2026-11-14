# Current role review status

This role is actively reviewed. Project writes and built-in browser control work. The following older checklist is preserved as historical evidence; its blocked/unapplied labels are superseded by ../REPAIR_PROGRESS_2026-11-13.md and the dated browser ledger. Deep coverage remains incomplete. There are no empty passing tests.

---

> Update: built-in browser is restored and initial role-page checks were performed. Older "browser blocked" entries below describe the earlier checkpoint, not current control availability. See ../BROWSER_REVIEW_2026-11-13.md and ../BROWSER_CHECKLIST_2026-11-13.md for current failures/passes/limits. Repairs are approved but blocked on project writes; deep checks remain incomplete.

# Admin review checklist - 13 November 2026

This role is now actively reviewed. Backend and source checks are separate from browser confirmation. No browser pass is claimed while VS Code preview control is unavailable. See ../REVIEW_2026-11-13.md for findings and evidence.

1. **User Control - browser blocked.** List/role change/profile registration, self-delete prevention and configured client deletion cascade checked. F06 fails for artist deletion. Search/filter/toggle/delete confirmation controls and stale role state blocked.

2. **Platform Stats - browser blocked.** Global invoice total and period endpoints checked. Artist-scope defect F01 is separate. Graphs, empty/error states and selected-period rendering blocked.

3. **All Queues - browser blocked.** Shared order/payment/files/chat/revisions backend flow checked. F04/F11 fail; Add Order client-name wiring is part of F02. Workspace navigation/error feedback and file controls blocked.

4. **All Portfolios - browser blocked.** Global visibility plus owner/admin catalog APIs checked. Browser filtering, create/edit/delete and validation interactions blocked.

5. **All Auctions - browser blocked.** Shared create/bid/expiry/winner/invoice behavior checked. Browser moderation/chat/image upload and duplicates blocked.

6. **All OCs - browser blocked.** Shared character ownership/CRUD checked. F05 linked-delete failure applies. Browser CRUD controls blocked.

7. **Theme Studio - browser blocked.** Source/button wiring inspected; two preview-only buttons intentionally have no action. Custom-theme immediate application is a source candidate. All custom save/apply/delete, persistence, validation and layout interactions blocked.

8. **Homepage Copy - browser blocked.** API persistence and live public HTML checked; F10 fails. Actual editor save/preview/error controls and locale behavior blocked.

9. **Watermark Tool - browser blocked.** Admin save and invalid-image extension rejection checked; F07 atomicity fails. Actual previews/presets/logo swap/download/validation interactions blocked.

10. **Legacy direct Profile route - browser blocked.** F12: artist-profile API returns 404 for admin without an artist profile. This route is not in normal admin navigation. Actual route presentation blocked.

Cross-cutting browser checks remain blocked: English/Thai, desktop/mobile, keyboard/focus/Escape, route guards during account switching, refresh/back navigation, visible recoverable errors, draft preservation and real two-session updates. Onboarding/signup and every registration edge also need the role-specific browser journey.
