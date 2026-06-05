import type { CardContentType, DetailSection, ExpandedKnowledge, KnowledgeNode } from "../types";
import { classifyCardSurfaces } from "./cardSurfaces";

export interface DeepSeekResult {
  subjectId: string;
  skill?: string;
  contentType?: CardContentType;
  homeworkTasks?: string[];
  taskDueDate?: string;
  examSummary?: string;
  openTab?: "homework" | "exam" | null;
  title: string;
  summary: string;
  overview: string;
  detailIntro: string;
  detailSections: DetailSection[];
  aiKeyPoints: string[];
  expandedKnowledge: ExpandedKnowledge[];
  knowledgeTree: KnowledgeNode[];
  nextAction?: string;
}

export function compressImageForApi(dataUrl: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─── Streaming text via /api/deepseek proxy ───────────────────────────────────

export interface TextCallOptions {
  /** 显式指定 DeepSeek 模型，留空则走后端默认 */
  model?: string;
  /** 覆盖 max_tokens（默认 8192，上限 16384） */
  maxTokens?: number;
  /**
   * 是否开启 DeepSeek V4 思考模式（chain-of-thought）。
   * 默认 false：思考模式又慢又容易被 60s 函数上限截断，结构化/JSON 生成一律关闭。
   * 仅在确实需要深度推理（如复杂代码生成）时显式传 true。
   */
  thinking?: boolean;
}

export async function streamText(
  prompt: string,
  onChunk: (text: string) => void,
  onDone?: () => void,
  options?: TextCallOptions,
): Promise<void> {
  const res = await fetch("/api/deepseek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, stream: true, model: options?.model, maxTokens: options?.maxTokens, thinking: options?.thinking ?? false }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`/api/deepseek ${res.status}: ${errText.slice(0, 400)}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processLine = (line: string): "done" | "continue" => {
    if (!line.startsWith("data: ")) return "continue";
    const data = line.slice(6).trim();
    if (data === "[DONE]") return "done";
    try {
      const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
      if (delta) onChunk(delta);
    } catch { /* skip malformed chunks */ }
    return "continue";
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (processLine(line) === "done") { onDone?.(); return; }
    }
  }

  if (buffer.trim()) {
    if (processLine(buffer) === "done") { onDone?.(); return; }
  }
  onDone?.();
}

// ─── Non-streaming text via /api/deepseek proxy ───────────────────────────────

export async function callText(prompt: string, options?: TextCallOptions): Promise<string> {
  const res = await fetch("/api/deepseek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, stream: false, model: options?.model, maxTokens: options?.maxTokens, thinking: options?.thinking ?? false }),
  });
  if (!res.ok) throw new Error(`/api/deepseek ${res.status}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

/**
 * 通过 SSE 流式累积成完整文本。
 * 适合长代码 / 长文本生成，避免 Vercel Edge Function 网关 25s 超时。
 */
export async function callTextStreamed(prompt: string, options?: TextCallOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    streamText(
      prompt,
      (chunk) => { buffer += chunk; },
      () => {
        const out = buffer.trim();
        // 空响应通常意味着思考模式没关（内容进了 reasoning_content）或被网关截断，
        // 这里直接报错而不是静默返回空串，避免上层悄悄回退到占位题。
        if (!out) reject(new Error("DeepSeek 返回空内容（thinking 未关闭或响应被截断）"));
        else resolve(out);
      },
      options,
    ).catch(reject);
  });
}

// ─── Vision analysis via /api/doubao proxy ────────────────────────────────────

export async function callDoubao(imageDataUrl: string, hasAnnotations?: boolean): Promise<DeepSeekResult> {
  const compressed = await compressImageForApi(imageDataUrl);

  const res = await fetch("/api/doubao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl: compressed, hasAnnotations }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`/api/doubao ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Doubao response");
  const parsed = JSON.parse(match[0]);

  const validIds = ["physics", "math", "chemistry", "english", "other"];
  if (!validIds.includes(parsed.subjectId)) parsed.subjectId = "other";
  if (!Array.isArray(parsed.detailSections)) parsed.detailSections = [];

  const validSkills = ["theory_concept", "math_problem", "language", "experiment_lab", "code_cs", "literature_essay"];
  if (!validSkills.includes(parsed.skill)) parsed.skill = "theory_concept";

  const surfaces = classifyCardSurfaces(parsed);
  parsed.contentType = surfaces.contentType;
  parsed.homeworkTasks = surfaces.homeworkTasks ?? [];
  parsed.taskDueDate = surfaces.taskDueDate ?? "";
  parsed.examSummary = surfaces.examSummary ?? "";
  parsed.openTab = surfaces.openTab;

  return parsed as DeepSeekResult;
}
