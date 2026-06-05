import type { ExamKnowledgeGraph, ExamKnowledgePoint } from "../types";
import { FRESHMAN_MATH_POINTS } from "./examMathFreshmanGraph";

function graph(subjectId: string, title: string, points: ExamKnowledgePoint[]): ExamKnowledgeGraph {
  return { subjectId, title, points };
}

const PHYSICS_POINTS: ExamKnowledgePoint[] = [
  {
    id: "phy_kinematics",
    label: "运动学基础",
    chapter: "力学",
    prerequisites: [],
    postrequisites: ["phy_newton", "phy_energy"],
    examPoints: ["v-t、x-t 图像斜率与面积含义", "匀变速公式选用条件", "抛体运动的分解"],
    answerStrategy: ["画图定正负方向", "列独立方程数=未知量数", "能量法与牛顿定律对照检验"],
    referenceQuestions: [
      { stem: "物体从静止匀加速 2 m/s² 运动 5 s，求位移。", answerOutline: "x=½at²=25 m。", difficulty: "basic" },
    ],
  },
  {
    id: "phy_newton",
    label: "牛顿定律",
    chapter: "力学",
    prerequisites: ["phy_kinematics"],
    postrequisites: ["phy_circular", "phy_gravity"],
    examPoints: ["受力分析：隔离法与整体法", "静摩擦与动摩擦临界", "超重失重加速度关系"],
    answerStrategy: ["先画受力图再列 ΣF=ma", "临界：静摩擦取最大值", "列式注意矢量方向"],
    referenceQuestions: [
      { stem: "水平面上物块受拉力 F 匀速运动，求摩擦力大小。", answerOutline: "平衡：f=F cosθ（按题意分解）。", difficulty: "basic" },
    ],
  },
  {
    id: "phy_energy",
    label: "机械能守恒",
    chapter: "力学",
    prerequisites: ["phy_kinematics"],
    postrequisites: ["phy_circular"],
    examPoints: ["守恒条件：只有重力/弹力做功", "功能定理 W=ΔEk", "摩擦生热 Q=fd"],
    answerStrategy: ["先判能否用守恒", "选零势能面", "非守恒用功能定理补摩擦功"],
    referenceQuestions: [
      { stem: "单摆从 30° 释放，求底端速度（绳长 L）。", answerOutline: "mgh=½mv²，v=√(2gL(1-cos30°))。", difficulty: "basic" },
      { stem: "粗糙斜面下滑有摩擦，求末速度。", answerOutline: "用功能定理：mgh-Q=½mv²。", difficulty: "advanced" },
    ],
  },
  {
    id: "phy_circular",
    label: "圆周运动",
    chapter: "力学",
    prerequisites: ["phy_newton", "phy_energy"],
    postrequisites: ["phy_gravity"],
    examPoints: ["向心力 F=mv²/r 来源分析", "竖直面临界速度", "ω、T、v 关系"],
    answerStrategy: ["向心力写来源式（绳拉力、重力分力等）", "临界：绳模型 N=0", "单位换算 r、ω 一致"],
    referenceQuestions: [
      { stem: "带电粒子在匀强磁场中匀速圆周运动，求半径 r。", answerOutline: "qvB=mv²/r ⇒ r=mv/(qB)。", difficulty: "advanced" },
    ],
  },
  {
    id: "phy_gravity",
    label: "万有引力与卫星",
    chapter: "力学",
    prerequisites: ["phy_circular"],
    postrequisites: [],
    examPoints: ["GMm/r² 提供向心力", "第一宇宙速度 v=√(gR)", "同步卫星周期与高度"],
    answerStrategy: ["列万有引力=向心力", "近地卫星 g=GM/R²", "黄金代换 GM=gR²"],
    referenceQuestions: [
      { stem: "求地球表面卫星周期（已知 R、g）。", answerOutline: "由 g=4π²R/T² 得 T=2π√(R/g)。", difficulty: "basic" },
    ],
  },
  {
    id: "phy_electric",
    label: "静电场",
    chapter: "电磁学",
    prerequisites: [],
    postrequisites: ["phy_circuit"],
    examPoints: ["E 与 φ 关系、等势面", "电容器 C=Q/U", "带电粒子在电场中加速与偏转"],
    answerStrategy: ["先求场强再求力", "动能定理 qU=½mv²", "类平抛分解"],
    referenceQuestions: [
      { stem: "平行板电容器间距减半，电容如何变？", answerOutline: "C=εS/(4πkd)，间距减半 C 加倍。", difficulty: "basic" },
    ],
  },
  {
    id: "phy_circuit",
    label: "直流电路",
    chapter: "电磁学",
    prerequisites: ["phy_electric"],
    postrequisites: ["phy_em_induction"],
    examPoints: ["欧姆定律与功率", "串并联等效", "含源电路欧姆定律与路端电压"],
    answerStrategy: ["画等效电路图", "先求总电阻再分支", "注意内阻分压"],
    referenceQuestions: [
      { stem: "求含内阻电源的路端电压随外电阻变化趋势。", answerOutline: "U=ER/(R+r)，R 增大 U 增大趋近 E。", difficulty: "basic" },
    ],
  },
  {
    id: "phy_em_induction",
    label: "电磁感应",
    chapter: "电磁学",
    prerequisites: ["phy_circuit"],
    postrequisites: [],
    examPoints: ["楞次定律「来拒去留」", "法拉第定律 ε=ΔΦ/Δt", "导体棒切割 ε=Blv"],
    answerStrategy: ["先判感应电流方向", "再选公式算大小", "能量守恒检验"],
    referenceQuestions: [
      { stem: "磁铁插入线圈，线圈中感应电流方向？", answerOutline: "楞次：阻碍插入，用安培定则判方向。", difficulty: "basic" },
      { stem: "导体棒在导轨上匀速切割，求感应电流。", answerOutline: "ε=Blv，I=ε/(R+r)。", difficulty: "advanced" },
    ],
  },
  {
    id: "phy_photoeffect",
    label: "光电效应",
    chapter: "近代物理",
    prerequisites: ["phy_quantum_intro"],
    postrequisites: [],
    examPoints: ["Ek=hν-W₀", "截止频率与逸出功", "光强只影响光电流"],
    answerStrategy: ["先算光子能量 hν", "再与逸出功比较能否逸出", "图像斜率=h，截距=W₀"],
    referenceQuestions: [
      { stem: "已知截止波长 λ₀，求逸出功 W₀。", answerOutline: "W₀=hc/λ₀。", difficulty: "basic" },
    ],
  },
  {
    id: "phy_quantum_intro",
    label: "量子初步",
    chapter: "近代物理",
    prerequisites: [],
    postrequisites: ["phy_photoeffect"],
    examPoints: ["波粒二象性", "氢原子能级跃迁", "德布罗意波长"],
    answerStrategy: ["能级差 hν=Em-En", "吸收/发射光子选择定则", "波长 λ=h/p"],
    referenceQuestions: [
      { stem: "氢原子从 n=3 跃迁到 n=1 辐射光子能量？", answerOutline: "E=E₃-E₁=-13.6(1/9-1) eV（按能级公式）。", difficulty: "advanced" },
    ],
  },
];

