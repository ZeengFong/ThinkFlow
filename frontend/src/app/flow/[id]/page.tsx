"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type EdgeProps,
  BackgroundVariant,
  Position,
  Handle,
  getBezierPath,
  BaseEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  flowsApi,
  tasksApi,
  aiApi,
  projectsApi,
  type Task,
  type ChatMessage,
} from "@/lib/api";
import {
  Plus,
  Save,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Send,
  ArrowLeft,
  Loader2,
  Trash2,
  Settings,
  X,
  GitBranchPlus,
  Upload,
  FileText,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ──────────────────────────────── Priority helpers ──────────────────────────────── */

const PRIORITIES = ["low", "medium", "high"] as const;
type Priority = (typeof PRIORITIES)[number];

const priorityColors: Record<string, string> = {
  high: "bg-muted-coral/20 text-muted-coral border-muted-coral/30",
  medium: "bg-baby-blue/20 text-baby-blue-dark border-baby-blue/30",
  low: "bg-soft-green/20 text-soft-green border-soft-green/30",
};

const priorityDot: Record<string, string> = {
  high: "bg-muted-coral",
  medium: "bg-baby-blue",
  low: "bg-soft-green",
};

function cyclePriority(current: string): Priority {
  const idx = PRIORITIES.indexOf(current as Priority);
  return PRIORITIES[(idx + 1) % PRIORITIES.length];
}

/* ──────────────────────────────── Handle styles ──────────────────────────────── */

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "#89CFF0",
  border: "2px solid #6BB8E8",
  borderRadius: "50%",
  opacity: 0.4,
  transition: "opacity 0.2s, transform 0.2s",
};

const handleHoverClass = "hover:!opacity-100 hover:!scale-125";

/* ──────────────────────────────── Deletable Edge ──────────────────────────────── */

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Invisible wider hit area for hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {/* Delete button at midpoint */}
      <foreignObject
        width={24}
        height={24}
        x={labelX - 12}
        y={labelY - 12}
        className="group/edge"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="flex h-full w-full items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              (data as any)?.onDelete?.(id);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border text-muted-foreground opacity-0 shadow-soft transition-all hover:bg-destructive/10 hover:text-destructive hover:opacity-100 [.react-flow__edge:hover_&]:opacity-100"
            title="Delete connection"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </foreignObject>
    </>
  );
}

const edgeTypes = { deletable: DeletableEdge };

/* ──────────────────────────────── Master Node ──────────────────────────────── */

function MasterNode({ data }: { data: { label: string } }) {
  return (
    <div className="min-w-[260px] rounded-2xl border-2 border-baby-blue-dark bg-gradient-to-br from-baby-blue/20 to-baby-blue/5 px-6 py-5 shadow-soft-lg">
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ ...handleStyle, bottom: -5, width: 14, height: 14, opacity: 0.7 }}
        className={handleHoverClass}
      />
      <p className="text-center text-lg font-bold text-foreground tracking-tight">
        {data.label}
      </p>
      <p className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-widest text-baby-blue-dark">
        Master Node
      </p>
    </div>
  );
}

/* ──────────────────────────────── Custom Node ──────────────────────────────── */

