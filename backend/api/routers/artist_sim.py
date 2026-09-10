from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from core.db import get_session
from models import User, Order, MilestoneInvoice, Revision, Message, File as DBFile
import httpx
import datetime
import io
from PIL import Image

router = APIRouter(prefix="/api/artist_sim", tags=["artist_sim"])

@router.get("/status")
def get_sim_status(session: Session = Depends(get_session)):
    artist = session.exec(select(User).where(User.email == "artist@example.com")).first()
    orders = session.exec(select(Order).order_by(Order.id.desc())).all()
    
    order_list = []
    for o in orders:
        invoices = session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == o.id)).all()
        revisions = session.exec(select(Revision).where(Revision.order_id == o.id)).all()
        messages = session.exec(select(Message).where(Message.order_id == o.id)).all()
        files = session.exec(select(DBFile).where(DBFile.order_id == o.id)).all()
        
        order_list.append({
            "id": o.id,
            "title": o.title,
            "client_id": o.client_id,
            "artist_id": o.artist_id,
            "status": o.status.value,
            "agreed_price": o.agreed_price,
            "revision_quota": o.revision_quota,
            "start_date": o.start_date.isoformat() if o.start_date else None,
            "due_date": o.due_date.isoformat() if o.due_date else None,
            "invoices": [{"id": inv.id, "title": inv.title, "amount": inv.amount, "is_paid": inv.is_paid, "slip_url": inv.slip_image_url} for inv in invoices],
            "revisions": [{"id": rev.id, "feedback": rev.client_feedback, "is_addressed": rev.is_addressed} for rev in revisions],
            "messages": [{"id": m.id, "sender_id": m.sender_id, "content": m.content} for m in messages],
            "files": [{"id": f.id, "filename": f.filename, "file_type": f.file_type, "is_watermarked": f.is_watermarked} for f in files]
        })
        
    return {
        "artist_id": artist.id if artist else None,
        "orders_count": len(orders),
        "orders": order_list
    }
