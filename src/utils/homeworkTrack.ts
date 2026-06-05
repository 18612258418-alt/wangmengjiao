/** 作业步骤拆解所依据的学科路线 */
export type HomeworkTrack = "stem" | "humanities" | "language";

const TRACK_BY_SUBJECT: Record<string, HomeworkTrack> = {
  physics: "stem",
  math: "stem",
  chemistry: "stem",
  english: "language",
  other: "humanities",
};

export const HOMEWORK_TRACK_LABELS: Record<HomeworkTrack, string> = {
  stem: "理工科解题思路",
  humanities: "文科框架构思",
  language: "语言技能训练",
};

export function getHomeworkTrack(subjectId: string): HomeworkTrack {
  return TRACK_BY_SUBJECT[subjectId] ?? "humanities";
}
