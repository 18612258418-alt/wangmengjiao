import type { CardData, ExerciseSet, FeedGroup, SubjectData } from "../types";

const DB_NAME = "ai-memory-db";
const DB_VERSION = 2;

// ─── Stored shapes (card + feedGroup get extra fields for querying) ────────────

export interface StoredCard extends CardData {
  subjectId: string;
  date: string; // YYYYMMDD
}

export interface StoredFeedGroup {
  id: string; // `${subjectId}_${date}`
  subjectId: string;
  date: string;
  label: string;
  summary: string;
}

// ─── Open DB (singleton) ──────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    // 旧版本标签页占用连接时，升级会被阻塞 —— 不再无限等待，快速失败让 UI 走内存兜底
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked (close other tabs of this app)"));

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("cards")) {
        const s = db.createObjectStore("cards", { keyPath: "id" });
        s.createIndex("subjectId", "subjectId");
        s.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains("feedGroups")) {
        const s = db.createObjectStore("feedGroups", { keyPath: "id" });
        s.createIndex("subjectId", "subjectId");
      }
      if (!db.objectStoreNames.contains("subjects")) {
        db.createObjectStore("subjects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("exerciseSets")) {
        const s = db.createObjectStore("exerciseSets", { keyPath: "id" });
        s.createIndex("subjectId", "subjectId");
      }
    };

    req.onsuccess = () => { _db = req.result; resolve(req.result); };
    req.onerror  = () => reject(req.error);
  });
}

function p<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllCards(): Promise<StoredCard[]> {
  const db = await openDB();
  return p(db.transaction("cards", "readonly").objectStore("cards").getAll());
}

export async function getAllFeedGroups(): Promise<StoredFeedGroup[]> {
  const db = await openDB();
  return p(db.transaction("feedGroups", "readonly").objectStore("feedGroups").getAll());
}

export async function getAllSubjects(): Promise<SubjectData[]> {
  const db = await openDB();
  return p(db.transaction("subjects", "readonly").objectStore("subjects").getAll());
}

