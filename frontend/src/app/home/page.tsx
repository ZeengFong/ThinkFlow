"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, tasksApi, type Project, type Task } from "@/lib/api";
import { Plus, Calendar, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.list(),
  });

  const queryClient = useQueryClient();
  const toggleTask = useMutation({
    mutationFn: (task: Task) =>
      tasksApi.update(task.id, {
        status: task.status === "done" ? "todo" : "done",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date).toDateString() === new Date().toDateString();
  });

  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">{today}</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Tasks */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 shadow-soft lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">
              Today&apos;s Tasks
            </h2>
            <span className="rounded-full bg-baby-blue/15 px-3 py-1 text-xs font-medium text-baby-blue-dark">
              {todayTasks.filter((t) => t.status === "done").length}/
              {todayTasks.length} done
            </span>
          </div>

          {loadingTasks ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No tasks due today — keep it up!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {todayTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <button
                      onClick={() => toggleTask.mutate(task)}
                      className="press text-baby-blue"
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        task.status === "done"
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>
                    <PriorityBadge priority={task.priority} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.section>

        {/* Quick Stats */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="glass rounded-2xl p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">Active Projects</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">
              {activeProjects.length}
            </p>
          </div>
          <div className="glass rounded-2xl p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">Tasks Remaining</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">
              {tasks.filter((t) => t.status === "todo").length}
            </p>
          </div>
          <div className="glass rounded-2xl p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="mt-1 text-3xl font-semibold text-soft-green">
              {tasks.filter((t) => t.status === "done").length}
            </p>
          </div>
        </motion.section>
      </div>

      {/* Projects Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Projects</h2>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-sm text-baby-blue hover:text-baby-blue-dark"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingProjects ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass flex flex-col items-center justify-center rounded-2xl py-12 shadow-soft">
            <Plus className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No projects yet.
            </p>
            <Link
              href="/projects"
              className="press mt-3 rounded-xl bg-baby-blue px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft"
            >
              Create one
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
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground group-hover:text-baby-blue-dark">
                    {project.title}
                  </h3>
                  <StatusBadge status={project.status} />
                </div>
                {project.subject && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {project.subject}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {project.tasks_done}/{project.task_count} tasks
                    </span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-baby-blue transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: "bg-muted-coral/15 text-muted-coral",
    medium: "bg-baby-blue/15 text-baby-blue-dark",
    low: "bg-soft-green/15 text-soft-green",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
        colors[priority] || colors.medium
      }`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-baby-blue/15 text-baby-blue-dark",
    completed: "bg-soft-green/15 text-soft-green",
    overdue: "bg-muted-coral/15 text-muted-coral",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
        colors[status] || colors.active
      }`}
    >
      {status}
    </span>
  );
}
