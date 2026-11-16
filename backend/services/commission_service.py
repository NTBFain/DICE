from services.payment_service import new_order_fee_bps
import logging
import os
import re
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Tuple, Dict, Any, Optional
from datetime import timedelta
from fastapi import HTTPException
from sqlmodel import Session, select, func

from core.time import utcnow
from models import (
    ArtistProfile, ArtistService, Order, OrderStatus,
    MilestoneInvoice, File as DBFile, NotificationType
)
from models.commission import (
    ArtistCommissionPolicy, ServiceAddon, AddonPriceType,
    CommissionRequest, CommissionRequestStatus, CommissionSlotSubscription
)
from services.notification_service import bulk_create_notifications

logger = logging.getLogger(__name__)

COOLDOWN_SECONDS = 1800  # 30 minutes notification throttle

def count_used_slots(session: Session, service_id: int) -> int:
    """
    Computes the number of active slots for a given service dynamically
    from non-completed, non-cancelled orders. This avoids counter-drift bugs.
    """
    statement = (
        select(func.count(Order.id))
        .where(Order.service_id == service_id)
        .where(Order.status.not_in([OrderStatus.COMPLETED, OrderStatus.CANCELLED]))
    )
    result = session.exec(statement).first()
    return result or 0

def get_effective_status(profile: ArtistProfile, service: ArtistService, used_slots: int) -> str:
    """
    Evaluates the real-time availability of a commission service.
    Returns: 'CLOSED', 'FULL', 'WAITLIST', or 'OPEN'.
    """
    if profile.commission_status == "CLOSED" or not service.is_form_open:
        return "CLOSED"
    if used_slots >= service.max_slots:
        return "FULL"
    if profile.commission_status == "WAITLIST":
        return "WAITLIST"
    return "OPEN"

