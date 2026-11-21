from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File as FormFile, Form
from pydantic import ValidationError
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone, timedelta
import os
import secrets
import math

from core.db import get_session
from core.auth import get_current_user, get_admin_user, get_artist_user
from core.security_file import validate_and_save_upload, MAX_DELIVERABLE_SIZE
from models import Auction, AuctionStatus, AuctionType, Bid, User, Notification, NotificationType, AuctionMessage, ArtistProfile
from schemas import (
    AuctionCreateRequest, AuctionUpdateRequest, AuctionResponse, 
    BidCreateRequest, BidResponse, AuctionMessageCreateRequest, AuctionMessageResponse
)
from services.auction_service import check_and_close_auction, get_bid_responses, background_close_auction, finalize_auto_buy

router = APIRouter(prefix="/api/auctions", tags=["auctions"])

ALLOWED_AUCTION_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

def to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def get_auction_messages_response(session: Session, auction_id: int) -> List[AuctionMessageResponse]:
    statement = select(AuctionMessage).where(AuctionMessage.auction_id == auction_id).order_by(AuctionMessage.created_at.asc())
    msgs = session.exec(statement).all()
    res = []
    for m in msgs:
        sender = session.get(User, m.sender_id)
        sender_name = sender.full_name if sender else "Anonymous"
        is_artist = sender.is_artist or sender.is_admin if sender else False
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
    if a.winner_id:
        winner = session.get(User, a.winner_id)
        if winner:
            winner_name = winner.full_name
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

@router.post("/upload_image")
def upload_auction_image(
    file: UploadFile = FormFile(...),
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user)
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_AUCTION_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid image extension. Allowed: {ALLOWED_AUCTION_IMAGE_EXTENSIONS}")
        
    os.makedirs("uploads/auctions", exist_ok=True)
    filename = f"auc_{secrets.token_hex(8)}{ext}"
    filepath = os.path.join("uploads/auctions", filename)
    
    validate_and_save_upload(file, filepath, max_size=25 * 1024 * 1024, is_deliverable=False)
    return {"image_url": f"/api/auctions/images/{filename}"}

@router.get("/images/{filename}")
def get_auction_image(filename: str):
    filename = os.path.basename(filename)
    path = os.path.join("uploads/auctions", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return SecureFileResponse(path)

@router.get("", response_model=List[AuctionResponse])
async def api_get_auctions(
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session)
):
    statement = select(Auction).options(
        selectinload(Auction.bids).joinedload(Bid.bidder),
        selectinload(Auction.winner)
    )
    auctions = session.exec(statement).all()
    
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
        responses.append(_build_auction_response(a, bid_res, session, msg_res=[]))
    return responses

@router.get("/admin", response_model=List[AuctionResponse])
async def api_get_auctions_admin(
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    artist_user: User = Depends(get_artist_user)
):
    statement = select(Auction).options(
        selectinload(Auction.bids).joinedload(Bid.bidder),
        selectinload(Auction.winner)
    )
    if not artist_user.is_admin:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if profile:
            statement = statement.where(Auction.artist_id == profile.id)
        else:
            statement = statement.where(Auction.artist_id == -1)
            
    auctions = session.exec(statement).all()
    
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
        responses.append(_build_auction_response(a, bid_res, session, msg_res=[]))
    return responses

@router.get("/{auction_id}", response_model=AuctionResponse)
async def api_get_auction(
    auction_id: int, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session)
):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    now = datetime.utcnow()
    if auction.status == AuctionStatus.ACTIVE and now >= auction.end_time:
        await check_and_close_auction(auction, session)
        session.refresh(auction)
        
    sorted_bids = session.exec(
        select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc())
    ).all()
    bid_res = get_bid_responses(sorted_bids, session)
    return _build_auction_response(auction, bid_res, session)

@router.post("", response_model=AuctionResponse)
def api_create_auction(
    request: AuctionCreateRequest, 
    session: Session = Depends(get_session), 
    artist_user: User = Depends(get_artist_user)
):
    return _create_auction(request, session, artist_user)


