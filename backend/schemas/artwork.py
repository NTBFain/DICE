from pydantic import BaseModel
from typing import Optional
from .character import CharacterResponse
from .artist import ArtistBasicResponse

class ArtworkResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    image_url: str
    visibility_status: str
    work_type: str
    character: Optional[CharacterResponse] = None
    character_id: Optional[int] = None
    artist: Optional[ArtistBasicResponse] = None

class ArtworkCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    visibility_status: str = "PUBLIC"
    work_type: str = "ILLUSTRATION"
    character_id: Optional[int] = None
