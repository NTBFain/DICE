"""Revenue sources must reconcile to the selected paid-invoice trend."""
import unittest
from datetime import timedelta
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel,Session,create_engine
from api.routers.analytics import get_analytics
from core.time import utcnow
from models import User,ArtistProfile,Order,MilestoneInvoice,Auction,AuctionType

class RevenueAccountingTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.artist=User(email='artist@revenue.test',full_name='Artist',hashed_password='unused',is_artist=True)
        self.client=User(email='client@revenue.test',full_name='Client',hashed_password='unused')
        self.session.add_all([self.artist,self.client]);self.session.commit()
        self.profile=ArtistProfile(user_id=self.artist.id,handle='revenue_artist',display_name='Artist',tagline='',bio='')
        self.session.add(self.profile);self.session.commit()

    def tearDown(self): self.session.close();self.engine.dispose()

    def invoice(self,amount,auction_type=None,paid=True,age=0):
        auction_id=None
        if auction_type:
            auction=Auction(title='QA',description='QA',artist_id=self.profile.id,auction_type=auction_type,
                            starting_bid=1,bid_increment=1,winning_bid=amount,start_time=utcnow()-timedelta(days=1),end_time=utcnow())
            self.session.add(auction);self.session.commit();auction_id=auction.id
        order=Order(title='QA',description='QA',artist_id=self.artist.id,client_id=self.client.id,auction_id=auction_id)
        self.session.add(order);self.session.commit()
        self.session.add(MilestoneInvoice(order_id=order.id,title='QA',amount=amount,is_paid=paid,created_at=utcnow()-timedelta(days=age)))
        self.session.commit()

    def result(self,period='month'): return get_analytics(period,self.session,self.artist)

    def test_adoptable_payment_counted_once_and_unpaid_wins_excluded(self):
        self.invoice(100.25)
        self.invoice(200.75,AuctionType.ADOPTABLE)
        self.invoice(50.5,AuctionType.COMMISSION_SLOT)
        self.invoice(900,AuctionType.ADOPTABLE,paid=False)
        result=self.result()
        self.assertEqual(result.commission_revenue,150.75)
        self.assertEqual(result.adoptable_revenue,200.75)
        self.assertEqual(sum(point.revenue for point in result.revenue_data),351.5)
        self.assertEqual(result.commission_revenue+result.adoptable_revenue,351.5)

    def test_source_totals_follow_the_same_period_as_the_chart(self):
        self.invoice(12.34)
        self.invoice(56.78,AuctionType.ADOPTABLE)
        self.invoice(1000,age=400)
        self.invoice(2000,AuctionType.ADOPTABLE,age=400)
        for period in ['week','month','quarter','year']:
            with self.subTest(period=period):
                result=self.result(period)
                self.assertEqual((result.commission_revenue,result.adoptable_revenue),(12.34,56.78))
                self.assertAlmostEqual(sum(point.revenue for point in result.revenue_data),69.12)

    def test_unknown_period_uses_a_consistent_month_fallback(self):
        self.invoice(10.01,AuctionType.ADOPTABLE)
        result=self.result('unknown')
        self.assertEqual(result.adoptable_revenue,10.01)
        self.assertEqual(sum(point.revenue for point in result.revenue_data),10.01)

if __name__=='__main__': unittest.main()
