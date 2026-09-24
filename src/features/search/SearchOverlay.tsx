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
  Mic,
  Paperclip,
  PenLine,
  PlayCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Square,
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
  onClose,
  allFeedGroups,
  subjects,
  onUpdateCard,
  onOpenSource,
  onAddSource,
  onOpenCamera,
  onOpenVoice,
}: {
  isOpen: boolean;
  startWithVoice?: boolean;
  onClose: () => void;
  allFeedGroups: Record<string, FeedGroup[]>;
  subjects: SubjectData[];
  onUpdateCard: (subjectId: string, date: string, cardId: string, updates: Partial<CardData>) => void;
  onOpenSource: (sourceId: string) => void;
  onAddSource: () => void;
  onOpenCamera: () => void;
  onOpenVoice: () => void;
}) {
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("idle");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [notice, setNotice] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
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
    setQuery("");
    setFollowUp("");
    setSubmittedQuery("");
    setMode("idle");
    setNotice("");
    setSourcesOpen(false);
    setVoiceStatus("idle");
    setAddMenuOpen(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (fallbackVoiceTimerRef.current) window.clearTimeout(fallbackVoiceTimerRef.current);
    recognitionRef.current?.abort();
    microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
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

  if (!isOpen) return null;

  if (mode === "idle") {
    return (
      <div className="fixed inset-0 z-[220] overflow-hidden bg-[#F7F8FA] text-[#171A24]">
        <div className="absolute inset-x-0 top-0 h-[78%] bg-[radial-gradient(ellipse_at_52%_50%,rgba(183,220,255,.88)_0%,rgba(218,235,252,.72)_34%,rgba(244,247,250,.45)_68%,rgba(247,248,250,0)_88%)]"/>
        <button onClick={onClose} aria-label="返回" className="absolute left-8 top-8 z-10 grid h-11 w-11 place-items-center rounded-full text-[#555D68] transition hover:bg-white/60">
          <ArrowLeft size={23}/>
        </button>

        <main className="relative z-10 mx-auto flex h-full w-full max-w-[1120px] flex-col justify-center px-8 pb-[13vh]">
          <h1 className="text-center text-[42px] font-light tracking-[-.045em] text-[#2F3339]">你想找什么，或者继续做什么？</h1>

          <div className="relative mt-12">
          <div className="flex h-[96px] items-center rounded-full bg-white px-5 shadow-[0_14px_38px_rgba(84,126,166,.18)] ring-1 ring-white/80 focus-within:ring-[#B9C9F6]">
            <button
              type="button"
              onClick={() => setAddMenuOpen(open => !open)}
              aria-label={addMenuOpen ? "关闭添加菜单" : "添加资料"}
              aria-expanded={addMenuOpen}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-[#16191E] transition ${addMenuOpen ? "bg-[#F1F4F8]" : "hover:bg-[#F3F5F8]"}`}
            >
              {addMenuOpen ? <X size={27} strokeWidth={2}/> : <Plus size={27}/>} 
            </button>
            {voiceStatus === "listening" || voiceStatus === "processing" ? (
              <>
                <div aria-label={voiceStatus === "listening" ? "正在录音" : "正在识别"} className={`mx-8 flex min-w-0 flex-1 items-center justify-center overflow-hidden ${voiceStatus === "listening" ? "animate-pulse" : "opacity-45"}`}>
                  <img src={recordingWaveformReference} alt="" className="h-[30px] w-full max-w-[650px] object-fill"/>
                </div>
                <button type="button" onClick={toggleVoiceInput} aria-label="停止录音" disabled={voiceStatus === "processing"} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#D9D9DB] text-[#202124] transition hover:bg-[#CDCDD0] disabled:opacity-55">
                  <Square size={16} strokeWidth={2} fill="currentColor"/>
                </button>
                <button type="button" onClick={sendVoiceInput} aria-label="发送录音" disabled={voiceStatus === "processing"} className="ml-3 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#9BD1FF] text-[#101318] transition hover:bg-[#86C7FF] disabled:opacity-55">
                  <ArrowUp size={25} strokeWidth={2.1}/>
                </button>
              </>
            ) : (
              <>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => { if (event.key === "Enter" && query.trim()) submit(); }}
                  placeholder="找记忆、问问题，或让 Memo 帮你完成一件事"
                  className="min-w-0 flex-1 bg-transparent px-3 text-[17px] text-[#292D33] outline-none placeholder:text-[#777D86]"
                />
                {voiceStatus === "requesting" && <span className="shrink-0 text-[12px] font-medium text-[#5967D9]">正在连接麦克风…</span>}
                {voiceStatus === "error" && <span className="shrink-0 text-[12px] font-medium text-[#C45C54]">麦克风暂不可用</span>}
                <button type="button" onClick={toggleVoiceInput} aria-label="语音输入" className={`ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${voiceStatus === "requesting" ? "bg-[#EEF0FF] text-[#4D5CFF]" : "text-[#20242A] hover:bg-[#F4F6F8]"}`}><Mic size={21}/></button>
                {query.trim() && <button onClick={() => submit()} aria-label="发送" className="ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#4D5CFF] text-white"><Send size={17}/></button>}
              </>
            )}
          </div>

          {addMenuOpen && (
            <div className="absolute left-5 top-[110px] z-20 w-[360px] overflow-hidden rounded-[28px] bg-white px-5 py-5 shadow-[0_18px_52px_rgba(55,78,108,.18)] ring-1 ring-black/[.025]">
              <div className="space-y-1">
                <button type="button" onClick={openAddSource} className="flex h-14 w-full items-center gap-5 rounded-2xl px-3 text-left text-[17px] text-[#171A1F] transition hover:bg-[#F5F7FA]">
                  <Paperclip size={22} strokeWidth={1.9}/><span>上传文件</span>
                </button>
                <button type="button" onClick={openCamera} className="flex h-14 w-full items-center gap-5 rounded-2xl px-3 text-left text-[17px] text-[#171A1F] transition hover:bg-[#F5F7FA]">
                  <Camera size={22} strokeWidth={1.9}/><span>添加图片或扫描件</span>
                </button>
                <button type="button" onClick={openVoiceRecorder} className="flex h-14 w-full items-center gap-5 rounded-2xl px-3 text-left text-[17px] text-[#171A1F] transition hover:bg-[#F5F7FA]">
                  <Mic size={22} strokeWidth={1.9}/><span>录音</span>
                </button>
              </div>
              <div className="my-3 h-px bg-[#E7E9ED]"/>
              <button type="button" onClick={openAddSource} className="flex h-14 w-full items-center gap-5 rounded-2xl px-3 text-left text-[17px] text-[#171A1F] transition hover:bg-[#F5F7FA]">
                <FolderSync size={22} strokeWidth={1.9}/><span>自动获取学习资料</span>
              </button>
            </div>
          )}
          </div>

          <div className="mt-9 space-y-2 pl-5">
            {suggestions.slice(0, 3).map(({ text }) => (
              <button key={text} onClick={() => submit(text)} className="flex w-fit items-center gap-4 rounded-xl px-3 py-2.5 text-left text-[15px] text-[#252A31] transition hover:bg-white/55">
                <span className="text-[22px] leading-none">↪</span><span>{text}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

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
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
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
            <div className="space-y-5">
              <div className="flex justify-end">
                <div className="max-w-[72%] rounded-[24px] rounded-tr-md bg-[#4D5CFF] px-5 py-4 text-[15px] font-medium leading-7 text-white shadow-sm">{submittedQuery}</div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E9ECFF] text-[#4D5CFF]"><Sparkles size={19}/></span>
                <div className="min-w-0 max-w-[820px] flex-1 space-y-5">
                  <section className="rounded-[26px] rounded-tl-md bg-white p-6 shadow-sm ring-1 ring-[#E5E8EF]">
                    <div className="text-[12px] font-bold text-[#4D5CFF]">Memo</div>
                    <h2 className="mt-3 text-[22px] font-bold leading-9">{answer.title}</h2>
                    <p className="mt-3 text-[14px] leading-8 text-[#4F5664]">{answer.body}</p>
                    <p className="mt-4 rounded-2xl bg-[#F0F2FF] px-5 py-4 text-[13px] leading-7 text-[#565F78]">{answer.personal}</p>
                  </section>

              <section className="rounded-[24px] bg-white p-5 ring-1 ring-[#E5E8EF]">
                <h3 className="text-[15px] font-bold">接下来可以做</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <button onClick={() => showNotice("已进入换元积分复习内容")} className="flex items-center gap-3 rounded-2xl bg-[#4D5CFF] px-5 py-4 text-left text-white"><PlayCircle size={18}/><span className="text-[12px] font-semibold">开始复习</span></button>
                  <button onClick={() => showNotice("已打开典型错题笔写作答页")} className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-left text-[#3F4653] ring-1 ring-[#E1E5EC]"><PenLine size={18}/><span className="text-[12px] font-semibold">重做相关错题</span></button>
                  <button onClick={() => showNotice("已生成 3 道同知识点变式题")} className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-left text-[#3F4653] ring-1 ring-[#E1E5EC]"><Sparkles size={18}/><span className="text-[12px] font-semibold">生成变式题</span></button>
                </div>
              </section>

              <section className="rounded-[24px] bg-white px-5 py-2 ring-1 ring-[#E5E8EF]">
                <button onClick={() => setSourcesOpen(open => !open)} className="flex w-full items-center justify-between py-4 text-left">
                  <span><b className="block text-[15px]">记忆依据</b><small className="mt-1 block text-[11px] text-[#949BA8]">{evidence.filter(item => item.kind === "memory").length} 条个人记忆{answer.external ? ` · ${evidence.filter(item => item.kind === "web").length} 条外部补充` : ""}</small></span>
                  {sourcesOpen ? <ChevronUp size={18} className="text-[#89909D]"/> : <ChevronDown size={18} className="text-[#89909D]"/>}
                </button>
                {sourcesOpen && <div className="grid gap-2 sm:grid-cols-2">
                  {evidence.map(item => (
                    <button key={item.id} onClick={() => item.sourceId ? onOpenSource(item.sourceId) : showNotice(item.kind === "web" ? "已打开外部原文预览" : "已定位到对应原文位置")} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-[#E5E8EF] transition hover:bg-[#F8F9FB]">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.kind === "web" ? "bg-[#EAF7F2] text-[#168A68]" : "bg-[#EEF0FF] text-[#4D5CFF]"}`}>{item.kind === "web" ? <Globe2 size={16}/> : <FileText size={16}/>}</span>
                      <span className="min-w-0 flex-1"><span className={`text-[9px] font-bold ${item.kind === "web" ? "text-[#178568]" : "text-[#6570D6]"}`}>{item.kind === "web" ? "外部补充" : item.label}</span><b className="mt-0.5 block truncate text-[11px]">{item.title}</b><small className="mt-1 block truncate text-[9px] text-[#969DA9]">{item.meta}</small></span>
                      <ExternalLink size={14} className="text-[#A7ADB7]"/>
                    </button>
                  ))}
                </div>}
              </section>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      <footer className="shrink-0 bg-[#F4F5F9]/95 px-6 pb-5 pt-3 backdrop-blur">
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
      </footer>

      {notice && <div className="fixed bottom-[100px] left-1/2 z-[250] -translate-x-1/2 rounded-full bg-[#202431] px-5 py-3 text-[11px] font-semibold text-white shadow-xl">{notice}</div>}
    </div>
  );
}
