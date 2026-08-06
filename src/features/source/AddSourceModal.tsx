import { useState } from "react";
import type {
  CardContentType,
  DetailSection,
  ExpandedKnowledge,
  IngestionDecision,
  LearningAction,
  LearningContext,
  KnowledgeNode,
  SourceAnchor,
  SourceDocument,
  SubjectData,
} from "../../types";
import type { TimetableData } from "../study/timetable";

export type SourceKind = "image" | "file" | "link" | "text" | "audio" | "timetable";
export type SourceStatus = "analyzing" | "ready" | "failed" | "saved" | "ignored";

export interface SourceDraft {
  id: string;
  status: SourceStatus;
  sourceKind: SourceKind;
  originalName: string;
  title: string;
  summary: string;
  targetSubjectId: string;
  /** 用户选择关联到哪一门课程；与学科分类相互独立 */
  targetCourseId?: string;
  /** 上传来源指纹：只有该指纹完全一致时才允许去重 */
  sourceAnchor?: SourceAnchor;
  /** PDF、书本或网页的原始资料信息 */
  sourceDocument?: SourceDocument;
  /** Excel 课表走独立确认流程，不保存为普通笔记 */
  timetable?: TimetableData;
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
  ingestionDecision?: IngestionDecision;
  learningActions?: LearningAction[];
  learningPhase?: LearningContext["phase"];
  syllabusEntryId?: string;
  /** 课程或知识目录挂靠明确且置信度足够时，无需人工再点一次保存。 */
  autoArchive?: boolean;
  error?: string;
}

const AUDIO_EXTS = ["mp3", "m4a", "mp4", "wav", "ogg", "flac", "opus", "aac", "webm", "amr", "wma"];

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTS.includes(ext);
}

