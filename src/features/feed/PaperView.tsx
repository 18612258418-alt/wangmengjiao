import { BookOpen, Check, ChevronRight, Clock3, FileText, Lightbulb, Link2, ListChecks } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { imgNotesBg } from "../../data/initialData";

type LinkedNote = { card: CardData; date: string; simulated?: boolean };

const simulatedNotes: LinkedNote[] = [
  {
    date: "20260912", simulated: true,
    card: {
      id: "paper-demo-1", title: "记忆：短视频算法推荐与沉浸式使用", source: "browser", time: "19:20", img: imgNotesBg,
      detailIntro: "算法推荐通过连续反馈塑造个性化内容流，可能延长使用时长并降低消费决策中的反思时间。",
      detailSections: [
        { title: "核心概念", items: ["沉浸式使用强调注意力持续投入与时间感知减弱", "推荐算法依据停留、互动和购买行为不断调整内容"] },
        { title: "论文用途", items: ["可作为自变量“短视频使用强度”的理论依据", "需要区分主动搜索与被动推荐两类使用行为"] },
      ],
      aiKeyPoints: ["算法推荐", "沉浸式使用", "注意力机制"],
      sourceDocument: {
        type: "web", title: "推荐算法如何改变年轻人的内容消费", url: "https://example.com/recommendation-algorithms",
        author: "数字社会观察", publishedAt: "2026-03-18",
        excerpt: "平台以用户反馈训练推荐模型，连续、个性化的内容供给会重塑注意力分配与消费决策路径。",
        paragraphs: ["短视频推荐并非一次性排序，而是在每次停留、点赞、评论和跳出后持续更新用户画像。内容越贴合即时兴趣，用户越容易进入低成本、连续观看的状态。", "当商品展示被嵌入娱乐内容时，观看、种草与购买之间的边界会被压缩。研究需要同时观察使用时长、互动深度以及商业内容暴露频率。"],
      },
    },
  },
  {
    date: "20260914", simulated: true,
    card: {
      id: "paper-demo-2", title: "记忆：社会比较理论与青年消费", source: "notes", time: "21:05", img: imgNotesBg,
      detailIntro: "社会比较理论认为，个体会借助他人的生活方式评价自身状态，短视频中的理想化展示可能放大消费欲望。",
      detailSections: [
        { title: "理论路径", items: ["向上比较可能产生身份落差与补偿性消费", "同伴展示会影响大学生对“正常消费水平”的判断"] },
        { title: "研究假设", items: ["社会比较倾向可能中介短视频使用与冲动消费的关系", "自我控制水平可能发挥调节作用"] },
      ],
      aiKeyPoints: ["社会比较", "补偿性消费", "中介效应"],
      sourceDocument: {
        type: "pdf", title: "社会比较视角下青年群体的消费行为研究", page: 6,
        author: "周明、李妍", publishedAt: "《青年研究》2025年第4期",
        excerpt: "向上社会比较可能通过身份落差与情绪补偿机制影响青年群体的非计划消费。",
        paragraphs: ["个体在信息环境中持续接触被筛选和美化的生活方式展示，会将其作为评价自身状态的参照。对资源有限的青年群体而言，这种比较容易产生相对剥夺感。", "消费可以成为缩小象征性差距的策略。研究发现，社会比较倾向越强，个体通过即时购买缓解负面情绪的可能性越高。"],
      },
    },
  },
  {
    date: "20260916", simulated: true,
    card: {
      id: "paper-demo-3", title: "记忆：冲动消费量表与问卷设计", source: "courseware", time: "15:40", img: imgNotesBg,
      detailIntro: "问卷可采用五点李克特量表测量冲动消费倾向，并通过预测试检验题项的可理解性。",
      detailSections: [
        { title: "变量测量", items: ["短视频使用强度：频率、时长、互动程度", "冲动消费：即时购买冲动、计划外购买与购买后悔"] },
        { title: "质量控制", items: ["先进行30份预测试并修订歧义题项", "设置反向题与最短答题时长排除低质量样本"] },
      ],
      aiKeyPoints: ["李克特量表", "预测试", "信效度"],
      sourceDocument: {
        type: "pdf", title: "大学生冲动消费倾向量表的修订与检验", page: 4,
        author: "王倩、赵宇", publishedAt: "《心理测量》2024年第2期",
        excerpt: "修订量表包含即时冲动、计划外购买和购买后认知三个维度，可用于大学生样本。",
        paragraphs: ["研究以五点李克特方式计分，首先通过项目分析剔除区分度不足的题项，再使用探索性因子分析检验维度结构。", "正式调查前应开展小样本预测试，重点检查题项表达、完成时长及反向题的理解情况。"],
      },
    },
  },
  {
    date: "20260918", simulated: true,
    card: {
      id: "paper-demo-4", title: "记忆：数字媒介研究的抽样与访谈方法", source: "courseware", time: "16:10", img: imgNotesBg,
      detailIntro: "针对大学生群体，可结合分层便利抽样与半结构访谈，在定量关系之外补充真实使用情境。",
      detailSections: [
        { title: "样本设计", items: ["按年级和专业类别设置样本配额", "问卷目标回收300份，访谈对象控制在12至15人"] },
        { title: "访谈重点", items: ["追问从观看内容到产生购买冲动的具体过程", "记录同伴评价、直播促销与算法重复曝光的影响"] },
      ],
      aiKeyPoints: ["分层抽样", "半结构访谈", "样本配额"],
      sourceDocument: {
        type: "web", title: "数字媒介使用研究：从问卷到半结构访谈", url: "https://example.com/digital-media-methods",
        author: "社会研究方法课堂", publishedAt: "2026-05-09",
        excerpt: "混合研究能在统计关系之外解释用户何时、为何受到数字媒介影响。",
        paragraphs: ["问卷适合测量变量之间的总体关系，访谈则用于还原具体过程。两者结合时，访谈提纲应围绕问卷中无法解释的异常或关键结果展开。", "大学生样本可按年级和专业类别设置配额，同时记录招募渠道，避免样本过度集中在单一社群。"],
      },
    },
  },
  {
    date: "20260920", simulated: true,
    card: {
      id: "paper-demo-5", title: "记忆：平台治理与大学生理性消费教育", source: "browser", time: "20:30", img: imgNotesBg,
      detailIntro: "研究建议可同时面向平台、学校与大学生个人，避免仅把冲动消费归因于个人自控不足。",
      detailSections: [
        { title: "实践建议", items: ["平台应提高商业内容标识清晰度并提供使用时长提醒", "高校可将媒介素养与消费教育纳入新生课程"] },
        { title: "研究边界", items: ["横截面问卷难以直接证明因果关系", "单一学校样本会限制结论的推广范围"] },
      ],
      aiKeyPoints: ["平台治理", "媒介素养", "理性消费"],
      sourceDocument: {
        type: "pdf", title: "平台经济背景下大学生理性消费教育路径", page: 9,
        author: "陈思远", publishedAt: "《高校教育管理》2025年第6期",
        excerpt: "大学生消费教育应从个体自控拓展至平台设计、商业内容识别与学校媒介素养培养。",
        paragraphs: ["将冲动消费完全归因于个人意志会忽略平台机制对注意力和选择环境的塑造。治理建议应覆盖商业标识、推荐透明度和使用提醒等环节。", "高校可通过真实案例训练学生识别软性广告、直播促销与分期消费风险，并将媒介素养纳入通识教育。"],
      },
    },
  },
];

