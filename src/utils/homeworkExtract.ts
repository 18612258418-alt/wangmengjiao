// ─── 作业/待办 专项抽取链 ──────────────────────────────────────────────────
// 把"作业 Tab 的内容"从内置 seed 转为「从笔记里真实提取」，形成闭环：
//   一次上传 → 笔记结构化（已有）→ 本链抽取其中夹带的作业/待办 → 回链到来源笔记。
// 设计要点：
//   1. 传入"今天的日期"，让模型把"明天/下周一/本周五前"解析成绝对日期 YYYYMMDD。
//   2. 只抽"学生需要做的动作"，忽略纯知识讲解（作业抽取最容易翻车的地方）。
//   3. 低成本：调用前先用关键词粗筛，没有作业意图的笔记不浪费一次模型调用。
//   4. 解析失败兜底返回空，绝不污染笔记数据。

import type { CardContentType, DetailSection } from "../types";
import { extractJsonObject, parseJsonLoose } from "./json";

export interface HomeworkExtractInput {
  contentType?: CardContentType;
  title: string;
  overview?: string;
  detailIntro?: string;
  detailSections?: DetailSection[];
  aiKeyPoints?: string[];
  nextAction?: string;
  unifiedDetail?: string;
}

export interface ExtractedHomework {
  tasks: string[];
  /** 最近一条截止日 YYYYMMDD（按天归档用） */
  dueDate?: string;
}

interface RawTask {
  text?: string;
  dueDate?: string;
  sourceQuote?: string;
}

interface RawResult {
  hasHomework?: boolean;
  tasks?: RawTask[];
}

const HOMEWORK_KEYWORDS =
  /截止|deadline|交|提交|上交|完成|作业|练习|习题|要求|待办|任务|背诵|默写|预习|复习|做题|实验报告|周测|小测|限时|前完成|课前|课后|本周|下周|明天|周[一二三四五六日天]/;

/** 拼接笔记可读文本，用于关键词粗筛与喂给模型 */
function collectNoteText(input: HomeworkExtractInput): string {
  return [
    input.title,
    input.overview ?? "",
    input.detailIntro ?? "",
    ...(input.detailSections?.flatMap(s => [s.title, ...s.items]) ?? []),
    ...(input.aiKeyPoints ?? []),
    input.nextAction ?? "",
    input.unifiedDetail ?? "",
  ].join("\n");
}

/** 廉价路由：笔记里没有任何作业意图关键词时，直接跳过模型调用 */
export function looksLikeHomework(input: HomeworkExtractInput): boolean {
  return HOMEWORK_KEYWORDS.test(collectNoteText(input));
}

function normalizeDueDate(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8 ? digits : undefined;
}

export function buildHomeworkExtractPrompt(input: HomeworkExtractInput, todayKey: string): string {
  const today = `${todayKey.slice(0, 4)}-${todayKey.slice(4, 6)}-${todayKey.slice(6, 8)}`;
  const noteText = collectNoteText(input).slice(0, 2500);

  return `你是一位贴心的学习管家。请阅读学生刚整理好的一条学习笔记，从中**只抽取需要学生去执行的作业/待办**，整理成可勾选的任务清单。

══════════════════ 今天的日期 ══════════════════
${today}（请据此把"明天/后天/本周五前/下周一"等相对时间换算成绝对日期，格式 YYYYMMDD）

══════════════════ 抽取规则（最重要）══════════════════
1. 只抽"学生需要动手做的事"：写题、提交、背诵、预习、复习、整理错题、实验报告、限时自测等。
2. **忽略纯知识讲解**（定义、公式、原理、概念辨析都不是作业），不要把知识点当任务。
3. 每条 task：动词开头、一句话讲清做什么，必要时带数量/范围（如"完成讲义 P.42 第 3、5、7 题"）。
4. 能判断截止时间就填 dueDate（绝对日期 YYYYMMDD），判断不出就留空字符串。
5. sourceQuote 填笔记中支撑这条任务的原文片段（≤30 字），抽不到就留空。
6. 最多 8 条；若笔记里根本没有任何作业/待办，hasHomework 返回 false、tasks 返回 []。

══════════════════ 待分析笔记 ══════════════════
标题：${input.title}
正文：
${noteText}

══════════════════ 输出格式（只输出 JSON，不要 markdown 代码块）══════════════════
{
  "hasHomework": true,
  "tasks": [
    { "text": "完成讲义 P.42 第 3、5、7 题", "dueDate": "20260430", "sourceQuote": "本周作业 P.42" }
  ]
}

自检：是否把知识点误当任务？相对日期是否都换算成 YYYYMMDD？没有作业时是否返回了 hasHomework=false？`;
}

export function parseHomeworkExtractResponse(raw: string): ExtractedHomework {
  const empty: ExtractedHomework = { tasks: [] };
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) return empty;

  try {
    const parsed = parseJsonLoose<RawResult>(jsonStr);
    if (parsed.hasHomework === false || !Array.isArray(parsed.tasks)) return empty;

    const seen = new Set<string>();
    const tasks: string[] = [];
    let earliestDue: string | undefined;

    for (const t of parsed.tasks) {
      const text = typeof t.text === "string" ? t.text.trim() : "";
      if (!text || seen.has(text)) continue;
      seen.add(text);
      tasks.push(text.length > 120 ? `${text.slice(0, 117)}…` : text);

      const due = normalizeDueDate(t.dueDate);
      if (due && (!earliestDue || due < earliestDue)) earliestDue = due;
      if (tasks.length >= 8) break;
    }

    if (tasks.length === 0) return empty;
    return { tasks, dueDate: earliestDue };
  } catch {
    return empty;
  }
}

export type HomeworkExtractLlmCall = (prompt: string) => Promise<string>;

/**
 * 从一条笔记里抽取作业/待办（失败或无作业返回空 tasks）。
 * 作业类卡片本身已带 task，无需再抽。
 */
export async function extractHomeworkFromNote(
  input: HomeworkExtractInput,
  todayKey: string,
  callLlm: HomeworkExtractLlmCall,
): Promise<ExtractedHomework> {
  if (input.contentType === "homework") return { tasks: [] };
  if (!looksLikeHomework(input)) return { tasks: [] };

  const prompt = buildHomeworkExtractPrompt(input, todayKey);
  try {
    const raw = await callLlm(prompt);
    return parseHomeworkExtractResponse(raw);
  } catch (err) {
    console.warn("[homeworkExtract] 作业抽取失败", err);
    return { tasks: [] };
  }
}
