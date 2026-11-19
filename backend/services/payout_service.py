import hashlib
import json
from fastapi import HTTPException
from sqlmodel import Session, select
from models import Order, OrderStatus, MilestoneInvoice, User
from models.checkout import REFUND_HOLD_STATUSES, PromptPayCheckout, StripeRefund
from models.payment import CollectionReceipt, PayoutItem, ArtistPayout
from models.payout_request import PayoutReservation, PayoutRequest
from services.promptpay import to_satang, order_fee
from services.payment_service import lock_order


def has_refund_hold(session: Session, order_ids: list[int]) -> bool:
    refund = session.exec(select(StripeRefund.id).join(
        PromptPayCheckout, (PromptPayCheckout.provider_payment_id == StripeRefund.provider_payment_id)
        & (PromptPayCheckout.live == StripeRefund.live),
    ).join(MilestoneInvoice, PromptPayCheckout.invoice_id == MilestoneInvoice.id).where(
        MilestoneInvoice.order_id.in_(order_ids), StripeRefund.status.in_(REFUND_HOLD_STATUSES)
    ).limit(1)).first()
    return refund is not None


def settlement_row(session: Session, order: Order, *, request_id=None) -> dict:
    receipts = session.exec(select(CollectionReceipt).where(CollectionReceipt.order_id == order.id)
                            .order_by(CollectionReceipt.id)).all()
    invoices = session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order.id)
                            .order_by(MilestoneInvoice.id)).all()
    provider_receipts = session.exec(select(PromptPayCheckout).join(
        MilestoneInvoice, MilestoneInvoice.id == PromptPayCheckout.invoice_id
    ).where(MilestoneInvoice.order_id == order.id, PromptPayCheckout.status == "CONFIRMED")
      .order_by(PromptPayCheckout.id)).all()
    gross = sum(r.amount_satang for r in receipts) + sum(r.amount_satang for r in provider_receipts)
    fee = order_fee(gross, order.platform_fee_bps_snapshot)
    paid_total = sum(to_satang(i.amount) for i in invoices if i.is_paid)
    fully_paid = bool(invoices) and all(i.is_paid for i in invoices) and order.agreed_price is not None and paid_total >= to_satang(order.agreed_price)
    settled = session.exec(select(PayoutItem.id).where(PayoutItem.order_id == order.id)).first() is not None
    reservation = session.get(PayoutReservation, order.id)
    if provider_receipts and has_refund_hold(session, [order.id]):
        state = 'REFUND_PAYOUT_REVIEW' if settled else 'REFUND_HOLD'
    elif settled:
        state = 'SETTLED'
    elif reservation and reservation.request_id != request_id:
        request = session.get(PayoutRequest, reservation.request_id)
        state = 'PAYOUT_PROCESSING' if request.status == 'PROCESSING' else 'PAYOUT_REQUESTED'
    elif order.status == OrderStatus.CANCELLED:
        state = 'CANCELLED_MANUAL_RESOLUTION' if gross else 'CANCELLED'
    elif not gross:
        state = 'NO_PLATFORM_COLLECTION'
    elif order.status != OrderStatus.COMPLETED or not fully_paid:
        state = 'NOT_ELIGIBLE'
    elif gross - fee == 0:
        state = 'NO_PAYOUT_DUE'
    else:
        state = 'ELIGIBLE'
    # Includes inputs as well as totals so a stale quote cannot settle changed records.
    basis = [order.id, order.artist_id, order.status.value, order.agreed_price,
             order.platform_fee_bps_snapshot, [(i.id, i.amount, i.is_paid) for i in invoices],
             [(r.id, r.amount_satang, r.instruction_id) for r in receipts], settled]
    if provider_receipts:
        basis.append([(row.provider_payment_id, row.amount_satang) for row in provider_receipts])
    fingerprint = hashlib.sha256(json.dumps(basis, separators=(',', ':')).encode()).hexdigest()
    return dict(order_id=order.id, artist_id=order.artist_id, title=order.title,
                status=state, gross_satang=gross, fee_bps=order.platform_fee_bps_snapshot,
                fee_satang=fee, net_satang=gross-fee, fingerprint=fingerprint)


