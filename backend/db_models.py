"""
SQLAlchemy ORM models matching the ThinkFlow schema.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, default="")
    avatar_url = Column(String, default="")
    theme = Column(String, default="light")
    system_prompt = Column(Text, default="")

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    subject = Column(String, default="")
    context = Column(Text, default="")  # AI context for this project
    openai_file_id = Column(String, default="")  # OpenAI Files API id for uploaded PDF
    folder = Column(String, default="")  # folder grouping
    status = Column(String, default="active")  # active | completed | overdue
    priority = Column(Integer, default=0)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    flows = relationship("Flow", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Flow(Base):
    __tablename__ = "flows"

    id = Column(String, primary_key=True, default=gen_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    nodes = Column(Text, default="[]")   # JSON string
    edges = Column(Text, default="[]")   # JSON string

    project = relationship("Project", back_populates="flows")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=gen_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    node_id = Column(String, default="")
    title = Column(String, nullable=False)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String, default="medium")  # low | medium | high
    status = Column(String, default="todo")       # todo | done
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")
