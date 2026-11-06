"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi, apiError, projectsApi } from "@/lib/api";
import { FileText, Folder, FolderOpen, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deadlineLabel, fromLocalInputs } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/flow/dialogs";
import { ProgressBar, StatusBadge } from "@/components/badges";

const FILTERS = ["all", "active", "completed", "overdue"];

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");

  const { data: projects = [], isLoading } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });

  const deleteMut = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Project deleted");
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const filtered = projects.filter((p) => {
    const statusMatch = filter === "all" || p.status === filter;
    const folderMatch =
      folderFilter === "all" || (folderFilter === "uncategorized" ? !p.folder : p.folder === folderFilter);
    return statusMatch && folderMatch;
  });
  const folders = [...new Set(projects.map((p) => p.folder).filter(Boolean))].sort();

  return (
    <div className="max-w-6xl p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 && "s"}
            {folders.length > 0 && ` in ${folders.length} folder${folders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="press flex shrink-0 items-center gap-2 rounded-xl bg-baby-blue px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-baby-blue-dark"
        >
          <Plus className="h-4 w-4" /> New project
        </button>
      </motion.div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`press rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all ${
              filter === f ? "bg-baby-blue text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {folders.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[{ id: "all", label: "All folders" }, ...folders.map((f) => ({ id: f, label: f })), ...(projects.some((p) => !p.folder) ? [{ id: "uncategorized", label: "Uncategorized" }] : [])].map(
            (f) => (
              <button
                key={f.id}
                onClick={() => setFolderFilter(folderFilter === f.id ? "all" : f.id)}
                className={`press flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  folderFilter === f.id ? "bg-soft-green text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Folder className="h-3 w-3" />
                {f.label}
              </button>
            )
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center shadow-soft">
          <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {projects.length === 0 ? "No projects yet. Add your first assignment, exam or goal." : "No matching projects."}
          </p>
          {projects.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="press mt-4 rounded-xl bg-baby-blue px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft"
            >
              Create a project
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="glass group relative rounded-2xl shadow-soft transition-all hover:shadow-soft-lg"
            >
              <button
                onClick={() => confirm(`Delete "${project.title}" and all its steps? This can't be undone.`) && deleteMut.mutate(project.id)}
                aria-label={`Delete ${project.title}`}
                className="press absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <Link href={project.flow_id ? `/flow/${project.flow_id}` : "#"} className="block p-5">
                <div className="flex items-start gap-3 pr-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-baby-blue/15">
                    <FolderOpen className="h-5 w-5 text-baby-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-medium text-foreground">{project.title}</h3>
                    {project.subject && <p className="truncate text-xs text-muted-foreground">{project.subject}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                  {project.folder && (
                    <span className="flex items-center gap-0.5 rounded-full bg-soft-green/10 px-1.5 py-0.5 text-[10px] font-medium text-soft-green">
                      <Folder className="h-2.5 w-2.5" />
                      {project.folder}
                    </span>
                  )}
                  {project.deadline && <span className="text-xs text-muted-foreground">{deadlineLabel(project.deadline)}</span>}
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {project.task_count ? `${project.tasks_done}/${project.task_count} steps` : "No steps yet"}
                    </span>
                    <span>{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showCreate} title="New project" onClose={() => setShowCreate(false)}>
        <CreateProjectForm folders={folders} onDone={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-baby-blue";

function CreateProjectForm({ folders, onDone }: { folders: string[]; onDone: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const aiStatus = useQuery({ queryKey: ["ai-status"], queryFn: aiApi.status, staleTime: 60_000, retry: false });
  const aiReady = !!aiStatus.data?.configured;

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [folder, setFolder] = useState("");
  const [context, setContext] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [buildWithAI, setBuildWithAI] = useState(true);
  const [stage, setStage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const create = async () => {
    if (!title.trim() || stage) return;
    try {
      setStage("Creating project…");
      const project = await projectsApi.create({
        title: title.trim(),
        subject: subject.trim(),
        context,
        folder: folder.trim(),
        deadline: deadline ? fromLocalInputs(deadline, "23:59") : null,
      });
      if (pdf) {
        setStage("Reading your PDF…");
        try {
          await projectsApi.uploadPdf(project.id, pdf);
        } catch (err) {
          toast.error(`PDF upload failed: ${apiError(err)}`);
        }
      }
      let generated = false;
      if (buildWithAI && aiReady) {
        setStage("Building your plan…");
        try {
          await aiApi.generateFlow(project.id);
          generated = true;
        } catch (err) {
          toast.error(`Project created, but the AI plan failed: ${apiError(err)}`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onDone();
      router.push(`/flow/${project.flow_id}${generated ? "?new=1" : ""}`);
    } catch (err) {
      toast.error(apiError(err));
      setStage(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What are you working on? e.g. Hash table assignment"
        aria-label="Project title"
        className={inputClass}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Course (optional)" aria-label="Course" className={inputClass} />
        <div>
          <label htmlFor="np-deadline" className="sr-only">Deadline</label>
          <input id="np-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
        </div>
      </div>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        rows={3}
        aria-label="Details for the AI"
        placeholder="Details for the AI: paste the instructions, what it's worth, what you're unsure about…"
        className={`${inputClass} resize-none`}
      />

      <div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            setPdf(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {pdf ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-baby-blue/10 px-3 py-2">
            <FileText className="h-3.5 w-3.5 text-baby-blue" />
            <span className="flex-1 truncate text-xs font-medium text-baby-blue-dark">{pdf.name}</span>
            <button onClick={() => setPdf(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-3 text-xs font-medium text-muted-foreground transition-colors hover:border-baby-blue hover:text-foreground"
          >
            <Upload className="h-4 w-4" /> Add the assignment or syllabus PDF (optional)
          </button>
        )}
      </div>

      <details className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Folder (optional)</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(folder === f ? "" : f)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 font-medium ${
                folder === f ? "border-baby-blue/30 bg-baby-blue/15 text-baby-blue-dark" : "border-border hover:bg-muted"
              }`}
            >
              <Folder className="h-3 w-3" />
              {f}
            </button>
          ))}
        </div>
        <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="e.g. Fall 2026" className={`${inputClass} mt-2 py-2`} />
      </details>

      <label className={`flex items-center gap-2 rounded-xl px-1 text-xs ${aiReady ? "text-foreground" : "text-muted-foreground"}`}>
        <input
          type="checkbox"
          checked={buildWithAI && aiReady}
          disabled={!aiReady}
          onChange={(e) => setBuildWithAI(e.target.checked)}
          className="h-4 w-4 accent-[#89cff0]"
        />
        <Sparkles className="h-3.5 w-3.5 text-baby-blue" />
        {aiReady ? "Build my plan with AI right away" : "AI planning is off (no AI key set)"}
      </label>

      <button
        disabled={!title.trim() || !!stage}
        onClick={create}
        className="press flex w-full items-center justify-center gap-2 rounded-xl bg-baby-blue px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-baby-blue-dark disabled:opacity-50"
      >
        {stage && <Loader2 className="h-4 w-4 animate-spin" />}
        {stage ?? "Create project"}
      </button>
    </div>
  );
}
