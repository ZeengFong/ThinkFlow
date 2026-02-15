"""
Pydantic schemas for API request/response validation.
Uses string IDs (not UUID) to match SQLite storage.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


# ─── Projects ───

class ProjectCreate(BaseModel):
    user_id: str
    title: str
    subject: str = ""
    status: str = "active"
    priority: int = 0
    deadline: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    deadline: Optional[datetime] = None


# ─── Flows ───

class FlowUpdate(BaseModel):
    nodes: Any = None
    edges: Any = None


# ─── Tasks ───

class TaskCreate(BaseModel):
    project_id: str
    title: str
    node_id: str = ""
    due_date: Optional[datetime] = None
    priority: str = "medium"
    status: str = "todo"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    node_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
