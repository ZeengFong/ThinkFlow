"""
Database setup.

Local development uses SQLite (backend/thinkflow.db, created automatically).
Production uses Postgres via DATABASE_URL (e.g. Supabase's free database).
"""

from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

import config


def _normalize_url(url: str) -> str:
    # Hosts hand out postgres:// or postgresql:// URLs; use the psycopg 3 driver.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _normalize_url(config.database_url())
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        # Works with Supabase's connection pooler (no server-side prepared statements).
        connect_args={"prepare_threshold": None},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_missing_columns() -> None:
    """Tiny additive migration: create columns that exist in the models but not
    in an existing table (create_all only creates missing tables)."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue
            existing = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing:
                    continue
                ddl_type = column.type.compile(dialect=engine.dialect)
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {ddl_type}'))


def init_db() -> None:
    """Create tables (and any newly added columns). Called on app startup."""
    import db_models  # noqa: F401  (registers the models on Base)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()
