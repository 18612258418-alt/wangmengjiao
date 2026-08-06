import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, LoaderCircle, Plus } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { imgNotesBg } from "../../data/initialData";
import { getSubjectSyllabus, type SyllabusNode } from "../../data/subjectSyllabi";
import {
  cardsForSyllabusEntry,
  collectUnmappedNoteCards,
  syllabusEntryHasCards,
  syllabusEntryHasUnread,
} from "../../utils/syllabusNotes";
import { dedupeCardsBySourceAnchor } from "../../utils/memoryRecall";

const UPLOADED_TOPIC_PREFIX = "__uploaded_topic__";

type ReferenceResource = {
  card: CardData;
  topicIds: string[];
  typeLabel: string;
  location: string;
};

function referenceResources(subject: SubjectData): ReferenceResource[] {
  if (subject.id === "other") {
    return [
      {
        topicIds: ["soc-1-1"],
        typeLabel: "教材",
        location: "第二章 P32–51",
        card: {
          id: "resource-macroeconomics-book",
          title: "《西方经济学（宏观部分）》",
          source: "book",
          time: "本学期使用",
          img: imgNotesBg,
          detailIntro: "课程参考教材。打开后可按页查看原文，并回到笔记中的引用位置。",
          detailSections: [
            { title: "本章阅读", items: ["国民收入核算", "GDP 支出法与净出口"] },
            { title: "对应笔记", items: ["净出口（NX）的概念", "GDP 支出法核算"] },
          ],
          aiKeyPoints: ["GDP 核算", "净出口", "国民收入"],
          hasAnnotations: false,
          sourceDocument: {
            type: "pdf",
            title: "西方经济学（宏观部分）第八版.pdf",
            author: "高鸿业 主编",
            publishedAt: "2021",
            page: 32,
            paragraphs: [
              "本页讨论国民收入核算。支出法从消费、投资、政府购买和净出口四部分计算国内生产总值。",
              "净出口等于出口减进口；进口商品不属于本国生产，因此需要从总支出中扣除。",
            ],
          },
          learningContext: {
            course: "社会科学",
            chapter: "GDP 的含义与核算",
            sourceRole: "teacher",
            capabilities: { knowledgeMap: true, interactive: false },
          },
        },
      },
      {
        topicIds: ["soc-1-1"],
        typeLabel: "课程资料",
        location: "第 3 讲 · 第 8–19 页",
        card: {
          id: "resource-gdp-courseware",
          title: "《GDP 核算与宏观经济指标》",
          source: "courseware",
          time: "课程教师下发",
          img: imgNotesBg,
          detailIntro: "本课程使用的课堂讲义。打开后可查看课件原页及对应笔记。",
          detailSections: [
            { title: "讲义内容", items: ["支出法：GDP = C + I + G + NX", "名义 GDP 与实际 GDP"] },
            { title: "对应笔记", items: ["净出口（NX）的概念"] },
          ],
          aiKeyPoints: ["GDP", "名义 GDP", "实际 GDP", "净出口"],
          hasAnnotations: false,
          sourceDocument: {
            type: "pdf",
            title: "第3讲_GDP核算与宏观经济指标.pdf",
            author: "课程教师",
            page: 8,
            paragraphs: [
              "支出法核算恒等式为 GDP = C + I + G + NX，其中 NX 为出口与进口之差。",
              "名义 GDP 使用当期价格，实际 GDP 使用基期价格，以减少价格变动对产出比较的影响。",
            ],
          },
          learningContext: {
            course: "社会科学",
            chapter: "GDP 的含义与核算",
            sourceRole: "teacher",
            capabilities: { knowledgeMap: true, interactive: false },
          },
        },
      },
    ];
  }
  return [];
}

function firstTopicWithCards(nodes: SyllabusNode[], feedGroups: FeedGroup[]) {
  return nodes.find(node => node.kind === "topic" && syllabusEntryHasCards(feedGroups, node.id))?.id
    ?? nodes.find(node => node.kind === "topic")?.id
    ?? null;
}

function normalizedKnowledgeText(value: string) {
  return value.replace(/[\s（）()·\-—_：:，,。.、]/g, "").toLowerCase();
}

