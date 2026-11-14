import os
import re
import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FormFile, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from core.db import get_session
from core.auth import get_current_user
from core.time import utcnow, bangkok_today
from core.security_file import validate_and_save_upload
from models import User, ArtistProfile, ArtistService, NotificationType
from models.commission import (
    ArtistCommissionPolicy, ServiceAddon, CommissionRequest,
    CommissionRequestStatus, CommissionSlotSubscription
)
from schemas.commission import (
    CommissionRequestCreatePayload, CommissionRequestResponse,
    CommissionRequestDeclineRequest, SlotSubscriptionToggleRequest,
    SlotSubscriptionResponse
)
from services.commission_service import (
    count_used_slots, get_effective_status, compute_total_price,
    accept_commission_request, validate_custom_responses, snapshot_custom_responses
)
from services.notification_service import background_create_notification

router = APIRouter(prefix="/api/commissions", tags=["commissions"])

REFERENCES_DIR = "uploads/references"
os.makedirs(REFERENCES_DIR, exist_ok=True)

def sanitize_filename(name: str) -> str:
    base = os.path.basename(name)
    cleaned = re.sub(r'[\r\n\t\x00-\x1f"\\/]', '_', base).strip()
    return cleaned if cleaned else "file"

def _build_request_response(req: CommissionRequest, session: Session) -> CommissionRequestResponse:
    service = session.get(ArtistService, req.service_id)
    client = session.get(User, req.client_id)
    return CommissionRequestResponse(
        id=req.id,
        service_id=req.service_id,
        service_title=service.title if service else "Custom Scale",
        client_id=req.client_id,
        client_name=client.full_name if client else "Client",
        client_email=client.email if client else None,
        artist_user_id=req.artist_user_id,
        status=req.status,
        character_name=req.character_name,
        usage_type=req.usage_type,
        brief=req.brief,
        canvas_size=req.canvas_size,
        requested_deadline=req.requested_deadline,
        reference_links=req.reference_links,
        reference_images=req.reference_images or [],
        addons_snapshot=req.addons_snapshot or [],
        custom_responses=req.custom_responses or {},
        base_price_snapshot=req.base_price_snapshot,
        total_price=req.total_price,
        tos_snapshot=req.tos_snapshot,
        tos_version=req.tos_version,
        decline_reason=req.decline_reason,
        order_id=req.order_id,
        created_at=req.created_at,
        updated_at=req.updated_at
    )

