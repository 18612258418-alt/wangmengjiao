import type { SkillType } from "../types";

/** Pre-assigned skill type + aiKeyPoints for all built-in seed cards (id → meta) */
export const BUILTIN_CARD_META: Record<string, { skill: SkillType; aiKeyPoints: string[] }> = {
  // ── Physics ────────────────────────────────────────────────────────────────
  c1: {
    skill: "theory_concept",
    aiKeyPoints: ["洛伦兹力", "圆周运动", "匀强磁场", "公式推导", "带电粒子"],
  },
  c2: {
    skill: "theory_concept",
    aiKeyPoints: ["光电效应", "量子力学", "公式推导", "能量守恒", "爱因斯坦方程"],
  },
  c3: {
    skill: "theory_concept",
    aiKeyPoints: ["机械能守恒", "动量守恒", "能量守恒", "守恒定律", "受力分析"],
  },
  c4: {
    skill: "theory_concept",
    aiKeyPoints: ["万有引力", "圆周运动", "卫星运动", "公式推导", "向心力"],
  },
  c5: {
    skill: "theory_concept",
    aiKeyPoints: ["电磁感应", "楞次定律", "磁通量", "感应电流", "公式推导"],
  },
  c6: {
    skill: "theory_concept",
    aiKeyPoints: ["静电场", "电场强度", "电势", "等势面", "能量守恒"],
  },
  c9: {
    skill: "theory_concept",
    aiKeyPoints: ["交流电", "变压器", "匝数比", "电压比", "能量守恒"],
  },
  // ── Math ───────────────────────────────────────────────────────────────────
  m1: {
    skill: "math_problem",
    aiKeyPoints: ["导数", "极值", "公式推导", "函数", "切线斜率"],
  },
  m2: {
    skill: "math_problem",
    aiKeyPoints: ["不定积分", "换元法", "公式推导", "微积分", "积分"],
  },
  m3: {
    skill: "math_problem",
    aiKeyPoints: ["三角函数", "和差化积", "公式推导", "恒等变换", "积分"],
  },
  m4: {
    skill: "math_problem",
    aiKeyPoints: ["数列", "等差数列", "等比数列", "通项公式", "求和"],
  },
  m5: {
    skill: "math_problem",
    aiKeyPoints: ["空间向量", "向量运算", "公式推导", "坐标系", "点积"],
  },
  m6: {
    skill: "math_problem",
    aiKeyPoints: ["概率", "期望值", "随机变量", "统计", "数学期望"],
  },
  m7: {
    skill: "math_problem",
    aiKeyPoints: ["定积分", "面积计算", "微积分", "积分", "极限"],
  },
  m8: {
    skill: "math_problem",
    aiKeyPoints: ["二项式定理", "展开式", "公式推导", "组合数", "幂次"],
  },
  // ── Chemistry ──────────────────────────────────────────────────────────────
  c_c1: {
    skill: "theory_concept",
    aiKeyPoints: ["化学键", "极性键", "共价键", "电负性", "分子结构"],
  },
  c_c2: {
    skill: "experiment_lab",
    aiKeyPoints: ["电化学", "电极反应", "氧化还原", "半反应", "电解质"],
  },
  c_c3: {
    skill: "theory_concept",
    aiKeyPoints: ["有机化学", "命名规则", "官能团", "碳链", "系统命名法"],
  },
  // ── English ────────────────────────────────────────────────────────────────
  e1: {
    skill: "language",
    aiKeyPoints: ["时态", "语态", "被动语态", "英语语法", "句型结构"],
  },
  e2: {
    skill: "language",
    aiKeyPoints: ["长难句", "从句", "英语阅读", "语法分析", "句型结构"],
  },
  e3: {
    skill: "language",
    aiKeyPoints: ["写作模板", "高分句式", "英语写作", "论述结构", "句型结构"],
  },
  // ── Other ──────────────────────────────────────────────────────────────────
  o1: {
    skill: "theory_concept",
    aiKeyPoints: ["思维导图", "学习方法", "知识整理", "记忆技巧", "结构化思维"],
  },
  o2: {
    skill: "theory_concept",
    aiKeyPoints: ["费曼学习法", "学习方法", "知识内化", "记忆技巧", "深度理解"],
  },
};
