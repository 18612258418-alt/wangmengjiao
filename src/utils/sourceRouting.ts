import type {
  IngestionDecision,
  LearningAction,
  LearningContext,
  LearningDestination,
  LearningMaterialType,
} from "../types";
import { SUBJECT_SYLLABI } from "../data/subjectSyllabi";

export interface SourceRoutingCourse {
  id: string;
  name: string;
  teacher?: string;
}

export interface RawSourceRouting {
  validCourseContent?: unknown;
  validityConfidence?: unknown;
  validityReason?: unknown;
  materialType?: unknown;
  subjectName?: unknown;
  courseName?: unknown;
  targetCourseId?: unknown;
  chapterTitle?: unknown;
  knowledgePoints?: unknown;
  destinations?: unknown;
  learningPhase?: unknown;
  learningActions?: unknown;
  syllabusEntryId?: unknown;
}

const MATERIAL_TYPES = new Set<LearningMaterialType>([
  "courseware", "textbook", "note", "homework", "exam", "syllabus",
  "schedule_notice", "reference", "non_course",
]);
const DESTINATIONS = new Set<LearningDestination>(["knowledge", "homework", "exam"]);
const PHASES = new Set<NonNullable<LearningContext["phase"]>>([
  "before_class", "in_class", "after_class", "homework", "exam",
]);
const ACTION_TYPES = new Set(["preview", "class_reminder", "homework", "review"]);

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalized(value: string): string {
  return value.replace(/[\s（）()·\-—_：:，,。.]/g, "").toLowerCase();
}

function overlapScore(source: string, target: string): number {
  const a = new Set([...normalized(source)].filter(char => /[\u4e00-\u9fa5a-z0-9]/.test(char)));
  const b = new Set([...normalized(target)].filter(char => /[\u4e00-\u9fa5a-z0-9]/.test(char)));
  if (!a.size || !b.size) return 0;
  let matches = 0;
  a.forEach(char => { if (b.has(char)) matches += 1; });
  return matches / Math.min(a.size, b.size);
}

function inferSyllabusEntry(
  rawId: unknown,
  subjectId: string,
  searchableText: string,
): string | undefined {
  const topics = SUBJECT_SYLLABI[subjectId]?.nodes.filter(node => node.kind === "topic") ?? [];
  if (typeof rawId === "string" && topics.some(node => node.id === rawId)) return rawId;
  const scored = topics
    .map(node => ({ id: node.id, score: overlapScore(searchableText, node.title) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 0.42 ? scored[0].id : undefined;
}

export function normalizeSourceRouting(
  raw: RawSourceRouting,
  options: {
    subjectId: string;
    courses: SourceRoutingCourse[];
    fallbackText: string;
  },
) {
  const confidenceValue = Number(raw.validityConfidence);
  const confidence = Number.isFinite(confidenceValue)
    ? Math.max(0, Math.min(1, confidenceValue))
    : 0.5;
  const materialType = MATERIAL_TYPES.has(raw.materialType as LearningMaterialType)
    ? raw.materialType as LearningMaterialType
    : "reference";
  const validCourseContent = typeof raw.validCourseContent === "boolean"
    ? raw.validCourseContent
    : materialType !== "non_course";
  const knowledgePoints = Array.isArray(raw.knowledgePoints)
    ? raw.knowledgePoints.map(text).filter((item): item is string => !!item).slice(0, 12)
    : [];
  const destinations = Array.isArray(raw.destinations)
    ? [...new Set(raw.destinations.filter((item): item is LearningDestination =>
        typeof item === "string" && DESTINATIONS.has(item as LearningDestination),
      ))]
    : [];
  if (validCourseContent && destinations.length === 0) {
    destinations.push(materialType === "homework" ? "homework" : materialType === "exam" ? "exam" : "knowledge");
  }

  const explicitCourseId = text(raw.targetCourseId);
  const courseName = text(raw.courseName);
  const matchedCourse = options.courses.find(course => course.id === explicitCourseId)
    ?? (courseName
      ? options.courses.find(course =>
          normalized(course.name) === normalized(courseName)
          || normalized(courseName).includes(normalized(course.name))
          || normalized(course.name).includes(normalized(courseName)),
        )
      : undefined);
  const phase = PHASES.has(raw.learningPhase as NonNullable<LearningContext["phase"]>)
    ? raw.learningPhase as NonNullable<LearningContext["phase"]>
    : materialType === "homework"
      ? "homework"
      : materialType === "exam"
        ? "exam"
        : materialType === "courseware"
          ? "before_class"
          : "after_class";
  const learningActions: LearningAction[] = Array.isArray(raw.learningActions)
    ? raw.learningActions.flatMap(item => {
        if (!item || typeof item !== "object") return [];
        const value = item as Record<string, unknown>;
        const type = text(value.type);
        const title = text(value.title);
        if (!type || !ACTION_TYPES.has(type) || !title) return [];
        return [{
          type: type as LearningAction["type"],
          title,
          ...(text(value.dueAt) ? { dueAt: text(value.dueAt) } : {}),
          ...(text(value.evidence) ? { evidence: text(value.evidence) } : {}),
        }];
      }).slice(0, 8)
    : [];
  const chapterTitle = text(raw.chapterTitle);
  const searchableText = [
    options.fallbackText,
    chapterTitle,
    ...knowledgePoints,
  ].filter(Boolean).join(" ");
  const syllabusEntryId = inferSyllabusEntry(raw.syllabusEntryId, options.subjectId, searchableText);
  const decision: IngestionDecision = {
    validCourseContent,
    confidence,
    reason: text(raw.validityReason) ?? (validCourseContent ? "内容与大学课程学习直接相关" : "未识别到可用于课程学习的有效内容"),
    materialType,
    ...(text(raw.subjectName) ? { subjectName: text(raw.subjectName) } : {}),
    ...(matchedCourse?.name || courseName ? { courseName: matchedCourse?.name ?? courseName } : {}),
    ...(chapterTitle ? { chapterTitle } : {}),
    knowledgePoints,
    destinations,
  };
  return {
    decision,
    targetCourseId: matchedCourse?.id,
    learningPhase: phase,
    learningActions,
    syllabusEntryId,
    autoArchive: validCourseContent && confidence >= 0.75 && !!(matchedCourse || syllabusEntryId),
  };
}
