import { useMemo, useState } from "react";
import { GitBranch, Lightbulb, ListChecks, BookOpen, X, StickyNote, Eye, EyeOff } from "lucide-react";
import type { CardData, ExamKnowledgeGraph, ExamKnowledgePoint, ExamReferenceQuestion, FeedGroup } from "../types";
import { MathContent } from "../../../shared/MathContent";
import { getRelatedNotesForExamPoint } from "../utils/examPointNotes";
import { SourceIcon, sourceLabel } from "../shared/SourceIcon";
import { getPointById } from "../data/examKnowledgeGraphs";
import { isUserExamPointId } from "../data/userExamPoints";
import {
  DIFFICULTY_FILL,
  DIFFICULTY_LABEL,
  DIFFICULTY_RING,
  inferPointDifficulty,
} from "../utils/examGraphStyles";
import { EXAM_PANEL_BODY } from "./examPanelStyles";
import { getPointSummary } from "../utils/examPointSummary";

function difficultyLabel(d?: string) {
  if (d === "basic") return DIFFICULTY_LABEL.basic;
  if (d === "challenge") return DIFFICULTY_LABEL.challenge;
  return DIFFICULTY_LABEL.advanced;
}

function RelationList({
  ids,
  graph,
  variant,
  onSelectPoint,
}: {
  ids: string[];
  graph: ExamKnowledgeGraph;
  variant: "pre" | "post";
  onSelectPoint?: (id: string) => void;
}) {
  if (ids.length === 0) {
    return (
      <p className="text-[12px] text-[#B0B5C0]">无</p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {ids.map(id => {
        const p = getPointById(graph, id);
        const diff = p ? inferPointDifficulty(p) : "advanced";
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelectPoint?.(id)}
              className="w-full text-left text-[12px] px-2.5 py-1.5 rounded-lg border border-[#EAEDF2] bg-[#F8FAFB] text-[#41464F] hover:bg-[#EEF0FF] hover:border-[#D6DBFF] transition-colors"
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle border border-white/50"
                style={{
                  background: DIFFICULTY_FILL[diff],
                  boxShadow: `0 0 0 1px ${DIFFICULTY_RING[diff]}44`,
                }}
              />
              <span
                className="inline-block w-1 h-1 rounded-full mr-1 align-middle"
                style={{ background: variant === "pre" ? "#F97316" : "#4D5CFF" }}
              />
              {p?.label ?? id}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RelatedNoteItem({
  card,
  date,
  onOpen,
}: {
  card: CardData;
  date: string;
  onOpen?: (card: CardData, date: string) => void;
}) {
  const summary = card.overview || card.detailIntro || card.aiKeyPoints?.[0] || "";
  return (
    <button
      type="button"
      onClick={() => onOpen?.(card, date)}
      className="w-full text-left rounded-xl border border-[#EAEDF2] bg-[#F8FAFB] px-2.5 py-2 hover:bg-[#EEF0FF] hover:border-[#D6DBFF] transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="w-10 h-8 rounded-md overflow-hidden bg-[#F0F2F5] flex-shrink-0">
          <img src={card.img} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#020418] leading-5 line-clamp-2" style={{ fontWeight: 600 }}>
            {card.title}
          </p>
          {summary && (
            <p className="text-[11px] text-[#7B8291] mt-0.5 leading-4 line-clamp-1">{summary}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <SourceIcon source={card.source} />
            <span className="text-[10px] text-[#B0B5C0]">{sourceLabel(card.source)} · {card.time}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ReferenceQuestionCard({
  question,
  index,
}: {
  question: ExamReferenceQuestion;
  index: number;
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="rounded-xl border border-[#EAEDF2] bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] text-[#7B8291]">第 {index + 1} 题</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#F97316]"
          style={{ fontWeight: 600 }}
        >
          {difficultyLabel(question.difficulty)}
        </span>
      </div>
      <p className="text-[12px] text-[#020418] leading-5" style={{ fontWeight: 600 }}>
        {question.stem}
      </p>
      {question.hint && (
        <p className="text-[11px] text-[#7B8291] mt-1.5">提示：{question.hint}</p>
      )}

      <button
        type="button"
        onClick={() => setShowAnswer(v => !v)}
        className={`mt-2.5 inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
          showAnswer
            ? "bg-[#EEF0FF] text-[#4D5CFF]"
            : "bg-[#F5F6FA] text-[#41464F] hover:bg-[#EEF0FF] hover:text-[#4D5CFF]"
        }`}
        style={{ fontWeight: 600 }}
      >
        {showAnswer ? <EyeOff size={12} /> : <Eye size={12} />}
        {showAnswer ? "隐藏答案" : "查看答案"}
      </button>

      {showAnswer && (
        <div className="mt-2 rounded-lg bg-[#F8F9FF] border border-[#E4E8FF] px-2.5 py-2">
          <p className="text-[10px] text-[#4D5CFF] mb-1" style={{ fontWeight: 700 }}>
            参考答案 · 思路
          </p>
          <MathContent
            mathMode="explicit"
            text={question.answerOutline}
            className="text-[11px] text-[#41464F] leading-5"
          />
        </div>
      )}
    </div>
  );
}

export function ExamPointDetailPanel({
  graph,
  point,
  variant = "sidebar",
  subjectId,
  subjectShort,
  feedGroups = [],
  onSelectPoint,
  onOpenNote,
  onClose,
}: {
  graph: ExamKnowledgeGraph;
  point: ExamKnowledgePoint | null;
  variant?: "sidebar" | "overlay";
  subjectId?: string;
  subjectShort?: string;
  feedGroups?: FeedGroup[];
  onSelectPoint?: (id: string) => void;
  onOpenNote?: (card: CardData, date: string) => void;
  onClose?: () => void;
}) {
  const relatedNotes = useMemo(
    () => point && subjectId && subjectShort
      ? getRelatedNotesForExamPoint(subjectId, subjectShort, point, feedGroups)
      : [],
    [subjectId, subjectShort, point, feedGroups],
  );

  if (!point) {
    if (variant === "overlay") return null;
    return (
      <div className={`${EXAM_PANEL_BODY} flex flex-col items-center justify-center px-6 text-center`}>
        <div className="w-12 h-12 rounded-xl bg-[#EEF0FF] flex items-center justify-center mb-3">
          <BookOpen size={22} className="text-[#4D5CFF]" strokeWidth={2} />
        </div>
        <p className="text-[14px] text-[#41464F] font-semibold">选择考点</p>
        <p className="text-[12px] text-[#7B8291] mt-2 leading-5">
          点击图谱圆球，在此查看先修后修、考试要点与参考题
        </p>
      </div>
    );
  }

  const pointDifficulty = inferPointDifficulty(point);
  const summary = getPointSummary(point);
  const shellClass = variant === "overlay"
    ? "flex flex-col min-h-0 h-full overflow-hidden"
    : `${EXAM_PANEL_BODY} px-5 py-4`;

  return (
    <div className={shellClass}>
      <div className={`mb-4 ${variant === "overlay" ? "flex-shrink-0 px-4 pt-4 pb-0" : ""}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EEF0FF] text-[#4D5CFF]" style={{ fontWeight: 600 }}>
            {point.chapter}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
            style={{ fontWeight: 600, background: `${DIFFICULTY_FILL[pointDifficulty]}22`, color: DIFFICULTY_RING[pointDifficulty] }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: DIFFICULTY_FILL[pointDifficulty] }}
            />
            {DIFFICULTY_LABEL[pointDifficulty]}
          </span>
          {isUserExamPointId(point.id) && (
            <span
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]"
              style={{ fontWeight: 600 }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: "#16A34A" }} />
              由你的笔记扩展
            </span>
          )}
        </div>
        <h2 className="text-[16px] text-[#020418] mt-2" style={{ fontWeight: 700 }}>
          {point.label}
        </h2>
        <p className="text-[12px] text-[#7B8291] mt-1.5 leading-5">
          {summary}
        </p>
          </div>
          {variant === "overlay" && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex-shrink-0 rounded-lg bg-[#F5F6FA] hover:bg-[#EAEDF2] flex items-center justify-center text-[#41464F]"
              title="关闭"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={variant === "overlay" ? `${EXAM_PANEL_BODY} px-4 pb-4` : ""}>
      <section className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <StickyNote size={14} className="text-[#4D5CFF]" />
          <h3 className="text-[13px] text-[#41464F]" style={{ fontWeight: 700 }}>
            相关笔记{relatedNotes.length > 0 ? `（${relatedNotes.length}）` : ""}
          </h3>
        </div>
        {relatedNotes.length === 0 ? (
          <p className="text-[12px] text-[#B0B5C0] leading-5">
            暂无关联笔记，可在笔记 Tab 补充该考点内容后自动挂靠
          </p>
        ) : (
          <ul className="space-y-2">
            {relatedNotes.map(({ card, date }) => (
              <li key={card.id}>
                <RelatedNoteItem card={card} date={date} onOpen={onOpenNote} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch size={14} className="text-[#F97316]" />
          <h3 className="text-[13px] text-[#41464F]" style={{ fontWeight: 700 }}>先修关系</h3>
        </div>
        <RelationList ids={point.prerequisites} graph={graph} variant="pre" onSelectPoint={onSelectPoint} />
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch size={14} className="text-[#4D5CFF]" style={{ transform: "scaleX(-1)" }} />
          <h3 className="text-[13px] text-[#41464F]" style={{ fontWeight: 700 }}>后修关系</h3>
        </div>
        <RelationList ids={point.postrequisites} graph={graph} variant="post" onSelectPoint={onSelectPoint} />
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <ListChecks size={14} className="text-[#4D5CFF]" />
          <h3 className="text-[13px] text-[#41464F]" style={{ fontWeight: 700 }}>考试要点</h3>
        </div>
        <ul className="space-y-1.5">
          {point.examPoints.map((item, i) => (
            <li key={i} className="text-[12px] text-[#41464F] leading-5 flex gap-2">
              <span className="text-[#4D5CFF] flex-shrink-0">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb size={14} className="text-[#F59E0B]" />
          <h3 className="text-[13px] text-[#41464F]" style={{ fontWeight: 700 }}>作答思路</h3>
        </div>
        <ol className="space-y-2 list-decimal list-inside">
          {point.answerStrategy.map((item, i) => (
            <li key={i} className="text-[12px] text-[#41464F] leading-5 pl-0.5">
              {item}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="text-[13px] text-[#41464F] mb-2" style={{ fontWeight: 700 }}>
          参考题（{point.referenceQuestions.length}）
        </h3>
        <div className="space-y-3">
          {point.referenceQuestions.map((q, i) => (
            <ReferenceQuestionCard key={i} question={q} index={i} />
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
