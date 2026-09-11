import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Eraser, FileText, Lightbulb, PenLine, Send, Sparkles, X } from "lucide-react";
import type { ReviewOutcome } from "./reviewScheduler";

export type ReviewActionKind = "notes" | "homework" | "practice";
export type ReviewMistakeOrigin = "笔记识别" | "作业批改" | "在线作答" | "模拟考试";

export type ReviewPaperQuestion = {
  id: string;
  title: string;
  content: string;
  source: string;
  cause: string;
  origin: ReviewMistakeOrigin;
  previousAnswer?: string;
  correctAnswer?: string;
};

export type ReviewActionContent = {
  title: string;
  content: string;
  source: string;
  action: ReviewActionKind;
  origin?: ReviewMistakeOrigin;
  questions?: ReviewPaperQuestion[];
  initialQuestionId?: string;
};

const MODE_META = {
  notes: { label: "复习内容", title: "理解后，用自己的话回忆", Icon: FileText },
  homework: { label: "重做错题", title: "保留原题，重新独立作答", Icon: PenLine },
  practice: { label: "掌握检测", title: "用新题验证是否真正掌握", Icon: Sparkles },
} as const;

function SourcePage({ item, topic }: { item: ReviewActionContent; topic: string }) {
  if (item.action === "homework") {
    return <div className="mx-auto w-full max-w-[620px] rounded-[28px] bg-white px-10 py-9 shadow-[0_12px_40px_rgba(34,40,65,.08)]">
      <p className="text-[10px] font-semibold text-[#5967D9]">{item.origin ?? "在线作答"} · 原题</p>
      <h2 className="mt-4 text-[23px] font-bold text-[#202431]">{item.title}</h2>
      <p className="mt-8 text-[16px] leading-9 text-[#303541]">{item.content}</p>
      {item.origin === "笔记识别" && <div className="mt-6 rotate-[-1deg] rounded-2xl border border-[#E7DFD6] bg-[#FFFDF8] p-5 font-serif text-[13px] leading-7 text-[#56504A]"><span className="text-[#9A9187]">AI 从原笔迹中识别：</span><br/>u = 1 + x²，du = 2x dx<br/><span className="line-through decoration-[#E45E5E] decoration-2">∫₀¹ 1/u du</span><span className="ml-3 text-[#D24E4E]">上下限未换</span></div>}
      <div className="mt-7 rounded-2xl bg-[#F6F7FB] p-5 text-[12px] leading-7 text-[#697181]">
        保留你上次的错误位置。请重新独立完成，AI 会对比本次过程和原错误判断是否真正订正。
      </div>
      <p className="mt-9 text-[9px] text-[#A0A6B2]">{item.source}</p>
    </div>;
  }

  if (item.action === "practice") {
    return <div className="mx-auto w-full max-w-[620px] rounded-[28px] bg-white px-10 py-9 shadow-[0_12px_40px_rgba(34,40,65,.08)]">
      <p className="text-[10px] font-semibold text-[#5967D9]">针对性检测 · {topic}</p>
      <h2 className="mt-4 text-[23px] font-bold text-[#202431]">完成两道变式题</h2>
      <div className="mt-7 space-y-4">
        <div className="rounded-2xl border border-[#E7E9F1] p-5"><b className="text-[12px]">01</b><p className="mt-2 text-[14px] leading-7">计算 ∫₀¹ x / (1 + x²) dx，并写出换元后的新区间。</p></div>
        <div className="rounded-2xl border border-[#E7E9F1] p-5"><b className="text-[12px]">02</b><p className="mt-2 text-[14px] leading-7">判断 ∫₀¹ 2x / (1 + x²) dx 与 ∫₁² 1/u du 是否等价，并说明理由。</p></div>
      </div>
      <p className="mt-8 text-[9px] text-[#A0A6B2]">{item.source}</p>
    </div>;
  }

  return <div className="mx-auto w-full max-w-[620px] rounded-[28px] bg-white px-10 py-9 shadow-[0_12px_40px_rgba(34,40,65,.08)]">
    <p className="text-[10px] font-semibold text-[#5967D9]">AI 为你整理 · {topic}</p>
    <h2 className="mt-4 text-[23px] font-bold text-[#202431]">{item.title}</h2>
    <div className="mt-7 rounded-2xl bg-[#F6F7FF] p-5 text-[13px] leading-8 text-[#4F5665]">{item.content}</div>
    <div className="mt-7 grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-[#F4F5F8] p-4"><b className="text-[11px]">先判断</b><p className="mt-2 text-[10px] leading-5 text-[#71798A]">能否把复杂部分整体看成新变量，并同时凑出它的微分。</p></div>
      <div className="rounded-2xl bg-[#F4F5F8] p-4"><b className="text-[11px]">最易错</b><p className="mt-2 text-[10px] leading-5 text-[#71798A]">定积分换元后，积分变量和上下限必须成套改变。</p></div>
    </div>
    <p className="mt-8 text-[9px] text-[#A0A6B2]">参考来源：{item.source}</p>
  </div>;
}

