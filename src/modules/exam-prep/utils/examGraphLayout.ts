import type { ExamKnowledgePoint, ExerciseDifficulty } from "../types";
import { inferPointDifficulty } from "./examGraphStyles";

export interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  layer: number;
  difficulty: ExerciseDifficulty;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

/** 圆点直径 12px → 半径 6px */
const NODE_R = 6;
const NODE_D = 12;
/** 节点下方标题区高度 */
const NODE_LABEL_H = 12;
const GAP_Y = 28;
const PADDING = 28;
const COMPONENT_GAP = 48;
const BARYCENTER_PASSES = 5;

function nodeSlotWidth(label: string): number {
  return Math.max(64, label.length * 7.5 + 20);
}

function assignLayers(points: ExamKnowledgePoint[], byId: Map<string, ExamKnowledgePoint>): Map<string, number> {
  const layer = new Map<string, number>();
  for (const p of points) layer.set(p.id, 0);

  let changed = true;
  let guard = 0;
  while (changed && guard < points.length + 2) {
    changed = false;
    guard++;
    for (const p of points) {
      for (const pre of p.prerequisites) {
        if (!byId.has(pre)) continue;
        const next = (layer.get(pre) ?? 0) + 1;
        if (next > (layer.get(p.id) ?? 0)) {
          layer.set(p.id, next);
          changed = true;
        }
      }
    }
  }
  return layer;
}

function buildAdjacency(points: ExamKnowledgePoint[], byId: Map<string, ExamKnowledgePoint>) {
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const p of points) {
    parents.set(p.id, []);
    children.set(p.id, []);
  }
  for (const p of points) {
    for (const pre of p.prerequisites) {
      if (!byId.has(pre)) continue;
      parents.get(p.id)!.push(pre);
      children.get(pre)!.push(p.id);
    }
  }
  return { parents, children };
}

function findComponents(pointIds: string[], edges: LayoutEdge[]): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x);
    if (!p || p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const unite = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const id of pointIds) parent.set(id, id);
  for (const e of edges) unite(e.from, e.to);

  const groups = new Map<string, string[]>();
  for (const id of pointIds) {
    const root = find(id);
    const list = groups.get(root) ?? [];
    list.push(id);
    groups.set(root, list);
  }
  return [...groups.values()];
}

function orderLayerByBarycenter(
  ids: string[],
  neighborIds: (id: string) => string[],
  neighborIndex: Map<string, number>,
  fallback: Map<string, number>,
): string[] {
  const scored = ids.map(id => {
    const neighbors = neighborIds(id).filter(n => neighborIndex.has(n));
    if (neighbors.length === 0) {
      return { id, score: fallback.get(id) ?? 0 };
    }
    const score = neighbors.reduce((sum, n) => sum + (neighborIndex.get(n) ?? 0), 0) / neighbors.length;
    return { id, score };
  });
  scored.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id, "zh"));
  return scored.map(s => s.id);
}

function minimizeCrossings(
  compIds: string[],
  layer: Map<string, number>,
  parents: Map<string, string[]>,
  children: Map<string, string[]>,
  maxLayer: number,
): Map<number, string[]> {
  const layers = new Map<number, string[]>();
  for (let l = 0; l <= maxLayer; l++) layers.set(l, []);

  for (const id of compIds) {
    const l = layer.get(id) ?? 0;
    layers.get(l)!.push(id);
  }

  const orderIndex = new Map<string, number>();
  for (const [l, ids] of layers) {
    ids.sort((a, b) => a.localeCompare(b, "zh"));
    ids.forEach((id, i) => orderIndex.set(id, i));
  }

  for (let pass = 0; pass < BARYCENTER_PASSES; pass++) {
    for (let l = 1; l <= maxLayer; l++) {
      const ids = layers.get(l) ?? [];
      const ordered = orderLayerByBarycenter(ids, id => parents.get(id) ?? [], orderIndex, orderIndex);
      layers.set(l, ordered);
      ordered.forEach((id, i) => orderIndex.set(id, i));
    }
    for (let l = maxLayer - 1; l >= 0; l--) {
      const ids = layers.get(l) ?? [];
      const ordered = orderLayerByBarycenter(ids, id => children.get(id) ?? [], orderIndex, orderIndex);
      layers.set(l, ordered);
      ordered.forEach((id, i) => orderIndex.set(id, i));
    }
  }

  return layers;
}

function placeComponent(
  compIds: string[],
  compLayers: Map<number, string[]>,
  layer: Map<string, number>,
  byId: Map<string, ExamKnowledgePoint>,
  maxLayer: number,
  xOffset: number,
): { nodes: LayoutNode[]; width: number } {
  const slotWidthsByLayer = new Map<number, number[]>();
  let maxRowWidth = 0;

  for (let l = 0; l <= maxLayer; l++) {
    const row = compLayers.get(l) ?? [];
    const widths = row.map(id => nodeSlotWidth(byId.get(id)?.label ?? id));
    slotWidthsByLayer.set(l, widths);
    const rowWidth = widths.reduce((sum, w) => sum + w, 0);
    maxRowWidth = Math.max(maxRowWidth, rowWidth);
  }

  const nodes: LayoutNode[] = [];

  for (let l = 0; l <= maxLayer; l++) {
    const row = compLayers.get(l) ?? [];
    const widths = slotWidthsByLayer.get(l) ?? [];
    const rowWidth = widths.reduce((sum, w) => sum + w, 0);
    let x = xOffset + (maxRowWidth - rowWidth) / 2;

    row.forEach((id, i) => {
      const p = byId.get(id)!;
      const slotW = widths[i] ?? NODE_D;
      nodes.push({
        id,
        label: p.label,
        x: x + slotW / 2,
        y: PADDING + l * (NODE_D + GAP_Y + NODE_LABEL_H) + NODE_R,
        layer: l,
        difficulty: inferPointDifficulty(p, l, maxLayer),
      });
      x += slotW;
    });
  }

  return { nodes, width: maxRowWidth };
}

export function layoutExamGraph(points: ExamKnowledgePoint[]): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const byId = new Map(points.map(p => [p.id, p]));
  const layer = assignLayers(points, byId);
  const maxLayer = Math.max(0, ...layer.values());
  const { parents, children } = buildAdjacency(points, byId);

  const edges: LayoutEdge[] = [];
  for (const p of points) {
    for (const pre of p.prerequisites) {
      if (byId.has(pre)) edges.push({ from: pre, to: p.id });
    }
  }

  const components = findComponents(points.map(p => p.id), edges);
  components.sort((a, b) => {
    const minLayer = (ids: string[]) => Math.min(...ids.map(id => layer.get(id) ?? 0));
    const dl = minLayer(a) - minLayer(b);
    if (dl !== 0) return dl;
    return b.length - a.length;
  });

  const allNodes: LayoutNode[] = [];
  let xCursor = PADDING;

  for (const compIds of components) {
    const compLayers = minimizeCrossings(compIds, layer, parents, children, maxLayer);

    const { nodes, width } = placeComponent(compIds, compLayers, layer, byId, maxLayer, xCursor);
    allNodes.push(...nodes);
    xCursor += width + COMPONENT_GAP;
  }

  const graphWidth = Math.max(NODE_D + PADDING * 2, xCursor - COMPONENT_GAP + PADDING);
  const graphHeight = (maxLayer + 1) * (NODE_D + GAP_Y + NODE_LABEL_H) + PADDING * 2;

  return { nodes: allNodes, edges, width: graphWidth, height: graphHeight };
}

export { NODE_R, NODE_D, NODE_LABEL_H };
