import type { CardData, FeedGroup } from "../types";
import { cardDedupeKey } from "./cardDedupe";
import { iterateAllCards } from "./memoryRecall";

export type { CardData } from "../types";
export { cardDedupeKey, dedupeCardRefs } from "./cardDedupe";

export interface CardRef {
  card: CardData;
  subjectId: string;
  date: string;
}

export interface DuplicateGroup {
  key: string;
  items: CardRef[];
}

export interface MergeUndoSnapshot {
  groupKey: string;
  removed: Array<CardData & { subjectId: string; date: string }>;
}

/** 按 dedupe key 查找已入库卡片（用于 upsert） */
export function findCardByDedupeKey(
  allFeedGroups: Record<string, FeedGroup[]>,
  key: string,
): { card: CardData; subjectId: string; date: string } | null {
  let found: { card: CardData; subjectId: string; date: string } | null = null;
  iterateAllCards(allFeedGroups, (card, subjectId, date) => {
    if (cardDedupeKey(card) === key) {
      found = { card, subjectId, date };
    }
  });
  return found;
}

/** 扫描全库重复组（每组 ≥2 条） */
export function findDuplicateGroups(
  allFeedGroups: Record<string, FeedGroup[]>,
): DuplicateGroup[] {
  const map = new Map<string, CardRef[]>();

  iterateAllCards(allFeedGroups, (card, subjectId, date) => {
    const key = cardDedupeKey(card);
    if (!key) return;
    const list = map.get(key) ?? [];
    list.push({ card, subjectId, date });
    map.set(key, list);
  });

  const groups: DuplicateGroup[] = [];
  for (const [key, items] of map) {
    if (items.length < 2) continue;
    groups.push({
      key,
      items: [...items].sort((a, b) => b.card.time.localeCompare(a.card.time)),
    });
  }
  return groups;
}

/** 执行合并计划：保留 items[0]（最新），删除其余 */
export function planMerge(group: DuplicateGroup): {
  keep: CardRef;
  remove: CardRef[];
} {
  return { keep: group.items[0], remove: group.items.slice(1) };
}

export function snapshotForUndo(
  groupKey: string,
  remove: CardRef[],
): MergeUndoSnapshot {
  return {
    groupKey,
    removed: remove.map(({ card, subjectId, date }) => ({
      ...card,
      subjectId,
      date,
    })),
  };
}

/** 物理删除同 dedupe key 的其它卡片，只保留 keepCardId */
export async function purgeDuplicatesExcept(
  allFeedGroups: Record<string, FeedGroup[]>,
  key: string,
  keepCardId: string,
  removeCardSilent: (subjectId: string, date: string, cardId: string) => Promise<void>,
): Promise<number> {
  const toRemove: CardRef[] = [];
  iterateAllCards(allFeedGroups, (card, subjectId, date) => {
    if (card.id === keepCardId) return;
    if (cardDedupeKey(card) === key) {
      toRemove.push({ card, subjectId, date });
    }
  });
  for (const ref of toRemove) {
    await removeCardSilent(ref.subjectId, ref.date, ref.card.id);
  }
  return toRemove.length;
}
