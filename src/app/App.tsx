import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

import type { CardContentType, DetailSection, ExpandedKnowledge, KnowledgeNode, CardData, FeedGroup as FeedGroupType, IngestionDecision, LearningAction, LearningContext, SourceDocument, SubjectData } from "../types";
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
import { useAutoMergeDuplicates } from "../hooks/useAutoMergeDuplicates";
import { buildDetailPagePrompt } from "../prompts";
import { ApiConfigProvider } from "../context/ApiConfigContext";
import { AnnotationModal } from "../features/annotation/AnnotationModal";
import { SyllabusNotesView } from "../features/feed/SyllabusNotesView";
import { TopTabs, type TopTabId } from "../features/feed/TopTabs";
import { AnnotationMenu } from "../features/feed/AnnotationMenu";
import { PdfReaderModal } from "../features/pdf-reader/PdfReaderModal";
import { CameraModal } from "../features/camera/CameraModal";
import { CameraAgentModal } from "../features/camera/cameraAgent/CameraAgentModal";
import { isCameraAgentEnabled } from "../features/camera/cameraAgent/config";
import { DEMO_CAMERA_IMAGE } from "../features/camera/cameraAgent/demoCamera";
import {
  fakeDoubaoDelay,
  fakeStreamUnifiedDetail,
  getDemoDoubaoResult,
} from "../features/camera/cameraAgent/demoCameraPipeline";
import type { SourceAnchor } from "../types";
import { recallSimilarMemories, findCardBySourceAnchor, findCardById, iterateAllCards, type RecalledMemory } from "../utils/memoryRecall";
import { cardDedupeKey } from "../utils/cardDedupe";
import { findCardByDedupeKey, purgeDuplicatesExcept } from "../utils/memoryMerge";
import { ScreenshotModeModal } from "../features/screenshot/ScreenshotModeModal";
import { DEMO_SCREENSHOT_ANCHOR, DEMO_SCREENSHOT_CARD_ID, sourceAnchorKey } from "../features/screenshot/constants";
import { VoiceModal } from "../features/voice/VoiceModal";
import { isDemoTranscript } from "../features/voice/demoTranscript";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { FormFillModal } from "../features/form-fill/FormFillModal";
import { PenContextProvider, PenSceneSync } from "../features/pen-context";
import { HomeworkView } from "../features/feed/HomeworkView";
import { ExamPrepView } from "../modules/exam-prep";
import { PaperView } from "../features/feed/PaperView";
import { StudyView } from "../features/feed/StudyView";
import {
  cleanCourseName,
  loadTimetable,
  loadTimetables,
  parseTimetableFile,
  saveTimetable,
  selectTimetableSemester,
  type TimetableCourse,
  type TimetableData,
} from "../features/study/timetable";
import { filterNoteFeedGroups, isNoteCard } from "../utils/feedFilters";
import { EditableSubjectName } from "../features/feed/EditableSubjectName";
import { SUBJECT_SYLLABI } from "../data/subjectSyllabi";
import { normalizeSourceRouting, type RawSourceRouting } from "../utils/sourceRouting";
import { RightDrawer } from "../features/drawer/RightDrawer";
import { SearchOverlay } from "../features/search/SearchOverlay";
import { Sidebar } from "../features/sidebar/Sidebar";
import { AddSourceModal, type SourceDraft, isAudioFile } from "../features/source/AddSourceModal";
import { FlyThumbnail } from "../shared/FlyThumbnail";
import { parsePptxFile, pptxDocumentText } from "../utils/pptx";

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

function legacySubjectIdForCourse(courseName?: string): string | null {
  if (!courseName) return null;
  if (/物理/.test(courseName) && !/实验/.test(courseName)) return "physics";
  if (/高等数学|数学分析|微积分|概率论|数理统计/.test(courseName)) return "math";
  if (/大学英语|英语/.test(courseName)) return "english";
  if (/大学化学|化学/.test(courseName)) return "chemistry";
  return null;
}

interface DetectedSubjectRoute {
  id: string;
  name: string;
}

