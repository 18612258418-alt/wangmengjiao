/**
 * 大学数学大一课程标准章节目录（高等数学上/下 · 线性代数 · 概率统计基础）
 * 用于数学学科笔记 Tab 左侧知识树；笔记按关键词挂靠到叶子节点。
 */
import type { CardData, FeedGroup } from "../types";
import type { CatalogNode } from "../utils/subjectCatalog";

export interface MathCurriculumNodeDef {
  label: string;
  children?: MathCurriculumNodeDef[];
  /** 匹配笔记标题、要点、章节时的关键词 */
  keywords?: string[];
}

/** 大学数学大一课程知识树 */
export const UNIVERSITY_MATH_FRESHMAN_CURRICULUM: MathCurriculumNodeDef[] = [
  {
    label: "高等数学·上",
    children: [
      {
        label: "第一章 函数、极限与连续",
        children: [
          { label: "函数的概念与性质", keywords: ["函数", "定义域", "奇偶", "周期", "反函数"] },
          { label: "数列极限", keywords: ["数列", "通项", "等差", "等比", "递推", "求和", "Sₙ", "aₙ"] },
          { label: "函数极限", keywords: ["极限", "ε-δ", "左右极限", "重要极限", "曲边梯形", "瞬时速度"] },
          { label: "无穷小与无穷大", keywords: ["无穷小", "无穷大", "等价无穷小", "高阶", "同阶"] },
          { label: "函数的连续性", keywords: ["连续", "间断点", "第一类", "第二类"] },
        ],
      },
      {
        label: "第二章 导数与微分",
        children: [
          { label: "导数概念与运算法则", keywords: ["导数", "求导", "切线", "斜率", "链式", "乘积法则", "商法则"] },
          { label: "高阶导数与微分", keywords: ["高阶导数", "微分", "dy", "dx"] },
          { label: "微分中值定理", keywords: ["罗尔", "拉格朗日", "柯西", "中值定理"] },
          { label: "洛必达法则", keywords: ["洛必达", "0/0", "∞/∞", "未定式"] },
          { label: "泰勒公式", keywords: ["泰勒", "麦克劳林", "展开式"] },
        ],
      },
      {
        label: "第三章 导数的应用",
        children: [
          { label: "单调性与极值", keywords: ["单调", "极值", "驻点", "凹凸", "拐点"] },
          { label: "最值与优化问题", keywords: ["最值", "优化", "应用题", "最大值", "最小值"] },
          { label: "曲线描绘", keywords: ["渐近线", "作图", "描绘"] },
        ],
      },
      {
        label: "第四章 不定积分",
        children: [
          { label: "原函数与不定积分", keywords: ["原函数", "不定积分", "∫"] },
          { label: "换元积分法", keywords: ["换元", "凑微分", "三角换元", "第一换元", "第二换元"] },
          { label: "分部积分法", keywords: ["分部积分", "uv", "反对幂指三"] },
          { label: "有理函数积分", keywords: ["有理函数", "部分分式"] },
        ],
      },
      {
        label: "第五章 定积分",
        children: [
          { label: "定积分概念与性质", keywords: ["定积分", "黎曼", "可积", "性质"] },
          { label: "微积分基本定理", keywords: ["牛顿", "莱布尼茨", "基本定理", "变上限"] },
          { label: "定积分的换元与分部", keywords: ["定积分换元", "定积分分部"] },
          { label: "反常积分", keywords: ["反常积分", "无穷区间", "瑕积分"] },
        ],
      },
      {
        label: "第六章 定积分的应用",
        children: [
          { label: "平面图形面积", keywords: ["面积", "围成", "上下限", "两曲线"] },
          { label: "旋转体体积", keywords: ["旋转体", "体积", "绕轴"] },
          { label: "物理应用", keywords: ["功", "压力", "引力", "物理应用"] },
        ],
      },
      {
        label: "第七章 微分方程",
        children: [
          { label: "可分离变量方程", keywords: ["可分离", "分离变量"] },
          { label: "一阶线性微分方程", keywords: ["一阶线性", "齐次方程", "常数变易"] },
        ],
      },
    ],
  },
  {
    label: "高等数学·下",
    children: [
      {
        label: "第八章 多元函数微分学",
        children: [
          { label: "多元函数概念", keywords: ["多元函数", "二元", "定义域"] },
          { label: "偏导数与全微分", keywords: ["偏导", "全微分", "∂"] },
          { label: "多元复合求导", keywords: ["复合", "链式法则", "多元"] },
          { label: "方向导数与梯度", keywords: ["方向导数", "梯度"] },
        ],
      },
      {
        label: "第九章 重积分",
        children: [
          { label: "二重积分", keywords: ["二重积分", "∬"] },
          { label: "三重积分", keywords: ["三重积分", "∭"] },
        ],
      },
      {
        label: "第十章 曲线积分与曲面积分",
        children: [
          { label: "曲线积分", keywords: ["曲线积分", "格林公式"] },
          { label: "曲面积分", keywords: ["曲面积分", "高斯", "斯托克斯"] },
        ],
      },
      {
        label: "第十一章 无穷级数",
        children: [
          { label: "常数项级数", keywords: ["级数", "收敛", "发散", "比较判别", "比值判别"] },
          { label: "幂级数", keywords: ["幂级数", "收敛半径", "收敛域"] },
          { label: "傅里叶级数", keywords: ["傅里叶"] },
          { label: "二项式定理", keywords: ["二项式", "组合数", "Cₙ", "展开式", "通项"] },
        ],
      },
    ],
  },
  {
    label: "线性代数",
    children: [
      {
        label: "第一章 行列式",
        children: [
          { label: "行列式定义与性质", keywords: ["行列式", "余子式", "代数余子式"] },
          { label: "行列式计算", keywords: ["行列式计算", "三角化", "化为上三角"] },
        ],
      },
      {
        label: "第二章 矩阵及其运算",
        children: [
          { label: "矩阵运算", keywords: ["矩阵", "乘法", "转置", "逆矩阵"] },
          { label: "分块矩阵", keywords: ["分块"] },
        ],
      },
      {
        label: "第三章 向量与线性方程组",
        children: [
          { label: "向量运算", keywords: ["向量", "点积", "叉积", "模长", "空间向量", "法向量"] },
          { label: "线性相关性", keywords: ["线性相关", "线性无关", "秩", "极大无关组"] },
          { label: "线性方程组", keywords: ["方程组", "克拉默", "高斯消元", "通解", "特解"] },
        ],
      },
      {
        label: "第四章 特征值与特征向量",
        children: [
          { label: "特征值与特征向量", keywords: ["特征值", "特征向量", "对角化"] },
          { label: "二次型", keywords: ["二次型", "标准形", "正定"] },
        ],
      },
    ],
  },
  {
    label: "概率论与数理统计",
    children: [
      {
        label: "第一章 随机事件与概率",
        children: [
          { label: "古典概型与几何概型", keywords: ["古典概型", "排列", "组合", "Aₙ", "Cₙ"] },
          { label: "条件概率与独立性", keywords: ["条件概率", "独立", "贝叶斯", "全概率"] },
        ],
      },
      {
        label: "第二章 随机变量及其分布",
        children: [
          { label: "离散型随机变量", keywords: ["离散", "分布律"] },
          { label: "连续型随机变量", keywords: ["连续", "密度函数", "分布函数"] },
        ],
      },
      {
        label: "第三章 数字特征",
        children: [
          { label: "数学期望", keywords: ["期望", "E(X)", "期望值"] },
          { label: "方差与协方差", keywords: ["方差", "标准差", "协方差"] },
        ],
      },
    ],
  },
  {
    label: "预备知识与工具",
    children: [
      { label: "三角函数与恒等变换", keywords: ["三角", "sin", "cos", "和差化积", "辅助角", "恒等"] },
      { label: "解析几何基础", keywords: ["直线", "圆", "椭圆", "抛物线", "双曲线"] },
    ],
  },
];

