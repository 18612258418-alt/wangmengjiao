import type { CardData, ExerciseDifficulty, InteractionPlan, QuizBlueprint } from "../types";
import { getFewShotForInteraction } from "./interactiveFewShots";

export interface ExercisePromptNote {
  id: string;
  title: string;
  skill?: string;
  aiKeyPoints?: string[];
  overview?: string;
  detailIntro?: string;
  unifiedDetail?: string;
}

export interface QuizPromptConfig {
  questionCount: number;
  difficulty: ExerciseDifficulty;
}

function difficultyLabel(difficulty: ExerciseDifficulty): string {
  switch (difficulty) {
    case "basic": return "基础";
    case "challenge": return "挑战";
    default: return "进阶";
  }
}

export function toExercisePromptNotes(cards: CardData[]): ExercisePromptNote[] {
  return cards.map(card => ({
    id: card.id,
    title: card.title,
    skill: card.skill,
    aiKeyPoints: card.aiKeyPoints,
    overview: card.overview,
    detailIntro: card.detailIntro,
    unifiedDetail: card.unifiedDetail,
  }));
}

function renderNotes(notes: ExercisePromptNote[]): string {
  return notes.map((note, index) => {
    const detail = note.unifiedDetail || note.overview || note.detailIntro || "";
    return [
      `笔记 ${index + 1} ID：${note.id}`,
      `标题：${note.title}`,
      `学习类型：${note.skill || "theory_concept"}`,
      `核心要点：${(note.aiKeyPoints ?? []).join("、") || "(无)"}`,
      `内容摘要：${detail.slice(0, 900) || "(无)"}`,
    ].join("\n");
  }).join("\n\n");
}

// ── 学科/技能分流的命题策略（大学生群体）──────────────────────────────────
function strategyForSkill(skill: string): string {
  switch (skill) {
    case "math_problem":
      return "计算/推导类：以计算题、推导题、适用条件辨析为主；题干给出具体数值或情境，要求得出结果或选择正确步骤；干扰项要对应典型计算错误、条件误用或公式张冠李戴；公式一律用 LaTeX（单美元符号包裹）。";
    case "theory_concept":
      return "概念原理类：考概念辨析、因果推理、条件判断与迁移应用；禁止纯背诵；干扰项设置成'似是而非'的常见误解，让学生靠理解而非记忆区分。";
    case "language":
      return "语言学习类：以完形填空、改错、句子结构/语法辨析、写作仿写为主，必须结合语境；避免脱离语境的孤立词义题；解析要点明母语干扰点。";
    case "literature_essay":
      return "人文社科类：以材料分析、观点辨析、论证评价为主；先给出一段情境/材料，再让学生判断论点、论据充分性或逻辑漏洞，而非记忆事实结论。";
    case "experiment_lab":
      return "实验科学类：考实验设计、变量控制、误差来源、数据/图表解读；给出实验情境让学生分析'为什么这样做'与'结果说明什么'。";
    case "code_cs":
      return "计算机类：考算法思路、时间/空间复杂度、边界与异常情况、代码纠错；可给出小段伪代码或代码片段让学生分析输出或找 bug。";
    default:
      return "考查理解与应用，避免纯记忆题，干扰项要有迷惑性。";
  }
}

function quizStrategyBlock(notes: ExercisePromptNote[]): string {
  const skills = Array.from(new Set(notes.map(n => n.skill || "theory_concept")));
  const lines = skills.map(s => `- ${s}：${strategyForSkill(s)}`);
  return `本组笔记涉及以下学习类型，请针对每种类型采用对应命题策略：\n${lines.join("\n")}`;
}

