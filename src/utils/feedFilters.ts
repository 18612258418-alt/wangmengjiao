import type { CardContentType, FeedGroup } from "../types";
import { appearsInNotesTab, hasHomeworkIntent } from "./cardSurfaces";

export function isNoteCard(card: import("../types").CardData): boolean {
  return appearsInNotesTab(card);
}

export function filterFeedGroupsByContentType(
  feedGroups: FeedGroup[],
  type: CardContentType,
): FeedGroup[] {
  const result: FeedGroup[] = [];
  for (const group of feedGroups) {
    const cards = group.cards.filter(c => {
      if (type === "homework") return hasHomeworkIntent(c);
      return appearsInNotesTab(c);
    });
    if (cards.length === 0) continue;
    const label =
      type === "homework"
        ? `${cards.length} 项待办`
        : group.label;
    result.push({ ...group, cards, label });
  }
  return result;
}

export function filterNoteFeedGroups(feedGroups: FeedGroup[]): FeedGroup[] {
  return filterFeedGroupsByContentType(feedGroups, "note");
}

/** YYYYMMDD → 4月28日 周一 */
export function formatFeedDateKey(dateKey: string): string {
  if (!/^\d{8}$/.test(dateKey)) return dateKey;
  const y = Number(dateKey.slice(0, 4));
  const m = Number(dateKey.slice(4, 6));
  const d = Number(dateKey.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${m}月${d}日 ${weekdays[dt.getDay()]}`;
}
