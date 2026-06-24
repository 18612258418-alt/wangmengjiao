import { Sparkles } from "lucide-react";
import type { RecalledMemory } from "../../utils/memoryRecall";

interface Props {
  items: RecalledMemory[];
  onOpenCard?: (item: RecalledMemory) => void;
  compact?: boolean;
}

/** 相机/PDF 底部：轻量「相关记忆」提示，不遮挡主界面 */
export function MemoryRecallBanner({ items, onOpenCard, compact }: Props) {
  if (items.length === 0) return null;

  return (
    <div className={`pointer-events-auto ${compact ? "px-3 pb-2" : "px-4 pb-3"}`}>
      <div className="rounded-xl border border-[#4D5CFF]/25 bg-[#EEF0FF]/95 backdrop-blur-sm px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={13} className="text-[#4D5CFF] flex-shrink-0" />
          <span className="text-[12px] text-[#4D5CFF]" style={{ fontWeight: 600 }}>
            发现 {items.length} 条相关记忆
          </span>
        </div>
        <div className="space-y-1.5">
          {items.map(item => (
            <button
              key={`${item.subjectId}-${item.cardId}`}
              type="button"
              onClick={() => onOpenCard?.(item)}
              className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-white/80 transition-colors"
            >
              <p className="text-[12px] text-[#020418] truncate" style={{ fontWeight: 600 }}>
                {item.title}
              </p>
              <p className="text-[10px] text-[#7B8291] truncate mt-0.5">
                {item.reason} · {item.summary.slice(0, 36)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
