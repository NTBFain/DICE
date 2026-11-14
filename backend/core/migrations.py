import logging
from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)

ADDED_COLUMNS = {
    "artistservice": {
        "max_slots": "INTEGER NOT NULL DEFAULT 3",
        "is_form_open": "BOOLEAN NOT NULL DEFAULT 1",
        "auto_close_on_full": "BOOLEAN NOT NULL DEFAULT 1",
        "sort_order": "INTEGER NOT NULL DEFAULT 0",
        "last_open_notified_at": "DATETIME",
        "form_schema": "JSON",
    },
    "order": {
        "service_id": "INTEGER",
        "commission_request_id": "INTEGER",
        "auction_id": "INTEGER",
    },
    "commissionrequest": {
        "custom_responses": "JSON",
    },
}

def run_lightweight_migrations(engine):
    """
    Safely executes idempotent ALTER TABLE ADD COLUMN statements for existing databases
    where SQLModel.metadata.create_all() does not alter existing tables.
    """
    try:
        insp = inspect(engine)
        with engine.begin() as conn:
            for table_name, cols in ADDED_COLUMNS.items():
                if not insp.has_table(table_name):
                    continue
                existing_cols = {c["name"] for c in insp.get_columns(table_name)}
                for col_name, ddl in cols.items():
                    if col_name not in existing_cols:
                        logger.info(f"Applying migration: Adding column {col_name} to table {table_name}")
                        conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{col_name}" {ddl}'))
    except Exception as e:
        logger.error(f"Migration error: {e}", exc_info=True)
        raise e
