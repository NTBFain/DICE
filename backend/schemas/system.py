from pydantic import BaseModel

class CommissionStatusResponse(BaseModel):
    open: bool

class CommissionStatusUpdateRequest(BaseModel):
    open: bool
