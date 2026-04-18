from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_env: str = Field(default='development', alias='APP_ENV')
    app_name: str = Field(default='Inbox Guardian API', alias='APP_NAME')
    frontend_origin: str = Field(default='http://localhost:3000', alias='FRONTEND_ORIGIN')

    openai_api_key: str | None = Field(default=None, alias='OPENAI_API_KEY')
    openai_model: str = Field(default='gpt-5.1-mini', alias='OPENAI_MODEL')

    google_client_id: str | None = Field(default=None, alias='GOOGLE_CLIENT_ID')
    google_client_secret: str | None = Field(default=None, alias='GOOGLE_CLIENT_SECRET')
    google_redirect_uri: str = Field(default='http://localhost:8000/api/gmail/oauth/callback', alias='GOOGLE_REDIRECT_URI')
    google_scopes: str = Field(default='https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify', alias='GOOGLE_SCOPES')
    gmail_token_store_path: str = Field(default='./data/gmail-oauth.json', alias='GMAIL_TOKEN_STORE_PATH')
    token_encryption_key: str = Field(default='dev-inbox-guardian-secret-key-change-me', alias='TOKEN_ENCRYPTION_KEY')

    @property
    def google_scope_list(self) -> List[str]:
        return [scope.strip() for scope in self.google_scopes.split(',') if scope.strip()]

    @property
    def gmail_token_store(self) -> Path:
        return Path(self.gmail_token_store_path)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