const milestones = [
  { label: "确定选题", date: "9月18日", done: true },
  { label: "完成开题", date: "10月12日", current: true },
  { label: "收集数据", date: "11月20日" },
  { label: "论文初稿", date: "12月28日" },
];

const outline = [
  { chapter: "第一章 绪论", detail: "研究背景、研究意义、研究思路与方法", noteIndex: 0 },
  { chapter: "第二章 文献综述", detail: "短视频使用、冲动消费与社会比较研究", noteIndex: 1 },
  { chapter: "第三章 研究设计", detail: "研究假设、问卷设计、变量与样本说明", noteIndex: 2 },
  { chapter: "第四章 数据分析", detail: "描述性统计、信效度检验与回归分析", noteIndex: 3 },
  { chapter: "第五章 结论与建议", detail: "研究结论、实践建议、不足与展望", noteIndex: 4 },
];

const PAPER_TOPIC_KEYWORDS = ["短视频", "冲动消费", "社会比较", "问卷", "算法推荐", "数字媒介", "青年消费", "半结构访谈", "文献综述"];

function isRelevantPaperNote(card: CardData): boolean {
  const searchable = [
    card.title,
    card.overview,
    card.detailIntro,
    card.unifiedDetail,
    ...(card.aiKeyPoints ?? []),
  ].filter(Boolean).join(" ");
  return PAPER_TOPIC_KEYWORDS.some(keyword => searchable.includes(keyword));
}

