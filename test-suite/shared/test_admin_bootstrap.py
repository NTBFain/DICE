import importlib.util
from pathlib import Path
import unittest
from sqlmodel import SQLModel,Session,create_engine,select
from models import User
from core.auth import verify_password

source=Path(__file__).resolve().parents[2]/'scripts/create_admin.py'
spec=importlib.util.spec_from_file_location('dice_first_admin',source)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class AdminBootstrapTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://');SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
    def tearDown(self):self.session.close();self.engine.dispose()
    def test_first_admin_hashes_password_and_refuses_second_bootstrap(self):
        module.create_first_admin(self.session,'FIRST@example.com','First admin','QA-bootstrap-only-2026')
        user=self.session.exec(select(User)).one()
        self.assertTrue(user.is_admin);self.assertEqual(user.email,'first@example.com')
        self.assertTrue(verify_password('QA-bootstrap-only-2026',user.hashed_password))
        self.assertNotEqual(user.hashed_password,'QA-bootstrap-only-2026')
        with self.assertRaises(ValueError):module.create_first_admin(self.session,'other@example.com','Other','QA-bootstrap-only-2026')
        self.assertEqual(len(self.session.exec(select(User)).all()),1)
    def test_existing_client_is_not_promoted_and_invalid_password_creates_nothing(self):
        self.session.add(User(email='client@example.com',full_name='Client',hashed_password='unused'));self.session.commit()
        with self.assertRaises(ValueError):module.create_first_admin(self.session,'client@example.com','Client','QA-bootstrap-only-2026')
        with self.assertRaises(ValueError):module.create_first_admin(self.session,'new@example.com','New','short')
        self.assertFalse(self.session.exec(select(User)).one().is_admin)

if __name__=='__main__':unittest.main()
