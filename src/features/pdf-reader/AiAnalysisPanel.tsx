import { useState } from "react";
import { X, Loader2, Trash2, Send, HelpCircle } from "lucide-react";
import { MathText } from "./MathText";

export interface CircleSection {
  title: string;
  content: string;
}

export interface AiEntry {
  id: string;
  status: "loading" | "streaming" | "done" | "error";
  intent?: string;
  sections?: CircleSection[];
  warnings?: string[];
  answer: string;
  circleIndex: number;
  /** circle = 闭合圈选；ink = 下划线/问号/手写字 */
  kind?: "circle" | "ink";
  /** AI 无法确定意图时向用户提出的澄清问题 */
  clarifyQuestion?: string;
  /** 画布上对应的圈选笔迹已被橡皮擦掉 */
  erased?: boolean;
}

const SKIP_SECTION = new Set([
  "本圈选内容不涉及",
  "不涉及",
  "无",
  "暂无",
  "N/A",
  "n/a",
]);

function hasSectionContent(content: string): boolean {
  const t = content.trim();
  return t.length > 0 && !SKIP_SECTION.has(t);
}

const CLARIFY_CHIPS = ["解释这个概念", "推导这个公式", "检查我写的对不对", "这道题怎么做"];

function ClarifyBox({ question, onReply }: { question: string; onReply: (text: string) => void }) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (t) onReply(t);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-[13px] text-[#020418] leading-[1.7] bg-[#EEF0FF] rounded-xl px-3 py-2.5">
        <HelpCircle size={14} className="text-[#4D5CFF] flex-shrink-0 mt-0.5" />
        <MathText text={question} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CLARIFY_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => onReply(chip)}
            className="text-[11px] px-2.5 py-1.5 rounded-full bg-white border border-[#E2E5F0] text-[#4D5CFF] hover:bg-[#EEF0FF] transition-colors"
            style={{ fontWeight: 600 }}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder="告诉 AI 你想了解什么…"
          className="flex-1 min-w-0 text-[12px] px-3 py-2 rounded-xl bg-white border border-[#E2E5F0] outline-none focus:border-[#4D5CFF] text-[#020418] placeholder:text-[#9CA3AF]"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#4D5CFF] text-white disabled:opacity-30 transition-opacity flex-shrink-0"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

interface Props {
  entries: AiEntry[];
  onClose: () => void;
  onDeleteEntry?: (entryId: string) => void;
  onClarifyReply?: (entryId: string, reply: string) => void;
}

export function AiAnalysisPanel({ entries, onClose, onDeleteEntry, onClarifyReply }: Props) {
  const visibleEntries = entries.filter(e => e.status !== "error");

  return (
    <div
      className="flex flex-col bg-white border-l border-[rgba(0,0,0,0.08)]"
      style={{
        width: 360,
        flexShrink: 0,
        height: "100%",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAEDF2] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4D5CFF]" />
          <span className="text-[14px] text-[#020418]" style={{ fontWeight: 700 }}>
            AI 解析
          </span>
          {visibleEntries.some(e => e.status === "loading" || e.status === "streaming") && (
            <Loader2 size={13} className="text-[#4D5CFF] animate-spin" />
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#7B8291] transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-12">
            <div className="text-[32px] mb-3">✏️</div>
            <p className="text-[13px] text-[#7B8291] leading-6">
              用触控笔在 PDF 上<br />
              圈出任意内容<br />
              AI 将在这里显示解析
            </p>
          </div>
        ) : (
          visibleEntries.map((entry, idx) => {
            const realSections = (entry.sections ?? []).filter(s => hasSectionContent(s.content));
            const showIntent = !!entry.intent?.trim()
              && !(realSections.length === 1 && realSections[0].title === "解析正文" && realSections[0].content === entry.intent);

            return (
              <div
                key={entry.id}
                className="rounded-2xl bg-[#F5F6FA] p-4"
                style={{
                  border: "1px solid rgba(77,92,255,0.12)",
                  opacity: entry.erased ? 0.78 : 1,
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="w-5 h-5 rounded-full text-white text-[11px] flex items-center justify-center flex-shrink-0"
                    style={{ background: entry.erased ? "#9CA3AF" : "#4D5CFF", fontWeight: 700 }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[11px] text-[#7B8291]">
                    {entry.kind === "ink" ? "笔迹标记" : "圈选区域"} {entry.circleIndex}
                  </span>

                  {entry.erased && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#EAEDF2] text-[#7B8291]"
                      style={{ fontWeight: 600 }}
                    >
                      圈选已擦除
                    </span>
                  )}

                  {onDeleteEntry && (
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      title="删除这条解析"
                      className="ml-auto w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#FEE2E2] hover:text-[#EF4444] text-[#9CA3AF] transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {entry.status === "loading" && (
                  <div className="flex items-center gap-2 text-[13px] text-[#7B8291]">
                    <Loader2 size={13} className="animate-spin flex-shrink-0" />
                    AI 正在分析...
                  </div>
                )}

                {entry.status === "done" && entry.clarifyQuestion && onClarifyReply && (
                  <ClarifyBox
                    question={entry.clarifyQuestion}
                    onReply={reply => onClarifyReply(entry.id, reply)}
                  />
                )}

                {(entry.status === "streaming" || entry.status === "done") && !entry.clarifyQuestion && (
                  <div className="space-y-3">
                    {showIntent && (
                      <div>
                        <p className="text-[11px] text-[#4D5CFF] mb-1" style={{ fontWeight: 600 }}>用户意图</p>
                        <div className="text-[13px] text-[#020418] leading-[1.75]">
                          <MathText text={entry.intent!} />
                        </div>
                      </div>
                    )}

                    {realSections.map(section => (
                      <div key={`${entry.id}-${section.title}`}>
                        <p className="text-[11px] text-[#020418] mb-1" style={{ fontWeight: 600 }}>{section.title}</p>
                        <div className="text-[13px] text-[#020418] leading-[1.75] whitespace-pre-wrap">
                          <MathText text={section.content} />
                        </div>
                      </div>
                    ))}

                    {(entry.warnings ?? []).map((w, i) => (
                      <div key={i} className="text-[12px] text-[#B45309] leading-[1.7] bg-[#FFFBEB] rounded-xl px-3 py-2">
                        <MathText text={w} />
                      </div>
                    ))}

                    {/* 结构化字段为空时，用完整 answer 兜底 */}
                    {entry.answer && realSections.length === 0 && (
                      <div className="text-[13px] text-[#020418] leading-[1.75] whitespace-pre-wrap">
                        <MathText text={entry.answer} />
                      </div>
                    )}

                    {entry.status === "streaming" && (
                      <span className="inline-block w-0.5 h-3.5 bg-[#4D5CFF] animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
