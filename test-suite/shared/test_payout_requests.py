"""Disposable payout-request lifecycle, money, authorization and concurrency checks."""
import io
import unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from PIL import Image
from sqlmodel import Session, select
from sqlalchemy import event
import test_promptpay_payments as fixtures
from core.auth import create_access_token
from models import User, Order, OrderStatus, Notification, MilestoneInvoice
from models.payment import ArtistPayout, PayoutItem, CollectionReceipt
from models.payout_request import PayoutRequest, PayoutReservation, PayoutRequestEvent
from services.promptpay import qr_png, build_payload, mobile_from_payload
import zxingcpp


class PayoutRequestTests(unittest.TestCase):
    # Reuse disposable fixtures, without inheriting or duplicating the original tests.
    setUp = fixtures.PromptPayTests.setUp
    tearDown = fixtures.PromptPayTests.tearDown
    request = fixtures.PromptPayTests.request
    config = fixtures.PromptPayTests.config
    instruction = fixtures.PromptPayTests.instruction
    pay = fixtures.PromptPayTests.pay
    approve = fixtures.PromptPayTests.approve
    ready = fixtures.PromptPayTests.ready
    quote = fixtures.PromptPayTests.quote
    payout = fixtures.PromptPayTests.payout

    def profile(self, **changes):
        body = dict(account_holder_name='Disposable Artist', mobile_number='0800000000', version=0)
        body.update(changes)
        return self.request('PUT', '/api/payments/receiving-profile', 'artist', json=body)

    def preview(self, **changes):
        body = {'order_ids': [self.order_id]}; body.update(changes)
        return self.request('POST', '/api/payments/payout-requests/preview', 'artist', json=body)

    def submit(self, preview=None, key='artist-request-key-0001'):
        preview = preview or self.preview().json()
        return self.request('POST', '/api/payments/payout-requests', 'artist', json={
            'order_ids': [self.order_id], 'quote_digest': preview['quote_digest'],
            'profile_version': preview['profile_version'], 'idempotency_key': key})

    def prepared(self):
        self.ready(); self.assertEqual(self.profile().status_code, 200)
        result = self.submit(); self.assertEqual(result.status_code, 200, result.text)
        return result.json()

    def act(self, request, action, role='admin', **changes):
        body = {'version': request['version']}; body.update(changes)
        return self.request('POST', f"/api/payments/payout-requests/{request['id']}/actions/{action}", role, json=body)

    def transfer(self, request, role='admin', proof=None, **changes):
        body = {'version': request['version'], 'transfer_reference': 'QA-NO-REAL-TRANSFER'}; body.update(changes)
        return self.request('POST', f"/api/payments/payout-requests/{request['id']}/transfer", role,
                            data=body, files={'proof': proof or ('qa.png', self.png, 'image/png')})

    def get(self, request, role='artist'):
        return self.request('GET', f"/api/payments/payout-requests/{request['id']}", role)

    def test_full_lifecycle_exact_amounts_reservation_and_receipt(self):
        req = self.prepared()
        self.assertEqual((req['gross_satang'], req['fee_satang'], req['net_satang']), (100000, 5000, 95000))
        ledger = self.request('GET', '/api/payments/ledger', 'artist').json()
        self.assertEqual((ledger['eligible_net_satang'], ledger['requested_net_satang']), (0, 95000))
        self.assertEqual(ledger['orders'][0]['status'], 'PAYOUT_REQUESTED')
        req = self.act(req, 'claim').json()
        qr = self.request('GET', f"/api/payments/payout-requests/{req['id']}/qr")
        self.assertEqual(qr.status_code, 200)
        payload = zxingcpp.read_barcodes(Image.open(io.BytesIO(qr.content)))[0].text
        self.assertEqual(mobile_from_payload(payload), '0800000000'); self.assertIn('5406950.00', payload)
        result = self.transfer(req); self.assertEqual(result.status_code, 200, result.text)
        req = result.json(); self.assertEqual(req['status'], 'TRANSFER_RECORDED'); self.assertEqual(req['receipt_status'], 'PENDING')
        proof = self.request('GET', req['payout']['proof_url'], 'artist')
        self.assertEqual(proof.content, self.png)
        req = self.act(req, 'confirm', 'artist').json(); self.assertEqual(req['receipt_status'], 'CONFIRMED')
        with Session(self.engine) as session:
            self.assertEqual(len(session.exec(select(ArtistPayout)).all()), 1)
            self.assertEqual(len(session.exec(select(PayoutItem)).all()), 1)
            self.assertEqual(session.exec(select(PayoutReservation)).all(), [])
            self.assertEqual(len(session.exec(select(PayoutRequestEvent)).all()), 4)
        ledger = self.request('GET', '/api/payments/ledger', 'artist').json()
        self.assertEqual((ledger['eligible_net_satang'], ledger['requested_net_satang'], ledger['recorded_payout_net_satang']), (0, 0, 95000))

    def test_receiving_profile_validation_versions_and_private_reads(self):
        self.assertEqual(self.profile(mobile_number='1234567890123').status_code, 422)
        self.assertEqual(self.profile(account_holder_name=' ').status_code, 422)
        self.assertEqual(self.profile(mobile_number='+66800000000').json()['mobile_number'], '0800000000')
        self.assertEqual(self.profile().status_code, 409)
        self.assertEqual(self.profile(version=1, mobile_number='0900000000').json()['version'], 2)
        self.assertIsNone(self.request('GET', '/api/payments/receiving-profile', 'otherartist').json())
        self.assertEqual(self.request('GET', '/api/payments/receiving-profile', 'client').status_code, 403)

    def test_optional_qr_import_neither_saves_nor_verifies_ownership(self):
        image = qr_png(build_payload('0800000000', 100))
        result = self.request('POST', '/api/payments/receiving-profile/import-qr', 'artist', files={'qr': ('qr.png', image, 'image/png')})
        self.assertEqual(result.json(), {'mobile_number': '0800000000', 'saved': False})
        self.assertIsNone(self.request('GET', '/api/payments/receiving-profile', 'artist').json())
        self.assertEqual(self.request('POST', '/api/payments/receiving-profile/import-qr', 'artist', files={'qr': ('bad.png', b'bad', 'image/png')}).status_code, 422)

    def test_missing_profile_and_whole_order_validation(self):
        self.ready(); self.assertEqual(self.preview().status_code, 409)
        self.profile()
        for orders in ([], [self.order_id, self.order_id], [0], [True], ['1'], [9999]):
            self.assertIn(self.preview(order_ids=orders).status_code, (404, 422))
        self.assertEqual(self.request('POST', '/api/payments/payout-requests/preview', 'otherartist', json={'order_ids':[self.order_id]}).status_code, 409)

    def test_eligibility_excludes_unpaid_cancelled_uncollected_and_zero_net(self):
        self.profile(); self.assertEqual(self.preview().status_code, 409)
        self.ready()
        with Session(self.engine) as session:
            order = session.get(Order, self.order_id); order.platform_fee_bps_snapshot = 10000; session.add(order); session.commit()
        self.assertEqual(self.preview().status_code, 409)
        with Session(self.engine) as session:
            order = session.get(Order, self.order_id); order.platform_fee_bps_snapshot = 500; order.status = OrderStatus.CANCELLED; session.add(order); session.commit()
        self.assertEqual(self.preview().status_code, 409)
        with Session(self.engine) as session:
            order = session.get(Order, self.order_id); order.status = OrderStatus.COMPLETED; session.add(order)
            receipt = session.exec(select(CollectionReceipt)).one(); session.delete(receipt); session.commit()
        self.assertEqual(self.preview().status_code, 409)

    def test_preview_stale_profile_and_stale_money_rejected(self):
        self.ready(); self.profile(); preview = self.preview().json()
        self.profile(version=1, mobile_number='0900000000')
        self.assertEqual(self.submit(preview).status_code, 409)
        preview = self.preview().json()
        with Session(self.engine) as session:
            order = session.get(Order, self.order_id); order.platform_fee_bps_snapshot = 0; session.add(order); session.commit()
        self.assertEqual(self.submit(preview).status_code, 409)

    def test_frozen_recipient_survives_profile_edit_and_list_is_masked(self):
        req = self.prepared(); self.profile(version=1, mobile_number='0900000000', account_holder_name='Changed')
        detail = self.get(req).json(); self.assertEqual(detail['mobile_number'], '0800000000'); self.assertEqual(detail['account_holder_name'], 'Disposable Artist')
        row = self.request('GET', '/api/payments/payout-requests', 'artist').json()['items'][0]
        self.assertNotIn('mobile_number', row); self.assertEqual(row['mobile_masked'], '******0000')

    def test_repeated_submission_returns_same_request_without_notifications(self):
        self.ready(); self.profile(); quote = self.preview().json()
        first = self.submit(quote).json(); second = self.submit(quote).json(); self.assertEqual(first['id'], second['id'])
        with Session(self.engine) as session:
            self.assertEqual(len(session.exec(select(PayoutRequest)).all()), 1)
            self.assertEqual(len(session.exec(select(PayoutRequestEvent)).all()), 1)
            self.assertEqual(len(session.exec(select(Notification)).all()), 5)

    def test_concurrent_requests_reserve_once(self):
        self.ready(); self.profile(); quote = self.preview().json()
        with ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda n: self.submit(quote, f'concurrent-request-key-{n}').status_code, range(2)))
        self.assertEqual(sorted(results), [200, 409])
        with Session(self.engine) as session: self.assertEqual(len(session.exec(select(PayoutReservation)).all()), 1)

    def test_cancel_and_reject_release_then_can_resubmit(self):
        req = self.prepared(); result = self.act(req, 'cancel', 'artist')
        self.assertEqual(result.json()['status'], 'CANCELLED')
        req = self.submit(key='second-request-key-0001').json()
        self.assertEqual(self.act(req, 'reject').status_code, 422)
        result = self.act(req, 'reject', note='Disposable refusal'); self.assertEqual(result.json()['status'], 'REJECTED')
        self.assertEqual(self.preview().status_code, 200)
        self.assertEqual(self.get(req).json()['events'][-1]['note'], 'Disposable refusal')

    def test_legacy_payout_and_financial_edits_blocked_by_reservation(self):
        self.ready(); old_quote = self.quote().json(); self.profile(); self.submit()
        self.assertEqual(self.payout(old_quote).status_code, 409)
        self.assertEqual(self.quote().status_code, 409)
        self.assertEqual(self.request('PATCH', f'/api/orders/{self.order_id}', json={'agreed_price':2000}).status_code, 409)
        self.assertEqual(self.request('PATCH', f'/api/orders/{self.order_id}', json={'status':'CANCELLED'}).status_code, 409)
        self.assertEqual(self.request('POST', f'/api/orders/{self.order_id}/invoices', json={'title':'extra','amount':1}).status_code, 409)

    def second_admin(self):
        with Session(self.engine) as session:
            session.add(User(email='admin2@payment.test', full_name='admin2', hashed_password='unused', is_admin=True)); session.commit()
        self.headers['admin2']={'Authorization':'Bearer '+create_access_token({'sub':'admin2@payment.test'})}

    def test_competing_claims_stale_versions_and_release_safeguards(self):
        req = self.prepared(); self.second_admin()
        with ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda role: self.act(req, 'claim', role), ('admin','admin2')))
        self.assertEqual(sorted(r.status_code for r in results), [200, 409])
        current = self.get(req).json()
        winner = 'admin' if results[0].status_code == 200 else 'admin2'; loser = 'admin2' if winner == 'admin' else 'admin'
        self.assertEqual(self.act(current, 'release', loser, note='No transfer', no_transfer_made=True).status_code, 409)
        self.assertEqual(self.act(current, 'release', winner, note='No transfer').status_code, 422)
        self.assertEqual(self.act(current, 'release', winner, no_transfer_made=True).status_code, 422)
        self.assertEqual(self.act(current, 'cancel', 'artist').status_code, 409)
        self.assertEqual(self.act(current, 'release', winner, note='No transfer', no_transfer_made=True).json()['status'], 'REQUESTED')

    def test_permission_boundaries_detail_qr_transfer_and_proof(self):
        req = self.prepared()
        for role in ('client','otherclient','otherartist'):
            self.assertEqual(self.get(req, role).status_code, 403)
            self.assertEqual(self.request('GET', f"/api/payments/payout-requests/{req['id']}/qr", role).status_code, 403)
        self.assertEqual(self.request('GET', '/api/payments/payout-requests', 'otherartist').json()['items'], [])
        self.assertEqual(self.act(req, 'claim', 'artist').status_code, 403)
        req = self.act(req, 'claim').json(); self.second_admin()
        self.assertEqual(self.transfer(req, 'admin2').status_code, 403)
        req = self.transfer(req).json()
        self.assertEqual(self.request('GET', req['payout']['proof_url'], 'otherartist').status_code, 403)
        self.assertEqual(self.act(req, 'confirm').status_code, 403)

    def test_invalid_and_oversized_proofs_leave_no_files_or_settlement(self):
        req = self.act(self.prepared(), 'claim').json()
        for proof in (('x.png', b'bad', 'image/png'), ('x.exe', self.png, 'image/png'), ('x.pdf', b'%PDF-bad', 'application/pdf'), ('x.png', b'x'*(15*1024*1024+1), 'image/png')):
            result = self.transfer(req, proof=proof); self.assertIn(result.status_code, (400, 413, 422), result.text)
        self.assertEqual(list(Path('uploads/payouts').glob('*')), [])
        self.assertEqual(self.get(req).json()['status'], 'PROCESSING')
        with Session(self.engine) as session: self.assertEqual(session.exec(select(ArtistPayout)).all(), [])

    def test_duplicate_and_competing_transfer_produce_one_settlement(self):
        req = self.act(self.prepared(), 'claim').json()
        with ThreadPoolExecutor(2) as pool: results = list(pool.map(lambda _: self.transfer(req), range(2)))
        self.assertEqual([r.status_code for r in results], [200, 200])
        self.assertEqual(results[0].json()['payout_id'], results[1].json()['payout_id'])
        self.assertEqual(self.transfer(req, transfer_reference='Changed').status_code, 409)
        self.assertEqual(len(list(Path('uploads/payouts').glob('*'))), 1)
        with Session(self.engine) as session:
            self.assertEqual(len(session.exec(select(PayoutItem)).all()), 1)
            self.assertEqual(len(session.exec(select(PayoutRequestEvent)).all()), 3)

    def test_failed_transfer_rolls_back_money_audit_notifications_and_file(self):
        req = self.act(self.prepared(), 'claim').json()
        with Session(self.engine) as session: notifications = len(session.exec(select(Notification)).all())
        def fail(session):
            if any(isinstance(row, ArtistPayout) for row in list(session.new) + list(session.identity_map.values())):
                raise RuntimeError('Injected commit failure')
        event.listen(Session, 'before_commit', fail)
        try:
            with self.assertRaisesRegex(RuntimeError, 'Injected'): self.transfer(req)
        finally: event.remove(Session, 'before_commit', fail)
        self.assertEqual(self.get(req).json()['status'], 'PROCESSING')
        self.assertEqual(list(Path('uploads/payouts').glob('*')), [])
        with Session(self.engine) as session:
            self.assertEqual(session.exec(select(ArtistPayout)).all(), [])
            self.assertEqual(len(session.exec(select(PayoutReservation)).all()), 1)
            self.assertEqual(len(session.exec(select(Notification)).all()), notifications)
            self.assertEqual(len(session.exec(select(PayoutRequestEvent)).all()), 2)

    def test_problem_resolution_and_confirmation_never_change_money(self):
        req = self.transfer(self.act(self.prepared(), 'claim').json()).json()
        self.assertEqual(self.act(req, 'problem', 'artist').status_code, 422)
        req = self.act(req, 'problem', 'artist', note='Not received yet').json()
        self.assertEqual(req['receipt_status'], 'ISSUE_REPORTED')
        req = self.act(req, 'note', note='Checked external reference with artist').json()
        req = self.act(req, 'confirm', 'artist').json(); self.assertEqual(req['receipt_status'], 'CONFIRMED')
        self.assertEqual(self.act(req, 'confirm', 'artist').status_code, 409)
        self.assertEqual(self.act(req, 'problem', 'artist', note='again').status_code, 409)
        self.assertEqual(self.get(req).json()['events'][-3]['note'], 'Not received yet')
        with Session(self.engine) as session: self.assertEqual(len(session.exec(select(ArtistPayout)).all()), 1)

    def test_changed_frozen_inputs_block_transfer_even_if_changed_outside_api(self):
        req = self.act(self.prepared(), 'claim').json()
        with Session(self.engine) as session:
            order = session.get(Order, self.order_id); order.platform_fee_bps_snapshot = 0; session.add(order); session.commit()
        self.assertEqual(self.transfer(req).status_code, 409)
        self.assertEqual(list(Path('uploads/payouts').glob('*')), [])

    def test_notifications_broadcast_after_commit_and_failure_is_recoverable(self):
        self.ready(); self.profile()
        async def broadcast(payload, user_id):
            with Session(self.engine) as session:
                self.assertEqual(len(session.exec(select(PayoutRequest)).all()), 1)
                self.assertIsNotNone(session.get(Notification, payload['data']['id']))
            raise RuntimeError('offline')
        with patch('services.payout_request_service.manager.send_personal_message', side_effect=broadcast):
            self.assertEqual(self.submit().status_code, 200)
        with Session(self.engine) as session: self.assertEqual(len(session.exec(select(Notification)).all()), 5)

    def test_legacy_zero_fee_and_mixed_receipts_remain_exact(self):
        self.ready(); self.profile()
        with Session(self.engine) as session:
            order = session.get(Order, self.order_id); order.platform_fee_bps_snapshot = 0; order.agreed_price = 1500; session.add(order)
            session.add(MilestoneInvoice(order_id=order.id, title='Historical unknown recipient', amount=500, is_paid=True)); session.commit()
        preview = self.preview().json()
        self.assertEqual((preview['gross_satang'], preview['fee_satang'], preview['net_satang']), (100000, 0, 100000))

    def test_additive_schema_upgrade_preserves_existing_orders_and_payouts(self):
        from core.db import init_db
        from models.payout_request import ArtistPayoutProfile, PayoutRequestItem
        self.ready(); payout = self.payout().json()
        new_tables = [model.__table__ for model in (PayoutRequestEvent, PayoutReservation, PayoutRequestItem, PayoutRequest, ArtistPayoutProfile)]
        for table in new_tables: table.drop(self.engine)
        init_db(); init_db()
        with Session(self.engine) as session:
            self.assertEqual(session.get(Order, self.order_id).platform_fee_bps_snapshot, 500)
            self.assertIsNotNone(session.get(ArtistPayout, payout['id']))
            self.assertEqual(session.exec(select(PayoutRequest)).all(), [])
            self.assertEqual(session.exec(select(PayoutReservation)).all(), [])
        self.assertEqual(self.profile().status_code, 200)

    def test_submission_commit_failure_leaves_no_request_reservations_or_notifications(self):
        self.ready(); self.profile(); quote = self.preview().json()
        with Session(self.engine) as session: before = len(session.exec(select(Notification)).all())
        def fail(session):
            if any(isinstance(row, PayoutRequest) for row in list(session.new) + list(session.identity_map.values())):
                raise RuntimeError('injected submit failure')
        event.listen(Session, 'before_commit', fail)
        try:
            with self.assertRaisesRegex(RuntimeError, 'injected'): self.submit(quote)
        finally: event.remove(Session, 'before_commit', fail)
        with Session(self.engine) as session:
            self.assertEqual(session.exec(select(PayoutRequest)).all(), [])
            self.assertEqual(session.exec(select(PayoutRequestEvent)).all(), [])
            self.assertEqual(session.exec(select(PayoutReservation)).all(), [])
            self.assertEqual(len(session.exec(select(Notification)).all()), before)
        self.assertEqual(self.submit(quote).status_code, 200)

    def test_whole_order_batch_rounds_fees_per_order_before_aggregation(self):
        self.ready(); self.profile()
        with Session(self.engine) as session:
            invoice = session.get(MilestoneInvoice, self.invoice_id); invoice.amount = 0.1; session.add(invoice)
            receipt = session.exec(select(CollectionReceipt)).one(); receipt.amount_satang = 10; session.add(receipt)
            first = session.get(Order, self.order_id); first.agreed_price = 0.1; session.add(first)
            other = Order(title='Second rounding order', description='Disposable', artist_id=self.ids['artist'], client_id=self.ids['client'], status=OrderStatus.COMPLETED, agreed_price=0.1, platform_fee_bps_snapshot=500)
            session.add(other); session.flush()
            other_invoice = MilestoneInvoice(order_id=other.id,title='QA',amount=0.1,is_paid=True); session.add(other_invoice); session.flush()
            from models.payment import PaymentInstruction
            instruction = PaymentInstruction(invoice_id=other_invoice.id,recipient_name='QA',mobile_number='0800000000',amount_satang=10,settings_version=1,payload=build_payload('0800000000',10))
            session.add(instruction); session.flush()
            # The immutable receipt's independent approval fields mirror the original fixture.
            fields = receipt.model_dump(exclude={'id','invoice_id','order_id','instruction_id','amount_satang','created_at'})
            session.add(CollectionReceipt(invoice_id=other_invoice.id,order_id=other.id,instruction_id=instruction.id,amount_satang=10,**fields)); session.commit(); other_id=other.id
        quote = self.preview(order_ids=[self.order_id, other_id]).json()
        self.assertEqual((quote['gross_satang'],quote['fee_satang'],quote['net_satang']), (20,2,18))
        body = {'order_ids':[self.order_id,other_id], 'quote_digest':quote['quote_digest'], 'profile_version':quote['profile_version'],'idempotency_key':'whole-order-batch-key-0001'}
        req = self.request('POST','/api/payments/payout-requests','artist',json=body).json()
        req = self.transfer(self.act(req,'claim').json()).json()
        self.assertEqual((req['gross_satang'],req['fee_satang'],req['net_satang']), (20,2,18))
        self.assertEqual(len(req['payout']['items']),2)

    def test_pdf_transfer_proof_is_private_and_available_to_owning_artist(self):
        from pypdf import PdfWriter
        writer = PdfWriter(); writer.add_blank_page(width=100,height=100)
        content = io.BytesIO(); writer.write(content)
        req = self.act(self.prepared(), 'claim').json()
        result = self.transfer(req, proof=('QA-only.pdf',content.getvalue(),'application/pdf'))
        self.assertEqual(result.status_code, 200, result.text)
        self.assertIn('no-store',result.headers['cache-control'])
        detail = self.get(req); self.assertIn('no-store', detail.headers['cache-control'])
        proof = self.request('GET',result.json()['payout']['proof_url'],'artist')
        self.assertEqual(proof.status_code,200); self.assertTrue(proof.content.startswith(b'%PDF'))
        self.assertIn('application/pdf',proof.headers['content-type'])
        self.assertEqual(self.request('GET',result.json()['payout']['proof_url'],'client').status_code,403)


if __name__ == '__main__': unittest.main()
