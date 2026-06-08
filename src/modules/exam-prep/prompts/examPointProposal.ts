// ─── 反向抽取新考点 ────────────────────────────────────────────────────────
// 当一条笔记无法挂靠到任何"内置/已有"考点时（examPointLink 返回空），
// 用本链判断：这条笔记是否真的讲了一个值得备考、但图谱里还没有的考点？
// 是 → 产出一个结构化新考点草稿（带证据），并入用户考点图谱。
// 防幻觉：必须有笔记原文证据 + 置信度阈值；宁可不建点，也不要无中生有。

import type { ExamKnowledgeGraph, ExerciseDifficulty } from "../types";
import { extractJsonObject, parseJsonLoose } from "../utils/json";
import type { ExamPointLinkInput } from "./examPointLink";

export interface ExamPointProposal {
  label: string;
  chapter: string;
  examPoints: string[];
  answerStrategy: string[];
  difficulty?: ExerciseDifficulty;
  evidence: string;
}

interface RawProposal {
  worth?: boolean;
  label?: string;
  chapter?: string;
  examPoints?: unknown;
  answerStrategy?: unknown;
  difficulty?: unknown;
  evidence?: string;
  confidence?: number;
}

function existingChapters(graph: ExamKnowledgeGraph): string[] {
  return [...new Set(graph.points.map(p => p.chapter))];
}

function existingLabels(graph: ExamKnowledgeGraph): string[] {
  return graph.points.map(p => p.label);
}

export function buildExamPointProposalPrompt(
  graph: ExamKnowledgeGraph,
  input: ExamPointLinkInput,
): string {
  const sections = (input.detailSections ?? [])
    .map(s => `  · ${s.title}：${s.items.join("；")}`)
    .join("\n");

  const contextLines = [
    `笔记标题：${input.title}`,
    input.overview ? `内容概述：${input.overview}` : "",
    input.detailIntro ? `重点定位：${input.detailIntro}` : "",
    sections ? `已提取章节要点：\n${sections}` : "",
    input.aiKeyPoints?.length ? `核心关键词：${input.aiKeyPoints.join("、")}` : "",
    input.unifiedDetail?.trim()
      ? `详情正文（节选前 1200 字）：\n${input.unifiedDetail.trim().slice(0, 1200)}`
      : "",
  ].filter(Boolean);

  return `你是一位大学学科教研员。下面这条学生笔记，**没能匹配到现有考点图谱里的任何节点**。
请判断：它是否实质性地讲解了一个"值得纳入备考、但图谱里目前没有"的考点？如果是，请产出一个规范的新考点草稿。

══════════════════ 严格判定（宁缺毋滥，防止无中生有）══════════════════
1. 只有当笔记包含**明确的知识讲解、定义定理、公式方法或典型考法**时，才考虑建点。
2. 纯作业清单、纯例题罗列、过于宽泛/跑题、或其实是已有考点的同义说法 → worth=false。
3. 新考点必须能用笔记里的**具体内容**支撑（evidence 必须引用笔记原文要点，不能空泛）。
4. confidence < 0.6 一律返回 worth=false。
5. label 要精炼（≤12 字）、是一个"考点"而非一整章；不要与下方已有考点重名。

══════════════════ 学科：${graph.title}（subjectId=${graph.subjectId}）══════════════════
已有考点（不要重复建点）：${existingLabels(graph).join("、") || "(无)"}
可复用的章节名（chapter 尽量从中选，没有合适的再自拟）：${existingChapters(graph).join("、") || "(无)"}

══════════════════ 待分析笔记 ══════════════════
${contextLines.join("\n")}

══════════════════ 输出格式（只输出 JSON，不要 markdown 代码块）══════════════════
{
  "worth": true,
  "label": "考点名（≤12字）",
  "chapter": "所属章节",
  "examPoints": ["该考点常见考法/考查点1", "考查点2"],
  "answerStrategy": ["作答/解题要点1", "要点2"],
  "difficulty": "basic | advanced | challenge",
  "evidence": "引用笔记中支撑该考点的具体内容（≤40字）",
  "confidence": 0.0
}

自检：是否真的讲了知识（而非作业清单）？是否与已有考点重名？evidence 是否引用了笔记原文？没把握时是否返回了 worth=false？`;
}

const VALID_DIFFICULTY: ExerciseDifficulty[] = ["basic", "advanced", "challenge"];

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map(s => s.trim());
}

export function parseExamPointProposalResponse(raw: string): ExamPointProposal | null {
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) return null;

  try {
    const parsed = parseJsonLoose<RawProposal>(jsonStr);
    const label = typeof parsed.label === "string" ? parsed.label.trim() : "";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

    if (parsed.worth === false || !label || confidence < 0.6) return null;

    const examPoints = toStringArray(parsed.examPoints);
    const answerStrategy = toStringArray(parsed.answerStrategy);
    // 没有任何考法/作答要点的"空壳考点"不予采纳
    if (examPoints.length === 0 && answerStrategy.length === 0) return null;

    const difficulty = VALID_DIFFICULTY.includes(parsed.difficulty as ExerciseDifficulty)
      ? (parsed.difficulty as ExerciseDifficulty)
      : undefined;

    return {
      label: label.slice(0, 16),
      chapter: typeof parsed.chapter === "string" && parsed.chapter.trim() ? parsed.chapter.trim() : "我的补充考点",
      examPoints,
      answerStrategy,
      difficulty,
      evidence: typeof parsed.evidence === "string" ? parsed.evidence.trim() : "",
    };
  } catch {
    return null;
  }
}
