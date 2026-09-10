from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .artist import ArtistBasicResponse

class BidCreateRequest(BaseModel):
    amount: float = Field(..., gt=0, le=100_000_000, allow_inf_nan=False)

class BidResponse(BaseModel):
    id: int
    auction_id: int
    bidder_id: int
    amount: float
    created_at: datetime
    bidder_name: str

class AuctionCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=3000)
    image_url: Optional[str] = None
    auction_type: str
    starting_bid: float = Field(..., gt=0, le=10_000_000, allow_inf_nan=False)
    bid_increment: float = Field(..., gt=0, le=1_000_000, allow_inf_nan=False)
    auto_buy: Optional[float] = Field(None, gt=0, le=50_000_000, allow_inf_nan=False)
    start_time: datetime
    end_time: datetime

class AuctionUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = Field(None, min_length=1, max_length=3000)
    auto_buy: Optional[float] = Field(None, gt=0, le=50_000_000, allow_inf_nan=False)
    end_time: Optional[datetime] = None

class AuctionMessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

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
