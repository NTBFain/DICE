from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from .user import User


class NotificationType(str, Enum):
    AUCTION = "AUCTION"
    ORDER = "ORDER"
    SYSTEM = "SYSTEM"

class NotificationBase(SQLModel):
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool = Field(default=False)
    type: NotificationType = Field(default=NotificationType.SYSTEM)

class Notification(NotificationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: "User" = Relationship(back_populates="notifications")
