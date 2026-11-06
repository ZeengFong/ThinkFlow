"""The AI planner, chat, provider fallback and quotas (with fake providers, no network)."""

import httpx
import openai
import pytest

from ai import providers
from ai.planner import normalize_steps, schedule
from conftest import FakeClient

PLAN = {
    "steps": [
        {"title": "Read the assignment brief", "priority": "high", "estimate_minutes": 30, "due_date": "2026-11-06",
         "substeps": [{"title": "Highlight the rubric", "priority": "medium", "estimate_minutes": 15, "due_date": "2026-11-06"}]},
        {"title": "Write the first draft", "priority": "high", "estimate_minutes": 120, "due_date": "2030-01-01", "substeps": []},
        {"title": "Proofread and submit", "priority": "medium", "estimate_minutes": 9999, "due_date": "2000-01-01"},
    ]
}


def make_project(client, **extra):
    return client.post("/api/projects/", json={"title": "History essay", **extra}).json()


def rate_limited() -> openai.RateLimitError:
    request = httpx.Request("POST", "https://api.example/v1/chat/completions")
    return openai.RateLimitError("rate limited", response=httpx.Response(429, request=request), body=None)


def test_status_when_not_configured(client):
    status = client.get("/api/ai/status").json()
    assert status["configured"] is False
    assert "GROQ_API_KEY" in status["error"]


def test_generate_without_a_key_explains_how_to_fix_it(client):
    project = make_project(client)
    response = client.post("/api/ai/generate-flow", json={"project_id": project["id"]})
    assert response.status_code == 503
    assert "GROQ_API_KEY" in response.json()["detail"]


def test_generate_flow_builds_nodes_edges_and_scheduled_tasks(client, fake_ai):
    fake = fake_ai(PLAN)
    project = make_project(client, deadline="2026-11-20T23:00:00-07:00")
    result = client.post("/api/ai/generate-flow", json={
        "project_id": project["id"], "today": "2026-11-05", "tz_offset_minutes": 420,
    }).json()

    labels = {n["id"]: n["data"]["label"] for n in result["flow"]["nodes"]}
    assert sorted(labels.values()) == sorted(
        ["History essay", "Read the assignment brief", "Highlight the rubric", "Write the first draft", "Proofread and submit"]
    )
    edges = {(labels[e["source"]], labels[e["target"]]) for e in result["flow"]["edges"]}
    assert ("History essay", "Read the assignment brief") in edges
    assert ("Read the assignment brief", "Highlight the rubric") in edges

    tasks = {t["title"]: t for t in result["tasks"]}
    assert len(tasks) == 4
    assert tasks["Highlight the rubric"]["due_date"] == "2026-11-07T00:00:00Z"  # 5pm Calgary time
    assert tasks["Write the first draft"]["due_date"].startswith("2026-11-21")  # clamped to the deadline
    assert tasks["Proofread and submit"]["due_date"].startswith("2026-11-06")  # past date → today
    assert tasks["Proofread and submit"]["estimate_minutes"] == 600  # clamped
    assert result["provider"] == "Groq" and result["model"] == "openai/gpt-oss-120b"
    assert fake.calls[0]["response_format"] == {"type": "json_object"}
    assert client.get("/api/ai/status").json()["usage"]["used"] == 1


def test_breakdown_adds_children_and_drops_repeats(client, fake_ai):
    fake_ai(PLAN)
    project = make_project(client)
    first = client.post("/api/ai/generate-flow", json={"project_id": project["id"]}).json()
    draft = next(n for n in first["flow"]["nodes"] if n["data"]["label"] == "Write the first draft")

    fake_ai({"steps": [
        {"title": "Write the introduction"},
        {"title": "write the FIRST draft!"},  # repeat of an existing step
        {"title": "Read the assignment brief"},  # repeat of an existing step
        {"title": "Write the conclusion", "substeps": [{"title": "too deep"}]},
    ]})
    result = client.post("/api/ai/generate-flow", json={"project_id": project["id"], "parent_node_id": draft["id"]}).json()
    labels = {n["id"]: n["data"]["label"] for n in result["flow"]["nodes"]}
    new = [labels[i] for i in result["created_node_ids"]]
    assert new == ["Write the introduction", "Write the conclusion"]
    children = [labels[e["target"]] for e in result["flow"]["edges"] if e["source"] == draft["id"]]
    assert children == new


def test_invalid_json_is_retried_once(client, fake_ai):
    fake = fake_ai("Sure! Here is your plan: steps...", "```json\n" + '{"steps": [{"title": "Outline essay"}]}' + "\n```")
    project = make_project(client)
    result = client.post("/api/ai/generate-flow", json={"project_id": project["id"]}).json()
    assert [t["title"] for t in result["tasks"]] == ["Outline essay"]
    assert len(fake.calls) == 2


