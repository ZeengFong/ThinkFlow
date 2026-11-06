"""
AI endpoints:
  GET    /api/ai/status                 provider/model in use + today's usage
  POST   /api/ai/generate-flow          AI builds (or extends) the project's flow
  GET    /api/ai/chat/{project_id}      saved chat history
  POST   /api/ai/chat/{project_id}      send a message (reply may suggest steps)
  DELETE /api/ai/chat/{project_id}      clear the chat
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ai import providers
from ai.planner import MAX_DEPTH, apply_plan, drop_existing, normalize_steps, schedule
from ai.prompts import CHAT_SYSTEM, planner_messages, project_context
from ai.usage import check_quota, record_use, usage_today
from auth import get_current_user
from config import utcnow
from database import get_db
from db_models import ChatMessage, User
from models import ChatRequest, GenerateFlowRequest
from routes.common import (
    load_json_list,
    owned_project,
    project_flow,
    serialize_flow,
    serialize_message,
    serialize_task,
)

router = APIRouter()

CHAT_HISTORY_MESSAGES = 16


def _parse_today(value: Optional[str]) -> date:
    try:
        return date.fromisoformat((value or "")[:10])
    except ValueError:
        return utcnow().date()


def _ai_http_error(exc: providers.AIUnavailable) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/status")
def ai_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {**providers.status(), "usage": usage_today(db, user)}


@router.post("/generate-flow")
def generate_flow(body: GenerateFlowRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = owned_project(db, user, body.project_id)
    flow = project_flow(db, project)
    check_quota(db, user)
    today = _parse_today(body.today)

    parent_node_id, focus_step = None, None
    if body.parent_node_id:
        node = next((n for n in load_json_list(flow.nodes) if n.get("id") == body.parent_node_id), None)
        if node is None:
            raise HTTPException(status_code=404, detail="That step no longer exists")
        if node.get("type") != "master":
            parent_node_id = body.parent_node_id
            focus_step = (node.get("data") or {}).get("label") or "this step"

    context = project_context(project, user, flow, today=today, tz_offset_minutes=body.tz_offset_minutes)
    messages = planner_messages(context, focus_step=focus_step, goal=body.goal)
    try:
        data, completion = providers.complete_json(messages)
    except providers.AIUnavailable as exc:
        raise _ai_http_error(exc)

    raw_steps = data.get("steps") or data.get("tasks") or data.get("substeps") or []
    if focus_step:  # a breakdown: one level, a handful of steps
        steps = normalize_steps(raw_steps, depth=MAX_DEPTH - 1, budget=6)
    else:
        steps = normalize_steps(raw_steps)
    existing = {(n.get("data") or {}).get("label", "") for n in load_json_list(flow.nodes)}
    steps = drop_existing(steps, existing)
    if not steps:
        raise HTTPException(
            status_code=502,
            detail="The AI didn't come up with any new steps. Add a bit more detail and try again.",
        )
    deadline = (project.deadline - timedelta(minutes=body.tz_offset_minutes)).date() if project.deadline else None
    schedule(steps, today, deadline)
    created = apply_plan(
        db, project, flow, steps, parent_node_id=parent_node_id, tz_offset_minutes=body.tz_offset_minutes
    )
    record_use(db, user)
    db.commit()
    db.refresh(flow)
    db.refresh(project)
    return {
        "flow": serialize_flow(flow),
        "tasks": [serialize_task(t) for t in project.tasks],
        "created_node_ids": created,
        "provider": completion.provider,
        "model": completion.model,
    }


@router.get("/chat/{project_id}")
def get_chat(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = owned_project(db, user, project_id)
    return [serialize_message(m) for m in project.chat_messages]


@router.post("/chat/{project_id}")
def send_chat(
    project_id: str,
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = owned_project(db, user, project_id)
    flow = project_flow(db, project)
    check_quota(db, user)

    context = project_context(project, user, flow, today=_parse_today(body.today))
    messages = [{"role": "system", "content": f"{CHAT_SYSTEM}\n\n{context}"}]
    messages += [{"role": m.role, "content": m.content} for m in project.chat_messages[-CHAT_HISTORY_MESSAGES:]]
    messages.append({"role": "user", "content": body.message.strip()})

    try:
        completion = providers.complete(messages, json_mode=True, temperature=0.6)
    except providers.AIUnavailable as exc:
        raise _ai_http_error(exc)

    try:
        data = providers.parse_json_object(completion.text)
        reply = str(data.get("reply") or "").strip()
        suggestions = [
            {"title": s["title"], "priority": s["priority"]}
            for s in normalize_steps(data.get("suggested_tasks") or [], depth=2)[:8]
        ]
        group = str(data.get("group_title") or "").strip()[:60] if len(suggestions) >= 2 else ""
    except ValueError:  # the model answered in plain text
        reply, suggestions, group = completion.text, [], ""
    if not reply:
        reply = "Sorry, I didn't catch that. Could you rephrase?"

    now = utcnow()
    user_msg = ChatMessage(project_id=project.id, role="user", content=body.message.strip(), created_at=now)
    assistant_msg = ChatMessage(
        project_id=project.id,
        role="assistant",
        content=reply,
        suggestions=json.dumps(suggestions),
        suggestion_group=group,
        created_at=now + timedelta(milliseconds=1),
    )
    db.add_all([user_msg, assistant_msg])
    record_use(db, user)
    db.commit()
    return {
        "messages": [serialize_message(user_msg), serialize_message(assistant_msg)],
        "provider": completion.provider,
        "model": completion.model,
    }


@router.delete("/chat/{project_id}")
def clear_chat(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = owned_project(db, user, project_id)
    for message in list(project.chat_messages):
        db.delete(message)
    db.commit()
    return {"success": True}
