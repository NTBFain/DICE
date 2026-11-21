"""F48: winner/order/invoice persist together, including a pending auto-buy bid."""
import asyncio,tempfile,threading,unittest
from pathlib import Path
from datetime import datetime,timedelta
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from fastapi import HTTPException
from sqlmodel import SQLModel,Session,create_engine,select
from models import User,ArtistProfile,Auction,AuctionType,AuctionStatus,Bid,Order,MilestoneInvoice
from services.auction_service import check_and_close_auction,finalize_auto_buy
from api.routers.auctions import api_place_bid
from schemas import BidCreateRequest

class AuctionAtomicTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.engine=create_engine('sqlite:///'+str(Path(self.directory.name)/'atomic.db'),connect_args={'check_same_thread':False,'timeout':5})
        SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        artist=User(email='a@atomic.test',full_name='Artist',hashed_password='unused',is_artist=True)
        client=User(email='c@atomic.test',full_name='Client',hashed_password='unused')
        self.session.add_all([artist,client]);self.session.commit()
        profile=ArtistProfile(user_id=artist.id,handle='atomic_qa',display_name='QA',tagline='',bio='')
        self.session.add(profile);self.session.commit()
        self.client_id=client.id
        self.auction=Auction(title='Atomic QA',description='Disposable',auction_type=AuctionType.ADOPTABLE,artist_id=profile.id,starting_bid=12.25,bid_increment=1.25,auto_buy=50.25,start_time=datetime.utcnow()-timedelta(days=2),end_time=datetime.utcnow()-timedelta(days=1))
        self.session.add(self.auction);self.session.commit();self.auction_id=self.auction.id
    def tearDown(self):self.session.close();self.engine.dispose();self.directory.cleanup()
    def bid(self):
        self.session.add(Bid(auction_id=self.auction_id,bidder_id=self.client_id,amount=12.25));self.session.commit()
    def counts(self):
        with Session(self.engine) as session:
            auction=session.get(Auction,self.auction_id)
            return auction.status,auction.winner_id,len(session.exec(select(Order)).all()),len(session.exec(select(MilestoneInvoice)).all()),len(session.exec(select(Bid)).all())
    def fail_writing(self,model):
        original=self.session.flush
        def fault(*args,**kwargs):
            if any(isinstance(row,model) for row in self.session.new):raise RuntimeError('designated storage fault')
            return original(*args,**kwargs)
        return patch.object(self.session,'flush',side_effect=fault)
    def test_expiry_order_failure_rolls_back_and_successful_retry_creates_one_result(self):
        self.bid()
        with self.fail_writing(Order),self.assertRaises(RuntimeError):asyncio.run(check_and_close_auction(self.auction,self.session))
        self.assertEqual(self.counts(),(AuctionStatus.ACTIVE,None,0,0,1))
        self.assertTrue(asyncio.run(check_and_close_auction(self.auction,self.session)))
        self.assertEqual(self.counts(),(AuctionStatus.ENDED,self.client_id,1,1,1))
    def test_expiry_invoice_failure_leaves_no_orphan_order(self):
        self.bid()
        with self.fail_writing(MilestoneInvoice),self.assertRaises(RuntimeError):asyncio.run(check_and_close_auction(self.auction,self.session))
        self.assertEqual(self.counts(),(AuctionStatus.ACTIVE,None,0,0,1))
    def test_auto_buy_order_failure_rolls_back_the_pending_bid_too(self):
        self.session.add(Bid(auction_id=self.auction_id,bidder_id=self.client_id,amount=50.25))
        with self.fail_writing(Order),self.assertRaises(RuntimeError):asyncio.run(finalize_auto_buy(self.auction,self.client_id,50.25,self.session))
        self.assertEqual(self.counts(),(AuctionStatus.ACTIVE,None,0,0,0))
    def test_auto_buy_invoice_failure_rolls_back_all_winning_records(self):
        self.session.add(Bid(auction_id=self.auction_id,bidder_id=self.client_id,amount=50.25))
        with self.fail_writing(MilestoneInvoice),self.assertRaises(RuntimeError):asyncio.run(finalize_auto_buy(self.auction,self.client_id,50.25,self.session))
        self.assertEqual(self.counts(),(AuctionStatus.ACTIVE,None,0,0,0))
    def test_bid_route_does_not_commit_auto_buy_bid_before_winning_records(self):
        self.auction.end_time=datetime.utcnow()+timedelta(hours=1)
        self.session.add(self.auction);self.session.commit()
        client=self.session.get(User,self.client_id)
        with self.fail_writing(Order),self.assertRaises(RuntimeError):
            asyncio.run(api_place_bid(self.auction_id,BidCreateRequest(amount=50.25),self.session,client))
        self.assertEqual(self.counts(),(AuctionStatus.ACTIVE,None,0,0,0))
    def test_stale_repeated_auto_buy_cannot_create_second_order_or_keep_losing_bid(self):
        with Session(self.engine) as other:
            stale=other.get(Auction,self.auction_id)
            self.session.add(Bid(auction_id=self.auction_id,bidder_id=self.client_id,amount=50.25))
            self.assertTrue(asyncio.run(finalize_auto_buy(self.auction,self.client_id,50.25,self.session)))
            other.add(Bid(auction_id=self.auction_id,bidder_id=self.client_id,amount=55.50))
            self.assertFalse(asyncio.run(finalize_auto_buy(stale,self.client_id,55.50,other)))
        self.assertEqual(self.counts(),(AuctionStatus.ENDED,self.client_id,1,1,1))
    def test_explicit_auto_buy_accepts_leader_and_requires_the_current_price(self):
        self.auction.end_time = datetime.utcnow() + timedelta(hours=1)
        self.session.add(self.auction)
        self.bid()
        client = self.session.get(User, self.client_id)
        for amount, auto_buy, status in [(50, True, 409), (14, False, 400)]:
            with self.assertRaises(HTTPException) as failure:
                asyncio.run(api_place_bid(self.auction_id, BidCreateRequest(amount=amount, auto_buy=auto_buy), self.session, client))
            self.assertEqual(failure.exception.status_code, status)
        self.assertEqual(self.counts(), (AuctionStatus.ACTIVE, None, 0, 0, 1))
        request = BidCreateRequest(amount=50.25, auto_buy=True)
        result = asyncio.run(api_place_bid(self.auction_id, request, self.session, client))
        self.assertEqual((result.winner_id, result.winning_bid), (self.client_id, 50.25))
        with self.assertRaises(HTTPException):
            asyncio.run(api_place_bid(self.auction_id, request, self.session, client))
        self.assertEqual(self.counts(), (AuctionStatus.ENDED, self.client_id, 1, 1, 2))
    def test_stale_expiry_does_not_override_a_committed_time_extension(self):
        self.bid()
        with Session(self.engine) as other:
            current=other.get(Auction,self.auction_id);current.end_time=datetime.utcnow()+timedelta(hours=1)
            other.add(current);other.commit()
        self.assertFalse(asyncio.run(check_and_close_auction(self.auction,self.session)))
        self.assertEqual(self.counts(),(AuctionStatus.ACTIVE,None,0,0,1))
    def test_no_bid_expiry_is_valid_without_order_or_invoice(self):
        self.assertTrue(asyncio.run(check_and_close_auction(self.auction,self.session)))
        self.assertEqual(self.counts(),(AuctionStatus.ENDED,None,0,0,0))
    def test_two_database_sessions_finalize_only_once(self):
        self.bid();barrier=threading.Barrier(2)
        def close(_):
            with Session(self.engine) as session:
                auction=session.get(Auction,self.auction_id);barrier.wait(timeout=5)
                return asyncio.run(check_and_close_auction(auction,session))
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(close,range(2)))
        self.assertEqual(sorted(results),[False,True]);self.assertEqual(self.counts(),(AuctionStatus.ENDED,self.client_id,1,1,1))

if __name__=='__main__':unittest.main()
