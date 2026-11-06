import type { Priority, Task } from "@/lib/api";

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

export const priorityPill: Record<Priority, string> = {
  high: "bg-muted-coral/15 text-muted-coral border-muted-coral/30",
  medium: "bg-baby-blue/15 text-baby-blue-dark border-baby-blue/30",
  low: "bg-soft-green/15 text-soft-green border-soft-green/30",
};

export const priorityDot: Record<Priority, string> = {
  high: "bg-muted-coral",
  medium: "bg-baby-blue",
  low: "bg-soft-green",
};

export function cyclePriority(current?: string): Priority {
  const index = PRIORITIES.indexOf((current as Priority) || "medium");
  return PRIORITIES[(index + 1) % PRIORITIES.length];
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from today until the date (negative = in the past). */
export function daysUntil(iso: string): number {
  const ms = startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime();
  return Math.round(ms / 86_400_000);
}

/** "Today", "Tomorrow", "Mon 10", "Nov 24". */
export function formatDue(iso: string | null | undefined): string {
  if (!iso) return "";
  const days = daysUntil(iso);
  const date = new Date(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function deadlineLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const days = daysUntil(iso);
  const date = new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (days < 0) return `Was due ${date}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${date} · ${days} days left`;
}

export function isOverdue(task: Pick<Task, "due_date" | "status">): boolean {
  return !!task.due_date && task.status !== "done" && new Date(task.due_date).getTime() < Date.now();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local "YYYY-MM-DD" for <input type="date">. */
export function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local "HH:MM" for <input type="time">. */
export function timeInputValue(iso: string | null | undefined, fallback = "17:00"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combine local date + time inputs into an ISO timestamp. */
export function fromLocalInputs(date: string, time = "17:00"): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "17:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0).toISOString();
}

/** Strip provider prefixes: "openai/gpt-oss-120b" → "gpt-oss-120b". */
export function shortModel(model: string | null | undefined): string {
  return (model || "").replace(/^(models|openai|meta-llama|qwen)\//, "");
}