function ThinkFlowNode({
  data,
}: {
  data: {
    label: string;
    priority: string;
    onCyclePriority?: () => void;
    onDelete?: () => void;
    onAddSubNode?: () => void;
  };
}) {
  return (
    <div className="group relative min-w-[200px] rounded-2xl border-2 border-baby-blue bg-card px-4 py-3 shadow-soft transition-shadow hover:shadow-soft-lg">
      {/* ── Connection Handles ── */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...handleStyle, top: -5 }}
        className={handleHoverClass}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ ...handleStyle, bottom: -5 }}
        className={handleHoverClass}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ ...handleStyle, left: -5 }}
        className={handleHoverClass}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...handleStyle, right: -5 }}
        className={handleHoverClass}
      />

      {/* Action buttons (hover reveal) */}
      <div className="absolute -right-2 -top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onAddSubNode?.();
          }}
          title="Add sub-node"
          className="rounded-full bg-card p-1 text-baby-blue shadow-soft transition-colors hover:bg-baby-blue/10"
        >
          <GitBranchPlus className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete?.();
          }}
          title="Delete node"
          className="rounded-full bg-card p-1 text-muted-foreground shadow-soft transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <p className="text-sm font-medium text-card-foreground">{data.label}</p>
      {data.priority && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onCyclePriority?.();
          }}
          title="Click to change priority"
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80 ${
            priorityColors[data.priority] || priorityColors.medium
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              priorityDot[data.priority] || priorityDot.medium
            }`}
          />
          {data.priority}
        </button>
      )}
    </div>
  );
}

const nodeTypes = { thinkflow: ThinkFlowNode, master: MasterNode };

/* ──────────────────────────────── Main Page ──────────────────────────────── */

export default function FlowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: flowId } = use(params);
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [showTaskPanel, setShowTaskPanel] = useState(true);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodePriority, setNewNodePriority] = useState<Priority>("medium");
  const [showAddNode, setShowAddNode] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Project settings form state
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editContext, setEditContext] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState("");
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Calendar picker state
  const [calendarTaskId, setCalendarTaskId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState("");
  const [calendarTime, setCalendarTime] = useState("12:00");
  const [calendarViewMonth, setCalendarViewMonth] = useState(new Date());

  // AI sidebar state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // Load flow data
  const { data: flowData, isLoading } = useQuery({
    queryKey: ["flow", flowId],
    queryFn: () => flowsApi.get(flowId),
  });

  // Load project data (for context)
  const { data: projectData } = useQuery({
    queryKey: ["project", flowData?.project_id],
    queryFn: () => projectsApi.get(flowData!.project_id),
    enabled: !!flowData?.project_id,
  });

  // Load tasks for this flow's project
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", flowData?.project_id],
    queryFn: () => tasksApi.list(flowData?.project_id),
    enabled: !!flowData?.project_id,
  });

  // Update project mutation
  const updateProjectMut = useMutation({
    mutationFn: (data: {
      title?: string;
      subject?: string;
      context?: string;
    }) => projectsApi.update(flowData!.project_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project", flowData?.project_id],
      });
      setShowProjectSettings(false);
    },
  });

  // Edge delete handler
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  // Helper: wire edge data with delete callback
  const wireEdgeData = useCallback(
    (edge: Edge): Edge => ({
      ...edge,
      type: "deletable",
      data: { ...edge.data, onDelete: handleEdgeDelete },
    }),
    [handleEdgeDelete]
  );

  // Helper: build node with callbacks wired in
  const buildNode = useCallback(
    (base: Node): Node => ({
      ...base,
      type: base.type || "thinkflow",
      data: {
        ...base.data,
        onCyclePriority: () => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === base.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      priority: cyclePriority(n.data.priority as string),
                      onCyclePriority: n.data.onCyclePriority,
                      onDelete: n.data.onDelete,
                      onAddSubNode: n.data.onAddSubNode,
                    },
                  }
                : n
            )
          );
        },
        onDelete: () => {
          setNodes((nds) => nds.filter((n) => n.id !== base.id));
          setEdges((eds) =>
            eds.filter((e) => e.source !== base.id && e.target !== base.id)
          );
        },
        onAddSubNode: () => {
          const subId = `node-${Date.now()}`;
          const subBase: Node = {
            id: subId,
            type: "thinkflow",
            position: {
              x: base.position.x,
              y: base.position.y + 140,
            },
            data: { label: "New subtask", priority: "medium" },
          };
          const subNode = buildNode(subBase);
          setNodes((nds) => [...nds, subNode]);
          const newEdge = wireEdgeData({
            id: `edge-${base.id}-${subId}`,
            source: base.id,
            sourceHandle: "bottom",
            target: subId,
            animated: true,
            style: { stroke: "#89CFF0", strokeWidth: 2 },
          });
          setEdges((eds) => addEdge(newEdge, eds));
        },
      },
    }),
    [setNodes, setEdges, wireEdgeData]
  );

  // Init nodes/edges from API
  useEffect(() => {
    if (flowData && projectData) {
      let loadedNodes = (flowData.nodes || []).map((n: any) => {
        if (n.type === "master") return { ...n, type: "master" } as Node;
        return buildNode({ ...n, type: "thinkflow" });
      });

      // Ensure master node exists
      const hasMaster = loadedNodes.some((n: Node) => n.type === "master");
      if (!hasMaster) {
        const masterNode: Node = {
          id: "master-node",
          type: "master",
          position: { x: 250, y: 30 },
          data: { label: projectData.title },
          draggable: true,
          deletable: false,
        };
        loadedNodes = [masterNode, ...loadedNodes];
      }

      setNodes(loadedNodes);
      setEdges((flowData.edges || []).map(wireEdgeData));
    }
  }, [flowData, projectData, setNodes, setEdges, buildNode, wireEdgeData]);

  // Populate project settings form when data loads
  useEffect(() => {
    if (projectData) {
      setEditTitle(projectData.title);
      setEditSubject(projectData.subject);
      setEditContext(projectData.context || "");
    }
  }, [projectData]);

  // Update master node label when project title changes
  useEffect(() => {
    if (projectData) {
      setNodes((nds) =>
        nds.map((n) =>
          n.type === "master"
            ? { ...n, data: { ...n.data, label: projectData.title } }
            : n
        )
      );
    }
  }, [projectData?.title, setNodes]);

  // Save mutation
  const saveMut = useMutation({
    mutationFn: (data: { nodes: Node[]; edges: Edge[] }) =>
      flowsApi.update(flowId, {
        nodes: data.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: { label: n.data.label, priority: n.data.priority },
        })),
        edges: data.edges.map((e) => ({
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle,
          target: e.target,
          targetHandle: e.targetHandle,
          animated: e.animated,
          style: e.style,
        })),
      }),
  });

  // Auto-save with debounce
  const scheduleAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMut.mutate({ nodes, edges });
    }, 2000);
  }, [nodes, edges, saveMut]);

  useEffect(() => {
    if (flowData) scheduleAutoSave();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = wireEdgeData({
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        animated: true,
        style: { stroke: "#89CFF0", strokeWidth: 2 },
      } as Edge);
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, wireEdgeData]
  );

  // Add node
  const addNode = () => {
    if (!newNodeLabel.trim()) return;
    const base: Node = {
      id: `node-${Date.now()}`,
      type: "thinkflow",
      position: {
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 300,
      },
      data: { label: newNodeLabel, priority: newNodePriority },
    };
    const newNode = buildNode(base);
    setNodes((nds) => [...nds, newNode]);

    if (flowData?.project_id) {
      tasksApi
        .create({
          project_id: flowData.project_id,
          title: newNodeLabel,
          node_id: base.id,
          priority: newNodePriority,
        })
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: ["tasks", flowData.project_id],
          })
        );
    }

    setNewNodeLabel("");
    setNewNodePriority("medium");
    setShowAddNode(false);
  };

  // Toggle task
  const toggleTask = useMutation({
    mutationFn: (task: Task) =>
      tasksApi.update(task.id, {
        status: task.status === "done" ? "todo" : "done",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["tasks", flowData?.project_id],
      }),
  });

  // Update task due date
  const updateTaskDueDate = useMutation({
    mutationFn: ({ taskId, due_date }: { taskId: string; due_date: string }) =>
      tasksApi.update(taskId, { due_date }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", flowData?.project_id],
      });
      setCalendarTaskId(null);
    },
  });

  // Open calendar picker for a task
  const openCalendar = (task: Task) => {
    setCalendarTaskId(task.id);
    if (task.due_date) {
      const d = new Date(task.due_date);
      setCalendarDate(d.toISOString().split("T")[0]);
      setCalendarTime(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
      setCalendarViewMonth(d);
    } else {
      const now = new Date();
      setCalendarDate("");
      setCalendarTime("12:00");
      setCalendarViewMonth(now);
    }
  };

  // Save calendar due date
  const saveCalendarDueDate = () => {
    if (!calendarTaskId || !calendarDate) return;
    const [h, m] = calendarTime.split(":").map(Number);
    const d = new Date(calendarDate);
    d.setHours(h, m, 0, 0);
    updateTaskDueDate.mutate({
      taskId: calendarTaskId,
      due_date: d.toISOString(),
    });
  };

  // Remove due date from task
  const removeDueDate = () => {
    if (!calendarTaskId) return;
    tasksApi.update(calendarTaskId, { due_date: null as any }).then(() => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", flowData?.project_id],
      });
      setCalendarTaskId(null);
    });
  };

  // Calendar grid helpers
  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  // PDF upload handler
  const handlePdfUpload = async (file: File) => {
    if (!flowData?.project_id) return;
    setPdfUploading(true);
    setPdfSuccess("");
    try {
      const result = await projectsApi.uploadPdf(flowData.project_id, file);
      setPdfSuccess(
        `✓ "${result.filename}" uploaded (${result.extracted_length} chars extracted)`
      );
      // Refetch project to get updated context
      queryClient.invalidateQueries({
        queryKey: ["project", flowData.project_id],
      });
    } catch (err: any) {
      setPdfSuccess(
        `✗ Upload failed: ${err?.response?.data?.detail || err.message}`
      );
    } finally {
      setPdfUploading(false);
    }
  };

  // AI chat
  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg: ChatMessage = { role: "user", content: aiInput };
    const updatedMessages = [...aiMessages, userMsg];
    setAiMessages(updatedMessages);
    setAiInput("");
    setAiLoading(true);

    const nodeContext = nodes
      .filter((n) => n.type !== "master")
      .map(
        (n) =>
          `• ${n.data.label as string} (priority: ${n.data.priority as string})`
      )
      .join("\n");

    const flowContext = `Current flow nodes:\n${nodeContext}`;

    try {
      const result = await aiApi.suggest(
        updatedMessages,
        flowContext,
        flowData?.project_id
      );
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
    } catch (err: any) {
      console.error("AI suggest error:", err?.response?.data || err);
      const detail =
        err?.response?.data?.detail || err?.message || "Unknown error";
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${detail}`,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-scroll AI messages
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages, aiLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-baby-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="press rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {projectData?.title || "Flow Workspace"}
            </h1>
            {projectData?.subject && (
              <p className="text-xs text-muted-foreground">
                {projectData.subject}
              </p>
            )}
          </div>
          {saveMut.isPending && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProjectSettings(true)}
            className="press flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80"
            title="Project Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowAddNode(true)}
            className="press flex items-center gap-1.5 rounded-xl bg-baby-blue px-3 py-2 text-xs font-medium text-primary-foreground shadow-soft hover:bg-baby-blue-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Add Node
          </button>
          <button
            onClick={() => saveMut.mutate({ nodes, edges })}
            className="press flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </header>

      <div className="relative flex-1">
        {/* ReactFlow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="!bg-background"
          defaultEdgeOptions={{
            type: "deletable",
            animated: true,
            style: { stroke: "#89CFF0", strokeWidth: 2 },
          }}
        >
          <Controls className="!rounded-xl !border-border !bg-card/80 !shadow-soft [&>button]:!rounded-lg [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground" />
          <MiniMap
            className="!rounded-xl !border-border !bg-card/80 !shadow-soft"
            nodeColor={(n) =>
              n.type === "master" ? "#6BB8E8" : "#89CFF0"
            }
            maskColor="rgba(137,207,240,0.08)"
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="!bg-background"
            color="var(--muted-foreground)"
            style={{ opacity: 0.2 }}
          />
        </ReactFlow>

        {/* Add Node Modal */}
        <AnimatePresence>
          {showAddNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-sm"
              onClick={() => setShowAddNode(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-80 rounded-2xl border border-border bg-card p-5 shadow-soft-lg"
              >
                <h3 className="mb-3 font-medium text-card-foreground">
                  Add Task Node
                </h3>
                <input
                  autoFocus
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNode()}
                  placeholder="Task name"
                  className="mb-3 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-baby-blue"
                />
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewNodePriority(p)}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition-all ${
                          newNodePriority === p
                            ? priorityColors[p]
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${priorityDot[p]}`}
                        />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addNode}
                  disabled={!newNodeLabel.trim()}
                  className="press w-full rounded-xl bg-baby-blue px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Add
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project Settings Modal */}
        <AnimatePresence>
          {showProjectSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-sm"
              onClick={() => setShowProjectSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-[440px] max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-soft-lg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-card-foreground">
                    Project Settings
                  </h3>
                  <button
                    onClick={() => setShowProjectSettings(false)}
                    className="press rounded-lg p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Project Title
                    </label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-baby-blue"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Subject
                    </label>
                    <input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="e.g. Biology, Math 271"
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-baby-blue"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      AI Context
                    </label>
                    <p className="mb-1.5 text-[10px] text-muted-foreground">
                      Background info sent to the AI in every conversation.
                    </p>
                    <textarea
                      value={editContext}
                      onChange={(e) => setEditContext(e.target.value)}
                      rows={4}
                      placeholder="e.g. This project is for my CPSC 457 final exam…"
                      className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-baby-blue"
                    />
                  </div>

                  {/* PDF Upload */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Upload PDF Context
                    </label>
                    <p className="mb-1.5 text-[10px] text-muted-foreground">
                      Content will be referenced by ThinkFlow.
                    </p>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={pdfUploading}
                      className="press flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-3 text-xs font-medium text-muted-foreground transition-colors hover:border-baby-blue hover:text-foreground disabled:opacity-50"
                    >
                      {pdfUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Extracting text…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Choose PDF file
                        </>
                      )}
                    </button>
                    {pdfSuccess && (
                      <p
                        className={`mt-1.5 text-[11px] ${
                          pdfSuccess.startsWith("✓")
                            ? "text-soft-green"
                            : "text-muted-coral"
                        }`}
                      >
                        {pdfSuccess}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateProjectMut.mutate({
                      title: editTitle,
                      subject: editSubject,
                      context: editContext,
                    })
                  }
                  disabled={updateProjectMut.isPending || !editTitle.trim()}
                  className="press mt-4 w-full rounded-xl bg-baby-blue px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {updateProjectMut.isPending ? "Saving…" : "Save Settings"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ──────── AI Sidebar ──────── */}
        <div className="absolute right-0 top-0 flex h-full w-[300px] flex-col border-l border-border bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Sparkles className="h-4 w-4 text-baby-blue" />
            <span className="text-sm font-medium text-foreground">
              Chat with ThinkFlow
            </span>
            <span className="ml-auto rounded-full bg-soft-green/20 px-2 py-0.5 text-[10px] font-medium text-soft-green">
              gpt-5-mini
            </span>
          </div>

          <div
            ref={aiScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {aiMessages.length === 0 && !aiLoading && (
              <div className="flex flex-col items-center justify-center pt-12 text-center">
                <Sparkles className="mb-3 h-8 w-8 text-baby-blue/40" />
                <p className="text-xs text-muted-foreground">
                  Ask me to help break down tasks, suggest priorities, or plan
                  next steps.
                </p>
                {projectData?.context && (
                  <p className="mt-2 rounded-lg bg-baby-blue/10 px-2 py-1 text-[10px] text-baby-blue">
                    ✓ Project context loaded
                  </p>
                )}
                <div className="mt-4 space-y-1.5">
                  {[
                    "Suggest subtasks for this flow",
                    "What should I prioritize?",
                    "Help me plan my study session",
                  ].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => setAiInput(hint)}
                      className="block w-full rounded-lg border border-border px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {aiMessages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "ml-6 bg-baby-blue/15 text-foreground"
                    : "mr-4 bg-muted text-foreground"
                }`}
              >
                {msg.role === "assistant" && (
                  <span className="mb-1 block text-[10px] font-medium text-baby-blue">
                    ThinkFlow AI
                  </span>
                )}
                <span className="whitespace-pre-wrap">{msg.content}</span>
              </div>
            ))}

            {aiLoading && (
              <div className="mr-4 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendAiMessage()
                }
                placeholder="Ask AI…"
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={sendAiMessage}
                disabled={!aiInput.trim() || aiLoading}
                className="press rounded-lg p-1 text-baby-blue transition-colors hover:bg-baby-blue/10 disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ──────── Calendar Date/Time Picker Modal ──────── */}
        <AnimatePresence>
          {calendarTaskId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/10 backdrop-blur-sm"
              onClick={() => setCalendarTaskId(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-[340px] rounded-2xl border border-border bg-card p-5 shadow-soft-lg"
              >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-baby-blue/15">
                      <CalendarDays className="h-4 w-4 text-baby-blue" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground">
                        Set Due Date
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        {tasks.find((t) => t.id === calendarTaskId)?.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCalendarTaskId(null)}
                    className="press rounded-lg p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Month Navigation */}
                <div className="mb-2 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setCalendarViewMonth(
                        new Date(
                          calendarViewMonth.getFullYear(),
                          calendarViewMonth.getMonth() - 1,
                          1
                        )
                      )
                    }
                    className="press rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-foreground">
                    {calendarViewMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() =>
                      setCalendarViewMonth(
                        new Date(
                          calendarViewMonth.getFullYear(),
                          calendarViewMonth.getMonth() + 1,
                          1
                        )
                      )
                    }
                    className="press rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Calendar Grid */}
                {(() => {
                  const year = calendarViewMonth.getFullYear();
                  const month = calendarViewMonth.getMonth();
                  const daysInMonth = getDaysInMonth(year, month);
                  const firstDay = getFirstDayOfMonth(year, month);
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                  const days = [];
                  for (let i = 0; i < firstDay; i++)
                    days.push(<div key={`empty-${i}`} />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const isSelected = calendarDate === dateStr;
                    const isToday = todayStr === dateStr;
                    days.push(
                      <button
                        key={d}
                        onClick={() => setCalendarDate(dateStr)}
                        className={`press flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-baby-blue text-primary-foreground shadow-soft"
                            : isToday
                              ? "bg-baby-blue/15 text-baby-blue-dark hover:bg-baby-blue/25"
                              : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  }
                  return (
                    <div className="mb-4">
                      <div className="mb-1 grid grid-cols-7 gap-0.5">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                          (day) => (
                            <div
                              key={day}
                              className="flex h-8 w-8 items-center justify-center text-[10px] font-medium text-muted-foreground"
                            >
                              {day}
                            </div>
                          )
                        )}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">{days}</div>
                    </div>
                  );
                })()}

                {/* Time Picker */}
                <div className="mb-4">
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={calendarTime}
                    onChange={(e) => setCalendarTime(e.target.value)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-baby-blue [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                  />
                </div>

                {/* Selected Date Preview */}
                {calendarDate && (
                  <div className="mb-4 rounded-xl bg-baby-blue/10 px-3 py-2 text-center">
                    <p className="text-xs font-medium text-baby-blue-dark">
                      {new Date(calendarDate + "T" + calendarTime).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at {calendarTime}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {tasks.find((t) => t.id === calendarTaskId)?.due_date && (
                    <button
                      onClick={removeDueDate}
                      className="press rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-coral transition-colors hover:bg-muted-coral/10"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={() => setCalendarTaskId(null)}
                    className="press flex-1 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCalendarDueDate}
                    disabled={!calendarDate || updateTaskDueDate.isPending}
                    className="press flex-1 rounded-xl bg-baby-blue px-3 py-2 text-xs font-medium text-primary-foreground shadow-soft transition-colors hover:bg-baby-blue-dark disabled:opacity-50"
                  >
                    {updateTaskDueDate.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ──────── Bottom Task Panel ──────── */}
        <div className="absolute bottom-0 left-0 right-[300px]">
          <button
            onClick={() => setShowTaskPanel(!showTaskPanel)}
            className="mx-auto flex items-center gap-1 rounded-t-xl bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl"
          >
            Tasks ({tasks.length})
            {showTaskPanel ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
          <AnimatePresence>
            {showTaskPanel && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 200 }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-border bg-card/90 backdrop-blur-xl"
              >
                <div className="h-[200px] overflow-y-auto p-3">
                  {tasks.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Add nodes to create tasks
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                        >
                          <button
                            onClick={() => toggleTask.mutate(task)}
                            className="text-baby-blue"
                          >
                            {task.status === "done" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                          <span
                            className={`flex-1 text-xs ${
                              task.status === "done"
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }`}
                          >
                            {task.title}
                          </span>
                          {/* Due date badge */}
                          {task.due_date && (
                            <span className="flex items-center gap-0.5 rounded-full bg-baby-blue/10 px-1.5 py-0.5 text-[9px] font-medium text-baby-blue-dark">
                              <CalendarDays className="h-2.5 w-2.5" />
                              {new Date(task.due_date).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          )}
                          {/* Calendar button */}
                          <button
                            onClick={() => openCalendar(task)}
                            title="Set due date"
                            className={`press rounded-lg p-1 transition-colors ${
                              task.due_date
                                ? "text-baby-blue hover:bg-baby-blue/10"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                              priorityColors[task.priority] ||
                              priorityColors.medium
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
