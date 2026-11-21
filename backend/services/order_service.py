from pathlib import Path

from sqlmodel import Session, select
from models import Auction, AuctionType, Order, OrderStatus, MilestoneInvoice, File


def auction_type_for_order(order: Order, session: Session) -> AuctionType | None:
    auction = session.get(Auction, order.auction_id) if order.auction_id else None
    return auction.auction_type if auction else None


def complete_paid_adoptable(order: Order, session: Session) -> None:
    if order.status in (OrderStatus.CANCELLED, OrderStatus.COMPLETED):
        return
    if auction_type_for_order(order, session) != AuctionType.ADOPTABLE:
        return
    session.flush()
    if is_order_fully_paid(order.id, session) and has_final_artwork(order.id, session):
        order.status = OrderStatus.COMPLETED
        session.add(order)


def final_artwork_available(file: File) -> bool:
    return file.file_type == "FINAL" and (Path("uploads/originals") / file.s3_key).is_file()


def has_final_artwork(order_id: int, session: Session, *, excluding_file_id: int | None = None) -> bool:
    files = session.exec(select(File).where(File.order_id == order_id, File.file_type == "FINAL"))
    return any(file.id != excluding_file_id and final_artwork_available(file) for file in files)

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
