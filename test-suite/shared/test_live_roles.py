"""Role events target only changed accounts; no server or persistent database."""
import asyncio,unittest
from unittest.mock import AsyncMock,patch
from fastapi import BackgroundTasks,HTTPException
from sqlmodel import SQLModel,Session,create_engine
from sqlalchemy.pool import StaticPool
from api.routers.auth import update_user_role,UserRoleUpdateRequest
from core.auth import get_admin_user
from models import User

class LiveRoleTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',poolclass=StaticPool,connect_args={'check_same_thread':False})
        SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.admin=User(email='admin@qa.test',full_name='Admin',hashed_password='unused',is_admin=True)
        self.target=User(email='target@qa.test',full_name='Target',hashed_password='unused',is_admin=True,is_artist=True)
        self.session.add_all([self.admin,self.target]);self.session.commit()
    def tearDown(self):self.session.close();self.engine.dispose()
    def test_revocation_persists_and_targets_only_affected_user(self):
        tasks=BackgroundTasks()
        with patch('core.websocket.manager.send_personal_message',new_callable=AsyncMock) as send:
            result=update_user_role(self.target.id,UserRoleUpdateRequest(is_admin=False),tasks,self.session,self.admin)
            self.assertFalse(result['user']['is_admin']);self.assertTrue(result['user']['is_artist'])
            self.assertEqual(len(tasks.tasks),1)
            asyncio.run(tasks())
            send.assert_awaited_once_with({'type':'user_roles_updated','data':{'user_id':self.target.id}},self.target.id)
        self.session.refresh(self.target)
        with self.assertRaises(HTTPException) as denied:get_admin_user(self.target)
        self.assertEqual(denied.exception.status_code,403)
    def test_unchanged_roles_do_not_trigger_reconnect_or_extra_events(self):
        tasks=BackgroundTasks()
        update_user_role(self.target.id,UserRoleUpdateRequest(is_admin=True,is_artist=True),tasks,self.session,self.admin)
        self.assertEqual(tasks.tasks,[])
    def test_unknown_account_has_no_event_or_other_user_changes(self):
        tasks=BackgroundTasks()
        with self.assertRaises(HTTPException) as missing:
            update_user_role(9999,UserRoleUpdateRequest(is_admin=False),tasks,self.session,self.admin)
        self.assertEqual(missing.exception.status_code,404);self.assertEqual(tasks.tasks,[])
        self.session.refresh(self.target);self.assertTrue(self.target.is_admin)

if __name__=='__main__':unittest.main()
