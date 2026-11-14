"""Small regressions for repaired client flows. Run from backend; no server needed."""
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
import asyncio
from fastapi import HTTPException
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

from models import ArtistProfile, ArtistService, User, Order, OrderStatus, File, MilestoneInvoice
from models.commission import CommissionRequest
from services.commission_service import compute_total_price, validate_custom_responses, accept_commission_request
from api.routers.orders import download_order_file
from api.routers.artists import get_artist_by_handle
from core.time import utcnow


def valid_png_bytes():
    import io
    from PIL import Image
    buffer = io.BytesIO()
    Image.new("RGB", (12, 10), "blue").save(buffer, format="PNG")
    return buffer.getvalue()


class ClientRegressionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.artist = User(email='artist@local.test', full_name='Artist', hashed_password='unused', is_artist=True)
        self.client = User(email='client@local.test', full_name='Client', hashed_password='unused')
        self.other = User(email='other@local.test', full_name='Other', hashed_password='unused')
        self.session.add_all([self.artist,self.client,self.other]); self.session.commit()
        self.profile = ArtistProfile(user_id=self.artist.id, handle='regression', display_name='Artist', tagline='', bio='')
        self.session.add(self.profile); self.session.commit()
        self.service = ArtistService(artist_id=self.profile.id, title='Service', category='Art', description='', base_price=1000.25,
            form_schema=[{'type':'BACKGROUND_TIER','enabled':True,'config':{'tiers':[{'label':'Scenic','price':500.15}]}}])
        self.session.add(self.service); self.session.commit()

    def tearDown(self):
        self.session.close(); self.engine.dispose()

    def test_background_uses_configured_price_not_client_price(self):
        total, _ = compute_total_price(self.service, [], {'background_tier':{'label':'Scenic','price':0}})
        self.assertEqual(total, 1500.40)

    def test_fractional_cent_rounds_half_up(self):
        self.service.base_price=2.675
        self.assertEqual(compute_total_price(self.service, [], {})[0], 2.68)

    def test_required_custom_answer_rejected(self):
        self.service.form_schema=[{'type':'CUSTOM_QUESTIONS','enabled':True,'config':{'questions':[{'id':'colors','label':'Colors','required':True}]}}]
        with self.assertRaises(HTTPException) as error:
            validate_custom_responses(self.service, {'custom_answers':{'colors':'   '}})
        self.assertEqual(error.exception.status_code,422)
        validate_custom_responses(self.service, {'custom_answers':{'colors':'Blue'}})

    def test_scope_acknowledgement_required(self):
        self.service.form_schema=[{'type':'SCOPE_EXCLUSIONS','enabled':True,'config':{'require_ack':True}}]
        with self.assertRaises(HTTPException): validate_custom_responses(self.service,{})
        validate_custom_responses(self.service,{'scope_exclusions_acknowledged':True})

    def test_accept_preserves_deadline_price_reference_name_and_invoice_total(self):
        deadline=datetime(2027,1,1)
        request=CommissionRequest(service_id=self.service.id,client_id=self.client.id,artist_user_id=self.artist.id,
            character_name='Character',usage_type='PERSONAL',brief='Brief',canvas_size='Square',requested_deadline=deadline,
            reference_images=['a'*32+'_0_reference.png'],base_price_snapshot=1000.25,total_price=1500.4,tos_snapshot='Original terms')
        self.session.add(request); self.session.commit()
        order=accept_commission_request(self.session,request.id,self.artist.id)
        self.assertEqual(order.due_date,deadline)
        self.assertEqual(order.agreed_price,1500.4)
        self.assertEqual(sum(invoice.amount for invoice in order.milestone_invoices),1500.4)
        self.assertEqual(order.files[0].filename,'reference.png')
        with self.assertRaises(HTTPException): accept_commission_request(self.session,request.id,self.artist.id)

    def test_reference_download_uses_reference_storage_and_checks_owner(self):
        order=Order(title='Test',description='Test',client_id=self.client.id,artist_id=self.artist.id,status=OrderStatus.ACCEPTED)
        self.session.add(order);self.session.commit()
        stored='a'*32+'_0_reference.png'
        file=File(order_id=order.id,filename='ref_legacy_name',s3_key=stored,file_type='REFERENCE',is_watermarked=False)
        self.session.add(file);self.session.commit()
        previous=os.getcwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary);Path('uploads/references').mkdir(parents=True)
                Path('uploads/references',stored).write_bytes(b'local reference')
                response=download_order_file(order.id,file.id,self.session,self.client)
                self.assertEqual(Path(response.path).read_bytes(),b'local reference')
                self.assertEqual(response.filename,'reference.png')
                with self.assertRaises(HTTPException) as error: download_order_file(order.id,file.id,self.session,self.other)
                self.assertEqual(error.exception.status_code,403)
            finally: os.chdir(previous)

    def test_auction_reference_download_uses_auction_storage_before_payment(self):
        order=Order(title='Auction',description='Fixture',client_id=self.client.id,artist_id=self.artist.id,agreed_price=100)
        self.session.add(order);self.session.commit()
        file=File(order_id=order.id,filename='Auction_preview.png',s3_key='/api/auctions/images/auc_test.png',file_type='REFERENCE',is_watermarked=False)
        self.session.add(file);self.session.commit()
        previous=os.getcwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary);Path('uploads/auctions').mkdir(parents=True)
                Path('uploads/auctions/auc_test.png').write_bytes(b'auction preview')
                response=download_order_file(order.id,file.id,self.session,self.client)
                self.assertEqual(Path(response.path).read_bytes(),b'auction preview')
                self.assertEqual(response.filename,'Auction_preview.png')
                with self.assertRaises(HTTPException) as error:download_order_file(order.id,file.id,self.session,self.other)
                self.assertEqual(error.exception.status_code,403)
            finally:os.chdir(previous)

    def test_portfolio_filters_before_paging_and_reaches_old_character_artwork(self):
        from models import Artwork,Character,VisibilityStatus,WorkType
        from api.routers.portfolio import get_portfolio
        character=Character(name='Target',description='Fixture',artist_id=self.profile.id)
        self.session.add(character);self.session.commit()
        artworks=[]
        for index in range(33):
            artwork=Artwork(title=f'Public {index}',image_url='/fixture.png',artist_id=self.profile.id,visibility_status=VisibilityStatus.PUBLIC,work_type=WorkType.ILLUSTRATION,character_id=character.id if index==0 else None)
            self.session.add(artwork);artworks.append(artwork)
        self.session.add(Artwork(title='Private',image_url='/private.png',artist_id=self.profile.id,visibility_status=VisibilityStatus.PRIVATE,work_type=WorkType.ILLUSTRATION))
        self.session.commit()
        first=get_portfolio(limit=32,offset=0,artist_id=self.profile.id,work_type='ILLUSTRATION',session=self.session)
        second=get_portfolio(limit=32,offset=32,artist_id=self.profile.id,work_type='ILLUSTRATION',session=self.session)
        self.assertEqual((len(first),len(second)),(32,1))
        self.assertEqual(len({artwork.id for artwork in first+second}),33)
        oldest=get_portfolio(limit=32,offset=0,artist_id=self.profile.id,work_type='ILLUSTRATION',character_id=character.id,session=self.session)
        self.assertEqual([artwork.id for artwork in oldest],[artworks[0].id])

    def test_public_profile_filters_private_artworks(self):
        from models import Artwork, VisibilityStatus
        for visibility in [VisibilityStatus.PUBLIC,VisibilityStatus.PRIVATE]:
            self.session.add(Artwork(title=visibility.value,image_url='/local.png',artist_id=self.profile.id,visibility_status=visibility))
        self.session.commit()
        response=get_artist_by_handle(self.profile.handle,self.session)
        self.assertEqual(len(response.artworks),1)
        self.assertEqual(response.artworks[0].title,'PUBLIC')

    def test_auto_buy_links_exactly_one_order_and_invoice(self):
        from models import Auction, AuctionType, AuctionStatus
        from services.auction_service import finalize_auto_buy
        from datetime import timedelta
        auction=Auction(title='Auction',description='Fixture',artist_id=self.profile.id,auction_type=AuctionType.ADOPTABLE,
            starting_bid=100,bid_increment=10,auto_buy=250,start_time=utcnow()-timedelta(minutes=1),end_time=utcnow()+timedelta(hours=1))
        self.session.add(auction);self.session.commit()
        self.assertTrue(asyncio.run(finalize_auto_buy(auction,self.client.id,250,self.session)))
        self.assertFalse(asyncio.run(finalize_auto_buy(auction,self.client.id,250,self.session)))
        orders=self.session.exec(select(Order).where(Order.auction_id==auction.id)).all()
        self.assertEqual(len(orders),1)
        self.assertEqual(orders[0].client_id,self.client.id)
        self.assertEqual(orders[0].milestone_invoices[0].amount,250)
        self.assertEqual(auction.status,AuctionStatus.ENDED)

    def test_existing_database_migration_is_repeatable(self):
        from sqlalchemy import text,inspect
        from core.migrations import run_lightweight_migrations
        engine=create_engine('sqlite:///:memory:')
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE "order" (id INTEGER PRIMARY KEY)'))
            connection.execute(text('INSERT INTO "order" (id) VALUES (1)'))
        run_lightweight_migrations(engine);run_lightweight_migrations(engine)
        self.assertIn('auction_id',{column['name'] for column in inspect(engine).get_columns('order')})
        with engine.connect() as connection:self.assertEqual(connection.execute(text('SELECT COUNT(*) FROM "order"')).scalar(),1)
        engine.dispose()

    def test_guest_can_read_catalog_but_cannot_modify_it(self):
        from api.routers.artists import router
        from core.db import get_session
        application=FastAPI();application.include_router(router)
        application.dependency_overrides[get_session]=lambda:self.session
        with TestClient(application) as browser:
            response=browser.get('/api/artists/regression/commission-info')
            self.assertEqual(response.status_code,200,response.text)
            self.assertEqual(response.json()['artist_id'],self.profile.id)
            response=browser.put(f'/api/artists/me/services/{self.service.id}/form-schema',json={'blocks':[]})
            self.assertEqual(response.status_code,401,response.text)

    def test_second_client_cannot_read_order_private_resources(self):
        from api.routers.orders import router
        from core.db import get_session
        from core.auth import create_access_token
        application=FastAPI();application.include_router(router)
        application.dependency_overrides[get_session]=lambda:self.session
        order=Order(title='Private',description='Private',client_id=self.client.id,artist_id=self.artist.id)
        self.session.add(order);self.session.commit()
        invoice=MilestoneInvoice(title='Private invoice',amount=100,order_id=order.id)
        self.session.add(invoice);self.session.commit()
        headers={'Authorization':'Bearer '+create_access_token({'sub':self.other.email})}
        paths=[f'/api/orders/{order.id}', f'/api/orders/{order.id}/messages',f'/api/orders/{order.id}/invoices',f'/api/orders/{order.id}/files',f'/api/orders/{order.id}/revisions',f'/api/invoices/{invoice.id}/slip']
        with TestClient(application) as browser:
            for path in paths:
                with self.subTest(path=path):self.assertEqual(browser.get(path,headers=headers).status_code,403)

    def test_client_cannot_change_artist_stage_or_approve_payment(self):
        from api.routers.orders import router
        from core.db import get_session
        from core.auth import create_access_token
        application=FastAPI();application.include_router(router)
        application.dependency_overrides[get_session]=lambda:self.session
        order=Order(title='Private',description='Private',client_id=self.client.id,artist_id=self.artist.id)
        self.session.add(order);self.session.commit()
        invoice=MilestoneInvoice(title='Invoice',amount=100,order_id=order.id)
        self.session.add(invoice);self.session.commit()
        headers={'Authorization':'Bearer '+create_access_token({'sub':self.client.email})}
        with TestClient(application) as browser:
            self.assertEqual(browser.patch(f'/api/orders/{order.id}',json={'status':'ACCEPTED'},headers=headers).status_code,403)
            self.assertEqual(browser.post(f'/api/invoices/{invoice.id}/approve',headers=headers).status_code,403)

    def test_client_cannot_manage_users_or_publish_artist_content(self):
        from api.routers import auth, portfolio, characters, auctions
        from core.db import get_session
        from core.auth import create_access_token
        from datetime import timedelta
        application=FastAPI()
        for router in [auth.router,portfolio.router,characters.router,auctions.router]:application.include_router(router)
        application.dependency_overrides[get_session]=lambda:self.session
        headers={'Authorization':'Bearer '+create_access_token({'sub':self.client.email})}
        with TestClient(application) as browser:
            responses={
                'list users':browser.get('/api/auth/users',headers=headers),
                'promote user':browser.put(f'/api/auth/users/{self.other.id}/role',json={'is_admin':True},headers=headers),
                'delete user':browser.delete(f'/api/auth/users/{self.other.id}',headers=headers),
                'publish artwork':browser.post('/api/portfolio',data={'title':'Unauthorized'},files={'image':('fixture.png',b'\x89PNG\r\n\x1a\nfixture','image/png')},headers=headers),
                'publish character':browser.post('/api/characters',data={'name':'Unauthorized'},headers=headers),
                'publish auction':browser.post('/api/auctions',json={'title':'Unauthorized','description':'Fixture','auction_type':'ADOPTABLE','starting_bid':100,'bid_increment':10,'start_time':utcnow().isoformat(),'end_time':(utcnow()+timedelta(hours=1)).isoformat()},headers=headers),
            }
            for action,response in responses.items():
                with self.subTest(action=action):self.assertEqual(response.status_code,403,response.text)
        self.assertIsNotNone(self.session.get(User,self.other.id))
        self.session.refresh(self.other);self.assertFalse(self.other.is_admin)

    def test_artist_queue_uses_profile_owner_not_another_artist(self):
        from api.routers.orders import get_public_queue
        other_profile=ArtistProfile(handle='quiet',user_id=self.other.id,display_name='Quiet',tagline='',bio='')
        self.session.add(other_profile);self.session.commit()
        order=Order(title='Private client title',description='Private',client_id=self.client.id,artist_id=self.artist.id,status=OrderStatus.ACCEPTED)
        self.session.add(order);self.session.commit()
        self.assertEqual(get_public_queue(self.session,other_profile.id),[])
        result=get_public_queue(self.session,self.profile.id)
        self.assertEqual([item['order_id'] for item in result],[order.id])
        self.assertNotIn('Private client title',str(result))
        owner_result=get_public_queue(self.session,self.profile.id,self.client)
        self.assertEqual(owner_result[0]['title'],'Private client title')
        self.assertEqual(owner_result[0]['client_id'],self.client.id)
        other_result=get_public_queue(self.session,self.profile.id,self.other)
        self.assertNotIn('Private client title',str(other_result))
        self.assertIsNone(other_result[0]['client_id'])

    def test_cancelled_order_rejects_new_payment_proof_and_hides_status_from_other_clients(self):
        import io
        from fastapi import BackgroundTasks,UploadFile
        from api.routers.orders import pay_invoice
        order=Order(title='Cancelled',description='Fixture',client_id=self.client.id,artist_id=self.artist.id,status=OrderStatus.CANCELLED)
        self.session.add(order);self.session.commit()
        invoice=MilestoneInvoice(title='Deposit',amount=100,order_id=order.id)
        self.session.add(invoice);self.session.commit()
        for user,code in [(self.client,409),(self.other,403)]:
            with self.subTest(user=user.id):
                with self.assertRaises(HTTPException) as error:
                    pay_invoice(invoice.id,BackgroundTasks(),UploadFile(filename='proof.png',file=io.BytesIO(b'fixture')),self.session,user)
                self.assertEqual(error.exception.status_code,code)
        self.assertIsNone(invoice.slip_image_url)

    def test_invalid_slip_replacement_preserves_previous_proof(self):
        import io
        from fastapi import BackgroundTasks,UploadFile
        from api.routers.orders import pay_invoice
        order=Order(title='Payment',description='Fixture',client_id=self.client.id,artist_id=self.artist.id)
        self.session.add(order);self.session.commit()
        invoice=MilestoneInvoice(title='Deposit',amount=100,order_id=order.id,slip_image_url='/existing/slip')
        self.session.add(invoice);self.session.commit()
        previous=os.getcwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary);Path('uploads/slips').mkdir(parents=True)
                old=Path(f'uploads/slips/slip_{invoice.id}_previous.png');old.write_bytes(b'previous proof')
                with self.assertRaises(HTTPException):
                    pay_invoice(invoice.id,BackgroundTasks(),UploadFile(filename='corrupt.png',file=io.BytesIO(b'not an image')),self.session,self.client)
                self.assertEqual(old.read_bytes(),b'previous proof')
                self.assertEqual(invoice.slip_image_url,'/existing/slip')
            finally:os.chdir(previous)

    def test_failed_slip_commit_preserves_previous_proof(self):
        import io
        from unittest.mock import patch
        from fastapi import BackgroundTasks,UploadFile
        from api.routers.orders import pay_invoice
        order=Order(title='Payment',description='Fixture',client_id=self.client.id,artist_id=self.artist.id)
        self.session.add(order);self.session.commit()
        invoice=MilestoneInvoice(title='Deposit',amount=100,order_id=order.id)
        self.session.add(invoice);self.session.commit()
        invoice_id=invoice.id
        previous=os.getcwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary);Path('uploads/slips').mkdir(parents=True)
                old=Path(f'uploads/slips/slip_{invoice_id}_previous.png');old.write_bytes(b'previous proof')
                with patch.object(self.session,'commit',side_effect=RuntimeError('simulated database failure')):
                    with self.assertRaises(RuntimeError):
                        pay_invoice(invoice_id,BackgroundTasks(),UploadFile(filename='valid.png',file=io.BytesIO(valid_png_bytes())),self.session,self.client)
                self.assertEqual(old.read_bytes(),b'previous proof')
                self.assertEqual(len(list(Path('uploads/slips').iterdir())),1)
            finally:os.chdir(previous)

    def test_valid_slip_replacement_removes_only_its_previous_proof(self):
        import io
        from fastapi import BackgroundTasks,UploadFile
        from api.routers.orders import pay_invoice
        order=Order(title='Payment',description='Fixture',client_id=self.client.id,artist_id=self.artist.id)
        self.session.add(order);self.session.commit()
        invoice=MilestoneInvoice(title='Deposit',amount=100,order_id=order.id)
        self.session.add(invoice);self.session.commit()
        previous=os.getcwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary);Path('uploads/slips').mkdir(parents=True)
                old=Path(f'uploads/slips/slip_{invoice.id}_previous.png');old.write_bytes(b'previous proof')
                unrelated=Path('uploads/slips/slip_999_unrelated.png');unrelated.write_bytes(b'other invoice')
                content=valid_png_bytes()
                result=pay_invoice(invoice.id,BackgroundTasks(),UploadFile(filename='valid.png',file=io.BytesIO(content)),self.session,self.client)
                self.assertFalse(old.exists())
                self.assertTrue(unrelated.exists())
                saved=list(Path('uploads/slips').glob(f'slip_{invoice.id}_*'))
                self.assertEqual(len(saved),1);self.assertEqual(saved[0].read_bytes(),content)
                self.assertFalse(result.is_paid)
            finally:os.chdir(previous)

    def test_final_preview_unlocks_after_full_payment_without_mutating_wip(self):
        from api.routers.orders import get_order_files
        order=Order(title='Delivery',description='Fixture',client_id=self.client.id,artist_id=self.artist.id,agreed_price=100)
        self.session.add(order);self.session.commit()
        final=File(order_id=order.id,filename='final.png',s3_key='final.png',file_type='FINAL',is_watermarked=True)
        wip=File(order_id=order.id,filename='wip.png',s3_key='wip.png',file_type='WIP',is_watermarked=True)
        invoice=MilestoneInvoice(title='Final',amount=100,order_id=order.id,is_paid=False)
        self.session.add_all([final,wip,invoice]);self.session.commit()
        self.assertTrue(all(item['is_watermarked'] for item in get_order_files(order.id,self.session,self.client)))
        invoice.is_paid=True;self.session.add(invoice);self.session.commit()
        result={item['file_type']:item for item in get_order_files(order.id,self.session,self.client)}
        self.assertFalse(result['FINAL']['is_watermarked'])
        self.assertTrue(result['WIP']['is_watermarked'])
        self.session.refresh(final);self.assertTrue(final.is_watermarked)

    def test_completed_auction_delivery_keeps_collection_identity(self):
        from datetime import timedelta
        from models import Auction,AuctionType
        from api.routers.auth import get_my_collection
        auction=Auction(title='Won slot',description='Fixture',artist_id=self.profile.id,auction_type=AuctionType.COMMISSION_SLOT,
            starting_bid=100,bid_increment=10,start_time=utcnow()-timedelta(hours=1),end_time=utcnow(),winner_id=self.client.id)
        self.session.add(auction);self.session.commit()
        order=Order(title='Won slot delivery',description='Fixture',client_id=self.client.id,artist_id=self.artist.id,auction_id=auction.id,status=OrderStatus.COMPLETED)
        self.session.add(order);self.session.commit()
        self.session.add(File(order_id=order.id,filename='final.png',s3_key='final.png',file_type='FINAL',is_watermarked=False));self.session.commit()
        collection=get_my_collection(self.session,self.client)
        self.assertEqual(len(collection),1)
        self.assertEqual(collection[0]['type'],'Auction')
        self.assertEqual(collection[0]['order_id'],order.id)
        self.assertEqual(collection[0]['artist_name'],'Artist')

if __name__=='__main__':unittest.main()
