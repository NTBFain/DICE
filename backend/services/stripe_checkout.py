import hashlib
import hmac
import json
import logging
import time
from datetime import timedelta
from urllib.error import URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4

from fastapi import HTTPException
from sqlmodel import select

from core.config import settings
from core.time import utcnow
from models import MilestoneInvoice, Notification, NotificationType, OrderStatus, User
from models.checkout import REFUND_HOLD_STATUSES, PromptPayCheckout, StripeRefund
from models.payment import PayoutItem
from services.payment_service import assert_unsettled, invoice_and_order, lock_order, uses_provider_checkout
from services.promptpay import to_satang
from services.order_service import complete_paid_adoptable

logger = logging.getLogger(__name__)

REFUND_EVENTS = {"refund.created", "refund.updated", "refund.failed", "charge.refund.updated"}


def create_provider_session(attempt):
    fields = {
        "mode": "payment",
        "excluded_payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": "thb",
        "line_items[0][price_data][unit_amount]": str(attempt.amount_satang),
        "line_items[0][price_data][product_data][name]": f"DICE invoice #{attempt.invoice_id}",
        "line_items[0][quantity]": "1",
        "client_reference_id": attempt.id,
        "success_url": attempt.return_url,
        "cancel_url": attempt.return_url,
    }
    request = Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=urlencode(fields).encode("ascii"),
        headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}",
                 "Idempotency-Key": f"dice-promptpay-{attempt.id}"},
    )
    try:
        with urlopen(request, timeout=10) as response:
            return json.load(response)
    except (URLError, TimeoutError, ValueError):
        raise HTTPException(503, "Checkout is temporarily unavailable. Retry from the same invoice.") from None


def start_checkout(session, invoice_id, user, locale):
    invoice, order = invoice_and_order(session, invoice_id, user, lock=True)
    if user.id != order.client_id:
        raise HTTPException(403, "Only the client can pay this invoice")
    if invoice.is_paid or order.status in (OrderStatus.CANCELLED, OrderStatus.COMPLETED):
        raise HTTPException(409, "This invoice is unavailable for payment")
    assert_unsettled(session, order.id)
    if not uses_provider_checkout(session, invoice):
        raise HTTPException(409, "This invoice uses the existing manual payment workflow")
    if not settings.STRIPE_CHECKOUT_ENABLED:
        raise HTTPException(503, "Checkout creation is currently disabled")

    attempt = session.exec(select(PromptPayCheckout).where(
        PromptPayCheckout.invoice_id == invoice_id,
        PromptPayCheckout.status.notin_(("EXPIRED", "FAILED")),
    )).first()
    key = settings.STRIPE_SECRET_KEY
    origin = urlsplit(settings.STRIPE_RETURN_ORIGIN)
    local_test = key.startswith("sk_test_") and origin.hostname in ("localhost", "127.0.0.1")
    if (not key.startswith(("sk_test_", "sk_live_"))
            or not settings.STRIPE_WEBHOOK_SECRET.startswith("whsec_")
            or not origin.hostname or origin.username is not None or origin.query or origin.fragment
            or origin.path not in ("", "/")
            or (origin.scheme != "https" and not (local_test and origin.scheme == "http"))):
        raise HTTPException(503, "Provider checkout is not configured")
    live = key.startswith("sk_live_")
    if live and not settings.STRIPE_LIVE_CHECKOUT_ENABLED:
        raise HTTPException(503, "Live checkout creation is disabled")
    if attempt and attempt.live != live:
        raise HTTPException(409, "This checkout belongs to a different provider environment")
    if attempt and attempt.amount_satang != to_satang(invoice.amount):
        raise HTTPException(409, "The invoice amount changed and requires reconciliation")
    if attempt and attempt.status == "PENDING":
        return {"url": attempt.checkout_url}
    if attempt and (attempt.status != "CREATING" or utcnow() - attempt.created_at >= timedelta(hours=23)):
        raise HTTPException(409, "An earlier payment attempt requires reconciliation")
    if not attempt:
        return_url = f"{settings.STRIPE_RETURN_ORIGIN.rstrip('/')}/{locale}/dashboard/client?order={order.id}"
        attempt = PromptPayCheckout(id=uuid4().hex, invoice_id=invoice_id, live=live,
                                    amount_satang=to_satang(invoice.amount), return_url=return_url)
        session.add(attempt)
    order_id = order.id
    session.commit()
    session.refresh(attempt)
    # Release the DB transaction before the remote call. All retries use the same durable key.
    session.expunge(attempt)
    session.rollback()
    checkout = create_provider_session(attempt)
    if checkout.get("payment_method_types") != ["promptpay"]:
        raise HTTPException(502, "Stripe Checkout must offer PromptPay only. Check the sandbox payment methods.")
    url = checkout.get("url")
    destination = urlsplit(url) if isinstance(url, str) else None
    if (not destination or destination.scheme != "https" or destination.netloc != "checkout.stripe.com"
            or not isinstance(checkout.get("id"), str) or not checkout["id"].startswith("cs_")
            or checkout.get("client_reference_id") != attempt.id
            or checkout.get("livemode") is not live or checkout.get("currency") != "thb"
            or checkout.get("amount_total") != attempt.amount_satang):
        raise HTTPException(502, "Unexpected checkout details from payment provider")
    lock_order(session, order_id)
    saved = session.get(PromptPayCheckout, attempt.id)
    if saved.status == "CREATING":
        saved.provider_session_id = checkout["id"]
        saved.checkout_url = url
        saved.status = "PENDING"
        session.add(saved)
        session.commit()
        return {"url": url}
    if saved.status == "PENDING" and saved.provider_session_id == checkout["id"]:
        return {"url": saved.checkout_url}
    raise HTTPException(409, "Checkout changed. Refresh the invoice before paying.")


