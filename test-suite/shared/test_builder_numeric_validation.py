"""F35: real request validation rejects invalid configuration without changing saved data."""
import unittest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine
from api.routers.artists import router
from core.auth import get_artist_user
from core.db import get_session
from models import User, ArtistProfile, ArtistService
from schemas.commission import FormSchemaUpdateRequest
from pydantic import ValidationError

class BuilderNumericValidationTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.artist=User(email='builder@qa.test',full_name='Builder QA',hashed_password='unused',is_artist=True)
        self.session.add(self.artist);self.session.commit()
        self.profile=ArtistProfile(user_id=self.artist.id,handle='builder_qa',display_name='QA',tagline='',bio='')
        self.session.add(self.profile);self.session.commit()
        self.original=[{'id':'background','type':'BACKGROUND_TIER','enabled':True,'config':{'tiers':[{'label':'Plain','price':0}]}}]
        self.service=ArtistService(artist_id=self.profile.id,title='QA',category='Illustration',description='',base_price=123.45,estimated_days=7,form_schema=self.original)
        self.session.add(self.service);self.session.commit()
        app=FastAPI();app.include_router(router)
        app.dependency_overrides[get_artist_user]=lambda:self.artist
        app.dependency_overrides[get_session]=lambda:self.session
        self.client=TestClient(app)

    def tearDown(self):self.client.close();self.session.close();self.engine.dispose()

    def put(self,blocks):return self.client.put(f'/api/artists/me/services/{self.service.id}/form-schema',json={'blocks':blocks})
    def block(self,kind,config):return {'id':'qa','type':kind,'enabled':True,'config':config}

    def test_negative_background_price_is_422_and_preserves_saved_schema(self):
        response=self.put([self.block('BACKGROUND_TIER',{'tiers':[{'label':'Plain','price':-5.25}]})])
        self.assertEqual(response.status_code,422)
        self.session.expire_all();self.assertEqual(self.session.get(ArtistService,self.service.id).form_schema,self.original)

    def test_zero_and_decimal_fees_persist_without_coercion(self):
        blocks=[self.block('BACKGROUND_TIER',{'tiers':[{'label':'Plain','price':0},{'label':'Scenic','price':25.25}]}),self.block('PRIVACY_NDA',{'price':0}),self.block('CHARACTER_COUNT',{'max_chars':1,'extra_price_percent':10.5})]
        response=self.put(blocks);self.assertEqual(response.status_code,200,response.text)
        self.session.expire_all();self.assertEqual(self.session.get(ArtistService,self.service.id).form_schema,blocks)

    def test_all_fee_sources_and_declared_character_bounds_are_enforced(self):
        invalid=[('CHARACTER_COUNT',{'max_chars':0}),('CHARACTER_COUNT',{'max_chars':11}),('CHARACTER_COUNT',{'max_chars':1.5}),('CHARACTER_COUNT',{'extra_price_percent':-1}),('CHARACTER_COUNT',{'extra_price_percent':201}),('PRIVACY_NDA',{'price':-1}),('RUSH_MODE',{'rates':[{'days':0,'percent':25}]}),('RUSH_MODE',{'rates':[{'days':2,'percent':-1}]})]
        for kind,config in invalid:
            with self.subTest(kind=kind,config=config):self.assertEqual(self.put([self.block(kind,config)]).status_code,422)

    def test_nonfinite_boolean_and_malformed_numbers_are_rejected(self):
        for value in [float('nan'),float('inf'),True,'-5.25',None]:
            with self.subTest(value=value),self.assertRaises(ValidationError):FormSchemaUpdateRequest(blocks=[self.block('PRIVACY_NDA',{'price':value})])
        for config in [None,{'tiers':'bad'},{'tiers':[None]}]:
            with self.subTest(config=config),self.assertRaises(ValidationError):FormSchemaUpdateRequest(blocks=[self.block('BACKGROUND_TIER',config)])

    def test_disabled_invalid_fee_cannot_be_saved_for_later_activation(self):
        block=self.block('PRIVACY_NDA',{'price':-1});block['enabled']=False
        self.assertEqual(self.put([block]).status_code,422)

if __name__=='__main__':unittest.main()
