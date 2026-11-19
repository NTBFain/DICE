# Stripe PromptPay confirmation and artwork delivery

DICE can use a Thai Stripe platform account to create a hosted PromptPay checkout for each eligible invoice. Stripe confirms the payment through a signed webhook. DICE records the confirmed gross amount against the correct order and uses the existing fee snapshot and manual artist payout process. Uploading a file as FINAL marks it ready for delivery. The existing protected download route then serves the original once all issued invoices are paid and their total covers the agreed price.

## Test setup

1. Use a disposable database and uploads directory. Enable PromptPay in the test account's default payment method configuration. DICE excludes cards and checks that Stripe returns PromptPay as the only eligible method. Disable any other methods that Stripe lists for this checkout before retrying. Set `STRIPE_CHECKOUT_ENABLED=true`, `STRIPE_SECRET_KEY` to the Stripe test secret key, and `STRIPE_RETURN_ORIGIN=http://localhost:3000` (or your actual frontend origin) in the ignored backend environment file. For live mode the return origin must use HTTPS. Keep keys on the backend.
2. Log in to the same sandbox using `stripe login`. Start Stripe's webhook forwarder against the DICE backend:

   ```powershell
   stripe.cmd listen --events "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,refund.created,refund.updated,refund.failed" --forward-to http://127.0.0.1:8000/api/payments/stripe/webhook
   ```

   Keep the event list quoted in Windows PowerShell. If the CLI prints an invalid-event warning before `Ready!`, correct the command and restart the listener. Set `STRIPE_WEBHOOK_SECRET` to the secret from that listener, then start or restart the backend. Hosted environments use their registered snapshot endpoint's signing secret and the same event list.
3. As the client, open an unpaid invoice without an existing slip or manual instruction and select **Pay with PromptPay**. Complete checkout using Stripe's test flow. Check that DICE shows the invoice as paid after the webhook arrives. The browser return URL has no authority to mark an invoice paid.
4. Check both orderings: upload a FINAL before payment and confirm that the client sees only the existing preview or restriction until payment, and pay before a FINAL upload and confirm delivery becomes available after upload.
5. Complete a ฿1,000 order with a 5% fee snapshot. As the artist, open Earnings & Statistics and request the ฿950 share. In the isolated demo, use dummy transfer evidence only. As the admin, claim and record the test payout, then confirm receipt as the artist. Check the three statuses and the numbers after refresh. Never execute a bank transfer for a sandbox payment.
6. On another test order, issue a refund in Stripe's sandbox and check the order and payout request for the hold. Check the refund before claiming a request, after claiming it, and after recording a dummy payout. Confirm that a recorded payout remains visible and is flagged for review.

Checkout creation stays disabled by default. Existing manual instructions and slips continue through manual review. Invoices already tied to Stripe cannot be manually approved or moved back to slip payment by disabling checkout. Keep the signed webhook running when pausing new checkout creation so pending payments can finish.

## Operations

Keep funds in the configured platform provider account and verify payout availability against the provider's balance before transferring externally. DICE calculates the artist's share from confirmed gross and the existing DICE fee, without subtracting Stripe fees. Confirm who absorbs those charges before launch.

Live checkout creation also requires `STRIPE_LIVE_CHECKOUT_ENABLED=true`. Leave it false until the sandbox checks pass and Stripe confirms the platform's live settlement arrangement. Use separate test and live databases and endpoint signing secrets.

DICE receives signed refund events and places the entire order on payout hold for pending, action-required, or successful refunds, including partial refunds. A failed or cancelled refund releases that refund's hold unless it had already been recorded as successful, which needs manual reconciliation. The original paid invoice, artwork access and transfer history are kept. A successful refund remains on hold pending a future financial adjustment workflow. DICE does not issue refunds, reverse transfers, or synchronize disputes.

Check the Stripe payment and refund status immediately before making an external transfer. A webhook can be delayed or the QR may already have been downloaded. If a refund arrives after the bank transfer, resolve it manually in Stripe and with the artist. Preserve any DICE transfer record that already exists, and retain external evidence for any transfer that the hold prevented DICE from recording.

A checkout marked for payment review never unlocks the invoice or adds to the payout balance. Review Stripe deliveries and replay failed webhook events. A pending session can be retried after Stripe reports it expired or failed. If a creation or reconciliation remains blocked, resolve it with the provider before taking another payment for that invoice.

See [Stripe PromptPay](https://docs.stripe.com/payments/promptpay), [Stripe webhook delivery](https://docs.stripe.com/webhooks), and [Stripe refunds](https://docs.stripe.com/refunds).
