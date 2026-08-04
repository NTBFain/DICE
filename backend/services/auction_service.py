from sqlmodel import Session, select
from models import Auction, AuctionStatus, Bid, AuctionType, Order, OrderStatus, MilestoneInvoice, File as DBFile, User, Notification, NotificationType
from schemas import BidResponse
from datetime import datetime, timezone
from typing import List
import asyncio

async def background_close_auction(auction_id: int):
    from core.db import engine
    from sqlmodel import Session
    with Session(engine) as session:
        auction = session.get(Auction, auction_id)
        if auction and auction.status == AuctionStatus.ACTIVE and datetime.utcnow() >= auction.end_time:
            await check_and_close_auction(auction, session)

async def check_and_close_auction(auction: Auction, session: Session):
    if auction.status == AuctionStatus.ACTIVE and datetime.utcnow() >= auction.end_time:
        auction.status = AuctionStatus.ENDED
        # Get highest bid
        all_bids = session.exec(
            select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc())
        ).all()
        highest_bid = all_bids[0] if all_bids else None
        
        participant_ids = {b.bidder_id for b in all_bids}
        
        if highest_bid:
            auction.winner_id = highest_bid.bidder_id
            auction.winning_bid = highest_bid.amount
            
            # Create Order
            if auction.auction_type == AuctionType.COMMISSION_SLOT:
                order_title = f"Commission Slot: {auction.title}"
            else:
                order_title = f"Adoptable Purchase: {auction.title}"
                
            new_order = Order(
                title=order_title,
                description=f"Won from auction '{auction.title}' with bid ${highest_bid.amount}.",
                status=OrderStatus.ACCEPTED,
                agreed_price=highest_bid.amount,
                revision_quota=3,
                client_id=highest_bid.bidder_id
            )
            session.add(new_order)
            session.commit()
            session.refresh(new_order)
            
            # Create full invoice
            invoice = MilestoneInvoice(
                title="Full Payment for Auction Win",
                amount=highest_bid.amount,
                is_paid=False,
                order_id=new_order.id
            )
            session.add(invoice)
            
            if auction.image_url:
                db_file = DBFile(
                    filename=f"{auction.title}_preview.png",
                    s3_key=auction.image_url,
                    is_watermarked=False,
                    file_type="REFERENCE",
                    order_id=new_order.id
                )
                session.add(db_file)
                
            # Notify winner
            from services.notification_service import create_notification
            await create_notification(
                session=session,
                user_id=highest_bid.bidder_id,
                title="You Won the Auction!",
                message=f"Congratulations! You won '{auction.title}' with a bid of ฿{highest_bid.amount}.",
                link=f"/dashboard/client",
                type=NotificationType.AUCTION
            )
            participant_ids.discard(highest_bid.bidder_id)
                
        # Notify other participants
        from services.notification_service import create_notification
        for pid in participant_ids:
            await create_notification(
                session=session,
                user_id=pid,
                title="Auction Ended",
                message=f"The auction for '{auction.title}' has ended.",
                link=f"/auctions/{auction.id}",
                type=NotificationType.AUCTION
            )
                
        session.add(auction)
        session.commit()
        session.refresh(auction)
        
        # Broadcast auction ended update
        from core.websocket import manager
        await manager.broadcast({
            "type": "auction_ended",
            "data": {
                "auction_id": auction.id,
                "winner_id": auction.winner_id,
                "winning_bid": auction.winning_bid,
                "status": auction.status.value
            }
        })

def get_bid_responses(bids: List[Bid], session: Session) -> List[BidResponse]:
    if not bids:
        return []
        
    bidder_ids = list({bid.bidder_id for bid in bids})
    users = session.exec(select(User).where(User.id.in_(bidder_ids))).all()
    user_map = {user.id: user.full_name for user in users}
    
    responses = []
    for bid in bids:
        bidder_name = user_map.get(bid.bidder_id, "Unknown Bidder")
        responses.append(BidResponse(
            id=bid.id,
            auction_id=bid.auction_id,
            bidder_id=bid.bidder_id,
            amount=bid.amount,
            created_at=bid.created_at.replace(tzinfo=timezone.utc),
            bidder_name=bidder_name
        ))
    return responses

