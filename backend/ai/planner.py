"""
Turns the AI's JSON plan into flow nodes, edges and scheduled tasks.
"""

from __future__ import annotations

import re
import uuid
from datetime import date, datetime, time, timedelta
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from db_models import Flow, Project, Task
from routes.common import MASTER_NODE_ID, load_json_list
from routes.flow_sync import PRIORITIES, master_node, save_flow

MAX_STEPS = 30
MAX_DEPTH = 3  # main steps → substeps → sub-substeps
DUE_HOUR_LOCAL = 17  # due dates land at 5pm in the student's timezone
X_GAP, Y_GAP = 260, 170


def _parse_date(value: Any) -> Optional[date]:
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return None


def _parse_estimate(value: Any) -> Optional[int]:
    try:
        minutes = int(float(value))
    except (TypeError, ValueError):
        return None
    return max(5, min(minutes, 600))


def _clean_step(item: Any) -> Optional[dict[str, Any]]:
    if isinstance(item, str):
        item = {"title": item}
    if not isinstance(item, dict):
        return None
    title = str(item.get("title") or item.get("name") or item.get("task") or "").strip()
    title = re.sub(r"^\s*(\d+[.)]|[-*•])\s*", "", title).strip()[:120]
    if not title:
        return None
    priority = str(item.get("priority") or "medium").lower()
    kids = item.get("substeps") or item.get("children") or item.get("subtasks") or []
    return {
        "title": title,
        "priority": priority if priority in PRIORITIES else "medium",
        "estimate_minutes": _parse_estimate(item.get("estimate_minutes")),
        "due": _parse_date(item.get("due_date")),
        "substeps": kids if isinstance(kids, list) else [],
    }


def normalize_steps(raw: Any, depth: int = 0, budget: int = MAX_STEPS) -> list[dict[str, Any]]:
    """Lenient cleanup of model output: accepts a few key spellings, clamps values and
    caps the total number of steps breadth-first, so every main step keeps substeps."""
    if not isinstance(raw, list) or budget <= 0:
        return []
    steps = [s for s in (_clean_step(item) for item in raw) if s][: min(budget, 10)]
    remaining = budget - len(steps)
    for i, step in enumerate(steps):
        if depth + 1 >= MAX_DEPTH or remaining <= 0:
            step["substeps"] = []
            continue
        share = remaining // (len(steps) - i)  # split what's left evenly among the rest
        step["substeps"] = normalize_steps(step["substeps"], depth + 1, share)
        remaining -= len(_flatten(step["substeps"]))
    return steps


def _title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def drop_existing(steps: list[dict[str, Any]], existing_titles: set[str]) -> list[dict[str, Any]]:
    """Remove steps (and duplicates among themselves) that are already in the flow."""
    seen = {_title_key(t) for t in existing_titles}
    kept = []
    for step in steps:
        key = _title_key(step["title"])
        if key in seen:
            continue
        seen.add(key)
        step["substeps"] = drop_existing(step["substeps"], set())
        kept.append(step)
    return kept


def _flatten(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for step in steps:
        out.append(step)
        out.extend(_flatten(step["substeps"]))
    return out


def schedule(steps: list[dict[str, Any]], today: date, deadline: Optional[date]) -> None:
    """Clamp AI due dates into [today, deadline]; if the AI gave none, spread them out."""
    flat = _flatten(steps)
    if deadline is not None and deadline < today:
        deadline = None  # past deadline: don't force everything onto old dates
    if deadline is not None and not any(s["due"] for s in flat):
        leaves = [s for s in flat if not s["substeps"]]
        last = max(today, deadline - timedelta(days=1))
        span = (last - today).days
        for i, step in enumerate(leaves):
            step["due"] = today + timedelta(days=round(span * (i + 1) / len(leaves))) if leaves else None
    for step in flat:
        if step["due"] is None:
            continue
        if step["due"] < today:
            step["due"] = today
        if deadline is not None and step["due"] > deadline:
            step["due"] = deadline
    # A parent is due when its last substep is.
    def roll_up(step: dict[str, Any]) -> Optional[date]:
        child_dates = [d for d in (roll_up(k) for k in step["substeps"]) if d]
        if child_dates:
            step["due"] = max(child_dates)
        return step["due"]

    for step in steps:
        roll_up(step)


def _local_to_utc(day: date, tz_offset_minutes: int) -> datetime:
    return datetime.combine(day, time(DUE_HOUR_LOCAL)) + timedelta(minutes=tz_offset_minutes)


def apply_plan(
    db: Session,
    project: Project,
    flow: Flow,
    steps: list[dict[str, Any]],
    *,
    parent_node_id: Optional[str],
    tz_offset_minutes: int,
) -> list[str]:
    """Add the steps under the parent node. Returns the new node ids."""
    nodes = load_json_list(flow.nodes)
    edges = load_json_list(flow.edges)
    if not any(n.get("type") == "master" for n in nodes):
        nodes.insert(0, master_node(project))

    if parent_node_id:
        parent = next((n for n in nodes if n.get("id") == parent_node_id), None)
        if parent is None:
            raise HTTPException(status_code=404, detail="That step no longer exists")
    else:
        parent = next(n for n in nodes if n.get("type") == "master")

    created: list[str] = []

    def add(step: dict[str, Any], parent_id: str, px: float, py: float, index: int, siblings: int) -> None:
        node_id = f"node-{uuid.uuid4().hex[:10]}"
        x = px + (index - (siblings - 1) / 2) * X_GAP
        y = py + Y_GAP
        nodes.append(
            {
                "id": node_id,
                "type": "thinkflow",
                "position": {"x": x, "y": y},
                "data": {"label": step["title"], "priority": step["priority"]},
            }
        )
        edges.append({"id": f"e-{parent_id}-{node_id}", "source": parent_id, "target": node_id, "sourceHandle": "bottom"})
        project.tasks.append(
            Task(
                node_id=node_id,
                title=step["title"],
                priority=step["priority"],
                estimate_minutes=step["estimate_minutes"],
                due_date=_local_to_utc(step["due"], tz_offset_minutes) if step["due"] else None,
            )
        )
        created.append(node_id)
        for i, kid in enumerate(step["substeps"]):
            add(kid, node_id, x, y, i, len(step["substeps"]))

    position = parent.get("position") or {}
    px, py = float(position.get("x") or 0), float(position.get("y") or 0)
    for i, step in enumerate(steps):
        add(step, str(parent.get("id") or MASTER_NODE_ID), px, py, i, len(steps))

    save_flow(db, flow, nodes, edges)
    return created