const CHEMISTRY_POINTS: ExamKnowledgePoint[] = [
  {
    id: "chem_bond",
    label: "化学键与极性",
    chapter: "结构",
    prerequisites: [],
    postrequisites: ["chem_reaction", "chem_organic"],
    examPoints: ["离子键、共价键、金属键判断", "极性分子与空间构型", "分子间作用力与熔沸点"],
    answerStrategy: ["先判键型再看构型", "VSEPR 判空间结构", "氢键影响沸点异常"],
    referenceQuestions: [
      { stem: "判断 CO₂ 是否为极性分子。", answerOutline: "线形对称，键极性抵消，非极性分子。", difficulty: "basic" },
    ],
  },
  {
    id: "chem_reaction",
    label: "氧化还原",
    chapter: "反应原理",
    prerequisites: ["chem_bond"],
    postrequisites: ["chem_electro"],
    examPoints: ["化合价升降与电子转移", "氧化剂还原剂识别", "配平方程式"],
    answerStrategy: ["标化合价→找升降→配电子→配原子", "酸性/碱性介质补 H⁺/OH⁻"],
    referenceQuestions: [
      { stem: "配平 KMnO₄ 与 Fe²⁺ 酸性反应。", answerOutline: "Mn⁷⁺→Mn²⁺，Fe²⁺→Fe³⁺，电子守恒配系数。", difficulty: "advanced" },
    ],
  },
  {
    id: "chem_electro",
    label: "电化学",
    chapter: "反应原理",
    prerequisites: ["chem_reaction"],
    postrequisites: [],
    examPoints: ["原电池：负氧化正还原", "电解池与电镀", "金属腐蚀与防护"],
    answerStrategy: ["先写电极反应", "电流方向：电子负→正，离子内电路", "能斯特思想判自发"],
    referenceQuestions: [
      { stem: "锌铜原电池，哪个电极溶解？", answerOutline: "Zn 为负极氧化溶解，Cu 为正极。", difficulty: "basic" },
      { stem: "电解 NaCl 溶液两极产物？", answerOutline: "阴极 H₂，阳极 Cl₂（浓溶液）或 O₂。", difficulty: "advanced" },
    ],
  },
  {
    id: "chem_organic",
    label: "有机命名与异构",
    chapter: "有机",
    prerequisites: ["chem_bond"],
    postrequisites: [],
    examPoints: ["IUPAC 命名：主链、编号、官能团", "同分异构：碳链、位置、官能团", "特征反应（加成、取代、消去）"],
    answerStrategy: ["命名：选最长碳链→编号最小→写取代基", "异构：先碳链后位置再官能团", "官能团检验对应试剂"],
    referenceQuestions: [
      { stem: "命名 CH₃CH(CH₃)CH₂OH。", answerOutline: "2-甲基-1-丙醇（按最低编号规则）。", difficulty: "basic" },
    ],
  },
];

