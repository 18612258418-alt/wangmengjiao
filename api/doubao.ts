export const config = { runtime: "edge" };

declare const process: {
  env: Record<string, string | undefined>;
};

function buildPrompt(hasAnnotations: boolean) {
  const systemContent = `你是一位专业的中国大学学习助手，专门帮助大学生整理课堂批注笔记、提炼核心知识点。
你的工作规则：
1. 无论图片中出现何种语言（英文、日文、数学公式、化学符号等），你的所有文字输出内容必须使用中文。
2. subjectId 字段固定使用指定的英文标识符，其余所有字段内容一律输出中文。
3. 你的语气像一位细心的学长，帮同学整理笔记，亲切自然，不要过于正式。用学术语言解释知识点，贴合大学生的学习习惯（包括专业课、公共课、考研、四六级等场景）。
4. 只输出 JSON，不要输出任何解释、markdown 代码块或其他多余文字。
5. 【关键规则】${
    hasAnnotations === false
      ? "当前图片中没有任何人工标记（属于'直接全图分析'模式）。你必须对整张图片上的核心核心学术内容进行深度提炼与结构化总结，不需要寻找局部红圈/高亮。你必须将整个页面的核心要点、重点公式或重要定理提炼出来并深入解释，不能输出空内容。此时，你的 detailIntro 字段固定写为 '整图分析结论'；同时 detailSections、aiKeyPoints、expandedKnowledge、knowledgeTree 全都基于整页的核心知识点进行生成。"
      : "图中可能存在红色/彩色的手写圆圈、下划线、箭头、高亮等人工标记。你必须首先精准定位这些标记覆盖的具体文字/公式/图表内容，然后将 detailIntro、detailSections、aiKeyPoints、expandedKnowledge 严格限定为只分析这些被标记的内容，绝对不能扩散到页面其他未被标记的区域。不同圈选位置必须产生完全不同的分析结果。"
  }
6. 【意图判断】根据${hasAnnotations === false ? "图片核心内容" : "圈选内容"}自动判断学习意图并调整输出风格：记忆型（圈定义/定理）→ aiKeyPoints 提供速记口诀或记忆技巧；理解型（圈逻辑/推导）→ detailSections 提供步骤分解和原理说明；应用型（圈例题/计算）→ detailSections 提供解题思路 and 常见错误提示；文献型（圈论文/资料内容）→ detailSections 提供核心论点、研究方法和批判性分析视角。
7. 【价值升华】nextAction 字段必须给出具体可执行的"下一步行动建议"，告诉同学接下来该做什么（如：建议做哪类课后习题、结合哪个知识点深入阅读、参考哪类文献扩展、备考时优先复习哪个考点等）。
8. 【重要交互规范】在 "overview", "detailSections" (中的 items 字符串里), 以及 "nextAction" 字段中，如果提到其他重要的、非当前主题的大学核心学术名词、公式或关联概念，请务必用双中括号 \`[[概念名]]\` 将其包裹起来（如：\`[[麦克斯韦方程组]]\`、\`[[惯性]]\` 等）。这些名词会被渲染为可点击跳转的蓝色内联链接。请自然穿插 1-3 个这样的双中括号。
8b. 【公式 LaTeX】凡公式、符号、下标上标必须用 LaTeX：行内用 $...$（如 $r=mv/(qB)$），独立重要公式单独一行用 $$...$$；不要用 Unicode 拼凑复杂算式。
9. 【内容归类】contentType 表示最主要意图（note / homework 二选一）。页面可同时含多种信息：
   - 有作业/待办/截止时间/任务清单 → 必须填写 homeworkTasks（1-5 条）与 taskDueDate（有则 YYYYMMDD，无则 ""），contentType 可为 homework 或 note。
   - 讲义/批注/概念整理/试卷习题 → contentType 一般为 note；若同时有作业，以作业为主类型并仍填对应字段。
10. 【作业任务】只要有作业/待办意图就必须输出 homeworkTasks；无作业意图时 homeworkTasks 为 []、taskDueDate 为 ""。`;

  const userText = `请分两步处理这张学习批注图片：

【第一步-${hasAnnotations === false ? "全局阅读" : "内部定位"}，不输出】仔细观察图中${hasAnnotations === false ? "整页的全部文字、公式和图表" : "所有人工标记（红色或彩色的圆圈、下划线、方框、箭头等）"}，在内心提炼出${hasAnnotations === false ? "整图最核心的学术要点" : "这些标记覆盖的精确文字/公式/图表原文"}，作为后续深度分析的唯一聚焦对象。

【第二步-输出JSON】严格按以下格式输出，所有字段用中文，不输出任何多余文字：

{
  "subjectId": "严格按以下规则归类，只输出英文标识符： physics（任何物理相关） / math（任何数学相关） / chemistry（任何化学相关） / english（任何外语相关） / other（专业课、人文社科、计算机、经济等）。判断时只看核心内容的学科本质，不要因为是大学场景就归为 other",
  "contentType": "note 或 homework 之一（主意图）",
  "homeworkTasks": ["有作业/待办意图时填写，否则 []"],
  "taskDueDate": "有作业意图时 YYYYMMDD，无则空字符串",
  "title": "记忆：[基于${hasAnnotations === false ? "整图核心知识点" : "圈选内容"}的中文知识点标题，不超过20字]",
  "summary": "[50字以内的摘要，只概括${hasAnnotations === false ? "整页的核心主题" : "圈选区域的核心内容"}]",
  "overview": "[约200字，对整张图片所有内容的全局概述：主题背景、页面知识结构、重要公式或核心论点，帮同学了解本页全貌]",
  "detailIntro": "${hasAnnotations === false ? "整图分析结论" : "[30字以内，明确指出圈选了哪里，如：'你圈住了牛顿第一定律的惯性定义部分']"}",
  "detailSections": [
    {
      "title": "[针对${hasAnnotations === false ? "整图第一个核心主题" : "圈选区域的第一个知识模块"}]",
      "items": ["[具体学术知识点及深入原理解析1，包含公式或背景解释，要详细且易懂，不能一两句话敷衍]", "[具体学术知识点2]", "[具体学术知识点3]"]
    },
    {
      "title": "[针对${hasAnnotations === false ? "整图第二个核心主题" : "圈选区域的第二个知识模块"}]",
      "items": ["[具体学术知识点1]", "[具体学术知识点2]"]
    }
  ],
  "aiKeyPoints": [
    "[仅针对核心重点1，15字以内]",
    "[核心重点2，15字以内]",
    "[核心重点3，15字以内]",
    "[核心重点4，15字以内]"
  ],
  "expandedKnowledge": [
    {
      "concept": "[与核心知识点直接关联的延伸概念，10字以内]",
      "explanation": "[50字以内的延伸解释，帮同学建立知识网络]"
    },
    {
      "concept": "[关联概念2]",
      "explanation": "[延伸解释2]"
    }
  ],
  "knowledgeTree": [
    {"label": "[学科名，如：物理]", "level": 1},
    {"label": "[二级分类，如：经典力学]", "level": 2},
    {"label": "[章节，如：牛顿运动定律]", "level": 3, "current": false},
    {"label": "[核心知识点名称（标为当前）]", "level": 4, "current": true},
    {"label": "[细分概念1]", "level": 5},
    {"label": "[细分概念2]", "level": 5},
    {"label": "[细分概念3]", "level": 5}
  ],
  "skill": "根据内容的学习类型判断，从以下选项中选一个：theory_concept（定义/定理/概念）/ math_problem（数学/物理计算题）/ language（外语/语言学习）/ experiment_lab（实验/研究方法）/ code_cs（代码/算法）/ literature_essay（文献/论述/人文社科）",
  "nextAction": "[50字以内，给出1-2条具体可执行的下一步学习建议，用第二人称'你']"
}

严格约束：①overview 描述全页，其余字段严格限定于分析主体；②所有字段必须用中文（contentType、subjectId、skill、taskDueDate 等英文枚举/日期格式除外）；③nextAction 必须给出具体行动；④skill 必须从给定选项中选择；⑤有作业意图必填 homeworkTasks；无作业意图时 homeworkTasks 为 []。`;

  return { systemContent, userText };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.DOUBAO_API_KEY || process.env.VITE_DOUBAO_API_KEY;
  const modelId = process.env.DOUBAO_MODEL_ID || process.env.VITE_DOUBAO_MODEL_ID || "doubao-seed-1-6-vision-250815";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "DOUBAO_API_KEY not configured on server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let imageDataUrl: string;
  let hasAnnotations: boolean;
  try {
    const body = await req.json() as { imageDataUrl: string; hasAnnotations?: boolean };
    imageDataUrl = body.imageDataUrl;
    hasAnnotations = body.hasAnnotations ?? true;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { systemContent, userText } = buildPrompt(hasAnnotations);

  const upstream = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: userText },
          ],
        },
      ],
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Doubao ${upstream.status}: ${errText}` }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
