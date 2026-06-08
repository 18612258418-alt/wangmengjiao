/**
 * 物理 / 数学「作业」Tab 演示记忆（待办 task + 按天展示）
 */
import imgPhysicsEM from "../imports/physics-em.jpg";
import imgPhysicsGravity from "../imports/physics-gravity.jpg";
import imgPhysicsElectricField from "../imports/physics-ef.jpg";
import imgPhysicsChargedParticle from "../imports/_______________.jpeg";
import imgMathVectorWeb from "../imports/math-vector-web.png";
import imgMathTrigonometry from "../imports/math-trigonometry.png";
import imgMathProbability from "../imports/math-probability.png";
import imgMathIntegralGeo from "../imports/math-integral-geometry.png";
import imgMathSequence from "../imports/math-sequence.png";
import imgChemBondType from "../imports/chem-bond-type.png";
import imgChemElectroChem from "../imports/chem-electrochemistry.png";
import imgChemOrganicNaming from "../imports/chem-organic-naming.png";
import imgEnglishWriting from "../imports/english-writing-template.png";
import imgEnglishTense from "../imports/english-tense-voice.png";
import imgEnglishLongSentence from "../imports/english-long-sentence.png";
import type { CardData, FeedGroup } from "../types";

const hw = (card: CardData): CardData => ({ ...card, contentType: "homework" as const });

