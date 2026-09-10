from sqlmodel import Session, select
from sqlalchemy import update
from models import Auction, AuctionStatus, Bid, AuctionType, Order, OrderStatus, MilestoneInvoice, File as DBFile, User, Notification, NotificationType, ArtistProfile
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

async def check_and_close_auction(auction: Auction, session: Session) -> bool:
    now = datetime.utcnow()
    if auction.status != AuctionStatus.ACTIVE or now < auction.end_time:
        return False

    # Atomic CAS in database to prevent double closure across parallel workers
    stmt = (
        update(Auction)
        .where(Auction.id == auction.id, Auction.status == AuctionStatus.ACTIVE)
        .values(status=AuctionStatus.ENDED)
    )
    result = session.execute(stmt)
    if result.rowcount == 0:
        # Another worker already closed this auction
        return False

    session.commit()
    session.refresh(auction)
    
    all_bids = session.exec(
        select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc(), Bid.created_at.asc())
    ).all()
    highest_bid = all_bids[0] if all_bids else None
    participant_ids = {b.bidder_id for b in all_bids}
    
    notifications_to_send = []
    
    if highest_bid:
        auction.winner_id = highest_bid.bidder_id
        auction.winning_bid = highest_bid.amount
        
        artist_user_id = 1
        if auction.artist_id:
            profile = session.get(ArtistProfile, auction.artist_id)
            if profile and profile.user_id:
                artist_user_id = profile.user_id
                
        order_title = (
            f"Commission Slot: {auction.title}" 
            if auction.auction_type == AuctionType.COMMISSION_SLOT 
            else f"Adoptable Purchase: {auction.title}"
        )
        
        new_order = Order(
            title=order_title,
            description=f"Won from auction '{auction.title}' with bid ฿{highest_bid.amount:.2f}.",
            status=OrderStatus.ACCEPTED,
            agreed_price=highest_bid.amount,
            revision_quota=3,
            client_id=highest_bid.bidder_id,
            artist_id=artist_user_id
        )
        session.add(new_order)
        session.flush()
        
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
            
        notifications_to_send.append((
            highest_bid.bidder_id,
            "You Won the Auction!",
            f"Congratulations! You won '{auction.title}' with a bid of ฿{highest_bid.amount:.2f}.",
            "/dashboard/client"
        ))
        participant_ids.discard(highest_bid.bidder_id)
            
    # Notify other participants
    for pid in participant_ids:
        notifications_to_send.append((
            pid,
            "Auction Ended",
            f"The auction for '{auction.title}' has ended.",
            f"/auctions/{auction.id}"
        ))
            
    session.add(auction)
    session.commit()
    session.refresh(auction)
    
    from services.notification_service import create_notification
    for uid, title, msg, link in notifications_to_send:
        try:
            await create_notification(
                session=session,
                user_id=uid,
                title=title,
                message=msg,
                link=link,
                type=NotificationType.AUCTION
            )
        except Exception:
            pass
            
    try:
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
    except Exception:
        pass
    return True

async def finalize_auto_buy(auction: Auction, bidder_id: int, amount: float, session: Session) -> bool:
    """Directly finalizes an auction when Auto-Buy (AB) is triggered with atomic status update."""
    stmt = (
        update(Auction)
        .where(Auction.id == auction.id, Auction.status == AuctionStatus.ACTIVE)
        .values(status=AuctionStatus.ENDED, winner_id=bidder_id, winning_bid=amount)
    )
    res = session.execute(stmt)
    if res.rowcount == 0:
        return False

    session.commit()
    session.refresh(auction)
    
    artist_user_id = 1
    if auction.artist_id:
        profile = session.get(ArtistProfile, auction.artist_id)
        if profile and profile.user_id:
            artist_user_id = profile.user_id
            
    order_title = (
        f"Commission Slot: {auction.title}" 
        if auction.auction_type == AuctionType.COMMISSION_SLOT 
        else f"Adoptable Purchase: {auction.title}"
    )
    
    new_order = Order(
        title=order_title,
        description=f"Purchased via Auto-Buy from auction '{auction.title}' for ฿{amount:.2f}.",
        status=OrderStatus.ACCEPTED,
        agreed_price=amount,
        revision_quota=3,
        client_id=bidder_id,
        artist_id=artist_user_id
    )
    session.add(new_order)
    session.flush()
    
    invoice = MilestoneInvoice(
        title="Full Payment for Auction Auto-Buy",
        amount=amount,
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
        
    session.add(auction)
    session.commit()
    session.refresh(auction)
    
    from services.notification_service import create_notification
    try:
        await create_notification(
            session=session,
            user_id=bidder_id,
            title="Auto-Buy Successful!",
            message=f"You successfully purchased '{auction.title}' via Auto-Buy for ฿{amount:.2f}.",
            link="/dashboard/client",
            type=NotificationType.AUCTION
        )
    except Exception:
        pass
        
    try:
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
    except Exception:
        pass
    return True

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
