"""
Supabase client configuration.

Reads SUPABASE_URL and SUPABASE_KEY from environment variables
(or a .env file via python-dotenv).
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    import warnings
    warnings.warn(
        "SUPABASE_URL and/or SUPABASE_KEY not set. "
        "Database operations will fail until these are configured in .env"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None  # type: ignore
