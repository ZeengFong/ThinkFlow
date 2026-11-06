import type { Edge, Node } from "@xyflow/react";

/**
 * "Columns" tree layout: the project (master node) on top, each main step as a
 * column, and its sub-steps stacked underneath with an indented spine.
 * Much more compact and readable than a classic wide tree.
 */

export const MASTER_ID = "master-node";
export const NODE_WIDTH = 236;
const MASTER_WIDTH = 320;
const MASTER_HEIGHT = 100;
const DEFAULT_HEIGHT = 92;
const COL_GAP = 40;
const ROW_GAP = 16;
const LEVEL_GAP = 70;
export const INDENT = 34;

function height(node: Node): number {
  return node.measured?.height ?? (node.type === "master" ? MASTER_HEIGHT : DEFAULT_HEIGHT);
}

function width(node: Node): number {
  return node.measured?.width ?? (node.type === "master" ? MASTER_WIDTH : NODE_WIDTH);
}

/** Tree view of the graph: the first parent reached from the master node wins. */
export function buildTree(nodes: Node[], edges: Edge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Set<string>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
    incoming.add(e.target);
  }

  const children = new Map<string, string[]>();
  const parent = new Map<string, string>();
  const visited = new Set<string>();
  const master = nodes.find((n) => n.type === "master");

  const bfs = (root: string) => {
    visited.add(root);
    const queue = [root];
    while (queue.length) {
      const id = queue.shift()!;
      for (const child of outgoing.get(id) ?? []) {
        if (visited.has(child) || child === master?.id) continue;
        visited.add(child);
        parent.set(child, id);
        children.set(id, [...(children.get(id) ?? []), child]);
        queue.push(child);
      }
    }
  };

  if (master) bfs(master.id);
  // Steps not connected to the project become extra columns.
  const extraRoots: string[] = [];
  const unvisited = () => nodes.filter((n) => !visited.has(n.id) && n.type !== "master");
  for (const n of unvisited().filter((n) => !incoming.has(n.id))) {
    extraRoots.push(n.id);
    bfs(n.id);
  }
  for (const n of unvisited()) {
    extraRoots.push(n.id);
    bfs(n.id);
  }
  return { byId, children, parent, master, extraRoots };
}

export function descendants(nodeId: string, nodes: Node[], edges: Edge[]): string[] {
  const { children } = buildTree(nodes, edges);
  const out: string[] = [];
  const walk = (id: string) => {
    for (const c of children.get(id) ?? []) {
      out.push(c);
      walk(c);
    }
  };
  walk(nodeId);
  return out;
}

export function layoutFlow(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const { byId, children, parent, master, extraRoots } = buildTree(nodes, edges);
  const positions = new Map<string, { x: number; y: number }>();
  const depthOf = new Map<string, number>();
  const pos = (id: string) => byId.get(id)!.position;

  const mains = [
    ...[...(children.get(master?.id ?? "") ?? [])].sort((a, b) => pos(a).x - pos(b).x || pos(a).y - pos(b).y),
    ...extraRoots,
  ];

  const top = master ? height(master) + LEVEL_GAP : 0;
  let x = 0;
  for (const main of mains) {
    let y = top;
    let maxDepth = 1;
    const place = (id: string, depth: number) => {
      positions.set(id, { x: x + INDENT * (depth - 1), y });
      depthOf.set(id, depth);
      maxDepth = Math.max(maxDepth, depth);
      y += height(byId.get(id)!) + ROW_GAP;
      const kids = [...(children.get(id) ?? [])].sort((a, b) => pos(a).y - pos(b).y || pos(a).x - pos(b).x);
      kids.forEach((k) => place(k, depth + 1));
    };
    place(main, 1);
    x += NODE_WIDTH + INDENT * (maxDepth - 1) + COL_GAP;
  }

  if (master) {
    const total = mains.length ? x - COL_GAP : NODE_WIDTH;
    positions.set(master.id, { x: Math.round((total - width(master)) / 2), y: 0 });
  }

  const laidOutEdges = edges.map((e) => {
    if (parent.get(e.target) !== e.source) return e; // not a tree edge: leave as drawn
    const depth = depthOf.get(e.target) ?? 1;
    const isColumnTop = depth === 1 && e.source === master?.id;
    return isColumnTop
      ? { ...e, sourceHandle: "bottom", targetHandle: "top" }
      : { ...e, sourceHandle: "spine", targetHandle: "left" };
  });

  return {
    nodes: nodes.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n)),
    edges: laidOutEdges,
  };
}

/** Where a new child of `parentId` should go, before the next tidy-up. */
export function childPosition(parentId: string, nodes: Node[], edges: Edge[]) {
  const { byId, children } = buildTree(nodes, edges);
  const parent = byId.get(parentId);
  if (!parent) return { x: 0, y: 0, handles: { sourceHandle: "bottom", targetHandle: "top" } };
  if (parent.type === "master") {
    const mains = (children.get(parentId) ?? []).map((id) => byId.get(id)!);
    const right = mains.length ? Math.max(...mains.map((n) => n.position.x)) + NODE_WIDTH + COL_GAP : parent.position.x;
    return {
      x: right,
      y: parent.position.y + height(parent) + LEVEL_GAP,
      handles: { sourceHandle: "bottom", targetHandle: "top" },
    };
  }
  const subtree = [parentId, ...descendants(parentId, nodes, edges)].map((id) => byId.get(id)!);
  const bottom = Math.max(...subtree.map((n) => n.position.y + height(n)));
  return {
    x: parent.position.x + INDENT,
    y: bottom + ROW_GAP,
    handles: { sourceHandle: "spine", targetHandle: "left" },
  };
}
