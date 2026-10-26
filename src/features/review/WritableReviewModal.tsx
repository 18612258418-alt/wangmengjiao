import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { PenToolbar } from "../pen-context/PenToolbar";
import type { PenToolKind } from "../pen-context/types";
import { compressImageForApi } from "../../utils/api";
import { formatCircleRegionAnswer, type CircleRegionResult } from "../../prompts/circleRegion";
import { AiConversationModule } from "../ai-conversation/AiConversationModule";

const SOURCE_WIDTH = 1500;
const SOURCE_HEIGHT = 1125;
const ANSWER_HEIGHT = 760;

const RANGE_PAGES = [
  { page: 1, title: "第九章习题课", detail: "基本概念、基本公式、练习" },
  { page: 2, title: "基本概念", detail: "极限、连续、偏导数、可微、方向导数、梯度" },
  { page: 3, title: "概念之间的关系", detail: "连续、偏导、方向导数与可微的关系" },
];

const PAGE_QUESTIONS: Record<number, string[]> = {
  1: [],
  2: ["1-1", "1-2", "1-3"],
  3: ["1-4", "1-5", "1-6"],
};

const ANSWER_GUIDES: Record<string, string> = {
  "1-1": "分别对 ln(1+x) 与 eˣ−1 作二阶展开，抵消一次项后，极限为 −1。",
  "1-2": "化为 1∞ 型后取对数，计算指数部分的极限，结果为 e²。",
  "1-3": "先通分并比较无穷远处各次项，得到 1−a=0、a+b=0，因此 a=1，b=−1。",
  "1-4": "先证明数列有界且相邻差保持同号，再令极限为 A 代入递推式，得到 A=(1+√5)/2。",
  "1-5": "先约去 x−1，x=1 为可去间断点；x=2 处分母趋于 0 且函数无界，为无穷间断点。",
  "1-6": "比较 x→0⁻ 时 xsin(1/x) 的极限与 f(0)=a。左极限为 0，因此 a=0 时函数连续。",
};

type View = "range" | "practice";
type Surface = "range" | "page" | "answer";
type Feedback = {
  verdict: "待判断" | "正确" | "部分正确" | "需要订正" | "未连接";
  text: string;
};

type InkStatus = "ready" | "saving" | "saved" | "mark" | "thinking";

const STORAGE_KEY = "ai-memory:math-review-ink:v1";

function loadSavedInk() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return new Map<string, string>(saved ? Object.entries(JSON.parse(saved) as Record<string, string>) : []);
  } catch {
    return new Map<string, string>();
  }
}

