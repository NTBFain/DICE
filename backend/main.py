import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select

from core.db import init_db, get_session
from core.auth import get_password_hash
from models import Artwork, VisibilityStatus, User, ArtistProfile
from api.routers import api_router

app = FastAPI(
    title="DICE API",
    description="Backend API for Freelance Illustrator Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development flexibility
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    # Ensure upload directories exist
    os.makedirs("uploads/slips", exist_ok=True)
    os.makedirs("uploads/originals", exist_ok=True)
    os.makedirs("uploads/watermarked", exist_ok=True)
    os.makedirs("uploads/portfolio", exist_ok=True)
    with next(get_session()) as session:

        # Seed mock testing accounts: Admin, Artist, Client
        existing_admin = session.exec(select(User).where(User.email == "admin@example.com")).first()
        if not existing_admin:
            admin_user = User(
                email="admin@example.com",
                full_name="System Admin",
                hashed_password=get_password_hash("password123"),
                is_admin=True,
                is_artist=False
            )
            session.add(admin_user)
            session.commit()
            session.refresh(admin_user)
            existing_admin = admin_user
        else:
            existing_admin.is_admin = True
            existing_admin.is_artist = False
            existing_admin.full_name = "System Admin"
            session.add(existing_admin)
            session.commit()

        existing_artist = session.exec(select(User).where(User.email == "artist@example.com")).first()
        if not existing_artist:
            artist_user = User(
                email="artist@example.com",
                full_name="Main Artist",
                hashed_password=get_password_hash("password123"),
                is_admin=False,
                is_artist=True
            )
            session.add(artist_user)
            session.commit()
            session.refresh(artist_user)
            existing_artist = artist_user
        else:
            existing_artist.is_artist = True
            session.add(existing_artist)
            session.commit()
            
        existing_profile = session.exec(select(ArtistProfile).where(ArtistProfile.handle == "main_artist")).first()
        if not existing_profile:
            existing_profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == existing_admin.id)).first()

        if not existing_profile:
            main_artist_profile = ArtistProfile(
                user_id=existing_artist.id,
                handle="main_artist",
                display_name="Main Artist Studio",
                tagline="Professional 2D Illustrator & VTuber Rigger",
                bio="ยินดีต้อนรับสู่สตูดิโอของ Main Artist! รับวาดภาพประกอบ 2D, ออกแบบตัวละคร, และทำโมเดล VTuber อย่างมืออาชีพ",
                styles="Anime, VTuber 2D, Character Sheet",
                commission_status="OPEN",
                starting_price=1000.0,
                is_verified=True,
                is_featured=True,
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
                banner_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
            )
            session.add(main_artist_profile)
        else:
            existing_profile.user_id = existing_artist.id
            session.add(existing_profile)
            
        existing_client = session.exec(select(User).where(User.email == "client@example.com")).first()
        if not existing_client:
            client_user = User(
                email="client@example.com",
                full_name="Valued Client",
                hashed_password=get_password_hash("password123"),
                is_admin=False,
                is_artist=False
            )
            session.add(client_user)
            
        session.commit()

from fastapi import WebSocket, WebSocketDisconnect, Query
from core.websocket import manager
from core.auth import decode_access_token

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4003)
        return
        
    email = payload.get("sub")
    if not email:
        await websocket.close(code=4003)
        return
        
    from core.db import engine
    from sqlmodel import Session
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            await websocket.close(code=4003)
            return
        user_id = user.id
        
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection open and receive messages if any
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)

@app.get("/")
def read_root():
    return {"message": "Welcome to DICE API"}

app.include_router(api_router)

