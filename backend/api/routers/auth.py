from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from sqlmodel import Session, select
from core.db import get_session
from core.auth import get_password_hash, verify_password, create_access_token, get_current_user
from models import User, Order, Auction, File
from schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse, UserUpdateRequest
from typing import List, Dict, Any
import os
import uuid
import shutil

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register_user(request: UserRegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == request.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # First user registered in the system will automatically become Admin
    has_users = session.exec(select(User)).first()
    is_admin = False if has_users else True
    
    hashed_pwd = get_password_hash(request.password)
    user = User(
        email=request.email,
        full_name=request.full_name,
        hashed_password=hashed_pwd,
        is_admin=is_admin,
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
    user = session.exec(select(User).where(User.email == request.email)).first()
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
        current_user.full_name = request.full_name
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
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = "uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"http://127.0.0.1:8000/api/portfolio/images/{filename}" # re-using portfolio static files or maybe just standard
    
    current_user.avatar_url = url
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {"url": url}

@router.get("/me/collection")
def get_my_collection(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # 1. Get COMPLETED orders
    orders = session.exec(select(Order).where(Order.client_id == current_user.id, Order.status == "COMPLETED")).all()
    
    # 2. Get WON auctions
    auctions = session.exec(select(Auction).where(Auction.winner_id == current_user.id)).all()
    
    collection = []
    
    for order in orders:
        # Get final files for this order
        final_files = session.exec(select(File).where(File.order_id == order.id, File.file_type == "FINAL")).all()
        for f in final_files:
            collection.append({
                "id": f"order_{order.id}_{f.id}",
                "title": order.title,
                "type": "Commission",
                "image_url": f"/api/orders/{order.id}/files/{f.id}/download",
                "artist_name": order.artist.display_name if order.artist else "Unknown Artist",
                "date": order.created_at
            })
            
    for auction in auctions:
        if auction.image_url:
            collection.append({
                "id": f"auction_{auction.id}",
                "title": auction.title,
                "type": "Auction/Adoptable",
                "image_url": auction.image_url,
                "artist_name": auction.artist.display_name if auction.artist else "Unknown Artist",
                "date": auction.created_at
            })
            
    # Sort by date
    collection.sort(key=lambda x: x["date"], reverse=True)
    
    return collection