export const HOMEWORK_SEED_PATCH: Record<string, FeedGroup[]> = {
  physics: [
    {
      date: "20260604",
      label: "新增了1个记忆",
      summary: "今日物理作业：综合练习卷与课堂小测订正。",
      cards: [
        hw({
          id: "hw_p5",
          title: "记忆：今日物理作业清单",
          img: imgPhysicsChargedParticle,
          source: "evernote",
          time: "08:40",
          taskDueDate: "20260604",
          homeworkTasks: [
            "【今日 22:00 前】完成周测订正：磁场大题 2 道，写清圆心与圆心角求法",
            "【明日课前】预习交流电 §5.1，标注变压器公式中 U₁/U₂ 与 n₁/n₂ 对应关系",
          ],
          detailIntro: "今日待办（课堂拍照整理）：",
          detailSections: [
            { title: "必做", items: ["周测订正 2 道", "交流电预习"] },
          ],
        }),
      ],
    },
    {
      date: "20260428",
      label: "新增了1个记忆",
      summary: "本周物理课后作业：磁场圆周运动习题与光电效应错题整理。",
      cards: [
        hw({
          id: "hw_p1",
          title: "记忆：本周物理课后作业",
          img: imgPhysicsChargedParticle,
          source: "evernote",
          time: "21:05",
          taskDueDate: "20260430",
          homeworkTasks: [
            "【4月30日截止】完成讲义 P.42 第 3、5、7 题（带电粒子在磁场中的圆周运动）",
            "【5月2日前】整理光电效应错题本，判断题与计算题各至少 3 道",
            "【5月3日课堂】准备 1 分钟口头汇报：如何由几何关系求圆心角 θ",
          ],
          detailIntro: "教师布置的本周物理作业与截止时间：",
          detailSections: [
            { title: "必做作业", items: ["P.42 第 3、5、7 题", "光电效应错题本"] },
          ],
        }),
      ],
    },
    {
      date: "20260427",
      label: "新增了1个记忆",
      summary: "电磁感应实验报告与预习任务。",
      cards: [
        hw({
          id: "hw_p2",
          title: "记忆：电磁感应实验报告",
          img: imgPhysicsEM,
          source: "browser",
          time: "17:00",
          taskDueDate: "20260428",
          homeworkTasks: [
            "【4月28日 23:59 前提交】完成楞次定律验证实验报告（含数据表、误差分析）",
            "【实验课要求】附上手绘 Φ–t 示意图与感应电流方向判定过程",
          ],
          detailIntro: "实验课布置的报告要求：",
          detailSections: [
            { title: "提交清单", items: ["实验目的、装置简图、三组测量数据", "用「来拒去留」解释每组电流方向"] },
          ],
        }),
      ],
    },
    {
      date: "20260426",
      label: "新增了1个记忆",
      summary: "静电场章节预习与课后思考题。",
      cards: [
        hw({
          id: "hw_p3",
          title: "记忆：静电场预习任务",
          img: imgPhysicsElectricField,
          source: "zhihu",
          time: "19:15",
          taskDueDate: "20260427",
          homeworkTasks: [
            "【4月27日课前】预习 §3.2 场强与电势，标注不懂的 2 处",
            "【课后】完成教材 P.68 思考题 1、4、6（需写清 W=qU 推导）",
          ],
          detailIntro: "下周课堂前的预习与思考题：",
          detailSections: [
            { title: "预习重点", items: ["E 与 φ 的矢量/标量区别", "等势面疏密与场强关系"] },
          ],
        }),
      ],
    },
    {
      date: "20260503",
      label: "新增了1个记忆",
      summary: "假期力学复习清单：万有引力与卫星运动。",
      cards: [
        hw({
          id: "hw_p4",
          title: "记忆：假期力学复习清单",
          img: imgPhysicsGravity,
          source: "youdao",
          time: "10:30",
          taskDueDate: "20260505",
          homeworkTasks: [
            "【5月5日前】完成卫星运动专题卷 A 卷（选择题 10 道 + 大题 2 道）",
            "【5月6日】默写第一、第二宇宙速度数值及适用条件",
            "【自选】整理 1 道错题：说明为何不能用机械能守恒",
          ],
          detailIntro: "假期复习待办（力学模块）：",
          detailSections: [
            { title: "任务", items: ["专题卷 A 卷", "宇宙速度默写", "错题 1 道"] },
          ],
        }),
      ],
    },
  ],
  math: [
    {
      date: "20260603",
      label: "新增了1个记忆",
      summary: "今日高数作业：不定积分与定积分应用。",
      cards: [
        hw({
          id: "hw_m6",
          title: "记忆：今日高数作业",
          img: imgMathIntegralGeo,
          source: "browser",
          time: "16:20",
          taskDueDate: "20260605",
          homeworkTasks: [
            "【6月5日提交】§3.4 定积分应用第 1–4 题（面积 + 旋转体各 2 道）",
            "【6月6日小测】复习换元法：第一换元 3 例 + 三角换元 2 例",
          ],
          detailIntro: "本周数学作业：",
          detailSections: [
            { title: "作业", items: ["定积分应用 4 道", "换元法复习 5 例"] },
          ],
        }),
      ],
    },
    {
      date: "20260425",
      label: "新增了1个记忆",
      summary: "导数应用章节作业与课堂小测准备。",
      cards: [
        hw({
          id: "hw_m2",
          title: "记忆：导数应用课后作业",
          img: imgMathVectorWeb,
          source: "zhihu",
          time: "17:10",
          taskDueDate: "20260426",
          homeworkTasks: [
            "【4月26日提交】习题册 §2.3 第 2、5、8、12 题（单调性与极值）",
            "【4月27日小测】复习链式法则与隐函数求导各 2 例",
          ],
          detailIntro: "高数导数章节作业安排：",
          detailSections: [
            { title: "必做", items: ["§2.3 四道题", "小测复习例题"] },
          ],
        }),
      ],
    },
    {
      date: "20260419",
      label: "新增了1个记忆",
      summary: "定积分与概率统计本周作业。",
      cards: [
        hw({
          id: "hw_m1",
          title: "记忆：高数作业·定积分章节",
          img: imgMathIntegralGeo,
          source: "browser",
          time: "14:50",
          taskDueDate: "20260426",
          homeworkTasks: [
            "【4月26日提交】完成定积分求面积课后作业第 1–6 题",
            "【周末前】预习下一章并标注不懂的换元类型",
            "【周一课前】核对作业答案并标记存疑题号",
          ],
          detailIntro: "本周数学作业要求：",
          detailSections: [
            { title: "作业清单", items: ["定积分求面积 6 道题", "换元法预习笔记"] },
          ],
        }),
        hw({
          id: "hw_m3",
          title: "记忆：概率论作业布置",
          img: imgMathProbability,
          source: "evernote",
          time: "18:45",
          taskDueDate: "20260421",
          homeworkTasks: [
            "【4月21日截止】上交条件概率作业：共 8 道（含 2 道贝叶斯公式应用）",
            "【要求】每道大题需写清样本空间划分",
          ],
          detailIntro: "概率统计章节作业：",
          detailSections: [
            { title: "提交要求", items: ["8 道题", "样本空间写清"] },
          ],
        }),
      ],
    },
    {
      date: "20260502",
      label: "新增了1个记忆",
      summary: "三角恒等变换与数列综合练习。",
      cards: [
        hw({
          id: "hw_m4",
          title: "记忆：三角与数列周作业",
          img: imgMathTrigonometry,
          source: "youdao",
          time: "09:20",
          taskDueDate: "20260504",
          homeworkTasks: [
            "【5月4日前】完成辅助角公式练习 10 道（错题需写错因）",
            "【5月4日前】数列求和：等差/等比各 5 道，标注所用公式",
            "【小组任务】与组员核对 §4.1 答案，记录分歧题 1 道",
          ],
          detailIntro: "本周三角函数与数列作业：",
          detailSections: [
            { title: "个人", items: ["辅助角 10 道", "数列求和 10 道"] },
            { title: "小组", items: ["核对答案并记录分歧题"] },
          ],
        }),
      ],
    },
    {
      date: "20260415",
      label: "新增了1个记忆",
      summary: "期中复习：极限与数列通项。",
      cards: [
        hw({
          id: "hw_m5",
          title: "记忆：期中复习任务包",
          img: imgMathSequence,
          source: "browser",
          time: "20:00",
          taskDueDate: "20260418",
          homeworkTasks: [
            "【4月18日前】完成期中模拟卷（限时 90 分钟，自测）",
            "【4月19日】提交错题清单：极限 3 道 + 数列 3 道",
          ],
          detailIntro: "期中考前复习待办：",
          detailSections: [
            { title: "自测", items: ["模拟卷 90 分钟"] },
            { title: "错题", items: ["极限 3 + 数列 3"] },
          ],
        }),
      ],
    },
  ],
  chemistry: [
    {
      date: "20260602",
      label: "新增了1个记忆",
      summary: "有机化学命名与电化学实验报告。",
      cards: [
        hw({
          id: "hw_c1",
          title: "记忆：有机命名课后作业",
          img: imgChemOrganicNaming,
          source: "evernote",
          time: "15:30",
          taskDueDate: "20260606",
          homeworkTasks: [
            "【6月6日前】完成 IUPAC 命名练习 12 道（烷烃 6 + 烯烃 6）",
            "【课堂抽查】准备 1 道易错：支链编号从哪端开始",
          ],
          detailIntro: "有机化学本周作业：",
          detailSections: [
            { title: "练习", items: ["命名 12 道", "支链编号易错 1 道"] },
          ],
        }),
      ],
    },
    {
      date: "20260424",
      label: "新增了1个记忆",
      summary: "化学键与电化学章节作业。",
      cards: [
        hw({
          id: "hw_c2",
          title: "记忆：电化学实验报告",
          img: imgChemElectroChem,
          source: "browser",
          time: "13:00",
          taskDueDate: "20260426",
          homeworkTasks: [
            "【4月26日提交】原电池与电解池对比表（各 2 例电极反应方程式）",
            "【实验课】附上手绘装置图并标出电子流向",
          ],
          detailIntro: "电化学作业要求：",
          detailSections: [
            { title: "报告", items: ["对比表 4 例", "装置图 + 电子流"] },
          ],
        }),
        hw({
          id: "hw_c3",
          title: "记忆：化学键章节习题",
          img: imgChemBondType,
          source: "youdao",
          time: "18:10",
          taskDueDate: "20260425",
          homeworkTasks: [
            "【4月25日】习题册 P.28 第 1、3、7、9 题（极性分子判断）",
          ],
          detailIntro: "化学键课后题：",
          detailSections: [
            { title: "必做", items: ["P.28 四道题"] },
          ],
        }),
      ],
    },
  ],
  english: [
    {
      date: "20260604",
      label: "新增了1个记忆",
      summary: "今日英语：写作模板背诵与长难句分析。",
      cards: [
        hw({
          id: "hw_e1",
          title: "记忆：英语写作周作业",
          img: imgEnglishWriting,
          source: "browser",
          time: "09:15",
          taskDueDate: "20260607",
          homeworkTasks: [
            "【6月7日前】背诵并仿写 3 个高分句式（强调句 / Not only...but also / 倒装各 1）",
            "【6月8日课堂】带 1 篇 120 词小作文草稿，标注每段功能句",
          ],
          detailIntro: "写作模块作业：",
          detailSections: [
            { title: "背诵", items: ["句式 3 个", "小作文草稿 1 篇"] },
          ],
        }),
      ],
    },
    {
      date: "20260420",
      label: "新增了1个记忆",
      summary: "时态语态与长难句分析作业。",
      cards: [
        hw({
          id: "hw_e2",
          title: "记忆：时态语态练习",
          img: imgEnglishTense,
          source: "zhihu",
          time: "14:00",
          taskDueDate: "20260422",
          homeworkTasks: [
            "【4月22日】完成时态语态填空 15 道，错题写原因（主动/被动混淆）",
            "【周末】精读 1 篇 CET-4 阅读，划出 3 个长难句并拆主干",
          ],
          detailIntro: "语法与阅读作业：",
          detailSections: [
            { title: "语法", items: ["填空 15 道"] },
            { title: "阅读", items: ["长难句 3 句"] },
          ],
        }),
        hw({
          id: "hw_e3",
          title: "记忆：长难句分析作业",
          img: imgEnglishLongSentence,
          source: "evernote",
          time: "20:30",
          taskDueDate: "20260423",
          homeworkTasks: [
            "【4月23日提交】分析讲义例句 5 句：标主干 + 从句类型",
          ],
          detailIntro: "长难句专项：",
          detailSections: [
            { title: "提交", items: ["例句分析 5 句"] },
          ],
        }),
      ],
    },
  ],
};

