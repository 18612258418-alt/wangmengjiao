import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CalendarClock, Check, ChevronRight, FileText, NotebookTabs, PenLine, Sparkles } from "lucide-react";
import type { FeedGroup, SubjectData } from "../../types";
import { getSubjectSyllabus } from "../../data/subjectSyllabi";
import { collectNoteCards } from "../../utils/syllabusNotes";
import { ReviewActionModal, type ReviewActionContent, type ReviewMistakeOrigin, type ReviewPaperQuestion } from "./ReviewActionModal";
import { formatNextReview, loadReviewSchedule, updateReviewSchedule } from "./reviewScheduler";

type ReviewState = "优先复习" | "需要巩固" | "待验证" | "已掌握";
type ReviewAction = "notes" | "homework" | "practice";

type ReviewItem = {
  title: string;
  content: string;
  source: string;
  action: ReviewAction;
  actionLabel: string;
  origin?: ReviewMistakeOrigin;
  questions?: ReviewPaperQuestion[];
  initialQuestionId?: string;
};

type ReviewPreset = {
  focus: string;
  progress: number;
  evidence: string;
  items: ReviewItem[];
};

type MistakeItem = {
  id: string;
  topic: string;
  title: string;
  content: string;
  source: string;
  cause: string;
  origin: ReviewMistakeOrigin;
  previousAnswer?: string;
  correctAnswer?: string;
};

const MISTAKES: Record<string, MistakeItem[]> = {
  math: [
    { id: "math-bounds", topic: "不定积分与换元法", title: "换元后没有同步修改上下限", content: "计算 ∫₀¹ 2x / (1 + x²) dx。请从换元开始重新作答，并明确写出 u 的新区间。", source: "第 6 次作业 · 第 3 题 · 8月30日", cause: "变量换成 u 后，积分区间仍使用原变量 x 的 0—1。", previousAnswer: "令 u=1+x²，直接写成 ∫₀¹ 1/u du。", correctAnswer: "令 u=1+x²，du=2x dx；x=0 时 u=1，x=1 时 u=2，所以 ∫₁² 1/u du=ln 2。", origin: "在线作答" },
    { id: "math-note-substitution", topic: "不定积分与换元法", title: "笔记中的换元过程保留了原区间", content: "根据笔记中的原题，重新计算 ∫₀¹ 2x / (1 + x²) dx，并写清变量、微分和新区间。", source: "手写课堂笔记《换元积分法》· 第 4 页 · 8月28日", cause: "换元只替换了被积式，没有同步替换上下限。", previousAnswer: "u=1+x²，du=2x dx，区间仍记为 0—1。", correctAnswer: "变量、微分与上下限必须成套替换：u∈[1,2]，结果为 ln 2。", origin: "笔记识别" },
    { id: "math-area", topic: "定积分几何应用", title: "曲线交点判断错误", content: "设区域 D 由 y=x² 与 y=2x 围成，求 D 的面积。先求交点，再写出正确积分区间。", source: "定积分章节作业 · 第 5 题 · 8月27日", cause: "没有先求交点，直接把 0—1 作为积分区间", previousAnswer: "直接取区间 [0,1] 计算。", correctAnswer: "由 x²=2x 得交点 x=0、2，面积为 ∫₀²(2x-x²)dx=4/3。", origin: "作业批改" },
    { id: "math-chain", topic: "导数应用", title: "复合函数漏乘内层导数", content: "求 y=sin(x²+1) 的导数，并标出外层函数与内层函数。", source: "课堂小测 · 第 2 题 · 8月22日", cause: "只写了 cos(x²+1)，漏乘 2x", previousAnswer: "y′=cos(x²+1)。", correctAnswer: "外层为 sin u，内层为 u=x²+1，因此 y′=2x·cos(x²+1)。", origin: "模拟考试" },
  ],
  physics: [
    { id: "physics-unit", topic: "误差分析", title: "不确定度与测量值位数未对齐", content: "根据给出的三次测量值，写出包含不确定度的最终实验结果。", source: "第 5 次实验报告 · 教师批注", cause: "不确定度保留位数与测量结果小数位不一致", origin: "笔记识别" },
    { id: "physics-zero", topic: "实验操作", title: "读数前遗漏仪器调零", content: "按正确顺序写出游标卡尺测量前的准备与读数步骤。", source: "实验预习检测 · 第 1 题", cause: "直接读数，没有检查零点", origin: "在线作答" },
  ],
};

