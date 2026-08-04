from sqlmodel import Session, select
from core.db import engine
from models import User, ArtistProfile, Artwork, Character, Order, Auction, Notification

def clean_data():
    with Session(engine) as session:
        fake_emails = [
            'artist1@example.com', 'artist2@example.com', 'artist3@example.com',
            'client1@example.com', 'client2@example.com', 'client3@example.com', 'client4@example.com'
        ]
        
        users = session.exec(select(User).where(User.email.in_(fake_emails))).all()
        user_ids = [u.id for u in users]
        
        if not user_ids:
            print("No fake users found.")
            return

        # SQLite delete needs to be done carefully if foreign keys are enforced
        # Just to be safe, delete related records first
        
        # Artworks (Artist)
        artworks = session.exec(select(Artwork).where(Artwork.artist_id.in_(user_ids))).all()
        for a in artworks: session.delete(a)
            
        # Characters (Artist)
        chars = session.exec(select(Character).where(Character.artist_id.in_(user_ids))).all()
        for c in chars: session.delete(c)
            
        # Delete dependent data for Orders
        orders = session.exec(select(Order).where((Order.artist_id.in_(user_ids)) | (Order.client_id.in_(user_ids)))).all()
        order_ids = [o.id for o in orders]
        if order_ids:
            from models import File, Message, MilestoneInvoice, Revision
            # Files
            files = session.exec(select(File).where(File.order_id.in_(order_ids))).all()
            for f in files: session.delete(f)
            # Messages
            msgs = session.exec(select(Message).where(Message.order_id.in_(order_ids))).all()
            for m in msgs: session.delete(m)
            # Invoices
            invs = session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id.in_(order_ids))).all()
            for i in invs: session.delete(i)
            # Revisions
            revs = session.exec(select(Revision).where(Revision.order_id.in_(order_ids))).all()
            for r in revs: session.delete(r)
            
        # Delete dependent data for Auctions
        auctions = session.exec(select(Auction).where((Auction.artist_id.in_(user_ids)) | (Auction.winner_id.in_(user_ids)))).all()
        auction_ids = [a.id for a in auctions]
        if auction_ids:
            from models import Bid, AuctionMessage
            bids = session.exec(select(Bid).where(Bid.auction_id.in_(auction_ids))).all()
            for b in bids: session.delete(b)
            amsgs = session.exec(select(AuctionMessage).where(AuctionMessage.auction_id.in_(auction_ids))).all()
            for m in amsgs: session.delete(m)

        for a in auctions: session.delete(a)
        for o in orders: session.delete(o)
            
        # Notifications (User)
        notifs = session.exec(select(Notification).where(Notification.user_id.in_(user_ids))).all()
        for n in notifs: session.delete(n)
            
        # Profiles (Artist)
        profiles = session.exec(select(ArtistProfile).where(ArtistProfile.user_id.in_(user_ids))).all()
        for p in profiles:
            from models import ArtistService, ArtistReview
            srvs = session.exec(select(ArtistService).where(ArtistService.artist_id == p.id)).all()
            for s in srvs: session.delete(s)
            revs = session.exec(select(ArtistReview).where(ArtistReview.artist_id == p.id)).all()
            for r in revs: session.delete(r)
            session.delete(p)
            
        # Users
        for u in users: session.delete(u)
            
        session.commit()
        print("Successfully deleted fake data.")

if __name__ == "__main__":
    clean_data()
