"""
Prompts for the flow planner and the chat assistant, plus the project
context both of them see.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional

from db_models import Flow, Project, Task, User
from routes.common import load_json_list

MAX_CONTEXT_CHARS = 12_000

PLANNER_SYSTEM = """You are ThinkFlow, a planning assistant for students. You turn an assignment, \
exam or project into a clear hierarchy of concrete, actionable steps.

Reply with ONLY a JSON object in exactly this shape:
{
  "steps": [
    {
      "title": "Verb-first, specific step (max 80 characters)",
      "priority": "high" | "medium" | "low",
      "estimate_minutes": 45,
      "due_date": "YYYY-MM-DD" or null,
      "substeps": [ { same fields, "substeps": [] } ]
    }
  ]
}

Rules:
- Make every step specific to THIS student's work (use the course, topic and uploaded material). \
Never write generic filler like "Research the topic".
- Start every title with a verb. No numbering in titles.
- Order steps in the sequence they should be done.
- estimate_minutes: a realistic estimate for one focused student (15-240).
- priority: "high" for steps that are hard, graded heavily or block other steps.
- Due dates: if a deadline is given, schedule every step between today and the deadline, in order, \
leaving a buffer day before the deadline. Respect the student's study preferences. With no deadline, use null.
- Do not repeat steps that already exist in the current flow."""

CHAT_SYSTEM = """You are ThinkFlow, a friendly, practical study and planning assistant for a student. \
You help them break work into steps, decide priorities, plan study sessions and get unstuck.

Reply with ONLY a JSON object:
{
  "reply": "your answer in Markdown: short paragraphs and bullet lists, concise and skimmable",
  "suggested_tasks": [ { "title": "Verb-first step (max 80 characters)", "priority": "high" | "medium" | "low" } ],
  "group_title": "2-5 word name for the suggested steps as a group, e.g. Presentation prep (or empty)"
}

- suggested_tasks: include 1-8 items ONLY when your reply proposes concrete new steps the student \
could add to their flow; otherwise an empty list. Don't suggest steps that already exist.
- Use what you know about their project, flow and progress. Be encouraging but honest.
- Keep replies under about 200 words unless the student asks for detail."""


def _local_date(dt: datetime, tz_offset_minutes: int) -> date:
    return (dt - timedelta(minutes=tz_offset_minutes)).date()


def flow_outline(flow: Optional[Flow], tasks: list[Task]) -> str:
    """The flow as an indented outline, with each step's status and due date."""
    if flow is None:
        return "(empty)"
    nodes = {n.get("id"): n for n in load_json_list(flow.nodes)}
    children: dict[str, list[str]] = {}
    has_parent: set[str] = set()
    for edge in load_json_list(flow.edges):
        source, target = edge.get("source"), edge.get("target")
        if source in nodes and target in nodes and target not in has_parent:
            children.setdefault(source, []).append(target)
            has_parent.add(target)
    by_node = {t.node_id: t for t in tasks if t.node_id}

    lines: list[str] = []

    def walk(node_id: str, depth: int, seen: set[str]) -> None:
        if node_id in seen or len(lines) > 200:
            return
        seen.add(node_id)
        node = nodes[node_id]
        if node.get("type") != "master":
            task = by_node.get(node_id)
            label = (node.get("data") or {}).get("label", "")
            details = [(node.get("data") or {}).get("priority", "medium")]
            if task is not None:
                details.insert(0, "done" if task.status == "done" else "to do")
                if task.due_date:
                    details.append(f"due {task.due_date.date().isoformat()}")
            lines.append(f"{'  ' * depth}- {label} ({', '.join(details)})")
            depth += 1
        for child in children.get(node_id, []):
            walk(child, depth, seen)

    seen: set[str] = set()
    roots = [nid for nid in nodes if nid not in has_parent]
    roots.sort(key=lambda nid: nodes[nid].get("type") != "master")
    for root in roots:
        walk(root, 0, seen)
    return "\n".join(lines) if lines else "(empty: no steps yet)"


def project_context(
    project: Project,
    user: User,
    flow: Optional[Flow],
    *,
    today: Optional[date] = None,
    tz_offset_minutes: int = 0,
) -> str:
    today = today or date.today()
    parts = [
        f"Today: {today.isoformat()} ({today.strftime('%A')})",
        f"Project: {project.title}",
    ]
    if project.subject:
        parts.append(f"Course / subject: {project.subject}")
    if project.deadline:
        parts.append(f"Deadline: {_local_date(project.deadline, tz_offset_minutes).isoformat()}")
    else:
        parts.append("Deadline: none set")
    if (user.system_prompt or "").strip():
        parts.append(f"Student's study preferences: {user.system_prompt.strip()}")
    if (project.context or "").strip():
        ctx = project.context.strip()
        if len(ctx) > MAX_CONTEXT_CHARS:
            ctx = ctx[:MAX_CONTEXT_CHARS] + "\n…[truncated]"
        parts.append(f"Project notes and uploaded material:\n{ctx}")
    parts.append(f"Current flow:\n{flow_outline(flow, list(project.tasks))}")
    return "\n\n".join(parts)


def planner_messages(context: str, *, focus_step: Optional[str], goal: Optional[str]) -> list[dict[str, Any]]:
    if focus_step:
        ask = (
            f'Break down ONLY this one step: "{focus_step}".\n'
            'Return 2-6 smaller, concrete substeps of it in "steps", with empty "substeps". '
            "Do NOT return the whole plan and do NOT repeat any step already in the current flow."
        )
    else:
        ask = (
            "Build a complete plan for this project, from first step to submission: 3-6 main steps, "
            "each with 2-4 substeps (at most 24 steps in total)."
        )
    if goal:
        ask += f"\nThe student adds: {goal}"
    return [
        {"role": "system", "content": PLANNER_SYSTEM},
        {"role": "user", "content": f"{context}\n\n{ask}"},
    ]
