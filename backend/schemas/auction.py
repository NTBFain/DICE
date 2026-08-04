from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .artist import ArtistBasicResponse

class BidCreateRequest(BaseModel):
    amount: float

class BidResponse(BaseModel):
    id: int
    auction_id: int
    bidder_id: int
    amount: float
    created_at: datetime
    bidder_name: str

class AuctionCreateRequest(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = None
    auction_type: str
    starting_bid: float
    bid_increment: float
    auto_buy: Optional[float] = None
    start_time: datetime
    end_time: datetime

class AuctionUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    auto_buy: Optional[float] = None
    end_time: Optional[datetime] = None

class AuctionMessageCreateRequest(BaseModel):
    content: str

class AuctionMessageResponse(BaseModel):
    id: int
    auction_id: int
    sender_id: int
    sender_name: str
    is_artist: bool
    content: str
    created_at: datetime

class AuctionResponse(BaseModel):
    id: int
    title: str
    description: str
    image_url: Optional[str] = None
    auction_type: str
    status: str
    starting_bid: float
    bid_increment: float
    auto_buy: Optional[float] = None
    start_time: datetime
    end_time: datetime
    winner_id: Optional[int] = None
    winner_name: Optional[str] = None
    winning_bid: Optional[float] = None
    created_at: datetime
    bids: Optional[List[BidResponse]] = None
    messages: Optional[List[AuctionMessageResponse]] = None
    artist: Optional[ArtistBasicResponse] = None

