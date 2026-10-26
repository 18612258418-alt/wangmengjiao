import imgDemoCalc from "../../../imports/demo-calculus-limit.png";

/** 演示版：模拟边缘检测 + 透视矫正 + AI，避免真实 CV/OOM */
export const isCameraDemoMode = import.meta.env.VITE_CAMERA_DEMO !== "false";

export const DEMO_CAMERA_IMAGE = imgDemoCalc;

export const DEMO_CAMERA_TIMING = {
  /** 边缘检测动画总时长 */
  scanMs: 1100,
  scanFrameMs: 60,
  /** 白框变蓝 / 蓝框稳定后自动拍（相对打开相机时刻） */
  stableMs: 2400,
  autoCaptureMs: 3400,
  /** 拍摄后三阶段 */
  edgeMs: 420,
  warpBeforeMs: 520,
  warpAfterMs: 480,
  aiMs: 620,
  /** App 层假 Doubao */
  doubaoMs: 880,
} as const;

export const DEMO_CAMERA_UNIFIED_DETAIL =
  "【内容概述】\n这部分内容主要围绕极限概念的两个经典问题展开，重点落在曲边梯形面积问题：通过将区间划分、求和近似，再取极限得到精确面积，从而引出定积分。图片中还涉及瞬时速度与导数的联系。\n\n【核心思路】\n曲边梯形面积问题的核心是「以直代曲，取极限」：划分小区间 → 矩形近似 → 求和 → 无穷细分取极限，正是[[定积分]]定义的基础。\n\n【考点解析】\n常见考点是理解极限在面积求解中的角色，以及[[定积分]]如何从这一过程抽象出来。易错点包括混淆近似求和与极限求和、忽略划分均匀性对极限的影响。\n\n【知识关联】\n与[[导数]]（瞬时速度极限）构成微积分两大分支，通过[[微积分基本定理]]紧密相连。\n\n【学习建议】\n建议动手画曲边梯形并推导划分→求和→取极限的过程，再对照[[定积分]]定义加深理解。";

export function resolveDemoCameraSubject(activeSubject: string): string {
  if (activeSubject === "all" || activeSubject === "__pending__") return "math";
  return activeSubject;
}

/** @deprecated 使用 getDemoDoubaoResult */
export const DEMO_CAMERA_CARD = {
  title: "记忆：极限概念课堂笔记",
  summary: "通过瞬时速度和曲边梯形面积问题引入极限概念",
  overview:
    "介绍极限概念从两个经典问题中诞生：瞬时速度问题与曲边梯形面积问题，均通过区间划分与极限求解，分别引出导数与定积分。",
  detailIntro: "情境感知相机识别到课堂板书/文档区域",
  detailSections: [
    {
      title: "曲边梯形面积问题",
      items: [
        "场景：y = f(x) 与 x 轴围成面积",
        "近似：划分区间求和",
        "精确解：取极限，引出定积分",
      ],
    },
    {
      title: "瞬时速度问题",
      items: [
        "平均速度 Δs/Δt 在 Δt→0 时的极限",
        "即瞬时速度，引出导数概念",
      ],
    },
  ],
  aiKeyPoints: [
    "曲边梯形面积：划分 → 求和 → 取极限",
    "瞬时速度：平均速度在 Δt→0 的极限",
    "极限是导数与定积分的共同基础",
  ],
  expandedKnowledge: [
    {
      concept: "定积分",
      explanation: "解决曲边梯形面积等问题的数学工具，基于极限定义",
    },
  ],
  knowledgeTree: [
    { label: "高等数学 - 极限 - 经典问题", level: 1, current: false },
  ] as { label: string; level: number; current: boolean }[],
  nextAction: "可继续圈注课件或做一道极限计算练习题巩固",
  skill: "theory_concept" as const,
};
