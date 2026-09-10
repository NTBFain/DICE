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

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
