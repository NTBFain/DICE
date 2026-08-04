from sqlmodel import Session, select
from core.db import engine
from models import Auction, Bid, AuctionMessage, ArtistProfile, Character, Artwork

def clean_orphans():
    with Session(engine) as session:
        # Find all valid artist_profile ids
        valid_artist_ids = [p.id for p in session.exec(select(ArtistProfile)).all()]
        
        # Auctions
        auctions = session.exec(select(Auction)).all()
        for auc in auctions:
            if auc.artist_id not in valid_artist_ids and auc.artist_id is not None:
                print(f"Deleting orphaned auction {auc.id}")
                # Delete related bids and messages
                bids = session.exec(select(Bid).where(Bid.auction_id == auc.id)).all()
                for b in bids: session.delete(b)
                msgs = session.exec(select(AuctionMessage).where(AuctionMessage.auction_id == auc.id)).all()
                for m in msgs: session.delete(m)
                session.delete(auc)
                
        # Characters
        chars = session.exec(select(Character)).all()
        for c in chars:
            if c.artist_id not in valid_artist_ids and c.artist_id is not None:
                print(f"Deleting orphaned character {c.id}")
                session.delete(c)
                
        # Artworks
        arts = session.exec(select(Artwork)).all()
        for a in arts:
            if a.artist_id not in valid_artist_ids and a.artist_id is not None:
                print(f"Deleting orphaned artwork {a.id}")
                session.delete(a)

        session.commit()
        print("Cleaned up orphaned data.")

if __name__ == "__main__":
    clean_orphans()
