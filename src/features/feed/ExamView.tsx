import { useEffect, useMemo, useState } from "react";
import { FileQuestion } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { filterFeedGroupsByContentType, formatFeedDateKey } from "../../utils/feedFilters";
import { getExamSummary } from "../../utils/cardTasks";
import { mergeExamPrepIntoCard } from "../../data/examPrepContent";
import { ExamPrepPanel } from "../exam/ExamPrepPanel";
import { ExamMemoryCard } from "./ExamMemoryCard";
import { masteryUpdatePayload } from "../../utils/ebbinghausSchedule";

export function ExamView({
  subject,
  feedGroups,
  onUpdateCard,
  newCardId,
  focusSelectKey,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onUpdateCard: (cardId: string, date: string, updates: Partial<CardData>) => void;
  newCardId?: string | null;
  /** 从复习计划弹窗跳转时预选题目 `${date}:${cardId}` */
  focusSelectKey?: string | null;
}) {
  const examGroups = useMemo(() => {
    const groups = filterFeedGroupsByContentType(feedGroups, "exam");
    return groups.map(g => ({
      ...g,
      cards: g.cards.map(mergeExamPrepIntoCard),
    }));
  }, [feedGroups]);

  const flatCards = useMemo(
    () =>
      examGroups.flatMap(g =>
        g.cards.map(card => ({ card, date: g.date })),
      ),
    [examGroups],
  );

  const totalCount = flatCards.length;
  const first = flatCards[0] ?? null;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedKey) return first;
    return flatCards.find(({ card, date }) => `${date}:${card.id}` === selectedKey) ?? first;
  }, [flatCards, selectedKey, first]);

  useEffect(() => {
    if (first) {
      setSelectedKey(`${first.date}:${first.card.id}`);
    } else {
      setSelectedKey(null);
    }
  }, [subject.id, first?.card.id, first?.date]);

  useEffect(() => {
    if (focusSelectKey) setSelectedKey(focusSelectKey);
  }, [focusSelectKey]);

  const handleMasteryChange = (status: "mastered" | "review") => {
    if (!selected) return;
    onUpdateCard(
      selected.card.id,
      selected.date,
      masteryUpdatePayload(status, selected.card),
    );
  };

  if (totalCount === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="flex flex-col items-center justify-center h-72 gap-3">
          <div className="w-14 h-14 rounded-full bg-[#FFF4E6] flex items-center justify-center">
            <FileQuestion size={24} className="text-[#E67E22]" />
          </div>
          <p className="text-[14px] text-[#7B8291]">{subject.short}学科暂无备考/习题记录</p>
          <p className="text-[12px] text-[#B0B5C0] text-center max-w-xs">
            上传试卷、习题册或含多道题目的练习页后，AI 会归入备考模块并按天展示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#F5F6FA]">
      <div
        className="flex-shrink-0 flex flex-col min-h-0 border-r border-[#EAEDF2]/60"
        style={{ width: "clamp(280px, 38%, 420px)" }}
      >
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <p className="text-[13px] text-[#7B8291]">
            共 {totalCount} 道题目 · 点击卡片查看解析与配套练习
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-8">
          {examGroups.map(group => (
            <section key={group.date} className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-[15px] text-[#41464F]" style={{ fontWeight: 700 }}>
                  {formatFeedDateKey(group.date)}
                </p>
                <span className="text-[12px] text-[#7B8291]">{group.cards.length} 道</span>
              </div>
              <div className="space-y-3">
                {group.cards.map(card => {
                  const key = `${group.date}:${card.id}`;
                  const active = selected && `${selected.date}:${selected.card.id}` === key;
                  return (
                    <div key={card.id} className="space-y-1.5">
                      <p className={`text-[12px] px-0.5 line-clamp-2 min-h-[2rem] ${active ? "text-[#E67E22]" : "text-[#7B8291]"}`}>
                        {getExamSummary(card)}
                      </p>
                      <div
                        className={active ? "ring-2 ring-[#E67E22]/40 rounded-2xl" : ""}
                      >
                        <ExamMemoryCard
                          card={card}
                          onOpen={c => setSelectedKey(`${group.date}:${c.id}`)}
                          isNew={card.id === newCardId}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {selected ? (
        <ExamPrepPanel
          key={`${selected.date}-${selected.card.id}-${selected.card.examMasteryStatus ?? ""}`}
          card={selected.card}
          onMasteryChange={handleMasteryChange}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[14px] text-[#B0B5C0]">
          请选择左侧题目
        </div>
      )}
    </div>
  );
}