function uploadedTopicParentChapter(
  card: CardData,
  subjectId: string,
  nodes: SyllabusNode[],
): string | null {
  const sourceText = normalizedKnowledgeText([
    card.title,
    card.learningContext?.chapter,
    card.ingestionDecision?.chapterTitle,
    ...(card.ingestionDecision?.knowledgePoints ?? []),
    ...(card.knowledgeTree?.map(node => node.label) ?? []),
  ].filter(Boolean).join(" "));

  if (subjectId === "physics") {
    if (/交流电|变压器/.test(sourceText)) return "phy-ch4";
    if (/光电|量子|相对论|原子/.test(sourceText)) return "phy-ch3";
    if (/静电|电势|电场|磁场|电磁|楞次|感应/.test(sourceText)) return "phy-ch2";
    if (/力学|运动|牛顿|动量|机械能|万有引力|振动|波动|阻尼|共振/.test(sourceText)) return "phy-ch1";
  }
  if (subjectId === "math") {
    if (/曲线积分|曲面积分|重积分|多元函数|格林公式|高斯公式|斯托克斯/.test(sourceText)) return "math-ch6";
    if (/不定积分|定积分|换元积分|分部积分/.test(sourceText)) return "math-ch3";
    if (/导数|微分|中值定理|泰勒/.test(sourceText)) return "math-ch2";
    if (/极限|连续/.test(sourceText)) return "math-ch1";
  }

  const chapters = nodes.filter(node => node.kind === "chapter");
  const explicitChapter = normalizedKnowledgeText(
    card.learningContext?.chapter ?? card.ingestionDecision?.chapterTitle ?? "",
  );
  return chapters.find(chapter => {
    const chapterTitle = normalizedKnowledgeText(chapter.title);
    return explicitChapter.length >= 2
      && (explicitChapter.includes(chapterTitle) || chapterTitle.includes(explicitChapter));
  })?.id ?? null;
}

function insertUploadedTopics(
  baseNodes: SyllabusNode[],
  unmappedNotes: ReturnType<typeof collectUnmappedNoteCards>,
  subjectId: string,
): SyllabusNode[] {
  const topicsByChapter = new Map<string, SyllabusNode[]>();
  const unassigned: SyllabusNode[] = [];
  unmappedNotes.forEach(({ card }) => {
    const topic: SyllabusNode = {
      id: `${UPLOADED_TOPIC_PREFIX}${card.id}`,
      kind: "topic",
      title: card.title.replace(/^记忆[：:]\s*/, ""),
    };
    const chapterId = uploadedTopicParentChapter(card, subjectId, baseNodes);
    if (!chapterId) {
      unassigned.push(topic);
      return;
    }
    topicsByChapter.set(chapterId, [...(topicsByChapter.get(chapterId) ?? []), topic]);
  });

  const result: SyllabusNode[] = [];
  let activeChapterId: string | null = null;
  baseNodes.forEach((node, index) => {
    if (node.kind === "chapter") activeChapterId = node.id;
    result.push(node);
    const next = baseNodes[index + 1];
    const isChapterEnd = node.kind === "topic" && (!next || next.kind === "chapter");
    if (isChapterEnd && activeChapterId) {
      const uploadedTopics = topicsByChapter.get(activeChapterId) ?? [];
      const numbering = node.title.match(/^(\d+)\.(\d+)/);
      result.push(...uploadedTopics.map((topic, offset) => ({
        ...topic,
        title: numbering && !/^\d+\.\d+/.test(topic.title)
          ? `${numbering[1]}.${Number(numbering[2]) + offset + 1} ${topic.title}`
          : topic.title,
      })));
    }
  });
  if (unassigned.length) {
    result.push(
      { id: "__uploaded_chapter_pending__", kind: "chapter", title: "待确认章节" },
      ...unassigned,
    );
  }
  return result;
}

type PracticeQuestion = {
  id: string;
  category: "课后题" | "类似题" | "举一反三";
  question: string;
  answer: string;
};

