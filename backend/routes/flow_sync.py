"""
Keeps a flow's nodes and the project's tasks in step.

Every non-master node is backed by exactly one task (task.node_id == node.id).
The flow JSON owns structure, position, label and priority; the task owns
status, due date and estimate.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from db_models import Flow, Project, Task
from routes.common import MASTER_NODE_ID, load_json_list

PRIORITIES = {"low", "medium", "high"}
MAX_NODES = 500
MAX_EDGES = 1000


def master_node(project: Project) -> dict[str, Any]:
    return {
        "id": MASTER_NODE_ID,
        "type": "master",
        "position": {"x": 0, "y": 0},
        "data": {"label": project.title},
    }


def _num(value: Any) -> float:
    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return 0.0


def clean_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only the fields we store; drop anything else the client sent."""
    cleaned, seen = [], set()
    for node in nodes[:MAX_NODES]:
        node_id = str(node.get("id") or "").strip()[:100]
        if not node_id or node_id in seen:
            continue
        seen.add(node_id)
        data = node.get("data") or {}
        position = node.get("position") or {}
        is_master = node.get("type") == "master"
        item: dict[str, Any] = {
            "id": node_id,
            "type": "master" if is_master else "thinkflow",
            "position": {"x": _num(position.get("x")), "y": _num(position.get("y"))},
            "data": {"label": str(data.get("label") or "").strip()[:300] or "Untitled step"},
        }
        if not is_master:
            priority = data.get("priority")
            item["data"]["priority"] = priority if priority in PRIORITIES else "medium"
        cleaned.append(item)
    return cleaned


def clean_edges(edges: list[dict[str, Any]], node_ids: set[str]) -> list[dict[str, Any]]:
    cleaned, seen = [], set()
    for edge in edges[:MAX_EDGES]:
        source, target = str(edge.get("source") or ""), str(edge.get("target") or "")
        if source not in node_ids or target not in node_ids or source == target:
            continue
        if (source, target) in seen:
            continue
        seen.add((source, target))
        item = {"id": str(edge.get("id") or f"e-{source}-{target}")[:200], "source": source, "target": target}
        for handle in ("sourceHandle", "targetHandle"):
            if edge.get(handle):
                item[handle] = str(edge[handle])[:50]
        cleaned.append(item)
    return cleaned


def sync_tasks(db: Session, project: Project, nodes: list[dict[str, Any]], previous_ids: set[str]) -> None:
    """Create/rename tasks for nodes. A task is deleted only when its node was in the
    previously saved flow and is now gone (so tasks whose node was never saved survive)."""
    by_node = {t.node_id: t for t in project.tasks if t.node_id}
    node_ids = set()
    for node in nodes:
        if node["type"] == "master":
            continue
        node_ids.add(node["id"])
        label, priority = node["data"]["label"], node["data"]["priority"]
        task = by_node.get(node["id"])
        if task is None:
            project.tasks.append(Task(node_id=node["id"], title=label, priority=priority))
        else:
            if task.title != label:
                task.title = label
            if task.priority != priority:
                task.priority = priority
    for task in list(project.tasks):
        if task.node_id and task.node_id in previous_ids and task.node_id not in node_ids:
            db.delete(task)


def save_flow(db: Session, flow: Flow, nodes: list[dict[str, Any]] | None, edges: list[dict[str, Any]] | None) -> None:
    """Validate and store nodes/edges, ensure the master node exists, sync tasks."""
    project = flow.project
    current_nodes = load_json_list(flow.nodes)
    current_edges = load_json_list(flow.edges)

    new_nodes = clean_nodes(nodes if nodes is not None else current_nodes)
    if not any(n["type"] == "master" for n in new_nodes):
        new_nodes.insert(0, master_node(project))
    for node in new_nodes:  # the master node always shows the project title
        if node["type"] == "master":
            node["data"]["label"] = project.title

    node_ids = {n["id"] for n in new_nodes}
    new_edges = clean_edges(edges if edges is not None else current_edges, node_ids)

    previous_ids = {str(n.get("id")) for n in current_nodes if n.get("type") != "master"}
    flow.nodes = json.dumps(new_nodes)
    flow.edges = json.dumps(new_edges)
    sync_tasks(db, project, new_nodes, previous_ids)


def attach_orphan_tasks(flow: Flow) -> bool:
    """Give every task without a node on this flow its own node (under the project),
    so steps can never be invisible. Returns True if the flow changed."""
    project = flow.project
    nodes = load_json_list(flow.nodes)
    edges = load_json_list(flow.edges)
    node_ids = {n.get("id") for n in nodes}
    orphans = [t for t in project.tasks if not t.node_id or t.node_id not in node_ids]
    if not orphans:
        return False
    if not any(n.get("type") == "master" for n in nodes):
        nodes.insert(0, master_node(project))
    master_id = next(n["id"] for n in nodes if n.get("type") == "master")
    right = max([float((n.get("position") or {}).get("x") or 0) for n in nodes] + [0.0])
    for i, task in enumerate(orphans):
        if not task.node_id or task.node_id in node_ids:
            task.node_id = f"node-{task.id[:10]}"
        nodes.append({
            "id": task.node_id,
            "type": "thinkflow",
            "position": {"x": right + 270 * (i + 1), "y": 170},
            "data": {"label": task.title, "priority": task.priority if task.priority in PRIORITIES else "medium"},
        })
        edges.append({"id": f"e-{master_id}-{task.node_id}", "source": master_id, "target": task.node_id,
                      "sourceHandle": "bottom", "targetHandle": "top"})
        node_ids.add(task.node_id)
    flow.nodes = json.dumps(clean_nodes(nodes))
    flow.edges = json.dumps(clean_edges(edges, node_ids))
    return True


def remove_node(flow: Flow, node_id: str) -> None:
    nodes = [n for n in load_json_list(flow.nodes) if n.get("id") != node_id]
    edges = [e for e in load_json_list(flow.edges) if node_id not in (e.get("source"), e.get("target"))]
    flow.nodes = json.dumps(nodes)
    flow.edges = json.dumps(edges)
