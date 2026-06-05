import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { streamText } from "../utils/api";
import { buildConceptQuickPrompt } from "../prompts";
import { parseSections } from "../utils/parseSections";
import { parseJsonLoose } from "../utils/json";
import { MathContent } from "../shared/MathContent";

// ─── Section metadata ─────────────────────────────────────────────────────────

const SECTIONS = [
  { key: "定义速览",      textColor: "#0369A1", bgColor: "#E0F2FE", barColor: "#38BDF8" },
  { key: "核心要点",      textColor: "#BE123C", bgColor: "#FFE4E6", barColor: "#FB7185" },
  { key: "考试/应用场景", textColor: "#4338CA", bgColor: "#EEF2FF", barColor: "#818CF8" },
  { key: "易错警告",      textColor: "#C2410C", bgColor: "#FFF7ED", barColor: "#FB923C" },
  { key: "记忆技巧",      textColor: "#065F46", bgColor: "#D1FAE5", barColor: "#34D399" },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sectionMeta(title: string) {
  return SECTIONS.find(s => s.key === title) ?? {
    textColor: "#374151", bgColor: "#F3F4F6", barColor: "#9CA3AF",
  };
}

// ─── ModuleBadge (local copy to avoid cross-file dep on App internals) ────────

function ModuleBadge({ label, textColor, bgColor, barColor }: {
  label: string; textColor: string; bgColor: string; barColor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
      <div style={{ width: 4, height: 18, borderRadius: 3, background: barColor, flexShrink: 0 }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: textColor, background: bgColor, padding: "2px 10px", borderRadius: 8 }}>
        {label}
      </span>
    </div>
  );
}

type Block =
  | { type: "numbered"; num: string; content: string }
  | { type: "warning"; content: string }
  | { type: "arrow"; left: string; right: string }
  | { type: "text"; content: string };

function isSentenceComplete(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const lastChar = trimmed.slice(-1);
  // Sentence-ending punctuation: full-width 。！？；, half-width .!?;,
  // ellipses … and dashes — that legitimately close a clause.
  return /[\u3002\uff01\uff1f\uff1b\.\!\?;…—)\]\u300d\u201d]$/.test(lastChar);
}

/** Group raw lines into semantic blocks.
 *  Continuation lines after a numbered/warning/arrow item (e.g. long sentences
 *  wrapping across lines) are merged back onto the parent item so the bubble
 *  is never clipped and no characters get lost across line breaks. */
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue; // Skip empty lines inside blocks

    if (line.trimStart().startsWith("⚠")) {
      blocks.push({ type: "warning", content: line.trimStart().slice(1).trim() });
      continue;
    }

    const numMatch = line.trimStart().match(/^(\d+)[\.、]\s*(.*)/);
    if (numMatch) {
      blocks.push({ type: "numbered", num: numMatch[1], content: numMatch[2] });
      continue;
    }

    const arrowMatch = line.match(/^(.+?)\s*[→>]\s*(.+)/);
    if (arrowMatch) {
      blocks.push({ type: "arrow", left: arrowMatch[1].trim(), right: arrowMatch[2].trim() });
      continue;
    }

    // Continuation line: only append if the previous block's last sentence
    // was NOT yet complete (no terminal punctuation). This applies to every
    // block type so that ⚠ warnings and → arrows also get their continuation
    // lines stitched back together rather than dropped into orphan paragraphs.
    const last = blocks[blocks.length - 1];
    if (last?.type === "numbered" && !isSentenceComplete(last.content)) {
      last.content += " " + line.trim();
    } else if (last?.type === "warning" && !isSentenceComplete(last.content)) {
      last.content += " " + line.trim();
    } else if (last?.type === "arrow" && !isSentenceComplete(last.right)) {
      last.right += " " + line.trim();
    } else if (last?.type === "text" && !isSentenceComplete(last.content)) {
      last.content += "\n" + line.trim();
    } else {
      blocks.push({ type: "text", content: line.trim() });
    }
  }
  return blocks;
}

/**
 * 在流式渲染过程中，DeepSeek 会一段一段地输出 `[[名词]]`。
 * 若当前 buffer 末尾出现「未闭合」的 `[[xxx`（还没等到 `]]`），
 * 原本会先以原始字符串 "[[xxx" 显示，等 `]]` 到达瞬间再变身为蓝色按钮，
 * 造成肉眼可见的"文字抖动"。
 *
 * 这里在分词前把"最后一个未闭合的 [[ 起到字符串末尾"的部分直接裁掉，
 * 等 `]]` 真正到达后再让它出现，画面就会丝滑很多。
 * 只裁尾部、不动中段，因此不会影响其它已闭合的 [[ ]]。
 */
