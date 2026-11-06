"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { projectsApi, tasksApi, type Project, type Task } from "@/lib/api";
import { formatMinutes } from "@/lib/format";
import { PriorityBadge } from "@/components/badges";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const chip: Record<string, string> = {
  high: "bg-muted-coral/15 text-muted-coral",
  medium: "bg-baby-blue/15 text-baby-blue-dark",
  low: "bg-soft-green/15 text-soft-green",
};

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => new Date().toDateString());
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });

  const year = month.getFullYear();
  const m = month.getMonth();
  const cells = useMemo(() => {
    const first = new Date(year, m, 1).getDay();
    const count = new Date(year, m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)] as (number | null)[];
  }, [year, m]);

  const tasksByDay = useMemo(() => group(tasks.filter((t) => t.due_date), (t) => new Date(t.due_date!).toDateString()), [tasks]);
  const deadlinesByDay = useMemo(
    () => group(projects.filter((p) => p.deadline), (p) => new Date(p.deadline!).toDateString()),
    [projects]
  );
  const flowFor = new Map(projects.map((p) => [p.id, p.flow_id]));
  const today = new Date().toDateString();
  const selectedTasks = tasksByDay[selected] ?? [];
  const selectedDeadlines = deadlinesByDay[selected] ?? [];

  return (
    <div className="max-w-5xl p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every step and deadline in one place.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass mt-6 rounded-2xl p-3 shadow-soft sm:mt-8 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <button onClick={() => setMonth(new Date(year, m - 1, 1))} aria-label="Previous month" className="press rounded-xl p-2 hover:bg-muted">
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-base font-medium text-foreground sm:text-lg">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button onClick={() => setMonth(new Date(year, m + 1, 1))} aria-label="Next month" className="press rounded-xl p-2 hover:bg-muted">
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div key={d} className="py-1.5 text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="h-14 sm:h-24" />;
            const key = new Date(year, m, day).toDateString();
            const dayTasks = tasksByDay[key] ?? [];
            const deadlines = deadlinesByDay[key] ?? [];
            const isToday = key === today;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex h-14 flex-col items-stretch rounded-xl p-1 text-left transition-colors sm:h-24 sm:p-1.5 ${
                  isSelected ? "bg-baby-blue/10 ring-1 ring-baby-blue/40" : "hover:bg-muted/50"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center self-center rounded-full text-xs sm:self-start ${
                    isToday ? "bg-baby-blue font-medium text-white" : "text-foreground"
                  }`}
                >
                  {day}
                </span>
                {/* Phones: dots. Larger screens: chips. */}
                <span className="mt-1 flex justify-center gap-0.5 sm:hidden">
                  {deadlines.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-muted-coral" />}
                  {dayTasks.slice(0, 3).map((t) => (
                    <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${t.status === "done" ? "bg-soft-green" : "bg-baby-blue"}`} />
                  ))}
                </span>
                <span className="mt-0.5 hidden space-y-0.5 overflow-hidden sm:block">
                  {deadlines.slice(0, 1).map((p) => (
                    <span key={p.id} className="flex items-center gap-0.5 truncate rounded-md bg-muted-coral/20 px-1 py-0.5 text-[9px] font-semibold text-muted-coral">
                      <Flag className="h-2.5 w-2.5 shrink-0" /> {p.title}
                    </span>
                  ))}
                  {dayTasks.slice(0, deadlines.length ? 1 : 2).map((t) => (
                    <span
                      key={t.id}
                      className={`block truncate rounded-md px-1 py-0.5 text-[9px] font-medium ${
                        t.status === "done" ? "bg-muted text-muted-foreground line-through" : chip[t.priority] || chip.medium
                      }`}
                    >
                      {t.title}
                    </span>
                  ))}
                  {dayTasks.length + deadlines.length > 2 && (
                    <span className="block text-[9px] text-muted-foreground">+{dayTasks.length + deadlines.length - 2} more</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <section className="glass mt-4 rounded-2xl p-4 shadow-soft sm:p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </h2>
        {selectedDeadlines.length === 0 && selectedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
        ) : (
          <div className="space-y-1.5">
            {selectedDeadlines.map((p: Project) => (
              <Link key={p.id} href={p.flow_id ? `/flow/${p.flow_id}` : "/projects"} className="flex items-center gap-2 rounded-xl bg-muted-coral/10 px-3 py-2 text-sm text-foreground hover:bg-muted-coral/15">
                <Flag className="h-4 w-4 text-muted-coral" />
                <span className="flex-1 truncate font-medium">{p.title} is due</span>
              </Link>
            ))}
            {selectedTasks.map((t: Task) => (
              <Link
                key={t.id}
                href={flowFor.get(t.project_id) ? `/flow/${flowFor.get(t.project_id)}` : "/projects"}
                className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-muted/50"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${t.status === "done" ? "bg-soft-green" : "bg-baby-blue"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${t.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{t.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {t.project_title}
                    {t.estimate_minutes ? ` · ${formatMinutes(t.estimate_minutes)}` : ""}
                  </span>
                </span>
                <PriorityBadge priority={t.priority} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function group<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) (out[key(item)] ??= []).push(item);
  return out;
}
