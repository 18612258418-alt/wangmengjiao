/**
 * 备考模块公共入口
 * 复制 exam-prep-bundle/ 到目标项目 src/modules/exam-prep/ 后：
 *   import { ExamPrepView } from "@/modules/exam-prep";
 */

export { ExamPrepView } from "./components/ExamPrepView";
export type { ExamPrepViewProps } from "./components/ExamPrepView";

export {
  getExamKnowledgeGraph,
  getPointById,
  getChapters,
} from "./data/examKnowledgeGraphs";

export { getRelatedNotesForExamPoint } from "./utils/examPointNotes";
export type { ExamRelatedNote } from "./utils/examPointNotes";

export {
  resolveExamPointSelection,
  saveExamPointSelection,
  getDefaultExamPointId,
} from "./utils/examPointSelection";

export {
  buildExamPointLinkPrompt,
  parseExamPointLinkResponse,
  resolveLinkedExamPoints,
  serializeExamPointCatalog,
} from "./prompts/examPointLink";
export type {
  ExamPointLinkInput,
  ExamPointLinkResult,
  ExamPointLlmCall,
} from "./prompts/examPointLink";

export type {
  ExamKnowledgeGraph,
  ExamKnowledgePoint,
  ExamReferenceQuestion,
  ExerciseDifficulty,
  CardData,
  FeedGroup,
  SubjectData,
  ExerciseSet,
} from "./types";