const SUBJECT_ROOT = "数学";

function slug(parts: string[]): string {
  return parts.join("/").replace(/\s+/g, "_");
}

function cardSearchText(card: CardData): string {
  const chunks: string[] = [
    card.title,
    card.overview ?? "",
    card.detailIntro ?? "",
    ...(card.aiKeyPoints ?? []),
    ...(card.detailSections?.flatMap(s => [s.title, ...s.items]) ?? []),
    card.unifiedDetail ?? "",
  ];
  return chunks.join(" ");
}

function cardMatchesKeywords(card: CardData, keywords: string[]): boolean {
  const text = cardSearchText(card);
  return keywords.some(kw => kw.length > 0 && text.includes(kw));
}

function buildNodeFromDef(
  def: MathCurriculumNodeDef,
  pathParts: string[],
  allCards: CardData[],
): CatalogNode {
  const parts = [...pathParts, def.label];
  const id = slug(parts);
  const children = (def.children ?? []).map(c =>
    buildNodeFromDef(c, parts, allCards),
  );

  const cardIds: string[] = [];
  if (def.keywords?.length && children.length === 0) {
    for (const card of allCards) {
      if (cardMatchesKeywords(card, def.keywords)) cardIds.push(card.id);
    }
  }

  for (const child of children) {
    for (const cid of child.cardIds) {
      if (!cardIds.includes(cid)) cardIds.push(cid);
    }
  }

  return { id, label: def.label, children, cardIds };
}

