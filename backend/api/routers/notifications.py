from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, update
from typing import List
from models import Notification
from core.db import get_session
from core.auth import get_current_user
from models import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("", response_model=List[Notification])
def get_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    return session.exec(query).all()

@router.post("/{notification_id}/read", response_model=Notification)
def mark_as_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    notification = session.get(Notification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification

@router.post("/read-all")
def mark_all_as_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = (
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
        .values(is_read=True)
    )
    result = session.execute(statement)
    session.commit()
    return {"message": f"Marked {result.rowcount} notifications as read"}
