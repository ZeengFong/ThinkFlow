"""Sign-in token verification and per-user data isolation."""

import time

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

import auth as auth_module
from conftest import SUPABASE_URL, auth, make_token


def test_local_mode_needs_no_token(client):
    me = client.get("/api/me").json()
    assert me["id"] == "local-dev-user"
    assert me["auth_mode"] == "local"


def test_supabase_mode_requires_a_token(client, supabase_mode):
    assert client.get("/api/projects/").status_code == 401
    assert client.get("/api/projects/", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401


def test_rejects_bad_signature_expired_and_wrong_audience(client, supabase_mode):
    bad = {
        "wrong secret": make_token("u1", "a@x.com", secret="another-secret-that-is-long-enough!!"),
        "expired": make_token("u1", "a@x.com", exp_in=-10),
        "wrong audience": make_token("u1", "a@x.com", aud="anon"),
        "wrong issuer": make_token("u1", "a@x.com", iss="https://evil.example/auth/v1"),
    }
    for reason, token in bad.items():
        response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401, reason


def test_valid_token_creates_the_user(client, supabase_mode):
    me = client.get("/api/me", headers=auth("user-123", "sam@school.edu")).json()
    assert me["id"] == "user-123"
    assert me["email"] == "sam@school.edu"
    assert me["name"] == "Sam"
    assert me["auth_mode"] == "supabase"


def test_es256_tokens_verified_with_jwks(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    private_key = ec.generate_private_key(ec.SECP256R1())
    now = int(time.time())
    token = jwt.encode(
        {"sub": "es-user", "email": "es@x.com", "aud": "authenticated", "iss": f"{SUPABASE_URL}/auth/v1",
         "iat": now, "exp": now + 600},
        private_key, algorithm="ES256", headers={"kid": "key-1"},
    )

    class FakeJWKS:
        def get_signing_key_from_jwt(self, _token):
            return type("Key", (), {"key": private_key.public_key()})()

    monkeypatch.setattr(auth_module, "_jwks_client", lambda base_url: FakeJWKS())
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["id"] == "es-user"


def test_users_cannot_see_each_others_data(client, supabase_mode):
    alice, bob = auth("alice", "alice@x.com"), auth("bob", "bob@x.com")
    project = client.post("/api/projects/", json={"title": "Alice's essay"}, headers=alice).json()
    flow_id = project["flow_id"]
    client.put(
        f"/api/flows/{flow_id}",
        json={"nodes": [{"id": "n1", "type": "thinkflow", "position": {"x": 0, "y": 0},
                         "data": {"label": "Write intro", "priority": "high"}}], "edges": []},
        headers=alice,
    )
    task_id = client.get("/api/tasks/", headers=alice).json()[0]["id"]

    assert client.get("/api/projects/", headers=bob).json() == []
    assert client.get("/api/tasks/", headers=bob).json() == []
    assert client.get(f"/api/projects/{project['id']}", headers=bob).status_code == 404
    assert client.patch(f"/api/projects/{project['id']}", json={"title": "x"}, headers=bob).status_code == 404
    assert client.delete(f"/api/projects/{project['id']}", headers=bob).status_code == 404
    assert client.get(f"/api/flows/{flow_id}", headers=bob).status_code == 404
    assert client.put(f"/api/flows/{flow_id}", json={"nodes": []}, headers=bob).status_code == 404
    assert client.patch(f"/api/tasks/{task_id}", json={"status": "done"}, headers=bob).status_code == 404
    assert client.post("/api/tasks/", json={"project_id": project["id"], "title": "x"}, headers=bob).status_code == 404
    assert client.get(f"/api/ai/chat/{project['id']}", headers=bob).status_code == 404

    # Alice still sees everything, untouched.
    assert client.get(f"/api/projects/{project['id']}", headers=alice).json()["title"] == "Alice's essay"
    assert client.get(f"/api/tasks/{task_id}", headers=alice).json()["status"] == "todo"


def test_client_supplied_user_id_is_ignored(client, supabase_mode):
    project = client.post(
        "/api/projects/", json={"title": "Mine", "user_id": "someone-else"}, headers=auth("me", "me@x.com")
    ).json()
    assert project["user_id"] == "me"
