"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, type Project } from "@/lib/api";
import {
  Plus,
  Trash2,
  X,
  FolderOpen,
  Folder,
  Upload,
  FileText,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

export default function ProjectsPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [folder, setFolder] = useState("");
  const [filter, setFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadMsg, setPdfUploadMsg] = useState("");
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: () => projectsApi.list(user?.id),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: async (data: {
      title: string;
      subject: string;
      context: string;
      folder: string;
    }) => {
      const project = await projectsApi.create({ ...data, user_id: user?.id || "default" });
      // Upload PDF if one was selected
      if (pdfFile && project.id) {
        setPdfUploading(true);
        try {
          await projectsApi.uploadPdf(project.id, pdfFile);
        } catch (err) {
          console.error("PDF upload failed:", err);
        } finally {
          setPdfUploading(false);
        }
      }
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
      setTitle("");
      setSubject("");
      setContext("");
      setFolder("");
      setPdfFile(null);
      setPdfUploadMsg("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  // Apply both status AND folder filters
  const filteredProjects = projects.filter((p) => {
    const statusMatch = filter === "all" || p.status === filter;
    const folderMatch =
      folderFilter === "all" ||
      (folderFilter === "uncategorized" ? !p.folder : p.folder === folderFilter);
    return statusMatch && folderMatch;
  });

  // Get unique folder names for the folder selector
  const existingFolders = [
    ...new Set(projects.map((p) => p.folder).filter(Boolean)),
  ].sort();

  const filters = ["all", "active", "completed", "overdue"];

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-end justify-between"
      >
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="mt-1 text-muted-foreground">
            {projects.length} project{projects.length !== 1 && "s"}
            {existingFolders.length > 0 &&
              ` in ${existingFolders.length} folder${existingFolders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="press flex items-center gap-2 rounded-xl bg-baby-blue px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-baby-blue-dark"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </motion.div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`press rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all ${
              filter === f
                ? "bg-baby-blue text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-background p-6 shadow-soft-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">New Project</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="press rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project title"
                  className="w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-baby-blue focus:ring-1 focus:ring-baby-blue"
                />
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-baby-blue focus:ring-1 focus:ring-baby-blue"
                />

                {/* Folder selector */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Folder
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {existingFolders.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFolder(folder === f ? "" : f)}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                          folder === f
                            ? "border-baby-blue/30 bg-baby-blue/15 text-baby-blue-dark"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Folder className="h-3 w-3" />
                        {f}
                      </button>
                    ))}
                  </div>
                  <input
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder="Type folder name or select above"
                    className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm text-foreground outline-none transition-colors focus:border-baby-blue"
                  />
                </div>

                {/* AI Context */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    AI Context (optional)
                  </label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={3}
                    placeholder="Background info for AI: course details, goals, constraints…"
                    className="w-full resize-none rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-baby-blue"
                  />
                </div>

                {/* PDF Upload */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Upload PDF Context (optional)
                  </label>
                  <p className="mb-1.5 text-[10px] text-muted-foreground">
                    Upload a PDF — text will be extracted and added to AI context.
                  </p>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPdfFile(file);
                        setPdfUploadMsg(`Selected: ${file.name}`);
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="press flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-3 text-xs font-medium text-muted-foreground transition-colors hover:border-baby-blue hover:text-foreground"
                  >
                    <Upload className="h-4 w-4" />
                    {pdfFile ? "Change PDF file" : "Choose PDF file"}
                  </button>
                  {pdfFile && (
                    <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-baby-blue/10 px-2.5 py-1.5">
                      <FileText className="h-3.5 w-3.5 text-baby-blue" />
                      <span className="flex-1 truncate text-[11px] font-medium text-baby-blue-dark">
                        {pdfFile.name}
                      </span>
                      <button
                        onClick={() => {
                          setPdfFile(null);
                          setPdfUploadMsg("");
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  disabled={!title.trim() || createMut.isPending || pdfUploading}
                  onClick={() =>
                    createMut.mutate({ title, subject, context, folder })
                  }
                  className="press w-full rounded-xl bg-baby-blue px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-baby-blue-dark disabled:opacity-50"
                >
                  {pdfUploading
                    ? "Uploading PDF…"
                    : createMut.isPending
                      ? "Creating..."
                      : "Create Project"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Filters */}
      {existingFolders.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFolderFilter("all")}
            className={`press flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all ${
              folderFilter === "all"
                ? "bg-soft-green text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Folder className="h-3 w-3" />
            All Folders
          </button>
          {existingFolders.map((f) => (
            <button
              key={f}
              onClick={() => setFolderFilter(folderFilter === f ? "all" : f)}
              className={`press flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                folderFilter === f
                  ? "bg-soft-green text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Folder className="h-3 w-3" />
              {f}
            </button>
          ))}
          {projects.some((p) => !p.folder) && (
            <button
              onClick={() =>
                setFolderFilter(
                  folderFilter === "uncategorized" ? "all" : "uncategorized"
                )
              }
              className={`press flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                folderFilter === "uncategorized"
                  ? "bg-soft-green text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <FolderOpen className="h-3 w-3" />
              Uncategorized
            </button>
          )}
        </div>
      )}

      {/* Projects — flat grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass flex flex-col items-center justify-center rounded-2xl py-16 shadow-soft"
        >
          <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {filter === "all" && folderFilter === "all"
              ? "No projects yet. Create your first one!"
              : "No matching projects."}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="glass group relative rounded-2xl p-5 shadow-soft transition-all hover:shadow-soft-lg"
            >
              {/* Delete button */}
              <button
                onClick={() => deleteMut.mutate(project.id)}
                className="press absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <Link
                href={
                  project.flow_id ? `/flow/${project.flow_id}` : "#"
                }
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-baby-blue/15">
                    <FolderOpen className="h-5 w-5 text-baby-blue" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">
                      {project.title}
                    </h3>
                    {project.subject && (
                      <p className="text-xs text-muted-foreground">
                        {project.subject}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status badges */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={project.status} />
                  {project.folder && (
                    <span className="flex items-center gap-0.5 rounded-full bg-soft-green/10 px-1.5 py-0.5 text-[9px] font-medium text-soft-green">
                      <Folder className="h-2.5 w-2.5" />
                      {project.folder}
                    </span>
                  )}
                  {project.context && (
                    <span className="rounded-full bg-baby-blue/10 px-1.5 py-0.5 text-[9px] font-medium text-baby-blue">
                      AI context
                    </span>
                  )}
                  {project.deadline && (
                    <span className="text-xs text-muted-foreground">
                      Due{" "}
                      {new Date(
                        project.deadline
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
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
