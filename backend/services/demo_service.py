"""Explicit local demo data; never changes existing accounts or their passwords."""
from sqlmodel import select
from models import User, ArtistProfile
from core.auth import get_password_hash

def seed_demo_accounts(session):
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

    existing_profile = session.exec(select(ArtistProfile).where(ArtistProfile.handle == "main_artist")).first()
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
            avatar_url="/demo/artist.svg",
            banner_url="/demo/banner.svg"
        )
        session.add(main_artist_profile)

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
