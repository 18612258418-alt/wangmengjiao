// ─── Image Assets ─────────────────────────────────────────────────────────────
// @ts-ignore
import imgCard1 from "figma:asset/f7e54a6c0a7fb0e00bd1d3f62368f985014da658.png";
// @ts-ignore
import imgCard2 from "figma:asset/fb8e880924fdb9fc278121634820f87fa78939da.png";
// @ts-ignore
import imgCard3 from "figma:asset/635def760676f9000161aa652c32196755fbd979.png";
import imgCoursewareBg from "../imports/courseware-kinetics-bg.png";
import imgWebcourseBg from "../imports/webcourse-bg.png";
import imgPhysicsChargedParticle from "../imports/_______________.jpeg";
import imgPhysicsGravity from "../imports/physics-gravity.jpg";
import imgPhysicsEM from "../imports/physics-em.jpg";
import imgPhysicsElectricField from "../imports/physics-ef.jpg";
import imgPhysicsTransformer from "../imports/physics-transformer.jpg";
import imgWebBg from "../imports/web-bg.jpg";
import imgNotesBg from "../imports/notes-bg.jpg";
import imgNewNote from "../imports/note-thumb.jpg";
import imgEnglishWriting from "../imports/english-writing-template.png";
import imgEnglishTense from "../imports/english-tense-voice.png";
import imgEnglishLongSentence from "../imports/english-long-sentence.png";
import imgChemBondType from "../imports/chem-bond-type.png";
import imgChemElectroChem from "../imports/chem-electrochemistry.png";
import imgChemOrganicNaming from "../imports/chem-organic-naming.png";
import imgMathIntegralSub from "../imports/math-integral-substitution.png";
import imgMathIntegralGeo from "../imports/math-integral-geometry.png";
import imgMathSequence from "../imports/math-sequence.png";
import imgMathVector from "../imports/math-vector.png";
import imgMathProbability from "../imports/math-probability.png";
import imgMathVectorWeb from "../imports/math-vector-web.png";
import imgMathTrigonometry from "../imports/math-trigonometry.png";
import imgLoadingSpinner from "../imports/Frame6/512fef88321a610493c15a0437a09b73d372414e.png";
import logoZhihu from "../imports/___-1.png";
import logoEvernote from "../imports/____.png";
import logoYoudao from "../imports/____.png";
import logoBrowser from "../imports/__.jpeg";

export {
  imgCoursewareBg, imgWebcourseBg, imgWebBg, imgNotesBg, imgLoadingSpinner,
  logoZhihu, logoEvernote, logoYoudao, logoBrowser,
};

import type { CardData, FeedGroup, SubjectData, DetailSection } from "../types";
import { DEMO_SEED_PATCH } from "./demoSeedCards";
import { mergeHomeworkSeedIntoFeeds } from "./homeworkSeedCards";
import { mergeExamSeedIntoFeeds } from "./examSeedCards";
import { mergeExamPrepIntoCard } from "./examPrepContent";
import { BUILTIN_UNIFIED_DETAILS } from "./builtinUnifiedDetails";
import { BUILTIN_CARD_META } from "./builtinCardMeta";
import { BUILTIN_SYLLABUS_BY_CARD } from "./subjectSyllabi";

function injectBuiltinMeta(feeds: FeedGroup[]): FeedGroup[] {
  return feeds.map(group => ({
    ...group,
    cards: group.cards.map(card => {
      const meta = BUILTIN_CARD_META[card.id];
      return mergeExamPrepIntoCard({
        ...card,
        unifiedDetail: card.unifiedDetail ?? BUILTIN_UNIFIED_DETAILS[card.id],
        skill: card.skill ?? meta?.skill,
        aiKeyPoints: card.aiKeyPoints ?? meta?.aiKeyPoints,
        syllabusEntryId: card.syllabusEntryId ?? BUILTIN_SYLLABUS_BY_CARD[card.id],
      });
    }),
  }));
}

// ─── Subject list ─────────────────────────────────────────────────────────────

export const COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#000000"];

