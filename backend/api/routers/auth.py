from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File as FastAPIFile
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from core.db import get_session
from core.auth import get_password_hash, verify_password, create_access_token, get_current_user, get_admin_user
from core.security_file import validate_and_save_upload
from models import User, Order, Auction, File, ArtistProfile, ArtistService, ArtistReview, Artwork, Character
from schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse, UserUpdateRequest
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register_user(request: UserRegisterRequest, session: Session = Depends(get_session)):
    clean_email = request.email.strip().lower()
    existing = session.exec(select(User).where(User.email == clean_email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if len(request.password) < 8 or len(request.password) > 128:
        raise HTTPException(status_code=400, detail="Password must be between 8 and 128 characters long")
        
    hashed_pwd = get_password_hash(request.password)
    user = User(
        email=clean_email,
        full_name=request.full_name.strip(),
        hashed_password=hashed_pwd,
        is_admin=False,  # Enforce False for standard public registrations
        is_artist=request.is_artist,
        facebook_id=request.facebook_id,
        avatar_url=request.avatar_url
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
def login_user(request: UserLoginRequest, session: Session = Depends(get_session)):
    clean_email = request.email.strip().lower()
    user = session.exec(select(User).where(User.email == clean_email)).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return TokenResponse(
        access_token=access_token,
        is_admin=user.is_admin,
        is_artist=user.is_artist,
        email=user.email,
        full_name=user.full_name
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(request: UserUpdateRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if request.full_name is not None:
        current_user.full_name = request.full_name.strip()
    if request.avatar_url is not None:
        current_user.avatar_url = request.avatar_url
        
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@router.post("/me/avatar")
def upload_avatar(
    file: UploadFile = FastAPIFile(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid avatar format. Allowed: JPG, PNG, WebP")
        
    filename = f"avatar_{uuid.uuid4().hex}{ext}"
    upload_dir = "uploads/portfolio"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    
    # Enforce magic bytes verification and 5MB size limit
    validate_and_save_upload(file, file_path, max_size=5 * 1024 * 1024, is_deliverable=False)
        
    url = f"/api/portfolio/images/{filename}"
    current_user.avatar_url = url
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {"url": url}

@router.get("/me/collection")
def get_my_collection(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    orders = session.exec(select(Order).where(Order.client_id == current_user.id, Order.status == "COMPLETED")).all()
    auctions = session.exec(select(Auction).where(Auction.winner_id == current_user.id)).all()
    
    collection = []
    for order in orders:
        artist = session.get(User, order.artist_id)
        final_files = session.exec(select(File).where(File.order_id == order.id, File.file_type == "FINAL")).all()
        for f in final_files:
            collection.append({
                "id": f"order_{order.id}_{f.id}",
                "title": order.title,
                "type": "Auction" if order.auction_id is not None else "Commission",
                "image_url": f"/api/orders/{order.id}/files/{f.id}/download",
                "order_id": order.id,
                "filename": f.filename,
                "artist_name": artist.full_name if artist else "DICE Artist",
                "date": order.created_at
            })
            
    for auction in auctions:
        if auction.image_url:
            profile = session.get(ArtistProfile, auction.artist_id) if auction.artist_id else None
            linked_order = session.exec(select(Order).where(Order.auction_id == auction.id, Order.client_id == current_user.id)).first()
            collection.append({
                "id": f"auction_{auction.id}",
                "title": auction.title,
                "type": "Auction/Adoptable",
                "image_url": auction.image_url,
                "auction_id": auction.id,
                "order_id": linked_order.id if linked_order else None,
                "artist_name": profile.display_name if profile else "DICE Artist",
                "date": auction.created_at
            })
            
    collection.sort(key=lambda x: x["date"], reverse=True)
    return collection

class UserRoleUpdateRequest(BaseModel):
    is_admin: Optional[bool] = None
    is_artist: Optional[bool] = None

@router.get("/users")
def get_all_users(session: Session = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    users = session.exec(select(User)).all()
    res = []
    for u in users:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == u.id)).first()
        res.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_admin": u.is_admin,
            "is_artist": u.is_artist,
            "avatar_url": u.avatar_url,
            "created_at": u.created_at,
            "artist_handle": profile.handle if profile else None
        })
    return res

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    request: UserRoleUpdateRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    previous_roles = (user.is_admin, user.is_artist)
    if request.is_admin is not None:
        user.is_admin = request.is_admin
    if request.is_artist is not None:
        user.is_artist = request.is_artist
        
    session.add(user)
    session.commit()
    session.refresh(user)
    if previous_roles != (user.is_admin, user.is_artist):
        from core.websocket import manager
        background_tasks.add_task(
            manager.send_personal_message,
            {"type": "user_roles_updated", "data": {"user_id": user.id}},
            user.id,
        )
    return {"message": "User role updated successfully", "user": {"id": user.id, "email": user.email, "is_admin": user.is_admin, "is_artist": user.is_artist}}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == user.id)).first()
    if session.exec(select(Order).where(Order.artist_id == user.id)).first():
        raise HTTPException(status_code=409, detail="This artist has order history. Transfer or resolve associated records before deleting the account.")
    if profile:
        for model in (ArtistService, ArtistReview, Artwork, Character, Auction):
            if session.exec(select(model).where(model.artist_id == profile.id)).first():
                raise HTTPException(status_code=409, detail="This artist has studio content. Remove or transfer that content before deleting the account.")
    try:
        if profile:
            session.delete(profile)
            session.flush()
        session.delete(user)
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="This account still has linked records and cannot be deleted yet.") from exc
    return {"message": "User deleted successfully"}
