import { useState, useEffect, useRef } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import type { CardData, SubjectData } from "../../types";
import { SourceIcon, sourceLabel } from "../../shared/SourceIcon";
import { getSkillMeta } from "../../utils/cardDetailParsing";
import { exportCardImage, exportCardMarkdown } from "../../utils/exportCard";
import { CardDetailContent } from "./CardDetailContent";

function OriginalSourcePane({ card }: { card: CardData }) {
  const document = card.sourceDocument;
  const sourceName = card.sourceAnchor?.fileName || document?.title || sourceLabel(card.source ?? "") || "原始记录";
  const page = card.sourceAnchor?.page || document?.page;

  return (
    <section className="flex min-h-0 w-[52%] flex-col border-r border-[#E1E4EB] bg-[#ECEEF4] p-5">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_5px_24px_rgba(27,31,48,.10)]">
        {document?.type === "pdf" && document.url ? (
          <object data={`${document.url}#page=${page || 1}&toolbar=0&navpanes=0&view=FitH`} type="application/pdf" className="h-full w-full">
            <div className="grid h-full place-items-center text-center"><FileText size={30} className="mx-auto text-[#4D5CFF]"/><p className="mt-3 text-[12px]">PDF 预览不可用</p></div>
          </object>
        ) : document?.type === "web" ? (
          <article className="h-full w-full overflow-y-auto px-[9%] py-[7%] text-[#303441]"><p className="text-[10px] font-semibold text-[#4D5CFF]">网页原文</p><h2 className="mt-3 text-[24px] font-bold leading-9">{document.title}</h2>{document.author&&<p className="mt-2 text-[10px] text-[#8A909C]">{document.author} {document.publishedAt&&`· ${document.publishedAt}`}</p>}<div className="mt-6 space-y-4 text-[12px] leading-7 text-[#555D6C]">{(document.paragraphs?.length?document.paragraphs:[document.excerpt||card.detailIntro||"这条笔记由当前网页原文形成。"]).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div></article>
        ) : card.img ? (
          <img src={card.img} alt={`${card.title}的原始文件`} className="h-full w-full object-contain" />
        ) : (
          <div className="max-w-[520px] p-10 text-center"><FileText size={34} className="mx-auto text-[#4D5CFF]"/><h2 className="mt-4 text-[18px] font-bold">{sourceName}</h2><p className="mt-3 text-[11px] leading-6 text-[#7B8291]">这条笔记保留了原始来源定位；当前演示使用文字记录代替文件缩略图。</p></div>
        )}
      </div>
    </section>
  );
}