const PRESETS: Record<string, ReviewPreset> = {
  math: {
    focus: "不定积分与换元法",
    progress: 40,
    evidence: "下周二结课考试 · 最近 2 次作业都在换元上下限出错",
    items: [
      { title: "换元法本次复习", content: "先识别可以整体代换的部分，再凑出对应微分。遇到定积分时，变量、微分和上下限必须一起换；你最近最需要注意的是换元后仍沿用原上下限。", source: "课堂笔记《换元积分法》· 教材第 126—129 页 · 最近 2 次作业", action: "notes", actionLabel: "开始复习" },
      { title: "边界条件快速检测", content: "2 道换元积分变式题。全部答对，并能解释为什么要换上下限后，才算完成本知识点复习。", source: "根据个人错题生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  physics: {
    focus: "误差分析与实验操作",
    progress: 35,
    evidence: "明天有物理实验 · 最近记录中两次遗漏仪器调零步骤",
    items: [
      { title: "实验操作本次复习", content: "按“检查仪器—调零—垂直读数—记录原始值”的顺序操作。你最近两次都漏了调零，因此开始实验前先口述一遍完整流程。", source: "实验课件第 6 周 · 操作视频 03:12—06:40 · 最近操作记录", action: "notes", actionLabel: "开始复习" },
      { title: "实验前快速检测", content: "完成 3 个读数与误差计算问题，确认可以独立写出实验结果表达式。", source: "根据明日实验内容生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  chemistry: {
    focus: "化学平衡",
    progress: 55,
    evidence: "本周进入化学平衡章节 · 最近判断题正确率 60%",
    items: [
      { title: "平衡移动本次复习", content: "先确定外界改变的是浓度、压强还是温度，再判断体系如何削弱这种改变。特别注意：催化剂只改变达到平衡的速度，不改变平衡位置。", source: "课堂笔记《勒夏特列原理》· 课件第 42—47 页 · 最近判断题", action: "notes", actionLabel: "开始复习" },
      { title: "平衡移动快速检测", content: "完成 3 道条件变化判断题，并用一句话说明每题依据。", source: "根据章节作业生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  english: {
    focus: "学术听力与论证结构",
    progress: 45,
    evidence: "明天下午学术听说课 · 最近两次漏听转折后的核心观点",
    items: [
      { title: "论证转折本次复习", content: "听到 however、nevertheless 或 on the other hand 时，先记转折后的核心观点，再补例子和限制条件。你最近漏掉的重点都出现在转折之后。", source: "课程音频 08:10—12:35 · 课堂笔记 · 最近 2 次听写", action: "notes", actionLabel: "开始复习" },
      { title: "8 分钟精听检测", content: "听两个短片段，写出转折词、核心观点和限制条件。", source: "根据个人听力记录生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  other: {
    focus: "社会比较理论",
    progress: 60,
    evidence: "论文正在调用该理论 · 笔记中仍混淆向上比较与规范性影响",
    items: [
      { title: "社会比较本次复习", content: "向上比较不必然带来激励：当差距被认为不可缩小、比较对象又与自我高度相关时，更容易产生相对剥夺感。复习时重点区分“比较方向”和“结果条件”。", source: "《社会心理学》第 183—193 页 · 3 条挂靠笔记 · 当前论文问题", action: "notes", actionLabel: "开始复习" },
      { title: "案例迁移检测", content: "用社会比较理论解释一个短视频消费案例，并指出比较对象、心理机制和消费结果。", source: "根据论文研究问题生成", action: "practice", actionLabel: "开始作答" },
    ],
  },
};

const STATUS_MAP: Record<string, Record<string, ReviewState>> = {
  math: { "极限": "已掌握", "曲边": "需要巩固", "导数": "需要巩固", "换元": "优先复习", "几何应用": "待验证", "三角": "需要巩固", "数列": "待验证", "空间": "需要巩固", "概率": "已掌握", "二项式": "待验证" },
  physics: { "牛顿": "已掌握", "机械能": "需要巩固", "万有引力": "待验证", "静电场": "需要巩固", "匀强磁场": "已掌握", "电磁感应": "需要巩固", "光电效应": "待验证", "交流电": "需要巩固" },
  chemistry: { "化学平衡": "优先复习", "氧化还原": "已掌握", "物质的量": "需要巩固", "滴定": "待验证" },
  english: { "听力": "优先复习", "词汇": "已掌握", "写作": "需要巩固", "阅读": "待验证" },
  other: { "社会比较": "优先复习", "自我概念": "已掌握", "群体": "需要巩固", "研究方法": "待验证" },
};

function stateForTopic(subjectId: string, title: string, focus: string): ReviewState {
  if (title.includes(focus) || focus.includes(title.replace(/^\d+(\.\d+)?\s*/, ""))) return "优先复习";
  const match = Object.entries(STATUS_MAP[subjectId] ?? {}).find(([keyword]) => title.includes(keyword));
  return match?.[1] ?? "待验证";
}

function genericItems(title: string, noteCount: number, state: ReviewState): ReviewItem[] {
  return [
    { title: `${title}本次复习`, content: `先用自己的话说明“${title}”解决什么问题，再说出关键关系、适用条件和一个容易混淆的边界。AI 已结合你的课程记录整理为本次要点。`, source: `${noteCount} 条课程笔记、对应原始资料与最近作答`, action: "notes", actionLabel: "开始复习" },
    { title: state === "已掌握" ? "间隔验证" : "掌握检测", content: state === "已掌握" ? "不看笔记，用自己的话解释核心概念，再完成 1 道迁移题。" : "完成 2 道针对性问题；正确且能解释关键步骤后，系统更新掌握状态。", source: state === "已掌握" ? "根据上次掌握结果生成" : "根据当前知识点生成", action: "practice", actionLabel: "开始检测" },
  ];
}

export function ReviewPlanView({ subject, feedGroups }: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
}) {
  const preset = PRESETS[subject.id] ?? PRESETS.other;
  const syllabus = getSubjectSyllabus(subject.id);
  const topics = useMemo(() => syllabus?.nodes.filter(node => node.kind === "topic") ?? [], [syllabus]);
  const defaultTopicId = topics.find(topic => topic.title.includes(preset.focus) || preset.focus.includes(topic.title.replace(/^\d+(\.\d+)?\s*/, "")))?.id ?? topics[0]?.id ?? "";
  const [selectedTopicId, setSelectedTopicId] = useState(defaultTopicId);
  const [activeAction, setActiveAction] = useState<{ item: ReviewItem; completionId: string; topic?: string } | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(() => new Set());
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const noteCount = useMemo(() => collectNoteCards(feedGroups).length, [feedGroups]);
  const mistakes = MISTAKES[subject.id] ?? [
    { id: `${subject.id}-concept`, topic: preset.focus, title: `${preset.focus}概念边界混淆`, content: `请重新回答“${preset.focus}”的核心问题，并说明它与相近概念的区别。`, source: "最近一次课程练习", cause: "答案引用了定义，但没有说明适用条件", origin: "在线作答" as const },
  ];

  useEffect(() => setSelectedTopicId(defaultTopicId), [subject.id, defaultTopicId]);

  const selectedTopic = topics.find(topic => topic.id === selectedTopicId) ?? topics[0];
  const selectedTitle = selectedTopic?.title ?? preset.focus;
  const normalizedSelectedTitle = selectedTitle.replace(/^\d+(\.\d+)?\s*/, "");
  const relatedMistakes = mistakes.filter(mistake => normalizedSelectedTitle.includes(mistake.topic) || mistake.topic.includes(normalizedSelectedTitle));
  const selectedState = stateForTopic(subject.id, selectedTitle, preset.focus);
  const isFocus = selectedTopic?.id === defaultTopicId;
  const progress = isFocus ? preset.progress : selectedState === "已掌握" ? 100 : selectedState === "待验证" ? 70 : 50;
  const items = isFocus ? preset.items : genericItems(selectedTitle, noteCount, selectedState);
  const baseCompletedItems = progress === 100 ? items.length : progress >= 60 ? 1 : 0;
  const completionKey = (index: number) => `${subject.id}:${selectedTopicId}:${index}`;
  const completedItems = items.filter((_, index) => index < baseCompletedItems || completedActions.has(completionKey(index))).length;
  const newlyCompletedItems = items.filter((_, index) => completedActions.has(completionKey(index)) && index >= baseCompletedItems).length;
  const shownProgress = Math.min(100, Math.round(progress + newlyCompletedItems * ((100 - progress) / items.length)));
  const schedule = useMemo(
    () => selectedTopicId ? loadReviewSchedule(subject.id, selectedTopicId) : null,
    [scheduleVersion, selectedTopicId, subject.id],
  );

  const stateStyle = (state: ReviewState) => state === "优先复习" ? "bg-[#E8EAFF] text-[#5260D8]" : state === "需要巩固" ? "bg-[#FFF0D9] text-[#A66816]" : state === "已掌握" ? "bg-[#E1F3E9] text-[#2F8963]" : "bg-[#EDF0F5] text-[#707887]";
  const renderReviewItem = (item: ReviewItem, index: number) => {
    const done = index < baseCompletedItems || completedActions.has(completionKey(index));
    const current = !done && index === completedItems;
    const Icon = item.action === "notes" ? FileText : item.action === "homework" ? PenLine : Sparkles;
    return <button type="button" key={item.title} onClick={() => setActiveAction({ item, completionId: completionKey(index) })} className={`block w-full rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB5FF] ${current ? "bg-[#F2F4FF]" : "bg-[#F7F8FB]"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${done ? "bg-[#E4F4EB] text-[#2F8963]" : current ? "bg-[#4D5CFF] text-white" : "bg-white text-[#7B8392]"}`}>{done ? <Check size={15}/> : <Icon size={15}/>}</span>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-[#EAEDFF] px-2 py-1 text-[7px] font-semibold text-[#5967D9]">{item.action === "notes" ? "AI整理" : "验证"}</span><h4 className="text-[12px] font-bold text-[#343946]">{item.title}</h4>{current && <span className="rounded-full bg-white px-2 py-1 text-[7px] font-semibold text-[#5967D9]">接下来</span>}</div><p className="mt-2 text-[10px] leading-5 text-[#666F80]">{item.content}</p><p className="mt-2 text-[8px] text-[#A6ACB7]">参考：{item.source}</p></div>
      </div>
    </button>;
  };
  return <><section className="flex min-h-0 flex-1 overflow-hidden bg-[#F5F6FA]">
    <aside className="w-[270px] shrink-0 overflow-y-auto border-r border-[#E4E7ED] px-5 pb-6 pt-4">
      <div className="flex items-center"><BookOpenCheck size={17} className="text-[#4D5CFF]"/><h2 className="ml-2 text-[14px] font-bold">知识点大纲</h2></div>
      <nav className="mt-4 space-y-1">{syllabus?.nodes.map(node => node.kind === "chapter" ? <p key={node.id} className="px-2 pb-1 pt-4 text-[9px] font-semibold text-[#9AA1AE]">{node.title}</p> : (() => {
        const state = stateForTopic(subject.id, node.title, preset.focus);
        const active = node.id === selectedTopicId;
        return <button key={node.id} onClick={() => setSelectedTopicId(node.id)} className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#4D5360] hover:bg-white/60"}`}><span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{node.title}</span><span className={`ml-2 shrink-0 rounded-full px-2 py-1 text-[7px] font-semibold ${stateStyle(state)}`}>{state}</span>{active && <ChevronRight size={12} className="ml-1"/>}</button>;
      })())}</nav>
    </aside>

    <div className="min-w-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-[850px]">
        <header className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(33,40,70,.06)]">
          <div className="flex items-start justify-between gap-6">
            <div><p className="text-[10px] font-semibold text-[#8B92A1]">复习进度</p><h2 className="mt-2 text-[22px] font-bold text-[#202431]">{selectedTitle}</h2><p className="mt-2 text-[10px] text-[#8A92A1]">{isFocus ? preset.evidence : `根据 ${noteCount} 条笔记、相关作业和最近掌握结果生成`}</p></div>
            <b className="shrink-0 text-[20px] text-[#4D5CFF]">{shownProgress}%</b>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ECEEF5]"><div className="h-full rounded-full bg-[#4D5CFF] transition-all" style={{ width: `${shownProgress}%` }}/></div>
          <div className="mt-3 flex items-center justify-between gap-4 text-[10px] text-[#858D9D]"><span>已完成 {completedItems}/{items.length} 项</span><span className="flex items-center gap-1.5 text-[#6F7D9A]"><CalendarClock size={12}/>{formatNextReview(schedule)}</span></div>
        </header>

        <section className="mt-4 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(33,40,70,.05)]">
          <h3 className="text-[15px] font-bold text-[#202431]">复习内容</h3>
          <div className="mt-4 space-y-3">{items.map((item,index)=>({item,index})).filter(entry=>entry.item.action!=="practice").map(entry=>renderReviewItem(entry.item,entry.index))}</div>
          {relatedMistakes.length>0&&<div className="mt-6 overflow-hidden rounded-2xl bg-[#FFF8EE]"><div className="flex items-center gap-2 px-4 py-3.5"><NotebookTabs size={15} className="text-[#D58A36]"/><h3 className="text-[13px] font-bold text-[#2D3340]">错题本</h3><span className="rounded-full bg-white/80 px-2 py-1 text-[8px] font-semibold text-[#AF691B]">{relatedMistakes.filter(mistake=>!completedActions.has(`mistake:${mistake.id}`)).length} 道待订正</span></div><div className="border-t border-[#F1DFC8]">{relatedMistakes.map((mistake,index)=>{const done=completedActions.has(`mistake:${mistake.id}`);return <button type="button" key={mistake.id} onClick={()=>setActiveAction({item:{title:`${mistake.topic}错题订正`,content:"",source:`${relatedMistakes.length} 道错题`,action:"homework",actionLabel:"打开错题卷",origin:mistake.origin,questions:relatedMistakes,initialQuestionId:mistake.id},completionId:`mistake:${mistake.id}`,topic:mistake.topic})} className={`flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E7BC84] ${index>0?"border-t border-[#F1DFC8]":""}`}><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${done?"bg-[#E4F4EB] text-[#2F8963]":"bg-white text-[#C27A29]"}`}>{done?<Check size={14}/>:<PenLine size={14}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-[11px] font-bold text-[#343946]">{mistake.title}</h4><span className="rounded-full bg-white/80 px-2 py-1 text-[7px] font-semibold text-[#8A6B48]">{mistake.origin}</span></div><p className="mt-1.5 text-[9px] leading-5 text-[#707787]">上次错误：{mistake.cause}</p><p className="mt-1 text-[8px] text-[#A2A7B0]">{mistake.source}</p></div></button>})}</div></div>}
        </section>

        <section className="mb-6 mt-4 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(33,40,70,.05)]">
          <h3 className="text-[15px] font-bold text-[#202431]">拓展内容</h3>
          <div className="mt-4 space-y-3">{items.map((item,index)=>({item,index})).filter(entry=>entry.item.action==="practice").map(entry=>renderReviewItem(entry.item,entry.index))}</div>
        </section>
      </div>
    </div>
  </section>{activeAction && <ReviewActionModal
    subjectName={subject.short}
    topic={activeAction.topic ?? selectedTitle}
    item={activeAction.item as ReviewActionContent}
    onClose={() => setActiveAction(null)}
    onComplete={(outcome) => {
      setCompletedActions(current => new Set(current).add(activeAction.completionId));
      updateReviewSchedule(subject.id, selectedTopicId, outcome, activeAction.item.action === "practice");
      setScheduleVersion(version => version + 1);
    }}
  />}</>;
}