export const HOMEWORK_SEED_PATCH_KEY = "homework-seed-patch-v2";

/**
 * 是否注入内置「作业」演示数据。
 * 闭环目标：作业 Tab 的内容应来自「从上传笔记里实时抽取」（见 utils/homeworkExtract.ts），
 * 内置 seed 仅作为空库时的演示兜底。把此开关设为 false，作业 Tab 将只展示用户笔记中抽取到的真实待办。
 */
export const ENABLE_HOMEWORK_DEMO_SEED = true;

/** 将作业演示卡合并进学科 feed（按 date 合并，同 id 不重复） */
export function mergeHomeworkSeedIntoFeeds(
  feeds: FeedGroup[],
  subjectId: keyof typeof HOMEWORK_SEED_PATCH,
): FeedGroup[] {
  const patch = HOMEWORK_SEED_PATCH[subjectId];
  if (!patch?.length) return feeds;

  const byDate = new Map(
    feeds.map(g => [g.date, { ...g, cards: [...g.cards] }]),
  );

  for (const pg of patch) {
    const existing = byDate.get(pg.date);
    if (existing) {
      const ids = new Set(existing.cards.map(c => c.id));
      for (const card of pg.cards) {
        if (!ids.has(card.id)) existing.cards.push(card);
      }
    } else {
      byDate.set(pg.date, {
        ...pg,
        cards: [...pg.cards],
        label: pg.label,
        summary: pg.summary,
      });
    }
  }

  return [...byDate.values()].sort((a, b) => Number(b.date) - Number(a.date));
}
