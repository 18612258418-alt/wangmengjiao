import { X } from "lucide-react";
import type { ExerciseSet } from "../../types";
import { QuizQuestionBlock } from "./QuizQuestionBlock";
import { MindmapBlock } from "./MindmapBlock";
import { HardPointBlock } from "./HardPointBlock";
import { InteractiveBlock } from "../interactive/InteractiveBlock";
import { DetailFeedbackBar } from "../../shared/DetailFeedbackBar";

export function ExerciseDetailDrawer({ exerciseSet, onClose }: {
  exerciseSet: ExerciseSet | null;
  onClose: () => void;
}) {
  const isOpen = exerciseSet !== null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 bg-[#F5F6FA] z-50 shadow-[-8px_0_32px_rgba(0,0,0,0.12)] rounded-l-3xl transition-transform duration-300"
        style={{
          width: "46%",
          height: "100vh",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {exerciseSet && (
          <>
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 bg-white border-b border-[#EAEDF2] flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-[16px] text-[#020418] truncate" style={{ fontWeight: 700 }}>{exerciseSet.title}</p>
                <p className="text-[12px] text-[#7B8291] mt-1">
                  {new Date(exerciseSet.generatedAt).toLocaleString()} · {exerciseSet.sourceNoteIds.length} 条来源笔记
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#ECECEC] hover:bg-[#E0E0E0] transition-colors flex-shrink-0"
              >
                <X size={14} className="text-[#020418]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">
                {exerciseSet.modules.map((module, moduleIndex) => {
                  if (module.kind === "quiz") {
                    return (
                      <div key={`quiz-${moduleIndex}`} className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-5 rounded-full bg-[#4D5CFF]" />
                          <h3 className="text-[15px] text-[#4D5CFF]" style={{ fontWeight: 700 }}>练习题</h3>
                        </div>
                        {module.questions.map((question, index) => (
                          <QuizQuestionBlock key={question.id} question={question} index={index} />
                        ))}
                      </div>
                    );
                  }
                  if (module.kind === "mindmap") {
                    return <MindmapBlock key={`mindmap-${moduleIndex}`} mermaid={module.mermaid} />;
                  }
                  if (module.kind === "hardPoint") {
                    return <HardPointBlock key={`hard-${moduleIndex}`} sections={module.sections} />;
                  }
                  return (
                    <InteractiveBlock key={`interactive-${moduleIndex}`} spec={module.spec} />
                  );
                })}
                <DetailFeedbackBar />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
