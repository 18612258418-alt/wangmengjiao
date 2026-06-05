import type { CardData } from "../../types";
import { SourceIcon, sourceLabel } from "../../shared/SourceIcon";

export function MemoryCard({ card, onOpen, isNew }: { card: CardData; onOpen: (card: CardData) => void; isNew?: boolean }) {
  const summary = card.overview || card.detailIntro || card.aiKeyPoints?.join(" · ") || "点击查看 AI 总结、知识脉络和交互演示。";
  return (
    <div
      className="bg-white rounded-2xl flex flex-col overflow-hidden cursor-pointer hover:shadow-md transition-all duration-500 flex-1 min-w-0"
      style={{
        border: isNew ? "2px solid #4D5CFF" : "1px solid #EAEDF2",
        boxShadow: isNew ? "0 0 0 4px rgba(77,92,255,0.12)" : undefined,
        animation: isNew ? "card-appear 0.5s cubic-bezier(0.4,0,0.2,1)" : undefined,
      }}
      onClick={() => onOpen(card)}
    >
      <div className="px-3.5 pt-3.5 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-[54px] h-[42px] rounded-lg overflow-hidden bg-[#F0F2F5] flex-shrink-0">
            <img src={card.img} alt={card.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <p className="text-[13px] text-[#020418] leading-5 line-clamp-2 min-w-0" style={{ fontWeight: 700 }}>{card.title}</p>
        </div>
      </div>
      <div className="px-3.5 pb-3 flex-1">
        <p className="text-[12px] text-[#6B7280] leading-5 line-clamp-3">{summary}</p>
      </div>
      <div className="px-3.5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SourceIcon source={card.source} />
          <span className="text-[12px] text-[#7B8291]">{sourceLabel(card.source)}</span>
        </div>
        <span className="text-[12px] text-[#7B8291]">{card.time}</span>
      </div>
    </div>
  );
}