const ENGLISH_POINTS: ExamKnowledgePoint[] = [
  {
    id: "eng_tense",
    label: "时态与语态",
    chapter: "语法",
    prerequisites: [],
    postrequisites: ["eng_clause", "eng_writing"],
    examPoints: ["现在完成 vs 一般过去", "被动语态与主被动转换", "时间状语与时态呼应"],
    answerStrategy: ["找时间标志词", "画时间轴判动作先后", "被动：be+过去分词"],
    referenceQuestions: [
      { stem: "选择：I ___ (live) here since 2020.", answerOutline: "have lived（since+时间点用现在完成）。", difficulty: "basic" },
    ],
  },
  {
    id: "eng_clause",
    label: "从句与长难句",
    chapter: "语法",
    prerequisites: ["eng_tense"],
    postrequisites: ["eng_writing"],
    examPoints: ["定语从句关系词选择", "名词性从句 that/whether", "分词作状语逻辑主语"],
    answerStrategy: ["先找谓语再找从句", "关系词：缺成分用 which/who，不缺用 that/where", "分词与主语一致"],
    referenceQuestions: [
      { stem: "分析：The book that I bought yesterday is interesting.", answerOutline: "定语从句修饰 book，关系代词 that 作 bought 宾语。", difficulty: "basic" },
      { stem: "合并两句为含非谓语的结构。", answerOutline: "选主语一致者作分词短语作状语。", difficulty: "advanced" },
    ],
  },
  {
    id: "eng_vocab",
    label: "核心词汇辨析",
    chapter: "词汇",
    prerequisites: [],
    postrequisites: ["eng_writing"],
    examPoints: ["形近词、同义词搭配", "词根词缀猜词", "学术写作高频词块"],
    answerStrategy: ["记搭配不记孤立中文", "语境猜义", "写作替换避免重复"],
    referenceQuestions: [
      { stem: "选用 affect / effect 填空：The policy had a significant ___ on prices.", answerOutline: "effect 作名词「影响」。", difficulty: "basic" },
    ],
  },
  {
    id: "eng_writing",
    label: "写作句式",
    chapter: "写作",
    prerequisites: ["eng_tense", "eng_clause", "eng_vocab"],
    postrequisites: [],
    examPoints: ["强调句 It is...that", "让步 although / despite", "图表作文结构：总-分-总"],
    answerStrategy: ["开头段改写题目+观点", "主体段：主题句+论据+例子", "结尾段升华不引入新点"],
    referenceQuestions: [
      { stem: "用强调句改写：Tom solved the problem yesterday.", answerOutline: "It was Tom who solved the problem yesterday.", difficulty: "basic" },
      { stem: "就「线上学习利弊」写开头段（80词）。", answerOutline: "背景句+立场句+提纲句三点。", difficulty: "advanced" },
    ],
  },
];

