from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from .base import AuctionType, AuctionStatus

class AuctionBase(SQLModel):
    title: str
    description: str
    image_url: Optional[str] = None
    auction_type: AuctionType = Field(default=AuctionType.ADOPTABLE, index=True)
    status: AuctionStatus = Field(default=AuctionStatus.ACTIVE, index=True)
    starting_bid: float
    bid_increment: float
    auto_buy: Optional[float] = None
    start_time: datetime
    end_time: datetime = Field(index=True)
    winning_bid: Optional[float] = None
    artist_id: Optional[int] = Field(default=None, foreign_key="artistprofile.id", index=True)

class Auction(AuctionBase, table=True):
    original_key: Optional[str] = None
    original_filename: Optional[str] = None
    id: Optional[int] = Field(default=None, primary_key=True)
    winner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    bids: List["Bid"] = Relationship(back_populates="auction")
    winner: Optional["User"] = Relationship(sa_relationship_kwargs={"primaryjoin": "Auction.winner_id==User.id"})
    messages: List["AuctionMessage"] = Relationship(back_populates="auction")
    artist: Optional["ArtistProfile"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})

class BidBase(SQLModel):
    amount: float

class Bid(BidBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    auction_id: int = Field(foreign_key="auction.id", index=True)
    bidder_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    auction: Auction = Relationship(back_populates="bids")
    bidder: "User" = Relationship()

class AuctionMessageBase(SQLModel):
    content: str

class AuctionMessage(AuctionMessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    auction_id: int = Field(foreign_key="auction.id", index=True)
    sender_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    auction: Auction = Relationship(back_populates="messages")
    sender: "User" = Relationship()

