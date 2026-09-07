import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { getSubjectSyllabus, type SyllabusNode } from "../../data/subjectSyllabi";
import { RECENT_NOTES_ENTRY_ID } from "../../utils/cardSurfaces";
import {
  cardsForSyllabusEntry,
  collectNoteCards,
  syllabusEntryHasCards,
  syllabusEntryHasUnread,
} from "../../utils/syllabusNotes";
import { dedupeCardsBySourceAnchor } from "../../utils/memoryRecall";
import { isNoteCard } from "../../utils/feedFilters";
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

function formatTimelineDate(date: string) {
  if (!/^\d{8}$/.test(date)) return date;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(4, 6));
  const day = Number(date.slice(6, 8));
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(year, month - 1, day));
  return `${month}月${day}日 · ${weekday}`;
}

function dailyReviewSummary(cards: Array<{ card: CardData }>) {
  const titles = [...new Set(cards.map(({ card }) => card.title.replace(/^(记忆|笔记)[：:]\s*/, "")).filter(Boolean))];
  if (titles.length === 0) return "0 个知识点";
  const preview = titles.slice(0, 3).join("、");
  return `${titles.length} 个知识点：${preview}${titles.length > 3 ? "等" : ""}`;
}

export function SyllabusNotesView({
  subject,
  feedGroups,
  onOpenCard,
  onOpenEntry,
  newCardId,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onOpenCard: (card: CardData, date: string) => void;
  onOpenEntry?: (entryId: string) => void;
  newCardId: string | null;
}) {
  const syllabus = getSubjectSyllabus(subject.id);
  const noteCount = useMemo(() => collectNoteCards(feedGroups).length, [feedGroups]);

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"recent" | "outline">("recent");

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
    return sources.size;
  }, [selectedCards]);

  const selectedTitle = useMemo(() => {
    if (!selectedEntryId || selectedEntryId === RECENT_NOTES_ENTRY_ID) return null;
    return syllabus?.nodes.find(n => n.id === selectedEntryId)?.title ?? null;
  }, [selectedEntryId, syllabus]);

  const recentCards = useMemo(() => {
    const cards = feedGroups.flatMap(group => group.cards
      .filter(isNoteCard)
      .map(card => ({ card, date: group.date })));
    return dedupeCardsBySourceAnchor(cards).sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date);
      return dateOrder || (b.card.time ?? "").localeCompare(a.card.time ?? "");
    });
  }, [feedGroups]);

  const dateGroups = useMemo(() => {
    const grouped = new Map<string, typeof recentCards>();
    recentCards.forEach(item => grouped.set(item.date, [...(grouped.get(item.date) ?? []), item]));
    return [...grouped.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, cards]) => ({ date, cards }));
  }, [recentCards]);

  if (!syllabus) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-[14px] text-[#B0B5C0]">{subject.short}暂无教学大纲配置</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#F5F6FA]">
      <div className="flex shrink-0 items-center gap-3 px-6 py-3">
        <div>
          {viewMode === "recent" ? <h3 className="text-[13px] font-bold text-[#202431]">共 {recentCards.length} 条笔记</h3> : <><h3 className="text-[13px] font-bold text-[#202431]">{syllabus.overviewTitle}</h3><p className="mt-1 text-[10px] text-[#969DAA]">按课程主题整理 · 共 {noteCount} 条笔记</p></>}
        </div>
        <div className="flex rounded-full bg-[#E9EBF0]/70 p-0.5">
          <button onClick={() => setViewMode("recent")} className={`rounded-full px-2.5 py-1 text-[8px] font-medium transition ${viewMode === "recent" ? "bg-white text-[#6671C9]" : "text-[#969DAA]"}`}>按时间</button>
          <button onClick={() => setViewMode("outline")} className={`rounded-full px-2.5 py-1 text-[8px] font-medium transition ${viewMode === "outline" ? "bg-white text-[#6671C9]" : "text-[#969DAA]"}`}>按大纲</button>
        </div>
      </div>

      {viewMode === "recent" ? <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-2">
        <div className="space-y-8">
          {dateGroups.map(group => <section key={group.date}>
            <div className="mb-3">
              <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#4D5CFF]"/><h3 className="text-[14px] font-bold text-[#202431]">{formatTimelineDate(group.date)}</h3><span className="text-[10px] text-[#969DAA]">{group.cards.length} 条笔记</span></div>
              <p className="ml-[22px] mt-1.5 text-[10px] leading-5 text-[#7F8796]">{dailyReviewSummary(group.cards)}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.cards.map(({ card, date }) => <MemoryCard key={card.id} card={card} onOpen={c => onOpenCard(c, date)} isNew={card.id === newCardId}/>)}
            </div>
          </section>)}
        </div>
      </div> : <div className="flex flex-1 min-h-0 overflow-hidden">
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
          <div className="shrink-0 px-6 pb-2 pt-3">
            {selectedEntryId && selectedCards.length > 0 && selectedTitle ? <><p className="text-[13px] font-bold text-[#202431]">{selectedTitle}</p><p className="mt-1 text-[10px] text-[#969DAA]">{selectedCards.length} 条笔记 · {selectedSourceCount} 份来源资料</p></> : <p className="text-[10px] text-[#969DAA]">选择左侧课程主题查看笔记</p>}
          </div>
          {selectedEntryId && selectedCards.length > 0 ? (
            <div className="flex-1 overflow-y-auto px-6 pt-3 pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
      </div>}
    </div>
  );
}
