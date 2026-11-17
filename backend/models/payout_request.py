"""Payout requests reserve whole orders; completed transfers remain immutable."""
from datetime import datetime
from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field
from core.time import utcnow


class ArtistPayoutProfile(SQLModel, table=True):
    artist_id: int = Field(primary_key=True, foreign_key='user.id', ondelete='RESTRICT')
    account_holder_name: str
    mobile_number: str
    version: int = 1
    updated_at: datetime = Field(default_factory=utcnow)


class PayoutRequest(SQLModel, table=True):
    __table_args__ = (UniqueConstraint('artist_id', 'idempotency_key'),)
    id: Optional[int] = Field(default=None, primary_key=True)
    artist_id: int = Field(foreign_key='user.id', ondelete='RESTRICT', index=True)
    idempotency_key: str
    request_digest: str
    account_holder_name: str
    mobile_number: str
    profile_version: int
    quote_digest: str
    gross_satang: int
    fee_satang: int
    net_satang: int
    status: str = Field(default='REQUESTED', index=True)
    version: int = 1
    claimed_by: Optional[int] = Field(default=None, foreign_key='user.id', ondelete='RESTRICT')
    payout_id: Optional[int] = Field(default=None, foreign_key='artistpayout.id', unique=True, ondelete='RESTRICT')
    receipt_status: str = 'PENDING'
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PayoutRequestItem(SQLModel, table=True):
    __table_args__ = (UniqueConstraint('request_id', 'order_id'),)
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key='payoutrequest.id', ondelete='RESTRICT', index=True)
    order_id: int = Field(foreign_key='order.id', ondelete='RESTRICT', index=True)
    gross_satang: int
    fee_bps: int
    fee_satang: int
    net_satang: int


class PayoutReservation(SQLModel, table=True):
    order_id: int = Field(primary_key=True, foreign_key='order.id', ondelete='RESTRICT')
    request_id: int = Field(foreign_key='payoutrequest.id', ondelete='RESTRICT', index=True)


class PayoutRequestEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key='payoutrequest.id', ondelete='RESTRICT', index=True)
    actor_id: int = Field(foreign_key='user.id', ondelete='RESTRICT')
    action: str
    note: str = ''
    version: int
    created_at: datetime = Field(default_factory=utcnow)
