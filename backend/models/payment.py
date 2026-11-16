"""Append-only platform money records. Amounts are integer Thai satang."""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from core.time import utcnow


class PaymentInstruction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key='milestoneinvoice.id', unique=True, ondelete='RESTRICT')
    recipient_name: str
    mobile_number: str
    amount_satang: int = Field(gt=0)
    settings_version: int
    payload: str
    created_at: datetime = Field(default_factory=utcnow)


class CollectionReceipt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key='milestoneinvoice.id', unique=True, ondelete='RESTRICT')
    instruction_id: int = Field(foreign_key='paymentinstruction.id', unique=True, ondelete='RESTRICT')
    order_id: int = Field(foreign_key='order.id', index=True, ondelete='RESTRICT')
    amount_satang: int = Field(gt=0)
    approved_by: int = Field(foreign_key='user.id', ondelete='RESTRICT')
    approved_at: datetime = Field(default_factory=utcnow)
    approval_method: str = 'MANUAL'


class ArtistPayout(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    artist_id: int = Field(foreign_key='user.id', index=True, ondelete='RESTRICT')
    recorded_by: int = Field(foreign_key='user.id', ondelete='RESTRICT')
    idempotency_key: str = Field(unique=True)
    request_digest: str
    transfer_reference: str
    proof_path: str
    proof_sha256: str
    gross_satang: int
    fee_satang: int
    net_satang: int
    created_at: datetime = Field(default_factory=utcnow)


class PayoutItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    payout_id: int = Field(foreign_key='artistpayout.id', ondelete='RESTRICT', index=True)
    order_id: int = Field(foreign_key='order.id', unique=True, ondelete='RESTRICT')
    gross_satang: int
    fee_bps: int
    fee_satang: int
    net_satang: int