function getSourceVisual(item: Pick<SourceDraft, "sourceKind" | "originalName">) {
  if (item.sourceKind === "timetable") {
    return { label: "XLS", icon: "表", bg: "#ECFDF5", color: "#059669" };
  }
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
  if (lowerName.endsWith(".pptx") || lowerName.endsWith(".ppt")) {
    return { label: "PPT", icon: "P", bg: "#FFF7ED", color: "#EA580C" };
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
  onClose,
  onAnalyzeFile,
  onConfirmDraft,
  onConfirmTimetable,
  courseOptions = [],
}: {
  isOpen: boolean;
  subjects: SubjectData[];
  onClose: () => void;
  onAnalyzeFile: (
    file: File,
    onProgress: (update: Partial<SourceDraft>) => void,
  ) => Promise<SourceDraft>;
  onConfirmDraft: (draft: SourceDraft, options?: { keepOpen?: boolean }) => Promise<void>;
  onConfirmTimetable: (data: TimetableData) => void;
  courseOptions?: { id: string; name: string }[];
}) {
  const [items, setItems] = useState<SourceDraft[]>([]);

  if (!isOpen) return null;

  const updateItem = (id: string, updates: Partial<SourceDraft>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const addAnalyzingItem = (sourceKind: SourceKind, originalName: string) => {
    const isAudio = sourceKind === "audio";
    const isImage = sourceKind === "image"
      || originalName.toLowerCase().endsWith(".pdf")
      || originalName.toLowerCase().endsWith(".pptx");
    let summary = "AI 正在解析资料内容...";
    if (isAudio) summary = "🎙 正在识别语音（约 20–60 秒），请稍候...";
    else if (isImage) summary = originalName.toLowerCase().endsWith(".pptx")
      ? "正在读取整份 PPT 并融合跨页知识结构..."
      : "AI 正在解析（视觉模型约需 30–90 秒，请稍候）...";

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
    const pendingFiles = Array.from(files);

    void (async () => {
      for (const [index, file] of pendingFiles.entries()) {
      const audio = isAudioFile(file);

      // 文件大小警告（音频超 20 MB 很可能触发 Vercel 4.5 MB 请求体限制）
      if (audio && file.size > 20 * 1024 * 1024) {
        const id = addAnalyzingItem("audio", file.name);
        updateItem(id, {
          status: "failed",
          summary: "文件过大（超过 20 MB）。",
          error: `课堂录音（${(file.size / 1024 / 1024).toFixed(1)} MB）超出单次上传限制。建议：① 在录音 App 导出 64 kbps 版本（约 7 分钟内可上传）；② 将录音分成 10 分钟左右的片段分别上传。`,
        });
        continue;
      }

      const kind: SourceKind = audio ? "audio" : file.type.startsWith("image/") ? "image" : "file";
      const id = addAnalyzingItem(kind, file.name);

      if (pendingFiles.length > 1) {
        updateItem(id, {
          summary: `正在解析第 ${index + 1}/${pendingFiles.length} 张资料，请保持窗口打开...`,
        });
      }

      try {
        const draft = await onAnalyzeFile(file, (update) => updateItem(id, update));
        const normalized = `${draft.title}${draft.summary}`.replace(/[\s（）()·\-—_]/g, "").toLowerCase();
        const autoCourse = courseOptions.find(course =>
          normalized.includes(course.name.replace(/[\s（）()·\-—_]/g, "").toLowerCase()),
        );
        const courseFromSubject = courseOptions.find(course => course.id === draft.targetSubjectId);
        const finalDraft: SourceDraft = {
          ...draft,
          id,
          status: draft.ingestionDecision?.validCourseContent === false ? "ignored" : "ready",
          targetCourseId: draft.targetCourseId ?? autoCourse?.id ?? courseFromSubject?.id,
        };
        updateItem(id, finalDraft);
        if (finalDraft.autoArchive && finalDraft.ingestionDecision?.validCourseContent) {
          await onConfirmDraft(finalDraft, { keepOpen: true });
          updateItem(id, { status: "saved" });
        }
      } catch (err) {
        updateItem(id, {
          status: "failed",
          summary: "解析失败，请稍后重试或换一种资料格式。",
          error: err instanceof Error ? err.message : String(err),
        });
      }
      }
    })();
  };

  const confirmItem = async (item: SourceDraft) => {
    try {
      await onConfirmDraft(item);
      updateItem(item.id, { status: "saved" });
      onClose();
    } catch (err) {
      updateItem(item.id, {
        status: "failed",
        error: err instanceof Error ? err.message : "保存失败，请重试。",
      });
    }
  };

  const acceptTypes = [
    "image/*",
    ".pdf",
    ".pptx",
    ".ppt",
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
    ".xlsx",
    ".xls",
    ".csv",
  ].join(",");

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/35" onClick={onClose}>
      <div className="w-[720px] max-h-[86vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[#EAEDF2] flex items-start justify-between">
          <div>
            <p className="text-[18px] text-[#020418]" style={{ fontWeight: 800 }}>添加资料</p>
            <p className="text-[12px] text-[#7B8291] mt-1">有效课程资料会自动归档并挂靠；不确定时再请你确认。</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F0F2F5] hover:bg-[#E5E7EB] text-[#020418]">×</button>
        </div>

        <div className="px-6 pt-5 pb-4">
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
              选择资料或 Excel 课表
            </p>
            <p className="text-[12px] text-[#7B8291] mt-1">
              支持图片、PDF、PPTX、文本、音频，以及 xlsx / xls / csv 课程表。
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
                    <span className={`text-[11px] flex-shrink-0 ${item.status === "failed" ? "text-[#EF4444]" : item.status === "saved" ? "text-[#10B981]" : item.status === "ignored" ? "text-[#D97706]" : "text-[#7B8291]"}`}>
                      {item.status === "analyzing" ? (item.sourceKind === "audio" ? "识别中" : "解析中") : item.status === "ready" ? "待确认" : item.status === "saved" ? "已自动归档" : item.status === "ignored" ? "未入库" : "失败"}
                    </span>
                  </div>
                  <p className={`text-[12px] mt-1 line-clamp-2 ${item.status === "failed" ? "text-[#E11D48]" : "text-[#7B8291]"}`}>
                    {item.error || item.summary}
                  </p>
                  {item.transcript && item.status === "ready" && (
                    <TranscriptPreview text={item.transcript} />
                  )}
                  {item.ingestionDecision && item.status !== "analyzing" && item.status !== "failed" && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      {item.ingestionDecision.courseName && <span className="rounded-full bg-[#EEF2FF] px-2 py-1 text-[#4D5CFF]">{item.ingestionDecision.courseName}</span>}
                      {item.ingestionDecision.chapterTitle && <span className="rounded-full bg-[#F3F4F6] px-2 py-1 text-[#596173]">{item.ingestionDecision.chapterTitle}</span>}
                      {item.ingestionDecision.destinations.map(destination => (
                        <span key={destination} className="rounded-full bg-[#ECFDF5] px-2 py-1 text-[#059669]">
                          {destination === "knowledge" ? "知识" : destination === "homework" ? "作业" : "备考"}
                        </span>
                      ))}
                      {item.learningActions?.length ? <span className="rounded-full bg-[#FFF7ED] px-2 py-1 text-[#D97706]">{item.learningActions.length} 个待办</span> : null}
                    </div>
                  )}
                  {item.timetable && item.status === "ready" && (
                    <div className="mt-3 rounded-2xl border border-[#DDF3E9] bg-[#F3FBF7] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#087A54]">{item.timetable.semester}</span>
                        <span className="text-[10px] text-[#6B8F82]">
                          识别到 {new Set(item.timetable.courses.map(course => course.courseId)).size} 门课 · {item.timetable.courses.length} 个上课时段
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {item.timetable.courses.slice(0, 6).map(course => (
                          <div key={course.id} className="truncate rounded-lg bg-white px-2.5 py-2 text-[10px] text-[#475569]">
                            <span className="font-semibold text-[#16251F]">{course.day} {course.time}</span>
                            <span className="ml-2">{course.course}</span>
                          </div>
                        ))}
                      </div>
                      {item.timetable.courses.length > 6 && (
                        <p className="mt-2 text-[9px] text-[#6B8F82]">其余 {item.timetable.courses.length - 6} 个时段将在学期课表中展示</p>
                      )}
                    </div>
                  )}
                  {item.status === "ready" && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {item.timetable ? (
                        <>
                          <p className="text-[10px] text-[#7B8291]">确认后将更新学期课表，不会删除已关联的课程资料。</p>
                          <button
                            onClick={() => {
                              onConfirmTimetable(item.timetable!);
                              updateItem(item.id, { status: "saved" });
                            }}
                            className="rounded-xl bg-[#10A875] px-4 py-2 text-[12px] text-white"
                            style={{ fontWeight: 800 }}
                          >
                            导入学期课表
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <select
                              value={item.targetSubjectId}
                              onChange={e => updateItem(item.id, { targetSubjectId: e.target.value })}
                              className="appearance-none rounded-xl border border-[#EAEDF2] bg-[#F8FAFB] px-3 py-2 text-[12px] outline-none"
                            >
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.short}</option>)}
                            </select>
                            {courseOptions.length > 0 && (
                              <select
                                value={item.targetCourseId ?? ""}
                                onChange={e => updateItem(item.id, { targetCourseId: e.target.value || undefined })}
                                className="max-w-[190px] appearance-none rounded-xl border border-[#EAEDF2] bg-[#F8FAFB] px-3 py-2 text-[12px] outline-none"
                                aria-label="关联课程"
                              >
                                <option value="">暂不关联课程</option>
                                {courseOptions.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                              </select>
                            )}
                          </div>
                          <button onClick={() => confirmItem(item)} className="rounded-xl bg-[#4D5CFF] px-4 py-2 text-[12px] text-white" style={{ fontWeight: 800 }}>
                            确认保存到{subject?.short ?? "学科"}
                          </button>
                        </>
                      )}
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
