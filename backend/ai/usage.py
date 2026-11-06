"""
Per-user daily AI quota, so one person can't use up the shared free API key.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

import config
from config import utcnow
from db_models import AIUsage, User


def _today() -> str:
    return utcnow().date().isoformat()


def _row(db: Session, user: User) -> AIUsage:
    row = db.query(AIUsage).filter(AIUsage.user_id == user.id, AIUsage.day == _today()).first()
    if row is None:
        row = AIUsage(user_id=user.id, day=_today(), count=0)
        db.add(row)
        db.flush()
    return row


def check_quota(db: Session, user: User) -> None:
    limit = config.ai_daily_limit()
    if limit and (_row(db, user).count or 0) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"You've used all {limit} AI requests for today. They reset at midnight UTC.",
        )


def record_use(db: Session, user: User) -> None:
    row = _row(db, user)
    row.count = (row.count or 0) + 1


def usage_today(db: Session, user: User) -> dict[str, int]:
    row = db.query(AIUsage).filter(AIUsage.user_id == user.id, AIUsage.day == _today()).first()
    return {"used": row.count if row else 0, "limit": config.ai_daily_limit()}
