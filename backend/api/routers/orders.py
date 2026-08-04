import os
import shutil
import secrets
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FormFile, Form, BackgroundTasks
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session, select
from sqlalchemy.orm import joinedload
from typing import List

from core.db import get_session
from core.auth import get_current_user, get_admin_user, get_artist_user
from core.watermark import apply_watermark
from models import Order, OrderStatus, MilestoneInvoice, Revision, Message, File as DBFile, User, NotificationType
from schemas import (
    OrderCreateRequest, OrderUpdateRequest, OrderResponse,
    MilestoneInvoiceCreateRequest, MilestoneInvoiceResponse,
    RevisionCreateRequest, RevisionResponse,
    MessageCreateRequest, MessageResponse,
    FileResponse
)
from services.system_service import get_setting
from services.order_service import is_order_fully_paid
from services.notification_service import background_create_notification

router = APIRouter(prefix="/api", tags=["orders"])

@router.post("/orders", response_model=OrderResponse)
def create_order(request: OrderCreateRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = Order(
        title=request.title,
        description=request.description,
        status=OrderStatus.PENDING,
        revision_quota=request.revision_quota,
        client_id=current_user.id,
        artist_id=request.artist_id,
        start_date=request.start_date,
        due_date=request.due_date
    )
    session.add(order)
    session.commit()
    session.refresh(order)
    
    artist = session.get(User, order.artist_id)
    
    d = order.model_dump()
    d['client_name'] = order.client.full_name if order.client else current_user.full_name
    d['artist_name'] = artist.full_name if artist else "Unknown"
    return d

@router.get("/public/queue")
def get_public_queue(session: Session = Depends(get_session)):
    statement = select(Order).options(joinedload(Order.client)).order_by(Order.id.asc())
    orders = session.exec(statement).all()
    
    queue_items = []
    for idx, o in enumerate(orders, start=1):
        queue_items.append({
            "slot_number": idx,
            "order_id": o.id,
            "status": o.status.value if hasattr(o.status, 'value') else str(o.status),
            "stage": o.current_stage or "In Queue",
            "client_id": o.client_id,
            "title": o.title,
            "client_name": o.client.full_name if o.client else "Client ***",
            "start_date": o.start_date.isoformat() if o.start_date else None,
            "due_date": o.due_date.isoformat() if o.due_date else None,
            "created_at": o.created_at.isoformat() if o.created_at else None
        })
    return queue_items

@router.get("/orders", response_model=List[OrderResponse])
def get_orders(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if current_user.is_admin:
        # Admins see all orders globally
        statement = select(Order).options(joinedload(Order.client))
    elif current_user.is_artist:
        # Artists see orders they are working on, OR orders they placed as a client
        from sqlalchemy import or_
        statement = select(Order).where(or_(Order.artist_id == current_user.id, Order.client_id == current_user.id)).options(joinedload(Order.client))
    else:
        # Clients see their placed orders
        statement = select(Order).where(Order.client_id == current_user.id).options(joinedload(Order.client))
    orders = session.exec(statement).all()
    
    responses = []
    for o in orders:
        artist = session.get(User, o.artist_id)
        d = o.model_dump()
        d['client_name'] = o.client.full_name if o.client else "Unknown"
        d['artist_name'] = artist.full_name if artist else "Unknown"
        responses.append(d)
    return responses

@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order_by_id(order_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.is_admin:
        pass # Admins can view any order
    elif current_user.is_artist:
        if order.artist_id != current_user.id and order.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
    else:
        if order.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
            
    artist = session.get(User, order.artist_id)
    d = order.model_dump()
    d['client_name'] = order.client.full_name if order.client else "Unknown"
    d['artist_name'] = artist.full_name if artist else "Unknown"
    return d

@router.patch("/orders/{order_id}", response_model=OrderResponse)
def update_order(order_id: int, request: OrderUpdateRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if current_user.is_admin:
        pass # Admins can update any order
    elif current_user.is_artist and order.artist_id == current_user.id:
        pass # Artists can update their own commissioned orders
    else:
        if order.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this order")
        if order.status != OrderStatus.PENDING:
            raise HTTPException(status_code=400, detail="Cannot modify order after acceptance")
        
    if request.status is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update order status")
        order.status = OrderStatus(request.status)
        background_tasks.add_task(
            background_create_notification,
            user_id=order.client_id,
            title="Order Status Updated",
            message=f"Your order '{order.title}' status changed to {order.status.value}",
            link=f"/orders/{order.id}",
            type=NotificationType.ORDER
        )
        
    if request.agreed_price is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update agreed price")
        order.agreed_price = request.agreed_price
        
    if request.revision_quota is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update revision quota")
        order.revision_quota = request.revision_quota

    if request.start_date is not None:
        order.start_date = request.start_date

    if request.due_date is not None:
        order.due_date = request.due_date
        
    session.add(order)
    session.commit()
    session.refresh(order)
    
    artist = session.get(User, order.artist_id)
    d = order.model_dump()
    d['client_name'] = order.client.full_name if order.client else "Unknown"
    d['artist_name'] = artist.full_name if artist else "Unknown"
    return d

# --- Milestone Invoices ---

@router.post("/orders/{order_id}/invoices", response_model=MilestoneInvoiceResponse)
def create_invoice(order_id: int, request: MilestoneInvoiceCreateRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    invoice = MilestoneInvoice(
        title=request.title,
        amount=request.amount,
        is_paid=False,
        order_id=order_id
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    background_tasks.add_task(
        background_create_notification,
        user_id=order.client_id,
        title="New Invoice Issued",
        message=f"New invoice '{invoice.title}' issued for your order '{order.title}'",
        link=f"/orders/{order.id}",
        type=NotificationType.ORDER
    )
    return invoice

@router.get("/orders/{order_id}/invoices", response_model=List[MilestoneInvoiceResponse])
def get_order_invoices(order_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    invoices = session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order_id)).all()
    return invoices

@router.post("/invoices/{invoice_id}/pay", response_model=MilestoneInvoiceResponse)
def pay_invoice(invoice_id: int, background_tasks: BackgroundTasks, slip: UploadFile = FormFile(...), session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    invoice = session.get(MilestoneInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    order = session.get(Order, invoice.order_id)
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay this invoice")
        
    os.makedirs("uploads/slips", exist_ok=True)
    file_ext = os.path.splitext(slip.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        raise HTTPException(status_code=400, detail="Invalid slip file extension. Allowed: jpg, jpeg, png, webp, pdf")
    slip_filename = f"slip_{invoice_id}_{secrets.token_hex(4)}{file_ext}"
    slip_path = os.path.join("uploads/slips", slip_filename)
    
    with open(slip_path, "wb") as buffer:
        shutil.copyfileobj(slip.file, buffer)
        
    invoice.slip_image_url = f"/api/invoices/{invoice_id}/slip"
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    
    admins = session.exec(select(User).where(User.is_admin == True)).all()
    for admin in admins:
        background_tasks.add_task(
            background_create_notification,
            user_id=admin.id,
            title="Payment Uploaded",
            message=f"Client uploaded payment slip for invoice '{invoice.title}'",
            link=f"/orders/{order.id}",
            type=NotificationType.ORDER
        )
        
    return invoice

@router.get("/invoices/{invoice_id}/slip")
def get_invoice_slip(invoice_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    invoice = session.get(MilestoneInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    order = session.get(Order, invoice.order_id)
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this slip")
        
    if not invoice.slip_image_url:
        raise HTTPException(status_code=400, detail="No slip uploaded for this invoice")
        
    slips_dir = "uploads/slips"
    if not os.path.exists(slips_dir):
         raise HTTPException(status_code=404, detail="Slip file not found")
    
    import glob
    matches = glob.glob(os.path.join(slips_dir, f"slip_{invoice_id}_*"))
    if matches:
        return SecureFileResponse(matches[0])
            
    raise HTTPException(status_code=404, detail="Slip file not found on disk")

@router.post("/invoices/{invoice_id}/approve", response_model=MilestoneInvoiceResponse)
def approve_invoice_payment(invoice_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    invoice = session.get(MilestoneInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    order = session.get(Order, invoice.order_id)
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    invoice.is_paid = True
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    
    order = session.get(Order, invoice.order_id)
    if order:
        background_tasks.add_task(
            background_create_notification,
            user_id=order.client_id,
            title="Payment Approved",
            message=f"Your payment for '{invoice.title}' has been approved.",
            link=f"/orders/{order.id}",
            type=NotificationType.ORDER
        )
    return invoice

# --- Revisions ---

@router.post("/orders/{order_id}/revisions", response_model=RevisionResponse)
def request_revision(order_id: int, request: RevisionCreateRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if order.status not in [OrderStatus.SKETCHING, OrderStatus.COLORING]:
        raise HTTPException(status_code=400, detail="Revisions can only be requested during sketching or coloring phases")
        
    existing_revisions_count = len(order.revisions)
    if existing_revisions_count >= order.revision_quota:
        raise HTTPException(status_code=400, detail=f"Revision quota exceeded ({order.revision_quota} max)")
        
    revision = Revision(
        client_feedback=request.client_feedback,
        is_addressed=False,
        order_id=order_id
    )
    session.add(revision)
    session.commit()
    session.refresh(revision)
    
    admins = session.exec(select(User).where(User.is_admin == True)).all()
    for admin in admins:
        background_tasks.add_task(
            background_create_notification,
            user_id=admin.id,
            title="Revision Requested",
            message=f"Client requested a revision for '{order.title}'",
            link=f"/orders/{order.id}",
            type=NotificationType.ORDER
        )
    return revision

@router.get("/orders/{order_id}/revisions", response_model=List[RevisionResponse])
def get_order_revisions(order_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return order.revisions

@router.post("/revisions/{revision_id}/resolve", response_model=RevisionResponse)
def resolve_revision(revision_id: int, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    revision = session.get(Revision, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    order = session.get(Order, revision.order_id)
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    revision.is_addressed = True
    session.add(revision)
    session.commit()
    session.refresh(revision)
    return revision

# --- Messages ---

@router.post("/test_bg_task")
async def test_bg_task():
    from services.notification_service import background_create_notification
    try:
        await background_create_notification(
            user_id=1,
            title="Test Endpoint",
            message="Message from test endpoint",
            link="/test",
            type=NotificationType.SYSTEM
        )
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/orders/{order_id}/messages", response_model=List[MessageResponse])
def get_order_messages(order_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view messages")
        
    messages = session.exec(
        select(Message)
        .where(Message.order_id == order_id)
        .order_by(Message.created_at.asc())
        .options(joinedload(Message.sender))
    ).all()
    responses = []
    for msg in messages:
        sender_name = msg.sender.full_name if msg.sender else "Unknown"
        responses.append(MessageResponse(
            id=msg.id,
            order_id=msg.order_id,
            sender_id=msg.sender_id,
            sender_name=sender_name,
            content=msg.content,
            created_at=msg.created_at
        ))
    return responses

@router.post("/orders/{order_id}/messages", response_model=MessageResponse)
async def create_order_message(order_id: int, request: MessageCreateRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to send messages")
        
    msg = Message(
        order_id=order_id,
        sender_id=current_user.id,
        content=request.content
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    
    # Broadcast to websocket
    payload = {
        "type": "chat_message",
        "data": {
            "id": msg.id,
            "order_id": msg.order_id,
            "sender_id": msg.sender_id,
            "sender_name": current_user.full_name,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        }
    }
    
    from core.websocket import manager
    # Send to client and all admins
    recipients = {order.client_id}
    admins = session.exec(select(User.id).where(User.is_admin == True)).all()
    recipients.update(admins)
    
    for rid in recipients:
        await manager.send_personal_message(payload, rid)
        
    from services.notification_service import create_notification
    
    if current_user.is_admin:
        await create_notification(
            session=session,
            user_id=order.client_id,
            title=f"New Message in '{order.title}'",
            message=f"{current_user.full_name}: {msg.content[:100]}{'...' if len(msg.content) > 100 else ''}",
            link=f"/orders/{order.id}",
            type=NotificationType.SYSTEM
        )
    else:
        for admin_id in admins:
            await create_notification(
                session=session,
                user_id=admin_id,
                title=f"New Message from Client in '{order.title}'",
                message=f"{current_user.full_name}: {msg.content[:100]}{'...' if len(msg.content) > 100 else ''}",
                link=f"/orders/{order.id}",
                type=NotificationType.SYSTEM
            )
        
    return MessageResponse(
        id=msg.id,
        order_id=msg.order_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        content=msg.content,
        created_at=msg.created_at
    )

def _apply_configured_watermark(original_path: str, watermarked_path: str, session: Session, is_final_unpaid: bool = False, order_context: dict = None) -> bool:
    w_type = get_setting(session, "watermark_type", "text")
    w_text = get_setting(session, "watermark_text", "WIP DICE #{order_id}")
    w_filename = get_setting(session, "watermark_image_filename", "")
    w_opacity = float(get_setting(session, "watermark_opacity", "0.25"))
    w_pattern = get_setting(session, "watermark_pattern", "tiled")
    w_rotation = int(get_setting(session, "watermark_rotation", "-25"))
    w_density = get_setting(session, "watermark_tile_density", "medium")
    w_anti_ai = get_setting(session, "watermark_include_anti_ai_grid", "false").lower() == "true"
    
    if is_final_unpaid and w_type == "text":
        w_text = "DICE UNPAID PREVIEW #{order_id}"
        
    return apply_watermark(
        input_image_path=original_path,
        output_image_path=watermarked_path,
        text=w_text,
        watermark_type=w_type,
        logo_filename=w_filename,
        opacity=w_opacity,
        pattern=w_pattern,
        rotation=w_rotation,
        tile_density=w_density,
        include_anti_ai_grid=w_anti_ai,
        context=order_context
    )


# --- File Delivery ---

@router.post("/orders/{order_id}/files", response_model=FileResponse)
def upload_order_file(order_id: int, background_tasks: BackgroundTasks, file_type: str = Form(...), file: UploadFile = FormFile(...), session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if file_type not in ["WIP", "FINAL", "REFERENCE"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
        
    os.makedirs("uploads/originals", exist_ok=True)
    os.makedirs("uploads/watermarked", exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".psd", ".clip", ".pdf", ".zip", ".rar"]:
        raise HTTPException(status_code=400, detail="Invalid file extension. Allowed: images, psd, clip, pdf, zip, rar")
    unique_name = f"{order_id}_{secrets.token_hex(6)}{file_ext}"
    
    original_path = os.path.join("uploads/originals", unique_name)
    watermarked_path = os.path.join("uploads/watermarked", unique_name)
    
    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    is_watermarked = False
    if file_type == "WIP":
        is_watermarked = _apply_configured_watermark(original_path, watermarked_path, session)
    elif file_type == "FINAL":
        fully_paid = is_order_fully_paid(order_id, session)
        if not fully_paid:
            is_watermarked = _apply_configured_watermark(original_path, watermarked_path, session, is_final_unpaid=True)
            
    db_file = DBFile(
        filename=file.filename,
        s3_key=unique_name,
        is_watermarked=is_watermarked,
        file_type=file_type,
        order_id=order_id
    )
    session.add(db_file)
    session.commit()
    session.refresh(db_file)
    
    background_tasks.add_task(
        background_create_notification,
        user_id=order.client_id,
        title="New File Uploaded",
        message=f"A new {file_type} file has been uploaded for your order '{order.title}'.",
        link=f"/orders/{order.id}",
        type=NotificationType.ORDER
    )
    return db_file

@router.get("/orders/{order_id}/files", response_model=List[FileResponse])
def get_order_files(order_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    fully_paid = is_order_fully_paid(order_id, session)
    
    files = session.exec(select(DBFile).where(DBFile.order_id == order_id)).all()
    
    for f in files:
        if f.file_type == "FINAL" and not fully_paid:
            orig_path = os.path.join("uploads/originals", f.s3_key)
            wm_path = os.path.join("uploads/watermarked", f.s3_key)
            if os.path.exists(orig_path) and not os.path.exists(wm_path):
                f.is_watermarked = _apply_configured_watermark(orig_path, wm_path, session, is_final_unpaid=True)
                session.add(f)
    if any(f.is_watermarked for f in files):
        session.commit()
        files = session.exec(select(DBFile).where(DBFile.order_id == order_id)).all()
        
    return files

@router.get("/orders/{order_id}/files/{file_id}/download")
def download_order_file(order_id: int, file_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_file = session.get(DBFile, file_id)
    if not db_file or db_file.order_id != order_id:
        raise HTTPException(status_code=404, detail="File not found")
        
    fully_paid = is_order_fully_paid(order_id, session)
    
    original_path = os.path.join("uploads/originals", db_file.s3_key)
    watermarked_path = os.path.join("uploads/watermarked", db_file.s3_key)
    
    if not current_user.is_admin:
        if db_file.file_type == "WIP":
            if not os.path.exists(watermarked_path) and os.path.exists(original_path):
                _apply_configured_watermark(original_path, watermarked_path, session)
            if os.path.exists(watermarked_path):
                return SecureFileResponse(watermarked_path, filename=f"PREVIEW_{db_file.filename}")
            return SecureFileResponse(original_path, filename=db_file.filename)
            
        elif db_file.file_type == "FINAL":
            if fully_paid:
                return SecureFileResponse(original_path, filename=db_file.filename)
            else:
                if not os.path.exists(watermarked_path) and os.path.exists(original_path):
                    _apply_configured_watermark(original_path, watermarked_path, session, is_final_unpaid=True)
                if os.path.exists(watermarked_path):
                    return SecureFileResponse(watermarked_path, filename=f"UNPAID_PREVIEW_{db_file.filename}")
                raise HTTPException(status_code=402, detail="Payment required to download original file")
                
    if os.path.exists(original_path):
        return SecureFileResponse(original_path, filename=db_file.filename)
        
    raise HTTPException(status_code=404, detail="File not found on disk")

@router.delete("/orders/{order_id}/files/{file_id}")
def delete_order_file(order_id: int, file_id: int, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_file = session.get(DBFile, file_id)
    if not db_file or db_file.order_id != order_id:
        raise HTTPException(status_code=404, detail="File not found")
    original_path = os.path.join("uploads/originals", db_file.s3_key)
    watermarked_path = os.path.join("uploads/watermarked", db_file.s3_key)
    if os.path.exists(original_path):
        os.remove(original_path)
    if os.path.exists(watermarked_path):
        os.remove(watermarked_path)
    session.delete(db_file)
    session.commit()
    return {"message": "File deleted successfully"}

