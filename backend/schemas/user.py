import re
from pydantic import BaseModel, field_validator
from typing import Optional

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class UserRegisterRequest(BaseModel):
    email: str
    full_name: str
    password: str
    is_artist: bool = False
    facebook_id: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class UserLoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool
    is_artist: bool = False
    email: str
    full_name: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    is_artist: bool = False
    avatar_url: Optional[str] = None

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
