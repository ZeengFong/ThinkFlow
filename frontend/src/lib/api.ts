import axios from "axios";
import { createClient } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach Supabase JWT to every request when available
api.interceptors.request.use(async (config) => {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Silently continue without auth header
  }
  return config;
});

// ─── Projects ───

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

export const projectsApi = {
  list: (userId?: string) =>
    api.get<Project[]>("/api/projects/", { params: userId ? { user_id: userId } : {} }).then((r) => r.data),
  get: (id: string) => api.get<Project>(`/api/projects/${id}`).then((r) => r.data),
  create: (data: { user_id: string; title: string; subject?: string; context?: string; folder?: string; deadline?: string }) =>
    api.post<Project>("/api/projects/", data).then((r) => r.data),
  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/api/projects/${id}`, data).then((r) => r.data),
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

// ─── Flows ───

export interface FlowData {
  id: string;
  project_id: string;
  nodes: any[];
  edges: any[];
}

export const flowsApi = {
  get: (id: string) => api.get<FlowData>(`/api/flows/${id}`).then((r) => r.data),
  getByProject: (projectId: string) =>
    api.get<FlowData>(`/api/flows/project/${projectId}`).then((r) => r.data),
  update: (id: string, data: { nodes?: any[]; edges?: any[] }) =>
    api.put<FlowData>(`/api/flows/${id}`, data).then((r) => r.data),
};

// ─── Tasks ───

export interface Task {
  id: string;
  project_id: string;
  node_id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string | null;
}

export const tasksApi = {
  list: (projectId?: string) =>
    api.get<Task[]>("/api/tasks/", { params: projectId ? { project_id: projectId } : {} }).then((r) => r.data),
  get: (id: string) => api.get<Task>(`/api/tasks/${id}`).then((r) => r.data),
  create: (data: { project_id: string; title: string; node_id?: string; due_date?: string; priority?: string }) =>
    api.post<Task>("/api/tasks/", data).then((r) => r.data),
  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`/api/tasks/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

// ─── AI ───

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const aiApi = {
  suggest: (
    messages: ChatMessage[],
    context?: string,
    project_id?: string
  ) =>
    api
      .post<{ reply: string }>("/api/ai/suggest", {
        messages,
        context,
        project_id,
      })
      .then((r) => r.data),
  status: () =>
    api
      .get<{ configured: boolean; model: string }>("/api/ai/status")
      .then((r) => r.data),
};
