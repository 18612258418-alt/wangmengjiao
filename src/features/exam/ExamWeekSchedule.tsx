import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import type { CardData } from "../../types";
import {
  buildExamWeekSchedule,
  formatWeekdayLabel,
  type ExamScheduleItem,
} from "../../utils/ebbinghausSchedule";
import { getExamSummary } from "../../utils/cardTasks";

const KIND_STYLE: Record<
  ExamScheduleItem["kind"],
  { dot: string; chip: string; text: string }
> = {
  review: { dot: "#EA580C", chip: "#FFF7ED", text: "#C2410C" },
  ebbinghaus: { dot: "#059669", chip: "#ECFDF5", text: "#047857" },
  new: { dot: "#4D5CFF", chip: "#EEF0FF", text: "#4338CA" },
};

export function ExamWeekSchedule({
  items,
  selectedCardId,
  onSelect,
  variant = "inline",
}: {
  items: Array<{ card: CardData; date: string }>;
  selectedCardId?: string;
  onSelect?: (card: CardData, feedDate: string) => void;
  /** inline=备考页内嵌（已弃用） · modal=复习计划弹窗 */
  variant?: "inline" | "modal";
}) {
  const { dayKeys, byDay } = useMemo(() => buildExamWeekSchedule(items), [items]);
  const now = new Date();
  const totalInWeek = useMemo(
    () => dayKeys.reduce((n, k) => n + (byDay[k]?.length ?? 0), 0),
    [dayKeys, byDay],
  );

  const isModal = variant === "modal";

  return (
    <div className={isModal ? "px-6 py-5" : "flex-shrink-0 border-b border-[#EAEDF2]/80 bg-white/80 backdrop-blur-sm"}>
      {isModal ? (
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[13px] text-[#7B8291]">
            待复习优先今天 · 已掌握按 1-2-4-7-15-30 天间隔巩固
          </p>
          <span className="text-[12px] text-[#7B8291] flex-shrink-0">本周 {totalInWeek} 项</span>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays size={18} className="text-[#E67E22] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[14px] text-[#020418]" style={{ fontWeight: 700 }}>
                未来 7 天复习计划
              </p>
              <p className="text-[11px] text-[#9CA3AF] truncate">
                待复习优先排今天 · 已掌握按艾宾浩斯 1-2-4-7-15-30 天间隔
              </p>
            </div>
          </div>
          <span className="text-[12px] text-[#7B8291] flex-shrink-0">
            本周 {totalInWeek} 项
          </span>
        </div>
      )}

      <div className={`${isModal ? "" : "px-5"} pb-4 overflow-x-auto`}>
        <div
          className="grid gap-2 min-w-[640px]"
          style={{ gridTemplateColumns: "repeat(7, minmax(88px, 1fr))" }}
        >
          {dayKeys.map((key, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            const slots = byDay[key] ?? [];
            const isToday = i === 0;

            return (
              <div
                key={key}
                className={`rounded-xl border flex flex-col ${
                  isModal ? "min-h-[140px]" : "min-h-[120px]"
                } ${isToday ? "border-[#E67E22]/50 bg-[#FFFBEB]/60" : "border-[#EAEDF2] bg-[#FAFBFF]"}`}
              >
                <div
                  className={`px-2 py-2 border-b text-center ${
                    isToday ? "border-[#FDE68A]/80" : "border-[#EAEDF2]/80"
                  }`}
                >
                  <p
                    className="text-[11px]"
                    style={{ fontWeight: 700, color: isToday ? "#C2410C" : "#41464F" }}
                  >
                    {formatWeekdayLabel(d, now)}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF]">{slots.length} 项</p>
                </div>
                <ul className={`flex-1 p-1.5 space-y-1 overflow-y-auto ${isModal ? "max-h-[200px]" : "max-h-[140px]"}`}>
                  {slots.length === 0 ? (
                    <li className="text-[10px] text-[#C5CAD6] text-center py-4 px-1">—</li>
                  ) : (
                    slots.map(slot => (
                      <ScheduleChip
                        key={`${key}-${slot.card.id}-${slot.label}`}
                        slot={slot}
                        active={selectedCardId === slot.card.id}
                        onSelect={() => onSelect?.(slot.card, slot.feedDate)}
                      />
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${isModal ? "px-0 pt-2" : "px-5"} pb-3 flex flex-wrap gap-3 text-[10px] text-[#7B8291]`}>
        <Legend color={KIND_STYLE.review.dot} label="待复习（今日优先）" />
        <Legend color={KIND_STYLE.ebbinghaus.dot} label="已掌握 · 间隔巩固" />
        <Legend color={KIND_STYLE.new.dot} label="建议初练" />
      </div>
    </div>
  );
}

function ScheduleChip({
  slot,
  active,
  onSelect,
}: {
  slot: ExamScheduleItem;
  active: boolean;
  onSelect: () => void;
}) {
  const style = KIND_STYLE[slot.kind];
  const brief = getExamSummary(slot.card);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors border ${
          onSelect ? "cursor-pointer" : "cursor-default"
        } ${
          active ? "ring-1 ring-[#E67E22]/60 border-[#FDBA74]" : onSelect ? "border-transparent hover:border-[#EAEDF2]" : "border-transparent"
        }`}
        style={{ background: style.chip }}
        title={brief}
      >
        <div className="flex items-center gap-1 mb-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: style.dot }}
          />
          <span className="text-[9px] truncate" style={{ color: style.text, fontWeight: 700 }}>
            {slot.label}
          </span>
        </div>
        <p className="text-[10px] text-[#41464F] line-clamp-2 leading-tight">
          {brief}
        </p>
      </button>
    </li>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
