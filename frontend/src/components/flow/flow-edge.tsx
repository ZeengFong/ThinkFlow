"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useFlowActions } from "./flow-context";

/** Rounded connector; the "spine" variant draws the indented sub-step lines. */
export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  selected,
}: EdgeProps) {
  const { deleteEdge } = useFlowActions();
  const spine = sourceHandleId === "spine";
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: spine ? 8 : 14,
    offset: spine ? 8 : 18,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={16}
        style={{
          stroke: selected ? "var(--color-baby-blue-dark)" : "var(--color-baby-blue)",
          strokeWidth: selected ? 2.5 : 1.75,
          opacity: selected ? 1 : 0.65,
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <button
            onClick={() => deleteEdge(id)}
            aria-label="Delete connection"
            title="Delete connection"
            style={{ transform: `translate(-50%, -50%) translate(${spine ? targetX - 12 : labelX}px, ${spine ? targetY : labelY}px)` }}
            className="nodrag nopan pointer-events-auto absolute flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft hover:bg-muted-coral/15 hover:text-muted-coral"
          >
            <X className="h-3 w-3" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
