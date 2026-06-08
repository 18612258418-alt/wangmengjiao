export interface DetailSection { title: string; items: string[]; }
export interface ExpandedKnowledge { concept: string; explanation: string; }
export interface KnowledgeNode { label: string; level: number; current?: boolean; }

/** Skill type — determines the deep-analysis prompt and RightDrawer rendering layout */
export type SkillType =
  | "theory_concept"   // default: definition + key points + exam context
  | "math_problem"     // step-by-step solution + traps + similar problem types
  | "language"         // vocabulary + grammar patterns + usage examples
  | "experiment_lab"   // hypothesis → method → conclusion + error analysis
  | "code_cs"          // algorithm + complexity + design patterns
  | "literature_essay"; // core argument + rhetoric + critical questions

/** 卡片内容类型 — 由豆包视觉模型自动判断 */
export type CardContentType = "note" | "homework";

export interface CardData {
  id: string;
  title: string;
  img: string;
  source: string;
  time: string;
  skill?: SkillType;
  /** 内容类型：笔记 / 作业待办 / 备考习题（默认 note） */
  contentType?: CardContentType;
  /** 笔记 Tab：对应学科教学大纲条目 id */
  syllabusEntryId?: string;
  /** 笔记 Tab：新增后未被查看（用于大纲条目的"新增"红点角标，点击条目后清除） */
  unread?: boolean;
  /** 备考 Tab：本笔记实质涵盖的考点图谱节点 id（上传时由大模型挂靠，用于「相关笔记」） */
  linkedExamPointIds?: string[];
  /** 作业模块：整理后的可执行文字 task（仅 homework） */
  homeworkTasks?: string[];
  /** 作业截止日 YYYYMMDD，用于按天归档（可选） */
  taskDueDate?: string;
  /** 作业模块：已标记完成的 task 下标（对应 homeworkTasks） */
  homeworkCompletedIndices?: number[];
  overview?: string;
  detailIntro?: string;
  detailSections?: DetailSection[];
  aiKeyPoints?: string[];
  expandedKnowledge?: ExpandedKnowledge[];
  knowledgeTree?: KnowledgeNode[];
  nextAction?: string;
  /** Raw 【Section】-formatted text from the skill deep-analysis second pass */
  skillRawSections?: string;
  /** Whether the user drew annotations on the card image */
  hasAnnotations?: boolean;
  /** Unified detail page content — DeepSeek-generated, replaces overview+detailSections+skillRawSections for new cards */
  unifiedDetail?: string;
  /** Optional dynamic interactive experience for this memory card */
  interactiveSpec?: InteractiveSpec;
}

export interface FeedGroup {
  date: string;
  label: string;
  summary: string;
  cards: CardData[];
}

export type SubjectData = {
  id: string;
  name: string;
  short: string;
  count: number;
  unit: string;
  entries: string[];
  extra: string;
};

// ─── 习题集 / 生成式内容 ────────────────────────────────────────────────────

export type ExerciseDifficulty = "basic" | "advanced" | "challenge";

export type QuizType = "single_choice" | "true_false" | "short_answer";

export interface QuizQuestion {
  id: string;
  type: QuizType;
  difficulty: ExerciseDifficulty;
  stem: string;
  options?: string[];           // 选择题/判断题选项；简答题为空
  answer: string;               // "A" / "对" / 完整解答文本
  explanation: string;
  knowledgePoints?: string[];
  crossNotes?: string[];        // 涉及的来源笔记 id
}

export interface HardPointSection {
  title: string;
  content: string;
}

/** 组卷蓝图（两段式编排第一步的产物）：先规划考点，再据此出题 */
export interface QuizBlueprintPoint {
  point: string;                 // 考点名称
  type: QuizType;                // 推荐题型
  difficulty: ExerciseDifficulty;
  sourceNoteId?: string;         // 主要来源笔记 id
  rationale?: string;            // 为什么考 / 高频程度
}

export interface QuizBlueprint {
  examPoints: QuizBlueprintPoint[];
}

export type InteractionType =
  | "physics_sim"
  | "math_plot"
  | "chem_reaction"
  | "language_parse"
  | "step_cards";

export interface InteractionControl {
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  default?: number | string;
  unit?: string;
}

export type RenderStrategy =
  | "canvas_animation"
  | "canvas_plot"
  | "svg_static"
  | "dom_cards";

/** 交互教学方案 —— 先设计"为什么交互、交互什么"，再生成代码 */
export interface InteractionPlan {
  suitable: boolean;
  interactionType: InteractionType;
  learningGoal: string;
  controls: InteractionControl[];
  outputs: string[];
  visualMetaphor: string;
  /** 推荐渲染策略 —— 直接决定代码用 canvas 还是 svg/dom */
  renderStrategy?: RenderStrategy;
  /** 场景分镜稿：要画什么元素、布局位置、关键比例、颜色提示 */
  sceneDescription?: string;
  fallbackMode?: "step_cards";
  reason?: string;
}

/** 交互演示规约 —— Sandpack 沙箱模式 */
export interface InteractiveSpec {
  /** AI 生成的完整 /App.tsx 源码（符合 sandpackStarter 依赖约束） */
  appCode: string;
  /** 交互教学方案 */
  plan?: InteractionPlan;
  /** 给用户的玩法说明 */
  explanation?: string;
  /** 备用：预设主题 key（如 newton-second-law），便于回退到内置示例 */
  preset?: string;
}

export type GeneratedModule =
  | { kind: "quiz"; questions: QuizQuestion[] }
  | { kind: "mindmap"; mermaid: string }
  | { kind: "hardPoint"; sections: HardPointSection[] }
  | { kind: "interactive"; spec: InteractiveSpec };

export interface ExerciseSet {
  id: string;
  title: string;
  subjectId: string;
  /** 来源笔记 cardId 列表 */
  sourceNoteIds: string[];
  /** Unix ms */
  generatedAt: number;
  difficulty: ExerciseDifficulty;
  modules: GeneratedModule[];
  /** 用户做题状态（演示用） */
  status?: "untouched" | "in_progress" | "completed";
}
