"""
Projects: CRUD for the signed-in user. Creating a project also creates its flow.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from db_models import Flow, Project, User
from models import ProjectCreate, ProjectUpdate
from routes.common import owned_project, project_flow, serialize_project, to_utc_naive
from routes.flow_sync import master_node, save_flow

router = APIRouter()


@router.get("/")
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .filter(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return [serialize_project(p) for p in projects]


@router.get("/{project_id}")
def get_project(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_project(owned_project(db, user, project_id))


@router.post("/", status_code=201)
def create_project(body: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(
        user_id=user.id,
        title=body.title.strip() or "Untitled project",
        subject=body.subject.strip(),
        context=body.context,
        folder=body.folder.strip(),
        status=body.status,
        priority=body.priority,
        deadline=to_utc_naive(body.deadline),
    )
    db.add(project)
    db.flush()
    db.add(Flow(project_id=project.id, nodes=json.dumps([master_node(project)]), edges="[]"))
    db.commit()
    db.refresh(project)
    return serialize_project(project)


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    body: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = owned_project(db, user, project_id)
    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if field == "deadline":
            value = to_utc_naive(value)
        elif field == "title":
            value = (value or "").strip() or project.title
        elif isinstance(value, str):
            value = value.strip() if field in ("subject", "folder") else value
        setattr(project, field, value)
    if "title" in changes:  # keep the master node's label in step
        flow = project_flow(db, project)
        save_flow(db, flow, None, None)
    db.commit()
    db.refresh(project)
    return serialize_project(project)


@router.delete("/{project_id}")
def delete_project(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(owned_project(db, user, project_id))
    db.commit()
    return {"success": True}
