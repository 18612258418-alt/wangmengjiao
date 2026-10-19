import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, Square, Loader2, BookmarkCheck, Minimize2, Maximize2, Pause, Play, Search, AudioLines, FileText, MoreHorizontal, Check, Sparkles, Bot, Clock3, ChevronDown, ChevronRight, Network } from "lucide-react";
import { DEMO_TRANSCRIPT } from "./demoTranscript";

interface Props {
  onClose: () => void;
  /** 转录完成后回调，传入转录文字，由 App 层保存到记忆 */
  onSave: (transcript: string, recording: { title: string; durationSeconds: number; audioUrl?: string }) => void;
  saveLocation?: string;
  initialRecording?: { id: string; title: string; durationSeconds: number; transcript: string; audioUrl?: string };
}

type Phase = "idle" | "recording" | "paused" | "transcribing" | "done" | "saved";
type RightPanelTab = "transcript" | "insights";
type RecordingHistoryItem = { id: string; title: string; duration: number };

const DEMO_INSIGHTS = [
  { id: "insight_1", number: "1", kind: "key", label: "核心概念", title: "简谐振动的三个决定量", summary: "简谐振动由振幅、角频率和初相共同决定。", time: 18, subpoints: ["1.1 振幅 A 决定最大位移", "1.2 角频率 ω 决定振动快慢", "1.3 初相 φ₀ 决定初始状态"], visual: "outline" },
  { id: "insight_2", number: "2", kind: "risk", label: "公式与易错点", title: "振动叠加前先判断相位差", summary: "不能直接将两个振幅相加，需要先比较相位关系。", time: 42, subpoints: ["2.1 同频是使用叠加公式的前提", "2.2 相位差决定相长或相消", "2.3 合振幅不是简单相加"], visual: "formula" },
  { id: "insight_3", number: "3", kind: "question", label: "课堂疑问", title: "相位差为 π 时合振幅如何变化？", summary: "这一问题关联后续合成振动例题。", time: 68, subpoints: ["3.1 两个振动方向始终相反", "3.2 等振幅时可能完全抵消", "3.3 不等振幅时取振幅之差"], visual: "none" },
  { id: "insight_4", number: "4", kind: "task", label: "课后任务", title: "完成 π/3 相位差的合成振动练习", summary: "建议结合旋转矢量图重新推导一次。", time: 96, subpoints: ["4.1 画出两个旋转矢量", "4.2 标注 π/3 相位差", "4.3 用余弦定理求合振幅"], visual: "none" },
] as const;

const INSIGHT_DETAIL_COPY: Record<string, string[]> = {
  insight_1: ["质点位移随时间按余弦规律变化，振幅 A 表示最大位移。", "可用匀速旋转矢量在坐标轴上的投影理解简谐振动。", "角频率 ω 决定快慢，初相 φ₀ 决定开始时刻的运动状态。"],
  insight_2: ["两个同频振动叠加时，不能直接将振幅相加，需要先判断相位关系。", "合振幅同时由两个分振幅和相位差共同决定。", "相位相同时振动加强，相位相反时振动减弱或完全抵消。"],
  insight_3: ["相位差为 π 时，两个振动的方向始终相反。", "两个振幅相等时，合振幅为 0，表现为完全抵消。", "两个振幅不相等时，合振幅等于两者振幅之差。"],
  insight_4: ["先画出两个同频旋转矢量，并保持长度与振幅对应。", "在图中标出 π/3 的夹角，明确两个振动的相位关系。", "利用余弦定理求合矢量长度，再写出合成振动表达式。"],
};

/** 演示版固定走示例文稿，不等待 ASR 上传 */
const USE_DEMO_TRANSCRIPT =
  import.meta.env.VITE_VOICE_DEMO !== "false";

const DEMO_SPINNER_MS = 180;

// 随机波形柱高度（录音时动态更新）
function useWaveform(active: boolean) {
  const [bars, setBars] = useState(() => Array.from({ length: 28 }, () => 0.15));

  useEffect(() => {
    if (!active) {
      setBars(Array.from({ length: 28 }, () => 0.15));
      return;
    }
    const id = setInterval(() => {
      setBars(prev => prev.map((v, i) => {
        const target = Math.random() * 0.7 + 0.15;
        return v + (target - v) * (0.25 + Math.sin(i) * 0.1);
      }));
    }, 80);
    return () => clearInterval(id);
  }, [active]);

  return bars;
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function buildTranscriptSegments(text: string, duration: number) {
  const paragraphs = text.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);
  const items = paragraphs.length > 1
    ? paragraphs
    : (text.match(/[^。！？!?]+[。！？!?]?/g) ?? [text]).map(item => item.trim()).filter(Boolean);
  const demoTimes = [0, 18, 42, 68, 96];
  const totalCharacters = Math.max(1, items.reduce((sum, item) => sum + item.length, 0));
  let consumedCharacters = 0;
  return items.map((item, index) => {
    const proportionalTime = Math.floor((consumedCharacters / totalCharacters) * Math.max(duration, 1));
    const startTime = text.trim() === DEMO_TRANSCRIPT.trim() ? (demoTimes[index] ?? proportionalTime) : proportionalTime;
    consumedCharacters += item.length;
    return { id: `transcript_${index}`, text: item, startTime };
  });
}