function practiceSetForTopic(title: string | null): PracticeQuestion[] {
  if (/振动|受迫|阻尼/.test(title ?? "")) {
    return [
      {
        id: "after-1",
        category: "课后题",
        question: "写出有阻尼受迫振动的动力学方程，并说明方程中各项对应的物理作用。",
        answer: "m·x'' + b·x' + kx = F₀cos(ωt)。三项分别表示惯性力、阻尼力与弹性恢复力，右侧为周期性驱动力。",
      },
      {
        id: "after-2",
        category: "课后题",
        question: "当驱动力频率逐渐接近系统固有频率时，稳态振幅如何变化？阻尼增大又会产生什么影响？",
        answer: "频率接近共振频率时振幅达到峰值；阻尼越大，峰值越低、共振曲线越宽，共振频率也会略低于无阻尼固有频率。",
      },
      {
        id: "similar-1",
        category: "类似题",
        question: "质量 m=1 kg、劲度系数 k=100 N/m 的振子，在角频率 8 rad/s 的驱动力作用下振动。先求无阻尼固有角频率，再判断是否接近共振。",
        answer: "固有角频率 ω₀=√(k/m)=10 rad/s。驱动频率 8 rad/s 低于 10 rad/s，尚未达到共振，但已进入接近共振的频段。",
      },
      {
        id: "similar-2",
        category: "类似题",
        question: "在稳态受迫振动中，低频、共振附近和高频三个区域里，位移相对驱动力的相位差分别有什么趋势？",
        answer: "低频时相位差接近 0；共振附近接近 π/2；高频时趋近 π。",
      },
      {
        id: "transfer-1",
        category: "举一反三",
        question: "把机械受迫振动类比到 RLC 串联电路，分别指出质量、阻尼、劲度和驱动力对应的电学量。",
        answer: "质量 m 对应电感 L，阻尼 b 对应电阻 R，劲度 k 对应电容倒数 1/C，外驱动力对应交流电源电压，位移可类比电荷量。",
      },
      {
        id: "transfer-2",
        category: "举一反三",
        question: "一座人行桥出现明显周期性晃动。请用受迫振动知识提出两项工程改进，并说明依据。",
        answer: "可增加阻尼装置以降低共振峰值；也可改变结构质量或刚度，使固有频率避开行人步频。两者分别对应增大阻尼和调整固有频率。",
      },
    ];
  }
  const topic = title ?? "当前知识点";
  return [
    { id: "after-1", category: "课后题", question: `用自己的话解释“${topic}”的定义和适用条件。`, answer: "回答应包含准确的定义、成立条件和至少一个典型例子。" },
    { id: "after-2", category: "课后题", question: `列出“${topic}”中最容易混淆的两个概念，并比较区别。`, answer: "应从定义、判断条件和应用场景三个方面进行比较。" },
    { id: "similar-1", category: "类似题", question: `换一个具体情境，判断其中是否使用了“${topic}”，并说明理由。`, answer: "先提取情境条件，再逐项与知识点成立条件对应。" },
    { id: "similar-2", category: "类似题", question: `根据“${topic}”设计一道包含一个干扰条件的判断题并作答。`, answer: "答案需指出有效条件和干扰条件分别是什么。" },
    { id: "transfer-1", category: "举一反三", question: `把“${topic}”与本课程另一个知识点建立联系。`, answer: "说明两者的前置关系、共同变量或可相互推导的部分。" },
    { id: "transfer-2", category: "举一反三", question: `说明“${topic}”在真实学习、实验或工程场景中的一种应用。`, answer: "应用需要包含场景、使用方式和结果判断。" },
  ];
}

