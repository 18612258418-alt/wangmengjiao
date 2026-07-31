export const config = {
  runtime: "edge",
  maxDuration: 60,
};

declare const process: {
  env: Record<string, string | undefined>;
};

import {
  buildCircleRegionPrompt,
  DEMO_CIRCLE_RESULT,
  type CircleRegionResult,
  type CircleRegionSection,
} from "../src/prompts/circleRegion";
import {
  SOURCE_INGESTION_PROMPT,
  SOURCE_INGESTION_VISION_RULES,
} from "../src/prompts/sourceIngestion";
import { classifyCardSurfaces } from "../src/utils/cardSurfaces";

type ImportKind = "image" | "text" | "link";
type ImportMode = "default" | "circle_region";

interface ImportRequest {
  kind: ImportKind;
  mode?: ImportMode;
  value?: string;
  imageDataUrl?: string;
  fileName?: string;
  pdfTitle?: string;
  pageNum?: number;
  /** circle = 闭合圈选；ink = 下划线/问号/手写字等开放笔迹 */
  markKind?: "circle" | "ink";
  /** 用户对澄清提问的回复 */
  userIntent?: string;
  /** 本地学习到的用户偏好画像 */
  userProfile?: string;
  /** 当前学期课程与允许挂靠的知识目录；模型只能从这里选择稳定 id。 */
  routingContext?: {
    currentSubjectId?: string;
    currentCourseId?: string;
    currentCourseName?: string;
    semester?: string;
    courses?: Array<{ id: string; name: string; teacher?: string }>;
    syllabusCatalog?: Array<{ subjectId: string; id: string; title: string }>;
  };
}

// 以这些字母开头的反斜杠序列几乎必然是 LaTeX 命令而非 JSON 转义
// （覆盖 \theta \frac \nabla 等会被误认为 \t \f \n 合法转义的情况）
const LATEX_CMD_RE = /(?<!\\)\\(?=(?:frac|sqrt|sin|cos|tan|cot|sec|csc|log|ln|exp|lim|sum|prod|int|infty|cdot|times|div|pm|mp|leq?|geq?|neq?|approx|equiv|propto|to|rightarrow|leftarrow|Rightarrow|Leftarrow|left|right|begin|end|text|mathrm|mathbf|mathcal|vec|hat|bar|dot|ddot|tilde|overline|underline|partial|nabla|delta|Delta|theta|Theta|alpha|beta|gamma|Gamma|lambda|Lambda|omega|Omega|sigma|Sigma|phi|Phi|varphi|psi|Psi|pi|Pi|mu|nu|tau|rho|kappa|chi|xi|Xi|zeta|eta|epsilon|varepsilon|ell|hbar|degree|prime|ldots|cdots|dots|quad|qquad)\b)/g;

/** 把模型输出里不合法的 JSON 转义（多为单反斜杠 LaTeX）翻倍修复 */
function repairModelJson(json: string): string {
  let s = json.replace(LATEX_CMD_RE, "\\\\");
  // 成对的 \\ 整体跳过，避免把已正确转义的 \\delta、\\( 再次改坏
  s = s.replace(/\\\\|\\(?!["\\/bfnrtu])/g, m => (m === "\\\\" ? m : "\\\\"));
  return s;
}

/** 输出被 max_tokens 截断时，补齐未闭合的字符串/括号，尽量抢救已生成内容 */
function closeTruncatedJson(json: string): string {
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  for (const ch of json) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = json;
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

function extractJson(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) cleaned = fenced[1].trim();
  // 截断的输出可能没有结尾 }，从第一个 { 取到末尾
  let json = cleaned.match(/\{[\s\S]*\}/)?.[0];
  if (!json) {
    const start = cleaned.indexOf("{");
    if (start === -1) throw new Error("No JSON in model response");
    json = cleaned.slice(start);
  }

  for (const candidate of [json, repairModelJson(json)]) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch { /* try next */ }
    try {
      return JSON.parse(closeTruncatedJson(candidate)) as Record<string, unknown>;
    } catch { /* try next */ }
  }
  console.warn(
    "[import] extractJson failed. head:", json.slice(0, 300).replace(/\n/g, "\\n"),
    "| tail:", json.slice(-200).replace(/\n/g, "\\n"),
  );
  throw new Error("模型返回格式异常，请重新圈选");
}

function normalizePageNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(page => Number(page)).filter(page => Number.isInteger(page) && page > 0))];
}

