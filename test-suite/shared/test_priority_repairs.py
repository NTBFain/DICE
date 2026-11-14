"""Isolated regressions for studio ownership and artist financial scoping."""
import unittest
from datetime import timedelta

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

from api.routers.analytics import get_analytics
from api.routers.orders import create_order, update_order
from core.time import utcnow
from models import User, ArtistProfile, Order, OrderStatus, MilestoneInvoice, Auction, AuctionType
from schemas import OrderCreateRequest, OrderUpdateRequest


class PriorityRepairTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.admin = User(email='admin@qa.test', full_name='Admin', hashed_password='unused', is_admin=True)
        self.artist = User(email='a@qa.test', full_name='Artist A', hashed_password='unused', is_artist=True)
        self.other = User(email='b@qa.test', full_name='Artist B', hashed_password='unused', is_artist=True)
        self.client = User(email='client@qa.test', full_name='Client', hashed_password='unused')
        self.session.add_all([self.admin, self.artist, self.other, self.client])
        self.session.commit()
        self.profile = ArtistProfile(user_id=self.artist.id, handle='artist_a', display_name='A', tagline='', bio='')
        self.other_profile = ArtistProfile(user_id=self.other.id, handle='artist_b', display_name='B', tagline='', bio='')
        self.session.add_all([self.profile, self.other_profile])
        self.session.commit()
        self.assertEqual(self.artist.id, self.other_profile.id)  # Reproduce the ID collision.

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def request(self, **values):
        return OrderCreateRequest(title='QA manual ticket', description='Disposable request', artist_id=self.profile.id, **values)

    def test_artist_manual_ticket_assigns_own_artist_and_registered_client(self):
        result = create_order(self.request(client_email='CLIENT@qa.test'), self.session, self.artist)
        self.assertEqual(result['artist_id'], self.artist.id)
        self.assertEqual(result['client_id'], self.client.id)
        self.assertEqual(result['client_name'], 'Client')

    def test_admin_manual_ticket_uses_selected_artist_and_client(self):
        request = OrderCreateRequest(title='Admin ticket', description='QA', artist_id=self.other_profile.id, client_email=self.client.email)
        result = create_order(request, self.session, self.admin)
        self.assertEqual((result['artist_id'], result['client_id']), (self.other.id, self.client.id))

    def test_normal_client_order_keeps_caller_as_client(self):
        result = create_order(self.request(), self.session, self.client)
        self.assertEqual((result['artist_id'], result['client_id']), (self.artist.id, self.client.id))

    def test_client_cannot_impersonate_another_client(self):
        with self.assertRaises(HTTPException) as error:
            create_order(self.request(client_email=self.artist.email), self.session, self.client)
        self.assertEqual(error.exception.status_code, 403)
        self.assertEqual(self.session.exec(select(Order)).all(), [])

    def test_artist_cannot_create_manual_ticket_for_another_studio(self):
        request = OrderCreateRequest(title='QA', description='QA', artist_id=self.other_profile.id, client_email=self.client.email)
        with self.assertRaises(HTTPException) as error:
            create_order(request, self.session, self.artist)
        self.assertEqual(error.exception.status_code, 403)

    def test_missing_artist_and_missing_client_reject_without_creating_orders(self):
        for request in [OrderCreateRequest(title='QA', description='QA', artist_id=999999), self.request(client_email='absent@qa.test')]:
            with self.subTest(request=request), self.assertRaises(HTTPException) as error:
                create_order(request, self.session, self.artist)
            self.assertEqual(error.exception.status_code, 404)
        self.assertEqual(self.session.exec(select(Order)).all(), [])

    def test_artist_profile_attached_to_non_artist_user_rejects(self):
        invalid = ArtistProfile(user_id=self.client.id, handle='not_artist', display_name='Client', tagline='', bio='')
        self.session.add(invalid)
        self.session.commit()
        request = OrderCreateRequest(title='QA', description='QA', artist_id=invalid.id)
        with self.assertRaises(HTTPException) as error:
            create_order(request, self.session, self.client)
        self.assertEqual(error.exception.status_code, 400)

    def test_artist_revenue_uses_order_user_ids_and_auction_profile_ids(self):
        for artist, profile, invoice_amount, bid in [(self.artist, self.profile, 100, 300), (self.other, self.other_profile, 200, 400)]:
            order = Order(title='Paid QA', description='QA', artist_id=artist.id, client_id=self.client.id, status=OrderStatus.COMPLETED)
            self.session.add(order)
            self.session.commit()
            self.session.add(MilestoneInvoice(order_id=order.id, title='Paid', amount=invoice_amount, is_paid=True))
            self.session.add(Auction(title='Won QA', description='QA', artist_id=profile.id, auction_type=AuctionType.ADOPTABLE, starting_bid=10, bid_increment=1, winning_bid=bid, start_time=utcnow()-timedelta(days=1), end_time=utcnow()))
        self.session.commit()
        for period in ['week', 'month', 'quarter', 'year']:
            for artist, expected_invoice, expected_auction in [(self.artist, 100, 300), (self.other, 200, 400)]:
                with self.subTest(period=period, artist=artist.email):
                    result = get_analytics(period=period, session=self.session, current_user=artist).model_dump()
                    self.assertEqual(result['commission_revenue'], expected_invoice)
                    self.assertEqual(result['adoptable_revenue'], 0)  # Unpaid wins are not revenue.
                    self.assertEqual(result['average_winning_bid'], expected_auction)
                    self.assertEqual(sum(point['revenue'] for point in result['revenue_data']), expected_invoice)
                    self.assertEqual(result['completed_orders_count'], 1)
        totals = get_analytics(period='month', session=self.session, current_user=self.admin).model_dump()
        self.assertEqual(totals['commission_revenue'], 300)
        self.assertEqual(totals['adoptable_revenue'], 0)
        self.assertEqual(totals['average_winning_bid'], 350)

    def test_supported_order_progression_and_payment_completion_guard(self):
        result = create_order(self.request(client_email=self.client.email), self.session, self.artist)
        order_id = result['id']
        for status in ['ACCEPTED', 'SKETCHING', 'COLORING']:
            result = update_order(order_id, OrderUpdateRequest(status=status), BackgroundTasks(), self.session, self.artist)
            self.assertEqual(result['status'], status)
        with self.assertRaises(HTTPException) as error:
            update_order(order_id, OrderUpdateRequest(status='COMPLETED'), BackgroundTasks(), self.session, self.artist)
        self.assertEqual(error.exception.status_code, 400)
        order = self.session.get(Order, order_id)
        order.agreed_price = 100
        self.session.add(order)
        self.session.add(MilestoneInvoice(order_id=order_id, title='Paid', amount=100, is_paid=True))
        self.session.commit()
        completed = update_order(order_id, OrderUpdateRequest(status='COMPLETED'), BackgroundTasks(), self.session, self.artist)
        self.assertEqual(completed['status'], 'COMPLETED')


if __name__ == '__main__':
    unittest.main()
