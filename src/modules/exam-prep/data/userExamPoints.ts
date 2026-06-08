// ─── 用户笔记反向抽取的考点（持久化 + 与内置图谱合并）────────────────────────
// 内置考点图谱（examKnowledgeGraphs.ts）作为官方"骨架/兜底"，本模块负责把
// 用户上传笔记里抽取出来的、白名单之外的新考点持久化下来，并合并进图谱渲染。
// 存储：localStorage（演示足够；如需跨设备可换 IndexedDB）。

import type { ExamKnowledgeGraph, ExamKnowledgePoint, ExerciseDifficulty } from "../types";
import { getExamKnowledgeGraph } from "./examKnowledgeGraphs";

const STORAGE_KEY = "exam_user_points_v1";
/** 用户抽取考点 id 前缀，用于在渲染/逻辑里识别"非官方"节点 */
export const USER_EXAM_POINT_PREFIX = "user_";

type Store = Record<string, ExamKnowledgePoint[]>;

function readAll(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Store;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writeAll(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("[userExamPoints] 持久化失败", err);
  }
}

export function isUserExamPointId(id: string): boolean {
  return id.startsWith(USER_EXAM_POINT_PREFIX);
}

export function getUserExamPoints(subjectId: string): ExamKnowledgePoint[] {
  return readAll()[subjectId] ?? [];
}

function normalizeLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/** 查重：内置或用户已存在同名考点则返回其 id，否则 null（避免重复建点） */
export function findExistingPointIdByLabel(subjectId: string, label: string): string | null {
  const norm = normalizeLabel(label);
  if (!norm) return null;

  const base = getExamKnowledgeGraph(subjectId);
  const baseHit = base?.points.find(p => normalizeLabel(p.label) === norm);
  if (baseHit) return baseHit.id;

  const userHit = getUserExamPoints(subjectId).find(p => normalizeLabel(p.label) === norm);
  return userHit?.id ?? null;
}

export interface NewExamPointDraft {
  label: string;
  chapter?: string;
  examPoints?: string[];
  answerStrategy?: string[];
  difficulty?: ExerciseDifficulty;
  summary?: string;
}

/** 写入一个用户抽取考点；若同名考点已存在则复用其 id（幂等） */
export function addUserExamPoint(subjectId: string, draft: NewExamPointDraft): string {
  const existing = findExistingPointIdByLabel(subjectId, draft.label);
  if (existing) return existing;

  const store = readAll();
  const list = store[subjectId] ?? [];
  const id = `${USER_EXAM_POINT_PREFIX}${subjectId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const point: ExamKnowledgePoint = {
    id,
    label: draft.label.trim(),
    chapter: draft.chapter?.trim() || "我的补充考点",
    prerequisites: [],
    postrequisites: [],
    examPoints: (draft.examPoints ?? []).map(s => s.trim()).filter(Boolean).slice(0, 6),
    answerStrategy: (draft.answerStrategy ?? []).map(s => s.trim()).filter(Boolean).slice(0, 6),
    referenceQuestions: [],
    ...(draft.difficulty ? { difficulty: draft.difficulty } : {}),
    ...(draft.summary?.trim() ? { summary: draft.summary.trim() } : {}),
  };

  list.push(point);
  store[subjectId] = list;
  writeAll(store);
  return id;
}

/** 内置图谱（骨架）+ 用户抽取考点（填充）合并后的图谱，供渲染与挂靠白名单使用 */
export function getMergedExamGraph(subjectId: string): ExamKnowledgeGraph | null {
  const base = getExamKnowledgeGraph(subjectId);
  const userPoints = getUserExamPoints(subjectId);

  if (!base) {
    if (userPoints.length === 0) return null;
    return { subjectId, title: "我的考点图谱", points: userPoints };
  }
  if (userPoints.length === 0) return base;
  return { ...base, points: [...base.points, ...userPoints] };
}
