import os
import shutil
import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, select
from core.db import engine
from core.auth import get_password_hash
from models import User, ArtistProfile, Character, Artwork, Auction, Bid, AuctionStatus, AuctionType, VisibilityStatus, WorkType

# 1. Backup the database before adding fake data
DB_FILE = "test.db"
BACKUP_FILE = "test.db.pre_fake_backup"

if os.path.exists(DB_FILE):
    shutil.copy(DB_FILE, BACKUP_FILE)
    print(f"Backed up {DB_FILE} to {BACKUP_FILE}")

def seed_data():
    with Session(engine) as session:
        # Create Artists
        artists_data = [
            {"email": "artist1@example.com", "name": "Akira (Artist)", "handle": "akira_art", "display_name": "Akira Studio", "tagline": "Anime & Concept Art", "avatar": "https://i.pravatar.cc/150?u=akira"},
            {"email": "artist2@example.com", "name": "Hana (Artist)", "handle": "hana_draws", "display_name": "Hana Illustrations", "tagline": "Watercolor & Chibi", "avatar": "https://i.pravatar.cc/150?u=hana"},
            {"email": "artist3@example.com", "name": "Zero (Artist)", "handle": "zero_designs", "display_name": "Zero Concept", "tagline": "Mecha & Cyberpunk", "avatar": "https://i.pravatar.cc/150?u=zero"},
        ]
        
        artist_users = []
        artist_profiles = []
        
        for ad in artists_data:
            user = session.exec(select(User).where(User.email == ad["email"])).first()
            if not user:
                user = User(
                    email=ad["email"],
                    hashed_password=get_password_hash("password123"),
                    full_name=ad["name"],
                    is_admin=False,
                    is_artist=True
                )
                session.add(user)
                session.commit()
                session.refresh(user)
                print(f"Created artist user: {user.email}")
            artist_users.append(user)
            
            profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == user.id)).first()
            if not profile:
                profile = ArtistProfile(
                    user_id=user.id,
                    handle=ad["handle"],
                    display_name=ad["display_name"],
                    tagline=ad["tagline"],
                    bio=f"Hello! I am {ad['display_name']}. I love creating amazing art.",
                    avatar_url=ad["avatar"],
                    styles="Anime, Concept, Illustration",
                    starting_price=50.0,
                    commission_status="OPEN"
                )
                session.add(profile)
                session.commit()
                session.refresh(profile)
            artist_profiles.append(profile)

        # Create Clients
        clients_data = [
            {"email": "client1@example.com", "name": "John (Client)"},
            {"email": "client2@example.com", "name": "Alice (Client)"},
            {"email": "client3@example.com", "name": "Bob (Client)"},
            {"email": "client4@example.com", "name": "Eve (Client)"},
        ]
        
        client_users = []
        for cd in clients_data:
            user = session.exec(select(User).where(User.email == cd["email"])).first()
            if not user:
                user = User(
                    email=cd["email"],
                    hashed_password=get_password_hash("password123"),
                    full_name=cd["name"],
                    is_admin=False
                )
                session.add(user)
                session.commit()
                session.refresh(user)
                print(f"Created client user: {user.email}")
            client_users.append(user)
            
        # Create Characters
        characters = []
        for i, profile in enumerate(artist_profiles):
            char = Character(
                name=f"OC Alpha by {profile.display_name}",
                description=f"A very cool original character designed by {profile.display_name}.",
                theme_color="#3b82f6",
                image_url=f"https://picsum.photos/seed/char{i}a/400/400",
                artist_id=profile.id
            )
            session.add(char)
            
            char2 = Character(
                name=f"OC Beta by {profile.display_name}",
                description=f"Another awesome original character designed by {profile.display_name}.",
                theme_color="#ef4444",
                image_url=f"https://picsum.photos/seed/char{i}b/400/400",
                artist_id=profile.id
            )
            session.add(char2)
            session.commit()
            characters.extend([char, char2])
            
        # Create Artworks
        for i, profile in enumerate(artist_profiles):
            art1 = Artwork(
                title=f"Sunset Dream by {profile.display_name}",
                description="A beautiful piece of art.",
                image_url=f"https://picsum.photos/seed/art{i}a/800/600",
                visibility_status=VisibilityStatus.PUBLIC,
                work_type=WorkType.COMMISSION,
                artist_id=profile.id,
                character_id=characters[i*2].id
            )
            session.add(art1)
            
            art2 = Artwork(
                title=f"Cyber City by {profile.display_name}",
                description="Sci-fi inspired illustration.",
                image_url=f"https://picsum.photos/seed/art{i}b/600/800",
                visibility_status=VisibilityStatus.PUBLIC,
                work_type=WorkType.FANART,
                artist_id=profile.id
            )
            session.add(art2)
            
            art3 = Artwork(
                title=f"Fantasy Realm by {profile.display_name}",
                description="High fantasy landscape.",
                image_url=f"https://picsum.photos/seed/art{i}c/800/800",
                visibility_status=VisibilityStatus.PUBLIC,
                work_type=WorkType.COMMISSION,
                artist_id=profile.id,
                character_id=characters[(i*2)+1].id
            )
            session.add(art3)
        session.commit()

        # Create Auctions
        now = datetime.utcnow()
        auctions = []
        for i, profile in enumerate(artist_profiles):
            # Active Auction
            auc1 = Auction(
                title=f"Commission Slot - {profile.display_name}",
                description="Full body illustration commission slot.",
                image_url=f"https://picsum.photos/seed/auc{i}a/600/600",
                auction_type=AuctionType.COMMISSION_SLOT,
                status=AuctionStatus.ACTIVE,
                starting_bid=100.0,
                bid_increment=10.0,
                auto_buy=500.0,
                start_time=now - timedelta(hours=2),
                end_time=now + timedelta(days=2),
                artist_id=profile.id
            )
            session.add(auc1)
            
            # Ended Auction
            auc2 = Auction(
                title=f"Adoptable Character - {profile.display_name}",
                description="Exclusive adoptable character design.",
                image_url=f"https://picsum.photos/seed/auc{i}b/600/600",
                auction_type=AuctionType.ADOPTABLE,
                status=AuctionStatus.ENDED,
                starting_bid=50.0,
                bid_increment=5.0,
                auto_buy=300.0,
                start_time=now - timedelta(days=5),
                end_time=now - timedelta(days=1),
                artist_id=profile.id,
                winner_id=client_users[i].id,
                winning_bid=150.0
            )
            session.add(auc2)
            session.commit()
            session.refresh(auc1)
            session.refresh(auc2)
            auctions.extend([auc1, auc2])

        # Create Bids
        import random
        for auc in auctions:
            if auc.status == AuctionStatus.ACTIVE:
                current_bid = auc.starting_bid
                for _ in range(random.randint(1, 5)):
                    current_bid += auc.bid_increment
                    bid = Bid(
                        auction_id=auc.id,
                        bidder_id=random.choice(client_users).id,
                        amount=current_bid,
                        created_at=now - timedelta(minutes=random.randint(1, 60))
                    )
                    session.add(bid)
            elif auc.status == AuctionStatus.ENDED:
                bid1 = Bid(
                    auction_id=auc.id,
                    bidder_id=auc.winner_id,
                    amount=auc.winning_bid,
                    created_at=auc.end_time - timedelta(hours=1)
                )
                session.add(bid1)
                
        session.commit()
        print("Successfully generated fake data!")

if __name__ == "__main__":
    seed_data()
