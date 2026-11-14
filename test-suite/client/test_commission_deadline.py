"""F36/F50 Bangkok date boundaries exercise submission before storage/uploads/notifications."""
import asyncio,json,unittest
from datetime import datetime
from unittest.mock import patch
from fastapi import BackgroundTasks,HTTPException
from sqlmodel import SQLModel,Session,create_engine,select
from models import User,ArtistProfile,ArtistService
from models.commission import CommissionRequest
from api.routers.commissions import submit_commission_request

class CommissionDeadlineTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://');SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.artist=User(email='deadline-artist@qa.test',full_name='Artist',hashed_password='unused',is_artist=True)
        self.client=User(email='deadline-client@qa.test',full_name='Client',hashed_password='unused')
        self.session.add_all([self.artist,self.client]);self.session.commit()
        self.profile=ArtistProfile(user_id=self.artist.id,handle='deadline_qa',display_name='QA',tagline='',bio='')
        self.session.add(self.profile);self.session.commit()
        self.service=ArtistService(artist_id=self.profile.id,title='QA',category='Art',description='',base_price=123.45,estimated_days=7)
        self.session.add(self.service);self.session.commit();self.tasks=BackgroundTasks()

    def tearDown(self):self.session.close();self.engine.dispose()

    def submit(self,deadline):
        payload={'service_id':self.service.id,'character_name':'Date QA','brief':'Valid disposable brief','agreed_to_tos':True,'requested_deadline':deadline}
        with patch('api.routers.commissions.utcnow',return_value=datetime(2026,11,13,23,59)):
            return asyncio.run(submit_commission_request(self.tasks,json.dumps(payload),[],self.session,self.client))

    def test_past_deadline_rejected_without_record_upload_or_notification(self):
        with patch('api.routers.commissions.validate_and_save_upload') as upload:
            with self.assertRaises(HTTPException) as error:self.submit('2026-10-01T00:00:00Z')
            self.assertEqual(error.exception.status_code,422);self.assertIn('past',error.exception.detail)
            upload.assert_not_called()
        self.assertEqual(self.session.exec(select(CommissionRequest)).all(),[])
        self.assertEqual(self.tasks.tasks,[])

    def test_today_midnight_remains_valid_late_in_the_day(self):
        response=self.submit('2026-11-14T00:00:00Z')
        self.assertEqual(response.requested_deadline.date(),datetime(2026,11,14).date())
        self.assertEqual(response.total_price,123.45)

    def test_future_deadline_preserved(self):
        response=self.submit('2026-12-25T00:00:00Z')
        self.assertEqual(response.requested_deadline,datetime(2026,12,25))

    def test_optional_deadline_remains_optional(self):
        self.assertIsNone(self.submit(None).requested_deadline)

    def test_bangkok_day_before_midnight_remains_valid(self):
        with patch('api.routers.commissions.utcnow',return_value=datetime(2026,11,13,16,59)):
            payload={'service_id':self.service.id,'character_name':'Before midnight','brief':'Bangkok calendar','agreed_to_tos':True,'requested_deadline':'2026-11-13T00:00:00Z'}
            result=asyncio.run(submit_commission_request(self.tasks,json.dumps(payload),[],self.session,self.client))
            self.assertEqual(result.requested_deadline.date(),datetime(2026,11,13).date())

    def test_exact_bangkok_midnight_rejects_previous_day_and_accepts_today(self):
        with patch('api.routers.commissions.utcnow',return_value=datetime(2026,11,13,17,0)):
            payload={'service_id':self.service.id,'character_name':'At midnight','brief':'Bangkok calendar','agreed_to_tos':True,'requested_deadline':'2026-11-13T00:00:00Z'}
            with self.assertRaises(HTTPException) as error:asyncio.run(submit_commission_request(self.tasks,json.dumps(payload),[],self.session,self.client))
            self.assertEqual(error.exception.status_code,422)
            payload['requested_deadline']='2026-11-14T00:00:00Z'
            result=asyncio.run(submit_commission_request(self.tasks,json.dumps(payload),[],self.session,self.client))
            self.assertEqual(result.requested_deadline.date(),datetime(2026,11,14).date())

    def test_bangkok_new_year_preserves_selected_date(self):
        with patch('api.routers.commissions.utcnow',return_value=datetime(2026,12,31,17,0)):
            payload={'service_id':self.service.id,'character_name':'New year','brief':'Bangkok calendar','agreed_to_tos':True,'requested_deadline':'2027-01-01T00:00:00Z'}
            result=asyncio.run(submit_commission_request(self.tasks,json.dumps(payload),[],self.session,self.client))
            self.assertEqual(result.requested_deadline,datetime(2027,1,1))

if __name__=='__main__':unittest.main()