@router.post("/with-original", response_model=AuctionResponse)
def create_auction_with_original(
    listing: str = Form(...),
    original: UploadFile = FormFile(...),
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user),
):
    try:
        request = AuctionCreateRequest.model_validate_json(listing)
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors(include_context=False, include_input=False)) from exc
    if request.auction_type != AuctionType.ADOPTABLE.value:
        raise HTTPException(400, detail="Only finished-art auctions accept a private original")
    filename = os.path.basename((original.filename or "").replace("\\", "/"))
    extension = os.path.splitext(filename)[1].lower()
    if extension not in ALLOWED_AUCTION_IMAGE_EXTENSIONS | {".psd", ".clip", ".pdf", ".zip", ".rar"}:
        raise HTTPException(400, detail="Unsupported original artwork format")
    key = f"auction_final_{secrets.token_hex(16)}{extension}"
    path = os.path.join("uploads", "originals", key)
    validate_and_save_upload(original, path, max_size=MAX_DELIVERABLE_SIZE, is_deliverable=True)
    try:
        return _create_auction(request, session, artist_user, original_key=key, original_filename=filename)
    except Exception:
        session.rollback()
        if not session.exec(select(Auction.id).where(Auction.original_key == key)).first():
            os.unlink(path)
        raise


def _create_auction(request, session, artist_user, *, original_key=None, original_filename=None):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
    if not profile and not artist_user.is_admin:
        raise HTTPException(status_code=400, detail="You must register an artist profile before creating auctions")
        
    artist_id = profile.id if profile else None

    start_dt = to_naive_utc(request.start_time)
    end_dt = to_naive_utc(request.end_time)

    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    try:
        auc_type = AuctionType(request.auction_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid auction_type. Allowed: COMMISSION_SLOT, ADOPTABLE")
    if auc_type == AuctionType.ADOPTABLE and not original_key:
        raise HTTPException(422, detail="Upload a private original before launching a finished-art auction")

    auction = Auction(
        title=request.title.strip(),
        original_key=original_key,
        original_filename=original_filename,
        description=request.description.strip(),
        image_url=request.image_url,
        auction_type=auc_type,
        status=AuctionStatus.ACTIVE,
        starting_bid=round(request.starting_bid, 2),
        bid_increment=round(request.bid_increment, 2),
        auto_buy=round(request.auto_buy, 2) if request.auto_buy is not None else None,
        start_time=start_dt,
        end_time=end_dt,
        artist_id=artist_id
    )
    session.add(auction)
    session.commit()
    session.refresh(auction)
    return _build_auction_response(auction, [], session)

@router.post("/{auction_id}/bid", response_model=AuctionResponse)
async def api_place_bid(
    auction_id: int, 
    request: BidCreateRequest, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    if request.amount <= 0 or not math.isfinite(request.amount):
        raise HTTPException(status_code=400, detail="Bid amount must be a positive finite number")
        
    bid_amount = round(request.amount, 2)

    # Acquire pessimistic row lock
    auction = session.exec(
        select(Auction).where(Auction.id == auction_id).with_for_update()
    ).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    if auction.artist_id:
        artist_profile = session.get(ArtistProfile, auction.artist_id)
        if artist_profile and artist_profile.user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Artists cannot place bids on their own auctions")

    await check_and_close_auction(auction, session)
    
    if auction.status != AuctionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Auction has ended or is cancelled")
        
    now = datetime.utcnow()
    if now < auction.start_time or now > auction.end_time:
        raise HTTPException(status_code=400, detail="Auction is outside bidding time")
        
    highest_bid = session.exec(
        select(Bid).where(Bid.auction_id == auction_id).order_by(Bid.amount.desc()).with_for_update()
    ).first()
    
    if request.auto_buy is True and (auction.auto_buy is None or request.amount != auction.auto_buy):
        raise HTTPException(status_code=409, detail="The Auto Buy price has changed or is no longer available")

    if request.auto_buy is not True and highest_bid and highest_bid.bidder_id == current_user.id:
        raise HTTPException(status_code=400, detail="You currently hold the highest bid on this auction")
        
    previous_highest = highest_bid
    
    min_required_bid = round(auction.starting_bid, 2)
    if highest_bid:
        min_required_bid = round(highest_bid.amount + auction.bid_increment, 2)
        
    if request.auto_buy is False and auction.auto_buy is not None and bid_amount >= auction.auto_buy:
        raise HTTPException(status_code=400, detail="Use Auto Buy to confirm a purchase at this price")

    if request.auto_buy is True:
        if bid_amount < auction.starting_bid or (highest_bid and bid_amount <= highest_bid.amount):
            raise HTTPException(status_code=409, detail="This Auto Buy price is no longer available")
    elif bid_amount < min_required_bid:
        raise HTTPException(status_code=400, detail=f"Bid amount must be at least ฿{min_required_bid:.2f}")
        
    new_bid = Bid(
        auction_id=auction_id,
        bidder_id=current_user.id,
        amount=bid_amount,
        created_at=now
    )
    session.add(new_bid)
    
    # Sniper Protection (Anti-Sniping) inside atomic block
    time_left_seconds = (auction.end_time - now).total_seconds()
    if 0 <= time_left_seconds <= 300:
        extended_end_time = now + timedelta(minutes=5)
        if extended_end_time > auction.end_time:
            auction.end_time = extended_end_time
            session.add(auction)
            
    # An auto-buy bid and its complete winning result form one transaction.
    if request.auto_buy is True or (request.auto_buy is None and auction.auto_buy is not None and bid_amount >= auction.auto_buy):
        expected_price = request.amount if request.auto_buy is True else None
        if not await finalize_auto_buy(auction, current_user.id, bid_amount, session, expected_price=expected_price):
            raise HTTPException(status_code=409, detail="The auction closed or the Auto Buy price changed")
    else:
        session.commit()
    session.refresh(new_bid)
    session.refresh(auction)

    # Notify previous highest bidder
    if previous_highest and previous_highest.bidder_id != current_user.id:
        from services.notification_service import create_notification
        try:
            await create_notification(
                session=session,
                user_id=previous_highest.bidder_id,
                title="Outbid Alert!",
                message=f"You have been outbid on auction '{auction.title}' with ฿{bid_amount:.2f}.",
                link=f"/auctions/{auction.id}",
                type=NotificationType.AUCTION
            )
        except Exception:
            pass
    
    sorted_bids = session.exec(
        select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc())
    ).all()
    bid_res = get_bid_responses(sorted_bids, session)
    response_data = _build_auction_response(auction, bid_res, session)
    
    try:
        from fastapi.encoders import jsonable_encoder
        from core.websocket import manager
        await manager.broadcast({
            "type": "auction_updated",
            "data": jsonable_encoder(response_data)
        })
    except Exception:
        pass
    
    return response_data

@router.post("/{auction_id}/close", response_model=AuctionResponse)
async def api_close_auction_manually(
    auction_id: int, 
    session: Session = Depends(get_session), 
    artist_user: User = Depends(get_artist_user)
):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    if not artist_user.is_admin:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if not profile or auction.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to close this auction")
        
    if auction.status != AuctionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Auction is already closed")
        
    auction.end_time = datetime.utcnow()
    session.add(auction)
    session.commit()
    session.refresh(auction)
    
    await check_and_close_auction(auction, session)
    session.refresh(auction)
    
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
    artist_user: User = Depends(get_artist_user)
):
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    if not artist_user.is_admin:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if not profile or auction.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this auction")
        
    if request.title is not None:
        auction.title = request.title.strip()
    if request.description is not None:
        auction.description = request.description.strip()
    if request.auto_buy is not None:
        auction.auto_buy = round(request.auto_buy, 2)
    if request.end_time is not None:
        auction.end_time = to_naive_utc(request.end_time)
        
    session.add(auction)
    session.commit()
    session.refresh(auction)
    
    sorted_bids = session.exec(
        select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.amount.desc())
    ).all()
    bid_res = get_bid_responses(sorted_bids, session)
    response_data = _build_auction_response(auction, bid_res, session)
    
    try:
        from fastapi.encoders import jsonable_encoder
        from core.websocket import manager
        await manager.broadcast({
            "type": "auction_updated",
            "data": jsonable_encoder(response_data)
        })
    except Exception:
        pass
        
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
    
    is_artist_user = False
    if auction.artist_id:
        profile = session.get(ArtistProfile, auction.artist_id)
        if profile and profile.user_id == current_user.id:
            is_artist_user = True
            
    msg_response = AuctionMessageResponse(
        id=msg.id,
        auction_id=msg.auction_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        is_artist=is_artist_user or current_user.is_admin,
        content=msg.content,
        created_at=msg.created_at.replace(tzinfo=timezone.utc)
    )
    
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
