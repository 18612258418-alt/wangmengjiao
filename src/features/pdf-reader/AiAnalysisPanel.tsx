import { X, Loader2 } from "lucide-react";

export interface AiEntry {
  id: string;
  status: "loading" | "streaming" | "done" | "error";
  answer: string;
  circleIndex: number;
}

interface Props {
  entries: AiEntry[];
  onClose: () => void;
}

export function AiAnalysisPanel({ entries, onClose }: Props) {
  return (
    <div
      className="flex flex-col bg-white border-l border-[rgba(0,0,0,0.08)]"
      style={{
        width: 320,
        flexShrink: 0,
        height: "100%",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAEDF2] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4D5CFF]" />
          <span className="text-[14px] text-[#020418]" style={{ fontWeight: 700 }}>
            AI 解析
          </span>
          {entries.some(e => e.status === "loading" || e.status === "streaming") && (
            <Loader2 size={13} className="text-[#4D5CFF] animate-spin" />
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#7B8291] transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-12">
            <div className="text-[32px] mb-3">✏️</div>
            <p className="text-[13px] text-[#7B8291] leading-6">
              用 Apple Pencil 在 PDF 上<br />
              圈出任意内容<br />
              AI 将在这里显示解析
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => (
            <div
              key={entry.id}
              className="rounded-2xl bg-[#F5F6FA] p-4"
              style={{ border: "1px solid rgba(77,92,255,0.12)" }}
            >
              {/* Circle badge */}
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="w-5 h-5 rounded-full text-white text-[11px] flex items-center justify-center flex-shrink-0"
                  style={{ background: "#4D5CFF", fontWeight: 700 }}
                >
                  {idx + 1}
                </span>
                <span className="text-[11px] text-[#7B8291]">圈选区域 {entry.circleIndex}</span>
              </div>

              {/* Content */}
              {entry.status === "loading" && (
                <div className="flex items-center gap-2 text-[13px] text-[#7B8291]">
                  <Loader2 size={13} className="animate-spin flex-shrink-0" />
                  AI 正在分析...
                </div>
              )}
              {(entry.status === "streaming" || entry.status === "done") && entry.answer && (
                <p className="text-[13px] text-[#020418] leading-[1.75] whitespace-pre-wrap">
                  {entry.answer}
                  {entry.status === "streaming" && (
                    <span className="inline-block w-0.5 h-3.5 bg-[#4D5CFF] ml-0.5 align-middle animate-pulse" />
                  )}
                </p>
              )}
              {entry.status === "error" && (
                <p className="text-[13px] text-red-400">分析失败，请重新圈选</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
