from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File as FormFile
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session, select
from typing import List
import os
import shutil
import secrets

from core.db import get_session
from core.auth import get_admin_user
from models import Character, User, ArtistProfile
from schemas import CharacterResponse

router = APIRouter(prefix="/api/characters", tags=["characters"])

@router.get("", response_model=List[CharacterResponse])
def get_characters(session: Session = Depends(get_session)):
    characters = session.exec(select(Character)).all()
    return characters

@router.post("", response_model=CharacterResponse)
def create_character(
    name: str = Form(...),
    description: str = Form(None),
    theme_color: str = Form(None),
    image: UploadFile = FormFile(None),
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == admin_user.id)).first()
    artist_id = profile.id if profile else None

    image_url = None
    if image:
        ext = image.filename.split(".")[-1].lower() if image.filename and "." in image.filename else "jpg"
        if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
            raise HTTPException(status_code=400, detail="Invalid image extension. Allowed: jpg, jpeg, png, webp, gif")
        filename = f"char_{secrets.token_hex(8)}.{ext}"
        os.makedirs("uploads/characters", exist_ok=True)
        filepath = os.path.join("uploads/characters", filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_url = f"/api/characters/images/{filename}"

    character = Character(
        name=name,
        description=description,
        theme_color=theme_color,
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
    admin_user: User = Depends(get_admin_user)
):
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
        
    if name is not None:
        character.name = name
    if description is not None:
        character.description = description
    if theme_color is not None:
        character.theme_color = theme_color
        
    if image:
        ext = image.filename.split(".")[-1].lower() if image.filename and "." in image.filename else "jpg"
        if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
            raise HTTPException(status_code=400, detail="Invalid image extension. Allowed: jpg, jpeg, png, webp, gif")
        filename = f"char_{secrets.token_hex(8)}.{ext}"
        os.makedirs("uploads/characters", exist_ok=True)
        filepath = os.path.join("uploads/characters", filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(image.file, f)
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
    admin_user: User = Depends(get_admin_user)
):
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    session.delete(character)
    session.commit()
    return {"message": "Character deleted successfully"}
