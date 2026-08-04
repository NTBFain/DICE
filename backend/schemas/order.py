from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderCreateRequest(BaseModel):
    title: str
    description: str
    artist_id: int
    revision_quota: Optional[int] = 3
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class OrderUpdateRequest(BaseModel):
    status: Optional[str] = None
    agreed_price: Optional[float] = None
    revision_quota: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class OrderResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    agreed_price: Optional[float] = None
    revision_quota: int
    client_id: int
    client_name: Optional[str] = None
    artist_id: int
    artist_name: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_at: datetime

class MilestoneInvoiceCreateRequest(BaseModel):
    title: str
    amount: float

class MilestoneInvoiceResponse(BaseModel):
    id: int
    order_id: int
    title: str
    amount: float
    is_paid: bool
    slip_image_url: Optional[str] = None
    created_at: datetime

class RevisionCreateRequest(BaseModel):
    client_feedback: str

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
    content: str

class MessageResponse(BaseModel):
    id: int
    order_id: int
    sender_id: int
    sender_name: str
    content: str
    created_at: datetime
