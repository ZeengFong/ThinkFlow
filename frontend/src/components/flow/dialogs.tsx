"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiError, projectsApi, tasksApi, type Priority, type Project, type Task } from "@/lib/api";
import { dateInputValue, fromLocalInputs, PRIORITIES, priorityDot, priorityPill, timeInputValue } from "@/lib/format";
import { toast } from "@/lib/toast";

export function Modal({
  open,
  title,
  onClose,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`max-h-[90dvh] w-full ${width} overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-soft-lg sm:rounded-2xl`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-card-foreground">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="press rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-baby-blue";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";
const primaryButton =
  "press w-full rounded-xl bg-baby-blue px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:bg-baby-blue-dark disabled:opacity-50";

/* ─────────────── Due date ─────────────── */

export function DueDateDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  return (
    <Modal open={!!task} title="Due date" onClose={onClose} width="max-w-sm">
      {task && <DueDateForm key={task.id} task={task} onClose={onClose} />}
    </Modal>
  );
}

function DueDateForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => dateInputValue(task.due_date));
  const [time, setTime] = useState(() => timeInputValue(task.due_date));

  const save = useMutation({
    mutationFn: (due_date: string | null) => tasksApi.update(task.id, { due_date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <>
      <p className="mb-3 line-clamp-2 text-sm text-foreground">{task.title}</p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label htmlFor="due-date" className={labelClass}>Date</label>
          <input id="due-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="due-time" className={labelClass}>Time</label>
          <input id="due-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {task.due_date && (
          <button
            onClick={() => save.mutate(null)}
            disabled={save.isPending}
            className="press rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
          >
            Remove
          </button>
        )}
        <button onClick={() => date && save.mutate(fromLocalInputs(date, time))} disabled={!date || save.isPending} className={primaryButton}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

/* ─────────────── Project settings ─────────────── */

export function ProjectSettingsDialog({
  project,
  open,
  onClose,
}: {
  project: Project | undefined;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open && !!project} title="Project settings" onClose={onClose}>
      {project && <ProjectSettingsForm project={project} onClose={onClose} />}
    </Modal>
  );
}

function ProjectSettingsForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(project.title);
  const [subject, setSubject] = useState(project.subject);
  const [deadline, setDeadline] = useState(() => dateInputValue(project.deadline));
  const [context, setContext] = useState(project.context || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const save = useMutation({
    mutationFn: () =>
      projectsApi.update(project.id, {
        title: title.trim(),
        subject: subject.trim(),
        context,
        deadline: deadline ? fromLocalInputs(deadline, "23:59") : null,
      }),
    onSuccess: () => {
      refresh();
      toast.success("Project saved");
      onClose();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const result = await projectsApi.uploadPdf(project.id, file);
      toast.success(`Added "${result.filename}" (${result.extracted_length.toLocaleString()} characters) to the AI's context`);
      const updated = await projectsApi.get(project.id);
      setContext(updated.context || "");
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div>
          <label htmlFor="ps-title" className={labelClass}>Title</label>
          <input id="ps-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ps-subject" className={labelClass}>Course / subject</label>
            <input id="ps-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. CPSC 331" className={inputClass} />
          </div>
          <div>
            <label htmlFor="ps-deadline" className={labelClass}>Deadline</label>
            <input id="ps-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="ps-context" className={labelClass}>What&apos;s this about? (the AI reads this)</label>
          <textarea
            id="ps-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={5}
            placeholder="Paste the assignment instructions, rubric, or what you need to learn…"
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="press flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-3 text-xs font-medium text-muted-foreground transition-colors hover:border-baby-blue hover:text-foreground disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Reading PDF…" : "Upload assignment / syllabus PDF"}
          </button>
        </div>
      </div>
      <button onClick={() => save.mutate()} disabled={save.isPending || !title.trim()} className={`${primaryButton} mt-4`}>
        {save.isPending ? "Saving…" : "Save"}
      </button>
    </>
  );
}

/* ─────────────── Add step ─────────────── */

export function AddStepDialog({
  open,
  parents,
  defaultParent,
  onClose,
  onAdd,
}: {
  open: boolean;
  parents: { id: string; label: string }[];
  defaultParent: string;
  onClose: () => void;
  onAdd: (label: string, priority: Priority, parentId: string) => void;
}) {
  return (
    <Modal open={open} title="Add a step" onClose={onClose} width="max-w-sm">
      <AddStepForm parents={parents} defaultParent={defaultParent} onClose={onClose} onAdd={onAdd} />
    </Modal>
  );
}

function AddStepForm({
  parents,
  defaultParent,
  onClose,
  onAdd,
}: {
  parents: { id: string; label: string }[];
  defaultParent: string;
  onClose: () => void;
  onAdd: (label: string, priority: Priority, parentId: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [parent, setParent] = useState(defaultParent);

  const submit = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), priority, parent);
    onClose();
  };

  return (
    <>
      <label htmlFor="as-label" className={labelClass}>Step</label>
      <input
        id="as-label"
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="e.g. Write the introduction"
        className={`${inputClass} mb-3`}
      />
      <label htmlFor="as-parent" className={labelClass}>Under</label>
      <select id="as-parent" value={parent} onChange={(e) => setParent(e.target.value)} className={`${inputClass} mb-3 bg-card`}>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <span className={labelClass}>Priority</span>
      <div className="mb-4 flex gap-2">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition-all ${
              priority === p ? priorityPill[p] : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${priorityDot[p]}`} />
            {p}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={!label.trim()} className={primaryButton}>
        Add step
      </button>
    </>
  );
}

/* ─────────────── Generate with AI ─────────────── */

export function GenerateDialog({
  open,
  hasSteps,
  onClose,
  onGenerate,
}: {
  open: boolean;
  hasSteps: boolean;
  onClose: () => void;
  onGenerate: (goal: string) => void;
}) {
  return (
    <Modal open={open} title={hasSteps ? "Add more steps with AI" : "Build my plan with AI"} onClose={onClose} width="max-w-sm">
      <GenerateForm hasSteps={hasSteps} onClose={onClose} onGenerate={onGenerate} />
    </Modal>
  );
}

function GenerateForm({
  hasSteps,
  onClose,
  onGenerate,
}: {
  hasSteps: boolean;
  onClose: () => void;
  onGenerate: (goal: string) => void;
}) {
  const [goal, setGoal] = useState("");
  return (
    <>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {hasSteps
          ? "ThinkFlow will add new steps that aren't in your flow yet."
          : "ThinkFlow reads your project details and uploaded PDFs, then builds a step-by-step plan scheduled before your deadline."}
      </p>
      <label htmlFor="gen-goal" className={labelClass}>Anything to focus on? (optional)</label>
      <textarea
        id="gen-goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={3}
        placeholder={hasSteps ? "e.g. Add steps for studying for the quiz" : "e.g. I can study 2 hours on weekdays"}
        className={`${inputClass} mb-4 resize-none`}
      />
      <button
        onClick={() => {
          onGenerate(goal.trim());
          onClose();
        }}
        className={`${primaryButton} flex items-center justify-center gap-2`}
      >
        <Sparkles className="h-4 w-4" /> Generate
      </button>
    </>
  );
}