const OTHER_POINTS: ExamKnowledgePoint[] = [
  {
    id: "other_method",
    label: "学习方法",
    chapter: "通识",
    prerequisites: [],
    postrequisites: ["other_feynman", "other_mindmap"],
    examPoints: ["主动回忆优于重复阅读", "间隔复习与测试效应", "目标拆解与反馈闭环"],
    answerStrategy: ["学完即闭卷复述", "错题回炉>新题堆砌", "周计划+日复盘"],
    referenceQuestions: [
      { stem: "设计一门新课的一周复习计划（要点即可）。", answerOutline: "D1 笔记→D3 自测→D7 综合卷+错题。", difficulty: "basic" },
    ],
  },
  {
    id: "other_mindmap",
    label: "思维导图",
    chapter: "通识",
    prerequisites: ["other_method"],
    postrequisites: [],
    examPoints: ["中心主题→一级分支→细节", "关键词化、少句子", "与考题结构对齐"],
    answerStrategy: ["先骨架后叶子", "颜色区分模块", "导图→自测题"],
    referenceQuestions: [
      { stem: "为一章内容画思维导图应含哪三层？", answerOutline: "章名/核心概念/公式或案例。", difficulty: "basic" },
    ],
  },
  {
    id: "other_feynman",
    label: "费曼学习法",
    chapter: "通识",
    prerequisites: ["other_method"],
    postrequisites: [],
    examPoints: ["用通俗语言讲给外行", "卡壳处即薄弱点", "回顾教材补洞"],
    answerStrategy: ["录音 3 分钟讲解", "对比标准答案", "针对漏洞二次学习"],
    referenceQuestions: [
      { stem: "向高中生解释「净出口 NX」。（口述提纲）", answerOutline: "出口减进口；GDP 支出法一项；贸易顺差 NX>0。", difficulty: "basic" },
    ],
  },
  {
    id: "other_econ_gdp",
    label: "GDP 与净出口",
    chapter: "经济学入门",
    prerequisites: [],
    postrequisites: [],
    examPoints: ["GDP 支出法 C+I+G+NX", "NX=出口-进口", "名义与实际 GDP"],
    answerStrategy: ["画循环流图", "区分流量与存量", "结合政策谈 NX 变化"],
    referenceQuestions: [
      { stem: "NX 下降对 GDP 有何影响？", answerOutline: "短期支出法 GDP 下降（其他不变时）。", difficulty: "basic" },
    ],
  },
  {
    id: "other_cs_arch",
    label: "冯·诺依曼架构",
    chapter: "计算机基础",
    prerequisites: [],
    postrequisites: [],
    examPoints: ["五大部件：运算器、控制器、存储器、输入、输出", "指令周期：取指-译码-执行", "控制单元协调"],
    answerStrategy: ["画框图说明数据流", "举例指令在总线上的流动", "联系现代 CPU 缓存"],
    referenceQuestions: [
      { stem: "简述控制单元的作用。", answerOutline: "产生控制信号，协调各部件按时序工作。", difficulty: "basic" },
    ],
  },
];

const GRAPHS: Record<string, ExamKnowledgeGraph> = {
  math: graph("math", "大一数学 · 考点图谱", FRESHMAN_MATH_POINTS),
  physics: graph("physics", "大学物理 · 考点图谱", PHYSICS_POINTS),
  chemistry: graph("chemistry", "大学化学 · 考点图谱", CHEMISTRY_POINTS),
  english: graph("english", "大学外语 · 考点图谱", ENGLISH_POINTS),
  other: graph("other", "综合素养 · 考点图谱", OTHER_POINTS),
};

export function getExamKnowledgeGraph(subjectId: string): ExamKnowledgeGraph | null {
  return GRAPHS[subjectId] ?? null;
}

export function getPointById(graphData: ExamKnowledgeGraph, id: string) {
  return graphData.points.find(p => p.id === id) ?? null;
}

export function getChapters(graphData: ExamKnowledgeGraph): string[] {
  const set = new Set(graphData.points.map(p => p.chapter));
  return [...set];
}