export function PaperView({
  subject,
  feedGroups,
  onOpenNote,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onOpenNote?: (card: CardData, date: string) => void;
}) {
  const uploadedNotes = feedGroups.flatMap(group =>
    group.cards
      .filter(isRelevantPaperNote)
      .map(card => ({ card, date: group.date })),
  );
  const linkedNotes = [
    ...uploadedNotes,
    ...simulatedNotes.filter(example => !uploadedNotes.some(note => note.card.id === example.card.id)),
  ].slice(0, outline.length);
  const noteAt = (index: number) => linkedNotes[index % linkedNotes.length];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#F5F6FA] px-6 pb-8">
      <div className="mx-auto max-w-[1180px] space-y-4 pt-3">
        <section className="rounded-2xl border border-[#EAEDF2] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-lg bg-[#EEF0FF] px-2.5 py-1 text-[11px] font-semibold text-[#4D5CFF]">本科论文 · 开题阶段</span>
                <span className="text-[11px] text-[#9CA3AF]">{subject.short} · 大三上学期</span>
              </div>
              <h2 className="text-[20px] font-bold leading-8 text-[#020418]">短视频平台使用对大学生冲动消费行为的影响研究</h2>
              <p className="mt-1 text-[12px] text-[#7B8291]">学生：林晓雨 · 社会学 2023 级 · 指导教师：陈老师</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-[24px] font-bold text-[#4D5CFF]">35%</p>
              <p className="text-[11px] text-[#9CA3AF]">总体进度</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EEF0FF]">
            <div className="h-full w-[35%] rounded-full bg-[#4D5CFF]" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {milestones.map(item => (
              <div key={item.label} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${item.current ? "bg-[#F1F3FF]" : "bg-[#FAFAFC]"}`}>
                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${item.done ? "bg-[#4D5CFF] text-white" : item.current ? "border-2 border-[#4D5CFF] bg-white" : "border border-[#DDE0E7] bg-white"}`}>
                  {item.done && <Check size={12} />}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-[11px] font-semibold ${item.current ? "text-[#4D5CFF]" : "text-[#41464F]"}`}>{item.label}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DDE1FF] bg-gradient-to-r from-[#F7F8FF] to-white p-5">
          <div className="flex items-center gap-2"><Lightbulb size={17} className="text-[#4D5CFF]"/><h3 className="text-[15px] font-bold text-[#020418]">问题演化与关键判断</h3><span className="ml-auto text-[10px] text-[#8A909C]">AI 根据阅读、讨论和修改记录整理</span></div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[["最初问题","短视频使用是否会直接导致冲动消费？","9 月 3 日 · 课堂观察"],["理解变化","仅看使用时长解释不足，引入沉浸式使用与社会比较。","9 月 14 日 · 2 篇文献"],["当前问题","社会比较是否发挥中介作用，自我控制是否构成边界条件？","9 月 22 日 · 导师讨论"]].map((x,i)=><div key={x[0]} className={`rounded-xl border p-4 ${i===2?"border-[#BEC5FF] bg-white":"border-[#EAEDF2] bg-white/70"}`}><small className="font-semibold text-[#4D5CFF]">{x[0]}</small><p className="mt-2 text-[12px] leading-5 text-[#41464F]">{x[1]}</p><p className="mt-3 text-[10px] text-[#9CA3AF]">{x[2]}</p></div>)}
          </div>
          <div className="mt-3 flex items-center rounded-xl bg-white p-4"><div className="min-w-0 flex-1"><b className="text-[12px]">关键判断：暂将社会比较设为中介变量</b><p className="mt-1 text-[11px] text-[#7B8291]">支持：3 条知识、2 份原文　·　保留异议：作用可能只在低自尊群体中成立</p></div><LinkedNoteButton note={noteAt(1)} onOpenNote={onOpenNote}/></div>
        </section>

        <div>
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#EAEDF2] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText size={17} className="text-[#4D5CFF]" />
                <h3 className="text-[15px] font-bold text-[#020418]">开题报告</h3>
                <span className="ml-auto rounded-full bg-[#FFF7E8] px-2.5 py-1 text-[11px] font-semibold text-[#D97706]">待导师确认</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ProposalCard icon={<Lightbulb size={15} />} title="研究问题" text="短视频的沉浸式使用是否会增强大学生的冲动消费倾向？社会比较在其中发挥怎样的作用？" note={noteAt(0)} onOpenNote={onOpenNote} />
                <ProposalCard icon={<BookOpen size={15} />} title="研究意义" text="补充数字媒介与青年消费行为研究，并为大学生理性消费教育提供可操作的建议。" note={noteAt(1)} onOpenNote={onOpenNote} />
                <ProposalCard icon={<ListChecks size={15} />} title="研究方法" text="问卷调查 300 份，结合半结构访谈；使用 SPSS 完成描述统计、信效度与回归分析。" note={noteAt(2)} onOpenNote={onOpenNote} />
                <ProposalCard icon={<Clock3 size={15} />} title="研究安排" text="10 月完成开题，11 月收集数据，12 月完成分析与初稿，次年 3 月定稿。" note={noteAt(3)} onOpenNote={onOpenNote} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#EAEDF2] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks size={17} className="text-[#4D5CFF]" />
                  <h3 className="text-[15px] font-bold text-[#020418]">论文大纲与文献笔记</h3>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">共挂靠 {new Set(outline.map(item => noteAt(item.noteIndex).card.id)).size} 条笔记</span>
              </div>
              <div className="divide-y divide-[#F0F1F5]">
                {outline.map((item, index) => {
                  const note = noteAt(item.noteIndex);
                  return (
                    <div key={item.chapter} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#F5F6FA] text-[11px] font-bold text-[#7B8291]">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#020418]">{item.chapter}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#9CA3AF]">{item.detail}</p>
                      </div>
                      <div className="flex w-[260px] flex-shrink-0 items-center justify-end gap-2">
                        <LinkedNoteButton note={note} onOpenNote={onOpenNote} compact />
                      </div>
                      <ChevronRight size={15} className="text-[#C6CAD2]" />
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ icon, title, text, note, onOpenNote }: { icon: React.ReactNode; title: string; text: string; note: LinkedNote; onOpenNote?: (card: CardData, date: string) => void }) {
  return (
    <div className="rounded-xl border border-[#EEF0F4] bg-[#FAFAFC] p-4">
      <div className="mb-2 flex items-center gap-2 text-[#4D5CFF]">{icon}<p className="text-[12px] font-bold text-[#41464F]">{title}</p></div>
      <p className="text-[12px] leading-5 text-[#7B8291]">{text}</p>
      <div className="mt-3"><LinkedNoteButton note={note} onOpenNote={onOpenNote} /></div>
    </div>
  );
}

function LinkedNoteButton({ note, onOpenNote, compact = false }: { note: LinkedNote; onOpenNote?: (card: CardData, date: string) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpenNote?.(note.card, note.date)}
      className={`inline-flex max-w-full items-center gap-1 rounded-lg border border-[#DCE0FF] bg-white text-[#4D5CFF] hover:bg-[#EEF0FF] ${compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[10px]"}`}
      title={note.card.title}
    >
      <Link2 size={11} />
      <span className={compact ? "max-w-[215px] truncate" : "max-w-[190px] truncate"}>{note.card.title.replace(/^记忆：/, "")}</span>
    </button>
  );
}
