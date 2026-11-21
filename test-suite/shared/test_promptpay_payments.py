"""Isolated payment, ledger and settlement regressions; no bank traffic."""
import binascii
import hashlib
import io
import json
import os
import tempfile
import unittest
import threading
import asyncio
import zxingcpp
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import event
from api.routers.payments import router as payment_router
from api.routers.orders import router as order_router
from core.auth import create_access_token
from core.db import get_session
from models import User, ArtistProfile, Order, OrderStatus, MilestoneInvoice
from models import ArtistService, Auction, AuctionType, Bid, SystemSetting
from models.commission import CommissionRequest
from models.payment import PaymentInstruction, CollectionReceipt, ArtistPayout, PayoutItem
from services.promptpay import normalize_mobile, build_payload, to_satang, order_fee
from services.promptpay import qr_png, mobile_from_payload
from services.commission_service import accept_commission_request
from services.auction_service import check_and_close_auction, finalize_auto_buy
from services.payment_service import SETTINGS_KEY
from datetime import datetime,timedelta
from core.migrations import run_lightweight_migrations
from sqlalchemy import text
from pypdf import PdfWriter


class PromptPayTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.previous = Path.cwd()
        os.chdir(self.temp.name)
        self.engine = create_engine('sqlite:///'+str(Path(self.temp.name)/'payments.db'), connect_args={'check_same_thread':False, 'timeout':10})
        @event.listens_for(self.engine, 'connect')
        def fk(connection, record): connection.execute('PRAGMA foreign_keys=ON')
        SQLModel.metadata.create_all(self.engine)
        self.db_patch = patch('core.db.engine', self.engine)
        self.db_patch.start()
        with Session(self.engine) as session:
            users = [User(email=f'{r}@payment.test', full_name=r, hashed_password='unused', is_artist=r in ('artist','otherartist'), is_admin=r=='admin') for r in ('admin','artist','client','otherartist','otherclient')]
            session.add_all(users);session.commit()
            self.ids = {u.full_name:u.id for u in users}
            profile=ArtistProfile(user_id=self.ids['artist'],handle='payment_qa',display_name='QA',tagline='',bio='')
            session.add(profile);session.commit();self.profile_id=profile.id
            order=Order(title='Payment QA',description='Disposable',artist_id=self.ids['artist'],client_id=self.ids['client'],status=OrderStatus.ACCEPTED,agreed_price=1000,platform_fee_bps_snapshot=500)
            session.add(order);session.commit();self.order_id=order.id
            invoice=MilestoneInvoice(order_id=order.id,title='Payment',amount=1000)
            session.add(invoice);session.commit();self.invoice_id=invoice.id
        app=FastAPI();app.include_router(payment_router);app.include_router(order_router)
        def sessions():
            with Session(self.engine) as session: yield session
        app.dependency_overrides[get_session]=sessions
        self.client=TestClient(app)
        self.headers={r:{'Authorization':'Bearer '+create_access_token({'sub':f'{r}@payment.test'})} for r in self.ids}
        output=io.BytesIO();Image.new('RGB',(8,8),'white').save(output,format='PNG');self.png=output.getvalue()

    def tearDown(self):
        self.client.close();self.db_patch.stop();self.engine.dispose();os.chdir(self.previous);self.temp.cleanup()

    def request(self, method, path, role='admin', **kwargs):
        return self.client.request(method,path,headers=self.headers[role],**kwargs)

    def config(self, **overrides):
        current=self.request('GET','/api/payments/settings').json()
        data=dict(enabled=True,recipient_name='Disposable QA recipient',mobile_number='0800000000',fee_bps=500,version=current['version']);data.update(overrides)
        return self.request('PUT','/api/payments/settings',json=data)

    def instruction(self):
        return self.request('POST',f'/api/payments/invoices/{self.invoice_id}/instruction','client')

    def pay(self):
        return self.request('POST',f'/api/invoices/{self.invoice_id}/pay','client',files={'slip':('qa.png',self.png,'image/png')})

    def approve(self,role='artist'):
        return self.request('POST',f'/api/invoices/{self.invoice_id}/approve',role)

    def add_final_file(self, order_id=None, file_type='FINAL'):
        response = self.request('POST', f'/api/orders/{order_id or self.order_id}/files', 'artist',
                                data={'file_type': file_type}, files={'file': ('art.png', self.png, 'image/png')})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def ready(self):
        self.assertEqual(self.config().status_code,200);self.assertEqual(self.instruction().status_code,200)
        self.assertEqual(self.pay().status_code,200);self.assertEqual(self.approve().status_code,200)
        self.add_final_file()
        self.assertEqual(self.request('PATCH',f'/api/orders/{self.order_id}',json={'status':'COMPLETED'}).status_code,200)

    def quote(self):
        return self.request('POST','/api/payments/payouts/quote',json={'artist_id':self.ids['artist'],'order_ids':[self.order_id]})

    def payout(self, quote=None, key='test-idempotency-key-0001', **changes):
        quote=quote or self.quote().json()
        data={'selection':json.dumps({'artist_id':self.ids['artist'],'order_ids':[self.order_id]}), 'quote_digest':quote['quote_digest'],'transfer_reference':'QA-NO-REAL-TRANSFER','idempotency_key':key};data.update(changes)
        return self.request('POST','/api/payments/payouts',data=data,files={'proof':('qa.png',self.png,'image/png')})

    def test_mobile_normalization_and_rejection(self):
        for value in ('080-000-0000','+66800000000','0066800000000','(080) 000 0000'):
            self.assertEqual(normalize_mobile(value),'0800000000')
        for value in ('1234567890123','021234567','08123456789','abc0800000000',''):
            with self.assertRaises(ValueError):normalize_mobile(value)

    def test_decimal_half_up_amounts_and_per_order_rounding(self):
        self.assertEqual(to_satang('1.005'),101)
        self.assertEqual(order_fee(101,500),5)
        self.assertEqual(order_fee(10,500),1)
        self.assertEqual(sum(order_fee(10,500) for _ in range(2)),2)
        self.assertEqual(order_fee(100000,500),5000)

    def test_payload_fields_checksum_and_png_download(self):
        self.config();self.instruction()
        with Session(self.engine) as session:payload=session.exec(select(PaymentInstruction)).one().payload
        fields={};offset=0
        while offset<len(payload):
            tag=payload[offset:offset+2];length=int(payload[offset+2:offset+4]);fields[tag]=payload[offset+4:offset+4+length];offset+=4+length
        self.assertEqual(fields['29'],'0016A00000067701011101130066800000000')
        self.assertEqual((fields['53'],fields['54'],fields['58']),('764','1000.00','TH'))
        crc=0xFFFF
        for byte in payload[:-4].encode():
            crc^=byte<<8
            for _ in range(8):crc=((crc<<1)^0x1021 if crc&0x8000 else crc<<1)&0xFFFF
        self.assertEqual(fields['63'],f'{crc:04X}')
        response=self.request('GET',f'/api/payments/invoices/{self.invoice_id}/qr','client')
        self.assertEqual(response.status_code,200);self.assertIn('DICE-invoice-',response.headers['content-disposition'])
        with Image.open(io.BytesIO(response.content)) as image:self.assertEqual(image.format,'PNG');image.verify()

    def test_unconfigured_is_explanatory_and_does_not_create_instruction(self):
        response=self.instruction();self.assertEqual(response.status_code,409);self.assertIn('not configured',response.json()['detail'])
        with Session(self.engine) as session:self.assertEqual(session.exec(select(PaymentInstruction)).all(),[])

    def test_settings_validation_and_stale_settings(self):
        self.assertEqual(self.config(mobile_number='1234567890123').status_code,422)
        self.assertEqual(self.config(fee_bps=-1).status_code,422)
        self.assertEqual(self.config(fee_bps=10001).status_code,422)
        self.assertEqual(self.config(recipient_name=' ').status_code,422)
        self.assertEqual(self.config().status_code,200)
        self.assertEqual(self.config(version=0).status_code,409)

    def test_instruction_is_reused_and_frozen_after_settings_change(self):
        self.config();original=self.instruction().json();self.config(mobile_number='0900000000',recipient_name='Changed')
        self.assertEqual(self.instruction().json(),original)
        with Session(self.engine) as session:self.assertEqual(len(session.exec(select(PaymentInstruction)).all()),1)

    def test_qr_get_is_read_only_and_requires_prior_post(self):
        self.config()
        self.assertEqual(self.request('GET',f'/api/payments/invoices/{self.invoice_id}/qr','client').status_code,404)
        with Session(self.engine) as session:self.assertEqual(session.exec(select(PaymentInstruction)).all(),[])

    def test_generated_qr_is_independently_decodable(self):
        payload=build_payload('0800000000',12345)
        results=zxingcpp.read_barcodes(Image.open(io.BytesIO(qr_png(payload))))
        self.assertEqual(len(results),1);self.assertEqual(results[0].text,payload)

    def test_high_value_auction_amount_remains_supported(self):
        payload=build_payload('0800000000',5_000_000_000)
        self.assertIn('541150000000.00',payload)
        self.assertEqual(mobile_from_payload(payload),'0800000000')

    def test_fee_snapshot_on_accepted_commission_and_manual_ticket(self):
        self.config(fee_bps=725)
        response=self.request('POST','/api/orders','artist',json={'title':'Manual','description':'Test','artist_id':self.profile_id,'client_email':'client@payment.test'})
        self.assertEqual(response.json()['platform_fee_bps_snapshot'],725)
        with Session(self.engine) as session:
            service=ArtistService(artist_id=self.profile_id,title='Fee QA',category='Art',description='',base_price=1000)
            session.add(service);session.commit()
            proposal=CommissionRequest(service_id=service.id,client_id=self.ids['client'],artist_user_id=self.ids['artist'],character_name='Fee QA',brief='Test',total_price=1000,base_price_snapshot=1000)
            session.add(proposal);session.commit()
            order=accept_commission_request(session,proposal.id,self.ids['artist'])
            self.assertEqual(order.platform_fee_bps_snapshot,725)

    def auction_fixture(self,session):
        auction=Auction(title='Fee QA',description='Disposable',artist_id=self.profile_id,auction_type=AuctionType.ADOPTABLE,starting_bid=100,bid_increment=1,auto_buy=200,start_time=datetime.utcnow()-timedelta(days=2),end_time=datetime.utcnow()-timedelta(days=1))
        session.add(auction);session.commit();return auction

    def test_fee_snapshot_on_auction_expiry(self):
        self.config(fee_bps=725)
        with Session(self.engine) as session:
            auction=self.auction_fixture(session);session.add(Bid(auction_id=auction.id,bidder_id=self.ids['client'],amount=100));session.commit()
            self.assertTrue(asyncio.run(check_and_close_auction(auction,session)))
            order=session.exec(select(Order).where(Order.auction_id==auction.id)).one()
            self.assertEqual(order.platform_fee_bps_snapshot,725)

    def test_fee_snapshot_on_auction_auto_buy(self):
        self.config(fee_bps=725)
        with Session(self.engine) as session:
            auction=self.auction_fixture(session)
            self.assertTrue(asyncio.run(finalize_auto_buy(auction,self.ids['client'],200,session)))
            order=session.exec(select(Order).where(Order.auction_id==auction.id)).one()
            self.assertEqual(order.platform_fee_bps_snapshot,725)

    def test_legacy_database_migration_sets_zero_fee_without_receipts(self):
        legacy=create_engine('sqlite://')
        with legacy.begin() as connection:
            connection.execute(text('CREATE TABLE "order" (id INTEGER PRIMARY KEY, title TEXT)'))
            connection.execute(text('INSERT INTO "order" (id,title) VALUES (1,\'Legacy\')'))
            connection.execute(text('CREATE TABLE milestoneinvoice (id INTEGER PRIMARY KEY, is_paid BOOLEAN)'))
            connection.execute(text('INSERT INTO milestoneinvoice (id,is_paid) VALUES (1,1)'))
        run_lightweight_migrations(legacy);run_lightweight_migrations(legacy)
        with legacy.connect() as connection:
            self.assertEqual(connection.execute(text('SELECT platform_fee_bps_snapshot FROM "order"')).scalar(),0)
            self.assertIsNone(connection.execute(text('SELECT approved_by FROM milestoneinvoice')).scalar())
            self.assertNotIn('collectionreceipt',connection.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).scalars().all())
        legacy.dispose()

    def test_mixed_historical_and_platform_receipts_settle_only_recorded_gross(self):
        # Existing zero-fee order with a historical paid deposit.
        with Session(self.engine) as session:
            order=session.get(Order,self.order_id);order.platform_fee_bps_snapshot=0;session.add(order)
            invoice=session.get(MilestoneInvoice,self.invoice_id);invoice.amount=500;session.add(invoice)
            session.add(MilestoneInvoice(order_id=order.id,title='Historical paid deposit',amount=500,is_paid=True));session.commit()
        self.ready();quote=self.quote().json()
        self.assertEqual([quote[key] for key in ('gross_satang','fee_satang','net_satang')],[50000,0,50000])
        self.assertEqual(self.payout(quote).status_code,200)
        ledger=self.request('GET','/api/payments/ledger','artist').json()
        self.assertEqual(ledger['approved_invoice_gross_satang'],100000)
        self.assertEqual(ledger['platform_collections_satang'],50000)

    def test_pdf_payout_proof_has_protected_content_type_and_original_bytes(self):
        self.ready();quote=self.quote().json()
        output=io.BytesIO();writer=PdfWriter();writer.add_blank_page(width=72,height=72);writer.write(output);pdf=output.getvalue()
        data={'selection':json.dumps({'artist_id':self.ids['artist'],'order_ids':[self.order_id]}),'quote_digest':quote['quote_digest'],'transfer_reference':'QA-PDF','idempotency_key':'test-pdf-payout-0001'}
        response=self.request('POST','/api/payments/payouts',data=data,files={'proof':('qa.pdf',pdf,'application/pdf')})
        self.assertEqual(response.status_code,200,response.text)
        downloaded=self.request('GET',response.json()['proof_url'],'artist')
        self.assertEqual(downloaded.headers['content-type'],'application/pdf');self.assertEqual(downloaded.content,pdf)

    def test_invalid_payout_proof_creates_no_batch_or_orphan(self):
        self.ready();quote=self.quote().json()
        data={'selection':json.dumps({'artist_id':self.ids['artist'],'order_ids':[self.order_id]}),'quote_digest':quote['quote_digest'],'transfer_reference':'QA-BAD','idempotency_key':'test-bad-payout-0001'}
        response=self.request('POST','/api/payments/payouts',data=data,files={'proof':('fake.pdf',b'PK\x03\x04bad','application/pdf')})
        self.assertEqual(response.status_code,400)
        self.assertEqual(list(Path('uploads/payouts').glob('*')),[])
        with Session(self.engine) as session:self.assertEqual(session.exec(select(ArtistPayout)).all(),[])

    def test_supplied_qr_import_reads_recipient_without_saving_settings(self):
        response=self.request('POST','/api/payments/settings/import-qr',files={'qr':('qa.png',qr_png(build_payload('0800000000',12345)),'image/png')})
        self.assertEqual(response.status_code,200,response.text);self.assertEqual(response.json(),{'mobile_number':'0800000000','saved':False})
        self.assertEqual(self.request('GET','/api/payments/settings').json()['version'],0)

    def test_supplied_qr_import_rejects_corruption_non_promptpay_and_unauthorized(self):
        for content in (self.png,b'not an image',qr_png('https://example.test')):
            self.assertEqual(self.request('POST','/api/payments/settings/import-qr',files={'qr':('qa.png',content,'image/png')}).status_code,422)
        self.assertEqual(self.request('POST','/api/payments/settings/import-qr','artist',files={'qr':('qa.png',self.png,'image/png')}).status_code,403)
        broken=build_payload('0800000000',100)[:-4]+'0000'
        with self.assertRaises(ValueError):mobile_from_payload(broken)

    def test_invalid_and_oversized_replacement_preserve_current_slip(self):
        self.config();self.instruction();self.pay()
        before=list(Path('uploads/slips').glob('*'));original=before[0].read_bytes()
        for name,content in [('fake.pdf',b'PK\x03\x04bad'),('large.pdf',b'%PDF-'+b'0'*(15*1024*1024)+b'%%EOF')]:
            response=self.request('POST',f'/api/invoices/{self.invoice_id}/pay','client',files={'slip':(name,content,'application/pdf')})
            self.assertIn(response.status_code,(400,413))
        self.assertEqual(list(Path('uploads/slips').glob('*')),before);self.assertEqual(before[0].read_bytes(),original)

    def test_two_approvers_create_only_one_receipt(self):
        self.config();self.instruction();self.pay();barrier=threading.Barrier(2)
        def approve(role):barrier.wait(timeout=5);return self.approve(role).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(approve,['admin','artist']))
        self.assertEqual(results,[200,200])
        with Session(self.engine) as session:self.assertEqual(len(session.exec(select(CollectionReceipt)).all()),1)

    def test_two_payout_writes_settle_whole_order_once(self):
        self.ready();quote=self.quote().json();barrier=threading.Barrier(2)
        def settle(key):barrier.wait(timeout=5);return self.payout(quote,key=key).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(settle,['concurrent-payout-key-A','concurrent-payout-key-B']))
        self.assertEqual(sorted(results),[200,409])
        with Session(self.engine) as session:self.assertEqual(len(session.exec(select(PayoutItem)).all()),1);self.assertEqual(len(session.exec(select(ArtistPayout)).all()),1)
        self.assertEqual(len(list(Path('uploads/payouts').glob('*'))),1)

    def test_settings_and_payouts_are_admin_only(self):
        for role in ('client','artist','otherartist'):
            self.assertEqual(self.request('GET','/api/payments/settings',role).status_code,403)
            self.assertEqual(self.request('POST','/api/payments/payouts/quote',role,json={'artist_id':self.ids['artist'],'order_ids':[self.order_id]}).status_code,403)

    def test_other_users_cannot_read_instruction_qr_receipt_or_approve(self):
        self.config();self.instruction()
        for role in ('otherclient','otherartist'):
            for method,suffix in [('POST','instruction'),('GET','qr'),('GET','receipt')]:
                self.assertEqual(self.request(method,f'/api/payments/invoices/{self.invoice_id}/{suffix}',role).status_code,403)
            self.assertEqual(self.approve(role).status_code,403)

    def test_scanning_and_upload_never_mark_paid(self):
        self.config();self.instruction();self.request('GET',f'/api/payments/invoices/{self.invoice_id}/qr','client');self.pay()
        with Session(self.engine) as session:
            self.assertFalse(session.get(MilestoneInvoice,self.invoice_id).is_paid)
            self.assertEqual(session.exec(select(CollectionReceipt)).all(),[])

    def test_disguised_zip_cannot_be_uploaded_as_pdf_payment_proof(self):
        response=self.request('POST',f'/api/invoices/{self.invoice_id}/pay','client',files={'slip':('fake.pdf',b'PK\x03\x04'+b'not a payment proof'*10,'application/pdf')})
        self.assertEqual(response.status_code,400,response.text)

    def test_corrupt_pdf_with_valid_header_and_trailer_is_rejected(self):
        response=self.request('POST',f'/api/invoices/{self.invoice_id}/pay','client',files={'slip':('fake.pdf',b'%PDF-1.4\nnot a PDF document\n%%EOF\n','application/pdf')})
        self.assertEqual(response.status_code,400,response.text)

    def test_password_protected_pdf_cannot_be_submitted_for_manual_review(self):
        output=io.BytesIO();writer=PdfWriter();writer.add_blank_page(width=72,height=72);writer.encrypt('QA-test-only');writer.write(output)
        response=self.request('POST',f'/api/invoices/{self.invoice_id}/pay','client',files={'slip':('encrypted.pdf',output.getvalue(),'application/pdf')})
        self.assertEqual(response.status_code,400)

    def test_promptpay_approval_requires_real_submitted_proof(self):
        self.config();self.instruction();self.assertEqual(self.approve().status_code,409)

    def test_approval_records_actor_time_receipt_once(self):
        self.config();self.instruction();self.pay();self.assertEqual(self.approve().status_code,200);self.assertEqual(self.approve('admin').status_code,200)
        with Session(self.engine) as session:
            receipt=session.exec(select(CollectionReceipt)).one();invoice=session.get(MilestoneInvoice,self.invoice_id)
            self.assertEqual(receipt.amount_satang,100000);self.assertEqual(receipt.approved_by,self.ids['artist'])
            self.assertEqual(receipt.approved_at,invoice.approved_at);self.assertTrue(invoice.is_paid)

    def test_receipt_failure_rolls_back_invoice_approval(self):
        self.config();self.instruction();self.pay()
        original=Session.flush
        def failure(session,*args,**kwargs):
            if any(isinstance(x,CollectionReceipt) for x in session.new):raise RuntimeError('designated receipt fault')
            return original(session,*args,**kwargs)
        with patch.object(Session,'flush',failure),self.assertRaises(RuntimeError):self.approve()
        with Session(self.engine) as session:self.assertFalse(session.get(MilestoneInvoice,self.invoice_id).is_paid)

    def test_legacy_approval_does_not_fabricate_platform_receipt(self):
        self.assertEqual(self.approve().status_code,200)
        with Session(self.engine) as session:self.assertEqual(session.exec(select(CollectionReceipt)).all(),[])
        self.assertEqual(self.request('GET','/api/payments/ledger','artist').json()['platform_collections_satang'],0)

    def test_existing_slip_cannot_be_relabelled_as_platform_collection(self):
        self.config();self.pay();self.assertEqual(self.instruction().status_code,409)

    def test_paid_and_cancelled_invoices_cannot_issue_qr_or_accept_proof(self):
        self.config();self.instruction()
        self.request('PATCH',f'/api/orders/{self.order_id}',json={'status':'CANCELLED'})
        self.assertEqual(self.instruction().status_code,409)
        self.assertEqual(self.request('GET',f'/api/payments/invoices/{self.invoice_id}/qr','client').status_code,409)
        self.assertEqual(self.pay().status_code,409);self.assertEqual(self.approve().status_code,409)

    def test_payout_eligibility_requires_completed_and_fully_paid(self):
        self.config();self.instruction();self.pay();self.approve();self.assertEqual(self.quote().status_code,409)
        self.add_final_file(file_type='WIP')
        self.add_final_file(file_type='REFERENCE')
        path = f'/api/orders/{self.order_id}'
        self.assertEqual(self.request('PATCH', path, json={'status':'COMPLETED'}).status_code, 400)
        final = self.add_final_file()
        self.assertEqual(self.request('PATCH', path, json={'status':'COMPLETED'}).status_code, 200)
        self.assertEqual(self.quote().status_code,200)
        self.assertEqual(self.request('DELETE', f"{path}/files/{final['id']}", 'artist').status_code, 409)
        ack = path + '/acknowledge-receipt'
        self.assertEqual(self.request('POST', ack, 'artist').status_code, 403)
        self.assertEqual(self.request('POST', ack, 'otherclient').status_code, 403)
        first = self.request('POST', ack, 'client')
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(self.request('POST', ack, 'client').json(), first.json())

    def test_exact_payout_totals_and_immutable_settlement(self):
        self.ready();quote=self.quote().json();self.assertEqual([quote[x] for x in ('gross_satang','fee_satang','net_satang')],[100000,5000,95000])
        response=self.payout(quote);self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(self.request('PATCH',f'/api/orders/{self.order_id}',json={'status':'CANCELLED'}).status_code,409)
        self.assertEqual(self.request('PATCH',f'/api/orders/{self.order_id}',json={'agreed_price':1200}).status_code,409)
        self.assertEqual(self.quote().status_code,409)

    def test_auctioned_commission_completion_requires_existing_final_and_is_serialized_with_deletion(self):
        self.config()
        with Session(self.engine) as session:
            auction = self.auction_fixture(session)
            auction.auction_type = AuctionType.COMMISSION_SLOT
            self.assertTrue(asyncio.run(finalize_auto_buy(auction, self.ids['client'], 200, session)))
            self.order_id = session.exec(select(Order.id).where(Order.auction_id == auction.id)).one()
            self.invoice_id = session.exec(select(MilestoneInvoice.id).where(MilestoneInvoice.order_id == self.order_id)).one()
        self.instruction(); self.pay(); self.approve()
        order_path = f'/api/orders/{self.order_id}'
        final = self.add_final_file()
        Path('uploads/originals', final['s3_key']).unlink()
        self.assertEqual(self.request('PATCH', order_path, json={'status': 'COMPLETED'}).status_code, 400)
        self.assertEqual(self.request('POST', order_path + '/acknowledge-receipt', 'client').status_code, 409)
        final = self.add_final_file()
        with ThreadPoolExecutor(max_workers=2) as pool:
            complete = pool.submit(self.request, 'PATCH', order_path, json={'status': 'COMPLETED'})
            delete = pool.submit(self.request, 'DELETE', f"{order_path}/files/{final['id']}", 'artist')
            self.assertIn((complete.result().status_code, delete.result().status_code), [(200, 409), (400, 200)])

    def test_duplicate_payout_replay_creates_one_batch_item_and_proof(self):
        self.ready();quote=self.quote().json();first=self.payout(quote);second=self.payout(quote)
        self.assertEqual(first.status_code,200,first.text);self.assertEqual(second.json()['id'],first.json()['id'])
        with Session(self.engine) as session:self.assertEqual(len(session.exec(select(PayoutItem)).all()),1)
        self.assertEqual(len(list(Path('uploads/payouts').glob('*'))),1)

    def test_changed_replay_payload_and_second_key_are_rejected(self):
        self.ready();quote=self.quote().json();self.payout(quote)
        self.assertEqual(self.payout(quote,transfer_reference='Different').status_code,409)
        self.assertEqual(self.payout(quote,key='different-idempotency-key').status_code,409)
        self.assertEqual(len(list(Path('uploads/payouts').glob('*'))),1)

    def test_payout_failure_rolls_back_and_removes_unrecorded_proof(self):
        self.ready();quote=self.quote().json();original=Session.flush
        def failure(session,*args,**kwargs):
            if any(isinstance(x,PayoutItem) for x in session.new):raise RuntimeError('designated settlement fault')
            return original(session,*args,**kwargs)
        with patch.object(Session,'flush',failure),self.assertRaises(RuntimeError):self.payout(quote)
        with Session(self.engine) as session:self.assertEqual(session.exec(select(ArtistPayout)).all(),[])
        self.assertEqual(list(Path('uploads/payouts').glob('*')),[])

    def test_stale_quote_empty_selection_and_wrong_artist_reject(self):
        self.ready();quote=self.quote().json()
        with Session(self.engine) as session:
            order=session.get(Order,self.order_id);order.platform_fee_bps_snapshot=600;session.add(order);session.commit()
        self.assertEqual(self.payout(quote).status_code,409)
        self.assertEqual(self.request('POST','/api/payments/payouts/quote',json={'artist_id':self.ids['artist'],'order_ids':[]}).status_code,422)
        self.assertEqual(self.request('POST','/api/payments/payouts/quote',json={'artist_id':self.ids['otherartist'],'order_ids':[self.order_id]}).status_code,409)

    def test_artist_ledger_and_payout_proof_are_scoped(self):
        self.ready();payout=self.payout().json()
        self.assertEqual(self.request('GET',payout['proof_url'],'artist').status_code,200)
        self.assertEqual(self.request('GET',payout['proof_url'],'otherartist').status_code,403)
        self.assertEqual(self.request('GET',payout['proof_url'],'client').status_code,403)
        other=self.request('GET','/api/payments/ledger','otherartist').json()
        self.assertEqual(other['orders'],[]);self.assertEqual(other['payouts'],[])

    def test_cancelled_receipts_visible_but_not_payout_eligible(self):
        self.config();self.instruction();self.pay();self.approve();self.request('PATCH',f'/api/orders/{self.order_id}',json={'status':'CANCELLED'})
        ledger=self.request('GET','/api/payments/ledger','artist').json()
        self.assertEqual(ledger['orders'][0]['status'],'CANCELLED_MANUAL_RESOLUTION');self.assertEqual(ledger['platform_collections_satang'],100000);self.assertEqual(ledger['eligible_net_satang'],0)

    def test_zero_net_order_has_no_payout_due(self):
        self.ready()
        with Session(self.engine) as session:
            order=session.get(Order,self.order_id);order.platform_fee_bps_snapshot=10000;session.add(order);session.commit()
        ledger=self.request('GET','/api/payments/ledger','artist').json()
        self.assertEqual(ledger['orders'][0]['status'],'NO_PAYOUT_DUE');self.assertEqual(self.quote().status_code,409)

    def test_new_direct_orders_freeze_configured_fee_and_old_default_is_zero(self):
        self.config(fee_bps=725)
        response=self.request('POST','/api/orders','client',json={'title':'New','description':'New request','artist_id':self.profile_id})
        self.assertEqual(response.status_code,200,response.text);self.assertEqual(response.json()['platform_fee_bps_snapshot'],725)
        self.config(fee_bps=1000)
        self.assertEqual(self.request('GET',f"/api/orders/{response.json()['id']}",'client').json()['platform_fee_bps_snapshot'],725)
        self.assertEqual(Order(title='Legacy',description='',client_id=1,artist_id=2).platform_fee_bps_snapshot,0)


if __name__=='__main__':unittest.main()