/** 内置学科展示名（侧栏 short + 顶栏 name） */
export const BUILTIN_SUBJECT_LABELS: Record<string, Pick<SubjectData, "name" | "short">> = {
  physics: { name: "大学物理笔记", short: "大学物理" },
  math: { name: "高等数学笔记", short: "高等数学" },
  chemistry: { name: "大学化学笔记", short: "大学化学" },
  english: { name: "大学英语笔记", short: "大学英语" },
  other: { name: "社会科学笔记", short: "社会科学" },
};

export const INITIAL_SUBJECTS: SubjectData[] = [
  {
    id: "physics", ...BUILTIN_SUBJECT_LABELS.physics, count: 19, unit: "条记忆",
    entries: ["5月2日 星期一  批注新增3个记忆", "5月1日 星期日  批注新增3个记忆", "4月30日 星期日 批注新增1个记忆"],
    extra: "30分钟前 · 19个知识点"
  },
  {
    id: "math", ...BUILTIN_SUBJECT_LABELS.math, count: 9, unit: "条记忆",
    entries: ["5月22日 星期五  批注新增1个记忆", "4月25日 星期五  批注新增4个记忆", "4月19日 星期六  批注新增4个记忆"],
    extra: "刚刚 · 9个知识点"
  },
  {
    id: "chemistry", ...BUILTIN_SUBJECT_LABELS.chemistry, count: 3, unit: "条记忆",
    entries: ["4月24日 星期四  批注新增3个记忆"],
    extra: "3天前 · 3个知识点"
  },
  {
    id: "english", ...BUILTIN_SUBJECT_LABELS.english, count: 3, unit: "条记忆",
    entries: ["4月23日 星期三  批注新增3个记忆"],
    extra: "4天前 · 3个知识点"
  },
  {
    id: "other", ...BUILTIN_SUBJECT_LABELS.other, count: 4, unit: "条记忆",
    entries: ["5月22日 星期五  批注新增2个记忆", "4月22日 星期二  批注新增2个记忆"],
    extra: "刚刚 · 4个知识点"
  },
];

// ─── Feed data ────────────────────────────────────────────────────────────────

