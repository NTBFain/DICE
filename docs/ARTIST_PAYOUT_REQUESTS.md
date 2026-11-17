# Artist payout requests

Local development branch: `feature/artist-payout-requests`. No commit, merge or push is part of this change.

Clients continue to pay the platform. Requesting a payout reserves whole eligible orders; it does not send money. Administrators transfer externally and record evidence. Artist receipt acknowledgement is separate from the transfer record.

## Data and upgrade

Five additive SQLModel tables are registered through `models/__init__.py` and created by the existing `init_db()` startup migration path:

- `ArtistPayoutProfile`: artist-owned receiving name, normalized mobile number and optimistic version.
- `PayoutRequest`: frozen destination, fee/gross/net totals, quote fingerprint, claimant, version and optional unique `ArtistPayout` link.
- `PayoutRequestItem`: frozen whole-order amounts and fee rates; unique request/order pair.
- `PayoutReservation`: one active reservation per order, enforced by the primary key.
- `PayoutRequestEvent`: append-only action, actor, reason, version and timestamp history.

Existing `ArtistPayout`, `PayoutItem`, invoice `is_paid` and order-status enums remain compatible. No historical requests or receipt acknowledgements are invented. Back up the selected database and its uploads together before restarting the upgraded backend. New tables need no destructive table rebuild. Repeated startup preserves existing records.

## Protected API

All paths below have prefix `/api/payments`. JSON bodies reject extra fields.

- `GET /receiving-profile`: authenticated artist's own profile, or null.
- `PUT /receiving-profile`: `account_holder_name`, `mobile_number`, `version` (0 for creation); later saves require the current version.
- `POST /receiving-profile/import-qr`: multipart `qr`; validates a single mobile-linked PromptPay QR without saving it or verifying ownership.
- `POST /payout-requests/preview`: `order_ids`; returns the receiving snapshot, profile version, per-order totals and quote digest.
- `POST /payout-requests`: `order_ids`, `profile_version`, `quote_digest`, `idempotency_key` (16–100 characters). Retries with the same key/body return the same request; changed selections require a new key.
- `GET /payout-requests?offset=0&limit=20`: artist-owned or admin-wide history; mobiles masked. Maximum page size 100.
- `GET /payout-requests/{id}`: authorized detail with frozen receiving data, items, audit events and protected transfer-proof link.
- `POST /payout-requests/{id}/actions/{action}`: `version`, optional `note`, optional `no_transfer_made`.
- `GET /payout-requests/{id}/qr`: authenticated, read-only PNG download, limited to the claiming admin while processing. Exact net amount and frozen mobile recipient.
- `POST /payout-requests/{id}/transfer`: multipart `version`, `transfer_reference`, `proof`. Repeating identical reference/proof returns the same settlement; different evidence after settlement is rejected.
- Existing `GET /payouts/{id}/proof` remains restricted to the owning artist or an admin.

Private request/profile/QR responses use `private, no-store`. Receiving numbers are full only in the owner's profile or authorized request detail/preview. Lists mask them. User-entered names are not bank-verified recipient names.

## State rules

`REQUESTED → PROCESSING → TRANSFER_RECORDED`. `cancel` (owner) and `reject` (admin, reason required) are available only in `REQUESTED`; both release reservations. `claim` requires an admin and the current version. `release` requires the same claiming admin, a reason and `no_transfer_made: true`; it returns to `REQUESTED`. Claims never expire automatically.

After transfer, receipt state is separately `PENDING → CONFIRMED` or `PENDING → ISSUE_REPORTED → CONFIRMED`. Only the owning artist can `confirm` or `problem`; a problem requires a reason. Admin `note` appends a resolution note while an issue is reported. It cannot confirm receipt for the artist or change the transfer. All old issue notes remain visible.

## Accounting and transaction boundaries

Eligibility requires completed, fully paid orders with explicit platform receipts, positive net and neither a settlement nor another reservation. Historical paid invoices alone do not count. Integer-satang amounts and frozen basis-point fee rates use the existing half-up calculation **per order before aggregation**. Gross ฿1,000 at 500 basis points produces fee ฿50 and artist net ฿950. Legacy zero-fee snapshots remain zero. Cancelled receipts remain visible for manual resolution; zero net is labelled no payout due.

Request submission serializes artist/profile changes, locks selected orders in ascending order, rechecks the preview, then writes the request, items, reservations, audit and notifications in one transaction. A primary-key reservation prevents overlaps. Financial/status routes reject reserved orders. Existing admin payout endpoints reject reserved orders too.

Lifecycle actions serialize the request row and enforce its optimistic version. Transfer recording rechecks the claimant, locks the whole-order selection, verifies the frozen fingerprint/totals, and reuses `persist_payout`, the same settlement writer used by legacy admin payouts. Unique `PayoutItem.order_id` prevents duplicate settlement. Transfer, reservation release, audit and notifications commit together. Failed or replay uploads are removed; successful evidence is immutable. WebSocket notifications are sent only after commit; failed delivery leaves persisted notifications available.

Neither QR display nor downloading, requesting or acknowledging a payout invokes a bank API. Downloaded QR images cannot be revoked; administrators must coordinate before releasing a claim. Financial corrections, reversals and extra transfers require a future adjustment workflow.

## Screens and documentation impact

Artist: Earnings & Statistics (`/en/dashboard/artist/analytics`, `/th/dashboard/artist/analytics`). Admin: Payments & Payouts (`/en/dashboard/admin/payments`, `/th/dashboard/admin/payments`); the shared ledger also appears in admin statistics. Notification links open the relevant request, including navigation within an already-open ledger page.

Thai operating instructions: [PromptPay setup](PROMPTPAY_SETUP.md).

Academic documents remain unchanged. Future authorized updates should add these five tables and their relationships to Chapter 3's ER/schema diagram; add the payout-request state flow and receipt acknowledgement flow; and replace Chapter 4's artist earnings/admin payment screenshots with the new profile, review, request history, claim, transfer evidence and receipt/problem controls. Do not alter Chapter 4 section 4.2 or its statistical content.
