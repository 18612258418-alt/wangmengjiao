import { useEffect, useMemo, useRef } from "react";
import type { FeedGroup } from "../types";
import {
  findDuplicateGroups,
  planMerge,
  snapshotForUndo,
  type MergeUndoSnapshot,
} from "../utils/memoryMerge";
import { iterateAllCards } from "../utils/memoryRecall";

interface Options {
  allFeedGroups: Record<string, FeedGroup[]>;
  dbLoading: boolean;
  removeCardSilent: (subjectId: string, date: string, cardId: string) => Promise<void>;
  restoreMergedCards: (snapshots: MergeUndoSnapshot[]) => Promise<void>;
  showToast: (
    msg: string,
    opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number },
  ) => void;
}

function feedSignature(allFeedGroups: Record<string, FeedGroup[]>): string {
  const parts: string[] = [];
  iterateAllCards(allFeedGroups, (card, subjectId, date) => {
    parts.push(`${subjectId}:${date}:${card.id}:${card.time}`);
  });
  parts.sort();
  return parts.join("|");
}

/** 启动后自动物理合并重复记忆，Toast 内可撤销 */
export function useAutoMergeDuplicates({
  allFeedGroups,
  dbLoading,
  removeCardSilent,
  restoreMergedCards,
  showToast,
}: Options) {
  const mergedKeysRef = useRef(new Set<string>());
  const runningRef = useRef(false);
  const feedRef = useRef(allFeedGroups);
  const showToastRef = useRef(showToast);
  const restoreRef = useRef(restoreMergedCards);
  const removeRef = useRef(removeCardSilent);

  feedRef.current = allFeedGroups;
  showToastRef.current = showToast;
  restoreRef.current = restoreMergedCards;
  removeRef.current = removeCardSilent;

  const signature = useMemo(() => feedSignature(allFeedGroups), [allFeedGroups]);

  useEffect(() => {
    if (dbLoading) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (runningRef.current) return;

        const groups = findDuplicateGroups(feedRef.current).filter(
          g => !mergedKeysRef.current.has(g.key),
        );
        if (groups.length === 0) return;

        runningRef.current = true;
        const snapshots: MergeUndoSnapshot[] = [];
        let removedCount = 0;

        try {
          for (const group of groups) {
            const { remove } = planMerge(group);
            if (remove.length === 0) continue;
            for (const ref of remove) {
              await removeRef.current(ref.subjectId, ref.date, ref.card.id);
            }
            snapshots.push(snapshotForUndo(group.key, remove));
            mergedKeysRef.current.add(group.key);
            removedCount += remove.length;
          }

          if (removedCount === 0) return;

          // 等 state 刷完再弹 Toast，避免被后续 render 盖掉
          window.requestAnimationFrame(() => {
            showToastRef.current(`已自动合并 ${removedCount} 条重复记忆`, {
              actionLabel: "撤销",
              durationMs: 8000,
              onAction: () => {
                for (const snap of snapshots) {
                  mergedKeysRef.current.delete(snap.groupKey);
                }
                void restoreRef.current(snapshots);
              },
            });
          });
        } finally {
          runningRef.current = false;
        }
      })();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [signature, dbLoading]);
}
