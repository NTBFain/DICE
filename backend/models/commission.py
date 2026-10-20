from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON

from core.time import utcnow

if TYPE_CHECKING:
    from .user import User
    from .artist import ArtistProfile, ArtistService
    from .order import Order

class CommissionRequestStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    WITHDRAWN = "WITHDRAWN"

class AddonPriceType(str, Enum):
    FIXED = "FIXED"
    PERCENTAGE = "PERCENTAGE"

class ArtistCommissionPolicyBase(SQLModel):
    terms_of_service: str = Field(default="")
    refund_policy: str = Field(default="")
    ai_policy: str = Field(default="Strictly prohibit using deliverables for AI training.")
    will_draw: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    wont_draw: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    deposit_percent: int = Field(default=50, ge=0, le=100)
    default_revision_quota: int = Field(default=3, ge=0)
    version: int = Field(default=1, ge=1)

class ArtistCommissionPolicy(ArtistCommissionPolicyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    artist_id: int = Field(foreign_key="artistprofile.id", ondelete="CASCADE", unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    artist: Optional["ArtistProfile"] = Relationship(back_populates="commission_policy")

class ServiceAddonBase(SQLModel):
    name: str
    price_type: AddonPriceType = Field(default=AddonPriceType.FIXED)
    price_value: float = Field(default=0.0, ge=0)
    is_active: bool = Field(default=True)

class ServiceAddon(ServiceAddonBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    service_id: int = Field(foreign_key="artistservice.id", ondelete="CASCADE", index=True)
    created_at: datetime = Field(default_factory=utcnow)

    service: Optional["ArtistService"] = Relationship(back_populates="addons")

class CommissionSlotSubscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    artist_id: int = Field(foreign_key="artistprofile.id", ondelete="CASCADE", index=True)
    service_id: Optional[int] = Field(default=None, foreign_key="artistservice.id", ondelete="CASCADE", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)
    last_notified_at: Optional[datetime] = None

class CommissionRequestBase(SQLModel):
    character_name: str
    usage_type: str = Field(default="PERSONAL")
    brief: str
    canvas_size: str = Field(default="Square (1:1)")
    requested_deadline: Optional[datetime] = None
    reference_links: Optional[str] = None
    reference_images: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    addons_snapshot: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    base_price_snapshot: float = Field(default=0.0, ge=0)
    total_price: float = Field(default=0.0, ge=0)
    tos_snapshot: str = Field(default="")
    tos_version: int = Field(default=1)
    custom_responses: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class CommissionRequest(CommissionRequestBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    service_id: int = Field(foreign_key="artistservice.id", ondelete="CASCADE", index=True)
    client_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    artist_user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    status: CommissionRequestStatus = Field(default=CommissionRequestStatus.PENDING, index=True)
    decline_reason: Optional[str] = None
    order_id: Optional[int] = Field(default=None, foreign_key="order.id", ondelete="SET NULL")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    service: Optional["ArtistService"] = Relationship(back_populates="requests")
    client: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "CommissionRequest.client_id"}
    )
    artist_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "CommissionRequest.artist_user_id"}
    )
    order: Optional["Order"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "CommissionRequest.order_id"}
    )