// ── 第一步：组卷蓝图（先规划考点，再据此出题）──────────────────────────────
export function buildQuizBlueprintPrompt(notes: ExercisePromptNote[], config: QuizPromptConfig): string {
  return `你是一位资深教研老师。在正式出题前，请先为下面的学习笔记规划一份"组卷蓝图"——即这套${config.questionCount}道题应覆盖哪些考点、每个考点用什么题型和难度。

【来源笔记】
${renderNotes(notes)}

【命题方向参考】
${quizStrategyBlock(notes)}

【规划要求】
1. 选出 ${config.questionCount} 个最值得考的核心考点（考点数=题数，一题一考点；考点之间不重复）。
2. 整体难度向「${difficultyLabel(config.difficulty)}」靠拢，可有少量梯度。
3. 优先考"理解/推理/应用/辨析"型考点，避免纯记忆。
4. ${notes.length >= 2 ? "至少 1 个考点要跨多条来源笔记综合，sourceNoteId 填主要来源。" : "sourceNoteId 填该笔记 ID。"}
5. 为每个考点说明"为什么值得考（rationale）"，结合大学考试/考研/期末/四六级等真实场景。

【输出格式】
仅输出一个严格 JSON 对象，不要 markdown、不要解释文字：
{
  "examPoints": [
    { "point": "考点名称", "type": "single_choice", "difficulty": "${config.difficulty}", "sourceNoteId": "note_id", "rationale": "为什么考、高频程度" }
  ]
}

【自检】
- examPoints 数量必须等于 ${config.questionCount}。
- type 只能是 single_choice / true_false / short_answer。
- JSON 必须能被 JSON.parse 直接解析。`;
}

// ── 第二步：基于蓝图出题 ─────────────────────────────────────────────────
export function buildQuizPrompt(notes: ExercisePromptNote[], config: QuizPromptConfig, blueprint?: QuizBlueprint): string {
  const noteText = renderNotes(notes);
  const crossCount = notes.length >= 2 ? Math.max(1, Math.floor(config.questionCount / 3)) : 0;
  const blueprintBlock = blueprint && blueprint.examPoints.length > 0
    ? `\n【必须严格遵循的组卷蓝图】\n请按下面规划好的考点逐题命题，第 i 题对应第 i 个考点，题型和难度以蓝图为准：\n${blueprint.examPoints
        .map((p, i) => `${i + 1}. 考点：${p.point}｜题型：${p.type}｜难度：${p.difficulty}｜来源：${p.sourceNoteId ?? "-"}`)
        .join("\n")}\n`
    : "";

  return `你是一位资深教研老师，需要根据学生选中的学习笔记，生成一组高质量练习题。

【来源笔记】
${noteText}
${blueprintBlock}
【命题策略（按学习类型分流）】
${quizStrategyBlock(notes)}

【命题要求】
1. 总题数：${config.questionCount} 道。${blueprint ? "（严格对应上面蓝图的每个考点）" : ""}
2. 总体难度：${difficultyLabel(config.difficulty)}。
3. 必须考察迁移、推理、辨析，禁止只问"以下哪项是定义"这种纯记忆题。
4. ${crossCount > 0 ? `至少 ${crossCount} 道题需要跨多个来源笔记综合应用，并在 crossNotes 字段标注涉及的笔记 ID。` : "只有一条来源笔记时，crossNotes 填该笔记 ID。"}
5. 每道题解析必须包含：正确思路推导、错误选项辨析、易错点提醒、对应核心知识点。
6. 涉及公式时使用 LaTeX，公式用单美元符号包裹。

【好题质量标准（每道题都必须满足，这是评判出题好坏的核心）】
1. 单一最优解：正确答案唯一且无争议；其余选项必须是确定错误的，不能出现"也算对/都沾边"的情况。
2. 干扰项有迷惑性：每个错误选项都要对应一个真实的易错点、常见误解或典型计算错误，禁止用明显荒谬、与主题无关的选项凑数。
3. 考理解不考背诵：题干需要推理、辨析、计算或应用才能作答；禁止"以下哪项是 X 的定义/下列说法正确的是"这类只靠记忆的题。
4. 选项同质化：同一题各选项的长度、句式、粒度尽量一致，不能让"最长的/最具体的"成为答案线索。
5. 不泄题：题干、选项之间不得暗示或泄露答案；答案分布不要全集中在某一个字母。
6. 解析有教学价值：必须讲清"为什么对 + 每个错项错在哪 + 对应易错提醒"，而不是只重复正确答案。
7. 难度吻合：与「${difficultyLabel(config.difficulty)}」难度匹配；挑战难度要体现综合、跨知识点或多步推理，基础难度要清晰直接。

【输出格式】
仅输出一个严格 JSON 对象，不要 markdown，不要解释文字，不要在 JSON 中写注释：
{
  "setTitle": "18字以内的习题集标题",
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "difficulty": "${config.difficulty}",
      "stem": "题干",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A",
      "explanation": "解析，含错项辨析与易错提醒。",
      "knowledgePoints": ["知识点1", "知识点2"],
      "crossNotes": ["note_id"]
    }
  ]
}

【输出前自检（逐条核对，不达标就重写该题，全部通过后再输出最终 JSON）】
- 格式：questions 数量等于 ${config.questionCount}；每题含 id/type/difficulty/stem/answer/explanation；single_choice 有 4 个 options，true_false 有 2 个 options，short_answer 的 options 为空数组；JSON 能被 JSON.parse 直接解析。
- 质量：逐题对照上面 7 条「好题质量标准」自查——答案是否唯一、干扰项是否有迷惑性、是否在考理解而非背诵、解析是否讲清错因。任何一条不满足就重写该题。
- 只输出最终 JSON，不要输出自检过程。`;
}

