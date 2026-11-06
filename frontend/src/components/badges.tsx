import type { Priority } from "@/lib/api";
import { priorityPill } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-baby-blue/15 text-baby-blue-dark",
    completed: "bg-soft-green/15 text-soft-green",
    overdue: "bg-muted-coral/15 text-muted-coral",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[status] || colors.active}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority | string }) {
  const style = priorityPill[(priority as Priority) in priorityPill ? (priority as Priority) : "medium"];
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style}`}>{priority}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${value >= 100 ? "bg-soft-green" : "bg-baby-blue"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
