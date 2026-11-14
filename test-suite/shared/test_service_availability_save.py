"""Service editor saves its advertised availability and retains slot alerts."""
import asyncio,unittest
from unittest.mock import AsyncMock,patch
from fastapi import HTTPException
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel,Session,create_engine
from api.routers.artists import update_service_scale
from models import User,ArtistProfile,ArtistService
from schemas.commission import ServiceScaleUpdateRequest

class ServiceAvailabilitySaveTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.artist=User(email='artist@availability.test',full_name='Artist',hashed_password='unused',is_artist=True)
        self.other=User(email='other@availability.test',full_name='Other',hashed_password='unused',is_artist=True)
        self.session.add_all([self.artist,self.other]);self.session.commit()
        self.profile=ArtistProfile(user_id=self.artist.id,handle='availability_artist',display_name='Artist',tagline='',bio='')
        self.other_profile=ArtistProfile(user_id=self.other.id,handle='other_artist',display_name='Other',tagline='',bio='')
        self.session.add_all([self.profile,self.other_profile]);self.session.commit()
        self.service=ArtistService(artist_id=self.profile.id,title='QA',category='Illustration',description='QA',base_price=1100.25,estimated_days=7,is_form_open=False)
        self.session.add(self.service);self.session.commit()

    def tearDown(self):self.session.close();self.engine.dispose()

    def save(self,**values):return asyncio.run(update_service_scale(self.service.id,ServiceScaleUpdateRequest(**values),self.session,self.artist))

    def test_editor_open_and_closed_states_persist_with_other_fields(self):
        with patch('api.routers.artists.dispatch_slot_opening_alert',new_callable=AsyncMock):
            self.save(is_form_open=True,base_price=1200.75,title='Updated QA')
            self.session.expire_all()
            saved=self.session.get(ArtistService,self.service.id)
            self.assertTrue(saved.is_form_open);self.assertEqual(saved.base_price,1200.75)
            self.save(is_form_open=False)
            self.session.expire_all();self.assertFalse(self.session.get(ArtistService,self.service.id).is_form_open)

    def test_reopening_dispatches_once_and_repeat_save_does_not_repeat_alert(self):
        with patch('api.routers.artists.dispatch_slot_opening_alert',new_callable=AsyncMock) as dispatch:
            self.save(is_form_open=True);self.save(is_form_open=True);self.save(title='Keep open')
            dispatch.assert_awaited_once()

    def test_another_artist_cannot_change_availability(self):
        with self.assertRaises(HTTPException) as error:
            asyncio.run(update_service_scale(self.service.id,ServiceScaleUpdateRequest(is_form_open=True),self.session,self.other))
        self.assertEqual(error.exception.status_code,404)
        self.assertFalse(self.session.get(ArtistService,self.service.id).is_form_open)

if __name__=='__main__':unittest.main()
