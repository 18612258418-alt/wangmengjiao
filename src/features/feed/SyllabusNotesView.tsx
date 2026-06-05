import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { getSubjectSyllabus, type SyllabusNode } from "../../data/subjectSyllabi";
import { RECENT_NOTES_ENTRY_ID } from "../../utils/cardSurfaces";
import {
  cardsForSyllabusEntry,
  collectNoteCards,
  collectUnmappedNoteCards,
  countSyllabusEntriesWithCards,
  syllabusEntryHasCards,
} from "../../utils/syllabusNotes";
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
  newCardId,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onOpenCard: (card: CardData, date: string) => void;
  newCardId: string | null;
}) {
  const syllabus = getSubjectSyllabus(subject.id);
  const topicIds = useMemo(
    () => syllabus?.nodes.filter(n => n.kind === "topic").map(n => n.id) ?? [],
    [syllabus],
  );
  const recentCount = useMemo(() => collectUnmappedNoteCards(feedGroups).length, [feedGroups]);
  const litCount = useMemo(
    () => countSyllabusEntriesWithCards(feedGroups, topicIds) + (recentCount > 0 ? 1 : 0),
    [feedGroups, topicIds, recentCount],
  );
  const noteCount = useMemo(() => collectNoteCards(feedGroups).length, [feedGroups]);

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!syllabus) {
      setSelectedEntryId(null);
      return;
    }
    setSelectedEntryId(prev => {
      if (prev && syllabusEntryHasCards(feedGroups, prev)) return prev;
      if (recentCount > 0) return RECENT_NOTES_ENTRY_ID;
      return firstTopicWithCards(syllabus.nodes, feedGroups);
    });
  }, [subject.id, syllabus, feedGroups, recentCount]);

  const selectedCards = useMemo(
    () => (selectedEntryId ? cardsForSyllabusEntry(feedGroups, selectedEntryId) : []),
    [feedGroups, selectedEntryId],
  );

  const selectedTitle = syllabus?.nodes.find(n => n.id === selectedEntryId)?.title;

  if (!syllabus) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-[14px] text-[#B0B5C0]">{subject.short}暂无教学大纲配置</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#F5F6FA]">
      {/* 左侧：教学大纲目录（无白底，融入页面背景） */}
      <aside
        className="flex-shrink-0 flex flex-col bg-transparent"
        style={{ width: "clamp(220px, 26%, 300px)" }}
      >
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-[#4D5CFF]" />
            <h3 className="text-[13px] text-[#020418]" style={{ fontWeight: 700 }}>
              {syllabus.overviewTitle}
            </h3>
          </div>
          <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
            已关联 {litCount}/{topicIds.length} 个条目 · 共 {noteCount} 条记忆
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {recentCount > 0 && (() => {
            const lit = true;
            const active = selectedEntryId === RECENT_NOTES_ENTRY_ID;
            return (
              <button
                key={RECENT_NOTES_ENTRY_ID}
                type="button"
                onClick={() => setSelectedEntryId(RECENT_NOTES_ENTRY_ID)}
                className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors mb-1 ${
                  active
                    ? "bg-[#4D5CFF]/10 text-[#4D5CFF]"
                    : "text-[#41464F] hover:bg-[#020418]/[0.04]"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: active ? "#4D5CFF" : "#34D399",
                    boxShadow: active ? "0 0 0 3px rgba(77,92,255,0.2)" : undefined,
                  }}
                />
                <span className="text-[13px] leading-snug flex-1 min-w-0" style={{ fontWeight: 600 }}>
                  最近上传与批注
                </span>
                <span className="text-[11px] text-[#9CA3AF]">{recentCount}</span>
                {lit && (
                  <ChevronRight
                    size={14}
                    className={`flex-shrink-0 ${active ? "text-[#4D5CFF]" : "text-[#C5CAD6]"}`}
                  />
                )}
              </button>
            );
          })()}
          {syllabus.nodes.map(node => {
            if (node.kind === "chapter") {
              return (
                <p
                  key={node.id}
                  className="px-3 pt-3 pb-1 text-[11px] text-[#9CA3AF] uppercase tracking-wide"
                  style={{ fontWeight: 600 }}
                >
                  {node.title}
                </p>
              );
            }

            const lit = syllabusEntryHasCards(feedGroups, node.id);
            const active = selectedEntryId === node.id;

            return (
              <button
                key={node.id}
                type="button"
                disabled={!lit}
                onClick={() => lit && setSelectedEntryId(node.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors ${
                  !lit
                    ? "cursor-not-allowed opacity-45"
                    : active
                      ? "bg-[#4D5CFF]/10 text-[#4D5CFF]"
                      : "text-[#41464F] hover:bg-[#020418]/[0.04]"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: lit ? (active ? "#4D5CFF" : "#34D399") : "#D1D5DB",
                    boxShadow: lit && active ? "0 0 0 3px rgba(77,92,255,0.2)" : undefined,
                  }}
                />
                <span
                  className="text-[13px] leading-snug flex-1 min-w-0"
                  style={{ fontWeight: lit ? 600 : 400 }}
                >
                  {node.title}
                </span>
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

      {/* 右侧：大纲条目对应的记忆卡片 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedEntryId && selectedCards.length > 0 ? (
          <>
            <div className="px-6 pt-5 pb-3 flex-shrink-0">
              <p className="text-[15px] text-[#020418]" style={{ fontWeight: 700 }}>
                {selectedTitle}
              </p>
              <p className="text-[12px] text-[#7B8291] mt-1">
                {selectedCards.length} 条知识碎片 · 点击卡片查看详情
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-8">
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-[14px] text-[#7B8291]">
              {selectedEntryId
                ? "该条目暂无关联记忆"
                : "请从左侧大纲选择已点亮的条目"}
            </p>
            <p className="text-[12px] text-[#B0B5C0] max-w-sm">
              导入或批注的学习内容会归入对应大纲条目；未关联的条目显示为灰色，暂不可点击。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