export function buildMindmapPrompt(notes: ExercisePromptNote[]): string {
  return `请基于以下学习笔记，生成 Mermaid mindmap 语法，用于帮助学生建立知识结构。

【来源笔记】
${renderNotes(notes)}

要求：
1. 只输出 Mermaid mindmap 正文，不要用 \`\`\`mermaid 包裹。
2. 不超过 3 层，节点文本尽量不超过 8 个汉字。
3. 结构按“核心概念 → 关键方法 → 易错/应用”组织。
4. 不要输出解释文字。

示例格式：
mindmap
  root((主题))
    核心概念
      子概念
    应用场景
      典型题型`;
}

export function buildHardPointPrompt(notes: ExercisePromptNote[]): string {
  return `你是一位耐心的学长，请根据以下笔记提炼“难点讲解”。

【来源笔记】
${renderNotes(notes)}

请严格按以下模块输出，每个模块以【模块名】单独占一行，模块之间空一行，不使用 markdown 符号：

【最容易卡住的地方】
指出 2-3 个学生最可能理解困难的点，每点要说明“为什么难”。

【突破思路】
给出逐步理解路径，包含可以立刻执行的学习动作。

【易错提醒】
列出 2 条典型错误，每条必须包含：错误现象、原因、避免方式。

【练习建议】
推荐下一步该做的题型或复习方式，要结合来源笔记内容。`;
}

