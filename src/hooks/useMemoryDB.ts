import { useState, useEffect, useCallback, useRef } from "react";
import type { CardData, ExerciseSet, FeedGroup, SubjectData } from "../types";
import {
  getAllCards, getAllFeedGroups, getAllSubjects, getAllExerciseSets,
  putCard, putFeedGroup, putSubject, putExerciseSet, deleteCardById, deleteFeedGroupById,
  seedDB, buildFeedGroups, applySeedPatch, applyCardMetaPatch,
} from "../utils/db";
import type { StoredCard } from "../utils/db";
import { BUILTIN_SUBJECT_LABELS, INITIAL_ALL_FEEDS, INITIAL_SUBJECTS } from "../data/initialData";
import { BUILTIN_SYLLABUS_BY_CARD } from "../data/subjectSyllabi";
import { DEMO_SEED_PATCH, DEMO_SEED_PATCH_KEY } from "../data/demoSeedCards";
import { HOMEWORK_SEED_PATCH, HOMEWORK_SEED_PATCH_KEY } from "../data/homeworkSeedCards";
import { BUILTIN_CARD_META } from "../data/builtinCardMeta";

const CARD_META_PATCH_KEY = "card_meta_patch_v1";
const CONTENT_TYPE_PATCH_KEY = "content_type_patch_v1";
const CONTENT_TYPE_V2_KEY = "content_type_patch_v2";
const SUBJECT_LABELS_PATCH_KEY = "subject_labels_univ_v1";
const SYLLABUS_ENTRY_PATCH_KEY = "syllabus_entry_patch_v1";

// ─── Public interface ─────────────────────────────────────────────────────────

