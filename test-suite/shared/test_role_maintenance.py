"""Targeted role regressions with real foreign keys; no server or production database."""
import io
import os
import tempfile
import unittest
from pathlib import Path

from fastapi import BackgroundTasks, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy import event
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

from api.routers.auth import delete_user
from api.routers.characters import delete_character
from api.routers.orders import approve_invoice_payment
from api.routers.system import update_watermark_settings, get_watermark_settings, get_homepage_text, update_homepage_text
from models import User, ArtistProfile, Character, Artwork, Order, MilestoneInvoice
from schemas.artist import ArtistUpdateRequest


class RoleMaintenanceTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        @event.listens_for(self.engine,'connect')
        def foreign_keys(connection,record): connection.execute('PRAGMA foreign_keys=ON')
        SQLModel.metadata.create_all(self.engine)
        self.session=Session(self.engine)
        self.admin=User(email='admin@qa.test',full_name='Admin',hashed_password='unused',is_admin=True)
        self.artist=User(email='artist@qa.test',full_name='Artist',hashed_password='unused',is_artist=True)
        self.client=User(email='client@qa.test',full_name='Client',hashed_password='unused')
        self.session.add_all([self.admin,self.artist,self.client]);self.session.commit()
        self.profile=ArtistProfile(user_id=self.artist.id,handle='qa_artist',display_name='Artist',tagline='',bio='')
        self.session.add(self.profile);self.session.commit()

    def tearDown(self):
        self.session.close();self.engine.dispose()

    def test_deleting_linked_character_preserves_and_unlinks_artwork(self):
        character=Character(name='Linked',artist_id=self.profile.id)
        self.session.add(character);self.session.commit()
        artwork=Artwork(title='Keep artwork',image_url='/sample.png',artist_id=self.profile.id,character_id=character.id)
        self.session.add(artwork);self.session.commit()
        character_id,artwork_id=character.id,artwork.id
        delete_character(character_id,self.session,self.artist)
        self.assertIsNone(self.session.get(Character,character_id))
        self.session.expire_all()
        self.assertIsNone(self.session.get(Artwork,artwork_id).character_id)

    def test_empty_artist_profile_account_can_be_deleted(self):
        user_id,profile_id=self.artist.id,self.profile.id
        delete_user(user_id,self.session,self.admin)
        self.assertIsNone(self.session.get(User,user_id))
        self.assertIsNone(self.session.get(ArtistProfile,profile_id))

    def test_artist_with_studio_content_returns_conflict_and_preserves_content(self):
        character=Character(name='Preserve',artist_id=self.profile.id)
        self.session.add(character);self.session.commit()
        with self.assertRaises(HTTPException) as error: delete_user(self.artist.id,self.session,self.admin)
        self.assertEqual(error.exception.status_code,409)
        self.assertIsNotNone(self.session.get(Character,character.id))
        self.assertIsNotNone(self.session.get(User,self.artist.id))

    def test_rejected_logo_preserves_complete_previous_settings(self):
        before=get_watermark_settings(self.session)
        prior=os.getcwd()
        with tempfile.TemporaryDirectory() as directory:
            try:
                os.chdir(directory)
                for name,content in [('bad.svg',b'<svg/>'),('bad.png',b'\x89PNG\r\n\x1a\n')]:
                    with self.subTest(name=name), self.assertRaises(HTTPException) as error:
                        update_watermark_settings(type='hybrid',text='must not save',pattern='corner',rotation=45,opacity=0.8,tile_density='high',include_anti_ai_grid=True,image=UploadFile(filename=name,file=io.BytesIO(content)),session=self.session,admin_user=self.admin)
                    self.assertEqual(error.exception.status_code,400)
                    self.assertEqual(get_watermark_settings(self.session),before)
                    self.assertEqual(list(Path('.').rglob('logo_*')),[])
            finally: os.chdir(prior)

    def test_stale_and_repeated_approval_produce_only_one_notification_task(self):
        order=Order(title='Payment',description='QA',artist_id=self.artist.id,client_id=self.client.id,agreed_price=100)
        self.session.add(order);self.session.commit()
        invoice=MilestoneInvoice(order_id=order.id,title='Deposit',amount=100)
        self.session.add(invoice);self.session.commit()
        with Session(self.engine) as stale:
            stale_invoice=stale.get(MilestoneInvoice,invoice.id)
            self.assertFalse(stale_invoice.is_paid)
            first=BackgroundTasks()
            approve_invoice_payment(invoice.id,first,self.session,self.artist)
            second=BackgroundTasks()
            approved=approve_invoice_payment(invoice.id,second,stale,stale.get(User,self.artist.id))
            self.assertTrue(approved.is_paid)
            self.assertEqual(len(first.tasks),1)
            self.assertEqual(len(second.tasks),0)

    def test_homepage_copy_marks_saved_content_for_public_rendering(self):
        self.assertFalse(get_homepage_text(self.session)['is_customized'])
        result=update_homepage_text({'hero_title_1':'QA published headline'},self.session,self.admin)
        self.assertTrue(result['is_customized'])
        self.assertEqual(get_homepage_text(self.session)['hero_title_1'],'QA published headline')

    def test_unsupported_commission_status_rejected_without_affecting_supported_statuses(self):
        for status in ['OPEN','CLOSED','WAITLIST']:
            self.assertEqual(ArtistUpdateRequest(commission_status=status).commission_status,status)
        with self.assertRaises(ValidationError): ArtistUpdateRequest(commission_status='UNKNOWN_STATUS')


if __name__=='__main__': unittest.main()
