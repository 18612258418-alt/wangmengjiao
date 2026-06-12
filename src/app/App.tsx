import React, { useState, useRef, useEffect, useMemo } from "react";

import type { CardContentType, DetailSection, ExpandedKnowledge, KnowledgeNode, CardData, FeedGroup as FeedGroupType } from "../types";
import {
  INITIAL_SUBJECTS,
  TYPE_SOURCE, TYPE_BG,
  imgLoadingSpinner, imgNotesBg,
  FALLBACK_CLASSIFY, FALLBACK_DETAILS, FALLBACK_TITLES,
} from "../data/initialData";
import { callDoubao, callText, callTextStreamed, compressImageForApi, streamText } from "../utils/api";
import { classifyCardSurfaces } from "../utils/cardSurfaces";
import { classifyNoteSyllabusEntry } from "../utils/syllabusLink";
import { extractHomeworkFromNote } from "../utils/homeworkExtract";
import { cardsForSyllabusEntry } from "../utils/syllabusNotes";
import { linkOrProposeExamPoints } from "../modules/exam-prep";
import { useMemoryDB } from "../hooks/useMemoryDB";
import { buildDetailPagePrompt } from "../prompts";
import { ApiConfigProvider } from "../context/ApiConfigContext";
import { AnnotationModal } from "../features/annotation/AnnotationModal";
import { SyllabusNotesView } from "../features/feed/SyllabusNotesView";
import { TopTabs, type TopTabId } from "../features/feed/TopTabs";
import { AnnotationMenu } from "../features/feed/AnnotationMenu";
import { PdfReaderModal } from "../features/pdf-reader/PdfReaderModal";
import { CameraModal } from "../features/camera/CameraModal";
import { ScreenshotModeModal } from "../features/screenshot/ScreenshotModeModal";
import { VoiceModal } from "../features/voice/VoiceModal";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { HomeworkView } from "../features/feed/HomeworkView";
import { ExamPrepView } from "../modules/exam-prep";
import { filterNoteFeedGroups } from "../utils/feedFilters";
import { EditableSubjectName } from "../features/feed/EditableSubjectName";
import { RightDrawer } from "../features/drawer/RightDrawer";
import { SearchOverlay } from "../features/search/SearchOverlay";
import { Sidebar } from "../features/sidebar/Sidebar";
import { AddSourceModal, type SourceDraft, isAudioFile } from "../features/source/AddSourceModal";
import { FlyThumbnail } from "../shared/FlyThumbnail";

/** 选出最近更新的学科：扫描 allFeedGroups 取出最大日期对应的 subjectId */
function pickMostRecentSubject(allFeedGroups: Record<string, FeedGroupType[]>): string | null {
  let bestId: string | null = null;
  let bestDate = -Infinity;
  for (const [id, groups] of Object.entries(allFeedGroups)) {
    if (!Array.isArray(groups)) continue;
    for (const g of groups) {
      const d = parseInt(g.date) || 0;
      if (d > bestDate) { bestDate = d; bestId = id; }
    }
  }
  return bestId;
}

