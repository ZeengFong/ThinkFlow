"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FlowNodeData, Priority } from "@/lib/api";
import { deadlineLabel, formatDue, formatMinutes, isOverdue, priorityDot, priorityPill } from "@/lib/format";
import { useFlowActions } from "./flow-context";

export type StepNode = Node<FlowNodeData, "task">;
export type ProjectNode = Node<FlowNodeData, "master">;

const handleClass =
  "!h-2.5 !w-2.5 !border-2 !border-baby-blue-dark !bg-baby-blue !opacity-0 transition-opacity group-hover:!opacity-70 hover:!opacity-100";

/* ─────────────── Project (master) node ─────────────── */

export function MasterNode({ data }: NodeProps<ProjectNode>) {
  const { project } = useFlowActions();
  const total = project?.task_count ?? 0;
  const done = project?.tasks_done ?? 0;
  return (
    <div className="group w-[320px] rounded-2xl border-2 border-baby-blue-dark bg-gradient-to-br from-baby-blue/25 to-baby-blue/5 px-5 py-4 shadow-soft-lg backdrop-blur">
      <p className="line-clamp-2 text-center text-lg font-bold leading-snug tracking-tight text-foreground">
        {data.label}
      </p>
      <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] text-baby-blue-dark">
        {project?.deadline ? <span>{deadlineLabel(project.deadline)}</span> : <span>Project goal</span>}
        {total > 0 && (
          <>
            <span className="opacity-50">·</span>
            <span>
              {done}/{total} done
            </span>
          </>
        )}
      </div>
      {total > 0 && (
        <div className="mx-auto mt-2 h-1 w-40 overflow-hidden rounded-full bg-baby-blue/15">
          <div className="h-full rounded-full bg-soft-green transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
    </div>
  );
}

/* ─────────────── Step (task) node ─────────────── */

export function TaskNode({ id, data, selected }: NodeProps<StepNode>) {
  const actions = useFlowActions();
  const task = actions.tasksByNode.get(id);
  const done = task?.status === "done";
  const editing = actions.editingId === id;
  const busy = actions.busyNodeId === id;
  const overdue = task ? isOverdue(task) : false;
  const priority = (data.priority || "medium") as Priority;

  return (
    <div
      className={`group relative w-[236px] rounded-2xl border-2 bg-card px-3 py-2.5 shadow-soft transition-[border-color,box-shadow,opacity] hover:shadow-soft-lg ${
        done ? "border-soft-green/50 opacity-70" : selected ? "border-baby-blue-dark" : "border-baby-blue/60"
      }`}
    >
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left" style={{ top: 24 }} className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="spine" style={{ left: 16 }} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Right} id="right" style={{ top: 24 }} className={handleClass} />

      {/* Hover toolbar */}
      <div className="nodrag absolute -top-3.5 right-2 flex gap-0.5 rounded-full border border-border bg-card p-0.5 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100">
        {actions.aiReady && (
          <ToolButton label="Break down with AI" onClick={() => actions.breakDown(id)} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-baby-blue" />}
          </ToolButton>
        )}
        <ToolButton label="Add sub-step" onClick={() => actions.addChild(id)}>
          <Plus className="h-3 w-3" />
        </ToolButton>
        <ToolButton label="Delete step" onClick={() => actions.remove(id)} danger>
          <Trash2 className="h-3 w-3" />
        </ToolButton>
      </div>

      <div className="flex items-start gap-2">
        <button
          onClick={() => actions.toggleDone(id)}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          className="nodrag mt-0.5 shrink-0 text-baby-blue transition-transform hover:scale-110"
        >
          {done ? <CheckCircle2 className="h-4 w-4 text-soft-green" /> : <Circle className="h-4 w-4" />}
        </button>
        {editing ? (
          <LabelEditor
            initial={data.label}
            onDone={(value) => {
              actions.setEditingId(null);
              if (value !== null) actions.rename(id, value);
            }}
          />
        ) : (
          <p
            onDoubleClick={() => actions.setEditingId(id)}
            title="Double-click to rename"
            className={`line-clamp-3 flex-1 cursor-text text-[13px] font-medium leading-snug ${
              done ? "text-muted-foreground line-through" : "text-card-foreground"
            }`}
          >
            {data.label}
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <button
          onClick={() => actions.cyclePriority(id)}
          title="Click to change priority"
          className={`nodrag inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium ${priorityPill[priority]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[priority]}`} />
          {priority}
        </button>
        {task?.estimate_minutes ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {formatMinutes(task.estimate_minutes)}
          </span>
        ) : null}
        <button
          onClick={() => actions.openDueDate(id)}
          className={`nodrag inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-medium transition-colors ${
            overdue
              ? "bg-muted-coral/15 text-muted-coral"
              : task?.due_date
                ? "bg-baby-blue/10 text-baby-blue-dark"
                : "text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100"
          }`}
        >
          <CalendarDays className="h-2.5 w-2.5" />
          {task?.due_date ? formatDue(task.due_date) : "Set date"}
        </button>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-full p-1 text-muted-foreground transition-colors disabled:opacity-50 ${
        danger ? "hover:bg-muted-coral/15 hover:text-muted-coral" : "hover:bg-baby-blue/15 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LabelEditor({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (result: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(result);
  };

  return (
    <textarea
      ref={ref}
      value={value}
      rows={2}
      maxLength={200}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finish(value);
        } else if (e.key === "Escape") {
          finish(null);
        }
      }}
      className="nodrag nopan flex-1 resize-none rounded-md bg-muted/60 px-1 text-[13px] font-medium leading-snug text-foreground outline-none ring-1 ring-baby-blue"
    />
  );
}
