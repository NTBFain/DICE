from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "DICE Platform Backend"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/dice_db" # Or sqlite:///./test.db
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "super_secret_key_change_me_in_production_123456"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
