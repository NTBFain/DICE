from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from models.commission import CommissionRequestStatus, AddonPriceType

# --- Policy Schemas ---
class ArtistCommissionPolicyBaseSchema(BaseModel):
    terms_of_service: str = ""
    refund_policy: str = ""
    ai_policy: str = "Strictly prohibit using deliverables for AI training."
    will_draw: List[str] = Field(default_factory=list)
    wont_draw: List[str] = Field(default_factory=list)
    deposit_percent: int = Field(default=50, ge=0, le=100)
    default_revision_quota: int = Field(default=3, ge=0)

class ArtistCommissionPolicyUpdateRequest(ArtistCommissionPolicyBaseSchema):
    pass

class ArtistCommissionPolicyResponse(ArtistCommissionPolicyBaseSchema):
    id: int
    artist_id: int
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Addon Schemas ---
class ServiceAddonCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    price_type: AddonPriceType = Field(default=AddonPriceType.FIXED)
    price_value: float = Field(default=0.0, ge=0)

class ServiceAddonUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    price_type: Optional[AddonPriceType] = None
    price_value: Optional[float] = Field(default=None, ge=0)
    is_active: Optional[bool] = None

class ServiceAddonResponse(BaseModel):
    id: int
    service_id: int
    name: str
    price_type: AddonPriceType
    price_value: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Scale/Service Availability Schemas ---
class ServiceAvailabilityUpdateRequest(BaseModel):
    is_form_open: bool
    notify_followers: bool = True

class ServiceScaleUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = Field(default=None, gt=0)
    estimated_days: Optional[int] = Field(default=None, ge=1)
    max_slots: Optional[int] = Field(default=None, ge=1)
    auto_close_on_full: Optional[bool] = None
    sort_order: Optional[int] = None
    sample_image_url: Optional[str] = None

class FormSchemaUpdateRequest(BaseModel):
    blocks: List[Dict[str, Any]] = Field(default_factory=list)

class CommissionServiceDetailResponse(BaseModel):
    id: int
    artist_id: int
    title: str
    category: str
    description: str
    base_price: float
    estimated_days: int
    includes_commercial: bool
    includes_psd: bool
    sample_image_url: Optional[str] = None
    max_slots: int
    is_form_open: bool
    auto_close_on_full: bool
    sort_order: int
    used_slots: int
    effective_status: str # OPEN, FULL, WAITLIST, CLOSED
    addons: List[ServiceAddonResponse] = Field(default_factory=list)
    form_schema: List[Dict[str, Any]] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- Commission Request Schemas ---
class CommissionRequestCreatePayload(BaseModel):
    service_id: int
    character_name: str = Field(min_length=1, max_length=100)
    usage_type: str = Field(default="PERSONAL")
    brief: str = Field(min_length=1, max_length=5000)
    canvas_size: str = Field(default="Square (1:1)", max_length=50)
    requested_deadline: Optional[datetime] = None
    reference_links: Optional[str] = Field(default=None, max_length=1000)
    addon_ids: List[int] = Field(default_factory=list)
    custom_responses: Dict[str, Any] = Field(default_factory=dict)
    agreed_to_tos: bool = Field(...)

class CommissionRequestResponse(BaseModel):
    id: int
    service_id: int
    service_title: Optional[str] = None
    client_id: int
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    artist_user_id: int
    status: CommissionRequestStatus
    character_name: str
    usage_type: str
    brief: str
    canvas_size: str
    requested_deadline: Optional[datetime] = None
    reference_links: Optional[str] = None
    reference_images: List[str] = Field(default_factory=list)
    addons_snapshot: List[Dict[str, Any]] = Field(default_factory=list)
    custom_responses: Dict[str, Any] = Field(default_factory=dict)
    base_price_snapshot: float
    total_price: float
    tos_snapshot: str
    tos_version: int
    decline_reason: Optional[str] = None
    order_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CommissionRequestDeclineRequest(BaseModel):
    reason: str = Field(min_length=2, max_length=500)

# --- Slot Subscription Schemas ---
class SlotSubscriptionToggleRequest(BaseModel):
    artist_id: int
    service_id: Optional[int] = None

class SlotSubscriptionResponse(BaseModel):
    id: int
    user_id: int
    artist_id: int
    service_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Combined Commission Info Response ---
class ArtistCommissionInfoResponse(BaseModel):
    artist_id: int
    artist_user_id: Optional[int] = None
    handle: str
    display_name: str
    commission_status: str # OPEN, CLOSED, WAITLIST
    policy: Optional[ArtistCommissionPolicyResponse] = None
    services: List[CommissionServiceDetailResponse] = Field(default_factory=list)
    is_subscribed: bool = False
