// ─── 笔记 → 教学大纲条目 自动归类 ──────────────────────────────────────────
// 上传/批注产生新笔记后，调用文本模型把它挂靠到学科教学大纲的某个 topic 条目，
// 让笔记直接进入对应目录，而不是永远堆在「最近上传与批注」。
// 设计与备考模块的 examPointLink 同构：白名单 + 置信度 + evidence，宁缺毋滥。

import type { CardContentType, DetailSection } from "../types";
import { getSubjectSyllabus, type SubjectSyllabus } from "../data/subjectSyllabi";
import { extractJsonObject, parseJsonLoose } from "./json";

export interface SyllabusLinkInput {
  subjectId: string;
  contentType?: CardContentType;
  title: string;
  overview?: string;
  detailIntro?: string;
  detailSections?: DetailSection[];
  aiKeyPoints?: string[];
  unifiedDetail?: string;
}

interface SyllabusLinkResult {
  syllabusEntryId: string | null;
  confidence: number;
  evidence: string;
}

/** 把大纲压缩成 prompt 白名单：每行一个 topic（带所属章节，便于模型理解层级） */
function serializeSyllabusCatalog(syllabus: SubjectSyllabus): string {
  const lines: string[] = [];
  let currentChapter = "";
  for (const node of syllabus.nodes) {
    if (node.kind === "chapter") {
      currentChapter = node.title;
    } else {
      lines.push(`${node.id} | ${node.title} | 所属：${currentChapter || "未分章"}`);
    }
  }
  return lines.join("\n");
}

function validTopicIds(syllabus: SubjectSyllabus): Set<string> {
  return new Set(syllabus.nodes.filter(n => n.kind === "topic").map(n => n.id));
}

export function buildSyllabusLinkPrompt(
  syllabus: SubjectSyllabus,
  input: SyllabusLinkInput,
): string {
  const catalog = serializeSyllabusCatalog(syllabus);
  const sections = (input.detailSections ?? [])
    .map(s => `  · ${s.title}：${s.items.join("；")}`)
    .join("\n");

  const contextLines = [
    `笔记标题：${input.title}`,
    `内容类型：${input.contentType === "homework" ? "作业/试卷" : "学习笔记"}`,
    input.overview ? `内容概述：${input.overview}` : "",
    input.detailIntro ? `重点定位：${input.detailIntro}` : "",
    sections ? `已提取章节要点：\n${sections}` : "",
    input.aiKeyPoints?.length ? `核心关键词：${input.aiKeyPoints.join("、")}` : "",
    input.unifiedDetail?.trim()
      ? `详情正文（节选前 1000 字）：\n${input.unifiedDetail.trim().slice(0, 1000)}`
      : "",
  ].filter(Boolean);

  return `你是一位熟悉大学课程教学大纲的学科教研员。
你的任务是：阅读学生刚上传的笔记，判断它最应该归入「教学大纲」的哪一个条目（topic），以便自动归档到对应目录。

══════════════════ 判定原则（宁缺毋滥）══════════════════
1. 只能从下方白名单选择 **唯一一个最匹配** 的条目 id；禁止编造不存在的 id。
2. 必须是笔记**主体内容**真正讲的那个条目，而不是顺带提到的名词。
3. 如果笔记内容跨多个条目，选**最核心/占篇幅最多**的那一个。
4. 如果没有任何条目能较好匹配（笔记太泛、跑题、或大纲里没有对应章节），返回 syllabusEntryId 为 null，confidence 为 0。
5. confidence 表示把握程度（0~1），低于 0.55 视为没把握，请直接返回 null。

══════════════════ 教学大纲条目白名单（格式：id | 条目名 | 所属章节）══════════════════
${catalog}

══════════════════ 待归类笔记 ══════════════════
${contextLines.join("\n")}

══════════════════ 输出格式（只输出 JSON，不要 markdown 代码块）══════════════════
{
  "syllabusEntryId": "条目id 或 null",
  "confidence": 0.0,
  "evidence": "一句话说明笔记哪部分内容对应该条目（无匹配则说明为何归不进任何条目）"
}

自检：id 是否在白名单中？是否只选了一个？没把握时是否返回了 null？`;
}

export function parseSyllabusLinkResponse(
  raw: string,
  syllabus: SubjectSyllabus,
): SyllabusLinkResult {
  const empty: SyllabusLinkResult = { syllabusEntryId: null, confidence: 0, evidence: "" };
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) return empty;

  try {
    const parsed = parseJsonLoose<SyllabusLinkResult>(jsonStr);
    const allowed = validTopicIds(syllabus);
    const id = parsed.syllabusEntryId;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

    if (!id || !allowed.has(id) || confidence < 0.55) {
      return { ...empty, confidence, evidence: typeof parsed.evidence === "string" ? parsed.evidence : "" };
    }
    return {
      syllabusEntryId: id,
      confidence,
      evidence: typeof parsed.evidence === "string" ? parsed.evidence.trim() : "",
    };
  } catch {
    return empty;
  }
}

/** 目标项目注入的大模型调用（返回原始文本） */
export type SyllabusLinkLlmCall = (prompt: string) => Promise<string>;

/**
 * 解析笔记应归入的大纲条目 id（失败/无把握返回 null）。
 * 作业类内容不归大纲目录。
 */
export async function classifyNoteSyllabusEntry(
  input: SyllabusLinkInput,
  callLlm: SyllabusLinkLlmCall,
): Promise<string | null> {
  if (input.contentType === "homework") return null;

  const syllabus = getSubjectSyllabus(input.subjectId);
  if (!syllabus || syllabus.nodes.every(n => n.kind !== "topic")) return null;

  const prompt = buildSyllabusLinkPrompt(syllabus, input);
  try {
    const raw = await callLlm(prompt);
    return parseSyllabusLinkResponse(raw, syllabus).syllabusEntryId;
  } catch (err) {
    console.warn("[syllabusLink] 大纲归类识别失败", err);
    return null;
  }
}
