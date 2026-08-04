from typing import Optional
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

class CharacterBase(SQLModel):
    name: str
    description: Optional[str] = None
    theme_color: Optional[str] = None
    image_url: Optional[str] = None
    artist_id: Optional[int] = Field(default=None, foreign_key="artistprofile.id", index=True)

class Character(CharacterBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    artist: Optional["ArtistProfile"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})
