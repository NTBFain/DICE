import hashlib
import json
import logging
from fastapi import HTTPException
from sqlalchemy import update
from sqlmodel import select
from core.time import utcnow
from core.websocket import manager
from models import User, Order, Notification, NotificationType
from models.payment import ArtistPayout
from models.payout_request import (ArtistPayoutProfile, PayoutRequest, PayoutRequestItem,
                                  PayoutReservation, PayoutRequestEvent)
from services.payout_service import payout_quote, payout_response

logger = logging.getLogger(__name__)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def lock_artist(session, user):
    if not user.is_artist:
        raise HTTPException(403, 'Only artists can register receiving details or request payouts')
    session.exec(update(User).where(User.id == user.id).values(id=User.id)
                 .execution_options(synchronize_session=False))


def load_request(session, request_id, user, *, lock=False):
    request = session.get(PayoutRequest, request_id)
    if not request:
        raise HTTPException(404, 'Payout request not found')
    if not user.is_admin and request.artist_id != user.id:
        raise HTTPException(403, 'Not authorized to view this payout request')
    if lock:
        session.exec(update(PayoutRequest).where(PayoutRequest.id == request_id).values(id=PayoutRequest.id)
                     .execution_options(synchronize_session=False))
        session.refresh(request)
    return request


def request_items(session, request_id):
    return session.exec(select(PayoutRequestItem).where(PayoutRequestItem.request_id == request_id)
                        .order_by(PayoutRequestItem.order_id)).all()


def request_response(session, request, *, detail=False):
    # Commit expires ORM fields; materialize them before serializing the response.
    session.refresh(request)
    result = request.model_dump(exclude={'idempotency_key', 'request_digest', 'mobile_number', 'quote_digest'})
    result['mobile_masked'] = '******' + request.mobile_number[-4:]
    artist = session.get(User, request.artist_id)
    result['artist_name'] = artist.full_name if artist else ''
    if detail:
        result['mobile_number'] = request.mobile_number
        result['items'] = [row.model_dump() | {'title': session.get(Order, row.order_id).title}
                           for row in request_items(session, request.id)]
        result['events'] = session.exec(select(PayoutRequestEvent).where(PayoutRequestEvent.request_id == request.id)
                                        .order_by(PayoutRequestEvent.id)).all()
        result['payout'] = payout_response(session, session.get(ArtistPayout, request.payout_id)) if request.payout_id else None
    return result


def receiving_profile(session, artist_id):
    profile = session.get(ArtistPayoutProfile, artist_id)
    if not profile:
        raise HTTPException(409, 'Save your PromptPay receiving details before requesting a payout')
    return profile


def preview_request(session, artist_id, order_ids, *, lock=False):
    profile = receiving_profile(session, artist_id)
    if lock:
        session.refresh(profile)
    quote = payout_quote(session, artist_id, order_ids, lock=lock)
    if quote['net_satang'] <= 0:
        raise HTTPException(409, 'No payout due')
    quote['settlement_digest'] = quote['quote_digest']
    quote['profile_version'] = profile.version
    quote['account_holder_name'] = profile.account_holder_name
    quote['mobile_number'] = profile.mobile_number
    quote['quote_digest'] = digest([quote['settlement_digest'], profile.version,
                                    profile.account_holder_name, profile.mobile_number])
    return quote


def add_event(session, request, actor, action, note=''):
    session.add(PayoutRequestEvent(request_id=request.id, actor_id=actor.id, action=action,
                                  note=note, version=request.version))
    recipients = {request.artist_id} | set(session.exec(select(User.id).where(User.is_admin == True)).all())
    labels = {
        'REQUESTED': 'Request submitted / ส่งคำขอรับเงินแล้ว',
        'CLAIM': 'Processing claimed / ผู้ดูแลรับดำเนินการแล้ว',
        'RELEASE': 'Claim released without transfer / คืนคำขอโดยยังไม่ได้โอนเงิน',
        'CANCEL': 'Request cancelled / ยกเลิกคำขอแล้ว',
        'REJECT': 'Request rejected / ปฏิเสธคำขอแล้ว',
        'TRANSFER_RECORDED': 'External transfer recorded manually / บันทึกการโอนภายนอกโดยผู้ดูแลแล้ว',
        'CONFIRM': 'Receipt confirmed by artist / ศิลปินยืนยันได้รับเงินแล้ว',
        'PROBLEM': 'Receipt problem reported / ศิลปินแจ้งปัญหาการรับเงิน',
        'NOTE': 'Resolution note added / เพิ่มบันทึกการแก้ไขปัญหาแล้ว',
    }
    notifications = []
    for recipient in recipients - {actor.id}:
        is_artist = recipient == request.artist_id
        link = f"/dashboard/{'artist/analytics' if is_artist else 'admin/payments'}?request={request.id}"
        n = Notification(user_id=recipient, title='Payout request / คำขอรับเงิน',
            message=f'#{request.id}: {labels[action]}', link=link, type=NotificationType.SYSTEM)
        session.add(n)
        notifications.append(n)
    return notifications


