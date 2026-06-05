import type { CardData, FeedGroup } from "../types";
import { buildMathFreshmanCatalog } from "../data/universityMathFreshmanCatalog";

export interface CatalogNode {
  id: string;
  label: string;
  children: CatalogNode[];
  cardIds: string[];
}

export interface CatalogNodeDetail {
  title: string;
  pathLabel: string;
  highlights: string[];
  difficulties: string[];
  suggestions: string[];
  relatedCards: { id: string; title: string; date: string }[];
}

const DIFFICULTY_KEYWORDS = /易错|难点|陷阱|攻克|易混|注意/;
const HIGHLIGHT_KEYWORDS = /核心|重点|公式|必背|概述|原理|要点|关键/;
const SUGGESTION_KEYWORDS = /建议|延伸|下一步|行动|练习/;

function slug(parts: string[]): string {
  return parts.join("/").replace(/\s+/g, "_");
}

function pathsFromCard(card: CardData): string[][] {
  const paths: string[][] = [];

  if (card.knowledgeTree && card.knowledgeTree.length > 0) {
    const stack: string[] = [];
    for (const node of card.knowledgeTree) {
      while (stack.length >= node.level) stack.pop();
      stack.push(node.label);
      if (node.level >= 1) paths.push([...stack]);
    }
  }

  if (paths.length === 0 && card.detailSections && card.detailSections.length > 0) {
    const base = card.title.replace(/^记忆：/, "").trim();
    for (const sec of card.detailSections) {
      paths.push([base, sec.title]);
    }
    if (card.detailSections.length === 0) paths.push([base]);
  }

  if (paths.length === 0) {
    const base = card.title.replace(/^记忆：/, "").trim();
    if (base) paths.push([base]);
  }

  return paths;
}

function insertPath(
  root: CatalogNode,
  path: string[],
  cardId: string,
  subjectShort: string,
): void {
  if (path.length === 0) return;
  let parent = root;
  const parts: string[] = [subjectShort];
  for (let i = 0; i < path.length; i++) {
    const label = path[i];
    parts.push(label);
    const id = slug(parts);
    let child = parent.children.find(c => c.label === label);
    if (!child) {
      child = { id, label, children: [], cardIds: [] };
      parent.children.push(child);
    }
    if (!child.cardIds.includes(cardId)) child.cardIds.push(cardId);
    parent = child;
  }
}

export function buildSubjectCatalog(
  feedGroups: FeedGroup[],
  subjectShort: string,
  subjectId?: string,
): CatalogNode | null {
  if (subjectId === "math") {
    return buildMathFreshmanCatalog(feedGroups);
  }

  const root: CatalogNode = {
    id: slug([subjectShort]),
    label: subjectShort,
    children: [],
    cardIds: [],
  };

  for (const group of feedGroups) {
    for (const card of group.cards) {
      const paths = pathsFromCard(card);
      for (const path of paths) insertPath(root, path, card.id, subjectShort);
    }
  }

  return root.children.length > 0 ? root : null;
}

function collectCardIds(node: CatalogNode): string[] {
  const ids = new Set<string>(node.cardIds);
  for (const child of node.children) {
    for (const id of collectCardIds(child)) ids.add(id);
  }
  return [...ids];
}

