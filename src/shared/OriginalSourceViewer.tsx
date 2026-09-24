import { createPortal } from "react-dom";
import { AudioLines, ExternalLink, FileText, Globe2, X } from "lucide-react";
import type { SourceDocument } from "../types";

const formatDuration = (seconds?: number) => {
  if (seconds == null) return "";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

export function ViewOriginalSourceButton({ onClick, sourceType }: { onClick: () => void; sourceType?: SourceDocument["type"] }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-bold text-[#4D5CFF] transition-colors hover:bg-[#EEF0FF]">
      {sourceType === "voice" ? <AudioLines size={15} /> : <FileText size={15} />}
      {sourceType === "voice" ? "查看原录音" : "查看原文"}
    </button>
  );
}

export function OriginalSourceOverlay({ open, onClose, source }: { open: boolean; onClose: () => void; source: SourceDocument }) {
  if (!open) return null;
  const isPdf = source.type === "pdf";
  const isVoice = source.type === "voice";

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-7" style={{ background: "rgba(15,23,42,0.78)" }} onClick={onClose} role="dialog" aria-modal="true" aria-label="查看原文">
      <div className="flex h-[88vh] w-[min(940px,92vw)] flex-col overflow-hidden rounded-[20px] bg-[#F5F6FA] shadow-[0_24px_80px_rgba(0,0,0,0.35)]" onClick={event => event.stopPropagation()}>
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[#E4E7EC] bg-white px-5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isPdf ? "bg-[#FFF1F0] text-[#E05252]" : isVoice ? "bg-[#EEF0FF] text-[#5364FF]" : "bg-[#EEF5FF] text-[#3976D8]"}`}>
            {isPdf ? <FileText size={17} /> : isVoice ? <AudioLines size={17} /> : <Globe2 size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-[#020418]">{source.title}</p>
            <p className="truncate text-[10px] text-[#9CA3AF]">{isPdf ? `PDF 文档${source.page ? ` · 第 ${source.page} 页` : ""}` : isVoice ? `原始录音${source.durationSeconds != null ? ` · ${formatDuration(source.durationSeconds)}` : ""}` : source.url ?? "网页原文"}</p>
          </div>
          {source.url && !isVoice && (
            <button type="button" onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#4D5CFF] hover:bg-[#EEF0FF]">
              新窗口打开 <ExternalLink size={12} />
            </button>
          )}
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#7B8291] hover:bg-[#F2F4F8]" aria-label="关闭原文"><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-7">
          {isVoice ? (
            <article className="mx-auto max-w-[760px] rounded-2xl bg-white px-10 py-9 shadow-[0_3px_18px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#EEF0FF] text-[#5364FF]"><AudioLines size={20} /></span>
                <div><h1 className="text-[19px] font-bold text-[#111827]">{source.title}</h1><p className="mt-1 text-[11px] text-[#8A909C]">原始录音 · {formatDuration(source.durationSeconds) || "时长未记录"}</p></div>
              </div>
              {source.url ? (
                <audio controls src={source.url} className="mt-7 w-full" aria-label={`${source.title}原始音频`} />
              ) : (
                <div className="mt-7 rounded-xl bg-[#F5F6FA] px-4 py-3 text-[12px] leading-6 text-[#7B8291]">当前演示录音未生成真实音频文件；正式录制时会在这里保留并播放原始音色。</div>
              )}
              <div className="mt-8 border-t border-[#EEF0F4] pt-6"><h2 className="text-[14px] font-bold text-[#202431]">完整转写</h2><div className="mt-4 space-y-5">{(source.paragraphs ?? []).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap text-[14px] leading-8 text-[#4B5563]">{paragraph}</p>)}</div></div>
            </article>
          ) : isPdf ? (
            <article className="mx-auto min-h-full max-w-[680px] bg-white px-14 py-12 shadow-[0_3px_18px_rgba(15,23,42,0.10)]">
              <p className="text-center text-[10px] tracking-[0.25em] text-[#9CA3AF]">学术文献节选</p>
              <h1 className="mt-4 text-center text-[21px] font-bold leading-8 text-[#111827]">{source.title}</h1>
              <p className="mt-3 text-center text-[11px] text-[#7B8291]">{source.author} {source.publishedAt && `· ${source.publishedAt}`}</p>
              {source.excerpt && <p className="mt-8 border-l-4 border-[#4D5CFF] bg-[#F7F8FF] px-4 py-3 text-[12px] leading-6 text-[#41464F]">摘要：{source.excerpt}</p>}
              <div className="mt-7 space-y-5">
                {(source.paragraphs ?? []).map((paragraph, index) => <p key={index} className="text-[13px] leading-7 text-[#374151] indent-[2em]">{paragraph}</p>)}
              </div>
              <p className="mt-10 text-center text-[10px] text-[#B0B5C0]">— {source.page ? `第 ${source.page} 页` : "原文节选"} —</p>
            </article>
          ) : (
            <article className="mx-auto max-w-[760px] rounded-2xl border border-[#EAEDF2] bg-white px-10 py-9">
              <div className="mb-6 flex items-center gap-2 border-b border-[#EEF0F4] pb-4 text-[11px] text-[#9CA3AF]"><Globe2 size={14} /> 网页文章</div>
              <h1 className="text-[24px] font-bold leading-9 text-[#111827]">{source.title}</h1>
              <p className="mt-3 text-[11px] text-[#7B8291]">{source.author} {source.publishedAt && `· ${source.publishedAt}`}</p>
              {source.excerpt && <p className="mt-7 rounded-xl bg-[#F7F8FA] p-4 text-[13px] leading-6 text-[#41464F]">{source.excerpt}</p>}
              <div className="mt-7 space-y-5">{(source.paragraphs ?? []).map((paragraph, index) => <p key={index} className="text-[14px] leading-7 text-[#374151]">{paragraph}</p>)}</div>
            </article>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
