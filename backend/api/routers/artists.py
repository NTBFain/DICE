from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlmodel import Session, select
from typing import List, Optional
import os
import uuid
import re
import math

from core.db import get_session
from core.auth import get_current_user, get_artist_user, get_admin_user
from core.security_file import validate_and_save_upload
from models import ArtistProfile, ArtistService, ArtistReview, Order, OrderStatus, User, Artwork, Auction, AuctionStatus
from schemas import (
    ArtistProfileResponse, ArtistUpdateRequest, ArtistServiceResponse, 
    ArtistReviewResponse, ArtistRegisterRequest, ArtistServiceCreateRequest, 
    ArtistReviewCreateRequest
)

router = APIRouter(prefix="/api/artists", tags=["artists"])

RESERVED_HANDLES = {
    "me", "register", "admin", "api", "dashboard", "settings",
    "upload", "orders", "auctions", "characters", "portfolio",
    "system", "null", "undefined", "help", "support"
}
HANDLE_REGEX = re.compile(r"^[a-z0-9_]{3,30}$")
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def _build_profile_res(a: ArtistProfile, session: Session) -> ArtistProfileResponse:
    services = session.exec(select(ArtistService).where(ArtistService.artist_id == a.id)).all()
    reviews = session.exec(select(ArtistReview).where(ArtistReview.artist_id == a.id)).all()
    
    portfolio_count = len(session.exec(select(Artwork).where(Artwork.artist_id == a.id)).all())
    active_auctions_count = len(session.exec(select(Auction).where(Auction.artist_id == a.id, Auction.status == AuctionStatus.ACTIVE)).all())
    
    queue_orders = session.exec(
        select(Order).where(Order.artist_id == (a.user_id or a.id), Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.SKETCHING, OrderStatus.COLORING]))
    ).all()
    
    queue_res = []
    for idx, o in enumerate(queue_orders, start=1):
        client = session.get(User, o.client_id)
        raw_name = client.full_name if client else "Client"
        masked_name = " ".join([f"{p[0]}***" if len(p) > 1 else "***" for p in raw_name.split()])
        queue_res.append({
            "slot_number": idx,
            "order_id": o.id,
            "title": f"Slot #{idx}",
            "client_name": masked_name,
            "stage": o.status.value,
            "status": o.status.value,
            "start_date": o.start_date.isoformat() if o.start_date else None,
            "due_date": o.due_date.isoformat() if o.due_date else None
        })
        
    return ArtistProfileResponse(
        id=a.id,
        user_id=a.user_id,
        handle=a.handle,
        display_name=a.display_name,
        tagline=a.tagline,
        bio=a.bio,
        avatar_url=a.avatar_url,
        banner_url=a.banner_url,
        styles=[s.strip() for s in a.styles.split(",")] if a.styles else [],
        commission_status=a.commission_status,
        rating=a.rating,
        total_completed_orders=a.total_completed_orders,
        starting_price=a.starting_price,
        social_twitter=a.social_twitter,
        social_pixiv=a.social_pixiv,
        social_discord=a.social_discord,
        is_verified=a.is_verified,
        is_featured=a.is_featured,
        services=[
            ArtistServiceResponse(
                id=s.id,
                title=s.title,
                category=s.category,
                description=s.description,
                base_price=s.base_price,
                estimated_days=s.estimated_days,
                includes_commercial=s.includes_commercial,
                includes_psd=s.includes_psd,
                sample_image_url=s.sample_image_url
            ) for s in services
        ],
        reviews=[
            ArtistReviewResponse(
                id=r.id,
                client_name=r.client_name,
                rating=r.rating,
                comment=r.comment,
                created_at=r.created_at
            ) for r in reviews
        ],
        active_auctions_count=active_auctions_count,
        portfolio_count=portfolio_count,
        public_queue=queue_res
    )

