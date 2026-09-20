import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Globe2,
  Mic,
  PenLine,
  PlayCircle,
  Search,
  Send,
  Sparkles,
  Wifi,
} from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { SOURCE_LIBRARY_ITEMS } from "../source/SourceLibraryView";

type SearchMode = "idle" | "thinking" | "answered";

type EvidenceItem = {
  id: string;
  kind: "memory" | "web";
  label: string;
  title: string;
  meta: string;
  sourceId?: string;
};

const suggestions = [
  { icon: Brain, text: "我最近总在什么地方出错？", hint: "发现学习规律" },
  { icon: FileText, text: "找我做错过的积分题", hint: "调用个人记忆" },
  { icon: BookOpen, text: "解释换元后为什么要改上下限", hint: "结合笔记回答" },
  { icon: Globe2, text: "找一个更直观的外部讲解", hint: "联网补充" },
];

function collectMatches(query: string, allFeedGroups: Record<string, FeedGroup[]>, subjects: SubjectData[]) {
  const normalized = query.toLowerCase();
  const tokens = normalized.split(/[\s，。？！、]+/).filter(token => token.length >= 2);
  const matches: Array<{ card: CardData; subject: string; date: string }> = [];

  for (const subject of subjects) {
    for (const group of allFeedGroups[subject.id] ?? []) {
      for (const card of group.cards) {
        const blob = [
          card.title,
          card.overview ?? "",
          card.detailIntro ?? "",
          ...(card.detailSections?.flatMap(section => [section.title, ...section.items]) ?? []),
          card.unifiedDetail ?? "",
        ].join(" ").toLowerCase();
        if (tokens.some(token => blob.includes(token))) {
          matches.push({ card, subject: subject.short, date: group.date });
        }
      }
    }
  }
  return matches.slice(0, 4);
}

function answerFor(query: string) {
  const asksErrors = /错误|错题|做错|薄弱|哪里.*错/.test(query);
  const asksFind = /找|在哪|之前|拍过|上周/.test(query);
  const asksExternal = /外部|联网|视频|网上|公开课|直观/.test(query);

  if (asksErrors) {
    return {
      title: "最近重复出现的是换元后的边界条件错误",
      body: "近 30 天的作业和在线作答中，你有 3 次在换元后沿用了原变量的上下限；其中 2 次发生在定积分题。现在最值得做的是重做一道典型错题，确认能否独立修改新区间。",
      personal: "这不是知识点没看过，而是解题过程里容易漏掉“变量变化后同步修改区间”这一步。上次复习时你仍使用过一次提示。",
      external: false,
    };
  }

  if (asksExternal) {
    return {
      title: "找到了更直观的图形解释，并保留了你的课程口径",
      body: "可以把换元理解成更换横轴的刻度：积分区域本身没有变化，但描述区域的变量变了，因此边界必须换成新变量对应的数值。",
      personal: "你的课堂笔记给出了公式步骤，但缺少图形解释。我保留老师使用的换元方法，并用外部公开课程补充直观理解。",
      external: true,
    };
  }

  if (asksFind) {
    return {
      title: "找到了与你描述最接近的 3 条记忆",
      body: "最相关的是《定积分与换元积分》第 6 次作业，其中第 3 题包含你圈画过的上下限修改步骤。下面同时保留了课堂笔记和教材位置，方便交叉查看。",
      personal: "我根据“积分、做错、最近”以及你的高数学习记录匹配，不要求文件名完全一致。",
      external: false,
    };
  }

  return {
    title: "换元后要改上下限，因为积分变量已经变化",
    body: "设 u = g(x) 后，积分应全部用 u 描述，包括被积函数、微分和积分区间。原来的 x 上下限需要分别代入 u = g(x)，得到新的 u 区间；如果保留原上下限，就混用了两套变量。",
    personal: "你在最近两次相关作业中都正确完成了换元，但有一次遗漏新区间。建议把“换变量—换微分—换上下限”作为固定检查顺序。",
    external: false,
  };
}