function recordingTitle() {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 课堂录音`;
}

function showDemoTranscript(
  setPhase: (p: Phase) => void,
  setTranscript: (t: string) => void,
  finalText = DEMO_TRANSCRIPT,
) {
  setPhase("transcribing");
  window.setTimeout(() => {
    setTranscript(finalText);
    setPhase("done");
  }, DEMO_SPINNER_MS);
}

export function VoiceModal({ onClose, onSave, saveLocation = "当前学科 / 笔记", initialRecording }: Props) {
  const [phase, setPhase] = useState<Phase>(initialRecording ? "saved" : "idle");
  const [seconds, setSeconds] = useState(initialRecording?.durationSeconds ?? 0);
  const [transcript, setTranscript] = useState(initialRecording?.transcript ?? "");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [title, setTitle] = useState(initialRecording?.title ?? recordingTitle);
  const [search, setSearch] = useState("");
  const [autoSaveMemory, setAutoSaveMemory] = useState(true);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(initialRecording?.audioUrl);
  const [rightTab, setRightTab] = useState<RightPanelTab>("insights");
  const [selectedInsightId, setSelectedInsightId] = useState<string>();
  const [expandedInsightId, setExpandedInsightId] = useState<string>();
  const [anchorNotice, setAnchorNotice] = useState<string>();
  const [insightPlayhead, setInsightPlayhead] = useState(0);
  const [insightPlaying, setInsightPlaying] = useState(false);
  const [recordingHistory, setRecordingHistory] = useState<RecordingHistoryItem[]>([]);
  const [currentRecordingId, setCurrentRecordingId] = useState(() => initialRecording?.id ?? `recording_${Date.now()}`);
  const [activeRecordingId, setActiveRecordingId] = useState(currentRecordingId);
  const bars = useWaveform(phase === "recording");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<{ stop: () => void } | null>(null);
  const liveTranscriptRef = useRef("");
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const currentRecordingTabRef = useRef<HTMLButtonElement>(null);
  const currentInsightRef = useRef<HTMLDivElement>(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => {
    stopTimer();
    speechRecognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleSave = useCallback(() => {
    if (!transcript) return;
    setPhase("saved");
    setSaveToastVisible(true);
    onSave(transcript, { title, durationSeconds: seconds, audioUrl });
  }, [transcript, title, seconds, audioUrl, onSave]);

  useEffect(() => {
    if (!saveToastVisible) return;
    const timer = window.setTimeout(() => setSaveToastVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [saveToastVisible]);

  useEffect(() => {
    if (phase === "done" && autoSaveMemory && transcript) handleSave();
  }, [phase, autoSaveMemory, transcript, handleSave]);

  const insightDuration = Math.max(seconds, 120);

  useEffect(() => {
    if (!insightPlaying || audioUrl) return;
    const timer = window.setInterval(() => setInsightPlayhead(value => {
      if (value >= insightDuration) {
        setInsightPlaying(false);
        return insightDuration;
      }
      return value + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [insightPlaying, audioUrl, insightDuration]);

  const finishTranscription = useCallback(() => {
    const finalText = USE_DEMO_TRANSCRIPT
      ? DEMO_TRANSCRIPT
      : liveTranscriptRef.current || "录音已完成，暂未识别到清晰文字。";
    showDemoTranscript(setPhase, setTranscript, finalText);
  }, []);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    if (!USE_DEMO_TRANSCRIPT) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.start(100);

        const browserWindow = window as typeof window & {
          SpeechRecognition?: new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
            start: () => void;
            stop: () => void;
          };
          webkitSpeechRecognition?: new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
            start: () => void;
            stop: () => void;
          };
        };
        const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
        if (Recognition) {
          const recognition = new Recognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "zh-CN";
          recognition.onresult = event => {
            let text = "";
            for (let i = 0; i < event.results.length; i += 1) text += event.results[i][0].transcript;
            liveTranscriptRef.current = text.trim();
            setLiveTranscript(liveTranscriptRef.current);
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        }
        setPhase("recording");
        setSeconds(0);
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        return;
      } catch {
        finishTranscription();
        return;
      }
    }

    // 演示模式：不采集麦克风，模拟录音 1.5s 后直接出示例文稿
    setPhase("recording");
    setSeconds(0);
    liveTranscriptRef.current = DEMO_TRANSCRIPT.slice(0, 18);
    setLiveTranscript(liveTranscriptRef.current);
    timerRef.current = setInterval(() => setSeconds(s => {
      const next = s + 1;
      const revealRatio = Math.min(1, 0.12 + next * 0.11);
      liveTranscriptRef.current = DEMO_TRANSCRIPT.slice(0, Math.ceil(DEMO_TRANSCRIPT.length * revealRatio));
      setLiveTranscript(liveTranscriptRef.current);
      return next;
    }), 1000);
  }, [finishTranscription]);

  const stopRecording = useCallback(() => {
    stopTimer();
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setMinimized(false);
    if (USE_DEMO_TRANSCRIPT) {
      finishTranscription();
      return;
    }

    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      if (blob.size > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(typeof reader.result === "string" ? reader.result : undefined);
          finishTranscription();
        };
        reader.readAsDataURL(blob);
      } else {
        finishTranscription();
      }
    };
    mr.stop();
  }, [finishTranscription]);

  const toggleRecord = () => {
    if (phase === "idle") startRecording();
    else if (phase === "recording") stopRecording();
  };

  const pauseRecording = () => {
    if (phase !== "recording") return;
    stopTimer();
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.pause();
    setPhase("paused");
  };

  const resumeRecording = () => {
    if (phase !== "paused") return;
    if (mediaRecorderRef.current?.state === "paused") mediaRecorderRef.current.resume();
    setPhase("recording");
    timerRef.current = setInterval(() => setSeconds(s => {
      const next = s + 1;
      if (USE_DEMO_TRANSCRIPT) {
        const revealRatio = Math.min(1, 0.12 + next * 0.11);
        liveTranscriptRef.current = DEMO_TRANSCRIPT.slice(0, Math.ceil(DEMO_TRANSCRIPT.length * revealRatio));
        setLiveTranscript(liveTranscriptRef.current);
      }
      return next;
    }), 1000);
  };

  const startNewRecording = async () => {
    if (transcript || phase === "saved" || phase === "done") {
      setRecordingHistory(items => [{ id: currentRecordingId, title, duration: seconds }, ...items]);
    }
    const nextRecordingId = `recording_${Date.now()}`;
    setCurrentRecordingId(nextRecordingId);
    setActiveRecordingId(nextRecordingId);
    setSeconds(0);
    setTranscript("");
    setLiveTranscript("");
    setAudioUrl(undefined);
    liveTranscriptRef.current = "";
    setTitle(`${recordingTitle()} ${recordingHistory.length + 2}`);
    setMinimized(false);
    setSaveToastVisible(false);
    setRightTab("insights");
    setSelectedInsightId(undefined);
    setExpandedInsightId(undefined);
    setAnchorNotice(undefined);
    await startRecording();
    window.requestAnimationFrame(() => currentRecordingTabRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const visibleInsights = phase === "idle" ? [] : DEMO_INSIGHTS.slice(0, phase === "done" || phase === "saved" ? DEMO_INSIGHTS.length : Math.max(1, Math.min(DEMO_INSIGHTS.length, Math.ceil(((liveTranscript || transcript).length) / Math.max(1, DEMO_TRANSCRIPT.length) * DEMO_INSIGHTS.length))));
  const canSeekInsights = phase === "done" || phase === "saved";
  useEffect(() => {
    if (phase !== "recording") return;
    window.requestAnimationFrame(() => currentInsightRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, [phase, visibleInsights.length]);

  useEffect(() => {
    const current = [...visibleInsights].reverse().find(item => insightPlayhead >= item.time);
    if (current) setSelectedInsightId(current.id);
  }, [insightPlayhead, visibleInsights.length]);

  const seekToInsight = (id: string, time: number) => {
    if (!canSeekInsights) return;
    setSelectedInsightId(id);
    setInsightPlayhead(time);
    setInsightPlaying(true);
    setAnchorNotice(`已定位到 ${fmt(time)}`);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = Math.min(time, previewAudioRef.current.duration || time);
      previewAudioRef.current.play().catch(() => undefined);
    }
    window.setTimeout(() => setAnchorNotice(undefined), 2200);
  };

  const toggleInsightPlayback = () => {
    if (previewAudioRef.current) {
      if (insightPlaying) previewAudioRef.current.pause(); else previewAudioRef.current.play().catch(() => undefined);
    }
    setInsightPlaying(value => !value);
  };

  const closeRecording = () => {
    stopTimer();
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    onClose();
  };

  if (minimized && (phase === "recording" || phase === "paused")) {
    return (
      <div className="fixed left-1/2 top-4 z-[600] flex w-[min(520px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#E0E4EB] bg-white px-3 py-2.5 shadow-[0_12px_38px_rgba(25,31,47,0.18)]">
        <button type="button" onClick={() => setMinimized(false)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="展开录音窗口">
          <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ${phase === "paused" ? "bg-[#F0F2F6]" : "bg-[#FFF0F1]"}`}>
            {phase === "paused" ? <Pause size={14} className="text-[#697180]"/> : <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#EF535D]"/>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#272C36]">{phase === "paused" ? "录音已暂停" : "正在录音"} <span className="font-mono text-[12px] text-[#737A88]">{fmt(seconds)}</span></span>
            <span className="block truncate text-[11px] text-[#9298A5]">{liveTranscript || "正在实时转写…"}</span>
          </span>
        </button>
        <button type="button" onClick={() => setMinimized(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#747B89] transition hover:bg-[#F1F2F5]" aria-label="展开录音窗口">
          <Maximize2 size={16}/>
        </button>
        <button type="button" onClick={phase === "paused" ? resumeRecording : pauseRecording} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F2F5] text-[#252932]" aria-label={phase === "paused" ? "继续录音" : "暂停录音"}>
          {phase === "paused" ? <Play size={14} fill="currentColor"/> : <Pause size={14} fill="currentColor"/>}
        </button>
        <button type="button" onClick={stopRecording} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F2F5] text-[#252932]" aria-label="停止录音">
          <Square size={13} fill="currentColor"/>
        </button>
        <button type="button" onClick={closeRecording} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#747B89] transition hover:bg-[#FFF0F1] hover:text-[#D64F59]" aria-label="关闭录音">
          <X size={17}/>
        </button>
      </div>
    );
  }

  const hasRecording = phase !== "idle";
  const panelText = phase === "done" || phase === "saved" ? transcript : liveTranscript;
  const transcriptSegments = useMemo(
    () => buildTranscriptSegments(panelText, USE_DEMO_TRANSCRIPT ? Math.max(seconds, 120) : seconds),
    [panelText, seconds],
  );
  const activeTranscriptSegment = [...transcriptSegments].reverse().find(segment => insightPlayhead >= segment.startTime);

  const seekToTranscript = (time: number) => {
    if (!canSeekInsights) return;
    setSelectedInsightId(undefined);
    setInsightPlayhead(time);
    setInsightPlaying(true);
    setAnchorNotice(`已定位到 ${fmt(time)}`);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = Math.min(time, previewAudioRef.current.duration || time);
      previewAudioRef.current.play().catch(() => undefined);
    }
    window.setTimeout(() => setAnchorNotice(undefined), 2200);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#202532]/25 p-5 backdrop-blur-[2px]">
      <section className="relative flex h-[min(820px,90vh)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_30px_100px_rgba(24,30,45,0.24)]">
        {saveToastVisible && <div role="status" className="absolute left-1/2 top-20 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#CDEBDD] bg-white px-5 py-3 text-[12px] font-semibold text-[#24815B] shadow-[0_12px_34px_rgba(34,91,68,.16)]"><Check size={16}/>已保存到 Memo · {saveLocation}</div>}
        <header className="flex h-16 shrink-0 items-center border-b border-[#E8EBF0] px-5">
          <button onClick={closeRecording} className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F3F6] text-[#59606D] hover:bg-[#E8EBF0]" aria-label="关闭录音"><X size={17}/></button>
          <div className="ml-5 flex items-center gap-2"><AudioLines size={19} className="text-[#4D5CFF]"/><b className="text-[15px] text-[#252A35]">录音</b>{phase === "recording" && <span className="flex items-center gap-1.5 rounded-full bg-[#FFF0F1] px-2.5 py-1 text-[10px] font-semibold text-[#D94F59]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"/>录制中</span>}{phase === "paused" && <span className="rounded-full bg-[#F1F2F5] px-2.5 py-1 text-[10px] font-semibold text-[#737A88]">已暂停</span>}</div>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[10px] font-semibold text-[#4E5562]">自动保存到记忆</p>
              <p className="mt-0.5 text-[8px] text-[#9299A6]">{autoSaveMemory ? "保存后可搜索、回听和复习" : "开启后自动沉淀为可复习的知识记忆"}</p>
            </div>
            <button type="button" role="switch" aria-checked={autoSaveMemory} aria-label="自动保存到记忆" onClick={() => setAutoSaveMemory(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${autoSaveMemory ? "bg-[#4D5CFF]" : "bg-[#CDD2DB]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${autoSaveMemory ? "left-6" : "left-1"}`}/></button>
            {(phase === "recording" || phase === "paused") && <button onClick={()=>setMinimized(true)} className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[#F1F3F6] text-[#59606D] hover:bg-[#E8EBF0]" aria-label="最小化"><Minimize2 size={17}/></button>}
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          <aside className="flex w-[250px] shrink-0 flex-col border-r border-[#E8EBF0] bg-[#F7F8FA]">
            <div className="p-4"><b className="text-[14px] text-[#292E39]">所有录音</b><div className="mt-3 flex h-9 items-center rounded-xl bg-white px-3 ring-1 ring-[#E5E8EE]"><Search size={14} className="mr-2 text-[#9299A6]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索标题、转写" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#ADB2BC]"/></div></div>
            <div className={`min-h-0 flex-1 overflow-y-auto px-3 pb-3 ${(phase === "idle" || phase === "recording" || phase === "paused" || phase === "saved") ? "mb-20" : ""}`}>
              {hasRecording ? <><button ref={currentRecordingTabRef} type="button" onClick={() => setActiveRecordingId(currentRecordingId)} className={`w-full rounded-2xl p-3 text-left transition-all ${activeRecordingId === currentRecordingId ? "bg-[#EEF0FF] ring-1 ring-[#DCE0FF]" : "hover:bg-white"}`}><div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#4D5CFF]"><AudioLines size={15}/></span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-[#303642]">{title}</b><span className="mt-1 block text-[9px] text-[#858C9A]">今天 · {fmt(seconds)}{phase === "done" ? " · 待保存" : phase === "paused" ? " · 已暂停" : phase === "recording" ? " · 录制中" : ""}</span></span><MoreHorizontal size={15} className="text-[#969CAA]"/></div></button>{recordingHistory.map(item => <div key={item.id} className="mt-2 w-full rounded-2xl p-3 text-left"><div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#7F8795] shadow-sm"><AudioLines size={15}/></span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-[#4B5260]">{item.title}</b><span className="mt-1 block text-[9px] text-[#969DAA]">今天 · {fmt(item.duration)}</span></span><MoreHorizontal size={15} className="text-[#A3A9B4]"/></div></div>)}</> : <div className="flex h-full flex-col items-center justify-center px-5 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#B2B7C1] shadow-sm"><AudioLines size={22}/></span><b className="mt-4 text-[12px] text-[#606774]">还没有录音</b><p className="mt-1 text-[10px] leading-5 text-[#A0A6B2]">开始录制后，会在这里保留记录</p></div>}
            </div>
          </aside>

          <main className="hidden">
            <div className="flex items-center px-6 py-4"><input value={title} onChange={e=>setTitle(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#2B303B] outline-none" aria-label="录音标题"/></div>
            <div className="flex flex-1 flex-col items-center justify-center px-7 pb-24">
              <div className="flex h-28 w-full max-w-[510px] items-center justify-center gap-[4px] overflow-hidden rounded-3xl bg-[#F4F5F8] px-8">
                {bars.map((h,i)=><i key={i} className="w-[3px] rounded-full transition-all duration-75" style={{height:`${Math.round((phase === "idle" ? .18 : h) * 72)}px`,background:phase === "recording"?`rgba(77,92,255,${.5+h*.5})`:phase === "paused"?"#9DA4B2":"#C8CDD6"}}/>)}
              </div>
              <div className="mt-7 font-mono text-[38px] font-medium tracking-[-.03em] text-[#242933]">{fmt(seconds)}</div>
              <p className="mt-2 text-[11px] text-[#949BA8]">{phase === "idle" ? "从左侧开始第一段录音" : phase === "recording" ? "正在录制并实时转写" : phase === "paused" ? "录音已暂停，点击继续" : phase === "transcribing" ? "正在完成最后一段转写" : phase === "saved" ? "录音已保存为知识来源" : "录音完成，可检查转写并保存"}</p>
            </div>
            {phase !== "idle" && phase !== "recording" && phase !== "paused" && phase !== "saved" && <div className="absolute inset-x-0 bottom-0 flex h-24 items-center justify-center gap-3 border-t border-[#ECEEF2] bg-white/90 backdrop-blur">
              {phase === "transcribing" && <div className="flex items-center gap-2 text-[12px] font-medium text-[#697180]"><Loader2 size={18} className="animate-spin text-[#4D5CFF]"/>正在生成完整文稿…</div>}
              {phase === "done" && !autoSaveMemory && <button onClick={handleSave} className="flex h-12 items-center gap-2 rounded-full bg-[#4D5CFF] px-6 text-[12px] font-semibold text-white"><BookmarkCheck size={16}/>保存到知识记忆</button>}
              {phase === "done" && autoSaveMemory && <div className="flex items-center gap-2 text-[12px] font-medium text-[#697180]"><Loader2 size={18} className="animate-spin text-[#4D5CFF]"/>正在自动保存到记忆…</div>}
            </div>}
          </main>

          <aside className="relative flex min-w-0 flex-1 flex-col bg-white">
            {audioUrl && (
              <audio
                ref={previewAudioRef}
                src={audioUrl}
                onTimeUpdate={event => setInsightPlayhead(event.currentTarget.currentTime)}
                onPlay={() => setInsightPlaying(true)}
                onPause={() => setInsightPlaying(false)}
                onEnded={() => setInsightPlaying(false)}
              />
            )}
            <div className="flex h-16 shrink-0 items-center gap-5 border-b border-[#ECEEF2] px-5">
              <input value={title} onChange={e=>setTitle(e.target.value)} className="min-w-0 max-w-[320px] flex-1 bg-transparent text-[14px] font-semibold text-[#2B303B] outline-none" aria-label="录音标题"/>
              <div className="ml-auto flex h-9 items-center rounded-xl bg-[#F2F3F6] p-1">
                <button type="button" onClick={() => setRightTab("transcript")} className={`flex h-7 items-center gap-1.5 rounded-lg px-4 text-[10px] font-semibold transition ${rightTab === "transcript" ? "bg-white text-[#39404D] shadow-sm" : "text-[#8A919E]"}`}><FileText size={13}/>转写</button>
                <button type="button" onClick={() => setRightTab("insights")} className={`flex h-7 items-center gap-1.5 rounded-lg px-4 text-[10px] font-semibold transition ${rightTab === "insights" ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#8A919E]"}`}><Bot size={14}/>知识总结</button>
              </div>
            </div>
            <div className={`min-h-0 flex-1 overflow-y-auto p-5 ${(phase === "recording" || phase === "paused" || phase === "saved") ? "pb-24" : ""}`}>
              {rightTab === "transcript" ? (
                panelText ? <div><p className="mb-5 flex items-center gap-1.5 text-[10px] text-[#9AA1AE]"><Clock3 size={12}/>{canSeekInsights ? "点击时间戳，可从该段开始回听" : "录音结束并完成对齐后，可点击时间戳回听"}</p><div className="space-y-5">{transcriptSegments.map(segment => { const active = canSeekInsights && activeTranscriptSegment?.id === segment.id; return <div key={segment.id} className={`rounded-xl px-2 py-1 transition ${active ? "bg-[#F1F3FF]" : ""}`}><p className="text-[12px] leading-7 text-[#4C5360]"><button type="button" disabled={!canSeekInsights} onClick={() => seekToTranscript(segment.startTime)} className={`mr-2 inline-block font-mono text-[11px] font-bold tabular-nums underline decoration-2 underline-offset-4 transition ${active ? "text-[#4D5CFF]" : canSeekInsights ? "text-[#168ACB] hover:text-[#4D5CFF]" : "cursor-default text-[#A0A7B3] no-underline"}`} title={canSeekInsights ? `从 ${fmt(segment.startTime)} 开始播放` : "录音结束后可跳转"}>{fmt(segment.startTime)}</button>{segment.text}{phase === "recording" && segment.id === transcriptSegments[transcriptSegments.length - 1]?.id && <span className="ml-1 inline-block h-4 w-[2px] animate-pulse align-middle bg-[#4D5CFF]"/>}</p></div>})}</div></div> : <div className="flex h-full flex-col items-center justify-center text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F4F5F8] text-[#B2B7C1]"><FileText size={21}/></span><b className="mt-4 text-[12px] text-[#626977]">等待转写内容</b><p className="mt-1 max-w-[210px] text-[10px] leading-5 text-[#A0A6B2]">开始录音后，识别出的文字会实时出现在这里</p></div>
              ) : visibleInsights.length > 0 ? (
                <div>
                  <div className="mb-6 flex items-center gap-2 rounded-xl bg-[#F7F8FB] px-3 py-2 text-[9px] text-[#9299A6]">
                    <span className="relative flex h-1.5 w-1.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C8AFF] opacity-40"/><span className="relative h-1.5 w-1.5 rounded-full bg-[#7C86DE]"/></span>
                    <span>{canSeekInsights ? "AI 已完成内容理解与时间对齐" : "AI 实时理解中"}</span>
                    <span className="ml-auto tabular-nums">{visibleInsights.length} 个知识点</span>
                  </div>
                  <div className="relative ml-1 pl-6">
                    {visibleInsights.map((item, index) => {
                      const selected = selectedInsightId === item.id;
                      const currentLiveInsight = !canSeekInsights && index === visibleInsights.length - 1;
                      const expanded = currentLiveInsight || (canSeekInsights && expandedInsightId === item.id);
                      return <div ref={currentLiveInsight ? currentInsightRef : undefined} key={item.id} className={`relative mb-4 w-full rounded-2xl border transition-all duration-300 ${expanded ? "border-[#D9DDFF] bg-[linear-gradient(135deg,#F5F6FF,#FBFAFF)] shadow-[0_8px_22px_rgba(77,92,255,.10)]" : "border-[#ECEEF3] bg-white hover:bg-[#F8F9FC]"}`}>
                        {index < visibleInsights.length - 1 && <span className="absolute -left-[27px] top-5 h-[calc(100%+1rem)] w-px bg-[#E0E3E9]"/>}
                        <span className={`absolute -left-[39px] top-2 z-10 grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[8px] font-bold transition-colors ${currentLiveInsight ? "voice-insight-rainbow" : ""} ${expanded ? "bg-white text-[#252A35] shadow-[0_0_7px_rgba(77,92,255,.20)]" : "bg-[#AEB4BF] text-white"}`}><span className="relative z-10">{item.number}</span></span>
                        <button type="button" disabled={!canSeekInsights} onClick={() => setExpandedInsightId(value => value === item.id ? undefined : item.id)} className={`relative block w-full px-3.5 py-3 pr-20 text-left ${canSeekInsights ? "cursor-pointer" : "cursor-default"}`} aria-label={`${expanded ? "收起" : "展开"}${item.title}`}>
                        <span className={`flex items-center gap-2 text-[10px] font-semibold text-[#9298A4] ${canSeekInsights ? "pr-9" : ""}`}><span>{canSeekInsights ? fmt(item.time) : `约 ${fmt(item.time)}`}</span>{item.kind === "risk" && <span className="rounded-full bg-[#FFF1E6] px-2 py-1 text-[8px] font-bold text-[#C56A24]">易错点</span>}{item.kind === "task" && <span className="rounded-full bg-[#EAF7F0] px-2 py-1 text-[8px] font-bold text-[#27845D]">待办</span>}</span>
                        <strong className="mt-2.5 block pr-9 text-[13px] leading-6 text-[#171B24]">{item.title}</strong>
                        <span className="absolute right-2 top-3 grid h-8 w-7 place-items-center">{expanded ? <ChevronDown size={16} className="text-[#4D5CFF]"/> : <ChevronRight size={16} className="text-[#9298A4]"/>}</span>
                        {expanded && <span className="mt-3 block border-t border-[#E6E8F5] pt-3">
                          <span className="block text-[11px] leading-6 text-[#4F5664]">{item.summary}</span>
                          <span className="mt-4 block space-y-4">{item.subpoints.map((point, subIndex) => {
                            const pointTitle = point.replace(/^\d+\.\d+\s*/, "");
                            const pointNumber = `${item.number}.${subIndex + 1}`;
                            const pointTime = item.time + subIndex * 12;
                            return <span key={point} className="grid grid-cols-[34px_1fr] gap-2.5">
                              <span className="grid h-7 place-items-center rounded-lg border border-[#DDE1FF] bg-white text-[9px] font-bold text-[#4D5CFF]">{pointNumber}</span>
                              <span className="min-w-0">
                                <span className="flex flex-wrap items-center gap-2"><b className="text-[11px] leading-5 text-[#252A35]">{pointTitle}</b><span className="inline-flex items-center gap-1 rounded-full bg-[#F1F2F6] px-2 py-0.5 font-mono text-[8px] text-[#858D9A]"><Clock3 size={9}/>{fmt(pointTime)}</span></span>
                                <span className="mt-1 block text-[9px] leading-[18px] text-[#687080]">{INSIGHT_DETAIL_COPY[item.id]?.[subIndex]}</span>
                                {item.id === "insight_1" && subIndex === 0 && <span className="mt-2 block rounded-lg bg-[linear-gradient(90deg,#F0F4FF,#F7F4FF)] px-3 py-2 text-center font-serif text-[14px] text-[#333A54]">x(t) = A cos(ωt + φ₀)</span>}
                                {item.id === "insight_1" && subIndex === 1 && <span className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-white p-2 ring-1 ring-[#E7E9F2]"><span className="relative block h-16 rounded-lg bg-[#F7F8FB]"><i className="absolute left-1/2 top-2 h-12 w-12 -translate-x-1/2 rounded-full border border-[#C9CFDC]"/><i className="absolute left-1/2 top-1/2 h-px w-11 -translate-x-1/2 bg-[#AAB2C1]"/><i className="absolute left-1/2 top-1/2 h-0.5 w-7 origin-left -rotate-45 bg-[#4D7BFF]"/></span><span className="relative block h-16 overflow-hidden rounded-lg bg-[#F7F8FB]"><svg viewBox="0 0 150 64" className="h-full w-full" aria-label="简谐振动曲线"><path d="M0 32 C18 2 36 2 54 32 S90 62 108 32 S132 2 150 32" fill="none" stroke="#4D7BFF" strokeWidth="2"/><path d="M0 32H150" stroke="#CBD0DB" strokeWidth="1"/></svg></span><span className="col-span-2 flex justify-between px-1 text-[7px] text-[#9AA1AD]"><span>旋转矢量示意</span><span>对应的简谐振动</span></span></span>}
                                {item.id === "insight_2" && subIndex === 0 && <span className="mt-2 flex gap-2 rounded-lg bg-[#FFF5E9] px-3 py-2 text-[9px] leading-4 text-[#B76722]"><span className="font-bold">易错提醒</span><span>只有相位差为 0 时，合振幅才等于 A₁ + A₂。</span></span>}
                                {item.id === "insight_2" && subIndex === 1 && <span className="mt-2 block rounded-lg bg-[linear-gradient(90deg,#F0F4FF,#F7F4FF)] px-2 py-2 text-center font-serif text-[12px] text-[#333A54]">R = √(A₁² + A₂² + 2A₁A₂ cos Δφ)</span>}
                              </span>
                            </span>;
                          })}</span>
                          {item.visual === "outline" && <span className="mt-4 block rounded-xl bg-white p-3 ring-1 ring-[#E5E8F4]"><span className="mb-2 flex items-center gap-1.5 text-[9px] font-semibold text-[#6972D9]"><Network size={12}/>知识脉络</span><span className="flex items-center justify-between gap-1 text-[8px] font-semibold text-[#5E6677]"><span className="rounded-md bg-[#EEF0FF] px-2 py-1.5">简谐振动</span><span className="text-[#B0B5C0]">→</span><span className="rounded-md bg-[#F5F6F9] px-2 py-1.5">振幅 A</span><span className="rounded-md bg-[#F5F6F9] px-2 py-1.5">角频率 ω</span><span className="rounded-md bg-[#F5F6F9] px-2 py-1.5">初相 φ₀</span></span></span>}
                          {currentLiveInsight && <span className="mt-4 block border-t border-[#E8EAF2] pt-4" aria-label="正在生成更多知识总结"><span className="mb-3 flex items-center gap-2 text-[8px] font-medium text-[#9AA1AE]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7C86DE]"/>正在补充细节</span><span className="block space-y-2.5"><span className="voice-insight-skeleton block h-3 w-[82%] rounded-full"/><span className="voice-insight-skeleton block h-3 w-full rounded-full"/><span className="voice-insight-skeleton block h-3 w-[64%] rounded-full"/><span className="voice-insight-skeleton mt-3 block h-14 w-full rounded-xl"/></span></span>}
                        </span>}
                        </button>
                        {canSeekInsights && <button type="button" onClick={() => seekToInsight(item.id, item.time)} className={`absolute right-10 top-3 grid h-8 w-8 place-items-center rounded-full transition ${selected && insightPlaying ? "bg-[#4D5CFF] text-white shadow-[0_4px_12px_rgba(77,92,255,.28)]" : "bg-[#EEF0FF] text-[#4D5CFF] hover:bg-[#E2E6FF]"}`} aria-label={`定位播放 ${item.title} ${fmt(item.time)}`}>{selected && insightPlaying ? <span className="flex items-end gap-[2px]"><i className="h-2 w-[2px] animate-pulse bg-current"/><i className="h-3 w-[2px] animate-pulse bg-current"/><i className="h-1.5 w-[2px] animate-pulse bg-current"/></span> : <Play size={12} fill="currentColor"/>}</button>}
                      </div>;
                    })}
                  </div>
                </div>
              ) : <div className="flex h-full flex-col items-center justify-center text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F2F3FF] text-[#7A86FF]"><Sparkles size={21}/></span><b className="mt-4 text-[12px] text-[#626977]">等待 AI 洞察</b><p className="mt-1 max-w-[220px] text-[10px] leading-5 text-[#A0A6B2]">开始录音后，AI 会从转写中实时提炼关键内容</p></div>}
            </div>
            {canSeekInsights && phase !== "saved" && <div className="shrink-0 border-t border-[#E5E8EF] bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(31,38,58,.06)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><AudioLines size={18}/></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><b className="truncate text-[10px] text-[#303642]">{title}</b><span className="shrink-0 font-mono text-[9px] tabular-nums text-[#8B92A0]">{canSeekInsights ? fmt(Math.floor(insightPlayhead)) : fmt(seconds)} / {canSeekInsights ? fmt(insightDuration) : "--:--"}</span></div>
                  {canSeekInsights ? <input type="range" min={0} max={insightDuration} step={1} value={Math.min(insightPlayhead, insightDuration)} onChange={event => { const time = Number(event.target.value); setInsightPlayhead(time); if (previewAudioRef.current) previewAudioRef.current.currentTime = time; }} className="mt-2 h-1 w-full cursor-pointer accent-[#4D5CFF]" aria-label="录音播放进度"/> : <p className="mt-1.5 text-[9px] text-[#A0A6B2]">{phase === "paused" ? "录音已暂停" : "正在录音，完成后可回听"}</p>}
                </div>
                <button type="button" disabled={!canSeekInsights} onClick={toggleInsightPlayback} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${canSeekInsights ? "bg-[#4D5CFF] text-white shadow-[0_5px_14px_rgba(77,92,255,.24)]" : "cursor-default bg-[#F0F2F5] text-[#B1B6C0]"}`} aria-label={canSeekInsights ? (insightPlaying ? "暂停录音" : "播放录音") : "录音完成后可播放"}>{canSeekInsights && insightPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button>
              </div>
            </div>}
            {anchorNotice && <div className="pointer-events-none absolute left-1/2 top-[72px] z-10 -translate-x-1/2 rounded-full bg-[#252A35] px-3 py-2 text-[10px] font-semibold text-white shadow-lg">{anchorNotice}</div>}
          </aside>
          {(phase === "idle" || phase === "recording" || phase === "paused") && <div className="absolute bottom-0 left-0 right-0 z-30 flex h-20 items-center justify-center gap-3 border-t border-[#E4E7EE] bg-white/95 shadow-[0_-8px_26px_rgba(31,38,58,.07)] backdrop-blur">
            {phase === "idle" ? <button onClick={startRecording} className="flex h-12 min-w-[156px] items-center justify-center gap-2 rounded-full bg-[#FF4D57] px-7 text-[11px] font-semibold text-white shadow-[0_7px_18px_rgba(255,77,87,.24)]" aria-label="开始录音"><span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white"><span className="h-2 w-2 rounded-full bg-white"/></span>开始录音</button> : <>
              <button onClick={phase === "paused" ? resumeRecording : pauseRecording} className="flex h-12 min-w-[112px] items-center justify-center gap-2 rounded-full bg-[#F0F2F5] px-5 text-[11px] font-semibold text-[#343A46]" aria-label={phase === "paused" ? "继续录音" : "暂停录音"}>{phase === "paused" ? <Play size={16} fill="currentColor"/> : <Pause size={16} fill="currentColor"/>}{phase === "paused" ? "继续录音" : "暂停录音"}</button>
              <button onClick={stopRecording} className="flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-full bg-[#4D5CFF] px-6 text-[11px] font-semibold text-white shadow-[0_6px_16px_rgba(77,92,255,.22)]"><Square size={13} fill="currentColor"/>完成录音</button>
            </>}
          </div>}
          {phase === "saved" && <div className="absolute bottom-0 left-0 right-0 z-30 flex h-20 items-stretch border-t border-[#E4E7EE] bg-[#FAFBFD]/95 shadow-[0_-8px_26px_rgba(31,38,58,.06)] backdrop-blur">
            <div className="flex w-[250px] shrink-0 items-center justify-center border-r border-[#E4E7EE] px-4">
              <button type="button" onClick={startNewRecording} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EEF0F5] px-4 text-[11px] font-semibold text-[#505866] transition hover:bg-[#E5E8EF]" aria-label="开始新录音"><span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#89919F]"><span className="h-2 w-2 rounded-full bg-[#89919F]"/></span>开始新录音</button>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3 px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><AudioLines size={18}/></span>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><b className="truncate text-[10px] text-[#303642]">{title}</b><span className="shrink-0 font-mono text-[9px] tabular-nums text-[#8B92A0]">{fmt(Math.floor(insightPlayhead))} / {fmt(insightDuration)}</span></div><input type="range" min={0} max={insightDuration} step={1} value={Math.min(insightPlayhead, insightDuration)} onChange={event => { const time = Number(event.target.value); setInsightPlayhead(time); if (previewAudioRef.current) previewAudioRef.current.currentTime = time; }} className="mt-2 h-1 w-full cursor-pointer accent-[#4D5CFF]" aria-label="录音播放进度"/></div>
              <button type="button" onClick={toggleInsightPlayback} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E8EBFF] text-[#4D5CFF] transition hover:bg-[#DDE1FF]" aria-label={insightPlaying ? "暂停录音" : "播放录音"}>{insightPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button>
            </div>
          </div>}
        </div>
      </section>
    </div>
  );
}