const PHYSICS_FEEDS: FeedGroup[] = [
  {
    date: "20260428", label: "新增了3个记忆",
    summary: '本次学习梳理了三大核心考点：带电粒子圆周运动（核心公式 r=mv/qB）、光电效应（Ek=hν−W₀，光强只影响光电子数量）、机械能守恒（只有重力/弹力做功才守恒）。建议配合课后习题反复练习，三类题型各做10道找到解题规律。',
    cards: [
      { id: "c1", title: "记忆：带电粒子在匀强磁场中的圆周运动", img: imgPhysicsChargedParticle, source: "browser", time: "21:20",
        contentType: "exam",
        examSummary: "磁场中带电粒子圆周运动专题练习，含半径公式与几何找圆心",
        detailIntro: "洛伦兹力可是物理压轴大户，看到你在这里画了好多受力分析线。帮你把找圆心和算时间的套路总结好了，大题直接套用：",
        detailSections: [
          { title: "核心公式（必背）", items: ["半径 R = mv/(qB)：R 与速度 v 成正比，加速电压×4 → v×2 → R×2", "周期 T = 2πm/(qB)：与速度无关，粒子种类不变则转一圈时间相同"] },
          { title: "几何找圆心（作图关键）", items: ["方法一：入射/出射速度垂线的交点即为圆心", "方法二：入射点与出射点连线的中垂线必定过圆心"] },
          { title: "考试易错陷阱", items: ["运动时间必须用 t = (θ/2π)×T，θ 是圆心角而非弦角", "千万别用距离÷速度——粒子走的是弧线不是直线"] },
        ]
      } as CardData,
      { id: "c2", title: "记忆：光电效应与爱因斯坦方程", img: imgCard2, source: "zhihu", time: "20:20",
        detailIntro: "光电效应综合题经常和遏止电压一起考，你批注的光电管电路图抓到了关键。帮你整理成答题框架：",
        detailSections: [
          { title: "爱因斯坦方程核心", items: ["Ek = hν − W₀：入射光频率决定光电子最大初动能", "光强只影响光电子数量，不影响单个光电子的动能"] },
          { title: "遏止电压与伏安特性", items: ["eUc = Ek = hν − W₀：截止电压与频率成线性关系", "图像中：饱和电流↔光强；截止电压↔光频（独立无关）"] },
          { title: "极限频率记忆点", items: ["ν₀ = W₀/h：低于极限频率绝对不发生光电效应", "光电效应是瞬时的，与光照时间无关"] },
        ]
      } as CardData,
      { id: "c3", title: "记忆：机械能守恒定律应用", img: imgCard3, source: "evernote", time: "18:20",
        detailIntro: "机械能守恒和动量守恒常组合成三阶段大题，你在弹簧压缩那段的批注思路完全正确：",
        detailSections: [
          { title: "守恒条件判断", items: ["只有重力或弹簧弹力做功 → 机械能守恒", "有摩擦力、空气阻力、其他外力做功 → 不守恒，改用动能定理"] },
          { title: "三阶段经典模型", items: ["阶段①碰撞：用动量守恒 m₁v₁=(m₁+m₂)v′（有动能损失）", "阶段②压弹簧：用机械能守恒 ½mv²=½kx²"] },
          { title: "最容易失分的地方", items: ["碰撞阶段有动能损失，千万不能用机械能守恒", "弹性碰撞才动能守恒，题目会明确说明"] },
        ]
      } as CardData,
    ]
  },
  {
    date: "20260427", label: "新增了2个记忆",
    summary: '今日专项攻克万有引力与卫星运动、电磁感应楞次定律两大模块。卫星运动核心是"万有引力提供向心力"一条公式推出轨道速度/周期/加速度的全部关系；楞次定律记住"来拒去留"口诀后，判断感应电流方向直接上手，不再画磁通量变化图。',
    cards: [
      { id: "c4", title: "记忆：万有引力定律与卫星轨道参数", img: imgPhysicsGravity, source: "youdao", time: "19:30",
        detailIntro: "卫星运动一张公式推出六个量，你批注的那道多轨道比较题用这套方法就能秒做：",
        detailSections: [
          { title: "核心推导链（必背）", items: ["万有引力=向心力：GMm/r² = mv²/r = mω²r = m(2π/T)²r", "轨道越高：v↓、ω↓、T↑、加速度↓（离地越远引力越弱）"] },
          { title: "第一/第二宇宙速度", items: ["第一宇宙速度 v₁=7.9km/s：地面附近最小发射速度（环绕速度）", "第二宇宙速度 v₂=11.2km/s：脱离地球引力场所需最小速度"] },
          { title: "同步卫星特殊性质", items: ["周期=24h，轨道在赤道平面，高度约3.6×10⁴km（固定值）", "「赤道、向东、同步」三个条件缺一不可"] },
        ]
      } as CardData,
      { id: "c5", title: "记忆：电磁感应与楞次定律", img: imgPhysicsEM, source: "browser", time: "16:10",
        detailIntro: "楞次定律判断电流方向是大学物理经典考点，看你批注里画的磁通量分析，帮你提炼出最快的判断路径：",
        detailSections: [
          { title: "楞次定律口诀", items: ["「来拒去留」：磁通量增加→感应磁场阻碍增加（方向相反）；磁通量减少→感应磁场阻碍减少（方向相同）", "再由感应磁场方向，用右手定则确定线圈中电流方向"] },
          { title: "法拉第电磁感应定律", items: ["ε = ΔΦ/Δt（平均）；匀速切割磁场：ε = BLv", "感应电动势与磁通量变化率成正比，与面积无关"] },
          { title: "自感与互感", items: ["自感：线圈自身电流变化产生感应电动势，阻碍电流变化（「线圈记忆」效应）", "日光灯镇流器就是自感线圈，用来限制启动瞬间大电流"] },
        ]
      } as CardData,
    ]
  },
  {
    date: "20260426", label: "新增了1个记忆",
    summary: '今天专项突破静电场核心考点：场强E与电势φ的本质区别（矢量vs标量），以及二者方向关系、等势面疏密与场强大小的对应规律。掌握电场力做功公式 W=qU，与路径无关这一核心结论是解题关键。',
    cards: [
      { id: "c6", title: "记忆：静电场场强与电势的关系", img: imgPhysicsElectricField, source: "zhihu", time: "20:50",
        detailIntro: "静电场最容易混淆的就是场强E和电势φ，你批注的那道等势线题，根本原因就是把两者关系搞反了，帮你彻底厘清：",
        detailSections: [
          { title: "E 与 φ 的本质区别", items: ["E（场强）是矢量，有方向，描述力的性质：E = F/q", "φ（电势）是标量，无方向，描述能的性质：φ = Ep/q"] },
          { title: "二者关系（重要！）", items: ["E 沿电场线方向由高电势指向低电势", "匀强电场：E = U/d（两等势面间距离 d）", "等势面越密集处，场强越大（类比等高线）"] },
          { title: "电场力做功", items: ["W = qU = q(φ_A − φ_B)：只与起终点电势差有关，与路径无关", "正电荷沿电场线方向移动：电场力做正功，电势能减少"] },
        ]
      } as CardData,
    ]
  },
  {
    date: "20260420", label: "新增了1个记忆",
    summary: '专项突破交流电与变压器模块。交流电核心是峰值与有效值的换算（U有效=U峰/√2）；变压器重点理解"匝数比=电压比，电流比=匝数比的倒数"，结合输电线损耗计算，是大学物理电磁学的核心考点。',
    cards: [
      { id: "c9", title: "记忆：交流电与变压器综合应用", img: imgPhysicsTransformer, source: "browser", time: "17:40",
        detailIntro: "交流电和变压器的综合计算是大学物理电磁学常考题型，你批注的那道远距离输电题漏了线路电阻的热损耗计算，帮你把完整思路整理好：",
        detailSections: [
          { title: "交流电有效值", items: ["正弦交流电：U有效 = U₀/√2 ≈ 0.707U₀；I有效 = I₀/√2", "220V 家用电是有效值，峰值约 311V；电气设备额定值均指有效值"] },
          { title: "理想变压器规律", items: ["电压比：U₁/U₂ = n₁/n₂（匝数多的一侧电压高）", "电流比：I₁/I₂ = n₂/n₁（匝数多的一侧电流小）", "功率守恒：P₁ = P₂，即 U₁I₁ = U₂I₂（理想状态无损耗）"] },
          { title: "输电线损耗计算", items: ["线路热功率：P损 = I²R线（电流是关键，升压可大幅降低损耗）", "解题步骤：升压→求输电电流→求线路压降→求末端电压→降压到用户电压"] },
        ]
      } as CardData,
    ]
  },
];

