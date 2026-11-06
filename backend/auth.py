"""
Authentication.

- supabase mode (SUPABASE_URL set): every request must carry the Supabase
  access token (`Authorization: Bearer <jwt>`). It is verified with the
  project's public signing keys (JWKS, ES256/RS256), or with
  SUPABASE_JWT_SECRET for projects still on the legacy HS256 secret.
- local mode (SUPABASE_URL empty): development only. Everyone is the same
  built-in local user. A warning is logged on startup.
"""

from __future__ import annotations

from typing import Any, Optional

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient
from sqlalchemy.orm import Session

import config
from database import get_db
from db_models import User

LOCAL_USER_ID = "local-dev-user"
LOCAL_USER_EMAIL = "local@thinkflow.test"

_jwks_clients: dict[str, PyJWKClient] = {}


def _jwks_client(base_url: str) -> PyJWKClient:
    url = f"{base_url}/auth/v1/.well-known/jwks.json"
    client = _jwks_clients.get(url)
    if client is None:
        client = PyJWKClient(url, cache_keys=True, lifespan=3600)
        _jwks_clients[url] = client
    return client


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def decode_supabase_token(token: str) -> dict[str, Any]:
    base_url = config.supabase_url()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        raise _unauthorized("Invalid sign-in token")

    alg = header.get("alg")
    if alg == "HS256":
        secret = config.env("SUPABASE_JWT_SECRET")
        if not secret:
            raise _unauthorized(
                "This Supabase project uses the legacy JWT secret: set SUPABASE_JWT_SECRET on the backend"
            )
        key: Any = secret
    elif alg in ("ES256", "RS256", "EdDSA"):
        try:
            key = _jwks_client(base_url).get_signing_key_from_jwt(token).key
        except jwt.PyJWKClientConnectionError:
            raise HTTPException(status_code=503, detail="Couldn't reach Supabase to verify your sign-in")
        except jwt.PyJWKClientError:
            raise _unauthorized("Sign-in token was signed with an unknown key")
    else:
        raise _unauthorized("Unsupported sign-in token")

    try:
        return jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience="authenticated",
            issuer=f"{base_url}/auth/v1",
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Your session expired. Please sign in again.")
    except jwt.PyJWTError:
        raise _unauthorized("Invalid sign-in token")


def upsert_user(db: Session, user_id: str, email: str, name: str = "", avatar_url: str = "") -> User:
    email = email or f"{user_id}@users.thinkflow"
    user = db.get(User, user_id)
    changed = False
    if user is None:
        # Emails are unique: free the address if an old account row still holds it.
        stale = db.query(User).filter(User.email == email, User.id != user_id).first()
        if stale is not None:
            stale.email = f"replaced-{stale.id}@users.thinkflow"
        user = User(id=user_id, email=email, name=name, avatar_url=avatar_url)
        db.add(user)
        changed = True
    else:
        if email and user.email != email:
            user.email, changed = email, True
        if name and user.name != name:
            user.name, changed = name, True
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url, changed = avatar_url, True
    if changed:
        db.commit()
        db.refresh(user)
    return user


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if config.auth_mode() == "local":
        return upsert_user(db, LOCAL_USER_ID, LOCAL_USER_EMAIL, "Local User")

    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized("Please sign in")
    claims = decode_supabase_token(authorization.split(" ", 1)[1].strip())

    meta = claims.get("user_metadata") or {}
    return upsert_user(
        db,
        user_id=str(claims["sub"]),
        email=claims.get("email") or "",
        name=meta.get("full_name") or meta.get("name") or "",
        avatar_url=meta.get("avatar_url") or meta.get("picture") or "",
    )
