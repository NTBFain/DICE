import hashlib
import json
import os
import secrets
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response, FileResponse
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from core.auth import get_current_user, get_admin_user, get_artist_user
from core.db import get_session
from models import User, SystemSetting, OrderStatus
from models.payment import PaymentInstruction, CollectionReceipt, ArtistPayout, PayoutItem
from schemas.payment import PaymentSettingsRequest, PayoutSelection
from services.payment_service import (SETTINGS_KEY, payment_settings, create_instruction, invoice_and_order)
from services.promptpay import qr_png
from services.payment_proof import save_payment_proof
from services.payout_service import ledger_summary, payout_quote, payout_response, persist_payout
from services.promptpay_import import decode_recipient_qr

router = APIRouter(prefix='/api/payments', tags=['payments'])
PRIVATE = {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}


@router.post('/settings/import-qr')
def import_recipient_qr(qr: UploadFile = File(...), admin: User = Depends(get_admin_user)):
    return decode_recipient_qr(qr)


@router.get('/settings')
def get_payment_settings(session: Session = Depends(get_session), admin: User = Depends(get_admin_user)):
    return payment_settings(session)


@router.put('/settings')
def save_payment_settings(request: PaymentSettingsRequest, session: Session = Depends(get_session), admin: User = Depends(get_admin_user)):
    if request.enabled and (not request.recipient_name or not request.mobile_number):
        raise HTTPException(422, 'Recipient name and registered Thai mobile number are required to enable PromptPay')
    current = session.get(SystemSetting, SETTINGS_KEY)
    config = payment_settings(session)
    if request.version != config['version']:
        raise HTTPException(409, 'Settings changed. Reload before saving.')
    value = request.model_dump()
    value['version'] += 1
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True)
    try:
        if current:
            changed = session.exec(update(SystemSetting).where(SystemSetting.key == SETTINGS_KEY, SystemSetting.value == current.value)
                                   .values(value=encoded).execution_options(synchronize_session=False)).rowcount
            if not changed:
                session.rollback()
                raise HTTPException(409, 'Settings changed. Reload before saving.')
        else:
            session.add(SystemSetting(key=SETTINGS_KEY, value=encoded))
        session.commit()
        session.expire_all()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, 'Settings changed. Reload before saving.') from exc
    return value


@router.post('/invoices/{invoice_id}/instruction')
def invoice_instruction(invoice_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    try:
        instruction = create_instruction(session, invoice_id, user)
        session.commit()
        session.refresh(instruction)
        return instruction.model_dump(exclude={'payload'}) | {'qr_url': f'/api/payments/invoices/{invoice_id}/qr', 'approval_method': 'MANUAL'}
    except Exception:
        session.rollback()
        raise


@router.get('/invoices/{invoice_id}/qr')
def invoice_qr(invoice_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    invoice, order = invoice_and_order(session, invoice_id, user)
    if invoice.is_paid or order.status == OrderStatus.CANCELLED:
        raise HTTPException(409, 'This invoice is paid or cancelled. Previously downloaded QR images cannot be revoked.')
    instruction = session.exec(select(PaymentInstruction).where(PaymentInstruction.invoice_id == invoice_id)).first()
    if not instruction:
        raise HTTPException(404, 'Create payment instructions first')
    return Response(qr_png(instruction.payload), media_type='image/png', headers={**PRIVATE,
        'Content-Disposition': f'attachment; filename="DICE-invoice-{invoice_id}-PromptPay.png"'})


@router.get('/invoices/{invoice_id}/receipt')
def invoice_receipt(invoice_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    invoice_and_order(session, invoice_id, user)
    receipt = session.exec(select(CollectionReceipt).where(CollectionReceipt.invoice_id == invoice_id)).first()
    return receipt


@router.get('/ledger')
def get_ledger(session: Session = Depends(get_session), artist: User = Depends(get_artist_user)):
    return ledger_summary(session, artist)


@router.post('/payouts/quote')
def quote_payout(request: PayoutSelection, session: Session = Depends(get_session), admin: User = Depends(get_admin_user)):
    return payout_quote(session, request.artist_id, request.order_ids)


@router.get('/payouts/{payout_id}/proof')
def payout_proof(payout_id: int, session: Session = Depends(get_session), artist: User = Depends(get_artist_user)):
    payout = session.get(ArtistPayout, payout_id)
    if not payout:
        raise HTTPException(404, 'Payout not found')
    if not artist.is_admin and payout.artist_id != artist.id:
        raise HTTPException(403, 'Not authorized to view this payout proof')
    path = Path(payout.proof_path).resolve()
    if not path.is_relative_to(Path('uploads/payouts').resolve()) or not path.is_file():
        raise HTTPException(404, 'Payout proof not found')
    return FileResponse(path, headers=PRIVATE)


@router.post('/payouts')
def record_payout(selection: str = Form(...), quote_digest: str = Form(...), transfer_reference: str = Form(...),
                  idempotency_key: str = Form(...), proof: UploadFile = File(...),
                  session: Session = Depends(get_session), admin: User = Depends(get_admin_user)):
    try:
        chosen = PayoutSelection.model_validate_json(selection)
    except ValueError as exc:
        raise HTTPException(422, 'Invalid payout selection') from exc
    reference = transfer_reference.strip()
    if not 1 <= len(reference) <= 200 or not 16 <= len(idempotency_key) <= 100 or len(quote_digest) != 64:
        raise HTTPException(422, 'A transfer reference, valid quote and idempotency key are required')
    ext = Path(proof.filename or '').suffix.lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.pdf'}:
        raise HTTPException(400, 'Payout proof must be JPG, PNG, WebP or PDF')
    path = Path('uploads/payouts') / (secrets.token_hex(24) + ext)
    committed = False
    try:
        save_payment_proof(proof, str(path))
        proof_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        digest = hashlib.sha256(json.dumps([chosen.model_dump(), quote_digest, reference, proof_hash], sort_keys=True).encode()).hexdigest()
        # Check replay before eligibility: a successful retry is already settled.
        existing = session.exec(select(ArtistPayout).where(ArtistPayout.idempotency_key == idempotency_key)).first()
        if existing:
            if existing.request_digest != digest:
                raise HTTPException(409, 'Idempotency key was already used for a different payout')
            return payout_response(session, existing)
        quote = payout_quote(session, chosen.artist_id, chosen.order_ids, lock=True)
        # Another request may have completed while this one waited for the order lock.
        if quote['quote_digest'] != quote_digest:
            raise HTTPException(409, 'Payout totals changed. Review a fresh quote before recording the transfer.')
        payout = persist_payout(session, quote, admin.id, idempotency_key, digest, reference, path, proof_hash)
        session.commit()
        committed = True
        session.refresh(payout)
        return payout_response(session, payout)
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, 'One or more orders were already settled. Reload payout history before continuing.') from exc
    except Exception:
        session.rollback()
        raise
    finally:
        if not committed and path.exists():
            path.unlink()


# Kept under the payments router so isolated payment test applications include it.
from .payout_requests import router as payout_requests_router
router.include_router(payout_requests_router)