export function SyllabusNotesView({
  subject,
  feedGroups,
  onOpenCard,
  onOpenEntry,
  onMarkCardRead,
  onJudgeAnswer,
  onAddSource,
  initialEntryId,
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onOpenCard: (card: CardData, date: string) => void;
  onOpenEntry?: (entryId: string) => void;
  onMarkCardRead?: (card: CardData, date: string) => void;
  onJudgeAnswer?: (
    question: string,
    referenceAnswer: string,
    userAnswer: string,
  ) => Promise<{ correct: boolean; feedback: string }>;
  onAddSource?: () => void;
  newCardId: string | null;
  initialEntryId?: string | null;
}) {
  const syllabusSubjectId = useMemo(() => {
    if (/物理/.test(subject.short) && !/实验/.test(subject.short)) return "physics";
    if (/大学英语|英语/.test(subject.short)) return "english";
    if (/大学化学|化学/.test(subject.short)) return "chemistry";
    return subject.id;
  }, [subject.id, subject.short]);
  const unmappedNotes = useMemo(
    () => collectUnmappedNoteCards(feedGroups),
    [feedGroups],
  );
  const syllabus = useMemo(() => {
    const base = getSubjectSyllabus(syllabusSubjectId);
    if (!base) {
      if (unmappedNotes.length === 0) return null;
      return {
        overviewTitle: `${subject.short}知识结构`,
        nodes: insertUploadedTopics([], unmappedNotes, syllabusSubjectId),
      };
    }
    if (unmappedNotes.length === 0) return base;
    return {
      ...base,
      nodes: insertUploadedTopics(base.nodes, unmappedNotes, syllabusSubjectId),
    };
  }, [syllabusSubjectId, subject.short, unmappedNotes]);
  const resources = useMemo(() => referenceResources(subject), [subject]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [practiceGenerated, setPracticeGenerated] = useState(false);
  const [practiceVisible, setPracticeVisible] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [practiceResults, setPracticeResults] = useState<Record<string, { correct: boolean; feedback: string }>>({});
  const [judgingQuestionId, setJudgingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!syllabus) {
      setSelectedEntryId(null);
      return;
    }
    if (initialEntryId && syllabus.nodes.some(node => node.id === initialEntryId)) {
      setSelectedEntryId(initialEntryId);
      return;
    }
    setSelectedEntryId(previous =>
      previous && syllabus.nodes.some(node => node.id === previous)
        ? previous
        : (unmappedNotes[0]
          ? `${UPLOADED_TOPIC_PREFIX}${unmappedNotes[0].card.id}`
          : firstTopicWithCards(syllabus.nodes, feedGroups)),
    );
  }, [subject.id, syllabus, feedGroups, unmappedNotes, initialEntryId]);

  useEffect(() => {
    setPracticeGenerated(false);
    setPracticeVisible(false);
    setPracticeAnswers({});
    setPracticeResults({});
    setJudgingQuestionId(null);
    setSelectedConcept(null);
  }, [selectedEntryId]);

  const selectedCards = useMemo(
    () => dedupeCardsBySourceAnchor(
      selectedEntryId?.startsWith(UPLOADED_TOPIC_PREFIX)
        ? unmappedNotes.filter(({ card }) => `${UPLOADED_TOPIC_PREFIX}${card.id}` === selectedEntryId)
        : (selectedEntryId ? cardsForSyllabusEntry(feedGroups, selectedEntryId) : []),
    ),
    [feedGroups, selectedEntryId, unmappedNotes],
  );
  const selectedResources = useMemo(
    () => resources.filter(resource => selectedEntryId && resource.topicIds.includes(selectedEntryId)),
    [resources, selectedEntryId],
  );
  const selectedTitle = syllabus?.nodes.find(node => node.id === selectedEntryId)?.title ?? null;
  const hasContent = selectedCards.length + selectedResources.length > 0;
  const concepts = useMemo(() => {
    if (selectedEntryId === "soc-1-1") {
      return [
        { label: "GDP", description: "一定时期内，一国境内生产的最终商品和服务的市场价值。" },
        { label: "支出法", description: "从消费、投资、政府购买和净出口四部分计算 GDP，即 GDP = C + I + G + NX。" },
        { label: "净出口", description: "出口减进口，记作 NX；进口不属于本国生产，因此需要从总支出中扣除。" },
        { label: "名义 GDP 与实际 GDP", description: "名义 GDP 使用当期价格，实际 GDP 使用基期价格；后者更适合比较不同时期的实际产出。" },
      ];
    }
    const cards = [...selectedCards.map(item => item.card), ...selectedResources.map(item => item.card)];
    const labels = [...new Set(cards.flatMap(card => card.aiKeyPoints ?? []))]
      .filter(label => label.length <= 24)
      .slice(0, 6);
    return labels.map(label => {
      const related = cards.flatMap(card => card.detailSections ?? [])
        .flatMap(section => section.items)
        .find(item => item.includes(label));
      return {
        label,
        description: related ?? `这是理解“${selectedTitle ?? "当前知识点"}”时需要掌握的组成概念。`,
      };
    });
  }, [selectedCards, selectedResources, selectedEntryId, selectedTitle]);
  const intro = useMemo(() => {
    if (selectedEntryId === "soc-1-1") {
      return "GDP衡量一定时期内一国境内生产的最终商品和服务的市场价值。按支出法，GDP = C + I + G + NX，其中净出口 NX 等于出口减进口。名义 GDP 使用当期价格，实际 GDP 使用基期价格，比较经济产出时需要区分价格变化与产量变化。";
    }
    const summaries = [
      ...selectedCards.map(({ card }) => card.overview ?? card.detailIntro),
      ...selectedResources.map(resource => resource.card.detailIntro ?? resource.card.overview),
    ].filter((value): value is string => Boolean(value?.trim()));
    const uniqueSummaries = [...new Set(summaries)];
    if (uniqueSummaries.length === 0) return "";
    if (uniqueSummaries.length === 1) return uniqueSummaries[0];
    return uniqueSummaries.join(" ");
  }, [selectedCards, selectedResources, selectedEntryId]);
  const practiceQuestions = useMemo(() => practiceSetForTopic(selectedTitle), [selectedTitle]);

  const downloadPractice = () => {
    const content = [
      `${selectedTitle ?? "知识点"} · 练习题`,
      "",
      ...practiceQuestions.flatMap((item, index) => [
        `${index + 1}. [${item.category}] ${item.question}`,
        "",
      ]),
      "—— 参考答案 ——",
      "",
      ...practiceQuestions.flatMap((item, index) => [
        `${index + 1}. ${item.answer}`,
        "",
      ]),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTitle ?? "知识点"}-练习题.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const judgePracticeAnswer = async (item: PracticeQuestion) => {
    const userAnswer = practiceAnswers[item.id]?.trim();
    if (!userAnswer) return;
    setJudgingQuestionId(item.id);
    try {
      const result = onJudgeAnswer
        ? await onJudgeAnswer(item.question, item.answer, userAnswer)
        : {
          correct: userAnswer.length >= 20,
          feedback: userAnswer.length >= 20
            ? "回答覆盖了主要思路，可再对照参考答案补充关键条件。"
            : "回答过于简略，请补充核心公式、判断依据或推导过程。",
        };
      setPracticeResults(previous => ({ ...previous, [item.id]: result }));
    } finally {
      setJudgingQuestionId(null);
    }
  };

  if (!syllabus) {
    return <div className="flex-1 grid place-items-center text-[14px] text-[#9CA3AF]">{subject.short}暂未设置课程知识结构</div>;
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-[#F5F6FA]">
      <aside className="flex w-[clamp(230px,27%,310px)] flex-shrink-0 flex-col border-r border-[#EAEDF2]">
        <header className="border-b border-[#EAEDF2] px-6 py-4">
          <h2 className="text-[14px] font-bold text-[#020418]">{syllabus.overviewTitle}</h2>
        </header>
        <nav className="flex-1 overflow-y-auto px-4 py-3">
          {syllabus.nodes.map(node => {
            if (node.kind === "chapter") {
              return <p key={node.id} className="px-2 pb-1 pt-4 text-[11px] font-semibold text-[#9CA3AF]">{node.title}</p>;
            }
            const uploadedNote = node.id.startsWith(UPLOADED_TOPIC_PREFIX)
              ? unmappedNotes.find(({ card }) => `${UPLOADED_TOPIC_PREFIX}${card.id}` === node.id)
              : undefined;
            const active = selectedEntryId === node.id;
            const unread = uploadedNote?.card.unread === true || syllabusEntryHasUnread(feedGroups, node.id);
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  setSelectedEntryId(node.id);
                  if (uploadedNote) onMarkCardRead?.(uploadedNote.card, uploadedNote.date);
                  else onOpenEntry?.(node.id);
                }}
                className={`my-0.5 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                  active ? "bg-[#EEF0FF] text-[#4D5CFF]" : "text-[#41464F] hover:bg-white"
                }`}
              >
                <span className="min-w-0 flex-1 text-[12px] font-medium">{node.title}</span>
                {unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#20B486]" aria-label="未读" />}
                <ChevronRight size={14} className={active ? "text-[#4D5CFF]" : "text-[#C5CAD6]"} />
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-3xl">
          <header className="mb-4">
            <h1 className="text-[18px] font-bold text-[#020418]">{selectedTitle ?? "请选择一个知识点"}</h1>
            {hasContent && (
              <p className="mt-1 text-[11px] text-[#7B8291]">
                整理自 {selectedCards.length} 条笔记和 {selectedResources.length} 份参考资料
              </p>
            )}
          </header>

          {!hasContent ? (
            <section className="rounded-2xl border border-dashed border-[#DDE1EA] bg-white px-6 py-10 text-center">
              <h2 className="text-[14px] font-bold text-[#020418]">这个知识点还没有学习内容</h2>
              <p className="mx-auto mt-2 max-w-sm text-[11px] leading-5 text-[#7B8291]">
                添加课件、书籍、课堂记录或自己的笔记后，这里会按内容整理重点，并保留原文位置。
              </p>
              <button
                type="button"
                onClick={onAddSource}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#EEF0FF] px-4 py-2.5 text-[11px] font-semibold text-[#4D5CFF]"
              >
                <Plus size={14} /> 添加资料或笔记
              </button>
            </section>
          ) : (
            <div className="space-y-3">
              <section className="rounded-2xl border border-[#EAEDF2] bg-white p-4">
                <h2 className="text-[12px] font-bold text-[#020418]">核心理解</h2>
                <p className="mt-2 text-[11px] leading-6 text-[#596170]">{intro}</p>
              </section>

              <section className="rounded-2xl border border-[#EAEDF2] bg-white p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-[12px] font-bold text-[#020418]">需要掌握</h2>
                    <p className="mt-1 text-[9px] text-[#9CA3AF]">点击概念查看解释</p>
                  </div>
                  <span className="text-[9px] text-[#9CA3AF]">{concepts.length} 个概念</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {concepts.map(concept => (
                    <button
                      type="button"
                      key={concept.label}
                      onClick={() => setSelectedConcept(current => current === concept.label ? null : concept.label)}
                      className={`rounded-lg border px-3 py-1.5 text-[10px] transition-colors ${
                        selectedConcept === concept.label
                          ? "border-[#C9CFFF] bg-[#EEF0FF] font-semibold text-[#4D5CFF]"
                          : "border-transparent bg-[#F2F4F8] text-[#41464F] hover:border-[#DDE1EA]"
                      }`}
                    >
                      {concept.label}
                    </button>
                  ))}
                </div>
                {selectedConcept && (() => {
                  const concept = concepts.find(item => item.label === selectedConcept);
                  if (!concept) return null;
                  return (
                    <div className="mt-3 rounded-xl border border-[#E2E5FF] bg-[#F9F9FF] p-3">
                      <p className="text-[11px] font-bold text-[#020418]">{concept.label}</p>
                      <p className="mt-1.5 text-[10px] leading-5 text-[#596170]">{concept.description}</p>
                      <p className="mt-2 text-[9px] text-[#9CA3AF]">
                        来自当前知识点的 {selectedCards.length} 条笔记和 {selectedResources.length} 份参考资料
                      </p>
                    </div>
                  );
                })()}
              </section>

              <section className="rounded-2xl border border-[#EAEDF2] bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[12px] font-bold text-[#020418]">笔记与参考资料</h2>
                  <span className="text-[9px] text-[#9CA3AF]">可查看笔记或原文</span>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedCards.map(({ card, date }) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => onOpenCard(card, date)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[#EAEDF2] bg-[#FAFAFC] p-3 text-left hover:border-[#C9CFFF]"
                    >
                      {card.img && (
                        <img
                          src={card.img}
                          alt={card.title}
                          className="h-[54px] w-[76px] flex-shrink-0 rounded-lg border border-[#E5E8EF] bg-white object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[9px] font-semibold text-[#4D5CFF]">我的笔记</span>
                          {card.learningContext?.phase === "before_class" && (
                            <span className="rounded-md bg-[#E8EEFF] px-1.5 py-0.5 text-[9px] font-bold text-[#3E56E8]">预习</span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-[11px] font-bold text-[#020418]">{card.title}</span>
                        <span className="mt-1 block text-[9px] text-[#9CA3AF]">
                          {card.sourceAnchor?.fileName ?? "点击查看笔记原图与重点"}
                        </span>
                      </span>
                      <ChevronRight size={14} className="text-[#C5CAD6]" />
                    </button>
                  ))}
                  {selectedResources.map(resource => (
                    <button
                      key={resource.card.id}
                      type="button"
                      onClick={() => onOpenCard(resource.card, "20260727")}
                      className="flex w-full items-center justify-between rounded-xl border border-[#EAEDF2] bg-[#FAFAFC] p-3 text-left hover:border-[#C9CFFF]"
                    >
                      <span className="min-w-0">
                        <span className="text-[9px] font-semibold text-[#7B8291]">{resource.typeLabel} · {resource.location}</span>
                        <span className="mt-1 block truncate text-[11px] font-bold text-[#020418]">{resource.card.title}</span>
                      </span>
                      <ChevronRight size={14} className="text-[#C5CAD6]" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E2E5FF] bg-[#F9F9FF] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[12px] font-bold text-[#020418]">练一练</h2>
                    <p className="mt-1.5 text-[10px] leading-5 text-[#7B8291]">
                      生成课后题、类似题和举一反三，支持在线作答与 AI 判断。
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {practiceVisible && (
                      <button
                        type="button"
                        onClick={downloadPractice}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE1EA] bg-white px-3 py-2 text-[10px] font-semibold text-[#596170]"
                      >
                        <Download size={13} /> 下载题目
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!practiceGenerated) {
                          setPracticeGenerated(true);
                          setPracticeVisible(true);
                          setPracticeAnswers({});
                          setPracticeResults({});
                        } else {
                          setPracticeVisible(value => !value);
                        }
                      }}
                      className="rounded-xl border border-[#DDE2FF] bg-[#EEF0FF] px-4 py-2 text-[10px] font-semibold text-[#4D5CFF]"
                    >
                      {!practiceGenerated ? "生成练习" : practiceVisible ? "收起" : "展开"}
                    </button>
                  </div>
                </div>
                {practiceVisible && (
                  <div className="mt-4 space-y-3">
                    {practiceQuestions.map((item, index) => {
                      const result = practiceResults[item.id];
                      return (
                        <div key={item.id} className="rounded-xl border border-[#EAEDF2] bg-white p-4">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${
                              item.category === "课后题"
                                ? "bg-[#EEF0FF] text-[#4D5CFF]"
                                : item.category === "类似题"
                                  ? "bg-[#EAF8F4] text-[#168A68]"
                                  : "bg-[#FFF5E7] text-[#B56A12]"
                            }`}>
                              {item.category}
                            </span>
                            <span className="text-[9px] text-[#9CA3AF]">第 {index + 1} 题</span>
                          </div>
                          <p className="mt-3 text-[11px] font-semibold leading-6 text-[#020418]">{item.question}</p>
                          <textarea
                            value={practiceAnswers[item.id] ?? ""}
                            onChange={event => setPracticeAnswers(previous => ({
                              ...previous,
                              [item.id]: event.target.value,
                            }))}
                            placeholder="在这里写下你的答案或解题过程…"
                            className="mt-3 min-h-20 w-full resize-y rounded-xl border border-[#E2E5EC] bg-[#FAFAFC] p-3 text-[10px] leading-5 text-[#41464F] outline-none focus:border-[#AEB7FF]"
                          />
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-[9px] text-[#9CA3AF]">AI 会结合参考答案判断关键步骤</span>
                            <button
                              type="button"
                              disabled={!practiceAnswers[item.id]?.trim() || judgingQuestionId === item.id}
                              onClick={() => judgePracticeAnswer(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4D5CFF] px-3 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {judgingQuestionId === item.id && <LoaderCircle size={12} className="animate-spin" />}
                              提交判断
                            </button>
                          </div>
                          {result && (
                            <div className={`mt-3 rounded-lg p-3 ${
                              result.correct ? "bg-[#EEF9F5]" : "bg-[#FFF4F1]"
                            }`}>
                              <p className={`text-[10px] font-semibold ${
                                result.correct ? "text-[#13845F]" : "text-[#C6553D]"
                              }`}>
                                {result.correct ? "回答正确" : "还需要完善"}
                              </p>
                              <p className="mt-1 text-[10px] leading-5 text-[#596170]">{result.feedback}</p>
                              <details className="mt-2">
                                <summary className="cursor-pointer text-[9px] font-semibold text-[#4D5CFF]">查看参考答案</summary>
                                <p className="mt-2 text-[10px] leading-5 text-[#596170]">{item.answer}</p>
                              </details>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!onJudgeAnswer && (
                      <button
                        type="button"
                        onClick={downloadPractice}
                        className="w-full rounded-xl border border-[#DDE1EA] bg-white px-4 py-3 text-[10px] font-semibold text-[#596170]"
                      >
                        下载全部题目与参考答案
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
