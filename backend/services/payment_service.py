import json
from fastapi import HTTPException
from sqlalchemy import update
from sqlmodel import Session, select
from models import Order, MilestoneInvoice, SystemSetting, OrderStatus
from models.payment import PaymentInstruction, PayoutItem
from services.promptpay import build_payload, to_satang

SETTINGS_KEY = 'platform_payment_settings_v1'
DEFAULT_SETTINGS = {'enabled': False, 'recipient_name': '', 'mobile_number': '', 'fee_bps': 500, 'version': 0}


def payment_settings(session: Session) -> dict:
    setting = session.get(SystemSetting, SETTINGS_KEY)
    return json.loads(setting.value) if setting else DEFAULT_SETTINGS.copy()


def new_order_fee_bps(session: Session) -> int:
    # Read only: auction finalization owns its transaction boundary.
    return payment_settings(session)['fee_bps']


def lock_order(session: Session, order_id: int) -> Order:
    # An actual row write serializes money mutations on SQLite and PostgreSQL.
    found = session.exec(update(Order).where(Order.id == order_id).values(id=Order.id)
                         .execution_options(synchronize_session=False)).rowcount
    if not found:
        raise HTTPException(404, 'Order not found')
    order = session.get(Order, order_id)
    session.refresh(order)
    return order


def assert_unsettled(session: Session, order_id: int):
    if session.exec(select(PayoutItem.id).where(PayoutItem.order_id == order_id)).first() is not None:
        raise HTTPException(409, 'This order has a recorded payout. Financial and status changes require a future adjustment workflow.')


def authorized_order(order: Order, user):
    if not (user.is_admin or user.id in (order.client_id, order.artist_id)):
        raise HTTPException(403, 'Not authorized to access this payment')


def invoice_and_order(session: Session, invoice_id: int, user, *, lock=False):
    invoice = session.get(MilestoneInvoice, invoice_id)
    if not invoice:
        raise HTTPException(404, 'Invoice not found')
    order = session.get(Order, invoice.order_id)
    if not order:
        raise HTTPException(404, 'Order not found')
    authorized_order(order, user)
    if lock:
        order = lock_order(session, order.id)
        session.refresh(invoice)
    return invoice, order


def create_instruction(session: Session, invoice_id: int, user):
    invoice, order = invoice_and_order(session, invoice_id, user, lock=True)
    if invoice.is_paid or order.status == OrderStatus.CANCELLED:
        raise HTTPException(409, 'Payment instructions are unavailable for paid or cancelled invoices')
    found = session.exec(select(PaymentInstruction).where(PaymentInstruction.invoice_id == invoice_id)).first()
    if found:
        return found
    # An existing slip might describe a payment made to another recipient.
    if invoice.slip_image_url:
        raise HTTPException(409, 'An existing payment proof is awaiting review. Do not pay twice; ask the artist or administrator to review it.')
    config = payment_settings(session)
    if not config['enabled'] or not config['mobile_number'] or not config['recipient_name']:
        raise HTTPException(409, 'PromptPay is not configured. Contact the administrator for payment instructions.')
    amount = to_satang(invoice.amount)
    instruction = PaymentInstruction(invoice_id=invoice_id, recipient_name=config['recipient_name'],
        mobile_number=config['mobile_number'], amount_satang=amount,
        settings_version=config['version'], payload=build_payload(config['mobile_number'], amount))
    session.add(instruction)
    session.flush()
    return instruction
