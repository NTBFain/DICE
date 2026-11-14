import importlib.util,os,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from pydantic import ValidationError
from sqlmodel import Session,select
from models import User,ArtistProfile
from core.config import Settings

root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'backend/tests'))
from isolated_app import isolated_client
spec=importlib.util.spec_from_file_location('local_setup',root/'scripts/setup_local.py')
setup=importlib.util.module_from_spec(spec);spec.loader.exec_module(setup)

class DemoSetupTests(unittest.TestCase):
    def test_configuration_generates_secret_once_and_preserves_other_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory);(target/'.env').write_text('DATABASE_URL=sqlite:///./existing.db\nCORS_ORIGINS=http://localhost:3000\n')
            setup.configure(target,True);first=(target/'.env').read_text();setup.configure(target,True)
            self.assertEqual((target/'.env').read_text(),first)
            self.assertIn('DATABASE_URL=sqlite:///./existing.db',first);self.assertIn('DEMO_MODE=true',first)
            self.assertIn('CORS_ORIGINS=http://localhost:3000',first)
            secret=next(line.split('=',1)[1] for line in first.splitlines() if line.startswith('SECRET_KEY='))
            self.assertGreaterEqual(len(secret),48);self.assertNotEqual(secret,setup.PLACEHOLDER)
            setup.configure(target,False);self.assertIn('SECRET_KEY='+secret,(target/'.env').read_text());self.assertIn('DEMO_MODE=false',(target/'.env').read_text())
    def test_missing_or_shared_signing_secret_is_rejected(self):
        with patch.dict(os.environ,{},clear=True):
            for value in (None,'short',setup.PLACEHOLDER):
                with self.assertRaises(ValidationError):Settings(_env_file=None,**({'SECRET_KEY':value} if value is not None else {}))
    def test_demo_off_creates_no_demo_accounts_or_profile(self):
        with isolated_client(demo=False) as (client,engine):
            self.assertEqual(client.get('/api/demo').json(),{'enabled':False})
            with Session(engine) as session:
                self.assertEqual(session.exec(select(User)).all(),[]);self.assertEqual(session.exec(select(ArtistProfile)).all(),[])
    def test_demo_on_seeds_once_without_overwriting_accounts(self):
        from services.demo_service import seed_demo_accounts
        with isolated_client(demo=True) as (client,engine):
            self.assertEqual(client.get('/api/demo').json(),{'enabled':True})
            with Session(engine) as session:
                accounts=session.exec(select(User)).all();self.assertEqual(len(accounts),3)
                profile=session.exec(select(ArtistProfile)).one();self.assertEqual(profile.avatar_url,'/demo/artist.svg');self.assertEqual(profile.banner_url,'/demo/banner.svg')
                admin=session.exec(select(User).where(User.email=='admin@example.com')).one();admin.full_name='Preserved administrator';admin.hashed_password='Preserved hash';session.add(admin);session.commit()
                seed_demo_accounts(session)
                self.assertEqual(len(session.exec(select(User)).all()),3);self.assertEqual(admin.full_name,'Preserved administrator');self.assertEqual(admin.hashed_password,'Preserved hash')

if __name__=='__main__':unittest.main()
