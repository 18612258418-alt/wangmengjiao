import { useState } from "react";
import type { CardContentType, DetailSection, ExpandedKnowledge, KnowledgeNode, SubjectData } from "../../types";

export type SourceKind = "image" | "file" | "link" | "text" | "audio";
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
  /** 音频转录原文，仅 sourceKind==="audio" 时存在 */
  transcript?: string;
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
  /** 当前解析由真实 AI 服务还是无 Key 的本地演示完成 */
  processingMode?: "ai" | "local-demo";
  /** Source 被切成了怎样的可定位片段 */
  fragmentSummary?: string;
  /** AI 从片段中提出、等待确认的记忆候选 */
  memoryCandidates?: string[];
  /** 建议建立的 Context Graph 关联 */
  autoRelations?: string[];
  error?: string;
}

const AUDIO_EXTS = ["mp3", "m4a", "mp4", "wav", "ogg", "flac", "opus", "aac", "webm", "amr", "wma"];

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTS.includes(ext);
}

function getSourceVisual(item: Pick<SourceDraft, "sourceKind" | "originalName">) {
  if (item.sourceKind === "audio") {
    return { label: "AUDIO", icon: "🎙", bg: "#FFF7ED", color: "#EA580C" };
  }
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

/** 音频转录原文可展开/收起 */
function TranscriptPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.slice(0, 120);
  const hasMore = text.length > 120;
  return (
    <div className="mt-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#EA580C]" style={{ fontWeight: 700 }}>🎙 转录原文</span>
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-[#EA580C] hover:underline"
          >
            {expanded ? "收起" : "展开全文"}
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#92400E] leading-relaxed whitespace-pre-wrap break-words">
        {expanded ? text : (hasMore ? `${preview}…` : text)}
      </p>
    </div>
  );
}

export function AddSourceModal({
  isOpen,
  subjects,
  activeContext,
  onClose,
  onAnalyzeFile,
  onConfirmDraft,
}: {
  isOpen: boolean;
  subjects: SubjectData[];
  activeContext?: string | null;
  onClose: () => void;
  onAnalyzeFile: (
    file: File,
    onProgress: (update: Partial<SourceDraft>) => void,
  ) => Promise<SourceDraft>;
  onConfirmDraft: (draft: SourceDraft) => void;
}) {
  const [items, setItems] = useState<SourceDraft[]>([]);

  if (!isOpen) return null;

  const updateItem = (id: string, updates: Partial<SourceDraft>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const addAnalyzingItem = (sourceKind: SourceKind, originalName: string) => {
    const isAudio = sourceKind === "audio";
    const isImage = sourceKind === "image" || originalName.toLowerCase().endsWith(".pdf");
    let summary = "AI 正在解析资料内容...";
    if (isAudio) summary = "🎙 正在识别语音（约 20–60 秒），请稍候...";
    else if (isImage) summary = "AI 正在解析（视觉模型约需 30–90 秒，请稍候）...";

    const item: SourceDraft = {
      id: `source_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: "analyzing",
      sourceKind,
      originalName,
      title: originalName,
      summary,
      targetSubjectId: subjects[0]?.id ?? "other",
    };
    setItems(prev => [item, ...prev]);
    return item.id;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const audio = isAudioFile(file);

      // 文件大小警告（音频超 20 MB 很可能触发 Vercel 4.5 MB 请求体限制）
      if (audio && file.size > 20 * 1024 * 1024) {
        const id = addAnalyzingItem("audio", file.name);
        updateItem(id, {
          status: "failed",
          summary: "文件过大（超过 20 MB）。",
          error: `课堂录音（${(file.size / 1024 / 1024).toFixed(1)} MB）超出单次上传限制。建议：① 在录音 App 导出 64 kbps 版本（约 7 分钟内可上传）；② 将录音分成 10 分钟左右的片段分别上传。`,
        });
        return;
      }

      const kind: SourceKind = audio ? "audio" : file.type.startsWith("image/") ? "image" : "file";
      const id = addAnalyzingItem(kind, file.name);

      onAnalyzeFile(file, (update) => updateItem(id, update))
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

  const acceptTypes = [
    "image/*",
    ".pdf",
    ".txt",
    ".md",
    ".mp3",
    ".m4a",
    ".mp4",
    ".wav",
    ".ogg",
    ".flac",
    ".opus",
    ".aac",
    ".webm",
    ".amr",
    ".wma",
  ].join(",");

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35" onClick={onClose}>
      <div className="w-[720px] max-h-[86vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[#EAEDF2] flex items-start justify-between">
          <div>
            <p className="text-[18px] text-[#020418]" style={{ fontWeight: 800 }}>添加资料</p>
            <p className="text-[12px] text-[#7B8291] mt-1">原件会先保存。AI 自动整理高置信内容，只有新研究、冲突判断等重要变化需要你确认。</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F0F2F5] hover:bg-[#E5E7EB] text-[#020418]">×</button>
        </div>

        <div className="px-6 pt-5 pb-4">
          {activeContext && (
            <div className="mb-3 flex items-center rounded-2xl border border-[#DDE1FF] bg-[#F4F5FF] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-[#4D5CFF]">已根据课表识别当前情境</p>
                <p className="mt-1 truncate text-[12px] font-bold text-[#252936]">{activeContext}</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[9px] text-[#4D5CFF]">资料将优先关联本次课堂</span>
            </div>
          )}
          <label className="block rounded-3xl border border-dashed border-[#C9D0E3] bg-[#F8FAFF] p-6 text-center cursor-pointer hover:bg-[#F3F6FF]">
            <input
              type="file"
              multiple
              accept={acceptTypes}
              className="hidden"
              onChange={e => {
                handleFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <p className="text-[15px] text-[#020418]" style={{ fontWeight: 800 }}>
              选择图片、PDF、文本或音频文件
            </p>
            <p className="text-[12px] text-[#7B8291] mt-1">
              支持多选；音频（mp3 / m4a / wav 等）将自动语音转录后再分析。
            </p>
            <p className="text-[11px] text-[#EA580C] mt-1">
              🎙 音频上传限制 ≈ 20 MB（约 7 分钟 64 kbps，或 3 分钟 128 kbps）
            </p>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-[#F8FAFB] border border-[#EAEDF2] p-8 text-center">
              <p className="text-[13px] text-[#9CA3AF]">添加资料后，这里会显示逐条解析进度和确认入口。</p>
            </div>
          ) : items.map(item => {
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
                    <span style={{ fontSize: visual.icon.length === 1 ? 18 : 20, fontWeight: 900, lineHeight: 1 }}>{visual.icon}</span>
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
                    <span className={`text-[11px] flex-shrink-0 ${item.status === "failed" ? "text-[#EF4444]" : item.status === "saved" ? "text-[#10B981]" : "text-[#7B8291]"}`}>
                      {item.status === "analyzing" ? (item.sourceKind === "audio" ? "识别中" : "解析中") : item.status === "ready" ? "待确认" : item.status === "saved" ? "已保存" : "失败"}
                    </span>
                  </div>
                  <p className={`text-[12px] mt-1 line-clamp-2 ${item.status === "failed" ? "text-[#E11D48]" : "text-[#7B8291]"}`}>
                    {item.error || item.summary}
                  </p>
                  {item.transcript && item.status === "ready" && (
                    <TranscriptPreview text={item.transcript} />
                  )}
                  {item.status === "ready" && (
                    <>
                    <div className="mt-3 rounded-2xl border border-[#E4E7F2] bg-[#FAFBFF] p-3">
                      <div className="flex items-center">
                        <span className="text-[10px] text-[#4D5CFF]" style={{fontWeight:800}}>AI 对这份资料的理解</span>
                        <span className={`ml-auto rounded-full px-2 py-1 text-[9px] ${item.processingMode === "local-demo" ? "bg-[#FFF7E8] text-[#B66A0A]" : "bg-[#EEF8F3] text-[#21845A]"}`}>
                          {item.processingMode === "local-demo" ? "本地演示解析" : "AI 真实解析"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white p-2.5">
                          <span className="text-[9px] text-[#8A909C]">原始资料</span>
                          <p className="mt-1 text-[10px] text-[#252936]">保留原貌，可随时回看</p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5">
                          <span className="text-[9px] text-[#8A909C]">从原文中提取</span>
                          <p className="mt-1 text-[10px] text-[#252936]">{item.fragmentSummary ?? "已建立可定位片段"}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5">
                          <span className="text-[9px] text-[#8A909C]">处理方式</span>
                          <p className="mt-1 text-[10px] text-[#252936]">普通关系自动整理，重要变化再询问</p>
                        </div>
                      </div>
                      {!!item.memoryCandidates?.length && <div className="mt-3"><span className="text-[9px] font-bold text-[#7B8291]">AI 提取了这些理解</span><div className="mt-1.5 space-y-1">{item.memoryCandidates.map((candidate,index)=><p key={`${candidate}-${index}`} className="rounded-lg bg-white px-2.5 py-2 text-[10px] text-[#41464F]">{index+1}. {candidate}</p>)}</div></div>}
                      {!!item.autoRelations?.length && <div className="mt-3"><div className="flex items-center"><span className="text-[9px] font-bold text-[#7B8291]">AI 认为它与这些内容有关</span><span className="ml-auto text-[9px] text-[#21845A]">将自动整理，可随时修改</span></div><div className="mt-1.5 flex flex-wrap gap-1.5">{item.autoRelations.map(relation=><span key={relation} className="rounded-full bg-[#EEF0FF] px-2 py-1 text-[9px] text-[#4D5CFF]">{relation}<button aria-label={`移除关联 ${relation}`} className="ml-1 text-[#929AFF]" onClick={()=>updateItem(item.id,{autoRelations:item.autoRelations?.filter(x=>x!==relation)})}>×</button></span>)}</div></div>}
                      {item.processingMode === "local-demo" && <p className="mt-3 text-[9px] leading-4 text-[#B66A0A]">当前未配置模型服务，因此只演示完整处理流程，不声称已理解文件真实内容。</p>}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[10px] leading-4 text-[#8A909C]">不会把资料塞进单一文件夹；同一份内容可以同时服务学习、研究和计划。</p>
                      <button onClick={() => confirmItem(item)} className="rounded-xl bg-[#4D5CFF] px-4 py-2 text-[12px] text-white" style={{ fontWeight: 800 }}>
                        保存这些理解
                      </button>
                    </div>
                    </>
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
