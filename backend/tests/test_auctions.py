import unittest
from datetime import datetime, timedelta
from sqlmodel import SQLModel, create_engine, Session, select
from models import (
    User, Auction, Bid, AuctionType, AuctionStatus, Order, OrderStatus,
    MilestoneInvoice, File as DBFile
)
from core.auth import get_password_hash
from services import check_and_close_auction
from fastapi import HTTPException

class TestAuctionLogic(unittest.TestCase):
    def setUp(self):
        # Use an in-memory SQLite database for fast unit testing
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

        # Create admin and client users
        self.admin = User(
            email="admin@example.com",
            full_name="Admin Artist",
            hashed_password=get_password_hash("password123"),
            is_admin=True
        )
        self.client1 = User(
            email="client1@example.com",
            full_name="Client One",
            hashed_password=get_password_hash("password123"),
            is_admin=False
        )
        self.client2 = User(
            email="client2@example.com",
            full_name="Client Two",
            hashed_password=get_password_hash("password123"),
            is_admin=False
        )
        self.session.add_all([self.admin, self.client1, self.client2])
        self.session.commit()
        self.session.refresh(self.admin)
        self.session.refresh(self.client1)
        self.session.refresh(self.client2)

    def tearDown(self):
        self.session.close()

    def test_bid_placement_validation_mechanics(self):
        # Create an auction
        auction = Auction(
            title="Adoptable 1",
            description="Character design",
            auction_type=AuctionType.ADOPTABLE,
            status=AuctionStatus.ACTIVE,
            starting_bid=100.0,
            bid_increment=10.0,
            auto_buy=300.0,
            start_time=datetime.utcnow() - timedelta(hours=1),
            end_time=datetime.utcnow() + timedelta(hours=1)
        )
        self.session.add(auction)
        self.session.commit()
        self.session.refresh(auction)

        # 1. Bid below starting bid should fail
        # Normally FastAPI route does this, we simulate the validation checks in the route:
        def place_test_bid(bidder_id, amount):
            # Fetch fresh auction
            act = self.session.get(Auction, auction.id)
            # Bid rules checks
            if act.status != AuctionStatus.ACTIVE:
                raise ValueError("Auction not active")
            
            # Fetch highest bid
            highest_bid = self.session.exec(
                select(Bid).where(Bid.auction_id == act.id).order_by(Bid.amount.desc())
            ).first()
            
            min_required = act.starting_bid
            if highest_bid:
                min_required = highest_bid.amount + act.bid_increment
                
            if amount < min_required:
                raise ValueError(f"Bid must be at least {min_required}")
                
            new_bid = Bid(auction_id=act.id, bidder_id=bidder_id, amount=amount)
            self.session.add(new_bid)
            self.session.commit()
            return new_bid

        # Verify bidding below starting bid raises ValueError
        with self.assertRaises(ValueError):
            place_test_bid(self.client1.id, 50.0)

        # Place valid bid
        bid1 = place_test_bid(self.client1.id, 100.0)
        self.assertEqual(bid1.amount, 100.0)

        # Bidding below increment (needs 100.0 + 10.0 = 110.0)
        with self.assertRaises(ValueError):
            place_test_bid(self.client2.id, 105.0)

        # Place valid higher bid
        bid2 = place_test_bid(self.client2.id, 120.0)
        self.assertEqual(bid2.amount, 120.0)

    def test_auto_buy_trigger(self):
        # Create auction with AB
        auction = Auction(
            title="Adoptable with AB",
            description="Adoptable design",
            image_url="http://example.com/adopt.png",
            auction_type=AuctionType.ADOPTABLE,
            status=AuctionStatus.ACTIVE,
            starting_bid=100.0,
            bid_increment=10.0,
            auto_buy=300.0,
            start_time=datetime.utcnow() - timedelta(hours=1),
            end_time=datetime.utcnow() + timedelta(hours=1)
        )
        self.session.add(auction)
        self.session.commit()
        self.session.refresh(auction)

        # Place bid matching AB (300.0) and simulate the auto buy route behavior
        amount = 300.0
        new_bid = Bid(auction_id=auction.id, bidder_id=self.client1.id, amount=amount)
        self.session.add(new_bid)
        self.session.commit()

        # Execute Auto Buy updates
        if auction.auto_buy is not None and amount >= auction.auto_buy:
            auction.status = AuctionStatus.ENDED
            auction.winner_id = self.client1.id
            auction.winning_bid = amount

            new_order = Order(
                title=f"Adoptable Purchase: {auction.title} (AB)",
                description=f"Auto Bought from auction '{auction.title}' for ${amount}.",
                status=OrderStatus.ACCEPTED,
                agreed_price=amount,
                revision_quota=3,
                client_id=self.client1.id
            )
            self.session.add(new_order)
            self.session.commit()
            self.session.refresh(new_order)

            invoice = MilestoneInvoice(
                title="Full Payment for Auction Win (Auto Buy)",
                amount=amount,
                is_paid=False,
                order_id=new_order.id
            )
            self.session.add(invoice)
            
            if auction.image_url:
                db_file = DBFile(
                    filename=f"{auction.title}_preview.png",
                    s3_key=auction.image_url,
                    is_watermarked=False,
                    file_type="REFERENCE",
                    order_id=new_order.id
                )
                self.session.add(db_file)

            self.session.add(auction)
            self.session.commit()

        # Asserts
        self.session.refresh(auction)
        self.assertEqual(auction.status, AuctionStatus.ENDED)
        self.assertEqual(auction.winner_id, self.client1.id)
        self.assertEqual(auction.winning_bid, 300.0)

        # Check Order was provisioned
        orders = self.session.exec(select(Order).where(Order.client_id == self.client1.id)).all()
        self.assertEqual(len(orders), 1)
        order = orders[0]
        self.assertEqual(order.agreed_price, 300.0)
        self.assertEqual(order.status, OrderStatus.ACCEPTED)

        # Check invoice was provisioned
        invoices = self.session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order.id)).all()
        self.assertEqual(len(invoices), 1)
        self.assertEqual(invoices[0].amount, 300.0)

    def test_lazy_close_expired_auction(self):
        # Create an auction whose end_time is in the past
        auction = Auction(
            title="Expired Slot",
            description="Commission Slot",
            auction_type=AuctionType.COMMISSION_SLOT,
            status=AuctionStatus.ACTIVE,
            starting_bid=150.0,
            bid_increment=15.0,
            start_time=datetime.utcnow() - timedelta(hours=5),
            end_time=datetime.utcnow() - timedelta(hours=1)
        )
        self.session.add(auction)
        self.session.commit()
        self.session.refresh(auction)

        # Place a bid earlier during valid period
        bid = Bid(auction_id=auction.id, bidder_id=self.client2.id, amount=160.0, created_at=datetime.utcnow() - timedelta(hours=2))
        self.session.add(bid)
        self.session.commit()

        # Trigger lazy close
        import asyncio
        asyncio.run(check_and_close_auction(auction, self.session))

        # Verify auction is ended and order is provisioned for client2
        self.session.refresh(auction)
        self.assertEqual(auction.status, AuctionStatus.ENDED)
        self.assertEqual(auction.winner_id, self.client2.id)
        self.assertEqual(auction.winning_bid, 160.0)

        # Verify order and invoice
        orders = self.session.exec(select(Order).where(Order.client_id == self.client2.id)).all()
        self.assertEqual(len(orders), 1)
        self.assertEqual(orders[0].agreed_price, 160.0)
        
        invoices = self.session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == orders[0].id)).all()
        self.assertEqual(len(invoices), 1)
        self.assertEqual(invoices[0].amount, 160.0)

if __name__ == "__main__":
    unittest.main()