function RangeDigitalPage({ page }: { page: number }) {
  if (page === 1) {
    return (
      <div className="flex aspect-[4/3] w-full max-w-[920px] flex-col justify-center rounded-2xl bg-[#1115A8] px-[9%] text-white shadow-[0_8px_30px_rgba(24,30,54,.16)]">
        <p className="text-[12px] font-semibold tracking-[.18em] text-[#64E8FF]">高等数学 · 第九章</p>
        <h2 className="mt-4 text-[34px] font-bold">多元函数微分 · 习题课</h2>
        <div className="mt-10 grid grid-cols-3 gap-4">
          {["基本概念", "基本公式", "练习"].map((item, index) => (
            <div key={item} className="rounded-2xl border border-white/25 bg-white/10 px-5 py-6">
              <span className="text-[10px] text-[#FFE65A]">0{index + 1}</span>
              <b className="mt-2 block text-[17px]">{item}</b>
            </div>
          ))}
        </div>
        <p className="mt-9 text-[9px] text-white/55">源自《第9章-复习》P1</p>
      </div>
    );
  }
  if (page === 2) {
    const concepts = [
      ["1", "极限", "lim P→P₀ f(P)=A"],
      ["2", "连续", "lim P→P₀ f(P)=f(P₀)"],
      ["3", "偏导数", "固定一个变量，考察另一方向的变化率"],
      ["4", "可微分", "Δz=AΔx+BΔy+o(ρ)"],
      ["5", "方向导数", "沿给定方向的瞬时变化率"],
      ["6", "梯度", "(∂f/∂x, ∂f/∂y)"],
    ];
    return (
      <div className="aspect-[4/3] w-full max-w-[920px] rounded-2xl bg-[#1115A8] px-[7%] py-[6%] text-white shadow-[0_8px_30px_rgba(24,30,54,.16)]">
        <p className="text-[11px] font-semibold tracking-[.14em] text-[#64E8FF]">一、基本概念</p>
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
          {concepts.map(([number, title, detail]) => (
            <div key={number} className="flex items-start border-b border-white/15 pb-3">
              <span className="mr-3 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#FFE65A] text-[10px] font-bold text-[#1115A8]">{number}</span>
              <div><b className="block text-[14px]">{title}</b><span className="mt-1 block text-[10px] text-white/70">{detail}</span></div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[9px] text-white/55">源自《第9章-复习》P2</p>
      </div>
    );
  }
  return (
    <div className="aspect-[4/3] w-full max-w-[920px] rounded-2xl bg-[#1115A8] px-[8%] py-[6%] text-white shadow-[0_8px_30px_rgba(24,30,54,.16)]">
      <p className="text-[11px] font-semibold tracking-[.14em] text-[#64E8FF]">概念之间的关系</p>
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="rounded-xl border border-[#64E8FF] bg-white/10 px-9 py-3 text-[13px] font-bold">偏导数连续</div>
        <span className="my-2 text-[#FFE65A]">↓</span>
        <div className="rounded-xl border border-[#FFE65A] bg-white/10 px-12 py-3 text-[15px] font-bold">可微</div>
        <div className="my-2 flex w-[76%] justify-around text-[#FFE65A]"><span>↙</span><span>↓</span><span>↘</span></div>
        <div className="grid w-full grid-cols-3 gap-4">
          {["连续", "偏导数存在", "各方向导数存在"].map((item) => <div key={item} className="rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-[12px] font-semibold">{item}</div>)}
        </div>
        <p className="mt-5 text-[9px] text-white/55">图中箭头表示充分条件方向 · 源自《第9章-复习》P3</p>
      </div>
    </div>
  );
}

export function WritableReviewModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("range");
  const [rangePage, setRangePage] = useState(1);
  const [page, setPage] = useState(2);
  const [question, setQuestion] = useState("1-1");
  const [tool, setTool] = useState<PenToolKind>("pencil");
  const [grading, setGrading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [rangeInput, setRangeInput] = useState("");
  const [rangeMessages, setRangeMessages] = useState<string[]>([]);
  const [inkStatus, setInkStatus] = useState<InkStatus>("ready");
  const [statusText, setStatusText] = useState("AI 正在理解当前页面与笔迹");
  const [listening, setListening] = useState(false);
  const rangeCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const answerCanvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotsRef = useRef(loadSavedInk());
  const historyRef = useRef(new Map<string, string[]>());
  const drawingRef = useRef<{ surface: Surface; lastX: number; lastY: number; points: Array<{x:number;y:number}> } | null>(null);
  const gradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const feedbackKey = (p = page, q = question) => `${p}:${q}`;
  const snapshotKey = (surface: Surface, p = page, q = question) =>
    surface === "range" ? `range:${rangePage}` : surface === "page" ? `${p}:page` : `${p}:${q}:answer`;

  const persistSnapshots = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(snapshotsRef.current)));
  };

  const restoreCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, surface: Surface, p: number, q: string) => {
      if (!canvas) return;
      canvas.width = SOURCE_WIDTH;
      canvas.height = surface === "answer" ? ANSWER_HEIGHT : SOURCE_HEIGHT;
      const context = canvas.getContext("2d")!;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const saved = snapshotsRef.current.get(surface === "range" ? `range:${p}` : surface === "page" ? `${p}:page` : `${p}:${q}:answer`);
      if (!saved) return;
      const savedImage = new Image();
      savedImage.onload = () => context.drawImage(savedImage, 0, 0, canvas.width, canvas.height);
      savedImage.src = saved;
    },
    [],
  );

  useEffect(() => {
    if (view === "range") {
      restoreCanvas(rangeCanvasRef.current, "range", rangePage, "");
      return;
    }
    if (view !== "practice" || !question) return;
    restoreCanvas(pageCanvasRef.current, "page", page, question);
    restoreCanvas(answerCanvasRef.current, "answer", page, question);
    setShowAnswer(false);
    if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
  }, [page, question, rangePage, restoreCanvas, view]);

  useEffect(
    () => () => {
      if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
    },
    [],
  );

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
      y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height),
    };
  };

  const beginStroke = (surface: Surface, event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    const key = snapshotKey(surface);
    const history = historyRef.current.get(key) ?? [];
    history.push(event.currentTarget.toDataURL("image/png"));
    historyRef.current.set(key, history.slice(-20));
    drawingRef.current = { surface, lastX: point.x, lastY: point.y, points: [point] };
    setInkStatus("saving");
    setStatusText(tool === "eraser" ? "正在擦除笔迹" : "AI 正在理解这段书写");
  };

  const moveStroke = (surface: Surface, event: React.PointerEvent<HTMLCanvasElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.surface !== surface) return;
    const point = canvasPoint(event);
    const context = event.currentTarget.getContext("2d")!;
    context.save();
    if (tool === "eraser") {
      context.globalCompositeOperation = "destination-out";
      context.lineWidth = 58;
    } else if (tool === "marker") {
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 0.28;
      context.strokeStyle = "#FACC15";
      context.lineWidth = 28;
    } else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = "#EF4444";
      context.lineWidth = 5;
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(drawing.lastX, drawing.lastY);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.restore();
    drawingRef.current = { ...drawing, lastX: point.x, lastY: point.y, points: [...drawing.points, point] };
  };

  const looksLikeMark = (points: Array<{x:number;y:number}>) => {
    if (points.length < 8) return false;
    const first = points[0];
    const last = points[points.length - 1];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    return width > 45 && height > 28 && Math.hypot(last.x - first.x, last.y - first.y) < Math.max(width, height) * 0.32;
  };

  const buildComposite = async (p: number, q: string) => {
    const source = new Image();
    source.src = `/math-review-questions/page-${p}.png`;
    await source.decode();
    const output = document.createElement("canvas");
    output.width = 1000;
    const sourceHeight = Math.round((1000 * SOURCE_HEIGHT) / SOURCE_WIDTH);
    output.height = sourceHeight + 590;
    const context = output.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(source, 0, 0, 1000, sourceHeight);
    if (pageCanvasRef.current) context.drawImage(pageCanvasRef.current, 0, 0, 1000, sourceHeight);
    context.fillStyle = "#F7F8FB";
    context.fillRect(0, sourceHeight, 1000, 590);
    context.fillStyle = "#252936";
    context.font = "bold 28px sans-serif";
    context.fillText(`第 ${q} 题 · 学生手写作答`, 38, sourceHeight + 50);
    if (answerCanvasRef.current) context.drawImage(answerCanvasRef.current, 0, sourceHeight + 72, 1000, 500);
    return output.toDataURL("image/jpeg", 0.86);
  };

  const grade = useCallback(
    async (p: number, q: string) => {
      if (p !== page || q !== question) return;
      setGrading(true);
      setFeedbacks((current) => ({
        ...current,
        [`${p}:${q}`]: { verdict: "待判断", text: "正在识别本题手写步骤并与对应答案对照……" },
      }));
      try {
        const compressed = await compressImageForApi(await buildComposite(p, q));
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "image",
            mode: "circle_region",
            imageDataUrl: compressed,
            fileName: "总复习用典型题目.pptx",
            pdfTitle: "高等数学典型题",
            pageNum: p,
            markKind: "ink",
            userIntent: `只批改第 ${q} 题的红色手写作答；答案依据来自《总复习用典型题目解答》第1页`,
          }),
        });
        const data = (await response.json()) as CircleRegionResult & { error?: string };
        if (!response.ok || data.error) throw new Error(data.error || `API ${response.status}`);
        const text = formatCircleRegionAnswer(data);
        const demo = /演示模式|演示解析|视觉模型额度不足/.test(text);
        const verdict: Feedback["verdict"] = demo
          ? "未连接"
          : /部分正确/.test(text)
            ? "部分正确"
            : /需要订正|错误|不正确/.test(text)
              ? "需要订正"
              : /正确/.test(text)
                ? "正确"
                : "待判断";
        setFeedbacks((current) => ({
          ...current,
          [`${p}:${q}`]: {
            verdict,
            text: demo ? "手写已保存。连接 AI 视觉服务后，将在这里实时回显本题对错。" : text || "AI 已完成判断。",
          },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        setFeedbacks((current) => ({
          ...current,
          [`${p}:${q}`]: {
            verdict: "未连接",
            text: message.includes("not configured")
              ? "手写已保存。当前 AI 视觉服务未连接，配置后会自动判断本题对错。"
              : "手写已保存，AI 暂时无法判断，请稍后再试。",
          },
        }));
      } finally {
        setGrading(false);
        setInkStatus("saved");
        setStatusText("笔迹已保存，AI 已完成本轮理解");
      }
    },
    [page, question],
  );

  const endStroke = (surface: Surface, event: React.PointerEvent<HTMLCanvasElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.surface !== surface) return;
    snapshotsRef.current.set(snapshotKey(surface), event.currentTarget.toDataURL("image/png"));
    persistSnapshots();
    drawingRef.current = null;
    const isMark = tool !== "eraser" && looksLikeMark(drawing.points);
    setInkStatus(isMark ? "mark" : "saved");
    setStatusText(isMark ? (surface === "answer" ? "已定位你圈出的步骤，AI 正在重点检查" : "已记住这处关注，不打断你继续阅读") : "笔迹已保存，AI 在后台理解");
    if (surface === "answer") {
      if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
      const currentPage = page;
      const currentQuestion = question;
      setInkStatus("thinking");
      gradeTimerRef.current = setTimeout(() => void grade(currentPage, currentQuestion), isMark ? 400 : 1600);
    }
  };

  const undoCurrent = () => {
    const surface: Surface = view === "range" ? "range" : question ? "answer" : "page";
    const canvas = surface === "range" ? rangeCanvasRef.current : surface === "answer" ? answerCanvasRef.current : pageCanvasRef.current;
    if (!canvas) return;
    const key = snapshotKey(surface);
    const history = historyRef.current.get(key) ?? [];
    const previous = history.pop();
    if (previous === undefined) return;
    historyRef.current.set(key, history);
    if (previous) snapshotsRef.current.set(key, previous); else snapshotsRef.current.delete(key);
    persistSnapshots();
    restoreCanvas(canvas, surface, surface === "range" ? rangePage : page, question);
    setInkStatus("saved");
    setStatusText("已撤销上一笔");
  };

  const changePracticePage = (next: number) => {
    setPage(next);
    setQuestion(PAGE_QUESTIONS[next][0] ?? "");
    setAssistantMessages([]);
    setAssistantInput("");
  };

  const clearCurrent = () => {
    const canvas = answerCanvasRef.current;
    if (!canvas || !question) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    snapshotsRef.current.delete(snapshotKey("answer"));
    persistSnapshots();
    setFeedbacks((current) => ({
      ...current,
      [feedbackKey()]: { verdict: "待判断", text: "答题区已清空，可以重新作答。" },
    }));
  };

  const clearRangeMarks = () => {
    const canvas = rangeCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    snapshotsRef.current.delete(`range:${rangePage}`);
    persistSnapshots();
  };

  const startVoice = () => {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      start: () => void;
      onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
      onend: () => void;
      onerror: () => void;
    };
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setStatusText("当前浏览器暂不支持语音识别，可以继续键盘提问");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (view === "practice") setAssistantInput(transcript); else setRangeInput(transcript);
      setStatusText("已识别语音，并带上当前页面与最近笔迹");
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setStatusText("没有听清，可以再说一次"); };
    setListening(true);
    setStatusText("正在听，当前题目和最近笔迹会自动作为上下文");
    recognition.start();
  };

  const currentFeedback = feedbacks[feedbackKey()] ?? {
    verdict: "待判断" as const,
    text: "在右侧写下本题步骤，停笔 2 秒后自动判断。",
  };
  const verdictStyle = {
    待判断: "bg-[#F1F2F6] text-[#727887]",
    正确: "bg-[#E8F8F0] text-[#198754]",
    部分正确: "bg-[#FFF4DE] text-[#B36B00]",
    需要订正: "bg-[#FDEBEC] text-[#C6424B]",
    未连接: "bg-[#EEF0FF] text-[#4D5CFF]",
  }[currentFeedback.verdict];

  const askAssistant = (raw?: string) => {
    const input = (raw ?? assistantInput).trim();
    if (!input) return;
    const reply = !question
      ? input.includes("怎么做") || input.includes("顺序")
        ? "建议先完成 1-1～1-3 的极限运算，再做数列极限和连续性题目；不会提前展示答案。"
        : "这套题包含极限运算、数列极限与连续性三个部分。你可以问复习顺序、知识范围或预计用时。"
      : input.includes("提示")
        ? `第 ${question} 题建议先判断题型，再写出第一步所用公式。`
        : input.includes("答案")
          ? "完成作答后点击“查看答案解析”，不会覆盖你的原过程。"
          : `我已带上典型题第 ${page} 页第 ${question} 题的上下文。可以继续问我具体卡在哪一步。`;
    if (raw) return reply;
    setAssistantMessages((current) => [...current, `你：${input}`, `AI：${reply}`]);
    setAssistantInput("");
  };

  const askAboutRange = () => {
    const input = rangeInput.trim();
    if (!input) return;
    const current = RANGE_PAGES[rangePage - 1];
    const reply = input.includes("关系") && rangePage === 3
      ? "这一页的箭头表示充分条件方向：偏导数连续可推出可微，可微进一步推出连续和偏导数存在；反向通常不能直接成立。"
      : input.includes("关系")
        ? `第 ${rangePage} 页主要用“${current.detail}”组织内容。切换到第 3 页可以集中查看概念之间的推导关系。`
        : `我已带上第 ${rangePage} 页“${current.title}”以及你的圈选位置。可以继续追问某个概念或公式。`;
    setRangeMessages((messages) => [...messages, `你：${input}`, `AI：${reply}`]);
    setRangeInput("");
  };

  const openPractice = () => {
    setView("practice");
    if (!question) {
      setPage(2);
      setQuestion("1-1");
    }
  };

  return (
    <div className="fixed inset-0 z-[620] flex h-[100dvh] flex-col bg-[#F3F4F8]">
      <header className="relative flex h-[68px] shrink-0 items-center border-b border-[#E7E9EF] bg-white px-5">
        <button
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-xl hover:bg-[#F4F5F8]"
          aria-label="关闭高数复习"
        >
          <X size={17} />
        </button>
        <div className="ml-4">
          <b className="block text-[14px]">高等数学 · 总复习</b>
        </div>
        <nav className="absolute left-1/2 flex -translate-x-1/2 rounded-xl bg-[#F2F3F7] p-1" aria-label="总复习页面切换">
          {([
            ["range", "内容"],
            ["practice", "题目"],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => key === "practice" ? openPractice() : setView(key)} className={`min-w-[78px] rounded-lg px-5 py-2 text-[10px] font-semibold transition ${view === key ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#747B89] hover:text-[#343946]"}`}>{label}</button>
          ))}
        </nav>
        {(view === "range" || (view === "practice" && question)) && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-[#F2F7FF] px-3 py-2 text-[9px] text-[#5D79A5]">
              <span className={`h-1.5 w-1.5 rounded-full ${inkStatus === "thinking" || inkStatus === "saving" ? "animate-pulse bg-[#4D5CFF]" : "bg-[#71B79A]"}`} />
              {statusText}
            </div>
            <PenToolbar layout="inline" showMarker tool={tool} onToolChange={setTool} />
            <button onClick={undoCurrent} className="grid h-8 w-8 place-items-center rounded-xl bg-[#F4F5F8] text-[#626977] hover:bg-[#EAECF3]" aria-label="撤销上一笔" title="撤销上一笔"><Undo2 size={14}/></button>
            <button onClick={view === "range" ? clearRangeMarks : clearCurrent} className="rounded-xl bg-[#F4F5F8] px-3 py-2 text-[10px] text-[#626977]">
              {view === "range" ? `清空第 ${rangePage} 页圈选` : `清空第 ${question} 题`}
            </button>
          </div>
        )}
      </header>

      {view === "range" && (
        <main className="grid min-h-0 flex-1 grid-cols-[58%_42%]">
          <section className="flex min-h-0 flex-col border-r border-[#E1E4EB] bg-[#ECEEF4] p-5">
            <div className="mb-3 flex items-center">
              <div>
                <span className="mr-3 rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-[#4D5CFF]">复习内容 · 第 {rangePage} 页</span>
                <b className="text-[12px]">{RANGE_PAGES[rangePage - 1].title}</b>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button aria-label="上一页内容" disabled={rangePage === 1} onClick={() => setRangePage(rangePage - 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white disabled:opacity-30"><ChevronLeft size={15} /></button>
                <b className="min-w-[44px] text-center text-[11px]">{rangePage}/3</b>
                <button aria-label="下一页内容" disabled={rangePage === 3} onClick={() => setRangePage(rangePage + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white disabled:opacity-30"><ChevronRight size={15} /></button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="relative w-full max-w-[920px] overflow-hidden rounded-2xl" style={{ aspectRatio: `${SOURCE_WIDTH}/${SOURCE_HEIGHT}` }}>
                <RangeDigitalPage page={rangePage} />
                <canvas ref={rangeCanvasRef} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }} onPointerDown={(event) => beginStroke("range", event)} onPointerMove={(event) => moveStroke("range", event)} onPointerUp={(event) => endStroke("range", event)} onPointerLeave={(event) => endStroke("range", event)} />
              </div>
            </div>
          </section>
          <section className="flex min-h-0 flex-col bg-white p-5">
            <h2 className="text-[20px] font-bold">第 {rangePage} 页 · {RANGE_PAGES[rangePage - 1].title}</h2>
            <div className="mt-4 rounded-2xl border border-[#E4E7EF] bg-[#F8F9FC] p-4">
              <div className="flex items-center gap-2"><BookOpen size={14} className="text-[#4D5CFF]" /><b className="text-[11px]">第 {rangePage} 页 · {RANGE_PAGES[rangePage - 1].title}</b></div>
              <p className="mt-2 text-[9px] leading-5 text-[#737A89]">{RANGE_PAGES[rangePage - 1].detail}</p>
            </div>
            <div className="flex-1" />
            <div className="rounded-2xl border border-[#E1E4EC] bg-white p-3 shadow-[0_8px_24px_rgba(34,40,65,.08)]">
              {rangeMessages.filter((message) => message.startsWith("AI：")).slice(-1).map((message) => <p key={message} className="mb-2 px-1 text-[9px] leading-5 text-[#626977]">{message.replace("AI：", "")}</p>)}
              <div className="flex gap-2">
                <input value={rangeInput} onChange={(event) => setRangeInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") askAboutRange(); }} placeholder="问当前内容…" className="h-11 min-w-0 flex-1 rounded-xl bg-[#F2F3F7] px-4 text-[10px] outline-none" />
                <button onClick={startVoice} className={`grid h-11 w-11 place-items-center rounded-xl ${listening ? "bg-[#FDEBEC] text-[#D74855]" : "bg-[#EEF2FF] text-[#4D5CFF]"}`} aria-label="语音提问"><Mic size={14}/></button>
                <button onClick={askAboutRange} className="grid h-11 w-11 place-items-center rounded-xl bg-[#4D5CFF] text-white" aria-label="向 AI 提问"><Send size={14} /></button>
              </div>
            </div>
          </section>
        </main>
      )}

      {view === "practice" && (
        <main className="grid min-h-0 flex-1 grid-cols-[54%_46%]">
          <section className="flex min-h-0 flex-col border-r border-[#E1E4EB] bg-[#ECEEF4] p-5">
            <div className="mb-3 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <button aria-label="上一页题目" disabled={page === 1} onClick={() => changePracticePage(page - 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white disabled:opacity-30"><ChevronLeft size={15} /></button>
                <b className="min-w-[44px] text-center text-[11px]">{page}/3</b>
                <button aria-label="下一页题目" disabled={page === 3} onClick={() => changePracticePage(page + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white disabled:opacity-30"><ChevronRight size={15} /></button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="relative w-full max-w-full overflow-hidden rounded-lg bg-white shadow-[0_5px_24px_rgba(27,31,48,.10)]" style={{ aspectRatio: `${SOURCE_WIDTH}/${SOURCE_HEIGHT}` }}>
                <img src={`/math-review-questions/page-${page}.png`} alt={`总复习典型题目第${page}页`} className="absolute inset-0 h-full w-full select-none" draggable={false} />
                {page === 1 && (
                  <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col justify-center px-[9%] text-white">
                    <p className="text-[11px] font-semibold tracking-[.2em] text-[#8FD5FF]">高等数学 · 期末总复习</p>
                    <h2 className="mt-4 max-w-[78%] text-[34px] font-bold leading-tight">典型题目练习</h2>
                    <p className="mt-3 text-[13px] text-white/70">极限与连续专题 · 共 6 题</p>
                    <div className="mt-9 grid max-w-[82%] grid-cols-3 gap-3">
                      {["极限运算 · 3题", "数列极限 · 1题", "连续性 · 2题"].map((item) => (
                        <div key={item} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-[10px] font-semibold backdrop-blur-sm">{item}</div>
                      ))}
                    </div>
                    <p className="mt-8 text-[9px] text-white/45">2025—2026 学年第 2 学期 · 建议用时 25 分钟</p>
                  </div>
                )}
                <canvas ref={pageCanvasRef} className="absolute inset-0 z-10 h-full w-full touch-none" style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }} onPointerDown={(event) => beginStroke("page", event)} onPointerMove={(event) => moveStroke("page", event)} onPointerUp={(event) => endStroke("page", event)} onPointerLeave={(event) => endStroke("page", event)} />
              </div>
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto bg-white p-5 pb-28">
            {!question ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <FileText size={34} className="text-[#A8AEBB]" />
                <h2 className="mt-4 text-[17px] font-bold">极限与连续专题</h2>
                <p className="mt-2 text-[10px] text-[#858C9A]">6 道典型题 · 建议用时 25 分钟</p>
                <button onClick={() => changePracticePage(2)} className="mt-5 rounded-xl bg-[#4D5CFF] px-5 py-2.5 text-[10px] font-semibold text-white">从第 1-1 题开始</button>
              </div>
            ) : (
              <>
                <div className="flex items-start">
                  <div>
                    <p className="text-[9px] font-bold tracking-[.12em] text-[#9CA3AF]">选择作答题号</p>
                    <h2 className="mt-1 text-[20px] font-bold">第 {question} 题作答</h2>
                  </div>
                  <span className={`ml-auto rounded-full px-3 py-1.5 text-[10px] font-semibold ${verdictStyle}`}>{grading ? "判断中…" : currentFeedback.verdict}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {PAGE_QUESTIONS[page].map((item) => (
                    <button key={item} onClick={() => setQuestion(item)} className={`rounded-lg px-3 py-1.5 text-[9px] font-semibold ${item === question ? "bg-[#4D5CFF] text-white" : "bg-[#F3F4F7] text-[#626977] hover:bg-[#E9EBF5]"}`}>{item}</button>
                  ))}
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-[#DDE1EB]">
                  <div className="flex items-center border-b border-[#ECEEF3] bg-[#FAFBFD] px-4 py-3">
                    <b className="text-[11px]">第 {question} 题手写区</b>
                    <span className="ml-auto flex items-center gap-1 text-[9px] text-[#4D5CFF]"><Sparkles size={11} />停笔实时判断</span>
                  </div>
                  <canvas ref={answerCanvasRef} className="block w-full touch-none bg-[linear-gradient(#fff_43px,#E9ECF3_44px)] bg-[length:100%_44px]" style={{ height: 390, cursor: tool === "eraser" ? "cell" : "crosshair" }} onPointerDown={(event) => beginStroke("answer", event)} onPointerMove={(event) => moveStroke("answer", event)} onPointerUp={(event) => endStroke("answer", event)} onPointerLeave={(event) => endStroke("answer", event)} />
                </div>
                <div className="mt-4 rounded-2xl bg-[#F7F8FB] p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#4D5CFF]" />
                    <b className="text-[11px]">AI 对第 {question} 题的判断</b>
                    {grading && <Loader2 size={13} className="animate-spin text-[#4D5CFF]" />}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[10px] leading-6 text-[#5F6675]">{currentFeedback.text}</p>
                  <button onClick={() => setShowAnswer(!showAnswer)} className="mt-3 rounded-xl bg-white px-3 py-2 text-[10px] font-semibold text-[#4D5CFF] shadow-sm">{showAnswer ? "收起答案解析" : "查看答案解析"}</button>
                  {showAnswer && (
                    <div className="mt-3 rounded-xl border border-[#E4E7EF] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <b className="text-[10px] text-[#252936]">第 {question} 题参考解析</b>
                        <span className="text-[8px] text-[#9299A7]">解答文件 · 第 1 页</span>
                      </div>
                      <p className="mt-2 text-[10px] leading-6 text-[#626977]">{ANSWER_GUIDES[question]}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      )}

      {view === "practice" && (
        <AiConversationModule
          contextKey={`review-${page}-${question || "overview"}`}
          contextLabel={question ? `典型题第 ${page} 页 · 第 ${question} 题 · 当前笔迹` : "高等数学总复习"}
          initialAssistant={question ? `我已带上第 ${question} 题、当前手写过程和批改结果。可以继续问提示、答案依据或错误步骤。` : "我已带上整套典型题，可以一起安排复习顺序和用时。"}
          externalAssistantMessage={currentFeedback.text}
          onAsk={(text) => askAssistant(text)}
          placeholder={question ? `问第 ${question} 题…` : "问这套题的范围、顺序或用时…"}
          suggestions={question ? ["给我一个提示","检查这一步","解释参考答案"] : ["建议复习顺序","有哪些重点？","预计需要多久？"]}
          className="fixed bottom-5 right-5 z-[660] h-[330px] w-[min(520px,calc(46vw-40px))] rounded-2xl shadow-[0_12px_36px_rgba(34,40,65,.16)]"
          compact
        />
      )}
    </div>
  );
}
