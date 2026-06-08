// ─── 冲刺模拟试卷 ──────────────────────────────────────────────────────────
// 以当前学科的考点图谱为命题大纲，生成一份"贴近真实大学期末/模拟试卷"格式的卷子：
// 卷头（课程、时长、满分、考生须知）+ 分大题（选择/填空/简答/计算·综合）+ 末尾答案与解析。
// 答案单独成段，前端默认折叠，点击「查看答案」展开。

import type { ExamKnowledgeGraph } from "../types";
import { extractJsonObject, parseJsonLoose } from "../utils/json";

export interface MockExamQuestion {
  number: number;
  stem: string;
  /** 选择题选项（其余题型可省略） */
  options?: string[];
  score: number;
}

export interface MockExamSection {
  title: string;
  /** 如"每小题 3 分，共 30 分" */
  scoreHint?: string;
  questions: MockExamQuestion[];
}

export interface MockExamAnswer {
  /** 定位标签，如"一、1" */
  label: string;
  answer: string;
  explanation?: string;
}

export interface MockExamPaper {
  title: string;
  course: string;
  duration: string;
  totalScore: number;
  notes: string[];
  sections: MockExamSection[];
  answers: MockExamAnswer[];
}

export function buildMockExamPrompt(graph: ExamKnowledgeGraph): string {
  const points = graph.points;
  const catalog = points
    .map(p => {
      const exams = p.examPoints.slice(0, 3).join("；");
      return `· ${p.label}（${p.chapter}）${exams ? ` — 常考：${exams}` : ""}`;
    })
    .join("\n");

  return `你是一位${graph.title}课程的命题老师。请依据下面的「考点大纲」，命制一份**贴近真实大学期末/模拟考试**的冲刺模拟试卷。

══════════════════ 考点大纲（命题必须覆盖其中的核心考点）══════════════════
${catalog || "（暂无考点，按该学科常规期末范围命题）"}

══════════════════ 命题要求 ══════════════════
1. 仿真实大学试卷排版：含卷头信息（课程名、考试时长、满分、考生须知）。
2. 分 3–4 个大题，建议结构：
   一、单项选择题（每题配 4 个选项 A/B/C/D）
   二、填空题（题干用括号或下划线表示空）
   三、简答/计算题（需写出过程的题）
   四、综合/应用题（可选，难度更高，综合多个考点）
3. 各大题给出"每题分值/合计分值"提示（scoreHint），全卷总分=100。
4. 题目数量适中：选择 5–8 题、填空 4–6 题、简答/计算 3–4 题、综合 1–2 题。
5. 涉及公式、符号、单位一律用 LaTeX：行内用单美元符号包裹（如 $R=\\frac{mv}{qB}$）。
6. 末尾给出每题的标准答案与简要解析（answers），label 用"大题序号、题号"定位（如"一、1"）。选择题答案给字母+要点，计算题给关键步骤与最终结果。
7. 题目要原创、合理、可作答，难度由易到难，贴合上面的考点。

══════════════════ 输出格式（只输出一个严格 JSON，不要 markdown 代码块、不要多余解释）══════════════════
{
  "title": "《xxx》课程冲刺模拟试卷",
  "course": "${graph.title}",
  "duration": "120 分钟",
  "totalScore": 100,
  "notes": ["闭卷考试", "请将答案写在答题纸上", "共四道大题"],
  "sections": [
    {
      "title": "一、单项选择题",
      "scoreHint": "每小题 3 分，共 30 分",
      "questions": [
        { "number": 1, "stem": "题干……", "options": ["A. ……", "B. ……", "C. ……", "D. ……"], "score": 3 }
      ]
    },
    {
      "title": "二、填空题",
      "scoreHint": "每空 2 分，共 20 分",
      "questions": [ { "number": 1, "stem": "……是______。", "score": 2 } ]
    },
    {
      "title": "三、简答与计算题",
      "scoreHint": "每题 10 分，共 30 分",
      "questions": [ { "number": 1, "stem": "……求……。", "score": 10 } ]
    },
    {
      "title": "四、综合应用题",
      "scoreHint": "共 20 分",
      "questions": [ { "number": 1, "stem": "……", "score": 20 } ]
    }
  ],
  "answers": [
    { "label": "一、1", "answer": "B", "explanation": "因为……" },
    { "label": "三、1", "answer": "最终结果……", "explanation": "关键步骤：……" }
  ]
}`;
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map(s => s.trim());
}

function parseQuestions(raw: unknown): MockExamQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q, i): MockExamQuestion | null => {
      if (!q || typeof q !== "object") return null;
      const obj = q as Record<string, unknown>;
      const stem = typeof obj.stem === "string" ? obj.stem.trim() : "";
      if (!stem) return null;
      return {
        number: typeof obj.number === "number" ? obj.number : i + 1,
        stem,
        options: toStringArray(obj.options),
        score: typeof obj.score === "number" ? obj.score : 0,
      };
    })
    .filter((q): q is MockExamQuestion => q !== null)
    .map(q => ({ ...q, options: q.options && q.options.length > 0 ? q.options : undefined }));
}

export function parseMockExamResponse(raw: string): MockExamPaper | null {
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) return null;
  try {
    const parsed = parseJsonLoose<Record<string, unknown>>(jsonStr);

    const sectionsRaw = Array.isArray(parsed.sections) ? parsed.sections : [];
    const sections: MockExamSection[] = sectionsRaw
      .map((s): MockExamSection | null => {
        if (!s || typeof s !== "object") return null;
        const obj = s as Record<string, unknown>;
        const title = typeof obj.title === "string" ? obj.title.trim() : "";
        const questions = parseQuestions(obj.questions);
        if (!title || questions.length === 0) return null;
        return {
          title,
          scoreHint: typeof obj.scoreHint === "string" ? obj.scoreHint.trim() : undefined,
          questions,
        };
      })
      .filter((s): s is MockExamSection => s !== null);

    if (sections.length === 0) return null;

    const answersRaw = Array.isArray(parsed.answers) ? parsed.answers : [];
    const answers: MockExamAnswer[] = answersRaw
      .map((a): MockExamAnswer | null => {
        if (!a || typeof a !== "object") return null;
        const obj = a as Record<string, unknown>;
        const label = typeof obj.label === "string" ? obj.label.trim() : "";
        const answer = typeof obj.answer === "string" ? obj.answer.trim() : "";
        if (!label && !answer) return null;
        return {
          label,
          answer,
          explanation: typeof obj.explanation === "string" ? obj.explanation.trim() : undefined,
        };
      })
      .filter((a): a is MockExamAnswer => a !== null);

    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "冲刺模拟试卷",
      course: typeof parsed.course === "string" ? parsed.course.trim() : "",
      duration: typeof parsed.duration === "string" && parsed.duration.trim() ? parsed.duration.trim() : "120 分钟",
      totalScore: typeof parsed.totalScore === "number" ? parsed.totalScore : 100,
      notes: toStringArray(parsed.notes),
      sections,
      answers,
    };
  } catch {
    return null;
  }
}
