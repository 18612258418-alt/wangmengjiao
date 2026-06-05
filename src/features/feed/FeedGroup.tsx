import type { CardData, FeedGroup } from "../../types";
import { MemoryCard } from "./MemoryCard";
import { getSkillMeta } from "../../utils/cardDetailParsing";

interface DailyPoint {
  label: string;
  skill?: string;
}

function buildDailyPoints(cards: CardData[]): DailyPoint[] {
  const seen = new Set<string>();
  const points: DailyPoint[] = [];
  for (const card of cards) {
    const label = card.title.replace(/^记忆[:：]\s*/, "").trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    points.push({ label, skill: card.skill });
  }
  return points;
}

export function FeedGroup({ group, onOpenCard, newCardId }: {
  group: FeedGroup;
  onOpenCard: (card: CardData, date: string) => void;
  newCardId: string | null;
}) {
  const dailyPoints = buildDailyPoints(group.cards);

  return (
    <div className="space-y-3">
      <div className="flex items-center" style={{ gap: 12 }}>
        <p className="text-[15px] text-[#41464F]" style={{ fontWeight: 700 }}>
          {group.date} {group.label}
        </p>
      </div>

      {dailyPoints.length > 0 && (
        <div className="rounded-2xl bg-white border border-[#EAEDF2] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4D5CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span className="text-[12px] text-[#41464F]" style={{ fontWeight: 700 }}>
              今日学到 {dailyPoints.length} 个知识点
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dailyPoints.map((point, i) => {
              const meta = getSkillMeta(point.skill);
              return (
                <span
                  key={i}
                  className="inline-flex items-center text-[12px] px-2.5 py-1 rounded-full max-w-[260px] truncate"
                  style={{ color: meta.textColor, background: meta.bgColor, fontWeight: 600 }}
                  title={point.label}
                >
                  {point.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 lg:grid-cols-3 gap-3">
        {group.cards.map(card => (
          <MemoryCard key={card.id} card={card} onOpen={(c) => onOpenCard(c, group.date)} isNew={card.id === newCardId} />
        ))}
      </div>

      <style>{`
        @keyframes card-appear {
          0%   { opacity: 0; transform: scale(0.88) translateY(8px); }
          60%  { opacity: 1; transform: scale(1.03) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
