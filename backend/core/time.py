from datetime import datetime, timezone

def utcnow() -> datetime:
    """
    Returns timezone-naive UTC datetime to maintain 100% compatibility with
    existing SQLite and SQLModel timestamp columns while avoiding Python 3.12+
    datetime.utcnow() DeprecationWarning.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