def compute_total_price(
    service: ArtistService, 
    addons: List[ServiceAddon],
    custom_responses: Optional[Dict[str, Any]] = None
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Calculates total commission price strictly on the server side to prevent price tampering.
    Formula: base_price + sum(fixed) + (base_price * sum(percentage) / 100) + custom_block_fees
    """
    base = Decimal(str(service.base_price))
    fixed_sum = Decimal('0')
    percentage_sum = Decimal('0')
    addons_snapshot = []

    for addon in addons:
        if not addon.is_active or addon.service_id != service.id:
            continue
        addons_snapshot.append({
            "id": addon.id,
            "name": addon.name,
            "price_type": str(addon.price_type.value if hasattr(addon.price_type, "value") else addon.price_type),
            "price_value": float(addon.price_value)
        })
        if addon.price_type == AddonPriceType.FIXED:
            fixed_sum += Decimal(str(addon.price_value))
        elif addon.price_type == AddonPriceType.PERCENTAGE:
            percentage_sum += Decimal(str(addon.price_value))

    # Process modular form blocks if present
    custom_fixed_sum = Decimal('0')
    custom_percent_sum = Decimal('0')

    if custom_responses and getattr(service, "form_schema", None):
        blocks_by_type = {b.get("type"): b for b in (service.form_schema or []) if b.get("enabled")}

        # 1. CHARACTER_COUNT
        if "CHARACTER_COUNT" in blocks_by_type and "character_count" in custom_responses:
            try:
                char_count = int(custom_responses["character_count"])
                if char_count > 1:
                    extra_chars = char_count - 1
                    cfg = blocks_by_type["CHARACTER_COUNT"].get("config", {})
                    pct_per_char = Decimal(str(cfg.get("extra_price_percent", 70)))
                    custom_percent_sum += extra_chars * pct_per_char
            except (ValueError, TypeError):
                pass

        # 2. BACKGROUND_TIER
        if "BACKGROUND_TIER" in blocks_by_type and "background_tier" in custom_responses:
            selected_bg = custom_responses["background_tier"]
            selected_label = selected_bg.get("label") if isinstance(selected_bg, dict) else str(selected_bg)
            cfg = blocks_by_type["BACKGROUND_TIER"].get("config", {})
            for opt in cfg.get("tiers", cfg.get("options", [])):
                if opt.get("label") == selected_label:
                    custom_fixed_sum += Decimal(str(opt.get("price", 0)))
                    break

        # 3. RUSH_MODE
        if "RUSH_MODE" in blocks_by_type and "rush_order" in custom_responses:
            rush_data = custom_responses["rush_order"]
            selected_days = rush_data.get("days") if isinstance(rush_data, dict) else None
            if selected_days is not None:
                cfg = blocks_by_type["RUSH_MODE"].get("config", {})
                for rate in cfg.get("rates", []):
                    if int(rate.get("days")) == int(selected_days):
                        custom_percent_sum += Decimal(str(rate.get("percent", 0)))
                        break

        # 4. PRIVACY_NDA
        if "PRIVACY_NDA" in blocks_by_type and custom_responses.get("privacy_nda"):
            cfg = blocks_by_type["PRIVACY_NDA"].get("config", {})
            custom_fixed_sum += Decimal(str(cfg.get("price", 0)))

    percentage_amount = base * ((percentage_sum + custom_percent_sum) / 100)
    total = float((base + fixed_sum + custom_fixed_sum + percentage_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    return total, addons_snapshot


def validate_custom_responses(service: ArtistService, responses: Dict[str, Any]) -> None:
    for block in service.form_schema or []:
        if not block.get('enabled'):
            continue
        config = block.get('config') or {}
        if block.get('type') == 'CUSTOM_QUESTIONS':
            answers = responses.get('custom_answers') or {}
            if not isinstance(answers, dict):
                raise HTTPException(status_code=422, detail='Custom answers must be an object.')
            for question in config.get('questions', []):
                answer = answers.get(question.get('id'))
                if question.get('required') and (not isinstance(answer, str) or not answer.strip()):
                    raise HTTPException(status_code=422, detail=f"Required answer: {question.get('label', question.get('id'))}")
        elif block.get('type') == 'SCOPE_EXCLUSIONS' and config.get('require_ack', True):
            if responses.get('scope_exclusions_acknowledged') is not True:
                raise HTTPException(status_code=422, detail='Please acknowledge the service scope exclusions.')

def snapshot_custom_responses(service: ArtistService, responses: Dict[str, Any]) -> Dict[str, Any]:
    """Freeze server-authored question labels beside the answers in the existing JSON snapshot."""
    result = dict(responses)
    answers = result.get('custom_answers')
    labels = {}
    if isinstance(answers, dict):
        for block in service.form_schema or []:
            if block.get('enabled') and block.get('type') == 'CUSTOM_QUESTIONS':
                for question in (block.get('config') or {}).get('questions', []):
                    key, label = question.get('id'), question.get('label')
                    if key in answers and isinstance(key, str) and isinstance(label, str) and label.strip():
                        labels[key] = label
    # Client-supplied metadata is always replaced, including for an empty snapshot.
    result['custom_question_labels'] = labels
    return result


def accept_commission_request(session: Session, request_id: int, artist_user_id: int) -> Order:
    """
    Atomically accepts a pending commission request:
    1. Validates ownership and status
    2. Verifies slot capacity
    3. Converts into an active Order + Milestone Invoices
    4. Copies reference images into Order Files
    5. Auto-closes service if slot reaches capacity
    """
    request = session.get(CommissionRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Commission request not found")

    if request.artist_user_id != artist_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this commission request")

    if request.status != CommissionRequestStatus.PENDING:
        raise HTTPException(status_code=409, detail=f"Request cannot be accepted in status '{request.status.value}'")

    service = session.get(ArtistService, request.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Associated commission service not found")

    used_slots = count_used_slots(session, service.id)
    if used_slots >= service.max_slots:
        raise HTTPException(status_code=409, detail=f"Cannot accept request: Service is full ({used_slots}/{service.max_slots} slots)")

    # Fetch policy for deposit percent and revisions
    policy = session.exec(
        select(ArtistCommissionPolicy).where(ArtistCommissionPolicy.artist_id == service.artist_id)
    ).first()

    deposit_pct = policy.deposit_percent if policy else 50
    revision_quota = policy.default_revision_quota if policy else 3

    custom_desc = ""
    if request.custom_responses:
        lines = []
        responses = request.custom_responses
        labels = responses.get('custom_question_labels')
        if not isinstance(labels, dict):
            labels = {}  # Historical question wording cannot be recovered from an edited live form.
        for k, v in responses.items():
            if k == 'custom_question_labels':
                continue
            if k == 'custom_answers' and isinstance(v, dict):
                for question_id, answer in v.items():
                    lines.append(f"- {labels.get(question_id, 'Additional answer')}: {answer}")
                continue
            if isinstance(v, dict):
                v_str = ", ".join(f"{sub_k}: {sub_v}" for sub_k, sub_v in v.items())
            elif isinstance(v, list):
                v_str = ", ".join(str(item) for item in v)
            else:
                v_str = str(v)
            lines.append(f"- {k.replace('_', ' ').capitalize()}: {v_str}")
        if lines:
            custom_desc = "\n\nForm Custom Specs:\n" + "\n".join(lines)

    order_desc = (
        f"Creative Brief:\n{request.brief}\n\n"
        f"Canvas Size: {request.canvas_size}\n"
        f"Usage: {request.usage_type}\n"
        f"Reference Links: {request.reference_links or 'None'}"
        f"{custom_desc}"
    )

    new_order = Order(
        platform_fee_bps_snapshot=new_order_fee_bps(session),
        title=f"[{service.title}] {request.character_name}",
        description=order_desc,
        status=OrderStatus.ACCEPTED,
        agreed_price=request.total_price,
        revision_quota=revision_quota,
        client_id=request.client_id,
        artist_id=request.artist_user_id,
        service_id=service.id,
        commission_request_id=request.id,
        due_date=request.requested_deadline
    )
    session.add(new_order)
    session.flush()

    # Generate milestone invoices based on deposit_pct
    total_price = request.total_price
    if deposit_pct >= 100:
        session.add(MilestoneInvoice(
            title="Full Payment",
            amount=total_price,
            order_id=new_order.id
        ))
    elif deposit_pct <= 0:
        session.add(MilestoneInvoice(
            title="Final Payment (Upon Completion)",
            amount=total_price,
            order_id=new_order.id
        ))
    else:
        deposit_amount = float((Decimal(str(total_price)) * Decimal(str(deposit_pct)) / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        final_amount = round(total_price - deposit_amount, 2)
        session.add(MilestoneInvoice(
            title=f"{deposit_pct}% Initial Deposit",
            amount=deposit_amount,
            order_id=new_order.id
        ))
        session.add(MilestoneInvoice(
            title=f"{100 - deposit_pct}% Final Milestone",
            amount=final_amount,
            order_id=new_order.id
        ))

    # Transfer reference images to Order files
    for ref_path in request.reference_images:
        session.add(DBFile(
            filename=re.sub(r'^[0-9a-f]{32}_\d+_', '', os.path.basename(ref_path)),
            s3_key=ref_path,
            is_watermarked=False,
            file_type="REFERENCE",
            order_id=new_order.id
        ))

    # Mark request as ACCEPTED and link to order
    request.status = CommissionRequestStatus.ACCEPTED
    request.order_id = new_order.id
    request.updated_at = utcnow()
    session.add(request)

    # Check auto-close rule: if used slots + 1 >= max_slots
    if (used_slots + 1) >= service.max_slots and service.auto_close_on_full:
        service.is_form_open = False
        session.add(service)

    session.commit()
    session.refresh(new_order)
    return new_order

async def dispatch_slot_opening_alert(
    session: Session,
    service: ArtistService,
    artist_profile: ArtistProfile,
    notify_followers: bool = True
) -> int:
    """
    Dispatches in-app notifications and WebSocket messages to subscribers
    when an artist opens slots for a service, adhering to a 30-minute cooldown.
    """
    if not notify_followers:
        return 0

    now = utcnow()
    if service.last_open_notified_at:
        elapsed = (now - service.last_open_notified_at).total_seconds()
        if elapsed < COOLDOWN_SECONDS:
            logger.info(f"Slot alert skipped: Cooldown active ({int(COOLDOWN_SECONDS - elapsed)}s remaining)")
            return 0

    # Query active subscriptions for this artist & service
    statement = (
        select(CommissionSlotSubscription)
        .where(CommissionSlotSubscription.artist_id == artist_profile.id)
        .where(
            (CommissionSlotSubscription.service_id == service.id) |
            (CommissionSlotSubscription.service_id.is_(None))
        )
        .where(CommissionSlotSubscription.is_active == True)
    )
    subscriptions = session.exec(statement).all()
    if not subscriptions:
        service.last_open_notified_at = now
        session.add(service)
        session.commit()
        return 0

    # Avoid notifying the artist themselves
    distinct_user_ids = {sub.user_id for sub in subscriptions if sub.user_id != artist_profile.user_id}
    if not distinct_user_ids:
        return 0

    notification_items = [
        {
            "user_id": uid,
            "title": "🎨 คิวงานคอมมิชชันเปิดรับแล้ว!",
            "message": f"ศิลปิน @{artist_profile.handle} เปิดรับฟอร์มสำหรับ [{service.title}] แล้ว! (สล็อตว่าง: {service.max_slots} คิว)",
            "link": f"/artists/{artist_profile.handle}",
            "type": NotificationType.COMMISSION
        }
        for uid in distinct_user_ids
    ]

    await bulk_create_notifications(session, notification_items)

    service.last_open_notified_at = now
    session.add(service)
    session.commit()
    return len(distinct_user_ids)
