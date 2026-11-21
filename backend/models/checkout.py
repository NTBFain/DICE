from datetime import datetime

from sqlalchemy import Index
from sqlmodel import Field, SQLModel

from core.time import utcnow

REFUND_HOLD_STATUSES = ("pending", "requires_action", "succeeded")


class PromptPayCheckout(SQLModel, table=True):
    """One provider checkout attempt, retained for reconciliation."""
    id: str = Field(primary_key=True)
    invoice_id: int = Field(foreign_key="milestoneinvoice.id", index=True, ondelete="RESTRICT")
    amount_satang: int
    live: bool
    return_url: str
    status: str = "CREATING"
    provider_session_id: str | None = Field(default=None, unique=True)
    checkout_url: str | None = None
    provider_payment_id: str | None = Field(default=None, unique=True)
    confirmed_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)


class StripeRefund(SQLModel, table=True):
    """Refunds may arrive before the associated checkout confirmation."""

    __table_args__ = (Index("ix_stripe_refund_payment", "provider_payment_id", "live", "status"),)

    id: str = Field(primary_key=True)
    live: bool = Field(primary_key=True)
    provider_payment_id: str
    status: str
