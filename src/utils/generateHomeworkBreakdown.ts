import type { CardData } from "../types";
import {
  getHomeworkTrack,
  HOMEWORK_TRACK_LABELS,
  type HomeworkTrack,
} from "./homeworkTrack";

export interface HomeworkBreakdownStep {
  title: string;
  detail: string;
  tip?: string;
}

export interface HomeworkTaskBreakdown {
  track: HomeworkTrack;
  trackLabel: string;
  approachTitle: string;
  steps: HomeworkBreakdownStep[];
  checkpoints: string[];
}

type Template = Pick<HomeworkTaskBreakdown, "approachTitle" | "steps" | "checkpoints">;

function stripDeadline(task: string): string {
  return task.replace(/【[^】]+】/g, "").trim();
}

function pickTemplate(track: HomeworkTrack, task: string): Template {
  const t = stripDeadline(task);

  if (track === "stem") {
    if (/实验报告|误差分析|数据表|装置图|Φ|磁通/.test(t)) {
      return {
        approachTitle: "实验报告撰写与数据处理",
        steps: [
          {
            title: "1. 明确实验目的与原理",
            detail: "用 1–2 句话写清要验证的物理规律（如楞次定律），并列出核心公式或定律名称。",
            tip: "目的不要抄教材目录，要写「本实验要证明什么」。",
          },
          {
            title: "2. 画装置简图并标量",
            detail: "手绘实验装置，标出电流方向、磁场方向、线圈匝数等；配合 Φ–t 或 U–t 示意图。",
            tip: "示意图比文字更能体现你是否理解实验过程。",
          },
          {
            title: "3. 记录与处理数据",
            detail: "列表给出至少三组测量值，写清单位；计算平均值，并说明系统误差来源（如仪表精度、读数估读）。",
          },
          {
            title: "4. 用定律解释现象",
            detail: "对每组数据，用「来拒去留」或楞次定律文字说明感应电流方向为何如此，与测量是否一致。",
          },
          {
            title: "5. 误差分析与结论",
            detail: "比较理论预期与实验偏差，分析主要误差来源及改进方法，结论要扣回实验目的。",
          },
        ],
        checkpoints: ["含数据表", "有示意图", "每组数据有定律解释", "误差分析不空泛"],
      };
    }
    if (/预习|§|章节/.test(t)) {
      return {
        approachTitle: "课前预习与公式对应",
        steps: [
          {
            title: "1. 浏览章节结构",
            detail: "先看目录与小标题，标出本节与已学章节（如静电场→交流电）的联系。",
          },
          {
            title: "2. 摘核心公式并写含义",
            detail: "把新公式抄在笔记一侧，每个符号写清物理意义（如 U₁、U₂、n₁、n₂ 各代表什么）。",
            tip: "变压器重点：电压比等于匝数比，功率理想情况下输入≈输出。",
          },
          {
            title: "3. 做对应关系表",
            detail: "若涉及比例关系，画两列对照：物理量 ↔ 公式中的符号，避免考试时张冠李戴。",
          },
          {
            title: "4. 列 2 个不懂点",
            detail: "在书上贴便签或高亮，课堂专门问老师；预习的价值在于「带着问题听课」。",
          },
        ],
        checkpoints: ["公式符号含义写清", "至少 2 处标注疑问"],
      };
    }
    if (/错题|订正/.test(t)) {
      return {
        approachTitle: "错题整理与归因",
        steps: [
          {
            title: "1. 原题与错解归档",
            detail: "抄题干、自己的错误解法、正确答案，三栏对照，不要只抄答案。",
          },
          {
            title: "2. 错因分类",
            detail: "判断属于：概念混淆、公式用错、计算失误、几何关系画错、审题遗漏条件等。",
            tip: "同一类错因标相同颜色，考前重点看高频错因。",
          },
          {
            title: "3. 写正确思路链",
            detail: "用「已知→选定律→列式→几何/代数→答案」五步写通顺过程，每步一句话。",
          },
          {
            title: "4. 变式自测",
            detail: "每道错题旁改一个条件（如速度加倍、磁场反向），口头推演是否仍会用同一套路。",
          },
        ],
        checkpoints: ["错因写具体", "有完整正确过程", "判断/计算题数量达标"],
      };
    }
    if (/汇报|口头|分钟/.test(t)) {
      return {
        approachTitle: "口头汇报结构（1 分钟）",
        steps: [
          {
            title: "1. 开场点题（10 秒）",
            detail: "一句话说明主题，如「由几何关系求圆心角 θ 是磁场圆周运动大题的关键」。",
          },
          {
            title: "2. 核心方法（30 秒）",
            detail: "讲清：入射/出射速度垂线交点定圆心 → 连圆心得圆心角 θ → 用 t=(θ/2π)T 求时间。",
            tip: "可用手势比划速度方向，比干背公式更有说服力。",
          },
          {
            title: "3. 易错提醒（15 秒）",
            detail: "强调弦角≠圆心角、勿用弧长÷速度当时间。",
          },
          {
            title: "4. 收尾（5 秒）",
            detail: "「掌握找圆心+圆心角，这类大题时间可省一半。」",
          },
        ],
        checkpoints: ["控制在 1 分钟内", "含几何步骤", "提到 1 个易错点"],
      };
    }
    if (/题|计算|证明|推导|大题|练习|卷/.test(t)) {
      return {
        approachTitle: "理工科解题四步法",
        steps: [
          {
            title: "1. 审题：圈已知与所求",
            detail: "在题干上标出物理量及单位，明确求的是 R、T、t 还是轨迹几何量；画轨迹草图。",
            tip: "带电粒子题先判断：是否只有磁场、是否匀速圆周。",
          },
          {
            title: "2. 选规律：列核心方程",
            detail: "洛伦兹力提供向心力 → qvB = mv²/R → R = mv/(qB)；周期 T = 2πm/(qB)，与速度无关。",
          },
          {
            title: "3. 几何关系：定圆心与圆心角",
            detail: "速度垂线交点定圆心；圆心角 θ 由入射、出射方向决定，运动时间 t = (θ/2π)·T。",
            tip: "切忌用弧长÷v 当时间——粒子走弧线不是直线。",
          },
          {
            title: "4. 代入计算与检验",
            detail: "统一单位后代入；检查量纲、数量级是否合理，答案是否满足题意边界。",
          },
        ],
        checkpoints: ["有受力/轨迹分析", "公式与几何步骤分开写", "单位统一"],
      };
    }
    return {
      approachTitle: "通用理科作业流程",
      steps: [
        { title: "1. 拆解任务", detail: "把作业要求拆成可勾选的小项，标出截止时间与提交格式。" },
        { title: "2. 回顾课堂笔记", detail: "找到与本作业对应的公式、定理与例题类型。" },
        { title: "3. 分步完成", detail: "按「概念→例题模仿→独立做题」顺序推进，每步留痕便于订正。" },
        { title: "4. 提交前自查", detail: "核对题号、步骤完整性、单位与书写规范。" },
      ],
      checkpoints: ["小项全部勾选", "步骤可复查"],
    };
  }

  if (track === "language") {
    if (/写作|作文|句式|草稿|120词|essay/i.test(t)) {
      return {
        approachTitle: "学术/考试写作框架",
        steps: [
          {
            title: "1. 明确文体与评分点",
            detail: "判断是议论文、说明文还是应用文；列出老师强调的句式多样、衔接词、字数要求。",
          },
          {
            title: "2. 搭三段式骨架",
            detail: "引言（背景+立场）→ 主体（分论点 1/2 + 例证）→ 结论（重申立场+升华一句）。",
            tip: "每段首句写主题句，段内再展开，避免流水账。",
          },
          {
            title: "3. 嵌入高分句式",
            detail: "各选 1 个：强调句 It is...that、Not only...but also、或适度倒装；每句后自检语法。",
          },
          {
            title: "4. 标注段落功能",
            detail: "在草稿 margin 标「引入观点 / 举例 / 转折 / 总结」，确保逻辑链完整。",
          },
          {
            title: "5. 朗读与计时修改",
            detail: "朗读一遍查拗口处；删冗余词，控制词数；检查主谓一致与时态统一。",
          },
        ],
        checkpoints: ["有三段结构", "至少 2 种高级句式", "段落功能已标注"],
      };
    }
    if (/背诵|默写/.test(t)) {
      return {
        approachTitle: "语言记忆与提取训练",
        steps: [
          { title: "1. 理解再记", detail: "先搞懂句式语法功能，再背，避免死记硬背。" },
          { title: "2. 分块默写", detail: "按意群拆分，先关键词后整句，错处用红笔标出。" },
          { title: "3. 情境复述", detail: "用该句式造 1 个与课程主题相关的句子，检验是否真会运用。" },
        ],
        checkpoints: ["能脱离原文复述", "错因已记录"],
      };
    }
    if (/填空|语法|时态|语态/.test(t)) {
      return {
        approachTitle: "语法填空解题思路",
        steps: [
          { title: "1. 判断考点", detail: "看空格前后：缺谓语→时态语态；缺连接→从句类型；缺词形→词性转换。" },
          { title: "2. 画句子主干", detail: "划出主谓宾，确定主句与从句边界，避免修饰关系看错。" },
          { title: "3. 主动/被动与时间轴", detail: "结合上下文时间词选时态；动作承受者明确则考虑被动。" },
          { title: "4. 错题写原因", detail: "每道错题旁写一句：「错在主动被动混淆」等，便于复习。" },
        ],
        checkpoints: ["每空标明考点", "错题有原因说明"],
      };
    }
    if (/阅读|长难句|精读|例句/.test(t)) {
      return {
        approachTitle: "阅读与长难句拆解",
        steps: [
          { title: "1. 定位主干", detail: "找主句谓语动词，主语与宾语各是什么，暂时忽略插入语。" },
          { title: "2. 识别从句", detail: "标出 that/which/when/because 等，判断定语/状语/同位语从句。" },
          { title: "3. 分层翻译", detail: "先译主干通顺，再补修饰，最后整句润色为中文。" },
          { title: "4. 积累结构", detail: "把典型结构抄在句式本上，注明出处与语境。" },
        ],
        checkpoints: ["主干标出", "从句类型写清", "完成规定篇数/句数"],
      };
    }
    return {
      approachTitle: "英语作业通用步骤",
      steps: [
        { title: "1. 明确题型", detail: "确认是听读写译哪一类，对应不同的时间分配策略。" },
        { title: "2. 限时完成", detail: "模拟考试节奏完成一遍，标记不确定题号。" },
        { title: "3. 对答案挖错因", detail: "不只改答案，用中文写清为什么错、正确规则是什么。" },
      ],
      checkpoints: ["限时完成", "错因中文说明"],
    };
  }

  // humanities (社会科学等)
  if (/开题|选题|研究问题/.test(t)) {
    return {
      approachTitle: "开题报告构思框架",
      steps: [
        {
          title: "1. 收窄研究问题",
          detail: "从宽泛领域（如「宏观经济」）收敛到可研究的单一问题（如「净出口 NX 对 GDP 核算的影响」）。",
          tip: "好的问题要可界定、有文献、能在一学期内完成。",
        },
        {
          title: "2. 文献脉络梳理",
          detail: "列 3–5 篇核心文献，每篇用「作者+观点+局限」一行概括，形成研究空白。",
        },
        {
          title: "3. 论证结构草案",
          detail: "背景 → 问题提出 → 理论框架（如 Y=C+I+G+NX）→ 拟用方法 → 预期贡献。",
        },
        {
          title: "4. 方法与数据说明",
          detail: "说明用案例、统计还是文本分析；数据来源与可行性写清楚。",
        },
        {
          title: "5. 章节提纲",
          detail: "列出三级标题草案，每章用一句话说明要论证什么。",
        },
      ],
      checkpoints: ["问题具体可研究", "有文献空白", "章节提纲完整"],
    };
  }
  if (/论述|论文|argument|批判/.test(t)) {
    return {
      approachTitle: "论述型作业构思",
      steps: [
        { title: "1. 明确中心论点", detail: "用一句话写出立场，避免「一方面…另一方面」无结论。" },
        { title: "2. 分论点拆解", detail: "准备 2–3 个支撑分论点，每个对应一类证据（数据/案例/理论）。" },
        { title: "3. 反驳与回应", detail: "预设一个反方观点，用一段「承认-转折-重申」回应，增强说服力。" },
        { title: "4. 段落提纲", detail: "每段首句写主题句，段末写小结句，检查逻辑是否递进。" },
        { title: "5. 引言与结论呼应", detail: "引言提出问题和路线图；结论回扣论点，不写全新信息。" },
      ],
      checkpoints: ["论点单一明确", "有反驳段", "段首主题句齐全"],
    };
  }
  if (/报告|对比表|整理/.test(t)) {
    return {
      approachTitle: "课程报告与整理类作业",
      steps: [
        { title: "1. 按 rubric 列清单", detail: "把老师要求的每一项（对比表、装置图、参考文献）做成检查表。" },
        { title: "2. 信息分组", detail: "用表格或思维导图归类信息，先结构后润色。" },
        { title: "3. 每节写主旨句", detail: "每小节开头写「本节说明…」，避免堆砌资料无观点。" },
        { title: "4. 统一引用格式", detail: "图表编号、文献格式与课程要求一致。" },
      ],
      checkpoints: ["rubric 逐项打勾", "有归纳而非堆砌"],
    };
  }
  if (/模拟|自测|限时|卷/.test(t)) {
    return {
      approachTitle: "社科类自测与复盘",
      steps: [
        { title: "1. 严格限时", detail: "按考试时间完成，培养时间分配感。" },
        { title: "2. 对答案标错因", detail: "概念混淆、审题、表述不清分类统计。" },
        { title: "3. 整理错题清单", detail: "每题写「考点+正确思路一句话」，考前只看清单。" },
      ],
      checkpoints: ["限时完成", "错因分类", "错题清单已整理"],
    };
  }
  return {
    approachTitle: "文科作业通用框架",
    steps: [
      { title: "1. 读懂任务动词", detail: "分析/比较/评价/论述 对应不同写法，先圈出题干动词。" },
      { title: "2. 列论点提纲", detail: "先写提纲再展开，每段只服务一个分论点。" },
      { title: "3. 证据与观点配对", detail: "每个观点配一条案例或引用，避免空泛议论。" },
      { title: "4. 通读改逻辑", detail: "检查段与段是否递进，结论是否回答了开头的问题。" },
    ],
    checkpoints: ["有书面提纲", "观点有证据支撑"],
  };
}

export function buildHomeworkTaskBreakdown(
  subjectId: string,
  task: string,
  _card?: CardData,
): HomeworkTaskBreakdown {
  const track = getHomeworkTrack(subjectId);
  const template = pickTemplate(track, task);
  return {
    track,
    trackLabel: HOMEWORK_TRACK_LABELS[track],
    ...template,
  };
}