const MATH_FEEDS: FeedGroup[] = [
  {
    date: "20260425", label: "新增了4个记忆",
    summary: '本次数学复习覆盖导数、积分、三角函数、数列四个核心板块。导数重点掌握几何意义和链式法则；积分关注换元法的触发条件；三角函数记住辅助角公式；数列注意等差等比的求和公式区分。',
    cards: [
      { id: "m1", title: "记忆：导数定义与几何意义", img: imgMathVectorWeb, source: "zhihu", time: "16:30",
        detailIntro: "你在导数定义那里画了好多笔，把几何意义和运算法则帮你整理成直接套用的格式：",
        detailSections: [
          { title: "导数几何意义", items: ["f'(x₀) 表示曲线在 x₀ 处切线的斜率", "导数>0 → 函数递增；导数<0 → 函数递减；导数=0 → 极值候选点"] },
          { title: "常用求导法则", items: ["(uv)' = u'v + uv'（乘积法则）", "(u/v)' = (u'v−uv')/v²（商法则）", "复合函数链式法则：(f(g(x)))' = f'(g(x))·g'(x)"] },
        ]
      } as CardData,
      { id: "m2", title: "记忆：不定积分换元法", img: imgMathIntegralSub, source: "evernote", time: "14:20",
        contentType: "exam",
        examSummary: "不定积分换元法习题页，含第一、第二换元典型题型",
        detailIntro: "换元积分看起来麻烦，其实就两种套路，帮你整理了最高频的考法：",
        detailSections: [
          { title: "第一换元法（凑微分）", items: ["认出 f(g(x))·g'(x) 的形式，令 u=g(x) 直接套公式", "例：∫sin(2x)dx，令 u=2x，得 −½cos(2x)+C"] },
          { title: "第二换元法（三角换元）", items: ["含 √(a²−x²)：令 x=asinθ", "含 √(a²+x²)：令 x=atanθ"] },
        ]
      } as CardData,
      { id: "m3", title: "记忆：三角函数和差化积公式", img: imgMathTrigonometry, source: "youdao", time: "11:00",
        detailIntro: "三角恒等变换是大题失分重灾区，这几个公式要反复默写直到条件反射：",
        detailSections: [
          { title: "基础恒等式", items: ["sin²θ+cos²θ=1（万能基础，变形出1±sin2θ等）", "sin(A+B)=sinAcosB+cosAsinB；cos(A+B)=cosAcosB−sinAsinB"] },
          { title: "辅助角公式", items: ["asinθ+bcosθ=√(a²+b²)·sin(θ+φ)，其中 tanφ=b/a", "用于把混合三角式化为单一 sin 函数再求最值"] },
        ]
      } as CardData,
      { id: "m4", title: "记忆：数列通项公式与求和", img: imgMathSequence, source: "browser", time: "09:40",
        detailIntro: "数列通项推导是高等数学基础考点，你批注的例题用的方法不对，帮你整理了正确路径：",
        detailSections: [
          { title: "等差与等比", items: ["等差：aₙ=a₁+(n−1)d；Sₙ=na₁+n(n−1)d/2", "等比：aₙ=a₁·qⁿ⁻¹；Sₙ=a₁(1−qⁿ)/(1−q)（q≠1时）"] },
          { title: "递推求通项技巧", items: ["累差法：写出 aₙ₊₁−aₙ 再逐项相加消去中间项", "待定系数法：令 bₙ=aₙ+k，构造等比数列再求解"] },
        ]
      } as CardData,
    ]
  },
  {
    date: "20260419", label: "新增了4个记忆",
    summary: '本次复习了空间向量、概率、定积分、二项式定理。空间向量是立体几何万能工具，重点掌握法向量求法；概率分清古典概型与条件概率；定积分注意面积可能为负要取绝对值。',
    cards: [
      { id: "m5", title: "记忆：空间向量基本运算", img: imgMathVector, source: "zhihu", time: "20:10",
        detailIntro: "空间向量是立体几何的万能工具，用好向量法就不用画辅助线了：",
        detailSections: [
          { title: "向量运算", items: ["点积：a·b=|a||b|cosθ，用于求夹角或验证垂直（=0）", "模长：|a|=√(x²+y²+z²)"] },
          { title: "法向量求法", items: ["设 n=(x,y,z)，列 n·a=0 和 n·b=0 的方程组解出", "法向量用于求平面方程、点到平面距离、二面角"] },
        ]
      } as CardData,
      { id: "m6", title: "记忆：概率与期望值计算", img: imgMathProbability, source: "evernote", time: "18:30",
        detailIntro: "概率题要先分清是古典概型还是条件概率，你这道错题就是把两者混了：",
        detailSections: [
          { title: "古典概型", items: ["P(A)=A的基本事件数/总基本事件数", "排列数 Aₙᵐ=n!/(n−m)!；组合数 Cₙᵐ=n!/[m!(n−m)!]"] },
          { title: "条件概率与独立性", items: ["条件概率：P(B|A)=P(AB)/P(A)", "独立事件：P(AB)=P(A)·P(B)，即 A 发生不影响 B 的概率"] },
        ]
      } as CardData,
      { id: "m7", title: "记忆：定积分几何应用", img: imgMathIntegralGeo, source: "browser", time: "15:00",
        contentType: "exam",
        examSummary: "定积分求面积与旋转体相关计算题",
        detailIntro: "定积分求面积是压轴题常见考点，上下限搞清楚才不会算错：",
        detailSections: [
          { title: "面积公式", items: ["两曲线围成面积：∫[a,b]|f(x)−g(x)|dx", "先求交点定积分上下限，再判断哪个函数在上方"] },
          { title: "常见陷阱", items: ["积分值可能为负，要取绝对值才是面积", "关于 y 轴对称的图形，只算一半再×2 节省时间"] },
        ]
      } as CardData,
      { id: "m8", title: "记忆：二项式定理展开", img: imgMathVectorWeb, source: "youdao", time: "13:20",
        detailIntro: "二项式定理考展开项系数，记住通项公式就够了：",
        detailSections: [
          { title: "通项公式", items: ["(a+b)ⁿ 的第 r+1 项：Tᵣ₊₁ = Cₙʳ·aⁿ⁻ʳ·bʳ", "找特定项：令 bʳ 的指数等于目标值，解出 r"] },
          { title: "常考结论", items: ["令 a=b=1，所有项系数之和 = 2ⁿ", "奇数项系数和 = 偶数项系数和 = 2ⁿ⁻¹"] },
        ]
      } as CardData,
    ]
  },
];

