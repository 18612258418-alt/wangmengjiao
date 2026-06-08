import { useCallback, useEffect, useState } from "react";
import { X, Loader2, RefreshCw, Eye, EyeOff, FileText, AlertCircle } from "lucide-react";
import type { ExamKnowledgeGraph } from "../types";
import { buildMockExamPrompt, parseMockExamResponse, type MockExamPaper } from "../prompts/mockExam";
import { MathContent } from "../../../shared/MathContent";

export function SprintMockExamModal({
  graph,
  onAskLlm,
  onClose,
}: {
  graph: ExamKnowledgeGraph;
  onAskLlm: (prompt: string) => Promise<string>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<MockExamPaper | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowAnswers(false);
    try {
      const raw = await onAskLlm(buildMockExamPrompt(graph));
      const parsed = parseMockExamResponse(raw);
      if (!parsed) {
        setError("试卷解析失败，请点「换一套」重试");
        setPaper(null);
      } else {
        setPaper(parsed);
      }
    } catch {
      setError("生成试卷失败，请检查网络后重试");
      setPaper(null);
    } finally {
      setLoading(false);
    }
  }, [graph, onAskLlm]);

  useEffect(() => {
    void generate();
  }, [generate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[760px] max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#EAEDF2]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-[#4D5CFF]" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] text-[#020418] truncate" style={{ fontWeight: 700 }}>
                冲刺模拟
              </p>
              <p className="text-[11px] text-[#9CA3AF] truncate">{graph.title} · AI 按考点大纲命题</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={loading}
              className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg bg-[#F5F6FA] text-[#41464F] hover:bg-[#EEF0FF] hover:text-[#4D5CFF] disabled:opacity-50 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              换一套
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#F5F6FA] hover:bg-[#EAEDF2] flex items-center justify-center text-[#41464F]"
              title="关闭"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* 试卷正文 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 bg-[#FCFCFD]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7B8291]">
              <Loader2 size={28} className="animate-spin text-[#4D5CFF]" />
              <p className="text-[13px]">正在按考点命制模拟试卷…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7B8291]">
              <AlertCircle size={26} className="text-[#F43F5E]" />
              <p className="text-[13px]">{error}</p>
              <button
                type="button"
                onClick={() => void generate()}
                className="text-[12px] px-3 py-1.5 rounded-lg bg-[#4D5CFF] text-white hover:bg-[#3D4CEF]"
                style={{ fontWeight: 600 }}
              >
                重试
              </button>
            </div>
          ) : paper ? (
            <div className="max-w-[640px] mx-auto">
              {/* 卷头 */}
              <div className="text-center border-b-2 border-[#020418] pb-3 mb-4">
                <h2 className="text-[18px] text-[#020418]" style={{ fontWeight: 800 }}>
                  {paper.title}
                </h2>
                <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1 mt-2 text-[12px] text-[#41464F]">
                  {paper.course && <span>课程：{paper.course}</span>}
                  <span>考试时长：{paper.duration}</span>
                  <span>满分：{paper.totalScore} 分</span>
                </div>
                <div className="flex items-center justify-center gap-x-6 mt-3 text-[12px] text-[#9CA3AF]">
                  <span>姓名：____________</span>
                  <span>学号：____________</span>
                  <span>成绩：________</span>
                </div>
                {paper.notes.length > 0 && (
                  <p className="text-[11px] text-[#7B8291] mt-2.5">
                    考生须知：{paper.notes.join(" · ")}
                  </p>
                )}
              </div>

              {/* 大题 */}
              <div className="space-y-6">
                {paper.sections.map((section, si) => (
                  <section key={si}>
                    <div className="flex items-baseline justify-between gap-3 mb-2.5">
                      <h3 className="text-[14px] text-[#020418]" style={{ fontWeight: 700 }}>
                        {section.title}
                      </h3>
                      {section.scoreHint && (
                        <span className="text-[11px] text-[#9CA3AF] flex-shrink-0">（{section.scoreHint}）</span>
                      )}
                    </div>
                    <ol className="space-y-3">
                      {section.questions.map((q, qi) => (
                        <li key={qi} className="text-[13px] text-[#020418] leading-relaxed">
                          <div className="flex gap-1.5">
                            <span className="flex-shrink-0" style={{ fontWeight: 600 }}>
                              {q.number}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <MathContent mathMode="explicit" text={q.stem} className="text-[13px] text-[#020418] leading-relaxed" />
                              {q.score > 0 && (
                                <span className="text-[11px] text-[#9CA3AF] ml-1">（{q.score} 分）</span>
                              )}
                              {q.options && q.options.length > 0 && (
                                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                  {q.options.map((opt, oi) => (
                                    <MathContent
                                      key={oi}
                                      mathMode="explicit"
                                      text={opt}
                                      className="text-[12.5px] text-[#41464F] leading-relaxed"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>

              {/* 答案区 */}
              {paper.answers.length > 0 && (
                <div className="mt-7 pt-4 border-t border-dashed border-[#D6DBE5]">
                  <button
                    type="button"
                    onClick={() => setShowAnswers(v => !v)}
                    className={`inline-flex items-center gap-1.5 text-[13px] px-3.5 py-2 rounded-xl transition-colors ${
                      showAnswers
                        ? "bg-[#EEF0FF] text-[#4D5CFF]"
                        : "bg-[#4D5CFF] text-white hover:bg-[#3D4CEF] shadow-sm"
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {showAnswers ? <EyeOff size={15} /> : <Eye size={15} />}
                    {showAnswers ? "隐藏答案与解析" : "查看答案与解析"}
                  </button>

                  {showAnswers && (
                    <div className="mt-3 rounded-xl bg-[#F8F9FF] border border-[#E4E8FF] px-4 py-3.5 space-y-3">
                      <p className="text-[12px] text-[#4D5CFF]" style={{ fontWeight: 700 }}>
                        参考答案与解析
                      </p>
                      {paper.answers.map((a, ai) => (
                        <div key={ai} className="text-[12.5px] leading-relaxed">
                          <div className="flex gap-1.5">
                            {a.label && (
                              <span className="flex-shrink-0 text-[#4D5CFF]" style={{ fontWeight: 700 }}>
                                {a.label}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <MathContent
                                mathMode="explicit"
                                text={a.answer}
                                className="text-[12.5px] text-[#020418] leading-relaxed"
                              />
                              {a.explanation && (
                                <div className="mt-0.5 text-[#6B7280]">
                                  <span style={{ fontWeight: 600 }}>解析：</span>
                                  <MathContent
                                    mathMode="explicit"
                                    text={a.explanation}
                                    className="text-[12px] text-[#6B7280] leading-relaxed"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
