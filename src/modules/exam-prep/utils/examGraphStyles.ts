import type { ExerciseDifficulty } from "../types";

export const DIFFICULTY_LABEL: Record<ExerciseDifficulty, string> = {
  basic: "基础",
  advanced: "进阶",
  challenge: "挑战",
};

/** theme.css 中定义的节点填色 / 描边变量 */
export const DIFFICULTY_FILL_VAR: Record<ExerciseDifficulty, string> = {
  basic: "var(--exam-node-basic-fill)",
  advanced: "var(--exam-node-advanced-fill)",
  challenge: "var(--exam-node-challenge-fill)",
};

export const DIFFICULTY_RING_VAR: Record<ExerciseDifficulty, string> = {
  basic: "var(--exam-node-basic-stroke)",
  advanced: "var(--exam-node-advanced-stroke)",
  challenge: "var(--exam-node-challenge-stroke)",
};

/** 图例外侧展示用实色 */
export const DIFFICULTY_FILL: Record<ExerciseDifficulty, string> = {
  basic: "#D1FAE5",
  advanced: "#EEF0FF",
  challenge: "#FFF7ED",
};

export const DIFFICULTY_RING: Record<ExerciseDifficulty, string> = {
  basic: "#34D399",
  advanced: "#4D5CFF",
  challenge: "#F97316",
};

export function inferPointDifficulty(
  point: {
    difficulty?: ExerciseDifficulty;
    referenceQuestions: Array<{ difficulty?: ExerciseDifficulty }>;
  },
  layer?: number,
  maxLayer?: number,
): ExerciseDifficulty {
  if (point.difficulty) return point.difficulty;

  const qs = point.referenceQuestions;
  if (qs.length > 0) {
    const weights: Record<ExerciseDifficulty, number> = { basic: 1, advanced: 2, challenge: 3 };
    const avg = qs.reduce((sum, q) => sum + weights[q.difficulty ?? "advanced"], 0) / qs.length;
    if (avg < 1.5) return "basic";
    if (avg >= 2.3) return "challenge";
    return "advanced";
  }

  if (layer !== undefined && maxLayer !== undefined && maxLayer > 0) {
    const t = layer / maxLayer;
    if (t < 0.34) return "basic";
    if (t < 0.67) return "advanced";
    return "challenge";
  }

  return "advanced";
}