const CHEMISTRY_FEEDS: FeedGroup[] = [
  {
    date: "20260424", label: "新增了3个记忆",
    summary: '本次化学复习覆盖化学键类型、电化学原理、有机命名三个核心考点。化学键重点掌握极性判断；电化学理清正负极/阴阳极关系；有机命名严格按 IUPAC 三步法执行。',
    cards: [
      { id: "c_c1", title: "记忆：化学键类型与极性判断", img: imgChemBondType, source: "youdao", time: "15:00",
        detailIntro: "化学键判断是大题第一步，你批注的电负性对比图很有用，帮你整理成答题框架：",
        detailSections: [
          { title: "化学键类型", items: ["离子键：金属+非金属，电子完全转移（NaCl等）", "共价键：非金属+非金属，电子共用（H₂O、CO₂等）", "金属键：金属原子间，自由电子共有"] },
          { title: "极性分子判断", items: ["极性键：两原子电负性不同（如 H−Cl）", "极性分子：空间结构不对称（H₂O是V形→极性分子）", "CO₂是线形结构→非极性分子（虽含极性键）"] },
        ]
      } as CardData,
      { id: "c_c2", title: "记忆：电化学与电极反应", img: imgChemElectroChem, source: "browser", time: "13:20",
        contentType: "exam",
        examSummary: "原电池与电解池电极反应判断练习题",
        detailIntro: "电化学题目考验氧化还原反应理解，帮你把原电池和电解池的电极判断整理了：",
        detailSections: [
          { title: "原电池", items: ["负极：失去电子（氧化），较活泼金属", "正极：得到电子（还原），较不活泼或碳棒"] },
          { title: "电解池", items: ["阴极：得到电子，发生还原（接电源负极）", "阳极：失去电子，发生氧化（接电源正极）", "记忆口诀：阴负阳正，氧化阳极"] },
        ]
      } as CardData,
      { id: "c_c3", title: "记忆：有机物系统命名规则", img: imgChemOrganicNaming, source: "evernote", time: "10:40",
        detailIntro: "有机命名有套路，先定主链再编号，你批注的这道题步骤完全正确：",
        detailSections: [
          { title: "命名三步法", items: ["第一步：找最长碳链为主链，含官能团的链优先", "第二步：从离取代基最近的一端开始编号", "第三步：按取代基位次+名称+主链名称顺序命名"] },
          { title: "常见官能团名称", items: ["羟基 −OH（醇/酚），羧基 −COOH（羧酸）", "氨基 −NH₂（胺），酯基 −COO−（酯）"] },
        ]
      } as CardData,
    ]
  },
];

