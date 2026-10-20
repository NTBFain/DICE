from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy import event
from core.config import settings

db_url = settings.DATABASE_URL

# Fallback to SQLite if PostgreSQL fails to connect locally
try:
    if "postgresql" in db_url:
        engine = create_engine(db_url, echo=False, pool_pre_ping=True)
        # Test connection
        with engine.connect() as conn:
            pass
    else:
        engine = create_engine(db_url, echo=False, connect_args={"check_same_thread": False})
except Exception:
    # Graceful local fallback to High-Speed SQLite WAL Mode
    db_url = "sqlite:///./test.db"
    engine = create_engine(db_url, echo=False, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in db_url:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA mmap_size=268435456")
        cursor.close()

from core.migrations import run_lightweight_migrations

def init_db():
    import models  # Ensure all models are registered in SQLModel.metadata
    SQLModel.metadata.create_all(engine)
    run_lightweight_migrations(engine)

def get_session():
    with Session(engine) as session:
        yield session