function stableDetectedSubjectId(name: string): string {
  let hash = 2166136261;
  for (const char of name.trim()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `detected_${(hash >>> 0).toString(36)}`;
}

function detectedSubjectRoute(
  searchableText: string,
  suggestedName?: string,
): DetectedSubjectRoute | null {
  const text = `${suggestedName ?? ""} ${searchableText}`.trim();
  if (/高等数学|数学分析|微积分|曲线积分|重积分|极限|导数|定积分/.test(text)) {
    return { id: "math", name: "高等数学" };
  }
  if (/大学物理|力学|电磁学|热力学|光学|振动|波动/.test(text)) {
    return { id: "physics", name: "大学物理(2)" };
  }
  if (/大学英语|英语/.test(text)) return { id: "english", name: "大学英语" };
  if (/大学化学|无机化学|有机化学|化学/.test(text)) {
    return { id: "chemistry", name: "大学化学" };
  }
  if (/节点电压|节点分析|回路电流|网孔电流|支路电流|基尔霍夫|受控源|电路方程|电路分析/.test(text)) {
    return { id: "detected_electrical_circuits", name: "电路分析" };
  }

  const cleanName = suggestedName?.trim();
  if (
    cleanName
    && !/^(其他|其它|专业课|课程资料|未知|综合|社会科学|人文社科|other)$/i.test(cleanName)
  ) {
    return { id: stableDetectedSubjectId(cleanName), name: cleanName };
  }
  return null;
}

function detectedSubjectForCard(card: CardData): DetectedSubjectRoute | null {
  const searchableText = [
    card.ingestionDecision?.subjectName,
    card.ingestionDecision?.courseName,
    ...(card.ingestionDecision?.knowledgePoints ?? []),
    card.title,
    card.overview,
    card.detailIntro,
    card.learningContext?.chapter,
  ].filter(Boolean).join(" ");
  return detectedSubjectRoute(searchableText, card.ingestionDecision?.subjectName);
}

async function fileContentId(file: File): Promise<string> {
  try {
    const sampleSize = 64 * 1024;
    const head = new Uint8Array(await file.slice(0, sampleSize).arrayBuffer());
    const tailStart = Math.max(0, file.size - sampleSize);
    const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
    const sample = new Uint8Array(head.length + tail.length + 8);
    sample.set(head, 0);
    sample.set(tail, head.length);
    new DataView(sample.buffer).setBigUint64(head.length + tail.length, BigInt(file.size));
    const digest = await crypto.subtle.digest("SHA-256", sample);
    return Array.from(new Uint8Array(digest).slice(0, 12))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${file.size}-${file.lastModified}`;
  }
}

export default function App() {
  const {
    allFeedGroups, subjects, isLoading: dbLoading,
    toast, addCard, removeCard, removeCardSilent, restoreMergedCards,
    updateCard, addSubject, updateSubject, moveCardToSubject, showToast,
  } = useMemoryDB();

  const [mergeTick, setMergeTick] = useState(0);

  useAutoMergeDuplicates({
    allFeedGroups,
    dbLoading,
    mergeTick,
    removeCardSilent,
    restoreMergedCards,
    showToast,
  });

  const [activeSubject, setActiveSubject] = useState<string>("__pending__");
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>("study");
  const [focusedSyllabusEntryId, setFocusedSyllabusEntryId] = useState<string | null>(null);
  const [annotationType, setAnnotationType] = useState<string | null>(null);
  const [drawerCard, setDrawerCard] = useState<CardData | null>(null);
  const [drawerCardDate, setDrawerCardDate] = useState<string>("");
  const [drawerCardSubject, setDrawerCardSubject] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [timetables, setTimetables] = useState<TimetableData[]>(() => loadTimetables());
  const [timetable, setTimetable] = useState<TimetableData | null>(() => loadTimetable());
  const [pdfReaderFile, setPdfReaderFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [screenshotMergeNotice, setScreenshotMergeNotice] = useState<{
    message: string;
    onUndo: () => void;
  } | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const [showFormFill, setShowFormFill] = useState(false);
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
  const allFeedGroupsRef = useRef(allFeedGroups);
  const savedByAnchorRef = useRef(new Map<string, { subjectId: string; date: string; card: CardData }>());
  const screenshotSaveCountRef = useRef(0);
  allFeedGroupsRef.current = allFeedGroups;

  useEffect(() => {
    if (dbLoading) return;
    iterateAllCards(allFeedGroups, (card, subjectId, date) => {
      if (card.sourceAnchor?.fileId) {
        savedByAnchorRef.current.set(sourceAnchorKey(card.sourceAnchor), { subjectId, date, card });
      }
    });
    const demoHit = findCardById(allFeedGroups, DEMO_SCREENSHOT_CARD_ID)
      ?? findCardBySourceAnchor(allFeedGroups, DEMO_SCREENSHOT_ANCHOR);
    screenshotSaveCountRef.current = demoHit ? 1 : 0;
  }, [dbLoading, allFeedGroups]);

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => {
      const latestDate = (id: string) =>
        Math.max(...(allFeedGroups[id] ?? []).map(g => parseInt(g.date) || 0), 0);
      return latestDate(b.id) - latestDate(a.id);
    });
  }, [subjects, allFeedGroups]);

  const timetableSubjects = useMemo<SubjectData[]>(() => {
    if (!timetable) return [];
    const uniqueCourses = new Map<string, TimetableCourse>();
    timetable.courses.forEach(course => {
      if (!uniqueCourses.has(course.courseId)) uniqueCourses.set(course.courseId, course);
    });

    return Array.from(uniqueCourses.values())
      .map(course => {
      const courseName = cleanCourseName(course.course);
      const linkedCardIds = new Set(
        Object.entries(allFeedGroups).flatMap(([subjectId, groups]) =>
          (groups ?? []).flatMap(group =>
            group.cards.filter(card =>
              isNoteCard(card) && (
              subjectId === course.courseId
              || subjectId === legacySubjectIdForCourse(courseName)
              || card.learningContext?.courseId === course.courseId
              )
            ).map(card => card.id)
          )
        ),
      );
      const linkedCount = linkedCardIds.size;
      const meta = [course.teacher, course.weeks].filter(Boolean).join(" · ");
      return {
        id: course.courseId,
        name: courseName,
        short: courseName,
        count: linkedCount,
        unit: "条内容",
        entries: [],
        extra: `课程 · ${meta || "已加入学期课表"}`,
      };
      })
      .filter(course => course.count > 0);
  }, [timetable, allFeedGroups]);

  const detectedSubjects = useMemo<SubjectData[]>(() => {
    if (!timetable) return [];
    const timetableCourseIds = new Set(timetable.courses.map(course => course.courseId));
    const representedLegacyIds = new Set(
      timetable.courses
        .map(course => legacySubjectIdForCourse(cleanCourseName(course.course)))
        .filter((id): id is string => !!id),
    );
    return sortedSubjects.flatMap(subjectItem => {
      if (timetableCourseIds.has(subjectItem.id) || representedLegacyIds.has(subjectItem.id)) return [];
      const uploadedCards = (allFeedGroups[subjectItem.id] ?? [])
        .flatMap(group => group.cards)
        .filter(card =>
          isNoteCard(card)
          && !!card.sourceAnchor
          && card.ingestionDecision?.validCourseContent !== false,
        );
      const count = new Set(uploadedCards.map(card => card.id)).size;
      if (count === 0) return [];
      return [{
        ...subjectItem,
        count,
        unit: "条内容",
        extra: "由上传资料自动识别",
      }];
    });
  }, [timetable, sortedSubjects, allFeedGroups]);

  const sidebarSubjects = timetable
    ? [...timetableSubjects, ...detectedSubjects]
    : sortedSubjects;

  // 修复历史上被“当前选中课程”覆盖归属的上传资料。
  // 仅处理带原始来源且能明确判断学科的卡片，不改动用户手工创建的内容。
  const routeRepairingCardsRef = useRef(new Set<string>());
  useEffect(() => {
    if (dbLoading) return;
    Object.entries(allFeedGroups).forEach(([storedSubjectId, groups]) => {
      groups.forEach(group => {
        group.cards.forEach(card => {
          if (!isNoteCard(card) || !card.sourceAnchor) return;
          const detectedSubject = detectedSubjectForCard(card);
          if (!detectedSubject) return;
          const detectedSubjectId = detectedSubject.id;

          const validEntryIds = new Set(
            SUBJECT_SYLLABI[detectedSubjectId]?.nodes.map(node => node.id) ?? [],
          );
          const hasForeignSyllabusEntry = !!card.syllabusEntryId
            && !validEntryIds.has(card.syllabusEntryId);
          if (detectedSubjectId === storedSubjectId) {
            if (hasForeignSyllabusEntry) {
              updateCard(storedSubjectId, group.date, card.id, {
                syllabusEntryId: undefined,
                unread: true,
              });
            }
            return;
          }

          const storedCourse = timetable?.courses.find(course => course.courseId === storedSubjectId);
          if (storedCourse && legacySubjectIdForCourse(storedCourse.course) === detectedSubjectId) return;

          const repairKey = `${storedSubjectId}:${group.date}:${card.id}:${detectedSubjectId}`;
          if (routeRepairingCardsRef.current.has(repairKey)) return;
          routeRepairingCardsRef.current.add(repairKey);

          if (!subjects.some(subject => subject.id === detectedSubjectId)) {
            addSubject({
              id: detectedSubjectId,
              name: detectedSubject.name,
              short: detectedSubject.name,
              count: 0,
              unit: "条内容",
              entries: [],
              extra: "由上传资料自动识别",
            }, { silent: true });
          }

          void moveCardToSubject(card.id, storedSubjectId, group.date, detectedSubjectId)
            .then(() => {
              const context = card.learningContext;
              if (!context?.courseId) return;
              updateCard(detectedSubjectId, group.date, card.id, {
                syllabusEntryId: undefined,
                unread: true,
                learningContext: {
                  chapter: context.chapter,
                  phase: context.phase,
                  sourceRole: context.sourceRole,
                  capabilities: context.capabilities,
                },
              });
            })
            .finally(() => routeRepairingCardsRef.current.delete(repairKey));
        });
      });
    });
  }, [dbLoading, allFeedGroups, timetable, subjects, addSubject, moveCardToSubject, updateCard]);

  useEffect(() => {
    if (dbLoading || timetableSubjects.length === 0) return;
    const existingIds = new Set(subjects.map(item => item.id));
    timetableSubjects.forEach(courseSubject => {
      if (!existingIds.has(courseSubject.id)) addSubject(courseSubject, { silent: true });
    });
  }, [dbLoading, timetableSubjects, subjects, addSubject]);

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
    if (tab === "study" || tab === "notes" || tab === "homework" || tab === "exam" || tab === "paper") {
      setActiveTopTab(tab);
    }
    const subject = params.get("subject");
    if (subject && subjects.some(s => s.id === subject)) {
      didInitSubjectRef.current = true;
      setActiveSubject(subject);
    }
  }, [subjects]);

  const activeCourseForView = timetable?.courses.find(course => course.courseId === activeSubject);
  const subject = subjects.find(s => s.id === activeSubject)
    ?? (activeCourseForView
      ? {
          id: activeCourseForView.courseId,
          name: cleanCourseName(activeCourseForView.course),
          short: cleanCourseName(activeCourseForView.course),
          count: 0,
          unit: "条内容",
          entries: [],
          extra: "来自学期课表",
        }
      : subjects[0]);
  const examSubjectId = legacySubjectIdForCourse(activeCourseForView?.course) ?? subject?.id;
  const examSubject = subject && examSubjectId
    ? { ...subject, id: examSubjectId }
    : subject;
  const feedGroups = useMemo(() => {
    const activeCourse = timetable?.courses.find(course => course.courseId === activeSubject);
    if (!activeCourse) return allFeedGroups[activeSubject] ?? [];

    const legacySubjectId = legacySubjectIdForCourse(activeCourse.course);
    const candidateGroups = [
      ...(allFeedGroups[activeSubject] ?? []),
      ...(legacySubjectId ? (allFeedGroups[legacySubjectId] ?? []) : []),
      ...Object.values(allFeedGroups).flatMap(groups =>
        (groups ?? []).map(group => ({
          ...group,
          cards: group.cards.filter(card => card.learningContext?.courseId === activeSubject),
        })).filter(group => group.cards.length > 0)
      ),
    ];
    const byDate = new Map<string, FeedGroupType>();
    candidateGroups.forEach(group => {
      const existing = byDate.get(group.date);
      const cards = [...(existing?.cards ?? []), ...group.cards];
      const uniqueCards = Array.from(new Map(cards.map(card => [card.id, card])).values());
      byDate.set(group.date, {
        ...group,
        cards: uniqueCards,
        label: `新增了${uniqueCards.length}个记忆`,
      });
    });
    return Array.from(byDate.values()).sort((a, b) => Number(b.date) - Number(a.date));
  }, [activeSubject, allFeedGroups, timetable]);

  const examNoteFeedGroups = useMemo(
    () => filterNoteFeedGroups(feedGroups),
    [feedGroups],
  );

  const handleOpenAnnotation = (type: string) => setAnnotationType(type);
  const handleCloseAnnotation = () => setAnnotationType(null);

  const handleOpenCard = (card: CardData, date: string, subjectId?: string) => {
    const actualSubjectId = subjectId ?? Object.entries(allFeedGroups).find(([, groups]) =>
      groups?.some(group => group.cards.some(item => item.id === card.id))
    )?.[0] ?? activeSubject;
    setDrawerCard(card);
    setDrawerCardDate(date);
    setDrawerCardSubject(actualSubjectId);
  };

  const handleOpenRecalledCard = (item: RecalledMemory) => {
    handleOpenCard(item.card, item.date, item.subjectId);
  };

  /** 用户点击某个大纲条目：清除该条目下所有笔记的"新增未读"红点 */
  const handleOpenSyllabusEntry = (entryId: string) => {
    const unreadCards = cardsForSyllabusEntry(feedGroups, entryId).filter(({ card }) => card.unread);
    if (unreadCards.length === 0) return;
    for (const { card, date } of unreadCards) {
      const sourceSubjectId = Object.entries(allFeedGroups).find(([, groups]) =>
        groups?.some(group => group.cards.some(item => item.id === card.id))
      )?.[0] ?? activeSubject;
      updateCard(sourceSubjectId, date, card.id, { unread: false });
    }
  };

  const buildFallbackCardPayload = (aType: string) => {
    const targetSubjectId = FALLBACK_CLASSIFY[aType] ?? "other";
    const titles = FALLBACK_TITLES[aType] ?? FALLBACK_TITLES.notes;
    const title = titles[0] ?? "记忆：学习内容整理";
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

  const rememberSavedCard = (
    anchor: SourceAnchor | undefined,
    subjectId: string,
    date: string,
    card: CardData,
  ) => {
    if (anchor?.fileId) {
      savedByAnchorRef.current.set(sourceAnchorKey(anchor), { subjectId, date, card });
    }
  };

  const lookupExistingCard = (
    sourceAnchor?: SourceAnchor,
    cardId?: string,
  ): { card: CardData; subjectId: string; date: string } | null => {
    const feeds = allFeedGroupsRef.current;
    if (sourceAnchor?.fileId) {
      const reg = savedByAnchorRef.current.get(sourceAnchorKey(sourceAnchor));
      if (reg) return reg;
      const hit = findCardBySourceAnchor(feeds, sourceAnchor);
      if (hit) return hit;
    }
    if (cardId) {
      const hit = findCardById(feeds, cardId);
      if (hit) return hit;
    }
    return null;
  };

  const applyNewCard = async (
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
    sourceAnchor?: SourceAnchor,
    learningContext?: LearningContext,
    sourceDocument?: SourceDocument,
    ingestionDecision?: IngestionDecision,
    learningActions?: LearningAction[],
    syllabusEntryId?: string,
  ): Promise<"created" | "updated"> => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    // 导入资料已有 AI 学科判断时，只允许明确匹配到的课表课程覆盖归属。
    // 不能因为用户上传前停留在某门课程，就把“高等数学”错误保存到“大学物理”。
    const inheritedActiveCourseId = !learningContext && !ingestionDecision
      ? activeSubject
      : undefined;
    const activeCourse = timetable?.courses.find(course =>
      course.courseId === (learningContext?.courseId ?? inheritedActiveCourseId),
    );
    if (activeCourse) {
      targetSubjectId = activeCourse.courseId;
      learningContext = {
        ...learningContext,
        courseId: activeCourse.courseId,
        course: activeCourse.course,
        classTime: learningContext?.classTime ?? `${activeCourse.day} ${activeCourse.time}—${activeCourse.end}`,
        location: learningContext?.location ?? activeCourse.room,
        phase: learningContext?.phase ?? (hasAnnotations ? "in_class" : "after_class"),
        sourceRole: learningContext?.sourceRole ?? "student",
        capabilities: {
          knowledgeMap: true,
          interactive: learningContext?.capabilities?.interactive ?? false,
        },
      };
    }

    const surfaces = classifyCardSurfaces({
      contentType: contentType ?? "note",
      homeworkTasks,
      taskDueDate,
      nextAction,
    });

    const upsertCardFields = {
      img: capturedImg || (TYPE_BG[aType] ?? imgNotesBg),
      overview,
      detailIntro,
      detailSections,
      aiKeyPoints,
      expandedKnowledge,
      knowledgeTree,
      nextAction,
      skill: (skill as CardData["skill"]) ?? "theory_concept",
      ...(skillRawSections ? { skillRawSections } : {}),
      ...(unifiedDetail ? { unifiedDetail } : {}),
      hasAnnotations,
      ...(sourceAnchor ? { sourceAnchor } : {}),
      ...(learningContext ? { learningContext } : {}),
      ...(sourceDocument ? { sourceDocument } : {}),
      ...(ingestionDecision ? { ingestionDecision } : {}),
      ...(learningActions?.length ? { learningActions } : {}),
      ...(syllabusEntryId ? { syllabusEntryId } : {}),
      time: timeStr,
      unread: true as const,
    };

    const finishUpsert = (
      card: CardData,
      subjectId: string,
      date: string,
      toastMsg: string,
    ) => {
      const snapshot = structuredClone(card);
      updateCard(subjectId, date, card.id, {
        title: newTitle,
        ...upsertCardFields,
        sourceAnchor: sourceAnchor
          ? { ...card.sourceAnchor, ...sourceAnchor }
          : card.sourceAnchor,
      });
      setNewCardId(card.id);
      setTimeout(() => setNewCardId(null), 3500);
      if (activeSubject !== "all") {
        setActiveSubject(subjectId);
      }
      setSidebarLoading(false);
      const runUndo = () => {
        updateCard(subjectId, date, card.id, {
          title: snapshot.title,
          img: snapshot.img,
          overview: snapshot.overview,
          detailIntro: snapshot.detailIntro,
          detailSections: snapshot.detailSections,
          aiKeyPoints: snapshot.aiKeyPoints,
          expandedKnowledge: snapshot.expandedKnowledge,
          knowledgeTree: snapshot.knowledgeTree,
          nextAction: snapshot.nextAction,
          skill: snapshot.skill,
          unifiedDetail: snapshot.unifiedDetail,
          hasAnnotations: snapshot.hasAnnotations,
          sourceAnchor: snapshot.sourceAnchor,
          learningContext: snapshot.learningContext,
          sourceDocument: snapshot.sourceDocument,
          ingestionDecision: snapshot.ingestionDecision,
          learningActions: snapshot.learningActions,
          syllabusEntryId: snapshot.syllabusEntryId,
          time: snapshot.time,
          unread: snapshot.unread,
        });
        rememberSavedCard(sourceAnchor, subjectId, date, snapshot);
        setScreenshotMergeNotice(null);
        showToast("已撤销合并");
      };
      if (sourceAnchor?.kind === "screenshot") {
        setScreenshotMergeNotice({ message: toastMsg, onUndo: runUndo });
      }
      showToast(toastMsg, {
        actionLabel: "撤销",
        durationMs: 8000,
        onAction: runUndo,
      });
      rememberSavedCard(sourceAnchor, subjectId, date, {
        ...card,
        title: newTitle,
        ...upsertCardFields,
        sourceAnchor: sourceAnchor
          ? { ...card.sourceAnchor, ...sourceAnchor }
          : card.sourceAnchor,
      });
      const mergedKey = cardDedupeKey({
        ...card,
        title: newTitle,
        ...upsertCardFields,
        sourceAnchor: sourceAnchor
          ? { ...card.sourceAnchor, ...sourceAnchor }
          : card.sourceAnchor,
      });
      if (mergedKey) {
        void purgeDuplicatesExcept(allFeedGroupsRef.current, mergedKey, card.id, removeCardSilent)
          .then(n => { if (n > 0) setMergeTick(t => t + 1); });
      }
    };

    const isDemoScreenshot = sourceAnchor?.fileId === DEMO_SCREENSHOT_ANCHOR.fileId;

    if (isDemoScreenshot && screenshotSaveCountRef.current >= 1) {
      const forced = lookupExistingCard(sourceAnchor, preassignedId ?? DEMO_SCREENSHOT_CARD_ID);
      if (forced) {
        finishUpsert(forced.card, forced.subjectId, forced.date, "已合并重复记忆");
        return "updated";
      }
    }

    const existingHit = lookupExistingCard(sourceAnchor, preassignedId);
    if (existingHit) {
      finishUpsert(
        existingHit.card,
        existingHit.subjectId,
        existingHit.date,
        sourceAnchor?.kind === "pdf" ? "已更新本页记忆" : "已合并重复记忆",
      );
      return "updated";
    }

    if (!sourceAnchor) {
      const dedupePreview: CardData = {
        id: preassignedId ?? "preview",
        title: newTitle,
        img: upsertCardFields.img,
        source: TYPE_SOURCE[aType] ?? "evernote",
        time: timeStr,
        skill: upsertCardFields.skill,
        contentType: surfaces.contentType,
        overview,
        detailIntro,
        detailSections,
        aiKeyPoints,
        expandedKnowledge,
        knowledgeTree,
        nextAction,
        hasAnnotations,
      };
      const dedupeKey = cardDedupeKey(dedupePreview);
      if (dedupeKey) {
        const existing = findCardByDedupeKey(allFeedGroupsRef.current, dedupeKey);
        if (existing) {
          finishUpsert(existing.card, existing.subjectId, existing.date, "已合并重复记忆");
          return "updated";
        }
      }
    }

    const todayKey = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,"0")}${now.getDate().toString().padStart(2,"0")}`;
    const newId = preassignedId ?? `new_${Date.now()}`;

    const newCard: CardData = {
      id: newId,
      title: newTitle,
      img: upsertCardFields.img,
      source: TYPE_SOURCE[aType] ?? "evernote",
      time: timeStr,
      skill: upsertCardFields.skill,
      contentType: surfaces.contentType,
      ...(surfaces.homeworkTasks?.length ? { homeworkTasks: surfaces.homeworkTasks } : {}),
      ...(surfaces.taskDueDate ? { taskDueDate: surfaces.taskDueDate } : {}),
      overview, detailIntro, detailSections, aiKeyPoints, expandedKnowledge, knowledgeTree, nextAction,
      hasAnnotations,
      ...(skillRawSections ? { skillRawSections } as Partial<CardData> : {}),
      ...(unifiedDetail ? { unifiedDetail } : {}),
      ...(sourceAnchor ? { sourceAnchor } : {}),
      ...(learningContext ? { learningContext } : {}),
      ...(sourceDocument ? { sourceDocument } : {}),
      ...(ingestionDecision ? { ingestionDecision } : {}),
      ...(learningActions?.length ? { learningActions } : {}),
      ...(syllabusEntryId ? { syllabusEntryId } : {}),
    };

    setNewCardId(newId);
    setTimeout(() => setNewCardId(null), 3500);

    const subjectShort = subjects.find(s => s.id === targetSubjectId)?.short
      ?? activeCourse?.course
      ?? ingestionDecision?.subjectName
      ?? INITIAL_SUBJECTS.find(s => s.id === targetSubjectId)?.short
      ?? "待确认课程";
    rememberSavedCard(sourceAnchor, targetSubjectId, todayKey, newCard);
    await addCard({
      targetSubjectId,
      card: newCard,
      date: todayKey,
      aiSummary,
      subjectShort,
      silent: isDemoScreenshot,
    });
    if (isDemoScreenshot) {
      screenshotSaveCountRef.current = Math.max(1, screenshotSaveCountRef.current + 1);
      const key = cardDedupeKey(newCard);
      if (key) {
        void purgeDuplicatesExcept(allFeedGroupsRef.current, key, newCard.id, removeCardSilent)
          .then(n => { if (n > 0) setMergeTick(t => t + 1); });
      }
    }
    setMergeTick(t => t + 1);

    // 后台静默：把新笔记自动归类到教学大纲条目，让它进入对应目录并打"新增"红点。
    // 失败/无把握时保持 syllabusEntryId 为空 → 仍留在「最近上传与批注」兜底。
    if (newCard.contentType !== "homework" && !newCard.syllabusEntryId) {
      const syllabusSubjectId = legacySubjectIdForCourse(activeCourse?.course) ?? targetSubjectId;
      classifyNoteSyllabusEntry(
        {
          subjectId: syllabusSubjectId,
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
        .catch(err => console.warn("[import] 知识点自动归类失败，保留为独立知识点", err));
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
    if (
      newCard.contentType !== "homework"
      && (newCard.ingestionDecision?.destinations.includes("exam") ?? false)
    ) {
      const examGraphSubjectId = legacySubjectIdForCourse(activeCourse?.course) ?? targetSubjectId;
      linkOrProposeExamPoints(
        {
          subjectId: examGraphSubjectId,
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
    return "created";
  };

  const startFlyAnimation = useCallback((imageDataUrl: string) => {
    setFlyImg(imageDataUrl);
    setFlyPhase("center");
    const t1 = setTimeout(() => setFlyPhase("corner"), 80);
    const t2 = setTimeout(() => setFlyPhase("fading"), 5200);
    const t3 = setTimeout(() => setFlyPhase("idle"), 5800);
    flyTimers.current.forEach(clearTimeout);
    flyTimers.current = [t1, t2, t3];
  }, []);

  /** Core image processing pipeline — calls server-side proxies, no keys in browser */
  const processImage = (
    imageDataUrl: string,
    hasAnnotations: boolean,
    aType: string,
    options?: { skipFly?: boolean; sourceAnchor?: SourceAnchor; fixedCardId?: string },
  ) => {
    setSidebarLoading(true);
    if (!options?.skipFly) {
      startFlyAnimation(imageDataUrl);
    }

    const loadStart = Date.now();
    const applyWithMinDelay = (fn: () => void) => {
      const elapsed = Date.now() - loadStart;
      setTimeout(fn, Math.max(0, 2500 - elapsed));
    };

    const preassignedId = options?.fixedCardId ?? `new_${Date.now()}`;

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
              options?.sourceAnchor,
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
          void applyNewCard(
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
            undefined,
            undefined,
            options?.sourceAnchor,
          ).then(saved => {
            if (saved === "created") {
              showToast("AI 接口暂不可用，已用演示内容保存");
            }
          });
          setSidebarLoading(false);
          if (!options?.skipFly) {
            setFlyPhase("fading");
            setTimeout(() => setFlyPhase("idle"), 600);
            flyTimers.current.forEach(clearTimeout);
          }
        });
      });
  };

  /** 演示相机：假 Doubao + 假流式详情，流程与 processImage 一致 */
  const processDemoCameraImage = (
    imageDataUrl: string,
    options?: { skipFly?: boolean; sourceAnchor?: SourceAnchor },
  ) => {
    setSidebarLoading(true);
    if (!options?.skipFly) {
      startFlyAnimation(imageDataUrl);
    }

    const loadStart = Date.now();
    const applyWithMinDelay = (fn: () => void) => {
      const elapsed = Date.now() - loadStart;
      setTimeout(fn, Math.max(0, 2500 - elapsed));
    };
    const preassignedId = `new_${Date.now()}`;

    void (async () => {
      await fakeDoubaoDelay();
      const r = getDemoDoubaoResult(activeSubject);
      const unifiedDetail = await fakeStreamUnifiedDetail(() => {});
      applyWithMinDelay(() => {
        applyNewCard(
          r.subjectId,
          r.title,
          r.summary,
          "notes",
          DEMO_CAMERA_IMAGE,
          r.overview,
          r.detailIntro,
          r.detailSections,
          r.aiKeyPoints,
          r.expandedKnowledge,
          r.knowledgeTree,
          r.nextAction,
          r.skill,
          undefined,
          false,
          preassignedId,
          unifiedDetail,
          r.contentType,
          undefined,
          undefined,
          { kind: "camera", fileId: "demo_calculus_limit_board" },
        );
        setActiveTopTab("notes");
        setSidebarLoading(false);
        showToast("资料已整理并存入记忆");
      });
    })();
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
    const { openPdfDocument } = await import("../utils/pdfjs");
    const pdf = await openPdfDocument(file);
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
      if (text) pageTexts.push(`[第 ${pageNo} 页]\n${text}`);
    }
    const text = pageTexts.join("\n\n");
    if (!text.trim()) throw new Error("未能从 PDF 中抽取到可读文本，可能是扫描版 PDF。");
    return text;
  };

  const renderPdfFirstPageImage = async (file: File) => {
    const { openPdfDocument } = await import("../utils/pdfjs");
    const pdf = await openPdfDocument(file);
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

  const normalizeSubjectId = (id?: string, subjectName?: string, fallbackText = "") => {
    if (id && subjects.some(subject => subject.id === id)) return id;
    const detected = detectedSubjectRoute(fallbackText, subjectName);
    if (detected) return detected.id;
    if (id && id !== "other") return id;
    const activeCourseId = timetable?.courses.some(course => course.courseId === activeSubject)
      ? activeSubject
      : null;
    if (activeCourseId) return activeCourseId;
    return activeSubject !== "all" && activeSubject !== "__pending__" ? activeSubject : "other";
  };

  type ImportApiResult = Partial<SourceDraft> & RawSourceRouting & {
    targetSubjectId?: string;
    memoryUnits?: SourceDocument["memoryUnits"];
    knowledgeGroups?: SourceDocument["knowledgeGroups"];
  };

  const sourceRoutingContext = () => {
    const uniqueCourses = new Map<string, { id: string; name: string; teacher?: string }>();
    timetable?.courses.forEach(course => {
      if (!uniqueCourses.has(course.courseId)) {
        uniqueCourses.set(course.courseId, {
          id: course.courseId,
          name: course.course,
          ...(course.teacher ? { teacher: course.teacher } : {}),
        });
      }
    });
    const currentCourse = timetable?.courses.find(course => course.courseId === activeSubject);
    return {
      currentSubjectId: legacySubjectIdForCourse(currentCourse?.course) ?? (
        SUBJECT_SYLLABI[activeSubject] ? activeSubject : undefined
      ),
      currentCourseId: currentCourse?.courseId,
      currentCourseName: currentCourse?.course,
      semester: timetable?.semester,
      courses: [...uniqueCourses.values()],
      syllabusCatalog: Object.entries(SUBJECT_SYLLABI).flatMap(([subjectId, syllabus]) =>
        syllabus.nodes
          .filter(node => node.kind === "topic")
          .map(node => ({ subjectId, id: node.id, title: node.title })),
      ),
    };
  };

  const callImportApi = async (
    payload: Record<string, unknown>,
    retryMalformed = true,
  ): Promise<ImportApiResult> => {
    let res: Response;
    try {
      res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, routingContext: sourceRoutingContext() }),
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
      if (
        retryMalformed
        && /Bad escaped character|模型返回格式异常|No JSON in model response/i.test(msg)
      ) {
        return callImportApi(payload, false);
      }
      if (msg.includes("not configured")) {
        throw new Error(
          `${msg}。图片识别请在项目根目录的 .env.local 配置 MOONSHOT_API_KEY 和 MOONSHOT_MODEL_ID；文本解析另需 DEEPSEEK_API_KEY。`,
        );
      }
      if (msg.includes("InvalidEndpointOrModel") || msg.includes("ModelNotOpen") || msg.includes("does not exist")) {
        throw new Error(
          `豆包视觉模型不可用：请把 .env.local 里的 DOUBAO_MODEL_ID 改成你在火山方舟已开通的「视觉」接入点 ID（当前账号已验证可用：doubao-seed-1-6-vision-250815）。原始错误：${msg}`,
        );
      }
      throw new Error(msg || `解析失败（HTTP ${res.status}）`);
    }
    return data as ImportApiResult;
  };

  const sourceDraftFromImport = (
    data: ImportApiResult,
    sourceKind: SourceDraft["sourceKind"],
    originalName: string,
  ): SourceDraft => {
    const routingText = [
      data.title,
      data.summary,
      data.overview,
      data.detailIntro,
      data.chapterTitle,
      ...(Array.isArray(data.knowledgePoints) ? data.knowledgePoints : []),
    ].filter((item): item is string => typeof item === "string").join(" ");
    const normalizedSubjectId = normalizeSubjectId(
      data.targetSubjectId,
      typeof data.subjectName === "string" ? data.subjectName : undefined,
      routingText,
    );
    const routing = normalizeSourceRouting(data, {
      subjectId: legacySubjectIdForCourse(
        timetable?.courses.find(course => course.courseId === data.targetCourseId)?.course,
      ) ?? normalizedSubjectId,
      courses: sourceRoutingContext().courses,
      fallbackText: routingText,
    });
    return {
      id: `draft_${Date.now()}`,
      status: "ready",
      sourceKind,
      originalName,
      title: data.title || "记忆：导入资料整理",
      summary: data.summary || "资料已解析完成，可确认保存为记忆卡。",
      targetSubjectId: normalizedSubjectId,
      targetCourseId: routing.targetCourseId,
      img: data.img || (sourceKind === "text" || sourceKind === "link" ? TYPE_BG.notes ?? imgNotesBg : undefined),
      overview: data.overview,
      detailIntro: data.detailIntro,
      detailSections: Array.isArray(data.detailSections) ? data.detailSections : [],
      aiKeyPoints: Array.isArray(data.aiKeyPoints) ? data.aiKeyPoints : [],
      expandedKnowledge: Array.isArray(data.expandedKnowledge) ? data.expandedKnowledge : [],
      knowledgeTree: Array.isArray(data.knowledgeTree) ? data.knowledgeTree : [],
      nextAction: data.nextAction,
      skill: data.skill,
      ingestionDecision: routing.decision,
      learningActions: routing.learningActions,
      learningPhase: routing.learningPhase,
      syllabusEntryId: routing.syllabusEntryId,
      autoArchive: routing.autoArchive,
      ...(() => {
        const actionHomeworkTasks = routing.learningActions
          .filter(action => action.type === "homework")
          .map(action => action.title);
        const actionDueDate = routing.learningActions
          .find(action => action.type === "homework" && action.dueAt)?.dueAt?.replace(/\D/g, "").slice(0, 8);
        const surfaces = classifyCardSurfaces({
          contentType: routing.decision.destinations.includes("homework") ? "homework" : data.contentType,
          homeworkTasks: data.homeworkTasks?.length ? data.homeworkTasks : actionHomeworkTasks,
          taskDueDate: data.taskDueDate || actionDueDate,
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

  const buildPptxStructureFallback = (
    document: Awaited<ReturnType<typeof parsePptxFile>>,
    file: File,
    sourceAnchor: SourceAnchor,
    contentId: string,
    reason: string,
  ): SourceDraft => {
    const readablePages = document.pages.filter(page => page.text.trim() || page.notes?.trim());
    const searchableText = [
      document.title,
      ...readablePages.map(page => `${page.title} ${page.text} ${page.notes ?? ""}`),
    ].join(" ");
    const detected = detectedSubjectRoute(searchableText);
    const pageSections = readablePages.slice(0, 8).map(page => ({
      title: `P${page.page} · ${page.title}`,
      items: [page.text || page.notes || "本页为图示或版式内容，请打开课件原页查看。"],
    }));
    const title = `记忆：${document.title.replace(/\.pptx$/i, "").slice(0, 20)}`;

    return {
      id: `draft_${Date.now()}`,
      status: "ready",
      sourceKind: "file",
      originalName: file.name,
      title,
      summary: `已读取 ${document.pageCount} 页课件结构。智能解析服务暂时繁忙，原始课件和页面内容已保留，可先入库后再生成学习梳理。`,
      targetSubjectId: detected?.id ?? "other",
      img: document.coverDataUrl,
      overview: readablePages.length
        ? readablePages.slice(0, 3).map(page => `P${page.page} ${page.title}：${page.text.slice(0, 160)}`).join("\n")
        : "该 PPT 主要由图片或图表构成，已保留原始课件供查看。",
      detailIntro: "已完成 PPT 文件级读取；待模型服务恢复后可基于整份课件补全知识结构。",
      detailSections: pageSections,
      aiKeyPoints: readablePages.map(page => page.title).filter((title, index, values) => title && values.indexOf(title) === index).slice(0, 6),
      nextAction: "打开课件查看原页；稍后可重新生成完整的知识梳理。",
      skill: "theory_concept",
      contentType: "note",
      ingestionDecision: {
        validCourseContent: true,
        confidence: 0.6,
        reason: `已识别为 PPT 课程资料；智能整理暂未完成（${reason.slice(0, 80)}）。`,
        materialType: "courseware",
        ...(detected ? { subjectName: detected.name } : {}),
        knowledgePoints: readablePages.map(page => page.title).filter(Boolean).slice(0, 12),
        destinations: ["knowledge"],
      },
      learningPhase: "before_class",
      autoArchive: false,
      sourceAnchor,
      sourceDocument: {
        type: "pptx",
        title: file.name,
        pageCount: document.pageCount,
        pages: document.pages,
        paragraphs: readablePages.slice(0, 3).map(page => `P${page.page} ${page.title}：${page.text.slice(0, 180)}`),
        excerpt: contentId,
      },
    };
  };

  const analyzeSourceFile = async (
    file: File,
    onProgress: (update: Partial<SourceDraft>) => void = () => undefined,
  ): Promise<SourceDraft> => {
    if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
      onProgress({ summary: "正在识别课程、星期、节次、时间和教室..." });
      const parsed = await parseTimetableFile(file);
      return {
        id: `timetable_${Date.now()}`,
        status: "ready",
        sourceKind: "timetable",
        originalName: file.name,
        title: `${parsed.semester}课表`,
        summary: `已识别 ${new Set(parsed.courses.map(course => course.courseId)).size} 门课程、${parsed.courses.length} 个上课时段，请确认后导入。`,
        targetSubjectId: "other",
        timetable: parsed,
      };
    }

    if (/\.ppt$/i.test(file.name)) {
      throw new Error("旧版 .ppt 暂不能在浏览器中可靠解析，请先用 PowerPoint 另存为 .pptx 后上传。");
    }

    const contentId = await fileContentId(file);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const sourceAnchor: SourceAnchor = {
      kind: isPdf ? "pdf" : "upload",
      fileId: `${file.size}-${contentId}`,
      fileName: file.name,
      contentId,
    };
    const sourceDocument: SourceDocument | undefined = isPdf
      ? { type: "pdf", title: file.name }
      : undefined;
    const attachSource = (draft: SourceDraft): SourceDraft => ({
      ...draft,
      sourceAnchor,
      ...(sourceDocument ? { sourceDocument } : {}),
    });

    if (/\.pptx$/i.test(file.name)) {
      onProgress({ summary: "正在读取整份 PPT 的页面结构、正文和备注..." });
      const document = await parsePptxFile(file);
      const readablePages = document.pages.filter(page => page.text.trim() || page.notes?.trim());
      if (readablePages.length === 0) {
        onProgress({ summary: "这份课件以图片为主，已保留 PPT 结构；可先入库，稍后再生成梳理。" });
        return buildPptxStructureFallback(
          document,
          file,
          sourceAnchor,
          contentId,
          "未提取到可读文字",
        );
      }
      onProgress({ summary: `已读取 ${document.pageCount} 页，正在融合跨页知识结构...` });
      let data: ImportApiResult;
      try {
        data = await callImportApi({
          kind: "text",
          value: pptxDocumentText(document),
          fileName: file.name,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/429|overloaded|超时|timeout|5\d\d/i.test(message)) {
          onProgress({ summary: "智能解析服务暂时繁忙，已保留整份 PPT 的页面结构，可先入库。" });
          return buildPptxStructureFallback(document, file, sourceAnchor, contentId, message);
        }
        throw error;
      }
      const draft = sourceDraftFromImport(data, "file", file.name);
      return {
        ...draft,
        img: document.coverDataUrl ?? draft.img,
        sourceAnchor: {
          kind: "upload",
          fileId: `${file.size}-${contentId}`,
          fileName: file.name,
          contentId,
        },
        sourceDocument: {
          type: "pptx",
          title: file.name,
          pageCount: document.pageCount,
          pages: document.pages,
          memoryUnits: data.memoryUnits ?? [],
          knowledgeGroups: data.knowledgeGroups ?? [],
          paragraphs: readablePages.slice(0, 3).map(page =>
            `P${page.page} ${page.title}：${page.text.slice(0, 180)}`,
          ),
        },
      };
    }

    // 音频：先转录，再分析
    if (isAudioFile(file)) {
      const transcript = await transcribeAudio(file, onProgress);
      onProgress({ summary: "🔍 转录完成，正在分析内容..." });
      const prefix = `[来源：语音录音]\n文件名：${file.name}\n\n`;
      const draft = await analyzeTextSource("text", `${prefix}${transcript}`);
      return attachSource({ ...draft, sourceKind: "audio", transcript });
    }

    if (file.type.startsWith("image/")) {
      const imageDataUrl = await readFileAsDataUrl(file);
      const compressedImage = await compressImageForApi(imageDataUrl);
      let data;
      try {
        data = await callImportApi({ kind: "image", imageDataUrl: compressedImage, fileName: file.name });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/超时|timeout|504|FUNCTION_INVOCATION_TIMEOUT/i.test(message)) throw error;
        onProgress({ summary: "首次识别超时，正在压缩图片后自动重试..." });
        const retryImage = await compressImageForApi(imageDataUrl, { maxSide: 960, quality: 0.6 });
        data = await callImportApi({ kind: "image", imageDataUrl: retryImage, fileName: file.name });
      }
      return attachSource(sourceDraftFromImport(data, "image", file.name));
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const text = await extractPdfText(file);
        const draft = await analyzeTextSource("text", `文件名：${file.name}\n\n${text}`);
        return attachSource({ ...draft, sourceKind: "file", originalName: file.name });
      } catch (textErr) {
        console.warn("[pdf] text extraction failed, fallback to vision", textErr);
        const imageDataUrl = await compressImageForApi(await renderPdfFirstPageImage(file));
        try {
          const data = await callImportApi({ kind: "image", imageDataUrl, fileName: file.name });
          return attachSource(sourceDraftFromImport(data, "file", file.name));
        } catch (importErr) {
          console.warn("[pdf] import endpoint failed, fallback to vision endpoint", importErr);
          try {
            const data = await callDoubao(imageDataUrl, false);
            return attachSource(sourceDraftFromImport(
              { ...data, targetSubjectId: data.subjectId },
              "file",
              file.name,
            ));
          } catch (visionErr) {
            console.warn("[pdf] vision endpoint unavailable, preserve source for later analysis", visionErr);
            const baseName = file.name.replace(/\.[^.]+$/, "").replace(/^圈选/, "").trim() || "圈选知识点";
            return attachSource(sourceDraftFromImport({
              title: `记忆：${baseName.slice(0, 20)}`,
              summary: "已保留圈选内容并归入当前课程，可打开原图继续查看和整理。",
              targetSubjectId: normalizeSubjectId(),
              img: imageDataUrl,
              overview: "这份内容来自你圈选的原始资料，原始画面已完整保留。",
              detailIntro: "圈选内容",
              detailSections: [],
              aiKeyPoints: [],
              expandedKnowledge: [],
              knowledgeTree: [],
              nextAction: "打开原图核对圈选内容，或稍后重新生成知识解析。",
              skill: "theory_concept",
            }, "file", file.name));
          }
        }
      }
    }

    if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await readFileAsText(file);
      return attachSource(await analyzeTextSource("text", text));
    }

    throw new Error("当前支持图片、PDF、PPTX、txt、md、音频和 Excel 课表；Word 与旧版 PPT 暂需先转换。");
  };

  const confirmSourceDraft = async (draft: SourceDraft, options?: { keepOpen?: boolean }) => {
    if (draft.ingestionDecision?.validCourseContent === false) {
      showToast(`未入库：${draft.ingestionDecision.reason}`);
      return;
    }
    const preassignedId = `new_${Date.now()}`;
    const now = new Date();
    const todayKey = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;

    const resolvedCourseId = draft.targetCourseId
      ?? (timetable?.courses.some(course => course.courseId === draft.targetSubjectId)
        ? draft.targetSubjectId
        : undefined);
    const linkedCourse = resolvedCourseId
      ? timetable?.courses.find(course => course.courseId === resolvedCourseId)
      : undefined;
    const sourcePhase: LearningContext["phase"] =
      draft.learningPhase
      ?? (draft.sourceKind === "file" || draft.sourceKind === "link" ? "before_class" : "after_class");
    const resolvedTargetSubjectId = linkedCourse?.courseId ?? draft.targetSubjectId;
    if (
      !linkedCourse
      && !subjects.some(subject => subject.id === resolvedTargetSubjectId)
    ) {
      const subjectName = draft.ingestionDecision?.subjectName?.trim()
        || (resolvedTargetSubjectId === "detected_electrical_circuits" ? "电路分析" : "待确认课程");
      addSubject({
        id: resolvedTargetSubjectId,
        name: subjectName,
        short: subjectName,
        count: 0,
        unit: "条内容",
        entries: [],
        extra: "由上传资料自动识别",
      }, { silent: true });
    }

    const pptxGroups = draft.sourceDocument?.type === "pptx" && draft.contentType !== "homework"
      ? (draft.sourceDocument.knowledgeGroups ?? [])
        .filter(group => group.title.trim() && group.pages.length > 0)
        .slice(0, 12)
      : [];
    const cardGroups = pptxGroups.length > 1 ? pptxGroups : [null];
    const createdCardIds: string[] = [];

    for (const [index, group] of cardGroups.entries()) {
      const cardId = index === 0 ? preassignedId : `new_${Date.now()}_${index}`;
      createdCardIds.push(cardId);
      const groupPages = group?.pages.filter(page => Number.isFinite(page)) ?? [];
      const firstPage = groupPages[0];
      const groupChildren = group?.children?.filter(Boolean) ?? [];
      const groupSourceAnchor = group && draft.sourceAnchor
        ? {
            ...draft.sourceAnchor,
            page: firstPage,
            contentId: `${draft.sourceAnchor.contentId ?? draft.sourceAnchor.fileId ?? "pptx"}:group:${index}`,
          }
        : draft.sourceAnchor;
      const groupSourceDocument = group && draft.sourceDocument
        ? {
            ...draft.sourceDocument,
            page: firstPage,
            excerpt: group.summary,
          }
        : draft.sourceDocument;
      const groupDecision = group && draft.ingestionDecision
        ? {
            ...draft.ingestionDecision,
            knowledgePoints: [group.title, ...groupChildren],
          }
        : draft.ingestionDecision;

      await applyNewCard(
        resolvedTargetSubjectId,
        group ? `记忆：${group.title}` : draft.title,
        group?.summary || draft.summary,
        "notes",
        draft.img || imgNotesBg,
        group?.summary || draft.overview,
        group?.summary || draft.detailIntro,
        groupChildren.length
          ? [{ title: "包含内容", items: groupChildren }]
          : draft.detailSections,
        groupChildren.length ? groupChildren : draft.aiKeyPoints,
        draft.expandedKnowledge ?? [],
        draft.knowledgeTree ?? [],
        draft.nextAction || "资料已保存，可继续生成习题、查看知识脉络或补充批注。",
        draft.skill,
        undefined,
        false,
        cardId,
        undefined,
        draft.contentType,
        index === 0 ? draft.homeworkTasks : undefined,
        index === 0 ? draft.taskDueDate : undefined,
        groupSourceAnchor,
        {
          ...(linkedCourse ? {
            courseId: linkedCourse.courseId,
            course: linkedCourse.course,
            classTime: `${linkedCourse.day} ${linkedCourse.time}—${linkedCourse.end}`,
            location: linkedCourse.room,
          } : {}),
          chapter: draft.ingestionDecision?.chapterTitle,
          phase: sourcePhase,
          sourceRole: sourcePhase === "before_class" ? "teacher" : "student",
          capabilities: { knowledgeMap: true, interactive: false },
        },
        groupSourceDocument,
        groupDecision,
        index === 0 ? draft.learningActions : undefined,
        group ? undefined : draft.syllabusEntryId,
      );
    }
    if (draft.openTab === "homework" || draft.ingestionDecision?.destinations.includes("homework")) setActiveTopTab("homework");
    else setActiveTopTab("notes");
    setActiveSubject(resolvedTargetSubjectId);
    if (!options?.keepOpen) setShowAddSource(false);
    const destinationName = linkedCourse?.course
      ?? subjects.find(item => item.id === resolvedTargetSubjectId)?.short
      ?? "当前课程";
    const tabHint =
      draft.openTab === "homework" || draft.ingestionDecision?.destinations.includes("homework")
        ? `已挂靠到${destinationName}，并在作业中生成待办`
        : draft.ingestionDecision?.destinations.includes("exam")
          ? `已挂靠到${destinationName}的知识与备考中`
          : `已挂靠到${destinationName}的知识中`;
    const groupHint = createdCardIds.length > 1 ? `，形成 ${createdCardIds.length} 个跨页知识对象` : "";
    showToast(`${draft.autoArchive ? "已自动识别并入库：" : ""}${tabHint}${groupHint}`);

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
          updateCard(resolvedTargetSubjectId, todayKey, preassignedId, { unifiedDetail: buffer });
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
      name,
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
      <PenContextProvider>
      <PenSceneSync
        annotationType={annotationType}
        pdfReaderFile={pdfReaderFile}
        showVoice={showVoice}
        showFormFill={showFormFill}
      />
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
          onSelectSubject={(id) => {
            didInitSubjectRef.current = true;
            setActiveSubject(id);
            setFocusedSyllabusEntryId(null);
            if (activeTopTab === "study") setActiveTopTab("notes");
            if (id !== "other" && activeTopTab === "paper") setActiveTopTab("notes");
          }}
          isLoading={sidebarLoading}
          subjects={sidebarSubjects}
          onOpenSearch={() => setShowSearch(true)}
          onUploadFile={() => setShowAddSource(true)}
          onCreateSubject={() => setShowCreateSubject(true)}
          onOpenStudy={() => {
            setActiveTopTab("study");
          }}
          isStudyActive={activeTopTab === "study"}
          isTimetableLinked={timetableSubjects.length > 0}
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F6FA]">
          {subject ? (
            <>
              {activeTopTab !== "study" && (
                <>
                  {/* 课程头部 */}
                  <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2 flex-shrink-0">
                    <div className="min-w-0">
                      <EditableSubjectName
                        name={subject?.short ?? ""}
                        onRename={(next) => {
                          if (subject) updateSubject({ ...subject, name: next, short: next.slice(0, 6) });
                        }}
                      />
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
                    showPaperTab={activeSubject === "other"}
                  />
                </>
              )}

              {activeTopTab === "study" && (
                <StudyView
                  onNavigateCourse={(courseId, destination, syllabusEntryId) => {
                    didInitSubjectRef.current = true;
                    setActiveSubject(courseId);
                    setActiveTopTab(destination);
                    setFocusedSyllabusEntryId(destination === "notes" ? (syllabusEntryId ?? null) : null);
                    const params = new URLSearchParams(window.location.search);
                    params.set("subject", courseId);
                    params.set("tab", destination);
                    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
                  }}
                  timetable={timetable}
                  timetables={timetables}
                  onSelectSemester={(semester) => {
                    const selected = selectTimetableSemester(semester);
                    if (!selected) return;
                    setTimetable(selected);
                    const visibleCourses = selected.courses;
                    if (
                      activeSubject !== "all"
                      && activeSubject !== "other"
                      && !visibleCourses.some(course => course.courseId === activeSubject)
                    ) {
                      setActiveSubject(visibleCourses[0]?.courseId ?? "all");
                    }
                    showToast(`已切换到${semester}`);
                  }}
                  allFeedGroups={allFeedGroups}
                />
              )}

              {activeTopTab === "notes" && (
                <SyllabusNotesView
                  subject={subject}
                  feedGroups={feedGroups}
                  onOpenCard={handleOpenCard}
                  onOpenEntry={handleOpenSyllabusEntry}
                  onMarkCardRead={(card, date) => {
                    if (!card.unread) return;
                    const sourceSubjectId = Object.entries(allFeedGroups).find(([, groups]) =>
                      groups?.some(group => group.cards.some(item => item.id === card.id))
                    )?.[0] ?? activeSubject;
                    updateCard(sourceSubjectId, date, card.id, { unread: false });
                  }}
                  onJudgeAnswer={async (question, referenceAnswer, userAnswer) => {
                    try {
                      const feedback = await callText(
                        `你是大学物理助教。请判断学生答案是否正确，并指出缺失的关键步骤。
题目：${question}
参考答案：${referenceAnswer}
学生答案：${userAnswer}
第一行只能写“正确”或“需完善”，第二行用不超过80字给出具体反馈。`,
                        { maxTokens: 300 },
                      );
                      const correct = feedback.trim().startsWith("正确");
                      const cleanedFeedback = feedback.replace(/^(正确|需完善)[：:\s]*/, "").trim();
                      return {
                        correct,
                        feedback: /第一行只能写|第二行用|题目：|参考答案：/.test(cleanedFeedback)
                          ? (correct
                            ? "关键方程和各项物理意义回答正确，表达完整。"
                            : "请对照参考答案补充关键公式、物理量含义和判断依据。")
                          : (cleanedFeedback || "已完成判断。"),
                      };
                    } catch {
                      const keyTerms = referenceAnswer
                        .split(/[，。；、\s=（）()]+/)
                        .filter(term => term.length >= 2)
                        .slice(0, 8);
                      const matches = keyTerms.filter(term => userAnswer.includes(term)).length;
                      return {
                        correct: matches >= Math.min(2, keyTerms.length),
                        feedback: matches >= Math.min(2, keyTerms.length)
                          ? "关键结论基本正确，可再补充公式、单位或推导步骤。"
                          : `建议补充这些关键内容：${keyTerms.slice(0, 3).join("、")}。`,
                      };
                    }
                  }}
                  onAddSource={() => setShowAddSource(true)}
                  newCardId={newCardId}
                  initialEntryId={focusedSyllabusEntryId}
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
                  subject={examSubject}
                  feedGroups={examNoteFeedGroups}
                  onOpenNote={(card, date) => handleOpenCard(card as CardData, date)}
                  onAskLlm={(prompt) => callTextStreamed(prompt, { maxTokens: 4000 })}
                />
              )}

              {activeTopTab === "paper" && activeSubject === "other" && (
                <PaperView
                  subject={subject}
                  feedGroups={feedGroups}
                  onOpenNote={handleOpenCard}
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
          subjects={subjects}
          onClose={() => setShowAddSource(false)}
          onAnalyzeFile={analyzeSourceFile}
          onConfirmDraft={confirmSourceDraft}
          onConfirmTimetable={(data) => {
            const nextTimetables = saveTimetable(data);
            setTimetables(nextTimetables);
            setTimetable(data);
            setShowAddSource(false);
            setActiveTopTab("study");
            showToast(`已识别为${data.semester}，导入 ${new Set(data.courses.map(course => course.courseId)).size} 门课程`);
          }}
          courseOptions={Array.from(
            new Map((timetable?.courses ?? []).map(course => [
              course.courseId,
              { id: course.courseId, name: course.course },
            ])).values(),
          )}
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300"
          style={{
            opacity: toast ? 1 : 0,
            transform: `translateX(-50%) translateY(${toast ? "0px" : "12px"})`,
            pointerEvents: toast ? "auto" : "none",
          }}
        >
          <div
            className="bg-[#1C1C1E] text-white text-[13px] px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-3"
            style={{ fontWeight: 500 }}
          >
            <span>{toast?.message}</span>
            {toast?.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => toast.onAction?.()}
                className="text-[#618AFF] text-[13px] flex-shrink-0 hover:underline"
                style={{ fontWeight: 600 }}
              >
                {toast.actionLabel}
              </button>
            )}
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
          onPdfSelected={(file) => {
            setOnboardingMode(null);
            setPdfReaderFile(file);
          }}
          onOpenScreenshot={() => setShowScreenshot(true)}
          onOpenCamera={() => setShowCamera(true)}
          onOpenVoice={() => setShowVoice(true)}
          onOpenFormFill={() => setShowFormFill(true)}
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
          allFeedGroups={allFeedGroups}
          activeSubject={activeSubject}
          onOpenRecalledCard={handleOpenRecalledCard}
          onClose={() => setPdfReaderFile(null)}
          onSavePage={(imageDataUrl, hasAnnotations, meta) => {
            processImage(imageDataUrl, hasAnnotations, "notes", {
              skipFly: true,
              sourceAnchor: meta?.sourceAnchor,
            });
          }}
        />
      )}

      {showCamera && (
        isCameraAgentEnabled ? (
          <CameraAgentModal
            onClose={() => setShowCamera(false)}
            allFeedGroups={allFeedGroups}
            activeSubject={activeSubject}
            onOpenRecalledCard={handleOpenRecalledCard}
            onSave={(imageDataUrl, meta) => {
              if (meta?.demo) {
                if (meta.flyOnly) {
                  startFlyAnimation(imageDataUrl);
                  return;
                }
                processDemoCameraImage(imageDataUrl, { skipFly: true });
                return;
              }
              processImage(imageDataUrl, false, "notes", { skipFly: meta?.autoCapture });
            }}
          />
        ) : (
          <CameraModal
            onClose={() => setShowCamera(false)}
            onSave={(imageDataUrl) => {
              processImage(imageDataUrl, false, "notes");
            }}
          />
        )
      )}

      {showScreenshot && (
        <ScreenshotModeModal
          mergeNotice={screenshotMergeNotice}
          onMergeNoticeDismiss={() => setScreenshotMergeNotice(null)}
          onClose={() => {
            setScreenshotMergeNotice(null);
            setShowScreenshot(false);
          }}
          onSave={(imageDataUrl) => {
            processImage(imageDataUrl, false, "notes", {
              sourceAnchor: DEMO_SCREENSHOT_ANCHOR,
              fixedCardId: DEMO_SCREENSHOT_CARD_ID,
              skipFly: true,
            });
          }}
        />
      )}

      {showVoice && (
        <VoiceModal
          onClose={() => setShowVoice(false)}
          onSave={(transcript) => {
            const now = new Date();
            const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,"0")}/${now.getDate().toString().padStart(2,"0")}`;
            const subjectId = activeSubject !== "all" && activeSubject !== "__pending__" ? activeSubject : "physics";

            // 演示文稿：跳过 import API，直接落卡，避免二次长时间 loading
            if (isDemoTranscript(transcript)) {
              applyNewCard(
                subjectId,
                "记忆：机械振动课堂录音",
                "简谐振动、旋转矢量法与同频振动叠加。",
                "notes", imgNotesBg,
                "课堂录音已转为文字，涵盖简谐振动方程、旋转矢量法与多振动叠加公式。",
                `来源：实时录音 ${dateStr}`,
                [
                  { title: "简谐振动方程", content: "位移满足 x(t) = A·cos(ωt + φ₀)，振幅 A、角频率 ω、初相 φ₀ 决定运动形态。" },
                  { title: "旋转矢量法", content: "用匀速旋转矢量在 x 轴上的投影描述简谐振动，矢量长度等于振幅。" },
                  { title: "同频振动叠加", content: "N 个等幅同频振动叠加时，合振幅 R = A·sin(Nδ/2) / sin(δ/2)，δ 为相邻相位差。" },
                ],
                ["旋转矢量法把圆周运动投影到直线", "同频叠加可用相位差求合振幅", "课后题：π/3 相位差的两列振动求合成"],
                [], [],
                "可继续圈注课件或生成练习题巩固叠加公式。",
                "theory_concept", undefined, false, undefined, transcript,
              );
              showToast("演示录音已保存至笔记");
              return;
            }

            analyzeTextSource("text", `[来源：实时录音 ${dateStr}]\n\n${transcript}`)
              .then(draft => confirmSourceDraft(draft))
              .catch(err => {
                console.warn("[voice] import failed, saving as plain note", err);
                applyNewCard(
                  subjectId,
                  "语音记录：" + transcript.slice(0, 20) + "…",
                  transcript.slice(0, 80),
                  "notes", imgNotesBg,
                  transcript, undefined, [], [], [], [], undefined,
                  "theory_concept", undefined, false, undefined, transcript,
                );
                showToast("已保存语音文字，AI 分析暂不可用");
              });
          }}
        />
      )}

      {showFormFill && (
        <FormFillModal onClose={() => setShowFormFill(false)} />
      )}

      {/* FlyThumbnail 必须放在所有 Modal 之后才能浮在最顶层 */}
      <FlyThumbnail phase={flyPhase} imgSrc={flyImg} />

      </PenContextProvider>
    </ApiConfigProvider>
  );
}
