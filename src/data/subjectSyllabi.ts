/**
 * 各学科「教学大纲总览」——笔记 Tab 左侧目录
 */
export type SyllabusNodeKind = "chapter" | "topic";

export interface SyllabusNode {
  id: string;
  kind: SyllabusNodeKind;
  title: string;
}

export interface SubjectSyllabus {
  overviewTitle: string;
  nodes: SyllabusNode[];
}

export const SUBJECT_SYLLABI: Record<string, SubjectSyllabus> = {
  physics: {
    overviewTitle: "大学物理教学大纲总览",
    nodes: [
      { id: "phy-ch1", kind: "chapter", title: "第一章 力学" },
      { id: "phy-1-1", kind: "topic", title: "1.1 牛顿定律与受力分析" },
      { id: "phy-1-2", kind: "topic", title: "1.2 机械能守恒定律" },
      { id: "phy-1-3", kind: "topic", title: "1.3 万有引力与卫星运动" },
      { id: "phy-ch2", kind: "chapter", title: "第二章 电磁学" },
      { id: "phy-2-1", kind: "topic", title: "2.1 静电场与电势" },
      { id: "phy-2-2", kind: "topic", title: "2.2 匀强磁场与带电粒子运动" },
      { id: "phy-2-3", kind: "topic", title: "2.3 电磁感应与楞次定律" },
      { id: "phy-ch3", kind: "chapter", title: "第三章 近代物理" },
      { id: "phy-3-1", kind: "topic", title: "3.1 光电效应与量子概念" },
      { id: "phy-ch4", kind: "chapter", title: "第四章 交流电" },
      { id: "phy-4-1", kind: "topic", title: "4.1 交流电与变压器" },
    ],
  },
  math: {
    overviewTitle: "高等数学教学大纲总览",
    nodes: [
      { id: "math-ch1", kind: "chapter", title: "第一章 函数与极限" },
      { id: "math-1-1", kind: "topic", title: "1.1 极限与连续" },
      { id: "math-1-2", kind: "topic", title: "1.2 曲边梯形与定积分思想" },
      { id: "math-ch2", kind: "chapter", title: "第二章 一元微分学" },
      { id: "math-2-1", kind: "topic", title: "2.1 导数定义与几何意义" },
      { id: "math-ch3", kind: "chapter", title: "第三章 一元积分学" },
      { id: "math-3-1", kind: "topic", title: "3.1 不定积分与换元法" },
      { id: "math-3-2", kind: "topic", title: "3.2 定积分几何应用" },
      { id: "math-ch4", kind: "chapter", title: "第四章 三角函数与级数" },
      { id: "math-4-1", kind: "topic", title: "4.1 三角恒等变换" },
      { id: "math-4-2", kind: "topic", title: "4.2 数列通项与求和" },
      { id: "math-ch5", kind: "chapter", title: "第五章 空间与概率" },
      { id: "math-5-1", kind: "topic", title: "5.1 空间向量运算" },
      { id: "math-5-2", kind: "topic", title: "5.2 概率与数学期望" },
      { id: "math-5-3", kind: "topic", title: "5.3 二项式定理" },
    ],
  },
  chemistry: {
    overviewTitle: "大学化学教学大纲总览",
    nodes: [
      { id: "chem-ch1", kind: "chapter", title: "第一章 物质结构" },
      { id: "chem-1-1", kind: "topic", title: "1.1 化学键与分子极性" },
      { id: "chem-ch2", kind: "chapter", title: "第二章 电化学" },
      { id: "chem-2-1", kind: "topic", title: "2.1 原电池与电解池" },
      { id: "chem-ch3", kind: "chapter", title: "第三章 有机化学" },
      { id: "chem-3-1", kind: "topic", title: "3.1 有机物系统命名" },
      { id: "chem-3-2", kind: "topic", title: "3.2 官能团与反应类型" },
    ],
  },
  english: {
    overviewTitle: "大学英语教学大纲总览",
    nodes: [
      { id: "eng-ch1", kind: "chapter", title: "第一章 语法体系" },
      { id: "eng-1-1", kind: "topic", title: "1.1 时态与语态" },
      { id: "eng-1-2", kind: "topic", title: "1.2 从句与句型结构" },
      { id: "eng-ch2", kind: "chapter", title: "第二章 阅读理解" },
      { id: "eng-2-1", kind: "topic", title: "2.1 长难句结构分析" },
      { id: "eng-ch3", kind: "chapter", title: "第三章 学术写作" },
      { id: "eng-3-1", kind: "topic", title: "3.1 高分句式与模板" },
      { id: "eng-3-2", kind: "topic", title: "3.2 议论文结构与过渡" },
    ],
  },
  other: {
    overviewTitle: "社会科学教学大纲总览",
    nodes: [
      { id: "soc-ch1", kind: "chapter", title: "第一章 经济学基础" },
      { id: "soc-1-1", kind: "topic", title: "1.1 宏观经济学与 GDP 核算" },
      { id: "soc-ch2", kind: "chapter", title: "第二章 学习方法论" },
      { id: "soc-2-1", kind: "topic", title: "2.1 思维导图与知识结构化" },
      { id: "soc-2-2", kind: "topic", title: "2.2 费曼学习法" },
      { id: "soc-ch3", kind: "chapter", title: "第三章 信息技术素养" },
      { id: "soc-3-1", kind: "topic", title: "3.1 计算机组成原理" },
      { id: "soc-3-2", kind: "topic", title: "3.2 信息检索与批判阅读" },
    ],
  },
};

/** 内置记忆卡片 → 大纲条目 id */
export const BUILTIN_SYLLABUS_BY_CARD: Record<string, string> = {
  c1: "phy-2-2",
  c2: "phy-3-1",
  c3: "phy-1-2",
  c4: "phy-1-3",
  c5: "phy-2-3",
  c6: "phy-2-1",
  c9: "phy-4-1",
  m1: "math-2-1",
  m2: "math-3-1",
  m3: "math-4-1",
  m4: "math-4-2",
  m5: "math-5-1",
  m6: "math-5-2",
  m7: "math-3-2",
  m8: "math-5-3",
  demo_calc: "math-1-2",
  c_c1: "chem-1-1",
  c_c2: "chem-2-1",
  c_c3: "chem-3-1",
  e1: "eng-1-1",
  e2: "eng-2-1",
  e3: "eng-3-1",
  o1: "soc-2-1",
  o2: "soc-2-2",
  demo_gdp: "soc-1-1",
  demo_von: "soc-3-1",
};

export function getSubjectSyllabus(subjectId: string): SubjectSyllabus | null {
  return SUBJECT_SYLLABI[subjectId] ?? null;
}
