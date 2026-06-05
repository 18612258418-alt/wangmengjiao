import { useEffect, useMemo, useState } from "react";
import { ClipboardList, CheckCircle2, Circle } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { formatFeedDateKey } from "../../utils/feedFilters";
import { hasHomeworkIntent } from "../../utils/cardSurfaces";
import {
  getHomeworkTasks,
  isHomeworkTaskCompleted,
  toggleHomeworkTaskCompletion,
} from "../../utils/cardTasks";
import { buildHomeworkTaskBreakdown } from "../../utils/generateHomeworkBreakdown";
import { HomeworkTaskPanel } from "../homework/HomeworkTaskPanel";

type TaskItem = {
  card: CardData;
  task: string;
  taskIndex: number;
  /** 卡片在 feed 中的存储日期（用于 updateCard，可能与展示用的截止日不同） */
  feedDate: string;
};

type DayTasks = {
  dateKey: string;
  items: TaskItem[];
};

type SelectedTask = TaskItem & { dateKey: string };

function buildHomeworkByDay(feedGroups: FeedGroup[]): DayTasks[] {
  const map = new Map<string, TaskItem[]>();

  for (const group of feedGroups) {
    for (const card of group.cards) {
      if (!hasHomeworkIntent(card)) continue;
      const tasks = getHomeworkTasks(card);
      const dayKey =
        card.taskDueDate && /^\d{8}$/.test(card.taskDueDate)
          ? card.taskDueDate
          : group.date;
      const bucket = map.get(dayKey) ?? [];
      tasks.forEach((task, taskIndex) => {
        bucket.push({ card, task, taskIndex, feedDate: group.date });
      });
      map.set(dayKey, bucket);
    }
  }

  return [...map.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([dateKey, items]) => ({ dateKey, items }));
}

function taskKey(item: TaskItem, dateKey: string) {
  return `${dateKey}:${item.card.id}:${item.taskIndex}`;
}

export function HomeworkView({
  subject,
  feedGroups,
  onUpdateCard,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onUpdateCard?: (cardId: string, date: string, updates: Partial<CardData>) => void;
}) {
  const days = useMemo(() => buildHomeworkByDay(feedGroups), [feedGroups]);
  const totalTasks = days.reduce((n, d) => n + d.items.length, 0);

  const firstTask = useMemo((): SelectedTask | null => {
    const day = days[0];
    const item = day?.items[0];
    if (!day || !item) return null;
    return { ...item, dateKey: day.dateKey };
  }, [days]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selected = useMemo((): SelectedTask | null => {
    if (!selectedKey) return firstTask;
    for (const day of days) {
      for (const item of day.items) {
        if (taskKey(item, day.dateKey) === selectedKey) {
          return { ...item, dateKey: day.dateKey };
        }
      }
    }
    return firstTask;
  }, [days, selectedKey, firstTask]);

  useEffect(() => {
    if (firstTask) {
      setSelectedKey(taskKey(firstTask, firstTask.dateKey));
    } else {
      setSelectedKey(null);
    }
  }, [subject.id, firstTask?.card.id, firstTask?.taskIndex, firstTask?.dateKey]);

  const breakdown = useMemo(
    () =>
      selected
        ? buildHomeworkTaskBreakdown(subject.id, selected.task, selected.card)
        : null,
    [subject.id, selected],
  );

  const handleToggleComplete = (item: TaskItem) => {
    if (!onUpdateCard) return;
    onUpdateCard(item.card.id, item.feedDate, toggleHomeworkTaskCompletion(item.card, item.taskIndex));
  };

  if (days.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="flex flex-col items-center justify-center h-72 gap-3">
          <div className="w-14 h-14 rounded-full bg-[#EEF0FF] flex items-center justify-center">
            <ClipboardList size={24} className="text-[#4D5CFF]" />
          </div>
          <p className="text-[14px] text-[#7B8291]">{subject.short}学科暂无作业待办</p>
          <p className="text-[12px] text-[#B0B5C0] text-center max-w-xs">
            上传含截止时间、作业要求或任务清单的内容后，AI 会整理为文字 task 并按天展示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#F5F6FA]">
      {/* 左侧：task 列表 */}
      <div
        className="flex-shrink-0 flex flex-col min-h-0 border-r border-[#EAEDF2]/60"
        style={{ width: "clamp(280px, 38%, 420px)" }}
      >
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <p className="text-[13px] text-[#7B8291]">
            共 {totalTasks} 条待办 · 点击圆圈或详情页可标记完成/取消完成
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-8">
          {days.map(day => (
            <section key={day.dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-[15px] text-[#41464F]" style={{ fontWeight: 700 }}>
                  {formatFeedDateKey(day.dateKey)}
                </p>
                <span className="text-[12px] text-[#7B8291]">{day.items.length} 条</span>
              </div>
              <ul className="space-y-2">
                {day.items.map((item, i) => {
                  const key = taskKey(item, day.dateKey);
                  const active = selected && taskKey(selected, selected.dateKey) === key;
                  const done = isHomeworkTaskCompleted(item.card, item.taskIndex);
                  return (
                    <li
                      key={`${item.card.id}-${item.taskIndex}-${i}`}
                      className={`flex items-stretch gap-2 rounded-2xl border transition-colors ${
                        done
                          ? active
                            ? "bg-[#BBF7D0] border-[#4ADE80]"
                            : "bg-[#DCFCE7] border-[#86EFAC]"
                          : active
                            ? "bg-[#4D5CFF]/10 border-[#C5CCFF]"
                            : "bg-white border-[#EAEDF2]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(item)}
                        disabled={!onUpdateCard}
                        className={`flex-shrink-0 pl-3 pr-1 py-3.5 rounded-l-2xl transition-colors disabled:opacity-40 ${
                          done ? "text-[#059669] hover:text-[#047857]" : "text-[#B0B5C0] hover:text-[#10B981]"
                        }`}
                        aria-label={done ? "取消完成" : "标记完成"}
                        title={done ? "取消完成" : "标记完成"}
                      >
                        {done ? (
                          <CheckCircle2 size={22} className="fill-[#10B981] text-white" />
                        ) : (
                          <Circle size={22} strokeWidth={1.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(key)}
                        className={`flex-1 min-w-0 text-left py-3.5 pr-4 rounded-r-2xl transition-colors ${
                          done
                            ? "text-[#065F46] hover:bg-[#BBF7D0]/50"
                            : active
                              ? "text-[#4D5CFF]"
                              : "text-[#020418] hover:bg-[#FAFBFF]"
                        }`}
                      >
                        <p
                          className="text-[14px] leading-relaxed"
                          style={{ fontWeight: active || done ? 600 : 500 }}
                        >
                          {item.task}
                        </p>
                        <p
                          className={`text-[12px] mt-1.5 truncate ${
                            done
                              ? "text-[#059669]/80"
                              : active
                                ? "text-[#4D5CFF]/70"
                                : "text-[#9CA3AF]"
                          }`}
                        >
                          {done ? "已完成 · " : ""}
                          {item.card.title.replace(/^记忆[:：]\s*/, "")}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* 右侧：作业步骤拆解 */}
      {selected && breakdown ? (
        <HomeworkTaskPanel
          task={selected.task}
          breakdown={breakdown}
          sourceTitle={selected.card.title}
          sourceImage={selected.card.img}
          sourceImageAlt={selected.card.title}
          isCompleted={isHomeworkTaskCompleted(selected.card, selected.taskIndex)}
          onComplete={onUpdateCard ? () => handleToggleComplete(selected) : undefined}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[14px] text-[#B0B5C0]">
          请选择左侧 task
        </div>
      )}
    </div>
  );
}
