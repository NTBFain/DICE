"""Saved briefs are exposed only through already-authorized order responses."""
import unittest
from datetime import datetime
from fastapi import BackgroundTasks, HTTPException
from sqlmodel import SQLModel, Session, create_engine
from models import User, ArtistProfile, ArtistService, Order
from models.commission import CommissionRequest
from api.routers.orders import get_order_by_id, get_orders, update_order
from schemas.order import OrderResponse, OrderUpdateRequest

class StructuredBriefTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://');SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.client=User(email='brief-client@qa.test',hashed_password='unused',full_name='Client')
        self.other=User(email='brief-other@qa.test',hashed_password='unused',full_name='Other')
        self.artist=User(email='brief-artist@qa.test',hashed_password='unused',full_name='Artist',is_artist=True)
        self.admin=User(email='brief-admin@qa.test',hashed_password='unused',full_name='Admin',is_admin=True)
        self.session.add_all([self.client,self.other,self.artist,self.admin]);self.session.commit()
        profile=ArtistProfile(user_id=self.artist.id,handle='brief_qa',display_name='QA',tagline='',bio='')
        self.session.add(profile);self.session.commit()
        self.service=ArtistService(artist_id=profile.id,title='Original service',category='Art',description='',base_price=123.45,estimated_days=7)
        self.session.add(self.service);self.session.commit()
        self.request=CommissionRequest(service_id=self.service.id,client_id=self.client.id,artist_user_id=self.artist.id,character_name="Mina's OC",brief='Keep my exact Thai answer สีฟ้า',usage_type='PERSONAL',canvas_size='Square (1:1)',requested_deadline=datetime(2026,12,14),total_price=123.45,base_price_snapshot=123.45,tos_snapshot='Original agreed terms',tos_version=2,custom_responses={'custom_answers':{'q1':'PDF + PNG','missing':'Exact old answer'},'custom_question_labels':{'q1':'Original question'}})
        self.session.add(self.request);self.session.commit()
        self.order=Order(title='Linked brief',description='Historical description must remain untouched',client_id=self.client.id,artist_id=self.artist.id,commission_request_id=self.request.id)
        self.session.add(self.order);self.session.commit()
    def tearDown(self):self.session.close();self.engine.dispose()
    def response(self,user=None):return OrderResponse.model_validate(get_order_by_id(self.order.id,self.session,user or self.client))
    def test_saved_brief_is_typed_and_independent_of_live_service(self):
        self.session.refresh(self.request);before=self.request.model_dump();self.service.title='Edited service';self.service.base_price=999
        self.service.form_schema=[{'type':'CUSTOM_QUESTIONS','config':{'questions':[{'id':'missing','label':'Invented replacement'}]}}]
        self.session.add(self.service);self.session.commit()
        brief=self.response().commission_brief
        self.assertEqual(brief.total_price,123.45);self.assertEqual(brief.requested_deadline,datetime(2026,12,14))
        self.assertEqual(brief.custom_responses['custom_question_labels'],{'q1':'Original question'})
        self.assertEqual(brief.tos_snapshot,'Original agreed terms');self.assertEqual(self.request.model_dump(),before)
        self.assertEqual(self.response().description,'Historical description must remain untouched')
    def test_client_cannot_read_another_clients_brief(self):
        with self.assertRaises(HTTPException) as error:self.response(self.other)
        self.assertEqual(error.exception.status_code,403)
        self.assertEqual(get_orders(self.session,self.other),[])
    def test_owner_artist_admin_list_and_detail_match(self):
        for actor in (self.client,self.artist,self.admin):
            listed=OrderResponse.model_validate(get_orders(self.session,actor)[0])
            self.assertEqual(listed.commission_brief,self.response(actor).commission_brief)
    def test_unlinked_orders_and_corrupt_links_keep_description_fallback(self):
        self.order.commission_request_id=None;self.session.add(self.order);self.session.commit()
        self.assertIsNone(self.response().commission_brief)
        self.order.commission_request_id=self.request.id;self.request.client_id=self.other.id
        self.session.add_all([self.order,self.request]);self.session.commit()
        self.assertIsNone(self.response().commission_brief)
    def test_order_update_keeps_saved_brief_readonly(self):
        payload=OrderUpdateRequest(revision_quota=4,commission_brief={'brief':'Forged'})
        result=update_order(self.order.id,payload,BackgroundTasks(),self.session,self.artist)
        self.assertEqual(result['commission_brief']['brief'],'Keep my exact Thai answer สีฟ้า')
        self.assertEqual(result['revision_quota'],4)

if __name__=='__main__':unittest.main()