export function SearchOverlay({
  isOpen,
  onClose,
  allFeedGroups,
  subjects,
  onUpdateCard,
  onOpenSource,
}: {
  isOpen: boolean;
  onClose: () => void;
  allFeedGroups: Record<string, FeedGroup[]>;
  subjects: SubjectData[];
  onUpdateCard: (subjectId: string, date: string, cardId: string, updates: Partial<CardData>) => void;
  onOpenSource: (sourceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("idle");
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    void onUpdateCard;
  }, [onUpdateCard]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setFollowUp("");
    setSubmittedQuery("");
    setMode("idle");
    setNotice("");
    setSourcesOpen(true);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const memoryMatches = useMemo(
    () => collectMatches(submittedQuery, allFeedGroups, subjects),
    [submittedQuery, allFeedGroups, subjects],
  );
  const answer = useMemo(() => answerFor(submittedQuery), [submittedQuery]);

  const evidence = useMemo<EvidenceItem[]>(() => {
    const cardEvidence = memoryMatches.slice(0, 3).map(({ card, subject, date }) => ({
      id: card.id,
      kind: "memory" as const,
      label: subject,
      title: card.title,
      meta: `${date} · ${card.time || "个人记忆"}`,
    }));
    const fallback: EvidenceItem[] = [
      { id: "memory-note", kind: "memory", label: "课堂笔记", title: "定积分换元后的上下限处理", meta: "高等数学 · 9 月 12 日" },
      { id: "memory-homework", kind: "memory", label: "作业", title: "第 6 次作业 · 第 3 题", meta: "上次错误：沿用原变量区间" },
      { id: "memory-book", kind: "memory", label: "教材", title: "定积分的换元法", meta: "高等数学 · 第 184 页" },
    ];
    const personal = cardEvidence.length >= 2 ? cardEvidence : fallback;
    const web: EvidenceItem[] = answer.external ? [
      { id: "web-course", kind: "web", label: "公开课程", title: "用面积变换理解定积分换元", meta: "大学数学开放课程 · 8 分钟" },
      { id: "web-textbook", kind: "web", label: "开放教材", title: "Substitution in Definite Integrals", meta: "OpenStax Calculus · 已核对" },
    ] : [];
    return [...personal, ...web];
  }, [memoryMatches, answer.external]);

  if (!isOpen) return null;

  const submit = (nextQuery?: string) => {
    const value = (nextQuery ?? query).trim();
    if (!value) return;
    setQuery(value);
    setSubmittedQuery(value);
    setMode("thinking");
    setNotice("");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMode("answered"), 720);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-[#F4F5F9] text-[#171A24]">
      <style>{`
        @keyframes memoSearchEnter { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes memoPulse { 0%,100% { opacity:.38 } 50% { opacity:1 } }
        .memo-search-enter { animation: memoSearchEnter .2s ease-out both; }
      `}</style>

      <header className="flex h-[76px] shrink-0 items-center gap-4 border-b border-[#E5E8EF] bg-white px-6">
        <button onClick={onClose} aria-label="返回" className="grid h-10 w-10 place-items-center rounded-full text-[#5F6674] transition hover:bg-[#F1F3F7]">
          <ArrowLeft size={21} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><Sparkles size={18}/></span>
          <div className="min-w-0"><b className="block text-[14px]">Memo 搜索</b><span className="block truncate text-[10px] text-[#9299A6]">{mode === "answered" ? "已结合个人记忆完成回答，可继续追问" : mode === "thinking" ? "正在理解问题并调用相关记忆" : "描述印象、问题，或想完成的事"}</span></div>
        </div>
        <div className="hidden items-center gap-2 text-[11px] text-[#8A919E] md:flex">
          <Wifi size={14} className="text-[#6472F7]" />
          个人记忆优先 · 必要时联网
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {mode === "idle" && (
          <div className="memo-search-enter mx-auto max-w-[980px] px-7 py-12">
            <div className="rounded-[30px] bg-gradient-to-br from-[#EEF0FF] via-[#F7F6FF] to-white p-8 ring-1 ring-[#E6E8F4]">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4D5CFF] text-white shadow-lg shadow-[#4D5CFF]/20">
                <Sparkles size={23} />
              </div>
              <h1 className="mt-5 text-[27px] font-bold tracking-[-.03em]">你想找回什么，或者继续做什么？</h1>
              <p className="mt-2 text-[14px] leading-7 text-[#707786]">不需要记住文件名。描述一点印象、一个问题，或者你现在想完成的事。</p>
              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {suggestions.map(({ icon: Icon, text, hint }) => (
                  <button key={text} onClick={() => submit(text)} className="group flex items-center gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-[#E8EAF0] transition hover:-translate-y-0.5 hover:ring-[#C6CCFF] hover:shadow-md">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F0F2FF] text-[#5362F3]"><Icon size={19} /></span>
                    <span className="min-w-0"><b className="block text-[13px]">{text}</b><small className="mt-1 block text-[10px] text-[#969CAA]">{hint}</small></span>
                  </button>
                ))}
              </div>
            </div>

            <section className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold">可以从当前学习继续</h2>
                <span className="text-[10px] text-[#9AA0AC]">根据近期课程和使用记录</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {["重做定积分的 2 道错题", "继续阅读社会心理学第 183 页", "整理刚上传的物理实验笔记"].map((item, index) => (
                  <button key={item} onClick={() => submit(item)} className="rounded-2xl bg-white p-4 text-left ring-1 ring-[#E8EAF0] transition hover:ring-[#C6CCFF]">
                    <span className="text-[9px] font-semibold text-[#7780D5]">{index === 0 ? "建议继续" : index === 1 ? "最近阅读" : "待整理"}</span>
                    <b className="mt-2 block text-[12px] leading-5">{item}</b>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {mode === "thinking" && (
          <div className="mx-auto flex max-w-[820px] flex-col items-center px-6 py-24 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EAEDFF] text-[#4D5CFF]"><Sparkles size={25} /></div>
            <h2 className="mt-5 text-[18px] font-bold">正在理解你的问题</h2>
            <p className="mt-2 text-[12px] text-[#878E9C]">先查找你的笔记、作业和错题，再判断是否需要外部补充</p>
            <div className="mt-7 flex gap-2">{[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-[#6672F6]" style={{animation:`memoPulse 1s ${i * .18}s infinite`}} />)}</div>
          </div>
        )}

        {mode === "answered" && (
          <div className="memo-search-enter mx-auto max-w-[980px] px-7 py-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-semibold text-[#8A91A0]">你问</p>
                <h1 className="mt-1 text-[20px] font-bold leading-8">{submittedQuery}</h1>
              </div>
              <button onClick={() => { setMode("idle"); setQuery(""); }} className="shrink-0 rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-[#626A78] ring-1 ring-[#E4E7ED]">重新探索</button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
              <div className="space-y-5">
                <section className="rounded-[26px] bg-white p-6 ring-1 ring-[#E5E8EF]">
                  <div className="flex items-center gap-2 text-[#4D5CFF]"><Sparkles size={17}/><span className="text-[11px] font-bold">Memo 的判断</span></div>
                  <h2 className="mt-4 text-[20px] font-bold leading-8">{answer.title}</h2>
                  <p className="mt-3 text-[13px] leading-7 text-[#515866]">{answer.body}</p>
                </section>

                <section className="rounded-[26px] bg-gradient-to-br from-[#EEF0FF] to-[#F9F8FF] p-6 ring-1 ring-[#E1E4F8]">
                  <div className="flex items-center gap-2"><Brain size={17} className="text-[#5B68EE]"/><h3 className="text-[13px] font-bold">和你有关</h3></div>
                  <p className="mt-3 text-[12px] leading-6 text-[#5F6677]">{answer.personal}</p>
                </section>

                <section className="rounded-[26px] bg-white ring-1 ring-[#E5E8EF]">
                  <button onClick={() => setSourcesOpen(open => !open)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                    <span><b className="block text-[13px]">记忆依据</b><small className="mt-1 block text-[10px] text-[#949BA8]">{evidence.filter(item => item.kind === "memory").length} 条个人记忆{answer.external ? ` · ${evidence.filter(item => item.kind === "web").length} 条外部补充` : ""}</small></span>
                    {sourcesOpen ? <ChevronUp size={18} className="text-[#89909D]"/> : <ChevronDown size={18} className="text-[#89909D]"/>}
                  </button>
                  {sourcesOpen && <div className="border-t border-[#EDF0F4] p-3">
                    {evidence.map(item => (
                      <button key={item.id} onClick={() => item.sourceId ? onOpenSource(item.sourceId) : showNotice(item.kind === "web" ? "已打开外部原文预览" : "已定位到对应原文位置")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#F6F7FA]">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.kind === "web" ? "bg-[#EAF7F2] text-[#168A68]" : "bg-[#EEF0FF] text-[#4D5CFF]"}`}>{item.kind === "web" ? <Globe2 size={17}/> : <FileText size={17}/>}</span>
                        <span className="min-w-0 flex-1"><span className={`text-[9px] font-bold ${item.kind === "web" ? "text-[#178568]" : "text-[#6570D6]"}`}>{item.kind === "web" ? "外部补充" : item.label}</span><b className="mt-0.5 block truncate text-[11px]">{item.title}</b><small className="mt-1 block truncate text-[9px] text-[#969DA9]">{item.meta}</small></span>
                        <ExternalLink size={14} className="text-[#A7ADB7]"/>
                      </button>
                    ))}
                  </div>}
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-[24px] bg-[#1E2230] p-5 text-white">
                  <p className="text-[10px] font-semibold text-[#AEB5C8]">检索范围</p>
                  <div className="mt-4 space-y-3 text-[11px]">
                    <div className="flex items-center gap-2"><Check size={14} className="text-[#8F9AFF]"/>高等数学个人记忆</div>
                    <div className="flex items-center gap-2"><Check size={14} className="text-[#8F9AFF]"/>近 30 天作业与错题</div>
                    <div className="flex items-center gap-2">{answer.external ? <Check size={14} className="text-[#6DDBB7]"/> : <span className="h-3.5 w-3.5 rounded-full border border-[#697081]"/>}公开网络资源</div>
                  </div>
                  {!answer.external && <button onClick={() => submit("找一个更直观的外部讲解")} className="mt-5 w-full rounded-full bg-white/10 py-2.5 text-[10px] font-semibold text-[#D7DBE7] transition hover:bg-white/15">补充外部解释</button>}
                </section>

                <section className="rounded-[24px] bg-white p-5 ring-1 ring-[#E5E8EF]">
                  <h3 className="text-[12px] font-bold">接下来可以做</h3>
                  <div className="mt-4 space-y-2">
                    <button onClick={() => showNotice("已进入换元积分复习内容")} className="flex w-full items-center gap-3 rounded-xl bg-[#4D5CFF] px-4 py-3 text-left text-white"><PlayCircle size={17}/><span className="text-[11px] font-semibold">开始复习</span></button>
                    <button onClick={() => showNotice("已打开典型错题笔写作答页")} className="flex w-full items-center gap-3 rounded-xl bg-[#F2F3F7] px-4 py-3 text-left text-[#3F4653]"><PenLine size={17}/><span className="text-[11px] font-semibold">重做相关错题</span></button>
                    <button onClick={() => showNotice("已生成 3 道同知识点变式题")} className="flex w-full items-center gap-3 rounded-xl bg-[#F2F3F7] px-4 py-3 text-left text-[#3F4653]"><Sparkles size={17}/><span className="text-[11px] font-semibold">生成变式题</span></button>
                  </div>
                </section>
              </aside>
            </div>

          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-[#E6E8EE] bg-[#F4F5F9]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[980px] items-center gap-3 rounded-2xl bg-white p-2.5 pl-4 shadow-lg ring-1 ring-[#E1E4EB] focus-within:ring-[#B9C0FF]">
          <Sparkles size={17} className="shrink-0 text-[#5966F3]"/>
          <input
            ref={inputRef}
            value={mode === "answered" ? followUp : query}
            onChange={event => mode === "answered" ? setFollowUp(event.target.value) : setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key !== "Enter" || mode === "thinking") return;
              if (mode === "answered" && followUp.trim()) { submit(followUp); setFollowUp(""); }
              if (mode === "idle" && query.trim()) submit();
            }}
            disabled={mode === "thinking"}
            placeholder={mode === "answered" ? "继续追问，Memo 会保留当前上下文…" : mode === "thinking" ? "正在查找你的记忆…" : "找记忆、问问题，或让 Memo 帮你完成一件事"}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#A1A7B2] disabled:text-[#A1A7B2]"
          />
          <button
            onClick={() => {
              setVoiceActive(active => !active);
              const voiceText = "找我最近在定积分里反复出错的地方";
              if (!voiceActive) mode === "answered" ? setFollowUp(voiceText) : setQuery(voiceText);
            }}
            aria-label="语音输入"
            disabled={mode === "thinking"}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${voiceActive ? "bg-[#E9EBFF] text-[#4D5CFF]" : "text-[#858C99] hover:bg-[#F4F5F8]"}`}
          >
            <Mic size={17}/>
          </button>
          <button
            onClick={() => {
              if (mode === "answered" && followUp.trim()) { submit(followUp); setFollowUp(""); }
              if (mode === "idle" && query.trim()) submit();
            }}
            disabled={mode === "thinking" || (mode === "answered" ? !followUp.trim() : !query.trim())}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4D5CFF] text-white disabled:opacity-40"
            aria-label="发送"
          ><Send size={16}/></button>
        </div>
      </footer>

      {notice && <div className="fixed bottom-[100px] left-1/2 z-[250] -translate-x-1/2 rounded-full bg-[#202431] px-5 py-3 text-[11px] font-semibold text-white shadow-xl">{notice}</div>}
    </div>
  );
}