export function RightDrawer({ card, onClose, onDelete, unifiedContent, onUpdateCard, subjects = [], currentSubjectId, onMoveSubject, onGenerateFromCard }: {
  card: CardData | null;
  onClose: () => void;
  onDelete: () => void;
  unifiedContent?: string;
  onUpdateCard?: (cardId: string, updates: Partial<CardData>) => void;
  subjects?: SubjectData[];
  currentSubjectId?: string;
  onMoveSubject?: (targetSubjectId: string) => void;
  onGenerateFromCard?: (cardId: string) => void;
}) {
  const isOpen = card !== null;
  const srcLabel = sourceLabel(card?.source ?? "");
  const srcIcon = card?.source;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [exporting, setExporting] = useState(false);
  const skillMeta = getSkillMeta(card?.skill);
  const displayTitle = card?.title.replace(/^记忆[:：]\s*/, "") ?? "";
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!card) {
      setConfirmDelete(false);
      setShowMoveMenu(false);
      setShowExport(false);
      setEditingTitle(false);
      setTitleDraft("");
    } else {
      setTitleDraft(card.title);
    }
  }, [card?.id]);

  const saveTitle = () => {
    if (!card) return;
    const nextTitle = titleDraft.trim();
    setEditingTitle(false);
    if (!nextTitle || nextTitle === card.title) {
      setTitleDraft(card.title);
      return;
    }
    onUpdateCard?.(card.id, { title: nextTitle });
  };

  const handleExportMarkdown = () => {
    if (!card) return;
    setShowExport(false);
    exportCardMarkdown(card, unifiedContent ?? "");
  };

  const handleExportImage = async () => {
    if (!card || !exportRef.current) return;
    setShowExport(false);
    setExporting(true);
    try {
      await exportCardImage(card, exportRef.current);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />

      <div
        className="fixed inset-0 bg-white z-50 shadow-[-8px_0_32px_rgba(0,0,0,0.12)] transition-transform duration-300"
        style={{
          width: "100%",
          height: "100dvh",
          maxHeight: "100dvh",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {card && (
          <>
            <header className="flex h-[64px] shrink-0 items-center border-b border-[#E5E8EF] bg-white px-5">
              <button
                onClick={() => { onClose(); setConfirmDelete(false); }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#343A49] transition hover:bg-[#F1F3F8]"
                aria-label="返回笔记列表"
                title="返回笔记"
              >
                <ArrowLeft size={18}/>
              </button>
            </header>
            <div className="flex min-h-0 flex-1">
              <OriginalSourcePane card={card} />
              <section className="flex min-h-0 w-[48%] flex-col bg-white">
            <div className="flex items-center gap-3 px-5 pt-5 pb-3" style={{ flexShrink: 0 }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {editingTitle ? (
                    <input
                      value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveTitle();
                        if (e.key === "Escape") {
                          setTitleDraft(card.title);
                          setEditingTitle(false);
                        }
                      }}
                      autoFocus
                      className="min-w-0 flex-1 rounded-xl border border-[#DDE2FF] bg-[#F7F8FF] px-2.5 py-1 text-[15px] text-[#020418] outline-none"
                      style={{ fontWeight: 700 }}
                    />
                  ) : (
                    <>
                      <p className="text-[15px] text-[#020418] truncate" style={{ fontWeight: 700 }}>{displayTitle}</p>
                      <button
                        onClick={() => {
                          setTitleDraft(card.title);
                          setEditingTitle(true);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F2F4F8] transition-colors flex-shrink-0"
                        title="编辑标题"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7B8291" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                  {srcIcon && <SourceIcon source={srcIcon} size={13} />}
                  <p className="text-[12px] text-[#7B8291]" style={{ margin: 0 }}>{srcLabel} · {card.time}</p>
                  {card.skill && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: skillMeta.textColor,
                      background: skillMeta.bgColor, border: `1px solid ${skillMeta.barColor}40`,
                      borderRadius: 10, padding: "1px 8px", letterSpacing: 0.3, flexShrink: 0,
                    }}>
                      {skillMeta.emoji} {skillMeta.label}
                    </span>
                  )}
                </div>
              </div>
              {onGenerateFromCard && card && (
                <button
                  onClick={() => onGenerateFromCard(card.id)}
                  className="h-8 flex items-center gap-1.5 rounded-full bg-[#EEF0FF] hover:bg-[#E0E5FF] transition-colors flex-shrink-0"
                  style={{ padding: "0 11px", border: "none", color: "#4D5CFF", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  title="用这条笔记出题"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4D5CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.3 7.7l2.1-2.1" />
                    <path d="M9 17h6M10 21h4M12 13a5 5 0 0 0-3 9h6a5 5 0 0 0-3-9z" />
                  </svg>
                  AI 出题
                </button>
              )}
              {subjects.length > 0 && (
                <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setShowMoveMenu(v => !v)}
                    className="h-8 flex items-center gap-1.5 rounded-full bg-[#ECECEC] hover:bg-[#E0E0E0] transition-colors flex-shrink-0"
                    style={{ padding: "0 11px", border: "none", color: "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    title="移动到其他学科"
                  >
                    移动
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showMoveMenu && (
                    <div style={{ position: "absolute", right: 0, top: 38, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid #EAEDF2", overflow: "hidden", minWidth: 168, zIndex: 120 }}>
                      {subjects.map(subject => {
                        const disabled = subject.id === currentSubjectId;
                        return (
                          <button
                            key={subject.id}
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              onMoveSubject?.(subject.id);
                              setShowMoveMenu(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              padding: "11px 13px",
                              background: "none",
                              border: "none",
                              cursor: disabled ? "default" : "pointer",
                              fontSize: 13,
                              color: disabled ? "#9CA3AF" : "#020418",
                              textAlign: "left",
                            }}
                            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#F5F6FA"; }}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}
                          >
                            <span>{subject.short}</span>
                            {disabled && <span style={{ fontSize: 11 }}>当前</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowExport(v => !v)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#ECECEC] hover:bg-[#E0E0E0] transition-colors flex-shrink-0"
                  title="导出"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                {showExport && (
                  <div style={{ position: "absolute", right: 0, top: 36, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid #EAEDF2", overflow: "hidden", minWidth: 160, zIndex: 100 }}>
                    <button onClick={handleExportImage}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#020418", textAlign: "left" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F5F6FA")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      {exporting ? "导出中..." : "导出长图"}
                    </button>
                    <button onClick={handleExportMarkdown}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#020418", textAlign: "left" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F5F6FA")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      导出 Markdown
                    </button>
                  </div>
                )}
              </div>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[12px] text-[#EF4444]">确认删除?</span>
                  <button
                    onClick={() => { onDelete(); setConfirmDelete(false); }}
                    className="px-2.5 py-1 text-[12px] bg-[#EF4444] text-white rounded-lg hover:bg-red-600 transition-colors"
                    style={{ fontWeight: 600 }}
                  >删除</button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 text-[12px] bg-[#ECECEC] text-[#020418] rounded-lg hover:bg-[#E0E0E0] transition-colors"
                  >取消</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#ECECEC] hover:bg-[#FFE4E4] transition-colors flex-shrink-0"
                  title="删除这条笔记"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
            </div>

            <CardDetailContent
              card={card}
              unifiedContent={unifiedContent}
              onUpdateCard={onUpdateCard}
              exportRef={exportRef}
            />
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
