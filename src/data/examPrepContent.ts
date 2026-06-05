import type { CardData, ExamPracticeQuestion, ExamSolutionStep } from "../types";
import { hasExamIntent } from "../utils/cardSurfaces";

export interface ExamPrepBundle {
  solutionSteps: ExamSolutionStep[];
  practiceQuestions: ExamPracticeQuestion[];
}

export const BUILTIN_EXAM_PREP: Record<string, ExamPrepBundle> = {
  c1: {
    solutionSteps: [
      { title: "1. 审题与建模", content: "判断粒子仅在匀强磁场中运动且速度⊥B，则洛伦兹力提供向心力，轨迹为匀速圆周。" },
      { title: "2. 列核心公式", content: "qvB = mv²/R → R = mv/(qB)；周期 T = 2πm/(qB)，与 v 无关。" },
      { title: "3. 几何定圆心", content: "入射、出射速度方向垂线交点为圆心；圆心角 θ 由几何关系确定，勿用弦角代替。" },
      { title: "4. 求运动时间", content: "t = (θ/2π)·T。禁止用弧长÷v（走的是圆弧）。" },
    ],
    practiceQuestions: [
      {
        id: "c1-q1",
        type: "single_choice",
        stem: "带电粒子垂直进入匀强磁场，若只受洛伦兹力，则其轨迹为？",
        options: ["A. 直线", "B. 匀速圆周", "C. 抛物线", "D. 匀加速直线"],
        answer: "B",
        explanation: "v⊥B 时洛伦兹力始终与速度垂直，提供向心力，做匀速圆周运动。",
      },
      {
        id: "c1-q2",
        type: "true_false",
        stem: "在匀强磁场圆周运动中，粒子速度加倍，周期 T 也加倍。",
        options: ["对", "错"],
        answer: "错",
        explanation: "T = 2πm/(qB) 与速度无关，只与 m、q、B 有关。",
      },
    ],
  },
  m2: {
    solutionSteps: [
      { title: "1. 识别类型", content: "观察被积函数结构：复合函数×导数 → 第一换元（凑微分）；含 √(a²±x²) → 三角换元。" },
      { title: "2. 第一换元", content: "令 u = g(x)，du = g'(x)dx，将积分化为 ∫f(u)du。" },
      { title: "3. 第二换元", content: "如 ∫√(a²−x²)dx 令 x = a sinθ，利用 1−sin²θ = cos²θ 去根号。" },
      { title: "4. 回代与检验", content: "将 θ 或 u 换回 x，对结果求导验证是否等于被积函数。" },
    ],
    practiceQuestions: [
      {
        id: "m2-q1",
        type: "single_choice",
        stem: "∫ 2x·cos(x²) dx 最适合用哪种方法？",
        options: ["A. 分部积分", "B. 第一换元（凑微分）", "C. 第二换元（三角）", "D. 有理函数拆分"],
        answer: "B",
        explanation: "被积函数含 x² 与 2x，令 u=x² 则 du=2x dx，属于凑微分。",
      },
      {
        id: "m2-q2",
        type: "true_false",
        stem: "第二换元后积分结果可以保留 θ 形式，不必换回 x。",
        options: ["对", "错"],
        answer: "错",
        explanation: "定积分/不定积分最终结果需用 x 表示，必须回代。",
      },
    ],
  },
  m7: {
    solutionSteps: [
      { title: "1. 画图", content: "在坐标系标出曲线与积分区间，明确求面积还是旋转体体积。" },
      { title: "2. 确定上下函数", content: "面积 A = ∫ₐᵇ [f上(x) − f下(x)] dx，先判谁在上方。" },
      { title: "3. 找交点", content: "令 f(x)=g(x) 求交点作为积分限，注意区间分段。" },
      { title: "4. 计算与单位", content: "代入原函数求定积分；旋转体用圆盘/壳层法，注意 π 与 dx/dy。" },
    ],
    practiceQuestions: [
      {
        id: "m7-q1",
        type: "single_choice",
        stem: "曲线 y=x 与 y=x² 在 [0,1] 围成平面图形的面积，被积函数应为？",
        options: ["A. x − x²", "B. x² − x", "C. x + x²", "D. |x − x²| 在任意子区间"],
        answer: "A",
        explanation: "[0,1] 上 x ≥ x²，上函数减下函数：x − x²。",
      },
      {
        id: "m7-q2",
        type: "true_false",
        stem: "绕 x 轴旋转体体积公式 V = π∫[f(x)]² dx 中，f(x) 可取负值再平方。",
        options: ["对", "错"],
        answer: "对",
        explanation: "平方后非负，几何半径由 |f(x)| 体现，公式仍成立。",
      },
    ],
  },
  c_c2: {
    solutionSteps: [
      { title: "1. 判断池类型", content: "原电池：自发氧化还原；电解池：外加电源迫使反应发生。" },
      { title: "2. 定阴阳极", content: "原电池：较活泼金属为负极（氧化）；电解池：阴极接电源负极（还原）。" },
      { title: "3. 写电极反应", content: "先写氧化半反应与还原半反应，注意电解质是否参与、是否为水溶液。" },
      { title: "4. 电子流向", content: "外电路：负→正；电解池中阳极氧化、阴极还原，与电源极性对应。" },
    ],
    practiceQuestions: [
      {
        id: "cc2-q1",
        type: "single_choice",
        stem: "锌铜原电池中，锌电极上发生的反应类型是？",
        options: ["A. 氧化", "B. 还原", "C. 分解", "D. 置换（阴极）"],
        answer: "A",
        explanation: "锌比铜活泼，锌失电子被氧化：Zn → Zn²⁺ + 2e⁻。",
      },
      {
        id: "cc2-q2",
        type: "true_false",
        stem: "电解池中，与电源正极相连的电极发生还原反应。",
        options: ["对", "错"],
        answer: "错",
        explanation: "阳极接正极，发生氧化；阴极接负极，发生还原。",
      },
    ],
  },
  ex_c2: {
    solutionSteps: [
      { title: "1. 理解 Ek 含义", content: "Ek 为光电子最大初动能，由入射光频率决定，与光强无关。" },
      { title: "2. 爱因斯坦方程", content: "Ek = hν − W₀；遏止电压满足 eUc = Ek。" },
      { title: "3. 图像判读", content: "I- U 曲线：饱和电流∝光强；截止电压随频率线性增大。" },
      { title: "4. 极限频率", content: "ν < ν₀ 时不发生光电效应，与照射时间长短无关。" },
    ],
    practiceQuestions: [
      {
        id: "ex2-q1",
        type: "single_choice",
        stem: "保持入射光频率不变，仅增大光强，光电子最大初动能将？",
        options: ["A. 增大", "B. 减小", "C. 不变", "D. 先增后减"],
        answer: "C",
        explanation: "Ek = hν−W₀ 只与频率有关，光强影响光电子数目（饱和电流）。",
      },
      {
        id: "ex2-q2",
        type: "true_false",
        stem: "光电效应存在极限频率，低于该频率时光照再久也不会产生光电子。",
        options: ["对", "错"],
        answer: "对",
        explanation: "hν < W₀ 时 Ek<0 物理上不产生光电子。",
      },
    ],
  },
  ex_m6: {
    solutionSteps: [
      { title: "1. 识别模型", content: "古典概型：等可能样本点；条件概率：样本空间缩小。" },
      { title: "2. 列样本空间", content: "明确一次试验所有基本事件，判断排列还是组合。" },
      { title: "3. 代入公式", content: "P(A)=m/n；P(B|A)=P(AB)/P(A)，检查是否独立。" },
      { title: "4. 验算", content: "概率 ∈[0,1]，互斥事件概率相加，独立时 P(AB)=P(A)P(B)。" },
    ],
    practiceQuestions: [
      {
        id: "exm6-q1",
        type: "single_choice",
        stem: "袋中 3 红 2 白，不放回取 2 球，已知第一球为红，第二球也为红的概率属于？",
        options: ["A. 古典概型直接比", "B. 条件概率", "C. 独立事件乘法", "D. 贝叶斯逆概"],
        answer: "B",
        explanation: "“已知第一球红”缩小了样本空间，用条件概率。",
      },
      {
        id: "exm6-q2",
        type: "true_false",
        stem: "若 P(AB)=P(A)P(B)，则事件 A 与 B 一定独立。",
        options: ["对", "错"],
        answer: "对",
        explanation: "这是独立性的定义（在 P(A),P(B)>0 时等价）。",
      },
    ],
  },
};

export function mergeExamPrepIntoCard(card: CardData): CardData {
  const bundle = BUILTIN_EXAM_PREP[card.id];
  if (!bundle || !hasExamIntent(card)) return card;
  return {
    ...card,
    examSolutionSteps: card.examSolutionSteps ?? bundle.solutionSteps,
    examPracticeQuestions: card.examPracticeQuestions ?? bundle.practiceQuestions,
  };
}

export const EXAM_PREP_PATCH_KEY = "exam_prep_patch_v2";
