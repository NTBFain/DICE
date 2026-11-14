from datetime import date, datetime, timedelta, timezone
from typing import Optional

def utcnow() -> datetime:
    """
    Returns timezone-naive UTC datetime to maintain 100% compatibility with
    existing SQLite and SQLModel timestamp columns while avoiding Python 3.12+
    datetime.utcnow() DeprecationWarning.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def bangkok_today(instant: Optional[datetime] = None) -> date:
    """Calendar date in Bangkok; naive existing timestamps represent UTC."""
    instant = instant if instant is not None else utcnow()
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=timezone.utc)
    return instant.astimezone(timezone(timedelta(hours=7), 'Asia/Bangkok')).date()
