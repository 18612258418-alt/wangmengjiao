import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Link2 } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { getSubjectSyllabus, type SyllabusNode } from "../../data/subjectSyllabi";
import { RECENT_NOTES_ENTRY_ID } from "../../utils/cardSurfaces";
import {
  cardsForSyllabusEntry,
  collectNoteCards,
  countSyllabusEntriesWithCards,
  syllabusEntryHasCards,
  syllabusEntryHasUnread,
} from "../../utils/syllabusNotes";
import { dedupeCardsBySourceAnchor } from "../../utils/memoryRecall";
import { MemoryCard } from "./MemoryCard";

function firstTopicWithCards(
  nodes: SyllabusNode[],
  feedGroups: FeedGroup[],
): string | null {
  for (const node of nodes) {
    if (node.kind === "topic" && syllabusEntryHasCards(feedGroups, node.id)) {
      return node.id;
    }
  }
  return null;
}

export function SyllabusNotesView({
  subject,
  feedGroups,
  onOpenCard,
  onOpenEntry,
  onOpenLinkedPdf,
  newCardId,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onOpenCard: (card: CardData, date: string) => void;
  onOpenEntry?: (entryId: string) => void;
  onOpenLinkedPdf?: () => void;
  newCardId: string | null;
}) {
  const syllabus = getSubjectSyllabus(subject.id);
  const topicIds = useMemo(
    () => syllabus?.nodes.filter(n => n.kind === "topic").map(n => n.id) ?? [],
    [syllabus],
  );
  const litCount = useMemo(
    () => countSyllabusEntriesWithCards(feedGroups, topicIds),
    [feedGroups, topicIds],
  );
  const noteCount = useMemo(() => collectNoteCards(feedGroups).length, [feedGroups]);
  const hasLinkedPdf = subject.id === "other";

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!syllabus) {
      setSelectedEntryId(null);
      return;
    }
    setSelectedEntryId(prev => {
      if (prev && prev !== RECENT_NOTES_ENTRY_ID && syllabusEntryHasCards(feedGroups, prev)) {
        return prev;
      }
      return firstTopicWithCards(syllabus.nodes, feedGroups);
    });
  }, [subject.id, syllabus, feedGroups]);

  const selectedCards = useMemo(
    () => dedupeCardsBySourceAnchor(
      selectedEntryId ? cardsForSyllabusEntry(feedGroups, selectedEntryId) : [],
    ),
    [feedGroups, selectedEntryId],
  );

  const selectedSourceCount = useMemo(() => {
    const sources = new Set(selectedCards.map(({ card }) => (
      card.sourceAnchor?.fileName || card.sourceDocument?.title || card.source
    )));
    return sources.size + (hasLinkedPdf ? 1 : 0);
  }, [selectedCards, hasLinkedPdf]);

  const selectedTitle = useMemo(() => {
    if (!selectedEntryId || selectedEntryId === RECENT_NOTES_ENTRY_ID) return null;
    return syllabus?.nodes.find(n => n.id === selectedEntryId)?.title ?? null;
  }, [selectedEntryId, syllabus]);

  if (!syllabus) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-[14px] text-[#B0B5C0]">{subject.short}暂无教学大纲配置</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#F5F6FA]">
      <div className="flex flex-shrink-0">
        <div
          className="flex-shrink-0 px-6 pt-3 pb-3 border-r border-[#EAEDF2]/80"
          style={{ width: "clamp(220px, 26%, 300px)" }}
        >
          <h3 className="text-[13px] text-[#020418] leading-snug" style={{ fontWeight: 700 }}>
            {syllabus.overviewTitle}
          </h3>
          <p className="text-[11px] text-[#9CA3AF] leading-snug mt-1">
            已学习 {litCount}/{topicIds.length} 个主题 · 共 {noteCount + (hasLinkedPdf ? 1 : 0)} 条笔记
          </p>
        </div>
        <div className="flex-1 min-w-0 px-6 pt-3 pb-3">
          {selectedEntryId && selectedCards.length > 0 && selectedTitle ? (
            <>
              <p className="text-[13px] text-[#020418] leading-snug" style={{ fontWeight: 700 }}>
                {selectedTitle}
              </p>
              <p className="text-[11px] text-[#9CA3AF] leading-snug mt-1">
                {selectedCards.length + (hasLinkedPdf ? 1 : 0)} 条相关笔记 · {selectedSourceCount} 份来源资料
              </p>
            </>
          ) : (
            <p className="text-[11px] text-[#9CA3AF] leading-snug">
              请从左侧大纲选择已点亮的条目
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside
          className="flex-shrink-0 flex flex-col bg-transparent border-r border-[#EAEDF2]/80"
          style={{ width: "clamp(220px, 26%, 300px)" }}
        >
          <nav className="flex-1 overflow-y-auto px-6 pt-3 pb-3 space-y-0.5">
            {syllabus.nodes.map(node => {
              if (node.kind === "chapter") {
                return (
                  <p
                    key={node.id}
                    className="pt-3 pb-1 text-[11px] text-[#9CA3AF] uppercase tracking-wide"
                    style={{ fontWeight: 600 }}
                  >
                    {node.title}
                  </p>
                );
              }

              const lit = syllabusEntryHasCards(feedGroups, node.id);
              const active = selectedEntryId === node.id;
              const hasUnread = lit && syllabusEntryHasUnread(feedGroups, node.id);

              return (
                <button
                  key={node.id}
                  type="button"
                  disabled={!lit}
                  onClick={() => { if (lit) { setSelectedEntryId(node.id); onOpenEntry?.(node.id); } }}
                  className={`w-[calc(100%+1.5rem)] -mx-3 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors min-h-[36px] ${
                    !lit
                      ? "cursor-not-allowed opacity-45"
                      : active
                        ? "bg-[#4D5CFF]/10 text-[#4D5CFF]"
                        : "text-[#41464F] hover:bg-[#020418]/[0.04]"
                  }`}
                >
                  <span
                    className="text-[13px] leading-none flex-1 min-w-0 text-left"
                    style={{ fontWeight: lit ? 600 : 400 }}
                  >
                    {node.title}
                  </span>
                  {hasUnread && (
                    <span
                      className="flex-shrink-0 text-[10px] leading-none text-white rounded-full px-1.5 py-0.5"
                      style={{ background: "#FF5A5F", fontWeight: 700 }}
                    >
                      新
                    </span>
                  )}
                  {lit && (
                    <ChevronRight
                      size={14}
                      className={`flex-shrink-0 ${active ? "text-[#4D5CFF]" : "text-[#C5CAD6]"}`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {(selectedEntryId && selectedCards.length > 0) || hasLinkedPdf ? (
            <div className="flex-1 overflow-y-auto px-6 pt-3 pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {hasLinkedPdf && (
                  <button onClick={onOpenLinkedPdf} className="rounded-2xl border border-[#C9CEFF] bg-gradient-to-br from-[#F4F5FF] to-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#4D5CFF] text-white"><FileText size={17}/></span><div className="min-w-0"><span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-[#4D5CFF]">多页 PDF 笔记</span><h3 className="mt-3 text-[13px] font-bold leading-5">社会比较如何影响冲动消费</h3></div></div>
                    <p className="mt-3 text-[10px] leading-5 text-[#626977]">参考《社会比较与青年消费研究报告》：理论类型与作用路径第 2-4 页；研究设计与变量测量第 6-7 页。</p>
                    <div className="mt-4 flex items-center text-[10px] font-semibold text-[#4D5CFF]"><Link2 size={12} className="mr-1"/>打开原 PDF 并继续批注</div>
                  </button>
                )}
                {selectedCards.map(({ card, date }) => (
                  <MemoryCard
                    key={card.id}
                    card={card}
                    onOpen={c => onOpenCard(c, date)}
                    isNew={card.id === newCardId}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="text-[14px] text-[#7B8291]">
                {selectedEntryId
                  ? "这个主题还没有学习记录"
                  : "从左侧选择一个已经学习的主题"}
              </p>
              <p className="text-[12px] text-[#B0B5C0] max-w-sm">
                课堂记录、笔记和资料会出现在对应主题下；还没开始学习的主题暂时显示为灰色。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
