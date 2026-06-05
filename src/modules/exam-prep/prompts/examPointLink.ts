import type { CardContentType, DetailSection, ExamKnowledgeGraph } from "../types";
import { getExamKnowledgeGraph } from "../data/examKnowledgeGraphs";
import { extractJsonObject, parseJsonLoose } from "../utils/json";

/** 单条考点挂靠判定 */
export interface ExamPointLinkItem {
  examPointId: string;
  relevance: "primary" | "secondary";
  evidence: string;
  confidence: number;
}

/** 大模型考点挂靠输出 */
export interface ExamPointLinkResult {
  linkedExamPointIds: string[];
  links: ExamPointLinkItem[];
  summary: string;
}

export interface ExamPointLinkInput {
  subjectId: string;
  contentType?: CardContentType;
  title: string;
  overview?: string;
  detailIntro?: string;
  detailSections?: DetailSection[];
  aiKeyPoints?: string[];
  unifiedDetail?: string;
}

/** 将学科考点图谱压缩为 prompt 白名单（每行一个考点） */
export function serializeExamPointCatalog(graph: ExamKnowledgeGraph): string {
  return graph.points
    .map(p => {
      const hints = p.examPoints.slice(0, 4).join("、");
      const brief = p.summary?.trim() || hints;
      return `${p.id} | ${p.label} | ${p.chapter} | ${brief}`;
    })
    .join("\n");
}

/**
 * 笔记上传后：识别内容涵盖的备考考点，用于挂靠到知识图谱右侧「相关笔记」。
 * 模型：DeepSeek（结构化 JSON，非流式）。
 */
export function buildExamPointLinkPrompt(
  graph: ExamKnowledgeGraph,
  input: ExamPointLinkInput,
): string {
  const catalog = serializeExamPointCatalog(graph);
  const sections = (input.detailSections ?? [])
    .map(s => `  · ${s.title}：${s.items.join("；")}`)
    .join("\n");

  const contextLines = [
    `笔记标题：${input.title}`,
    `内容类型：${input.contentType === "homework" ? "作业/试卷（通常只有题目，少知识点讲解）" : "学习笔记"}`,
    input.overview ? `内容概述：${input.overview}` : "",
    input.detailIntro ? `重点定位：${input.detailIntro}` : "",
    sections ? `已提取章节要点：\n${sections}` : "",
    input.aiKeyPoints?.length ? `核心关键词：${input.aiKeyPoints.join("、")}` : "",
    input.unifiedDetail?.trim()
      ? `详情正文（节选前 1200 字）：\n${input.unifiedDetail.trim().slice(0, 1200)}`
      : "",
  ].filter(Boolean);

  return `你是一位熟悉大学课程教学大纲与期末考查范围的学科教研员。
你的任务是：阅读学生刚上传的学习笔记，判断其**实质性涵盖**了哪些「备考考点知识图谱」节点，以便把该笔记自动挂靠到对应考点的详情侧栏。

══════════════════ 判定原则（宁缺毋滥）══════════════════
1. 只有笔记中出现**明确的知识讲解、定义定理、公式推导、解题方法、典型例题或考试要点**时，才可挂靠到某考点。
2. 仅出现学科名、课本章节名、或一笔带过的名词，**不能**挂靠。
3. 「作业/试卷」若主要是题目罗列、缺少知识点讲解，通常返回空列表 []。
4. 一条笔记可挂靠多个考点，但**最多 5 个**；优先选与笔记**主体内容**最匹配的考点。
5. primary = 笔记主体在讲这个考点；secondary = 顺带涉及、作为工具或前置被提到。
6. 只能从下方白名单选择 examPointId，**禁止编造**不存在的 id。

══════════════════ 学科：${graph.title}（subjectId=${graph.subjectId}）══════════════════
考点白名单（格式：id | 名称 | 章节 | 考查摘要）：
${catalog}

══════════════════ 待分析笔记 ══════════════════
${contextLines.join("\n")}

══════════════════ 输出格式（只输出 JSON，不要 markdown 代码块）══════════════════
{
  "linkedExamPointIds": ["考点id1", "考点id2"],
  "links": [
    {
      "examPointId": "考点id1",
      "relevance": "primary",
      "evidence": "一句话说明笔记哪段内容与该考点对应",
      "confidence": 0.88
    }
  ],
  "summary": "一句话概括本笔记在备考图谱中的定位（面向学生）"
}

字段约束：
- linkedExamPointIds：与 links 中的 examPointId 一致，去重；无匹配时返回 []
- relevance：仅 "primary" 或 "secondary"
- confidence：0~1；primary 建议 ≥0.70，secondary 建议 ≥0.50，低于 0.50 不要纳入
- evidence：必须引用笔记中的具体知识点/题型/公式，不要空泛
- 输出前自检：每个 id 是否都在白名单中？是否超过 5 个？无关考点是否已剔除？`;
}

const VALID_IDS = (graph: ExamKnowledgeGraph) => new Set(graph.points.map(p => p.id));

export function parseExamPointLinkResponse(
  raw: string,
  graph: ExamKnowledgeGraph,
): ExamPointLinkResult {
  const empty: ExamPointLinkResult = { linkedExamPointIds: [], links: [], summary: "" };
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) return empty;

  try {
    const parsed = parseJsonLoose<ExamPointLinkResult>(jsonStr);
    const allowed = VALID_IDS(graph);
    const links = (parsed.links ?? [])
      .filter(l => allowed.has(l.examPointId) && (l.confidence ?? 0) >= 0.5)
      .slice(0, 5);

    const idsFromLinks = links.map(l => l.examPointId);
    const idsFromRoot = (parsed.linkedExamPointIds ?? []).filter(id => allowed.has(id));
    const linkedExamPointIds = [...new Set([...idsFromLinks, ...idsFromRoot])].slice(0, 5);

    return {
      linkedExamPointIds,
      links,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    };
  } catch {
    return empty;
  }
}

/** 目标项目注入的大模型调用（返回原始文本） */
export type ExamPointLlmCall = (prompt: string) => Promise<string>;

/** 调用大模型解析笔记涵盖的考点 id 列表（失败时返回 []） */
export async function resolveLinkedExamPoints(
  input: ExamPointLinkInput,
  callLlm: ExamPointLlmCall,
): Promise<string[]> {
  if (input.contentType === "homework") return [];

  const graph = getExamKnowledgeGraph(input.subjectId);
  if (!graph || graph.points.length === 0) return [];

  const prompt = buildExamPointLinkPrompt(graph, input);
  try {
    const raw = await callLlm(prompt);
    return parseExamPointLinkResponse(raw, graph).linkedExamPointIds;
  } catch (err) {
    console.warn("[examPointLink] 考点挂靠识别失败", err);
    return [];
  }
}