export function buildInteractionPlanPrompt(notes: ExercisePromptNote[]): string {
  return `你是一位"交互式教学设计师"。请先判断以下学习笔记是否适合做动态交互演示，并输出一份"可被工程师一次画对"的交互设计稿 JSON。

【来源笔记】
${renderNotes(notes.slice(0, 2))}

【判断规则】
1. 适合动态交互的内容：力学运动、能量变化、几何/函数图像、极限/导数/积分面积、电路、电化学、化学平衡/速率、语言句法拆解。
2. 纯概念/定义/历史/理论框架也可以交互，但应使用 step_cards（翻卡、步骤推演、对比卡），不要强行做物理动画。
3. 交互目标不是炫酷动画，而是让大学生能调参数、观察变量关系、理解因果。
4. 控件应少而关键，优先 2-4 个变量。每个变量必须有 label、key，数值变量给 min/max/default/unit。

【可用 interactionType / 对应的 renderStrategy】
- physics_sim：物理运动、受力、能量、电路等 → 必须用 canvas_animation（canvas + requestAnimationFrame，连续帧动画）。
- math_plot：函数、极限、导数、积分、几何面积 → 用 canvas_plot（canvas 绘制曲线/面积/坐标系）。
- chem_reaction：反应条件、平衡移动、速率影响 → canvas_animation（粒子/箭头/状态卡）或 svg_static。
- language_parse：长难句、语法结构、写作句式 → svg_static 或 dom_cards 即可。
- step_cards：纯概念、理论框架、文科 → dom_cards（翻卡/步骤推演）。

【sceneDescription 写作规范——这是工程师作画的唯一依据，必须详细】
按下面 5 段写，不要堆形容词，要可直接画：
1) 画布尺寸与坐标系：建议 760×360 或 720×400，原点位置（如左下角为 (0,0)）。
2) 静态场景元素：每个元素列出"形状 + 位置（用画布坐标或百分比）+ 颜色 + 标签文字"。例：
   - 左斜面：从 (60,300) 到 (320,80) 的折线，黑色 4px，下方淡灰填充。
   - 水平段：从 (320,300) 到 (440,300)，黑色 4px。
   - 右斜面：从 (440,300) 以"右斜面角度"决定终点，黑色 4px。
3) 可动元素：用"哪个控件影响哪个属性"来描述。例：小球（半径 14，#2563eb），位置随时间沿轨道前进；当 angle=0 时在水平段上匀速运动。
4) 辅助标注：力向量箭头（重力向下、支持力垂直轨道、摩擦力沿轨道反方向），颜色 #1d4ed8 / #16a34a / #f59e0b，长度按相对大小缩放。
5) HUD/输出区：在画布外下方画 3 列指标（如"最大高度 / 当前速度 / 能量损耗"），数值随仿真更新。

【输出格式】
只输出严格 JSON，不要 markdown，不要解释文字：
{
  "suitable": true,
  "interactionType": "physics_sim",
  "renderStrategy": "canvas_animation",
  "learningGoal": "通过调节斜面角度和摩擦系数，观察小球能否回到等高位置，理解伽利略理想斜面实验如何引出惯性定律。",
  "controls": [
    { "key": "rightAngle", "label": "右斜面角度", "min": 0, "max": 60, "step": 1, "default": 30, "unit": "°" },
    { "key": "friction", "label": "摩擦系数", "min": 0, "max": 0.4, "step": 0.01, "default": 0, "unit": "" }
  ],
  "outputs": ["最大上升高度", "当前速度", "能量损耗"],
  "visualMetaphor": "左侧固定斜面 → 水平面 → 右侧可调斜面，小球沿轨道滑动。",
  "sceneDescription": "（按上面 5 段写完整）",
  "fallbackMode": "step_cards",
  "reason": "通过把'右斜面角度'拉到 0，学生能直观看到小球永远滑不停，从而'看到'惯性定律。"
}

【自检】
- 如果是伽利略斜面、牛顿运动、洛伦兹力、电磁感应等，必须 interactionType=physics_sim，renderStrategy=canvas_animation。
- 如果是函数/积分/几何面积，必须 interactionType=math_plot，renderStrategy=canvas_plot。
- sceneDescription 必须按 5 段写，不可省略，不可只写一句话。
- 数值控件必须给 min/max/step/default/unit。`;
}