@router.get("/me", response_model=ArtistProfileResponse)
def get_my_profile(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Artist profile not found for this account")
    return _build_profile_res(profile, session)

@router.put("/me", response_model=ArtistProfileResponse)
def update_my_profile(
    req: ArtistUpdateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Artist profile not found for this account")
        
    if req.display_name is not None: profile.display_name = req.display_name.strip()
    if req.tagline is not None: profile.tagline = req.tagline.strip()
    if req.bio is not None: profile.bio = req.bio.strip()
    if req.styles is not None: profile.styles = ", ".join(req.styles)
    if req.starting_price is not None: profile.starting_price = round(req.starting_price, 2)
    if req.commission_status is not None: profile.commission_status = req.commission_status
    if req.social_twitter is not None: profile.social_twitter = req.social_twitter
    if req.social_pixiv is not None: profile.social_pixiv = req.social_pixiv
    if req.social_discord is not None: profile.social_discord = req.social_discord

    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    return _build_profile_res(profile, session)

@router.post("/me/upload")
def upload_profile_image(
    image_type: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Artist profile not found")
        
    if image_type not in ["avatar", "banner"]:
        raise HTTPException(status_code=400, detail="Invalid image_type. Must be 'avatar' or 'banner'")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid image extension. Allowed: {ALLOWED_IMAGE_EXTENSIONS}")

    filename = f"prof_{uuid.uuid4().hex}{ext}"
    upload_dir = "uploads/portfolio"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    
    # Enforce magic bytes verification and size limit
    validate_and_save_upload(file, file_path, max_size=10 * 1024 * 1024, is_deliverable=False)
        
    url = f"/api/portfolio/images/{filename}"
    
    if image_type == "avatar":
        profile.avatar_url = url
    else:
        profile.banner_url = url
        
    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    return {"url": url}

@router.post("/register", response_model=ArtistProfileResponse)
def register_artist(
    req: ArtistRegisterRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Register a new artist profile on the platform with DB persistence"""
    clean_handle = req.handle.lower().strip()
    if not HANDLE_REGEX.match(clean_handle):
        raise HTTPException(status_code=400, detail="Handle must be 3-30 characters long and contain only lowercase letters, numbers, and underscores.")
    if clean_handle in RESERVED_HANDLES:
        raise HTTPException(status_code=400, detail=f"The handle '@{clean_handle}' is reserved and cannot be registered.")

    existing_user_profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    if existing_user_profile:
        raise HTTPException(status_code=400, detail="You already have an artist profile registered.")

    existing = session.exec(select(ArtistProfile).where(ArtistProfile.handle == clean_handle)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Artist handle @{clean_handle} is already registered!")

    styles_str = ", ".join(req.styles) if isinstance(req.styles, list) else req.styles
    
    artist = ArtistProfile(
        user_id=current_user.id,
        handle=clean_handle,
        display_name=req.display_name.strip(),
        tagline=req.tagline.strip() if req.tagline else "",
        bio=req.bio.strip() if req.bio else "",
        avatar_url=req.avatar_url,
        banner_url=req.banner_url,
        styles=styles_str,
        starting_price=round(req.starting_price, 2),
        social_twitter=req.social_twitter,
        social_pixiv=req.social_pixiv,
        social_discord=req.social_discord,
        commission_status="OPEN",
        rating=5.0,
        total_completed_orders=0,
        is_verified=False,
        is_featured=False
    )
    
    current_user.is_artist = True
    session.add(current_user)
    session.add(artist)
    session.commit()
    session.refresh(artist)
    
    return _build_profile_res(artist, session)

@router.get("", response_model=List[ArtistProfileResponse])
def get_artists(
    query: Optional[str] = None,
    style: Optional[str] = None,
    status: Optional[str] = None,
    max_price: Optional[float] = None,
    session: Session = Depends(get_session)
):
    statement = select(ArtistProfile)
    if status and status.upper() != 'ALL':
        statement = statement.where(ArtistProfile.commission_status == status.upper())
    if max_price:
        statement = statement.where(ArtistProfile.starting_price <= max_price)
        
    artists = session.exec(statement).all()
        
    filtered_artists = []
    for a in artists:
        if query:
            q = query.lower()
            if q not in a.display_name.lower() and q not in a.handle.lower() and q not in a.bio.lower():
                continue
        if style and style.upper() != 'ALL':
            if style.lower() not in a.styles.lower():
                continue
        filtered_artists.append(a)

    if not filtered_artists:
        return []

    from collections import defaultdict
    from sqlalchemy.orm import joinedload
    from sqlmodel import func

    artist_ids = [a.id for a in filtered_artists]
    user_ids = [a.user_id for a in filtered_artists if a.user_id]

    # 1. Services in batch
    services_map = defaultdict(list)
    for s in session.exec(select(ArtistService).where(ArtistService.artist_id.in_(artist_ids))).all():
        services_map[s.artist_id].append(ArtistServiceResponse(
            id=s.id, title=s.title, category=s.category, description=s.description,
            base_price=s.base_price, estimated_days=s.estimated_days,
            includes_commercial=s.includes_commercial, includes_psd=s.includes_psd,
            sample_image_url=s.sample_image_url
        ))

    # 2. Reviews in batch
    reviews_map = defaultdict(list)
    for r in session.exec(select(ArtistReview).where(ArtistReview.artist_id.in_(artist_ids))).all():
        reviews_map[r.artist_id].append(ArtistReviewResponse(
            id=r.id, client_name=r.client_name, rating=r.rating,
            comment=r.comment, created_at=r.created_at
        ))

    # 3. Artwork count in batch
    art_counts = dict(session.exec(
        select(Artwork.artist_id, func.count(Artwork.id))
        .where(Artwork.artist_id.in_(artist_ids))
        .group_by(Artwork.artist_id)
    ).all())

    # 4. Active auctions count in batch
    auc_counts = dict(session.exec(
        select(Auction.artist_id, func.count(Auction.id))
        .where(Auction.artist_id.in_(artist_ids), Auction.status == AuctionStatus.ACTIVE)
        .group_by(Auction.artist_id)
    ).all())

    # 5. Queue orders in batch
    orders_map = defaultdict(list)
    if user_ids:
        queue_orders = session.exec(
            select(Order)
            .where(Order.artist_id.in_(user_ids), Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.SKETCHING, OrderStatus.COLORING]))
            .options(joinedload(Order.client))
        ).all()
        for o in queue_orders:
            orders_map[o.artist_id].append(o)

    results = []
    for a in filtered_artists:
        q_orders = orders_map.get(a.user_id or a.id, [])
        queue_res = []
        for idx, o in enumerate(q_orders, start=1):
            raw_name = o.client.full_name if o.client else "Client"
            masked_name = " ".join([f"{p[0]}***" if len(p) > 1 else "***" for p in raw_name.split()])
            queue_res.append({
                "slot_number": idx, "order_id": o.id, "title": f"Slot #{idx}",
                "client_name": masked_name, "stage": o.status.value, "status": o.status.value,
                "start_date": o.start_date.isoformat() if o.start_date else None,
                "due_date": o.due_date.isoformat() if o.due_date else None
            })

        results.append(ArtistProfileResponse(
            id=a.id, user_id=a.user_id, handle=a.handle, display_name=a.display_name,
            tagline=a.tagline, bio=a.bio, avatar_url=a.avatar_url, banner_url=a.banner_url,
            styles=[s.strip() for s in a.styles.split(",")] if a.styles else [],
            commission_status=a.commission_status, rating=a.rating,
            total_completed_orders=a.total_completed_orders, starting_price=a.starting_price,
            social_twitter=a.social_twitter, social_pixiv=a.social_pixiv, social_discord=a.social_discord,
            is_verified=a.is_verified, is_featured=a.is_featured,
            services=services_map.get(a.id, []),
            reviews=reviews_map.get(a.id, []),
            active_auctions_count=auc_counts.get(a.id, 0),
            portfolio_count=art_counts.get(a.id, 0),
            public_queue=queue_res
        ))

    return results

@router.get("/{handle}", response_model=ArtistProfileResponse)
def get_artist_by_handle(handle: str, session: Session = Depends(get_session)):
    statement = select(ArtistProfile).where(ArtistProfile.handle == handle.lower())
    artist = session.exec(statement).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")
        
    return _build_profile_res(artist, session)

@router.post("/{handle}/services", response_model=ArtistServiceResponse)
def add_artist_service(
    handle: str, 
    req: ArtistServiceCreateRequest, 
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user)
):
    artist = session.exec(select(ArtistProfile).where(ArtistProfile.handle == handle.lower())).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
        
    if not artist_user.is_admin and artist.user_id != artist_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add services to this artist profile")
        
    svc = ArtistService(
        artist_id=artist.id,
        title=req.title.strip(),
        category=req.category.strip(),
        description=req.description.strip(),
        base_price=round(req.base_price, 2),
        estimated_days=req.estimated_days,
        includes_commercial=req.includes_commercial,
        includes_psd=req.includes_psd,
        sample_image_url=req.sample_image_url
    )
    session.add(svc)
    session.commit()
    session.refresh(svc)
    
    return ArtistServiceResponse(
        id=svc.id,
        title=svc.title,
        category=svc.category,
        description=svc.description,
        base_price=svc.base_price,
        estimated_days=svc.estimated_days,
        includes_commercial=svc.includes_commercial,
        includes_psd=svc.includes_psd,
        sample_image_url=svc.sample_image_url
    )

@router.post("/{handle}/reviews", response_model=ArtistReviewResponse)
def add_artist_review(
    handle: str, 
    req: ArtistReviewCreateRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Submit a verified client review for an artist"""
    artist = session.exec(select(ArtistProfile).where(ArtistProfile.handle == handle.lower())).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
        
    if not math.isfinite(req.rating) or req.rating < 1.0 or req.rating > 5.0:
        raise HTTPException(status_code=400, detail="Rating must be a valid finite number between 1 and 5 stars")
        
    if artist.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Artists cannot submit reviews for their own profile")
        
    # Verify that caller has completed an order with this artist
    completed_order = session.exec(
        select(Order).where(
            Order.client_id == current_user.id,
            Order.artist_id == (artist.user_id or artist.id),
            Order.status == OrderStatus.COMPLETED
        )
    ).first()
    if not completed_order and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You must have a completed commission with this artist to submit a review")

    review = ArtistReview(
        artist_id=artist.id,
        client_name=current_user.full_name or "Verified Client",
        rating=round(req.rating, 1),
        comment=req.comment.strip()
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    
    # Recalculate average rating accurately across all persisted reviews
    all_reviews = session.exec(select(ArtistReview).where(ArtistReview.artist_id == artist.id)).all()
    if all_reviews:
        artist.rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 1)
        session.add(artist)
        session.commit()
    
    return ArtistReviewResponse(
        id=review.id,
        client_name=review.client_name,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at
    )
