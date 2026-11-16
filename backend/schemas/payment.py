from pydantic import BaseModel, Field, field_validator
from services.promptpay import normalize_mobile


class PaymentSettingsRequest(BaseModel):
    enabled: bool
    recipient_name: str = Field(max_length=120)
    mobile_number: str = Field(max_length=30)
    fee_bps: int = Field(500, ge=0, le=10000, strict=True)
    version: int = Field(0, ge=0, strict=True)

    @field_validator('recipient_name')
    @classmethod
    def strip_name(cls, value):
        return value.strip()

    @field_validator('mobile_number')
    @classmethod
    def mobile(cls, value):
        return normalize_mobile(value) if value.strip() else ''


class PayoutSelection(BaseModel):
    artist_id: int = Field(gt=0)
    order_ids: list[int] = Field(min_length=1, max_length=100)

    @field_validator('order_ids')
    @classmethod
    def unique_orders(cls, value):
        if len(set(value)) != len(value) or any(i <= 0 for i in value):
            raise ValueError('Select distinct positive order IDs')
        return sorted(value)
