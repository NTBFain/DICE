from typing import Optional
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from .base import VisibilityStatus, WorkType
from .character import Character

class ArtworkBase(SQLModel):
    title: str
    description: Optional[str] = None
    image_url: str
    visibility_status: VisibilityStatus = Field(default=VisibilityStatus.PUBLIC, index=True)
    work_type: WorkType = Field(default=WorkType.ILLUSTRATION, index=True)
    client_link: Optional[str] = None
    character_id: Optional[int] = Field(default=None, foreign_key="character.id", index=True)
    artist_id: Optional[int] = Field(default=None, foreign_key="artistprofile.id", index=True)

class Artwork(ArtworkBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    character: Optional[Character] = Relationship(sa_relationship_kwargs={"lazy": "joined"})
    artist: Optional["ArtistProfile"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})