const ENGLISH_FEEDS: FeedGroup[] = [
  {
    date: "20260423", label: "新增了3个记忆",
    summary: '本次英语复习覆盖时态语态、长难句分析、写作句式三个核心板块。时态区分现在完成时vs一般过去时；长难句先找谓语再找从句；写作重点积累强调句和让步转折句式。',
    cards: [
      { id: "e1", title: "记忆：时态与语态综合运用", img: imgEnglishTense, source: "evernote", time: "16:00",
        detailIntro: "时态错误是英语最高频失分点，把最容易混的几组时态帮你彻底分清：",
        detailSections: [
          { title: "完成时 vs 过去时", items: ["现在完成时（have/has done）：动作与现在有关联，结果持续到现在", "一般过去时（did）：强调过去某时间点，与现在无关"] },
          { title: "被动语态构成", items: ["结构：be+过去分词，be 随时态和主语变化", "情态动词被动：modal + be + 过去分词（如 must be done）"] },
        ]
      } as CardData,
      { id: "e2", title: "记忆：长难句结构分析方法", img: imgEnglishLongSentence, source: "zhihu", time: "14:30",
        detailIntro: "长难句最重要的是找主干，你批注的这段阅读抓住了从句结构，帮你总结方法：",
        detailSections: [
          { title: "分析步骤", items: ["第一步：找谓语动词确定主句", "第二步：找从句连接词（that/which/when/because…）", "第三步：分析从句类型（定语/状语/同位语）"] },
          { title: "高频复杂结构", items: ["同位语从句：the fact that...（that 本身无意义）", "非限制性定语从句：which 引导，补充说明，可删去"] },
        ]
      } as CardData,
      { id: "e3", title: "记忆：写作高分句式模板", img: imgEnglishWriting, source: "browser", time: "11:20",
        detailIntro: "作文高分的秘诀是句式多样，把最通用的高级句式整理给你了，直接套用：",
        detailSections: [
          { title: "强调与对比句型", items: ["强调句：It is...that/who...（可强调任何成分）", "Not only...but also...：并列递进，高频首选"] },
          { title: "高分过渡词", items: ["转折：however / nevertheless / on the contrary", "递进：furthermore / in addition / what's more", "因果：consequently / as a result / therefore"] },
        ]
      } as CardData,
    ]
  },
];