async def commit_and_notify(session, notifications):
    session.flush()
    # Build the payload before committing so expired ORM objects cannot cause a second write.
    messages = [(n.user_id, {'type': 'notification', 'data': {
        'id': n.id, 'title': n.title, 'message': n.message, 'link': n.link,
        'type': 'SYSTEM', 'is_read': False, 'created_at': n.created_at.isoformat()}}) for n in notifications]
    session.commit()
    for user_id, payload in messages:
        try:
            await manager.send_personal_message(payload, user_id)
        except Exception:
            logger.warning('Payout notification delivery failed; persisted notification remains available')


def submit_request(session, user, body):
    lock_artist(session, user)
    fingerprint = digest(body.model_dump(exclude={'idempotency_key'}))
    existing = session.exec(select(PayoutRequest).where(PayoutRequest.artist_id == user.id,
                              PayoutRequest.idempotency_key == body.idempotency_key)).first()
    if existing:
        if existing.request_digest != fingerprint:
            raise HTTPException(409, 'Request key was already used for different selections')
        return existing, []
    quote = preview_request(session, user.id, body.order_ids, lock=True)
    if body.profile_version != quote['profile_version'] or body.quote_digest != quote['quote_digest']:
        raise HTTPException(409, 'Receiving details or payout totals changed. Review a fresh preview.')
    request = PayoutRequest(artist_id=user.id, idempotency_key=body.idempotency_key,
        request_digest=fingerprint, account_holder_name=quote['account_holder_name'],
        mobile_number=quote['mobile_number'], profile_version=quote['profile_version'],
        quote_digest=quote['settlement_digest'], gross_satang=quote['gross_satang'],
        fee_satang=quote['fee_satang'], net_satang=quote['net_satang'])
    session.add(request)
    session.flush()
    for row in quote['items']:
        session.add(PayoutRequestItem(request_id=request.id,
                    **{k: row[k] for k in ('order_id','gross_satang','fee_bps','fee_satang','net_satang')}))
        session.add(PayoutReservation(order_id=row['order_id'], request_id=request.id))
    session.flush()
    return request, add_event(session, request, user, 'REQUESTED')


def check_version(request, version):
    if request.version != version:
        raise HTTPException(409, 'Request changed. Refresh its status before continuing.')


def release_reservations(session, request_id):
    for reservation in session.exec(select(PayoutReservation).where(PayoutReservation.request_id == request_id)).all():
        session.delete(reservation)
    session.flush()


def act_on_request(session, request_id, user, action, body):
    request = load_request(session, request_id, user, lock=True)
    check_version(request, body.version)
    if action in ('claim','release','reject','note'):
        if not user.is_admin:
            raise HTTPException(403, 'Administrator action required')
    elif request.artist_id != user.id:
        raise HTTPException(403, 'Only the owning artist can perform this action')
    if action == 'claim' and request.status == 'REQUESTED':
        request.status = 'PROCESSING'
        request.claimed_by = user.id
    elif action == 'release' and request.status == 'PROCESSING' and request.claimed_by == user.id:
        if not body.no_transfer_made or not body.note:
            raise HTTPException(422, 'Confirm that no transfer was made and provide a reason')
        request.status = 'REQUESTED'
        request.claimed_by = None
    elif action in ('cancel','reject') and request.status == 'REQUESTED':
        if action == 'reject' and not body.note:
            raise HTTPException(422, 'A rejection reason is required')
        request.status = 'CANCELLED' if action == 'cancel' else 'REJECTED'
        release_reservations(session, request.id)
    elif action == 'confirm' and request.status == 'TRANSFER_RECORDED' and request.receipt_status in ('PENDING','ISSUE_REPORTED'):
        request.receipt_status = 'CONFIRMED'
    elif action == 'problem' and request.status == 'TRANSFER_RECORDED' and request.receipt_status == 'PENDING':
        if not body.note:
            raise HTTPException(422, 'Describe the problem before submitting')
        request.receipt_status = 'ISSUE_REPORTED'
    elif action == 'note' and request.status == 'TRANSFER_RECORDED' and request.receipt_status == 'ISSUE_REPORTED':
        if not body.note:
            raise HTTPException(422, 'A resolution note is required')
    else:
        raise HTTPException(409, 'This action is unavailable for the current request state or claimant')
    request.version += 1
    request.updated_at = utcnow()
    session.add(request)
    return request, add_event(session, request, user, action.upper(), body.note)
