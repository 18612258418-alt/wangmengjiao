export const CIRCLE_REGION_OUTPUT_SCHEMA = `{
  "intent": "1-2句话说明用户做此标记最可能想搞懂什么（结合标记类型和上下文推断意图）",
  "skill": "theory_concept|math_problem|language|experiment_lab|code_cs|literature_essay 之一",
  "needClarify": false,
  "clarifyQuestion": "仅当 needClarify=true 时填写：用一句话向用户确认意图，并给出你猜的1-2个可能方向",
  "sections": [
    {"title": "概念讲清楚", "content": "不涉及则写「本圈选内容不涉及」"},
    {"title": "公式推导", "content": "不涉及则写「本圈选内容不涉及」；涉及则按步骤推导，公式用 LaTeX"},
    {"title": "解题步骤", "content": "不涉及则写「本圈选内容不涉及」；涉及则 Step 1. Step 2. … 可跟做，补全处标注【补全】"}
  ],
  "warnings": ["⚠ 易错点：现象 → 原因 → 避免方法", "可选第二条"]
}`;

const CIRCLE_REGION_RULES = `【角色】
你是有丰富大学教学经验的学长/学姐。用户用触控笔在 PDF 上做了标记，说明 TA 对这部分有疑问或想深入理解。

【任务】
1. 先根据标记和上下文判断用户意图（理解概念 / 公式推导 / 解题补步骤 / 判断对错 / 语言要点）
2. 按意图给出能直接看懂、能跟着做的讲解
3. 若标记处解法或推导不完整、跳步超过 2 步：必须补齐缺失过程，该步前标注【补全】
4. 条件不足无法唯一求解时：说明缺什么信息，不要编造数字

【禁止】
- 只描述「图里有什么字」或版式
- 泛泛而谈、省略关键推导、从条件直接跳到答案
- 编造标记区域里完全不存在的信息

【公式】
行内公式用 $...$；独立成行的公式用 $$...$$。JSON 字符串里的反斜杠必须写成双反斜杠（如 \\\\frac{a}{b}）。

【输出】
只输出 JSON，无 markdown 代码块。能确定意图时 needClarify=false，sections 三个模块都要保留（不涉及的写「本圈选内容不涉及」），warnings 至少 1 条。
每个 section 的 content 控制在 300 字以内：讲透关键步骤即可，不要展开次要背景。`;

const INK_MARK_GUIDE = `【标记类型判断】
截图中红色笔迹是用户的手写标记，先判断它属于哪种：
- 下划线/波浪线 → 用户想搞懂被划线的词句或公式，重点讲解被划线部分
- 问号（?/？）→ 用户对该处有疑问，解释问号旁边的内容为什么成立/什么意思
- 手写文字 → 先识别用户写了什么：是提问就回答；是笔记/推导就检查对错并补充
- 箭头/连线 → 解释两处内容的关联
- 对勾/叉号 → 用户在自判对错，验证该处并给出正确说法

【不确定时】
若结合标记和上下文仍无法确定用户想要什么（confident 程度低），把 needClarify 设为 true，
在 clarifyQuestion 里用一句话向用户提问并给出你猜的 1-2 个可能方向（如「你是想让我解释这个定理，还是检查你写的推导？」），
此时 sections 输出空数组 []，intent 写你的最佳猜测。能确定时不要反问，直接解析。`;

export interface CircleRegionPromptOpts {
  pdfTitle?: string;
  pageNum?: number;
  fileName?: string;
  /** circle = 闭合圈选；ink = 下划线/问号/手写字等开放笔迹 */
  markKind?: "circle" | "ink";
  /** 用户对澄清提问的回复，明确说明了本次标记意图 */
  userIntent?: string;
  /** 本地学习到的用户偏好画像 */
  userProfile?: string;
}

export function buildCircleRegionPrompt(opts?: CircleRegionPromptOpts): string {
  const isInk = opts?.markKind === "ink";
  const ctx: string[] = [];
  if (opts?.pdfTitle) ctx.push(`文档：${opts.pdfTitle}`);
  if (opts?.pageNum) ctx.push(`当前页码：第 ${opts.pageNum} 页`);
  if (opts?.fileName) ctx.push(`文件：${opts.fileName}`);
  const contextLine = ctx.length ? `${ctx.join("；")}。\n` : "";

  const profileLine = opts?.userProfile?.trim()
    ? `【用户画像】${opts.userProfile.trim()}（推断意图时参考，但以本次标记内容为准）\n`
    : "";

  const intentLine = opts?.userIntent?.trim()
    ? `【用户已说明本次标记的意图】${opts.userIntent.trim()}。请严格按该意图解析，needClarify 必须为 false。\n`
    : "";

  const sceneLine = isInk
    ? "附件截图包含用户用红色笔迹做的手写标记（下划线、问号、手写文字、箭头等）及其周边原文。"
    : "附件是用户圈选区域的截图（可能只是一道题的一部分、一个公式或一段定义）。圈选范围以外的内容已被涂白，图片边缘可能残留被截断的不完整文字——请忽略空白区域和残缺字符，只解析完整可见的内容。";

  return `${contextLine}${profileLine}${intentLine}${sceneLine}请深度解析并输出以下 JSON：
${CIRCLE_REGION_OUTPUT_SCHEMA}

${isInk ? `${INK_MARK_GUIDE}\n\n` : ""}${CIRCLE_REGION_RULES}`;
}

export interface CircleRegionSection {
  title: string;
  content: string;
}

export interface CircleRegionResult {
  intent: string;
  skill: string;
  sections: CircleRegionSection[];
  warnings: string[];
  needClarify?: boolean;
  clarifyQuestion?: string;
}

const SKIP_SECTION = new Set([
  "本圈选内容不涉及",
  "不涉及",
  "无",
  "暂无",
  "N/A",
  "n/a",
]);

function isRealContent(content: string): boolean {
  const t = content.trim();
  return t.length > 0 && !SKIP_SECTION.has(t);
}

export function formatCircleRegionAnswer(data: CircleRegionResult): string {
  if (data.needClarify && data.clarifyQuestion?.trim()) {
    return data.clarifyQuestion.trim();
  }

  const parts: string[] = [];
  const intent = data.intent?.trim() ?? "";
  const realSections = (data.sections ?? []).filter(s => isRealContent(s.content ?? ""));

  // 若 intent 已作为「解析正文」section 展示，避免重复
  const intentDuplicated = realSections.length === 1
    && realSections[0].title === "解析正文"
    && realSections[0].content.trim() === intent;

  if (intent && !intentDuplicated) parts.push(`【用户意图】\n${intent}`);
  for (const s of realSections) {
    parts.push(`【${s.title}】\n${s.content.trim()}`);
  }
  const warns = (data.warnings ?? []).filter(w => w?.trim());
  if (warns.length) parts.push(`【关键提醒】\n${warns.join("\n")}`);
  return parts.join("\n\n");
}
