from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, JSON
from datetime import datetime

from core.time import utcnow

if TYPE_CHECKING:
    from .commission import ArtistCommissionPolicy, ServiceAddon, CommissionRequest

class ArtistProfileBase(SQLModel):
    handle: str = Field(index=True, unique=True)
    display_name: str
    tagline: str
    bio: str
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    styles: str = "Anime, Character Sheet, VTuber 2D"  # Comma separated
    commission_status: str = "OPEN"  # OPEN, CLOSED, WAITLIST
    rating: float = 5.0
    total_completed_orders: int = 0
    starting_price: float = 500.0
    social_twitter: Optional[str] = None
    social_pixiv: Optional[str] = None
    social_discord: Optional[str] = None
    is_verified: bool = True
    is_featured: bool = False

class ArtistProfile(ArtistProfileBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)

    commission_policy: Optional["ArtistCommissionPolicy"] = Relationship(
        back_populates="artist",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"}
    )

class ArtistServiceBase(SQLModel):
    title: str
    category: str
    description: str
    base_price: float
    estimated_days: int = 7
    includes_commercial: bool = True
    includes_psd: bool = True
    sample_image_url: Optional[str] = None
    max_slots: int = Field(default=3, ge=1)
    is_form_open: bool = Field(default=True)
    auto_close_on_full: bool = Field(default=True)
    sort_order: int = Field(default=0)
    last_open_notified_at: Optional[datetime] = None
    form_schema: List[dict] = Field(default_factory=list, sa_column=Column(JSON))

class ArtistService(ArtistServiceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    artist_id: int = Field(foreign_key="artistprofile.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)

    addons: List["ServiceAddon"] = Relationship(
        back_populates="service",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    requests: List["CommissionRequest"] = Relationship(
        back_populates="service",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class ArtistReviewBase(SQLModel):
    client_name: str
    rating: int = Field(default=5, ge=1, le=5)
    comment: str

class ArtistReview(ArtistReviewBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    artist_id: int = Field(foreign_key="artistprofile.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)
