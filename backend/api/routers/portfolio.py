import os
import shutil
import secrets
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FormFile, Form
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session, select
from typing import List

from core.db import get_session
from core.auth import get_admin_user
from models import Artwork, VisibilityStatus, User, ArtistProfile
from schemas import ArtworkResponse

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

@router.get("", response_model=List[ArtworkResponse])
def get_portfolio(session: Session = Depends(get_session)):
    statement = select(Artwork).where(Artwork.visibility_status == VisibilityStatus.PUBLIC)
    artworks = session.exec(statement).all()
    return artworks

@router.get("/admin", response_model=List[ArtworkResponse])
def get_portfolio_admin(session: Session = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == admin_user.id)).first()
    if profile:
        artworks = session.exec(select(Artwork).where(Artwork.artist_id == profile.id)).all()
    else:
        artworks = session.exec(select(Artwork)).all()
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
    admin_user: User = Depends(get_admin_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == admin_user.id)).first()
    artist_id = profile.id if profile else None

    ext = image.filename.split(".")[-1].lower() if image.filename and "." in image.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(status_code=400, detail="Invalid image extension. Allowed: jpg, jpeg, png, webp, gif")
    filename = f"{secrets.token_hex(8)}.{ext}"
    filepath = os.path.join("uploads/portfolio", filename)
    
    with open(filepath, "wb") as f:
        shutil.copyfileobj(image.file, f)
        
    image_url = f"/api/portfolio/images/{filename}"
    
    artwork = Artwork(
        title=title,
        description=description,
        image_url=image_url,
        visibility_status=VisibilityStatus(visibility_status),
        work_type=work_type,
        character_id=character_id,
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
    admin_user: User = Depends(get_admin_user)
):
    artwork = session.get(Artwork, artwork_id)
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")
        
    if title is not None:
        artwork.title = title
    if description is not None:
        artwork.description = description
    if visibility_status is not None:
        artwork.visibility_status = VisibilityStatus(visibility_status)
    if work_type is not None:
        artwork.work_type = work_type
    if character_id is not None:
        # 0 means unsetting the character
        if character_id == 0:
            artwork.character_id = None
        else:
            artwork.character_id = character_id
            
    session.add(artwork)
    session.commit()
    session.refresh(artwork)
    return artwork

@router.delete("/{artwork_id}")
def delete_artwork(artwork_id: int, session: Session = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    artwork = session.get(Artwork, artwork_id)
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")
    session.delete(artwork)
    session.commit()
    return {"message": "Artwork deleted"}
