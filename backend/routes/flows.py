"""
Flows: the React Flow canvas (nodes + edges) for a project, stored as JSON.
Saving a flow also creates/renames/deletes the tasks behind its nodes.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from db_models import Flow, User
from models import FlowUpdate
from routes.common import owned_flow, owned_project, project_flow, serialize_flow
from routes.flow_sync import attach_orphan_tasks, save_flow

router = APIRouter()


def _with_all_tasks(db: Session, flow: Flow) -> dict:
    if attach_orphan_tasks(flow):
        db.commit()
        db.refresh(flow)
    return serialize_flow(flow)


@router.get("/project/{project_id}")
def get_flow_by_project(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = owned_project(db, user, project_id)
    flow = project_flow(db, project)
    db.commit()
    return _with_all_tasks(db, flow)


@router.get("/{flow_id}")
def get_flow(flow_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _with_all_tasks(db, owned_flow(db, user, flow_id))


@router.put("/{flow_id}")
def update_flow(
    flow_id: str,
    body: FlowUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    flow = owned_flow(db, user, flow_id)
    save_flow(db, flow, body.nodes, body.edges)
    db.commit()
    db.refresh(flow)
    return serialize_flow(flow)