function findNode(root: CatalogNode | null, nodeId: string): CatalogNode | null {
  if (!root) return null;
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

/** 树中是否存在该节点（用于校验历史选中记录） */
export function isCatalogNodeInTree(root: CatalogNode | null, nodeId: string): boolean {
  return findNode(root, nodeId) !== null;
}

/** 深度优先取最左侧第一个叶子知识点 */
export function getFirstCatalogNodeId(root: CatalogNode | null): string | null {
  if (!root || root.children.length === 0) return null;
  const toFirstLeaf = (node: CatalogNode): CatalogNode => {
    if (node.children.length === 0) return node;
    return toFirstLeaf(node.children[0]);
  };
  return toFirstLeaf(root.children[0]).id;
}

function pathToNode(root: CatalogNode, nodeId: string, trail: string[] = []): string[] | null {
  if (root.id === nodeId) return trail;
  for (const child of root.children) {
    const next = pathToNode(child, nodeId, [...trail, child.label]);
    if (next) return next;
  }
  return null;
}

function linesFromUnified(text: string, sectionNames: RegExp): string[] {
  const lines: string[] = [];
  const blocks = text.split(/\n【/);
  for (const block of blocks) {
    const name = block.split("】")[0]?.trim() ?? "";
    if (!sectionNames.test(name)) continue;
    const body = block.includes("】") ? block.split("】").slice(1).join("】") : block;
    for (const line of body.split("\n")) {
      const t = line.replace(/^[-*•]\s*/, "").replace(/\[\[|\]\]/g, "").trim();
      if (t.length > 8) lines.push(t);
    }
  }
  return lines;
}

function extractFromCard(card: CardData): {
  highlights: string[];
  difficulties: string[];
  suggestions: string[];
} {
  const highlights: string[] = [];
  const difficulties: string[] = [];
  const suggestions: string[] = [];

  if (card.aiKeyPoints?.length) highlights.push(...card.aiKeyPoints);
  if (card.overview) highlights.push(card.overview);
  if (card.detailIntro) highlights.push(card.detailIntro);

  for (const sec of card.detailSections ?? []) {
    const title = sec.title;
    const items = sec.items;
    if (DIFFICULTY_KEYWORDS.test(title)) difficulties.push(...items.map(i => `${title}：${i}`));
    else if (HIGHLIGHT_KEYWORDS.test(title)) highlights.push(...items);
    else if (SUGGESTION_KEYWORDS.test(title)) suggestions.push(...items);
    else highlights.push(...items.map(i => `${title}：${i}`));
  }

  if (card.unifiedDetail) {
    highlights.push(
      ...linesFromUnified(card.unifiedDetail, /内容概述|核心原理|核心思路/),
    );
    difficulties.push(...linesFromUnified(card.unifiedDetail, /考点解析|易错/));
    suggestions.push(...linesFromUnified(card.unifiedDetail, /学习建议|知识关联/));
  }

  if (card.nextAction) suggestions.push(card.nextAction);
  for (const ek of card.expandedKnowledge ?? []) {
    suggestions.push(`${ek.concept}：${ek.explanation}`);
  }

  const dedupe = (arr: string[]) => [...new Set(arr.map(s => s.trim()).filter(Boolean))].slice(0, 12);
  return {
    highlights: dedupe(highlights),
    difficulties: dedupe(difficulties),
    suggestions: dedupe(suggestions),
  };
}

export function getCatalogNodeDetail(
  root: CatalogNode | null,
  nodeId: string,
  feedGroups: FeedGroup[],
): CatalogNodeDetail | null {
  const node = findNode(root, nodeId);
  if (!node || nodeId === root?.id) return null;

  const cardIds = collectCardIds(node);
  const pathParts = root ? pathToNode(root, nodeId) : null;
  const pathLabel = pathParts?.join(" › ") ?? node.label;

  const highlights: string[] = [];
  const difficulties: string[] = [];
  const suggestions: string[] = [];
  const relatedCards: CatalogNodeDetail["relatedCards"] = [];

  for (const group of feedGroups) {
    for (const card of group.cards) {
      if (!cardIds.includes(card.id)) continue;
      relatedCards.push({ id: card.id, title: card.title, date: group.date });
      const ex = extractFromCard(card);
      highlights.push(...ex.highlights);
      difficulties.push(...ex.difficulties);
      suggestions.push(...ex.suggestions);
    }
  }

  const dedupe = (arr: string[]) => [...new Set(arr)].slice(0, 10);

  return {
    title: node.label,
    pathLabel,
    highlights: dedupe(highlights),
    difficulties: dedupe(difficulties),
    suggestions: dedupe(suggestions),
    relatedCards,
  };
}

/** 按知识点节点筛选笔记 Feed（含子节点关联的卡片） */
export function filterFeedGroupsByCatalogNode(
  feedGroups: FeedGroup[],
  root: CatalogNode | null,
  nodeId: string | null,
): FeedGroup[] {
  if (!root || !nodeId) return [];
  const node = findNode(root, nodeId);
  if (!node) return [];
  const cardIds = new Set(collectCardIds(node));
  const result: FeedGroup[] = [];
  for (const group of feedGroups) {
    const cards = group.cards.filter(c => cardIds.has(c.id));
    if (cards.length === 0) continue;
    result.push({ ...group, cards, label: `${cards.length} 条相关笔记` });
  }
  return result;
}
