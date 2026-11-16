from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime

class OrderCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=3000)
    artist_id: int
    client_email: Optional[str] = Field(None, min_length=3, max_length=254)
    revision_quota: Optional[int] = Field(3, ge=0, le=100)
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class OrderUpdateRequest(BaseModel):
    status: Optional[str] = None
    agreed_price: Optional[float] = Field(None, gt=0, le=10_000_000, allow_inf_nan=False)
    revision_quota: Optional[int] = Field(None, ge=0, le=100)
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class CommissionBriefResponse(BaseModel):
    request_id: int
    character_name: str
    usage_type: str
    brief: str
    canvas_size: str
    requested_deadline: Optional[datetime] = None
    reference_links: Optional[str] = None
    custom_responses: Dict[str, Any] = Field(default_factory=dict)
    addons_snapshot: List[Dict[str, Any]] = Field(default_factory=list)
    base_price_snapshot: float
    total_price: float
    tos_snapshot: str
    tos_version: int

class OrderResponse(BaseModel):
    platform_fee_bps_snapshot: int = 0
    id: int
    title: str
    description: str
    status: str
    agreed_price: Optional[float] = None
    revision_quota: int
    client_id: int
    client_name: Optional[str] = None
    artist_id: int
    auction_id: Optional[int] = None
    artist_name: Optional[str] = None
    commission_brief: Optional[CommissionBriefResponse] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_at: datetime

class MilestoneInvoiceCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    amount: float = Field(..., gt=0, le=10_000_000, allow_inf_nan=False)

class MilestoneInvoiceResponse(BaseModel):
    id: int
    order_id: int
    title: str
    amount: float
    is_paid: bool
    slip_image_url: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

class RevisionCreateRequest(BaseModel):
    client_feedback: str = Field(..., min_length=1, max_length=2000)

class RevisionResponse(BaseModel):
    id: int
    order_id: int
    client_feedback: str
    is_addressed: bool
    created_at: datetime

class FileResponse(BaseModel):
    id: int
    order_id: int
    filename: str
    s3_key: str
    is_watermarked: bool
    file_type: str
    uploaded_at: datetime

class MessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class MessageResponse(BaseModel):
    id: int
    order_id: int
    sender_id: int
    sender_name: str
    content: str
    created_at: datetime
