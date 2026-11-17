from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator
from services.promptpay import normalize_mobile


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class ReceivingProfile(StrictRequest):
    account_holder_name: str = Field(min_length=1, max_length=120)
    mobile_number: str = Field(max_length=30)
    version: int = Field(ge=0, strict=True)

    @field_validator('mobile_number')
    @classmethod
    def mobile(cls, value):
        return normalize_mobile(value)


class RequestOrders(StrictRequest):
    order_ids: list[StrictInt] = Field(min_length=1, max_length=100)

    @field_validator('order_ids')
    @classmethod
    def orders(cls, value):
        if len(set(value)) != len(value) or any(type(i) is not int or i <= 0 for i in value):
            raise ValueError('Select distinct positive order IDs')
        return sorted(value)


class SubmitRequest(RequestOrders):
    quote_digest: str = Field(pattern=r'^[a-f0-9]{64}$')
    profile_version: int = Field(gt=0, strict=True)
    idempotency_key: str = Field(min_length=16, max_length=100)


class RequestAction(StrictRequest):
    version: int = Field(gt=0, strict=True)
    note: str = Field(default='', max_length=2000)
    no_transfer_made: bool = False
