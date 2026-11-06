"""
Shared helpers: ownership checks, datetime handling and row → JSON serialization.

SQLite has no timezone support, so every datetime is stored as naive UTC
and sent back to the browser as ISO-8601 with a trailing "Z".
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from config import utcnow
from db_models import ChatMessage, Flow, Project, Task, User

MASTER_NODE_ID = "master-node"


# ─── Ownership (404 rather than 403, so other users' ids aren't revealed) ───

def owned_project(db: Session, user: User, project_id: str) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def owned_flow(db: Session, user: User, flow_id: str) -> Flow:
    flow = db.get(Flow, flow_id)
    if flow is None or flow.project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Flow not found")
    return flow


def owned_task(db: Session, user: User, task_id: str) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def project_flow(db: Session, project: Project) -> Flow:
    """A project's flow, created on demand."""
    if project.flows:
        return project.flows[0]
    flow = Flow(project_id=project.id, nodes="[]", edges="[]")
    db.add(flow)
    db.flush()
    return flow


# ─── Datetimes ───

def to_utc_naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.replace(microsecond=0).isoformat() + "Z"


def load_json_list(raw: Optional[str]) -> list[Any]:
    try:
        value = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return value if isinstance(value, list) else []


# ─── Serializers ───

def derive_status(project: Project, task_count: int, tasks_done: int) -> str:
    """Use the stored status unless it is the default 'active', in which case
    report 'completed' when every task is done and 'overdue' past the deadline."""
    if project.status and project.status != "active":
        return project.status
    if task_count > 0 and tasks_done == task_count:
        return "completed"
    if project.deadline and project.deadline < utcnow():
        return "overdue"
    return "active"


def serialize_project(project: Project) -> dict[str, Any]:
    tasks = project.tasks or []
    task_count = len(tasks)
    tasks_done = sum(1 for t in tasks if t.status == "done")
    progress = round(tasks_done / task_count * 100) if task_count else 0
    flow_id = project.flows[0].id if project.flows else None
    return {
        "id": project.id,
        "user_id": project.user_id,
        "title": project.title,
        "subject": project.subject or "",
        "context": project.context or "",
        "folder": project.folder or "",
        "status": derive_status(project, task_count, tasks_done),
        "priority": project.priority or 0,
        "deadline": iso(project.deadline),
        "created_at": iso(project.created_at),
        "task_count": task_count,
        "tasks_done": tasks_done,
        "progress": progress,
        "flow_id": flow_id,
    }


def serialize_flow(flow: Flow) -> dict[str, Any]:
    return {
        "id": flow.id,
        "project_id": flow.project_id,
        "nodes": load_json_list(flow.nodes),
        "edges": load_json_list(flow.edges),
    }


def serialize_task(task: Task) -> dict[str, Any]:
    return {
        "id": task.id,
        "project_id": task.project_id,
        "project_title": task.project.title if task.project else "",
        "node_id": task.node_id or "",
        "title": task.title,
        "due_date": iso(task.due_date),
        "priority": task.priority or "medium",
        "status": task.status or "todo",
        "estimate_minutes": task.estimate_minutes,
        "created_at": iso(task.created_at),
    }


def serialize_message(message: ChatMessage) -> dict[str, Any]:
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "suggestions": load_json_list(message.suggestions),
        "suggestion_group": message.suggestion_group or "",
        "created_at": iso(message.created_at),
    }


def serialize_user(user: User, auth_mode: str) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name or "",
        "avatar_url": user.avatar_url or "",
        "theme": user.theme or "dark",
        "study_preferences": user.system_prompt or "",
        "auth_mode": auth_mode,
    }
