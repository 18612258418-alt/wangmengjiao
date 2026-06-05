export const config = {
  runtime: "edge",
};

declare const process: {
  env: Record<string, string | undefined>;
};

type ImportKind = "image" | "text" | "link";

interface ImportRequest {
  kind: ImportKind;
  value?: string;
  imageDataUrl?: string;
  fileName?: string;
}

function extractJson(text: string): Record<string, unknown> {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("No JSON in model response");
  return JSON.parse(json) as Record<string, unknown>;
}

import { classifyCardSurfaces } from "../src/utils/cardSurfaces";

function normalizeResult(parsed: Record<string, unknown>, fallbackTitle: string, imageDataUrl?: string) {
  const validSubjects = ["physics", "math", "chemistry", "english", "other"];
  const validSkills = ["theory_concept", "math_problem", "language", "experiment_lab", "code_cs", "literature_essay"];
  const subjectId = typeof parsed.subjectId === "string" && validSubjects.includes(parsed.subjectId) ? parsed.subjectId : "other";
  const skill = typeof parsed.skill === "string" && validSkills.includes(parsed.skill) ? parsed.skill : "theory_concept";
  const surfaces = classifyCardSurfaces(parsed);

  return {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : fallbackTitle,
    summary: typeof parsed.summary === "string" ? parsed.summary : "资料已解析完成，可确认保存为记忆卡。",
    targetSubjectId: subjectId,
    img: imageDataUrl,
    overview: typeof parsed.overview === "string" ? parsed.overview : "",
    detailIntro: typeof parsed.detailIntro === "string" ? parsed.detailIntro : "",
    detailSections: Array.isArray(parsed.detailSections) ? parsed.detailSections : [],
    aiKeyPoints: Array.isArray(parsed.aiKeyPoints) ? parsed.aiKeyPoints : [],
    expandedKnowledge: Array.isArray(parsed.expandedKnowledge) ? parsed.expandedKnowledge : [],
    knowledgeTree: Array.isArray(parsed.knowledgeTree) ? parsed.knowledgeTree : [],
    nextAction: typeof parsed.nextAction === "string" ? parsed.nextAction : "",
    skill,
    contentType: surfaces.contentType,
    homeworkTasks: surfaces.homeworkTasks,
    taskDueDate: surfaces.taskDueDate,
    openTab: surfaces.openTab,
  };
}

const OUTPUT_SCHEMA = `{
  "subjectId": "严格归类，只输出英文标识符：physics（任何物理相关）/ math（任何数学相关）/ chemistry（任何化学相关）/ english（任何外语相关）/ other（专业课、人文社科、计算机、经济等）。只看核心内容的学科本质",
  "contentType": "最主要意图：note/homework。有作业待办时填下方 homeworkTasks",
  "homeworkTasks": ["有作业/待办意图时填写可执行 task，无则 []"],
  "taskDueDate": "有作业意图时最近截止 YYYYMMDD，无则空",
  "title": "记忆：基于核心内容的中文知识点标题，不超过20字",
  "summary": "50字以内摘要，概括整页核心主题",
  "overview": "约200字，对整份资料的全局概述：主题背景、知识结构、重要公式或核心论点，帮同学建立全貌。在其中自然穿插 1-2 个 [[学术名词]] 双中括号",
  "detailIntro": "整图分析结论",
  "detailSections": [
    {"title": "第一个核心主题", "items": ["具体知识点及深入原理解析1，含公式或背景解释，要详细易懂，不能一两句敷衍", "知识点2", "知识点3"]},
    {"title": "第二个核心主题", "items": ["知识点1", "知识点2"]}
  ],
  "aiKeyPoints": ["核心重点1（15字内）", "核心重点2", "核心重点3", "核心重点4"],
  "expandedKnowledge": [
    {"concept": "关联延伸概念1（10字内）", "explanation": "50字以内延伸解释，帮同学建立知识网络"},
    {"concept": "关联概念2", "explanation": "延伸解释2"}
  ],
  "knowledgeTree": [
    {"label": "学科名，如：物理", "level": 1},
    {"label": "二级分类，如：经典力学", "level": 2},
    {"label": "章节，如：牛顿运动定律", "level": 3, "current": false},
    {"label": "核心知识点名称（标为当前）", "level": 4, "current": true},
    {"label": "细分概念1", "level": 5},
    {"label": "细分概念2", "level": 5}
  ],
  "skill": "根据内容类型选一个：theory_concept（定义/定理/概念）/ math_problem（数学物理计算题）/ language（外语/语言学习）/ experiment_lab（实验/研究方法）/ code_cs（代码/算法）/ literature_essay（文献/论述/人文社科）",
  "nextAction": "50字以内，给出1-2条具体可执行的下一步学习建议，用第二人称'你'，结合大学学习场景（课后作业、文献阅读、实验、备考等），不能是'继续学习'之类空话"
}`;

const SHARED_RULES = `严格约束：
①所有字段用中文（subjectId / contentType / skill 等英文枚举字段除外）。
②overview 描述全页全貌，detailSections 要把整页核心知识点结构化展开、内容充实，不要只描述版式或敷衍一两句。
③detailSections 至少 2 个主题，每个主题至少 2 条要点；aiKeyPoints 至少 4 条。
④在 overview、detailSections 的 items 里自然穿插少量 [[学术名词]] 双中括号（前端会渲染为可点击蓝色链接），中括号只放名词本身。
⑤只输出 JSON，不要输出任何解释、markdown 代码块或多余文字。`;

