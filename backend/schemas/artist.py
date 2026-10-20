from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class ArtistBasicResponse(BaseModel):
    id: int
    handle: str
    display_name: str
    avatar_url: Optional[str] = None

class ArtistServiceResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    base_price: float
    estimated_days: int
    includes_commercial: bool
    includes_psd: bool
    sample_image_url: Optional[str] = None

class ArtistReviewResponse(BaseModel):
    id: int
    client_name: str
    rating: float
    comment: str
    created_at: datetime

class ArtistProfileResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    handle: str
    display_name: str
    tagline: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    styles: List[str] = []
    commission_status: str = "OPEN"
    rating: float = 5.0
    total_completed_orders: int = 0
    starting_price: float = 0.0
    social_twitter: Optional[str] = None
    social_pixiv: Optional[str] = None
    social_discord: Optional[str] = None
    is_verified: bool = True
    is_featured: bool = False
    services: List[ArtistServiceResponse] = []
    reviews: List[ArtistReviewResponse] = []
    active_auctions_count: int = 0
    portfolio_count: int = 0
    public_queue: List[Any] = []

class ArtistUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    tagline: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = Field(None, max_length=3000)
    styles: Optional[List[str]] = None
    starting_price: Optional[float] = Field(None, ge=0, le=10_000_000, allow_inf_nan=False)
    commission_status: Optional[str] = None
    social_twitter: Optional[str] = None
    social_pixiv: Optional[str] = None
    social_discord: Optional[str] = None

class ArtistRegisterRequest(BaseModel):
    handle: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., min_length=1, max_length=100)
    tagline: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = Field(None, max_length=3000)
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    styles: Any = []
    starting_price: float = Field(0.0, ge=0, le=10_000_000, allow_inf_nan=False)
    social_twitter: Optional[str] = None
    social_pixiv: Optional[str] = None
    social_discord: Optional[str] = None

class ArtistServiceCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    category: str = Field(default="Illustration", max_length=60)
    description: str = Field(default="", max_length=2000)
    base_price: float = Field(..., gt=0, le=10_000_000, allow_inf_nan=False)
    estimated_days: int = Field(default=7, ge=1, le=365)
    includes_commercial: bool = False
    includes_psd: bool = False
    sample_image_url: Optional[str] = None
    max_slots: int = Field(default=3, ge=1, le=100)
    is_form_open: bool = Field(default=True)
    auto_close_on_full: bool = Field(default=True)

class ArtistReviewCreateRequest(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0, allow_inf_nan=False)
    comment: str = Field(..., min_length=1, max_length=2000)