export interface MemoryDBHook {
  allFeedGroups: Record<string, FeedGroup[]>;
  exerciseSets: ExerciseSet[];
  subjects: SubjectData[];
  isLoading: boolean;
  toast: string | null;
  addCard: (params: AddCardParams) => Promise<void>;
  addExerciseSet: (exerciseSet: ExerciseSet) => void;
  updateExerciseSet: (exerciseSetId: string, updates: Partial<ExerciseSet>) => void;
  removeCard: (subjectId: string, date: string, cardId: string) => Promise<void>;
  updateSummary: (subjectId: string, date: string, newSummary: string) => Promise<void>;
  updateCard: (subjectId: string, date: string, cardId: string, updates: Partial<CardData>) => Promise<void>;
  updateSubject: (subject: SubjectData) => void;
  addSubject: (subject: SubjectData) => void;
  moveCardToSubject: (cardId: string, fromSubjectId: string, date: string, toSubjectId: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export interface AddCardParams {
  targetSubjectId: string;
  card: CardData;
  date: string;          // YYYYMMDD
  aiSummary: string;
  subjectShort: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMemoryDB(): MemoryDBHook {
  const [allFeedGroups, setAllFeedGroups] = useState<Record<string, FeedGroup[]>>({});
  const [exerciseSets, setExerciseSets]     = useState<ExerciseSet[]>([]);
  const [subjects, setSubjects]           = useState<SubjectData[]>(INITIAL_SUBJECTS);
  const [isLoading, setIsLoading]         = useState(true);
  const [toast, setToast]                 = useState<string | null>(null);
  const toastTimer                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let done = false;
    // 看门狗：无论 IndexedDB 是否被阻塞/卡住，首屏最多转 8 秒就放行，避免无限 loading
    const watchdog = setTimeout(() => {
      if (done) return;
      console.warn("[useMemoryDB] init watchdog fired, rendering with in-memory fallback");
      setAllFeedGroups(prev => (Object.keys(prev).length ? prev : INITIAL_ALL_FEEDS));
      setIsLoading(false);
    }, 8000);
    (async () => {
      try {
        let storedSubjects = await getAllSubjects();

        if (storedSubjects.length === 0) {
          // First run: seed DB with demo data
          await seedDB(INITIAL_ALL_FEEDS, INITIAL_SUBJECTS);
          storedSubjects = [...INITIAL_SUBJECTS];
          localStorage.setItem(DEMO_SEED_PATCH_KEY, "1");
        } else if (!localStorage.getItem(DEMO_SEED_PATCH_KEY)) {
          await applySeedPatch(DEMO_SEED_PATCH, INITIAL_SUBJECTS);
          localStorage.setItem(DEMO_SEED_PATCH_KEY, "1");
          storedSubjects = await getAllSubjects();
        }

        if (!localStorage.getItem(HOMEWORK_SEED_PATCH_KEY)) {
          await applySeedPatch(HOMEWORK_SEED_PATCH, INITIAL_SUBJECTS);
          localStorage.setItem(HOMEWORK_SEED_PATCH_KEY, "1");
        }

        // Back-fill skill + aiKeyPoints for existing built-in cards (one-time migration)
        if (!localStorage.getItem(CARD_META_PATCH_KEY)) {
          await applyCardMetaPatch(BUILTIN_CARD_META);
          localStorage.setItem(CARD_META_PATCH_KEY, "1");
        }

        // Back-fill homework classification for users who already had IndexedDB
        // before CardData.contentType existed.
        if (!localStorage.getItem(CONTENT_TYPE_PATCH_KEY)) {
          const cards = await getAllCards();
          await Promise.all(cards
            .filter(card => ["c1", "m2", "m7", "c_c2", "e2"].includes(card.id) && card.contentType !== "homework")
            .map(card => putCard({ ...card, contentType: "homework" })));
          localStorage.setItem(CONTENT_TYPE_PATCH_KEY, "1");
        }

        if (!localStorage.getItem(CONTENT_TYPE_V2_KEY)) {
          const cards = await getAllCards();
          const metaById: Record<string, Partial<import("../types").CardData>> = {
            c1: { contentType: "note" },
            m2: { contentType: "note" },
            m7: { contentType: "note" },
            c_c2: { contentType: "note" },
            e2: { contentType: "note" },
          };
          await Promise.all(
            cards
              .filter(card => metaById[card.id])
              .map(card => putCard({ ...card, ...metaById[card.id] })),
          );
          localStorage.setItem(CONTENT_TYPE_V2_KEY, "1");
        }

        if (!localStorage.getItem(SUBJECT_LABELS_PATCH_KEY)) {
          const stored = await getAllSubjects();
          await Promise.all(
            stored
              .filter(s => BUILTIN_SUBJECT_LABELS[s.id])
              .map(s => putSubject({ ...s, ...BUILTIN_SUBJECT_LABELS[s.id] })),
          );
          localStorage.setItem(SUBJECT_LABELS_PATCH_KEY, "1");
          storedSubjects = await getAllSubjects();
        }

        if (!localStorage.getItem(SYLLABUS_ENTRY_PATCH_KEY)) {
          const cards = await getAllCards();
          await Promise.all(
            cards
              .filter(card => BUILTIN_SYLLABUS_BY_CARD[card.id] && !card.syllabusEntryId)
              .map(card =>
                putCard({ ...card, syllabusEntryId: BUILTIN_SYLLABUS_BY_CARD[card.id] }),
              ),
          );
          localStorage.setItem(SYLLABUS_ENTRY_PATCH_KEY, "1");
        }

        const [cards, fgMetas, storedExerciseSets] = await Promise.all([getAllCards(), getAllFeedGroups(), getAllExerciseSets()]);
        setAllFeedGroups(buildFeedGroups(cards, fgMetas));
        setSubjects(storedSubjects);
        setExerciseSets([...storedExerciseSets].sort((a, b) => b.generatedAt - a.generatedAt));
      } catch (err) {
        console.error("[useMemoryDB] init failed, falling back to memory", err);
        setAllFeedGroups(INITIAL_ALL_FEEDS);
        setSubjects(INITIAL_SUBJECTS);
      } finally {
        done = true;
        clearTimeout(watchdog);
        setIsLoading(false);
      }
    })();
    return () => clearTimeout(watchdog);
  }, []);

  // ─── Toast helper ──────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ─── Add card ──────────────────────────────────────────────────────────────

  const addCard = useCallback(async ({
    targetSubjectId, card, date, aiSummary, subjectShort,
  }: AddCardParams) => {
    const fgKey = `${targetSubjectId}_${date}`;

    // Persist card + feedGroup meta concurrently
    try {
      const existingFGs = await getAllFeedGroups();
      const existingFG  = existingFGs.find(fg => fg.id === fgKey);

      await Promise.all([
        putCard({ ...card, subjectId: targetSubjectId, date }),
        putFeedGroup({
          id:        fgKey,
          subjectId: targetSubjectId,
          date,
          label:     existingFG
            ? `新增了${(existingFG.label.match(/\d+/) ? Number(existingFG.label.match(/\d+/)![0]) : 0) + 1}个记忆`
            : "新增了1个记忆",
          summary:   aiSummary || `AI分析完成！本次批注归类至${subjectShort}笔记，新增1个知识点。建议结合已有笔记复习。`,
        }),
      ]);
    } catch (err) {
      console.error("[useMemoryDB] addCard persist failed", err);
    }

    // Update in-memory state
    setAllFeedGroups(prev => {
      const feeds = prev[targetSubjectId] ?? [];
      const idx   = feeds.findIndex(g => g.date === date);
      const summary = aiSummary || `AI分析完成！本次批注归类至${subjectShort}笔记，新增1个知识点。建议结合已有笔记复习。`;

      const updated: FeedGroup[] = idx >= 0
        ? feeds.map((g, i) => i === idx
            ? { ...g, cards: [card, ...g.cards], label: `新增了${g.cards.length + 1}个记忆` }
            : g)
        : [{ date, label: "新增了1个记忆", summary, cards: [card] }, ...feeds];

      return { ...prev, [targetSubjectId]: updated };
    });

    setSubjects(prev => prev.map(s => {
      if (s.id !== targetSubjectId) return s;
      const now       = new Date();
      const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日 · 批注新增1个记忆`;
      const updated   = {
        ...s,
        count:   s.count + 1,
        entries: [dateLabel, ...s.entries].slice(0, 3),
        extra:   `刚刚 · ${s.count + 1}个知识点`,
      };
      putSubject(updated).catch(() => {});
      return updated;
    }));

    showToast("已保存到本地 ✓");
  }, [showToast]);

  // ─── Remove card ───────────────────────────────────────────────────────────

  const removeCard = useCallback(async (
    subjectId: string, date: string, cardId: string,
  ) => {
    try {
      await deleteCardById(cardId);

      // 关键修复：如果删完后该 subject 在该日期已经没有任何卡片了，
      // 必须同步把 feedGroups 表里的 meta 也删掉。否则下次刷新页面，
      // buildFeedGroups 会从这条孤儿 meta 重新构造出"X 个记忆 + 智能总结
      // 但下面没卡片"的幽灵 group。
      const remaining = (await getAllCards()).filter(
        c => c.subjectId === subjectId && c.date === date
      );
      if (remaining.length === 0) {
        await deleteFeedGroupById(`${subjectId}_${date}`);
      }
    } catch (err) {
      console.error("[useMemoryDB] removeCard failed", err);
    }

    setAllFeedGroups(prev => {
      const feeds = prev[subjectId] ?? [];
      return {
        ...prev,
        [subjectId]: feeds
          .map(g => g.date === date
            ? { ...g, cards: g.cards.filter(c => c.id !== cardId) }
            : g)
          .filter(g => g.cards.length > 0),
      };
    });

    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s;
      const updated = { ...s, count: Math.max(0, s.count - 1) };
      putSubject(updated).catch(() => {});
      return updated;
    }));

    showToast("已删除");
  }, [showToast]);

  // ─── Update daily summary ──────────────────────────────────────────────────

  const updateSummary = useCallback(async (
    subjectId: string, date: string, newSummary: string,
  ) => {
    try {
      const fgs    = await getAllFeedGroups();
      const target = fgs.find(fg => fg.id === `${subjectId}_${date}`);
      if (target) await putFeedGroup({ ...target, summary: newSummary });
    } catch (err) {
      console.error("[useMemoryDB] updateSummary failed", err);
    }

    setAllFeedGroups(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] ?? []).map(g =>
        g.date === date ? { ...g, summary: newSummary } : g
      ),
    }));
  }, []);

  // ─── Update a single card's fields ────────────────────────────────────────

  const updateCard = useCallback(async (
    subjectId: string, date: string, cardId: string, updates: Partial<CardData>,
  ) => {
    // Update in-memory state immediately
    setAllFeedGroups(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] ?? []).map(g =>
        g.date !== date ? g : {
          ...g,
          cards: g.cards.map(c => c.id !== cardId ? c : { ...c, ...updates }),
        }
      ),
    }));

    // Persist to DB: look up current stored record, merge updates, re-put
    try {
      const allCards = await getAllCards();
      const stored = allCards.find(c => c.id === cardId) as StoredCard | undefined;
      if (stored) {
        await putCard({ ...stored, ...updates } as StoredCard);
      }
    } catch (err) {
      console.error("[useMemoryDB] updateCard persist failed", err);
    }
  }, []);

  // ─── Update subject (for future sub-category etc.) ─────────────────────────

  const updateSubject = useCallback((subject: SubjectData) => {
    setSubjects(prev => prev.map(s => s.id === subject.id ? subject : s));
    putSubject(subject).catch(() => {});
  }, []);

  const addSubject = useCallback((subject: SubjectData) => {
    setSubjects(prev => prev.some(s => s.id === subject.id) ? prev : [...prev, subject]);
    setAllFeedGroups(prev => ({ ...prev, [subject.id]: prev[subject.id] ?? [] }));
    putSubject(subject).catch(() => {});
    showToast(`已创建学科「${subject.short}」`);
  }, [showToast]);

  const moveCardToSubject = useCallback(async (
    cardId: string,
    fromSubjectId: string,
    date: string,
    toSubjectId: string,
  ) => {
    if (!cardId || !fromSubjectId || !toSubjectId || fromSubjectId === toSubjectId) return;

    const allCards = await getAllCards();
    const stored = allCards.find(c => c.id === cardId) as StoredCard | undefined;
    if (!stored) return;

    const targetSubject = subjects.find(s => s.id === toSubjectId);
    const movedCard: StoredCard = { ...stored, subjectId: toSubjectId, date };

    try {
      const fgs = await getAllFeedGroups();
      const targetFG = fgs.find(fg => fg.id === `${toSubjectId}_${date}`);
      await Promise.all([
        putCard(movedCard),
        putFeedGroup({
          id: `${toSubjectId}_${date}`,
          subjectId: toSubjectId,
          date,
          label: targetFG?.label ?? "移动入1个记忆",
          summary: targetFG?.summary ?? `已移动到${targetSubject?.short ?? "新学科"}，可继续整理和复习。`,
        }),
      ]);

      const remainingSourceCards = allCards.filter(c =>
        c.id !== cardId && c.subjectId === fromSubjectId && c.date === date
      );
      if (remainingSourceCards.length === 0) {
        await deleteFeedGroupById(`${fromSubjectId}_${date}`);
      }
    } catch (err) {
      console.error("[useMemoryDB] moveCardToSubject persist failed", err);
    }

    const { subjectId: _subjectId, date: _date, ...cardData } = movedCard;
    setAllFeedGroups(prev => {
      const sourceFeeds = (prev[fromSubjectId] ?? [])
        .map(group => group.date === date
          ? { ...group, cards: group.cards.filter(card => card.id !== cardId) }
          : group)
        .filter(group => group.cards.length > 0);

      const targetFeeds = prev[toSubjectId] ?? [];
      const targetIdx = targetFeeds.findIndex(group => group.date === date);
      const nextTargetFeeds = targetIdx >= 0
        ? targetFeeds.map((group, index) => index === targetIdx
            ? { ...group, cards: [cardData, ...group.cards.filter(card => card.id !== cardId)] }
            : group)
        : [{
            date,
            label: "移动入1个记忆",
            summary: `已移动到${targetSubject?.short ?? "新学科"}，可继续整理和复习。`,
            cards: [cardData],
          }, ...targetFeeds];

      return {
        ...prev,
        [fromSubjectId]: sourceFeeds,
        [toSubjectId]: nextTargetFeeds,
      };
    });

    setSubjects(prev => prev.map(subject => {
      if (subject.id === fromSubjectId) {
        const updated = { ...subject, count: Math.max(0, subject.count - 1) };
        putSubject(updated).catch(() => {});
        return updated;
      }
      if (subject.id === toSubjectId) {
        const updated = {
          ...subject,
          count: subject.count + 1,
          extra: `刚刚 · ${subject.count + 1}个知识点`,
          entries: [`${new Date().getMonth() + 1}月${new Date().getDate()}日 · 移动入1个记忆`, ...subject.entries].slice(0, 3),
        };
        putSubject(updated).catch(() => {});
        return updated;
      }
      return subject;
    }));

    showToast(`已移动到${targetSubject?.short ?? "目标学科"}`);
  }, [showToast, subjects]);

  // ─── Exercise sets (PR2: in-memory demo state) ─────────────────────────────

  const addExerciseSet = useCallback((exerciseSet: ExerciseSet) => {
    setExerciseSets(prev => [exerciseSet, ...prev.filter(item => item.id !== exerciseSet.id)]);
    putExerciseSet(exerciseSet).catch(err => console.error("[useMemoryDB] persist exerciseSet failed", err));
    showToast("已保存到学习记录 ✓");
  }, [showToast]);

  const updateExerciseSet = useCallback((exerciseSetId: string, updates: Partial<ExerciseSet>) => {
    setExerciseSets(prev => {
      const next = prev.map(item => item.id === exerciseSetId ? { ...item, ...updates } : item);
      const target = next.find(item => item.id === exerciseSetId);
      if (target) putExerciseSet(target).catch(err => console.error("[useMemoryDB] persist exerciseSet failed", err));
      return next;
    });
  }, []);

  return {
    allFeedGroups,
    exerciseSets,
    subjects,
    isLoading,
    toast,
    addCard,
    addExerciseSet,
    updateExerciseSet,
    removeCard,
    updateSummary,
    updateCard,
    updateSubject,
    addSubject,
    moveCardToSubject,
    showToast,
  };
}