def fetch_stripe(resource):
    request = Request(f"https://api.stripe.com/v1/{resource}",
                      headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"})
    try:
        with urlopen(request, timeout=10) as response:
            return json.load(response)
    except (URLError, TimeoutError, ValueError):
        raise HTTPException(503, "Could not check Stripe. Try again shortly.") from None


def refresh_checkout(session, invoice_id, user):
    invoice, _ = invoice_and_order(session, invoice_id, user)
    if invoice.is_paid:
        return {"is_paid": True}
    attempt = session.exec(select(PromptPayCheckout).where(
        PromptPayCheckout.invoice_id == invoice_id, PromptPayCheckout.status == "PENDING"
    )).first()
    if not attempt or not attempt.provider_session_id:
        return {"is_paid": False}
    provider_id, attempt_id, live = attempt.provider_session_id, attempt.id, attempt.live
    prefix = "sk_live_" if live else "sk_test_"
    if not settings.STRIPE_SECRET_KEY.startswith(prefix):
        raise HTTPException(503, "Stripe credentials do not match this checkout.")
    session.rollback()
    checkout = fetch_stripe(f"checkout/sessions/{provider_id}")
    if (checkout.get("id") != provider_id or checkout.get("client_reference_id") != attempt_id
            or checkout.get("livemode") is not live):
        raise HTTPException(502, "Stripe returned a different checkout.")
    if checkout.get("payment_status") == "paid":
        payment_id = checkout.get("payment_intent")
        if not isinstance(payment_id, str) or not payment_id.startswith("pi_"):
            raise HTTPException(502, "Stripe did not return a payment reference.")
        refunds = fetch_stripe("refunds?" + urlencode({"payment_intent": payment_id, "limit": 100}))
        if refunds.get("has_more") or any(
            row.get("status") not in ("failed", "canceled") for row in refunds.get("data", [])
        ):
            raise HTTPException(409, "A Stripe refund requires review before confirming this invoice.")
    event_type = "checkout.session.expired" if checkout.get("status") == "expired" else "checkout.session.completed"
    apply_event(session, {"type": event_type, "livemode": live, "data": {"object": checkout}})
    return {"is_paid": session.get(MilestoneInvoice, invoice_id).is_paid}


def verify_event(body, signature, secret):
    try:
        fields = [part.strip().split("=", 1) for part in signature.split(",")]
        timestamp = next(value for key, value in fields if key == "t")
        if abs(time.time() - int(timestamp)) > 300:
            raise ValueError
        expected = hmac.new(secret.encode(), timestamp.encode("ascii") + b"." + body, hashlib.sha256).hexdigest()
        if not any(key == "v1" and hmac.compare_digest(expected.encode(), value.encode()) for key, value in fields):
            raise ValueError
        event = json.loads(body)
        if not isinstance(event, dict):
            raise ValueError
        return event
    except (ValueError, StopIteration, UnicodeError):
        raise HTTPException(400, "Invalid Stripe webhook signature or body") from None


def apply_refund(session, event):
    refund = event.get("data", {}).get("object", {})
    refund_id = refund.get("id")
    payment_id = refund.get("payment_intent")
    live = event.get("livemode")
    status = refund.get("status")
    if (refund.get("object") != "refund" or not isinstance(refund_id, str) or not refund_id.startswith("re_")
            or not isinstance(payment_id, str) or not payment_id.startswith("pi_")
            or not isinstance(live, bool) or status not in (*REFUND_HOLD_STATUSES, "failed", "canceled")):
        return

    order_id = session.exec(select(MilestoneInvoice.order_id).join(
        PromptPayCheckout, PromptPayCheckout.invoice_id == MilestoneInvoice.id
    ).where(PromptPayCheckout.provider_payment_id == payment_id, PromptPayCheckout.live == live)).first()
    if order_id is not None:
        lock_order(session, order_id)
    record = session.get(StripeRefund, (refund_id, live))
    if record:
        # Late pending events cannot reopen a failed/canceled refund. A recorded
        # success remains on hold for manual reconciliation if Stripe later disagrees.
        if (record.provider_payment_id != payment_id or record.status in (status, "succeeded")
                or (record.status in ("failed", "canceled") and status != "succeeded")):
            return
        was_held = record.status in REFUND_HOLD_STATUSES
        record.status = status
    else:
        was_held = False
        record = StripeRefund(id=refund_id, live=live, provider_payment_id=payment_id, status=status)
    session.add(record)
    if order_id is not None and not was_held and status in REFUND_HOLD_STATUSES:
        settled = session.exec(select(PayoutItem.id).where(PayoutItem.order_id == order_id)).first() is not None
        message = (f"Review the recorded payout for order #{order_id} after a Stripe refund."
                   if settled else f"Order #{order_id} is on payout hold after a Stripe refund.")
        for admin_id in session.exec(select(User.id).where(User.is_admin == True)):
            session.add(Notification(user_id=admin_id, type=NotificationType.SYSTEM,
                title="Stripe refund / การคืนเงินผ่าน Stripe", message=message, link="/dashboard/admin/payments"))
    session.commit()


def apply_event(session, event):
    event_type = event.get("type")
    if event_type in REFUND_EVENTS:
        apply_refund(session, event)
        return
    if event_type not in ("checkout.session.completed", "checkout.session.async_payment_succeeded",
                          "checkout.session.async_payment_failed", "checkout.session.expired"):
        return
    checkout = event.get("data", {}).get("object", {})
    attempt_id = checkout.get("client_reference_id")
    attempt = session.get(PromptPayCheckout, attempt_id) if isinstance(attempt_id, str) else None
    if attempt is None:
        return
    invoice = session.get(MilestoneInvoice, attempt.invoice_id)
    order = lock_order(session, invoice.order_id)
    session.refresh(attempt)
    session.refresh(invoice)
    if not attempt.provider_session_id:
        raise HTTPException(503, "Checkout is still being registered")
    if (checkout.get("id") != attempt.provider_session_id or event.get("livemode") is not attempt.live
            or checkout.get("livemode") is not attempt.live or checkout.get("mode") != "payment"):
        return
    if attempt.status in ("CONFIRMED", "REVIEW"):
        return
    if event_type == "checkout.session.expired":
        if checkout.get("status") == "expired" and checkout.get("payment_status") == "unpaid":
            attempt.status = "EXPIRED"
            session.commit()
        return
    if event_type == "checkout.session.async_payment_failed":
        if attempt.status == "PENDING" and checkout.get("payment_status") == "unpaid":
            attempt.status = "FAILED"
            session.commit()
        return
    if checkout.get("payment_status") != "paid":
        return

    payment_id = checkout.get("payment_intent")
    if (attempt.status != "PENDING" or invoice.is_paid or order.status == OrderStatus.CANCELLED
            or checkout.get("currency") != "thb" or checkout.get("amount_total") != attempt.amount_satang
            or to_satang(invoice.amount) != attempt.amount_satang
            or not isinstance(payment_id, str) or not payment_id.startswith("pi_")):
        attempt.status = "REVIEW"
        session.commit()
        logger.warning("Stripe checkout requires reconciliation: invoice %s, session %s", invoice.id, attempt.provider_session_id)
        return

    attempt.provider_payment_id = payment_id
    attempt.confirmed_at = utcnow()
    attempt.status = "CONFIRMED"
    invoice.is_paid = True
    invoice.approved_at = attempt.confirmed_at
    complete_paid_adoptable(order, session)
    for recipient in {order.client_id, order.artist_id}:
        session.add(Notification(
            user_id=recipient, type=NotificationType.ORDER,
            title="PromptPay payment confirmed",
            message=f"Payment for invoice #{invoice.id} was confirmed.",
            link=f"/orders/{order.id}",
        ))
    session.commit()
