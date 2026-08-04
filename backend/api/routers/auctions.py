from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone

from core.db import get_session
from core.auth import get_current_user, get_admin_user
from models import Auction, AuctionStatus, AuctionType, Bid, User, Notification, NotificationType, AuctionMessage
from schemas import (
    AuctionCreateRequest, AuctionUpdateRequest, AuctionResponse, 
    BidCreateRequest, BidResponse, AuctionMessageCreateRequest, AuctionMessageResponse
)
from services.auction_service import check_and_close_auction, get_bid_responses, background_close_auction

def get_auction_messages_response(session: Session, auction_id: int) -> List[AuctionMessageResponse]:
    statement = select(AuctionMessage).where(AuctionMessage.auction_id == auction_id).order_by(AuctionMessage.created_at.asc())
    msgs = session.exec(statement).all()
    res = []
    for m in msgs:
        sender = session.get(User, m.sender_id)
        sender_name = sender.full_name if sender else "Anonymous"
        is_artist = sender.is_admin if sender else False
        res.append(
            AuctionMessageResponse(
                id=m.id,
                auction_id=m.auction_id,
                sender_id=m.sender_id,
                sender_name=sender_name,
                is_artist=is_artist,
                content=m.content,
                created_at=m.created_at.replace(tzinfo=timezone.utc)
            )
        )
    return res

def _build_auction_response(a: Auction, bid_res: List, session: Session, msg_res: List = None) -> AuctionResponse:
    winner_name = None
    if a.winner_id and getattr(a, "winner", None):
        winner_name = a.winner.full_name
    if msg_res is None:
        msg_res = get_auction_messages_response(session, a.id)
    return AuctionResponse(
        id=a.id,
        title=a.title,
        description=a.description,
        image_url=a.image_url,
        auction_type=a.auction_type.value,
        status=a.status.value,
        starting_bid=a.starting_bid,
        bid_increment=a.bid_increment,
        auto_buy=a.auto_buy,
        start_time=a.start_time.replace(tzinfo=timezone.utc),
        end_time=a.end_time.replace(tzinfo=timezone.utc),
        winner_id=a.winner_id,
        winner_name=winner_name,
        winning_bid=a.winning_bid,
        created_at=a.created_at.replace(tzinfo=timezone.utc),
        bids=bid_res,
        messages=msg_res
    )

import os
import shutil
import secrets
from fastapi.responses import FileResponse as SecureFileResponse
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File as FormFile, Form

router = APIRouter(prefix="/api/auctions", tags=["auctions"])

