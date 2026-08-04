from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from core.db import get_session
from models import ArtistProfile, ArtistProfileBase, ArtistService, ArtistReview, Artwork, Character

router = APIRouter(prefix="/api/artists", tags=["artists"])

class ArtistRegisterRequest(BaseModel):
    handle: str
    display_name: str
    tagline: str
    bio: str
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    styles: List[str]
    starting_price: float = 500.0
    social_twitter: Optional[str] = None
    social_pixiv: Optional[str] = None
    social_discord: Optional[str] = None

class ArtistUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    tagline: Optional[str] = None
    bio: Optional[str] = None
    styles: Optional[List[str]] = None
    starting_price: Optional[float] = None
    commission_status: Optional[str] = None
    social_twitter: Optional[str] = None
    social_pixiv: Optional[str] = None
    social_discord: Optional[str] = None

class ArtistServiceCreateRequest(BaseModel):
    title: str
    category: str
    description: str
    base_price: float
    estimated_days: int = 7
    includes_commercial: bool = True
    includes_psd: bool = True
    sample_image_url: Optional[str] = None

class ArtistServiceResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    base_price: float
    estimated_days: int
    includes_commercial: bool
    includes_psd: bool
    sample_image_url: Optional[str] = None

class ArtistReviewResponse(BaseModel):
    id: int
    client_name: str
    rating: int
    comment: str
    created_at: datetime

class ArtistArtworkResponse(BaseModel):
    id: int
    title: str
    work_type: str
    image_url: str
    description: Optional[str] = None
    character_name: Optional[str] = None

class ArtistProfileResponse(BaseModel):
    id: int
    handle: str
    display_name: str
    tagline: str
    bio: str
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    styles: List[str]
    commission_status: str
    rating: float
    total_completed_orders: int
    starting_price: float
    social_twitter: Optional[str] = None
    social_pixiv: Optional[str] = None
    social_discord: Optional[str] = None
    is_verified: bool
    is_featured: bool
    services: Optional[List[ArtistServiceResponse]] = None
    reviews: Optional[List[ArtistReviewResponse]] = None
    artworks: Optional[List[ArtistArtworkResponse]] = None

def _build_profile_res(artist: ArtistProfile, session: Optional[Session] = None) -> ArtistProfileResponse:
    styles_list = [s.strip() for s in artist.styles.split(",") if s.strip()]
    
    services_res = None
    reviews_res = None
    artworks_res = None
    
    if session and artist.id:
        svcs = session.exec(select(ArtistService).where(ArtistService.artist_id == artist.id)).all()
        if svcs:
            services_res = [
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
                )
                for s in svcs
            ]
        revs = session.exec(select(ArtistReview).where(ArtistReview.artist_id == artist.id)).all()
        if revs:
            reviews_res = [
                ArtistReviewResponse(
                    id=r.id,
                    client_name=r.client_name,
                    rating=r.rating,
                    comment=r.comment,
                    created_at=r.created_at
                )
                for r in revs
            ]
            
        arts = session.exec(select(Artwork).where(Artwork.artist_id == artist.id)).all()
        if arts:
            artworks_res = []
            for a in arts:
                char_name = None
                if a.character_id:
                    char = session.get(Character, a.character_id)
                    if char:
                        char_name = char.name
                artworks_res.append(
                    ArtistArtworkResponse(
                        id=a.id,
                        title=a.title,
                        work_type=a.work_type,
                        image_url=a.image_url,
                        description=a.description,
                        character_name=char_name
                    )
                )

    return ArtistProfileResponse(
        id=artist.id,
        handle=artist.handle,
        display_name=artist.display_name,
        tagline=artist.tagline,
        bio=artist.bio,
        avatar_url=artist.avatar_url,
        banner_url=artist.banner_url,
        styles=styles_list,
        commission_status=artist.commission_status,
        rating=artist.rating,
        total_completed_orders=artist.total_completed_orders,
        starting_price=artist.starting_price,
        social_twitter=artist.social_twitter,
        social_pixiv=artist.social_pixiv,
        social_discord=artist.social_discord,
        is_verified=artist.is_verified,
        is_featured=artist.is_featured,
        services=services_res,
        reviews=reviews_res,
        artworks=artworks_res
    )

from core.auth import get_current_user
from models import User
from fastapi import UploadFile, File, Form
import shutil
import os
import uuid

@router.get("/me", response_model=ArtistProfileResponse)
def get_my_profile(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Artist profile not found")
    return _build_profile_res(profile, session)

@router.put("/me", response_model=ArtistProfileResponse)
def update_my_profile(
    req: ArtistUpdateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Artist profile not found")
        
    if req.display_name is not None: profile.display_name = req.display_name
    if req.tagline is not None: profile.tagline = req.tagline
    if req.bio is not None: profile.bio = req.bio
    if req.styles is not None: profile.styles = ", ".join(req.styles)
    if req.starting_price is not None: profile.starting_price = req.starting_price
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
        raise HTTPException(status_code=400, detail="Invalid image_type")

    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = "uploads/portfolio"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"http://127.0.0.1:8000/api/portfolio/images/{filename}"
    
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
    # Check if user already registered
    existing_user_profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    if existing_user_profile:
        raise HTTPException(status_code=400, detail="You already have an artist profile registered.")

    existing = session.exec(select(ArtistProfile).where(ArtistProfile.handle == req.handle.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Artist handle @{req.handle} is already registered!")

    styles_str = ", ".join(req.styles) if isinstance(req.styles, list) else req.styles
    
    artist = ArtistProfile(
        user_id=current_user.id,
        handle=req.handle.lower().strip(),
        display_name=req.display_name,
        tagline=req.tagline,
        bio=req.bio,
        avatar_url=req.avatar_url,
        banner_url=req.banner_url,
        styles=styles_str,
        starting_price=req.starting_price,
        social_twitter=req.social_twitter,
        social_pixiv=req.social_pixiv,
        social_discord=req.social_discord,
        commission_status="OPEN",
        rating=5.0,
        total_completed_orders=0,
        is_verified=True,
        is_featured=True
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
    """List all registered artists from SQLite DB"""
    statement = select(ArtistProfile)
    
    if status and status.upper() != 'ALL':
        statement = statement.where(ArtistProfile.commission_status == status.upper())
    if max_price:
        statement = statement.where(ArtistProfile.starting_price <= max_price)
        
    artists = session.exec(statement).all()
        
    results = []
    for a in artists:
        if query:
            q = query.lower()
            if q not in a.display_name.lower() and q not in a.handle.lower() and q not in a.bio.lower():
                continue
        if style and style.upper() != 'ALL':
            if style.lower() not in a.styles.lower():
                continue
        results.append(_build_profile_res(a, session))
        
    return results

@router.get("/{handle}", response_model=ArtistProfileResponse)
def get_artist_by_handle(handle: str, session: Session = Depends(get_session)):
    """Get complete public profile of a specific artist by handle"""
    statement = select(ArtistProfile).where(ArtistProfile.handle == handle.lower())
    artist = session.exec(statement).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")
        
    return _build_profile_res(artist, session)

@router.post("/{handle}/services", response_model=ArtistServiceResponse)
def add_artist_service(handle: str, req: ArtistServiceCreateRequest, session: Session = Depends(get_session)):
    """Add a new commission service package for an artist"""
    artist = session.exec(select(ArtistProfile).where(ArtistProfile.handle == handle.lower())).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
        
    svc = ArtistService(
        artist_id=artist.id,
        title=req.title,
        category=req.category,
        description=req.description,
        base_price=req.base_price,
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
