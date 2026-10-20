from typing import List, Dict, Any
from sqlmodel import Session
from models import Notification, NotificationType
from core.websocket import manager

import logging

logger = logging.getLogger(__name__)

async def create_notification(
    session: Session,
    user_id: int,
    title: str,
    message: str,
    link: str = "",
    type: NotificationType = NotificationType.SYSTEM
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        link=link,
        type=type,
        is_read=False
    )
    session.add(notif)
    session.commit()
    session.refresh(notif)
    
    # Broadcast to websocket
    payload = {
        "type": "notification",
        "data": {
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "link": notif.link,
            "type": notif.type.value if hasattr(notif.type, "value") else str(notif.type),
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None
        }
    }
    await manager.send_personal_message(payload, user_id)
    return notif

async def bulk_create_notifications(
    session: Session,
    items: List[Dict[str, Any]]
) -> List[Notification]:
    """
    Efficiently inserts multiple notifications with a single commit,
    then dispatches real-time WebSocket notifications to connected users.
    Each item in items must have: user_id, title, message, link, type
    """
    if not items:
        return []

    notifications = []
    for item in items:
        notif = Notification(
            user_id=item["user_id"],
            title=item["title"],
            message=item["message"],
            link=item.get("link", ""),
            type=item.get("type", NotificationType.SYSTEM),
            is_read=False
        )
        session.add(notif)
        notifications.append(notif)

    session.commit()
    for notif in notifications:
        session.refresh(notif)

    # Dispatch WebSocket push
    for notif in notifications:
        payload = {
            "type": "notification",
            "data": {
                "id": notif.id,
                "title": notif.title,
                "message": notif.message,
                "link": notif.link,
                "type": notif.type.value if hasattr(notif.type, "value") else str(notif.type),
                "is_read": notif.is_read,
                "created_at": notif.created_at.isoformat() if notif.created_at else None
            }
        }
        try:
            await manager.send_personal_message(payload, notif.user_id)
        except Exception as e:
            logger.warning(f"Failed to dispatch WebSocket message to user {notif.user_id}: {e}")

    return notifications

async def background_create_notification(
    user_id: int,
    title: str,
    message: str,
    link: str = "",
    type: NotificationType = NotificationType.SYSTEM
):
    from core.db import engine
    from sqlmodel import Session
    with Session(engine) as session:
        await create_notification(
            session=session,
            user_id=user_id,
            title=title,
            message=message,
            link=link,
            type=type
        )
