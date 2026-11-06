"use client";

import { createContext, useContext } from "react";
import type { Project, Task } from "@/lib/api";

export interface FlowActions {
  project: Project | undefined;
  tasksByNode: Map<string, Task>;
  editingId: string | null;
  busyNodeId: string | null;
  aiReady: boolean;
  setEditingId: (id: string | null) => void;
  rename: (nodeId: string, label: string) => void;
  cyclePriority: (nodeId: string) => void;
  toggleDone: (nodeId: string) => void;
  remove: (nodeId: string) => void;
  addChild: (nodeId: string) => void;
  breakDown: (nodeId: string) => void;
  openDueDate: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
}

export const FlowActionsContext = createContext<FlowActions | null>(null);

export function useFlowActions(): FlowActions {
  const value = useContext(FlowActionsContext);
  if (!value) throw new Error("useFlowActions must be used inside FlowActionsContext");
  return value;
}
