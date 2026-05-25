from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import get_settings

_bearer = HTTPBearer(auto_error=False)
_JWT_AUDIENCE = "authenticated"
_JWT_LEEWAY_SEC = 60


@dataclass
class AuthUser:
    id: str
    email: str | None
    app_role: str | None
    is_staff: bool


@lru_cache
def _jwks_client(supabase_url: str) -> PyJWKClient:
    url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(url, cache_keys=True)


def _issuer(settings) -> str | None:
    if not settings.supabase_url:
        return None
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


def _decode_via_jwks(token: str, settings) -> dict[str, Any]:
    if not settings.supabase_url:
        raise jwt.PyJWTError("SUPABASE_URL not configured")
    client = _jwks_client(settings.supabase_url)
    signing_key = client.get_signing_key_from_jwt(token)
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")
    if not alg:
        raise jwt.PyJWTError("missing alg in JWT header")
    kwargs: dict[str, Any] = {
        "algorithms": [alg],
        "audience": _JWT_AUDIENCE,
        "leeway": _JWT_LEEWAY_SEC,
    }
    iss = _issuer(settings)
    if iss:
        kwargs["issuer"] = iss
    return jwt.decode(token, signing_key.key, **kwargs)


def _decode_via_hs256(token: str, secret: str, settings) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "algorithms": ["HS256"],
        "audience": _JWT_AUDIENCE,
        "leeway": _JWT_LEEWAY_SEC,
    }
    iss = _issuer(settings)
    if iss:
        kwargs["issuer"] = iss
    return jwt.decode(token, secret, **kwargs)


def _decode_supabase_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url and not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=503,
            detail="Configure SUPABASE_URL (required for ES256) and/or SUPABASE_JWT_SECRET on the AI API.",
        )

    # Modern Supabase projects sign user JWTs with ES256 — verify via JWKS + SUPABASE_URL.
    if settings.supabase_url:
        try:
            return _decode_via_jwks(token, settings)
        except jwt.PyJWTError:
            pass

    if settings.supabase_jwt_secret:
        try:
            return _decode_via_hs256(token, settings.supabase_jwt_secret, settings)
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail="Invalid or expired session.") from e

    raise HTTPException(
        status_code=401,
        detail="Invalid or expired session. Set SUPABASE_URL on Railway (ES256/JWKS) and redeploy.",
    )


async def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser | None:
    if not creds or creds.scheme.lower() != "bearer":
        return None
    payload = _decode_supabase_jwt(creds.credentials)
    sub = payload.get("sub")
    if not sub:
        return None
    role = (payload.get("app_metadata") or {}).get("app_role") or (payload.get("user_metadata") or {}).get("app_role")
    return AuthUser(
        id=str(sub),
        email=payload.get("email"),
        app_role=role,
        is_staff=role in ("admin", "editor"),
    )


async def require_user(user: AuthUser | None = Depends(get_optional_user)) -> AuthUser:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return user


async def require_staff(user: AuthUser = Depends(require_user)) -> AuthUser:
    from app.services.supabase_db import get_profile_role

    role = get_profile_role(user.id) or user.app_role
    if role not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Staff access required.")
    user.app_role = role
    user.is_staff = True
    return user
