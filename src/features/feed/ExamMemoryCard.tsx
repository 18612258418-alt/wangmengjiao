import type { CardData, ExamMasteryStatus } from "../../types";
import { MemoryCard } from "./MemoryCard";

const MASTERY_STYLE: Record<
  ExamMasteryStatus,
  { label: string; bg: string; color: string }
> = {
  mastered: { label: "已掌握", bg: "#ECFDF5", color: "#059669" },
  review: { label: "待复习", bg: "#FFF7ED", color: "#EA580C" },
};

export function ExamMemoryCard({
  card,
  onOpen,
  isNew,
}: {
  card: CardData;
  onOpen: (card: CardData) => void;
  isNew?: boolean;
}) {
  const status = card.examMasteryStatus;
  const badge = status ? MASTERY_STYLE[status] : null;

  return (
    <div className="relative">
      {badge && (
        <span
          className="absolute top-2 right-2 z-10 text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: badge.bg, color: badge.color, fontWeight: 700 }}
        >
          {badge.label}
        </span>
      )}
      <MemoryCard card={card} onOpen={onOpen} isNew={isNew} />
    </div>
  );
}
