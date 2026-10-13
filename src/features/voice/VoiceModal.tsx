import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, Square, Loader2, BookmarkCheck, Minimize2, Maximize2, Pause, Play, Search, AudioLines, FileText, MoreHorizontal, Check, Sparkles, Bot, Hand, Clock3 } from "lucide-react";
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
  { id: "insight_1", kind: "key", label: "核心结论", title: "简谐振动由振幅、角频率和初相共同决定", summary: "位移可表示为 x(t)=A·cos(ωt+φ₀)。", time: 18 },
  { id: "insight_2", kind: "risk", label: "易错点", title: "振动叠加前先判断相位差", summary: "不能直接将两个振幅相加，需要先比较相位关系。", time: 42 },
  { id: "insight_3", kind: "question", label: "课堂疑问", title: "相位差为 π 时合振幅如何变化？", summary: "这一问题关联后续合成振动例题。", time: 68 },
  { id: "insight_4", kind: "task", label: "课后任务", title: "完成 π/3 相位差的合成振动练习", summary: "建议结合旋转矢量图重新推导一次。", time: 96 },
] as const;

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
    setAnchorNotice(undefined);
    await startRecording();
    window.requestAnimationFrame(() => currentRecordingTabRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const visibleInsights = phase === "idle" ? [] : DEMO_INSIGHTS.slice(0, phase === "done" || phase === "saved" ? DEMO_INSIGHTS.length : Math.max(1, Math.min(DEMO_INSIGHTS.length, Math.ceil(((liveTranscript || transcript).length) / Math.max(1, DEMO_TRANSCRIPT.length) * DEMO_INSIGHTS.length))));
  const canSeekInsights = phase === "done" || phase === "saved";
  const riskCount = visibleInsights.filter(item => item.kind === "risk").length;
  const taskCount = visibleInsights.filter(item => item.kind === "task").length;

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

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[250px] shrink-0 flex-col border-r border-[#E8EBF0] bg-[#F7F8FA]">
            <div className="p-4"><b className="text-[14px] text-[#292E39]">所有录音</b><div className="mt-3 flex h-9 items-center rounded-xl bg-white px-3 ring-1 ring-[#E5E8EE]"><Search size={14} className="mr-2 text-[#9299A6]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索标题、转写" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#ADB2BC]"/></div></div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {hasRecording ? <><button ref={currentRecordingTabRef} type="button" onClick={() => setActiveRecordingId(currentRecordingId)} className={`w-full rounded-2xl p-3 text-left transition-all ${activeRecordingId === currentRecordingId ? "bg-[#EEF0FF] ring-1 ring-[#DCE0FF]" : "hover:bg-white"}`}><div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#4D5CFF]"><AudioLines size={15}/></span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-[#303642]">{title}</b><span className="mt-1 block text-[9px] text-[#858C9A]">今天 · {fmt(seconds)}{phase === "done" ? " · 待保存" : phase === "paused" ? " · 已暂停" : phase === "recording" ? " · 录制中" : ""}</span></span><MoreHorizontal size={15} className="text-[#969CAA]"/></div></button>{recordingHistory.map(item => <div key={item.id} className="mt-2 w-full rounded-2xl p-3 text-left"><div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#7F8795] shadow-sm"><AudioLines size={15}/></span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-[#4B5260]">{item.title}</b><span className="mt-1 block text-[9px] text-[#969DAA]">今天 · {fmt(item.duration)}</span></span><MoreHorizontal size={15} className="text-[#A3A9B4]"/></div></div>)}</> : <div className="flex h-full flex-col items-center justify-center px-5 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#B2B7C1] shadow-sm"><AudioLines size={22}/></span><b className="mt-4 text-[12px] text-[#606774]">还没有录音</b><p className="mt-1 text-[10px] leading-5 text-[#A0A6B2]">开始录制后，会在这里保留记录</p></div>}
            </div>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col border-r border-[#E8EBF0] bg-[#FCFCFD]">
            <div className="flex items-center px-6 py-4"><input value={title} onChange={e=>setTitle(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#2B303B] outline-none" aria-label="录音标题"/></div>
            <div className="flex flex-1 flex-col items-center justify-center px-7 pb-24">
              <div className="flex h-28 w-full max-w-[510px] items-center justify-center gap-[4px] overflow-hidden rounded-3xl bg-[#F4F5F8] px-8">
                {bars.map((h,i)=><i key={i} className="w-[3px] rounded-full transition-all duration-75" style={{height:`${Math.round((phase === "idle" ? .18 : h) * 72)}px`,background:phase === "recording"?`rgba(77,92,255,${.5+h*.5})`:phase === "paused"?"#9DA4B2":"#C8CDD6"}}/>)}
              </div>
              <div className="mt-7 font-mono text-[38px] font-medium tracking-[-.03em] text-[#242933]">{fmt(seconds)}</div>
              <p className="mt-2 text-[11px] text-[#949BA8]">{phase === "idle" ? "点击下方按钮开始录音" : phase === "recording" ? "正在录制并实时转写" : phase === "paused" ? "录音已暂停，点击继续" : phase === "transcribing" ? "正在完成最后一段转写" : phase === "saved" ? "录音已保存为知识来源" : "录音完成，可检查转写并保存"}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-24 items-center justify-center gap-3 border-t border-[#ECEEF2] bg-white/90 backdrop-blur">
              {phase === "idle" && <button onClick={startRecording} className="grid h-16 w-16 place-items-center rounded-full bg-[#FF4D57] text-white shadow-[0_8px_24px_rgba(255,77,87,.28)]" aria-label="开始录音"><span className="grid h-7 w-7 place-items-center rounded-full border-[2.5px] border-current" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-current"/></span></button>}
              {phase === "recording" && <><button onClick={pauseRecording} className="grid h-12 w-12 place-items-center rounded-full bg-[#F0F2F5] text-[#343A46]" aria-label="暂停"><Pause size={18} fill="currentColor"/></button><button onClick={stopRecording} className="flex h-12 items-center gap-2 rounded-full bg-[#4D5CFF] px-5 text-[12px] font-semibold text-white"><Square size={13} fill="currentColor"/>完成录音</button></>}
              {phase === "paused" && <><button onClick={resumeRecording} className="grid h-12 w-12 place-items-center rounded-full bg-[#EEF0FF] text-[#4D5CFF]" aria-label="继续"><Play size={18} fill="currentColor"/></button><button onClick={stopRecording} className="flex h-12 items-center gap-2 rounded-full bg-[#4D5CFF] px-5 text-[12px] font-semibold text-white"><Square size={13} fill="currentColor"/>完成录音</button></>}
              {phase === "transcribing" && <div className="flex items-center gap-2 text-[12px] font-medium text-[#697180]"><Loader2 size={18} className="animate-spin text-[#4D5CFF]"/>正在生成完整文稿…</div>}
              {phase === "done" && !autoSaveMemory && <button onClick={handleSave} className="flex h-12 items-center gap-2 rounded-full bg-[#4D5CFF] px-6 text-[12px] font-semibold text-white"><BookmarkCheck size={16}/>保存到知识记忆</button>}
              {phase === "done" && autoSaveMemory && <div className="flex items-center gap-2 text-[12px] font-medium text-[#697180]"><Loader2 size={18} className="animate-spin text-[#4D5CFF]"/>正在自动保存到记忆…</div>}
              {phase === "saved" && <button type="button" onClick={startNewRecording} className="flex flex-col items-center gap-1.5 text-[10px] font-semibold text-[#596170]" aria-label="开始新录音"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#FF4D57] text-white shadow-[0_8px_24px_rgba(255,77,87,.28)]"><span className="grid h-6 w-6 place-items-center rounded-full border-[2.2px] border-current" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-current"/></span></span>开始新录音</button>}
            </div>
          </main>

          <aside className="relative flex w-[380px] shrink-0 flex-col bg-white">
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
            <div className="flex h-14 shrink-0 items-center justify-between px-5"><div className="flex items-center gap-2 text-[12px] font-bold text-[#292E39]">{rightTab === "insights" ? <><Bot size={16} className="text-[#4D5CFF]"/>AI 洞察</> : <><FileText size={15}/>录音文稿</>}</div><button type="button" onClick={() => setRightTab(value => value === "insights" ? "transcript" : "insights")} className="rounded-full bg-[#F2F3F6] px-3 py-1.5 text-[10px] font-semibold text-[#687082] transition hover:bg-[#E9EBF1]">{rightTab === "insights" ? "查看转写" : "查看 AI 洞察"}</button></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {rightTab === "transcript" ? (
                panelText ? <div><p className="mb-5 flex items-center gap-1.5 text-[10px] text-[#9AA1AE]"><Clock3 size={12}/>{canSeekInsights ? "点击时间戳，可从该段开始回听" : "录音结束并完成对齐后，可点击时间戳回听"}</p><div className="space-y-5">{transcriptSegments.map(segment => { const active = canSeekInsights && activeTranscriptSegment?.id === segment.id; return <div key={segment.id} className={`rounded-xl px-2 py-1 transition ${active ? "bg-[#F1F3FF]" : ""}`}><p className="text-[12px] leading-7 text-[#4C5360]"><button type="button" disabled={!canSeekInsights} onClick={() => seekToTranscript(segment.startTime)} className={`mr-2 inline-block font-mono text-[11px] font-bold tabular-nums underline decoration-2 underline-offset-4 transition ${active ? "text-[#4D5CFF]" : canSeekInsights ? "text-[#168ACB] hover:text-[#4D5CFF]" : "cursor-default text-[#A0A7B3] no-underline"}`} title={canSeekInsights ? `从 ${fmt(segment.startTime)} 开始播放` : "录音结束后可跳转"}>{fmt(segment.startTime)}</button>{segment.text}{phase === "recording" && segment.id === transcriptSegments[transcriptSegments.length - 1]?.id && <span className="ml-1 inline-block h-4 w-[2px] animate-pulse align-middle bg-[#4D5CFF]"/>}</p></div>})}</div></div> : <div className="flex h-full flex-col items-center justify-center text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F4F5F8] text-[#B2B7C1]"><FileText size={21}/></span><b className="mt-4 text-[12px] text-[#626977]">等待转写内容</b><p className="mt-1 max-w-[210px] text-[10px] leading-5 text-[#A0A6B2]">开始录音后，识别出的文字会实时出现在这里</p></div>
              ) : visibleInsights.length > 0 ? (
                <div>
                  <div className="mb-6 flex items-center gap-2 rounded-xl bg-[#F7F8FB] px-3 py-2 text-[9px] text-[#9299A6]">
                    <span className="relative flex h-1.5 w-1.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C8AFF] opacity-40"/><span className="relative h-1.5 w-1.5 rounded-full bg-[#7C86DE]"/></span>
                    <span>{canSeekInsights ? "AI 已完成内容理解与时间对齐" : "AI 实时理解中"}</span>
                    <span className="ml-auto tabular-nums">{visibleInsights.length} 个知识点{riskCount ? ` · ${riskCount} 个易错点` : ""}{taskCount ? ` · ${taskCount} 个待办` : ""}</span>
                  </div>
                  <div className="relative ml-1 border-l border-[#E0E3E9] pl-6">
                    {visibleInsights.map(item => {
                      const selected = selectedInsightId === item.id;
                      return <button key={item.id} type="button" disabled={!canSeekInsights} onClick={() => seekToInsight(item.id, item.time)} className={`relative mb-8 block w-full rounded-xl px-3 py-2 text-left transition-all duration-300 ${canSeekInsights ? "cursor-pointer" : "cursor-default"} ${selected && canSeekInsights ? "translate-x-1 bg-[linear-gradient(90deg,#F0F2FF,#FAF8FF)] shadow-[0_8px_22px_rgba(77,92,255,.10)]" : canSeekInsights ? "hover:bg-[#F8F9FC]" : ""}`}>
                        <span className={`absolute -left-[32px] top-3 h-3 w-3 rounded-full border-2 border-white transition-all ${selected && canSeekInsights ? "scale-110 bg-[#4D5CFF] shadow-[0_0_0_5px_rgba(77,92,255,.14),0_0_16px_rgba(77,92,255,.55)]" : "bg-[#AEB4BF]"}`}/>
                        <span className="flex items-center gap-2 text-[11px] font-semibold text-[#9298A4]"><Sparkles size={13} className={selected && canSeekInsights ? "text-[#4D5CFF]" : ""}/>{item.label}<span>{canSeekInsights ? fmt(item.time) : `约 ${fmt(item.time)}`}</span>{canSeekInsights ? (selected && insightPlaying ? <span className="ml-auto flex items-end gap-[2px] text-[#4D5CFF]"><i className="h-2 w-[2px] animate-pulse bg-current"/><i className="h-3 w-[2px] animate-pulse bg-current"/><i className="h-1.5 w-[2px] animate-pulse bg-current"/></span> : <Hand size={13} className="ml-auto"/>) : <span className="ml-auto text-[9px] font-medium text-[#A5ABB6]">待对齐</span>}</span>
                        <strong className="mt-3 block text-[14px] leading-6 text-[#171B24]">{item.title}</strong>
                        <span className="mt-2 block text-[12px] leading-7 text-[#4F5664]">{item.summary}</span>
                        {item.kind === "key" && <span className="mt-3 flex flex-wrap items-center gap-1 text-[9px] font-semibold text-[#6570D8]"><span className="rounded-md bg-[#EEF0FF] px-2 py-1">简谐振动</span><span>→</span><span className="rounded-md bg-[#EEF0FF] px-2 py-1">旋转矢量</span><span>→</span><span className="rounded-md bg-[#EEF0FF] px-2 py-1">相位差</span></span>}
                      </button>;
                    })}
                    {phase === "recording" && <div className="relative flex items-center gap-2 pb-2 text-[11px] font-medium text-[#B0B5BE]"><span className="absolute -left-[31px] h-2.5 w-2.5 animate-pulse rounded-full bg-[#AEB4BF]"/><Sparkles size={13}/>Thinking…</div>}
                  </div>
                </div>
              ) : <div className="flex h-full flex-col items-center justify-center text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F2F3FF] text-[#7A86FF]"><Sparkles size={21}/></span><b className="mt-4 text-[12px] text-[#626977]">等待 AI 洞察</b><p className="mt-1 max-w-[220px] text-[10px] leading-5 text-[#A0A6B2]">开始录音后，AI 会从转写中实时提炼关键内容</p></div>}
            </div>
            {hasRecording && <div className="shrink-0 border-t border-[#E5E8EF] bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(31,38,58,.06)]">
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
        </div>
      </section>
    </div>
  );
}
