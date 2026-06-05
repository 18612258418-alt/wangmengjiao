import type { ExamKnowledgeGraph } from "../types";
import { getPointById } from "../data/examKnowledgeGraphs";
import { layoutExamGraph } from "./examGraphLayout";

const STORAGE_KEY = "exam_point_selection_v1";

function readAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** 图谱最上层、最左侧节点作为默认考点 */
export function getDefaultExamPointId(graph: ExamKnowledgeGraph): string | null {
  if (graph.points.length === 0) return null;
  const { nodes } = layoutExamGraph(graph.points);
  if (nodes.length === 0) return graph.points[0].id;
  const first = [...nodes].sort((a, b) => a.layer - b.layer || a.x - b.x)[0];
  return first?.id ?? graph.points[0].id;
}

/** 读取某学科上次选中的考点，无效时回退默认第一个 */
export function resolveExamPointSelection(
  graph: ExamKnowledgeGraph,
  subjectId: string,
): string | null {
  const saved = readAll()[subjectId];
  if (saved && getPointById(graph, saved)) return saved;
  return getDefaultExamPointId(graph);
}

export function saveExamPointSelection(subjectId: string, pointId: string) {
  const all = readAll();
  all[subjectId] = pointId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
