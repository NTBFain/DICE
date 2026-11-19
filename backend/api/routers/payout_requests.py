import hashlib
import secrets
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from core.auth import get_artist_user, get_admin_user
from core.db import get_session
from core.time import utcnow
from models import User
from models.payment import ArtistPayout
from models.payout_request import ArtistPayoutProfile, PayoutRequest
from schemas.payout_request import ReceivingProfile, RequestOrders, SubmitRequest, RequestAction
from services.promptpay_import import decode_recipient_qr
from services.promptpay import build_payload, qr_png
from services.payment_proof import save_payment_proof
from services.payout_service import payout_quote, persist_payout
from services.payout_request_service import (lock_artist, load_request, request_items, request_response,
    preview_request, submit_request, act_on_request, check_version, release_reservations,
    add_event, commit_and_notify, digest)

router = APIRouter(tags=['payout requests'])
PRIVATE = {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}


@router.get('/receiving-profile')
def get_profile(response: Response, session: Session = Depends(get_session), user: User = Depends(get_artist_user)):
    response.headers.update(PRIVATE)
    return session.get(ArtistPayoutProfile, user.id)


@router.put('/receiving-profile')
def save_profile(body: ReceivingProfile, response: Response, session: Session = Depends(get_session), user: User = Depends(get_artist_user)):
    response.headers.update(PRIVATE)
    try:
        lock_artist(session, user)
        profile = session.get(ArtistPayoutProfile, user.id)
        if profile:
            session.refresh(profile)
        if body.version != (profile.version if profile else 0):
            raise HTTPException(409, 'Receiving details changed. Reload before saving.')
        if not profile:
            profile = ArtistPayoutProfile(artist_id=user.id, account_holder_name=body.account_holder_name,
                                          mobile_number=body.mobile_number)
        else:
            profile.account_holder_name = body.account_holder_name
            profile.mobile_number = body.mobile_number
            profile.version += 1
            profile.updated_at = utcnow()
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile
    except Exception:
        session.rollback()
        raise


@router.post('/receiving-profile/import-qr')
def import_qr(response: Response, qr: UploadFile = File(...), user: User = Depends(get_artist_user)):
    if not user.is_artist:
        raise HTTPException(403, 'Only artists can register receiving details')
    response.headers.update(PRIVATE)
    return decode_recipient_qr(qr)


@router.post('/payout-requests/preview')
def preview(body: RequestOrders, response: Response, session: Session = Depends(get_session), user: User = Depends(get_artist_user)):
    if not user.is_artist:
        raise HTTPException(403, 'Only artists can request payouts')
    response.headers.update(PRIVATE)
    return preview_request(session, user.id, body.order_ids)


@router.post('/payout-requests')
async def submit(body: SubmitRequest, response: Response, session: Session = Depends(get_session), user: User = Depends(get_artist_user)):
    response.headers.update(PRIVATE)
    try:
        request, notifications = submit_request(session, user, body)
        await commit_and_notify(session, notifications)
        return request_response(session, request, detail=True)
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, 'An order is already reserved or settled. Refresh before requesting again.') from exc
    except Exception:
        session.rollback()
        raise


@router.get('/payout-requests')
def list_requests(response: Response, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
                  session: Session = Depends(get_session), user: User = Depends(get_artist_user)):
    response.headers.update(PRIVATE)
    filters = [] if user.is_admin else [PayoutRequest.artist_id == user.id]
    total = session.exec(select(func.count()).select_from(PayoutRequest).where(*filters)).one()
    rows = session.exec(select(PayoutRequest).where(*filters).order_by(PayoutRequest.id.desc()).offset(offset).limit(limit)).all()
    return {'items': [request_response(session, r) for r in rows], 'total': total}


@router.get('/payout-requests/{request_id}')
def detail(request_id: int, response: Response, session: Session = Depends(get_session), user: User = Depends(get_artist_user)):
    response.headers.update(PRIVATE)
    return request_response(session, load_request(session, request_id, user), detail=True)


@router.post('/payout-requests/{request_id}/actions/{action}')
async def action(request_id: int, action: str, body: RequestAction, response: Response,
                 session: Session = Depends(get_session), user: User = Depends(get_artist_user)):
    response.headers.update(PRIVATE)
    try:
        request, notifications = act_on_request(session, request_id, user, action, body)
        await commit_and_notify(session, notifications)
        return request_response(session, request, detail=True)
    except Exception:
        session.rollback()
        raise


@router.get('/payout-requests/{request_id}/qr')
def transfer_qr(request_id: int, session: Session = Depends(get_session), admin: User = Depends(get_admin_user)):
    request = load_request(session, request_id, admin)
    if request.status != 'PROCESSING' or request.claimed_by != admin.id:
        raise HTTPException(409, 'Claim the request before displaying transfer instructions')
    payout_quote(session, request.artist_id, [item.order_id for item in request_items(session, request.id)],
                 request_id=request.id)
    return Response(qr_png(build_payload(request.mobile_number, request.net_satang)), media_type='image/png',
        headers={**PRIVATE, 'Content-Disposition': f'attachment; filename="DICE-payout-request-{request_id}.png"'})


@router.post('/payout-requests/{request_id}/transfer')
async def record_transfer(request_id: int, response: Response, version: int = Form(...), transfer_reference: str = Form(...),
                          proof: UploadFile = File(...), session: Session = Depends(get_session), admin: User = Depends(get_admin_user)):
    response.headers.update(PRIVATE)
    request = load_request(session, request_id, admin)
    reference = transfer_reference.strip()
    if not 1 <= len(reference) <= 200:
        raise HTTPException(422, 'A transfer reference is required')
    path = Path('uploads/payouts') / (secrets.token_hex(24) + Path(proof.filename or '').suffix.lower())
    committed = False
    try:
        save_payment_proof(proof, str(path))
        proof_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        request = load_request(session, request_id, admin, lock=True)
        fingerprint = digest([request.id, request.quote_digest, reference, proof_hash])
        if request.claimed_by != admin.id:
            raise HTTPException(403, 'Only the claiming administrator can record this transfer')
        if request.payout_id:
            payout = session.get(ArtistPayout, request.payout_id)
            if payout.request_digest != fingerprint:
                raise HTTPException(409, 'A different transfer is already recorded; corrections require a future adjustment workflow')
            return request_response(session, request, detail=True)
        check_version(request, version)
        if request.status != 'PROCESSING':
            raise HTTPException(409, 'The request must be claimed before recording a transfer')
        order_ids = [i.order_id for i in request_items(session, request.id)]
        quote = payout_quote(session, request.artist_id, order_ids, lock=True, request_id=request.id)
        if quote['quote_digest'] != request.quote_digest or any(quote[k] != getattr(request, k) for k in ('gross_satang','fee_satang','net_satang')):
            raise HTTPException(409, 'Reserved order totals changed; do not send money. Resolve the request first.')
        payout = persist_payout(session, quote, admin.id, f'payout-request-{request.id}', fingerprint,
                                reference, path, proof_hash)
        request.payout_id = payout.id
        request.status = 'TRANSFER_RECORDED'
        request.version += 1
        request.updated_at = utcnow()
        session.add(request)
        release_reservations(session, request.id)
        notifications = add_event(session, request, admin, 'TRANSFER_RECORDED')
        await commit_and_notify(session, notifications)
        committed = True
        return request_response(session, request, detail=True)
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, 'This request or order was already settled. Refresh its history.') from exc
    except Exception:
        session.rollback()
        raise
    finally:
        if not committed:
            path.unlink(missing_ok=True)
