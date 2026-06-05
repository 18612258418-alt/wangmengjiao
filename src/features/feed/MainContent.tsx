import { useMemo } from "react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { filterNoteFeedGroups } from "../../utils/feedFilters";
import { FeedGroup as FeedGroupComponent } from "./FeedGroup";

export function MainContent({
  subject, feedGroups, onOpenCard, newCardId,
  emptyHint,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onOpenCard: (card: CardData, date: string) => void;
  newCardId: string | null;
  emptyHint?: string;
}) {
  const noteGroups = useMemo(() => filterNoteFeedGroups(feedGroups), [feedGroups]);

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-8">
      {noteGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 gap-2">
          <p className="text-[14px] text-[#B0B5C0]">
            {emptyHint ?? `${subject.short}学科暂无笔记`}
          </p>
        </div>
      ) : (
        noteGroups.map((group, index) => (
          <FeedGroupComponent
            key={group.date}
            group={group}
            onOpenCard={onOpenCard}
            newCardId={newCardId}
          />
        ))
      )}
    </div>
  );
}
