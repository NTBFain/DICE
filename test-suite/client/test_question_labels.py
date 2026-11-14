"""Submitted question labels must remain meaningful after later service edits."""
import asyncio,json,unittest
from fastapi import BackgroundTasks
from sqlmodel import SQLModel,Session,create_engine
from models import User,ArtistProfile,ArtistService
from models.commission import CommissionRequest
from api.routers.commissions import submit_commission_request
from services.commission_service import accept_commission_request,snapshot_custom_responses

class QuestionLabelTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://');SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.artist=User(email='label-artist@qa.test',full_name='Artist',hashed_password='unused',is_artist=True)
        self.client=User(email='label-client@qa.test',full_name='Client',hashed_password='unused')
        self.session.add_all([self.artist,self.client]);self.session.commit()
        self.profile=ArtistProfile(user_id=self.artist.id,handle='label_qa',display_name='QA',tagline='',bio='')
        self.session.add(self.profile);self.session.commit()
        self.original="Preferred delivery format? Mina's OC"
        self.service=ArtistService(artist_id=self.profile.id,title='QA',category='Art',description='',base_price=123.45,estimated_days=7,max_slots=5,form_schema=[{'type':'CUSTOM_QUESTIONS','enabled':True,'config':{'questions':[{'id':'q_mood','label':self.original,'required':True}]}}])
        self.session.add(self.service);self.session.commit()
    def tearDown(self):self.session.close();self.engine.dispose()
    def submit(self,responses):
        data={'service_id':self.service.id,'character_name':'Label QA','brief':'Keep exact answer wording.','agreed_to_tos':True,'custom_responses':responses}
        result=asyncio.run(submit_commission_request(BackgroundTasks(),json.dumps(data),[],self.session,self.client))
        return self.session.get(CommissionRequest,result.id)
    def test_submission_uses_server_labels_and_ignores_spoofed_metadata(self):
        request=self.submit({'custom_answers':{'q_mood':'PDF + PNG'},'custom_question_labels':{'q_mood':'Spoofed question'}})
        self.assertEqual(request.custom_responses['custom_question_labels'],{'q_mood':self.original})
        self.assertEqual(request.custom_responses['custom_answers'],{'q_mood':'PDF + PNG'})
        self.assertEqual(request.total_price,123.45)
    def test_acceptance_keeps_original_question_after_service_is_edited(self):
        request=self.submit({'custom_answers':{'q_mood':'PDF plus transparent PNG'}})
        self.service.form_schema=[{'type':'CUSTOM_QUESTIONS','enabled':True,'config':{'questions':[{'id':'q_mood','label':'Changed after submission','required':True}]}}]
        self.session.add(self.service);self.session.commit()
        order=accept_commission_request(self.session,request.id,self.artist.id)
        self.assertIn(self.original+': PDF plus transparent PNG',order.description)
        self.assertNotIn('Changed after submission',order.description)
        self.assertNotIn('q_mood',order.description);self.assertNotIn('Custom question labels',order.description)
        self.assertEqual(order.agreed_price,123.45)
    def test_disabled_or_unknown_questions_never_supply_fake_labels(self):
        self.service.form_schema=[{'type':'CUSTOM_QUESTIONS','enabled':False,'config':{'questions':[{'id':'q_mood','label':'Hidden question'}]}}]
        result=snapshot_custom_responses(self.service,{'custom_answers':{'q_mood':'A','unknown_id':'B'},'custom_question_labels':{'unknown_id':'Fake'}})
        self.assertEqual(result['custom_question_labels'],{})
        self.assertEqual(result['custom_answers'],{'q_mood':'A','unknown_id':'B'})
    def test_legacy_pending_answers_do_not_invent_missing_historical_labels(self):
        request=CommissionRequest(service_id=self.service.id,client_id=self.client.id,artist_user_id=self.artist.id,character_name='Legacy QA',brief='Legacy brief',total_price=123.45,custom_responses={'custom_answers':{'q_mood':'Original answer','deleted_question':'Retain this answer'}})
        self.session.add(request);self.session.commit()
        order=accept_commission_request(self.session,request.id,self.artist.id)
        self.assertIn('Additional answer: Original answer',order.description)
        self.assertNotIn(self.original,order.description)
        self.assertIn('Additional answer: Retain this answer',order.description)

if __name__=='__main__':unittest.main()
