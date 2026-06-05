/**
 * 备考 Tab 额外演示题（contentType=exam）
 */
import imgCard2 from "figma:asset/fb8e880924fdb9fc278121634820f87fa78939da.png";
import imgMathProbability from "../imports/math-probability.png";
import type { CardData, FeedGroup } from "../types";
import { mergeExamPrepIntoCard } from "./examPrepContent";

const ex = (card: CardData): CardData => mergeExamPrepIntoCard({ ...card, contentType: "exam" as const });

export const EXAM_SEED_PATCH: Record<string, FeedGroup[]> = {
  physics: [
    {
      date: "20260605",
      label: "新增了1个记忆",
      summary: "光电效应专题备考：爱因斯坦方程与遏止电压。",
      cards: [
        ex({
          id: "ex_c2",
          title: "记忆：光电效应期末考题",
          img: imgCard2,
          source: "zhihu",
          time: "10:00",
          examSummary: "光电效应：Ek 与频率关系、遏止电压判断",
          overview: "考查爱因斯坦光电效应方程与图像分析。",
        }),
      ],
    },
  ],
  math: [
    {
      date: "20260603",
      label: "新增了1个记忆",
      summary: "概率论条件概率与独立性备考练习。",
      cards: [
        ex({
          id: "ex_m6",
          title: "记忆：条件概率考题",
          img: imgMathProbability,
          source: "evernote",
          time: "15:30",
          examSummary: "条件概率与独立事件判断",
          overview: "抽球与条件概率经典题型。",
        }),
      ],
    },
  ],
};

export const EXAM_SEED_PATCH_KEY = "exam-seed-patch-v2";

export function mergeExamSeedIntoFeeds(
  feeds: FeedGroup[],
  subjectId: keyof typeof EXAM_SEED_PATCH,
): FeedGroup[] {
  const patch = EXAM_SEED_PATCH[subjectId];
  if (!patch?.length) return feeds.map(g => ({ ...g, cards: g.cards.map(mergeExamPrepIntoCard) }));

  const byDate = new Map(feeds.map(g => [g.date, { ...g, cards: [...g.cards] }]));
  for (const pg of patch) {
    const existing = byDate.get(pg.date);
    if (existing) {
      const ids = new Set(existing.cards.map(c => c.id));
      for (const card of pg.cards) {
        if (!ids.has(card.id)) existing.cards.push(card);
      }
    } else {
      byDate.set(pg.date, { ...pg, cards: [...pg.cards] });
    }
  }
  return [...byDate.values()]
    .map(g => ({ ...g, cards: g.cards.map(mergeExamPrepIntoCard) }))
    .sort((a, b) => Number(b.date) - Number(a.date));
}
