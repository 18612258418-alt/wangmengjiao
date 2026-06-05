import type { ExerciseSet, SubjectData } from "../../types";

function difficultyLabel(difficulty: ExerciseSet["difficulty"]) {
  switch (difficulty) {
    case "basic": return "基础";
    case "challenge": return "挑战";
    default: return "进阶";
  }
}

function moduleSummary(exerciseSet: ExerciseSet): string {
  return exerciseSet.modules.map(module => {
    if (module.kind === "quiz") return `${module.questions.length}题`;
    if (module.kind === "mindmap") return "思维导图";
    if (module.kind === "hardPoint") return "难点讲解";
    return "交互演示";
  }).join(" · ");
}

export function ExercisesView({ subject, exerciseSets, onOpenGenerate, onOpenExercise }: {
  subject: SubjectData;
  exerciseSets: ExerciseSet[];
  onOpenGenerate: () => void;
  onOpenExercise: (exerciseSet: ExerciseSet) => void;
}) {
  const subjectExerciseSets = exerciseSets
    .filter(item => item.subjectId === subject.id)
    .sort((a, b) => b.generatedAt - a.generatedAt);

  if (subjectExerciseSets.length > 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="flex items-center pb-4">
          <span className="text-[13px] text-[#7B8291]">
            共 {subjectExerciseSets.length} 组学习记录，按生成时间倒序
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {subjectExerciseSets.map(item => (
            <button
              key={item.id}
              onClick={() => onOpenExercise(item)}
              className="bg-white rounded-2xl border border-[#EAEDF2] p-4 text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] px-2 py-1 rounded-full bg-[#FFF7ED] text-[#F97316]" style={{ fontWeight: 700 }}>
                  {difficultyLabel(item.difficulty)}
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  {new Date(item.generatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[14px] text-[#020418] line-clamp-2 min-h-10" style={{ fontWeight: 700 }}>
                {item.title}
              </p>
              <p className="text-[12px] text-[#7B8291] mt-3 line-clamp-1">{moduleSummary(item)}</p>
              <div className="mt-4 pt-3 border-t border-[#F0F2F5] flex items-center justify-between">
                <span className="text-[12px] text-[#7B8291]">{item.sourceNoteIds.length} 条来源笔记</span>
                <span className="text-[12px] text-[#4D5CFF]" style={{ fontWeight: 600 }}>打开</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-8">
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <div className="w-14 h-14 rounded-full bg-[#FFF7ED] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <p className="text-[14px] text-[#7B8291]">
          {subject.short}学科还没有学习记录
        </p>
        <p className="text-[12px] text-[#B0B5C0] text-center max-w-xs">
          选中若干笔记后，AI 学习助手可以自动生成练习题、思维导图、难点讲解
        </p>
        <button
          onClick={onOpenGenerate}
          className="mt-2 px-4 py-2 rounded-xl bg-[#4D5CFF] text-white text-[13px] hover:bg-[#3D4CEF] transition-colors"
          style={{ fontWeight: 600 }}
        >
          + AI 学习助手
        </button>
      </div>
    </div>
  );
}
