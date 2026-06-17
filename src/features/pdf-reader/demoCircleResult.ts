import type { CircleRegionResult } from "../../prompts/circleRegion";

/** 视觉 API 不可用时的圈选演示结果（学生试点 / 本地无 Key） */
export const DEMO_CIRCLE_RESULT: CircleRegionResult = {
  intent: "你想理解圈选区域内的知识点或题目（演示解析）",
  skill: "theory_concept",
  sections: [
    {
      title: "概念讲清楚",
      content:
        "【演示模式】系统已收到你的圈选区域。正式环境下，AI 会针对圈内的公式、定义或题干逐条讲解。请把要解析的内容完整圈在闭合区域内，并确保圈选范围足够大。",
    },
    {
      title: "公式推导",
      content: "本圈选内容不涉及",
    },
    {
      title: "解题步骤",
      content: "本圈选内容不涉及",
    },
  ],
  warnings: [
    "⚠ 当前为演示解析：视觉模型额度不足或未连接时显示。开通豆包视觉模型后将返回真实讲解。",
  ],
};

export function isCircleDemoEnabled(): boolean {
  return import.meta.env.VITE_CIRCLE_DEMO === "true";
}
