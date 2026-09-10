from sqlmodel import Session, select
from models import Order, MilestoneInvoice

def is_order_fully_paid(order_id: int, session: Session) -> bool:
    order = session.get(Order, order_id)
    if not order or order.agreed_price is None or order.agreed_price <= 0:
        return False
        
    invoices = session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order_id)).all()
    if not invoices:
        return False
        
    all_invoices_paid = all(inv.is_paid for inv in invoices)
    total_paid = sum(inv.amount for inv in invoices if inv.is_paid)
    
    return all_invoices_paid and total_paid >= round(order.agreed_price, 2)
