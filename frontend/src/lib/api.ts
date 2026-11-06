import axios, { AxiosError } from "axios";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 90_000, // AI calls and sleeping free-tier servers can be slow
});

// Attach the Supabase access token to every request when signed in.
api.interceptors.request.use(async (config) => {
  if (!isSupabaseConfigured) return config; // local mode: no auth header
  try {
    const {
      data: { session },
    } = await createClient().auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Continue without an auth header; the backend will answer 401.
  }
  return config;
});

// Session expired or rejected: send the student back to the sign-in page.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      isSupabaseConfigured &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login?error=session";
    }
    return Promise.reject(error);
  }
);

/** A readable message from any API error. */
export function apiError(err: unknown): string {
  const e = err as AxiosError<{ detail?: unknown }>;
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return "Some fields are invalid. Please check and try again.";
  if (e?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (e?.message === "Network Error") return "Can't reach the ThinkFlow server.";
  return e?.message || "Something went wrong.";
}

/** The browser's local date (YYYY-MM-DD) and timezone offset, for AI scheduling. */
export function localDateInfo() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    today: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    tz_offset_minutes: now.getTimezoneOffset(),
  };
}

// ─── Types ───

export type Priority = "low" | "medium" | "high";

export interface Me {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  theme: "light" | "dark";
  study_preferences: string;
  auth_mode: "local" | "supabase";
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  context: string;
  folder: string;
  status: string;
  priority: number;
  deadline: string | null;
  created_at: string | null;
  task_count: number;
  tasks_done: number;
  progress: number;
  flow_id: string | null;
}

export type FlowNodeData = {
  label: string;
  priority?: Priority;
}

export interface StoredNode {
  id: string;
  type: "master" | "thinkflow";
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface StoredEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface FlowData {
  id: string;
  project_id: string;
  nodes: StoredNode[];
  edges: StoredEdge[];
}

export interface Task {
  id: string;
  project_id: string;
  project_title: string;
  node_id: string;
  title: string;
  due_date: string | null;
  priority: Priority;
  status: "todo" | "done";
  estimate_minutes: number | null;
  created_at: string | null;
}

export interface Suggestion {
  title: string;
  priority: Priority;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions: Suggestion[];
  suggestion_group: string;
  created_at: string | null;
}

export interface AIStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  providers: string[];
  error: string | null;
  usage: { used: number; limit: number };
}

export interface GenerateResult {
  flow: FlowData;
  tasks: Task[];
  created_node_ids: string[];
  provider: string;
  model: string;
}

// ─── Endpoints ───

export const meApi = {
  get: () => api.get<Me>("/api/me").then((r) => r.data),
  update: (data: Partial<Pick<Me, "name" | "theme" | "study_preferences">>) =>
    api.patch<Me>("/api/me", data).then((r) => r.data),
};

export const projectsApi = {
  list: () => api.get<Project[]>("/api/projects/").then((r) => r.data),
  get: (id: string) => api.get<Project>(`/api/projects/${id}`).then((r) => r.data),
  create: (data: {
    title: string;
    subject?: string;
    context?: string;
    folder?: string;
    deadline?: string | null;
  }) => api.post<Project>("/api/projects/", data).then((r) => r.data),
  update: (
    id: string,
    data: Partial<Pick<Project, "title" | "subject" | "context" | "folder" | "status" | "deadline">>
  ) => api.patch<Project>(`/api/projects/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
  uploadPdf: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<{ success: boolean; filename: string; extracted_length: number }>(
        `/api/projects/${projectId}/upload-pdf`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      .then((r) => r.data);
  },
};

export const flowsApi = {
  get: (id: string) => api.get<FlowData>(`/api/flows/${id}`).then((r) => r.data),
  getByProject: (projectId: string) =>
    api.get<FlowData>(`/api/flows/project/${projectId}`).then((r) => r.data),
  update: (id: string, data: { nodes: StoredNode[]; edges: StoredEdge[] }) =>
    api.put<FlowData>(`/api/flows/${id}`, data).then((r) => r.data),
};

export const tasksApi = {
  list: (projectId?: string) =>
    api
      .get<Task[]>("/api/tasks/", { params: projectId ? { project_id: projectId } : {} })
      .then((r) => r.data),
  update: (
    id: string,
    data: Partial<Pick<Task, "title" | "priority" | "status" | "estimate_minutes">> & {
      due_date?: string | null;
    }
  ) => api.patch<Task>(`/api/tasks/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

export const aiApi = {
  status: () => api.get<AIStatus>("/api/ai/status").then((r) => r.data),
  generateFlow: (projectId: string, opts: { parentNodeId?: string; goal?: string } = {}) =>
    api
      .post<GenerateResult>(
        "/api/ai/generate-flow",
        {
          project_id: projectId,
          parent_node_id: opts.parentNodeId,
          goal: opts.goal || undefined,
          ...localDateInfo(),
        },
        { timeout: 120_000 }
      )
      .then((r) => r.data),
  chatHistory: (projectId: string) =>
    api.get<ChatMessage[]>(`/api/ai/chat/${projectId}`).then((r) => r.data),
  sendChat: (projectId: string, message: string) =>
    api
      .post<{ messages: ChatMessage[]; provider: string; model: string }>(
        `/api/ai/chat/${projectId}`,
        { message, today: localDateInfo().today },
        { timeout: 120_000 }
      )
      .then((r) => r.data),
  clearChat: (projectId: string) => api.delete(`/api/ai/chat/${projectId}`),
};
