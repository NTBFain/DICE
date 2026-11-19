from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "DICE Platform Backend"
    DATABASE_URL: str = "sqlite:///./dice-local.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str
    DEMO_MODE: bool = False
    STRIPE_CHECKOUT_ENABLED: bool = False
    STRIPE_LIVE_CHECKOUT_ENABLED: bool = False
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_RETURN_ORIGIN: str = ""

    @field_validator('SECRET_KEY')
    @classmethod
    def local_signing_secret(cls, value):
        if len(value.strip()) < 32 or value == 'super_secret_key_change_me_in_production_123456':
            raise ValueError('Run python scripts/setup_local.py from the project root to create a local signing secret.')
        return value
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
