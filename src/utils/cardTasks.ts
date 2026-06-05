import type { CardData } from "../types";

/** 从卡片生成作业模块展示用的文字 task 列表 */
export function getHomeworkTasks(card: CardData): string[] {
  if (Array.isArray(card.homeworkTasks) && card.homeworkTasks.length > 0) {
    return card.homeworkTasks.map(t => t.trim()).filter(Boolean);
  }
  const tasks: string[] = [];
  if (card.nextAction?.trim()) {
    tasks.push(card.nextAction.trim());
  }
  for (const section of card.detailSections ?? []) {
    for (const item of section.items ?? []) {
      const t = item.trim();
      if (!t) continue;
      if (/截止|完成|提交|作业|要求|待办|任务|背诵|默写|预习|复习/.test(t)) {
        tasks.push(t.length > 120 ? `${t.slice(0, 117)}…` : t);
      }
    }
  }
  if (tasks.length === 0 && card.summary?.trim()) {
    tasks.push(card.summary.trim());
  }
  if (tasks.length === 0) {
    const title = card.title.replace(/^记忆[:：]\s*/, "").trim();
    tasks.push(title ? `整理并完成：${title}` : "查看详情并落实学习安排");
  }
  return tasks.slice(0, 8);
}

export function isHomeworkTaskCompleted(card: CardData, taskIndex: number): boolean {
  return (card.homeworkCompletedIndices ?? []).includes(taskIndex);
}

/** 切换某条 homework task 的完成状态，返回写入卡片的字段 */
export function toggleHomeworkTaskCompletion(
  card: CardData,
  taskIndex: number,
): Pick<CardData, "homeworkCompletedIndices"> {
  const indices = new Set(card.homeworkCompletedIndices ?? []);
  if (indices.has(taskIndex)) indices.delete(taskIndex);
  else indices.add(taskIndex);
  const sorted = [...indices].sort((a, b) => a - b);
  return { homeworkCompletedIndices: sorted.length > 0 ? sorted : [] };
}

export function getExamSummary(card: CardData): string {
  if (card.examSummary?.trim()) return card.examSummary.trim();
  if (card.summary?.trim()) return card.summary.trim();
  const items = (card.detailSections ?? []).flatMap(s => s.items ?? []);
  if (items.length > 0) return items[0].slice(0, 100);
  return card.title.replace(/^记忆[:：]\s*/, "").trim();
}
