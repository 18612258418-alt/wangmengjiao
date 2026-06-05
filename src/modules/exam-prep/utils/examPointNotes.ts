import type { CardData, ExamKnowledgePoint, FeedGroup } from "../types";
import { buildSubjectCatalog, type CatalogNode } from "./subjectCatalog";

export interface ExamRelatedNote {
  card: CardData;
  date: string;
}

/** 数学备考考点 → 笔记知识树叶子路径（不含根节点「数学」） */
const MATH_EXAM_POINT_CATALOG_PATHS: Record<string, string[][]> = {
  math_func: [["高等数学·上", "第一章 函数、极限与连续", "函数的概念与性质"]],
  math_limit: [
    ["高等数学·上", "第一章 函数、极限与连续", "函数极限"],
    ["高等数学·上", "第一章 函数、极限与连续", "无穷小与无穷大"],
    ["高等数学·上", "第一章 函数、极限与连续", "数列极限"],
  ],
  math_continuity: [["高等数学·上", "第一章 函数、极限与连续", "函数的连续性"]],
  math_deriv: [
    ["高等数学·上", "第二章 导数与微分", "导数概念与运算法则"],
    ["高等数学·上", "第二章 导数与微分", "高阶导数与微分"],
  ],
  math_mean_value: [["高等数学·上", "第二章 导数与微分", "微分中值定理"]],
  math_lhopital: [["高等数学·上", "第二章 导数与微分", "洛必达法则"]],
  math_taylor: [["高等数学·上", "第二章 导数与微分", "泰勒公式"]],
  math_monotone: [
    ["高等数学·上", "第三章 导数的应用", "单调性与极值"],
    ["高等数学·上", "第三章 导数的应用", "最值与优化问题"],
    ["高等数学·上", "第三章 导数的应用", "曲线描绘"],
  ],
  math_integral_indef: [
    ["高等数学·上", "第四章 不定积分", "原函数与不定积分"],
    ["高等数学·上", "第四章 不定积分", "换元积分法"],
    ["高等数学·上", "第四章 不定积分", "分部积分法"],
    ["高等数学·上", "第四章 不定积分", "有理函数积分"],
  ],
  math_integral_def: [["高等数学·上", "第五章 定积分", "定积分概念与性质"]],
  math_integral_upper: [["高等数学·上", "第五章 定积分", "微积分基本定理"]],
  math_improper: [["高等数学·上", "第五章 定积分", "反常积分"]],
  math_integral_app: [
    ["高等数学·上", "第六章 定积分的应用", "平面图形面积"],
    ["高等数学·上", "第六章 定积分的应用", "旋转体体积"],
    ["高等数学·上", "第六章 定积分的应用", "物理应用"],
  ],
  math_ode: [
    ["高等数学·上", "第七章 微分方程", "可分离变量方程"],
    ["高等数学·上", "第七章 微分方程", "一阶线性微分方程"],
  ],
  math_series: [
    ["高等数学·下", "第十一章 无穷级数", "常数项级数"],
    ["高等数学·下", "第十一章 无穷级数", "幂级数"],
  ],
  math_vector: [
    ["线性代数", "第三章 向量与线性方程组", "向量运算"],
    ["预备知识与工具", "解析几何基础"],
  ],
  math_multivar: [
    ["高等数学·下", "第八章 多元函数微分学", "多元函数概念"],
    ["高等数学·下", "第八章 多元函数微分学", "偏导数与全微分"],
    ["高等数学·下", "第八章 多元函数微分学", "多元复合求导"],
    ["高等数学·下", "第八章 多元函数微分学", "方向导数与梯度"],
  ],
  math_double_int: [["高等数学·下", "第九章 重积分", "二重积分"]],
  math_det_matrix: [
    ["线性代数", "第一章 行列式", "行列式定义与性质"],
    ["线性代数", "第一章 行列式", "行列式计算"],
    ["线性代数", "第二章 矩阵及其运算", "矩阵运算"],
  ],
  math_linear_eq: [
    ["线性代数", "第三章 向量与线性方程组", "线性方程组"],
    ["线性代数", "第三章 向量与线性方程组", "线性相关性"],
  ],
  math_eigen: [
    ["线性代数", "第四章 特征值与特征向量", "特征值与特征向量"],
    ["线性代数", "第四章 特征值与特征向量", "二次型"],
  ],
};