/** 按 seed 卡片 id 的精确挂靠（优先于关键词） */
const CARD_ID_TO_NODE_PATH: Record<string, string[]> = {
  m1: ["高等数学·上", "第二章 导数与微分", "导数概念与运算法则"],
  m2: ["高等数学·上", "第四章 不定积分", "换元积分法"],
  m3: ["预备知识与工具", "三角函数与恒等变换"],
  m4: ["高等数学·上", "第一章 函数、极限与连续", "数列极限"],
  m5: ["线性代数", "第三章 向量与线性方程组", "向量运算"],
  m6: ["概率论与数理统计", "第一章 随机事件与概率", "古典概型与几何概型"],
  m7: ["高等数学·上", "第六章 定积分的应用", "平面图形面积"],
  m8: ["高等数学·下", "第十一章 无穷级数", "二项式定理"],
  demo_calc: ["高等数学·上", "第一章 函数、极限与连续", "函数极限"],
};

function findNodeByPath(root: CatalogNode, path: string[]): CatalogNode | null {
  if (path.length === 0) return root;
  const [head, ...rest] = path;
  const child = root.children.find(c => c.label === head);
  if (!child) return null;
  return findNodeByPath(child, rest);
}

function attachCardToPath(root: CatalogNode, path: string[], cardId: string) {
  const node = findNodeByPath(root, path);
  if (!node) return;
  if (!node.cardIds.includes(cardId)) node.cardIds.push(cardId);
  let p = root;
  for (const label of path) {
    const c = p.children.find(x => x.label === label);
    if (!c) break;
    if (!c.cardIds.includes(cardId)) c.cardIds.push(cardId);
    p = c;
  }
}

/** 构建数学学科「大学大一」标准知识树并挂靠笔记 */
export function buildMathFreshmanCatalog(feedGroups: FeedGroup[]): CatalogNode | null {
  const allCards = feedGroups.flatMap(g => g.cards);
  const rootParts = [SUBJECT_ROOT];

  const children = UNIVERSITY_MATH_FRESHMAN_CURRICULUM.map(def =>
    buildNodeFromDef(def, rootParts, allCards),
  );

  const root: CatalogNode = {
    id: slug(rootParts),
    label: SUBJECT_ROOT,
    children,
    cardIds: [],
  };

  for (const card of allCards) {
    const path = CARD_ID_TO_NODE_PATH[card.id];
    if (path) attachCardToPath(root, path, card.id);
  }

  for (const child of children) {
    for (const cid of child.cardIds) {
      if (!root.cardIds.includes(cid)) root.cardIds.push(cid);
    }
  }

  return root;
}
