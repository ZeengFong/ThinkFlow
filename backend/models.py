"""
Pydantic schemas for API request validation.
Uses string IDs (not UUID) to match database storage.
The owner of every record is taken from the sign-in token, never from the request body.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

Priority = Literal["low", "medium", "high"]


# ─── Projects ───

class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    subject: str = Field(default="", max_length=200)
    context: str = Field(default="", max_length=200_000)
    folder: str = Field(default="", max_length=100)
    status: str = "active"
    priority: int = 0
    deadline: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    subject: Optional[str] = Field(default=None, max_length=200)
    context: Optional[str] = Field(default=None, max_length=200_000)
    folder: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = None
    priority: Optional[int] = None
    deadline: Optional[datetime] = None


# ─── Flows ───

class FlowUpdate(BaseModel):
    nodes: Optional[list[dict[str, Any]]] = None
    edges: Optional[list[dict[str, Any]]] = None


# ─── Tasks ───

class TaskCreate(BaseModel):
    project_id: str
    title: str = Field(min_length=1, max_length=300)
    node_id: str = ""
    due_date: Optional[datetime] = None
    priority: Priority = "medium"
    status: Literal["todo", "done"] = "todo"
    estimate_minutes: Optional[int] = Field(default=None, ge=0, le=10_000)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    node_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[Priority] = None
    status: Optional[Literal["todo", "done"]] = None
    estimate_minutes: Optional[int] = Field(default=None, ge=0, le=10_000)


# ─── Current user ───

class MeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    theme: Optional[Literal["light", "dark"]] = None
    study_preferences: Optional[str] = Field(default=None, max_length=2_000)


# ─── AI ───

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4_000)
    flow_context: Optional[str] = Field(default=None, max_length=20_000)
    today: Optional[str] = None  # the student's local date, YYYY-MM-DD


class GenerateFlowRequest(BaseModel):
    project_id: str
    parent_node_id: Optional[str] = None  # break down this node; default = the master node
    goal: Optional[str] = Field(default=None, max_length=2_000)  # extra instructions
    today: Optional[str] = None  # the student's local date, YYYY-MM-DD
    tz_offset_minutes: int = 0  # JS Date.getTimezoneOffset() (minutes behind UTC)