# 1. Submit Commission Request
@router.post("/requests", response_model=CommissionRequestResponse)
async def submit_commission_request(
    background_tasks: BackgroundTasks,
    payload_str: str = Form(..., alias="payload"),
    reference_files: List[UploadFile] = FormFile(default=[]),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    try:
        data_dict = json.loads(payload_str)
        payload = CommissionRequestCreatePayload(**data_dict)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid commission request payload: {str(e)}")

    if not payload.agreed_to_tos:
        raise HTTPException(status_code=422, detail="You must agree to the artist's Terms of Service and No-AI policy.")

    # The selected deadline is a calendar date, judged consistently in Bangkok.
    if payload.requested_deadline and payload.requested_deadline.date() < bangkok_today(utcnow()):
        raise HTTPException(status_code=422, detail="Requested deadline cannot be in the past. Choose today or a later date.")

    service = session.get(ArtistService, payload.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Selected commission service not found")

    artist_profile = session.get(ArtistProfile, service.artist_id)
    if not artist_profile:
        raise HTTPException(status_code=404, detail="Artist profile not found")

    # Artist owners are allowed to submit test/preview commission requests on their own profile
    is_owner_preview = artist_profile.user_id == current_user.id

    # Check effective status
    used_slots = count_used_slots(session, service.id)
    status = get_effective_status(artist_profile, service, used_slots)
    if status in ["CLOSED", "FULL"] and not is_owner_preview:
        raise HTTPException(status_code=409, detail=f"This commission service is currently {status}.")

    # Rate limiting: max 3 pending requests per client to this artist
    if not is_owner_preview:
        pending_count = session.exec(
            select(CommissionRequest)
            .where(CommissionRequest.client_id == current_user.id)
            .where(CommissionRequest.artist_user_id == artist_profile.user_id)
            .where(CommissionRequest.status == CommissionRequestStatus.PENDING)
        ).all()
        if len(pending_count) >= 3:
            raise HTTPException(status_code=429, detail="You have 3 pending commission requests waiting for this artist. Please wait for a response.")

    # Max 5 reference images
    if len(reference_files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 reference image files allowed.")

    # Validate addons and compute price strictly on server
    addons = []
    if payload.addon_ids:
        addons = session.exec(
            select(ServiceAddon)
            .where(ServiceAddon.id.in_(payload.addon_ids))
            .where(ServiceAddon.service_id == service.id)
            .where(ServiceAddon.is_active == True)
        ).all()

    validate_custom_responses(service, payload.custom_responses)
    total_price, addons_snapshot = compute_total_price(service, addons, payload.custom_responses)

    # Fetch policy for snapshot
    policy = session.exec(
        select(ArtistCommissionPolicy).where(ArtistCommissionPolicy.artist_id == artist_profile.id)
    ).first()
    tos_snapshot = policy.terms_of_service if policy else ""
    tos_version = policy.version if policy else 1

    # Save reference images
    req_uuid = uuid.uuid4().hex
    saved_images = []
    created_paths = []
    try:
        for idx, file_obj in enumerate(reference_files):
            clean_name = sanitize_filename(file_obj.filename or f"ref_{idx}.png")
            storage_filename = f"{req_uuid}_{idx}_{clean_name}"
            dest_path = os.path.join(REFERENCES_DIR, storage_filename)
            validate_and_save_upload(file_obj, dest_path, max_size=10 * 1024 * 1024)
            created_paths.append(dest_path)
            saved_images.append(storage_filename)
    except Exception as e:
        for p in created_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass
        raise e

    commission_request = CommissionRequest(
        service_id=service.id,
        client_id=current_user.id,
        artist_user_id=artist_profile.user_id,
        status=CommissionRequestStatus.PENDING,
        character_name=payload.character_name.strip(),
        usage_type=payload.usage_type.strip(),
        brief=payload.brief.strip(),
        canvas_size=payload.canvas_size.strip(),
        requested_deadline=payload.requested_deadline,
        reference_links=payload.reference_links.strip() if payload.reference_links else None,
        reference_images=saved_images,
        addons_snapshot=addons_snapshot,
        custom_responses=snapshot_custom_responses(service, payload.custom_responses or {}),
        base_price_snapshot=float(service.base_price),
        total_price=total_price,
        tos_snapshot=tos_snapshot,
        tos_version=tos_version
    )
    session.add(commission_request)
    session.commit()
    session.refresh(commission_request)

    # Notify artist
    background_tasks.add_task(
        background_create_notification,
        user_id=artist_profile.user_id,
        title="📥 คุณได้รับคำขอคอมมิชชันใหม่!",
        message=f"ผู้ใช้ {current_user.full_name} ส่งบรีฟขอจ้างงาน [{service.title}] ราคา ฿{total_price:,.2f}",
        link="/dashboard/artist/commissions",
        type=NotificationType.COMMISSION
    )

    return _build_request_response(commission_request, session)

# 2. Get incoming requests for artist
@router.get("/requests/incoming", response_model=List[CommissionRequestResponse])
def get_incoming_requests(
    status: Optional[CommissionRequestStatus] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    query = select(CommissionRequest).where(CommissionRequest.artist_user_id == current_user.id)
    if status:
        query = query.where(CommissionRequest.status == status)
    query = query.order_by(CommissionRequest.created_at.desc())
    requests = session.exec(query).all()
    return [_build_request_response(r, session) for r in requests]

# 3. Get client's submitted requests
@router.get("/requests/mine", response_model=List[CommissionRequestResponse])
def get_my_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(CommissionRequest)
        .where(CommissionRequest.client_id == current_user.id)
        .order_by(CommissionRequest.created_at.desc())
    )
    requests = session.exec(query).all()
    return [_build_request_response(r, session) for r in requests]

# 4. Get specific request detail
@router.get("/requests/{request_id}", response_model=CommissionRequestResponse)
def get_request_detail(
    request_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    req = session.get(CommissionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Commission request not found")
    if not (current_user.is_admin or req.client_id == current_user.id or req.artist_user_id == current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    return _build_request_response(req, session)

# 5. Accept Request (Artist Action)
@router.post("/requests/{request_id}/accept", response_model=CommissionRequestResponse)
def accept_request_endpoint(
    request_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    order = accept_commission_request(session, request_id, current_user.id)
    req = session.get(CommissionRequest, request_id)

    # Notify client
    background_tasks.add_task(
        background_create_notification,
        user_id=req.client_id,
        title="🎉 ศิลปินตอบรับคำขอคอมมิชชันของคุณแล้ว!",
        message=f"ออเดอร์ #{order.id} ถูกสร้างขึ้นแล้ว โปรดตรวจสอบและดำเนินการชำระเงินมัดจำ",
        link=f"/orders/{order.id}",
        type=NotificationType.COMMISSION
    )

    return _build_request_response(req, session)

# 6. Decline Request (Artist Action)
@router.post("/requests/{request_id}/decline", response_model=CommissionRequestResponse)
def decline_request_endpoint(
    request_id: int,
    payload: CommissionRequestDeclineRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    req = session.get(CommissionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Commission request not found")
    if req.artist_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to decline this request")
    if req.status != CommissionRequestStatus.PENDING:
        raise HTTPException(status_code=409, detail=f"Cannot decline request in status '{req.status.value}'")

    req.status = CommissionRequestStatus.DECLINED
    req.decline_reason = payload.reason.strip()
    req.updated_at = utcnow()
    session.add(req)
    session.commit()
    session.refresh(req)

    background_tasks.add_task(
        background_create_notification,
        user_id=req.client_id,
        title="คำขอคอมมิชชันของคุณถูกปฏิเสธ",
        message=f"ศิลปินไม่สามารถรับงานได้: {req.decline_reason}",
        link="/dashboard/client",
        type=NotificationType.COMMISSION
    )

    return _build_request_response(req, session)

# 7. Withdraw Request (Client Action)
@router.post("/requests/{request_id}/withdraw", response_model=CommissionRequestResponse)
def withdraw_request_endpoint(
    request_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    req = session.get(CommissionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Commission request not found")
    if req.client_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to withdraw this request")
    if req.status != CommissionRequestStatus.PENDING:
        raise HTTPException(status_code=409, detail=f"Cannot withdraw request in status '{req.status.value}'")

    req.status = CommissionRequestStatus.WITHDRAWN
    req.updated_at = utcnow()
    session.add(req)
    session.commit()
    session.refresh(req)
    return _build_request_response(req, session)

# 8. View Reference Image (Protected & Sanitized)
@router.get("/requests/{request_id}/references/{filename}")
def get_reference_file(
    request_id: int,
    filename: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    req = session.get(CommissionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not (current_user.is_admin or req.client_id == current_user.id or req.artist_user_id == current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view reference files")

    clean_name = sanitize_filename(filename)
    if clean_name not in req.reference_images:
        raise HTTPException(status_code=404, detail="Reference file not associated with this request")

    file_path = os.path.join(REFERENCES_DIR, clean_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(file_path)

# 9. Slot Subscription Toggle (Bell Button)
@router.post("/subscriptions", response_model=SlotSubscriptionResponse)
def toggle_slot_subscription(
    payload: SlotSubscriptionToggleRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    artist = session.get(ArtistProfile, payload.artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    if artist.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot subscribe to your own commission slots")

    # Check existing subscription
    statement = (
        select(CommissionSlotSubscription)
        .where(CommissionSlotSubscription.user_id == current_user.id)
        .where(CommissionSlotSubscription.artist_id == payload.artist_id)
    )
    if payload.service_id:
        statement = statement.where(CommissionSlotSubscription.service_id == payload.service_id)
    else:
        statement = statement.where(CommissionSlotSubscription.service_id.is_(None))

    existing = session.exec(statement).first()
    if existing:
        existing.is_active = not existing.is_active
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    new_sub = CommissionSlotSubscription(
        user_id=current_user.id,
        artist_id=payload.artist_id,
        service_id=payload.service_id,
        is_active=True
    )
    session.add(new_sub)
    session.commit()
    session.refresh(new_sub)
    return new_sub

# 10. Check Subscription Status
@router.get("/subscriptions/status")
def check_subscription_status(
    artist_id: int,
    service_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = (
        select(CommissionSlotSubscription)
        .where(CommissionSlotSubscription.user_id == current_user.id)
        .where(CommissionSlotSubscription.artist_id == artist_id)
        .where(CommissionSlotSubscription.is_active == True)
    )
    if service_id:
        statement = statement.where(
            (CommissionSlotSubscription.service_id == service_id) |
            (CommissionSlotSubscription.service_id.is_(None))
        )
    sub = session.exec(statement).first()
    return {"is_subscribed": bool(sub)}
