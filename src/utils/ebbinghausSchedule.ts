import type { CardData, ExamMasteryStatus } from "../types";
import { getExamSummary } from "./cardTasks";

/** 艾宾浩斯复习间隔（天）：相对上一次复习完成时刻 */
export const EBBINGHAUS_INTERVAL_DAYS = [1, 2, 4, 7, 15, 30];

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}

export function formatWeekdayLabel(d: Date, base: Date): string {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const today = startOfDay(base).getTime();
  const t = startOfDay(d).getTime();
  if (t === today) return "今天";
  if (t === today + DAY_MS) return "明天";
  return `${d.getMonth() + 1}/${d.getDate()} ${weekdays[d.getDay()]}`;
}

export type ExamScheduleKind = "review" | "ebbinghaus" | "new";

export type ExamScheduleItem = {
  card: CardData;
  feedDate: string;
  kind: ExamScheduleKind;
  masteryStatus?: ExamMasteryStatus;
  /** 第几次间隔复习（1-based，仅 ebbinghaus） */
  reviewRound?: number;
  label: string;
};

/** 从「已掌握」状态计算下一次复习日 0 点 */
export function getNextReviewDate(
  lastReviewedAt: number,
  stage: number,
): Date {
  const idx = Math.min(Math.max(stage, 0), EBBINGHAUS_INTERVAL_DAYS.length - 1);
  const days = EBBINGHAUS_INTERVAL_DAYS[idx];
  const next = startOfDay(new Date(lastReviewedAt));
  next.setDate(next.getDate() + days);
  return next;
}

/** 在 7 日窗口内投影后续复习点（假设每次在计划日完成复习） */
export function projectReviewDatesInWindow(
  lastReviewedAt: number,
  stage: number,
  windowStart: Date,
  windowEnd: Date,
): Array<{ date: Date; round: number }> {
  const out: Array<{ date: Date; round: number }> = [];
  let cursor = lastReviewedAt;
  let s = stage;
  const startMs = startOfDay(windowStart).getTime();
  const endMs = startOfDay(windowEnd).getTime() + DAY_MS - 1;

  for (let guard = 0; guard < EBBINGHAUS_INTERVAL_DAYS.length && s < EBBINGHAUS_INTERVAL_DAYS.length; guard++) {
    const next = getNextReviewDate(cursor, s);
    const ms = next.getTime();
    if (ms > endMs) break;
    if (ms >= startMs) {
      out.push({ date: next, round: s + 1 });
    }
    cursor = ms;
    s += 1;
  }
  return out;
}

export function buildNext7DayKeys(from: Date = new Date()): string[] {
  const keys: string[] = [];
  const base = startOfDay(from);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    keys.push(toDateKey(d));
  }
  return keys;
}

export function buildExamWeekSchedule(
  items: Array<{ card: CardData; date: string }>,
  from: Date = new Date(),
): { dayKeys: string[]; byDay: Record<string, ExamScheduleItem[]> } {
  const dayKeys = buildNext7DayKeys(from);
  const windowStart = startOfDay(from);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 6);
  const todayKey = dayKeys[0];
  const byDay: Record<string, ExamScheduleItem[]> = Object.fromEntries(
    dayKeys.map(k => [k, []]),
  );

  for (const { card, date: feedDate } of items) {
    const summary = getExamSummary(card).slice(0, 36);
    const title = card.title.replace(/^记忆[:：]\s*/, "");

    if (card.examMasteryStatus === "review") {
      const key = todayKey;
      byDay[key].push({
        card,
        feedDate,
        kind: "review",
        masteryStatus: "review",
        label: "待复习",
      });
      continue;
    }

    if (card.examMasteryStatus === "mastered") {
      const last =
        card.examLastReviewedAt ??
        (feedDate.length === 8
          ? new Date(
              Number(feedDate.slice(0, 4)),
              Number(feedDate.slice(4, 6)) - 1,
              Number(feedDate.slice(6, 8)),
            ).getTime()
          : Date.now());
      const stage = card.examReviewStage ?? 0;
      const projected = projectReviewDatesInWindow(last, stage, windowStart, windowEnd);
      if (projected.length === 0) {
        const next = getNextReviewDate(last, stage);
        const key = toDateKey(next.getTime() < windowStart.getTime() ? windowStart : next);
        if (dayKeys.includes(key)) {
          byDay[key].push({
            card,
            feedDate,
            kind: "ebbinghaus",
            masteryStatus: "mastered",
            reviewRound: stage + 1,
            label: `第 ${stage + 1} 次巩固`,
          });
        }
      } else {
        for (const { date, round } of projected) {
          const key = toDateKey(date);
          if (!dayKeys.includes(key)) continue;
          byDay[key].push({
            card,
            feedDate,
            kind: "ebbinghaus",
            masteryStatus: "mastered",
            reviewRound: round,
            label: `第 ${round} 次巩固`,
          });
        }
      }
      continue;
    }

    byDay[todayKey].push({
      card,
      feedDate,
      kind: "new",
      label: "建议初练",
    });
  }

  for (const key of dayKeys) {
    byDay[key].sort((a, b) => {
      const order = { review: 0, new: 1, ebbinghaus: 2 };
      return order[a.kind] - order[b.kind];
    });
  }

  return { dayKeys, byDay };
}

/** 掌握 / 待复习 时写入的时间戳与阶段 */
export function masteryUpdatePayload(
  status: ExamMasteryStatus,
  card: CardData,
): Pick<CardData, "examMasteryStatus" | "examLastReviewedAt" | "examReviewStage"> {
  const now = Date.now();
  if (status === "review") {
    return {
      examMasteryStatus: "review",
      examLastReviewedAt: now,
      examReviewStage: card.examReviewStage ?? 0,
    };
  }
  const prevStage = card.examReviewStage ?? 0;
  const wasMastered = card.examMasteryStatus === "mastered";
  return {
    examMasteryStatus: "mastered",
    examLastReviewedAt: now,
    examReviewStage: wasMastered ? Math.min(prevStage + 1, EBBINGHAUS_INTERVAL_DAYS.length - 1) : 0,
  };
}
