"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Clock, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { apiError, projectsApi, tasksApi, type Task } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { daysUntil, deadlineLabel, formatDue, formatMinutes, isOverdue } from "@/lib/format";
import { toast } from "@/lib/toast";
import { PriorityBadge, ProgressBar, StatusBadge } from "@/components/badges";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: loadingProjects } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });

  const toggle = useMutation({
    mutationFn: (task: Task) => tasksApi.update(task.id, { status: task.status === "done" ? "todo" : "done" }),
    onMutate: (task) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((t) => (t.id === task.id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t))
      );
    },
    onError: (err) => toast.error(apiError(err)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const flowFor = new Map(projects.map((p) => [p.id, p.flow_id]));
  const byDue = (a: Task, b: Task) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
  const dated = tasks.filter((t) => t.due_date);
  const overdue = dated.filter((t) => isOverdue(t) && daysUntil(t.due_date!) < 0).sort(byDue);
  const today = dated.filter((t) => daysUntil(t.due_date!) === 0).sort(byDue);
  const week = dated.filter((t) => t.status !== "done" && daysUntil(t.due_date!) > 0 && daysUntil(t.due_date!) <= 7).sort(byDue);
  const nextUp = [...overdue, ...today, ...week].find((t) => t.status !== "done") ?? tasks.find((t) => t.status !== "done");
  const firstName = (user?.user_metadata?.full_name || "").split(" ")[0];
  const active = projects.filter((p) => p.status !== "completed");

  return (
    <div className="max-w-6xl p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {greeting()}
          {firstName && firstName !== "Local" ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </motion.div>

      {nextUp && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="glass flex items-center gap-3 rounded-2xl border border-baby-blue/30 p-4 shadow-soft">
            <button onClick={() => toggle.mutate(nextUp)} aria-label="Mark as done" className="press shrink-0 text-baby-blue">
              <Circle className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-baby-blue-dark">Next up</p>
              <p className="truncate font-medium text-foreground">{nextUp.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {nextUp.project_title}
                {nextUp.due_date && ` · ${formatDue(nextUp.due_date)}`}
                {nextUp.estimate_minutes ? ` · about ${formatMinutes(nextUp.estimate_minutes)}` : ""}
              </p>
            </div>
            {flowFor.get(nextUp.project_id) && (
              <Link
                href={`/flow/${flowFor.get(nextUp.project_id)}`}
                className="press flex shrink-0 items-center gap-1 rounded-xl bg-baby-blue px-3 py-2 text-xs font-medium text-primary-foreground shadow-soft"
              >
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass space-y-5 rounded-2xl p-4 shadow-soft sm:p-6 lg:col-span-2"
        >
          {loadingTasks ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <>
              {overdue.length > 0 && (
                <TaskGroup title="Overdue" tone="text-muted-coral" tasks={overdue} flowFor={flowFor} onToggle={(t) => toggle.mutate(t)} />
              )}
              <TaskGroup
                title="Today"
                tasks={today}
                flowFor={flowFor}
                onToggle={(t) => toggle.mutate(t)}
                empty={tasks.length ? "Nothing due today. Get ahead on something below." : "No steps yet. Create a project and let ThinkFlow plan it."}
              />
              {week.length > 0 && <TaskGroup title="This week" tasks={week} flowFor={flowFor} onToggle={(t) => toggle.mutate(t)} limit={6} />}
            </>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 content-start gap-3 lg:grid-cols-1 lg:gap-4 lg:self-start">
          <Stat label="Active projects" value={active.length} />
          <Stat label="Steps left" value={tasks.filter((t) => t.status !== "done").length} />
          <Stat label="Completed" value={tasks.filter((t) => t.status === "done").length} accent />
        </motion.section>
      </div>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Projects</h2>
          <Link href="/projects" className="flex items-center gap-1 text-sm text-baby-blue hover:text-baby-blue-dark">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loadingProjects ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center shadow-soft">
            <Sparkles className="mb-3 h-10 w-10 text-baby-blue/50" />
            <p className="text-sm text-muted-foreground">Add an assignment or exam and ThinkFlow will break it into steps for you.</p>
            <Link href="/projects" className="press mt-4 flex items-center gap-1.5 rounded-xl bg-baby-blue px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft">
              <Plus className="h-4 w-4" /> New project
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                href={project.flow_id ? `/flow/${project.flow_id}` : "/projects"}
                className="press glass group rounded-2xl p-5 shadow-soft transition-all hover:shadow-soft-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-medium text-foreground group-hover:text-baby-blue-dark">{project.title}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[project.subject, deadlineLabel(project.deadline)].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.task_count ? `${project.tasks_done}/${project.task_count} steps` : "No steps yet"}</span>
                    <span>{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-soft sm:p-5">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className={`mt-1 text-2xl font-semibold sm:text-3xl ${accent ? "text-soft-green" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  flowFor,
  onToggle,
  tone = "text-foreground",
  empty,
  limit,
}: {
  title: string;
  tasks: Task[];
  flowFor: Map<string, string | null>;
  onToggle: (task: Task) => void;
  tone?: string;
  empty?: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = limit && !expanded ? tasks.slice(0, limit) : tasks;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className={`text-sm font-medium ${tone}`}>{title}</h2>
        {tasks.length > 0 && (
          <span className="rounded-full bg-baby-blue/15 px-2.5 py-0.5 text-[11px] font-medium text-baby-blue-dark">
            {tasks.filter((t) => t.status === "done").length}/{tasks.length} done
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 opacity-50" /> {empty}
        </div>
      ) : (
        <div className="space-y-1">
          {shown.map((task) => (
            <div key={task.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50 sm:px-3">
              <button
                onClick={() => onToggle(task)}
                aria-label={task.status === "done" ? "Mark as not done" : "Mark as done"}
                className="press shrink-0 text-baby-blue"
              >
                {task.status === "done" ? <CheckCircle2 className="h-5 w-5 text-soft-green" /> : <Circle className="h-5 w-5" />}
              </button>
              <Link href={flowFor.get(task.project_id) ? `/flow/${flowFor.get(task.project_id)}` : "/projects"} className="min-w-0 flex-1">
                <p className={`truncate text-sm ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {task.project_title}
                  {task.due_date && ` · ${formatDue(task.due_date)}`}
                </p>
              </Link>
              {task.estimate_minutes ? (
                <span className="hidden items-center gap-0.5 text-[11px] text-muted-foreground sm:flex">
                  <Clock className="h-3 w-3" />
                  {formatMinutes(task.estimate_minutes)}
                </span>
              ) : null}
              <PriorityBadge priority={task.priority} />
            </div>
          ))}
          {shown.length < tasks.length && (
            <button onClick={() => setExpanded(true)} className="px-3 py-1 text-xs text-baby-blue hover:text-baby-blue-dark">
              Show {tasks.length - shown.length} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
