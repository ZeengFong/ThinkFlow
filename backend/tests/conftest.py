"""
Test setup: a throwaway SQLite database, no .env file, no network.
"""

import os
import tempfile
from pathlib import Path

# Must happen before the app (and its database engine) is imported.
_tmp = Path(tempfile.mkdtemp(prefix="thinkflow-tests-"))
os.environ["THINKFLOW_DISABLE_DOTENV"] = "1"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp / 'test.db'}"
for var in ("SUPABASE_URL", "SUPABASE_JWT_SECRET", "GROQ_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY",
            "OLLAMA_BASE_URL", "AI_PROVIDERS", "AI_DAILY_LIMIT", "GROQ_MODEL", "GEMINI_MODEL"):
    os.environ.pop(var, None)

import json  # noqa: E402
import time  # noqa: E402
from types import SimpleNamespace  # noqa: E402

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from ai import providers  # noqa: E402
from database import Base, engine  # noqa: E402

SUPABASE_URL = "https://test-project.supabase.co"
JWT_SECRET = "test-secret-that-is-long-enough-for-hs256"


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    providers._model_cache.clear()
    monkeypatch.setattr(providers, "client_factory", providers.make_client)
    yield


@pytest.fixture
def client():
    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture
def supabase_mode(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", JWT_SECRET)


def make_token(sub: str, email: str, *, secret: str = JWT_SECRET, exp_in: int = 3600, aud: str = "authenticated",
               iss: str = f"{SUPABASE_URL}/auth/v1") -> str:
    now = int(time.time())
    payload = {"sub": sub, "email": email, "aud": aud, "iss": iss, "iat": now, "exp": now + exp_in,
               "user_metadata": {"full_name": email.split("@")[0].title()}}
    return jwt.encode(payload, secret, algorithm="HS256")


def auth(sub: str, email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub, email)}"}


# ─── Fake LLM provider ───

class FakeClient:
    """Mimics the bits of openai.OpenAI that ThinkFlow uses."""

    def __init__(self, replies=None, error=None, models=("openai/gpt-oss-120b", "openai/gpt-oss-20b")):
        self.replies = list(replies or [])
        self.error = error
        self.calls: list[dict] = []
        self.models = SimpleNamespace(list=lambda: [SimpleNamespace(id=m) for m in models])
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        reply = self.replies.pop(0) if len(self.replies) > 1 else self.replies[0]
        content = reply if isinstance(reply, str) else json.dumps(reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


@pytest.fixture
def fake_ai(monkeypatch):
    """Configure Groq with a fake client. Returns a function to set its replies."""
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    fake = FakeClient(replies=[{"steps": []}])
    monkeypatch.setattr(providers, "client_factory", lambda spec: fake)

    def set_replies(*replies):
        fake.replies = list(replies)
        return fake

    return set_replies
