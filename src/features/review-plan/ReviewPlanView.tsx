import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CalendarClock, Check, ChevronRight, FileText, NotebookTabs, PenLine, Sparkles } from "lucide-react";
import type { FeedGroup, SubjectData } from "../../types";
import { getSubjectSyllabus } from "../../data/subjectSyllabi";
import { collectNoteCards } from "../../utils/syllabusNotes";
import { ReviewActionModal, type ReviewActionContent, type ReviewMistakeOrigin } from "./ReviewActionModal";
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
};

const MISTAKES: Record<string, MistakeItem[]> = {
  math: [
    { id: "math-bounds", topic: "不定积分与换元法", title: "换元后没有同步修改上下限", content: "计算 ∫₀¹ 2x / (1 + x²) dx。请从换元开始重新作答，并明确写出 u 的新区间。", source: "第 6 次作业 · 第 3 题 · 8月30日", cause: "变量换成 u 后仍沿用了 x 的上下限", origin: "在线作答" },
    { id: "math-note-substitution", topic: "不定积分与换元法", title: "笔记中的换元过程保留了原区间", content: "根据笔记中的原题，重新计算 ∫₀¹ 2x / (1 + x²) dx，并写清变量、微分和新区间。", source: "手写课堂笔记《换元积分法》· 第 4 页 · 8月28日", cause: "AI识别到原过程被红笔标记，换元后仍写成 0—1", origin: "笔记识别" },
    { id: "math-area", topic: "定积分几何应用", title: "曲线交点判断错误", content: "设区域 D 由 y=x² 与 y=2x 围成，求 D 的面积。先求交点，再写出正确积分区间。", source: "定积分章节作业 · 第 5 题 · 8月27日", cause: "没有先求交点，直接把 0—1 作为积分区间", origin: "作业批改" },
    { id: "math-chain", topic: "导数应用", title: "复合函数漏乘内层导数", content: "求 y=sin(x²+1) 的导数，并标出外层函数与内层函数。", source: "课堂小测 · 第 2 题 · 8月22日", cause: "只写了 cos(x²+1)，漏乘 2x", origin: "模拟考试" },
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
      { title: "换元法核心内容", content: "第一类换元用于凑微分；第二类换元通过代换消去根式或复杂结构。定积分换元后，积分变量和上下限必须同时改变。", source: "课堂笔记《换元积分法》· 教材第 126—129 页", action: "notes", actionLabel: "查看原笔记" },
      { title: "边界条件快速检测", content: "2 道换元积分变式题。全部答对，并能解释为什么要换上下限后，才算完成本知识点复习。", source: "根据个人错题生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  physics: {
    focus: "误差分析与实验操作",
    progress: 35,
    evidence: "明天有物理实验 · 最近记录中两次遗漏仪器调零步骤",
    items: [
      { title: "实验操作关键步骤", content: "先调零，再读数；视线与刻度面垂直；多次测量后记录原始数据，不能先做平均再补记录。", source: "实验课件第 6 周 · 操作视频 03:12—06:40", action: "notes", actionLabel: "查看操作记录" },
      { title: "实验前快速检测", content: "完成 3 个读数与误差计算问题，确认可以独立写出实验结果表达式。", source: "根据明日实验内容生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  chemistry: {
    focus: "化学平衡",
    progress: 55,
    evidence: "本周进入化学平衡章节 · 最近判断题正确率 60%",
    items: [
      { title: "平衡移动判断", content: "先判断改变的是浓度、压强还是温度，再判断平衡移动方向；催化剂只改变达到平衡的速度，不改变平衡位置。", source: "课堂笔记《勒夏特列原理》· 课件第 42—47 页", action: "notes", actionLabel: "查看原笔记" },
      { title: "平衡移动快速检测", content: "完成 3 道条件变化判断题，并用一句话说明每题依据。", source: "根据章节作业生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  english: {
    focus: "学术听力与论证结构",
    progress: 45,
    evidence: "明天下午学术听说课 · 最近两次漏听转折后的核心观点",
    items: [
      { title: "论证转折信号", content: "however、nevertheless 和 on the other hand 后通常出现作者真正要强调的立场，听到后优先记录观点而非例子。", source: "课程音频 08:10—12:35 · 课堂笔记", action: "notes", actionLabel: "播放并查看笔记" },
      { title: "8 分钟精听检测", content: "听两个短片段，写出转折词、核心观点和限制条件。", source: "根据个人听力记录生成", action: "practice", actionLabel: "开始检测" },
    ],
  },
  other: {
    focus: "社会比较理论",
    progress: 60,
    evidence: "论文正在调用该理论 · 笔记中仍混淆向上比较与规范性影响",
    items: [
      { title: "社会比较的核心概念", content: "向上比较可能带来激励，也可能放大相对剥夺感；结果取决于个体是否认为差距可缩小，以及比较对象是否与自我高度相关。", source: "《社会心理学》第 183—193 页 · 3 条挂靠笔记", action: "notes", actionLabel: "查看原笔记" },
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
    { title: `${title}核心内容`, content: `已从课程资料中整理出“${title}”的定义、关键关系和典型使用条件。`, source: `${noteCount} 条课程笔记与对应原始资料`, action: "notes", actionLabel: "查看相关笔记" },
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
    return <article key={item.title} className={`rounded-2xl p-4 ${current ? "bg-[#F2F4FF]" : "bg-[#F7F8FB]"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${done ? "bg-[#E4F4EB] text-[#2F8963]" : current ? "bg-[#4D5CFF] text-white" : "bg-white text-[#7B8392]"}`}>{done ? <Check size={15}/> : <Icon size={15}/>}</span>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h4 className="text-[12px] font-bold text-[#343946]">{item.title}</h4>{current && <span className="rounded-full bg-white px-2 py-1 text-[7px] font-semibold text-[#5967D9]">接下来</span>}</div><p className="mt-2 text-[10px] leading-5 text-[#666F80]">{item.content}</p><p className="mt-2 text-[8px] text-[#9AA1AE]">{item.source}</p></div>
        <button onClick={() => setActiveAction({ item, completionId: completionKey(index) })} className="shrink-0 rounded-full bg-white px-3 py-2 text-[9px] font-semibold text-[#5967D9] shadow-sm transition hover:bg-[#4D5CFF] hover:text-white">{done ? "再看一次" : item.actionLabel}</button>
      </div>
    </article>;
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
          {relatedMistakes.length>0&&<div className="mt-6 border-t border-[#ECEEF3] pt-5"><div className="flex items-center gap-2"><NotebookTabs size={15} className="text-[#E0923B]"/><h3 className="text-[13px] font-bold text-[#2D3340]">错题本</h3><span className="rounded-full bg-[#FFF1E2] px-2 py-1 text-[8px] font-semibold text-[#AF691B]">{relatedMistakes.filter(mistake=>!completedActions.has(`mistake:${mistake.id}`)).length} 道待订正</span></div><div className="mt-3 space-y-2">{relatedMistakes.map(mistake=>{const done=completedActions.has(`mistake:${mistake.id}`);return <article key={mistake.id} className="flex items-start gap-3 rounded-2xl bg-[#FFF9F1] p-4"><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${done?"bg-[#E4F4EB] text-[#2F8963]":"bg-white text-[#C27A29]"}`}>{done?<Check size={14}/>:<PenLine size={14}/>}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h4 className="text-[11px] font-bold text-[#343946]">{mistake.title}</h4><span className="rounded-full bg-white px-2 py-1 text-[7px] font-semibold text-[#8A6B48]">{mistake.origin}</span></div><p className="mt-1.5 text-[9px] leading-5 text-[#707787]">上次错误：{mistake.cause}</p><p className="mt-1 text-[8px] text-[#A2A7B0]">{mistake.source}</p></div><button onClick={()=>setActiveAction({item:{title:mistake.title,content:mistake.content,source:mistake.source,action:"homework",actionLabel:"重新作答",origin:mistake.origin},completionId:`mistake:${mistake.id}`,topic:mistake.topic})} className="shrink-0 rounded-full bg-white px-3 py-2 text-[9px] font-semibold text-[#B16B1C] shadow-sm">{done?"再做一次":"重新作答"}</button></article>})}</div></div>}
          <div className="mt-6 space-y-3">{items.map((item,index)=>({item,index})).filter(entry=>entry.item.action==="practice").map(entry=>renderReviewItem(entry.item,entry.index))}</div>
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