function normalizeMemoryUnits(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const pages = normalizePageNumbers(row.pages);
    if (!title || pages.length === 0) return [];
    return [{
      id: typeof row.id === "string" && row.id.trim() ? row.id : `MU${String(index + 1).padStart(3, "0")}`,
      title,
      pages,
      contribution: typeof row.contribution === "string" ? row.contribution : "",
    }];
  });
}

function normalizeKnowledgeGroups(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const pages = normalizePageNumbers(row.pages);
    if (!title || pages.length === 0) return [];
    return [{
      title,
      pages,
      summary: typeof row.summary === "string" ? row.summary : "",
      children: Array.isArray(row.children)
        ? row.children.filter((child): child is string => typeof child === "string" && !!child.trim())
        : [],
    }];
  });
}

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
    validCourseContent: typeof parsed.validCourseContent === "boolean" ? parsed.validCourseContent : true,
    validityConfidence: typeof parsed.validityConfidence === "number" ? parsed.validityConfidence : 0.5,
    validityReason: typeof parsed.validityReason === "string" ? parsed.validityReason : "",
    materialType: typeof parsed.materialType === "string" ? parsed.materialType : "reference",
    subjectName: typeof parsed.subjectName === "string" ? parsed.subjectName : "",
    courseName: typeof parsed.courseName === "string" ? parsed.courseName : "",
    targetCourseId: typeof parsed.targetCourseId === "string" ? parsed.targetCourseId : "",
    chapterTitle: typeof parsed.chapterTitle === "string" ? parsed.chapterTitle : "",
    knowledgePoints: Array.isArray(parsed.knowledgePoints) ? parsed.knowledgePoints : [],
    destinations: Array.isArray(parsed.destinations) ? parsed.destinations : [],
    learningPhase: typeof parsed.learningPhase === "string" ? parsed.learningPhase : "",
    learningActions: Array.isArray(parsed.learningActions) ? parsed.learningActions : [],
    syllabusEntryId: typeof parsed.syllabusEntryId === "string" ? parsed.syllabusEntryId : "",
    memoryUnits: normalizeMemoryUnits(parsed.memoryUnits),
    knowledgeGroups: normalizeKnowledgeGroups(parsed.knowledgeGroups),
  };
}

const OUTPUT_SCHEMA = `{
  "subjectId": "只输出英文标识符：physics（任何物理相关）/ math（任何数学相关）/ chemistry（任何化学相关）/ english（任何外语相关）/ other（其他学科）。other 只是技术标识，不能据此把专业课命名为社会科学；必须在 subjectName 写出真实学科，如电路分析、模拟电子技术、计算机组成原理、经济学",
  "validCourseContent": true,
  "validityConfidence": 0.0,
  "validityReason": "一句话说明有效或无效的原文证据",
  "materialType": "courseware|textbook|note|homework|exam|syllabus|schedule_notice|reference|non_course",
  "subjectName": "真实、具体的学科名称。禁止用'其他''专业课''社会科学'笼统代替；例如节点电压法应写'电路分析'",
  "courseName": "匹配到的课程名，无可靠证据则空",
  "targetCourseId": "只能从课程上下文候选 id 中选择，无匹配则空",
  "chapterTitle": "原文章节或可靠推断章节，无则空",
  "knowledgePoints": ["本资料实际涉及的知识点"],
  "destinations": ["knowledge|homework|exam，可多选"],
  "learningPhase": "before_class|in_class|after_class|homework|exam",
  "learningActions": [{"type":"preview|class_reminder|homework|review","title":"可执行动作","dueAt":"可靠时间，无则空","evidence":"触发动作的原文"}],
  "syllabusEntryId": "只能从知识目录候选 id 中选择，无可靠匹配则空",
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
  "memoryUnits": [
    {"id": "MU001", "title": "由一页或连续多页共同贡献的知识单元", "pages": [1,2], "contribution": "这些页面为该知识点提供了什么"}
  ],
  "knowledgeGroups": [
    {"title": "融合后的上位知识对象", "summary": "综合多页后的准确解释", "pages": [1,2,3], "children": ["子概念1","子概念2"]}
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

function routingContextBlock(context?: ImportRequest["routingContext"]) {
  if (!context) return "未提供课程上下文；没有明确证据时课程和目录 id 必须留空。";
  return `【当前可用挂靠上下文】
${JSON.stringify(context)}
只能使用以上 course id 与 syllabus id；上下文不匹配时留空。`;
}

function buildTextPrompt(
  kind: "text" | "link",
  value: string,
  fileName?: string,
  routingContext?: ImportRequest["routingContext"],
) {
  const isPptx = /\.pptx$/i.test(fileName ?? "");
  const documentRules = isPptx ? `