function buildTextPrompt(kind: "text" | "link", value: string, fileName?: string) {
  return `你是一位有丰富大学教学经验的学长/学姐，专门帮大学生整理学习资料、提炼核心知识点。请把用户提供的${kind === "link" ? "链接/网页资料" : "文本/PDF 抽取内容"}深度整理成一张学习记忆卡。

【资料来源】
${fileName ? `文件名：${fileName}\n` : ""}${value.slice(0, 12000)}

请按整份资料的核心知识点做结构化总结与深化（不要逐字复述，要提炼升华），按以下 JSON 格式输出：
${OUTPUT_SCHEMA}

${SHARED_RULES}`;
}

// 视觉首屏精简 schema：去掉 knowledgeTree / expandedKnowledge 这类最耗 token 的自由生成，
// 只产出预览卡必需字段，把豆包单次生成压进 Edge 25s 墙钟内。缺的字段 normalizeResult 会补默认值，
// 后续在确认保存 / 详情页再二次补全。
const VISION_OUTPUT_SCHEMA = `{
  "subjectId": "physics|math|chemistry|english|other 之一",
  "contentType": "note|homework 之一（主意图）",
  "homeworkTasks": [],
  "taskDueDate": "",
  "title": "记忆：不超过18字的中文标题",
  "summary": "40字内摘要",
  "overview": "约80字概述，含1个[[学术名词]]",
  "detailIntro": "整页分析结论",
  "detailSections": [
    {"title": "主题一", "items": ["要点1（一句）", "要点2"]},
    {"title": "主题二", "items": ["要点1", "要点2"]}
  ],
  "aiKeyPoints": ["重点1", "重点2", "重点3", "重点4"],
  "skill": "theory_concept|math_problem|language|experiment_lab|code_cs|literature_essay",
  "nextAction": "40字内1条学习建议，用你"
}`;

const VISION_RULES =
  "只输出 JSON，无 markdown。全中文（枚举字段除外）。有作业意图必填 homeworkTasks。不要输出 knowledgeTree、expandedKnowledge。";

function apiTimeouts() {
  const onVercel = !!process.env.VERCEL;
  return {
    vision: Number(process.env.IMPORT_VISION_TIMEOUT_MS) || (onVercel ? 24000 : 120000),
    text: Number(process.env.IMPORT_TEXT_TIMEOUT_MS) || (onVercel ? 24000 : 90000),
  };
}

function buildVisionPrompt(fileName?: string) {
  return `整理本页学习资料为记忆卡 JSON。${fileName ? `文件：${fileName}。` : ""}提炼核心知识点，不要描述版式。
${VISION_OUTPUT_SCHEMA}
${VISION_RULES}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, label: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`${label} 解析超时：模型处理时间过长，请稍后重试，或先上传页数更少/更清晰的资料。`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callDeepSeek(prompt: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL_ID || process.env.VITE_DEEPSEEK_MODEL_ID || "deepseek-chat";
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const res = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: 4096,
      messages: [
        { role: "system", content: "你是专业的中国大学学习资料整理助手。严格输出用户要求的 JSON。" },
        { role: "user", content: prompt },
      ],
    }),
  }, apiTimeouts().text, "文本模型");
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

async function callDoubao(imageDataUrl: string, fileName?: string) {
  const apiKey = process.env.DOUBAO_API_KEY || process.env.VITE_DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL_ID || process.env.VITE_DOUBAO_MODEL_ID || "doubao-seed-1-6-vision-250815";
  if (!apiKey) throw new Error("DOUBAO_API_KEY not configured");

  const res = await fetchWithTimeout("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      // 限制输出长度，避免视觉模型生成过长 JSON 拖过 Edge 25s 墙钟。
      max_tokens: 1600,
      messages: [
        { role: "system", content: "输出紧凑 JSON，避免冗长。" },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: buildVisionPrompt(fileName) },
          ],
        },
      ],
    }),
  }, apiTimeouts().vision, "视觉模型");
  if (!res.ok) throw new Error(`Doubao ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json() as ImportRequest;
    const fallbackTitle = body.fileName ? `记忆：${body.fileName.replace(/\.[^.]+$/, "").slice(0, 20)}` : "记忆：导入资料整理";

    if (body.kind === "image") {
      if (!body.imageDataUrl) throw new Error("imageDataUrl is required");
      const raw = await callDoubao(body.imageDataUrl, body.fileName);
      return new Response(JSON.stringify(normalizeResult(extractJson(raw), fallbackTitle, body.imageDataUrl)), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.kind === "text" || body.kind === "link") {
      if (!body.value) throw new Error("value is required");
      const raw = await callDeepSeek(buildTextPrompt(body.kind, body.value, body.fileName));
      return new Response(JSON.stringify(normalizeResult(extractJson(raw), fallbackTitle)), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported import kind" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("超时");
    return new Response(JSON.stringify({ error: message }), {
      status: isTimeout ? 504 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
