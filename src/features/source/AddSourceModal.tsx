import { useState } from "react";
import type { CardContentType, DetailSection, ExpandedKnowledge, KnowledgeNode, SubjectData } from "../../types";

export type SourceKind = "image" | "file" | "link" | "text";
export type SourceStatus = "analyzing" | "ready" | "failed" | "saved";

export interface SourceDraft {
  id: string;
  status: SourceStatus;
  sourceKind: SourceKind;
  originalName: string;
  title: string;
  summary: string;
  targetSubjectId: string;
  img?: string;
  overview?: string;
  detailIntro?: string;
  detailSections?: DetailSection[];
  aiKeyPoints?: string[];
  expandedKnowledge?: ExpandedKnowledge[];
  knowledgeTree?: KnowledgeNode[];
  nextAction?: string;
  skill?: string;
  contentType?: CardContentType;
  homeworkTasks?: string[];
  taskDueDate?: string;
  /** 保存后建议打开的 Tab */
  openTab?: "homework" | null;
  error?: string;
}

function getSourceVisual(item: Pick<SourceDraft, "sourceKind" | "originalName">) {
  const lowerName = item.originalName.toLowerCase();
  if (item.sourceKind === "image") {
    return { label: "IMG", icon: "I", bg: "#EFF6FF", color: "#2563EB" };
  }
  if (lowerName.endsWith(".pdf")) {
    return { label: "PDF", icon: "P", bg: "#FFF1F2", color: "#E11D48" };
  }
  if (item.sourceKind === "link") {
    return { label: "URL", icon: "U", bg: "#ECFDF5", color: "#059669" };
  }
  if (item.sourceKind === "text" || lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
    return { label: "TXT", icon: "T", bg: "#F5F3FF", color: "#7C3AED" };
  }
  return { label: "FILE", icon: "F", bg: "#F1F5F9", color: "#475569" };
}

export function AddSourceModal({
  isOpen,
  subjects,
  onClose,
  onAnalyzeFile,
  onConfirmDraft,
}: {
  isOpen: boolean;
  subjects: SubjectData[];
  onClose: () => void;
  onAnalyzeFile: (file: File) => Promise<SourceDraft>;
  onConfirmDraft: (draft: SourceDraft) => void;
}) {
  const [items, setItems] = useState<SourceDraft[]>([]);

  if (!isOpen) return null;

  const updateItem = (id: string, updates: Partial<SourceDraft>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const addAnalyzingItem = (sourceKind: SourceKind, originalName: string) => {
    const item: SourceDraft = {
      id: `source_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: "analyzing",
      sourceKind,
      originalName,
      title: originalName,
      summary: sourceKind === "image" || originalName.toLowerCase().endsWith(".pdf")
        ? "AI 正在解析（视觉模型约需 30–90 秒，请稍候）..."
        : "AI 正在解析资料内容...",
      targetSubjectId: subjects[0]?.id ?? "other",
    };
    setItems(prev => [item, ...prev]);
    return item.id;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const id = addAnalyzingItem(file.type.startsWith("image/") ? "image" : "file", file.name);
      onAnalyzeFile(file)
        .then(draft => updateItem(id, { ...draft, id, status: "ready" }))
        .catch(err => updateItem(id, {
          status: "failed",
          summary: "解析失败，请稍后重试或换一种资料格式。",
          error: err instanceof Error ? err.message : String(err),
        }));
    });
  };

  const confirmItem = (item: SourceDraft) => {
    onConfirmDraft(item);
    updateItem(item.id, { status: "saved" });
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35" onClick={onClose}>
      <div className="w-[720px] max-h-[86vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[#EAEDF2] flex items-start justify-between">
          <div>
            <p className="text-[18px] text-[#020418]" style={{ fontWeight: 800 }}>添加资料</p>
            <p className="text-[12px] text-[#7B8291] mt-1">先解析成预览卡，确认后再保存为记忆，避免污染你的资料库。</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F0F2F5] hover:bg-[#E5E7EB] text-[#020418]">×</button>
        </div>

        <div className="px-6 pt-5 pb-4">
          <label className="block rounded-3xl border border-dashed border-[#C9D0E3] bg-[#F8FAFF] p-6 text-center cursor-pointer hover:bg-[#F3F6FF]">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md"
              className="hidden"
              onChange={e => {
                handleFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <p className="text-[15px] text-[#020418]" style={{ fontWeight: 800 }}>选择图片、PDF 或文本文件</p>
            <p className="text-[12px] text-[#7B8291] mt-1">支持多选；每个资料会独立解析，失败不会影响其他资料。</p>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-[#F8FAFB] border border-[#EAEDF2] p-8 text-center">
              <p className="text-[13px] text-[#9CA3AF]">添加资料后，这里会显示逐条解析进度和确认入口。</p>
            </div>
          ) : items.map(item => {
            const subject = subjects.find(s => s.id === item.targetSubjectId);
            const visual = getSourceVisual(item);
            return (
              <div key={item.id} className="rounded-3xl border border-[#EAEDF2] bg-white p-4 flex gap-4">
                {item.img ? (
                  <img src={item.img} alt={item.title} className="w-[74px] h-[58px] rounded-xl object-cover bg-[#F0F2F5] flex-shrink-0" />
                ) : (
                  <div
                    className="w-[74px] h-[58px] rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: visual.bg, color: visual.color }}
                  >
                    <span style={{ fontSize: visual.icon.length === 1 ? 18 : 16, fontWeight: 900, lineHeight: 1 }}>{visual.icon}</span>
                    <span className="text-[10px] mt-1" style={{ fontWeight: 900, letterSpacing: 0.3 }}>{visual.label}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      value={item.title}
                      disabled={item.status !== "ready"}
                      onChange={e => updateItem(item.id, { title: e.target.value })}
                      className="min-w-0 flex-1 bg-transparent text-[14px] text-[#020418] outline-none disabled:opacity-100"
                      style={{ fontWeight: 800 }}
                    />
                    <span className={`text-[11px] ${item.status === "failed" ? "text-[#EF4444]" : item.status === "saved" ? "text-[#10B981]" : "text-[#7B8291]"}`}>
                      {item.status === "analyzing" ? "解析中" : item.status === "ready" ? "待确认" : item.status === "saved" ? "已保存" : "失败"}
                    </span>
                  </div>
                  <p className={`text-[12px] mt-1 line-clamp-2 ${item.status === "failed" ? "text-[#E11D48]" : "text-[#7B8291]"}`}>
                    {item.error || item.summary}
                  </p>
                  {item.status === "ready" && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <select
                        value={item.targetSubjectId}
                        onChange={e => updateItem(item.id, { targetSubjectId: e.target.value })}
                        className="appearance-none rounded-xl border border-[#EAEDF2] bg-[#F8FAFB] py-2 pl-3 text-[12px] outline-none"
                        style={{
                          minWidth: 96,
                          paddingRight: 30,
                          backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A93A6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 11px center",
                        }}
                      >
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.short}</option>)}
                      </select>
                      <button onClick={() => confirmItem(item)} className="rounded-xl bg-[#4D5CFF] px-4 py-2 text-[12px] text-white" style={{ fontWeight: 800 }}>
                        确认保存到{subject?.short ?? "学科"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
