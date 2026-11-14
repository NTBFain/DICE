"""F40: reject invalid character colours before storage or media side effects."""
import unittest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlmodel import SQLModel,Session,create_engine,select
from sqlalchemy.pool import StaticPool
from api.routers.characters import router
from core.auth import get_artist_user
from core.db import get_session
from models import Character,User,ArtistProfile

class CharacterColourTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.admin=User(email='colour-admin@qa.test',full_name='Admin',hashed_password='unused',is_admin=True)
        self.other=User(email='colour-artist@qa.test',full_name='Artist',hashed_password='unused',is_artist=True)
        self.session.add_all([self.admin,self.other]);self.session.commit()
        self.profile=ArtistProfile(user_id=self.other.id,handle='colour_qa',display_name='QA',tagline='',bio='')
        self.session.add(self.profile);self.session.commit()
        self.character=Character(name='Existing',description='Keep this',theme_color='#3366FF',artist_id=None)
        self.session.add(self.character);self.session.commit()
        self.current_user=self.admin;app=FastAPI();app.include_router(router)
        app.dependency_overrides[get_artist_user]=lambda:self.current_user
        app.dependency_overrides[get_session]=lambda:self.session
        self.client=TestClient(app)
    def tearDown(self):self.client.close();self.session.close();self.engine.dispose()

    def test_invalid_create_has_no_record_or_media_side_effect(self):
        with patch('api.routers.characters.validate_and_save_upload') as upload:
            response=self.client.post('/api/characters',data={'name':'Rejected','theme_color':'#ZZZZZZ'},files={'image':('qa.png',b'unused','image/png')})
            self.assertEqual(response.status_code,422,response.text);upload.assert_not_called()
        self.assertEqual(len(self.session.exec(select(Character)).all()),1)

    def test_invalid_update_preserves_colour_and_other_fields(self):
        response=self.client.put(f'/api/characters/{self.character.id}',data={'name':'Wrong','description':'Wrong','theme_color':'rgb(1,2,3)'})
        self.assertEqual(response.status_code,422,response.text)
        self.session.expire_all();saved=self.session.get(Character,self.character.id)
        self.assertEqual((saved.name,saved.description,saved.theme_color),('Existing','Keep this','#3366FF'))

    def test_valid_hex_and_optional_default_remain_supported(self):
        for colour in ['#A1b2C3','  #3366FF  ']:
            with self.subTest(colour=colour):
                response=self.client.put(f'/api/characters/{self.character.id}',data={'theme_color':colour})
                self.assertEqual(response.status_code,200,response.text)
                self.assertEqual(response.json()['theme_color'],colour.strip())
        for payload in [{'name':'Default colour'},{'name':'Empty default','theme_color':''}]:
            response=self.client.post('/api/characters',data=payload)
            self.assertEqual(response.status_code,200,response.text);self.assertIsNone(response.json()['theme_color'])

    def test_artist_cannot_modify_another_owners_character(self):
        self.current_user=self.other
        response=self.client.put(f'/api/characters/{self.character.id}',data={'theme_color':'#AABBCC'})
        self.assertEqual(response.status_code,403)
        self.assertEqual(self.session.get(Character,self.character.id).theme_color,'#3366FF')

if __name__=='__main__':unittest.main()
