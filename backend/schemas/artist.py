from pydantic import BaseModel
from typing import Optional

class ArtistBasicResponse(BaseModel):
    id: int
    handle: str
    display_name: str
    avatar_url: Optional[str] = None
