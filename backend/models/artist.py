from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

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
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ArtistServiceBase(SQLModel):
    title: str
    category: str
    description: str
    base_price: float
    estimated_days: int = 7
    includes_commercial: bool = True
    includes_psd: bool = True
    sample_image_url: Optional[str] = None

class ArtistService(ArtistServiceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    artist_id: int = Field(foreign_key="artistprofile.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ArtistReviewBase(SQLModel):
    client_name: str
    rating: int = Field(default=5, ge=1, le=5)
    comment: str

class ArtistReview(ArtistReviewBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    artist_id: int = Field(foreign_key="artistprofile.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
