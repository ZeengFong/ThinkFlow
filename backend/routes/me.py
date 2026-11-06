"""
The signed-in user's profile and preferences.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import config
from auth import get_current_user
from database import get_db
from db_models import User
from models import MeUpdate
from routes.common import serialize_user

router = APIRouter()


@router.get("")
def get_me(user: User = Depends(get_current_user)):
    return serialize_user(user, config.auth_mode())


@router.patch("")
def update_me(body: MeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    changes = body.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] is not None:
        user.name = changes["name"].strip()
    if changes.get("theme"):
        user.theme = changes["theme"]
    if "study_preferences" in changes and changes["study_preferences"] is not None:
        user.system_prompt = changes["study_preferences"].strip()
    db.commit()
    db.refresh(user)
    return serialize_user(user, config.auth_mode())
