"""
SQLAlchemy ORM models matching the ThinkFlow schema.
"""

import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from config import utcnow
from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)  # Supabase user id (JWT "sub")
    email = Column(String, unique=True, nullable=False)
    name = Column(String, default="")
    avatar_url = Column(String, default="")
    theme = Column(String, default="dark")
    system_prompt = Column(Text, default="")  # the student's study preferences, sent to the AI
    created_at = Column(DateTime, default=utcnow)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, default="")
    context = Column(Text, default="")  # AI context for this project (incl. uploaded PDF text)
    openai_file_id = Column(String, default="")  # unused, kept for compatibility
    folder = Column(String, default="")  # folder grouping
    status = Column(String, default="active")  # active | completed | overdue
    priority = Column(Integer, default=0)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="projects")
    flows = relationship("Flow", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    chat_messages = relationship(
        "ChatMessage",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class Flow(Base):
    __tablename__ = "flows"

    id = Column(String, primary_key=True, default=gen_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    nodes = Column(Text, default="[]")  # JSON string (React Flow nodes: id, type, position, data)
    edges = Column(Text, default="[]")  # JSON string

    project = relationship("Project", back_populates="flows")


class Task(Base):
    """Every non-master node in a flow is backed by one task (matched by node_id)."""

    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=gen_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    node_id = Column(String, default="")
    title = Column(String, nullable=False)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String, default="medium")  # low | medium | high
    status = Column(String, default="todo")  # todo | done
    estimate_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    project = relationship("Project", back_populates="tasks")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False, default="")
    suggestions = Column(Text, default="[]")  # JSON: tasks the AI suggests adding to the flow
    suggestion_group = Column(String, default="")  # short name for those tasks, e.g. "Presentation prep"
    created_at = Column(DateTime, default=utcnow)

    project = relationship("Project", back_populates="chat_messages")


class AIUsage(Base):
    """Per-user daily AI request counter (protects the shared free API key)."""

    __tablename__ = "ai_usage"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_ai_usage_user_day"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    day = Column(String, nullable=False)  # YYYY-MM-DD (UTC)
    count = Column(Integer, default=0)