【多页 PPT 专项规则】
1. 必须先做文件级理解：判断整份课件的课程、主题、章节与叙事顺序。
2. 再做页面级解析：memoryUnits 必须保留原始页码，并说明该页或连续页面对知识的贡献。
3. 最后做知识融合：knowledgeGroups 要合并重复、连续和上下位概念，不能“一页等于一个知识点”。
4. title、overview、detailSections、knowledgeTree 必须描述融合后的知识对象；页面只是来源证据。
5. 同一概念跨多页时生成一个 memoryUnit；一页包含多个独立概念时可拆成多个 memoryUnit。
6. 不得编造课件中没有出现的教师、学期、页码或作业截止时间。
` : "";
  return `${SOURCE_INGESTION_PROMPT}

请把用户提供的${kind === "link" ? "链接/网页资料" : "文本/PDF 抽取内容"}深度整理成学习内容。

【资料来源】
${fileName ? `文件名：${fileName}\n` : ""}${value.slice(0, isPptx ? 50000 : 12000)}

${routingContextBlock(routingContext)}
${documentRules}

请按整份资料的核心知识点做结构化总结与深化（不要逐字复述，要提炼升华），按以下 JSON 格式输出：
${OUTPUT_SCHEMA}

${SHARED_RULES}`;
}

// 视觉首屏精简 schema：去掉 knowledgeTree / expandedKnowledge 这类最耗 token 的自由生成，
// 只产出预览卡必需字段，把豆包单次生成压进 Edge 25s 墙钟内。缺的字段 normalizeResult 会补默认值，
// 后续在确认保存 / 详情页再二次补全。
const VISION_OUTPUT_SCHEMA = `{
  "subjectId": "physics|math|chemistry|english|other 之一；other 只表示其他学科，不等于社会科学",
  "validCourseContent": true,
  "validityConfidence": 0.0,
  "validityReason": "有效性证据",
  "materialType": "courseware|textbook|note|homework|exam|syllabus|schedule_notice|reference|non_course",
  "subjectName": "真实、具体的学科名称；禁止用其他、专业课、社会科学笼统代替",
  "courseName": "课程名或空",
  "targetCourseId": "候选课程 id 或空",
  "chapterTitle": "章节或空",
  "knowledgePoints": ["知识点1","知识点2"],
  "destinations": ["knowledge|homework|exam"],
  "learningPhase": "before_class|in_class|after_class|homework|exam",
  "learningActions": [{"type":"preview|class_reminder|homework|review","title":"动作","dueAt":"","evidence":"原文证据"}],
  "syllabusEntryId": "候选知识目录 id 或空",
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

function isCircleApiUnavailable(message: string): boolean {
  return /not configured|429|SetLimitExceeded|TooManyRequests|InvalidEndpointOrModel|Doubao 5\d\d|Doubao 4\d\d|超时|timeout|504|FUNCTION_INVOCATION_TIMEOUT/i.test(message);
}

function circleDemoFallbackResponse(): Response {
  return new Response(JSON.stringify({ ...DEMO_CIRCLE_RESULT, demo: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

function apiTimeouts() {
  const onVercel = !!process.env.VERCEL;
  return {
    // Vercel 函数上限为 60 秒。Kimi K3 必须推理，24 秒会把正常请求误判为超时。
    vision: Number(process.env.IMPORT_VISION_TIMEOUT_MS) || (onVercel ? 55000 : 180000),
    text: Number(process.env.IMPORT_TEXT_TIMEOUT_MS) || (onVercel ? 50000 : 90000),
  };
}

function buildVisionPrompt(fileName?: string, routingContext?: ImportRequest["routingContext"]) {
  return `${SOURCE_INGESTION_VISION_RULES}

整理当前图像或扫描页为学习内容 JSON。${fileName ? `文件：${fileName}。` : ""}提炼核心知识点，不要描述版式。若这是多页资料中的一页，保留当前页的来源位置。
${routingContextBlock(routingContext)}
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

async function callKimiText(prompt: string) {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.VITE_MOONSHOT_API_KEY;
  const model = process.env.MOONSHOT_MODEL_ID || process.env.VITE_MOONSHOT_MODEL_ID || "kimi-k3";
  if (!apiKey) throw new Error("MOONSHOT_API_KEY not configured");
  const res = await fetchWithTimeout("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 4096,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是大学学习资料入库助手。严格按要求判断有效性、挂靠课程与知识点并输出 JSON。" },
        { role: "user", content: prompt },
      ],
    }),
  }, apiTimeouts().text, "Kimi 文本模型");
  if (!res.ok) throw new Error(`Kimi ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

async function callTextModel(prompt: string) {
  if (process.env.MOONSHOT_API_KEY || process.env.VITE_MOONSHOT_API_KEY) {
    return callKimiText(prompt);
  }
  return callDeepSeek(prompt);
}

const SKIP_SECTION = new Set([
  "本圈选内容不涉及",
  "不涉及",
  "无",
  "暂无",
  "N/A",
  "n/a",
]);

function isRealSectionContent(content: string): boolean {
  const t = content.trim();
  return t.length > 0 && !SKIP_SECTION.has(t);
}

function normalizeCircleSection(raw: unknown): CircleRegionSection | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as { title?: unknown; content?: unknown; items?: unknown };
  const title = typeof s.title === "string" ? s.title.trim() : "";
  let content = typeof s.content === "string" ? s.content.trim() : "";
  if (!content && Array.isArray(s.items)) {
    content = s.items
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join("\n");
  }
  if (!title || !content) return null;
  return { title, content };
}

function detailSectionsToCircleSections(detailSections: unknown): CircleRegionSection[] {
  if (!Array.isArray(detailSections)) return [];
  return detailSections
    .map(normalizeCircleSection)
    .filter((s): s is CircleRegionSection => !!s && isRealSectionContent(s.content));
}

function normalizeCircleResult(parsed: Record<string, unknown>): CircleRegionResult {
  const validSkills = ["theory_concept", "math_problem", "language", "experiment_lab", "code_cs", "literature_essay"];
  const skill = typeof parsed.skill === "string" && validSkills.includes(parsed.skill)
    ? parsed.skill
    : "theory_concept";

  const clarifyQuestion = typeof parsed.clarifyQuestion === "string" ? parsed.clarifyQuestion.trim() : "";
  if (parsed.needClarify === true && clarifyQuestion) {
    return {
      intent: typeof parsed.intent === "string" ? parsed.intent.trim() : "",
      skill,
      sections: [],
      warnings: [],
      needClarify: true,
      clarifyQuestion,
    };
  }

  const defaultSections: CircleRegionSection[] = [
    { title: "概念讲清楚", content: "本圈选内容不涉及" },
    { title: "公式推导", content: "本圈选内容不涉及" },
    { title: "解题步骤", content: "本圈选内容不涉及" },
  ];

  let sections = Array.isArray(parsed.sections)
    ? parsed.sections.map(normalizeCircleSection).filter((s): s is CircleRegionSection => !!s)
    : [];

  if (!sections.some(s => isRealSectionContent(s.content))) {
    const fromDetail = detailSectionsToCircleSections(parsed.detailSections);
    if (fromDetail.length) sections = fromDetail;
  }

  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    : [];

  let intent = typeof parsed.intent === "string" ? parsed.intent.trim() : "";
  if (!intent) {
    const fallbackIntent = [parsed.detailIntro, parsed.overview, parsed.summary]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join("\n\n");
    intent = fallbackIntent || "正在理解你圈选的内容…";
  }

  // 若仍无实质 section，把 intent 长文拆成「解析正文」避免右侧空白
  if (!sections.some(s => isRealSectionContent(s.content)) && intent.length > 40) {
    sections = [{ title: "解析正文", content: intent }];
  }

  return {
    intent,
    skill,
    sections: sections.some(s => isRealSectionContent(s.content)) ? sections : defaultSections,
    warnings: warnings.length ? warnings : ["⚠ 圈选范围较小时，建议把题干和所求一并圈入，解析会更准确。"],
  };
}

async function callDoubao(
  imageDataUrl: string,
  options?: {
    fileName?: string;
    mode?: ImportMode;
    pdfTitle?: string;
    pageNum?: number;
    markKind?: "circle" | "ink";
    userIntent?: string;
    userProfile?: string;
    routingContext?: ImportRequest["routingContext"];
  },
) {
  const apiKey = process.env.DOUBAO_API_KEY || process.env.VITE_DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL_ID || process.env.VITE_DOUBAO_MODEL_ID || "doubao-seed-1-6-vision-250815";
  if (!apiKey) throw new Error("DOUBAO_API_KEY not configured");

  const isCircle = options?.mode === "circle_region";
  const promptText = isCircle
    ? buildCircleRegionPrompt({
      pdfTitle: options?.pdfTitle,
      pageNum: options?.pageNum,
      fileName: options?.fileName,
      markKind: options?.markKind,
      userIntent: options?.userIntent,
      userProfile: options?.userProfile,
    })
    : buildVisionPrompt(options?.fileName, options?.routingContext);

  const res = await fetchWithTimeout("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      // 上传解析优先保证及时返回；完整知识扩展可在保存后按需继续生成。
      max_tokens: isCircle ? 1000 : 1100,
      // 关闭深度思考：开启时单次请求 100s+ 且消耗数千 reasoning token，交互场景无法接受
      thinking: { type: "disabled" },
      messages: [
        {
          role: "system",
          content: isCircle
            ? "你是大学学长辅导助手。根据圈选区域推断用户意图，讲清概念、推导公式、补齐解题步骤。严格输出 JSON。"
            : "输出紧凑 JSON，避免冗长。",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: promptText },
          ],
        },
      ],
    }),
  }, apiTimeouts().vision, "视觉模型");
  if (!res.ok) throw new Error(`Doubao ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

async function callKimi(
  imageDataUrl: string,
  options?: {
    fileName?: string;
    mode?: ImportMode;
    pdfTitle?: string;
    pageNum?: number;
    markKind?: "circle" | "ink";
    userIntent?: string;
    userProfile?: string;
    routingContext?: ImportRequest["routingContext"];
  },
) {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.VITE_MOONSHOT_API_KEY;
  const model = process.env.MOONSHOT_MODEL_ID || process.env.VITE_MOONSHOT_MODEL_ID || "kimi-k3";
  if (!apiKey) throw new Error("MOONSHOT_API_KEY not configured");

  const isCircle = options?.mode === "circle_region";
  const promptText = isCircle
    ? buildCircleRegionPrompt({
      pdfTitle: options?.pdfTitle,
      pageNum: options?.pageNum,
      fileName: options?.fileName,
      markKind: options?.markKind,
      userIntent: options?.userIntent,
      userProfile: options?.userProfile,
    })
    : buildVisionPrompt(options?.fileName, options?.routingContext);

  const res = await fetchWithTimeout("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      // K3 的推理 token 和最终 JSON 共用输出预算；旧的 1100 容易在正文前被截断。
      max_completion_tokens: isCircle ? 3000 : 4096,
      // K3 不能关闭思考，上传解析使用 low 以降低等待时间。
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: isCircle
            ? "你是大学学习助手。理解图片中的圈选区域并严格输出 JSON。"
            : "整理图片中的学习内容，只输出紧凑 JSON。",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: promptText },
          ],
        },
      ],
    }),
  }, apiTimeouts().vision, "Kimi 视觉模型");
  if (!res.ok) throw new Error(`Kimi ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

async function callVisionModel(
  imageDataUrl: string,
  options?: Parameters<typeof callDoubao>[1],
) {
  if (process.env.MOONSHOT_API_KEY || process.env.VITE_MOONSHOT_API_KEY) {
    return callKimi(imageDataUrl, options);
  }
  return callDoubao(imageDataUrl, options);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: ImportRequest | null = null;
  try {
    body = await req.json() as ImportRequest;
    const fallbackTitle = body.fileName ? `记忆：${body.fileName.replace(/\.[^.]+$/, "").slice(0, 20)}` : "记忆：导入资料整理";

    if (body.kind === "image") {
      if (!body.imageDataUrl) throw new Error("imageDataUrl is required");
      const raw = await callVisionModel(body.imageDataUrl, {
        fileName: body.fileName,
        mode: body.mode,
        pdfTitle: body.pdfTitle,
        pageNum: body.pageNum,
        markKind: body.markKind,
        userIntent: body.userIntent,
        userProfile: body.userProfile,
        routingContext: body.routingContext,
      });

      if (body.mode === "circle_region") {
        return new Response(JSON.stringify(normalizeCircleResult(extractJson(raw))), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(normalizeResult(extractJson(raw), fallbackTitle, body.imageDataUrl)), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.kind === "text" || body.kind === "link") {
      if (!body.value) throw new Error("value is required");
      const raw = await callTextModel(buildTextPrompt(body.kind, body.value, body.fileName, body.routingContext));
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
    if (
      body?.kind === "image"
      && body.mode === "circle_region"
      && isCircleApiUnavailable(message)
    ) {
      return circleDemoFallbackResponse();
    }
    const isTimeout = message.includes("超时");
    return new Response(JSON.stringify({ error: message }), {
      status: isTimeout ? 504 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
