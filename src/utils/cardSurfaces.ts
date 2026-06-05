import type { CardContentType, CardData } from "../types";
import { getHomeworkTasks } from "./cardTasks";

/** 笔记 Tab：「最近上传与批注」虚拟大纲条目 */
export const RECENT_NOTES_ENTRY_ID = "__recent__";

/** 用户批注或手动上传产生的记忆（必在笔记 Tab 展示） */
export function isUserOriginatedCard(card: CardData): boolean {
  return card.id.startsWith("new_") || card.hasAnnotations === true;
}

/**
 * 是否在「笔记」Tab 展示。
 * 规则：用户上传/批注必出现；内置仅 homework/exam 的演示种子不在笔记重复展示。
 */
export function appearsInNotesTab(card: CardData): boolean {
  if (isUserOriginatedCard(card)) return true;
  if (card.contentType === "homework" || card.contentType === "exam") return false;
  return !card.contentType || card.contentType === "note";
}

/** 是否在「作业」Tab 生成待办条目 */
export function hasHomeworkIntent(card: CardData): boolean {
  if (card.contentType === "homework") return true;
  if (Array.isArray(card.homeworkTasks) && card.homeworkTasks.length > 0) return true;
  return getHomeworkTasks(card).length > 0 && card.contentType !== "exam";
}

/** 是否在「备考」Tab 展示 */
export function hasExamIntent(card: CardData): boolean {
  if (card.contentType === "exam") return true;
  if (card.examSummary?.trim()) return true;
  if ((card.examSolutionSteps?.length ?? 0) > 0) return true;
  if ((card.examPracticeQuestions?.length ?? 0) > 0) return true;
  return false;
}

export type ParsedImportPayload = {
  contentType?: string;
  homeworkTasks?: unknown;
  taskDueDate?: unknown;
  examSummary?: unknown;
  nextAction?: unknown;
};

export type ClassifiedCardSurfaces = {
  /** 存储层统一为 note，保证笔记 Tab 有卡片 */
  contentType: CardContentType;
  homeworkTasks?: string[];
  taskDueDate?: string;
  examSummary?: string;
  openTab: "homework" | "exam" | null;
};

function parseHomeworkTasks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map(t => t.trim())
    .slice(0, 8);
}

function parseTaskDueDate(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8 ? digits : undefined;
}

function parseExamSummary(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  return s.length > 0 ? s.slice(0, 120) : undefined;
}

/**
 * 将 AI 识别的单一 contentType 转为「笔记必存 + 作业/备考按需露出」。
 */
export function classifyCardSurfaces(parsed: ParsedImportPayload): ClassifiedCardSurfaces {
  const rawType = parsed.contentType;
  const aiHomework = parseHomeworkTasks(parsed.homeworkTasks);
  const taskDueDate = parseTaskDueDate(parsed.taskDueDate);
  const examSummary = parseExamSummary(parsed.examSummary);

  const homeworkFromAi = rawType === "homework" || aiHomework.length > 0;
  const examFromAi = rawType === "exam" || !!examSummary;

  let homeworkTasks = aiHomework;
  if (homeworkFromAi && homeworkTasks.length === 0) {
    const fallback =
      typeof parsed.nextAction === "string" && parsed.nextAction.trim()
        ? parsed.nextAction.trim()
        : "按资料要求完成本次作业/待办";
    homeworkTasks = [fallback.length > 120 ? `${fallback.slice(0, 117)}…` : fallback];
  }

  const showHomework = homeworkFromAi && homeworkTasks.length > 0;
  const showExam = examFromAi && !!examSummary;

  return {
    contentType: "note",
    homeworkTasks: showHomework ? homeworkTasks : undefined,
    taskDueDate: showHomework ? taskDueDate : undefined,
    examSummary: showExam ? examSummary : undefined,
    openTab: showHomework ? "homework" : showExam ? "exam" : null,
  };
}

/** 合并分类结果到即将写入的 CardData */
export function applySurfacesToCard(
  base: CardData,
  surfaces: ClassifiedCardSurfaces,
): CardData {
  return {
    ...base,
    contentType: surfaces.contentType,
    ...(surfaces.homeworkTasks?.length ? { homeworkTasks: surfaces.homeworkTasks } : {}),
    ...(surfaces.taskDueDate ? { taskDueDate: surfaces.taskDueDate } : {}),
    ...(surfaces.examSummary ? { examSummary: surfaces.examSummary } : {}),
  };
}