export async function getAllExerciseSets(): Promise<ExerciseSet[]> {
  const db = await openDB();
  return p(db.transaction("exerciseSets", "readonly").objectStore("exerciseSets").getAll());
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function putCard(card: StoredCard): Promise<void> {
  const db = await openDB();
  await p(db.transaction("cards", "readwrite").objectStore("cards").put(card));
}

export async function deleteCardById(id: string): Promise<void> {
  const db = await openDB();
  await p(db.transaction("cards", "readwrite").objectStore("cards").delete(id));
}

export async function deleteFeedGroupById(id: string): Promise<void> {
  const db = await openDB();
  await p(db.transaction("feedGroups", "readwrite").objectStore("feedGroups").delete(id));
}

export async function putFeedGroup(fg: StoredFeedGroup): Promise<void> {
  const db = await openDB();
  await p(db.transaction("feedGroups", "readwrite").objectStore("feedGroups").put(fg));
}

export async function putSubject(subject: SubjectData): Promise<void> {
  const db = await openDB();
  await p(db.transaction("subjects", "readwrite").objectStore("subjects").put(subject));
}

export async function putExerciseSet(exerciseSet: ExerciseSet): Promise<void> {
  const db = await openDB();
  await p(db.transaction("exerciseSets", "readwrite").objectStore("exerciseSets").put(exerciseSet));
}

export async function deleteExerciseSetById(id: string): Promise<void> {
  const db = await openDB();
  await p(db.transaction("exerciseSets", "readwrite").objectStore("exerciseSets").delete(id));
}

// ─── Bulk seed (first-run) ────────────────────────────────────────────────────

export async function seedDB(
  allFeedGroups: Record<string, FeedGroup[]>,
  subjects: SubjectData[],
): Promise<void> {
  const db = await openDB();

  // subjects
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("subjects", "readwrite");
    subjects.forEach(s => tx.objectStore("subjects").put(s));
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });

  // cards + feedGroups together
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["cards", "feedGroups"], "readwrite");
    const cardsStore = tx.objectStore("cards");
    const fgStore    = tx.objectStore("feedGroups");

    for (const [subjectId, groups] of Object.entries(allFeedGroups)) {
      for (const group of groups) {
        fgStore.put({
          id: `${subjectId}_${group.date}`,
          subjectId,
          date: group.date,
          label: group.label,
          summary: group.summary,
        });
        for (const card of group.cards) {
          cardsStore.put({ ...card, subjectId, date: group.date });
        }
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Merge new seed cards into an existing DB (skip cards that already exist by id). */
export async function applySeedPatch(
  patch: Record<string, FeedGroup[]>,
  subjects: SubjectData[],
): Promise<void> {
  const existing = await getAllCards();
  const existingIds = new Set(existing.map(c => c.id));

  for (const subject of subjects) {
    await putSubject(subject);
  }

  for (const [subjectId, groups] of Object.entries(patch)) {
    for (const group of groups) {
      const newCards = group.cards.filter(c => !existingIds.has(c.id));
      if (newCards.length === 0) continue;

      const fgKey = `${subjectId}_${group.date}`;
      const fgStore = await getAllFeedGroups();
      const existingFG = fgStore.find(fg => fg.id === fgKey);

      await putFeedGroup({
        id: fgKey,
        subjectId,
        date: group.date,
        label: existingFG?.label ?? group.label,
        summary: group.summary,
      });

      for (const card of newCards) {
        await putCard({ ...card, subjectId, date: group.date });
        existingIds.add(card.id);
      }
    }
  }
}

/**
 * Patch existing built-in cards that are missing skill / aiKeyPoints.
 * Safe to call on every app start — skips cards that already have these fields.
 */
export async function applyCardMetaPatch(
  meta: Record<string, { skill: string; aiKeyPoints: string[] }>,
): Promise<void> {
  const existing = await getAllCards();
  const toUpdate = existing.filter(c => meta[c.id] && (!c.skill || !c.aiKeyPoints?.length));
  if (toUpdate.length === 0) return;
  for (const card of toUpdate) {
    const m = meta[card.id];
    await putCard({ ...card, skill: (card.skill ?? m.skill) as CardData["skill"], aiKeyPoints: card.aiKeyPoints ?? m.aiKeyPoints });
  }
}

// ─── Reconstruct app state from DB ───────────────────────────────────────────

export function buildFeedGroups(
  cards: StoredCard[],
  feedGroupMetas: StoredFeedGroup[],
): Record<string, FeedGroup[]> {
  // card lookup by `${subjectId}_${date}`
  const cardMap: Record<string, CardData[]> = {};
  for (const { subjectId, date, ...cardData } of cards) {
    const key = `${subjectId}_${date}`;
    (cardMap[key] ??= []).push(cardData);
  }

  // 兜底清理：把数据库里"没有任何卡片"的孤儿 feedGroup meta 后台异步删除。
  // 这种孤儿来自历史版本 removeCard 只删 cards、没删 meta 的 bug，会让 UI 上
  // 出现"X 月 X 日新增了 N 个记忆 + 智能总结但下面没有卡片"的幽灵卡片日。
  // 这里发现一次清一次，逐步把历史脏数据自动修干净；新增的 removeCard 也会同步删除。
  const orphanIds = feedGroupMetas
    .filter(fg => !cardMap[fg.id] || cardMap[fg.id].length === 0)
    .map(fg => fg.id);
  if (orphanIds.length > 0) {
    Promise.all(orphanIds.map(id => deleteFeedGroupById(id))).catch(err =>
      console.error("[db] orphan feedGroup cleanup failed", err)
    );
  }

  // 同步路径：只保留"有卡片"的 group，确保 UI 立刻干净，不必等下次刷新
  const fgBySubject: Record<string, StoredFeedGroup[]> = {};
  for (const fg of feedGroupMetas) {
    if (cardMap[fg.id] && cardMap[fg.id].length > 0) {
      (fgBySubject[fg.subjectId] ??= []).push(fg);
    }
  }

  const result: Record<string, FeedGroup[]> = {};
  for (const [subjectId, groups] of Object.entries(fgBySubject)) {
    result[subjectId] = groups
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(fg => ({
        date:    fg.date,
        label:   fg.label,
        summary: fg.summary,
        cards:   cardMap[fg.id] ?? [],
      }));
  }
  return result;
}