const OTHER_FEEDS: FeedGroup[] = [
  {
    date: "20260422", label: "新增了2个记忆",
    summary: '本次整理了两种高效学习方法：思维导图（知识可视化）和费曼学习法（输出倒逼输入）。两种方法可以组合使用，学后先用思维导图整理知识框架，再用费曼法向自己"讲解"一遍检验掌握程度。',
    cards: [
      { id: "o1", title: "记忆：思维导图制作核心原则", img: imgNewNote, source: "browser", time: "18:00",
        detailIntro: "思维导图能让知识结构可视化，看你画的导图结构已经不错，帮你优化了几个细节：",
        detailSections: [
          { title: "基本结构原则", items: ["中心主题→主干（一级节点）→分支（二级/三级）", "每个节点只写关键词，不写完整句子"] },
          { title: "配色与视觉规则", items: ["同一主干分支用同色，整图不超过 5 种颜色", "越重要的节点字体越大、线条越粗"] },
        ]
      } as CardData,
      { id: "o2", title: "记忆：费曼学习法四步骤", img: imgNewNote, source: "zhihu", time: "15:30",
        detailIntro: "费曼学习法是提高知识留存率最有效的方法之一，帮你整理了关键步骤：",
        detailSections: [
          { title: "四个核心步骤", items: ["①选择一个概念 → ②用简单语言向外行解释 → ③找出卡壳处 → ④返回学习卡壳点", "目标：能向 8 岁孩子解释清楚为止"] },
          { title: "适用场景", items: ["理解性知识（原理/定理/概念）效果最佳", "考前用「教别人」法快速检验掌握程度"] },
        ]
      } as CardData,
    ]
  },
];

