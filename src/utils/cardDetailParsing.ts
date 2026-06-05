export { parseSections, parseSkillSections, parseUnifiedSections } from "./parseSections";

const SKILL_META: Record<string, { label: string; emoji: string; textColor: string; bgColor: string; barColor: string }> = {
  theory_concept:   { label: "理论概念", emoji: "📚", textColor: "#4338CA", bgColor: "#EEF2FF", barColor: "#818CF8" },
  math_problem:     { label: "解题框架", emoji: "🔢", textColor: "#1D4ED8", bgColor: "#DBEAFE", barColor: "#60A5FA" },
  language:         { label: "语言技能", emoji: "🌐", textColor: "#065F46", bgColor: "#D1FAE5", barColor: "#34D399" },
  experiment_lab:   { label: "实验方法", emoji: "🧪", textColor: "#0F766E", bgColor: "#CCFBF1", barColor: "#2DD4BF" },
  code_cs:          { label: "代码解析", emoji: "💻", textColor: "#1E3A5F", bgColor: "#BFDBFE", barColor: "#3B82F6" },
  literature_essay: { label: "批判阅读", emoji: "📝", textColor: "#92400E", bgColor: "#FEF3C7", barColor: "#F59E0B" },
};

export function getSkillMeta(skill?: string) {
  return SKILL_META[skill ?? "theory_concept"] ?? SKILL_META.theory_concept;
}

export const UNIFIED_SECTION_COLORS: Record<string, { textColor: string; bgColor: string; barColor: string }> = {
  "内容概述":    { textColor: "#0369A1", bgColor: "#E0F2FE", barColor: "#38BDF8" },
  "核心原理":    { textColor: "#BE123C", bgColor: "#FFE4E6", barColor: "#FB7185" },
  "解题思路":    { textColor: "#BE123C", bgColor: "#FFE4E6", barColor: "#FB7185" },
  "语言要点":    { textColor: "#BE123C", bgColor: "#FFE4E6", barColor: "#FB7185" },
  "实验要点":    { textColor: "#BE123C", bgColor: "#FFE4E6", barColor: "#FB7185" },
  "核心思路":    { textColor: "#BE123C", bgColor: "#FFE4E6", barColor: "#FB7185" },
  "核心论点":    { textColor: "#BE123C", bgColor: "#FFE4E6", barColor: "#FB7185" },
  "考点解析":    { textColor: "#6D28D9", bgColor: "#EDE9FE", barColor: "#A78BFA" },
  "易错陷阱":    { textColor: "#C2410C", bgColor: "#FFF7ED", barColor: "#FB923C" },
  "地道用法":    { textColor: "#6D28D9", bgColor: "#EDE9FE", barColor: "#A78BFA" },
  "误差与注意":  { textColor: "#C2410C", bgColor: "#FFF7ED", barColor: "#FB923C" },
  "常见Bug与边界":{ textColor: "#C2410C", bgColor: "#FFF7ED", barColor: "#FB923C" },
  "批判性视角":  { textColor: "#6D28D9", bgColor: "#EDE9FE", barColor: "#A78BFA" },
  "知识关联":    { textColor: "#C2410C", bgColor: "#FFF7ED", barColor: "#FB923C" },
  "学习建议":    { textColor: "#065F46", bgColor: "#D1FAE5", barColor: "#34D399" },
};

export const UNIFIED_SECTION_DEFAULT = { textColor: "#374151", bgColor: "#F3F4F6", barColor: "#9CA3AF" };