export function buildInteractiveCodePrompt(notes: ExercisePromptNote[], plan: InteractionPlan): string {
  const main = notes[0];
  const planText = JSON.stringify(plan, null, 2);
  const fewShot = getFewShotForInteraction(plan.interactionType);
  const fewShotBlock = fewShot
    ? `

【金标准参考（请严格抄袭它的代码结构、HiDPI 写法、控件布局、HUD 三列卡片样式，但内容必须围绕"来源笔记"而不是伽利略斜面）】
\`\`\`tsx
${fewShot}
\`\`\``
    : "";

  return `你是一位资深前端交互工程师。请把下面这份"交互设计稿"完整、像素级地画出来，生成一个可在 Sandpack 中直接运行的 React 单文件组件。${fewShotBlock}

【来源笔记】
${renderNotes(notes.slice(0, 2))}

【交互设计稿 JSON】
${planText}

【可用 import（白名单）】
import React, { useEffect, useMemo, useRef, useState } from "react";
（也可以不 import 任何内容；禁止 import 上面以外的任何模块。）

【硬性输出要求】
1. 直接输出 /App.tsx 的完整源码内容，第一行就是 import 或注释，最后一行是 } 结尾。
2. 严禁使用任何 markdown 围栏（不要写三个反引号，不要写 \`\`\`tsx \`\`\`jsx \`\`\`react \`\`\`typescript 等任何形式）。
3. 严禁写任何解释性文字（如"以下是代码"、"代码如下"、"App.tsx："等前后缀）。
4. 必须 export default function App()。
5. 不要 fetch，不要访问外部网络，不要使用 localStorage。允许 window.devicePixelRatio、window.requestAnimationFrame、performance.now、HTMLCanvasElement 这些渲染相关 API。
6. 必须用内联样式实现完整 UI，不依赖 Tailwind class，不依赖外部 CSS。
7. 必须把 plan.controls 中的每个控件渲染为 input[type=range]（数值）或 select（枚举），并让控件真实影响画面与输出指标。
8. 必须按 plan.outputs 渲染输出指标区（建议 3 列卡片）。
9. 主题必须围绕：${main?.title ?? "当前知识点"}。
10. 代码必须可直接编译，不要省略任何变量，不要写伪代码。

【按 renderStrategy 分情况执行】
■ 若 renderStrategy === "canvas_animation"（physics_sim 默认走这里）：
  a. 用 <canvas ref={canvasRef} /> 渲染，宽高写在 plan.sceneDescription 里（默认 760×360）。
  b. 必须做 HiDPI：在 useEffect 里读取 devicePixelRatio，把 canvas.width/height 设为逻辑尺寸 * dpr，再 ctx.scale(dpr, dpr)。
  c. 必须用 requestAnimationFrame 做动画循环；用 useRef 存当前状态（位置、速度、时间）。controls 用 useRef 缓存最新值，避免每次 setState 重启循环。
  d. 必须有"播放/暂停"和"重置"按钮，状态变量分别为 playing 和 reset 触发。
  e. 必须按 plan.sceneDescription 的五段内容逐项画出：先 clearRect，再画静态场景（轨道、地面），再画可动元素（小球、向量箭头），最后让 HUD 同步指标。
  f. 力向量必须画带箭头的线段，颜色按 plan 给的色值。
  g. useEffect 清理函数里 cancelAnimationFrame。
  h. 不允许出现"两段不连续的轨道"——所有轨道必须通过共同端点连接。

■ 若 renderStrategy === "canvas_plot"（math_plot 默认走这里）：
  a. 用 canvas 画坐标系（含刻度、原点、x/y 轴标签），HiDPI 同上。
  b. 必须画函数曲线 + 当前控件参数下高亮的关键区域（如积分面积/导数切线）。
  c. 控件变化时立刻重绘（在 useEffect 里依赖 controls）。

■ 若 renderStrategy === "svg_static"：用 SVG 渲染分步解析或受力图，按控件切换高亮元素。
■ 若 renderStrategy === "dom_cards"：用 div 做翻卡、步骤推演、对比卡，每步内容明确不同。

【视觉布局规范（必须遵守）】
- 外层容器：padding 20px，背景 #f8fafc。
- 卡片：白色背景，圆角 20，padding 20，阴影 0 16px 40px rgba(15,23,42,.08)。
- 顶部栏：左侧标题（来自 plan.learningGoal 的核心主题，18-20px，font-weight 700），右侧两个圆形按钮"播放/暂停"和"重置"，按钮 36×36 圆形，主色 #2563eb / 灰 #e2e8f0。
- 画布区：圆角 16，背景 #ffffff 或 #f8fafc，下方留 16px 间距。
- 控件区：每个控件一行——左侧 label + 当前值，右侧 input[type=range]（占满剩余宽度，accent-color #2563eb）。
- 输出指标区：3 列等宽卡片，每列展示一个 plan.outputs 指标，数字 22px 加粗。
- 配色：主色 #2563eb，辅色 #16a34a（正向）、#f59e0b（警示）、#ef4444（错误），文字主色 #0f172a，弱色 #64748b。

【canvas + RAF 参考骨架（仅供模仿结构，不要逐字复制注释）】
const canvasRef = useRef(null);
const stateRef = useRef({ t: 0, x: 0, v: 0, playing: false });
const controlsRef = useRef({ angle: 30, friction: 0 });
useEffect(() => { controlsRef.current = { angle, friction }; }, [angle, friction]);
useEffect(() => {
  const canvas = canvasRef.current; if (!canvas) return;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 760, H = 360;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.scale(dpr, dpr);
  let raf = 0; let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    // 更新 stateRef.current 基于 controlsRef.current 和 dt
    // 绘制：ctx.clearRect(0,0,W,H); 画静态场景；画可动元素；画力向量
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, []);

【常见错误自检（必须在心里走一遍）】
- 轨道必须连续：左斜面终点 = 水平段起点；水平段终点 = 右斜面起点。
- 小球必须始终贴着轨道，不能悬空、不能穿透。
- 角度滑块到 0 时，右斜面必须变成"无限长的水平延伸"或与水平段共线，体现"无外力则匀速直线运动"。
- 摩擦系数 = 0 时，小球必须能上升到等高位置（伽利略关键洞察）。
- 重置按钮必须把 stateRef 恢复到初始状态并重绘一帧。
- 播放/暂停只控制是否推进物理，不影响重绘。`;
}
