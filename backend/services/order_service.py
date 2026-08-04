from sqlmodel import Session, select
from models import Order, MilestoneInvoice

def is_order_fully_paid(order_id: int, session: Session) -> bool:
    invoices = session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order_id)).all()
    if not invoices:
        return False
    return all(inv.is_paid for inv in invoices)
