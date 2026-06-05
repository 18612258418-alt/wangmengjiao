import { useMemo, useState } from "react";
import type { ExamPracticeQuestion } from "../../types";

function normalizeAnswer(type: ExamPracticeQuestion["type"], picked: string, expected: string): boolean {
  const p = picked.trim();
  const e = expected.trim();
  if (type === "true_false") {
    const truthy = new Set(["对", "正确", "true", "T", "是"]);
    const falsy = new Set(["错", "错误", "false", "F", "否"]);
    const pBool = truthy.has(p) ? true : falsy.has(p) ? false : null;
    const eBool = truthy.has(e) ? true : falsy.has(e) ? false : null;
    if (pBool !== null && eBool !== null) return pBool === eBool;
  }
  const pLetter = p.replace(/^([A-D])[.、．\s].*/, "$1").toUpperCase();
  const eLetter = e.replace(/^([A-D])[.、．\s].*/, "$1").toUpperCase();
  return pLetter === eLetter || p === e;
}

export function ExamPracticeQuiz({
  questions,
  onComplete,
}: {
  questions: ExamPracticeQuestion[];
  onComplete: (allCorrect: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const allSubmitted = questions.every(q => results[q.id] !== undefined);

  const handleSubmit = (q: ExamPracticeQuestion) => {
    const picked = answers[q.id];
    if (!picked) return;
    const ok = normalizeAnswer(q.type, picked, q.answer);
    setResults(prev => ({ ...prev, [q.id]: ok }));
  };

  const handleFinish = () => {
    const allCorrect = questions.every(q => results[q.id] === true);
    setFinished(true);
    onComplete(allCorrect);
  };

  const correctCount = useMemo(
    () => questions.filter(q => results[q.id] === true).length,
    [questions, results],
  );

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#7B8291]" style={{ fontWeight: 600 }}>
        配套练习（单选 / 判断）
      </p>
      {questions.map((q, index) => {
        const submitted = results[q.id] !== undefined;
        const ok = results[q.id];
        return (
          <div key={q.id} className="rounded-2xl bg-white border border-[#EAEDF2] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full bg-[#FFF4E6] text-[#E67E22] flex items-center justify-center text-[11px]"
                style={{ fontWeight: 700 }}
              >
                {index + 1}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F6FA] text-[#7B8291]">
                {q.type === "single_choice" ? "单选" : "判断"}
              </span>
            </div>
            <p className="text-[14px] text-[#020418] leading-relaxed" style={{ fontWeight: 600 }}>
              {q.stem}
            </p>
            <div className="flex flex-col gap-2">
              {q.options.map(opt => {
                const active = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`text-left rounded-xl px-3 py-2.5 text-[13px] border transition-colors ${
                      submitted
                        ? active
                          ? ok
                            ? "border-[#34D399] bg-[#ECFDF5]"
                            : "border-[#FCA5A5] bg-[#FEF2F2]"
                          : "border-[#EAEDF2] bg-[#F8FAFB] opacity-60"
                        : active
                          ? "border-[#E67E22] bg-[#FFF7ED]"
                          : "border-[#EAEDF2] bg-[#F8FAFB] hover:border-[#FDBA74]"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {!submitted ? (
              <button
                type="button"
                disabled={!answers[q.id]}
                onClick={() => handleSubmit(q)}
                className="text-[12px] px-3 py-1.5 rounded-lg bg-[#E67E22] text-white disabled:opacity-40"
                style={{ fontWeight: 600 }}
              >
                提交本题
              </button>
            ) : (
              <div className="rounded-xl bg-[#F8FAFB] border border-[#EAEDF2] px-3 py-2.5">
                <p className="text-[13px] mb-1" style={{ fontWeight: 700, color: ok ? "#059669" : "#DC2626" }}>
                  {ok ? "回答正确" : `正确答案：${q.answer}`}
                </p>
                <p className="text-[12px] text-[#6B7280] leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}

      {allSubmitted && !finished && (
        <button
          type="button"
          onClick={handleFinish}
          className="w-full py-3 rounded-xl bg-[#4D5CFF] text-white text-[14px]"
          style={{ fontWeight: 700 }}
        >
          完成练习并更新掌握状态（{correctCount}/{questions.length} 正确）
        </button>
      )}

      {finished && (
        <p className="text-[13px] text-center text-[#7B8291]">
          状态已更新为{correctCount === questions.length ? "「已掌握」" : "「待复习」"}
        </p>
      )}
    </div>
  );
}
