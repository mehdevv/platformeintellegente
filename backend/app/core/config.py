from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _strip_env_secret(value: object) -> object:
    if isinstance(value, str):
        return value.strip().strip('"').strip("'")
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    allowed_origins: str = "http://localhost:5173,http://localhost:5174"

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    _strip_secrets = field_validator(
        "supabase_url",
        "supabase_service_role_key",
        "supabase_jwt_secret",
        "google_api_key",
        mode="before",
    )(_strip_env_secret)

    google_api_key: str = ""

    gemini_chat_model: str = "gemini-2.0-flash"
    gemini_embedding_model: str = "models/gemini-embedding-001"
    embedding_dimensions: int = 1536

    report_pdfs_bucket: str = "report-pdfs"
    rag_top_k: int = 8
    rag_max_context_chars: int = 24_000

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def google_configured(self) -> bool:
        return bool(self.google_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