export default function App() {
  const {
    allFeedGroups, subjects, isLoading: dbLoading,
    toast, addCard, removeCard, updateCard, addSubject, updateSubject, moveCardToSubject, showToast,
  } = useMemoryDB();

  const [activeSubject, setActiveSubject] = useState<string>("__pending__");
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>("notes");
  const [annotationType, setAnnotationType] = useState<string | null>(null);
  const [drawerCard, setDrawerCard] = useState<CardData | null>(null);
  const [drawerCardDate, setDrawerCardDate] = useState<string>("");
  const [drawerCardSubject, setDrawerCardSubject] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [pdfReaderFile, setPdfReaderFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<"first" | "demo" | null>(
    () => localStorage.getItem("imemo_onboarded") ? null : "first",
  );
  const [flyPhase, setFlyPhase] = useState<"idle" | "center" | "corner" | "fading">("idle");
  const [flyImg, setFlyImg] = useState<string>("");
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const flyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const didInitSubjectRef = useRef(false);
  const demoPdfInputRef = useRef<HTMLInputElement>(null);

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => {
      const latestDate = (id: string) =>
        Math.max(...(allFeedGroups[id] ?? []).map(g => parseInt(g.date) || 0), 0);
      return latestDate(b.id) - latestDate(a.id);
    });
  }, [subjects, allFeedGroups]);

  // 首次有数据时锚定默认学科为「最近有更新的学科」
  useEffect(() => {
    if (didInitSubjectRef.current) return;
    if (dbLoading) return;
    const totalGroups = Object.values(allFeedGroups).reduce((s, g) => s + (g?.length ?? 0), 0);
    if (totalGroups === 0) return;
    const recent = pickMostRecentSubject(allFeedGroups);
    setActiveSubject(recent ?? subjects[0]?.id ?? "all");
    didInitSubjectRef.current = true;
  }, [dbLoading, allFeedGroups, subjects]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "notes" || tab === "homework" || tab === "exam") {
      setActiveTopTab(tab);
    }
    const subject = params.get("subject");
    if (subject && subjects.some(s => s.id === subject)) {
      didInitSubjectRef.current = true;
      setActiveSubject(subject);
    }
  }, [subjects]);

  const subject = subjects.find(s => s.id === activeSubject) ?? subjects[0];
  const feedGroups = allFeedGroups[activeSubject] ?? [];

  const examNoteFeedGroups = useMemo(
    () => filterNoteFeedGroups(feedGroups),
    [feedGroups],
  );

  const handleOpenAnnotation = (type: string) => setAnnotationType(type);
  const handleCloseAnnotation = () => setAnnotationType(null);

  const handleOpenCard = (card: CardData, date: string, subjectId?: string) => {
    setDrawerCard(card);
    setDrawerCardDate(date);
    setDrawerCardSubject(subjectId ?? activeSubject);
  };

  /** 用户点击某个大纲条目：清除该条目下所有笔记的"新增未读"红点 */
  const handleOpenSyllabusEntry = (entryId: string) => {
    const unreadCards = cardsForSyllabusEntry(feedGroups, entryId).filter(({ card }) => card.unread);
    if (unreadCards.length === 0) return;
    for (const { card, date } of unreadCards) {
      updateCard(activeSubject, date, card.id, { unread: false });
    }
  };

  const buildFallbackCardPayload = (aType: string) => {
    const targetSubjectId = FALLBACK_CLASSIFY[aType] ?? "other";
    const titles = FALLBACK_TITLES[aType] ?? FALLBACK_TITLES.notes;
    const title = titles[Math.floor(Math.random() * titles.length)] ?? "记忆：学习内容整理";
    const details = FALLBACK_DETAILS[aType] ?? FALLBACK_DETAILS.notes;
    return {
      targetSubjectId,
      title,
      summary: `${title.replace(/^记忆：/, "")}已保存为演示记忆，建议稍后在联网环境下重新分析以获得更完整内容。`,
      overview: details.detailIntro,
      detailIntro: details.detailIntro,
      detailSections: details.detailSections,
      aiKeyPoints: details.detailSections.flatMap(section => section.items).slice(0, 4).map(item => item.slice(0, 15)),
    };
  };

  const handleDeleteCard = async () => {
    if (!drawerCard) return;
    await removeCard(drawerCardSubject || activeSubject, drawerCardDate, drawerCard.id);
    setDrawerCard(null);
  };

  const applyNewCard = (
    targetSubjectId: string, newTitle: string, aiSummary: string,
    aType: string, capturedImg: string,
    overview?: string, detailIntro?: string, detailSections?: DetailSection[],
    aiKeyPoints?: string[], expandedKnowledge?: ExpandedKnowledge[],
    knowledgeTree?: KnowledgeNode[], nextAction?: string,
    skill?: string,
    skillRawSections?: string,
    hasAnnotations?: boolean,
    preassignedId?: string,
    unifiedDetail?: string,
    contentType?: CardContentType,
    homeworkTasks?: string[],
    taskDueDate?: string,
  ) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const todayKey = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,"0")}${now.getDate().toString().padStart(2,"0")}`;
    const newId = preassignedId ?? `new_${Date.now()}`;

    const surfaces = classifyCardSurfaces({
      contentType: contentType ?? "note",
      homeworkTasks,
      taskDueDate,
      nextAction,
    });

    const newCard: CardData = {
      id: newId,
      title: newTitle,
      img: capturedImg || (TYPE_BG[aType] ?? imgNotesBg),
      source: TYPE_SOURCE[aType] ?? "evernote",
      time: timeStr,
      skill: (skill as CardData["skill"]) ?? "theory_concept",
      contentType: surfaces.contentType,
      ...(surfaces.homeworkTasks?.length ? { homeworkTasks: surfaces.homeworkTasks } : {}),
      ...(surfaces.taskDueDate ? { taskDueDate: surfaces.taskDueDate } : {}),
      overview, detailIntro, detailSections, aiKeyPoints, expandedKnowledge, knowledgeTree, nextAction,
      hasAnnotations,
      ...(skillRawSections ? { skillRawSections } as Partial<CardData> : {}),
      ...(unifiedDetail ? { unifiedDetail } : {}),
    };

    setNewCardId(newId);
    setTimeout(() => setNewCardId(null), 3500);

    const subjectShort = INITIAL_SUBJECTS.find(s => s.id === targetSubjectId)?.short ?? "社会科学";
    addCard({ targetSubjectId, card: newCard, date: todayKey, aiSummary, subjectShort });

    // 后台静默：把新笔记自动归类到教学大纲条目，让它进入对应目录并打"新增"红点。
    // 失败/无把握时保持 syllabusEntryId 为空 → 仍留在「最近上传与批注」兜底。
    if (newCard.contentType !== "homework") {
      classifyNoteSyllabusEntry(
        {
          subjectId: targetSubjectId,
          contentType: newCard.contentType,
          title: newCard.title,
          overview: newCard.overview,
          detailIntro: newCard.detailIntro,
          detailSections: newCard.detailSections,
          aiKeyPoints: newCard.aiKeyPoints,
          unifiedDetail: newCard.unifiedDetail,
        },
        (prompt) => callText(prompt, { maxTokens: 512 }),
      )
        .then(entryId => {
          if (entryId) {
            updateCard(targetSubjectId, todayKey, newId, { syllabusEntryId: entryId, unread: true });
            setDrawerCard(prev => prev && prev.id === newId ? { ...prev, syllabusEntryId: entryId, unread: true } : prev);
          }
        })
        .catch(err => console.warn("[import] 大纲自动归类失败，留在最近上传", err));
    }

    // 后台静默：若导入时没识别出作业，再用专项链从笔记正文抽取夹带的作业/待办，
    // 让上传的笔记自动在「作业」Tab 生成可勾选 task（note-backed 闭环）。
    if (newCard.contentType !== "homework" && !(newCard.homeworkTasks?.length)) {
      extractHomeworkFromNote(
        {
          contentType: newCard.contentType,
          title: newCard.title,
          overview: newCard.overview,
          detailIntro: newCard.detailIntro,
          detailSections: newCard.detailSections,
          aiKeyPoints: newCard.aiKeyPoints,
          nextAction: newCard.nextAction,
          unifiedDetail: newCard.unifiedDetail,
        },
        todayKey,
        (prompt) => callText(prompt, { maxTokens: 700 }),
      )
        .then(({ tasks, dueDate }) => {
          if (tasks.length > 0) {
            updateCard(targetSubjectId, todayKey, newId, {
              homeworkTasks: tasks,
              ...(dueDate ? { taskDueDate: dueDate } : {}),
            });
            setDrawerCard(prev => prev && prev.id === newId
              ? { ...prev, homeworkTasks: tasks, ...(dueDate ? { taskDueDate: dueDate } : {}) }
              : prev);
          }
        })
        .catch(err => console.warn("[import] 作业抽取失败", err));
    }

    // 后台静默：把新笔记挂靠到备考考点图谱（挂不上就反向抽取新考点补图谱），
    // 让它出现在对应考点的「相关笔记」里（备考闭环）。
    if (newCard.contentType !== "homework") {
      linkOrProposeExamPoints(
        {
          subjectId: targetSubjectId,
          contentType: newCard.contentType,
          title: newCard.title,
          overview: newCard.overview,
          detailIntro: newCard.detailIntro,
          detailSections: newCard.detailSections,
          aiKeyPoints: newCard.aiKeyPoints,
          unifiedDetail: newCard.unifiedDetail,
        },
        (prompt) => callText(prompt, { maxTokens: 700 }),
      )
        .then(ids => {
          if (ids.length > 0) {
            updateCard(targetSubjectId, todayKey, newId, { linkedExamPointIds: ids });
            setDrawerCard(prev => prev && prev.id === newId ? { ...prev, linkedExamPointIds: ids } : prev);
          }
        })
        .catch(err => console.warn("[import] 备考考点挂靠失败", err));
    }

    if (activeSubject !== "all") {
      setActiveSubject(targetSubjectId);
    }
    setSidebarLoading(false);
  };

  /** Core image processing pipeline — calls server-side proxies, no keys in browser */
  const processImage = (
    imageDataUrl: string,
    hasAnnotations: boolean,
    aType: string,
    options?: { skipFly?: boolean },
  ) => {
    setSidebarLoading(true);
    if (!options?.skipFly) {
      setFlyImg(imageDataUrl);
      setFlyPhase("center");
      const t1 = setTimeout(() => setFlyPhase("corner"), 80);
      const t2 = setTimeout(() => setFlyPhase("fading"), 5200);
      const t3 = setTimeout(() => setFlyPhase("idle"), 5800);
      flyTimers.current.forEach(clearTimeout);
      flyTimers.current = [t1, t2, t3];
    }

    const loadStart = Date.now();
    const applyWithMinDelay = (fn: () => void) => {
      const elapsed = Date.now() - loadStart;
      setTimeout(fn, Math.max(0, 2500 - elapsed));
    };

    const preassignedId = `new_${Date.now()}`;

    callDoubao(imageDataUrl, hasAnnotations)
      .then(r => {
        let unifiedBuffer = "";
        let settled = false;

        const finalize = (detail: string | undefined) => {
          if (settled) return;
          settled = true;
          applyWithMinDelay(() => {
            applyNewCard(
              r.subjectId, r.title, r.summary, aType, imageDataUrl,
              r.overview, r.detailIntro, r.detailSections,
              r.aiKeyPoints, r.expandedKnowledge, r.knowledgeTree, r.nextAction,
              r.skill, undefined,
              hasAnnotations, preassignedId,
              detail,
              r.contentType,
              r.homeworkTasks,
              r.taskDueDate || undefined,
            );
            if (r.openTab === "homework") {
              setActiveTopTab("homework");
            } else {
              setActiveTopTab("notes");
            }
          });
        };

        const timeoutTimer = setTimeout(() => {
          console.warn("[streamDetail] DeepSeek 30s 超时，降级出卡");
          finalize(undefined);
        }, 30000);

        const prompt = buildDetailPagePrompt({
          skill: r.skill ?? "theory_concept",
          title: r.title,
          hasAnnotations,
          overview: r.overview ?? "",
          detailIntro: r.detailIntro ?? "",
          detailSections: r.detailSections ?? [],
          aiKeyPoints: r.aiKeyPoints ?? [],
        });

        streamText(
          prompt,
          (chunk) => { unifiedBuffer += chunk; },
          () => { clearTimeout(timeoutTimer); finalize(unifiedBuffer); },
        ).catch(err => {
          console.error("[streamDetail] streaming failed:", err);
          clearTimeout(timeoutTimer);
          finalize(undefined);
        });
      })
      .catch((err) => {
        console.error("[processImage] Doubao failed:", err);
        const fallback = buildFallbackCardPayload(aType);
        applyWithMinDelay(() => {
          applyNewCard(
            fallback.targetSubjectId,
            fallback.title,
            fallback.summary,
            aType,
            imageDataUrl,
            fallback.overview,
            fallback.detailIntro,
            fallback.detailSections,
            fallback.aiKeyPoints,
            [],
            [],
            "稍后可重新上传或重新批注，让 AI 生成更完整的知识分析。",
            "theory_concept",
            undefined,
            hasAnnotations,
            preassignedId,
            undefined,
            "note",
          );
          setSidebarLoading(false);
          if (!options?.skipFly) {
            setFlyPhase("fading");
            setTimeout(() => setFlyPhase("idle"), 600);
            flyTimers.current.forEach(clearTimeout);
          }
          showToast("AI 接口暂不可用，已用演示内容保存");
        });
      });
  };

  const handleSave = (imageDataUrl: string, hasAnnotations: boolean) => {
    const aType = annotationType ?? "notes";
    setAnnotationType(null);
    processImage(imageDataUrl, hasAnnotations, aType);
  };

  const readFileAsText = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target?.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target?.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const readFileAsArrayBuffer = (file: File) => new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

  /** 读取文件为纯 Base64 字符串（不含 data URI 前缀） */
  const readFileAsBase64 = async (file: File): Promise<string> => {
    const dataUrl = await readFileAsDataUrl(file);
    return dataUrl.split(",")[1] ?? "";
  };

  /**
   * 调用 /api/audio 进行火山引擎 ASR 转录，返回转录文本。
   * onProgress 用于在转录完成后、分析开始前更新 UI 提示。
   */
  const transcribeAudio = async (
    file: File,
    onProgress: (update: Partial<SourceDraft>) => void,
  ): Promise<string> => {
    const audioBase64 = await readFileAsBase64(file);
    const format = file.name.split(".").pop()?.toLowerCase() ?? "mp3";

    onProgress({ summary: "🎙 正在识别语音（约 20–60 秒），请稍候..." });

    const res = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, format, fileName: file.name }),
    });

    if (!res.ok) {
      let errMsg = `语音转录失败 (${res.status})`;
      try {
        const errData = await res.json() as { error?: string };
        if (errData.error) errMsg = errData.error;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    const data = await res.json() as { transcript?: string; error?: string };
    if (data.error) throw new Error(data.error);
    if (!data.transcript) throw new Error("语音转录返回空内容，请检查音频文件。");
    return data.transcript;
  };

  const extractPdfText = async (file: File) => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
    const data = await readFileAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pageTexts: string[] = [];
    const maxPages = Math.min(pdf.numPages, 20);
    for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const text = content.items
        .map(item => "str" in item ? item.str : "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) pageTexts.push(text);
    }
    const text = pageTexts.join("\n\n");
    if (!text.trim()) throw new Error("未能从 PDF 中抽取到可读文本，可能是扫描版 PDF。");
    return text;
  };

  const renderPdfFirstPageImage = async (file: File) => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
    const data = await readFileAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1.5, 1200 / Math.max(baseViewport.width, 1));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器暂时无法渲染 PDF 页面。");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  };

  const normalizeSubjectId = (id?: string) => subjects.some(s => s.id === id) ? id! : (activeSubject !== "all" && activeSubject !== "__pending__" ? activeSubject : "other");

  const callImportApi = async (payload: Record<string, unknown>) => {
    let res: Response;
    try {
      res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(
        "无法连接解析服务。请用 pnpm dev 或 pnpm start 启动项目（需配置 .env.local 中的 API Key）。",
      );
    }
    const raw = await res.text();
    let data: { error?: string } = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "解析接口未启动：请使用 pnpm dev（推荐）或 pnpm start，不要只用静态文件服务器。"
            : `解析服务异常（HTTP ${res.status}）`,
        );
      }
    }
    if (!res.ok) {
      const msg = data.error || "";
      if (msg.includes("not configured")) {
        throw new Error(
          `${msg}。请在项目根目录创建 .env.local 并配置 DOUBAO_API_KEY / DEEPSEEK_API_KEY（可参考 .env.local.example）。`,
        );
      }
      if (msg.includes("InvalidEndpointOrModel") || msg.includes("ModelNotOpen") || msg.includes("does not exist")) {
        throw new Error(
          `豆包视觉模型不可用：请把 .env.local 里的 DOUBAO_MODEL_ID 改成你在火山方舟已开通的「视觉」接入点 ID（当前账号已验证可用：doubao-seed-1-6-vision-250815）。原始错误：${msg}`,
        );
      }
      throw new Error(msg || `解析失败（HTTP ${res.status}）`);
    }
    return data as Partial<SourceDraft> & { targetSubjectId?: string };
  };

  const sourceDraftFromImport = (
    data: Partial<SourceDraft> & { targetSubjectId?: string },
    sourceKind: SourceDraft["sourceKind"],
    originalName: string,
  ): SourceDraft => {
    return {
      id: `draft_${Date.now()}`,
      status: "ready",
      sourceKind,
      originalName,
      title: data.title || "记忆：导入资料整理",
      summary: data.summary || "资料已解析完成，可确认保存为记忆卡。",
      targetSubjectId: normalizeSubjectId(data.targetSubjectId),
      img: data.img || (sourceKind === "text" || sourceKind === "link" ? TYPE_BG.notes ?? imgNotesBg : undefined),
      overview: data.overview,
      detailIntro: data.detailIntro,
      detailSections: Array.isArray(data.detailSections) ? data.detailSections : [],
      aiKeyPoints: Array.isArray(data.aiKeyPoints) ? data.aiKeyPoints : [],
      expandedKnowledge: Array.isArray(data.expandedKnowledge) ? data.expandedKnowledge : [],
      knowledgeTree: Array.isArray(data.knowledgeTree) ? data.knowledgeTree : [],
      nextAction: data.nextAction,
      skill: data.skill,
      ...(() => {
        const surfaces = classifyCardSurfaces({
          contentType: data.contentType,
          homeworkTasks: data.homeworkTasks,
          taskDueDate: data.taskDueDate,
          nextAction: data.nextAction,
        });
        return {
          contentType: surfaces.contentType,
          homeworkTasks: surfaces.homeworkTasks,
          taskDueDate: surfaces.taskDueDate,
          openTab: (data as { openTab?: "homework" | null }).openTab ?? surfaces.openTab,
        };
      })(),
    };
  };

  const analyzeTextSource = async (kind: "link" | "text", value: string): Promise<SourceDraft> => {
    const data = await callImportApi({ kind, value, fileName: kind === "link" ? value : undefined });
    return sourceDraftFromImport(data, kind, kind === "link" ? value : "粘贴文本");
  };

  const analyzeSourceFile = async (
    file: File,
    onProgress: (update: Partial<SourceDraft>) => void = () => undefined,
  ): Promise<SourceDraft> => {
    // 音频：先转录，再分析
    if (isAudioFile(file)) {
      const transcript = await transcribeAudio(file, onProgress);
      onProgress({ summary: "🔍 转录完成，正在分析内容..." });
      const prefix = `[来源：语音录音]\n文件名：${file.name}\n\n`;
      const draft = await analyzeTextSource("text", `${prefix}${transcript}`);
      return { ...draft, sourceKind: "audio", transcript };
    }

    if (file.type.startsWith("image/")) {
      const imageDataUrl = await readFileAsDataUrl(file);
      const compressedImage = await compressImageForApi(imageDataUrl);
      const data = await callImportApi({ kind: "image", imageDataUrl: compressedImage, fileName: file.name });
      return sourceDraftFromImport(data, "image", file.name);
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const text = await extractPdfText(file);
        return analyzeTextSource("text", `文件名：${file.name}\n\n${text}`);
      } catch (textErr) {
        console.warn("[pdf] text extraction failed, fallback to vision", textErr);
        const imageDataUrl = await compressImageForApi(await renderPdfFirstPageImage(file));
        const data = await callImportApi({ kind: "image", imageDataUrl, fileName: file.name });
        return sourceDraftFromImport(data, "file", file.name);
      }
    }

    if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await readFileAsText(file);
      return analyzeTextSource("text", text);
    }

    throw new Error("当前演示版先支持图片、PDF、txt、md 及音频；Word 下一步接服务端解析。");
  };

  const confirmSourceDraft = (draft: SourceDraft) => {
    const preassignedId = `new_${Date.now()}`;
    const now = new Date();
    const todayKey = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;

    applyNewCard(
      draft.targetSubjectId,
      draft.title,
      draft.summary,
      "notes",
      draft.img || imgNotesBg,
      draft.overview,
      draft.detailIntro,
      draft.detailSections,
      draft.aiKeyPoints,
      draft.expandedKnowledge ?? [],
      draft.knowledgeTree ?? [],
      draft.nextAction || "资料已保存，可继续生成习题、查看知识脉络或补充批注。",
      draft.skill,
      undefined,
      false,
      preassignedId,
      undefined,
      draft.contentType,
      draft.homeworkTasks,
      draft.taskDueDate,
    );
    if (draft.openTab === "homework") setActiveTopTab("homework");
    else setActiveTopTab("notes");
    const tabHint =
      draft.openTab === "homework"
        ? "已保存至笔记，并在作业中生成待办"
        : "已保存至笔记";
    showToast(`${tabHint}，AI 正在后台生成详情`);

    // 后台静默预生成详情页内容（DeepSeek），完成后回写卡片，用户下次打开即可直接查看
    const prompt = buildDetailPagePrompt({
      skill: draft.skill ?? "theory_concept",
      title: draft.title,
      hasAnnotations: false,
      overview: draft.overview ?? "",
      detailIntro: draft.detailIntro ?? "",
      detailSections: draft.detailSections ?? [],
      aiKeyPoints: draft.aiKeyPoints ?? [],
    });
    let buffer = "";
    streamText(
      prompt,
      (chunk) => { buffer += chunk; },
      () => {
        if (buffer.trim()) {
          updateCard(draft.targetSubjectId, todayKey, preassignedId, { unifiedDetail: buffer });
          setDrawerCard(prev => prev && prev.id === preassignedId ? { ...prev, unifiedDetail: buffer } : prev);
        }
      },
    ).catch(err => console.warn("[import] 后台预生成详情失败，留待打开详情时再生成", err));
  };

  const handleCreateSubject = () => {
    const name = newSubjectName.trim();
    if (!name) {
      showToast("请输入学科名称");
      return;
    }
    const idBase = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
    const id = `custom_${idBase || Date.now()}_${Date.now().toString(36)}`;
    addSubject({
      id,
      name: `${name}笔记`,
      short: name.slice(0, 6),
      count: 0,
      unit: "条记忆",
      entries: [],
      extra: "刚刚创建 · 0个知识点",
    });
    setNewSubjectName("");
    setShowCreateSubject(false);
    setActiveSubject(id);
  };

  const handleMoveDrawerCard = async (targetSubjectId: string) => {
    if (!drawerCard || !drawerCardDate || !drawerCardSubject) return;
    await moveCardToSubject(drawerCard.id, drawerCardSubject, drawerCardDate, targetSubjectId);
    setDrawerCardSubject(targetSubjectId);
    if (activeSubject !== "all") setActiveSubject(targetSubjectId);
  };

  useEffect(() => { return () => flyTimers.current.forEach(clearTimeout); }, []);

  return (
    <ApiConfigProvider>
      <div className="fixed inset-0 flex overflow-hidden bg-[#F5F6FA]">
        {dbLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F5F6FA]">
            <div className="flex flex-col items-center gap-3">
              <img src={imgLoadingSpinner} width={36} height={36}
                style={{ animation: "spin-loading 1s linear infinite" }} alt="loading" />
              <span className="text-[13px] text-[#7B8291]">加载中...</span>
            </div>
          </div>
        )}

        <Sidebar
          activeSubject={activeSubject}
          onSelectSubject={(id) => { didInitSubjectRef.current = true; setActiveSubject(id); }}
          isLoading={sidebarLoading}
          subjects={sortedSubjects}
          onOpenSearch={() => setShowSearch(true)}
          onUploadFile={() => setShowAddSource(true)}
          onCreateSubject={() => setShowCreateSubject(true)}
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F6FA]">
          {subject ? (
            <>
              {/* 学科头部 */}
              <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2 flex-shrink-0">
                <div className="min-w-0">
                  <EditableSubjectName
                    name={subject?.name ?? ""}
                    onRename={(next) => { if (subject) updateSubject({ ...subject, name: next }); }}
                  />
                  <p className="text-[13px] text-[#7B8291] mt-1">{subject?.extra ?? ""}</p>
                </div>
                <AnnotationMenu
                  onOpenAnnotation={handleOpenAnnotation}
                  onOpenPdfReader={(file) => setPdfReaderFile(file)}
                  onOpenCamera={() => setShowCamera(true)}
                  onOpenScreenshot={() => setShowScreenshot(true)}
                  onOpenVoice={() => setShowVoice(true)}
                  onOpenDemo={() => setOnboardingMode("demo")}
                />
              </div>

              <TopTabs
                activeTab={activeTopTab}
                onChangeTab={setActiveTopTab}
              />

              {activeTopTab === "notes" && (
                <SyllabusNotesView
                  subject={subject}
                  feedGroups={feedGroups}
                  onOpenCard={handleOpenCard}
                  onOpenEntry={handleOpenSyllabusEntry}
                  newCardId={newCardId}
                />
              )}

              {activeTopTab === "homework" && (
                <HomeworkView
                  subject={subject}
                  feedGroups={feedGroups}
                  onUpdateCard={(cardId, date, updates) =>
                    updateCard(activeSubject, date, cardId, updates)
                  }
                  onUploadCheck={() => setShowAddSource(true)}
                />
              )}

              {activeTopTab === "exam" && (
                <ExamPrepView
                  subject={subject}
                  feedGroups={examNoteFeedGroups}
                  onOpenNote={(card, date) => handleOpenCard(card as CardData, date)}
                  onAskLlm={(prompt) => callTextStreamed(prompt, { maxTokens: 4000 })}
                />
              )}
            </>
          ) : null}
        </main>

        <RightDrawer
          card={drawerCard}
          onClose={() => setDrawerCard(null)}
          onDelete={handleDeleteCard}
          unifiedContent={drawerCard?.unifiedDetail ?? ""}
          onUpdateCard={(cardId, updates) => {
            setDrawerCard(prev => prev && prev.id === cardId ? { ...prev, ...updates } : prev);
            updateCard(drawerCardSubject || activeSubject, drawerCardDate, cardId, updates);
          }}
          subjects={subjects}
          currentSubjectId={drawerCardSubject}
          onMoveSubject={handleMoveDrawerCard}
        />

        <SearchOverlay
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          allFeedGroups={allFeedGroups}
          subjects={subjects}
          onUpdateCard={(subjectId, date, cardId, updates) => updateCard(subjectId, date, cardId, updates)}
        />

        <AddSourceModal
          isOpen={showAddSource}
          subjects={sortedSubjects}
          onClose={() => setShowAddSource(false)}
          onAnalyzeFile={analyzeSourceFile}
          onConfirmDraft={confirmSourceDraft}
        />

        {showCreateSubject && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/35" onClick={() => setShowCreateSubject(false)}>
            <div className="w-[360px] rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
              <p className="text-[16px] text-[#020418]" style={{ fontWeight: 700 }}>新建学科</p>
              <p className="text-[12px] text-[#7B8291] mt-1">用于整理 AI 识别不准或你自定义的学习分类。</p>
              <input
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                autoFocus
                placeholder="例如：电路、考研政治、数据结构"
                className="mt-4 w-full rounded-2xl border border-[#EAEDF2] px-4 py-3 text-[14px] outline-none focus:border-[#4D5CFF]"
                onKeyDown={e => { if (e.key === "Enter") handleCreateSubject(); }}
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateSubject(false)}
                  className="rounded-xl px-4 py-2 text-[13px] text-[#7B8291] hover:bg-[#F5F6FA]"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateSubject}
                  className="rounded-xl bg-[#4D5CFF] px-4 py-2 text-[13px] text-white"
                  style={{ fontWeight: 700 }}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none transition-all duration-300"
          style={{ opacity: toast ? 1 : 0, transform: `translateX(-50%) translateY(${toast ? "0px" : "12px"})` }}
        >
          <div className="bg-[#1C1C1E] text-white text-[13px] px-4 py-2.5 rounded-2xl shadow-lg" style={{ fontWeight: 500 }}>
            {toast}
          </div>
        </div>
      </div>

      {/* 引导页：首次加载（first）或点"场景 Demo"（demo）时出现 */}
      {onboardingMode && (
        <OnboardingScreen
          mode={onboardingMode}
          onEnter={() => {
            if (onboardingMode === "first") {
              localStorage.setItem("imemo_onboarded", "1");
            }
            setOnboardingMode(null);
          }}
          onOpenCircle={() => demoPdfInputRef.current?.click()}
          onOpenScreenshot={() => setShowScreenshot(true)}
          onOpenCamera={() => setShowCamera(true)}
          onOpenVoice={() => setShowVoice(true)}
        />
      )}

      {/* ── 功能 Modal：放在 OnboardingScreen 之后，确保在引导页之上 ── */}
      {annotationType && (
        <AnnotationModal
          type={annotationType}
          onClose={handleCloseAnnotation}
          onSave={handleSave}
        />
      )}

      {pdfReaderFile && (
        <PdfReaderModal
          file={pdfReaderFile}
          onClose={() => setPdfReaderFile(null)}
          onSavePage={(imageDataUrl, hasAnnotations) => {
            processImage(imageDataUrl, hasAnnotations, "notes", { skipFly: true });
          }}
        />
      )}

      {showCamera && (
        <CameraModal
          onClose={() => setShowCamera(false)}
          onSave={(imageDataUrl) => {
            processImage(imageDataUrl, false, "notes");
          }}
        />
      )}

      {showScreenshot && (
        <ScreenshotModeModal
          onClose={() => setShowScreenshot(false)}
          onSave={(imageDataUrl) => {
            processImage(imageDataUrl, false, "notes");
          }}
        />
      )}

      {showVoice && (
        <VoiceModal
          onClose={() => setShowVoice(false)}
          onSave={(transcript) => {
            // 不关闭录音页面，让 FlyThumbnail 浮现在录音页上方
            const now = new Date();
            const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,"0")}/${now.getDate().toString().padStart(2,"0")}`;
            analyzeTextSource("text", `[来源：实时录音 ${dateStr}]\n\n${transcript}`)
              .then(draft => confirmSourceDraft(draft))
              .catch(err => {
                console.warn("[voice] import failed, saving as plain note", err);
                applyNewCard(
                  activeSubject !== "all" && activeSubject !== "__pending__" ? activeSubject : "other",
                  "语音记录：" + transcript.slice(0, 20) + "…",
                  transcript.slice(0, 80),
                  "notes", imgNotesBg,
                  transcript, undefined, [], [], [], [], undefined,
                  "theory_concept", undefined, false, undefined, transcript,
                );
              });
            // 录音保存：页面内显示"已保存"即可，不触发飞入动画
          }}
        />
      )}

      {/* FlyThumbnail 必须放在所有 Modal 之后才能浮在最顶层 */}
      <FlyThumbnail phase={flyPhase} imgSrc={flyImg} />

      {/* 圈注 Demo 的 PDF 文件选择器（隐藏） */}
      <input
        ref={demoPdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPdfReaderFile(file);
          e.target.value = "";
        }}
      />
    </ApiConfigProvider>
  );
}
