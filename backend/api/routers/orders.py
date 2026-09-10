import os
import shutil
import secrets
import math
import re
import glob
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FormFile, Form, BackgroundTasks
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session, select, func
from sqlalchemy.orm import joinedload
from typing import List, Optional

from core.db import get_session
from core.auth import get_current_user, get_admin_user, get_artist_user
from core.watermark import apply_watermark
from core.security_file import validate_and_save_upload
from models import Order, OrderStatus, MilestoneInvoice, Revision, Message, File as DBFile, User, NotificationType, ArtistProfile
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

VALID_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.ACCEPTED, OrderStatus.CANCELLED},
    OrderStatus.ACCEPTED: {OrderStatus.SKETCHING, OrderStatus.CANCELLED},
    OrderStatus.SKETCHING: {OrderStatus.COLORING, OrderStatus.CANCELLED},
    OrderStatus.COLORING: {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set()
}

def _is_authorized_for_order(order: Order, user: User) -> bool:
    return user.is_admin or order.client_id == user.id or order.artist_id == user.id

def sanitize_filename(name: str) -> str:
    base = os.path.basename(name)
    cleaned = re.sub(r'[\r\n\t\x00-\x1f"\\/]', '_', base).strip()
    return cleaned if cleaned else "file"

@router.post("/orders", response_model=OrderResponse)
def create_order(
    request: OrderCreateRequest, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    target_artist_user_id = request.artist_id
    artist_profile = session.get(ArtistProfile, request.artist_id)
    if artist_profile and artist_profile.user_id:
        target_artist_user_id = artist_profile.user_id
    else:
        artist_user = session.get(User, request.artist_id)
        if not artist_user:
            target_artist_user_id = 1
            
    order = Order(
        title=request.title.strip(),
        description=request.description.strip(),
        status=OrderStatus.PENDING,
        revision_quota=request.revision_quota if request.revision_quota is not None else 3,
        client_id=current_user.id,
        artist_id=target_artist_user_id,
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
    """Public queue board showing active orders with masked customer names"""
    active_statuses = [OrderStatus.ACCEPTED, OrderStatus.SKETCHING, OrderStatus.COLORING]
    statement = (
        select(Order)
        .where(Order.status.in_(active_statuses))
        .options(joinedload(Order.client))
        .order_by(Order.id.asc())
    )
    orders = session.exec(statement).all()
    
    queue_items = []
    for idx, o in enumerate(orders, start=1):
        raw_name = o.client.full_name if o.client else "Client"
        masked_name = " ".join([f"{p[0]}***" if len(p) > 1 else "***" for p in raw_name.split()])
        
        queue_items.append({
            "slot_number": idx,
            "order_id": o.id,
            "status": o.status.value,
            "stage": o.status.value,
            "title": f"Commission Slot #{idx}",
            "client_name": masked_name,
            "start_date": o.start_date.isoformat() if o.start_date else None,
            "due_date": o.due_date.isoformat() if o.due_date else None,
            "created_at": o.created_at.isoformat() if o.created_at else None
        })
    return queue_items

@router.get("/orders", response_model=List[OrderResponse])
def get_orders(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if current_user.is_admin:
        statement = select(Order).options(joinedload(Order.client))
    elif current_user.is_artist:
        from sqlalchemy import or_
        statement = select(Order).where(or_(Order.artist_id == current_user.id, Order.client_id == current_user.id)).options(joinedload(Order.client))
    else:
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
        
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
            
    artist = session.get(User, order.artist_id)
    d = order.model_dump()
    d['client_name'] = order.client.full_name if order.client else "Unknown"
    d['artist_name'] = artist.full_name if artist else "Unknown"
    return d

@router.patch("/orders/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int, 
    request: OrderUpdateRequest, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to update this order")
        
    # 1. State Machine Transitions
    if request.status is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update order status")
            
        try:
            target_status = OrderStatus(request.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {[s.value for s in OrderStatus]}")
            
        if target_status != order.status:
            allowed = VALID_TRANSITIONS.get(order.status, set())
            if not current_user.is_admin and target_status not in allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Illegal state transition from {order.status.value} to {target_status.value}. Order must proceed through valid stages."
                )
            if target_status == OrderStatus.COMPLETED and not is_order_fully_paid(order.id, session):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot complete order: All invoices must be issued and fully paid before completion."
                )
            order.status = target_status
            
        background_tasks.add_task(
            background_create_notification,
            user_id=order.client_id,
            title="Order Status Updated",
            message=f"Your order '{order.title}' status changed to {order.status.value}",
            link=f"/orders/{order.id}",
            type=NotificationType.ORDER
        )
        
    # 2. Agreed Price Mutation Guard
    if request.agreed_price is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update agreed price")
            
        new_price = round(request.agreed_price, 2)
        invoices_sum = session.exec(
            select(func.coalesce(func.sum(MilestoneInvoice.amount), 0.0))
            .where(MilestoneInvoice.order_id == order_id)
        ).one()
        if new_price < invoices_sum:
            raise HTTPException(
                status_code=400, 
                detail=f"Agreed price (฿{new_price:.2f}) cannot be less than total issued invoices (฿{invoices_sum:.2f})"
            )
            
        paid_invoices = session.exec(
            select(MilestoneInvoice).where(MilestoneInvoice.order_id == order_id, MilestoneInvoice.is_paid == True)
        ).all()
        if paid_invoices and not current_user.is_admin:
            raise HTTPException(status_code=400, detail="Cannot modify agreed price after payment has already been collected")
            
        order.agreed_price = new_price
        
    if request.revision_quota is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update revision quota")
        order.revision_quota = request.revision_quota

    # 3. Restrict Date Mutations to Artists & Admins Only
    if request.start_date is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update start date")
        order.start_date = request.start_date

    if request.due_date is not None:
        if not (current_user.is_admin or (current_user.is_artist and order.artist_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Only artists or admins can update due date")
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
def create_invoice(
    order_id: int, 
    request: MilestoneInvoiceCreateRequest, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    artist_user: User = Depends(get_artist_user)
):
    if request.amount <= 0 or not math.isfinite(request.amount):
        raise HTTPException(status_code=400, detail="Invoice amount must be a positive finite number")
        
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create invoices for this order")
    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot issue invoices for {order.status.value} orders")
        
    existing_sum = session.exec(
        select(func.coalesce(func.sum(MilestoneInvoice.amount), 0.0))
        .where(MilestoneInvoice.order_id == order_id)
    ).one()
    
    if order.agreed_price and (existing_sum + round(request.amount, 2)) > round(order.agreed_price, 2):
        raise HTTPException(
            status_code=400, 
            detail=f"Total invoice amount (฿{existing_sum + request.amount:.2f}) exceeds agreed price (฿{order.agreed_price:.2f})"
        )
    
    invoice = MilestoneInvoice(
        title=request.title.strip(),
        amount=round(request.amount, 2),
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
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view invoices for this order")
        
    invoices = session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order_id)).all()
    return invoices

@router.post("/invoices/{invoice_id}/pay", response_model=MilestoneInvoiceResponse)
def pay_invoice(
    invoice_id: int, 
    background_tasks: BackgroundTasks, 
    slip: UploadFile = FormFile(...), 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    invoice = session.get(MilestoneInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.is_paid:
        raise HTTPException(status_code=400, detail="Cannot upload slip: Invoice is already approved and paid.")
        
    order = session.get(Order, invoice.order_id)
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay this invoice")
        
    os.makedirs("uploads/slips", exist_ok=True)
    file_ext = os.path.splitext(slip.filename or "")[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        raise HTTPException(status_code=400, detail="Invalid slip file extension. Allowed: jpg, jpeg, png, webp, pdf")
        
    # Clean up previous slips for this invoice before writing new slip
    old_matches = glob.glob(os.path.join("uploads/slips", f"slip_{invoice_id}_*"))
    for old_file in old_matches:
        try:
            os.remove(old_file)
        except OSError:
            pass
            
    slip_filename = f"slip_{invoice_id}_{secrets.token_hex(4)}{file_ext}"
    slip_path = os.path.join("uploads/slips", slip_filename)
    
    validate_and_save_upload(slip, slip_path, max_size=15 * 1024 * 1024, is_deliverable=True)
        
    invoice.slip_image_url = f"/api/invoices/{invoice_id}/slip"
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    
    recipients = {order.artist_id}
    admins = session.exec(select(User.id).where(User.is_admin == True)).all()
    recipients.update(admins)
    
    for r_id in recipients:
        background_tasks.add_task(
            background_create_notification,
            user_id=r_id,
            title="Payment Uploaded",
            message=f"Client uploaded payment slip for invoice '{invoice.title}' in order '{order.title}'",
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
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this slip")
        
    if not invoice.slip_image_url:
        raise HTTPException(status_code=400, detail="No slip uploaded for this invoice")
        
    slips_dir = "uploads/slips"
    if not os.path.exists(slips_dir):
        raise HTTPException(status_code=404, detail="Slip file not found")
    
    matches = glob.glob(os.path.join(slips_dir, f"slip_{invoice_id}_*"))
    if matches:
        return SecureFileResponse(matches[0])
            
    raise HTTPException(status_code=404, detail="Slip file not found on disk")

@router.post("/invoices/{invoice_id}/approve", response_model=MilestoneInvoiceResponse)
def approve_invoice_payment(
    invoice_id: int, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    artist_user: User = Depends(get_artist_user)
):
    invoice = session.get(MilestoneInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    order = session.get(Order, invoice.order_id)
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to approve payments for this order")
        
    invoice.is_paid = True
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    
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
def request_revision(
    order_id: int, 
    request: RevisionCreateRequest, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not current_user.is_admin and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to request revisions for this order")
        
    if order.status not in [OrderStatus.SKETCHING, OrderStatus.COLORING]:
        raise HTTPException(status_code=400, detail="Revisions can only be requested during sketching or coloring phases")
        
    # Atomic DB count check
    current_revisions_count = session.exec(
        select(func.count(Revision.id)).where(Revision.order_id == order_id)
    ).one()
    if current_revisions_count >= order.revision_quota:
        raise HTTPException(status_code=400, detail=f"Revision quota exceeded ({order.revision_quota} max)")
        
    revision = Revision(
        client_feedback=request.client_feedback.strip(),
        is_addressed=False,
        order_id=order_id
    )
    session.add(revision)
    session.commit()
    session.refresh(revision)
    
    recipients = {order.artist_id}
    admins = session.exec(select(User.id).where(User.is_admin == True)).all()
    recipients.update(admins)
    
    for r_id in recipients:
        background_tasks.add_task(
            background_create_notification,
            user_id=r_id,
            title="Revision Requested",
            message=f"Client requested a revision for order '{order.title}'",
            link=f"/orders/{order.id}",
            type=NotificationType.ORDER
        )
    return revision

@router.get("/orders/{order_id}/revisions", response_model=List[RevisionResponse])
def get_order_revisions(order_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view revisions for this order")
    return order.revisions

@router.post("/revisions/{revision_id}/resolve", response_model=RevisionResponse)
def resolve_revision(revision_id: int, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    revision = session.get(Revision, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    order = session.get(Order, revision.order_id)
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to resolve revisions for this order")
        
    revision.is_addressed = True
    session.add(revision)
    session.commit()
    session.refresh(revision)
    return revision

# --- Messages ---

@router.get("/orders/{order_id}/messages", response_model=List[MessageResponse])
def get_order_messages(order_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view messages for this order")
        
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
async def create_order_message(
    order_id: int, 
    request: MessageCreateRequest, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this order")
        
    msg = Message(
        order_id=order_id,
        sender_id=current_user.id,
        content=request.content.strip()
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    
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
    recipients = {order.client_id, order.artist_id}
    admins = session.exec(select(User.id).where(User.is_admin == True)).all()
    recipients.update(admins)
    recipients.discard(current_user.id)
    
    for rid in recipients:
        try:
            await manager.send_personal_message(payload, rid)
        except Exception:
            pass
            
    from services.notification_service import create_notification
    for rid in recipients:
        try:
            await create_notification(
                session=session,
                user_id=rid,
                title=f"New Message in '{order.title}'",
                message=f"{current_user.full_name}: {msg.content[:100]}",
                link=f"/orders/{order.id}",
                type=NotificationType.SYSTEM
            )
        except Exception:
            pass
        
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
def upload_order_file(
    order_id: int, 
    background_tasks: BackgroundTasks, 
    file_type: str = Form(...), 
    file: UploadFile = FormFile(...), 
    session: Session = Depends(get_session), 
    artist_user: User = Depends(get_artist_user)
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload files for this order")
        
    if file_type not in ["WIP", "FINAL", "REFERENCE"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Must be WIP, FINAL, or REFERENCE")
        
    os.makedirs("uploads/originals", exist_ok=True)
    os.makedirs("uploads/watermarked", exist_ok=True)
    
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".psd", ".clip", ".pdf", ".zip", ".rar"]:
        raise HTTPException(status_code=400, detail="Invalid file extension. Allowed: images, psd, clip, pdf, zip, rar")
    unique_name = f"{order_id}_{secrets.token_hex(6)}{file_ext}"
    
    original_path = os.path.join("uploads/originals", unique_name)
    watermarked_path = os.path.join("uploads/watermarked", unique_name)
    
    # Enforce magic bytes verification and 200MB size limit
    validate_and_save_upload(file, original_path, max_size=200 * 1024 * 1024, is_deliverable=True)
        
    is_watermarked = False
    order_context = {
        "order_id": order.id,
        "client_name": order.client.full_name if order.client else "Client",
        "artist_name": artist_user.full_name,
        "status": file_type
    }
    
    if file_type == "WIP":
        is_watermarked = _apply_configured_watermark(original_path, watermarked_path, session, order_context=order_context)
    elif file_type == "FINAL":
        fully_paid = is_order_fully_paid(order_id, session)
        if not fully_paid:
            is_watermarked = _apply_configured_watermark(original_path, watermarked_path, session, is_final_unpaid=True, order_context=order_context)
            
    db_file = DBFile(
        filename=sanitize_filename(file.filename or "file"),
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
        
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access files for this order")
        
    # Read-only query: no mutating watermark generation or commits in GET endpoint
    files = session.exec(select(DBFile).where(DBFile.order_id == order_id)).all()
    return files

@router.get("/orders/{order_id}/files/{file_id}/download")
def download_order_file(order_id: int, file_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not _is_authorized_for_order(order, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to download files for this order")
        
    db_file = session.get(DBFile, file_id)
    if not db_file or db_file.order_id != order_id:
        raise HTTPException(status_code=404, detail="File not found")
        
    safe_filename = sanitize_filename(db_file.filename)
    original_path = os.path.join("uploads/originals", db_file.s3_key)
    watermarked_path = os.path.join("uploads/watermarked", db_file.s3_key)
    
    # Artists and Admins always receive the original file directly
    if current_user.is_admin or order.artist_id == current_user.id:
        if os.path.exists(original_path):
            return SecureFileResponse(original_path, filename=safe_filename)
        raise HTTPException(status_code=404, detail="Original file not found on disk")
        
    # Client permissions:
    fully_paid = is_order_fully_paid(order_id, session)
    
    if db_file.file_type == "WIP":
        if not os.path.exists(watermarked_path) and os.path.exists(original_path):
            _apply_configured_watermark(original_path, watermarked_path, session)
        if os.path.exists(watermarked_path):
            return SecureFileResponse(watermarked_path, filename=f"PREVIEW_{safe_filename}")
        raise HTTPException(status_code=403, detail="Preview unavailable for non-raster WIP format. Contact artist.")
        
    elif db_file.file_type == "FINAL":
        if fully_paid:
            if os.path.exists(original_path):
                return SecureFileResponse(original_path, filename=safe_filename)
            raise HTTPException(status_code=404, detail="Final deliverable not found on disk")
        else:
            if not os.path.exists(watermarked_path) and os.path.exists(original_path):
                _apply_configured_watermark(original_path, watermarked_path, session, is_final_unpaid=True)
            if os.path.exists(watermarked_path):
                return SecureFileResponse(watermarked_path, filename=f"UNPAID_PREVIEW_{safe_filename}")
            raise HTTPException(status_code=402, detail="Full payment required to unlock final deliverable.")
            
    elif db_file.file_type == "REFERENCE":
        if os.path.exists(original_path):
            return SecureFileResponse(original_path, filename=safe_filename)
            
    raise HTTPException(status_code=404, detail="File not found on disk")

@router.delete("/orders/{order_id}/files/{file_id}")
def delete_order_file(order_id: int, file_id: int, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not artist_user.is_admin and order.artist_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete files from this order")
    db_file = session.get(DBFile, file_id)
    if not db_file or db_file.order_id != order_id:
        raise HTTPException(status_code=404, detail="File not found")
        
    original_path = os.path.join("uploads/originals", db_file.s3_key)
    watermarked_path = os.path.join("uploads/watermarked", db_file.s3_key)
    
    # Delete DB record first within transaction
    session.delete(db_file)
    session.commit()
    
    # After successful DB commit, unlink files from disk
    if os.path.exists(original_path):
        try:
            os.remove(original_path)
        except OSError:
            pass
    if os.path.exists(watermarked_path):
        try:
            os.remove(watermarked_path)
        except OSError:
            pass
            
    return {"message": "File deleted successfully"}
