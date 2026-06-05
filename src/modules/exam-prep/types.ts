/** 备考模块独立类型 — 复制到目标项目后可合并进现有 types.ts */

export type ExerciseDifficulty = "basic" | "advanced" | "challenge";

export interface ExamReferenceQuestion {
  stem: string;
  hint?: string;
  answerOutline: string;
  difficulty?: ExerciseDifficulty;
}

export interface ExamKnowledgePoint {
  id: string;
  label: string;
  chapter: string;
  difficulty?: ExerciseDifficulty;
  summary?: string;
  prerequisites: string[];
  postrequisites: string[];
  examPoints: string[];
  answerStrategy: string[];
  referenceQuestions: ExamReferenceQuestion[];
}

export interface ExamKnowledgeGraph {
  subjectId: string;
  title: string;
  points: ExamKnowledgePoint[];
}

export type CardContentType = "note" | "homework";

export interface DetailSection {
  title: string;
  items: string[];
}

/** 笔记卡片（相关笔记区块用，可按目标站裁剪字段） */
export interface CardData {
  id: string;
  title: string;
  img: string;
  source: string;
  time: string;
  contentType?: "note" | "homework";
  overview?: string;
  detailIntro?: string;
  aiKeyPoints?: string[];
  detailSections?: DetailSection[];
  unifiedDetail?: string;
  linkedExamPointIds?: string[];
}

export interface FeedGroup {
  date: string;
  label: string;
  summary: string;
  cards: CardData[];
}

export interface SubjectData {
  id: string;
  name: string;
  short: string;
}

/** 习题集（底部「开始备考」引导用，可选） */
export interface ExerciseSet {
  id: string;
  title: string;
  subjectId: string;
  sourceNoteIds: string[];
  generatedAt: number;
  difficulty: ExerciseDifficulty;
}
