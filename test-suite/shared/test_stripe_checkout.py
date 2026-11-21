"""Checkout and delivery integration using signed fixtures and disposable storage."""
import hashlib
import hmac
import json
import time
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch
from urllib.parse import parse_qs

from sqlmodel import Session, select

import test_promptpay_payments as payment_tests
import test_payout_requests as payout_tests
from core.config import settings
from models import MilestoneInvoice
from models.checkout import PromptPayCheckout
from services.stripe_checkout import create_provider_session


class StripeCheckoutTests(TestCase):
    tearDown = payment_tests.PromptPayTests.tearDown
    request = payment_tests.PromptPayTests.request
    pay = payment_tests.PromptPayTests.pay
    approve = payment_tests.PromptPayTests.approve
    instruction = payment_tests.PromptPayTests.instruction
    config = payment_tests.PromptPayTests.config
    quote = payment_tests.PromptPayTests.quote
    profile = payout_tests.PayoutRequestTests.profile
    preview = payout_tests.PayoutRequestTests.preview
    submit = payout_tests.PayoutRequestTests.submit
    act = payout_tests.PayoutRequestTests.act
    transfer = payout_tests.PayoutRequestTests.transfer
    get = payout_tests.PayoutRequestTests.get

    def setUp(self):
        payment_tests.PromptPayTests.setUp(self)
        config = patch.multiple(settings, STRIPE_CHECKOUT_ENABLED=True, STRIPE_SECRET_KEY="sk_test_fixture",
                                STRIPE_WEBHOOK_SECRET="whsec_fixture", STRIPE_RETURN_ORIGIN="http://localhost:3000")
        config.start()
        self.addCleanup(config.stop)
        provider = patch("services.stripe_checkout.create_provider_session", side_effect=self.provider_response)
        self.provider = provider.start()
        self.addCleanup(provider.stop)

    @staticmethod
    def provider_response(attempt):
        return {"id": "cs_test_" + attempt.id, "url": "https://checkout.stripe.com/c/pay/" + attempt.id,
                "client_reference_id": attempt.id, "livemode": False, "currency": "thb",
                "amount_total": attempt.amount_satang, "payment_method_types": ["promptpay"]}

    def open_checkout(self, role="client"):
        return self.request("POST", f"/api/payments/invoices/{self.invoice_id}/checkout", role)

    def attempt(self):
        with Session(self.engine) as session:
            return session.exec(select(PromptPayCheckout).where(
                PromptPayCheckout.invoice_id == self.invoice_id
            ).order_by(PromptPayCheckout.created_at.desc())).first()

    def send_event(self, *, valid=True, age=0, event_type="checkout.session.completed", **overrides):
        attempt = self.attempt()
        data = {"id": attempt.provider_session_id, "client_reference_id": attempt.id, "mode": "payment",
                "payment_status": "paid", "currency": "thb", "amount_total": attempt.amount_satang,
                "livemode": False, "payment_intent": "pi_" + attempt.id}
        data.update(overrides)
        return self.signed_event(event_type, data, valid=valid, age=age)

    def signed_event(self, event_type, data, *, valid=True, age=0, live=False):
        body = json.dumps({"type": event_type, "livemode": live, "data": {"object": data}}).encode()
        timestamp = str(int(time.time()) - age)
        signature = hmac.new(b"whsec_fixture", timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
        return self.client.post("/api/payments/stripe/webhook", content=body,
                                headers={"stripe-signature": f"t={timestamp},v1={signature if valid else 'bad'}"})

    def refund(self, status, event_type="refund.updated", *, suffix="main", **options):
        return self.signed_event(event_type, {"object": "refund", "id": "re_" + suffix,
            "payment_intent": "pi_" + self.attempt().id, "status": status, "amount": 1000}, **options)

    def complete_order(self):
        path = f"/api/orders/{self.order_id}"
        uploaded = self.request("POST", path + "/files", "artist",
            data={"file_type": "FINAL"}, files={"file": ("final.png", self.png, "image/png")})
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        completed = self.request("PATCH", path, json={"status": "COMPLETED"})
        self.assertEqual(completed.status_code, 200, completed.text)

    def ledger(self, role="artist"):
        response = self.request("GET", "/api/payments/ledger", role)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def is_paid(self):
        with Session(self.engine) as session:
            return session.get(MilestoneInvoice, self.invoice_id).is_paid

    def test_client_only_checkout_and_manual_bypass_is_blocked(self):
        for role in ("artist", "admin", "otherclient"):
            self.assertEqual(self.open_checkout(role).status_code, 403)
        self.assertEqual(self.pay().status_code, 409)
        self.assertEqual(self.approve().status_code, 409)
        self.assertEqual(self.instruction().status_code, 409)
        response = self.open_checkout()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.open_checkout().json(), response.json())
        self.assertEqual(self.provider.call_count, 1)
        self.assertFalse(self.is_paid())

    def test_checkout_uses_dashboard_payment_methods_and_rejects_non_promptpay_sessions(self):
        self.assertEqual(self.open_checkout().status_code, 200)
        attempt = self.attempt()
        with patch("services.stripe_checkout.urlopen") as provider:
            provider.return_value.__enter__.return_value.read.return_value = b"{}"
            create_provider_session(attempt)
            fields = parse_qs(provider.call_args.args[0].data.decode())
        self.assertNotIn("payment_method_types[0]", fields)
        self.assertEqual(fields["excluded_payment_method_types[0]"], ["card"])
        self.assertEqual(fields["client_reference_id"], [attempt.id])

        self.assertEqual(self.send_event(event_type="checkout.session.expired", status="expired",
                                         payment_status="unpaid").status_code, 200)
        self.provider.side_effect = lambda new_attempt: self.provider_response(new_attempt) | {
            "payment_method_types": ["promptpay", "link"]}
        self.assertEqual(self.open_checkout().status_code, 502)
        self.assertFalse(self.is_paid())

    def test_signed_confirmation_is_idempotent_and_unlocks_final(self):
        order_path = f"/api/orders/{self.order_id}"
        uploaded = self.request("POST", order_path + "/files", "artist",
                                data={"file_type": "FINAL"}, files={"file": ("final.png", self.png, "image/png")})
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        download = order_path + f"/files/{uploaded.json()['id']}/download"
        before = self.request("GET", download, "client")
        self.assertIn(before.status_code, (200, 402))
        self.assertNotEqual(before.content, self.png)
        self.assertEqual(self.open_checkout().status_code, 200)
        self.assertEqual(self.send_event(valid=False).status_code, 400)
        self.assertEqual(self.send_event(age=301).status_code, 400)
        self.assertEqual(self.send_event(payment_status="unpaid").status_code, 200)
        self.assertEqual(self.send_event(id="cs_other").status_code, 200)
        self.assertFalse(self.is_paid())
        self.assertEqual(self.send_event().status_code, 200)
        self.assertEqual(self.send_event().status_code, 200)
        self.assertTrue(self.is_paid())
        self.assertEqual(self.request("GET", download, "client").content, self.png)
        self.assertEqual(self.request("GET", download, "otherclient").status_code, 403)
        self.assertEqual(self.request("PATCH", order_path, json={"status": "COMPLETED"}).status_code, 200)
        quote = self.quote().json()
        self.assertEqual((quote["gross_satang"], quote["fee_satang"], quote["net_satang"]), (100000, 5000, 95000))

    def test_expired_checkout_can_be_restarted_and_wrong_amount_requires_review(self):
        self.assertEqual(self.open_checkout().status_code, 200)
        previous = self.attempt().id
        self.assertEqual(self.send_event(event_type="checkout.session.expired", status="expired",
                                         payment_status="unpaid").status_code, 200)
        self.assertEqual(self.open_checkout().status_code, 200)
        self.assertNotEqual(self.attempt().id, previous)
        self.assertEqual(self.send_event(amount_total=999).status_code, 200)
        self.assertEqual(self.attempt().status, "REVIEW")
        self.assertFalse(self.is_paid())
        self.assertEqual(self.open_checkout().status_code, 409)

    def test_preexisting_manual_instruction_remains_payable(self):
        with patch.object(settings, "STRIPE_CHECKOUT_ENABLED", False):
            self.assertEqual(self.config().status_code, 200)
            self.assertEqual(self.instruction().status_code, 200)
        self.assertEqual(self.open_checkout().status_code, 409)
        self.assertEqual(self.pay().status_code, 200)
        self.assertEqual(self.approve().status_code, 200)

    def test_deposit_does_not_unlock_and_final_can_arrive_after_payment(self):
        with Session(self.engine) as session:
            deposit = session.get(MilestoneInvoice, self.invoice_id)
            deposit.amount = 300
            final = MilestoneInvoice(order_id=self.order_id, title="Final", amount=700)
            session.add(final)
            session.commit()
            final_id = final.id
        order_path = f"/api/orders/{self.order_id}"
        self.assertEqual(self.open_checkout().status_code, 200)
        self.assertEqual(self.send_event().status_code, 200)
        self.assertEqual(self.request("PATCH", order_path, json={"status": "COMPLETED"}).status_code, 400)
        self.invoice_id = final_id
        self.assertEqual(self.open_checkout().status_code, 200)
        self.assertEqual(self.send_event(event_type="checkout.session.async_payment_succeeded").status_code, 200)
        self.assertEqual(self.request("GET", order_path + "/files", "client").json(), [])
        uploaded = self.request("POST", order_path + "/files", "artist",
                                data={"file_type": "FINAL"}, files={"file": ("final.png", self.png, "image/png")})
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        download = order_path + f"/files/{uploaded.json()['id']}/download"
        self.assertEqual(self.request("GET", download, "client").content, self.png)

    def test_stripe_payment_to_artist_receipt_and_post_settlement_review(self):
        self.assertEqual(self.open_checkout().status_code, 200)
        self.assertEqual(self.send_event().status_code, 200)
        self.complete_order()
        self.assertEqual(self.profile().status_code, 200)
        preview = self.preview().json()
        self.assertEqual([preview[key] for key in ("gross_satang", "fee_satang", "net_satang")],
                         [100000, 5000, 95000])
        request = self.submit(preview).json()
        self.assertEqual(self.submit(preview).json()["id"], request["id"])
        self.assertEqual(self.submit(preview, key="different-payout-request").status_code, 409)
        self.assertEqual(self.get(request, "otherartist").status_code, 403)
        self.assertEqual(self.ledger()["requested_net_satang"], 95000)
        claimed = self.act(request, "claim").json()
        recorded = self.transfer(claimed).json()
        self.assertEqual(recorded["status"], "TRANSFER_RECORDED")
        self.assertEqual(self.transfer(claimed).json()["payout_id"], recorded["payout_id"])
        self.assertEqual(self.request("GET", recorded["payout"]["proof_url"], "artist").content, self.png)
        self.assertEqual(self.act(recorded, "confirm", "artist").json()["receipt_status"], "CONFIRMED")
        self.assertEqual(self.refund("succeeded").status_code, 200)
        self.assertEqual(self.refund("succeeded").status_code, 200)
        reviewed = self.ledger("admin")
        self.assertEqual(reviewed["orders"][0]["status"], "REFUND_PAYOUT_REVIEW")
        self.assertEqual(reviewed["recorded_payout_net_satang"], 95000)
        self.assertEqual(len(reviewed["payouts"]), 1)
        request = self.get(recorded).json()
        self.assertTrue(request["refund_hold"])
        self.assertEqual(request["receipt_status"], "CONFIRMED")

    def test_refund_holds_queued_and_claimed_requests(self):
        self.assertEqual(self.open_checkout().status_code, 200)
        self.assertEqual(self.send_event().status_code, 200)
        self.complete_order()
        self.assertEqual(self.profile().status_code, 200)
        request = self.submit().json()
        self.assertEqual(self.refund("pending", "refund.created").status_code, 200)
        self.assertTrue(self.get(request).json()["refund_hold"])
        self.assertEqual(self.act(request, "claim").status_code, 409)
        self.assertEqual(self.refund("failed", "refund.failed").status_code, 200)
        self.assertEqual(self.refund("pending", "refund.created").status_code, 200)
        claimed = self.act(request, "claim").json()
        self.assertEqual(claimed["status"], "PROCESSING")
        self.assertEqual(self.refund("pending", "refund.created", suffix="second").status_code, 200)
        self.assertEqual(self.refund("succeeded", suffix="second").status_code, 200)
        self.assertEqual(self.request("GET", f"/api/payments/payout-requests/{request['id']}/qr").status_code, 409)
        self.assertEqual(self.transfer(claimed).status_code, 409)
        self.assertEqual(list(Path("uploads/payouts").glob("*")), [])
        self.assertEqual(self.ledger()["orders"][0]["status"], "REFUND_HOLD")

    def test_refund_before_checkout_confirmation_is_held_only_in_matching_mode(self):
        self.assertEqual(self.open_checkout().status_code, 200)
        self.assertEqual(self.refund("pending", valid=False).status_code, 400)
        self.assertEqual(self.refund("succeeded", live=True).status_code, 200)
        self.assertEqual(self.refund("pending").status_code, 200)
        self.assertEqual(self.send_event().status_code, 200)
        self.complete_order()
        self.assertEqual(self.quote().status_code, 409)
        self.assertEqual(self.ledger()["eligible_net_satang"], 0)
        self.assertEqual(self.refund("canceled").status_code, 200)
        self.assertEqual(self.ledger()["eligible_net_satang"], 95000)

    def test_live_checkout_requires_explicit_enablement(self):
        with patch.multiple(settings, STRIPE_SECRET_KEY="sk_live_fixture",
                            STRIPE_RETURN_ORIGIN="https://dice.example"):
            response = self.open_checkout()
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json()["detail"], "Live checkout creation is disabled")
        self.assertFalse(self.provider.called)
