import type { CardData } from "../../types";
import { FileText } from "lucide-react";
import { SourceIcon, sourceLabel } from "../../shared/SourceIcon";

const DEMO_SOURCE_REFERENCES: Array<[RegExp, string]> = [
  [/社会比较|冲动消费/, "《社会比较与青年消费研究报告》 · 第 2—4 页"],
  [/净出口|国民财富/, "Macro Core: Measuring National Wealth · 原文"],
  [/换元|定积分/, "《高等数学总复习用典型题目》 · 第 1 页"],
  [/数列|通项/, "《高等数学总复习用典型题目》 · 第 2—3 页"],
  [/误差|实验操作/, "《物理实验操作与安全手册》 · 第 24—27 页"],
  [/听力|学术英语/, "Academic Listening Skills · 08:42—11:24"],
];

function sourceReference(card: CardData) {
  const sourceName = card.sourceAnchor?.fileName || card.sourceDocument?.title;
  const page = card.sourceAnchor?.page || card.sourceDocument?.page;
  if (sourceName) return `${sourceName}${page ? ` · 第 ${page} 页` : " · 原文"}`;
  return DEMO_SOURCE_REFERENCES.find(([pattern]) => pattern.test(card.title))?.[1] || `${sourceLabel(card.source)} · 原始记录`;
}

export function MemoryCard({ card, onOpen, isNew }: { card: CardData; onOpen: (card: CardData) => void; isNew?: boolean }) {
  const summary = card.overview || card.detailIntro || card.aiKeyPoints?.join(" · ") || "打开笔记查看内容和原始依据。";
  const provenance = card.id.startsWith("new_") ? "你添加的" : card.hasAnnotations ? "你记录的" : "示例笔记";
  const displayTitle = card.title.replace(/^记忆[:：]\s*/, "");
  const contentLabel = card.contentType === "homework" ? "作业" : "笔记";
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
            <img src={card.img} alt={displayTitle} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${contentLabel === "作业" ? "bg-[#FFF2E2] text-[#B66A0A]" : "bg-[#EEF0FF] text-[#4D5CFF]"}`}>{contentLabel}</span>
              <span className="text-[9px] text-[#969CAA]">{provenance}</span>
            </div>
            <p className="text-[13px] text-[#020418] leading-5 line-clamp-2 min-w-0" style={{ fontWeight: 700 }}>{displayTitle}</p>
          </div>
        </div>
      </div>
      <div className="px-3.5 pb-3 flex-1">
        <p className="text-[12px] text-[#6B7280] leading-5 line-clamp-3">{summary}</p>
      </div>
      <div className="mx-3.5 mb-2 flex items-center gap-2 rounded-xl bg-[#F6F7FA] px-2.5 py-2 text-[10px] text-[#626977]">
        <FileText size={12} className="flex-shrink-0 text-[#4D5CFF]" />
        <span className="min-w-0 flex-1 truncate">来源：{sourceReference(card)}</span>
        <span className="flex-shrink-0 font-semibold text-[#4D5CFF]">查看原文</span>
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