function stripTrailingUnclosedLink(text: string): string {
  const lastOpen = text.lastIndexOf("[[");
  if (lastOpen === -1) return text;
  if (text.indexOf("]]", lastOpen) !== -1) return text;
  return text.slice(0, lastOpen);
}

export function renderTextWithLinks(text: string, onLinkClick: (word: string) => void) {
  const safeText = stripTrailingUnclosedLink(text);
  const parts = safeText.split(/(\[\[.+?\]\])/);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("[[") && part.endsWith("]]")) {
          const word = part.slice(2, -2).trim();
          return (
            <button
              key={idx}
              onClick={() => onLinkClick(word)}
              style={{
                background: "rgba(77, 92, 255, 0.08)",
                color: "#4D5CFF",
                border: "none",
                borderRadius: "4px",
                padding: "2px 6px",
                margin: "0 2px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-block",
                verticalAlign: "baseline",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(77, 92, 255, 0.15)";
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(77, 92, 255, 0.08)";
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              {word}
            </button>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

// Render a single section's text content with numbered lists / warnings highlighted and links clickable
function SectionBody({ text, onConceptClick }: { text: string; onConceptClick: (word: string) => void }) {
  const blocks = parseBlocks(text);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {blocks.map((block, i) => {
        if (block.type === "warning") {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#F97316", fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
              <MathContent text={block.content} onLinkClick={onConceptClick} style={{ fontSize: 13, color: "#374155", lineHeight: 1.75 }} />
            </div>
          );
        }
        if (block.type === "numbered") {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #818CF8, #6366F1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{block.num}</span>
              </div>
              <MathContent text={block.content} onLinkClick={onConceptClick} style={{ fontSize: 13, color: "#334155", lineHeight: 1.75 }} />
            </div>
          );
        }
        if (block.type === "arrow") {
          return (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "1px 8px", borderRadius: 6, flexShrink: 0 }}>{block.left}</span>
              <MathContent text={block.right} onLinkClick={onConceptClick} style={{ fontSize: 13, color: "#374155", lineHeight: 1.75 }} />
            </div>
          );
        }
        return (
          <MathContent key={i} text={block.content} onLinkClick={onConceptClick} style={{ fontSize: 13, color: "#334155", lineHeight: 1.85 }} />
        );
      })}
    </div>
  );
}

// ─── Quiz Type and Safe Parser ────────────────────────────────────────────────

interface QuizData {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

function parseQuiz(text: string): QuizData | null {
  try {
    let cleaned = text.trim();
    // Strip markdown JSON block backticks if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/```$/, "").trim();
    }
    // Attempt to extract the outermost {} JSON block
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1);
    }
    const data = parseJsonLoose<QuizData>(cleaned);
    if (data && typeof data.question === "string" && Array.isArray(data.options)) {
      return data as QuizData;
    }
  } catch {
    // Graceful catch for partial streams
  }
  return null;
}

