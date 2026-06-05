import type { CardData, InteractiveSpec, InteractionPlan, RenderStrategy } from "../types";
import { callText, callTextStreamed } from "./api";
import {
  buildInteractionPlanPrompt,
  buildInteractiveCodePrompt,
  toExercisePromptNotes,
} from "../prompts/exercise";

const FALLBACK_PLAN: InteractionPlan = {
  suitable: true,
  interactionType: "step_cards",
  learningGoal: "通过分步卡片和参数对比，帮助学生理解知识点的核心关系。",
  controls: [
    { key: "step", label: "学习步骤", min: 1, max: 3, step: 1, default: 1, unit: "" },
  ],
  outputs: ["核心概念", "适用条件", "易错点"],
  visualMetaphor: "三张可切换的学习卡片。",
  fallbackMode: "step_cards",
  reason: "该内容更适合用步骤推演降低理解成本。",
};

export function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

const RENDER_STRATEGIES = new Set<RenderStrategy>([
  "canvas_animation",
  "canvas_plot",
  "svg_static",
  "dom_cards",
]);

function inferRenderStrategy(interactionType: InteractionPlan["interactionType"]): RenderStrategy {
  switch (interactionType) {
    case "physics_sim": return "canvas_animation";
    case "math_plot": return "canvas_plot";
    case "chem_reaction": return "canvas_animation";
    case "language_parse": return "svg_static";
    default: return "dom_cards";
  }
}

export function normalizeInteractionPlan(raw: unknown): InteractionPlan {
  const data = (raw && typeof raw === "object" ? raw : {}) as Partial<InteractionPlan>;
  const interactionTypes = new Set(["physics_sim", "math_plot", "chem_reaction", "language_parse", "step_cards"]);
  const interactionType = interactionTypes.has(data.interactionType ?? "")
    ? data.interactionType!
    : FALLBACK_PLAN.interactionType;

  const renderStrategy = data.renderStrategy && RENDER_STRATEGIES.has(data.renderStrategy)
    ? data.renderStrategy
    : inferRenderStrategy(interactionType);

  return {
    suitable: data.suitable !== false,
    interactionType,
    renderStrategy,
    learningGoal: data.learningGoal || FALLBACK_PLAN.learningGoal,
    controls: Array.isArray(data.controls) && data.controls.length > 0
      ? data.controls.slice(0, 5)
      : FALLBACK_PLAN.controls,
    outputs: Array.isArray(data.outputs) && data.outputs.length > 0
      ? data.outputs.slice(0, 5)
      : FALLBACK_PLAN.outputs,
    visualMetaphor: data.visualMetaphor || FALLBACK_PLAN.visualMetaphor,
    sceneDescription: typeof data.sceneDescription === "string" ? data.sceneDescription : undefined,
    fallbackMode: data.fallbackMode || "step_cards",
    reason: data.reason || FALLBACK_PLAN.reason,
  };
}

export function parseInteractionPlan(text: string): InteractionPlan {
  try {
    const json = extractJsonObject(text);
    if (!json) return FALLBACK_PLAN;
    return normalizeInteractionPlan(JSON.parse(json));
  } catch {
    return FALLBACK_PLAN;
  }
}

/** 走 Vercel env DEEPSEEK_MODEL_ID 配置的默认模型，避免前端硬编码与 API key 权限错配 */
export async function generateInteractionPlan(cards: CardData[]): Promise<InteractionPlan> {
  const promptNotes = toExercisePromptNotes(cards);
  const planText = await callText(buildInteractionPlanPrompt(promptNotes), {
    maxTokens: 2048,
  });
  return parseInteractionPlan(planText);
}

/**
 * 清洗 LLM 输出：剥掉可能的 markdown 围栏（```tsx / ```jsx / ```ts / ```js / ```react / ```），
 * 以及说明性前后缀文本，确保 Sandpack 能正确编译。
 */
export function sanitizeInteractiveCode(raw: string): string {
  let text = raw.trim();
  // 优先策略：如果整段被 ```...``` 包裹，提取里面的内容
  const fenceMatch = text.match(/```(?:tsx|jsx|ts|js|react|javascript|typescript)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // 兜底：去掉开头 / 结尾的孤立围栏
    text = text.replace(/^```[a-zA-Z]*\s*\n?/, "");
    text = text.replace(/\n?```[\s]*$/, "");
  }
  // 去掉常见无效前缀，比如 "以下是代码：" / "代码如下：" / 注释行
  text = text.replace(/^\s*(以下是代码[:：]?|代码如下[:：]?|App\.tsx[:：]?)\s*\n+/i, "");
  return text.trim();
}

export async function generateInteractiveCode(
  cards: CardData[],
  plan: InteractionPlan,
): Promise<InteractiveSpec> {
  const promptNotes = toExercisePromptNotes(cards);
  // 走 SSE 流式，避免 Vercel Edge 网关 25s 超时（v4-pro 生成 12k tokens 通常 30~60s）
  const raw = await callTextStreamed(buildInteractiveCodePrompt(promptNotes, plan), {
    maxTokens: 12288,
  });
  const appCode = sanitizeInteractiveCode(raw);
  if (!appCode.includes("export default function App")) {
    throw new Error("生成的代码缺少 export default function App，可能被模型截断或格式异常");
  }
  return {
    appCode,
    plan,
    explanation: plan.learningGoal,
    preset: plan.interactionType,
  };
}

export async function generateInteractiveSpec(cards: CardData[]): Promise<InteractiveSpec> {
  const plan = await generateInteractionPlan(cards);
  return generateInteractiveCode(cards, plan);
}

export function buildFallbackInteractiveSpec(): InteractiveSpec {
  return {
    appCode: "",
    plan: FALLBACK_PLAN,
    explanation: FALLBACK_PLAN.learningGoal,
    preset: FALLBACK_PLAN.interactionType,
  };
}