def test_falls_back_to_the_next_provider_when_rate_limited(client, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k1")
    monkeypatch.setenv("GEMINI_API_KEY", "k2")
    groq = FakeClient(error=rate_limited())
    gemini = FakeClient(replies=[{"steps": [{"title": "Plan with Gemini"}]}],
                        models=("models/gemini-9.0-flash-lite", "models/gemini-9.0-flash", "models/gemini-1.5-flash"))
    monkeypatch.setattr(providers, "client_factory", lambda spec: groq if spec.name == "groq" else gemini)

    project = make_project(client)
    result = client.post("/api/ai/generate-flow", json={"project_id": project["id"]}).json()
    assert result["provider"] == "Gemini"
    assert result["model"] == "models/gemini-9.0-flash"  # newest, non-lite first
    assert len(groq.calls) == 2  # both Groq models were tried


def test_everything_rate_limited_gives_a_friendly_429(client, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k1")
    monkeypatch.setattr(providers, "client_factory", lambda spec: FakeClient(error=rate_limited()))
    project = make_project(client)
    response = client.post("/api/ai/generate-flow", json={"project_id": project["id"]})
    assert response.status_code == 429
    assert "quota" in response.json()["detail"]


def test_daily_quota(client, fake_ai, monkeypatch):
    monkeypatch.setenv("AI_DAILY_LIMIT", "1")
    fake_ai({"reply": "Hi!", "suggested_tasks": []})
    project = make_project(client)
    assert client.post(f"/api/ai/chat/{project['id']}", json={"message": "hello"}).status_code == 200
    response = client.post(f"/api/ai/chat/{project['id']}", json={"message": "again"})
    assert response.status_code == 429
    assert "1 AI requests" in response.json()["detail"]


def test_chat_saves_history_and_suggestions(client, fake_ai):
    fake = fake_ai({"reply": "Start with the **brief**.", "group_title": "Getting started", "suggested_tasks": [
        {"title": "Read the brief", "priority": "high"}, {"title": "List questions for the TA", "priority": "low"}]})
    project = make_project(client, context="Essay on the French Revolution")
    result = client.post(f"/api/ai/chat/{project['id']}", json={"message": "Where do I start?"}).json()
    assert [m["role"] for m in result["messages"]] == ["user", "assistant"]
    assert result["messages"][1]["suggestions"] == [
        {"title": "Read the brief", "priority": "high"}, {"title": "List questions for the TA", "priority": "low"}]
    assert result["messages"][1]["suggestion_group"] == "Getting started"
    assert "French Revolution" in fake.calls[0]["messages"][0]["content"]  # project context reaches the AI

    fake_ai("Plain text reply, not JSON")
    client.post(f"/api/ai/chat/{project['id']}", json={"message": "Thanks"})
    history = client.get(f"/api/ai/chat/{project['id']}").json()
    assert [m["content"] for m in history] == [
        "Where do I start?", "Start with the **brief**.", "Thanks", "Plain text reply, not JSON",
    ]
    # Earlier turns are sent back to the model as conversation history.
    assert any(m["content"] == "Where do I start?" for m in fake.calls[-1]["messages"])

    assert client.delete(f"/api/ai/chat/{project['id']}").status_code == 200
    assert client.get(f"/api/ai/chat/{project['id']}").json() == []


@pytest.mark.parametrize("text", ['{"a": 1}', '```json\n{"a": 1}\n```', 'Here you go: {"a": 1} hope it helps'])
def test_parse_json_object(text):
    assert providers.parse_json_object(text) == {"a": 1}


def test_normalize_keeps_every_main_step_when_over_budget():
    raw = [{"title": f"Step {i}", "substeps": [{"title": f"Sub {i}.{j}"} for j in range(10)]} for i in range(6)]
    steps = normalize_steps(raw)
    assert len(steps) == 6
    assert all(len(s["substeps"]) >= 3 for s in steps)
    assert sum(1 + len(s["substeps"]) for s in steps) <= 30


def test_schedule_spreads_dates_when_the_ai_gives_none():
    from datetime import date

    steps = normalize_steps([{"title": "A"}, {"title": "B"}, {"title": "C", "substeps": [{"title": "C1"}]}])
    schedule(steps, date(2026, 11, 5), date(2026, 11, 15))
    # Leaves A, B, C1 spread over Nov 5 → Nov 14 (a buffer day before the deadline); C rolls up to C1.
    assert [s["due"] for s in steps] == [date(2026, 11, 8), date(2026, 11, 11), date(2026, 11, 14)]
