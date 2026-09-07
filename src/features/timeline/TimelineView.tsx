import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { CardData, FeedGroup } from "../../types";
import { MemoryCard } from "../feed/MemoryCard";

export type TimelineRange = "recent" | string;

export type TimelineBucket = {
  id: TimelineRange;
  label: string;
  count: number;
};

type TimelineItem = { card: CardData; date: string; subjectId: string };

function formatDate(date: string) {
  if (!/^\d{8}$/.test(date)) return date;
  const month = Number(date.slice(4, 6));
  const day = Number(date.slice(6, 8));
  const parsed = new Date(Number(date.slice(0, 4)), month - 1, day);
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(parsed);
  return `${month}月${day}日 · ${weekday}`;
}

export function buildTimelineBuckets(allFeedGroups: Record<string, FeedGroup[]>): TimelineBucket[] {
  const counts = new Map<string, number>();
  for (const groups of Object.values(allFeedGroups)) {
    for (const group of groups ?? []) counts.set(group.date, (counts.get(group.date) ?? 0) + group.cards.length);
  }
  const dates = [...counts.keys()].sort((a, b) => b.localeCompare(a));
  const recentCount = dates.slice(0, 3).reduce((sum, date) => sum + (counts.get(date) ?? 0), 0);
  return [
    { id: "recent", label: "最近记录", count: recentCount },
    ...dates.slice(0, 5).map(date => ({ id: date, label: formatDate(date), count: counts.get(date) ?? 0 })),
  ];
}

export function TimelineView({ allFeedGroups, range, onOpenCard, newCardId }: {
  allFeedGroups: Record<string, FeedGroup[]>;
  range: TimelineRange;
  onOpenCard: (card: CardData, date: string, subjectId: string) => void;
  newCardId: string | null;
}) {
  const [contentFilter, setContentFilter] = useState<"all" | "note" | "homework">("all");
  const groups = useMemo(() => {
    const byDate = new Map<string, TimelineItem[]>();
    for (const [subjectId, feedGroups] of Object.entries(allFeedGroups)) {
      for (const group of feedGroups ?? []) {
        const items = byDate.get(group.date) ?? [];
        for (const card of group.cards) {
          if (contentFilter === "note" && card.contentType === "homework") continue;
          if (contentFilter === "homework" && card.contentType !== "homework") continue;
          if (!items.some(item => item.card.id === card.id)) items.push({ card, date: group.date, subjectId });
        }
        byDate.set(group.date, items);
      }
    }
    const sortedDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
    const visibleDates = range === "recent" ? sortedDates.slice(0, 3) : sortedDates.filter(date => date === range);
    return visibleDates.map(date => ({ date, items: byDate.get(date) ?? [] })).filter(group => group.items.length > 0);
  }, [allFeedGroups, range, contentFilter]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return <div className="flex h-full min-h-0 flex-1 flex-col bg-[#F5F6FA]">
    <header className="flex shrink-0 items-end justify-between px-7 pb-4 pt-7">
      <div>
        <h1 className="text-[24px] font-bold text-[#171A24]">{range === "recent" ? "最近记录" : formatDate(range)}</h1>
        <p className="mt-1 text-[11px] text-[#9299A6]">{total} 条内容</p>
      </div>
      <div className="flex rounded-xl bg-[#E9EBF1] p-1">
        {([['all','全部'],['note','笔记'],['homework','作业']] as const).map(([id,label]) => <button key={id} onClick={() => setContentFilter(id)} className={`rounded-lg px-4 py-2 text-[10px] font-semibold ${contentFilter === id ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#777E8C]"}`}>{label}</button>)}
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-10">
      {groups.length ? <div className="space-y-7">
        {groups.map(group => <section key={group.date}>
          {range === "recent" && <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EEF0FF] text-[#5968D8]"><CalendarDays size={15}/></span>
            <div><h2 className="text-[14px] font-bold text-[#303542]">{formatDate(group.date)}</h2><p className="text-[9px] text-[#979DA9]">形成 {group.items.length} 条内容</p></div>
          </div>}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {group.items.map(item => <MemoryCard key={item.card.id} card={item.card} onOpen={card => onOpenCard(card, item.date, item.subjectId)} isNew={item.card.id === newCardId}/>) }
          </div>
        </section>)}
      </div> : <div className="grid h-64 place-items-center rounded-3xl border border-dashed border-[#D9DDE7] bg-white text-[12px] text-[#9AA1AE]">这个时间段还没有符合条件的内容</div>}
    </div>
  </div>;
}
