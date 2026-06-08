import type { CardData, FeedGroup } from "../types";
import { appearsInNotesTab, RECENT_NOTES_ENTRY_ID } from "./cardSurfaces";
import { isNoteCard } from "./feedFilters";

export function collectNoteCards(feedGroups: FeedGroup[]): CardData[] {
  const cards: CardData[] = [];
  for (const group of feedGroups) {
    for (const card of group.cards) {
      if (isNoteCard(card)) cards.push(card);
    }
  }
  return cards;
}

/** 尚未关联教学大纲条目的笔记（含全部用户上传/批注） */
export function collectUnmappedNoteCards(
  feedGroups: FeedGroup[],
): Array<{ card: CardData; date: string }> {
  const result: Array<{ card: CardData; date: string }> = [];
  for (const group of feedGroups) {
    for (const card of group.cards) {
      if (!appearsInNotesTab(card)) continue;
      if (card.syllabusEntryId) continue;
      result.push({ card, date: group.date });
    }
  }
  return result;
}

export function resolveSyllabusEntryId(card: CardData): string | undefined {
  return card.syllabusEntryId;
}

export function cardsForSyllabusEntry(
  feedGroups: FeedGroup[],
  entryId: string,
): Array<{ card: CardData; date: string }> {
  if (entryId === RECENT_NOTES_ENTRY_ID) {
    return collectUnmappedNoteCards(feedGroups);
  }
  const result: Array<{ card: CardData; date: string }> = [];
  for (const group of feedGroups) {
    for (const card of group.cards) {
      if (!isNoteCard(card)) continue;
      if (resolveSyllabusEntryId(card) === entryId) {
        result.push({ card, date: group.date });
      }
    }
  }
  return result;
}

export function syllabusEntryHasCards(feedGroups: FeedGroup[], entryId: string): boolean {
  if (entryId === RECENT_NOTES_ENTRY_ID) {
    return collectUnmappedNoteCards(feedGroups).length > 0;
  }
  return cardsForSyllabusEntry(feedGroups, entryId).length > 0;
}

/** 该大纲条目下是否存在「新增未读」笔记（用于红点角标） */
export function syllabusEntryHasUnread(feedGroups: FeedGroup[], entryId: string): boolean {
  return cardsForSyllabusEntry(feedGroups, entryId).some(({ card }) => card.unread === true);
}

export function countSyllabusEntriesWithCards(
  feedGroups: FeedGroup[],
  topicIds: string[],
): number {
  return topicIds.filter(id => syllabusEntryHasCards(feedGroups, id)).length;
}
