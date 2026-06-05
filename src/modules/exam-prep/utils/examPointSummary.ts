import type { ExamKnowledgePoint } from "../types";

/** 生成考点标题下的一行精炼解释 */
export function getPointSummary(point: ExamKnowledgePoint): string {
  if (point.summary?.trim()) return point.summary.trim();

  const focus = point.examPoints[0]?.trim();
  const approach = point.answerStrategy[0]?.trim();

  if (focus && approach) {
    const tail = approach.endsWith("。") ? approach : `${approach}。`;
    return `${focus}；${tail}`;
  }
  if (focus) return focus.endsWith("。") ? focus : `${focus}。`;
  if (approach) return approach.endsWith("。") ? approach : `${approach}。`;

  return `掌握「${point.label}」的核心概念与常见考法。`;
}