function collectCardIds(node: CatalogNode): string[] {
  const ids = new Set<string>(node.cardIds);
  for (const child of node.children) {
    for (const id of collectCardIds(child)) ids.add(id);
  }
  return [...ids];
}

function findNodeByPath(root: CatalogNode, path: string[]): CatalogNode | null {
  let current: CatalogNode = root;
  for (const label of path) {
    const child = current.children.find(c => c.label === label);
    if (!child) return null;
    current = child;
  }
  return current;
}

function flattenNoteCards(feedGroups: FeedGroup[]): ExamRelatedNote[] {
  const items: ExamRelatedNote[] = [];
  for (const group of feedGroups) {
    for (const card of group.cards) {
      if (card.contentType === "homework") continue;
      items.push({ card, date: group.date });
    }
  }
  return items;
}

function cardSearchText(card: CardData): string {
  return [
    card.title,
    card.overview ?? "",
    card.detailIntro ?? "",
    ...(card.aiKeyPoints ?? []),
    ...(card.detailSections?.flatMap(s => [s.title, ...s.items]) ?? []),
    card.unifiedDetail ?? "",
  ].join(" ");
}

function matchByKeywords(point: ExamKnowledgePoint, feedGroups: FeedGroup[]): string[] {
  const keywords = [
    point.label,
    point.chapter.replace(/^第.+章\s*/, ""),
    ...point.examPoints.slice(0, 3),
  ]
    .map(s => s.trim())
    .filter(s => s.length >= 2);

  const matched: string[] = [];
  for (const { card } of flattenNoteCards(feedGroups)) {
    const text = cardSearchText(card);
    const hit = keywords.some(kw => text.includes(kw));
    if (hit) matched.push(card.id);
  }
  return matched;
}

function resolveCardIdsFromCatalog(
  subjectId: string,
  pointId: string,
  feedGroups: FeedGroup[],
  subjectShort: string,
): string[] {
  const catalog = buildSubjectCatalog(feedGroups, subjectShort, subjectId);
  if (!catalog) return [];

  const paths = subjectId === "math" ? MATH_EXAM_POINT_CATALOG_PATHS[pointId] : undefined;
  if (!paths?.length) return [];

  const ids = new Set<string>();
  for (const path of paths) {
    const node = findNodeByPath(catalog, path);
    if (!node) continue;
    for (const id of collectCardIds(node)) ids.add(id);
  }
  return [...ids];
}

/** 根据考点与学科笔记，解析关联笔记列表 */
export function getRelatedNotesForExamPoint(
  subjectId: string,
  subjectShort: string,
  point: ExamKnowledgePoint,
  feedGroups: FeedGroup[],
): ExamRelatedNote[] {
  const allNotes = flattenNoteCards(feedGroups);
  const byId = new Map(allNotes.map(n => [n.card.id, n]));

  const idSet = new Set<string>();

  // 1. 大模型上传时写入的显式挂靠（优先级最高）
  for (const { card } of allNotes) {
    if (card.linkedExamPointIds?.includes(point.id)) idSet.add(card.id);
  }

  // 2. 知识树路径匹配（数学）/ 关键词回退
  for (const id of resolveCardIdsFromCatalog(subjectId, point.id, feedGroups, subjectShort)) {
    idSet.add(id);
  }

  if (idSet.size === 0) {
    for (const id of matchByKeywords(point, feedGroups)) idSet.add(id);
  }

  const result: ExamRelatedNote[] = [];
  for (const id of idSet) {
    const item = byId.get(id);
    if (item) result.push(item);
  }

  return result.sort((a, b) => {
    const ta = a.card.time;
    const tb = b.card.time;
    return tb.localeCompare(ta);
  });
}
