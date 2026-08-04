from pydantic import BaseModel
from typing import Optional
from .artist import ArtistBasicResponse

class CharacterResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    theme_color: Optional[str] = None
    image_url: Optional[str] = None
    artist: Optional[ArtistBasicResponse] = None
