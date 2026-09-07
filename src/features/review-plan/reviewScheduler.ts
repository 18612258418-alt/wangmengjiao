export type ReviewOutcome = "pass" | "partial" | "reviewed";

export type ReviewSchedule = {
  stage: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  intervalDays: number;
  lastOutcome: ReviewOutcome | null;
};

const INTERVAL_DAYS = [1, 2, 4, 7, 15, 30, 60];
const STORAGE_PREFIX = "memo:review-schedule:v1";

const storageKey = (subjectId: string, topicId: string) => `${STORAGE_PREFIX}:${subjectId}:${topicId}`;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

export function loadReviewSchedule(subjectId: string, topicId: string): ReviewSchedule | null {
  try {
    const raw = window.localStorage.getItem(storageKey(subjectId, topicId));
    return raw ? JSON.parse(raw) as ReviewSchedule : null;
  } catch {
    return null;
  }
}

export function updateReviewSchedule(
  subjectId: string,
  topicId: string,
  outcome: ReviewOutcome,
  completesRecallTest: boolean,
): ReviewSchedule {
  const current = loadReviewSchedule(subjectId, topicId);
  const currentStage = current?.stage ?? 0;
  const nextStage = completesRecallTest
    ? outcome === "pass"
      ? Math.min(currentStage + 1, INTERVAL_DAYS.length - 1)
      : outcome === "partial"
        ? Math.max(currentStage - 1, 0)
        : currentStage
    : currentStage;
  const intervalDays = completesRecallTest && outcome === "pass" ? INTERVAL_DAYS[nextStage] : 1;
  const now = new Date();
  const next: ReviewSchedule = {
    stage: nextStage,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: addDays(now, intervalDays).toISOString(),
    intervalDays,
    lastOutcome: outcome,
  };
  try {
    window.localStorage.setItem(storageKey(subjectId, topicId), JSON.stringify(next));
  } catch {
    // 无法持久化时仍返回本次计算结果，保证当前会话可继续。
  }
  return next;
}

export function formatNextReview(schedule: ReviewSchedule | null) {
  if (!schedule) return "完成本轮后安排下次复习";
  const date = new Date(schedule.nextReviewAt);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dayLabel = sameDay(date, tomorrow) ? "明天" : `${date.getMonth() + 1}月${date.getDate()}日`;
  return `下次复习：${dayLabel} · 间隔 ${schedule.intervalDays} 天`;
}

