import { useState } from "react";
import { RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";

export function DetailFeedbackBar({
  onRegenerate,
  regenerating,
  regenerateLabel = "重新生成",
}: {
  onRegenerate?: () => void;
  regenerating?: boolean;
  regenerateLabel?: string;
}) {
  const [thumbState, setThumbState] = useState<"none" | "up" | "down">("none");

  return (
    <div className="mt-5 mb-2 rounded-2xl border border-[#EAEDF2] bg-white px-4 py-3 flex items-center justify-between">
      <span className="text-[12px] text-[#9CA3AF]">这份内容对你有帮助吗？</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onRegenerate}
          disabled={regenerating || !onRegenerate}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-[#EEF0FF] text-[#4D5CFF] hover:bg-[#DDE2FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontWeight: 600 }}
        >
          <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
          {regenerating ? "生成中..." : regenerateLabel}
        </button>
        <button
          onClick={() => setThumbState(s => s === "up" ? "none" : "up")}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ background: thumbState === "up" ? "#EEF0FF" : "#F5F6FA" }}
          title="有帮助"
        >
          <ThumbsUp size={14} color={thumbState === "up" ? "#4D5CFF" : "#7B8291"} fill={thumbState === "up" ? "#4D5CFF" : "none"} />
        </button>
        <button
          onClick={() => setThumbState(s => s === "down" ? "none" : "down")}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ background: thumbState === "down" ? "#F3F4F6" : "#F5F6FA" }}
          title="不够好"
        >
          <ThumbsDown size={14} color={thumbState === "down" ? "#374151" : "#7B8291"} fill={thumbState === "down" ? "#374151" : "none"} />
        </button>
      </div>
    </div>
  );
}
