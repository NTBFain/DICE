import os
import shutil
import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, select
from core.db import engine, init_db
from core.auth import get_password_hash
from core.time import utcnow
from models import (
    User, ArtistProfile, Character, Artwork, Auction, Bid, AuctionStatus, AuctionType, VisibilityStatus, WorkType,
    ArtistService, ArtistCommissionPolicy, ServiceAddon, CommissionRequest, CommissionRequestStatus, AddonPriceType
)

# 1. Backup the database before adding fake data
DB_FILE = "test.db"
BACKUP_FILE = "test.db.pre_fake_backup"

if os.path.exists(DB_FILE):
    shutil.copy(DB_FILE, BACKUP_FILE)
    print(f"Backed up {DB_FILE} to {BACKUP_FILE}")

def seed_data():
    init_db()
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

        # Create Commission Policies and Services
        policies_data = [
            {
                "profile": artist_profiles[0],  # Akira
                "tos": "1. Personal use by default unless Commercial Add-on purchased.\n2. 3 revision stages: Sketch, Lineart, Final Color.\n3. Do not claim authorship or resell original files.\n4. Artist reserves the right to post finished artwork to portfolio.",
                "refund": "Full refund if cancelled before sketch begins. 50% refund after sketch approval. No refund after final coloring.",
                "will": ["OCs", "Fanart", "Anime / Manga style", "Fantasy / Sci-Fi armor", "Detailed backgrounds"],
                "wont": ["NFT / Crypto", "Gore / Extreme violence", "Hate speech / Political propaganda"],
                "services": [
                    {
                        "title": "Bust-up / Icon Commission",
                        "category": "Illustration",
                        "desc": "High quality headshot or bust illustration with clean lineart and vibrant colors. Perfect for social media avatars.",
                        "price": 45.0,
                        "days": 5,
                        "slots": 3,
                        "open": True,
                        "addons": [
                            {"name": "Commercial Rights (+50%)", "type": AddonPriceType.PERCENTAGE, "val": 50.0},
                            {"name": "Simple Decorative Background", "type": AddonPriceType.FIXED, "val": 15.0},
                            {"name": "Rush Order (3 Days)", "type": AddonPriceType.FIXED, "val": 25.0},
                        ]
                    },
                    {
                        "title": "Full-body Character Art",
                        "category": "Character Design",
                        "desc": "Complete character render from head to toe with lighting effects and weapon/props included.",
                        "price": 120.0,
                        "days": 14,
                        "slots": 2,
                        "open": True,
                        "addons": [
                            {"name": "Commercial Rights (+50%)", "type": AddonPriceType.PERCENTAGE, "val": 50.0},
                            {"name": "Full Scenic Background", "type": AddonPriceType.FIXED, "val": 60.0},
                            {"name": "Additional Character (+80%)", "type": AddonPriceType.PERCENTAGE, "val": 80.0},
                            {"name": "Layered PSD Source File", "type": AddonPriceType.FIXED, "val": 30.0},
                        ]
                    }
                ]
            },
            {
                "profile": artist_profiles[1],  # Hana
                "tos": "1. For personal icons, banners, and streaming assets (credit required).\n2. Commercial use incurs +100% fee.\n3. Work starts upon deposit confirmation.",
                "refund": "70% refund before lineart phase, no refund after lineart completion.",
                "will": ["Chibi", "Cute animals & mascots", "Pastel aesthetic", "Couple art", "VTuber emotes"],
                "wont": ["Mecha", "Realistic portraits", "NSFW", "AI generation"],
                "services": [
                    {
                        "title": "Cute Chibi Character",
                        "category": "Chibi",
                        "desc": "Super cute chibi character with sparkling eyes and soft watercolor shading.",
                        "price": 35.0,
                        "days": 4,
                        "slots": 5,
                        "open": True,
                        "addons": [
                            {"name": "Pet / Mascot Companion", "type": AddonPriceType.FIXED, "val": 12.0},
                            {"name": "Twitch / Discord Emote Crop Pack", "type": AddonPriceType.FIXED, "val": 15.0},
                        ]
                    }
                ]
            },
            {
                "profile": artist_profiles[2],  # Zero
                "tos": "1. Standard non-exclusive personal license.\n2. Turnaround begins after brief & payment cleared.",
                "refund": "50% refund before final rendering. No refund once 3D/renders are delivered.",
                "will": ["Cyberpunk / Sci-fi", "Mecha & Exosuits", "Dark fantasy", "Hard-surface props"],
                "wont": ["Cute / Chibi", "NFT / AI training"],
                "services": [
                    {
                        "title": "Cyberpunk Concept Design",
                        "category": "Concept Art",
                        "desc": "Futuristic character or mecha armor concept design with callout sheets and high-tech detailing.",
                        "price": 180.0,
                        "days": 20,
                        "slots": 1,
                        "open": False,
                        "addons": [
                            {"name": "Full Turnaround (Front/Side/Back)", "type": AddonPriceType.FIXED, "val": 100.0},
                            {"name": "Commercial Game Asset License (+100%)", "type": AddonPriceType.PERCENTAGE, "val": 100.0},
                        ]
                    }
                ]
            }
        ]

        created_services = []
        for pdata in policies_data:
            prof = pdata["profile"]
            # Check or create policy
            policy = session.exec(select(ArtistCommissionPolicy).where(ArtistCommissionPolicy.artist_id == prof.id)).first()
            if not policy:
                policy = ArtistCommissionPolicy(
                    artist_id=prof.id,
                    terms_of_service=pdata["tos"],
                    refund_policy=pdata["refund"],
                    ai_policy="Strictly prohibit using deliverables for AI training.",
                    will_draw=pdata["will"],
                    wont_draw=pdata["wont"],
                    deposit_percent=50,
                    default_revision_quota=3,
                    version=1
                )
                session.add(policy)

            # Create Services & Addons
            for sdata in pdata["services"]:
                svc = session.exec(
                    select(ArtistService).where(
                        ArtistService.artist_id == prof.id,
                        ArtistService.title == sdata["title"]
                    )
                ).first()
                if not svc:
                    svc = ArtistService(
                        artist_id=prof.id,
                        title=sdata["title"],
                        category=sdata["category"],
                        description=sdata["desc"],
                        base_price=sdata["price"],
                        estimated_days=sdata["days"],
                        max_slots=sdata["slots"],
                        is_form_open=sdata["open"],
                        auto_close_on_full=True,
                        sort_order=0
                    )
                    session.add(svc)
                    session.commit()
                    session.refresh(svc)
                    for adata in sdata["addons"]:
                        addon = ServiceAddon(
                            service_id=svc.id,
                            name=adata["name"],
                            price_type=adata["type"],
                            price_value=adata["val"],
                            is_active=True
                        )
                        session.add(addon)
                    session.commit()
                created_services.append(svc)

        # Create a sample pending Commission Request from John (Client 1) to Akira
        if created_services and len(client_users) > 0:
            sample_svc = created_services[0]
            existing_req = session.exec(
                select(CommissionRequest).where(
                    CommissionRequest.client_id == client_users[0].id,
                    CommissionRequest.service_id == sample_svc.id
                )
            ).first()
            if not existing_req:
                mock_req = CommissionRequest(
                    character_name="Aether",
                    usage_type="COMMERCIAL",
                    brief="My OC named 'Aether'. He has silver spiky hair, blue glowing eyes, and wears a high-collar leather coat. Looking forward to a cool dynamic expression!",
                    canvas_size="A4 (Portrait)",
                    requested_deadline=utcnow() + timedelta(days=14),
                    reference_links="https://example.com/character-sheet",
                    reference_images=[],
                    addons_snapshot=[{"id": sample_svc.addons[0].id, "name": sample_svc.addons[0].name, "price_type": "PERCENTAGE", "price_value": 50.0}] if sample_svc.addons else [],
                    base_price_snapshot=sample_svc.base_price,
                    total_price=sample_svc.base_price * 1.5 if sample_svc.addons else sample_svc.base_price,
                    tos_snapshot=policies_data[0]["tos"],
                    tos_version=1,
                    service_id=sample_svc.id,
                    client_id=client_users[0].id,
                    artist_user_id=artist_users[0].id,
                    status=CommissionRequestStatus.PENDING
                )
                session.add(mock_req)
                session.commit()
                print("Created sample commission request for testing!")

        session.commit()
        print("Successfully generated fake data with commission policies and services!")

if __name__ == "__main__":
    seed_data()
