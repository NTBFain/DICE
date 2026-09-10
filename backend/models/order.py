from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from .base import OrderStatus

class OrderBase(SQLModel):
    title: str
    description: str
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    agreed_price: Optional[float] = None
    revision_quota: int = Field(default=3)
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class Order(OrderBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    artist_id: int = Field(default=1, foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    client: "User" = Relationship(
        back_populates="orders",
        sa_relationship_kwargs={"foreign_keys": "Order.client_id"}
    )
    milestone_invoices: List["MilestoneInvoice"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    revisions: List["Revision"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    files: List["File"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    messages: List["Message"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class MilestoneInvoiceBase(SQLModel):
    title: str # e.g., "50% Deposit", "Final Payment"
    amount: float
    is_paid: bool = Field(default=False)
    slip_image_url: Optional[str] = None

class MilestoneInvoice(MilestoneInvoiceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    order: Order = Relationship(back_populates="milestone_invoices")

class RevisionBase(SQLModel):
    client_feedback: str
    is_addressed: bool = Field(default=False)

class Revision(RevisionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    order: Order = Relationship(back_populates="revisions")

class FileBase(SQLModel):
    filename: str
    s3_key: str
    is_watermarked: bool = Field(default=False)
    file_type: str # 'WIP', 'FINAL', 'REFERENCE'

class File(FileBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", ondelete="CASCADE")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    order: Order = Relationship(back_populates="files")

class MessageBase(SQLModel):
    content: str

class Message(MessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", ondelete="CASCADE")
    sender_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    order: Order = Relationship(back_populates="messages")
    sender: "User" = Relationship()
