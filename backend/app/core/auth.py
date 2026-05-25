from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    id: str
    email: str | None
    app_role: str | None
    is_staff: bool


def _decode_supabase_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=503, detail="SUPABASE_JWT_SECRET is not configured on the AI API.")
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from e


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