@router.post("/upload_image")
def upload_auction_image(
    file: UploadFile = FormFile(...),
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(status_code=400, detail="Invalid image extension. Allowed: jpg, jpeg, png, webp, gif")
    os.makedirs("uploads/auctions", exist_ok=True)
    filename = f"auc_{secrets.token_hex(8)}.{ext}"
    filepath = os.path.join("uploads/auctions", filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"image_url": f"/api/auctions/images/{filename}"}

@router.get("/images/{filename}")
def get_auction_image(filename: str):
    filename = os.path.basename(filename)
    path = os.path.join("uploads/auctions", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return SecureFileResponse(path)

@router.post("", response_model=AuctionResponse)
def api_create_auction(request: AuctionCreateRequest, session: Session = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    from models import ArtistProfile
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == admin_user.id)).first()
    artist_id = profile.id if profile else None

    start_dt = request.start_time.replace(tzinfo=None) if request.start_time.tzinfo else request.start_time
    end_dt = request.end_time.replace(tzinfo=None) if request.end_time.tzinfo else request.end_time

    auction = Auction(
        title=request.title,
        description=request.description,
        image_url=request.image_url,
        auction_type=AuctionType(request.auction_type),
        status=AuctionStatus.ACTIVE,
        starting_bid=request.starting_bid,
        bid_increment=request.bid_increment,
        auto_buy=request.auto_buy,
        start_time=start_dt,
        end_time=end_dt,
        artist_id=artist_id
    )
    session.add(auction)
    session.commit()
    session.refresh(auction)
    return _build_auction_response(auction, [], session)

@router.get("", response_model=List[AuctionResponse])
async def api_get_auctions(background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    statement = select(Auction).options(
        selectinload(Auction.bids).joinedload(Bid.bidder),
        selectinload(Auction.winner)
    )
    auctions = session.exec(statement).all()
    
    # Check closing only for expired active auctions to avoid unnecessary commits
    now = datetime.utcnow()
    for a in auctions:
        if a.status == AuctionStatus.ACTIVE and now >= a.end_time:
            background_tasks.add_task(background_close_auction, a.id)
        
    responses = []
    for a in auctions:
        sorted_bids = sorted(a.bids, key=lambda x: x.amount, reverse=True)
        bid_res = []
        for bid in sorted_bids:
            bidder_name = bid.bidder.full_name if bid.bidder else "Unknown Bidder"
            bid_res.append(BidResponse(
                id=bid.id,
                auction_id=bid.auction_id,
                bidder_id=bid.bidder_id,
                amount=bid.amount,
                created_at=bid.created_at.replace(tzinfo=timezone.utc),
                bidder_name=bidder_name
            ))
        responses.append(_build_auction_response(a, bid_res, session))
    return responses

@router.get("/{auction_id}", response_model=AuctionResponse)
async def api_get_auction_by_id(auction_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    statement = select(Auction).where(Auction.id == auction_id).options(
        selectinload(Auction.bids).joinedload(Bid.bidder),
        selectinload(Auction.winner)
    )
    auction = session.exec(statement).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    now = datetime.utcnow()
    if auction.status == AuctionStatus.ACTIVE and now >= auction.end_time:
        background_tasks.add_task(background_close_auction, auction.id)
    
    sorted_bids = sorted(auction.bids, key=lambda x: x.amount, reverse=True)
    bid_res = []
    for bid in sorted_bids:
        bidder_name = bid.bidder.full_name if bid.bidder else "Unknown Bidder"
        bid_res.append(BidResponse(
            id=bid.id,
            auction_id=bid.auction_id,
            bidder_id=bid.bidder_id,
            amount=bid.amount,
            created_at=bid.created_at.replace(tzinfo=timezone.utc),
            bidder_name=bidder_name
        ))
    
    return _build_auction_response(auction, bid_res, session)

@router.post("/{auction_id}/bid", response_model=AuctionResponse)
async def api_place_bid(auction_id: int, request: BidCreateRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    await check_and_close_auction(auction, session)
    
    if auction.status != AuctionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Auction has ended or is cancelled")
        
    now = datetime.utcnow()
    if now < auction.start_time or now > auction.end_time:
        raise HTTPException(status_code=400, detail="Auction is outside bidding time")
        
    highest_bid = session.exec(
        select(Bid).where(Bid.auction_id == auction_id).order_by(Bid.amount.desc())
    ).first()
    previous_highest = highest_bid
    
    min_required_bid = auction.starting_bid
    if highest_bid:
        min_required_bid = highest_bid.amount + auction.bid_increment
        
    if request.amount < min_required_bid:
        raise HTTPException(status_code=400, detail=f"Bid amount must be at least ${min_required_bid}")
        
    new_bid = Bid(
        auction_id=auction_id,
        bidder_id=current_user.id,
        amount=request.amount
    )
    session.add(new_bid)
    session.commit()
    session.refresh(new_bid)
    
    # Sniper Protection (Anti-Sniping)
    time_left_seconds = (auction.end_time - now).total_seconds()
    if 0 < time_left_seconds <= 300:
        from datetime import timedelta
        auction.end_time = auction.end_time + timedelta(minutes=5)
        session.add(auction)
        session.commit()
        session.refresh(auction)
        
    # Notify previous highest bidder
    if previous_highest and previous_highest.bidder_id != current_user.id:
        from services.notification_service import create_notification
        await create_notification(
            session=session,
            user_id=previous_highest.bidder_id,
            title="Outbid Alert!",
            message=f"You have been outbid on auction '{auction.title}' by ฿{request.amount}.",
            link=f"/auctions/{auction.id}",
            type=NotificationType.AUCTION
        )
    
    # Check Auto Buy
    if auction.auto_buy is not None and request.amount >= auction.auto_buy:
        auction.status = AuctionStatus.ENDED
        auction.winner_id = current_user.id
        auction.winning_bid = request.amount
        session.add(auction)
        session.commit()
        
        await check_and_close_auction(auction, session)
        
    # Refresh to get updated bids
    session.refresh(auction)
    
    sorted_bids = session.exec(
        select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc())
    ).all()
    bid_res = get_bid_responses(sorted_bids, session)
    
    response_data = _build_auction_response(auction, bid_res, session)
    
    # Broadcast updated auction to WebSocket
    from fastapi.encoders import jsonable_encoder
    from core.websocket import manager
    await manager.broadcast({
        "type": "auction_updated",
        "data": jsonable_encoder(response_data)
    })
    
    return response_data

@router.post("/{auction_id}/close", response_model=AuctionResponse)
async def api_close_auction_manually(auction_id: int, session: Session = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    if auction.status != AuctionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Auction is already closed")
        
    auction.end_time = datetime.utcnow()
    session.add(auction)
    session.commit()
    session.refresh(auction)
    
    await check_and_close_auction(auction, session)
    
    sorted_bids = session.exec(
        select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc())
    ).all()
    bid_res = get_bid_responses(sorted_bids, session)
    
    return _build_auction_response(auction, bid_res, session)

@router.patch("/{auction_id}", response_model=AuctionResponse)
async def api_update_auction(
    auction_id: int,
    request: AuctionUpdateRequest,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    if request.title is not None:
        auction.title = request.title
    if request.description is not None:
        auction.description = request.description
    if request.auto_buy is not None:
        auction.auto_buy = request.auto_buy
    if request.end_time is not None:
        auction.end_time = request.end_time
        
    session.add(auction)
    session.commit()
    session.refresh(auction)
    
    sorted_bids = session.exec(
        select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc())
    ).all()
    bid_res = get_bid_responses(sorted_bids, session)
    response_data = _build_auction_response(auction, bid_res, session)
    
    # Broadcast to WebSocket
    from fastapi.encoders import jsonable_encoder
    from core.websocket import manager
    await manager.broadcast({
        "type": "auction_updated",
        "data": jsonable_encoder(response_data)
    })
    return response_data

@router.get("/{auction_id}/messages", response_model=List[AuctionMessageResponse])
def api_get_auction_messages(auction_id: int, session: Session = Depends(get_session)):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return get_auction_messages_response(session, auction_id)

@router.post("/{auction_id}/messages", response_model=AuctionMessageResponse)
async def api_create_auction_message(
    auction_id: int,
    request: AuctionMessageCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
        
    msg = AuctionMessage(
        auction_id=auction_id,
        sender_id=current_user.id,
        content=request.content.strip(),
        created_at=datetime.utcnow()
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    
    msg_response = AuctionMessageResponse(
        id=msg.id,
        auction_id=msg.auction_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        is_artist=current_user.is_admin,
        content=msg.content,
        created_at=msg.created_at.replace(tzinfo=timezone.utc)
    )
    
    # Broadcast to WebSocket for live real-time chat update
    try:
        from fastapi.encoders import jsonable_encoder
        from core.websocket import manager
        await manager.broadcast({
            "type": "auction_message_added",
            "auction_id": auction_id,
            "data": jsonable_encoder(msg_response)
        })
    except Exception as e:
        print(f"Error broadcasting auction message: {e}")
        
    return msg_response

    
    return response_data