export function InteractiveQuiz({ rawText, loading }: { rawText: string; loading: boolean }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Reset answer states when the underlying question text changes
  useEffect(() => {
    setSelectedIdx(null);
    setShowExplanation(false);
  }, [rawText]);

  const quiz = parseQuiz(rawText);

  if (!quiz) {
    if (loading) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div style={{ width: 4, height: 18, borderRadius: 3, background: "#8B5CF6", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#6D28D9", background: "#EDE9FE", padding: "2px 10px", borderRadius: 8 }}>
              ✍ 互动自测
            </span>
          </div>
          <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 14, height: 14, border: "2px solid #6D28D9", borderTopColor: "transparent",
              borderRadius: "50%", animation: "concept-spin 0.8s linear infinite", display: "inline-block"
            }} />
            <span style={{ fontSize: 13, color: "#7B8291" }}>AI 正在为你生成专属自测题...</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    setShowExplanation(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <div style={{ width: 4, height: 18, borderRadius: 3, background: "#8B5CF6", flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#6D28D9", background: "#EDE9FE", padding: "2px 10px", borderRadius: 8 }}>
          ✍ 互动自测
        </span>
      </div>

      <div style={{
        background: "#F5F3FF",
        border: "1px solid #DDD6FE",
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 2px 8px rgba(109, 40, 217, 0.04)"
      }}>
        {/* Question text */}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#4C1D95", lineHeight: 1.6 }}>
          <MathContent text={quiz.question} />
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quiz.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = idx === quiz.answerIndex;
            const hasAnswered = selectedIdx !== null;

            let btnBg = "#FFFFFF";
            let btnBorder = "#E2E8F0";
            let btnColor = "#334155";
            let icon = null;

            if (hasAnswered) {
              if (isCorrect) {
                btnBg = "#ECFDF5";
                btnBorder = "#10B981";
                btnColor = "#047857";
                icon = (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                );
              } else if (isSelected) {
                btnBg = "#FEF2F2";
                btnBorder = "#EF4444";
                btnColor = "#B91C1C";
                icon = (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                );
              } else {
                btnBg = "#F8FAFC";
                btnBorder = "#E2E8F0";
                btnColor = "#64748B";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={hasAnswered}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  textAlign: "left",
                  background: btnBg,
                  border: `1.5px solid ${btnBorder}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontSize: "13px",
                  fontWeight: isSelected || (hasAnswered && isCorrect) ? 600 : 500,
                  color: btnColor,
                  cursor: hasAnswered ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.05)" : "none"
                }}
                onMouseEnter={e => {
                  if (!hasAnswered) {
                    e.currentTarget.style.background = "#F3F4F6";
                    e.currentTarget.style.borderColor = "#CBD5E1";
                  }
                }}
                onMouseLeave={e => {
                  if (!hasAnswered) {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.borderColor = "#E2E8F0";
                  }
                }}
              >
                <span className="flex-1 min-w-0"><MathContent text={opt} /></span>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Explanation sheet */}
        {showExplanation && (
          <div
            style={{
              marginTop: 6,
              background: "#FFFFFF",
              border: "1px dashed #DDD6FE",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: "12.5px",
              color: "#5B21B6",
              lineHeight: 1.6,
              animation: "concept-fadeIn 0.25s ease-out"
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
              💡 学长解析：
              <span style={{
                fontSize: "11px",
                background: selectedIdx === quiz.answerIndex ? "#D1FAE5" : "#FEE2E2",
                color: selectedIdx === quiz.answerIndex ? "#065F46" : "#991B1B",
                padding: "2px 8px",
                borderRadius: "20px"
              }}>
                {selectedIdx === quiz.answerIndex ? "回答正确！" : "回答错误"}
              </span>
            </div>
            <MathContent text={quiz.explanation} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConceptPage({
  keyword, cardTitle, onBack,
}: {
  keyword: string;
  cardTitle: string;
  onBack?: () => void;
}) {
  const [currentKeyword, setCurrentKeyword] = useState(keyword);
  const [history, setHistory]               = useState<string[]>([]);
  const [raw, setRaw]                       = useState("");
  const [loading, setLoading]               = useState(true);
  const [retry, setRetry]                   = useState(0);
  const bodyRef                             = useRef<HTMLDivElement>(null);

  // Sync keyword prop changes (e.g. from parent switching cards)
  useEffect(() => {
    setCurrentKeyword(keyword);
    setHistory([]);
  }, [keyword]);

  useEffect(() => {
    setRaw("");
    setLoading(true);

    const prompt = buildConceptQuickPrompt(currentKeyword, cardTitle);

    streamText(
      prompt,
      (chunk) => {
        setRaw(prev => prev + chunk);
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      },
      () => setLoading(false),
      { model: "deepseek-v4-flash", maxTokens: 2048 },
    ).catch(() => {
      setRaw("加载失败，请重试。");
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKeyword, retry]);

  const handleKeywordClick = (word: string) => {
    if (word === currentKeyword) return;
    setHistory(prev => [...prev, currentKeyword]);
    setCurrentKeyword(word);
  };

  const handleBackClick = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(prevHist => prevHist.slice(0, -1));
      setCurrentKeyword(prev);
    } else if (onBack) {
      onBack();
    }
  };

  const allSections = parseSections(raw);

  // 已经在 prompt 里删除「延伸三级知识点」/「知识关联」模块（蓝色链接直接承载下钻能力，
  // 不需要单独模块）。这里再做一层防御：万一某次 AI 没遵守新版 prompt 还输出了这俩模块，
  // 直接在渲染端丢弃，不要再让它出现在二级页里。
  const DEPRECATED_SECTIONS = new Set(["延伸三级知识点", "知识关联"]);

  // Filter out the quiz section so it renders as a special InteractiveQuiz component instead of raw text
  const standardSections = allSections.filter(
    s => s.title !== "互动自测" && !DEPRECATED_SECTIONS.has(s.title)
  );
  const quizSection = allSections.find(s => s.title === "互动自测");

  // Find the last WHOLE-LINE 【...】 in raw to derive the in-progress section
  const streamingSection = (() => {
    const lineMatch = [...raw.matchAll(/^【([^】]+)】$/gm)].at(-1);
    if (!lineMatch) return null;
    const title = lineMatch[1];
    if (DEPRECATED_SECTIONS.has(title)) return null;
    const afterHeader = raw.slice(lineMatch.index! + lineMatch[0].length).trim();
    const already = allSections.some(s => s.title === title);
    if (already || !afterHeader) return null;
    return { title, content: afterHeader };
  })();

  const isStreamingQuiz = streamingSection && streamingSection.title === "互动自测";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Back header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "14px 20px 12px", flexShrink: 0,
        borderBottom: "1px solid #F0F2F5",
      }}>
        {(history.length > 0 || onBack) && (
          <>
            <button
              onClick={handleBackClick}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                color: "#4D5CFF", fontSize: 13, fontWeight: 600,
                background: "none", border: "none", cursor: "pointer", padding: "4px 8px 4px 0",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {history.length > 0 ? "上一步" : "返回"}
            </button>
            <span style={{ width: 1, height: 14, background: "#E0E0E0" }} />
          </>
        )}
        <span style={{
          fontSize: 13, color: "#020418", fontWeight: 700,
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {currentKeyword}
        </span>
        {loading && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#4D5CFF",
            animation: "concept-blink 1s ease-in-out infinite",
            flexShrink: 0,
          }} />
        )}
      </div>

      {/* Scrollable body */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px 32px", minHeight: 0 }}>
        {standardSections.length === 0 && !streamingSection && !loading && (
          <p style={{ fontSize: 13, color: "#B0B5C0", textAlign: "center", marginTop: 48 }}>加载失败，请重试。</p>
        )}

        {standardSections.length === 0 && loading && (
          <p style={{ fontSize: 13, color: "#B0B5C0", textAlign: "center", marginTop: 48 }}>AI 正在解析中...</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Fully streamed standard sections */}
          {standardSections.map((sec, i) => {
            const meta = sectionMeta(sec.title);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ModuleBadge label={sec.title} {...meta} />
                <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 12, padding: "12px 14px" }}>
                  <SectionBody text={sec.content} onConceptClick={handleKeywordClick} />
                </div>
              </div>
            );
          })}

          {/* Currently streaming section (only if it is a standard text section) */}
          {streamingSection && !isStreamingQuiz && (() => {
            const meta = sectionMeta(streamingSection.title);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.85 }}>
                <ModuleBadge label={streamingSection.title} {...meta} />
                <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 12, padding: "12px 14px" }}>
                  <SectionBody text={streamingSection.content} onConceptClick={handleKeywordClick} />
                  {loading && (
                    <span style={{ display: "inline-block", width: 5, height: 14, borderRadius: 2, background: "#4D5CFF", marginLeft: 2, animation: "concept-blink 0.8s steps(1) infinite" }} />
                  )}
                </div>
              </div>
            );
          })()}

          {/* Interactive self-test Quiz (fully streamed or currently streaming) */}
          {(quizSection || isStreamingQuiz) && (
            <InteractiveQuiz
              rawText={quizSection ? quizSection.content : (streamingSection ? streamingSection.content : "")}
              loading={loading}
            />
          )}
        </div>

        {/* Regenerate */}
        {!loading && raw && (
          <button
            onClick={() => setRetry(c => c + 1)}
            style={{
              marginTop: 20, display: "flex", alignItems: "center", gap: 6,
              color: "#4D5CFF", fontSize: 12, background: "none", border: "none",
              cursor: "pointer", padding: "4px 0",
            }}
          >
            <RefreshCw size={11} /> 重新生成该自测与解析
          </button>
        )}
      </div>

      <style>{`
        @keyframes concept-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes concept-spin { to { transform: rotate(360deg); } }
        @keyframes concept-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
