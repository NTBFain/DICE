"""Real HTTP handlers backed only by disposable memory/database and upload files."""
import os, secrets, tempfile
from contextlib import contextmanager
from unittest.mock import patch
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

@contextmanager
def isolated_client(demo=False):
    # Import configuration with disposable values, even when called independently.
    with patch.dict(os.environ, {'DATABASE_URL':'sqlite://','SECRET_KEY':secrets.token_urlsafe(48),'DEMO_MODE':'false'}):
        from main import app
        import main
        import core.db
        from core.db import get_session
        from fastapi.testclient import TestClient
        engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        def sessions():
            with Session(engine) as session:yield session
        previous=app.dependency_overrides.copy();old_directory=os.getcwd()
        with tempfile.TemporaryDirectory(prefix='dice-http-test-') as directory:
            try:
                os.chdir(directory);app.dependency_overrides[get_session]=sessions
                with patch.object(core.db,'engine',engine),patch.object(main,'init_db',lambda:None),patch.object(main,'get_session',sessions),patch.object(main.settings,'DEMO_MODE',demo):
                    with TestClient(app) as client:yield client,engine
            finally:
                os.chdir(old_directory);app.dependency_overrides.clear();app.dependency_overrides.update(previous);engine.dispose()
