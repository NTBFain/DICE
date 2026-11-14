import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FormFile, Form
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session, select
from typing import List

from core.db import get_session
from core.auth import get_admin_user, get_artist_user
from core.security_file import validate_and_save_upload
from models import Artwork, VisibilityStatus, WorkType, User, ArtistProfile, Character
from schemas import ArtworkResponse

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

from typing import List, Optional

@router.get("", response_model=List[ArtworkResponse])
def get_portfolio(
    limit: Optional[int] = None,
    offset: int = 0,
    artist_id: Optional[int] = None,
    work_type: Optional[str] = None,
    character_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    statement = select(Artwork).where(Artwork.visibility_status == VisibilityStatus.PUBLIC)
    if artist_id:
        statement = statement.where(Artwork.artist_id == artist_id)
    if work_type and work_type.upper() != "ALL":
        try:
            wt_enum = WorkType(work_type.upper())
            statement = statement.where(Artwork.work_type == wt_enum)
        except ValueError:
            pass
    if character_id:
        statement = statement.where(Artwork.character_id == character_id)
    statement = statement.order_by(Artwork.created_at.desc(), Artwork.id.desc())
    if limit is not None and limit > 0:
        statement = statement.offset(offset).limit(limit)
    artworks = session.exec(statement).all()
    return artworks

@router.get("/admin", response_model=List[ArtworkResponse])
def get_portfolio_admin(session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    if artist_user.is_admin:
        artworks = session.exec(select(Artwork)).all()
    else:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if profile:
            artworks = session.exec(select(Artwork).where(Artwork.artist_id == profile.id)).all()
        else:
            artworks = []
    return artworks

@router.post("", response_model=ArtworkResponse)
def create_artwork(
    title: str = Form(...),
    description: str = Form(None),
    visibility_status: str = Form("PUBLIC"),
    work_type: str = Form("ILLUSTRATION"),
    character_id: int = Form(None),
    image: UploadFile = FormFile(...),
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
    if not profile and not artist_user.is_admin:
        raise HTTPException(status_code=400, detail="You must register an artist profile before adding portfolio items")
        
    artist_id = profile.id if profile else None

    try:
        vis_enum = VisibilityStatus(visibility_status.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid visibility_status. Allowed: PUBLIC, PRIVATE")

    # Character ownership check
    if character_id and character_id > 0:
        character = session.get(Character, character_id)
        if not character:
            raise HTTPException(status_code=404, detail="Referenced character not found")
        if not artist_user.is_admin and profile and character.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Cannot link artwork to a character belonging to another artist")

    ext = os.path.splitext(image.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid image extension. Allowed: {ALLOWED_IMAGE_EXTENSIONS}")
        
    filename = f"port_{secrets.token_hex(8)}{ext}"
    filepath = os.path.join("uploads/portfolio", filename)
    
    validate_and_save_upload(image, filepath, max_size=25 * 1024 * 1024, is_deliverable=False)
        
    image_url = f"/api/portfolio/images/{filename}"
    
    artwork = Artwork(
        title=title.strip(),
        description=description.strip() if description else None,
        image_url=image_url,
        visibility_status=vis_enum,
        work_type=work_type.strip(),
        character_id=character_id if (character_id and character_id > 0) else None,
        artist_id=artist_id
    )
    session.add(artwork)
    session.commit()
    session.refresh(artwork)
    return artwork

@router.get("/images/{filename}")
def get_portfolio_image(filename: str):
    filename = os.path.basename(filename)
    path = os.path.join("uploads/portfolio", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return SecureFileResponse(path)

@router.put("/{artwork_id}", response_model=ArtworkResponse)
def update_artwork(
    artwork_id: int,
    title: str = Form(None),
    description: str = Form(None),
    visibility_status: str = Form(None),
    work_type: str = Form(None),
    character_id: int = Form(None),
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user)
):
    artwork = session.get(Artwork, artwork_id)
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")
        
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
    if not artist_user.is_admin:
        if not profile or artwork.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this artwork")
        
    if title is not None:
        artwork.title = title.strip()
    if description is not None:
        artwork.description = description.strip()
    if visibility_status is not None:
        try:
            artwork.visibility_status = VisibilityStatus(visibility_status.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid visibility_status. Allowed: PUBLIC, PRIVATE")
            
    if work_type is not None:
        artwork.work_type = work_type.strip()
        
    if character_id is not None:
        if character_id == 0:
            artwork.character_id = None
        else:
            character = session.get(Character, character_id)
            if not character:
                raise HTTPException(status_code=404, detail="Referenced character not found")
            if not artist_user.is_admin and profile and character.artist_id != profile.id:
                raise HTTPException(status_code=403, detail="Cannot link artwork to a character belonging to another artist")
            artwork.character_id = character_id
            
    session.add(artwork)
    session.commit()
    session.refresh(artwork)
    return artwork

@router.delete("/{artwork_id}")
def delete_artwork(artwork_id: int, session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    artwork = session.get(Artwork, artwork_id)
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")
        
    if not artist_user.is_admin:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if not profile or artwork.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this artwork")
            
    # Delete image file from disk if local
    if artwork.image_url and "/api/portfolio/images/" in artwork.image_url:
        filename = os.path.basename(artwork.image_url)
        path = os.path.join("uploads/portfolio", filename)
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
                
    session.delete(artwork)
    session.commit()
    return {"message": "Artwork deleted"}
