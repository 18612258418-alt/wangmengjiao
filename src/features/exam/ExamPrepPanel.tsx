import type { CardData } from "../../types";
import { ExamPracticeQuiz } from "./ExamPracticeQuiz";

export function ExamPrepPanel({
  card,
  onMasteryChange,
}: {
  card: CardData;
  onMasteryChange: (status: "mastered" | "review") => void;
}) {
  const steps = card.examSolutionSteps ?? [];
  const questions = (card.examPracticeQuestions ?? []).filter(
    q => q.type === "single_choice" || q.type === "true_false",
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex-shrink-0 border-b border-[#EAEDF2]/80">
        <p className="text-[15px] text-[#020418]" style={{ fontWeight: 700 }}>
          {card.title.replace(/^记忆[:：]\s*/, "")}
        </p>
        <p className="text-[12px] text-[#7B8291] mt-1">
          {card.examSummary || "题目解析与配套练习"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <section>
          <p className="text-[12px] text-[#E67E22] mb-3" style={{ fontWeight: 700 }}>
            解析步骤
          </p>
          <div className="space-y-2.5">
            {steps.map((step, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#EAEDF2] px-4 py-3.5">
                <p className="text-[13px] text-[#020418] mb-1" style={{ fontWeight: 700 }}>
                  {step.title}
                </p>
                <p className="text-[13px] text-[#41464F] leading-relaxed">{step.content}</p>
              </div>
            ))}
          </div>
        </section>

        {questions.length > 0 ? (
          <ExamPracticeQuiz
            key={card.id}
            questions={questions}
            onComplete={allCorrect => onMasteryChange(allCorrect ? "mastered" : "review")}
          />
        ) : (
          <p className="text-[13px] text-[#B0B5C0]">暂无配套选择题/判断题</p>
        )}
      </div>
    </div>
  );
}