def payout_quote(session: Session, artist_id: int, order_ids: list[int], *, lock=False, request_id=None):
    if not order_ids or len(set(order_ids)) != len(order_ids):
        raise HTTPException(422, 'Select at least one distinct order')
    rows = []
    for order_id in sorted(order_ids):
        order = lock_order(session, order_id) if lock else session.get(Order, order_id)
        if not order:
            raise HTTPException(404, 'Order not found')
        if order.artist_id != artist_id:
            raise HTTPException(409, 'Every selected order must belong to the selected artist')
        row = settlement_row(session, order, request_id=request_id)
        if row['status'] != 'ELIGIBLE':
            raise HTTPException(409, f"Order {order_id} is not payout eligible: {row['status']}")
        rows.append(row)
    digest = hashlib.sha256(json.dumps([(r['order_id'], r['fingerprint']) for r in rows]).encode()).hexdigest()
    return dict(artist_id=artist_id, items=rows, quote_digest=digest,
                gross_satang=sum(r['gross_satang'] for r in rows),
                fee_satang=sum(r['fee_satang'] for r in rows),
                net_satang=sum(r['net_satang'] for r in rows))


def persist_payout(session, quote, admin_id, key, digest, reference, proof_path, proof_hash):
    """Shared settlement write; callers own locks, replay checks and the transaction."""
    payout = ArtistPayout(artist_id=quote['artist_id'], recorded_by=admin_id,
        idempotency_key=key, request_digest=digest, transfer_reference=reference,
        proof_path=str(proof_path), proof_sha256=proof_hash,
        gross_satang=quote['gross_satang'], fee_satang=quote['fee_satang'], net_satang=quote['net_satang'])
    session.add(payout)
    session.flush()
    for row in quote['items']:
        session.add(PayoutItem(payout_id=payout.id, **{k: row[k] for k in ('order_id','gross_satang','fee_bps','fee_satang','net_satang')}))
    return payout


def payout_response(session: Session, payout: ArtistPayout):
    data = payout.model_dump(exclude={'proof_path', 'proof_sha256', 'request_digest', 'idempotency_key'})
    data['proof_url'] = f'/api/payments/payouts/{payout.id}/proof'
    data['items'] = session.exec(select(PayoutItem).where(PayoutItem.payout_id == payout.id)).all()
    return data


def ledger_summary(session: Session, user):
    statement = select(Order).order_by(Order.id.desc())
    if not user.is_admin:
        statement = statement.where(Order.artist_id == user.id)
    orders = session.exec(statement).all()
    rows = [settlement_row(session, order) for order in orders]
    for row in rows:
        artist = session.get(User, row['artist_id'])
        row['artist_name'] = artist.full_name if artist else str(row['artist_id'])
    payouts_statement = select(ArtistPayout).order_by(ArtistPayout.id.desc())
    if not user.is_admin:
        payouts_statement = payouts_statement.where(ArtistPayout.artist_id == user.id)
    payouts = session.exec(payouts_statement).all()
    # Historical approved invoices remain separately labelled, never inferred as receipts.
    historical_satang = 0
    for order in orders:
        for invoice in session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order.id, MilestoneInvoice.is_paid == True)).all():
            historical_satang += to_satang(invoice.amount)
    return dict(orders=rows, payouts=[payout_response(session, p) for p in payouts],
        approved_invoice_gross_satang=historical_satang,
        platform_collections_satang=sum(r['gross_satang'] for r in rows),
        eligible_net_satang=sum(r['net_satang'] for r in rows if r['status'] == 'ELIGIBLE'),
        requested_net_satang=sum(r['net_satang'] for r in rows if r['status'] in ('PAYOUT_REQUESTED','PAYOUT_PROCESSING')),
        recorded_payout_net_satang=sum(p.net_satang for p in payouts))
