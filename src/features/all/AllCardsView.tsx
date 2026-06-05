import { useState, useMemo } from "react";
import type { CardData, FeedGroup } from "../../types";
import { MemoryCard } from "../feed/MemoryCard";
import { getSkillMeta } from "../../utils/cardDetailParsing";

const SKILL_TYPES = [
  { id: "theory_concept",  label: "理论概念" },
  { id: "math_problem",    label: "数学解题" },
  { id: "language",        label: "外语学习" },
  { id: "experiment_lab",  label: "实验研究" },
  { id: "code_cs",         label: "代码算法" },
  { id: "literature_essay",label: "文献论述" },
] as const;

export function AllCardsView({
  allFeedGroups,
  subjects,
  onOpenCard,
  newCardId,
}: {
  allFeedGroups: Record<string, FeedGroup[]>;
  subjects: { id: string; short: string }[];
  onOpenCard: (card: CardData, date: string, subjectId: string) => void;
  newCardId: string | null;
}) {
  const [selectedSkillTags, setSelectedSkillTags] = useState<Set<string>>(new Set());
  const [selectedContentTags, setSelectedContentTags] = useState<Set<string>>(new Set());
  const [showMoreTags, setShowMoreTags] = useState(false);

  // Flatten all cards, preserving subjectId + date
  const allCards = useMemo(() => {
    const result: { card: CardData; subjectId: string; date: string }[] = [];
    for (const [subjectId, groups] of Object.entries(allFeedGroups)) {
      for (const group of groups) {
        for (const card of group.cards) {
          result.push({ card, subjectId, date: group.date });
        }
      }
    }
    // Sort newest first (date desc, then time desc)
    result.sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      return (b.card.time ?? "").localeCompare(a.card.time ?? "");
    });
    return result;
  }, [allFeedGroups]);

  // Content tags: aiKeyPoints with frequency >= 2, capped at 30
  const contentTags = useMemo(() => {
    const freq = new Map<string, number>();
    allCards.forEach(({ card }) =>
      card.aiKeyPoints?.forEach(kp => freq.set(kp, (freq.get(kp) ?? 0) + 1))
    );
    return [...freq.entries()]
      .filter(([, f]) => f >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag]) => tag);
  }, [allCards]);

  // Skill types actually present in current cards
  const presentSkillTypes = useMemo(() => {
    const present = new Set(allCards.map(({ card }) => card.skill ?? "theory_concept"));
    return SKILL_TYPES.filter(s => present.has(s.id));
  }, [allCards]);

  // Apply tag filters (AND logic)
  const filteredCards = useMemo(() => {
    return allCards.filter(({ card }) => {
      if (selectedSkillTags.size > 0 && !selectedSkillTags.has(card.skill ?? "theory_concept"))
        return false;
      if (selectedContentTags.size > 0) {
        const cardTags = new Set(card.aiKeyPoints ?? []);
        for (const t of selectedContentTags) {
          if (!cardTags.has(t)) return false;
        }
      }
      return true;
    });
  }, [allCards, selectedSkillTags, selectedContentTags]);

  const toggleSkill = (id: string) => {
    setSelectedSkillTags(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleContent = (tag: string) => {
    setSelectedContentTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };
  const clearAll = () => {
    setSelectedSkillTags(new Set());
    setSelectedContentTags(new Set());
  };

  const hasActiveTags = selectedSkillTags.size > 0 || selectedContentTags.size > 0;
  const VISIBLE_CONTENT_TAGS = showMoreTags ? contentTags : contentTags.slice(0, 12);

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F6FA]">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 bg-[#F5F6FA] flex-shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] text-[#020418]" style={{ fontWeight: 700 }}>全部记忆</h1>
          <span className="text-[13px] text-[#7B8291]">
            {hasActiveTags ? `${filteredCards.length} / ${allCards.length}` : allCards.length} 个知识点
          </span>
        </div>
      </div>

      {/* Tag filter area */}
      <div className="px-6 pb-4 flex-shrink-0 space-y-2">
        {/* Skill tags row */}
        {presentSkillTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presentSkillTypes.map(s => {
              const meta = getSkillMeta(s.id);
              const active = selectedSkillTags.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSkill(s.id)}
                  style={{
                    fontSize: 12, fontWeight: active ? 600 : 500,
                    padding: "4px 10px", borderRadius: 20,
                    border: `1px solid ${active ? meta.barColor : "#E4E7EF"}`,
                    background: active ? meta.bgColor : "#fff",
                    color: active ? meta.textColor : "#7B8291",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {meta.emoji} {s.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content keyword tags row */}
        {contentTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {VISIBLE_CONTENT_TAGS.map(tag => {
              const active = selectedContentTags.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleContent(tag)}
                  style={{
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    padding: "4px 10px", borderRadius: 20,
                    border: `1px solid ${active ? "#4D5CFF" : "#E4E7EF"}`,
                    background: active ? "#EEF0FF" : "#fff",
                    color: active ? "#4D5CFF" : "#7B8291",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {tag}
                </button>
              );
            })}
            {contentTags.length > 12 && (
              <button
                onClick={() => setShowMoreTags(v => !v)}
                style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: "4px 2px" }}
              >
                {showMoreTags ? "收起 ▲" : `+${contentTags.length - 12} 更多 ▼`}
              </button>
            )}
            {hasActiveTags && (
              <button
                onClick={clearAll}
                style={{
                  fontSize: 12, color: "#EF4444", background: "none",
                  border: "1px solid #FECACA", borderRadius: 20,
                  cursor: "pointer", padding: "4px 10px", lineHeight: 1.4,
                }}
              >
                ✕ 清除
              </button>
            )}
          </div>
        )}

        {contentTags.length === 0 && presentSkillTypes.length === 0 && (
          <p className="text-[12px] text-[#B0B5C0]">上传更多记忆后，这里会自动生成标签</p>
        )}
      </div>

      <div className="mx-6 border-t border-[#EAEDF2] flex-shrink-0" />

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-[14px] text-[#B0B5C0]">没有符合筛选条件的记忆</p>
            <button
              onClick={clearAll}
              style={{ fontSize: 13, color: "#4D5CFF", background: "none", border: "none", cursor: "pointer" }}
            >
              清除全部筛选
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredCards.map(({ card, subjectId, date }) => (
              <MemoryCard
                key={card.id}
                card={card}
                onOpen={(c) => onOpenCard(c, date, subjectId)}
                isNew={card.id === newCardId}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
