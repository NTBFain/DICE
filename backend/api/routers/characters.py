from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File as FormFile
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session, select
from typing import List
import os
import secrets
import re

from core.db import get_session
from core.auth import get_admin_user, get_artist_user
from core.security_file import validate_and_save_upload
from models import Character, User, ArtistProfile, Artwork
from schemas import CharacterResponse

router = APIRouter(prefix="/api/characters", tags=["characters"])

ALLOWED_CHARACTER_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _validated_theme_colour(value):
    if value is None or not value.strip():
        return None
    colour = value.strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", colour):
        raise HTTPException(status_code=422, detail="Character colour must be a six-digit hex value, such as #3366FF.")
    return colour


@router.get("", response_model=List[CharacterResponse])
def get_characters(session: Session = Depends(get_session)):
    characters = session.exec(select(Character)).all()
    return characters

@router.get("/admin", response_model=List[CharacterResponse])
def get_characters_admin(session: Session = Depends(get_session), artist_user: User = Depends(get_artist_user)):
    if artist_user.is_admin:
        return session.exec(select(Character)).all()
    else:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if profile:
            return session.exec(select(Character).where(Character.artist_id == profile.id)).all()
        return []

@router.post("", response_model=CharacterResponse)
def create_character(
    name: str = Form(...),
    description: str = Form(None),
    theme_color: str = Form(None),
    image: UploadFile = FormFile(None),
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
    if not profile and not artist_user.is_admin:
        raise HTTPException(status_code=400, detail="You must register an artist profile before adding characters")
        
    artist_id = profile.id if profile else None
    validated_colour = _validated_theme_colour(theme_color)

    image_url = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in ALLOWED_CHARACTER_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid image extension. Allowed: {ALLOWED_CHARACTER_IMAGE_EXTENSIONS}")
            
        filename = f"char_{secrets.token_hex(8)}{ext}"
        os.makedirs("uploads/characters", exist_ok=True)
        filepath = os.path.join("uploads/characters", filename)
        
        validate_and_save_upload(image, filepath, max_size=25 * 1024 * 1024, is_deliverable=False)
        image_url = f"/api/characters/images/{filename}"

    character = Character(
        name=name.strip(),
        description=description.strip() if description else None,
        theme_color=validated_colour,
        image_url=image_url,
        artist_id=artist_id
    )
    session.add(character)
    session.commit()
    session.refresh(character)
    return character

@router.put("/{character_id}", response_model=CharacterResponse)
def update_character(
    character_id: int,
    name: str = Form(None),
    description: str = Form(None),
    theme_color: str = Form(None),
    image: UploadFile = FormFile(None),
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user)
):
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
    if not artist_user.is_admin:
        if not profile or character.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this character")

    validated_colour = _validated_theme_colour(theme_color)
    if name is not None:
        character.name = name.strip()
    if description is not None:
        character.description = description.strip()
    if theme_color is not None:
        character.theme_color = validated_colour
        
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in ALLOWED_CHARACTER_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid image extension. Allowed: {ALLOWED_CHARACTER_IMAGE_EXTENSIONS}")
            
        filename = f"char_{secrets.token_hex(8)}{ext}"
        os.makedirs("uploads/characters", exist_ok=True)
        filepath = os.path.join("uploads/characters", filename)
        
        validate_and_save_upload(image, filepath, max_size=25 * 1024 * 1024, is_deliverable=False)
        character.image_url = f"/api/characters/images/{filename}"
    
    session.add(character)
    session.commit()
    session.refresh(character)
    return character

@router.get("/images/{filename}")
def get_character_image(filename: str):
    filename = os.path.basename(filename)
    path = os.path.join("uploads/characters", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return SecureFileResponse(path)

@router.delete("/{character_id}")
def delete_character(
    character_id: int,
    session: Session = Depends(get_session),
    artist_user: User = Depends(get_artist_user)
):
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
    if not artist_user.is_admin:
        if not profile or character.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this character")

    image_path = None
    if character.image_url and "/api/characters/images/" in character.image_url:
        image_path = os.path.join("uploads/characters", os.path.basename(character.image_url))

    # Keep artworks, removing only their link to the deleted character.
    for artwork in session.exec(select(Artwork).where(Artwork.character_id == character.id)).all():
        artwork.character_id = None
        session.add(artwork)
    session.flush()
    session.delete(character)
    session.commit()
    if image_path and os.path.exists(image_path):
        try:
            os.remove(image_path)
        except OSError:
            pass
    return {"message": "Character deleted successfully"}
