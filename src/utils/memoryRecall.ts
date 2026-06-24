import type { CardData, FeedGroup, SourceAnchor } from "../types";
import { dedupeCardRefs } from "./cardDedupe";

export interface RecalledMemory {
  cardId: string;
  subjectId: string;
  date: string;
  title: string;
  summary: string;
  score: number;
  reason: string;
  img?: string;
  card: CardData;
}

export const RECALL_HIT_SCORE = 65;
export const RECALL_WEAK_SCORE = 40;

/** PDF 文件稳定 id（同文件同大小视为同一资料） */
export function makePdfFileId(fileName: string, fileSize = 0): string {
  const base = fileName.replace(/[^\w\u4e00-\u9fff.-]/g, "_").slice(0, 120);
  return `pdf_${base}_${fileSize}`;
}

function cardSearchBlob(card: CardData): string {
  const parts = [
    card.title,
    card.overview,
    card.detailIntro,
    card.unifiedDetail?.slice(0, 400),
    ...(card.aiKeyPoints ?? []),
    ...(card.detailSections ?? []).flatMap(s => [s.title, ...s.items]),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function tokenize(text: string): string[] {
  const t = text.toLowerCase();
  const tokens: string[] = [];
  const en = t.match(/[a-z0-9]{2,}/g);
  if (en) tokens.push(...en);
  const zh = t.match(/[\u4e00-\u9fff]{2,}/g);
  if (zh) tokens.push(...zh);
  return [...new Set(tokens)];
}

function keywordOverlapScore(query: string, card: CardData): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;
  const blob = cardSearchBlob(card);
  let hits = 0;
  for (const tok of qTokens) {
    if (blob.includes(tok)) hits += 1;
  }
  return Math.min(45, hits * 8);
}

function anchorPageScore(anchor: SourceAnchor | undefined, fileId: string, pageNum: number): number {
  if (!anchor) return 0;
  if (anchor.fileId === fileId && anchor.page === pageNum) return 100;
  if (anchor.fileId === fileId) return 72;
  if (anchor.fileName && fileId.includes(anchor.fileName.replace(/[^\w\u4e00-\u9fff.-]/g, "_").slice(0, 40))) {
    return anchor.page === pageNum ? 88 : 55;
  }
  return 0;
}

export function iterateAllCards(
  allFeedGroups: Record<string, FeedGroup[]>,
  fn: (card: CardData, subjectId: string, date: string) => void,
) {
  for (const [subjectId, groups] of Object.entries(allFeedGroups)) {
    for (const g of groups ?? []) {
      for (const card of g.cards ?? []) {
        fn(card, subjectId, g.date);
      }
    }
  }
}

function pickSummary(card: CardData): string {
  if (card.overview?.trim()) return card.overview.trim();
  const first = card.detailSections?.[0];
  if (first?.items?.[0]) return first.items[0];
  if (card.aiKeyPoints?.[0]) return card.aiKeyPoints[0];
  if (card.unifiedDetail?.trim()) return card.unifiedDetail.trim().slice(0, 200);
  return card.title.replace(/^记忆：/, "");
}

function reasonLabel(score: number, samePage: boolean): string {
  if (samePage) return "同页记忆";
  if (score >= 72) return "同资料记忆";
  return "相关记忆";
}

/** PDF 某页圈选前：召回同页/同文件/关键词相关记忆 */
export function recallForPdfPage(
  allFeedGroups: Record<string, FeedGroup[]>,
  opts: {
    fileId: string;
    fileName: string;
    pageNum: number;
    subjectId?: string;
    queryText?: string;
    limit?: number;
  },
): RecalledMemory[] {
  const { fileId, fileName, pageNum, subjectId, queryText = fileName, limit = 3 } = opts;
  const results: RecalledMemory[] = [];

  iterateAllCards(allFeedGroups, (card, sid, date) => {
    if (subjectId && subjectId !== "all" && subjectId !== "__pending__" && sid !== subjectId) {
      return;
    }

    const anchorScore = anchorPageScore(card.sourceAnchor, fileId, pageNum);
    const kwScore = keywordOverlapScore(`${queryText} ${fileName}`, card);
    const score = Math.max(anchorScore, kwScore);
    if (score < RECALL_WEAK_SCORE) return;

    const samePage = card.sourceAnchor?.fileId === fileId && card.sourceAnchor?.page === pageNum;
    results.push({
      cardId: card.id,
      subjectId: sid,
      date,
      title: card.title,
      summary: pickSummary(card),
      score,
      reason: reasonLabel(score, samePage),
      img: card.img,
      card,
    });
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 相机/入库前：按标题与要点召回相似记忆 */
export function recallSimilarMemories(
  allFeedGroups: Record<string, FeedGroup[]>,
  opts: {
    queryText: string;
    subjectId?: string;
    limit?: number;
  },
): RecalledMemory[] {
  const { queryText, subjectId, limit = 3 } = opts;
  const results: RecalledMemory[] = [];

  iterateAllCards(allFeedGroups, (card, sid, date) => {
    if (subjectId && subjectId !== "all" && subjectId !== "__pending__" && sid !== subjectId) {
      return;
    }
    const score = keywordOverlapScore(queryText, card);
    if (score < RECALL_WEAK_SCORE) return;
    results.push({
      cardId: card.id,
      subjectId: sid,
      date,
      title: card.title,
      summary: pickSummary(card),
      score,
      reason: score >= 30 ? "相关记忆" : "可能相关",
      img: card.img,
      card,
    });
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatRecalledAnswer(items: RecalledMemory[]): string {
  return items.map(m => {
    const body = m.summary.length > 320 ? `${m.summary.slice(0, 320)}…` : m.summary;
    return `【${m.reason}】${m.title}\n${body}`;
  }).join("\n\n");
}

export function buildRecalledSections(items: RecalledMemory[]): { title: string; content: string }[] {
  return items.map(m => ({
    title: m.reason,
    content: `${m.title}\n${m.summary}`,
  }));
}

/** 两个来源锚点是否指向同一学习资料 */
export function anchorsEquivalent(a: SourceAnchor, b: SourceAnchor): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "pdf") {
    return Boolean(a.fileId && b.fileId && a.fileId === b.fileId && a.page != null && a.page === b.page);
  }
  if (a.kind === "camera") {
    return Boolean(a.fileId && b.fileId && a.fileId === b.fileId);
  }
  return false;
}

/** 按 sourceAnchor 查找已入库卡片（用于去重更新） */
export function findCardBySourceAnchor(
  allFeedGroups: Record<string, FeedGroup[]>,
  anchor: SourceAnchor,
): { card: CardData; subjectId: string; date: string } | null {
  let found: { card: CardData; subjectId: string; date: string } | null = null;
  iterateAllCards(allFeedGroups, (card, subjectId, date) => {
    if (card.sourceAnchor && anchorsEquivalent(card.sourceAnchor, anchor)) {
      found = { card, subjectId, date };
    }
  });
  return found;
}

/** 展示层去重：与 cardDedupeKey / 自动合并 同一规则 */
export function dedupeCardsBySourceAnchor(
  items: Array<{ card: CardData; date: string }>,
): Array<{ card: CardData; date: string }> {
  return dedupeCardRefs(items);
}

export { cardDedupeKey } from "./cardDedupe";
