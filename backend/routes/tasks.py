"""
Tasks for the signed-in user, optionally filtered by project.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from db_models import Project, Task, User
from models import TaskCreate, TaskUpdate
from routes.common import owned_project, owned_task, project_flow, serialize_task, to_utc_naive
from routes.flow_sync import remove_node

router = APIRouter()


@router.get("/")
def list_tasks(
    project_id: Optional[str] = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Task).join(Project).filter(Project.user_id == user.id)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    tasks = query.order_by(Task.created_at.asc()).all()
    return [serialize_task(t) for t in tasks]


@router.get("/{task_id}")
def get_task(task_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_task(owned_task(db, user, task_id))


@router.post("/", status_code=201)
def create_task(body: TaskCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_project(db, user, body.project_id)
    task = Task(
        project_id=body.project_id,
        title=body.title.strip(),
        node_id=body.node_id,
        due_date=to_utc_naive(body.due_date),
        priority=body.priority,
        status=body.status,
        estimate_minutes=body.estimate_minutes,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.patch("/{task_id}")
def update_task(
    task_id: str,
    body: TaskUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = owned_task(db, user, task_id)
    # exclude_unset keeps an explicit {"due_date": null} so a due date can be cleared
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "due_date":
            value = to_utc_naive(value)
        elif field == "title":
            value = (value or "").strip() or task.title
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.delete("/{task_id}")
def delete_task(task_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = owned_task(db, user, task_id)
    if task.node_id:  # remove its node from the flow too
        remove_node(project_flow(db, task.project), task.node_id)
    db.delete(task)
    db.commit()
    return {"success": True}
