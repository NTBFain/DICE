from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: str
    is_admin: bool = Field(default=False)
    is_artist: bool = Field(default=False)
    facebook_id: Optional[str] = Field(default=None, index=True)
    avatar_url: Optional[str] = None

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    orders: List["Order"] = Relationship(
        back_populates="client",
        sa_relationship_kwargs={"foreign_keys": "Order.client_id"}
    )
    notifications: List["Notification"] = Relationship(back_populates="user")
