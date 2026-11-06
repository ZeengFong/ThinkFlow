"""
Runtime settings.

Everything is read from environment variables. In development, values in
backend/.env are loaded too and re-read whenever that file changes, so adding
an API key doesn't need a server restart. In production (Render, etc.) there
is no .env file and the platform's environment variables are used.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

log = logging.getLogger("thinkflow")

BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILE = BACKEND_DIR / ".env"
_env_mtime: float | None = None


def _reload_env_file() -> None:
    global _env_mtime
    if os.getenv("THINKFLOW_DISABLE_DOTENV"):
        return
    try:
        mtime = ENV_FILE.stat().st_mtime
    except FileNotFoundError:
        return
    if mtime != _env_mtime:
        load_dotenv(ENV_FILE, override=True)
        _env_mtime = mtime


def env(name: str, default: str = "") -> str:
    _reload_env_file()
    return (os.getenv(name) or default).strip()


def env_int(name: str, default: int) -> int:
    try:
        return int(env(name) or default)
    except ValueError:
        return default


# ─── Specific settings ───

def database_url() -> str:
    return env("DATABASE_URL") or f"sqlite:///{BACKEND_DIR / 'thinkflow.db'}"


def frontend_origins() -> list[str]:
    raw = env("FRONTEND_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000")
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


def supabase_url() -> str:
    return env("SUPABASE_URL").rstrip("/")


def auth_mode() -> str:
    """'supabase' when SUPABASE_URL is set, otherwise 'local' (development only)."""
    return "supabase" if supabase_url() else "local"


def ai_daily_limit() -> int:
    """Max AI requests per user per day (0 = unlimited). Protects the shared free key."""
    return max(0, env_int("AI_DAILY_LIMIT", 60))


def utcnow():
    """Current UTC time as a naive datetime (how all times are stored)."""
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(tzinfo=None)
