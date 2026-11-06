"use client";

import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Task } from "@/lib/api";
import { formatDue, formatMinutes, isOverdue, priorityPill } from "@/lib/format";

interface Props {
  tasks: Task[];
  onFocus: (nodeId: string) => void;
  onToggle: (task: Task) => void;
  onDue: (task: Task) => void;
}

/** Bottom sheet listing every step as a checklist, ordered by due date. */
export function TaskPanel({ tasks, onFocus, onToggle, onDue }: Props) {
  const [open, setOpen] = useState(false);
  const done = tasks.filter((t) => t.status === "done").length;

  const sorted = useMemo(() => {
    const time = (t: Task) => (t.due_date ? new Date(t.due_date).getTime() : Number.MAX_SAFE_INTEGER);
    return [...tasks].sort(
      (a, b) => Number(a.status === "done") - Number(b.status === "done") || time(a) - time(b)
    );
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center">
      <button
        onClick={() => setOpen(!open)}
        className="pointer-events-auto flex items-center gap-2 rounded-t-xl border border-b-0 border-border bg-card/90 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur-xl hover:text-foreground"
      >
        Steps {done}/{tasks.length} done
        <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-soft-green" style={{ width: `${(done / tasks.length) * 100}%` }} />
        </span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 240 }}
            exit={{ height: 0 }}
            className="pointer-events-auto w-full overflow-hidden border-t border-border bg-card/95 backdrop-blur-xl"
          >
            <div className="h-[240px] space-y-0.5 overflow-y-auto p-2 sm:p-3">
              {sorted.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <div key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                    <button
                      onClick={() => onToggle(task)}
                      aria-label={task.status === "done" ? "Mark as not done" : "Mark as done"}
                      className="shrink-0 text-baby-blue"
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4 text-soft-green" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => task.node_id && onFocus(task.node_id)}
                      className={`min-w-0 flex-1 truncate text-left text-xs ${
                        task.status === "done" ? "text-muted-foreground line-through" : "text-foreground hover:text-baby-blue-dark"
                      }`}
                    >
                      {task.title}
                    </button>
                    {task.estimate_minutes ? (
                      <span className="hidden items-center gap-0.5 text-[10px] text-muted-foreground sm:flex">
                        <Clock className="h-2.5 w-2.5" />
                        {formatMinutes(task.estimate_minutes)}
                      </span>
                    ) : null}
                    <button
                      onClick={() => onDue(task)}
                      className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        overdue ? "bg-muted-coral/15 text-muted-coral" : task.due_date ? "bg-baby-blue/10 text-baby-blue-dark" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <CalendarDays className="h-2.5 w-2.5" />
                      {task.due_date ? formatDue(task.due_date) : "Date"}
                    </button>
                    <span className={`hidden rounded-full border px-1.5 py-px text-[10px] font-medium sm:inline ${priorityPill[task.priority] || priorityPill.medium}`}>
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