export function ReviewActionModal({ subjectName, topic, item, onClose, onComplete }: {
  subjectName: string;
  topic: string;
  item: ReviewActionContent;
  onClose: () => void;
  onComplete: (outcome: ReviewOutcome) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const autoCheckTimerRef = useRef<number | null>(null);
  const autoReviewedRef = useRef(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [hasInk, setHasInk] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [gradingResult, setGradingResult] = useState<"correct" | "incorrect" | null>(null);
  const [answerExpanded, setAnswerExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [selectedPaperQuestionId, setSelectedPaperQuestionId] = useState(item.initialQuestionId ?? item.questions?.[0]?.id ?? item.title);
  const meta = MODE_META[item.action];
  const inkStorageKey = `memo:wrong-question-ink:${subjectName}:${topic}:${item.title}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1200;
    canvas.height = item.action === "homework" ? 1697 : 900;
    setHasInk(false);
    if (item.action !== "homework") return;
    const savedInk = window.localStorage.getItem(inkStorageKey);
    if (!savedInk) return;
    const image = new Image();
    image.onload = () => {
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      setHasInk(true);
    };
    image.src = savedInk;
  }, [inkStorageKey, item.action]);

  useEffect(() => {
    setSelectedPaperQuestionId(item.initialQuestionId ?? item.questions?.[0]?.id ?? item.title);
  }, [item.initialQuestionId, item.questions, item.title]);

  useEffect(() => () => {
    if (autoCheckTimerRef.current !== null) window.clearTimeout(autoCheckTimerRef.current);
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * event.currentTarget.width / rect.width,
      y: (event.clientY - rect.top) * event.currentTarget.height / rect.height,
    };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point(event);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const next = point(event);
    const context = event.currentTarget.getContext("2d")!;
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = "#334155";
    context.lineWidth = tool === "eraser" ? 42 : 4;
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    context.restore();
    lastPointRef.current = next;
    setHasInk(true);
  };
  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (item.action === "homework" && canvasRef.current) {
      window.localStorage.setItem(inkStorageKey, canvasRef.current.toDataURL("image/png"));
    }
  };
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    if (item.action === "homework") window.localStorage.removeItem(inkStorageKey);
    if (autoCheckTimerRef.current !== null) window.clearTimeout(autoCheckTimerRef.current);
    setHasInk(false);
    setIsAnalyzing(false);
    setFeedback("");
    setGradingResult(null);
    setAnswerExpanded(false);
  };
  const check = () => {
    if (!hasInk) { setFeedback("先在作答区写下你的理解或解题过程，我会在停笔后结合当前内容判断。"); return; }
    if (item.action === "homework") {
      setIsAnalyzing(true);
      setFeedback("");
      window.setTimeout(() => {
        const isCorrect = selectedPaperQuestionId.includes("note") || selectedPaperQuestionId.includes("second");
        setGradingResult(isCorrect ? "correct" : "incorrect");
        setAnswerExpanded(isCorrect);
        setFeedback(isCorrect ? "本次作答正确" : "本次作答仍有一处关键错误");
        setIsAnalyzing(false);
        onComplete(isCorrect ? "pass" : "partial");
      }, 700);
      return;
    }
    setFeedback(item.action === "notes"
      ? "回忆方向正确。你已经写到了“变量和上下限同步改变”，接下来可以用一道新题验证。"
      : item.action === "homework"
        ? "AI 判断：换元思路正确。请确认 u 的上下限由 1 变为 2，再写出最终结果 ln 2。"
        : "第 1 题思路正确；第 2 题还需要明确写出 dx 与 du 的对应关系。订正后即可完成。"
    );
  };
  const send = () => {
    const value = question.trim();
    if (!value) return;
    setMessages(current => [...current, value, item.action === "notes" ? "我会结合左侧原笔记解释，但先不给完整答案。你可以先说说自己卡在哪个条件。" : "我已经带上当前题目和你的笔迹。建议先检查换元变量、微分和上下限是否同时改变。"]) ;
    setQuestion("");
  };
  const inferredOutcome: ReviewOutcome = feedback
    ? item.action === "notes" ? "pass" : "partial"
    : "reviewed";

  if (item.action === "homework") {
    const paperQuestions = item.questions?.length ? item.questions : [{
      id: item.title,
      title: item.title,
      content: item.content,
      source: item.source,
      cause: "上次作答存在错误",
      origin: item.origin ?? "在线作答",
      previousAnswer: "未保留上次作答过程",
      correctAnswer: "请根据原题重新完成，并核对关键条件。",
    }];
    const selectedIndex = Math.max(0, paperQuestions.findIndex(questionItem => questionItem.id === selectedPaperQuestionId));
    const selectedPaperQuestion = paperQuestions[selectedIndex];
    return <div className="fixed inset-0 z-[640] flex h-[100dvh] flex-col bg-[#E9EBF0]">
      <header className="flex h-[64px] shrink-0 items-center border-b border-[#DDE0E7] bg-white px-5 shadow-[0_1px_5px_rgba(24,31,54,.04)]">
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[#F3F4F7]" aria-label="关闭错题作答"><X size={20}/></button>
        <div className="ml-3 min-w-0">
          <b className="block truncate text-[14px] text-[#202431]">{topic}错题订正</b>
          <span className="text-[9px] text-[#9299A7]">{subjectName} · 共 {paperQuestions.length} 题</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl bg-[#F2F3F7] p-1">
            <button onClick={() => setTool("pen")} className={`grid h-8 w-8 place-items-center rounded-lg ${tool === "pen" ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#717887]"}`} aria-label="使用笔"><PenLine size={15}/></button>
            <button onClick={() => setTool("eraser")} className={`grid h-8 w-8 place-items-center rounded-lg ${tool === "eraser" ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#717887]"}`} aria-label="使用橡皮"><Eraser size={15}/></button>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[64%_36%]">
        <section className="min-h-0 overflow-y-auto border-r border-[#DDE0E7] bg-[#ECEEF4] p-6">
          <div className="relative mx-auto aspect-[210/297] w-full max-w-[760px] overflow-hidden bg-white px-[8%] py-[7%] shadow-[0_10px_35px_rgba(34,40,65,.12)]">
            <div className="pointer-events-none relative z-10 flex items-start justify-between border-b border-[#D9DDE5] pb-5"><div><p className="text-[10px] font-semibold text-[#5967D9]">{subjectName} · 错题重做</p><h1 className="mt-2 text-[24px] font-bold">{topic}</h1></div><span className="text-[9px] text-[#979EAB]">第 1 页 / 共 1 页</span></div>
            <div className="pointer-events-none relative z-10 mt-6 space-y-8">{paperQuestions.map((questionItem,index)=><div key={questionItem.id} className="min-h-[185px] border-b border-[#E5E7EC] pb-7">
              <div className="flex items-start gap-3"><b className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F0F1F5] text-[10px] text-[#596170]">{index+1}</b><div><h2 className="text-[14px] font-bold leading-6">{questionItem.title}</h2><p className="mt-2 text-[11px] leading-6 text-[#454C59]">{questionItem.content}</p></div></div>
              <div className="ml-10 mt-5 h-[74px] bg-[linear-gradient(transparent_31px,#E6E9F0_32px)] bg-[length:100%_32px]"/>
            </div>)}</div>
            <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} className="absolute inset-0 z-20 h-full w-full touch-none" style={{cursor:tool==="eraser"?"cell":"crosshair"}}/>
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2">{paperQuestions.map((questionItem,index)=><button key={questionItem.id} onClick={()=>{setSelectedPaperQuestionId(questionItem.id);setFeedback("");setGradingResult(null);setAnswerExpanded(false);}} className={`rounded-full px-4 py-2 text-[10px] font-semibold ${questionItem.id===selectedPaperQuestion.id?"bg-[#4D5CFF] text-white":"bg-[#F1F2F6] text-[#737B89]"}`}>第 {index+1} 题</button>)}</div>
            <h2 className="mt-5 text-[19px] font-bold leading-7">{selectedPaperQuestion.title}</h2>
            <p className="mt-2 text-[9px] text-[#969DAB]">{selectedPaperQuestion.source} · {selectedPaperQuestion.origin}</p>

            {!gradingResult && <>
              <div className="mt-6 rounded-2xl bg-[#FFF4EC] p-4"><p className="text-[9px] font-semibold text-[#B36B4E]">错因</p><p className="mt-2 text-[11px] leading-6 text-[#6F554A]">{selectedPaperQuestion.cause}</p></div>
              <div className="mt-3 rounded-2xl bg-[#F3F5FF] p-4"><p className="text-[9px] font-semibold text-[#5967D9]">答题思路</p><p className="mt-2 text-[10px] leading-6 text-[#5F6879]">先确定换元变量并写出微分，再把原积分的上下限换成新变量对应的区间，最后完成积分并代入边界。</p></div>
              <button onClick={()=>setAnswerExpanded(value=>!value)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-[#F5F6F9] px-4 py-4 text-left text-[10px] font-semibold text-[#596170]"><span>查看答案</span>{answerExpanded?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
              {answerExpanded&&<div className="mt-2 rounded-2xl bg-[#EEF7F2] p-4 text-[10px] leading-6 text-[#4E665A]">{selectedPaperQuestion.correctAnswer??"请根据原题重新完成，并核对关键条件。"}</div>}
            </>}

            {isAnalyzing&&<div className="mt-6 flex items-center gap-2 rounded-2xl bg-[#F2F3FF] p-4 text-[10px] text-[#5967D9]"><Sparkles className="animate-pulse" size={15}/>正在识别笔迹并批改…</div>}
            {gradingResult==="correct"&&<div className="mt-6"><div className="flex items-center gap-2 text-[13px] font-bold text-[#34805B]"><CheckCircle2 size={18}/>本次作答正确</div><div className="mt-4 rounded-2xl bg-[#EEF7F2] p-4"><p className="text-[9px] font-semibold text-[#478166]">答案</p><p className="mt-2 text-[10px] leading-6 text-[#4E665A]">{selectedPaperQuestion.correctAnswer}</p></div></div>}
            {gradingResult==="incorrect"&&<div className="mt-6"><div className="rounded-2xl bg-[#FFF0EA] p-4"><p className="text-[9px] font-semibold text-[#BC6245]">错因</p><p className="mt-2 text-[11px] leading-6 text-[#754F42]">换元思路已经正确，但仍没有把新变量的上下限完整写出，导致过程缺少关键条件。</p></div><div className="mt-3 rounded-2xl bg-[#F3F5FF] p-4"><p className="text-[9px] font-semibold text-[#5967D9]">答题思路</p><p className="mt-2 text-[10px] leading-6 text-[#5F6879]">从 x=0、x=1 分别求出 u 的新边界，再使用新区间完成积分。</p></div><button onClick={()=>setAnswerExpanded(value=>!value)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-[#F5F6F9] px-4 py-4 text-left text-[10px] font-semibold text-[#596170]"><span>查看答案</span>{answerExpanded?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>{answerExpanded&&<div className="mt-2 rounded-2xl bg-[#EEF7F2] p-4 text-[10px] leading-6 text-[#4E665A]">{selectedPaperQuestion.correctAnswer}</div>}</div>}
            {feedback&&!gradingResult&&<p className="mt-4 text-[10px] text-[#B36B4E]">{feedback}</p>}
          </div>

          <div className="shrink-0 border-t border-[#ECEEF3] p-5">
            <button onClick={check} disabled={isAnalyzing} className="w-full rounded-full bg-[#EEF0FF] py-3 text-[10px] font-semibold text-[#5967D9] transition hover:bg-[#E5E8FF] disabled:opacity-60">AI 批改</button>
          </div>
        </section>
      </main>
    </div>;
  }

  return <div className="fixed inset-0 z-[640] flex h-[100dvh] flex-col bg-[#F2F3F7]">
    <header className="flex h-[70px] shrink-0 items-center border-b border-[#E3E6ED] bg-white px-5">
      <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[#F3F4F7]" aria-label="关闭复习任务"><X size={18}/></button>
      <span className="ml-4 grid h-9 w-9 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><meta.Icon size={17}/></span>
      <div className="ml-3"><b className="block text-[14px]">{topic}</b><span className="text-[9px] text-[#8E95A3]">{subjectName} · {meta.label}</span></div>
      <button onClick={() => { onComplete(inferredOutcome); onClose(); }} className="ml-auto rounded-full bg-[#EEF0FF] px-5 py-2.5 text-[10px] font-semibold text-[#4D5CFF]">完成本项</button>
    </header>

    <main className="grid min-h-0 flex-1 grid-cols-[56%_44%]">
      <section className="flex min-h-0 items-center overflow-y-auto border-r border-[#E1E4EB] bg-[#EDEFF4] p-7"><SourcePage item={item} topic={topic}/></section>
      <section className="flex min-h-0 flex-col bg-white p-6">
        <div className="flex items-center"><div><p className="text-[9px] font-semibold text-[#8D94A2]">现在做</p><h2 className="mt-1 text-[18px] font-bold">{meta.title}</h2></div><div className="ml-auto flex rounded-xl bg-[#F3F4F7] p-1"><button onClick={() => setTool("pen")} className={`grid h-8 w-8 place-items-center rounded-lg ${tool === "pen" ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#7B8291]"}`} aria-label="使用笔"><PenLine size={14}/></button><button onClick={() => setTool("eraser")} className={`grid h-8 w-8 place-items-center rounded-lg ${tool === "eraser" ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#7B8291]"}`} aria-label="使用橡皮"><Eraser size={14}/></button><button onClick={clear} className="px-3 text-[9px] text-[#7B8291]">清空</button></div></div>
        <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#E3E6EE] bg-[linear-gradient(#fff_31px,#E9ECF2_32px)] bg-[length:100%_32px]">
          <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerLeave={stop} className="h-full w-full touch-none" style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}/>
          {!hasInk && <div className="pointer-events-none absolute left-5 top-4 flex items-center gap-2 text-[10px] text-[#ADB2BD]"><PenLine size={13}/>可以直接用笔写，也可以用系统手写输入</div>}
        </div>
        {feedback && <div className="mt-3 flex gap-2 rounded-2xl bg-[#F1F4FF] p-4 text-[10px] leading-5 text-[#53617B]"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#5364E8]"/><span>{feedback}</span></div>}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={check} className="rounded-full bg-[#4D5CFF] px-5 py-3 text-[10px] font-semibold text-white">{item.action === "notes" ? "检查我的回忆" : "AI 批改"}</button>
          <span className="flex items-center gap-1 text-[9px] text-[#9AA1AE]"><Lightbulb size={12}/>结合本次复习内容和你的作答反馈</span>
        </div>
        <div className="mt-4 border-t border-[#ECEEF3] pt-4">
          {messages.slice(-2).map((message, index) => <p key={`${message}-${index}`} className={`mb-2 rounded-xl px-3 py-2 text-[9px] leading-5 ${index % 2 === 0 ? "ml-12 bg-[#4D5CFF] text-white" : "mr-7 bg-[#F4F5F8] text-[#666E7E]"}`}>{message}</p>)}
          <div className="flex gap-2"><input value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter") send(); }} placeholder="针对当前内容提问…" className="h-11 min-w-0 flex-1 rounded-xl bg-[#F3F4F7] px-4 text-[10px] outline-none"/><button onClick={send} className="grid h-11 w-11 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]" aria-label="发送问题"><Send size={15}/></button></div>
        </div>
      </section>
    </main>
  </div>;
}
