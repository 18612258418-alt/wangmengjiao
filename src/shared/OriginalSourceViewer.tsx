import { createPortal } from "react-dom";
import { useEffect } from "react";
import { ExternalLink, FileText, Globe2, X } from "lucide-react";
import type { SourceDocument } from "../types";

export function ViewOriginalSourceButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-bold text-[#4D5CFF] transition-colors hover:bg-[#EEF0FF]">
      <FileText size={15} />
      查看原文
    </button>
  );
}

export function OriginalSourceOverlay({ open, onClose, source }: { open: boolean; onClose: () => void; source: SourceDocument }) {
  useEffect(() => {
    if (!open || source.type !== "pptx" || !source.page) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`pptx-page-${source.page}`)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, source.page, source.type]);

  if (!open) return null;
  const isPdf = source.type === "pdf";
  const isPptx = source.type === "pptx";

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-7" style={{ background: "rgba(15,23,42,0.78)" }} onClick={onClose} role="dialog" aria-modal="true" aria-label="查看原文">
      <div className="flex h-[88vh] w-[min(940px,92vw)] flex-col overflow-hidden rounded-[20px] bg-[#F5F6FA] shadow-[0_24px_80px_rgba(0,0,0,0.35)]" onClick={event => event.stopPropagation()}>
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[#E4E7EC] bg-white px-5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isPdf ? "bg-[#FFF1F0] text-[#E05252]" : isPptx ? "bg-[#FFF7ED] text-[#EA580C]" : "bg-[#EEF5FF] text-[#3976D8]"}`}>
            {isPdf || isPptx ? <FileText size={17} /> : <Globe2 size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-[#020418]">{source.title}</p>
            <p className="truncate text-[10px] text-[#9CA3AF]">
              {isPdf
                ? `PDF 文档${source.page ? ` · 第 ${source.page} 页` : ""}`
                : isPptx
                  ? `PPT 课件 · ${source.pageCount ?? source.pages?.length ?? 0} 页`
                  : source.url ?? "网页原文"}
            </p>
          </div>
          {source.url && (
            <button type="button" onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#4D5CFF] hover:bg-[#EEF0FF]">
              新窗口打开 <ExternalLink size={12} />
            </button>
          )}
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#7B8291] hover:bg-[#F2F4F8]" aria-label="关闭原文"><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-7">
          {isPdf ? (
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
          ) : isPptx ? (
            <div className="mx-auto grid max-w-[820px] gap-5">
              {!!source.knowledgeGroups?.length && (
                <section className="rounded-2xl border border-[#FED7AA] bg-[#FFFBEB] p-5">
                  <p className="text-[11px] font-bold text-[#C2410C]">跨页知识融合</p>
                  <div className="mt-3 grid gap-2">
                    {source.knowledgeGroups.map((group, index) => (
                      <div key={`${group.title}-${index}`} className="rounded-xl bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[12px] font-bold text-[#111827]">{group.title}</p>
                          <span className="text-[9px] text-[#EA580C]">P{group.pages.join("、P")}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-[#596170]">{group.summary}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {!!source.memoryUnits?.length && (
                <section className="rounded-2xl border border-[#E0E7FF] bg-[#F8FAFF] p-5">
                  <p className="text-[11px] font-bold text-[#4D5CFF]">页面贡献</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {source.memoryUnits.map(unit => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => document.getElementById(`pptx-page-${unit.pages[0]}`)?.scrollIntoView({ block: "start", behavior: "smooth" })}
                        className="rounded-xl border border-[#DDE2FF] bg-white px-3 py-2 text-left hover:border-[#9DA8FF]"
                      >
                        <span className="block text-[10px] font-bold text-[#111827]">{unit.title}</span>
                        <span className="mt-1 block text-[9px] text-[#7B8291]">P{unit.pages.join("、P")} · {unit.contribution}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section className="grid gap-4">
                {(source.pages ?? []).map(page => (
                  <article key={page.page} id={`pptx-page-${page.page}`} className="rounded-2xl border border-[#EAEDF2] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-[#F0F2F5] pb-3">
                      <h2 className="text-[14px] font-bold text-[#111827]">{page.title}</h2>
                      <span className="rounded-lg bg-[#FFF7ED] px-2 py-1 text-[10px] font-bold text-[#EA580C]">P{page.page}</span>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-[12px] leading-6 text-[#41464F]">{page.text || "本页没有可提取文字"}</p>
                    {page.notes && <p className="mt-3 rounded-xl bg-[#F7F8FA] p-3 text-[10px] leading-5 text-[#7B8291]">备注：{page.notes}</p>}
                  </article>
                ))}
              </section>
            </div>
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
