import { useState } from "react";
import type { QuizQuestion } from "../../types";
import { MathContent } from "../../shared/MathContent";

export function QuizQuestionBlock({ question, index }: {
  question: QuizQuestion;
  index: number;
}) {
  const [selected, setSelected] = useState<string>("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isShort = question.type === "short_answer";
  const isCorrect = isShort
    ? shortAnswer.trim().length > 0
    : selected && selected.replace(/^([A-D]).*/, "$1") === question.answer.replace(/^([A-D]).*/, "$1");

  return (
    <div className="bg-white border border-[#EAEDF2] rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-full bg-[#EEF0FF] text-[#4D5CFF] flex items-center justify-center text-[12px] flex-shrink-0" style={{ fontWeight: 700 }}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F6FA] text-[#7B8291]">
              {question.type === "single_choice" ? "单选" : question.type === "true_false" ? "判断" : "简答"}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#F97316]">
              {question.difficulty}
            </span>
          </div>
          <div className="text-[14px] text-[#020418] leading-6" style={{ fontWeight: 600 }}>
            <MathContent text={question.stem} />
          </div>
        </div>
      </div>

      {!isShort ? (
        <div className="pl-10 flex flex-col gap-2">
          {(question.options ?? []).map(option => {
            const active = selected === option;
            return (
              <button
                key={option}
                onClick={() => !submitted && setSelected(option)}
                className="text-left rounded-xl px-3 py-2 text-[13px] transition-colors border"
                style={{
                  borderColor: active ? "#4D5CFF" : "#EAEDF2",
                  background: active ? "#EEF0FF" : "#F7F8FA",
                  color: "#334155",
                }}
              >
                <MathContent text={option} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="pl-10">
          <textarea
            value={shortAnswer}
            onChange={e => setShortAnswer(e.target.value)}
            disabled={submitted}
            placeholder="写下你的解题思路..."
            className="w-full min-h-24 rounded-xl border border-[#EAEDF2] bg-[#F7F8FA] px-3 py-2 text-[13px] outline-none focus:border-[#4D5CFF]"
          />
        </div>
      )}

      <div className="pl-10 flex items-center justify-between">
        <div className="text-[12px] text-[#7B8291]">
          {(question.knowledgePoints ?? []).slice(0, 3).join(" · ")}
        </div>
        <button
          onClick={() => setSubmitted(true)}
          disabled={submitted || (!isShort && !selected) || (isShort && !shortAnswer.trim())}
          className="px-3 py-1.5 rounded-lg bg-[#4D5CFF] text-white text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontWeight: 600 }}
        >
          {submitted ? "已提交" : "提交答案"}
        </button>
      </div>

      {submitted && (
        <div className="ml-10 rounded-xl border border-[#EAEDF2] bg-[#F8FAFB] p-3">
          <p className="text-[13px] mb-2" style={{ color: isCorrect ? "#059669" : "#EF4444", fontWeight: 700 }}>
            {isShort ? "参考解析" : isCorrect ? "回答正确" : `正确答案：${question.answer}`}
          </p>
          <div className="text-[13px] text-[#334155] leading-6">
            <MathContent text={question.explanation} />
          </div>
        </div>
      )}
    </div>
  );
}