export const INITIAL_ALL_FEEDS: Record<string, FeedGroup[]> = {
  physics: mergeExamSeedIntoFeeds(
    mergeHomeworkSeedIntoFeeds(injectBuiltinMeta(PHYSICS_FEEDS), "physics"),
    "physics",
  ),
  math: mergeExamSeedIntoFeeds(
    mergeHomeworkSeedIntoFeeds(
      [...DEMO_SEED_PATCH.math, ...injectBuiltinMeta(MATH_FEEDS)],
      "math",
    ),
    "math",
  ),
  chemistry: mergeHomeworkSeedIntoFeeds(injectBuiltinMeta(CHEMISTRY_FEEDS), "chemistry"),
  english: mergeHomeworkSeedIntoFeeds(injectBuiltinMeta(ENGLISH_FEEDS), "english"),
  other: [...DEMO_SEED_PATCH.other, ...injectBuiltinMeta(OTHER_FEEDS)],
};

// ─── Type / source / fallback maps ───────────────────────────────────────────

export const TYPE_SOURCE: Record<string, string> = {
  notes: "evernote", courseware: "zhihu", exercises: "youdao", webpage: "browser",
};

export const TYPE_BG: Record<string, string> = {
  notes: imgNotesBg, courseware: imgCoursewareBg, exercises: imgWebcourseBg, webpage: imgWebBg,
};

export const FALLBACK_CLASSIFY: Record<string, string> = {
  notes: "physics", courseware: "math", exercises: "english", webpage: "other",
};

export const FALLBACK_TITLES: Record<string, string[]> = {
  notes:      ["记忆：笔记批注-物理知识点整理", "记忆：笔记批注-公式推导与解题步骤"],
  courseware: ["记忆：课件批注-重要概念归纳", "记忆：课件批注-数学定理应用总结"],
  exercises:  ["记忆：网课批注-核心知识点提炼", "记忆：网课批注-重点公式与定理归纳"],
  webpage:    ["记忆：网页批注-参考资料摘录", "记忆：网页批注-学习资源收藏"],
};

export const FALLBACK_DETAILS: Record<string, { detailIntro: string; detailSections: DetailSection[] }> = {
  notes: {
    detailIntro: "你的笔记批注已收录，以下是整理后的知识要点",
    detailSections: [
      { title: "核心知识点", items: ["批注内容已保存至记忆库", "建议结合课本重点章节复习", "可配合历次错题对照练习"] },
      { title: "复习建议", items: ["间隔重复：明天、三天后、一周后各回顾一次", "尝试用自己的话复述该知识点", "找到同类型题目加以巩固"] },
    ],
  },
  courseware: {
    detailIntro: "课件批注已归档，核心概念梳理如下",
    detailSections: [
      { title: "批注要点", items: ["课件中标注的内容已提取", "重点关注老师强调的公式与定义", "图表与例题是课程核心考点"] },
      { title: "学习提示", items: ["课后24小时内复习效果最佳", "将批注内容整理成思维导图", "不理解的部分及时提问或查阅资料"] },
    ],
  },
  exercises: {
    detailIntro: "网课批注已收录，以下是提炼后的学习要点",
    detailSections: [
      { title: "核心知识点", items: ["网课批注内容已识别并归档", "重点关注老师讲解的公式与定理", "结合板书图示理解核心概念"] },
      { title: "学习建议", items: ["课后24小时内及时复习，记忆效果最佳", "对照教材找到对应章节深化理解", "尝试用自己的语言复述核心内容"] },
    ],
  },
  webpage: {
    detailIntro: "网页批注已保存，参考资料摘要如下",
    detailSections: [
      { title: "摘录内容", items: ["网页中的批注已收录至记忆库", "建议对比多个来源验证信息", "提炼出与学科知识的关联点"] },
      { title: "延伸阅读", items: ["搜索相关关键词深入了解", "将网页内容与教材知识做对比", "记录有价值的延伸资料链接"] },
    ],
  },
};
