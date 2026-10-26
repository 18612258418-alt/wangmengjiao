import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Camera,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  FolderSync,
  Globe2,
  Link2,
  Mic,
  Paperclip,
  PlayCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { SOURCE_LIBRARY_ITEMS } from "../source/SourceLibraryView";
import recordingWaveformReference from "../../assets/recording-waveform-reference.png";

type SearchMode = "idle" | "thinking" | "answered";
type VoiceStatus = "idle" | "requesting" | "listening" | "processing" | "error";
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

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
          ...(card.detailSections?.flatMap(section => {
            const legacyContent = (section as typeof section & { content?: string }).content;
            return [section.title, ...(section.items ?? (legacyContent ? [legacyContent] : []))];
          }) ?? []),
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
  const asksStudyPriority = /先复习|复习什么|从哪里开始|考试.*先|怎么复习|复习顺序/.test(query);
  const asksSummary = /总结|概括|提炼|考试重点|课件.*重点|重点.*课件/.test(query);

  if (asksStudyPriority) {
    return {
      title: "建议先复习定积分换元，再检查边界条件",
      body: "先用 8 分钟回看换元法的典型例题，再完成 3 道诊断题。若能独立完成并解释为什么要修改上下限，再继续复习曲边梯形面积；不必从整本课件第一页重新看起。",
      personal: "依据：这两项都在下周考试范围内；最近 2 次相关作业中有 1 次遗漏换元后的新区间，而其他章节近期没有重复错误。预计本轮用时 25 分钟。",
      external: false,
    };
  }

  if (asksSummary) {
    return {
      title: "这份课件的考试重点集中在 3 个部分",
      body: "优先掌握核心定义与适用条件，其次梳理典型题的解题步骤，最后复习老师反复强调的边界条件和易错点。建议先看标记为重点的章节，再用一道例题确认是否真正掌握。",
      personal: "已结合课件标题、课堂录音和你的近期错题提炼；重点内容可以继续生成闪卡或练习题。",
      external: false,
    };
  }

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
  startWithVoice = false,
  initialQuery = "",
  onOpen,
  onClose,
  allFeedGroups,
  subjects,
  onUpdateCard,
  onOpenSource,
  onAddSource,
  onOpenCamera,
  onOpenVoice,
  onOpenConnections,
}: {
  isOpen: boolean;
  startWithVoice?: boolean;
  initialQuery?: string;
  onOpen: () => void;
  onClose: () => void;
  allFeedGroups: Record<string, FeedGroup[]>;
  subjects: SubjectData[];
  onUpdateCard: (subjectId: string, date: string, cardId: string, updates: Partial<CardData>) => void;
  onOpenSource: (sourceId: string) => void;
  onAddSource: () => void;
  onOpenCamera: () => void;
  onOpenVoice: () => void;
  onOpenConnections: () => void;
}) {
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("idle");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [notice, setNotice] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [lumoEnabled, setLumoEnabled] = useState(false);
  const [resultTab, setResultTab] = useState<"笔记"|"作业"|"资料">("笔记");
  const [typedSummary, setTypedSummary] = useState("");
  const [todayScrolled, setTodayScrolled] = useState(false);
  const [todayScrollTop, setTodayScrollTop] = useState(0);
  const [historyItems, setHistoryItems] = useState(["定积分换元法", "上周物理课的简谐振动", "英语论证结构", "最近做错的积分题", "明天需要预习什么", "误差测量实验"]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const fallbackVoiceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void onUpdateCard;
  }, [onUpdateCard]);

  useEffect(() => {
    if (!isOpen) return;
    const preset = initialQuery.trim();
    setQuery(preset);
    setFollowUp("");
    setSubmittedQuery(preset);
    setMode(preset ? "thinking" : "idle");
    setNotice("");
    setSourcesOpen(false);
    setVoiceStatus("idle");
    setAddMenuOpen(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (preset) timerRef.current = window.setTimeout(() => setMode("answered"), 720);
    else setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen, initialQuery]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (fallbackVoiceTimerRef.current) window.clearTimeout(fallbackVoiceTimerRef.current);
    recognitionRef.current?.abort();
    microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    const handleTodayScroll = (event: Event) => {
      const scrollTop = (event as CustomEvent<{ scrollTop: number }>).detail?.scrollTop ?? 0;
      setTodayScrollTop(scrollTop);
      setTodayScrolled(current => current ? scrollTop > 120 : scrollTop > 190);
    };
    window.addEventListener("memo-today-scroll", handleTodayScroll);
    return () => window.removeEventListener("memo-today-scroll", handleTodayScroll);
  }, []);

  const memoryMatches = useMemo(
    () => collectMatches(submittedQuery, allFeedGroups, subjects),
    [submittedQuery, allFeedGroups, subjects],
  );
  const answer = useMemo(() => ({ ...answerFor(submittedQuery), external: lumoEnabled }), [submittedQuery, lumoEnabled]);
  useEffect(() => {
    if (mode !== "answered") { setTypedSummary(""); return; }
    setTypedSummary("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedSummary(answer.body.slice(0, index));
      if (index >= answer.body.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [mode, answer.body]);

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
  const displayedEvidence = evidence.filter(item => resultTab === "笔记" ? item.label.includes("笔记") : resultTab === "作业" ? item.label.includes("作业") : !item.label.includes("笔记") && !item.label.includes("作业"));

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

  const openAddSource = () => {
    setAddMenuOpen(false);
    onAddSource();
  };

  const openCamera = () => {
    setAddMenuOpen(false);
    onOpenCamera();
  };

  const openVoiceRecorder = () => {
    setAddMenuOpen(false);
    onOpenVoice();
  };

  const sendVoiceInput = () => {
    const transcript = "找我做错过的积分题";
    if (fallbackVoiceTimerRef.current) window.clearTimeout(fallbackVoiceTimerRef.current);
    fallbackVoiceTimerRef.current = null;
    recognitionRef.current?.stop();
    stopMicrophone();
    setVoiceStatus("processing");
    window.setTimeout(() => {
      setQuery(transcript);
      setVoiceStatus("idle");
      submit(transcript);
    }, 520);
  };

  const stopMicrophone = () => {
    microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
    microphoneStreamRef.current = null;
  };

  const toggleVoiceInput = async () => {
    if (voiceStatus === "listening") {
      if (fallbackVoiceTimerRef.current) window.clearTimeout(fallbackVoiceTimerRef.current);
      fallbackVoiceTimerRef.current = null;
      if (recognitionRef.current) recognitionRef.current.stop();
      else {
        setVoiceStatus("processing");
        window.setTimeout(() => {
          const transcript = "找我做错过的积分题";
          mode === "answered" ? setFollowUp(transcript) : setQuery(transcript);
          stopMicrophone();
          setVoiceStatus("idle");
        }, 650);
      }
      setVoiceStatus("processing");
      return;
    }
    if (voiceStatus === "processing" || voiceStatus === "requesting") return;

    const beginFallbackRecognition = () => {
      if (fallbackVoiceTimerRef.current) return;
      stopMicrophone();
      setVoiceStatus("listening");
      fallbackVoiceTimerRef.current = window.setTimeout(() => {
        setVoiceStatus("processing");
        window.setTimeout(() => {
          const transcript = "找我做错过的积分题";
          mode === "answered" ? setFollowUp(transcript) : setQuery(transcript);
          fallbackVoiceTimerRef.current = null;
          setVoiceStatus("idle");
        }, 650);
      }, 4200);
    };

    setVoiceStatus("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("media-devices-unavailable");
      let permissionTimedOut = false;
      const microphoneRequest = navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        if (permissionTimedOut) stream.getTracks().forEach(track => track.stop());
        return stream;
      });
      microphoneStreamRef.current = await Promise.race([
        microphoneRequest,
        new Promise<MediaStream>((_, reject) => window.setTimeout(() => {
          permissionTimedOut = true;
          reject(new Error("microphone-permission-timeout"));
        }, 1500)),
      ]);
    } catch {
      // Some embedded preview browsers block microphone permission entirely.
      // Keep the prototype interaction testable there while real browsers use
      // the actual microphone and speech-recognition path below.
      beginFallbackRecognition();
      return;
    }

    const browserWindow = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      beginFallbackRecognition();
      return;
    }

    const recognition = new Recognition();
    let receivedResult = false;
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceStatus("listening");
    recognition.onresult = event => {
      receivedResult = true;
      setVoiceStatus("processing");
      const transcript = Array.from(event.results).map(result => result[0]?.transcript ?? "").join("").trim();
      if (transcript) mode === "answered" ? setFollowUp(transcript) : setQuery(transcript);
      window.setTimeout(() => setVoiceStatus("idle"), 650);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      beginFallbackRecognition();
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      stopMicrophone();
      if (!receivedResult) beginFallbackRecognition();
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setVoiceStatus("error");
      window.setTimeout(() => setVoiceStatus("idle"), 2200);
    }
  };

  useEffect(() => {
    if (!isOpen || !startWithVoice) return;
    const timer = window.setTimeout(() => {
      void toggleVoiceInput();
    }, 120);
    return () => window.clearTimeout(timer);
    // Opening from the sidebar microphone is a one-shot intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, startWithVoice]);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 6 ? "夜深了" : currentHour < 12 ? "上午好" : currentHour < 18 ? "下午好" : "晚上好";

  if (!isOpen && todayScrolled) return <div className="fixed left-[336px] right-0 top-4 z-[180] animate-in px-[10%] duration-200 fade-in slide-in-from-top-2">
    <div className="flex h-16 w-full items-center rounded-full border border-[#E1E4EA] bg-white/95 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
        <Search size={17} className="shrink-0 text-[#737B89]"/>
        <input value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&query.trim()){onOpen();submit();}}} className="min-w-0 flex-1 bg-transparent text-[13px] text-[#292D33] outline-none placeholder:text-[#969DA9]" placeholder="从课程、笔记和学习记录中搜索" aria-label="搜索内容"/>
      </div>
      <button type="button" onClick={onOpenVoice} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] text-[#59606D] hover:bg-[#F2F3F6]" aria-label="开始录音"><Mic size={14}/><span>录音</span></button>
      <button type="button" onClick={onAddSource} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] text-[#59606D] hover:bg-[#F2F3F6]" aria-label="上传资料"><Plus size={15}/><span>上传</span></button>
      <button type="button" onClick={onOpenConnections} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] text-[#59606D] hover:bg-[#F2F3F6]" aria-label="连接知识来源"><Link2 size={14}/><span>连接</span></button>
      <button type="button" onClick={()=>setLumoEnabled(value=>!value)} className={`memo-ai-glow-button flex h-9 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[9px] font-medium text-[#313640] transition ${lumoEnabled?"ring-2 ring-[#C9CEFF]":""}`} aria-label="问 AI" aria-pressed={lumoEnabled}><Sparkles size={12}/><span>问 AI</span></button>
      <div className="ml-auto flex w-[80px] shrink-0 items-center justify-end gap-2">
        {query&&<button type="button" onClick={()=>setQuery("")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F2F5] text-[#7D8490] transition hover:bg-[#E6E8ED] hover:text-[#292D33]" aria-label="清空搜索内容"><X size={16}/></button>}
        <button type="button" onClick={()=>{if(query.trim()){onOpen();submit();}}} disabled={!query.trim()} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition ${query.trim()?"bg-[#17191F] hover:bg-black":"bg-[#D9DCE2] cursor-default"}`} aria-label="搜索"><Search size={17}/></button>
      </div>
    </div>
  </div>;

  if (!isOpen) return <div className="fixed left-[336px] right-0 top-20 z-[180] px-[10%] text-[#252932]" style={{transform:`translateY(-${Math.min(todayScrollTop, 190)}px)`}}>
    <div className="mb-7 text-center">
      <h1 className="text-[32px] font-semibold leading-[1.2] tracking-[-.025em] text-[#181B23]">让学过的知识，随时为你所用</h1>
    </div>
    <div className="mb-10 flex items-center justify-center gap-3">
      <button type="button" onClick={onOpenVoice} className="flex h-11 min-w-[144px] items-center justify-center gap-2 rounded-full border border-white/90 bg-[linear-gradient(105deg,#FFF0E6_0%,#FFFFFF_46%,#DDF8FF_100%)] px-6 text-[12px] font-medium text-[#313640] ring-1 ring-[#DDE1E8] transition hover:-translate-y-0.5 hover:ring-[#BFC7FF]"><Mic size={15}/><span>录音</span></button>
      <button type="button" onClick={onAddSource} className="flex h-11 min-w-[144px] items-center justify-center gap-2 rounded-full border border-white/90 bg-[linear-gradient(105deg,#F0ECFF_0%,#FFFFFF_48%,#E5F7FF_100%)] px-6 text-[12px] font-medium text-[#313640] ring-1 ring-[#DDE1E8] transition hover:-translate-y-0.5 hover:ring-[#BFC7FF]"><Plus size={16}/><span>上传</span></button>
      <button type="button" onClick={onOpenConnections} className="flex h-11 min-w-[144px] items-center justify-center gap-2 rounded-full border border-white/90 bg-[linear-gradient(105deg,#EAF7FF_0%,#FFFFFF_48%,#F4ECFF_100%)] px-6 text-[12px] font-medium text-[#313640] ring-1 ring-[#DDE1E8] transition hover:-translate-y-0.5 hover:ring-[#BFC7FF]"><Link2 size={15}/><span>连接</span></button>
    </div>
    <div className="flex h-[112px] flex-col rounded-[28px] border border-[#E1E4EA] bg-white/95 px-7 py-5 backdrop-blur-xl">
      <div className="relative flex w-full items-center">
        <input value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&query.trim()){onOpen();submit();}}} placeholder="从课程、笔记和学习记录中搜索，或问我一个学习问题" className="w-full bg-transparent text-[15px] text-[#292D33] outline-none placeholder:text-[#9CA2AD]" aria-label="搜索内容"/>
      </div>
      <div className="mt-auto flex items-center gap-3">
        <button type="button" onClick={()=>setLumoEnabled(value=>!value)} className={`memo-ai-glow-button flex h-9 min-w-0 items-center gap-1 rounded-full border px-2.5 text-[9px] font-medium text-[#313640] transition ${lumoEnabled?"ring-2 ring-[#C9CEFF]":""}`} aria-pressed={lumoEnabled} aria-label={lumoEnabled?"关闭 AI 联网深度推理":"开启 AI 联网深度推理"}>
          <Sparkles size={12}/><span>问 AI</span>
        </button>
        <div className="ml-auto flex w-[80px] shrink-0 items-center justify-end gap-2">
          {query&&<button type="button" onClick={()=>setQuery("")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F2F5] text-[#7D8490] transition hover:bg-[#E6E8ED] hover:text-[#292D33]" aria-label="清空搜索内容"><X size={16}/></button>}
          <button type="button" onClick={()=>{if(query.trim()){onOpen();submit();}}} disabled={!query.trim()} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition ${query.trim()?"bg-[#17191F] hover:bg-black":"bg-[#D9DCE2] cursor-default"}`} aria-label="搜索"><Search size={17}/></button>
        </div>
      </div>
    </div>
  </div>;

  if (mode === "idle") {
    return (
      <>
      <button type="button" onClick={onClose} className="fixed inset-0 z-[210] cursor-default bg-transparent" aria-label="收起搜索"/>
      <div className="fixed left-[336px] right-0 top-[230px] z-[220] px-[10%] text-[#171A24]">
      <div className="relative w-full origin-top animate-in overflow-visible rounded-[30px] border border-[#D9DDE5] bg-white/98 px-6 py-5 shadow-[0_22px_64px_rgba(35,42,60,.16)] backdrop-blur-xl duration-200 fade-in slide-in-from-top-1">
        <div className="relative">
          <input ref={inputRef} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&query.trim())submit();}} placeholder="找函数相关的笔记" className="w-full bg-transparent text-[15px] text-[#292D33] outline-none placeholder:text-[#A0A5AE]"/>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={()=>setAddMenuOpen(open=>!open)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#F3F4F7]" aria-label="添加资料">{addMenuOpen?<X size={20}/>:<Plus size={23}/>}</button>
            <button type="button" onClick={openVoiceRecorder} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#F3F4F7]" aria-label="开始录音"><Mic size={18}/></button>
            <span className="h-6 w-px bg-[#E2E5EA]"/>
            <button type="button" onClick={()=>setLumoEnabled(value=>!value)} className={`memo-ai-glow-button flex h-9 items-center gap-1 rounded-full border px-2.5 text-[10px] font-medium text-[#313640] transition ${lumoEnabled?"ring-2 ring-[#C9CEFF]":""}`} aria-pressed={lumoEnabled} aria-label={lumoEnabled?"关闭 AI 联网深度推理":"开启 AI 联网深度推理"}><Sparkles size={12}/><span>问 AI</span></button>
            <div className="ml-auto flex w-[80px] shrink-0 items-center justify-end gap-2">
              {query&&<button type="button" onClick={()=>{setQuery("");inputRef.current?.focus();}} className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F2F5] text-[#7D8490] transition hover:bg-[#E6E8ED] hover:text-[#292D33]" aria-label="清空搜索内容"><X size={16}/></button>}
              <button type="button" onClick={()=>query.trim()&&submit()} disabled={!query.trim()} className={`grid h-9 w-9 place-items-center rounded-full text-white transition ${query.trim()?"bg-[#17191F] hover:bg-black":"bg-[#D9DCE2] cursor-default"}`} aria-label="搜索"><Search size={17}/></button>
            </div>
          </div>
          {addMenuOpen&&<div className="absolute left-0 top-[84px] z-20 w-[260px] rounded-[20px] bg-white p-3 shadow-[0_18px_52px_rgba(55,78,108,.18)] ring-1 ring-black/[.04]"><button type="button" onClick={openAddSource} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] hover:bg-[#F5F7FA]"><Paperclip size={18}/>上传文件</button><button type="button" onClick={openCamera} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] hover:bg-[#F5F7FA]"><Camera size={18}/>添加图片或扫描件</button><button type="button" onClick={openVoiceRecorder} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] hover:bg-[#F5F7FA]"><Mic size={18}/>录音</button><button type="button" onClick={()=>{setAddMenuOpen(false);onOpenConnections();}} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] hover:bg-[#F5F7FA]"><Link2 size={18}/>连接知识来源</button></div>}
        </div>
        <div className="my-5 h-px bg-[#E2E5EA]"/>
        {historyItems.length>0&&<section><div className="flex items-center"><h3 className="text-[13px] font-medium text-[#8F96A2]">历史记录</h3><button type="button" onClick={()=>setHistoryItems([])} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-[#737A87] hover:bg-[#F3F4F7]" aria-label="清空历史记录"><Trash2 size={16}/></button></div><div className="mt-3 flex flex-wrap gap-2">{historyItems.map(item=><button key={item} onClick={()=>submit(item)} className="rounded-full border border-[#D7DAE1] px-3 py-1.5 text-[11px] text-[#666D79] transition hover:border-[#AAB2FF] hover:text-[#4D5CFF]">{item}</button>)}</div></section>}
        <section className={historyItems.length?"mt-6":""}><h3 className="text-[13px] font-medium text-[#8F96A2]">猜你想搜</h3><div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">{suggestions.map(({text})=><button key={text} onClick={()=>submit(text)} className="text-left text-[12px] text-[#383D46] hover:text-[#4D5CFF]">{text}</button>)}</div></section>
        <button type="button" onClick={onClose} aria-label="收起" className="absolute bottom-4 right-5 grid h-8 w-8 place-items-center rounded-full text-[#8B929E] hover:bg-[#F2F3F6]"><ChevronUp size={17}/></button>
      </div>
      </div>
      </>
    );
  }

  return (
    <div className="fixed bottom-0 left-[336px] right-0 top-0 z-[220] flex flex-col overflow-hidden border-l border-[#E3E6ED] bg-[#F4F5F9] text-[#171A24]">
      <style>{`
        @keyframes memoSearchEnter { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes memoPulse { 0%,100% { opacity:.38 } 50% { opacity:1 } }
        .memo-search-enter { animation: memoSearchEnter .2s ease-out both; }
      `}</style>

      <header className="flex h-[112px] shrink-0 items-center gap-4 px-7">
        <button onClick={onClose} aria-label="返回" className="grid h-10 w-10 place-items-center rounded-full text-[#5F6674] transition hover:bg-[#F1F3F7]">
          <ArrowLeft size={21} />
        </button>
        <div className="mx-auto flex h-14 min-w-0 max-w-[920px] flex-1 items-center rounded-full border border-[#D8DCE4] bg-white px-5 shadow-[0_10px_28px_rgba(35,42,60,.08)] focus-within:border-[#AAB2FF]">
          <input value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&query.trim())submit();}} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" aria-label="搜索内容"/>
          {query&&<button type="button" onClick={()=>setQuery("")} className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F1F2F5] text-[#7D8490] transition hover:bg-[#E6E8ED] hover:text-[#292D33]" aria-label="清空搜索内容"><X size={16}/></button>}
          <button type="button" onClick={()=>query.trim()&&submit()} disabled={!query.trim()} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition ${query.trim()?"bg-[#17191F] hover:bg-black":"bg-[#D9DCE2] cursor-default"}`} aria-label="搜索"><Search size={17}/></button>
        </div>
        <div className="w-10"/>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {mode === "thinking" && (
          <div className="mx-auto flex max-w-[820px] flex-col items-center px-6 py-24 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EAEDFF] text-[#4D5CFF]"><Sparkles size={25} /></div>
            <h2 className="mt-5 text-[18px] font-bold">正在理解你的问题</h2>
            <p className="mt-2 text-[12px] text-[#878E9C]">{lumoEnabled?"正在结合 Memo 内容、联网信息与深度推理":"仅搜索 Memo 内的笔记、作业、错题和资料"}</p>
            <div className="mt-7 flex gap-2">{[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-[#6672F6]" style={{animation:`memoPulse 1s ${i * .18}s infinite`}} />)}</div>
          </div>
        )}

        {mode === "answered" && (
          <div className="memo-search-enter px-7 pb-10">
            <section className="mx-auto mb-5 max-w-[920px] rounded-[26px] bg-white p-6 shadow-sm ring-1 ring-[#E4E7ED]">
              <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${lumoEnabled?'bg-[#77E0CC]':'bg-[#B8BFCA]'}`}/><span className="text-[12px] font-semibold">{lumoEnabled?'Lumo 联网总结':'Memo 内容总结'}</span><span className="rounded-full bg-[#DDF5F0] px-1.5 py-0.5 text-[8px] text-[#318878]">AI</span></div>
              <h2 className="mt-4 text-[19px] font-bold leading-8">{answer.title}</h2>
              <p className="mt-3 min-h-[56px] text-[13px] leading-7 text-[#4F5664]">{typedSummary}<span className={`${typedSummary.length<answer.body.length?'inline-block':'hidden'} ml-0.5 h-4 w-[2px] animate-pulse bg-[#6674FF] align-middle`}/></p>
              {typedSummary.length>=answer.body.length&&<p className="mt-4 animate-in fade-in duration-500 rounded-2xl bg-[#F3F4F8] px-4 py-3 text-[11px] leading-6 text-[#697181]">{answer.personal}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#ECEEF2] pt-4"><span className="text-[10px] font-semibold text-[#7C838F]">依据来源</span>{evidence.slice(0,3).map(item=><button key={item.id} className="flex max-w-[220px] items-center gap-2 text-left text-[10px] text-[#666E7B]"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6674FF]"/><span className="truncate">{item.title}</span></button>)}</div>
            </section>
            <div className="flex h-14 items-center border-b border-[#E3E6EC]">
              {(['笔记','作业','资料'] as const).map(tab=><button key={tab} onClick={()=>setResultTab(tab)} className={`relative mr-8 h-full text-[13px] ${resultTab===tab?'font-semibold text-[#242832]':'text-[#7C838F]'}`}>{tab}{resultTab===tab&&<span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#242832]"/>}</button>)}
            </div>
            <div className="mt-6 min-h-0">
              <section>
                <div className="mb-4 flex items-center justify-between"><h2 className="text-[15px] font-semibold">与“{submittedQuery}”相关的{resultTab}</h2><span className="text-[11px] text-[#9299A5]">{displayedEvidence.length} 条结果</span></div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">{displayedEvidence.map((item,index)=><button key={item.id} onClick={()=>item.sourceId?onOpenSource(item.sourceId):showNotice(item.kind==='web'?'已打开外部原文预览':'已定位到对应原文位置')} className="group overflow-hidden rounded-[22px] bg-white text-left shadow-sm ring-1 ring-[#E4E7ED] transition hover:-translate-y-1 hover:shadow-lg"><div className={`flex h-32 items-center justify-center ${index%3===0?'bg-[linear-gradient(135deg,#202638,#6875FF)]':index%3===1?'bg-[linear-gradient(135deg,#F3E8FF,#D7E2FF)]':'bg-[linear-gradient(135deg,#E8F7F3,#B8E6DC)]'}`}>{item.kind==='web'?<Globe2 size={36} className="text-white/90"/>:<FileText size={38} className={index%3===0?'text-white/90':'text-[#5967D9]'}/>}</div><div className="p-4"><span className={`text-[9px] font-semibold ${item.kind==='web'?'text-[#168A68]':'text-[#6570D6]'}`}>{item.kind==='web'?'联网资料':item.label}</span><h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5">{item.title}</h3><p className="mt-2 truncate text-[10px] text-[#969DA9]">{item.meta}</p></div></button>)}</div>
              </section>
            </div>
          </div>
        )}
      </main>

      {mode !== "answered" && <footer className="shrink-0 bg-[#F4F5F9]/95 px-6 pb-5 pt-3 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[980px] items-center rounded-full bg-white px-3 shadow-[0_12px_34px_rgba(60,74,108,.16)] ring-1 ring-[#E1E4EB] focus-within:ring-[#B9C0FF]">
          <button type="button" onClick={onAddSource} aria-label="添加资料" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#171A20] transition hover:bg-[#F3F5F8]"><Plus size={25}/></button>
          {voiceStatus === "listening" || voiceStatus === "processing" ? (
            <>
              <div aria-label={voiceStatus === "listening" ? "正在录音" : "正在识别"} className={`mx-5 flex min-w-0 flex-1 items-center justify-center overflow-hidden ${voiceStatus === "listening" ? "animate-pulse" : "opacity-45"}`}>
                <img src={recordingWaveformReference} alt="" className="h-[26px] w-full max-w-[620px] object-fill"/>
              </div>
              <button type="button" onClick={toggleVoiceInput} aria-label="停止录音" disabled={voiceStatus === "processing"} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#D9D9DB] text-[#202124] disabled:opacity-55"><Square size={15} fill="currentColor"/></button>
              <button type="button" onClick={sendVoiceInput} aria-label="发送录音" disabled={voiceStatus === "processing"} className="ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#9BD1FF] text-[#101318] disabled:opacity-55"><ArrowUp size={23}/></button>
            </>
          ) : (
            <>
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
                placeholder={mode === "answered" ? "继续追问…" : mode === "thinking" ? "正在查找你的记忆…" : "找记忆、问问题，或让 Memo 帮你完成一件事"}
                className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-[#292D33] outline-none placeholder:text-[#888E97] disabled:text-[#A1A7B2]"
              />
              <button type="button" onClick={toggleVoiceInput} aria-label="语音输入" disabled={mode === "thinking"} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#20242A] transition hover:bg-[#F4F6F8] disabled:opacity-40"><Mic size={20}/></button>
              <button
                onClick={() => {
                  if (mode === "answered" && followUp.trim()) { submit(followUp); setFollowUp(""); }
                  if (mode === "idle" && query.trim()) submit();
                }}
                disabled={mode === "thinking" || (mode === "answered" ? !followUp.trim() : !query.trim())}
                className="ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#4D5CFF] text-white disabled:opacity-30"
                aria-label="发送"
              ><ArrowUp size={22}/></button>
            </>
          )}
        </div>
      </footer>}

      {notice && <div className="fixed bottom-[100px] left-1/2 z-[250] -translate-x-1/2 rounded-full bg-[#202431] px-5 py-3 text-[11px] font-semibold text-white shadow-xl">{notice}</div>}
    </div>
  );
}
